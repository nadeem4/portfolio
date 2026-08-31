import { describe, it, expect } from 'vitest';
import { makeDataset } from './dataset';
import { trainIvf, ivfInsert, ivfDelete, ivfSearch } from './ivf';
import { createFlat, flatSearch } from './flat';
import { recallAtK } from './recall';
import { mulberry32 } from './random';

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

/** A fixed sweep of queries, so every claim below is about the same 24 probes. */
function seededQueries(count: number): number[][] {
  const rng = mulberry32(11);
  return Array.from({ length: count }, () => [rng(), rng()]);
}

const queries = seededQueries(24);

describe('ivfSearch', () => {
  it('returns exactly what flat search returns when every cell is probed', () => {
    const { state } = trainIvf(points, params);
    const flat = createFlat(points);
    queries.forEach((query, i) => {
      const truth = flatSearch(flat, query, { k: 10, metric: 'euclidean' }).result;
      const got = ivfSearch(state, query, { k: 10, metric: 'euclidean', nprobe: params.cells }).result;
      // Both rank by the same `distance` on the same vectors, so the values are
      // bit-identical; only an exact tie could separate them, and seeded
      // continuous coordinates do not produce one.
      expect(got, `query ${i}`).toEqual(truth);
    });
  });

  it('misses at least one true neighbour at nprobe=1 — the lab\'s whole point', () => {
    const { state } = trainIvf(points, params);
    const flat = createFlat(points);
    const missed = queries.filter((query) => {
      const truth = flatSearch(flat, query, { k: 10, metric: 'euclidean' }).result;
      const got = ivfSearch(state, query, { k: 10, metric: 'euclidean', nprobe: 1 }).result;
      return recallAtK(got, truth, 10) < 1;
    });
    expect(
      missed.length,
      'no seeded query lost a neighbour at nprobe=1: the dataset is not adversarial enough, so raise `straddlers` or tighten `spread` in makeDataset',
    ).toBeGreaterThan(0);
  });

  it('recovers recall as nprobe rises', () => {
    const { state } = trainIvf(points, params);
    const flat = createFlat(points);
    const meanRecall = (nprobe: number) =>
      queries.reduce((total, query) => {
        const truth = flatSearch(flat, query, { k: 10, metric: 'euclidean' }).result;
        const got = ivfSearch(state, query, { k: 10, metric: 'euclidean', nprobe }).result;
        return total + recallAtK(got, truth, 10);
      }, 0) / queries.length;

    expect(meanRecall(1)).toBeLessThan(1);
    expect(meanRecall(2)).toBeGreaterThan(meanRecall(1));
    expect(meanRecall(params.cells)).toBe(1);
  });

  it('probes the nearest cells and marks the rest skipped', () => {
    const { state } = trainIvf(points, params);
    const { steps, counters } = ivfSearch(state, [0.3, 0.3], { k: 10, metric: 'euclidean', nprobe: 2 });
    const probed = steps.filter((step) => step.kind === 'probeCell');
    const skipped = steps.filter((step) => step.kind === 'skipCell');

    expect(probed).toHaveLength(2);
    expect(skipped).toHaveLength(params.cells - 2);
    expect(counters.cellsProbed).toBe(2);
    const probedDistances = probed.map((s) => (s.kind === 'probeCell' ? s.distance : NaN));
    const skippedDistances = skipped.map((s) => (s.kind === 'skipCell' ? s.distance : NaN));
    expect(Math.max(...probedDistances)).toBeLessThanOrEqual(Math.min(...skippedDistances));
  });

  it('scans only the points inside the probed cells', () => {
    const { state } = trainIvf(points, params);
    const { steps, counters } = ivfSearch(state, [0.3, 0.3], { k: 10, metric: 'euclidean', nprobe: 2 });
    const probedCells = steps.flatMap((step) => (step.kind === 'probeCell' ? [step.cell] : []));
    const expected = probedCells.reduce((total, cell) => total + state.cells[cell].length, 0);

    expect(counters.pointsScanned).toBe(expected);
    expect(steps.filter((step) => step.kind === 'scan')).toHaveLength(expected);
    expect(counters.distanceComputations).toBe(params.cells + expected);
  });

  it('emits one ranked admit per returned neighbour', () => {
    const { state } = trainIvf(points, params);
    const { result, steps } = ivfSearch(state, [0.3, 0.3], { k: 5, metric: 'euclidean', nprobe: 4 });
    const admits = steps.filter((step) => step.kind === 'admit');
    expect(result).toHaveLength(5);
    expect(admits).toHaveLength(5);
    admits.forEach((step, rank) => {
      if (step.kind === 'admit') {
        expect(step.rank).toBe(rank);
        expect(step.id).toBe(result[rank].id);
      }
    });
  });

  it('never returns a deleted point', () => {
    const { state } = trainIvf(points, params);
    const victim = ivfSearch(state, [0.3, 0.3], { k: 1, metric: 'euclidean', nprobe: 4 }).result[0].id;
    const after = ivfDelete(state, victim).state;
    const ids = ivfSearch(after, [0.3, 0.3], { k: 10, metric: 'euclidean', nprobe: 4 }).result.map((r) => r.id);
    expect(ids).not.toContain(victim);
  });

  it('finds a point inserted after training', () => {
    const { state } = trainIvf(points, params);
    const { state: next, result: id } = ivfInsert(state, [0.321, 0.654]);
    const ids = ivfSearch(next, [0.321, 0.654], { k: 1, metric: 'euclidean', nprobe: params.cells }).result.map((r) => r.id);
    expect(ids).toEqual([id]);
  });

  it('returns the state unchanged, for signature uniformity', () => {
    const { state } = trainIvf(points, params);
    const snapshot = structuredClone(state);
    const { state: after } = ivfSearch(state, [0.3, 0.3], { k: 10, metric: 'euclidean', nprobe: 2 });
    expect(after).toBe(state);
    expect(state).toEqual(snapshot);
  });
});
