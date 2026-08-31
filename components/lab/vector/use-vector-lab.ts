'use client';

import { useCallback, useMemo, useState } from 'react';
import { DEFAULT_DATASET, makeDataset, type DatasetOptions } from '@/lib/lab/vector/dataset';
import { createFlat, flatDelete, flatInsert, flatSearch, type FlatState, type FlatStep } from '@/lib/lab/vector/flat';
import { recallAtK } from '@/lib/lab/vector/recall';
import type { Counters, Metric, Point, PointId, Ranked, SearchParams, Vec } from '@/lib/lab/vector/types';

export const DEFAULT_K = 10;

/** One thing the reader did. The list of these is the whole session. */
export type LabOp =
  | { readonly kind: 'insert'; readonly vec: Vec }
  | { readonly kind: 'delete'; readonly id: PointId }
  | { readonly kind: 'search'; readonly query: Vec };

export interface LabSnapshot {
  readonly state: FlatState;
  /** The trace of the LAST operation only — what the scrubber walks. */
  readonly steps: readonly FlatStep[];
  readonly counters: Counters;
  readonly results: readonly Ranked[];
  readonly query: Vec | null;
  readonly recall: number | null;
}

const EMPTY_COUNTERS: Counters = {};

export function describeStep(step: FlatStep): string {
  switch (step.kind) {
    case 'scan':
      return `scanning point ${step.id}, distance ${step.distance.toFixed(2)}`;
    case 'admit':
      return `admitting point ${step.id} at rank ${step.rank + 1}, distance ${step.distance.toFixed(2)}`;
    case 'evict':
      return `evicting point ${step.id} from the result set`;
    case 'append':
      return `appending point ${step.id}`;
    case 'remove':
      return `removing point ${step.id}`;
  }
}

/**
 * Fold the log over the seeded index.
 *
 * Every operation is pure and threads its state, so this is the only state
 * machine in the lab — undo is `replayLog(seed, log.slice(0, -1))` and reset is
 * `replayLog(seed, [])`. Neither needs an inverse operation to exist.
 */
export function replayLog(seed: readonly Point[], log: readonly LabOp[], params: SearchParams): LabSnapshot {
  let state = createFlat(seed);
  let steps: readonly FlatStep[] = [];
  let counters: Counters = EMPTY_COUNTERS;
  let query: Vec | null = null;

  for (const op of log) {
    if (op.kind === 'insert') {
      const next = flatInsert(state, op.vec);
      state = next.state;
      steps = next.steps;
      counters = next.counters;
    } else if (op.kind === 'delete') {
      const next = flatDelete(state, op.id);
      state = next.state;
      steps = next.steps;
      counters = next.counters;
    } else {
      const next = flatSearch(state, op.query, params);
      state = next.state;
      steps = next.steps;
      counters = next.counters;
      query = op.query;
    }
  }

  // The standing query is re-answered against whatever the log left behind, so
  // an insert or a delete moves the result set without the reader re-clicking.
  // Its trace and counters are discarded: the scoreboard reports the cost of
  // the operation the reader actually performed.
  const answered = query === null ? null : flatSearch(state, query, params);

  return {
    state,
    steps,
    counters,
    results: answered ? answered.result : [],
    query,
    // Ground truth is brute force over the same live points, and for the flat
    // index that IS the index — so recall is 1 by construction and the readout
    // is wired but idle. This is exactly the seam an approximate index drops
    // into: swap the call above for IVF or HNSW and the same line starts
    // reporting what the approximation cost.
    recall: answered ? recallAtK(answered.result, answered.result, params.k) : null,
  };
}

export interface UseVectorLabOptions {
  readonly dataset?: DatasetOptions;
  readonly k?: number;
  readonly metric?: Metric;
}

export interface VectorLab extends LabSnapshot {
  readonly points: readonly Point[];
  readonly stepIndex: number;
  readonly stepDescription: string;
  readonly log: readonly LabOp[];
  readonly k: number;
  readonly canUndo: boolean;
  readonly insert: (vec: Vec) => void;
  readonly remove: (id: PointId) => void;
  readonly search: (query: Vec) => void;
  readonly setStepIndex: (index: number) => void;
  readonly undo: () => void;
  readonly reset: () => void;
}

export function useVectorLab(options: UseVectorLabOptions = {}): VectorLab {
  const { dataset = DEFAULT_DATASET, k = DEFAULT_K, metric = 'euclidean' } = options;

  const [log, setLog] = useState<readonly LabOp[]>([]);
  // null means "pinned to the end", so a new operation shows its own last step
  // without an effect chasing the step count after every render.
  const [scrubbed, setScrubbed] = useState<number | null>(null);

  const seed = useMemo(() => makeDataset(dataset), [dataset]);
  const params = useMemo<SearchParams>(() => ({ k, metric }), [k, metric]);
  const snapshot = useMemo(() => replayLog(seed, log, params), [seed, log, params]);

  const last = snapshot.steps.length - 1;
  const stepIndex = scrubbed === null ? last : Math.min(scrubbed, last);
  const step = stepIndex >= 0 ? snapshot.steps[stepIndex] : null;

  const append = useCallback((op: LabOp) => {
    setLog((current) => [...current, op]);
    setScrubbed(null);
  }, []);

  const insert = useCallback((vec: Vec) => append({ kind: 'insert', vec }), [append]);
  const remove = useCallback((id: PointId) => append({ kind: 'delete', id }), [append]);
  const search = useCallback((query: Vec) => append({ kind: 'search', query }), [append]);

  const undo = useCallback(() => {
    setLog((current) => current.slice(0, -1));
    setScrubbed(null);
  }, []);

  const reset = useCallback(() => {
    setLog([]);
    setScrubbed(null);
  }, []);

  const setStepIndex = useCallback((index: number) => setScrubbed(index), []);

  return {
    ...snapshot,
    points: snapshot.state.points,
    stepIndex: Math.max(stepIndex, 0),
    stepDescription: step ? describeStep(step) : 'no steps to replay',
    log,
    k,
    canUndo: log.length > 0,
    insert,
    remove,
    search,
    setStepIndex,
    undo,
    reset,
  };
}
