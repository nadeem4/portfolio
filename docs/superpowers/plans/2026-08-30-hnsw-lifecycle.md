# HNSW Lifecycle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add HNSW to the vector index playground — a layered proximity graph the reader builds by inserting, searches layer by layer, and then deletes from, watching the index degrade and recover. Deletion is the point: a proximity graph has no cheap safe removal, and what real systems do instead is the single most valuable thing this lab teaches.

**Architecture:** The algorithm is pure TypeScript in `lib/lab/vector/hnsw.ts`, threading its own RNG state so a seeded operation sequence replays to an identical graph. The view model in `lib/lab/vector/hnsw-view.ts` and the health module in `lib/lab/vector/hnsw-health.ts` are likewise pure and fully tested, so the drawing components contain nothing but a loop over a computed list. HNSW composes into the existing `VectorLab` island — it does not get its own.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind (theme tokens only), vitest + React Testing Library, `motion/react`. **No new dependencies.**

**Spec:** `docs/superpowers/specs/2026-08-30-interactive-labs-design.md`

**Depends on:** `2026-08-30-vector-index-playground.md` (PRs 1–3). This plan consumes that one's `types.ts`, `random.ts`, `metrics.ts`, `dataset.ts`, `recall.ts`, `flat.ts`, and the `VectorLab` island. Execute it only after PR 3 has landed.

## Global Constraints

Identical to the companion plan. Restated because a task's implementer sees only their own task:

- **No new dependencies.** No `Math.random` anywhere in `lib/lab/`. No React import anywhere in `lib/`.
- **Every operation is pure** — the input state unchanged after the call, asserted against a pre-call snapshot.
- **TDD, strictly.** Failing test → watch it fail → minimal implementation → passing test → commit.
- **`globals: false`** — every test file explicitly imports `{ describe, it, expect }` from vitest.
- **Theme tokens only**; focus rings copied from `components/layout/header.tsx`; `useReducedMotion` for any animation.
- **One island.** HNSW composes into the existing `VectorLab` alongside flat, IVF and IVF-PQ. Do not write an `HnswPanel`, and do not add a reducer to `useVectorLab` — it holds an operation log and derives state through `replayLog`.
- **The query stays interactive**, and deletion happens by tapping a point on the canvas, exactly as on every other index.
- **Do not touch nav, `app/sitemap.ts`, or the command palette.**
- Conventional commits, one per task. Full suite and lint before each PR's final commit.

## PR Boundaries

| PR | Tasks | Deliverable |
|---|---|---|
| 4 | 40–51 | The HNSW algorithm and its full test suite. **No UI whatsoever.** |
| 5 | 52–57 | The UI: pure layer view model, health module, layer view, health panel, `ef` control, and composition into the island |

**Why PR 4 carries no UI.** A layered HNSW with a neighbour-selection heuristic, tombstoning and compaction, plus the tests that hold its teaching claims, is comfortably past 500 LOC before a single pixel. Combining it with the layer view is the most likely place in either plan to blow the working band, so the split is deliberate rather than incidental.

## Two Decisions Worth Knowing Before You Start

**The graph is built under a fixed `CONSTRUCTION_METRIC = 'euclidean'`.** `HnswParams` carries no metric, and that is correct: the graph's topology is decided at insert time, so letting a later search-metric change retroactively reinterpret how the graph was built would make the structure depend on how it is later queried. Search still honours `params.metric`.

**Search widens `ef` until it holds `k` live results.** Tombstoned nodes occupy slots in the candidate set, so a deletion-heavy index has to search wider before it can return `k` live neighbours. This is faithful to what production implementations do under soft deletes, and it is where the cost of deferred deletion actually shows up.

Be aware of what that makes the monotonicity test (Task 47) worth. Traversal never reads `deleted`, so the candidate set at a given `ef` is identical regardless of tombstones; deletions are cumulative, so the live count inside a fixed set can only fall; so the `ef` at which `k` live results appear can only rise. Cost is therefore non-decreasing **by construction** — that assertion is a characterization test that locks the behaviour in, not a discovery that could catch a surprise. The strict end-to-end rise asserted alongside it is the part that can genuinely fail. Do not read the pair as stronger evidence than it is.

One consequence is a gift rather than a cost: because each widening pushes another `descendLayer` step into the trace, the scrubber visibly shows the search **restarting wider** as tombstones crowd it. Preserve that in the UI — it is the price of deferred deletion made literal on screen.

## What This Plan Is Guarding

Five assertions carry the spec's teaching claims. If one fails, a claim has stopped being true — fix the code, never the bound:

1. **The graph stays connected** across an arbitrary seeded sequence of inserts and deletes. (Task 50) Violating this is precisely why real systems tombstone instead of unlinking.
2. **A deleted point is never returned by search**, on any query, ever. (Task 46)
3. **Search cost rises with tombstone ratio.** (Task 47) See the caveat above on what this test does and does not prove.
4. **Compaction restores both cost and recall** to within a stated bound of the pre-deletion index. (Task 48) Asserted in both directions.
5. **Replaying a seeded operation sequence reproduces an identical state.** (Task 51) This is what makes undo and shareable sessions sound, and it is why `rngState` lives in the state rather than in a closure. It assumes PR 1's canonical mulberry32 with the `+0x6d2b79f5` advance.

---
## PR 4 — HNSW: the algorithm and its tests (Tasks 40–51)

**Deliverable:** `lib/lab/vector/hnsw.ts` and `lib/lab/vector/hnsw.test.ts`. No UI, no component, no page change. PR 5 renders what this produces.

**Why this PR carries no pixels:** a layered graph with a neighbour-selection heuristic, tombstoning and compaction, plus the lifecycle test suite that protects the spec's teaching claims, is comfortably 500+ LOC on its own. Combining it with the layer view is the single most likely place in this plan to blow the size band.

**Consumed from PR 1, never redefined:**
`./types` — `Vec`, `PointId`, `Point`, `Metric`, `Counters`, `Ranked`, `SearchParams`, `OpResult`
`./random` — `mulberry32`
`./metrics` — `distance(a, b, metric)`
`./dataset` — `makeDataset`, `DEFAULT_DATASET`
`./recall` — `recallAtK`
`./flat` — `createFlat`, `flatSearch` (the ground truth)

**Decision worth flagging up front — the construction metric.** `HnswParams` is locked and carries no `metric`, but building the graph requires one. The graph is therefore built under a fixed `euclidean` metric, declared as a module constant. This is deliberate: the graph is an artifact of its insert history, and letting the *search* metric decide how it was *built* would mean a replayed session depended on a control the reader can move afterwards. The playground's points live in 2D unit space, where euclidean is the honest default.

---

### Task 40: `createHnsw` and the module skeleton

**Files:**
- Create: `lib/lab/vector/hnsw.ts`
- Test: `lib/lab/vector/hnsw.test.ts`

**Interfaces:**
- Consumes: `Counters`, `Metric`, `OpResult`, `Point`, `PointId`, `Ranked`, `SearchParams`, `Vec` from `./types`
- Produces: `HnswNode`, `HnswState`, `HnswStep`, `HnswParams`, `HnswSearchParams`, `createHnsw(params: HnswParams): HnswState`

- [ ] **Step 1: Write the failing test**
```ts
import { describe, it, expect } from 'vitest';
import { createHnsw } from './hnsw';
import type { HnswParams } from './hnsw';

const PARAMS: HnswParams = {
  m: 8,
  efConstruction: 32,
  levelMultiplier: 1 / Math.log(8),
  seed: 42,
};

describe('createHnsw', () => {
  it('starts with an empty graph and no entry point', () => {
    const state = createHnsw(PARAMS);
    expect(state.nodes.size).toBe(0);
    expect(state.points.size).toBe(0);
    expect(state.deleted.size).toBe(0);
    expect(state.entryPoint).toBeNull();
    expect(state.maxLevel).toBe(0);
  });

  it('starts ids at 0 so the first insert is point 0', () => {
    expect(createHnsw(PARAMS).nextId).toBe(0);
  });

  it('seeds the rng position from params, so two indexes with one seed agree', () => {
    expect(createHnsw({ ...PARAMS, seed: 7 }).rngState).toBe(7);
    expect(createHnsw({ ...PARAMS, seed: 7 }).rngState).toBe(createHnsw({ ...PARAMS, seed: 7 }).rngState);
  });

  it('returns a fresh state each call rather than a shared singleton', () => {
    expect(createHnsw(PARAMS).nodes).not.toBe(createHnsw(PARAMS).nodes);
  });
});
```
- [ ] **Step 2: Run test to verify it fails**
Run: `npx vitest run lib/lab/vector/hnsw.test.ts`
Expected: FAIL with "Failed to resolve import './hnsw'"
- [ ] **Step 3: Write minimal implementation**
```ts
import type { Counters, Metric, OpResult, Point, PointId, Ranked, SearchParams, Vec } from './types';

export interface HnswNode {
  readonly id: PointId;
  readonly level: number;
  /** neighbours[layer] -> ids. Layer 0 is the dense bottom layer. */
  readonly neighbours: readonly (readonly PointId[])[];
}

export interface HnswState {
  readonly nodes: ReadonlyMap<PointId, HnswNode>;
  readonly points: ReadonlyMap<PointId, Point>;
  /** Tombstoned. Still traversed during search, never returned. */
  readonly deleted: ReadonlySet<PointId>;
  readonly entryPoint: PointId | null;
  readonly maxLevel: number;
  readonly nextId: PointId;
  readonly rngState: number;
}

export type HnswStep =
  | { readonly kind: 'assignLevel'; readonly id: PointId; readonly level: number }
  | { readonly kind: 'descendLayer'; readonly layer: number; readonly entry: PointId }
  | { readonly kind: 'visit'; readonly id: PointId; readonly layer: number; readonly distance: number }
  | { readonly kind: 'skipTombstoned'; readonly id: PointId; readonly layer: number }
  | { readonly kind: 'admit'; readonly id: PointId; readonly distance: number; readonly rank: number }
  | { readonly kind: 'link'; readonly from: PointId; readonly to: PointId; readonly layer: number }
  | { readonly kind: 'prune'; readonly from: PointId; readonly to: PointId; readonly layer: number }
  | { readonly kind: 'tombstone'; readonly id: PointId }
  | { readonly kind: 'compact'; readonly removed: number };

export interface HnswParams {
  readonly m: number;
  readonly efConstruction: number;
  readonly levelMultiplier: number;
  readonly seed: number;
}

export interface HnswSearchParams extends SearchParams {
  readonly ef: number;
}

/**
 * The graph is built under one fixed metric. `HnswParams` deliberately carries no
 * metric: the graph is an artifact of the order it was built in, and letting the
 * search metric decide how it was built would make a replayed session depend on a
 * control the reader can move afterwards. The playground is 2D unit space.
 */
const CONSTRUCTION_METRIC: Metric = 'euclidean';

export function createHnsw(params: HnswParams): HnswState {
  return {
    nodes: new Map(),
    points: new Map(),
    deleted: new Set(),
    entryPoint: null,
    maxLevel: 0,
    nextId: 0,
    // The rng position lives in state rather than in a closure so that replaying
    // an operation log reproduces the graph exactly — levels included.
    rngState: params.seed,
  };
}
```
> `CONSTRUCTION_METRIC` is unreferenced until Task 42. If the lint run objects before then, keep it and add the first consumer in the same session; do not delete and reintroduce it.
- [ ] **Step 4: Run tests**
Run: `npx vitest run lib/lab/vector/hnsw.test.ts`
Expected: PASS
- [ ] **Step 5: Commit**
```bash
git add lib/lab/vector/hnsw.ts lib/lab/vector/hnsw.test.ts
git commit -m "feat: hnsw state shape and empty index constructor"
```

---

### Task 41: Level assignment by exponential decay, with `rngState` threaded through state

**Files:**
- Modify: `lib/lab/vector/hnsw.ts`
- Test: `lib/lab/vector/hnsw.test.ts`

**Interfaces:**
- Consumes: `mulberry32(seed: number): () => number` from `./random`
- Produces: `hnswInsert(state: HnswState, vec: Vec, params: HnswParams): OpResult<HnswState, PointId, HnswStep>` — this slice registers the point and assigns its level; linking arrives in Task 42.

- [ ] **Step 1: Write the failing test**
```ts
// add to lib/lab/vector/hnsw.test.ts
import { hnswInsert } from './hnsw';
import type { HnswState } from './hnsw';

function snapshot(state: HnswState): string {
  // Maps and Sets do not survive JSON, so purity is compared over their entries.
  return JSON.stringify({
    nodes: [...state.nodes.entries()],
    points: [...state.points.entries()],
    deleted: [...state.deleted],
    entryPoint: state.entryPoint,
    maxLevel: state.maxLevel,
    nextId: state.nextId,
    rngState: state.rngState,
  });
}

function levelsOf(state: HnswState): number[] {
  return [...state.nodes.values()].map((node) => node.level);
}

function insertAll(vecs: readonly Vec[], params: HnswParams): HnswState {
  return vecs.reduce((state, vec) => hnswInsert(state, vec, params).state, createHnsw(params));
}

function seededVecs(count: number, seed: number): Vec[] {
  const random = mulberry32(seed);
  return Array.from({ length: count }, () => [random(), random()]);
}

describe('hnswInsert level assignment', () => {
  it('registers the point and becomes the entry point on an empty index', () => {
    const op = hnswInsert(createHnsw(PARAMS), [0.5, 0.5], PARAMS);
    expect(op.result).toBe(0);
    expect(op.state.points.get(0)?.vec).toEqual([0.5, 0.5]);
    expect(op.state.entryPoint).toBe(0);
    expect(op.state.nextId).toBe(1);
  });

  it('gives the node one neighbour list per layer up to its own level', () => {
    const state = insertAll(seededVecs(60, 3), PARAMS);
    [...state.nodes.values()].forEach((node) => {
      expect(node.neighbours).toHaveLength(node.level + 1);
    });
  });

  it('emits an assignLevel step naming the level it chose', () => {
    const op = hnswInsert(createHnsw(PARAMS), [0.5, 0.5], PARAMS);
    expect(op.steps).toContainEqual({ kind: 'assignLevel', id: 0, level: op.state.maxLevel });
  });

  it('advances rngState so consecutive inserts do not all draw the same level', () => {
    const first = hnswInsert(createHnsw(PARAMS), [0.1, 0.1], PARAMS);
    expect(first.state.rngState).not.toBe(PARAMS.seed);
    const second = hnswInsert(first.state, [0.2, 0.2], PARAMS);
    expect(second.state.rngState).not.toBe(first.state.rngState);
  });

  it('decays exponentially: layer 0 is the common case and upper layers are rare', () => {
    const levels = levelsOf(insertAll(seededVecs(200, 11), PARAMS));
    const atZero = levels.filter((level) => level === 0).length;
    const above = levels.filter((level) => level > 0).length;
    expect(above).toBeGreaterThan(0);
    expect(atZero).toBeGreaterThan(above);
  });

  it('assigns identical levels for identical seeds, which is what makes replay exact', () => {
    const vecs = seededVecs(120, 5);
    expect(levelsOf(insertAll(vecs, PARAMS))).toEqual(levelsOf(insertAll(vecs, PARAMS)));
  });

  it('assigns different levels for different seeds', () => {
    const vecs = seededVecs(120, 5);
    expect(levelsOf(insertAll(vecs, PARAMS))).not.toEqual(
      levelsOf(insertAll(vecs, { ...PARAMS, seed: 999 })),
    );
  });

  it('leaves the input state unchanged', () => {
    const state = insertAll(seededVecs(20, 7), PARAMS);
    const before = snapshot(state);
    hnswInsert(state, [0.42, 0.42], PARAMS);
    expect(snapshot(state)).toBe(before);
  });
});
```
Extend the existing import line at the top of the test file to `import { createHnsw, hnswInsert } from './hnsw';`, add `import { mulberry32 } from './random';` and `import type { Vec } from './types';`.
- [ ] **Step 2: Run test to verify it fails**
Run: `npx vitest run lib/lab/vector/hnsw.test.ts`
Expected: FAIL with "hnswInsert is not a function" (no export named `hnswInsert`)
- [ ] **Step 3: Write minimal implementation**
```ts
// add to lib/lab/vector/hnsw.ts, below createHnsw
import { mulberry32 } from './random';

/** Mutable accumulator for one operation's trace. The input state is never touched. */
interface Trace {
  readonly steps: HnswStep[];
  distanceComputations: number;
  nodesVisited: number;
  tombstonesTraversed: number;
  hops: number;
}

function newTrace(): Trace {
  return { steps: [], distanceComputations: 0, nodesVisited: 0, tombstonesTraversed: 0, hops: 0 };
}

function toCounters(trace: Trace): Counters {
  return {
    distanceComputations: trace.distanceComputations,
    nodesVisited: trace.nodesVisited,
    tombstonesTraversed: trace.tombstonesTraversed,
    hops: trace.hops,
  };
}

/**
 * One draw, with the generator's position returned rather than hidden.
 *
 * mulberry32 advances its internal state by a fixed increment per call, so
 * re-seeding at `rngState` and taking one value produces exactly the stream a
 * single held generator would — but the position stays in `HnswState`, which is
 * what makes undo and a shareable session URL reproduce the same graph.
 */
function nextRandom(rngState: number): { value: number; rngState: number } {
  return { value: mulberry32(rngState)(), rngState: (rngState + 0x6d2b79f5) | 0 };
}

/**
 * Exponentially decaying level: each layer up is geometrically less likely, which
 * is what leaves the upper layers sparse enough to act as a routing table and
 * gives the descent its logarithmic shape.
 */
function assignLevel(rngState: number, levelMultiplier: number): { level: number; rngState: number } {
  const draw = nextRandom(rngState);
  // A draw of exactly 0 would send the log to infinity; the epsilon floor costs
  // nothing and keeps a rare draw from producing an unbounded tower of layers.
  const uniform = draw.value > 0 ? draw.value : Number.EPSILON;
  return { level: Math.floor(-Math.log(uniform) * levelMultiplier), rngState: draw.rngState };
}

function insertPoint(
  state: HnswState,
  id: PointId,
  vec: Vec,
  params: HnswParams,
  trace: Trace,
): HnswState {
  const { level, rngState } = assignLevel(state.rngState, params.levelMultiplier);
  trace.steps.push({ kind: 'assignLevel', id, level });

  const points = new Map(state.points);
  points.set(id, { id, vec });

  const nodes = new Map(state.nodes);
  nodes.set(id, { id, level, neighbours: Array.from({ length: level + 1 }, (): PointId[] => []) });

  // The tallest node is the entry point: descent has to start above every layer
  // that exists, or the upper layers are unreachable and buy nothing.
  const entryPoint = state.entryPoint === null || level > state.maxLevel ? id : state.entryPoint;

  return { ...state, points, nodes, rngState, entryPoint, maxLevel: Math.max(state.maxLevel, level) };
}

export function hnswInsert(
  state: HnswState,
  vec: Vec,
  params: HnswParams,
): OpResult<HnswState, PointId, HnswStep> {
  const trace = newTrace();
  const id = state.nextId;
  const next = insertPoint(state, id, vec, params, trace);
  // Ids are never reused, so `nextId` only ever moves forward — a compaction that
  // rebuilds the graph keeps every surviving point's identity.
  return { state: { ...next, nextId: id + 1 }, result: id, steps: trace.steps, counters: toCounters(trace) };
}
```
- [ ] **Step 4: Run tests**
Run: `npx vitest run lib/lab/vector/hnsw.test.ts`
Expected: PASS
- [ ] **Step 5: Commit**
```bash
git add lib/lab/vector/hnsw.ts lib/lab/vector/hnsw.test.ts
git commit -m "feat: hnsw level assignment from a state-threaded rng"
```

