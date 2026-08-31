import { describe, it, expect } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { DEFAULT_K, describeStep, replayLog, useVectorLab, type LabOp } from './use-vector-lab';
import { DEFAULT_DATASET, makeDataset } from '@/lib/lab/vector/dataset';
import type { SearchParams } from '@/lib/lab/vector/types';

const params: SearchParams = { k: DEFAULT_K, metric: 'euclidean' };
const seed = makeDataset(DEFAULT_DATASET);

describe('describeStep', () => {
  it('puts a scan into words, with a distance a reader can hear', () => {
    expect(describeStep({ kind: 'scan', id: 7, distance: 0.4237 })).toBe('scanning point 7, distance 0.42');
  });

  it('counts admitted ranks from one', () => {
    expect(describeStep({ kind: 'admit', id: 7, distance: 0.1, rank: 0 })).toBe(
      'admitting point 7 at rank 1, distance 0.10',
    );
  });

  it('describes the lifecycle steps too', () => {
    expect(describeStep({ kind: 'evict', id: 3 })).toBe('evicting point 3 from the result set');
    expect(describeStep({ kind: 'append', id: 3 })).toBe('appending point 3');
    expect(describeStep({ kind: 'remove', id: 3 })).toBe('removing point 3');
  });
});

describe('replayLog', () => {
  it('returns the seeded index for an empty log', () => {
    const snapshot = replayLog(seed, [], params);
    expect(snapshot.state.points).toHaveLength(seed.length);
    expect(snapshot.steps).toEqual([]);
    expect(snapshot.results).toEqual([]);
    expect(snapshot.recall).toBeNull();
  });

  it('is deterministic: the same log replays to the same state', () => {
    // This is what makes undo sound and a shared session reproducible.
    const log: readonly LabOp[] = [
      { kind: 'insert', vec: [0.2, 0.3] },
      { kind: 'search', query: [0.5, 0.5] },
      { kind: 'delete', id: seed[0].id },
    ];
    expect(replayLog(seed, log, params)).toEqual(replayLog(seed, log, params));
  });

  it('replaying the log minus its last entry is exactly undo', () => {
    const log: readonly LabOp[] = [
      { kind: 'insert', vec: [0.2, 0.3] },
      { kind: 'insert', vec: [0.8, 0.1] },
    ];
    const undone = replayLog(seed, log.slice(0, -1), params);
    expect(undone.state.points).toHaveLength(seed.length + 1);
  });

  it('keeps only the last operation trace, not a concatenation of all of them', () => {
    // The first op is a delete rather than a second insert: flatInsert's id is
    // state.nextId, which is history-dependent by design (ids are never
    // reused), so a second insert-after-insert would legitimately get a
    // different id when replayed alone vs. within the full log. A delete
    // leaves nextId untouched, isolating what this test actually checks —
    // that steps holds only the last op's trace, not every op's concatenated.
    const log: readonly LabOp[] = [
      { kind: 'delete', id: seed[0].id },
      { kind: 'insert', vec: [0.8, 0.1] },
    ];
    expect(replayLog(seed, log, params).steps).toEqual(replayLog(seed, log.slice(1), params).steps);
  });

  it('answers the standing query again after the index is edited', () => {
    // Otherwise the result set on screen is stale the instant a point moves.
    const before = replayLog(seed, [{ kind: 'search', query: [0.5, 0.5] }], params);
    const after = replayLog(seed, [{ kind: 'search', query: [0.5, 0.5] }, { kind: 'insert', vec: [0.5, 0.5] }], params);
    expect(after.results[0].distance).toBeLessThanOrEqual(before.results[0].distance);
  });

  it('reports the cost of the operation the reader performed, not the re-answer', () => {
    const snapshot = replayLog(seed, [{ kind: 'search', query: [0.5, 0.5] }, { kind: 'insert', vec: [0.1, 0.1] }], params);
    expect(snapshot.steps.every((step) => step.kind === 'append')).toBe(true);
  });

  it('scores recall against brute force over the same points', () => {
    const snapshot = replayLog(seed, [{ kind: 'search', query: [0.5, 0.5] }], params);
    expect(snapshot.recall).toBe(1);
  });
});

