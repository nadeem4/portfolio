import { describe, it, expect } from 'vitest';
import { createFlat } from './flat';
import { makeDataset, DEFAULT_DATASET } from './dataset';
import type { Point } from './types';

/**
 * Deep copy taken before an operation, so the purity assertion compares against
 * a value the operation had no way to reach.
 */
export function snapshot<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function pointsOf(...vecs: readonly (readonly number[])[]): Point[] {
  return vecs.map((vec, id) => ({ id, vec }));
}

describe('createFlat', () => {
  it('builds an empty index', () => {
    expect(createFlat([])).toEqual({ points: [], nextId: 0 });
  });

  it('holds the points it was seeded with', () => {
    const points = pointsOf([0, 0], [1, 1]);
    expect(createFlat(points).points).toEqual(points);
  });

  it('hands out the next id above the highest one present', () => {
    expect(createFlat(makeDataset(DEFAULT_DATASET)).nextId).toBe(makeDataset(DEFAULT_DATASET).length);
  });

  it('clears the highest id even when the ids have gaps', () => {
    // Ids are never reused, so a state rebuilt after deletions must not hand
    // out an id that is still live.
    const gappy: Point[] = [
      { id: 0, vec: [0, 0] },
      { id: 5, vec: [1, 0] },
      { id: 2, vec: [0, 1] },
    ];
    expect(createFlat(gappy).nextId).toBe(6);
  });

  it('copies the seed array rather than aliasing it', () => {
    const points = pointsOf([0, 0]);
    const state = createFlat(points);

    points.push({ id: 99, vec: [1, 1] });

    expect(state.points).toHaveLength(1);
  });

  it('leaves the seed array unchanged', () => {
    const points = makeDataset(DEFAULT_DATASET);
    const before = snapshot(points);

    createFlat(points);

    expect(points).toEqual(before);
  });
});
