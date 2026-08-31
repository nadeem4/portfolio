import type { OpResult, Point, PointId, Vec } from './types';

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
