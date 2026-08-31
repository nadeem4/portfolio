import type { Counters, OpResult, Point, PointId, Ranked, SearchParams, Vec } from './types';
import { distance, euclidean } from './metrics';
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

/**
 * Files a new point into the nearest existing cell.
 *
 * It deliberately does NOT retrain. That is the whole IVF lesson: inserts are
 * cheap because the partition is frozen, and the price is a partition that
 * slowly stops describing the data. `insertsSinceTrain` is what the health
 * readout turns into a visible warning.
 */
export function ivfInsert(state: IvfState, vec: Vec): OpResult<IvfState, PointId, IvfStep> {
  const cell = nearestCentroid(vec, state.centroids);
  const id = state.nextId;
  const cells = state.cells.map((ids, i) => (i === cell ? [...ids, id] : ids));
  const points = new Map(state.points);
  points.set(id, { id, vec: [...vec] });

  return {
    state: {
      centroids: state.centroids,
      cells,
      points,
      nextId: id + 1,
      insertsSinceTrain: state.insertsSinceTrain + 1,
    },
    result: id,
    steps: [{ kind: 'assign', id, cell }],
    counters: ivfCounters(state.centroids.length, 0, 0),
  };
}

/**
 * Hard removal from one posting list. No tombstone, no relinking, no retrain.
 *
 * IVF gets away with this because a posting list is a bag: pulling an element
 * out cannot disconnect anything. The bill arrives later and elsewhere — the
 * centroid now sits at the mean of points that are no longer there. Contrast
 * HNSW, where the same operation would risk cutting the graph in two.
 */
export function ivfDelete(state: IvfState, id: PointId): OpResult<IvfState, boolean, IvfStep> {
  const cell = state.cells.findIndex((ids) => ids.includes(id));
  if (cell === -1) {
    return { state, result: false, steps: [], counters: ivfCounters(0, 0, 0) };
  }

  const cells = state.cells.map((ids, i) => (i === cell ? ids.filter((other) => other !== id) : ids));
  const points = new Map(state.points);
  points.delete(id);

  return {
    state: { ...state, cells, points },
    result: true,
    steps: [{ kind: 'remove', id, cell }],
    counters: ivfCounters(0, 0, 0),
  };
}

/**
 * Probe the `nprobe` cells nearest the query, scan only their posting lists,
 * and rank the union under the same total order flat search uses.
 *
 * Cells are ranked under the query's own metric, unlike `nearestCentroid`
 * (always Euclidean, for training): this is a ranking question, not a means
 * question, so it must agree with the scan that follows. When `nprobe` covers
 * every cell, the union of posting lists is every point, so the result is
 * bit-identical to flat search — same distances, same id tiebreak.
 */
export function ivfSearch(
  state: IvfState,
  query: Vec,
  params: IvfSearchParams,
): OpResult<IvfState, readonly Ranked[], IvfStep> {
  const steps: IvfStep[] = [];

  const ranked = state.centroids
    .map((centroid, cell) => ({ cell, distance: distance(query, centroid, params.metric) }))
    .sort((a, b) => a.distance - b.distance || a.cell - b.cell);
  let distanceComputations = state.centroids.length;

  const probe = Math.max(1, Math.min(params.nprobe, state.centroids.length));
  const candidates: Ranked[] = [];
  let pointsScanned = 0;

  ranked.forEach((entry, rank) => {
    if (rank >= probe) {
      steps.push({ kind: 'skipCell', cell: entry.cell, distance: entry.distance });
      return;
    }
    steps.push({ kind: 'probeCell', cell: entry.cell, distance: entry.distance });
    state.cells[entry.cell].forEach((id) => {
      const point = state.points.get(id);
      // Cells and `points` are written by the same ops, so a gap is corruption.
      if (point === undefined) return;
      const d = distance(query, point.vec, params.metric);
      distanceComputations += 1;
      pointsScanned += 1;
      steps.push({ kind: 'scan', id, distance: d });
      candidates.push({ id, distance: d });
    });
  });

  // Tie-break by id so the ordering is total, and therefore reproducible and
  // directly comparable with flat search.
  const top = candidates.sort((a, b) => a.distance - b.distance || a.id - b.id).slice(0, params.k);
  top.forEach((entry, rank) => steps.push({ kind: 'admit', id: entry.id, distance: entry.distance, rank }));

  return {
    state,
    result: top,
    steps,
    counters: ivfCounters(distanceComputations, probe, pointsScanned),
  };
}