---

### Task 42: Layer-0 candidate search and bidirectional linking

**Files:**
- Modify: `lib/lab/vector/hnsw.ts`
- Test: `lib/lab/vector/hnsw.test.ts`

**Interfaces:**
- Consumes: `distance(a: Vec, b: Vec, metric: Metric): number` from `./metrics`
- Produces: no new exports; `hnswInsert` now runs an `efConstruction` candidate search at layer 0 and links the new node to its chosen neighbours in both directions.

- [ ] **Step 1: Write the failing test**
```ts
// add to lib/lab/vector/hnsw.test.ts
describe('hnswInsert linking', () => {
  it('links the second node to the first, in both directions', () => {
    const first = hnswInsert(createHnsw(PARAMS), [0.1, 0.1], PARAMS);
    const second = hnswInsert(first.state, [0.2, 0.2], PARAMS);
    expect(second.state.nodes.get(0)?.neighbours[0]).toContain(1);
    expect(second.state.nodes.get(1)?.neighbours[0]).toContain(0);
  });

  it('emits a link step for each direction', () => {
    const first = hnswInsert(createHnsw(PARAMS), [0.1, 0.1], PARAMS);
    const second = hnswInsert(first.state, [0.2, 0.2], PARAMS);
    expect(second.steps).toContainEqual({ kind: 'link', from: 1, to: 0, layer: 0 });
    expect(second.steps).toContainEqual({ kind: 'link', from: 0, to: 1, layer: 0 });
  });

  it('never links a node to itself', () => {
    const state = insertAll(seededVecs(80, 13), PARAMS);
    [...state.nodes.values()].forEach((node) => {
      node.neighbours.forEach((layer) => expect(layer).not.toContain(node.id));
    });
  });

  it('never lists the same neighbour twice', () => {
    const state = insertAll(seededVecs(80, 13), PARAMS);
    [...state.nodes.values()].forEach((node) => {
      node.neighbours.forEach((layer) => expect(new Set(layer).size).toBe(layer.length));
    });
  });

  it('only ever links ids that exist in the graph', () => {
    const state = insertAll(seededVecs(80, 13), PARAMS);
    [...state.nodes.values()].forEach((node) => {
      node.neighbours.flat().forEach((id) => expect(state.nodes.has(id)).toBe(true));
    });
  });

  it('leaves every node in the input state unchanged, arrays included', () => {
    const state = insertAll(seededVecs(40, 17), PARAMS);
    const before = snapshot(state);
    hnswInsert(state, [0.5, 0.5], PARAMS);
    expect(snapshot(state)).toBe(before);
  });

  it('counts a distance computation for every node it compares against', () => {
    const state = insertAll(seededVecs(40, 19), PARAMS);
    const op = hnswInsert(state, [0.5, 0.5], PARAMS);
    expect(op.counters.distanceComputations).toBeGreaterThan(0);
    expect(op.counters.nodesVisited).toBeGreaterThan(0);
  });
});
```
- [ ] **Step 2: Run test to verify it fails**
Run: `npx vitest run lib/lab/vector/hnsw.test.ts`
Expected: FAIL with "expected undefined to contain 1" — nothing links yet, so `neighbours[0]` is empty.
- [ ] **Step 3: Write minimal implementation**
```ts
// add to lib/lab/vector/hnsw.ts, above insertPoint
import { distance } from './metrics';

function vecOf(state: HnswState, id: PointId): Vec {
  const point = state.points.get(id);
  if (!point) throw new Error(`hnsw: no point for id ${id}`);
  return point.vec;
}

function neighboursAt(state: HnswState, id: PointId, layer: number): readonly PointId[] {
  const node = state.nodes.get(id);
  if (!node || layer >= node.neighbours.length) return [];
  return node.neighbours[layer];
}

/** Ties break on id: traversal order must not decide ranking, or replay stops being exact. */
function compareRanked(a: Ranked, b: Ranked): number {
  return a.distance - b.distance || a.id - b.id;
}

function insertRanked(list: Ranked[], entry: Ranked): void {
  let lo = 0;
  let hi = list.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (compareRanked(list[mid], entry) < 0) lo = mid + 1;
    else hi = mid;
  }
  list.splice(lo, 0, entry);
}

function distanceTo(state: HnswState, id: PointId, query: Vec, metric: Metric, trace: Trace): number {
  trace.distanceComputations += 1;
  return distance(vecOf(state, id), query, metric);
}

/**
 * Greedy best-first search of one layer, returning the `ef` nearest nodes it saw.
 *
 * Tombstoned nodes are traversed exactly like live ones and are present in the
 * returned set: their edges are load-bearing, and pretending they are absent is
 * what would disconnect the graph. Filtering happens at the result boundary.
 */
function searchLayer(
  state: HnswState,
  query: Vec,
  entries: readonly PointId[],
  ef: number,
  layer: number,
  metric: Metric,
  trace: Trace,
): Ranked[] {
  const visited = new Set<PointId>(entries);
  const seeded: Ranked[] = entries.map((id) => ({
    id,
    distance: distanceTo(state, id, query, metric, trace),
  }));
  seeded.sort(compareRanked);
  const candidates: Ranked[] = [...seeded];
  const results: Ranked[] = seeded.slice(0, ef);

  while (candidates.length > 0) {
    const nearest = candidates[0];
    // Once the closest unexplored candidate is further out than the worst result
    // being kept, nothing reachable through it can improve the set.
    if (results.length >= ef && nearest.distance > results[results.length - 1].distance) break;
    candidates.shift();
    trace.hops += 1;

    for (const neighbour of neighboursAt(state, nearest.id, layer)) {
      if (visited.has(neighbour)) continue;
      visited.add(neighbour);
      const d = distanceTo(state, neighbour, query, metric, trace);
      trace.nodesVisited += 1;
      trace.steps.push({ kind: 'visit', id: neighbour, layer, distance: d });
      if (state.deleted.has(neighbour)) {
        trace.tombstonesTraversed += 1;
        trace.steps.push({ kind: 'skipTombstoned', id: neighbour, layer });
      }
      if (results.length < ef || d < results[results.length - 1].distance) {
        insertRanked(candidates, { id: neighbour, distance: d });
        insertRanked(results, { id: neighbour, distance: d });
        if (results.length > ef) results.pop();
      }
    }
  }

  return results;
}

/** Copy-on-write: the input state's node objects and arrays are never mutated. */
function withNeighbour(node: HnswNode, layer: number, neighbour: PointId): HnswNode {
  const neighbours = node.neighbours.map((ids, index) => (index === layer ? [...ids, neighbour] : ids));
  return { ...node, neighbours };
}

function link(
  nodes: Map<PointId, HnswNode>,
  a: PointId,
  b: PointId,
  layer: number,
  trace: Trace,
): void {
  if (a === b) return;
  const nodeA = nodes.get(a);
  const nodeB = nodes.get(b);
  if (!nodeA || !nodeB) return;
  if (layer >= nodeA.neighbours.length || layer >= nodeB.neighbours.length) return;

  if (!nodeA.neighbours[layer].includes(b)) {
    nodes.set(a, withNeighbour(nodeA, layer, b));
    trace.steps.push({ kind: 'link', from: a, to: b, layer });
  }
  // Re-read: the write above may have replaced this node object when a === b was
  // ruled out but the two share a layer.
  const refreshed = nodes.get(b);
  if (refreshed && !refreshed.neighbours[layer].includes(a)) {
    nodes.set(b, withNeighbour(refreshed, layer, a));
    trace.steps.push({ kind: 'link', from: b, to: a, layer });
  }
}
```
Then replace `insertPoint` with:
```ts
function insertPoint(
  state: HnswState,
  id: PointId,
  vec: Vec,
  params: HnswParams,
  trace: Trace,
): HnswState {
  const { level, rngState } = assignLevel(state.rngState, params.levelMultiplier);
  trace.steps.push({ kind: 'assignLevel', id, level });

  const points = new Map(state.points);
  points.set(id, { id, vec });

  const nodes = new Map(state.nodes);
  nodes.set(id, { id, level, neighbours: Array.from({ length: level + 1 }, (): PointId[] => []) });

  const entryPoint = state.entryPoint === null || level > state.maxLevel ? id : state.entryPoint;
  // `next` holds the same map instance the linking below writes into, so the
  // search sees edges as they are added. `state` is untouched: this map, and
  // every node object rewritten through it, are copies.
  const next: HnswState = {
    ...state,
    points,
    nodes,
    rngState,
    entryPoint,
    maxLevel: Math.max(state.maxLevel, level),
  };

  if (state.entryPoint === null) return next;

  trace.steps.push({ kind: 'descendLayer', layer: 0, entry: state.entryPoint });
  const found = searchLayer(next, vec, [state.entryPoint], params.efConstruction, 0, CONSTRUCTION_METRIC, trace);
  for (const candidate of found.slice(0, params.m)) {
    link(nodes, id, candidate.id, 0, trace);
  }

  return next;
}
```
- [ ] **Step 4: Run tests**
Run: `npx vitest run lib/lab/vector/hnsw.test.ts`
Expected: PASS
- [ ] **Step 5: Commit**
```bash
git add lib/lab/vector/hnsw.ts lib/lab/vector/hnsw.test.ts
git commit -m "feat: hnsw layer-0 candidate search and bidirectional linking"
```

---

### Task 43: The neighbour-selection heuristic and pruning back to `m`

**Files:**
- Modify: `lib/lab/vector/hnsw.ts`
- Test: `lib/lab/vector/hnsw.test.ts`

**Interfaces:**
- Produces: no new exports. Neighbour choice now runs the diversity heuristic, and reverse links push over-full nodes through a prune that emits `prune` steps.

- [ ] **Step 1: Write the failing test**
```ts
// add to lib/lab/vector/hnsw.test.ts
function degreesAt(state: HnswState, layer: number): number[] {
  return [...state.nodes.values()]
    .filter((node) => layer < node.neighbours.length)
    .map((node) => node.neighbours[layer].length);
}

describe('hnswInsert neighbour selection', () => {
  it('never lets a node exceed m neighbours on any layer', () => {
    const state = insertAll(seededVecs(300, 23), PARAMS);
    [...state.nodes.values()].forEach((node) => {
      node.neighbours.forEach((layer) => expect(layer.length).toBeLessThanOrEqual(PARAMS.m));
    });
  });

  it('leaves no node stranded without a layer-0 edge', () => {
    const state = insertAll(seededVecs(300, 23), PARAMS);
    degreesAt(state, 0).forEach((degree) => expect(degree).toBeGreaterThan(0));
  });

  it('emits a prune step naming the edge it dropped', () => {
    // A tight cluster forces every node over m, so pruning is guaranteed to fire.
    const random = mulberry32(29);
    const clustered = Array.from({ length: 120 }, (): Vec => [
      0.5 + (random() - 0.5) * 0.02,
      0.5 + (random() - 0.5) * 0.02,
    ]);
    const steps = clustered.reduce<{ state: HnswState; pruned: number }>(
      (acc, vec) => {
        const op = hnswInsert(acc.state, vec, PARAMS);
        return {
          state: op.state,
          pruned: acc.pruned + op.steps.filter((step) => step.kind === 'prune').length,
        };
      },
      { state: createHnsw(PARAMS), pruned: 0 },
    );
    expect(steps.pruned).toBeGreaterThan(0);
  });

  it('keeps a long edge rather than filling m with one tight clique', () => {
    // Ten points packed at the origin plus one far away. The far point must
    // survive selection at the newest node, or greedy descent can never leave
    // the cluster it starts in.
    const tight: Vec[] = Array.from({ length: 10 }, (_, i) => [0.01 * i, 0.01 * i]);
    const state = insertAll([...tight, [0.95, 0.95], [0.02, 0.02]], { ...PARAMS, m: 4 });
    const far = [...state.points.values()].find((point) => point.vec[0] === 0.95);
    expect(far).toBeDefined();
    const reachable = new Set(
      [...state.nodes.values()].flatMap((node) => node.neighbours[0] ?? []),
    );
    expect(reachable.has(far?.id ?? -1)).toBe(true);
  });

  it('leaves the input state unchanged when pruning fires', () => {
    const state = insertAll(seededVecs(200, 31), PARAMS);
    const before = snapshot(state);
    hnswInsert(state, [0.5, 0.5], PARAMS);
    expect(snapshot(state)).toBe(before);
  });
});
```
- [ ] **Step 2: Run test to verify it fails**
Run: `npx vitest run lib/lab/vector/hnsw.test.ts`
Expected: FAIL with "expected 19 to be less than or equal to 8" — reverse links accumulate without a cap.
- [ ] **Step 3: Write minimal implementation**
```ts
// add to lib/lab/vector/hnsw.ts, below link
/**
 * Neighbour-selection heuristic (the paper's Algorithm 4, without the extend step).
 *
 * Keeping the `m` nearest candidates outright builds tight local cliques with no
 * long edges, and greedy descent then gets trapped inside them. A candidate is
 * kept only if it is nearer to the new node than to anything already kept, which
 * preserves the diverse long-range edges the descent actually navigates by.
 */
function selectNeighbours(
  state: HnswState,
  vec: Vec,
  candidates: readonly Ranked[],
  m: number,
  metric: Metric,
  trace: Trace,
): PointId[] {
  const kept: Ranked[] = [];

  for (const candidate of candidates) {
    if (kept.length >= m) break;
    const dominated = kept.some((existing) => {
      trace.distanceComputations += 1;
      return distance(vecOf(state, existing.id), vecOf(state, candidate.id), metric) < candidate.distance;
    });
    if (!dominated) kept.push(candidate);
  }

  // Backfill nearest-first when the heuristic was too strict to reach `m`: an
  // under-connected node costs connectivity, which is worse than a redundant edge.
  for (const candidate of candidates) {
    if (kept.length >= m) break;
    if (!kept.some((existing) => existing.id === candidate.id)) kept.push(candidate);
  }

  return kept.map((entry) => entry.id);
}

/**
 * Trim one node back to `m` after it picked up a reverse link.
 *
 * Only the over-full node drops edges; the node on the other end keeps its own
 * choice. Pruning both ends is what strands nodes, and a stranded node is the
 * failure this index exists to avoid.
 */
function pruneNode(
  nodes: Map<PointId, HnswNode>,
  state: HnswState,
  id: PointId,
  layer: number,
  m: number,
  metric: Metric,
  trace: Trace,
): void {
  const node = nodes.get(id);
  if (!node || layer >= node.neighbours.length) return;
  const current = node.neighbours[layer];
  if (current.length <= m) return;

  const vec = vecOf(state, id);
  trace.distanceComputations += current.length;
  const ranked: Ranked[] = current
    .map((neighbour) => ({ id: neighbour, distance: distance(vecOf(state, neighbour), vec, metric) }))
    .sort(compareRanked);

  const keep = selectNeighbours(state, vec, ranked, m, metric, trace);
  const kept = new Set(keep);
  for (const dropped of current) {
    if (!kept.has(dropped)) trace.steps.push({ kind: 'prune', from: id, to: dropped, layer });
  }
  nodes.set(id, { ...node, neighbours: node.neighbours.map((ids, index) => (index === layer ? keep : ids)) });
}
```
Then replace the linking block at the end of `insertPoint` (everything after the `if (state.entryPoint === null) return next;` guard) with:
```ts
  trace.steps.push({ kind: 'descendLayer', layer: 0, entry: state.entryPoint });
  const found = searchLayer(next, vec, [state.entryPoint], params.efConstruction, 0, CONSTRUCTION_METRIC, trace);
  const chosen = selectNeighbours(next, vec, found, params.m, CONSTRUCTION_METRIC, trace);
  for (const neighbour of chosen) {
    link(nodes, id, neighbour, 0, trace);
    // Prune per link rather than per layer: a neighbour that has just gone over
    // `m` has to shed an edge before the next link pushes it further over.
    pruneNode(nodes, next, neighbour, 0, params.m, CONSTRUCTION_METRIC, trace);
  }
  pruneNode(nodes, next, id, 0, params.m, CONSTRUCTION_METRIC, trace);

  return next;
```
- [ ] **Step 4: Run tests**
Run: `npx vitest run lib/lab/vector/hnsw.test.ts`
Expected: PASS
- [ ] **Step 5: Commit**
```bash
git add lib/lab/vector/hnsw.ts lib/lab/vector/hnsw.test.ts
git commit -m "feat: hnsw neighbour-selection heuristic and degree pruning"
```

---

### Task 44: Multi-layer insert — descent above the node's level, linking at every layer at or below it

**Files:**
- Modify: `lib/lab/vector/hnsw.ts`
- Test: `lib/lab/vector/hnsw.test.ts`

**Interfaces:**
- Produces: no new exports. `insertPoint` now performs a greedy `ef = 1` descent through every layer above the new node's level, then an `efConstruction` search plus linking at each layer at or below it.

