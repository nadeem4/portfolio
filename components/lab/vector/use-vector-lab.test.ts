import { describe, it, expect } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import {
  DEFAULT_IVF,
  DEFAULT_K,
  describeStep,
  replayLog,
  useVectorLab,
  type IndexKind,
  type LabOp,
  type LabParams as WideLabParams,
} from './use-vector-lab';
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
    expect(snapshot.points).toHaveLength(seed.length);
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
    expect(undone.points).toHaveLength(seed.length + 1);
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

describe('replayLog previousCounters', () => {
  it('carries the operation before last, so the scoreboard can show movement', () => {
    const log: readonly LabOp[] = [
      { kind: 'search', query: [0.5, 0.5] },
      { kind: 'insert', vec: [0.2, 0.3] },
    ];
    const snapshot = replayLog(seed, log, params);
    // Last op is the insert; the search before it was a different kind, so
    // there is nothing comparable to show.
    expect(snapshot.counters.distanceComputations).toBe(0);
    expect(snapshot.previousCounters).toBeNull();
  });

  it('has no previous counters until two operations have run', () => {
    expect(replayLog(seed, [], params).previousCounters).toBeNull();
    expect(replayLog(seed, [{ kind: 'insert', vec: [0.2, 0.3] }], params).previousCounters).toBeNull();
  });

  it('compares like with like — the previous op of the SAME kind', () => {
    // A search costs a full scan and an insert costs nothing, so comparing a
    // search against the insert before it always reads "+128" and teaches
    // nothing. The lesson is search-to-search: add ten points, pay ten more.
    const log: readonly LabOp[] = [
      { kind: 'search', query: [0.5, 0.5] },
      { kind: 'insert', vec: [0.2, 0.3] },
      { kind: 'search', query: [0.5, 0.5] },
    ];
    const snapshot = replayLog(seed, log, params);
    expect(snapshot.counters.distanceComputations).toBe(seed.length + 1);
    expect(snapshot.previousCounters?.distanceComputations).toBe(seed.length);
  });

  it('offers no comparison when this kind of operation has not run before', () => {
    const log: readonly LabOp[] = [
      { kind: 'search', query: [0.5, 0.5] },
      { kind: 'insert', vec: [0.2, 0.3] },
    ];
    expect(replayLog(seed, log, params).previousCounters).toBeNull();
  });
});

// --- Task 26: widen replayLog/useVectorLab with a selectable index ---------

function wideParams(overrides: Partial<WideLabParams> = {}): WideLabParams {
  return {
    k: DEFAULT_K,
    metric: 'euclidean',
    index: 'flat' as IndexKind,
    nprobe: 1,
    ivf: DEFAULT_IVF,
    ...overrides,
  };
}

describe('replayLog across index kinds', () => {
  it('reports cell geometry for ivf and none for flat', () => {
    const flat = replayLog(seed, [], wideParams());
    const ivf = replayLog(seed, [], wideParams({ index: 'ivf' }));
    expect(flat.centroids).toBeNull();
    expect(flat.cellBalance).toBeNull();
    expect(ivf.centroids).toHaveLength(DEFAULT_IVF.cells);
    expect(typeof ivf.cellBalance).toBe('number');
  });

  it('folds the same log through either index and reaches the same point set', () => {
    // One log, one undo stack. If this drifts, the index select silently
    // changes the reader's data underneath them.
    const log: readonly LabOp[] = [
      { kind: 'insert', vec: [0.5, 0.5] },
      { kind: 'delete', id: seed[0].id },
    ];
    const flat = replayLog(seed, log, wideParams());
    const ivf = replayLog(seed, log, wideParams({ index: 'ivf' }));
    expect(ivf.points.map((p) => p.id)).toEqual(flat.points.map((p) => p.id));
  });

  it('lands on the k-means training trace before any operation is logged', () => {
    // Building the index is half of what IVF teaches, so the scrubber has
    // something to walk the moment the reader picks it.
    const ivf = replayLog(seed, [], wideParams({ index: 'ivf' }));
    expect(ivf.steps.some((step) => step.kind === 'trainIteration')).toBe(true);
  });

  it('answers the last query against the final state, not the state at the time', () => {
    const target = seed[0];
    const withLaterDelete: readonly LabOp[] = [
      { kind: 'search', query: target.vec },
      { kind: 'delete', id: target.id },
    ];
    const snapshot = replayLog(seed, withLaterDelete, wideParams());
    expect(snapshot.results.map((r) => r.id)).not.toContain(target.id);
  });

  it('matches flat exactly once nprobe covers every cell', () => {
    const log: readonly LabOp[] = [{ kind: 'search', query: [0.5, 0.5] }];
    const flat = replayLog(seed, log, wideParams());
    const ivf = replayLog(seed, log, wideParams({ index: 'ivf', nprobe: DEFAULT_IVF.cells }));
    expect(ivf.results.map((r) => r.id)).toEqual(flat.results.map((r) => r.id));
    expect(ivf.recall).toBe(1);
  });

  it('counts inserts since the last train and clears them on rebuild', () => {
    const inserted: readonly LabOp[] = [{ kind: 'insert', vec: [0.5, 0.5] }];
    expect(replayLog(seed, inserted, wideParams({ index: 'ivf' })).insertsSinceTrain).toBe(1);
    expect(
      replayLog(seed, [...inserted, { kind: 'rebuild' }], wideParams({ index: 'ivf' })).insertsSinceTrain,
    ).toBe(0);
  });

  it('treats rebuild as a no-op on flat, which has nothing to retrain', () => {
    const before = replayLog(seed, [], wideParams());
    const after = replayLog(seed, [{ kind: 'rebuild' }], wideParams());
    expect(after.points.map((p) => p.id)).toEqual(before.points.map((p) => p.id));
  });

  it('records ivf costs into lastByKind exactly as the flat branch does, so deltas keep working', () => {
    // The one thing the drift notice flags as the likeliest thing to break
    // silently: an insert-then-insert on ivf must show a comparable delta,
    // just like it already does on flat.
    const log: readonly LabOp[] = [
      { kind: 'insert', vec: [0.1, 0.1] },
      { kind: 'insert', vec: [0.9, 0.9] },
    ];
    const snapshot = replayLog(seed, log, wideParams({ index: 'ivf' }));
    expect(snapshot.previousCounters).not.toBeNull();
  });
});

