'use client';

import { useCallback, useMemo, useState } from 'react';
import { DEFAULT_DATASET, makeDataset, type DatasetOptions } from '@/lib/lab/vector/dataset';
import { createFlat, flatDelete, flatInsert, flatSearch, type FlatState, type FlatStep } from '@/lib/lab/vector/flat';
import {
  cellBalance,
  ivfDelete,
  ivfInsert,
  ivfSearch,
  rebuildIvf,
  trainIvf,
  type IvfState,
  type IvfStep,
  type IvfParams,
} from '@/lib/lab/vector/ivf';
import { recallAtK } from '@/lib/lab/vector/recall';
import type { Counters, Metric, Point, PointId, Ranked, Vec } from '@/lib/lab/vector/types';

export const DEFAULT_K = 10;
export const DEFAULT_NPROBE = 1;
export const DEFAULT_IVF: IvfParams = { cells: 8, maxIterations: 12, seed: 7 };

export type IndexKind = 'flat' | 'ivf' | 'ivf-pq' | 'hnsw';

/** Every step an index in the lab can emit, over every op it can run. */
export type LabStep = FlatStep | IvfStep;

/** One thing the reader did. The list of these is the whole session. */
export type LabOp =
  | { readonly kind: 'insert'; readonly vec: Vec }
  | { readonly kind: 'delete'; readonly id: PointId }
  | { readonly kind: 'search'; readonly query: Vec }
  // The operation log IS the undo stack, so a rebuild that lived outside it
  // would make undo lie about the state.
  | { readonly kind: 'rebuild' };

export interface LabSnapshot {
  readonly points: readonly Point[];
  /** The trace of the LAST operation only — what the scrubber walks. */
  readonly steps: readonly LabStep[];
  readonly counters: Counters;
  /** The operation before last, of the SAME kind. Lets the scoreboard show movement. */
  readonly previousCounters: Counters | null;
  readonly results: readonly Ranked[];
  readonly query: Vec | null;
  readonly recall: number | null;
  /** Null on an index with no cells, which is how the UI decides what to draw. */
  readonly centroids: readonly Vec[] | null;
  readonly cellBalance: number | null;
  readonly insertsSinceTrain: number | null;
}

export function describeStep(step: LabStep): string {
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
      // Flat's remove never carries a cell, and PR 1's wording for that case
      // is asserted verbatim elsewhere — widening the type must not change it.
      return 'cell' in step ? `Removed point ${step.id} from cell ${step.cell}` : `removing point ${step.id}`;
    case 'trainIteration':
      return `Training iteration ${step.iteration}: centroids moved ${step.shift.toFixed(3)}`;
    case 'assign':
      return `Assigned point ${step.id} to cell ${step.cell}`;
    case 'probeCell':
      return `Probed cell ${step.cell}, centroid distance ${step.distance.toFixed(3)}`;
    case 'skipCell':
      return `Skipped cell ${step.cell}, centroid distance ${step.distance.toFixed(3)}`;
  }
}

export interface LabParams {
  readonly k: number;
  readonly metric: Metric;
  // Optional, with defaults resolved inside replayLog: PR 1 callers (and its
  // own tests) construct this object as { k, metric } alone, and that shape
  // has to keep compiling and behaving as flat.
  readonly index?: IndexKind;
  readonly nprobe?: number;
  readonly ivf?: IvfParams;
}

interface ResolvedParams {
  readonly k: number;
  readonly metric: Metric;
  readonly index: IndexKind;
  readonly nprobe: number;
  readonly ivf: IvfParams;
}

function resolveParams(params: LabParams): ResolvedParams {
  return {
    k: params.k,
    metric: params.metric,
    index: params.index ?? 'flat',
    nprobe: params.nprobe ?? DEFAULT_NPROBE,
    ivf: params.ivf ?? DEFAULT_IVF,
  };
}

/**
 * How one index kind applies each op kind to its own state. Shared by
 * `foldOps` below so that the bookkeeping around `previousCounters` runs
 * exactly once, for every index — an index-specific copy of that loop is
 * exactly how a second index's cost deltas would go quietly stale the first
 * time only the other branch got fixed.
 */