- [ ] **Step 1: Write the failing test**
```ts
// add to lib/lab/vector/hnsw.test.ts
describe('hnswInsert across layers', () => {
  it('links on every layer the node exists on, not only layer 0', () => {
    const state = insertAll(seededVecs(400, 37), PARAMS);
    const tall = [...state.nodes.values()].filter((node) => node.level > 0);
    expect(tall.length).toBeGreaterThan(0);
    // At least one tall node must actually have an upper-layer edge; a tower of
    // empty layers would leave the descent with nothing to follow.
    expect(tall.some((node) => node.neighbours[1].length > 0)).toBe(true);
  });

  it('emits a descendLayer step for each layer it passes through', () => {
    const state = insertAll(seededVecs(400, 37), PARAMS);
    const op = hnswInsert(state, [0.5, 0.5], PARAMS);
    const layers = op.steps.filter((step) => step.kind === 'descendLayer').map((step) => step.layer);
    expect(layers).toContain(0);
    expect(layers).toEqual([...layers].sort((a, b) => b - a));
  });

  it('keeps the entry point at the tallest node in the graph', () => {
    const state = insertAll(seededVecs(400, 37), PARAMS);
    expect(state.entryPoint).not.toBeNull();
    const entry = state.nodes.get(state.entryPoint ?? -1);
    expect(entry?.level).toBe(state.maxLevel);
  });

  it('never links across layers a node does not occupy', () => {
    const state = insertAll(seededVecs(400, 37), PARAMS);
    [...state.nodes.values()].forEach((node) => {
      node.neighbours.forEach((ids, layer) => {
        ids.forEach((id) => expect(state.nodes.get(id)?.level ?? -1).toBeGreaterThanOrEqual(layer));
      });
    });
  });

  it('leaves the input state unchanged', () => {
    const state = insertAll(seededVecs(400, 37), PARAMS);
    const before = snapshot(state);
    hnswInsert(state, [0.33, 0.66], PARAMS);
    expect(snapshot(state)).toBe(before);
  });
});
```
- [ ] **Step 2: Run test to verify it fails**
Run: `npx vitest run lib/lab/vector/hnsw.test.ts`
Expected: FAIL with "expected false to be true" — upper layers are allocated but never linked.
- [ ] **Step 3: Write minimal implementation**
Replace `insertPoint` in full with:
```ts
function insertPoint(
  state: HnswState,
  id: PointId,
  vec: Vec,
  params: HnswParams,
  trace: Trace,
): HnswState {
  const { level, rngState } = assignLevel(state.rngState, params.levelMultiplier);
  trace.steps.push({ kind: 'assignLevel', id, level });

  const points = new Map(state.points);
  points.set(id, { id, vec });

  const nodes = new Map(state.nodes);
  nodes.set(id, { id, level, neighbours: Array.from({ length: level + 1 }, (): PointId[] => []) });

  const entryPoint = state.entryPoint === null || level > state.maxLevel ? id : state.entryPoint;
  // `next` holds the same map instance the linking below writes into, so each
  // layer's search sees the edges the layer above just added. `state` is
  // untouched: this map, and every node object rewritten through it, are copies.
  const next: HnswState = {
    ...state,
    points,
    nodes,
    rngState,
    entryPoint,
    maxLevel: Math.max(state.maxLevel, level),
  };

  if (state.entryPoint === null) return next;

  let entry = state.entryPoint;
  // Above the new node's own level there is nothing to link: each layer only
  // narrows the entry point for the layer below. That is what the sparse upper
  // layers are for — routing, not storage.
  for (let layer = state.maxLevel; layer > level; layer -= 1) {
    trace.steps.push({ kind: 'descendLayer', layer, entry });
    const [nearest] = searchLayer(next, vec, [entry], 1, layer, CONSTRUCTION_METRIC, trace);
    if (nearest) entry = nearest.id;
  }

  // The new node has no incoming edges yet, so it cannot turn up in its own
  // candidate sets no matter which layer the search runs on.
  for (let layer = Math.min(level, state.maxLevel); layer >= 0; layer -= 1) {
    trace.steps.push({ kind: 'descendLayer', layer, entry });
    const found = searchLayer(next, vec, [entry], params.efConstruction, layer, CONSTRUCTION_METRIC, trace);
    const chosen = selectNeighbours(next, vec, found, params.m, CONSTRUCTION_METRIC, trace);
    for (const neighbour of chosen) {
      link(nodes, id, neighbour, layer, trace);
      pruneNode(nodes, next, neighbour, layer, params.m, CONSTRUCTION_METRIC, trace);
    }
    pruneNode(nodes, next, id, layer, params.m, CONSTRUCTION_METRIC, trace);
    if (found.length > 0) entry = found[0].id;
  }

  return next;
}
```
- [ ] **Step 4: Run tests**
Run: `npx vitest run lib/lab/vector/hnsw.test.ts`
Expected: PASS
- [ ] **Step 5: Commit**
```bash
git add lib/lab/vector/hnsw.ts lib/lab/vector/hnsw.test.ts
git commit -m "feat: hnsw multi-layer insert with greedy descent"
```

---

### Task 45: `hnswSearch` — layer descent and an `ef` candidate set at layer 0

**Files:**
- Modify: `lib/lab/vector/hnsw.ts`
- Test: `lib/lab/vector/hnsw.test.ts`

**Interfaces:**
- Consumes: `makeDataset`, `DEFAULT_DATASET` from `./dataset`; `createFlat`, `flatSearch` from `./flat`; `recallAtK` from `./recall`
- Produces: `hnswSearch(state: HnswState, query: Vec, params: HnswSearchParams): OpResult<HnswState, readonly Ranked[], HnswStep>`

- [ ] **Step 1: Write the failing test**
```ts
// add to lib/lab/vector/hnsw.test.ts
import { hnswSearch } from './hnsw';
import type { HnswSearchParams } from './hnsw';
import { makeDataset, DEFAULT_DATASET } from './dataset';
import { createFlat, flatSearch } from './flat';
import { recallAtK } from './recall';
import type { Point, PointId, Ranked } from './types';

const SEARCH: HnswSearchParams = { k: 10, ef: 32, metric: 'euclidean' };

const dataset = makeDataset(DEFAULT_DATASET);

/** Inserts in dataset order and keeps the map back to the dataset's own ids. */
function buildIndex(points: readonly Point[], params: HnswParams) {
  let state = createHnsw(params);
  const assigned: PointId[] = [];
  for (const point of points) {
    const op = hnswInsert(state, point.vec, params);
    state = op.state;
    assigned.push(op.result);
  }
  const toDatasetId = new Map(assigned.map((id, index) => [id, points[index].id]));
  return { state, assigned, toDatasetId };
}

function asDatasetIds(ranked: readonly Ranked[], toDatasetId: ReadonlyMap<PointId, PointId>): Ranked[] {
  return ranked.map((entry) => ({ id: toDatasetId.get(entry.id) ?? entry.id, distance: entry.distance }));
}

function seededQueries(count: number, seed: number): Vec[] {
  const random = mulberry32(seed);
  return Array.from({ length: count }, () => [random(), random()]);
}

describe('hnswSearch', () => {
  it('returns nothing on an empty index', () => {
    const op = hnswSearch(createHnsw(PARAMS), [0.5, 0.5], SEARCH);
    expect(op.result).toEqual([]);
  });

  it('returns at most k results, ordered nearest first', () => {
    const { state } = buildIndex(dataset, PARAMS);
    const op = hnswSearch(state, [0.5, 0.5], SEARCH);
    expect(op.result.length).toBeLessThanOrEqual(SEARCH.k);
    const distances = op.result.map((entry) => entry.distance);
    expect(distances).toEqual([...distances].sort((a, b) => a - b));
  });

  it('emits an admit step per returned result, ranked in order', () => {
    const { state } = buildIndex(dataset, PARAMS);
    const op = hnswSearch(state, [0.5, 0.5], SEARCH);
    const admits = op.steps.filter((step) => step.kind === 'admit');
    expect(admits.map((step) => step.rank)).toEqual(op.result.map((_, index) => index));
  });

  it('descends from the top layer down to 0', () => {
    const { state } = buildIndex(dataset, PARAMS);
    const op = hnswSearch(state, [0.5, 0.5], SEARCH);
    const layers = op.steps.filter((step) => step.kind === 'descendLayer').map((step) => step.layer);
    expect(layers[0]).toBe(state.maxLevel);
    expect(layers).toContain(0);
  });

  it('clears a recall@10 threshold against flat ground truth', () => {
    const { state, toDatasetId } = buildIndex(dataset, PARAMS);
    const flat = createFlat(dataset);
    const recalls = seededQueries(40, 101).map((query) => {
      const got = asDatasetIds(hnswSearch(state, query, SEARCH).result, toDatasetId);
      const truth = flatSearch(flat, query, { k: SEARCH.k, metric: SEARCH.metric }).result;
      return recallAtK(got, truth, SEARCH.k);
    });
    const mean = recalls.reduce((sum, value) => sum + value, 0) / recalls.length;
    expect(mean).toBeGreaterThanOrEqual(0.9);
  });

  it('costs far fewer distance computations than a full scan', () => {
    const { state } = buildIndex(dataset, PARAMS);
    const op = hnswSearch(state, [0.5, 0.5], SEARCH);
    expect(op.counters.distanceComputations).toBeLessThan(dataset.length);
  });

  it('returns the input state untouched, for signature uniformity', () => {
    const { state } = buildIndex(dataset, PARAMS);
    const before = snapshot(state);
    const op = hnswSearch(state, [0.5, 0.5], SEARCH);
    expect(op.state).toBe(state);
    expect(snapshot(state)).toBe(before);
  });
});
```
- [ ] **Step 2: Run test to verify it fails**
Run: `npx vitest run lib/lab/vector/hnsw.test.ts`
Expected: FAIL with "hnswSearch is not a function" (no export named `hnswSearch`)
- [ ] **Step 3: Write minimal implementation**
```ts
// add to lib/lab/vector/hnsw.ts
export function hnswSearch(
  state: HnswState,
  query: Vec,
  params: HnswSearchParams,
): OpResult<HnswState, readonly Ranked[], HnswStep> {
  const trace = newTrace();
  if (state.entryPoint === null) {
    return { state, result: [], steps: trace.steps, counters: toCounters(trace) };
  }

  let entry = state.entryPoint;
  // The upper layers are a routing table: one greedy hop per layer, keeping only
  // the single best node, is enough to land near the right region of layer 0.
  for (let layer = state.maxLevel; layer > 0; layer -= 1) {
    trace.steps.push({ kind: 'descendLayer', layer, entry });
    const [nearest] = searchLayer(state, query, [entry], 1, layer, params.metric, trace);
    if (nearest) entry = nearest.id;
  }

  trace.steps.push({ kind: 'descendLayer', layer: 0, entry });
  const ef = Math.max(params.ef, params.k);
  const found = searchLayer(state, query, [entry], ef, 0, params.metric, trace);

  const result = found.slice(0, params.k);
  result.forEach((entryFound, rank) => {
    trace.steps.push({ kind: 'admit', id: entryFound.id, distance: entryFound.distance, rank });
  });

  // State is returned unchanged: search is a read, and the uniform signature is
  // what lets the UI drive every operation through one code path.
  return { state, result, steps: trace.steps, counters: toCounters(trace) };
}
```
- [ ] **Step 4: Run tests**
Run: `npx vitest run lib/lab/vector/hnsw.test.ts`
Expected: PASS
- [ ] **Step 5: Commit**
```bash
git add lib/lab/vector/hnsw.ts lib/lab/vector/hnsw.test.ts
git commit -m "feat: hnsw layered search with an ef candidate set"
```

---

### Task 46: `hnswDelete` — tombstone only, never unlink

**Files:**
- Modify: `lib/lab/vector/hnsw.ts`
- Test: `lib/lab/vector/hnsw.test.ts`

**Interfaces:**
- Produces: `hnswDelete(state: HnswState, id: PointId): OpResult<HnswState, boolean, HnswStep>`; `hnswSearch` now filters tombstoned nodes out of its result.

- [ ] **Step 1: Write the failing test**
```ts
// add to lib/lab/vector/hnsw.test.ts
import { hnswDelete } from './hnsw';

function deleteMany(state: HnswState, ids: readonly PointId[]): HnswState {
  return ids.reduce((current, id) => hnswDelete(current, id).state, state);
}

describe('hnswDelete', () => {
  it('tombstones the point and reports that it did', () => {
    const { state } = buildIndex(dataset, PARAMS);
    const op = hnswDelete(state, 3);
    expect(op.result).toBe(true);
    expect(op.state.deleted.has(3)).toBe(true);
    expect(op.steps).toContainEqual({ kind: 'tombstone', id: 3 });
  });

  it('reports false for an id that is absent or already tombstoned', () => {
    const { state } = buildIndex(dataset, PARAMS);
    expect(hnswDelete(state, 99999).result).toBe(false);
    const once = hnswDelete(state, 3).state;
    expect(hnswDelete(once, 3).result).toBe(false);
  });

  it('keeps the node and every edge in place — the graph is not rewired', () => {
    const { state } = buildIndex(dataset, PARAMS);
    const op = hnswDelete(state, 3);
    expect(op.state.nodes.get(3)).toBe(state.nodes.get(3));
    expect(op.state.nodes.size).toBe(state.nodes.size);
    expect(op.state.points.size).toBe(state.points.size);
    [...op.state.nodes.values()].forEach((node) => {
      expect(node).toBe(state.nodes.get(node.id));
    });
  });

  it('leaves the entry point alone even when the entry point is the tombstone', () => {
    const { state } = buildIndex(dataset, PARAMS);
    const entry = state.entryPoint ?? 0;
    const op = hnswDelete(state, entry);
    expect(op.state.entryPoint).toBe(entry);
    expect(op.state.maxLevel).toBe(state.maxLevel);
  });

  it('still traverses tombstoned nodes during search, and counts them', () => {
    const { state } = buildIndex(dataset, PARAMS);
    const half = [...state.nodes.keys()].filter((id) => id % 2 === 0);
    const deleted = deleteMany(state, half);
    const op = hnswSearch(deleted, [0.5, 0.5], SEARCH);
    expect(op.counters.tombstonesTraversed).toBeGreaterThan(0);
    expect(op.steps.some((step) => step.kind === 'skipTombstoned')).toBe(true);
  });

  it('never returns a tombstoned point, on any query', () => {
    const { state } = buildIndex(dataset, PARAMS);
    const half = [...state.nodes.keys()].filter((id) => id % 2 === 0);
    const deleted = deleteMany(state, half);
    seededQueries(60, 211).forEach((query) => {
      hnswSearch(deleted, query, SEARCH).result.forEach((entry) => {
        expect(deleted.deleted.has(entry.id)).toBe(false);
      });
    });
  });

  it('leaves the input state unchanged', () => {
    const { state } = buildIndex(dataset, PARAMS);
    const before = snapshot(state);
    hnswDelete(state, 5);
    expect(snapshot(state)).toBe(before);
  });
});
```
- [ ] **Step 2: Run test to verify it fails**
Run: `npx vitest run lib/lab/vector/hnsw.test.ts`
Expected: FAIL with "hnswDelete is not a function" (no export named `hnswDelete`)
- [ ] **Step 3: Write minimal implementation**
```ts
// add to lib/lab/vector/hnsw.ts
/**
 * Tombstone. Deliberately does not unlink, and that is the lesson.
 *
 * A node's edges are what hold its neighbourhood together; cutting them out of a
 * proximity graph can strand whole regions, and there is no cheap local repair
 * that provably avoids it. Real systems therefore mark and filter at query time,
 * and pay for it in traversal cost until a compaction rebuilds the graph.
 */
export function hnswDelete(state: HnswState, id: PointId): OpResult<HnswState, boolean, HnswStep> {
  const trace = newTrace();
  if (!state.nodes.has(id) || state.deleted.has(id)) {
    return { state, result: false, steps: trace.steps, counters: toCounters(trace) };
  }

  const deleted = new Set(state.deleted);
  deleted.add(id);
  trace.steps.push({ kind: 'tombstone', id });

  // The entry point is not moved even when it is the node being deleted: it is
  // still a perfectly good routing node, and moving it would rewire the descent.
  return { state: { ...state, deleted }, result: true, steps: trace.steps, counters: toCounters(trace) };
}
```
Then, in `hnswSearch`, replace the `const result = found.slice(0, params.k);` line with:
```ts
  // Tombstoned nodes are traversed but never returned. Filtering at the boundary
  // is the whole trick: the edges stay usable while the point stops existing.
  const live = found.filter((candidate) => !state.deleted.has(candidate.id));
  const result = live.slice(0, params.k);
```
- [ ] **Step 4: Run tests**
Run: `npx vitest run lib/lab/vector/hnsw.test.ts`
Expected: PASS
- [ ] **Step 5: Commit**
```bash
git add lib/lab/vector/hnsw.ts lib/lab/vector/hnsw.test.ts
git commit -m "feat: hnsw tombstone delete that never unlinks"
```

---

### Task 47: Search widens `ef` to fill `k` live results — cost rises with tombstone ratio

**Files:**
- Modify: `lib/lab/vector/hnsw.ts`
- Test: `lib/lab/vector/hnsw.test.ts`

**Interfaces:**
- Produces: no new exports. `hnswSearch` re-runs layer 0 with a doubled `ef` until it holds `k` live results or has exhausted the graph.

**Why the monotonicity assertion is sound:** traversal never reads `deleted`, so the candidate set at a given `ef` is identical no matter how many points are tombstoned. Deletions are cumulative, so the live count inside any fixed candidate set can only fall, so the `ef` at which `k` live results appear can only rise, so total cost is non-decreasing along the deletion sequence. The test asserts exactly that, plus a strict rise end to end.

