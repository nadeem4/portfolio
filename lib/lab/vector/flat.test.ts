import { describe, it, expect } from 'vitest';
import { createFlat, flatInsert, flatDelete, flatSearch } from './flat';
import { euclidean } from './metrics';
import { makeDataset, DEFAULT_DATASET } from './dataset';
import type { Point, Ranked, SearchParams } from './types';

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

const EUCLIDEAN_3: SearchParams = { k: 3, metric: 'euclidean' };

describe('flatSearch', () => {
  it('returns the exact nearest neighbours of a hand-computed fixture', () => {
    // Distances from [0, 0] are 0, 0.1, 0.3, 1 and sqrt(0.5); the top three are
    // therefore ids 0, 1 and 2 in that order.
    const state = createFlat(pointsOf([0, 0], [0.1, 0], [0.3, 0], [1, 0], [0.5, 0.5]));

    const { result } = flatSearch(state, [0, 0], EUCLIDEAN_3);

    expect(result.map((ranked) => ranked.id)).toEqual([0, 1, 2]);
    expect(result[0].distance).toBeCloseTo(0, 10);
    expect(result[1].distance).toBeCloseTo(0.1, 10);
    expect(result[2].distance).toBeCloseTo(0.3, 10);
  });

  it('scans every point exactly once, in index order', () => {
    const state = createFlat(pointsOf([0, 0], [0.1, 0], [0.3, 0], [1, 0], [0.5, 0.5]));

    const { steps } = flatSearch(state, [0, 0], EUCLIDEAN_3);

    expect(steps.filter((step) => step.kind === 'scan').map((step) => step.id)).toEqual([0, 1, 2, 3, 4]);
  });

  it('admits nothing once the top k is full of nearer points', () => {
    const state = createFlat(pointsOf([0, 0], [0.1, 0], [0.3, 0], [1, 0], [0.5, 0.5]));

    const { steps } = flatSearch(state, [0, 0], EUCLIDEAN_3);

    expect(steps.filter((step) => step.kind === 'admit').map((step) => step.id)).toEqual([0, 1, 2]);
    expect(steps.filter((step) => step.kind === 'evict')).toEqual([]);
  });

  it('evicts the running worst when a nearer point arrives later', () => {
    // Scanned worst-first, so the reader watches the shortlist churn.
    const state = createFlat(pointsOf([1, 0], [0.5, 0], [0.2, 0]));

    const { steps, result } = flatSearch(state, [0, 0], { k: 2, metric: 'euclidean' });

    expect(steps.map((step) => step.kind)).toEqual(['scan', 'admit', 'scan', 'admit', 'scan', 'admit', 'evict']);
    expect(steps.filter((step) => step.kind === 'evict')).toEqual([{ kind: 'evict', id: 0 }]);
    expect(result.map((ranked) => ranked.id)).toEqual([2, 1]);
  });

  it('records the rank a point was admitted at', () => {
    const state = createFlat(pointsOf([1, 0], [0.5, 0]));

    const { steps } = flatSearch(state, [0, 0], { k: 2, metric: 'euclidean' });

    expect(steps.filter((step) => step.kind === 'admit')).toEqual([
      { kind: 'admit', id: 0, distance: 1, rank: 0 },
      { kind: 'admit', id: 1, distance: 0.5, rank: 0 },
    ]);
  });

  it('breaks distance ties by id, whatever order the points are held in', () => {
    // Ground truth has to be a total order, or every other index's recall would
    // wobble for reasons that have nothing to do with the index under test.
    const forward = createFlat([
      { id: 5, vec: [0, 1] },
      { id: 2, vec: [1, 0] },
    ]);
    const reversed = createFlat([
      { id: 2, vec: [1, 0] },
      { id: 5, vec: [0, 1] },
    ]);
    const params: SearchParams = { k: 1, metric: 'euclidean' };

    expect(flatSearch(forward, [0, 0], params).result.map((ranked) => ranked.id)).toEqual([2]);
    expect(flatSearch(reversed, [0, 0], params).result.map((ranked) => ranked.id)).toEqual([2]);
  });

  it('agrees with an independent full sort over the seeded dataset', () => {
    const points = makeDataset(DEFAULT_DATASET);
    const state = createFlat(points);
    const query: readonly number[] = [0.5, 0.5];

    const expected = [...points]
      .map((point): Ranked => ({ id: point.id, distance: euclidean(query, point.vec) }))
      .sort((a, b) => a.distance - b.distance || a.id - b.id)
      .slice(0, 10);

    const { result } = flatSearch(state, query, { k: 10, metric: 'euclidean' });

    expect(result.map((ranked) => ranked.id)).toEqual(expected.map((ranked) => ranked.id));
    result.forEach((ranked, index) => {
      expect(ranked.distance).toBeCloseTo(expected[index].distance, 12);
    });
  });

  it('returns every point when k exceeds the index size', () => {
    const state = createFlat(pointsOf([0.3, 0], [0.1, 0]));

    const { result } = flatSearch(state, [0, 0], { k: 10, metric: 'euclidean' });

    expect(result.map((ranked) => ranked.id)).toEqual([1, 0]);
  });

  it('returns nothing from an empty index', () => {
    const outcome = flatSearch(createFlat([]), [0, 0], EUCLIDEAN_3);

    expect(outcome.result).toEqual([]);
    expect(outcome.steps).toEqual([]);
  });

  it('ranks by the requested metric', () => {
    const state = createFlat(pointsOf([5, 0], [0.1, 0.1]));
    const query: readonly number[] = [1, 0];

    // Euclidean prefers the near point; dot prefers the long one.
    expect(flatSearch(state, query, { k: 1, metric: 'euclidean' }).result[0].id).toBe(1);
    expect(flatSearch(state, query, { k: 1, metric: 'dot' }).result[0].id).toBe(0);
  });

  it('charges one distance computation per point, whatever k is', () => {
    const points = makeDataset(DEFAULT_DATASET);
    const state = createFlat(points);

    expect(flatSearch(state, [0.5, 0.5], { k: 1, metric: 'euclidean' }).counters).toEqual({
      distanceComputations: points.length,
      pointsScanned: points.length,
    });
    expect(flatSearch(state, [0.5, 0.5], { k: 50, metric: 'euclidean' }).counters).toEqual({
      distanceComputations: points.length,
      pointsScanned: points.length,
    });
  });

  it('still scans everything when nothing is asked for', () => {
    const state = createFlat(pointsOf([0, 0], [1, 1]));

    const outcome = flatSearch(state, [0, 0], { k: 0, metric: 'euclidean' });

    expect(outcome.result).toEqual([]);
    expect(outcome.counters.distanceComputations).toBe(2);
  });

  it('never returns a deleted point', () => {
    const seeded = createFlat(pointsOf([0, 0], [0.1, 0], [0.3, 0]));
    const { state } = flatDelete(seeded, 0);

    const { result } = flatSearch(state, [0, 0], EUCLIDEAN_3);

    expect(result.map((ranked) => ranked.id)).toEqual([1, 2]);
  });

  it('returns a point inserted a moment ago', () => {
    const inserted = flatInsert(createFlat(pointsOf([1, 1])), [0, 0]);

    const { result } = flatSearch(inserted.state, [0, 0], { k: 1, metric: 'euclidean' });

    expect(result.map((ranked) => ranked.id)).toEqual([inserted.result]);
  });

  it('leaves the input state unchanged and hands it straight back', () => {
    const state = createFlat(makeDataset(DEFAULT_DATASET));
    const before = snapshot(state);

    const outcome = flatSearch(state, [0.5, 0.5], { k: 10, metric: 'euclidean' });

    expect(state).toEqual(before);
    expect(outcome.state).toBe(state);
  });
});
