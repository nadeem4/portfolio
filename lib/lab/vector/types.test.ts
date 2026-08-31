import { describe, it, expect } from 'vitest';
import type { Counters, Metric, OpResult, Point, Ranked, SearchParams, Vec } from './types';

// These types are locked across 36 tasks. The runtime assertions exercise the
// usage pattern, but `tsc --noEmit` is the only guard against renames or
// restructures: esbuild elides type-only imports at transform time.

interface ToyState {
  readonly points: readonly Point[];
}

type ToyStep = { readonly kind: 'scan'; readonly id: PointIdAlias };
type PointIdAlias = Point['id'];

function toyOp(state: ToyState): OpResult<ToyState, readonly Ranked[], ToyStep> {
  return {
    state,
    result: state.points.map((point, rank) => ({ id: point.id, distance: rank })),
    steps: state.points.map((point) => ({ kind: 'scan' as const, id: point.id })),
    counters: { pointsScanned: state.points.length },
  };
}

describe('shared primitives', () => {
  it('threads state through an operation instead of mutating it', () => {
    const vec: Vec = [0.25, 0.75];
    const state: ToyState = { points: [{ id: 0, vec }, { id: 1, vec: [1, 1] }] };

    const outcome = toyOp(state);

    expect(outcome.state).toBe(state);
    expect(outcome.result.map((ranked) => ranked.id)).toEqual([0, 1]);
    expect(outcome.steps).toEqual([
      { kind: 'scan', id: 0 },
      { kind: 'scan', id: 1 },
    ]);
  });

  it('carries counters as a plain string-keyed record', () => {
    const counters: Counters = { distanceComputations: 4, pointsScanned: 4 };
    expect(counters.pointsScanned).toBe(4);
  });

  it('names the three metrics the playground ranks by', () => {
    const metrics: Metric[] = ['euclidean', 'cosine', 'dot'];
    const params: SearchParams = { k: 10, metric: metrics[0] };

    expect(params.metric).toBe('euclidean');
    expect(metrics).toHaveLength(3);
  });
});