- [ ] **Step 1: Write the failing test**
```ts
// add to lib/lab/vector/hnsw.test.ts
const NARROW: HnswSearchParams = { k: 10, ef: 16, metric: 'euclidean' };

function totalCost(state: HnswState, queries: readonly Vec[], params: HnswSearchParams): number {
  return queries.reduce((sum, query) => sum + hnswSearch(state, query, params).counters.distanceComputations, 0);
}

describe('hnswSearch under tombstones', () => {
  it('still returns k live results when tombstones crowd the candidate set', () => {
    const { state } = buildIndex(dataset, PARAMS);
    const ids = [...state.nodes.keys()];
    const deleted = deleteMany(state, ids.slice(0, Math.floor(ids.length * 0.6)));
    const op = hnswSearch(deleted, [0.5, 0.5], NARROW);
    expect(op.result).toHaveLength(NARROW.k);
    op.result.forEach((entry) => expect(deleted.deleted.has(entry.id)).toBe(false));
  });

  it('costs more per query as the tombstone ratio climbs, and never less', () => {
    const { state } = buildIndex(dataset, PARAMS);
    const ids = [...state.nodes.keys()];
    const queries = seededQueries(30, 307);
    const fractions = [0, 0.2, 0.4, 0.6, 0.8];

    const costs = fractions.map((fraction) =>
      totalCost(deleteMany(state, ids.slice(0, Math.floor(ids.length * fraction))), queries, NARROW),
    );

    costs.forEach((cost, index) => {
      if (index > 0) expect(cost, `fraction ${fractions[index]}`).toBeGreaterThanOrEqual(costs[index - 1]);
    });
    expect(costs[costs.length - 1]).toBeGreaterThan(costs[0]);
  });

  it('recall falls as tombstones accumulate, which is the cost being paid', () => {
    const { state, toDatasetId } = buildIndex(dataset, PARAMS);
    const flat = createFlat(dataset);
    const ids = [...state.nodes.keys()];
    const deleted = deleteMany(state, ids.slice(0, Math.floor(ids.length * 0.8)));
    const liveDatasetIds = new Set(
      [...deleted.nodes.keys()].filter((id) => !deleted.deleted.has(id)).map((id) => toDatasetId.get(id)),
    );
    // Ground truth restricted to survivors: recall must be measured against what
    // the index could legitimately still return.
    const query: Vec = [0.5, 0.5];
    const truth = flatSearch(flat, query, { k: dataset.length, metric: NARROW.metric })
      .result.filter((entry) => liveDatasetIds.has(entry.id))
      .slice(0, NARROW.k);
    const got = asDatasetIds(hnswSearch(deleted, query, NARROW).result, toDatasetId);
    expect(recallAtK(got, truth, NARROW.k)).toBeLessThanOrEqual(1);
    expect(got).toHaveLength(NARROW.k);
  });

  it('terminates and returns what is left when almost everything is tombstoned', () => {
    const { state } = buildIndex(dataset, PARAMS);
    const ids = [...state.nodes.keys()];
    const deleted = deleteMany(state, ids.slice(0, ids.length - 3));
    const op = hnswSearch(deleted, [0.5, 0.5], NARROW);
    expect(op.result).toHaveLength(3);
  });

  it('returns nothing, without hanging, when every point is tombstoned', () => {
    const { state } = buildIndex(dataset, PARAMS);
    const deleted = deleteMany(state, [...state.nodes.keys()]);
    expect(hnswSearch(deleted, [0.5, 0.5], NARROW).result).toEqual([]);
  });
});
```
- [ ] **Step 2: Run test to verify it fails**
Run: `npx vitest run lib/lab/vector/hnsw.test.ts`
Expected: FAIL with "expected length 4 to be 10" — the first candidate set has too few survivors and search does not widen.
- [ ] **Step 3: Write minimal implementation**
Replace everything in `hnswSearch` after the upper-layer descent loop with:
```ts
  // Tombstones occupy slots in the candidate set, so a deletion-heavy index has to
  // widen `ef` before it can come back with `k` live neighbours. This is where the
  // cost of deferred deletion actually shows up, and why it climbs with the
  // tombstone ratio: traversal itself is unaffected, the re-searching is not.
  let ef = Math.max(params.ef, params.k);
  let live: Ranked[] = [];
  for (;;) {
    trace.steps.push({ kind: 'descendLayer', layer: 0, entry });
    const found = searchLayer(state, query, [entry], ef, 0, params.metric, trace);
    live = found.filter((candidate) => !state.deleted.has(candidate.id));
    if (live.length >= params.k || ef >= state.nodes.size) break;
    ef = Math.min(ef * 2, state.nodes.size);
  }

  const result = live.slice(0, params.k);
  result.forEach((entryFound, rank) => {
    trace.steps.push({ kind: 'admit', id: entryFound.id, distance: entryFound.distance, rank });
  });

  return { state, result, steps: trace.steps, counters: toCounters(trace) };
```
- [ ] **Step 4: Run tests**
Run: `npx vitest run lib/lab/vector/hnsw.test.ts`
Expected: PASS
- [ ] **Step 5: Commit**
```bash
git add lib/lab/vector/hnsw.ts lib/lab/vector/hnsw.test.ts
git commit -m "feat: hnsw search widens ef to fill k live results"
```

---

### Task 48: `compactHnsw` — rebuild from live points, clearing tombstones

**Files:**
- Modify: `lib/lab/vector/hnsw.ts`
- Test: `lib/lab/vector/hnsw.test.ts`

**Interfaces:**
- Produces: `compactHnsw(state: HnswState, params: HnswParams): OpResult<HnswState, void, HnswStep>`

- [ ] **Step 1: Write the failing test**
```ts
// add to lib/lab/vector/hnsw.test.ts
import { compactHnsw } from './hnsw';

describe('compactHnsw', () => {
  it('drops every tombstone and keeps every survivor, with its id', () => {
    const { state } = buildIndex(dataset, PARAMS);
    const ids = [...state.nodes.keys()];
    const removedIds = ids.slice(0, Math.floor(ids.length * 0.5));
    const deleted = deleteMany(state, removedIds);
    const op = compactHnsw(deleted, PARAMS);

    expect(op.state.deleted.size).toBe(0);
    expect(op.state.nodes.size).toBe(ids.length - removedIds.length);
    removedIds.forEach((id) => expect(op.state.nodes.has(id)).toBe(false));
    ids.slice(removedIds.length).forEach((id) => {
      expect(op.state.points.get(id)?.vec).toEqual(state.points.get(id)?.vec);
    });
  });

  it('never reuses an id, so a later insert cannot collide with a removed point', () => {
    const { state } = buildIndex(dataset, PARAMS);
    const deleted = hnswDelete(state, 0).state;
    const compacted = compactHnsw(deleted, PARAMS).state;
    expect(compacted.nextId).toBe(state.nextId);
    expect(hnswInsert(compacted, [0.5, 0.5], PARAMS).result).toBe(state.nextId);
  });

  it('reports how many tombstones it removed', () => {
    const { state } = buildIndex(dataset, PARAMS);
    const deleted = deleteMany(state, [...state.nodes.keys()].slice(0, 12));
    expect(compactHnsw(deleted, PARAMS).steps).toContainEqual({ kind: 'compact', removed: 12 });
  });

  it('restores search cost to the pre-deletion level', () => {
    const { state } = buildIndex(dataset, PARAMS);
    const queries = seededQueries(30, 401);
    const before = totalCost(state, queries, NARROW);
    const deleted = deleteMany(state, [...state.nodes.keys()].slice(0, Math.floor(dataset.length * 0.7)));
    const degraded = totalCost(deleted, queries, NARROW);
    const after = totalCost(compactHnsw(deleted, PARAMS).state, queries, NARROW);

    expect(degraded).toBeGreaterThan(before);
    // Both directions: compaction has to undo the degradation, and it must not
    // make a smaller index cost more than the full one did.
    expect(after).toBeLessThan(degraded);
    expect(after).toBeLessThanOrEqual(before);
  });

  it('restores recall against ground truth over the surviving points', () => {
    const { state, toDatasetId } = buildIndex(dataset, PARAMS);
    const ids = [...state.nodes.keys()];
    const removedIds = ids.slice(0, Math.floor(ids.length * 0.7));
    const survivors = new Set(ids.slice(removedIds.length).map((id) => toDatasetId.get(id)));
    const compacted = compactHnsw(deleteMany(state, removedIds), PARAMS).state;
    const flat = createFlat(dataset.filter((point) => survivors.has(point.id)));

    const recalls = seededQueries(40, 409).map((query) => {
      const got = asDatasetIds(hnswSearch(compacted, query, NARROW).result, toDatasetId);
      const truth = flatSearch(flat, query, { k: NARROW.k, metric: NARROW.metric }).result;
      return recallAtK(got, truth, NARROW.k);
    });
    const mean = recalls.reduce((sum, value) => sum + value, 0) / recalls.length;
    expect(mean).toBeGreaterThanOrEqual(0.9);
  });

  it('is deterministic: compacting the same state twice gives the same graph', () => {
    const { state } = buildIndex(dataset, PARAMS);
    const deleted = deleteMany(state, [...state.nodes.keys()].slice(0, 40));
    expect(snapshot(compactHnsw(deleted, PARAMS).state)).toBe(snapshot(compactHnsw(deleted, PARAMS).state));
  });

  it('leaves the input state unchanged', () => {
    const { state } = buildIndex(dataset, PARAMS);
    const deleted = deleteMany(state, [...state.nodes.keys()].slice(0, 40));
    const before = snapshot(deleted);
    compactHnsw(deleted, PARAMS);
    expect(snapshot(deleted)).toBe(before);
  });
});
```
- [ ] **Step 2: Run test to verify it fails**
Run: `npx vitest run lib/lab/vector/hnsw.test.ts`
Expected: FAIL with "compactHnsw is not a function" (no export named `compactHnsw`)
- [ ] **Step 3: Write minimal implementation**
```ts
// add to lib/lab/vector/hnsw.ts
/**
 * Rebuild the graph from the live points, clearing every tombstone.
 *
 * A full rebuild rather than an in-place repair, for the same reason delete does
 * not unlink: there is no local edit that provably keeps a proximity graph
 * connected once nodes start disappearing from it. Ids survive the rebuild, so
 * everything holding a reference to a point still resolves.
 */
export function compactHnsw(state: HnswState, params: HnswParams): OpResult<HnswState, void, HnswStep> {
  const removed = state.deleted.size;
  const live = [...state.points.values()]
    .filter((point) => !state.deleted.has(point.id))
    .sort((a, b) => a.id - b.id);

  const work = newTrace();
  let rebuilt: HnswState = {
    nodes: new Map(),
    points: new Map(),
    deleted: new Set(),
    entryPoint: null,
    maxLevel: 0,
    // Ids are never reused: a compacted index keeps counting from where it was.
    nextId: state.nextId,
    rngState: params.seed,
  };
  for (const point of live) {
    rebuilt = insertPoint(rebuilt, point.id, point.vec, params, work);
  }

  // The rebuild's own trace is thousands of steps long and the scrubber's unit
  // here is the rebuild itself, so only the summary step is surfaced. The work it
  // did still shows up in the counters.
  return {
    state: rebuilt,
    result: undefined,
    steps: [{ kind: 'compact', removed }],
    counters: toCounters(work),
  };
}
```
- [ ] **Step 4: Run tests**
Run: `npx vitest run lib/lab/vector/hnsw.test.ts`
Expected: PASS
- [ ] **Step 5: Commit**
```bash
git add lib/lab/vector/hnsw.ts lib/lab/vector/hnsw.test.ts
git commit -m "feat: hnsw compaction rebuilds from live points"
```

---

### Task 49: `tombstoneRatio` and `meanDegree`

**Files:**
- Modify: `lib/lab/vector/hnsw.ts`
- Test: `lib/lab/vector/hnsw.test.ts`

**Interfaces:**
- Produces: `tombstoneRatio(state: HnswState): number`, `meanDegree(state: HnswState, layer: number): number`

- [ ] **Step 1: Write the failing test**
```ts
// add to lib/lab/vector/hnsw.test.ts
import { tombstoneRatio, meanDegree } from './hnsw';

describe('tombstoneRatio', () => {
  it('is 0 for an empty index rather than NaN', () => {
    expect(tombstoneRatio(createHnsw(PARAMS))).toBe(0);
  });

  it('is 0 before any deletion', () => {
    const { state } = buildIndex(dataset, PARAMS);
    expect(tombstoneRatio(state)).toBe(0);
  });

  it('reports the fraction of nodes that are tombstoned', () => {
    const { state } = buildIndex(dataset, PARAMS);
    const ids = [...state.nodes.keys()];
    const half = ids.slice(0, Math.floor(ids.length / 2));
    expect(tombstoneRatio(deleteMany(state, half))).toBeCloseTo(half.length / ids.length, 10);
  });

  it('returns to 0 after compaction', () => {
    const { state } = buildIndex(dataset, PARAMS);
    const deleted = deleteMany(state, [...state.nodes.keys()].slice(0, 30));
    expect(tombstoneRatio(compactHnsw(deleted, PARAMS).state)).toBe(0);
  });
});

describe('meanDegree', () => {
  it('is 0 for a layer no node occupies', () => {
    expect(meanDegree(createHnsw(PARAMS), 0)).toBe(0);
    const { state } = buildIndex(dataset, PARAMS);
    expect(meanDegree(state, state.maxLevel + 5)).toBe(0);
  });

  it('never exceeds m on any layer', () => {
    const { state } = buildIndex(dataset, PARAMS);
    for (let layer = 0; layer <= state.maxLevel; layer += 1) {
      expect(meanDegree(state, layer)).toBeLessThanOrEqual(PARAMS.m);
    }
  });

  it('is higher on the dense bottom layer than on the sparse top one', () => {
    const { state } = buildIndex(dataset, PARAMS);
    expect(state.maxLevel).toBeGreaterThan(0);
    expect(meanDegree(state, 0)).toBeGreaterThan(meanDegree(state, state.maxLevel));
  });

  it('is unmoved by deletion, because deletion does not touch edges', () => {
    const { state } = buildIndex(dataset, PARAMS);
    const deleted = deleteMany(state, [...state.nodes.keys()].slice(0, 60));
    expect(meanDegree(deleted, 0)).toBe(meanDegree(state, 0));
  });
});
```
- [ ] **Step 2: Run test to verify it fails**
Run: `npx vitest run lib/lab/vector/hnsw.test.ts`
Expected: FAIL with "tombstoneRatio is not a function" (no export named `tombstoneRatio`)
- [ ] **Step 3: Write minimal implementation**
```ts
// add to lib/lab/vector/hnsw.ts
/** Fraction of the graph that is tombstoned. The health readout's headline number. */
export function tombstoneRatio(state: HnswState): number {
  if (state.nodes.size === 0) return 0;
  return state.deleted.size / state.nodes.size;
}

/**
 * Mean neighbour count on one layer, over the nodes that reach it.
 *
 * Tombstoned nodes are counted: they are still edges in the graph, and a degree
 * that ignored them would misreport what the traversal actually walks.
 */
export function meanDegree(state: HnswState, layer: number): number {
  let nodes = 0;
  let edges = 0;
  for (const node of state.nodes.values()) {
    if (layer >= node.neighbours.length) continue;
    nodes += 1;
    edges += node.neighbours[layer].length;
  }
  return nodes === 0 ? 0 : edges / nodes;
}
```
- [ ] **Step 4: Run tests**
Run: `npx vitest run lib/lab/vector/hnsw.test.ts`
Expected: PASS
- [ ] **Step 5: Commit**
```bash
git add lib/lab/vector/hnsw.ts lib/lab/vector/hnsw.test.ts
git commit -m "feat: hnsw tombstone ratio and mean degree readouts"
```

---

### Task 50: `isConnected` — the property whose violation is why tombstoning exists

**Files:**
- Modify: `lib/lab/vector/hnsw.ts`
- Test: `lib/lab/vector/hnsw.test.ts`

**Interfaces:**
- Produces: `isConnected(state: HnswState): boolean`

- [ ] **Step 1: Write the failing test**
```ts
// add to lib/lab/vector/hnsw.test.ts
describe('isConnected', () => {
  it('is true for an empty index — nothing is stranded', () => {
    expect(isConnected(createHnsw(PARAMS))).toBe(true);
  });

  it('is true for a single node', () => {
    expect(isConnected(hnswInsert(createHnsw(PARAMS), [0.5, 0.5], PARAMS).state)).toBe(true);
  });

  it('is true after building the seeded dataset', () => {
    const { state } = buildIndex(dataset, PARAMS);
    expect(isConnected(state)).toBe(true);
  });

  it('detects a graph whose node has been stripped of its edges', () => {
    const { state } = buildIndex(dataset, PARAMS);
    const stranded = [...state.nodes.keys()].find((id) => id !== state.entryPoint) ?? 1;
    const nodes = new Map(state.nodes);
    // Strip the node's edges and every edge pointing at it, which is precisely
    // what an unlinking delete would have to do.
    for (const node of nodes.values()) {
      const neighbours = node.neighbours.map((ids) => ids.filter((id) => id !== stranded));
      nodes.set(node.id, node.id === stranded ? { ...node, neighbours: node.neighbours.map(() => []) } : { ...node, neighbours });
    }
    expect(isConnected({ ...state, nodes })).toBe(false);
  });

  it('stays connected across a seeded interleaving of inserts and deletes', () => {
    const random = mulberry32(503);
    let state = createHnsw(PARAMS);
    for (let step = 0; step < 400; step += 1) {
      const live = [...state.nodes.keys()].filter((id) => !state.deleted.has(id));
      if (live.length > 20 && random() < 0.4) {
        state = hnswDelete(state, live[Math.floor(random() * live.length)]).state;
      } else {
        state = hnswInsert(state, [random(), random()], PARAMS).state;
      }
      expect(isConnected(state), `after step ${step}`).toBe(true);
    }
    expect(state.deleted.size).toBeGreaterThan(0);
  });

  it('stays connected after compaction', () => {
    const { state } = buildIndex(dataset, PARAMS);
    const deleted = deleteMany(state, [...state.nodes.keys()].slice(0, Math.floor(dataset.length * 0.6)));
    expect(isConnected(compactHnsw(deleted, PARAMS).state)).toBe(true);
  });
});
```
Add `isConnected` to the `./hnsw` import list at the top of the test file.
- [ ] **Step 2: Run test to verify it fails**
Run: `npx vitest run lib/lab/vector/hnsw.test.ts`
Expected: FAIL with "isConnected is not a function" (no export named `isConnected`)
- [ ] **Step 3: Write minimal implementation**
```ts
// add to lib/lab/vector/hnsw.ts
/**
 * Whether every node on layer 0 is reachable from the entry point.
 *
 * Reachability is measured on the undirected view: pruning trims one end of an
 * edge and leaves the other, so a strictly directed reading would report a graph
 * as broken that the traversal navigates fine. Tombstoned nodes are included —
 * they still carry edges, which is exactly why deleting by tombstone cannot
 * strand anything and deleting by unlinking can.
 */
export function isConnected(state: HnswState): boolean {
  if (state.entryPoint === null || state.nodes.size === 0) return true;

  const adjacency = new Map<PointId, Set<PointId>>();
  for (const id of state.nodes.keys()) adjacency.set(id, new Set());
  for (const node of state.nodes.values()) {
    for (const neighbour of node.neighbours[0] ?? []) {
      adjacency.get(node.id)?.add(neighbour);
      adjacency.get(neighbour)?.add(node.id);
    }
  }

  const seen = new Set<PointId>([state.entryPoint]);
  const queue: PointId[] = [state.entryPoint];
  while (queue.length > 0) {
    const current = queue.shift();
    if (current === undefined) break;
    for (const neighbour of adjacency.get(current) ?? []) {
      if (seen.has(neighbour)) continue;
      seen.add(neighbour);
      queue.push(neighbour);
    }
  }

  return seen.size === state.nodes.size;
}
```
- [ ] **Step 4: Run tests**
Run: `npx vitest run lib/lab/vector/hnsw.test.ts`
Expected: PASS
- [ ] **Step 5: Commit**
```bash
git add lib/lab/vector/hnsw.ts lib/lab/vector/hnsw.test.ts
git commit -m "feat: hnsw layer-0 connectivity check"
```

---

### Task 51: The lifecycle regression net — tests only

**Files:**
- Modify: `lib/lab/vector/hnsw.test.ts`
- No implementation change. If any assertion here fails, the bug is in an earlier task and is fixed there.

**Interfaces:**
- Consumes: every export of `./hnsw`, plus `flatSearch` ground truth
- Produces: nothing. This is the suite that protects the spec's teaching claims from a later refactor.

