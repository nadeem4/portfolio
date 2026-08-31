import { mulberry32 } from './random';
import type { Point, Vec } from './types';

export interface DatasetOptions {
  readonly seed: number;
  readonly clusters: number;
  readonly perCluster: number;
  readonly spread: number; // stddev within a cluster
  readonly straddlers: number; // points placed deliberately near cluster boundaries
}

/** Distance of every cluster centre from the middle of the unit square. */
const CENTRE_RADIUS = 0.32;

/**
 * Straddler jitter as a fraction of cluster spread.
 *
 * Small on purpose: a straddler has to stay close enough to the midpoint that
 * it is genuinely ambiguous between two cells, or the boundary-miss lesson
 * becomes a coin flip on the seed.
 */
const STRADDLER_JITTER = 0.1;

function clampUnit(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/**
 * Standard normal via Box-Muller.
 *
 * `1 - rand()` keeps the log argument off zero, which would otherwise return
 * -Infinity on the one draw where the generator yields exactly 0 and put a
 * point at NaN.
 */
function gaussian(rand: () => number): number {
  const u = 1 - rand();
  const v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/**
 * Cluster centres evenly spaced on a circle.
 *
 * Even spacing rather than random placement, because it makes every adjacent
 * pair equally separated: a straddler dropped between any two of them is then
 * equally adversarial. Random centres would leave some pairs nearly overlapping
 * and others trivially far apart, so how hard the lab is would depend on the
 * seed rather than on the index under test.
 */
function clusterCentres(clusters: number): Vec[] {
  return Array.from({ length: clusters }, (_unused, index) => {
    const angle = (2 * Math.PI * index) / clusters;
    return [0.5 + CENTRE_RADIUS * Math.cos(angle), 0.5 + CENTRE_RADIUS * Math.sin(angle)];
  });
}

function scatter(centre: Vec, spread: number, rand: () => number): Vec {
  // Clamped because the layout maps [0, 1] onto the canvas; a three-sigma tail
  // outside the unit square would be drawn outside the viewport.
  return [
    clampUnit(centre[0] + gaussian(rand) * spread),
    clampUnit(centre[1] + gaussian(rand) * spread),
  ];
}

/**
 * Adversarial by construction: tight clusters PLUS `straddlers` points placed
 * between cluster centres, so IVF at nprobe=1 genuinely misses true neighbours.
 * That miss is the lab's whole point and is asserted in tests.
 *
 * Straddlers come last in the array so a test can slice them off without the
 * module exposing its internal geometry.
 */
export function makeDataset(options: DatasetOptions): readonly Point[] {
  const rand = mulberry32(options.seed);
  const centres = clusterCentres(options.clusters);
  const points: Point[] = [];

  centres.forEach((centre) => {
    for (let i = 0; i < options.perCluster; i += 1) {
      points.push({ id: points.length, vec: scatter(centre, options.spread, rand) });
    }
  });

  // One centre has no boundary, so there is nothing to straddle.
  if (centres.length >= 2) {
    for (let i = 0; i < options.straddlers; i += 1) {
      const a = centres[i % centres.length];
      const b = centres[(i + 1) % centres.length];
      const midpoint: Vec = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      points.push({ id: points.length, vec: scatter(midpoint, options.spread * STRADDLER_JITTER, rand) });
    }
  }

  return points;
}

/**
 * 128 points: dense enough that brute force is visibly doing work, small enough
 * that flat search stays exact and free as ground truth for every other index.
 */
export const DEFAULT_DATASET: DatasetOptions = {
  seed: 20260830,
  clusters: 4,
  perCluster: 30,
  spread: 0.045,
  straddlers: 8,
};
