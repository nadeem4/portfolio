import { distance } from './metrics';
import type { OpResult, Point, PointId, Ranked, SearchParams, Vec } from './types';

export interface FlatState {
  readonly points: readonly Point[];
  readonly nextId: PointId;
}

export type FlatStep =
  | { readonly kind: 'scan'; readonly id: PointId; readonly distance: number }
  | { readonly kind: 'admit'; readonly id: PointId; readonly distance: number; readonly rank: number }
  | { readonly kind: 'evict'; readonly id: PointId }
  | { readonly kind: 'append'; readonly id: PointId }
  | { readonly kind: 'remove'; readonly id: PointId };

/**
 * Seed a flat index from a dataset.
 *
 * `nextId` clears the highest id present rather than counting the points,
 * because ids are never reused: a state rebuilt from points that have already
 * had deletions would otherwise hand out an id that is still live and give two
 * points the same identity.
 */
export function createFlat(points: readonly Point[]): FlatState {
  return {
    points: [...points],
    nextId: points.reduce((next, point) => Math.max(next, point.id + 1), 0),
  };
}

/**
 * Append a point.
 *
 * Flat is the baseline every other index is argued against, and the argument
 * starts here: inserting costs nothing, because there is no structure to
 * maintain. The zeroed counters are load-bearing rather than decorative — the
 * scoreboard reads them beside IVF's assign and HNSW's descent.
 *
 * The vector is copied so a caller reusing a mutable array between clicks
 * cannot retroactively move a point that is already in the index.
 */
export function flatInsert(state: FlatState, vec: Vec): OpResult<FlatState, PointId, FlatStep> {
  const point: Point = { id: state.nextId, vec: [...vec] };

  return {
    state: { points: [...state.points, point], nextId: point.id + 1 },
    result: point.id,
    steps: [{ kind: 'append', id: point.id }],
    counters: { distanceComputations: 0, pointsScanned: 0 },
  };
}

/**
 * Remove a point outright.
 *
 * Deliberately a HARD removal, not a tombstone. Flat has no proximity graph to
 * disconnect, so nothing forces a deferred delete here — and the contrast with
 * HNSW, which cannot do this, is one of the things the playground exists to
 * show. Tombstoning flat "for consistency" would erase that lesson.
 *
 * `nextId` survives the delete: ids are never reused, or an undo replay would
 * put a different point under an id the reader has already seen.
 */
export function flatDelete(state: FlatState, id: PointId): OpResult<FlatState, boolean, FlatStep> {
  const index = state.points.findIndex((point) => point.id === id);
  const counters = { distanceComputations: 0, pointsScanned: 0 };

  if (index === -1) {
    return { state, result: false, steps: [], counters };
  }

  return {
    state: {
      points: [...state.points.slice(0, index), ...state.points.slice(index + 1)],
      nextId: state.nextId,
    },
    result: true,
    steps: [{ kind: 'remove', id }],
    counters,
  };
}

/**
 * Total order over candidates: distance first, then id.
 *
 * The id tiebreak is not cosmetic. Flat search is the ground truth every other
 * index's recall is measured against, so two points at the same distance must
 * never swap between runs — recall would then move for reasons that have
 * nothing to do with the index under test.
 */
function isNearer(candidateDistance: number, candidateId: PointId, incumbent: Ranked): boolean {
  return (
    candidateDistance < incumbent.distance ||
    (candidateDistance === incumbent.distance && candidateId < incumbent.id)
  );
}

function rankFor(top: readonly Ranked[], candidateDistance: number, candidateId: PointId): number {
  let rank = 0;
  while (rank < top.length && !isNearer(candidateDistance, candidateId, top[rank])) {
    rank += 1;
  }
  return rank;
}

/**
 * Brute force scan. Exact by construction, and at playground sizes free.
 *
 * The shortlist is maintained during the scan rather than recovered by sorting
 * afterwards, because the trace is the product here: the reader scrubs through
 * points entering and being pushed out of the top k as the scan advances, which
 * a sort-then-slice would flatten into every admit arriving at the end.
 *
 * `distanceComputations` and `pointsScanned` are necessarily equal for flat —
 * that is the definition of brute force. They are reported separately because
 * IVF and HNSW pull them apart, and the scoreboard compares the same two keys
 * across every index.
 */
export function flatSearch(
  state: FlatState,
  query: Vec,
  params: SearchParams,
): OpResult<FlatState, readonly Ranked[], FlatStep> {
  const steps: FlatStep[] = [];
  const top: Ranked[] = [];

  state.points.forEach((point) => {
    const pointDistance = distance(query, point.vec, params.metric);
    steps.push({ kind: 'scan', id: point.id, distance: pointDistance });

    const worst = top[top.length - 1];
    if (top.length >= params.k && (worst === undefined || !isNearer(pointDistance, point.id, worst))) {
      return;
    }

    const rank = rankFor(top, pointDistance, point.id);
    top.splice(rank, 0, { id: point.id, distance: pointDistance });
    steps.push({ kind: 'admit', id: point.id, distance: pointDistance, rank });

    if (top.length > params.k) {
      const evicted = top[top.length - 1];
      top.length -= 1;
      steps.push({ kind: 'evict', id: evicted.id });
    }
  });

  return {
    state,
    result: top,
    steps,
    counters: { distanceComputations: state.points.length, pointsScanned: state.points.length },
  };
}