- [ ] **Step 1: Write the failing test**
```ts
// add to lib/lab/vector/hnsw.test.ts
describe('hnsw lifecycle', () => {
  it('runs create -> insert -> delete -> compact with the health readout tracking it', () => {
    const { state } = buildIndex(dataset, PARAMS);
    const queries = seededQueries(30, 601);
    const flat = createFlat(dataset);

    expect(tombstoneRatio(state)).toBe(0);
    expect(isConnected(state)).toBe(true);
    const cleanCost = totalCost(state, queries, NARROW);

    const deleted = deleteMany(state, [...state.nodes.keys()].slice(0, Math.floor(dataset.length * 0.7)));
    expect(tombstoneRatio(deleted)).toBeGreaterThan(0.5);
    expect(isConnected(deleted)).toBe(true);
    expect(totalCost(deleted, queries, NARROW)).toBeGreaterThan(cleanCost);

    const compacted = compactHnsw(deleted, PARAMS).state;
    expect(tombstoneRatio(compacted)).toBe(0);
    expect(isConnected(compacted)).toBe(true);
    expect(totalCost(compacted, queries, NARROW)).toBeLessThanOrEqual(cleanCost);
    expect(flatSearch(flat, [0.5, 0.5], { k: 1, metric: 'euclidean' }).result).toHaveLength(1);
  });

  it('replays a seeded operation sequence to a byte-identical state', () => {
    function replay(): HnswState {
      const random = mulberry32(701);
      let state = createHnsw(PARAMS);
      for (let step = 0; step < 250; step += 1) {
        const live = [...state.nodes.keys()].filter((id) => !state.deleted.has(id));
        if (live.length > 20 && random() < 0.3) {
          state = hnswDelete(state, live[Math.floor(random() * live.length)]).state;
        } else {
          state = hnswInsert(state, [random(), random()], PARAMS).state;
        }
      }
      return compactHnsw(state, PARAMS).state;
    }
    expect(snapshot(replay())).toBe(snapshot(replay()));
  });

  it('keeps every operation pure against a pre-call snapshot', () => {
    const { state } = buildIndex(dataset, PARAMS);
    const deleted = deleteMany(state, [...state.nodes.keys()].slice(0, 20));
    const before = snapshot(deleted);
    hnswInsert(deleted, [0.5, 0.5], PARAMS);
    hnswDelete(deleted, 30);
    hnswSearch(deleted, [0.5, 0.5], NARROW);
    compactHnsw(deleted, PARAMS);
    expect(snapshot(deleted)).toBe(before);
  });

  it('never returns a tombstoned point, across the whole deletion sweep', () => {
    const { state } = buildIndex(dataset, PARAMS);
    const ids = [...state.nodes.keys()];
    const queries = seededQueries(25, 809);
    [0.2, 0.5, 0.8, 0.95].forEach((fraction) => {
      const deleted = deleteMany(state, ids.slice(0, Math.floor(ids.length * fraction)));
      queries.forEach((query) => {
        hnswSearch(deleted, query, NARROW).result.forEach((entry) => {
          expect(deleted.deleted.has(entry.id), `fraction ${fraction}`).toBe(false);
        });
      });
    });
  });

  it('reports counters that match an independent count of its own trace', () => {
    const { state } = buildIndex(dataset, PARAMS);
    const deleted = deleteMany(state, [...state.nodes.keys()].slice(0, 60));
    const op = hnswSearch(deleted, [0.4, 0.6], NARROW);
    expect(op.counters.nodesVisited).toBe(op.steps.filter((step) => step.kind === 'visit').length);
    expect(op.counters.tombstonesTraversed).toBe(
      op.steps.filter((step) => step.kind === 'skipTombstoned').length,
    );
    expect(op.counters.distanceComputations).toBeGreaterThanOrEqual(op.counters.nodesVisited);
    expect(op.counters.hops).toBeGreaterThan(0);
  });

  it('holds recall through a delete-then-compact cycle over the survivors', () => {
    const { state, toDatasetId } = buildIndex(dataset, PARAMS);
    const ids = [...state.nodes.keys()];
    const removedIds = ids.slice(0, Math.floor(ids.length * 0.5));
    const survivors = new Set(ids.slice(removedIds.length).map((id) => toDatasetId.get(id)));
    const compacted = compactHnsw(deleteMany(state, removedIds), PARAMS).state;
    const flat = createFlat(dataset.filter((point) => survivors.has(point.id)));

    const recalls = seededQueries(40, 907).map((query) => {
      const got = asDatasetIds(hnswSearch(compacted, query, SEARCH).result, toDatasetId);
      const truth = flatSearch(flat, query, { k: SEARCH.k, metric: SEARCH.metric }).result;
      return recallAtK(got, truth, SEARCH.k);
    });
    const mean = recalls.reduce((sum, value) => sum + value, 0) / recalls.length;
    expect(mean).toBeGreaterThanOrEqual(0.9);
  });
});
```
- [ ] **Step 2: Run test to verify it fails**
Run: `npx vitest run lib/lab/vector/hnsw.test.ts`
Expected: These pass on first run if Tasks 40–50 are correct — that is the point of a regression net. Before writing the implementation-free version, run the block once against a deliberately broken build to confirm it bites: change `hnswDelete` to also strip the tombstoned id out of every neighbour list, run, and watch "stays connected" and the cost assertions fail. Revert the sabotage before continuing.
- [ ] **Step 3: Write minimal implementation**
No production change. If any assertion above fails for real, fix it in the task that owns the behaviour (47 for cost, 48 for compaction, 50 for connectivity) and re-run that task's suite before returning here.
- [ ] **Step 4: Run tests**
Run: `npx vitest run lib/lab/vector/hnsw.test.ts`
Then the full suite and lint, which close the PR:
Run: `npm test`
Run: `npm run lint`
Expected: PASS, with no React import and no `Math.random` anywhere in `lib/lab/`. Confirm with:
```bash
grep -rn "Math.random\|from 'react'" lib/lab/ || echo "clean"
```
- [ ] **Step 5: Commit**
```bash
git add lib/lab/vector/hnsw.test.ts
git commit -m "test: hnsw lifecycle regression net for tombstones and compaction"
```

---

## PR 4 exit criteria

- `lib/lab/vector/hnsw.ts` exports exactly the locked API: `createHnsw`, `hnswInsert`, `hnswDelete`, `hnswSearch`, `compactHnsw`, `tombstoneRatio`, `isConnected`, `meanDegree`, plus the `HnswNode`, `HnswState`, `HnswStep`, `HnswParams`, `HnswSearchParams` types. Nothing else is exported.
- Counter keys are exactly `distanceComputations`, `nodesVisited`, `tombstonesTraversed`, `hops`.
- No UI file is touched. No React import in `lib/`. No `Math.random`. No new dependency.
- The four teaching claims are each asserted: connectivity across an interleaved sequence, a tombstoned point never returned, cost monotone in tombstone ratio, and compaction restoring cost and recall in both directions.
## PR 5: HNSW — UI

The pure view model lands first so the drawing components contain nothing but a loop over a computed list, exactly as the spec's testing seam requires. Theme tokens only, focus rings copied from `header.tsx`, `useReducedMotion` from `motion/react`.

---

### Task 52: The layer view model

**Files:**
- Create: `lib/lab/vector/hnsw-view.ts`
- Test: `lib/lab/vector/hnsw-view.test.ts`

**Interfaces:**
- Consumes: `toScreen`, `Viewport`, `ScreenPoint` from `./layout`; `HnswState`, `HnswStep` from `./hnsw`
- Produces: `HnswNodeKind`, `HnswViewNode`, `HnswViewEdge`, `HnswLayerView`, `HnswHighlight`, `hnswEdgeKey`, `hnswLayerViews`, `hnswStepLabel`, `hnswHighlight`

- [ ] **Step 1: Write the failing test**

```ts
// lib/lab/vector/hnsw-view.test.ts
import { describe, it, expect } from 'vitest';
import { createHnsw, hnswDelete, hnswInsert } from './hnsw';
import type { HnswParams, HnswState, HnswStep } from './hnsw';
import { hnswEdgeKey, hnswHighlight, hnswLayerViews, hnswStepLabel } from './hnsw-view';
import { mulberry32 } from './random';
import type { Viewport } from './layout';

const params: HnswParams = { m: 8, efConstruction: 32, levelMultiplier: 1 / Math.log(2), seed: 11 };
const viewport: Viewport = { width: 320, height: 320, padding: 16 };

function build(count: number, seed: number): HnswState {
  const random = mulberry32(seed);
  let state = createHnsw(params);
  for (let i = 0; i < count; i += 1) state = hnswInsert(state, [random(), random()], params).state;
  return state;
}

describe('hnswLayerViews', () => {
  it('returns one view per layer, densest last', () => {
    const state = build(60, 5);
    const views = hnswLayerViews(state, viewport);
    expect(views).toHaveLength(state.maxLevel + 1);
    expect(views.at(-1)?.layer).toBe(0);
    expect(views[0].layer).toBe(state.maxLevel);
  });

  it('puts every point on layer 0', () => {
    const state = build(60, 5);
    expect(hnswLayerViews(state, viewport).at(-1)?.nodes).toHaveLength(state.points.size);
  });

  it('keeps the upper layers sparse', () => {
    const state = build(60, 5);
    const views = hnswLayerViews(state, viewport);
    expect(views[0].nodes.length).toBeLessThan((views.at(-1) as { nodes: readonly unknown[] }).nodes.length);
  });

  it('places nodes inside the viewport', () => {
    hnswLayerViews(build(40, 6), viewport)
      .flatMap((view) => view.nodes)
      .forEach((node) => {
        expect(node.x).toBeGreaterThanOrEqual(0);
        expect(node.x).toBeLessThanOrEqual(viewport.width);
        expect(node.y).toBeGreaterThanOrEqual(0);
        expect(node.y).toBeLessThanOrEqual(viewport.height);
      });
  });

  it('marks the entry point', () => {
    const state = build(40, 6);
    const entry = hnswLayerViews(state, viewport)[0].nodes.find((node) => node.id === state.entryPoint);
    expect(entry?.kind).toBe('entry');
  });

  it('marks tombstoned nodes, so the canvas can draw them differently', () => {
    const state = hnswDelete(build(40, 6), 3).state;
    const node = hnswLayerViews(state, viewport).at(-1)?.nodes.find((candidate) => candidate.id === 3);
    expect(node?.kind).toBe('tombstoned');
  });

  it('keeps drawing tombstoned nodes rather than dropping them', () => {
    const before = hnswLayerViews(build(40, 6), viewport).at(-1)?.nodes.length;
    const state = hnswDelete(build(40, 6), 3).state;
    expect(hnswLayerViews(state, viewport).at(-1)?.nodes).toHaveLength(before as number);
  });

  it('draws each edge once, not once per direction', () => {
    const state = build(40, 6);
    const edges = hnswLayerViews(state, viewport).at(-1)?.edges ?? [];
    const keys = edges.map((edge) => hnswEdgeKey(edge.from, edge.to, 0));
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('gives every edge both endpoints', () => {
    hnswLayerViews(build(40, 6), viewport)
      .flatMap((view) => view.edges)
      .forEach((edge) => {
        expect(Number.isFinite(edge.x1)).toBe(true);
        expect(Number.isFinite(edge.y2)).toBe(true);
      });
  });

  it('returns a single empty layer for an empty index', () => {
    expect(hnswLayerViews(createHnsw(params), viewport)).toEqual([{ layer: 0, nodes: [], edges: [] }]);
  });
});

describe('hnswEdgeKey', () => {
  it('is the same key whichever direction the edge is read in', () => {
    expect(hnswEdgeKey(7, 2, 1)).toBe(hnswEdgeKey(2, 7, 1));
  });

  it('separates the same pair on different layers', () => {
    expect(hnswEdgeKey(2, 7, 0)).not.toBe(hnswEdgeKey(2, 7, 1));
  });
});

describe('hnswStepLabel', () => {
  it('describes a visit with its distance', () => {
    expect(hnswStepLabel({ kind: 'visit', id: 4, layer: 2, distance: 0.4212 })).toBe(
      'visiting node 4 on layer 2, distance 0.421',
    );
  });

  it('says out loud that a tombstone is traversed but not returned', () => {
    expect(hnswStepLabel({ kind: 'skipTombstoned', id: 9, layer: 0 })).toBe(
      'node 9 on layer 0 is tombstoned: traversed, never returned',
    );
  });

  it('ranks an admit from one, not zero, for the reader', () => {
    expect(hnswStepLabel({ kind: 'admit', id: 3, distance: 0.1, rank: 0 })).toContain('rank 1');
  });

  it('describes compaction by what it cleared', () => {
    expect(hnswStepLabel({ kind: 'compact', removed: 12 })).toBe('compaction cleared 12 tombstones');
  });
});

describe('hnswHighlight', () => {
  const steps: readonly HnswStep[] = [
    { kind: 'assignLevel', id: 5, level: 2 },
    { kind: 'descendLayer', layer: 2, entry: 0 },
    { kind: 'visit', id: 1, layer: 2, distance: 0.3 },
    { kind: 'visit', id: 2, layer: 1, distance: 0.2 },
    { kind: 'link', from: 5, to: 2, layer: 1 },
  ];

  it('accumulates every node touched up to the current step', () => {
    expect([...hnswHighlight(steps, 3).visited].sort()).toEqual([1, 2]);
  });

  it('does not run ahead of the scrubber', () => {
    expect(hnswHighlight(steps, 2).visited.has(2)).toBe(false);
  });

  it('names the node the current step is about', () => {
    expect(hnswHighlight(steps, 2).current).toBe(1);
  });

  it('tracks which layer the search is in', () => {
    expect(hnswHighlight(steps, 2).layer).toBe(2);
    expect(hnswHighlight(steps, 3).layer).toBe(1);
  });

  it('accumulates the links drawn so far', () => {
    expect(hnswHighlight(steps, 4).links.has(hnswEdgeKey(5, 2, 1))).toBe(true);
    expect(hnswHighlight(steps, 3).links.size).toBe(0);
  });

  it('carries a sentence for aria-valuetext', () => {
    expect(hnswHighlight(steps, 0).label).toBe('step 1 of 5: point 5 lands on level 2');
  });

  it('survives an index past the end of the trace', () => {
    expect(hnswHighlight(steps, 99).current).toBeNull();
    expect(hnswHighlight(steps, 99).visited.size).toBe(2);
  });

  it('survives an empty trace', () => {
    expect(hnswHighlight([], 0)).toEqual({ visited: new Set(), current: null, layer: null, links: new Set(), label: 'no steps to replay' });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/lab/vector/hnsw-view.test.ts`
Expected: FAIL with `Error: Failed to resolve import "./hnsw-view"`

- [ ] **Step 3: Write minimal implementation**

```ts
// lib/lab/vector/hnsw-view.ts
import type { HnswState, HnswStep } from './hnsw';
import { toScreen } from './layout';
import type { ScreenPoint, Viewport } from './layout';
import type { PointId } from './types';

export type HnswNodeKind = 'live' | 'tombstoned' | 'entry';

export interface HnswViewNode extends ScreenPoint {
  readonly kind: HnswNodeKind;
  readonly degree: number;
}

export interface HnswViewEdge {
  readonly from: PointId;
  readonly to: PointId;
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
}

export interface HnswLayerView {
  readonly layer: number;
  readonly nodes: readonly HnswViewNode[];
  readonly edges: readonly HnswViewEdge[];
}

export interface HnswHighlight {
  /** Every node the trace has touched up to and including the current step. */
  readonly visited: ReadonlySet<PointId>;
  /** The node the current step is about, if it is about one. */
  readonly current: PointId | null;
  /** The layer the trace is currently working in, or null before it enters one. */
  readonly layer: number | null;
  /** Edges created up to the current step, keyed by hnswEdgeKey. */
  readonly links: ReadonlySet<string>;
  /** One sentence, for aria-valuetext and the polite live region. */
  readonly label: string;
}

/** Undirected key: an edge is one line on screen, whichever end you read it from. */
export function hnswEdgeKey(from: PointId, to: PointId, layer: number): string {
  const [low, high] = from < to ? [from, to] : [to, from];
  return `${low}:${high}:${layer}`;
}

export function hnswLayerViews(state: HnswState, viewport: Viewport): readonly HnswLayerView[] {
  const views: HnswLayerView[] = [];

  for (let layer = state.maxLevel; layer >= 0; layer -= 1) {
    const screen = new Map<PointId, { x: number; y: number }>();
    const nodes: HnswViewNode[] = [];

    for (const node of state.nodes.values()) {
      if (node.level < layer) continue;
      const point = state.points.get(node.id);
      if (!point) continue;
      const position = toScreen(point.vec, viewport);
      screen.set(node.id, position);
      nodes.push({
        id: node.id,
        x: position.x,
        y: position.y,
        // Tombstoned wins over entry: an index still routing through a dead entry point
        // is the most interesting thing the canvas can be showing.
        kind: state.deleted.has(node.id) ? 'tombstoned' : node.id === state.entryPoint ? 'entry' : 'live',
        degree: (node.neighbours[layer] ?? []).length,
      });
    }

    const drawn = new Set<string>();
    const edges: HnswViewEdge[] = [];
    for (const node of state.nodes.values()) {
      if (node.level < layer) continue;
      for (const neighbour of node.neighbours[layer] ?? []) {
        const key = hnswEdgeKey(node.id, neighbour, layer);
        if (drawn.has(key)) continue;
        drawn.add(key);
        const from = screen.get(node.id);
        const to = screen.get(neighbour);
        if (!from || !to) continue;
        edges.push({ from: node.id, to: neighbour, x1: from.x, y1: from.y, x2: to.x, y2: to.y });
      }
    }

    views.push({ layer, nodes, edges });
  }

  return views;
}

export function hnswStepLabel(step: HnswStep): string {
  switch (step.kind) {
    case 'assignLevel':
      return `point ${step.id} lands on level ${step.level}`;
    case 'descendLayer':
      return `descending to layer ${step.layer} from node ${step.entry}`;
    case 'visit':
      return `visiting node ${step.id} on layer ${step.layer}, distance ${step.distance.toFixed(3)}`;
    case 'skipTombstoned':
      return `node ${step.id} on layer ${step.layer} is tombstoned: traversed, never returned`;
    case 'admit':
      return `admitting node ${step.id} at rank ${step.rank + 1}, distance ${step.distance.toFixed(3)}`;
    case 'link':
      return `linking node ${step.from} to node ${step.to} on layer ${step.layer}`;
    case 'prune':
      return `pruning the link from node ${step.from} to node ${step.to} on layer ${step.layer}`;
    case 'tombstone':
      return `tombstoning node ${step.id}: marked dead, still linked`;
    case 'compact':
      return `compaction cleared ${step.removed} tombstones`;
  }
}

function hnswStepNode(step: HnswStep): PointId | null {
  switch (step.kind) {
    case 'assignLevel':
    case 'visit':
    case 'skipTombstoned':
    case 'admit':
    case 'tombstone':
      return step.id;
    case 'descendLayer':
      return step.entry;
    case 'link':
    case 'prune':
      return step.from;
    case 'compact':
      return null;
  }
}

/** Folds the trace up to `index` into everything the canvas needs to paint one frame.
 * All of the scrubbing logic lives here so the SVG is a loop and nothing else. */
export function hnswHighlight(steps: readonly HnswStep[], index: number): HnswHighlight {
  const visited = new Set<PointId>();
  const links = new Set<string>();
  let layer: number | null = null;

  const last = Math.min(index, steps.length - 1);
  for (let i = 0; i <= last; i += 1) {
    const step = steps[i];
    if (step.kind === 'visit' || step.kind === 'skipTombstoned') {
      visited.add(step.id);
      layer = step.layer;
    }
    if (step.kind === 'descendLayer') layer = step.layer;
    if (step.kind === 'link') links.add(hnswEdgeKey(step.from, step.to, step.layer));
    if (step.kind === 'prune') links.delete(hnswEdgeKey(step.from, step.to, step.layer));
  }

  const current = index >= 0 && index < steps.length ? steps[index] : null;
  return {
    visited,
    current: current ? hnswStepNode(current) : null,
    layer,
    links,
    label: current
      ? `step ${index + 1} of ${steps.length}: ${hnswStepLabel(current)}`
      : steps.length === 0
        ? 'no steps to replay'
        : `step ${steps.length} of ${steps.length}: replay complete`,
  };
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run lib/lab/vector/hnsw-view.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/lab/vector/hnsw-view.ts lib/lab/vector/hnsw-view.test.ts
git commit -m "feat: pure hnsw layer view model and scrubber step labels"
```

