import type { Point, PointId } from './types';

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
