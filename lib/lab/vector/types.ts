/** A point's coordinates. Length is the dimensionality; the playground uses 2. */
export type Vec = readonly number[];

/** Stable identity for a point. Assigned on insert, never reused. */
export type PointId = number;

export interface Point {
  readonly id: PointId;
  readonly vec: Vec;
}

export type Metric = 'euclidean' | 'cosine' | 'dot';

/** Per-lab counters. Keys are the lab's own vocabulary. */
export type Counters = Readonly<Record<string, number>>;

export interface Ranked {
  readonly id: PointId;
  readonly distance: number;
}

export interface SearchParams {
  readonly k: number;
  readonly metric: Metric;
}

/**
 * Every operation returns the next state plus a trace of what it did.
 *
 * State is threaded, never mutated, which is what makes the undo stack, a
 * replayable session and a deterministic test suite all fall out of one design
 * rather than three mechanisms. Search returns state unchanged so that every
 * operation in every index shares this signature and the UI can call them
 * uniformly.
 */
export interface OpResult<TState, TResult, TStep> {
  readonly state: TState;
  readonly result: TResult;
  readonly steps: readonly TStep[];
  readonly counters: Counters;
}