describe('useVectorLab', () => {
  it('starts on the seeded dataset with nothing logged', () => {
    const { result } = renderHook(() => useVectorLab());
    expect(result.current.points).toHaveLength(seed.length);
    expect(result.current.log).toEqual([]);
    expect(result.current.canUndo).toBe(false);
    expect(result.current.stepDescription).toBe('no steps to replay');
  });

  it('inserts a point and traces it', () => {
    const { result } = renderHook(() => useVectorLab());
    act(() => result.current.insert([0.42, 0.42]));
    expect(result.current.points).toHaveLength(seed.length + 1);
    expect(result.current.steps.length).toBeGreaterThan(0);
  });

  it('removes a point by id', () => {
    const { result } = renderHook(() => useVectorLab());
    act(() => result.current.remove(seed[0].id));
    expect(result.current.points).toHaveLength(seed.length - 1);
    expect(result.current.points.some((point) => point.id === seed[0].id)).toBe(false);
  });

  it('searches, filling results and recall', () => {
    const { result } = renderHook(() => useVectorLab());
    act(() => result.current.search([0.5, 0.5]));
    expect(result.current.results).toHaveLength(DEFAULT_K);
    expect(result.current.recall).toBe(1);
    expect(result.current.query).toEqual([0.5, 0.5]);
  });

  it('undoes by replaying the log without its last entry', () => {
    const { result } = renderHook(() => useVectorLab());
    act(() => result.current.insert([0.42, 0.42]));
    act(() => result.current.insert([0.11, 0.11]));
    act(() => result.current.undo());
    expect(result.current.points).toHaveLength(seed.length + 1);
    expect(result.current.log).toHaveLength(1);
  });

  it('cannot undo past the seed', () => {
    const { result } = renderHook(() => useVectorLab());
    act(() => result.current.undo());
    expect(result.current.points).toHaveLength(seed.length);
    expect(result.current.canUndo).toBe(false);
  });

  it('resets to the seeded dataset however long the log is', () => {
    const { result } = renderHook(() => useVectorLab());
    act(() => result.current.insert([0.42, 0.42]));
    act(() => result.current.remove(seed[0].id));
    act(() => result.current.search([0.5, 0.5]));
    act(() => result.current.reset());
    expect(result.current.points).toHaveLength(seed.length);
    expect(result.current.log).toEqual([]);
    expect(result.current.results).toEqual([]);
  });

  it('pins the step index to the end of the newest operation', () => {
    const { result } = renderHook(() => useVectorLab());
    act(() => result.current.search([0.5, 0.5]));
    expect(result.current.stepIndex).toBe(result.current.steps.length - 1);
  });

  it('honours a scrubbed index, and describes that step', () => {
    const { result } = renderHook(() => useVectorLab());
    act(() => result.current.search([0.5, 0.5]));
    act(() => result.current.setStepIndex(3));
    expect(result.current.stepIndex).toBe(3);
    expect(result.current.stepDescription).toBe(describeStep(result.current.steps[3]));
  });

  it('returns to the end when a new operation runs', () => {
    const { result } = renderHook(() => useVectorLab());
    act(() => result.current.search([0.5, 0.5]));
    act(() => result.current.setStepIndex(2));
    act(() => result.current.insert([0.42, 0.42]));
    expect(result.current.stepIndex).toBe(result.current.steps.length - 1);
  });

  it('clamps a scrubbed index that a shorter trace no longer contains', () => {
    const { result } = renderHook(() => useVectorLab());
    act(() => result.current.search([0.5, 0.5]));
    const far = result.current.steps.length - 1;
    act(() => result.current.setStepIndex(far));
    act(() => result.current.setStepIndex(far + 50));
    expect(result.current.stepIndex).toBe(far);
  });

  it('takes k from its options', () => {
    const { result } = renderHook(() => useVectorLab({ k: 3 }));
    act(() => result.current.search([0.5, 0.5]));
    expect(result.current.k).toBe(3);
    expect(result.current.results).toHaveLength(3);
  });
});
