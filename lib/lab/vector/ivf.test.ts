import { describe, it, expect } from 'vitest';
import { makeDataset } from './dataset';
import { trainIvf, ivfInsert, ivfDelete } from './ivf';

const points = makeDataset({ seed: 7, clusters: 4, perCluster: 40, spread: 0.04, straddlers: 12 });
const params = { cells: 4, maxIterations: 100, seed: 7 };

describe('trainIvf', () => {
  it('produces one centroid and one posting list per cell', () => {
    const { state } = trainIvf(points, params);
    expect(state.centroids).toHaveLength(params.cells);
    expect(state.cells).toHaveLength(params.cells);
  });

  it('files every point into exactly one cell', () => {
    const { state } = trainIvf(points, params);
    const assigned = state.cells.flat();
    expect(assigned).toHaveLength(points.length);
    expect(new Set(assigned).size).toBe(points.length);
    expect(new Set(assigned)).toEqual(new Set(points.map((p) => p.id)));
  });

  it('keeps every point reachable by id', () => {
    const { state } = trainIvf(points, params);
    points.forEach((point) => {
      expect(state.points.get(point.id), `point ${point.id}`).toEqual(point);
    });
    expect(state.nextId).toBe(Math.max(...points.map((p) => p.id)) + 1);
  });

  it('starts with no drift, because it has just trained', () => {
    expect(trainIvf(points, params).state.insertsSinceTrain).toBe(0);
  });

  it('emits a trainIteration step per iteration so the reader can watch centroids settle', () => {
    const { steps } = trainIvf(points, params);
    const iterations = steps.filter((step) => step.kind === 'trainIteration');
    expect(iterations.length).toBeGreaterThan(1);
    iterations.forEach((step, index) => {
      expect(step).toMatchObject({ kind: 'trainIteration', iteration: index });
      if (step.kind === 'trainIteration') {
        expect(step.centroids).toHaveLength(params.cells);
        expect(step.shift).toBeGreaterThanOrEqual(0);
      }
    });
  });

  it('runs to convergence rather than to the iteration cap', () => {
    const { steps } = trainIvf(points, params);
    const iterations = steps.filter((step) => step.kind === 'trainIteration');
    const last = iterations[iterations.length - 1];
    expect(iterations.length).toBeLessThan(params.maxIterations);
    if (last.kind === 'trainIteration') expect(last.shift).toBeLessThan(1e-9);
  });

  it('emits an assign step per point after training', () => {
    const { steps } = trainIvf(points, params);
    const assigns = steps.filter((step) => step.kind === 'assign');
    expect(assigns).toHaveLength(points.length);
  });

  it('counts one distance computation per point per centroid, per pass', () => {
    const { steps, counters } = trainIvf(points, params);
    const iterations = steps.filter((step) => step.kind === 'trainIteration').length;
    // One assignment pass per iteration, plus the final pass that fills the cells.
    expect(counters.distanceComputations).toBe(points.length * params.cells * (iterations + 1));
    expect(counters.pointsScanned).toBe(points.length);
    expect(counters.cellsProbed).toBe(0);
  });

  it('is deterministic for a seed', () => {
    expect(trainIvf(points, params).state).toEqual(trainIvf(points, params).state);
  });

  it('leaves the input points untouched', () => {
    const snapshot = structuredClone(points);
    trainIvf(points, params);
    expect(points).toEqual(snapshot);
  });

  it('refuses to seed more centroids than there are points', () => {
    expect(() => trainIvf(points.slice(0, 3), params)).toThrow(/at least 4 points/);
  });
});