describe('describeStep for the ivf vocabulary', () => {
  it('words a training iteration', () => {
    expect(describeStep({ kind: 'trainIteration', iteration: 2, centroids: [], shift: 0.125 })).toBe(
      'Training iteration 2: centroids moved 0.125',
    );
  });

  it('distinguishes a probed cell from a skipped one', () => {
    expect(describeStep({ kind: 'probeCell', cell: 3, distance: 0.2 })).toMatch(/^Probed cell 3/);
    expect(describeStep({ kind: 'skipCell', cell: 4, distance: 0.9 })).toMatch(/^Skipped cell 4/);
  });

  it('names the cell a point was removed from, when the step carries one', () => {
    expect(describeStep({ kind: 'remove', id: 7, cell: 2 })).toBe('Removed point 7 from cell 2');
  });

  it('keeps PR 1s flat wording for a remove step with no cell', () => {
    // Flat's own remove step never carries a cell, and that wording is
    // asserted verbatim by the "describeStep" block above -- it must not
    // change just because the type widened to include IVF's remove.
    expect(describeStep({ kind: 'remove', id: 7 })).toBe('removing point 7');
  });
});

describe('useVectorLab with an index option', () => {
  it('re-derives results when nprobe changes, with no effect involved', () => {
    const { result, rerender } = renderHook(
      ({ nprobe }: { nprobe: number }) => useVectorLab({ index: 'ivf', nprobe }),
      { initialProps: { nprobe: 1 } },
    );
    act(() => result.current.search([0.5, 0.5]));
    const narrow = result.current.counters.cellsProbed;
    rerender({ nprobe: DEFAULT_IVF.cells });
    expect(result.current.counters.cellsProbed).toBeGreaterThan(narrow);
    expect(result.current.recall).toBe(1);
  });

  it('collapses consecutive query moves into one undo step', () => {
    // Dragging the query fires per pointer move; without this, undo becomes a
    // frame-by-frame rewind of a mouse gesture.
    const { result } = renderHook(() => useVectorLab({ index: 'ivf' }));
    act(() => result.current.search([0.2, 0.2]));
    act(() => result.current.search([0.8, 0.8]));
    expect(result.current.log).toHaveLength(1);
    expect(result.current.query).toEqual([0.8, 0.8]);
  });

  it('logs a rebuild so undo can step back over it', () => {
    const { result } = renderHook(() => useVectorLab({ index: 'ivf' }));
    act(() => result.current.insert([0.5, 0.5]));
    act(() => result.current.rebuild());
    expect(result.current.insertsSinceTrain).toBe(0);
    act(() => result.current.undo());
    expect(result.current.insertsSinceTrain).toBe(1);
    expect(result.current.canUndo).toBe(true);
  });

  it('exposes no cell geometry on flat', () => {
    const { result } = renderHook(() => useVectorLab());
    expect(result.current.centroids).toBeNull();
    expect(result.current.cellBalance).toBeNull();
    expect(result.current.insertsSinceTrain).toBeNull();
  });
});
