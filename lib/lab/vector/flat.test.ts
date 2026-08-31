import { describe, it, expect } from 'vitest';
import { createFlat, flatInsert, flatDelete } from './flat';
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

describe('flatInsert', () => {
  it('appends the new point at the end', () => {
    const state = createFlat(pointsOf([0, 0], [1, 1]));

    const { state: next } = flatInsert(state, [0.5, 0.5]);

    expect(next.points).toHaveLength(3);
    expect(next.points[2]).toEqual({ id: 2, vec: [0.5, 0.5] });
  });

  it('returns the id it assigned', () => {
    const { result } = flatInsert(createFlat(pointsOf([0, 0])), [0.5, 0.5]);
    expect(result).toBe(1);
  });

  it('advances nextId so ids are never handed out twice', () => {
    const first = flatInsert(createFlat([]), [0, 0]);
    const second = flatInsert(first.state, [1, 1]);

    expect(first.result).toBe(0);
    expect(second.result).toBe(1);
    expect(second.state.nextId).toBe(2);
  });

  it('traces one append and nothing else', () => {
    const { steps } = flatInsert(createFlat(pointsOf([0, 0])), [0.5, 0.5]);
    expect(steps).toEqual([{ kind: 'append', id: 1 }]);
  });

  it('touches no other point', () => {
    // The scoreboard's whole argument is the contrast between this and IVF's
    // assign or HNSW's descent, so a flat insert must cost literally nothing.
    const { counters } = flatInsert(createFlat(makeDataset(DEFAULT_DATASET)), [0.5, 0.5]);
    expect(counters).toEqual({ distanceComputations: 0, pointsScanned: 0 });
  });

  it('leaves the input state unchanged', () => {
    const state = createFlat(makeDataset(DEFAULT_DATASET));
    const before = snapshot(state);

    flatInsert(state, [0.5, 0.5]);

    expect(state).toEqual(before);
  });

  it('copies the vector, so a caller reusing its array cannot reach into state', () => {
    const vec = [0.5, 0.5];
    const { state: next } = flatInsert(createFlat([]), vec);

    vec[0] = 0.9;

    expect(next.points[0].vec).toEqual([0.5, 0.5]);
  });
});

describe('flatDelete', () => {
  it('removes the point outright, leaving no tombstone behind', () => {
    // The contrast with HNSW's forced tombstoning is a teaching point. Flat has
    // no graph to disconnect, so the point simply goes.
    const state = createFlat(pointsOf([0, 0], [1, 1], [0.5, 0.5]));

    const { state: next } = flatDelete(state, 1);

    expect(next.points.map((point) => point.id)).toEqual([0, 2]);
  });

  it('reports that it removed something', () => {
    expect(flatDelete(createFlat(pointsOf([0, 0])), 0).result).toBe(true);
  });

  it('traces one remove', () => {
    const { steps } = flatDelete(createFlat(pointsOf([0, 0], [1, 1])), 1);
    expect(steps).toEqual([{ kind: 'remove', id: 1 }]);
  });

  it('costs nothing', () => {
    const { counters } = flatDelete(createFlat(makeDataset(DEFAULT_DATASET)), 4);
    expect(counters).toEqual({ distanceComputations: 0, pointsScanned: 0 });
  });

  it('reports a miss for an id it does not hold', () => {
    const state = createFlat(pointsOf([0, 0], [1, 1]));

    const outcome = flatDelete(state, 99);

    expect(outcome.result).toBe(false);
    expect(outcome.state).toEqual(state);
    expect(outcome.steps).toEqual([]);
  });

  it('reports a miss for an id already deleted', () => {
    const once = flatDelete(createFlat(pointsOf([0, 0], [1, 1])), 0);
    expect(flatDelete(once.state, 0).result).toBe(false);
  });

  it('never recycles the deleted id', () => {
    const seeded = createFlat(pointsOf([0, 0], [1, 1]));
    const deleted = flatDelete(seeded, 1);

    expect(deleted.state.nextId).toBe(seeded.nextId);
    expect(flatInsert(deleted.state, [0.5, 0.5]).result).toBe(2);
  });

  it('leaves the input state unchanged', () => {
    const state = createFlat(makeDataset(DEFAULT_DATASET));
    const before = snapshot(state);

    flatDelete(state, 4);

    expect(state).toEqual(before);
  });
});
