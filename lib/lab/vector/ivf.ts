import type { Counters, OpResult, Point, PointId, Ranked, SearchParams, Vec } from './types';
import { euclidean } from './metrics';
import { mulberry32 } from './random';

export interface IvfState {
  readonly centroids: readonly Vec[];
  readonly cells: readonly (readonly PointId[])[];
  readonly points: ReadonlyMap<PointId, Point>;
  readonly nextId: PointId;
  /** Points inserted since the last train/rebuild. Drives the drift readout. */
  readonly insertsSinceTrain: number;
}

export type IvfStep =
  | { readonly kind: 'trainIteration'; readonly iteration: number; readonly centroids: readonly Vec[]; readonly shift: number }
  | { readonly kind: 'assign'; readonly id: PointId; readonly cell: number }
  | { readonly kind: 'probeCell'; readonly cell: number; readonly distance: number }
  | { readonly kind: 'skipCell'; readonly cell: number; readonly distance: number }
  | { readonly kind: 'scan'; readonly id: PointId; readonly distance: number }
  | { readonly kind: 'admit'; readonly id: PointId; readonly distance: number; readonly rank: number }
  | { readonly kind: 'remove'; readonly id: PointId; readonly cell: number };

export interface IvfParams {
  readonly cells: number;
  readonly maxIterations: number;
  readonly seed: number;
}

export interface IvfSearchParams extends SearchParams {
  readonly nprobe: number;
}

/** Every IVF op reports all three keys, so the scoreboard never shows a hole. */
function ivfCounters(distanceComputations: number, cellsProbed: number, pointsScanned: number): Counters {
  return { distanceComputations, cellsProbed, pointsScanned };
}

/**
 * Index of the centroid nearest `vec`, always under plain Euclidean geometry.
 *
 * Assignment is deliberately not metric-aware. Lloyd's minimises squared
 * Euclidean error, so assigning under a different metric would leave cells
 * whose centroid is not their own mean — an index that disagrees with itself.
 */
function nearestCentroid(vec: Vec, centroids: readonly Vec[]): number {
  let best = 0;
  let bestDistance = Infinity;
  for (let i = 0; i < centroids.length; i += 1) {
    const candidate = euclidean(vec, centroids[i]);
    if (candidate < bestDistance) {
      bestDistance = candidate;
      best = i;
    }
  }
  return best;
}

function meanVec(vecs: readonly Vec[], dim: number): Vec | null {
  if (vecs.length === 0) return null;
  const sums = new Array<number>(dim).fill(0);
  vecs.forEach((vec) => {
    for (let d = 0; d < dim; d += 1) sums[d] += vec[d];
  });
  return sums.map((sum) => sum / vecs.length);
}

/** Seeded Forgy initialisation: shuffle the points, take the first `cells`. */
function seedCentroids(points: readonly Point[], cells: number, rng: () => number): Vec[] {
  const shuffled = points.map((point) => [...point.vec]);
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, cells);
}

export function trainIvf(points: readonly Point[], params: IvfParams): OpResult<IvfState, void, IvfStep> {
  if (points.length < params.cells) {
    throw new Error(`trainIvf needs at least ${params.cells} points to seed ${params.cells} centroids`);
  }

  const dim = points[0].vec.length;
  const rng = mulberry32(params.seed);
  const steps: IvfStep[] = [];
  let centroids = seedCentroids(points, params.cells, rng);
  let distanceComputations = 0;

  for (let iteration = 0; iteration < params.maxIterations; iteration += 1) {
    const buckets: Vec[][] = centroids.map(() => []);
    points.forEach((point) => {
      buckets[nearestCentroid(point.vec, centroids)].push(point.vec);
      distanceComputations += centroids.length;
    });

    // An empty cell keeps its old centroid instead of being reseeded: `cells`
    // is index-parallel to `centroids`, so dropping one would renumber every
    // cell mid-run and invalidate every step already emitted.
    const next = centroids.map((centroid, i) => meanVec(buckets[i], dim) ?? centroid);
    const shift = Math.max(...next.map((centroid, i) => euclidean(centroid, centroids[i])));
    centroids = next;
    steps.push({ kind: 'trainIteration', iteration, centroids: centroids.map((c) => [...c]), shift });

    // Once nothing moves, further iterations are byte-identical. Stopping here
    // keeps the scrubber free of frames that show the reader nothing.
    if (shift < 1e-12) break;
  }

  const cells: PointId[][] = centroids.map(() => []);
  const pointMap = new Map<PointId, Point>();
  let nextId = 0;
  points.forEach((point) => {
    const cell = nearestCentroid(point.vec, centroids);
    distanceComputations += centroids.length;
    cells[cell].push(point.id);
    pointMap.set(point.id, point);
    nextId = Math.max(nextId, point.id + 1);
    steps.push({ kind: 'assign', id: point.id, cell });
  });

  return {
    state: { centroids, cells, points: pointMap, nextId, insertsSinceTrain: 0 },
    result: undefined,
    steps,
    counters: ivfCounters(distanceComputations, 0, points.length),
  };
}