interface OpAppliers<TState, TStep> {
  insert(state: TState, vec: Vec): { state: TState; steps: readonly TStep[]; counters: Counters };
  delete(state: TState, id: PointId): { state: TState; steps: readonly TStep[]; counters: Counters };
  search(
    state: TState,
    query: Vec,
  ): { state: TState; steps: readonly TStep[]; counters: Counters; result: readonly Ranked[] };
  /** Null means "this op is a no-op here" — flat has nothing to retrain. */
  rebuild(state: TState): { state: TState; steps: readonly TStep[]; counters: Counters } | null;
}

interface Folded<TState, TStep> {
  readonly state: TState;
  readonly steps: readonly TStep[];
  readonly counters: Counters;
  readonly previousCounters: Counters | null;
  /** The most recent search op in the log, or null. Not folded — see below. */
  readonly query: Vec | null;
}

/**
 * Fold every insert/delete/rebuild — and each search as it is reached — over
 * the seeded state, tracking the previous run of the SAME op kind so the
 * scoreboard can show a like-for-like delta.
 *
 * A later search does not need re-answering here: the caller re-runs
 * `search` once more against the final state, after the fold, which is what
 * keeps results honest when an insert or delete follows the last search in
 * the log.
 */
function foldOps<TState, TStep>(
  initial: { state: TState; steps: readonly TStep[]; counters: Counters },
  log: readonly LabOp[],
  appliers: OpAppliers<TState, TStep>,
): Folded<TState, TStep> {
  let state = initial.state;
  let steps = initial.steps;
  let counters = initial.counters;
  let previousCounters: Counters | null = null;
  let query: Vec | null = null;
  // Keyed by operation kind, exactly as PR 1's flat fold did: comparing a
  // search against the insert before it always reads as the whole scan
  // appearing from nowhere, so the delta has to be search-to-search.
  const lastByKind = new Map<LabOp['kind'], Counters>();

  for (const op of log) {
    let applied: { state: TState; steps: readonly TStep[]; counters: Counters } | null;
    if (op.kind === 'insert') {
      applied = appliers.insert(state, op.vec);
    } else if (op.kind === 'delete') {
      applied = appliers.delete(state, op.id);
    } else if (op.kind === 'rebuild') {
      applied = appliers.rebuild(state);
    } else {
      applied = appliers.search(state, op.query);
      query = op.query;
    }

    if (applied === null) continue; // e.g. rebuild on flat, which has nothing to retrain

    previousCounters = lastByKind.get(op.kind) ?? null;
    state = applied.state;
    steps = applied.steps;
    counters = applied.counters;
    lastByKind.set(op.kind, counters);
  }

  return { state, steps, counters, previousCounters, query };
}

function replayFlat(seed: readonly Point[], log: readonly LabOp[], params: ResolvedParams): LabSnapshot {
  const folded = foldOps<FlatState, FlatStep>(
    { state: createFlat(seed), steps: [], counters: {} },
    log,
    {
      insert: (state, vec) => flatInsert(state, vec),
      delete: (state, id) => flatDelete(state, id),
      rebuild: () => null,
      search: (state, query) => flatSearch(state, query, { k: params.k, metric: params.metric }),
    },
  );

  const answered =
    folded.query === null ? null : flatSearch(folded.state, folded.query, { k: params.k, metric: params.metric });

  return {
    points: folded.state.points,
    results: answered ? answered.result : [],
    steps: folded.steps,
    counters: folded.counters,
    previousCounters: folded.previousCounters,
    query: folded.query,
    // Flat search IS the ground truth, so its recall is 1 by construction.
    recall: answered ? recallAtK(answered.result, answered.result, params.k) : null,
    centroids: null,
    cellBalance: null,
    insertsSinceTrain: null,
  };
}

/**
 * Sorted so the canvas layout is stable across renders; a Map's iteration
 * order is insertion order, and a delete would otherwise reshuffle the draw.
 */
function ivfPoints(state: IvfState): readonly Point[] {
  return [...state.points.values()].sort((a, b) => a.id - b.id);
}