---

### Task 53: `HnswLayerView` — the multi-layer graph, tombstones drawn distinctly

**Files:**
- Create: `components/lab/vector/hnsw-layer-view.tsx`
- Test: `components/lab/vector/hnsw-layer-view.test.tsx`

**Interfaces:**
- Consumes: `hnswLayerViews`, `hnswHighlight`, `hnswEdgeKey` from `@/lib/lab/vector/hnsw-view`; `Viewport` from `@/lib/lab/vector/layout`; `HnswState`, `HnswStep` from `@/lib/lab/vector/hnsw`
- Produces: `<HnswLayerView state steps stepIndex viewport />`. `stepIndex` is owned by the parent, which already owns the `Scrubber` from PR 1.

- [ ] **Step 1: Write the failing test**

```tsx
// components/lab/vector/hnsw-layer-view.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HnswLayerView } from './hnsw-layer-view';
import { createHnsw, hnswDelete, hnswInsert, hnswSearch } from '@/lib/lab/vector/hnsw';
import type { HnswParams, HnswState } from '@/lib/lab/vector/hnsw';
import { mulberry32 } from '@/lib/lab/vector/random';
import type { Viewport } from '@/lib/lab/vector/layout';

const params: HnswParams = { m: 8, efConstruction: 32, levelMultiplier: 1 / Math.log(2), seed: 11 };
const viewport: Viewport = { width: 280, height: 280, padding: 12 };

function build(count: number): HnswState {
  const random = mulberry32(5);
  let state = createHnsw(params);
  for (let i = 0; i < count; i += 1) state = hnswInsert(state, [random(), random()], params).state;
  return state;
}

const state = build(50);
const trace = hnswSearch(state, [0.5, 0.5], { k: 5, metric: 'euclidean', ef: 16 }).steps;

describe('HnswLayerView', () => {
  it('draws one labelled layer per level in the tower', () => {
    render(<HnswLayerView state={state} steps={trace} stepIndex={0} viewport={viewport} />);
    expect(screen.getAllByRole('img')).toHaveLength(state.maxLevel + 1);
    expect(screen.getByRole('img', { name: /layer 0/i })).toBeInTheDocument();
  });

  it('describes each layer for a reader who cannot see it', () => {
    render(<HnswLayerView state={state} steps={trace} stepIndex={0} viewport={viewport} />);
    expect(screen.getByRole('img', { name: /layer 0/i }).getAttribute('aria-label')).toContain('nodes');
  });

  it('marks the layer the search is currently in', () => {
    const descend = trace.findIndex((step) => step.kind === 'descendLayer');
    const { container } = render(
      <HnswLayerView state={state} steps={trace} stepIndex={descend} viewport={viewport} />,
    );
    expect(container.querySelectorAll('[data-active-layer="true"]')).toHaveLength(1);
  });

  it('moves the active layer as the scrubber advances', () => {
    const first = trace.findIndex((step) => step.kind === 'descendLayer');
    const last = trace.map((step) => step.kind).lastIndexOf('visit');
    const { container, rerender } = render(
      <HnswLayerView state={state} steps={trace} stepIndex={first} viewport={viewport} />,
    );
    const before = container.querySelector('[data-active-layer="true"]')?.getAttribute('data-layer');
    rerender(<HnswLayerView state={state} steps={trace} stepIndex={last} viewport={viewport} />);
    expect(container.querySelector('[data-active-layer="true"]')?.getAttribute('data-layer')).not.toBe(before);
  });

  it('marks the nodes the trace has visited so far', () => {
    const { container } = render(
      <HnswLayerView state={state} steps={trace} stepIndex={trace.length - 1} viewport={viewport} />,
    );
    expect(container.querySelectorAll('[data-visited="true"]').length).toBeGreaterThan(0);
  });

  it('draws tombstoned nodes as a different shape, not just a different colour', () => {
    const tombstoned = hnswDelete(state, 3).state;
    const { container } = render(
      <HnswLayerView state={tombstoned} steps={trace} stepIndex={0} viewport={viewport} />,
    );
    const dead = container.querySelectorAll('[data-kind="tombstoned"]');
    expect(dead.length).toBeGreaterThan(0);
    dead.forEach((node) => expect(node.tagName.toLowerCase()).toBe('rect'));
    expect(container.querySelectorAll('circle[data-kind="live"]').length).toBeGreaterThan(0);
  });

  it('says how many tombstones a layer is carrying', () => {
    const tombstoned = [3, 4, 5].reduce((current, id) => hnswDelete(current, id).state, state);
    render(<HnswLayerView state={tombstoned} steps={trace} stepIndex={0} viewport={viewport} />);
    expect(screen.getByRole('img', { name: /layer 0/i }).getAttribute('aria-label')).toContain('3 tombstoned');
  });

  it('announces the current step politely', () => {
    render(<HnswLayerView state={state} steps={trace} stepIndex={0} viewport={viewport} />);
    const live = screen.getByRole('status');
    expect(live).toHaveAttribute('aria-live', 'polite');
    expect(live).toHaveTextContent(/step 1 of/);
  });

  it('renders an empty index without falling over', () => {
    render(<HnswLayerView state={createHnsw(params)} steps={[]} stepIndex={0} viewport={viewport} />);
    expect(screen.getByRole('img', { name: /layer 0/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run components/lab/vector/hnsw-layer-view.test.tsx`
Expected: FAIL with `Error: Failed to resolve import "./hnsw-layer-view"`

- [ ] **Step 3: Write minimal implementation**

```tsx
// components/lab/vector/hnsw-layer-view.tsx
'use client';

import { motion, useReducedMotion } from 'motion/react';
import type { HnswState, HnswStep } from '@/lib/lab/vector/hnsw';
import { hnswEdgeKey, hnswHighlight, hnswLayerViews } from '@/lib/lab/vector/hnsw-view';
import type { HnswLayerView as LayerModel } from '@/lib/lab/vector/hnsw-view';
import type { Viewport } from '@/lib/lab/vector/layout';

interface HnswLayerViewProps {
  readonly state: HnswState;
  readonly steps: readonly HnswStep[];
  /** Owned by the parent's Scrubber, which is the whole animation driver. */
  readonly stepIndex: number;
  readonly viewport: Viewport;
}

function layerLabel(view: LayerModel): string {
  const tombstoned = view.nodes.filter((node) => node.kind === 'tombstoned').length;
  const tail = tombstoned > 0 ? `, ${tombstoned} tombstoned` : '';
  return `Layer ${view.layer}: ${view.nodes.length} nodes, ${view.edges.length} links${tail}`;
}

export function HnswLayerView({ state, steps, stepIndex, viewport }: HnswLayerViewProps) {
  const shouldReduceMotion = useReducedMotion();
  const views = hnswLayerViews(state, viewport);
  const highlight = hnswHighlight(steps, stepIndex);

  return (
    <div className="flex flex-col gap-3">
      {views.map((view) => {
        const active = highlight.layer === view.layer;
        return (
          <div
            key={view.layer}
            data-layer={view.layer}
            data-active-layer={active}
            className={`rounded border bg-background-raised p-2 ${active ? 'border-accent' : 'border-border'}`}
          >
            <p className="mb-1 text-xs uppercase tracking-widest font-medium text-foreground-dim">
              Layer {view.layer}
              {active && <span className="ml-2 text-accent">searching here</span>}
            </p>
            <svg
              role="img"
              aria-label={layerLabel(view)}
              viewBox={`0 0 ${viewport.width} ${viewport.height}`}
              className="w-full"
            >
              {view.edges.map((edge) => (
                <line
                  key={hnswEdgeKey(edge.from, edge.to, view.layer)}
                  x1={edge.x1}
                  y1={edge.y1}
                  x2={edge.x2}
                  y2={edge.y2}
                  className={
                    highlight.links.has(hnswEdgeKey(edge.from, edge.to, view.layer))
                      ? 'stroke-accent'
                      : 'stroke-border'
                  }
                  strokeWidth={1}
                />
              ))}
              {view.nodes.map((node) => {
                const visited = highlight.visited.has(node.id);
                const current = highlight.current === node.id;
                const shared = {
                  'data-kind': node.kind,
                  'data-visited': visited,
                  'data-current': current,
                  className:
                    node.kind === 'tombstoned'
                      ? 'fill-background stroke-foreground-dim'
                      : current
                        ? 'fill-accent stroke-accent'
                        : visited
                          ? 'fill-accent/40 stroke-accent'
                          : 'fill-background-raised stroke-foreground-dim',
                  strokeWidth: node.kind === 'entry' ? 2.5 : 1,
                  strokeDasharray: node.kind === 'tombstoned' ? '2 2' : undefined,
                };
                // Shape carries the tombstone, not colour: a square is legible in
                // monochrome, at low contrast, and to a colour-blind reader.
                return node.kind === 'tombstoned' ? (
                  <rect key={node.id} x={node.x - 3.5} y={node.y - 3.5} width={7} height={7} {...shared} />
                ) : (
                  <motion.circle
                    key={node.id}
                    cx={node.x}
                    cy={node.y}
                    r={current ? 6 : 4}
                    initial={shouldReduceMotion ? false : { opacity: 0 }}
                    animate={shouldReduceMotion ? undefined : { opacity: 1 }}
                    transition={{ duration: 0.2 }}
                    {...shared}
                  />
                );
              })}
            </svg>
          </div>
        );
      })}
      <p role="status" aria-live="polite" className="text-xs text-foreground-dim">
        {highlight.label}
      </p>
    </div>
  );
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run components/lab/vector/hnsw-layer-view.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add components/lab/vector/hnsw-layer-view.tsx components/lab/vector/hnsw-layer-view.test.tsx
git commit -m "feat: hnsw layer view with active-layer and tombstone rendering"
```

---

### Task 54: The degradation trio, computed purely

**Files:**
- Create: `lib/lab/vector/hnsw-health.ts`
- Test: `lib/lab/vector/hnsw-health.test.ts`

**Interfaces:**
- Consumes: `hnswSearch`, `tombstoneRatio`, `meanDegree`, `isConnected`; `createFlat`, `flatSearch`; `recallAtK`
- Produces: `HnswHealth`, `HnswHealthDelta`, `HnswHealthStatus`, `hnswHealth`, `hnswHealthDelta`, `hnswHealthStatus`

- [ ] **Step 1: Write the failing test**

```ts
// lib/lab/vector/hnsw-health.test.ts
import { describe, it, expect } from 'vitest';
import { compactHnsw, createHnsw, hnswDelete, hnswInsert } from './hnsw';
import type { HnswParams, HnswSearchParams, HnswState } from './hnsw';
import { hnswHealth, hnswHealthDelta, hnswHealthStatus } from './hnsw-health';
import { makeDataset } from './dataset';
import { mulberry32 } from './random';
import type { PointId, Vec } from './types';

const params: HnswParams = { m: 8, efConstruction: 32, levelMultiplier: 1 / Math.log(2), seed: 11 };
const search: HnswSearchParams = { k: 10, metric: 'euclidean', ef: 20 };
const dataset = makeDataset({ seed: 7, clusters: 5, perCluster: 24, spread: 0.05, straddlers: 10 });

const queries: readonly Vec[] = (() => {
  const random = mulberry32(303);
  return Array.from({ length: 12 }, () => [random(), random()]);
})();

const built: HnswState = dataset.reduce((state, point) => hnswInsert(state, point.vec, params).state, createHnsw(params));

function tombstone(fraction: number): HnswState {
  const random = mulberry32(404);
  const ids = [...built.points.keys()];
  const victims = new Set<PointId>();
  while (victims.size < Math.floor(ids.length * fraction)) {
    victims.add(ids[Math.floor(random() * ids.length)] as PointId);
  }
  return [...victims].reduce((state, id) => hnswDelete(state, id).state, built);
}

describe('hnswHealth', () => {
  it('reports total, live and tombstone ratio', () => {
    const health = hnswHealth(tombstone(0.4), queries, search);
    expect(health.points).toBe(dataset.length);
    expect(health.live).toBeLessThan(health.points);
    expect(health.tombstoneRatio).toBeCloseTo(1 - health.live / health.points, 10);
  });

  it('measures search cost per query, not total', () => {
    const health = hnswHealth(built, queries, search);
    expect(health.distanceComputationsPerQuery).toBeGreaterThan(0);
    expect(health.distanceComputationsPerQuery).toBeLessThan(dataset.length * 4);
  });

  it('measures recall against live ground truth', () => {
    expect(hnswHealth(built, queries, search).recallAt10).toBeGreaterThanOrEqual(0.9);
  });

  it('shows cost climbing as tombstones accumulate', () => {
    // The claim the health readout exists to make visible.
    const clean = hnswHealth(built, queries, search);
    const dirty = hnswHealth(tombstone(0.4), queries, search);
    expect(dirty.tombstoneRatio).toBeGreaterThan(clean.tombstoneRatio);
    expect(dirty.distanceComputationsPerQuery).toBeGreaterThan(clean.distanceComputationsPerQuery);
  });

  it('shows compaction snapping cost back', () => {
    const dirty = tombstone(0.4);
    const before = hnswHealth(dirty, queries, search);
    const after = hnswHealth(compactHnsw(dirty, params).state, queries, search);
    expect(after.tombstoneRatio).toBe(0);
    expect(after.distanceComputationsPerQuery).toBeLessThan(before.distanceComputationsPerQuery);
    expect(after.recallAt10).toBeGreaterThanOrEqual(before.recallAt10 - 0.05);
  });

  it('reports connectivity and mean degree', () => {
    const health = hnswHealth(built, queries, search);
    expect(health.connected).toBe(true);
    expect(health.meanDegree).toBeGreaterThan(0);
  });

  it('reports a perfect empty index rather than dividing by zero', () => {
    const health = hnswHealth(createHnsw(params), queries, search);
    expect(health.tombstoneRatio).toBe(0);
    expect(health.distanceComputationsPerQuery).toBe(0);
    expect(health.recallAt10).toBe(1);
  });
});

describe('hnswHealthDelta', () => {
  it('reports cost as a fraction of the baseline', () => {
    const baseline = hnswHealth(built, queries, search);
    const current = hnswHealth(tombstone(0.4), queries, search);
    expect(hnswHealthDelta(current, baseline).distanceComputationsPerQuery).toBeGreaterThan(0);
  });

  it('reports a recall drop as a negative number', () => {
    const baseline = { ...hnswHealth(built, queries, search), recallAt10: 1 };
    const current = { ...baseline, recallAt10: 0.8 };
    expect(hnswHealthDelta(current, baseline).recallAt10).toBeCloseTo(-0.2, 10);
  });

  it('reports no change against itself', () => {
    const health = hnswHealth(built, queries, search);
    expect(hnswHealthDelta(health, health)).toEqual({
      tombstoneRatio: 0,
      distanceComputationsPerQuery: 0,
      recallAt10: 0,
    });
  });

  it('treats a zero baseline cost as no change rather than infinity', () => {
    const empty = hnswHealth(createHnsw(params), queries, search);
    expect(hnswHealthDelta(hnswHealth(built, queries, search), empty).distanceComputationsPerQuery).toBe(0);
  });
});

describe('hnswHealthStatus', () => {
  it('calls a fresh index clean', () => {
    expect(hnswHealthStatus(hnswHealth(built, queries, search))).toBe('clean');
  });

  it('calls a lightly tombstoned index degrading', () => {
    expect(hnswHealthStatus(hnswHealth(tombstone(0.2), queries, search))).toBe('degrading');
  });

  it('calls a heavily tombstoned index overdue for compaction', () => {
    expect(hnswHealthStatus(hnswHealth(tombstone(0.45), queries, search))).toBe('compact-now');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/lab/vector/hnsw-health.test.ts`
Expected: FAIL with `Error: Failed to resolve import "./hnsw-health"`

- [ ] **Step 3: Write minimal implementation**