describe('ivfInsert', () => {
  it('appends the point to the posting list of the nearest centroid', () => {
    const { state } = trainIvf(points, params);
    const target = state.centroids[2];
    const { state: next, result: id, steps } = ivfInsert(state, [...target]);
    expect(next.cells[2]).toContain(id);
    expect(steps).toEqual([{ kind: 'assign', id, cell: 2 }]);
  });

  it('hands out a fresh id and stores the point', () => {
    const { state } = trainIvf(points, params);
    const { state: next, result: id } = ivfInsert(state, [0.5, 0.5]);
    expect(id).toBe(state.nextId);
    expect(next.nextId).toBe(state.nextId + 1);
    expect(next.points.get(id)).toEqual({ id, vec: [0.5, 0.5] });
  });

  it('does not retrain — the centroids are exactly the ones it was given', () => {
    const { state } = trainIvf(points, params);
    let current = state;
    for (let i = 0; i < 50; i += 1) current = ivfInsert(current, [0.02 + i * 0.0001, 0.02]).state;
    expect(current.centroids).toEqual(state.centroids);
  });

  it('counts the drift so the readout can warn about it', () => {
    const { state } = trainIvf(points, params);
    const once = ivfInsert(state, [0.5, 0.5]).state;
    expect(once.insertsSinceTrain).toBe(1);
    expect(ivfInsert(once, [0.4, 0.4]).state.insertsSinceTrain).toBe(2);
  });

  it('charges one distance computation per centroid and scans nothing', () => {
    const { state } = trainIvf(points, params);
    const { counters } = ivfInsert(state, [0.5, 0.5]);
    expect(counters).toEqual({ distanceComputations: params.cells, cellsProbed: 0, pointsScanned: 0 });
  });

  it('leaves the input state unchanged', () => {
    const { state } = trainIvf(points, params);
    const snapshot = structuredClone(state);
    ivfInsert(state, [0.5, 0.5]);
    expect(state).toEqual(snapshot);
  });

  it('copies the vector, so a later mutation of the caller\'s array cannot reach the index', () => {
    const { state } = trainIvf(points, params);
    const vec = [0.5, 0.5];
    const { state: next, result: id } = ivfInsert(state, vec);
    vec[0] = 0.9;
    expect(next.points.get(id)?.vec).toEqual([0.5, 0.5]);
  });
});

describe('ivfDelete', () => {
  it('drops the id from its posting list and from the point map', () => {
    const { state } = trainIvf(points, params);
    const cell = state.cells.findIndex((ids) => ids.length > 0);
    const victim = state.cells[cell][0];
    const { state: next, result, steps } = ivfDelete(state, victim);

    expect(result).toBe(true);
    expect(next.cells[cell]).not.toContain(victim);
    expect(next.points.has(victim)).toBe(false);
    expect(steps).toEqual([{ kind: 'remove', id: victim, cell }]);
  });

  it('touches no other cell', () => {
    const { state } = trainIvf(points, params);
    const cell = state.cells.findIndex((ids) => ids.length > 0);
    const { state: next } = ivfDelete(state, state.cells[cell][0]);
    next.cells.forEach((ids, i) => {
      if (i !== cell) expect(ids, `cell ${i}`).toEqual(state.cells[i]);
    });
  });

  it('costs nothing — no centroid is recomputed, which is why they go stale', () => {
    const { state } = trainIvf(points, params);
    const { state: next, counters } = ivfDelete(state, state.cells.flat()[0]);
    expect(counters).toEqual({ distanceComputations: 0, cellsProbed: 0, pointsScanned: 0 });
    expect(next.centroids).toEqual(state.centroids);
  });

  it('reports false for an id the index never held', () => {
    const { state } = trainIvf(points, params);
    const { state: next, result, steps } = ivfDelete(state, 99999);
    expect(result).toBe(false);
    expect(steps).toEqual([]);
    expect(next).toEqual(state);
  });

  it('is idempotent — deleting twice is not an error', () => {
    const { state } = trainIvf(points, params);
    const victim = state.cells.flat()[0];
    const once = ivfDelete(state, victim).state;
    expect(ivfDelete(once, victim).result).toBe(false);
  });

  it('leaves the input state unchanged', () => {
    const { state } = trainIvf(points, params);
    const snapshot = structuredClone(state);
    ivfDelete(state, state.cells.flat()[0]);
    expect(state).toEqual(snapshot);
  });
});