function replayIvf(seed: readonly Point[], log: readonly LabOp[], params: ResolvedParams): LabSnapshot {
  const trained = trainIvf(seed, params.ivf);
  const searchParams = { k: params.k, metric: params.metric, nprobe: params.nprobe };

  const folded = foldOps<IvfState, IvfStep>(
    { state: trained.state, steps: trained.steps, counters: trained.counters },
    log,
    {
      insert: (state, vec) => ivfInsert(state, vec),
      delete: (state, id) => ivfDelete(state, id),
      rebuild: (state) => rebuildIvf(state, params.ivf),
      search: (state, query) => ivfSearch(state, query, searchParams),
    },
  );

  const points = ivfPoints(folded.state);
  const answered = folded.query === null ? null : ivfSearch(folded.state, folded.query, searchParams);
  let recall: number | null = null;
  if (answered && folded.query !== null) {
    const truth = flatSearch(createFlat(points), folded.query, { k: params.k, metric: params.metric });
    recall = recallAtK(answered.result, truth.result, params.k);
  }

  return {
    points,
    results: answered ? answered.result : [],
    steps: folded.steps,
    counters: folded.counters,
    previousCounters: folded.previousCounters,
    query: folded.query,
    recall,
    centroids: folded.state.centroids,
    cellBalance: cellBalance(folded.state),
    insertsSinceTrain: folded.state.insertsSinceTrain,
  };
}

/**
 * Fold the log over the seeded index, under whichever index kind `params`
 * selects.
 *
 * Every operation is pure and threads its state, so this is the only state
 * machine in the lab — undo is `replayLog(seed, log.slice(0, -1), params)`
 * and reset is `replayLog(seed, [], params)`. Neither needs an inverse
 * operation to exist, and switching `params.index` cannot leave stale state
 * behind because there is no state anywhere except what this returns.
 */
export function replayLog(seed: readonly Point[], log: readonly LabOp[], params: LabParams): LabSnapshot {
  const resolved = resolveParams(params);
  return resolved.index === 'ivf' ? replayIvf(seed, log, resolved) : replayFlat(seed, log, resolved);
}

export interface UseVectorLabOptions {
  readonly dataset?: DatasetOptions;
  readonly k?: number;
  readonly metric?: Metric;
  readonly index?: IndexKind;
  readonly nprobe?: number;
}

export interface VectorLab extends LabSnapshot {
  readonly stepIndex: number;
  readonly stepDescription: string;
  readonly log: readonly LabOp[];
  readonly k: number;
  readonly canUndo: boolean;
  readonly insert: (vec: Vec) => void;
  readonly remove: (id: PointId) => void;
  readonly search: (query: Vec) => void;
  readonly rebuild: () => void;
  readonly setStepIndex: (index: number) => void;
  readonly undo: () => void;
  readonly reset: () => void;
}

export function useVectorLab(options: UseVectorLabOptions = {}): VectorLab {
  const {
    dataset = DEFAULT_DATASET,
    k = DEFAULT_K,
    metric = 'euclidean',
    index = 'flat',
    nprobe = DEFAULT_NPROBE,
  } = options;

  const [log, setLog] = useState<readonly LabOp[]>([]);
  // null means "pinned to the end", so a new operation shows its own last step
  // without an effect chasing the step count after every render.
  const [scrubbed, setScrubbed] = useState<number | null>(null);

  const seed = useMemo(() => makeDataset(dataset), [dataset]);
  // Primitive deps only, so a caller passing a fresh options object every
  // render does not re-run the fold.
  const params = useMemo<LabParams>(
    () => ({ k, metric, index, nprobe, ivf: DEFAULT_IVF }),
    [k, metric, index, nprobe],
  );
  // Search is pure and returns state unchanged, so the whole snapshot is
  // derived during render. An effect here would render one frame of stale
  // results and would need an exhaustive-deps escape hatch to stay quiet.
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
  const rebuild = useCallback(() => append({ kind: 'rebuild' }), [append]);

  const search = useCallback((query: Vec) => {
    // Dragging the query fires once per pointer move. Collapsing consecutive
    // searches keeps one undo step equal to one gesture instead of one frame.
    setLog((current) => {
      const next: LabOp = { kind: 'search', query };
      return current[current.length - 1]?.kind === 'search'
        ? [...current.slice(0, -1), next]
        : [...current, next];
    });
    setScrubbed(null);
  }, []);

  const undo = useCallback(() => {
    setLog((current) => current.slice(0, -1));
    setScrubbed(null);
  }, []);

  const reset = useCallback(() => {
    setLog([]);
    setScrubbed(null);
  }, []);

  const setStepIndex = useCallback((next: number) => setScrubbed(next), []);

  return {
    ...snapshot,
    stepIndex: Math.max(stepIndex, 0),
    stepDescription: step ? describeStep(step) : 'no steps to replay',
    log,
    k,
    canUndo: log.length > 0,
    insert,
    remove,
    search,
    rebuild,
    setStepIndex,
    undo,
    reset,
  };
}
