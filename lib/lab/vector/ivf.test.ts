import { describe, it, expect } from 'vitest';
import { makeDataset } from './dataset';
import { trainIvf } from './ivf';

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