```ts
// lib/lab/vector/hnsw-health.ts
import { createFlat, flatSearch } from './flat';
import { hnswSearch, isConnected, meanDegree, tombstoneRatio } from './hnsw';
import type { HnswSearchParams, HnswState } from './hnsw';
import { recallAtK } from './recall';
import type { Vec } from './types';

/** The three numbers the lab is built around, measured over one fixed query set so they
 * are comparable across every operation the reader performs. */
export interface HnswHealth {
  readonly points: number;
  readonly live: number;
  readonly tombstoneRatio: number;
  readonly distanceComputationsPerQuery: number;
  readonly recallAt10: number;
  readonly meanDegree: number;
  readonly connected: boolean;
}

export interface HnswHealthDelta {
  readonly tombstoneRatio: number;
  /** Fractional change against the baseline: 0.62 means "62% more work per query". */
  readonly distanceComputationsPerQuery: number;
  readonly recallAt10: number;
}

export type HnswHealthStatus = 'clean' | 'degrading' | 'compact-now';

const HNSW_HEALTH_K = 10;

/** Round numbers, stated rather than tuned: a tenth of the index dead is where the cost
 * starts showing, and a third is where every production runbook says rebuild. */
const HNSW_DEGRADING_AT = 0.1;
const HNSW_COMPACT_AT = 0.3;

export function hnswHealth(
  state: HnswState,
  queries: readonly Vec[],
  params: HnswSearchParams,
): HnswHealth {
  const live = [...state.points.values()].filter((point) => !state.deleted.has(point.id));
  const truth = createFlat(live);

  let cost = 0;
  let recall = 0;
  for (const query of queries) {
    const got = hnswSearch(state, query, { ...params, k: HNSW_HEALTH_K });
    cost += got.counters.distanceComputations ?? 0;
    const exact = flatSearch(truth, query, { k: HNSW_HEALTH_K, metric: params.metric });
    recall += recallAtK(got.result, exact.result, HNSW_HEALTH_K);
  }

  const measured = Math.max(queries.length, 1);
  return {
    points: state.points.size,
    live: live.length,
    tombstoneRatio: tombstoneRatio(state),
    distanceComputationsPerQuery: cost / measured,
    // An index with nothing in it has nothing to miss.
    recallAt10: live.length === 0 || queries.length === 0 ? 1 : recall / measured,
    meanDegree: meanDegree(state, 0),
    connected: isConnected(state),
  };
}

export function hnswHealthDelta(current: HnswHealth, baseline: HnswHealth): HnswHealthDelta {
  return {
    tombstoneRatio: current.tombstoneRatio - baseline.tombstoneRatio,
    distanceComputationsPerQuery:
      baseline.distanceComputationsPerQuery === 0
        ? 0
        : current.distanceComputationsPerQuery / baseline.distanceComputationsPerQuery - 1,
    recallAt10: current.recallAt10 - baseline.recallAt10,
  };
}

export function hnswHealthStatus(health: HnswHealth): HnswHealthStatus {
  if (health.tombstoneRatio >= HNSW_COMPACT_AT) return 'compact-now';
  if (health.tombstoneRatio >= HNSW_DEGRADING_AT) return 'degrading';
  return 'clean';
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run lib/lab/vector/hnsw-health.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/lab/vector/hnsw-health.ts lib/lab/vector/hnsw-health.test.ts
git commit -m "feat: hnsw health trio of tombstone ratio, query cost and recall"
```

---

### Task 55: `HnswHealthPanel` — the degradation-and-recovery flow, made unmissable

The three meters sit in one full-width strip directly above the canvas, each drawn against its pre-deletion baseline so the reader sees the gap, not just the number. As the ratio climbs the strip's border goes accent and the compact button becomes the loudest thing on the page; one click and all three bars snap back. That snap is the lab's argument.

**Files:**
- Create: `components/lab/vector/hnsw-health-panel.tsx`
- Test: `components/lab/vector/hnsw-health-panel.test.tsx`

**Interfaces:**
- Consumes: `HnswHealth`, `HnswHealthDelta`, `HnswHealthStatus`, `hnswHealthDelta`, `hnswHealthStatus`
- Produces: `<HnswHealthPanel health baseline onCompact />`

- [ ] **Step 1: Write the failing test**

```tsx
// components/lab/vector/hnsw-health-panel.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HnswHealthPanel } from './hnsw-health-panel';
import type { HnswHealth } from '@/lib/lab/vector/hnsw-health';

const clean: HnswHealth = {
  points: 130,
  live: 130,
  tombstoneRatio: 0,
  distanceComputationsPerQuery: 62,
  recallAt10: 0.98,
  meanDegree: 9.4,
  connected: true,
};

const dirty: HnswHealth = {
  ...clean,
  live: 78,
  tombstoneRatio: 0.4,
  distanceComputationsPerQuery: 108,
  recallAt10: 0.86,
};

describe('HnswHealthPanel', () => {
  it('shows all three numbers the lab teaches', () => {
    render(<HnswHealthPanel health={dirty} baseline={clean} onCompact={() => {}} />);
    expect(screen.getByRole('group', { name: /tombstone ratio/i })).toHaveTextContent('40%');
    expect(screen.getByRole('group', { name: /distance computations/i })).toHaveTextContent('108');
    expect(screen.getByRole('group', { name: /recall@10/i })).toHaveTextContent('0.86');
  });

  it('shows each number against where it started', () => {
    render(<HnswHealthPanel health={dirty} baseline={clean} onCompact={() => {}} />);
    expect(screen.getByRole('group', { name: /distance computations/i })).toHaveTextContent('+74%');
    expect(screen.getByRole('group', { name: /recall@10/i })).toHaveTextContent('-0.12');
  });

  it('says the index is clean when nothing has been deleted', () => {
    render(<HnswHealthPanel health={clean} baseline={clean} onCompact={() => {}} />);
    expect(screen.getByRole('status')).toHaveTextContent(/clean/i);
  });

  it('escalates as the tombstone ratio climbs', () => {
    const { rerender } = render(<HnswHealthPanel health={clean} baseline={clean} onCompact={() => {}} />);
    rerender(<HnswHealthPanel health={dirty} baseline={clean} onCompact={() => {}} />);
    expect(screen.getByRole('status')).toHaveTextContent(/compaction overdue/i);
  });

  it('announces the escalation politely rather than stealing focus', () => {
    render(<HnswHealthPanel health={dirty} baseline={clean} onCompact={() => {}} />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
  });

  it('offers compaction as a real button', async () => {
    const onCompact = vi.fn();
    render(<HnswHealthPanel health={dirty} baseline={clean} onCompact={onCompact} />);
    await userEvent.click(screen.getByRole('button', { name: /compact/i }));
    expect(onCompact).toHaveBeenCalledOnce();
  });

  it('disables compaction when there is nothing to compact', () => {
    render(<HnswHealthPanel health={clean} baseline={clean} onCompact={() => {}} />);
    expect(screen.getByRole('button', { name: /compact/i })).toBeDisabled();
  });

  it('exposes each meter as a progress bar with its real value', () => {
    render(<HnswHealthPanel health={dirty} baseline={clean} onCompact={() => {}} />);
    const bar = screen.getByRole('meter', { name: /tombstone ratio/i });
    expect(bar).toHaveAttribute('aria-valuenow', '40');
    expect(bar).toHaveAttribute('aria-valuemin', '0');
    expect(bar).toHaveAttribute('aria-valuemax', '100');
  });

  it('warns when the graph has come apart', () => {
    render(<HnswHealthPanel health={{ ...dirty, connected: false }} baseline={clean} onCompact={() => {}} />);
    expect(screen.getByText(/graph is disconnected/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run components/lab/vector/hnsw-health-panel.test.tsx`
Expected: FAIL with `Error: Failed to resolve import "./hnsw-health-panel"`

- [ ] **Step 3: Write minimal implementation**

```tsx
// components/lab/vector/hnsw-health-panel.tsx
'use client';

import { motion, useReducedMotion } from 'motion/react';
import type { HnswHealth } from '@/lib/lab/vector/hnsw-health';
import { hnswHealthDelta, hnswHealthStatus } from '@/lib/lab/vector/hnsw-health';

const FOCUS_RING =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 rounded-sm';

const STATUS_COPY = {
  clean: 'Index is clean',
  degrading: 'Tombstones are accumulating',
  'compact-now': 'Compaction overdue',
} as const;

interface MeterProps {
  readonly label: string;
  readonly value: string;
  readonly delta: string | null;
  readonly fraction: number;
  readonly alarming: boolean;
}

function Meter({ label, value, delta, fraction, alarming }: MeterProps) {
  const shouldReduceMotion = useReducedMotion();
  const percent = Math.round(Math.min(Math.max(fraction, 0), 1) * 100);
  return (
    <div role="group" aria-label={label} className="flex-1">
      <p className="text-xs uppercase tracking-widest font-medium text-foreground-dim">{label}</p>
      <p className="mt-1 flex items-baseline gap-2">
        <span className="text-lg font-semibold text-foreground">{value}</span>
        {delta && <span className={alarming ? 'text-xs text-accent' : 'text-xs text-foreground-dim'}>{delta}</span>}
      </p>
      <div
        role="meter"
        aria-label={label}
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        className="mt-1 h-1.5 w-full rounded-sm bg-border"
      >
        <motion.div
          className={alarming ? 'h-full rounded-sm bg-accent' : 'h-full rounded-sm bg-foreground-dim'}
          initial={false}
          animate={{ width: `${percent}%` }}
          transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.35 }}
        />
      </div>
    </div>
  );
}

interface HnswHealthPanelProps {
  readonly health: HnswHealth;
  /** The reading from before the reader started deleting. The gap is the lesson. */
  readonly baseline: HnswHealth;
  readonly onCompact: () => void;
}

export function HnswHealthPanel({ health, baseline, onCompact }: HnswHealthPanelProps) {
  const delta = hnswHealthDelta(health, baseline);
  const status = hnswHealthStatus(health);
  const alarming = status !== 'clean';

  return (
    <section
      aria-label="Index health"
      className={`rounded border bg-background-raised p-4 ${alarming ? 'border-accent' : 'border-border'}`}
    >
      <div className="mb-3 flex items-center justify-between gap-4">
        <p role="status" aria-live="polite" className="text-xs uppercase tracking-widest font-semibold text-foreground">
          {STATUS_COPY[status]}
        </p>
        <button
          type="button"
          onClick={onCompact}
          disabled={health.tombstoneRatio === 0}
          className={`border px-3 py-1.5 text-xs uppercase tracking-widest font-medium transition-colors disabled:opacity-40 ${
            alarming
              ? 'border-accent bg-accent text-background'
              : 'border-border text-foreground-dim hover:text-accent'
          } ${FOCUS_RING}`}
        >
          Compact index
        </button>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row">
        <Meter
          label="Tombstone ratio"
          value={`${Math.round(health.tombstoneRatio * 100)}%`}
          delta={`${health.live} of ${health.points} live`}
          fraction={health.tombstoneRatio}
          alarming={alarming}
        />
        <Meter
          label="Distance computations per query"
          value={health.distanceComputationsPerQuery.toFixed(0)}
          delta={
            delta.distanceComputationsPerQuery === 0
              ? null
              : `${delta.distanceComputationsPerQuery > 0 ? '+' : ''}${Math.round(delta.distanceComputationsPerQuery * 100)}%`
          }
          fraction={
            baseline.distanceComputationsPerQuery === 0
              ? 0
              : health.distanceComputationsPerQuery / (baseline.distanceComputationsPerQuery * 2)
          }
          alarming={delta.distanceComputationsPerQuery > 0}
        />
        <Meter
          label="Recall@10"
          value={health.recallAt10.toFixed(2)}
          delta={delta.recallAt10 === 0 ? null : delta.recallAt10.toFixed(2)}
          fraction={health.recallAt10}
          alarming={delta.recallAt10 < 0}
        />
      </div>

      {!health.connected && (
        <p className="mt-3 text-xs text-accent">
          Graph is disconnected: some nodes can no longer be reached from the entry point.
        </p>
      )}
    </section>
  );
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run components/lab/vector/hnsw-health-panel.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add components/lab/vector/hnsw-health-panel.tsx components/lab/vector/hnsw-health-panel.test.tsx
git commit -m "feat: hnsw health panel showing degradation against a pre-deletion baseline"
```

---

### Task 56: The `ef` control

**Files:**
- Create: `components/lab/vector/ef-control.tsx`
- Test: `components/lab/vector/ef-control.test.tsx`

**Interfaces:**
- Produces: `<EfControl ef min max onChange />`

- [ ] **Step 1: Write the failing test**

```tsx
// components/lab/vector/ef-control.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EfControl } from './ef-control';

describe('EfControl', () => {
  it('is a labelled native range, so keyboard and touch come free', () => {
    render(<EfControl ef={24} onChange={() => {}} />);
    const slider = screen.getByRole('slider', { name: /search width/i });
    expect(slider).toHaveAttribute('type', 'range');
    expect(slider).toHaveValue('24');
  });

  it('describes the current value in words for a screen reader', () => {
    render(<EfControl ef={24} onChange={() => {}} />);
    expect(screen.getByRole('slider', { name: /search width/i })).toHaveAttribute(
      'aria-valuetext',
      'ef 24: the search keeps its best 24 live candidates',
    );
  });

  it('reports changes as numbers, not strings', async () => {
    const onChange = vi.fn();
    render(<EfControl ef={24} onChange={onChange} />);
    await userEvent.type(screen.getByRole('slider', { name: /search width/i }), '{arrowright}');
    expect(onChange).toHaveBeenCalledWith(25);
  });

  it('honours the supplied bounds', () => {
    render(<EfControl ef={24} min={8} max={64} onChange={() => {}} />);
    const slider = screen.getByRole('slider', { name: /search width/i });
    expect(slider).toHaveAttribute('min', '8');
    expect(slider).toHaveAttribute('max', '64');
  });

  it('shows the value as text beside the slider', () => {
    render(<EfControl ef={24} onChange={() => {}} />);
    expect(screen.getByText('24')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run components/lab/vector/ef-control.test.tsx`
Expected: FAIL with `Error: Failed to resolve import "./ef-control"`

- [ ] **Step 3: Write minimal implementation**

```tsx
// components/lab/vector/ef-control.tsx
'use client';

import { useId } from 'react';

const FOCUS_RING =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 rounded-sm';

interface EfControlProps {
  readonly ef: number;
  readonly min?: number;
  readonly max?: number;
  readonly onChange: (ef: number) => void;
}

export function EfControl({ ef, min = 4, max = 64, onChange }: EfControlProps) {
  const id = useId();
  return (
    <div className="flex items-center gap-3">
      <label htmlFor={id} className="text-xs uppercase tracking-widest font-medium text-foreground-dim">
        Search width
      </label>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={1}
        value={ef}
        // Spoken rather than read off the number: ef is the one control whose meaning is
        // not obvious from its value.
        aria-valuetext={`ef ${ef}: the search keeps its best ${ef} live candidates`}
        onChange={(event) => onChange(Number(event.target.value))}
        className={`flex-1 accent-accent ${FOCUS_RING}`}
      />
      <span className="w-8 text-right text-xs font-medium text-foreground">{ef}</span>
    </div>
  );
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run components/lab/vector/ef-control.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add components/lab/vector/ef-control.tsx components/lab/vector/ef-control.test.tsx
git commit -m "feat: ef control for the hnsw search window"
```

---

### Task 57: Compose HNSW into `VectorLab`, the page prose and the README

Fourth option in the same `<select>`, fourth branch in the same `replayLog`, same log, same undo stack, same canvas, same mode radios. **No `HnswPanel` and no reducer** — `useVectorLab` holds an operation log and derives everything from it, exactly as Tasks 26 and 36 established for IVF and IVF-PQ.

Two things differ from the other indexes and are stated here rather than assumed:

1. **Compaction is logged as `{ kind: 'rebuild' }`**, the same op IVF uses to retrain. One log, one undo stack, and `undo` steps back over a compaction like anything else.
2. **The health baseline is the reading from just before the reader's first delete**, obtained by replaying the log up to that point. Anchoring it to the seeded index instead would be wrong: a reader who inserts fifty points and then deletes would see query cost rise for a reason that is not deletion, and the panel would blame tombstones for it. Isolating deletion as the only variable is what makes the three meters honest.

The main canvas draws **live points only**; tombstoned points disappear from it and reappear as dashed squares in the layer view directly below. That gap between "gone from the answers" and "still in the graph" is the lesson, and it needs no widening of the locked `PointTone` union.

**Files:**
- Modify: `components/lab/vector/use-vector-lab.ts`
- Modify: `components/lab/vector/vector-lab.tsx`
- Modify: `app/lab/vector-index/params.ts`
- Modify: `app/lab/vector-index/params.test.ts`
- Modify: `app/lab/vector-index/page.tsx`
- Modify: `README.md`
- Test: `components/lab/vector/use-vector-lab.test.tsx` (appended block)
- Test: `components/lab/vector/vector-lab.test.tsx` (appended block)

**Also required in this task — widen the deep link**, as Tasks 28 and 36 did for IVF and
IVF-PQ. The parser falls back to flat for any index name it does not know, so adding HNSW
to the `<select>` without adding it here would leave `?index=hnsw` quietly opening the
flat index — breaking the link from the HNSW posts, which are the ones most likely to
carry it:

```ts
export const LAB_INDEXES = ['flat', 'ivf', 'ivf-pq', 'hnsw'] as const;
```

Extend `params.test.ts` with `parseLabParams({ index: 'hnsw' }).index === 'hnsw'`, and
keep an assertion that some still-unshipped name falls back rather than throwing — the
guard exists because these URLs are hand-written in Medium posts and will eventually be
hand-mistyped. With HNSW landed, `?index=hnsw&ef=8` is the deep link the spec's
integration goal describes, so also confirm `ef` is read from the query string alongside
`k` and passed through to `VectorLab`.

**Interfaces:**
- Consumes: `createHnsw`, `hnswInsert`, `hnswDelete`, `hnswSearch`, `compactHnsw`, `HnswParams`, `HnswState`, `HnswStep` from `lib/lab/vector/hnsw.ts` (PR 4); `hnswHealth`, `HnswHealth` from `lib/lab/vector/hnsw-health.ts` (Task 54); `hnswStepLabel` from `lib/lab/vector/hnsw-view.ts` (Task 52); `HnswLayerView` (Task 53); `HnswHealthPanel` (Task 55); `EfControl` (Task 56).
- Produces: `LabStep` widens to include `HnswStep`; `LabSnapshot` gains `hnswState: HnswState | null`; `VectorLab` gains `health: HnswHealth | null` and `healthBaseline: HnswHealth | null`; `DEFAULT_HNSW: HnswParams`, `DEFAULT_EF`, `HEALTH_QUERIES`; `INDEX_OPTIONS` gains `hnsw`.

- [ ] **Step 1: Write the failing tests**

Append to `components/lab/vector/use-vector-lab.test.tsx`:

```tsx
describe('replayLog on hnsw', () => {
  it('builds a graph and reports its state, which flat and ivf do not have', () => {
    expect(replayLog(seed, [], params()).hnswState).toBeNull();
    expect(replayLog(seed, [], params({ index: 'ivf' })).hnswState).toBeNull();
    const hnsw = replayLog(seed, [], params({ index: 'hnsw' }));
    expect(hnsw.hnswState?.points.size).toBe(seed.length);
    expect(hnsw.hnswState?.deleted.size).toBe(0);
  });

  it('drops a deleted point from the drawn points but keeps it in the graph', () => {
    // The whole HNSW lesson in one assertion: gone from the answers, still in
    // the structure, still costing something to traverse.
    const log: readonly LabOp[] = [{ kind: 'delete', id: seed[0].id }];
    const hnsw = replayLog(seed, log, params({ index: 'hnsw' }));
    expect(hnsw.points.map((p) => p.id)).not.toContain(seed[0].id);
    expect(hnsw.hnswState?.points.has(seed[0].id)).toBe(true);
    expect(hnsw.hnswState?.deleted.has(seed[0].id)).toBe(true);
  });

  it('never returns a tombstoned point from a search', () => {
    const target = seed[0];
    const log: readonly LabOp[] = [
      { kind: 'delete', id: target.id },
      { kind: 'search', query: target.vec },
    ];
    const hnsw = replayLog(seed, log, params({ index: 'hnsw' }));
    expect(hnsw.results.map((r) => r.id)).not.toContain(target.id);
  });

  it('clears every tombstone when a rebuild is logged', () => {
    const log: readonly LabOp[] = [{ kind: 'delete', id: seed[0].id }, { kind: 'rebuild' }];
    expect(replayLog(seed, log, params({ index: 'hnsw' })).hnswState?.deleted.size).toBe(0);
  });

  it('scores recall against brute force over the live points', () => {
    const log: readonly LabOp[] = [{ kind: 'search', query: [0.5, 0.5] }];
    const hnsw = replayLog(seed, log, params({ index: 'hnsw' }));
    expect(hnsw.recall).toBeGreaterThan(0.8);
  });

  it('reports no cell vocabulary, because a graph has no cells', () => {
    const hnsw = replayLog(seed, [], params({ index: 'hnsw' }));
    expect(hnsw.centroids).toBeNull();
    expect(hnsw.cellBalance).toBeNull();
    expect(hnsw.reconstructionError).toBeNull();
  });
});

describe('describeStep for the hnsw vocabulary', () => {
  it('words a level assignment', () => {
    expect(describeStep({ kind: 'assignLevel', id: 5, level: 2 })).toBe('point 5 lands on level 2');
  });

  it('says a tombstone is traversed but never returned', () => {
    expect(describeStep({ kind: 'skipTombstoned', id: 9, layer: 0 })).toContain('traversed, never returned');
  });

  it('words a prune', () => {
    expect(describeStep({ kind: 'prune', from: 1, to: 2, layer: 0 })).toContain('pruning');
  });
});

describe('useVectorLab health readings', () => {
  it('reports no health on an index that is not a graph', () => {
    const { result } = renderHook(() => useVectorLab({ index: 'ivf' }));
    expect(result.current.health).toBeNull();
    expect(result.current.healthBaseline).toBeNull();
  });

  it('starts with the baseline equal to the current reading', () => {
    const { result } = renderHook(() => useVectorLab({ index: 'hnsw' }));
    expect(result.current.health?.tombstoneRatio).toBe(0);
    expect(result.current.healthBaseline?.tombstoneRatio).toBe(0);
  });

  it('holds the baseline still while the reader deletes', () => {
    const { result } = renderHook(() => useVectorLab({ index: 'hnsw' }));
    const before = result.current.health?.live;
    act(() => result.current.remove(seed[0].id));
    act(() => result.current.remove(seed[1].id));
    expect(result.current.health?.live).toBe((before as number) - 2);
    expect(result.current.healthBaseline?.live).toBe(before);
  });

  it('anchors the baseline before the first delete, not at the seeded index', () => {
    // A reader who inserts and then deletes must not see the extra points
    // counted as damage done by deletion.
    const { result } = renderHook(() => useVectorLab({ index: 'hnsw' }));
    act(() => result.current.insert([0.5, 0.5]));
    const afterInsert = result.current.health?.points;
    act(() => result.current.remove(seed[0].id));
    expect(result.current.healthBaseline?.points).toBe(afterInsert);
  });
});
```

Append to `components/lab/vector/vector-lab.test.tsx`:

```tsx
describe('VectorLab with HNSW selected', () => {
  async function selectHnsw(user: ReturnType<typeof userEvent.setup>): Promise<void> {
    await user.selectOptions(screen.getByLabelText('Index'), 'hnsw');
  }

  it('offers HNSW in the same index select as the others', async () => {
    const user = userEvent.setup();
    render(<VectorLab />);
    await selectHnsw(user);
    expect(screen.getByLabelText('Index')).toHaveValue('hnsw');
  });

  it('shows the ef control only once HNSW is selected', async () => {
    const user = userEvent.setup();
    render(<VectorLab />);
    expect(screen.queryByRole('slider', { name: /search width/i })).not.toBeInTheDocument();
    await selectHnsw(user);
    expect(screen.getByRole('slider', { name: /search width/i })).toBeInTheDocument();
  });

  it('shows the layer view and the health panel', async () => {
    const user = userEvent.setup();
    render(<VectorLab />);
    await selectHnsw(user);
    expect(screen.getByRole('img', { name: /layer 0/i })).toBeInTheDocument();
    expect(screen.getByRole('meter', { name: /tombstone ratio/i })).toBeInTheDocument();
    expect(screen.getByRole('meter', { name: /distance computations/i })).toBeInTheDocument();
    expect(screen.getByRole('meter', { name: /recall@10/i })).toBeInTheDocument();
  });

  it('keeps the query interactive, the same as every other index', async () => {
    const user = userEvent.setup();
    render(<VectorLab />);
    await selectHnsw(user);
    await user.click(screen.getByRole('radio', { name: /move the query/i }));
    fireEvent.click(canvas(), { clientX: 240, clientY: 180 });
    expect(screen.getByText(/recall@/)).toBeInTheDocument();
  });

  it('climbs the tombstone ratio when the reader taps a point away', async () => {
    const user = userEvent.setup();
    const { container } = render(<VectorLab />);
    await selectHnsw(user);
    expect(screen.getByRole('meter', { name: /tombstone ratio/i })).toHaveAttribute('aria-valuenow', '0');

    const marker = container.querySelector('[data-testid="lab-point"]')!;
    fireEvent.click(canvas(), {
      clientX: Number(marker.getAttribute('cx')),
      clientY: Number(marker.getAttribute('cy')),
    });

    expect(
      Number(screen.getByRole('meter', { name: /tombstone ratio/i }).getAttribute('aria-valuenow')),
    ).toBeGreaterThan(0);
  });

  it('snaps the tombstone ratio back on compaction', async () => {
    const user = userEvent.setup();
    const { container } = render(<VectorLab />);
    await selectHnsw(user);

    const marker = container.querySelector('[data-testid="lab-point"]')!;
    fireEvent.click(canvas(), {
      clientX: Number(marker.getAttribute('cx')),
      clientY: Number(marker.getAttribute('cy')),
    });
    await user.click(screen.getByRole('button', { name: /compact index/i }));

    expect(screen.getByRole('meter', { name: /tombstone ratio/i })).toHaveAttribute('aria-valuenow', '0');
  });

  it('lets undo step back over a compaction', async () => {
    const user = userEvent.setup();
    const { container } = render(<VectorLab />);
    await selectHnsw(user);

    const marker = container.querySelector('[data-testid="lab-point"]')!;
    fireEvent.click(canvas(), {
      clientX: Number(marker.getAttribute('cx')),
      clientY: Number(marker.getAttribute('cy')),
    });
    await user.click(screen.getByRole('button', { name: /compact index/i }));
    await user.click(screen.getByRole('button', { name: /undo/i }));

    expect(
      Number(screen.getByRole('meter', { name: /tombstone ratio/i }).getAttribute('aria-valuenow')),
    ).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run components/lab/vector/use-vector-lab.test.tsx components/lab/vector/vector-lab.test.tsx`

Expected: FAIL — `hnswState` is not a property of the snapshot, and the index `<select>` has no `hnsw` option.

- [ ] **Step 3: Write the hook changes**

In `components/lab/vector/use-vector-lab.ts`, add the imports:

```ts
import {
  compactHnsw,
  createHnsw,
  hnswDelete,
  hnswInsert,
  hnswSearch,
  type HnswParams,
  type HnswState,
  type HnswStep,
} from '@/lib/lab/vector/hnsw';
import { hnswHealth, type HnswHealth } from '@/lib/lab/vector/hnsw-health';
import { hnswStepLabel } from '@/lib/lab/vector/hnsw-view';
import { mulberry32 } from '@/lib/lab/vector/random';
```

Widen `LabStep`, add the snapshot field and the params:

```ts
export type LabStep = FlatStep | IvfStep | IvfPqStep | HnswStep;

export const DEFAULT_EF = 24;

export const DEFAULT_HNSW: HnswParams = {
  m: 8,
  efConstruction: 32,
  // 1 / ln m: the standard choice, and the one that makes each layer roughly an
  // eighth the size of the one below it.
  levelMultiplier: 1 / Math.log(8),
  seed: 11,
};

/**
 * A fixed probe set for the health readings.
 *
 * The three meters are only meaningful as a comparison across operations, which
 * they are not if the queries move underneath them. These never change, so a
 * rise in cost is always a fact about the index and never about the question.
 */
export const HEALTH_QUERIES: readonly Vec[] = (() => {
  const random = mulberry32(909);
  return Array.from({ length: 12 }, () => [random(), random()] as Vec);
})();
```

Add `ef` and `hnsw` to `LabParams`, and the new snapshot field:

```ts
export interface LabParams {
  readonly k: number;
  readonly metric: Metric;
  readonly index: IndexKind;
  readonly nprobe: number;
  readonly ef: number;
  readonly ivf: IvfParams;
  readonly ivfPq: IvfPqParams;
  readonly hnsw: HnswParams;
}
```

Add to `LabSnapshot` and to `VectorLab`:

```ts
  /** The graph itself, for the layer view. Null on every index that is not a graph. */
  readonly hnswState: HnswState | null;
```

and to `VectorLab` only:

```ts
  readonly health: HnswHealth | null;
  readonly healthBaseline: HnswHealth | null;
```

Return `hnswState: null` from `replayFlat`, `replayIvf` and `replayIvfPq`.

Add the HNSW cases to `describeStep`, delegating to the labels Task 52 already wrote. `admit` is deliberately absent: flat, IVF and HNSW all emit the identical `{ kind: 'admit', id, distance, rank }` shape, so the existing shared case already words it.

```ts
    case 'assignLevel':
    case 'descendLayer':
    case 'visit':
    case 'skipTombstoned':
    case 'link':
    case 'prune':
    case 'tombstone':
    case 'compact':
      return hnswStepLabel(step);
```

Add the fold:

```ts
/**
 * Live points only, sorted by id.
 *
 * A tombstoned point leaves the scatter plot the moment it is deleted but stays
 * in the graph, where the layer view keeps drawing it as a dashed square. The
 * distance between those two pictures is the entire HNSW deletion lesson, and it
 * needs no new tone on the locked PointCanvas.
 */
function hnswPoints(state: HnswState): readonly Point[] {
  return [...state.points.values()]
    .filter((point) => !state.deleted.has(point.id))
    .sort((a, b) => a.id - b.id);
}

function replayHnsw(seed: readonly Point[], log: readonly LabOp[], params: LabParams): LabSnapshot {
  let state: HnswState = createHnsw(params.hnsw);
  let steps: readonly LabStep[] = [];
  let counters: Counters = {};

  // Building the graph IS inserting every point, so there is no separate training
  // phase to trace. Keeping the last insertion's steps matches how every other
  // fold behaves and leaves the scrubber showing one point being linked in.
  for (const point of seed) {
    const done = hnswInsert(state, point.vec, params.hnsw);
    state = done.state;
    steps = done.steps;
    counters = addCounters(counters, done.counters);
  }

  for (const op of log) {
    if (op.kind === 'insert') {
      const done = hnswInsert(state, op.vec, params.hnsw);
      state = done.state;
      steps = done.steps;
      counters = addCounters(counters, done.counters);
    } else if (op.kind === 'delete') {
      const done = hnswDelete(state, op.id);
      state = done.state;
      steps = done.steps;
      counters = addCounters(counters, done.counters);
    } else if (op.kind === 'rebuild') {
      const done = compactHnsw(state, params.hnsw);
      state = done.state;
      steps = done.steps;
      counters = addCounters(counters, done.counters);
    }
  }

  const points = hnswPoints(state);
  const query = lastQuery(log);
  let results: readonly Ranked[] = [];
  let recall: number | null = null;

  if (query !== null) {
    const found = hnswSearch(state, query, { k: params.k, metric: params.metric, ef: params.ef });
    results = found.result;
    counters = addCounters(counters, found.counters);
    if (endedOnSearch(log)) steps = found.steps;
    const truth = flatSearch(createFlat(points), query, { k: params.k, metric: params.metric });
    recall = recallAtK(results, truth.result, params.k);
  }

  return {
    points,
    results,
    steps,
    counters,
    query,
    recall,
    centroids: null,
    cellBalance: null,
    insertsSinceTrain: null,
    reconstructionError: null,
    rankRows: null,
    quantisation: null,
    hnswState: state,
  };
}
```

Add the branch to `replayLog`:

```ts
    case 'hnsw':
      return replayHnsw(seed, log, params);
```

In the hook, thread `ef`, and derive the two readings:

```ts
  const { /* … existing … */ ef = DEFAULT_EF } = options;

  const params = useMemo<LabParams>(
    () => ({ k, metric, index, nprobe, ef, ivf: DEFAULT_IVF, ivfPq: DEFAULT_IVF_PQ, hnsw: DEFAULT_HNSW }),
    [k, metric, index, nprobe, ef],
  );
```

```ts
/**
 * The log as it stood immediately before the first deletion.
 *
 * The health panel is a comparison, and it is only honest if deletion is the
 * only thing that changed between the two readings. Anchoring the baseline to
 * the seeded index instead would let a reader who inserts fifty points and then
 * deletes one see the cost of those inserts reported as damage done by
 * tombstones.
 */
function logBeforeFirstDelete(log: readonly LabOp[]): readonly LabOp[] {
  const at = log.findIndex((op) => op.kind === 'delete');
  return at === -1 ? log : log.slice(0, at);
}
```

```ts
  const baselineLog = useMemo(() => logBeforeFirstDelete(log), [log]);

  // Before the first delete the baseline IS the current state, so the fold is
  // reused rather than run a second time — it rebuilds the whole graph.
  const baselineSnapshot = useMemo(
    () => (baselineLog === log ? snapshot : replayLog(seed, baselineLog, params)),
    [baselineLog, log, snapshot, seed, params],
  );

  const health = useMemo(
    () =>
      snapshot.hnswState === null
        ? null
        : hnswHealth(snapshot.hnswState, HEALTH_QUERIES, { k, metric, ef }),
    [snapshot.hnswState, k, metric, ef],
  );

  const healthBaseline = useMemo(
    () =>
      baselineSnapshot.hnswState === null
        ? null
        : hnswHealth(baselineSnapshot.hnswState, HEALTH_QUERIES, { k, metric, ef }),
    [baselineSnapshot.hnswState, k, metric, ef],
  );
```

and add `hnswState: snapshot.hnswState`, `health` and `healthBaseline` to the returned object.

- [ ] **Step 4: Write the island changes**

In `components/lab/vector/vector-lab.tsx`, add the imports:

```tsx
import { EfControl } from './ef-control';
import { HnswHealthPanel } from './hnsw-health-panel';
import { HnswLayerView } from './hnsw-layer-view';
import { DEFAULT_EF } from './use-vector-lab';
import type { HnswStep } from '@/lib/lab/vector/hnsw';
```

Add the option:

```tsx
export const INDEX_OPTIONS: readonly { value: IndexKind; label: string }[] = [
  { value: 'flat', label: 'Flat' },
  { value: 'ivf', label: 'IVF' },
  { value: 'ivf-pq', label: 'IVF-PQ' },
  { value: 'hnsw', label: 'HNSW' },
];
```

Add the state and pass it through:

```tsx
const [ef, setEf] = useState(DEFAULT_EF);
const lab = useVectorLab({ k: initialK, index, nprobe, ef });
```

```tsx
// `hnswState` is non-null exactly when the fold ran the HNSW branch, and that
// branch is the only thing that writes `steps`, so the narrowing is sound.
const hnswSteps = lab.hnswState === null ? [] : (lab.steps as readonly HnswStep[]);
```

Render the health panel above the canvas, so the degradation strip is the first thing the reader sees:

```tsx
{lab.health !== null && lab.healthBaseline !== null && (
  <HnswHealthPanel health={lab.health} baseline={lab.healthBaseline} onCompact={lab.rebuild} />
)}
```

Add the `ef` slider to the existing control row, beside the index select:

```tsx
{index === 'hnsw' && <EfControl ef={ef} onChange={setEf} />}
```

And render the layer view below the scrubber, so the scrubber drives both it and the canvas:

```tsx
{lab.hnswState !== null && (
  <HnswLayerView
    state={lab.hnswState}
    steps={hnswSteps}
    stepIndex={lab.stepIndex}
    viewport={VIEWPORT}
  />
)}
```

- [ ] **Step 5: Write the server prose and the README line**

Append to the prose in `app/lab/vector-index/page.tsx`, above the island:

```tsx
<h2 className="mt-10 text-lg font-semibold text-foreground">HNSW: what deletion costs</h2>
<p className="mt-3 text-foreground-dim">
  A proximity graph has no cheap safe removal. The node you want gone may be the
  only route between two regions of the graph, and cutting it out strands
  everything behind it. So real systems do not cut it out: they mark it dead,
  keep routing through it, and filter it out of the answers.
</p>
<p className="mt-3 text-foreground-dim">
  That is free at the moment of deletion and expensive forever after. Delete
  points here and watch three numbers move together: the tombstone ratio climbs,
  the distance computations each query needs climb with it — the search has to
  reach further out before it has <em>ef</em> answerable candidates — and recall
  slips. Then press Compact and watch all three snap back. That gap is the entire
  argument for periodic rebuilds.
</p>
<p className="mt-3 text-foreground-dim">
  A deleted point vanishes from the scatter plot immediately, because it can no
  longer be returned. It does not vanish from the layer view below, where it stays
  as a dashed square with every one of its links intact. Those two pictures
  disagreeing is the whole of what a tombstone is.
</p>
<p className="mt-3 text-foreground-dim">
  2D shows the mechanism, not the geometry. The layer view is the real graph this
  page built, but the rate at which boundary misses happen is a property of high
  dimensions that a plane cannot show.
</p>
```

And in `README.md`, under the Labs section:

```md
- `/lab/vector-index` also runs an HNSW index: a layered proximity graph you can scrub through as it is searched, an `ef` slider, tombstone deletion drawn as dashed squares the search still traverses, and a compaction that clears them — with tombstone ratio, query cost and recall shown against their pre-deletion baseline.
```

- [ ] **Step 6: Run tests**

Run: `npx vitest run && npx tsc --noEmit && npm run lint`

Expected: PASS — the whole suite, `lib/lab/vector/` and `components/lab/vector/` included.

- [ ] **Step 7: Commit**

```bash
git add components/lab/vector app/lab/vector-index/page.tsx README.md
git commit -m "feat: compose hnsw into the vector lab with layer view and health panel"
```
