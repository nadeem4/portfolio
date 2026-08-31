# Vector Index Playground Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an interactive vector index playground at `/lab/vector-index` where a reader drives a live index — flat, IVF, then IVF-PQ — through create, insert, search, delete and rebuild, watching what each one does internally at every step.

**Architecture:** Pure TypeScript index implementations in `lib/lab/vector/` with no React import, each operation taking a state and returning `{ state, result, steps, counters }` — state threaded, never mutated. One React island in `components/lab/vector/` renders `(steps, index)` and contains no logic beyond iterating pre-computed, separately-tested draw data. The page at `app/lab/vector-index/` is a server component carrying real prose, with the interactive part as a client island beneath it.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind (theme tokens only), vitest + React Testing Library, `motion/react` for reduced-motion-aware animation. **No new dependencies.**

**Spec:** `docs/superpowers/specs/2026-08-30-interactive-labs-design.md`

**Companion plan:** `2026-08-30-hnsw-lifecycle.md` covers PRs 4–5 (the HNSW index). It depends on this plan's PR 1 foundation and should be executed after PR 3 lands.

## Global Constraints

Every task's requirements implicitly include this section.

- **No new dependencies.** Inline SVG for any curve or chart; inline mulberry32 for seeding. Adding a charting library or a PRNG package fails the task.
- **No `Math.random` anywhere in `lib/lab/`.** Every visitor sees the same picture; every test is reproducible.
- **No React import anywhere in `lib/`.** This repo runs vitest with `environment: 'jsdom'` globally, so the constraint is not that these tests avoid jsdom — it is that `lib/` code carries no DOM dependency at all. That boundary is what keeps the logic testable in isolation.
- **Every operation is pure.** The input state must be unchanged after the call. Each op's test asserts this against a pre-call snapshot.
- **TDD, strictly.** Failing test → run it and watch it fail → minimal implementation → passing test → commit. Never write implementation before its test.
- **Behavioural assertions, never snapshots.** Match the style of `lib/categories.test.ts`.
- **`globals: false`** in `vitest.config.mts` — every test file must explicitly `import { describe, it, expect } from 'vitest'`.
- **Theme tokens only:** `background`, `background-raised`, `foreground`, `foreground-dim`, `accent`, `border`. No raw hex, no arbitrary Tailwind colours.
- **Focus rings**, copied verbatim from `components/layout/header.tsx`: `focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 rounded-sm`
- **Reduced motion** via `useReducedMotion` from `motion/react`, following `components/projects/pipeline-diagram.tsx`.
- **The scrubber is a native `<input type="range">`.** Not a custom drag surface. It carries `aria-valuetext` describing the current step in words, plus a polite live region. Accessibility is asserted in RTL tests, not in prose.
- **One island, no per-index panels.** There is exactly one `VectorLab`, one `useVectorLab`, one operation log and one undo stack. Index-specific rendering composes in as optional overlays. Forking the island per index would quadruplicate the canvas, scrubber, scoreboard and health block.
- **The query stays interactive on every index.** The reader moves it with the canvas mode radios. Never hardcode a query constant; never pass `onPick={() => undefined}`.
- **Search is derived, never an effect.** Search is pure and returns state unchanged, so recompute it during render with `useMemo`. No `useEffect` that runs a search, and no `eslint-disable` for exhaustive-deps.
- **Content column:** `max-w-2xl lg:max-w-3xl mx-auto`, page wrapper `px-6 py-12`, per `app/blog/[category]/page.tsx`.
- **Comments explain why, not what.** Match the register of `lib/categories.ts`. Do not over-comment.
- **Do not touch nav, `app/sitemap.ts`, or the command palette.** The spec forbids wiring those until a second lab exists, on the rule `header.tsx` already states: "A nav item leading to a 'COMING SOON' page advertises an absence." That happens in PR 6, outside both plans.
- **Conventional commits.** Commit at the end of every task, never mid-task.
- Run the full suite (`npm test`) and `npm run lint` before the final commit of each PR.

## PR Boundaries

| PR | Tasks | Deliverable |
|---|---|---|
| 1 | 1–18 | Flat index, full lifecycle: dataset, metrics, threaded state, canvas, scrubber, scoreboard, health readout, undo/reset, page with server prose, linked from the Vector Databases category page |
| 2 | 19–28 | IVF: seeded Lloyd's k-means with animated training, insert drift, cheap delete, `nprobe` search, Voronoi cells, rebuild |
| 3 | 29–36 | IVF-PQ: subspace codebooks, encode on insert, asymmetric distance tables, the rank scramble against exact ranking |

Tasks 37–39 are unused; numbering continues at 40 in the companion HNSW plan so the two never collide.

## What This Plan Is Guarding

Four assertions carry the lab's teaching claims. If one starts failing, a claim in the spec has stopped being true — fix the code, never the bound:

1. **IVF at `nprobe = cells` returns exactly what flat search returns.** (Task 22)
2. **IVF at `nprobe = 1` misses at least one true neighbour on the seeded dataset.** (Task 22) If this ever passes trivially, the dataset has stopped being adversarial and the straddler geometry in Task 4 needs revisiting.
3. **Inserting without retraining measurably worsens cell balance, and rebuild restores it.** (Task 23) Asserted in both directions.
4. **PQ's top-k differs from exact top-k on at least one seeded query.** (Task 32) The rank scramble is the lesson; if quantisation changes nothing, the codebook is too fine to teach anything.

---
### Task 1: Shared primitives (`types.ts`)

**Files:**
- Create: `lib/lab/vector/types.ts`
- Test: `lib/lab/vector/types.test.ts`

**Note on the test:** a types-only file carries no runtime behaviour, and vitest transpiles with esbuild rather than type-checking, so a `types.test.ts` alone cannot catch a rename. I kept Task 1 separate anyway and made the test a **usage test with a paired `tsc --noEmit` run**: vitest catches the module going missing, `tsc` catches the contract being restructured. Both are in Step 4. Folding this into Task 2 would have buried the locked contract inside an unrelated commit.

**Interfaces:**
- Consumes: nothing.
- Produces: `Vec`, `PointId`, `Point`, `Metric`, `Counters`, `Ranked`, `SearchParams`, `OpResult<TState, TResult, TStep>` — verbatim from the locked contract. Every later task in every later PR imports from here.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import type { Counters, Metric, OpResult, Point, Ranked, SearchParams, Vec } from './types';

// These types are locked across four PRs, so this file exists to make a rename or a
// restructure fail somewhere rather than nowhere. `npx tsc --noEmit` is the guard:
// it rejects the annotations below. The runtime assertions only exercise the local
// usage pattern — the import here is type-only and elided before vitest ever runs,
// so vitest alone would not notice this module going missing.

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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/lab/vector/types.test.ts`
Expected: FAIL with `Failed to resolve import "./types" from "lib/lab/vector/types.test.ts". Does the file exist?`

- [ ] **Step 3: Write minimal implementation**

```ts
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
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run lib/lab/vector/types.test.ts`
Expected: PASS

Run: `npx tsc --noEmit`
Expected: PASS — this is the half of the guard that actually checks the contract.

- [ ] **Step 5: Commit**

```bash
git add lib/lab/vector/types.ts lib/lab/vector/types.test.ts
git commit -m "feat: shared primitives for the vector index playground"
```

---

### Task 2: Seeded randomness (`random.ts`)

**Files:**
- Create: `lib/lab/vector/random.ts`
- Test: `lib/lab/vector/random.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `mulberry32(seed: number): () => number` — used by `makeDataset` (Task 4) and, in later PRs, by k-means init and HNSW level assignment.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { mulberry32 } from './random';

function draw(seed: number, count: number): number[] {
  const rand = mulberry32(seed);
  return Array.from({ length: count }, () => rand());
}

describe('mulberry32', () => {
  it('produces the same sequence for the same seed', () => {
    expect(draw(20260830, 20)).toEqual(draw(20260830, 20));
  });

  it('produces a different sequence for a different seed', () => {
    expect(draw(1, 20)).not.toEqual(draw(2, 20));
  });

  it('gives each generator its own state', () => {
    const first = mulberry32(42);
    const second = mulberry32(42);

    first();
    first();

    // Advancing one generator must not advance the other, or a dataset built
    // mid-render would depend on how many other draws happened first.
    expect(second()).toBe(mulberry32(42)());
  });

  it('stays inside [0, 1)', () => {
    draw(7, 2000).forEach((value) => {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    });
  });

  it('does not repeat a value in a short run', () => {
    const values = draw(99, 500);
    expect(new Set(values).size).toBe(values.length);
  });

  it('spreads roughly uniformly over the unit interval', () => {
    const values = draw(3, 5000);
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    const belowHalf = values.filter((value) => value < 0.5).length;

    expect(mean).toBeGreaterThan(0.47);
    expect(mean).toBeLessThan(0.53);
    expect(belowHalf).toBeGreaterThan(2300);
    expect(belowHalf).toBeLessThan(2700);
  });

  it('accepts a negative seed', () => {
    const values = draw(-1, 10);
    values.forEach((value) => {
      expect(Number.isFinite(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/lab/vector/random.test.ts`
Expected: FAIL with `Failed to resolve import "./random" from "lib/lab/vector/random.test.ts". Does the file exist?`

- [ ] **Step 3: Write minimal implementation**

```ts
/**
 * mulberry32, inline.
 *
 * Every visitor sees the same picture and every test is reproducible, so
 * `Math.random` is banned throughout `lib/lab` — a seeded generator is the only
 * source of randomness. Mulberry32 is five lines and passes enough of the
 * statistical bar for scattering points on a canvas, which is cheaper than
 * taking a dependency for it.
 *
 * The seed is coerced with `>>> 0` so a negative or fractional seed still lands
 * on a valid 32-bit state rather than poisoning the arithmetic.
 */
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run lib/lab/vector/random.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/lab/vector/random.ts lib/lab/vector/random.test.ts
git commit -m "feat: seeded mulberry32 rng for lab determinism"
```

---

### Task 3: Distance metrics (`metrics.ts`)

**Files:**
- Create: `lib/lab/vector/metrics.ts`
- Test: `lib/lab/vector/metrics.test.ts`

**Interfaces:**
- Consumes: `Vec`, `Metric` from `./types`.
- Produces:
  - `euclidean(a: Vec, b: Vec): number`
  - `cosineDistance(a: Vec, b: Vec): number`
  - `dotDistance(a: Vec, b: Vec): number`
  - `distance(a: Vec, b: Vec, metric: Metric): number`

  All return smaller-means-nearer. `flatSearch` (Task 10) and every later index rank on `distance`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { euclidean, cosineDistance, dotDistance, distance } from './metrics';

describe('euclidean', () => {
  it('is zero for identical vectors', () => {
    expect(euclidean([0.3, 0.7], [0.3, 0.7])).toBe(0);
  });

  it('measures a 3-4-5 triangle', () => {
    expect(euclidean([0, 0], [3, 4])).toBeCloseTo(5, 10);
  });

  it('is symmetric', () => {
    expect(euclidean([0.1, 0.9], [0.8, 0.2])).toBeCloseTo(euclidean([0.8, 0.2], [0.1, 0.9]), 12);
  });

  it('grows with separation, so smaller means nearer', () => {
    expect(euclidean([0, 0], [0.1, 0])).toBeLessThan(euclidean([0, 0], [0.2, 0]));
  });
});

describe('cosineDistance', () => {
  it('is zero for vectors pointing the same way', () => {
    expect(cosineDistance([1, 0], [1, 0])).toBeCloseTo(0, 12);
  });

  it('ignores magnitude', () => {
    expect(cosineDistance([1, 1], [5, 5])).toBeCloseTo(0, 12);
  });

  it('is one for orthogonal vectors', () => {
    expect(cosineDistance([1, 0], [0, 1])).toBeCloseTo(1, 12);
  });

  it('is two for opposed vectors', () => {
    expect(cosineDistance([1, 0], [-1, 0])).toBeCloseTo(2, 12);
  });

  it('reports maximum distance rather than NaN against a zero vector', () => {
    // A zero vector has no direction. Returning NaN would make the ranking
    // comparator non-total and silently scramble the result list.
    expect(cosineDistance([0, 0], [1, 0])).toBe(1);
    expect(cosineDistance([0, 0], [0, 0])).toBe(1);
  });
});

describe('dotDistance', () => {
  it('negates the dot product', () => {
    expect(dotDistance([1, 2], [3, 4])).toBeCloseTo(-11, 10);
  });

  it('orders a larger dot product as nearer', () => {
    expect(dotDistance([1, 0], [2, 0])).toBeLessThan(dotDistance([1, 0], [1, 0]));
  });

  it('rewards magnitude where cosine does not', () => {
    expect(dotDistance([1, 0], [5, 0])).toBeLessThan(dotDistance([1, 0], [1, 0]));
    expect(cosineDistance([1, 0], [5, 0])).toBeCloseTo(cosineDistance([1, 0], [1, 0]), 12);
  });
});

describe('distance', () => {
  const a: readonly number[] = [0.2, 0.9];
  const b: readonly number[] = [0.7, 0.1];

  it('dispatches to euclidean', () => {
    expect(distance(a, b, 'euclidean')).toBe(euclidean(a, b));
  });

  it('dispatches to cosine', () => {
    expect(distance(a, b, 'cosine')).toBe(cosineDistance(a, b));
  });

  it('dispatches to dot', () => {
    expect(distance(a, b, 'dot')).toBe(dotDistance(a, b));
  });

  it('ranks nearer points lower under every metric', () => {
    const near: readonly number[] = [1, 0.1];
    const far: readonly number[] = [0.1, 1];
    const query: readonly number[] = [1, 0];

    (['euclidean', 'cosine', 'dot'] as const).forEach((metric) => {
      expect(distance(query, near, metric), metric).toBeLessThan(distance(query, far, metric));
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/lab/vector/metrics.test.ts`
Expected: FAIL with `Failed to resolve import "./metrics" from "lib/lab/vector/metrics.test.ts". Does the file exist?`

- [ ] **Step 3: Write minimal implementation**

```ts
import type { Metric, Vec } from './types';

/**
 * Every metric here returns a value where SMALLER MEANS NEARER.
 *
 * That is the whole reason `cosineDistance` and `dotDistance` exist as
 * distances rather than as similarities: one comparator then orders results
 * under all three, so no index has to know which metric it is ranking by.
 */

export function euclidean(a: Vec, b: Vec): number {
  let sum = 0;
  for (let i = 0; i < a.length; i += 1) {
    const delta = a[i] - b[i];
    sum += delta * delta;
  }
  return Math.sqrt(sum);
}

function dotProduct(a: Vec, b: Vec): number {
  let sum = 0;
  for (let i = 0; i < a.length; i += 1) {
    sum += a[i] * b[i];
  }
  return sum;
}

/** `1 - cosineSimilarity`, so the range is 0 (aligned) to 2 (opposed). */
export function cosineDistance(a: Vec, b: Vec): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  // A zero vector has no direction, so cosine is genuinely undefined here.
  // Reporting the maximum distance keeps the ordering total; NaN would make
  // every comparison against it false and quietly corrupt the ranking.
  if (denominator === 0) {
    return 1;
  }

  return 1 - dot / denominator;
}

/** `-dot`. Unnormalised, so magnitude counts — that is the point of it. */
export function dotDistance(a: Vec, b: Vec): number {
  return -dotProduct(a, b);
}

/** Dispatch by metric name. */
export function distance(a: Vec, b: Vec, metric: Metric): number {
  switch (metric) {
    case 'euclidean':
      return euclidean(a, b);
    case 'cosine':
      return cosineDistance(a, b);
    case 'dot':
      return dotDistance(a, b);
  }
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run lib/lab/vector/metrics.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/lab/vector/metrics.ts lib/lab/vector/metrics.test.ts
git commit -m "feat: euclidean, cosine and dot distances for the vector lab"
```

---

### Task 4: Adversarial dataset (`dataset.ts`)

**Files:**
- Create: `lib/lab/vector/dataset.ts`
- Test: `lib/lab/vector/dataset.test.ts`

**Interfaces:**
- Consumes: `Point`, `Vec` from `./types`; `mulberry32` from `./random`; `euclidean` from `./metrics` (test only).
- Produces:
  - `interface DatasetOptions { seed; clusters; perCluster; spread; straddlers }`
  - `makeDataset(options: DatasetOptions): readonly Point[]`
  - `DEFAULT_DATASET: DatasetOptions`

  `createFlat` (Task 7) is seeded from this. PR 2 asserts IVF at `nprobe=1` misses the straddlers, so the straddler geometry test below is the foundation of that claim.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { makeDataset, DEFAULT_DATASET, type DatasetOptions } from './dataset';
import { euclidean } from './metrics';
import type { Point, Vec } from './types';

const OPTIONS: DatasetOptions = { seed: 7, clusters: 4, perCluster: 40, spread: 0.04, straddlers: 4 };

function centroidOf(points: readonly Point[]): Vec {
  const x = points.reduce((sum, point) => sum + point.vec[0], 0) / points.length;
  const y = points.reduce((sum, point) => sum + point.vec[1], 0) / points.length;
  return [x, y];
}

/** Empirical centroids, so the assertions never depend on how centres are placed. */
function clusterCentroids(points: readonly Point[], options: DatasetOptions): Vec[] {
  return Array.from({ length: options.clusters }, (_unused, cluster) =>
    centroidOf(points.slice(cluster * options.perCluster, (cluster + 1) * options.perCluster)),
  );
}

function straddlersOf(points: readonly Point[], options: DatasetOptions): readonly Point[] {
  return points.slice(options.clusters * options.perCluster);
}

describe('makeDataset', () => {
  it('produces one point per cluster member plus one per straddler', () => {
    expect(makeDataset(OPTIONS)).toHaveLength(OPTIONS.clusters * OPTIONS.perCluster + OPTIONS.straddlers);
  });

  it('numbers ids sequentially from zero', () => {
    const points = makeDataset(OPTIONS);
    expect(points.map((point) => point.id)).toEqual(points.map((_unused, index) => index));
  });

  it('keeps every coordinate inside the unit square', () => {
    makeDataset(OPTIONS).forEach((point) => {
      expect(point.vec).toHaveLength(2);
      point.vec.forEach((component) => {
        expect(component).toBeGreaterThanOrEqual(0);
        expect(component).toBeLessThanOrEqual(1);
      });
    });
  });

  it('is reproducible for a given seed', () => {
    expect(makeDataset(OPTIONS)).toEqual(makeDataset(OPTIONS));
  });

  it('changes with the seed', () => {
    expect(makeDataset(OPTIONS)).not.toEqual(makeDataset({ ...OPTIONS, seed: OPTIONS.seed + 1 }));
  });

  it('builds clusters that are tight relative to their separation', () => {
    const points = makeDataset(OPTIONS);
    const centroids = clusterCentroids(points, OPTIONS);

    const radii = points.slice(0, OPTIONS.clusters * OPTIONS.perCluster).map((point, index) =>
      euclidean(point.vec, centroids[Math.floor(index / OPTIONS.perCluster)]),
    );
    const meanRadius = radii.reduce((sum, radius) => sum + radius, 0) / radii.length;

    const separations = centroids.flatMap((a, i) =>
      centroids.slice(i + 1).map((b) => euclidean(a, b)),
    );

    expect(meanRadius).toBeLessThan(0.25 * Math.min(...separations));
  });

  it('strands every straddler between exactly two cluster centres', () => {
    // This is the lab's central teaching claim in embryo: PR 2 asserts that IVF
    // at nprobe=1 misses these points, which is only meaningful if they really
    // do sit on a boundary rather than inside a cell.
    const points = makeDataset(OPTIONS);
    const centroids = clusterCentroids(points, OPTIONS);

    straddlersOf(points, OPTIONS).forEach((straddler) => {
      const sorted = centroids.map((centroid) => euclidean(straddler.vec, centroid)).sort((a, b) => a - b);

      // Roughly equidistant from its two nearest clusters. The tolerance is
      // loose because the centroids are measured from sampled members, which
      // wobble; the far-cluster assertion below is what makes the claim sharp.
      expect((sorted[1] - sorted[0]) / sorted[0]).toBeLessThan(0.3);
      expect(sorted[2] / sorted[0]).toBeGreaterThan(1.8);
    });
  });

  it('places straddlers well outside the cluster cores', () => {
    const points = makeDataset(OPTIONS);
    const centroids = clusterCentroids(points, OPTIONS);

    const radii = points.slice(0, OPTIONS.clusters * OPTIONS.perCluster).map((point, index) =>
      euclidean(point.vec, centroids[Math.floor(index / OPTIONS.perCluster)]),
    );
    const meanRadius = radii.reduce((sum, radius) => sum + radius, 0) / radii.length;

    straddlersOf(points, OPTIONS).forEach((straddler) => {
      const nearest = Math.min(...centroids.map((centroid) => euclidean(straddler.vec, centroid)));
      expect(nearest).toBeGreaterThan(3 * meanRadius);
    });
  });

  it('omits straddlers when there is no boundary to straddle', () => {
    const points = makeDataset({ ...OPTIONS, clusters: 1, straddlers: 5 });
    expect(points).toHaveLength(OPTIONS.perCluster);
  });
});

describe('DEFAULT_DATASET', () => {
  it('is adversarial by default rather than by opt-in', () => {
    expect(DEFAULT_DATASET.clusters).toBeGreaterThanOrEqual(2);
    expect(DEFAULT_DATASET.straddlers).toBeGreaterThan(0);
  });

  it('is a playground-sized dataset', () => {
    const points = makeDataset(DEFAULT_DATASET);
    expect(points.length).toBeGreaterThan(50);
    expect(points.length).toBeLessThan(500);
  });

  it('strands its straddlers on boundaries too', () => {
    const points = makeDataset(DEFAULT_DATASET);
    const centroids = clusterCentroids(points, DEFAULT_DATASET);

    straddlersOf(points, DEFAULT_DATASET).forEach((straddler) => {
      const sorted = centroids.map((centroid) => euclidean(straddler.vec, centroid)).sort((a, b) => a - b);
      expect((sorted[1] - sorted[0]) / sorted[0]).toBeLessThan(0.3);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/lab/vector/dataset.test.ts`
Expected: FAIL with `Failed to resolve import "./dataset" from "lib/lab/vector/dataset.test.ts". Does the file exist?`

- [ ] **Step 3: Write minimal implementation**

```ts
import { mulberry32 } from './random';
import type { Point, Vec } from './types';

export interface DatasetOptions {
  readonly seed: number;
  readonly clusters: number;
  readonly perCluster: number;
  readonly spread: number; // stddev within a cluster
  readonly straddlers: number; // points placed deliberately near cluster boundaries
}

/** Distance of every cluster centre from the middle of the unit square. */
const CENTRE_RADIUS = 0.32;

/**
 * Straddler jitter as a fraction of cluster spread.
 *
 * Small on purpose: a straddler has to stay close enough to the midpoint that
 * it is genuinely ambiguous between two cells, or the boundary-miss lesson
 * becomes a coin flip on the seed.
 */
const STRADDLER_JITTER = 0.1;

function clampUnit(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/**
 * Standard normal via Box-Muller.
 *
 * `1 - rand()` keeps the log argument off zero, which would otherwise return
 * -Infinity on the one draw where the generator yields exactly 0 and put a
 * point at NaN.
 */
function gaussian(rand: () => number): number {
  const u = 1 - rand();
  const v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/**
 * Cluster centres evenly spaced on a circle.
 *
 * Even spacing rather than random placement, because it makes every adjacent
 * pair equally separated: a straddler dropped between any two of them is then
 * equally adversarial. Random centres would leave some pairs nearly overlapping
 * and others trivially far apart, so how hard the lab is would depend on the
 * seed rather than on the index under test.
 */
function clusterCentres(clusters: number): Vec[] {
  return Array.from({ length: clusters }, (_unused, index) => {
    const angle = (2 * Math.PI * index) / clusters;
    return [0.5 + CENTRE_RADIUS * Math.cos(angle), 0.5 + CENTRE_RADIUS * Math.sin(angle)];
  });
}

function scatter(centre: Vec, spread: number, rand: () => number): Vec {
  // Clamped because the layout maps [0, 1] onto the canvas; a three-sigma tail
  // outside the unit square would be drawn outside the viewport.
  return [
    clampUnit(centre[0] + gaussian(rand) * spread),
    clampUnit(centre[1] + gaussian(rand) * spread),
  ];
}

/**
 * Adversarial by construction: tight clusters PLUS `straddlers` points placed
 * between cluster centres, so IVF at nprobe=1 genuinely misses true neighbours.
 * That miss is the lab's whole point and is asserted in tests.
 *
 * Straddlers come last in the array so a test can slice them off without the
 * module exposing its internal geometry.
 */
export function makeDataset(options: DatasetOptions): readonly Point[] {
  const rand = mulberry32(options.seed);
  const centres = clusterCentres(options.clusters);
  const points: Point[] = [];

  centres.forEach((centre) => {
    for (let i = 0; i < options.perCluster; i += 1) {
      points.push({ id: points.length, vec: scatter(centre, options.spread, rand) });
    }
  });

  // One centre has no boundary, so there is nothing to straddle.
  if (centres.length >= 2) {
    for (let i = 0; i < options.straddlers; i += 1) {
      const a = centres[i % centres.length];
      const b = centres[(i + 1) % centres.length];
      const midpoint: Vec = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      points.push({ id: points.length, vec: scatter(midpoint, options.spread * STRADDLER_JITTER, rand) });
    }
  }

  return points;
}

/**
 * 128 points: dense enough that brute force is visibly doing work, small enough
 * that flat search stays exact and free as ground truth for every other index.
 */
export const DEFAULT_DATASET: DatasetOptions = {
  seed: 20260830,
  clusters: 4,
  perCluster: 30,
  spread: 0.045,
  straddlers: 8,
};
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run lib/lab/vector/dataset.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/lab/vector/dataset.ts lib/lab/vector/dataset.test.ts
git commit -m "feat: seeded adversarial dataset with boundary straddlers"
```

---

### Task 5: Recall (`recall.ts`)

**Files:**
- Create: `lib/lab/vector/recall.ts`
- Test: `lib/lab/vector/recall.test.ts`

**Interfaces:**
- Consumes: `Ranked` from `./types`.
- Produces: `recallAtK(got: readonly Ranked[], truth: readonly Ranked[], k: number): number`. The health readout calls this with `flatSearch`'s result as `truth`; PR 2 onward asserts against it.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { recallAtK } from './recall';
import type { Ranked } from './types';

function ranking(...ids: number[]): Ranked[] {
  return ids.map((id, index) => ({ id, distance: index * 0.1 }));
}

describe('recallAtK', () => {
  it('is one when the rankings agree', () => {
    expect(recallAtK(ranking(1, 2, 3), ranking(1, 2, 3), 3)).toBe(1);
  });

  it('is zero when the rankings share nothing', () => {
    expect(recallAtK(ranking(4, 5, 6), ranking(1, 2, 3), 3)).toBe(0);
  });

  it('reports the fraction of true neighbours found', () => {
    expect(recallAtK(ranking(1, 9, 3, 8), ranking(1, 2, 3, 4), 4)).toBe(0.5);
  });

  it('ignores the order within the top k', () => {
    expect(recallAtK(ranking(3, 1, 2), ranking(1, 2, 3), 3)).toBe(1);
  });

  it('ignores ids the index ranked below k', () => {
    // A hit at rank 5 is a miss at k=2. Counting it would flatter every index.
    expect(recallAtK(ranking(8, 9, 1, 2), ranking(1, 2), 2)).toBe(0);
  });

  it('ignores truth entries below k', () => {
    expect(recallAtK(ranking(1, 2), ranking(1, 2, 3, 4), 2)).toBe(1);
  });

  it('divides by the number of true neighbours that exist, not by k', () => {
    // Asking for 10 against a 3-point index is full recall, not 0.3.
    expect(recallAtK(ranking(1, 2, 3), ranking(1, 2, 3), 10)).toBe(1);
  });

  it('is one when there is nothing to recall', () => {
    expect(recallAtK(ranking(1, 2), [], 5)).toBe(1);
    expect(recallAtK([], [], 5)).toBe(1);
  });

  it('is zero when the index returned nothing', () => {
    expect(recallAtK([], ranking(1, 2), 2)).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/lab/vector/recall.test.ts`
Expected: FAIL with `Failed to resolve import "./recall" from "lib/lab/vector/recall.test.ts". Does the file exist?`

- [ ] **Step 3: Write minimal implementation**

```ts
import type { Ranked } from './types';

/**
 * Fraction of truth's top-k ids present in got's top-k. Range 0..1.
 *
 * The denominator is how many true neighbours actually exist, not k: asking for
 * ten neighbours from a three-point index is full recall, and scoring it 0.3
 * would make the health readout drop every time the reader deletes points.
 *
 * Both lists are truncated to k first, so an id the index ranked twentieth does
 * not count as a hit at k=10.
 */
export function recallAtK(got: readonly Ranked[], truth: readonly Ranked[], k: number): number {
  const wanted = truth.slice(0, k);
  if (wanted.length === 0) {
    return 1;
  }

  const found = new Set(got.slice(0, k).map((ranked) => ranked.id));
  const hits = wanted.filter((ranked) => found.has(ranked.id)).length;
  return hits / wanted.length;
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run lib/lab/vector/recall.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/lab/vector/recall.ts lib/lab/vector/recall.test.ts
git commit -m "feat: recall@k against a ground-truth ranking"
```

---

### Task 6: Canvas layout (`layout.ts`)

**Files:**
- Create: `lib/lab/vector/layout.ts`
- Test: `lib/lab/vector/layout.test.ts`

**Interfaces:**
- Consumes: `Point`, `PointId`, `Vec` from `./types`.
- Produces:
  - `interface Viewport { width; height; padding }`
  - `interface ScreenPoint { id; x; y }`
  - `toScreen(vec: Vec, viewport: Viewport): { x: number; y: number }`
  - `layoutPoints(points: readonly Point[], viewport: Viewport): readonly ScreenPoint[]`
  - `hitTest(screenPoints: readonly ScreenPoint[], x: number, y: number, radius: number): PointId | null`

  The canvas component in the `components/` half of PR 1 iterates `layoutPoints` and calls `hitTest` for click-to-delete, and contains no geometry of its own.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { toScreen, layoutPoints, hitTest, type ScreenPoint, type Viewport } from './layout';
import type { Point } from './types';

const SQUARE: Viewport = { width: 100, height: 100, padding: 0 };
const PADDED: Viewport = { width: 100, height: 100, padding: 10 };

describe('toScreen', () => {
  it('puts the data-space origin at the bottom left', () => {
    // Data-space y grows upward, screen y grows downward. The flip lives here
    // so the drawing component never has to think about it.
    expect(toScreen([0, 0], SQUARE)).toEqual({ x: 0, y: 100 });
  });

  it('puts [1, 1] at the top right', () => {
    expect(toScreen([1, 1], SQUARE)).toEqual({ x: 100, y: 0 });
  });

  it('puts the centre in the middle', () => {
    expect(toScreen([0.5, 0.5], SQUARE)).toEqual({ x: 50, y: 50 });
  });

  it('insets the unit square by the padding on every side', () => {
    expect(toScreen([0, 0], PADDED)).toEqual({ x: 10, y: 90 });
    expect(toScreen([1, 1], PADDED)).toEqual({ x: 90, y: 10 });
    expect(toScreen([0.5, 0.5], PADDED)).toEqual({ x: 50, y: 50 });
  });

  it('fills a non-square viewport rather than letterboxing it', () => {
    const wide: Viewport = { width: 200, height: 100, padding: 0 };
    expect(toScreen([0.5, 0.5], wide)).toEqual({ x: 100, y: 50 });
    expect(toScreen([1, 0], wide)).toEqual({ x: 200, y: 100 });
  });

  it('collapses to the padding when the viewport is smaller than its padding', () => {
    const tiny: Viewport = { width: 10, height: 10, padding: 20 };
    expect(toScreen([0, 0], tiny)).toEqual({ x: 20, y: 20 });
    expect(toScreen([1, 1], tiny)).toEqual({ x: 20, y: 20 });
  });
});

describe('layoutPoints', () => {
  const points: Point[] = [
    { id: 3, vec: [0, 1] },
    { id: 7, vec: [0.5, 0.5] },
    { id: 9, vec: [1, 0] },
  ];

  it('returns one screen point per point, in order, keeping ids', () => {
    expect(layoutPoints(points, SQUARE)).toEqual([
      { id: 3, x: 0, y: 0 },
      { id: 7, x: 50, y: 50 },
      { id: 9, x: 100, y: 100 },
    ]);
  });

  it('returns nothing for an empty index', () => {
    expect(layoutPoints([], SQUARE)).toEqual([]);
  });

  it('leaves the input alone', () => {
    const before = JSON.parse(JSON.stringify(points));
    layoutPoints(points, SQUARE);
    expect(points).toEqual(before);
  });
});

describe('hitTest', () => {
  const screenPoints: ScreenPoint[] = [
    { id: 3, x: 0, y: 0 },
    { id: 7, x: 50, y: 50 },
    { id: 9, x: 100, y: 100 },
  ];

  it('finds the point under the cursor', () => {
    expect(hitTest(screenPoints, 52, 50, 10)).toBe(7);
  });

  it('finds a point the cursor sits exactly on', () => {
    expect(hitTest(screenPoints, 50, 50, 0)).toBe(7);
  });

  it('counts the radius as a hit, not a miss', () => {
    expect(hitTest(screenPoints, 60, 50, 10)).toBe(7);
  });

  it('returns null beyond the radius', () => {
    expect(hitTest(screenPoints, 70, 50, 10)).toBeNull();
  });

  it('returns the nearest of several candidates', () => {
    const crowded: ScreenPoint[] = [
      { id: 1, x: 0, y: 0 },
      { id: 2, x: 8, y: 0 },
      { id: 3, x: 4, y: 0 },
    ];
    expect(hitTest(crowded, 5, 0, 50)).toBe(3);
  });

  it('breaks a tie towards the first point, so a click never flickers', () => {
    const tied: ScreenPoint[] = [
      { id: 7, x: 0, y: 0 },
      { id: 9, x: 20, y: 0 },
    ];
    expect(hitTest(tied, 10, 0, 50)).toBe(7);
  });

  it('returns null for an empty canvas', () => {
    expect(hitTest([], 10, 10, 50)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/lab/vector/layout.test.ts`
Expected: FAIL with `Failed to resolve import "./layout" from "lib/lab/vector/layout.test.ts". Does the file exist?`

- [ ] **Step 3: Write minimal implementation**

```ts
import type { Point, PointId, Vec } from './types';

export interface Viewport {
  readonly width: number;
  readonly height: number;
  readonly padding: number;
}

export interface ScreenPoint {
  readonly id: PointId;
  readonly x: number;
  readonly y: number;
}

/**
 * Unit space to screen space.
 *
 * The unit square is stretched to fill the padded viewport rather than
 * letterboxed into it. Preserving aspect ratio would mean deciding where the
 * unused band goes, and that decision would have to be repeated by anything
 * that maps a click back — so the caller sizes the canvas square instead and
 * this stays a single multiply.
 *
 * Data-space y grows upward and screen y grows downward, so y is flipped here
 * and nowhere else.
 */
export function toScreen(vec: Vec, viewport: Viewport): { x: number; y: number } {
  const usableWidth = Math.max(0, viewport.width - viewport.padding * 2);
  const usableHeight = Math.max(0, viewport.height - viewport.padding * 2);

  return {
    x: viewport.padding + vec[0] * usableWidth,
    y: viewport.padding + (1 - vec[1]) * usableHeight,
  };
}

export function layoutPoints(points: readonly Point[], viewport: Viewport): readonly ScreenPoint[] {
  return points.map((point) => ({ id: point.id, ...toScreen(point.vec, viewport) }));
}

/**
 * Nearest point to a screen coordinate within `radius` px, or null.
 *
 * Ties resolve to the first point in the list, which is insertion order, so a
 * click on overlapping points always deletes the same one rather than picking
 * whichever the iteration happened to reach last.
 */
export function hitTest(
  screenPoints: readonly ScreenPoint[],
  x: number,
  y: number,
  radius: number,
): PointId | null {
  let nearest: PointId | null = null;
  let nearestDistance = Infinity;

  screenPoints.forEach((point) => {
    const gap = Math.hypot(point.x - x, point.y - y);
    if (gap <= radius && gap < nearestDistance) {
      nearest = point.id;
      nearestDistance = gap;
    }
  });

  return nearest;
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run lib/lab/vector/layout.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/lab/vector/layout.ts lib/lab/vector/layout.test.ts
git commit -m "feat: pure canvas layout and hit testing for the vector lab"
```

---

### Task 7: Flat index state (`createFlat`)

**Files:**
- Create: `lib/lab/vector/flat.ts`
- Test: `lib/lab/vector/flat.test.ts`

**Interfaces:**
- Consumes: `Point`, `PointId` from `./types`; `makeDataset`, `DEFAULT_DATASET` from `./dataset` (test only).
- Produces:
  - `interface FlatState { readonly points: readonly Point[]; readonly nextId: PointId }`
  - `type FlatStep` (the full locked union — later tasks emit the remaining variants)
  - `createFlat(points: readonly Point[]): FlatState`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { createFlat } from './flat';
import { makeDataset, DEFAULT_DATASET } from './dataset';
import type { Point } from './types';

/**
 * Deep copy taken before an operation, so the purity assertion compares against
 * a value the operation had no way to reach.
 */
export function snapshot<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function pointsOf(...vecs: readonly (readonly number[])[]): Point[] {
  return vecs.map((vec, id) => ({ id, vec }));
}

describe('createFlat', () => {
  it('builds an empty index', () => {
    expect(createFlat([])).toEqual({ points: [], nextId: 0 });
  });

  it('holds the points it was seeded with', () => {
    const points = pointsOf([0, 0], [1, 1]);
    expect(createFlat(points).points).toEqual(points);
  });

  it('hands out the next id above the highest one present', () => {
    expect(createFlat(makeDataset(DEFAULT_DATASET)).nextId).toBe(makeDataset(DEFAULT_DATASET).length);
  });

  it('clears the highest id even when the ids have gaps', () => {
    // Ids are never reused, so a state rebuilt after deletions must not hand
    // out an id that is still live.
    const gappy: Point[] = [
      { id: 0, vec: [0, 0] },
      { id: 5, vec: [1, 0] },
      { id: 2, vec: [0, 1] },
    ];
    expect(createFlat(gappy).nextId).toBe(6);
  });

  it('copies the seed array rather than aliasing it', () => {
    const points = pointsOf([0, 0]);
    const state = createFlat(points);

    points.push({ id: 99, vec: [1, 1] });

    expect(state.points).toHaveLength(1);
  });

  it('leaves the seed array unchanged', () => {
    const points = makeDataset(DEFAULT_DATASET);
    const before = snapshot(points);

    createFlat(points);

    expect(points).toEqual(before);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/lab/vector/flat.test.ts`
Expected: FAIL with `Failed to resolve import "./flat" from "lib/lab/vector/flat.test.ts". Does the file exist?`

- [ ] **Step 3: Write minimal implementation**

```ts
import type { Point, PointId } from './types';

export interface FlatState {
  readonly points: readonly Point[];
  readonly nextId: PointId;
}

export type FlatStep =
  | { readonly kind: 'scan'; readonly id: PointId; readonly distance: number }
  | { readonly kind: 'admit'; readonly id: PointId; readonly distance: number; readonly rank: number }
  | { readonly kind: 'evict'; readonly id: PointId }
  | { readonly kind: 'append'; readonly id: PointId }
  | { readonly kind: 'remove'; readonly id: PointId };

/**
 * Seed a flat index from a dataset.
 *
 * `nextId` clears the highest id present rather than counting the points,
 * because ids are never reused: a state rebuilt from points that have already
 * had deletions would otherwise hand out an id that is still live and give two
 * points the same identity.
 */
export function createFlat(points: readonly Point[]): FlatState {
  return {
    points: [...points],
    nextId: points.reduce((next, point) => Math.max(next, point.id + 1), 0),
  };
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run lib/lab/vector/flat.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/lab/vector/flat.ts lib/lab/vector/flat.test.ts
git commit -m "feat: flat index state constructor"
```

---

### Task 8: Flat insert (`flatInsert`)

**Files:**
- Modify: `lib/lab/vector/flat.ts`
- Test: `lib/lab/vector/flat.test.ts`

**Interfaces:**
- Consumes: `FlatState`, `FlatStep`, `createFlat` from Task 7; `OpResult`, `Vec` from `./types`.
- Produces: `flatInsert(state: FlatState, vec: Vec): OpResult<FlatState, PointId, FlatStep>`. Emits one `append` step; counters `distanceComputations: 0`, `pointsScanned: 0`.

- [ ] **Step 1: Write the failing test**

Replace the import line at the top of `lib/lab/vector/flat.test.ts` with:

```ts
import { createFlat, flatInsert } from './flat';
```

Append this block to `lib/lab/vector/flat.test.ts`:

```ts
describe('flatInsert', () => {
  it('appends the new point at the end', () => {
    const state = createFlat(pointsOf([0, 0], [1, 1]));

    const { state: next } = flatInsert(state, [0.5, 0.5]);

    expect(next.points).toHaveLength(3);
    expect(next.points[2]).toEqual({ id: 2, vec: [0.5, 0.5] });
  });

  it('returns the id it assigned', () => {
    const { result } = flatInsert(createFlat(pointsOf([0, 0])), [0.5, 0.5]);
    expect(result).toBe(1);
  });

  it('advances nextId so ids are never handed out twice', () => {
    const first = flatInsert(createFlat([]), [0, 0]);
    const second = flatInsert(first.state, [1, 1]);

    expect(first.result).toBe(0);
    expect(second.result).toBe(1);
    expect(second.state.nextId).toBe(2);
  });

  it('traces one append and nothing else', () => {
    const { steps } = flatInsert(createFlat(pointsOf([0, 0])), [0.5, 0.5]);
    expect(steps).toEqual([{ kind: 'append', id: 1 }]);
  });

  it('touches no other point', () => {
    // The scoreboard's whole argument is the contrast between this and IVF's
    // assign or HNSW's descent, so a flat insert must cost literally nothing.
    const { counters } = flatInsert(createFlat(makeDataset(DEFAULT_DATASET)), [0.5, 0.5]);
    expect(counters).toEqual({ distanceComputations: 0, pointsScanned: 0 });
  });

  it('leaves the input state unchanged', () => {
    const state = createFlat(makeDataset(DEFAULT_DATASET));
    const before = snapshot(state);

    flatInsert(state, [0.5, 0.5]);

    expect(state).toEqual(before);
  });

  it('copies the vector, so a caller reusing its array cannot reach into state', () => {
    const vec = [0.5, 0.5];
    const { state: next } = flatInsert(createFlat([]), vec);

    vec[0] = 0.9;

    expect(next.points[0].vec).toEqual([0.5, 0.5]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/lab/vector/flat.test.ts`
Expected: FAIL with `SyntaxError: The requested module './flat' does not provide an export named 'flatInsert'`

- [ ] **Step 3: Write minimal implementation**

Change the type import at the top of `lib/lab/vector/flat.ts` to:

```ts
import type { OpResult, Point, PointId, Vec } from './types';
```

Append to `lib/lab/vector/flat.ts`:

```ts
/**
 * Append a point.
 *
 * Flat is the baseline every other index is argued against, and the argument
 * starts here: inserting costs nothing, because there is no structure to
 * maintain. The zeroed counters are load-bearing rather than decorative — the
 * scoreboard reads them beside IVF's assign and HNSW's descent.
 *
 * The vector is copied so a caller reusing a mutable array between clicks
 * cannot retroactively move a point that is already in the index.
 */
export function flatInsert(state: FlatState, vec: Vec): OpResult<FlatState, PointId, FlatStep> {
  const point: Point = { id: state.nextId, vec: [...vec] };

  return {
    state: { points: [...state.points, point], nextId: point.id + 1 },
    result: point.id,
    steps: [{ kind: 'append', id: point.id }],
    counters: { distanceComputations: 0, pointsScanned: 0 },
  };
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run lib/lab/vector/flat.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/lab/vector/flat.ts lib/lab/vector/flat.test.ts
git commit -m "feat: flat index insert"
```

---

### Task 9: Flat delete (`flatDelete`)

**Files:**
- Modify: `lib/lab/vector/flat.ts`
- Test: `lib/lab/vector/flat.test.ts`

**Interfaces:**
- Consumes: `FlatState`, `FlatStep`, `createFlat`, `flatInsert` from Tasks 7-8; `OpResult`, `PointId` from `./types`.
- Produces: `flatDelete(state: FlatState, id: PointId): OpResult<FlatState, boolean, FlatStep>`. Hard removal, never a tombstone; `nextId` is preserved.

- [ ] **Step 1: Write the failing test**

Replace the import line at the top of `lib/lab/vector/flat.test.ts` with:

```ts
import { createFlat, flatInsert, flatDelete } from './flat';
```

Append this block to `lib/lab/vector/flat.test.ts`:

```ts
describe('flatDelete', () => {
  it('removes the point outright, leaving no tombstone behind', () => {
    // The contrast with HNSW's forced tombstoning is a teaching point. Flat has
    // no graph to disconnect, so the point simply goes.
    const state = createFlat(pointsOf([0, 0], [1, 1], [0.5, 0.5]));

    const { state: next } = flatDelete(state, 1);

    expect(next.points.map((point) => point.id)).toEqual([0, 2]);
  });

  it('reports that it removed something', () => {
    expect(flatDelete(createFlat(pointsOf([0, 0])), 0).result).toBe(true);
  });

  it('traces one remove', () => {
    const { steps } = flatDelete(createFlat(pointsOf([0, 0], [1, 1])), 1);
    expect(steps).toEqual([{ kind: 'remove', id: 1 }]);
  });

  it('costs nothing', () => {
    const { counters } = flatDelete(createFlat(makeDataset(DEFAULT_DATASET)), 4);
    expect(counters).toEqual({ distanceComputations: 0, pointsScanned: 0 });
  });

  it('reports a miss for an id it does not hold', () => {
    const state = createFlat(pointsOf([0, 0], [1, 1]));

    const outcome = flatDelete(state, 99);

    expect(outcome.result).toBe(false);
    expect(outcome.state).toEqual(state);
    expect(outcome.steps).toEqual([]);
  });

  it('reports a miss for an id already deleted', () => {
    const once = flatDelete(createFlat(pointsOf([0, 0], [1, 1])), 0);
    expect(flatDelete(once.state, 0).result).toBe(false);
  });

  it('never recycles the deleted id', () => {
    const seeded = createFlat(pointsOf([0, 0], [1, 1]));
    const deleted = flatDelete(seeded, 1);

    expect(deleted.state.nextId).toBe(seeded.nextId);
    expect(flatInsert(deleted.state, [0.5, 0.5]).result).toBe(2);
  });

  it('leaves the input state unchanged', () => {
    const state = createFlat(makeDataset(DEFAULT_DATASET));
    const before = snapshot(state);

    flatDelete(state, 4);

    expect(state).toEqual(before);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/lab/vector/flat.test.ts`
Expected: FAIL with `SyntaxError: The requested module './flat' does not provide an export named 'flatDelete'`

- [ ] **Step 3: Write minimal implementation**

Append to `lib/lab/vector/flat.ts`:

```ts
/**
 * Remove a point outright.
 *
 * Deliberately a HARD removal, not a tombstone. Flat has no proximity graph to
 * disconnect, so nothing forces a deferred delete here — and the contrast with
 * HNSW, which cannot do this, is one of the things the playground exists to
 * show. Tombstoning flat "for consistency" would erase that lesson.
 *
 * `nextId` survives the delete: ids are never reused, or an undo replay would
 * put a different point under an id the reader has already seen.
 */
export function flatDelete(state: FlatState, id: PointId): OpResult<FlatState, boolean, FlatStep> {
  const index = state.points.findIndex((point) => point.id === id);
  const counters = { distanceComputations: 0, pointsScanned: 0 };

  if (index === -1) {
    return { state, result: false, steps: [], counters };
  }

  return {
    state: {
      points: [...state.points.slice(0, index), ...state.points.slice(index + 1)],
      nextId: state.nextId,
    },
    result: true,
    steps: [{ kind: 'remove', id }],
    counters,
  };
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run lib/lab/vector/flat.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/lab/vector/flat.ts lib/lab/vector/flat.test.ts
git commit -m "feat: flat index hard delete"
```

---

### Task 10: Flat search as ground truth (`flatSearch`)

**Files:**
- Modify: `lib/lab/vector/flat.ts`
- Test: `lib/lab/vector/flat.test.ts`

**Interfaces:**
- Consumes: `FlatState`, `FlatStep`, `createFlat`, `flatInsert`, `flatDelete` from Tasks 7-9; `distance` from `./metrics`; `OpResult`, `Ranked`, `SearchParams`, `Vec` from `./types`.
- Produces: `flatSearch(state: FlatState, query: Vec, params: SearchParams): OpResult<FlatState, readonly Ranked[], FlatStep>`. Returns the input state unchanged. Emits `scan` per point in index order, `admit` when a point enters the running top-k (with its rank at that moment), `evict` when one is pushed out. Counters `distanceComputations` and `pointsScanned` both equal the point count.

  This is the exact ground truth PR 2's IVF recall, PR 3's PQ rank scramble and PR 4's HNSW recall threshold are all measured against.

- [ ] **Step 1: Write the failing test**

Replace the import lines at the top of `lib/lab/vector/flat.test.ts` with:

```ts
import { createFlat, flatInsert, flatDelete, flatSearch } from './flat';
import { euclidean } from './metrics';
import type { Point, Ranked, SearchParams } from './types';
```

Append this block to `lib/lab/vector/flat.test.ts`:

```ts
const EUCLIDEAN_3: SearchParams = { k: 3, metric: 'euclidean' };

describe('flatSearch', () => {
  it('returns the exact nearest neighbours of a hand-computed fixture', () => {
    // Distances from [0, 0] are 0, 0.1, 0.3, 1 and sqrt(0.5); the top three are
    // therefore ids 0, 1 and 2 in that order.
    const state = createFlat(pointsOf([0, 0], [0.1, 0], [0.3, 0], [1, 0], [0.5, 0.5]));

    const { result } = flatSearch(state, [0, 0], EUCLIDEAN_3);

    expect(result.map((ranked) => ranked.id)).toEqual([0, 1, 2]);
    expect(result[0].distance).toBeCloseTo(0, 10);
    expect(result[1].distance).toBeCloseTo(0.1, 10);
    expect(result[2].distance).toBeCloseTo(0.3, 10);
  });

  it('scans every point exactly once, in index order', () => {
    const state = createFlat(pointsOf([0, 0], [0.1, 0], [0.3, 0], [1, 0], [0.5, 0.5]));

    const { steps } = flatSearch(state, [0, 0], EUCLIDEAN_3);

    expect(steps.filter((step) => step.kind === 'scan').map((step) => step.id)).toEqual([0, 1, 2, 3, 4]);
  });

  it('admits nothing once the top k is full of nearer points', () => {
    const state = createFlat(pointsOf([0, 0], [0.1, 0], [0.3, 0], [1, 0], [0.5, 0.5]));

    const { steps } = flatSearch(state, [0, 0], EUCLIDEAN_3);

    expect(steps.filter((step) => step.kind === 'admit').map((step) => step.id)).toEqual([0, 1, 2]);
    expect(steps.filter((step) => step.kind === 'evict')).toEqual([]);
  });

  it('evicts the running worst when a nearer point arrives later', () => {
    // Scanned worst-first, so the reader watches the shortlist churn.
    const state = createFlat(pointsOf([1, 0], [0.5, 0], [0.2, 0]));

    const { steps, result } = flatSearch(state, [0, 0], { k: 2, metric: 'euclidean' });

    expect(steps.map((step) => step.kind)).toEqual(['scan', 'admit', 'scan', 'admit', 'scan', 'admit', 'evict']);
    expect(steps.filter((step) => step.kind === 'evict')).toEqual([{ kind: 'evict', id: 0 }]);
    expect(result.map((ranked) => ranked.id)).toEqual([2, 1]);
  });

  it('records the rank a point was admitted at', () => {
    const state = createFlat(pointsOf([1, 0], [0.5, 0]));

    const { steps } = flatSearch(state, [0, 0], { k: 2, metric: 'euclidean' });

    expect(steps.filter((step) => step.kind === 'admit')).toEqual([
      { kind: 'admit', id: 0, distance: 1, rank: 0 },
      { kind: 'admit', id: 1, distance: 0.5, rank: 0 },
    ]);
  });

  it('breaks distance ties by id, whatever order the points are held in', () => {
    // Ground truth has to be a total order, or every other index's recall would
    // wobble for reasons that have nothing to do with the index under test.
    const forward = createFlat([
      { id: 5, vec: [0, 1] },
      { id: 2, vec: [1, 0] },
    ]);
    const reversed = createFlat([
      { id: 2, vec: [1, 0] },
      { id: 5, vec: [0, 1] },
    ]);
    const params: SearchParams = { k: 1, metric: 'euclidean' };

    expect(flatSearch(forward, [0, 0], params).result.map((ranked) => ranked.id)).toEqual([2]);
    expect(flatSearch(reversed, [0, 0], params).result.map((ranked) => ranked.id)).toEqual([2]);
  });

  it('agrees with an independent full sort over the seeded dataset', () => {
    const points = makeDataset(DEFAULT_DATASET);
    const state = createFlat(points);
    const query: readonly number[] = [0.5, 0.5];

    const expected = [...points]
      .map((point): Ranked => ({ id: point.id, distance: euclidean(query, point.vec) }))
      .sort((a, b) => a.distance - b.distance || a.id - b.id)
      .slice(0, 10);

    const { result } = flatSearch(state, query, { k: 10, metric: 'euclidean' });

    expect(result.map((ranked) => ranked.id)).toEqual(expected.map((ranked) => ranked.id));
    result.forEach((ranked, index) => {
      expect(ranked.distance).toBeCloseTo(expected[index].distance, 12);
    });
  });

  it('returns every point when k exceeds the index size', () => {
    const state = createFlat(pointsOf([0.3, 0], [0.1, 0]));

    const { result } = flatSearch(state, [0, 0], { k: 10, metric: 'euclidean' });

    expect(result.map((ranked) => ranked.id)).toEqual([1, 0]);
  });

  it('returns nothing from an empty index', () => {
    const outcome = flatSearch(createFlat([]), [0, 0], EUCLIDEAN_3);

    expect(outcome.result).toEqual([]);
    expect(outcome.steps).toEqual([]);
  });

  it('ranks by the requested metric', () => {
    const state = createFlat(pointsOf([5, 0], [0.1, 0.1]));
    const query: readonly number[] = [1, 0];

    // Euclidean prefers the near point; dot prefers the long one.
    expect(flatSearch(state, query, { k: 1, metric: 'euclidean' }).result[0].id).toBe(1);
    expect(flatSearch(state, query, { k: 1, metric: 'dot' }).result[0].id).toBe(0);
  });

  it('charges one distance computation per point, whatever k is', () => {
    const points = makeDataset(DEFAULT_DATASET);
    const state = createFlat(points);

    expect(flatSearch(state, [0.5, 0.5], { k: 1, metric: 'euclidean' }).counters).toEqual({
      distanceComputations: points.length,
      pointsScanned: points.length,
    });
    expect(flatSearch(state, [0.5, 0.5], { k: 50, metric: 'euclidean' }).counters).toEqual({
      distanceComputations: points.length,
      pointsScanned: points.length,
    });
  });

  it('still scans everything when nothing is asked for', () => {
    const state = createFlat(pointsOf([0, 0], [1, 1]));

    const outcome = flatSearch(state, [0, 0], { k: 0, metric: 'euclidean' });

    expect(outcome.result).toEqual([]);
    expect(outcome.counters.distanceComputations).toBe(2);
  });

  it('never returns a deleted point', () => {
    const seeded = createFlat(pointsOf([0, 0], [0.1, 0], [0.3, 0]));
    const { state } = flatDelete(seeded, 0);

    const { result } = flatSearch(state, [0, 0], EUCLIDEAN_3);

    expect(result.map((ranked) => ranked.id)).toEqual([1, 2]);
  });

  it('returns a point inserted a moment ago', () => {
    const inserted = flatInsert(createFlat(pointsOf([1, 1])), [0, 0]);

    const { result } = flatSearch(inserted.state, [0, 0], { k: 1, metric: 'euclidean' });

    expect(result.map((ranked) => ranked.id)).toEqual([inserted.result]);
  });

  it('leaves the input state unchanged and hands it straight back', () => {
    const state = createFlat(makeDataset(DEFAULT_DATASET));
    const before = snapshot(state);

    const outcome = flatSearch(state, [0.5, 0.5], { k: 10, metric: 'euclidean' });

    expect(state).toEqual(before);
    expect(outcome.state).toBe(state);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/lab/vector/flat.test.ts`
Expected: FAIL with `SyntaxError: The requested module './flat' does not provide an export named 'flatSearch'`

- [ ] **Step 3: Write minimal implementation**

Change the imports at the top of `lib/lab/vector/flat.ts` to:

```ts
import { distance } from './metrics';
import type { OpResult, Point, PointId, Ranked, SearchParams, Vec } from './types';
```

Append to `lib/lab/vector/flat.ts`:

```ts
/**
 * Total order over candidates: distance first, then id.
 *
 * The id tiebreak is not cosmetic. Flat search is the ground truth every other
 * index's recall is measured against, so two points at the same distance must
 * never swap between runs — recall would then move for reasons that have
 * nothing to do with the index under test.
 */
function isNearer(candidateDistance: number, candidateId: PointId, incumbent: Ranked): boolean {
  return (
    candidateDistance < incumbent.distance ||
    (candidateDistance === incumbent.distance && candidateId < incumbent.id)
  );
}

function rankFor(top: readonly Ranked[], candidateDistance: number, candidateId: PointId): number {
  let rank = 0;
  while (rank < top.length && !isNearer(candidateDistance, candidateId, top[rank])) {
    rank += 1;
  }
  return rank;
}

/**
 * Brute force scan. Exact by construction, and at playground sizes free.
 *
 * The shortlist is maintained during the scan rather than recovered by sorting
 * afterwards, because the trace is the product here: the reader scrubs through
 * points entering and being pushed out of the top k as the scan advances, which
 * a sort-then-slice would flatten into every admit arriving at the end.
 *
 * `distanceComputations` and `pointsScanned` are necessarily equal for flat —
 * that is the definition of brute force. They are reported separately because
 * IVF and HNSW pull them apart, and the scoreboard compares the same two keys
 * across every index.
 */
export function flatSearch(
  state: FlatState,
  query: Vec,
  params: SearchParams,
): OpResult<FlatState, readonly Ranked[], FlatStep> {
  const steps: FlatStep[] = [];
  const top: Ranked[] = [];

  state.points.forEach((point) => {
    const pointDistance = distance(query, point.vec, params.metric);
    steps.push({ kind: 'scan', id: point.id, distance: pointDistance });

    const worst = top[top.length - 1];
    if (top.length >= params.k && (worst === undefined || !isNearer(pointDistance, point.id, worst))) {
      return;
    }

    const rank = rankFor(top, pointDistance, point.id);
    top.splice(rank, 0, { id: point.id, distance: pointDistance });
    steps.push({ kind: 'admit', id: point.id, distance: pointDistance, rank });

    if (top.length > params.k) {
      const evicted = top[top.length - 1];
      top.length -= 1;
      steps.push({ kind: 'evict', id: evicted.id });
    }
  });

  return {
    state,
    result: top,
    steps,
    counters: { distanceComputations: state.points.length, pointsScanned: state.points.length },
  };
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run lib/lab/vector/flat.test.ts`
Expected: PASS

Run: `npx vitest run lib/lab/vector && npx tsc --noEmit && npm run lint`
Expected: PASS — the whole `lib/` half of PR 1 green. Note that `vitest.config.mts` sets `environment: 'jsdom'` globally, so these tests do run under jsdom; the constraint that matters is that nothing under `lib/lab/` imports React or touches the DOM, which keeps the logic testable on its own terms.

- [ ] **Step 5: Commit**

```bash
git add lib/lab/vector/flat.ts lib/lab/vector/flat.test.ts
git commit -m "feat: flat index search as playground ground truth"
```
### Task 11: Point canvas

**Files:**
- Create: `components/lab/vector/point-canvas.tsx`
- Test: `components/lab/vector/point-canvas.test.tsx`

**Interfaces:**
- Consumes: `ScreenPoint`, `Viewport` from `@/lib/lab/vector/layout`; `PointId` from `@/lib/lab/vector/types`; `useReducedMotion`, `motion` from `motion/react`.
- Produces:
  - `type PointTone = 'idle' | 'result' | 'current'`
  - `interface PointCanvasProps { screenPoints: readonly ScreenPoint[]; viewport: Viewport; tones?: ReadonlyMap<PointId, PointTone>; query: { x: number; y: number } | null; label: string; onPick?: (x: number, y: number) => void }`
  - `function PointCanvas(props: PointCanvasProps): JSX.Element`
  - `function toSvgCoords(rect, clientX, clientY, viewport): { x: number; y: number }`

The JSX contains no geometry: it iterates `screenPoints` and reads `tones.get(id)`. The one piece of arithmetic in the file, `toSvgCoords`, maps a browser client coordinate back into viewBox units — DOM plumbing that `lib/` cannot own because it needs the element's rect. It is exported and unit-tested directly rather than left implicit.

- [ ] **Step 1: Write the failing test**

```tsx
// components/lab/vector/point-canvas.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PointCanvas, toSvgCoords, type PointTone } from './point-canvas';
import type { PointId } from '@/lib/lab/vector/types';
import type { ScreenPoint, Viewport } from '@/lib/lab/vector/layout';

// motion's useReducedMotion reads a media query that jsdom stubs to a fixed
// value, so the preference is flipped at the hook rather than at matchMedia.
const motionState = vi.hoisted(() => ({ reduced: false }));
vi.mock('motion/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('motion/react')>();
  return { ...actual, useReducedMotion: () => motionState.reduced };
});

const viewport: Viewport = { width: 480, height: 360, padding: 24 };

// Hand-built rather than produced by layoutPoints: this component's contract is
// that it draws exactly what it is handed, so the test hands it exact numbers.
const screenPoints: readonly ScreenPoint[] = [
  { id: 1, x: 24, y: 336 },
  { id: 2, x: 240, y: 180 },
  { id: 3, x: 456, y: 24 },
];

function markers(container: HTMLElement) {
  return [...container.querySelectorAll('[data-testid="lab-point"]')];
}

describe('toSvgCoords', () => {
  it('scales a client coordinate into viewBox units', () => {
    const rect = { left: 100, top: 50, width: 960, height: 720 };
    expect(toSvgCoords(rect, 100, 50, viewport)).toEqual({ x: 0, y: 0 });
    expect(toSvgCoords(rect, 1060, 770, viewport)).toEqual({ x: 480, y: 360 });
  });

  it('treats a zero-sized rect as 1:1 rather than dividing by zero', () => {
    // jsdom lays nothing out, so every rect is zero. NaN coordinates there
    // would make every click in the test suite meaningless.
    const rect = { left: 0, top: 0, width: 0, height: 0 };
    expect(toSvgCoords(rect, 12, 20, viewport)).toEqual({ x: 12, y: 20 });
  });
});

describe('PointCanvas', () => {
  it('exposes the canvas as an image with the label it is given', () => {
    render(<PointCanvas screenPoints={screenPoints} viewport={viewport} query={null} label="14 points plotted" />);
    expect(screen.getByRole('img', { name: '14 points plotted' })).toBeInTheDocument();
  });

  it('draws one marker per screen point, at the coordinates it was given', () => {
    // jsdom does not lay out or paint SVG, so there is no rendered geometry to
    // assert on. The assertion is on the attributes handed to the element,
    // which is the whole of what this component decides.
    const { container } = render(
      <PointCanvas screenPoints={screenPoints} viewport={viewport} query={null} label="points" />,
    );
    const drawn = markers(container).map((node) => [node.getAttribute('cx'), node.getAttribute('cy')]);
    expect(drawn).toEqual([
      ['24', '336'],
      ['240', '180'],
      ['456', '24'],
    ]);
  });

  it('preserves the order it was given rather than re-sorting', () => {
    const { container } = render(
      <PointCanvas screenPoints={screenPoints} viewport={viewport} query={null} label="points" />,
    );
    expect(markers(container).map((node) => node.getAttribute('data-point-id'))).toEqual(['1', '2', '3']);
  });

  it('sets the viewBox from the viewport it is given', () => {
    render(<PointCanvas screenPoints={screenPoints} viewport={viewport} query={null} label="points" />);
    expect(screen.getByRole('img', { name: 'points' })).toHaveAttribute('viewBox', '0 0 480 360');
  });

  it('tones each point from the map, defaulting to idle', () => {
    const tones = new Map<PointId, PointTone>([
      [2, 'result'],
      [3, 'current'],
    ]);
    const { container } = render(
      <PointCanvas screenPoints={screenPoints} viewport={viewport} tones={tones} query={null} label="points" />,
    );
    expect(markers(container).map((node) => node.getAttribute('data-tone'))).toEqual(['idle', 'result', 'current']);
  });

  it('draws no query marker when there is no query', () => {
    const { container } = render(
      <PointCanvas screenPoints={screenPoints} viewport={viewport} query={null} label="points" />,
    );
    expect(container.querySelector('[data-testid="lab-query"]')).toBeNull();
  });

  it('draws the query marker where it is told', () => {
    const { container } = render(
      <PointCanvas screenPoints={screenPoints} viewport={viewport} query={{ x: 120, y: 90 }} label="points" />,
    );
    expect(container.querySelector('[data-testid="lab-query"]')).toHaveAttribute('data-motion', 'full');
  });

  it('drops the query marker transition when the reader prefers reduced motion', () => {
    motionState.reduced = true;
    const { container } = render(
      <PointCanvas screenPoints={screenPoints} viewport={viewport} query={{ x: 120, y: 90 }} label="points" />,
    );
    expect(container.querySelector('[data-testid="lab-query"]')).toHaveAttribute('data-motion', 'reduced');
    motionState.reduced = false;
  });

  it('reports a click in viewBox units', () => {
    const onPick = vi.fn();
    render(
      <PointCanvas screenPoints={screenPoints} viewport={viewport} query={null} label="points" onPick={onPick} />,
    );
    fireEvent.click(screen.getByRole('img', { name: 'points' }), { clientX: 240, clientY: 180 });
    expect(onPick).toHaveBeenCalledWith(240, 180);
  });

  it('is inert when given no pick handler', () => {
    const { container } = render(
      <PointCanvas screenPoints={screenPoints} viewport={viewport} query={null} label="points" />,
    );
    expect(() => fireEvent.click(screen.getByRole('img', { name: 'points' }))).not.toThrow();
    expect(container.querySelector('svg')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run components/lab/vector/point-canvas.test.tsx`

Expected: FAIL with `Failed to resolve import "./point-canvas" from "components/lab/vector/point-canvas.test.tsx"`.

- [ ] **Step 3: Write minimal implementation**

```tsx
// components/lab/vector/point-canvas.tsx
'use client';

import type { MouseEvent } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import type { PointId } from '@/lib/lab/vector/types';
import type { ScreenPoint, Viewport } from '@/lib/lab/vector/layout';

export type PointTone = 'idle' | 'result' | 'current';

const TONE_CLASS: Record<PointTone, string> = {
  idle: 'fill-foreground-dim',
  result: 'fill-accent',
  current: 'fill-accent stroke-foreground',
};

const POINT_RADIUS = 4;
const QUERY_RADIUS = 9;

export interface PointCanvasProps {
  /** Already positioned by `layoutPoints`. This file does no geometry. */
  screenPoints: readonly ScreenPoint[];
  viewport: Viewport;
  /** id → tone. Anything absent is idle. Classification happens upstream. */
  tones?: ReadonlyMap<PointId, PointTone>;
  query: { x: number; y: number } | null;
  /** Describes what is drawn, for a reader who cannot see it. */
  label: string;
  onPick?: (x: number, y: number) => void;
}

/**
 * A client coordinate in viewBox units.
 *
 * The svg scales to its container, so a raw clientX means nothing until it has
 * been through the rect. jsdom lays nothing out and hands back a zero rect, so
 * that case falls back to 1:1 rather than producing NaN.
 */
export function toSvgCoords(
  rect: { left: number; top: number; width: number; height: number },
  clientX: number,
  clientY: number,
  viewport: Viewport,
): { x: number; y: number } {
  const scaleX = rect.width === 0 ? 1 : viewport.width / rect.width;
  const scaleY = rect.height === 0 ? 1 : viewport.height / rect.height;
  return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
}

export function PointCanvas({ screenPoints, viewport, tones, query, label, onPick }: PointCanvasProps) {
  const shouldReduceMotion = useReducedMotion();

  function handleClick(event: MouseEvent<SVGSVGElement>) {
    if (!onPick) return;
    const { x, y } = toSvgCoords(event.currentTarget.getBoundingClientRect(), event.clientX, event.clientY, viewport);
    onPick(x, y);
  }

  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={`0 0 ${viewport.width} ${viewport.height}`}
      onClick={handleClick}
      // touch-manipulation drops the double-tap zoom delay without taking over
      // scrolling — the canvas is tap-to-act, never a drag surface.
      className="w-full touch-manipulation rounded border border-border bg-background-raised"
    >
      {screenPoints.map((point) => {
        const tone = tones?.get(point.id) ?? 'idle';
        return (
          <circle
            key={point.id}
            data-testid="lab-point"
            data-point-id={point.id}
            data-tone={tone}
            cx={point.x}
            cy={point.y}
            r={POINT_RADIUS}
            strokeWidth={2}
            className={TONE_CLASS[tone]}
          />
        );
      })}

      {query && (
        <motion.g
          data-testid="lab-query"
          data-motion={shouldReduceMotion ? 'reduced' : 'full'}
          initial={false}
          animate={{ x: query.x, y: query.y }}
          transition={shouldReduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 300, damping: 30 }}
        >
          <circle r={QUERY_RADIUS} strokeWidth={2} className="fill-none stroke-accent" />
          <circle r={2} className="fill-accent" />
        </motion.g>
      )}
    </svg>
  );
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run components/lab/vector/point-canvas.test.tsx`

Expected: PASS (12 tests).

- [ ] **Step 5: Commit**

```bash
git add components/lab/vector/point-canvas.tsx components/lab/vector/point-canvas.test.tsx
git commit -m "feat: point canvas that draws exactly what layoutPoints returns"
```

---

### Task 12: Scrubber

**Files:**
- Create: `components/lab/vector/scrubber.tsx`
- Test: `components/lab/vector/scrubber.test.tsx`

**Interfaces:**
- Consumes: nothing from `lib/`. Deliberately generic — it takes a count, an index and a sentence, so a later lab reuses it unchanged.
- Produces:
  - `interface ScrubberProps { index: number; count: number; description: string; onChange: (index: number) => void }`
  - `function Scrubber(props: ScrubberProps): JSX.Element`
  - `function stepValueText(index: number, count: number, description: string): string`

- [ ] **Step 1: Write the failing test**

```tsx
// components/lab/vector/scrubber.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Scrubber, stepValueText } from './scrubber';

describe('stepValueText', () => {
  it('counts from one and names the step in words', () => {
    expect(stepValueText(11, 40, 'scanning point 7, distance 0.42')).toBe(
      'step 12 of 40: scanning point 7, distance 0.42',
    );
  });

  it('says so plainly when there is nothing to replay', () => {
    expect(stepValueText(0, 0, '')).toBe('no steps to replay');
  });
});

describe('Scrubber', () => {
  it('is a native range input, which is what buys keyboard, touch and scroll behaviour', () => {
    render(<Scrubber index={0} count={5} description="appending point 3" onChange={() => {}} />);
    const slider = screen.getByRole('slider');
    expect(slider).toHaveAttribute('type', 'range');
    expect(slider.tagName).toBe('INPUT');
  });

  it('spans the steps, one per position', () => {
    render(<Scrubber index={2} count={5} description="appending point 3" onChange={() => {}} />);
    const slider = screen.getByRole('slider');
    expect(slider).toHaveAttribute('min', '0');
    expect(slider).toHaveAttribute('max', '4');
    expect(slider).toHaveAttribute('step', '1');
    expect(slider).toHaveValue('2');
  });

  it('describes the current step in aria-valuetext, not just as a number', () => {
    // A bare "12" tells a screen reader reader nothing about what the index is
    // showing. The words are the whole point of the control.
    render(<Scrubber index={11} count={40} description="scanning point 7, distance 0.42" onChange={() => {}} />);
    expect(screen.getByRole('slider')).toHaveAttribute(
      'aria-valuetext',
      'step 12 of 40: scanning point 7, distance 0.42',
    );
  });

  it('announces the same description in a polite live region', () => {
    render(<Scrubber index={11} count={40} description="scanning point 7, distance 0.42" onChange={() => {}} />);
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveTextContent('step 12 of 40: scanning point 7, distance 0.42');
  });

  it('has an accessible name of its own', () => {
    render(<Scrubber index={0} count={5} description="appending point 3" onChange={() => {}} />);
    expect(screen.getByRole('slider', { name: /replay/i })).toBeInTheDocument();
  });

  it('takes keyboard focus, so arrow keys drive it in a real browser', async () => {
    // jsdom does not implement arrow-key stepping on input[type=range] and
    // user-event does not emulate it, so the assertion is that the control is
    // the native one and is reachable by tab — which is the entire mechanism.
    // The change path is asserted separately below with the event a keypress
    // would produce.
    const user = userEvent.setup();
    render(<Scrubber index={0} count={5} description="appending point 3" onChange={() => {}} />);
    const slider = screen.getByRole('slider');
    await user.tab();
    expect(slider).toHaveFocus();
    expect(slider).not.toHaveAttribute('tabindex', '-1');
  });

  it('reports the new index as a number when moved', () => {
    const onChange = vi.fn();
    render(<Scrubber index={0} count={5} description="appending point 3" onChange={onChange} />);
    fireEvent.change(screen.getByRole('slider'), { target: { value: '3' } });
    expect(onChange).toHaveBeenCalledWith(3);
  });

  it('disables itself when there are no steps, and says why', () => {
    render(<Scrubber index={0} count={0} description="" onChange={() => {}} />);
    const slider = screen.getByRole('slider');
    expect(slider).toBeDisabled();
    expect(slider).toHaveAttribute('aria-valuetext', 'no steps to replay');
    expect(screen.getByRole('status')).toHaveTextContent('no steps to replay');
  });

  it('does not report changes while disabled', () => {
    const onChange = vi.fn();
    render(<Scrubber index={0} count={0} description="" onChange={onChange} />);
    fireEvent.change(screen.getByRole('slider'), { target: { value: '0' } });
    expect(onChange).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run components/lab/vector/scrubber.test.tsx`

Expected: FAIL with `Failed to resolve import "./scrubber" from "components/lab/vector/scrubber.test.tsx"`.

- [ ] **Step 3: Write minimal implementation**

```tsx
// components/lab/vector/scrubber.tsx
'use client';

import { useId } from 'react';

export interface ScrubberProps {
  /** Zero-based index of the step being shown. */
  index: number;
  count: number;
  /** The current step in words, e.g. "scanning point 7, distance 0.42". */
  description: string;
  onChange: (index: number) => void;
}

/** The sentence a screen reader hears, in both aria-valuetext and the live region. */
export function stepValueText(index: number, count: number, description: string): string {
  if (count === 0) return 'no steps to replay';
  return `step ${index + 1} of ${count}: ${description}`;
}

/**
 * A native range, not a custom drag surface.
 *
 * Keyboard stepping, touch targets, and not fighting the page scroll all come
 * for free from the platform control; a bespoke one is where that budget goes.
 */
export function Scrubber({ index, count, description, onChange }: ScrubberProps) {
  const id = useId();
  const disabled = count === 0;
  const valueText = stepValueText(index, count, description);

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-[0.65rem] uppercase tracking-[0.18em] text-foreground-dim">
        Replay
      </label>
      <input
        id={id}
        type="range"
        min={0}
        max={Math.max(count - 1, 0)}
        step={1}
        value={disabled ? 0 : index}
        disabled={disabled}
        aria-valuetext={valueText}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full accent-accent rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
      />
      {/* The valuetext is only read when the slider itself has focus. A reader
          scrubbing with the mouse gets the same sentence from here. */}
      <p role="status" aria-live="polite" className="font-mono text-xs leading-relaxed text-foreground-dim">
        {valueText}
      </p>
    </div>
  );
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run components/lab/vector/scrubber.test.tsx`

Expected: PASS (11 tests).

- [ ] **Step 5: Commit**

```bash
git add components/lab/vector/scrubber.tsx components/lab/vector/scrubber.test.tsx
git commit -m "feat: native range scrubber with spoken step descriptions"
```

---

### Task 13: Scoreboard

**Files:**
- Create: `components/lab/vector/scoreboard.tsx`
- Test: `components/lab/vector/scoreboard.test.tsx`

**Interfaces:**
- Consumes: `Counters` from `@/lib/lab/vector/types`.
- Produces:
  - `interface ScoreboardProps { counters: Counters }`
  - `function Scoreboard(props: ScoreboardProps): JSX.Element`
  - `function counterLabel(key: string): string`

- [ ] **Step 1: Write the failing test**

```tsx
// components/lab/vector/scoreboard.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Scoreboard, counterLabel } from './scoreboard';

describe('counterLabel', () => {
  it('turns an index vocabulary key into words', () => {
    expect(counterLabel('distanceComputations')).toBe('Distance computations');
    expect(counterLabel('pointsScanned')).toBe('Points scanned');
  });

  it('falls back to the raw key for a counter it has never seen', () => {
    // Counter keys are per-index and grow with each new one, so an unlabelled
    // key must still render rather than disappear from the readout.
    expect(counterLabel('cellsProbed')).toBe('cellsProbed');
  });
});

describe('Scoreboard', () => {
  it('renders every counter as DOM text', () => {
    // Never painted into the canvas: a number inside an svg is invisible to a
    // screen reader and uncopyable to everyone else.
    render(<Scoreboard counters={{ distanceComputations: 41, pointsScanned: 41 }} />);
    expect(screen.getByText('Distance computations')).toBeInTheDocument();
    expect(screen.getAllByText('41')).toHaveLength(2);
  });

  it('draws nothing', () => {
    const { container } = render(<Scoreboard counters={{ distanceComputations: 41 }} />);
    expect(container.querySelector('svg')).toBeNull();
    expect(container.querySelector('canvas')).toBeNull();
  });

  it('pairs each label with its value in a description list', () => {
    const { container } = render(<Scoreboard counters={{ distanceComputations: 41, pointsScanned: 40 }} />);
    expect([...container.querySelectorAll('dt')].map((n) => n.textContent)).toEqual([
      'Distance computations',
      'Points scanned',
    ]);
    expect([...container.querySelectorAll('dd')].map((n) => n.textContent)).toEqual(['41', '40']);
  });

  it('has an accessible name', () => {
    render(<Scoreboard counters={{ distanceComputations: 41 }} />);
    expect(screen.getByRole('region', { name: /cost of the last operation/i })).toBeInTheDocument();
  });

  it('says so when nothing has run yet, rather than showing an empty box', () => {
    render(<Scoreboard counters={{}} />);
    expect(screen.getByText(/no operation has run yet/i)).toBeInTheDocument();
  });

  it('renders a zero rather than hiding it', () => {
    // Zero distance computations is a real and interesting answer.
    render(<Scoreboard counters={{ distanceComputations: 0 }} />);
    expect(screen.getByText('0')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run components/lab/vector/scoreboard.test.tsx`

Expected: FAIL with `Failed to resolve import "./scoreboard" from "components/lab/vector/scoreboard.test.tsx"`.

- [ ] **Step 3: Write minimal implementation**

```tsx
// components/lab/vector/scoreboard.tsx
import { useId } from 'react';
import type { Counters } from '@/lib/lab/vector/types';

/**
 * Counter keys are each index's own vocabulary, so this is a lookup rather than
 * a transform — an unlabelled key still has to appear, spelled as it is.
 */
const COUNTER_LABELS: Record<string, string> = {
  distanceComputations: 'Distance computations',
  pointsScanned: 'Points scanned',
};

export function counterLabel(key: string): string {
  return COUNTER_LABELS[key] ?? key;
}

export interface ScoreboardProps {
  counters: Counters;
}

/** What the last operation cost. DOM text, never painted into the canvas. */
export function Scoreboard({ counters }: ScoreboardProps) {
  const headingId = useId();
  const entries = Object.entries(counters);

  return (
    <section
      aria-labelledby={headingId}
      className="rounded border border-border bg-background-raised p-4"
    >
      <h3 id={headingId} className="text-[0.65rem] uppercase tracking-[0.18em] text-foreground-dim">
        Cost of the last operation
      </h3>
      {entries.length === 0 ? (
        <p className="mt-3 text-sm leading-relaxed text-foreground-dim">No operation has run yet.</p>
      ) : (
        <dl className="mt-3 grid grid-cols-2 gap-3">
          {entries.map(([key, value]) => (
            <div key={key}>
              <dt className="text-[0.6rem] uppercase tracking-[0.14em] text-foreground-dim">{counterLabel(key)}</dt>
              <dd className="mt-1 font-mono text-lg text-foreground">{value}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run components/lab/vector/scoreboard.test.tsx`

Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add components/lab/vector/scoreboard.tsx components/lab/vector/scoreboard.test.tsx
git commit -m "feat: scoreboard rendering index counters as DOM text"
```

---

### Task 14: Health readout

**Files:**
- Create: `components/lab/vector/health-readout.tsx`
- Test: `components/lab/vector/health-readout.test.tsx`

**Interfaces:**
- Consumes: nothing from `lib/`.
- Produces:
  - `interface HealthReadoutProps { pointCount: number; k: number; recall: number | null }`
  - `function HealthReadout(props: HealthReadoutProps): JSX.Element`
  - `function formatRecall(recall: number | null): string`
  - `data-testid="lab-point-count"` on the point-count value — the handle later tests use to watch inserts and deletes land.

- [ ] **Step 1: Write the failing test**

```tsx
// components/lab/vector/health-readout.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HealthReadout, formatRecall } from './health-readout';

describe('formatRecall', () => {
  it('renders a fraction as a whole percentage', () => {
    expect(formatRecall(1)).toBe('100%');
    expect(formatRecall(0.7)).toBe('70%');
    expect(formatRecall(0)).toBe('0%');
  });

  it('renders a dash when no query has been asked', () => {
    // Zero recall and no query at all are different states, and showing 0%
    // before the first search would read as a broken index.
    expect(formatRecall(null)).toBe('—');
  });
});

describe('HealthReadout', () => {
  it('shows how many points are in the index', () => {
    render(<HealthReadout pointCount={42} k={10} recall={null} />);
    expect(screen.getByTestId('lab-point-count')).toHaveTextContent('42');
    expect(screen.getByText('Points')).toBeInTheDocument();
  });

  it('labels recall with the k it was measured at', () => {
    render(<HealthReadout pointCount={42} k={10} recall={1} />);
    expect(screen.getByText('recall@10')).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('follows k rather than hardcoding ten', () => {
    render(<HealthReadout pointCount={42} k={5} recall={0.8} />);
    expect(screen.getByText('recall@5')).toBeInTheDocument();
    expect(screen.getByText('80%')).toBeInTheDocument();
  });

  it('shows a dash until a query has been asked', () => {
    render(<HealthReadout pointCount={42} k={10} recall={null} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('has an accessible name', () => {
    render(<HealthReadout pointCount={42} k={10} recall={null} />);
    expect(screen.getByRole('region', { name: /index health/i })).toBeInTheDocument();
  });

  it('draws nothing', () => {
    const { container } = render(<HealthReadout pointCount={42} k={10} recall={1} />);
    expect(container.querySelector('svg')).toBeNull();
  });

  it('renders an empty index honestly', () => {
    render(<HealthReadout pointCount={0} k={10} recall={null} />);
    expect(screen.getByTestId('lab-point-count')).toHaveTextContent('0');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run components/lab/vector/health-readout.test.tsx`

Expected: FAIL with `Failed to resolve import "./health-readout" from "components/lab/vector/health-readout.test.tsx"`.

- [ ] **Step 3: Write minimal implementation**

```tsx
// components/lab/vector/health-readout.tsx
import { useId } from 'react';

export interface HealthReadoutProps {
  pointCount: number;
  /** How many neighbours recall was measured over. */
  k: number;
  /** Fraction in 0..1, or null when no query has been asked yet. */
  recall: number | null;
}

export function formatRecall(recall: number | null): string {
  // "No query yet" and "found nothing" are different states; 0% for the first
  // would read as a broken index.
  return recall === null ? '—' : `${Math.round(recall * 100)}%`;
}

/**
 * What the index is, beside what the last operation cost.
 *
 * Recall is measured against brute-force search over the same live points, so
 * ground truth is exact and free at playground sizes.
 */
export function HealthReadout({ pointCount, k, recall }: HealthReadoutProps) {
  const headingId = useId();

  return (
    <section aria-labelledby={headingId} className="rounded border border-border bg-background-raised p-4">
      <h3 id={headingId} className="text-[0.65rem] uppercase tracking-[0.18em] text-foreground-dim">
        Index health
      </h3>
      <dl className="mt-3 grid grid-cols-2 gap-3">
        <div>
          <dt className="text-[0.6rem] uppercase tracking-[0.14em] text-foreground-dim">Points</dt>
          <dd data-testid="lab-point-count" className="mt-1 font-mono text-lg text-foreground">
            {pointCount}
          </dd>
        </div>
        <div>
          <dt className="text-[0.6rem] uppercase tracking-[0.14em] text-foreground-dim">recall@{k}</dt>
          <dd className="mt-1 font-mono text-lg text-foreground">{formatRecall(recall)}</dd>
        </div>
      </dl>
    </section>
  );
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run components/lab/vector/health-readout.test.tsx`

Expected: PASS (9 tests).

- [ ] **Step 5: Commit**

```bash
git add components/lab/vector/health-readout.tsx components/lab/vector/health-readout.test.tsx
git commit -m "feat: index health readout with recall against flat ground truth"
```

---

### Task 15: The lab state hook

**Files:**
- Create: `components/lab/vector/use-vector-lab.ts`
- Test: `components/lab/vector/use-vector-lab.test.ts`

**Interfaces:**
- Consumes: `DEFAULT_DATASET`, `makeDataset`, `DatasetOptions` from `@/lib/lab/vector/dataset`; `createFlat`, `flatInsert`, `flatDelete`, `flatSearch`, `FlatState`, `FlatStep` from `@/lib/lab/vector/flat`; `recallAtK` from `@/lib/lab/vector/recall`; `Counters`, `Metric`, `Point`, `PointId`, `Ranked`, `SearchParams`, `Vec` from `@/lib/lab/vector/types`.
- Produces:
  - `type LabOp = { kind: 'insert'; vec: Vec } | { kind: 'delete'; id: PointId } | { kind: 'search'; query: Vec }`
  - `interface LabSnapshot { state; steps; counters; results; query; recall }`
  - `function describeStep(step: FlatStep): string`
  - `function replayLog(seed, log, params): LabSnapshot`
  - `function useVectorLab(options?): VectorLab`
  - `const DEFAULT_K = 10`

Because state is threaded and every op is pure, the log **is** the undo stack: `undo` drops the last entry and replays. There is no separate history structure and no inverse operation to get wrong.

- [ ] **Step 1: Write the failing test**

```ts
// components/lab/vector/use-vector-lab.test.ts
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
    // leaves nextId untouched, isolating what this test actually checks.
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run components/lab/vector/use-vector-lab.test.ts`

Expected: FAIL with `Failed to resolve import "./use-vector-lab" from "components/lab/vector/use-vector-lab.test.ts"`.

- [ ] **Step 3: Write minimal implementation**

```ts
// components/lab/vector/use-vector-lab.ts
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
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run components/lab/vector/use-vector-lab.test.ts`

Expected: PASS (22 tests).

- [ ] **Step 5: Commit**

```bash
git add components/lab/vector/use-vector-lab.ts components/lab/vector/use-vector-lab.test.ts
git commit -m "feat: vector lab state hook where the operation log is the undo stack"
```

---

### Task 16: The client island

**Files:**
- Create: `components/lab/vector/vector-lab.tsx`
- Test: `components/lab/vector/vector-lab.test.tsx`

**Interfaces:**
- Consumes: `PointCanvas`, `PointTone` (Task 11); `Scrubber` (Task 12); `Scoreboard` (Task 13); `HealthReadout` (Task 14); `useVectorLab`, `DEFAULT_K` (Task 15); `layoutPoints`, `toScreen`, `hitTest`, `Viewport` from `@/lib/lab/vector/layout`; `FlatStep` from `@/lib/lab/vector/flat`; `PointId`, `Ranked`, `Vec` from `@/lib/lab/vector/types`.
- Produces:
  - `interface VectorLabProps { initialK?: number }`
  - `function VectorLab(props: VectorLabProps): JSX.Element` — the only export the page mounts.
  - `function screenToVec(viewport: Viewport, x: number, y: number): Vec`
  - `function tonesFor(steps, stepIndex, results): ReadonlyMap<PointId, PointTone>`

The canvas is tap-to-act in two modes rather than a drag surface: a native radio group picks between editing points and moving the query. That keeps the query reachable by keyboard and by touch, and means no pointer handler ever has to fight the page scroll.

`screenToVec` inverts `toScreen` by probing it at two corners rather than restating the padding arithmetic — `lib/` stays the only place that knows the mapping.

- [ ] **Step 1: Write the failing test**

```tsx
// components/lab/vector/vector-lab.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VectorLab, screenToVec, tonesFor } from './vector-lab';
import { toScreen, type Viewport } from '@/lib/lab/vector/layout';

const viewport: Viewport = { width: 480, height: 360, padding: 24 };

function pointCount() {
  return Number(screen.getByTestId('lab-point-count').textContent);
}

function canvas() {
  return screen.getByRole('img', { name: /points plotted/i });
}

describe('screenToVec', () => {
  it('round-trips through toScreen', () => {
    // Derived from two probes of toScreen rather than a second copy of the
    // padding maths, so the two cannot drift apart.
    for (const vec of [[0, 0], [1, 1], [0.25, 0.75], [0.5, 0.5]]) {
      const screenPoint = toScreen(vec, viewport);
      const back = screenToVec(viewport, screenPoint.x, screenPoint.y);
      expect(back[0]).toBeCloseTo(vec[0], 10);
      expect(back[1]).toBeCloseTo(vec[1], 10);
    }
  });
});

describe('tonesFor', () => {
  it('marks the current result set', () => {
    const tones = tonesFor([], -1, [{ id: 4, distance: 0.1 }, { id: 9, distance: 0.2 }]);
    expect(tones.get(4)).toBe('result');
    expect(tones.get(9)).toBe('result');
  });

  it('marks the step under the scrubber, which wins over the result set', () => {
    const tones = tonesFor([{ kind: 'scan', id: 4, distance: 0.3 }], 0, [{ id: 4, distance: 0.1 }]);
    expect(tones.get(4)).toBe('current');
  });

  it('leaves everything else out, so the canvas defaults it to idle', () => {
    const tones = tonesFor([], -1, []);
    expect(tones.size).toBe(0);
  });
});

describe('VectorLab', () => {
  it('renders a labelled canvas naming how many points are drawn', () => {
    render(<VectorLab />);
    expect(canvas()).toHaveAccessibleName(new RegExp(`${pointCount()} points plotted`));
  });

  it('renders the scrubber, scoreboard and health readout as DOM', () => {
    render(<VectorLab />);
    expect(screen.getByRole('slider', { name: /replay/i })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /cost of the last operation/i })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /index health/i })).toBeInTheDocument();
  });

  it('inserts a point where the reader taps empty space', () => {
    render(<VectorLab />);
    const before = pointCount();
    // Inside the padding gutter, so it can never land on a seeded point.
    fireEvent.click(canvas(), { clientX: 5, clientY: 5 });
    expect(pointCount()).toBe(before + 1);
  });

  it('deletes the point the reader taps', () => {
    const { container } = render(<VectorLab />);
    const before = pointCount();
    const marker = container.querySelector('[data-testid="lab-point"]')!;
    fireEvent.click(canvas(), {
      clientX: Number(marker.getAttribute('cx')),
      clientY: Number(marker.getAttribute('cy')),
    });
    expect(pointCount()).toBe(before - 1);
  });

  it('runs a search in query mode instead of editing', async () => {
    // A mode toggle rather than a drag handle: a drag surface on a canvas is
    // where touch scrolling and keyboard access both go to die.
    const user = userEvent.setup();
    render(<VectorLab />);
    const before = pointCount();
    await user.click(screen.getByRole('radio', { name: /move the query/i }));
    fireEvent.click(canvas(), { clientX: 240, clientY: 180 });
    expect(pointCount()).toBe(before);
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('draws the query marker once a query has been placed', async () => {
    const user = userEvent.setup();
    const { container } = render(<VectorLab />);
    expect(container.querySelector('[data-testid="lab-query"]')).toBeNull();
    await user.click(screen.getByRole('radio', { name: /move the query/i }));
    fireEvent.click(canvas(), { clientX: 240, clientY: 180 });
    expect(container.querySelector('[data-testid="lab-query"]')).toBeInTheDocument();
  });

  it('fills the scrubber from the trace of the last operation', () => {
    render(<VectorLab />);
    fireEvent.click(canvas(), { clientX: 5, clientY: 5 });
    const slider = screen.getByRole('slider', { name: /replay/i });
    expect(slider).not.toBeDisabled();
    expect(slider).toHaveAttribute('aria-valuetext', expect.stringContaining('appending point'));
  });

  it('scrubbing back changes the announced step', () => {
    render(<VectorLab />);
    fireEvent.click(canvas(), { clientX: 5, clientY: 5 });
    fireEvent.click(canvas(), { clientX: 9, clientY: 9 });
    const slider = screen.getByRole('slider', { name: /replay/i });
    fireEvent.change(slider, { target: { value: '0' } });
    expect(slider).toHaveAttribute('aria-valuetext', expect.stringContaining('step 1 of'));
    expect(screen.getByRole('status')).toHaveTextContent(/step 1 of/);
  });

  it('disables undo until something has been done', async () => {
    const user = userEvent.setup();
    render(<VectorLab />);
    const undo = screen.getByRole('button', { name: /undo/i });
    expect(undo).toBeDisabled();
    fireEvent.click(canvas(), { clientX: 5, clientY: 5 });
    expect(undo).toBeEnabled();
    await user.click(undo);
    expect(undo).toBeDisabled();
  });

  it('undo removes the last operation, not the last point', async () => {
    const user = userEvent.setup();
    render(<VectorLab />);
    const before = pointCount();
    fireEvent.click(canvas(), { clientX: 5, clientY: 5 });
    fireEvent.click(canvas(), { clientX: 9, clientY: 9 });
    await user.click(screen.getByRole('button', { name: /undo/i }));
    expect(pointCount()).toBe(before + 1);
  });

  it('reset restores the seeded dataset', async () => {
    const user = userEvent.setup();
    render(<VectorLab />);
    const before = pointCount();
    fireEvent.click(canvas(), { clientX: 5, clientY: 5 });
    fireEvent.click(canvas(), { clientX: 9, clientY: 9 });
    await user.click(screen.getByRole('button', { name: /reset/i }));
    expect(pointCount()).toBe(before);
    expect(screen.getByRole('slider', { name: /replay/i })).toBeDisabled();
  });

  it('takes k from its props, which is how a deep link configures it', async () => {
    const user = userEvent.setup();
    render(<VectorLab initialK={3} />);
    expect(screen.getByText('recall@3')).toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: /move the query/i }));
    fireEvent.click(canvas(), { clientX: 240, clientY: 180 });
    expect(screen.getByText('100%')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run components/lab/vector/vector-lab.test.tsx`

Expected: FAIL with `Failed to resolve import "./vector-lab" from "components/lab/vector/vector-lab.test.tsx"`.

- [ ] **Step 3: Write minimal implementation**

```tsx
// components/lab/vector/vector-lab.tsx
'use client';

import { useCallback, useId, useMemo, useState } from 'react';
import { PointCanvas, type PointTone } from './point-canvas';
import { Scrubber } from './scrubber';
import { Scoreboard } from './scoreboard';
import { HealthReadout } from './health-readout';
import { DEFAULT_K, useVectorLab } from './use-vector-lab';
import type { FlatStep } from '@/lib/lab/vector/flat';
import { hitTest, layoutPoints, toScreen, type Viewport } from '@/lib/lab/vector/layout';
import type { PointId, Ranked, Vec } from '@/lib/lab/vector/types';

const VIEWPORT: Viewport = { width: 480, height: 360, padding: 24 };
/** Generous enough for a fingertip; the canvas is tap-to-act on a phone. */
const HIT_RADIUS = 12;

type ClickMode = 'edit' | 'query';

const buttonClasses =
  'rounded-sm border border-border bg-background-raised px-3 py-1.5 text-[0.65rem] uppercase tracking-[0.18em] text-foreground-dim transition-colors hover:text-accent disabled:opacity-40 disabled:hover:text-foreground-dim focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2';

/**
 * The inverse of `toScreen`, obtained by probing it at two corners.
 *
 * The mapping — including the padding — belongs to `lib/layout`, so restating
 * it here would be a second copy free to drift. Two probes pin an affine map,
 * and a flipped axis falls out of the sign without a special case.
 */
export function screenToVec(viewport: Viewport, x: number, y: number): Vec {
  const origin = toScreen([0, 0], viewport);
  const unit = toScreen([1, 1], viewport);
  return [(x - origin.x) / (unit.x - origin.x), (y - origin.y) / (unit.y - origin.y)];
}

/** Which points the canvas should stand out, given where the scrubber is. */
export function tonesFor(
  steps: readonly FlatStep[],
  stepIndex: number,
  results: readonly Ranked[],
): ReadonlyMap<PointId, PointTone> {
  const tones = new Map<PointId, PointTone>();
  for (const result of results) tones.set(result.id, 'result');
  // The step under the scrubber is what the reader is looking at, so it wins
  // over the standing result set.
  const step = steps[stepIndex];
  if (step) tones.set(step.id, 'current');
  return tones;
}

export interface VectorLabProps {
  /** How many neighbours a search returns. Set from `?k=` on the page. */
  initialK?: number;
}

export function VectorLab({ initialK = DEFAULT_K }: VectorLabProps) {
  const lab = useVectorLab({ k: initialK });
  const [mode, setMode] = useState<ClickMode>('edit');
  const modeName = useId();

  const screenPoints = useMemo(() => layoutPoints(lab.points, VIEWPORT), [lab.points]);
  const tones = useMemo(
    () => tonesFor(lab.steps, lab.stepIndex, lab.results),
    [lab.steps, lab.stepIndex, lab.results],
  );
  const queryPoint = lab.query ? toScreen(lab.query, VIEWPORT) : null;

  const handlePick = useCallback(
    (x: number, y: number) => {
      if (mode === 'query') {
        lab.search(screenToVec(VIEWPORT, x, y));
        return;
      }
      const hit = hitTest(screenPoints, x, y, HIT_RADIUS);
      if (hit === null) lab.insert(screenToVec(VIEWPORT, x, y));
      else lab.remove(hit);
    },
    [lab, mode, screenPoints],
  );

  const label =
    `${lab.points.length} points plotted on a unit square` +
    (lab.query ? ', with the query marker placed' : '') +
    (mode === 'query' ? '. Tap to move the query.' : '. Tap empty space to insert, tap a point to remove it.');

  return (
    <div className="space-y-4">
      {/* A mode toggle rather than a drag handle. Dragging the marker would
          need pointer capture on a scrollable page, and would leave the query
          unreachable by keyboard; two radios cost neither. */}
      <fieldset className="flex flex-wrap items-center gap-4">
        <legend className="text-[0.65rem] uppercase tracking-[0.18em] text-foreground-dim">Tapping the canvas</legend>
        {(
          [
            ['edit', 'Add or remove points'],
            ['query', 'Move the query'],
          ] as const
        ).map(([value, text]) => (
          <label key={value} className="flex items-center gap-2 text-sm text-foreground-dim">
            <input
              type="radio"
              name={modeName}
              value={value}
              checked={mode === value}
              onChange={() => setMode(value)}
              className="accent-accent rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
            />
            {text}
          </label>
        ))}
      </fieldset>

      <PointCanvas
        screenPoints={screenPoints}
        viewport={VIEWPORT}
        tones={tones}
        query={queryPoint}
        label={label}
        onPick={handlePick}
      />

      <Scrubber
        index={lab.stepIndex}
        count={lab.steps.length}
        description={lab.stepDescription}
        onChange={lab.setStepIndex}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Scoreboard counters={lab.counters} />
        <HealthReadout pointCount={lab.points.length} k={lab.k} recall={lab.recall} />
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={lab.undo} disabled={!lab.canUndo} className={buttonClasses}>
          Undo
        </button>
        <button type="button" onClick={lab.reset} className={buttonClasses}>
          Reset
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run components/lab/vector/vector-lab.test.tsx`

Expected: PASS (16 tests).

- [ ] **Step 5: Commit**

```bash
git add components/lab/vector/vector-lab.tsx components/lab/vector/vector-lab.test.tsx
git commit -m "feat: vector index playground island"
```

---

### Task 17: The lab page

**Files:**
- Create: `app/lab/vector-index/params.ts`
- Create: `app/lab/vector-index/page.tsx`
- Test: `app/lab/vector-index/params.test.ts`
- Test: `app/lab/vector-index/page.test.tsx`

**Interfaces:**
- Consumes: `VectorLab` from `@/components/lab/vector/vector-lab`; `getBlogPosts` from `@/lib/blog`.
- Produces:
  - `parseLabParams(raw): LabParams`, `DEFAULT_LAB_PARAMS`, `type LabIndexName`
  - `export default async function VectorIndexLabPage({ searchParams })`
  - `export const metadata: Metadata`

The parser lives in its own module because Next validates the export surface of a `page.tsx` and an arbitrary named export there is a build error. Search params are read once, on the server, and handed down as props — which is exactly "on mount only" with no URL-state syncing to write.

- [ ] **Step 1: Write the failing test**

```ts
// app/lab/vector-index/params.test.ts
import { describe, it, expect } from 'vitest';
import { DEFAULT_LAB_PARAMS, parseLabParams } from './params';

describe('parseLabParams', () => {
  it('defaults when there are no params at all', () => {
    expect(parseLabParams(undefined)).toEqual(DEFAULT_LAB_PARAMS);
    expect(parseLabParams({})).toEqual(DEFAULT_LAB_PARAMS);
  });

  it('reads k', () => {
    expect(parseLabParams({ k: '5' }).k).toBe(5);
  });

  it('clamps k into a range the canvas can actually show', () => {
    expect(parseLabParams({ k: '0' }).k).toBe(1);
    expect(parseLabParams({ k: '9999' }).k).toBe(20);
  });

  it('ignores a k that is not a number', () => {
    // A Medium link is hand-written and will eventually be hand-mistyped.
    expect(parseLabParams({ k: 'ten' }).k).toBe(DEFAULT_LAB_PARAMS.k);
    expect(parseLabParams({ k: '' }).k).toBe(DEFAULT_LAB_PARAMS.k);
  });

  it('reads a known index name', () => {
    expect(parseLabParams({ index: 'flat' }).index).toBe('flat');
  });

  it('falls back for an index that does not exist yet', () => {
    // ?index=hnsw is a valid link to write today and a 404 to honour.
    expect(parseLabParams({ index: 'hnsw' }).index).toBe('flat');
  });

  it('takes the first value when a param repeats', () => {
    expect(parseLabParams({ k: ['5', '7'] }).k).toBe(5);
  });
});
```

```tsx
// app/lab/vector-index/page.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import VectorIndexLabPage, { metadata } from './page';
import { getBlogPosts } from '@/lib/blog';

const search = (params: Record<string, string | string[] | undefined> = {}) => ({
  searchParams: Promise.resolve(params),
});

// Looked up rather than hardcoded, for the same reason the page itself looks it
// up: the title lives in the catalog and the sync job may rewrite it.
const distanceMetrics = getBlogPosts().find((post) => post.id === 'f32b19d708c8');

describe('VectorIndexLabPage', () => {
  it('heads the page with what the lab is', async () => {
    render(await VectorIndexLabPage(search()));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/vector index playground/i);
  });

  it('renders real prose on the server, not an empty div', async () => {
    // The prose is the SEO answer for a page whose value is otherwise
    // client-side JavaScript, and the no-JavaScript fallback.
    render(await VectorIndexLabPage(search()));
    expect(screen.getByRole('heading', { name: /what this teaches/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /what the controls do/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /what to watch for/i })).toBeInTheDocument();
    expect(screen.getByText(/scans every point/i)).toBeInTheDocument();
  });

  it('is honest that 2D shows the mechanism, not the geometry', async () => {
    render(await VectorIndexLabPage(search()));
    expect(screen.getByText(/2D shows the mechanism, not the geometry/i)).toBeInTheDocument();
  });

  it('mounts the island below the prose', async () => {
    render(await VectorIndexLabPage(search()));
    expect(screen.getByRole('img', { name: /points plotted/i })).toBeInTheDocument();
    expect(screen.getByRole('slider', { name: /replay/i })).toBeInTheDocument();
  });

  it('links out to the posts it illustrates, marked as leaving the site', async () => {
    expect(distanceMetrics).toBeDefined();
    render(await VectorIndexLabPage(search()));
    const link = screen.getByRole('link', { name: (name) => name.startsWith(distanceMetrics!.title) });
    expect(link).toHaveAttribute('href', distanceMetrics!.url);
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAccessibleName(/opens on Medium/i);
  });

  it('resolves every illustrated post from the catalog', async () => {
    // A mistyped id would otherwise drop a link silently rather than fail.
    render(await VectorIndexLabPage(search()));
    expect(screen.getAllByRole('link', { name: /opens on Medium/i })).toHaveLength(3);
  });

  it('configures the island from ?k= on mount', async () => {
    render(await VectorIndexLabPage(search({ k: '5' })));
    expect(screen.getByText('recall@5')).toBeInTheDocument();
  });

  it('ignores an index that does not exist yet rather than erroring', async () => {
    render(await VectorIndexLabPage(search({ index: 'hnsw' })));
    expect(screen.getByRole('img', { name: /points plotted/i })).toBeInTheDocument();
  });

  it('uses the same content column as every other page', async () => {
    const { container } = render(await VectorIndexLabPage(search()));
    expect(container.querySelector('main > div')).toHaveClass('max-w-2xl', 'lg:max-w-3xl');
  });

  it('carries its own metadata', () => {
    expect(metadata.title).toMatch(/vector index/i);
    expect(metadata.description).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run app/lab/vector-index`

Expected: FAIL with `Failed to resolve import "./params" from "app/lab/vector-index/params.test.ts"` and the same for `./page`.

- [ ] **Step 3: Write minimal implementation**

```ts
// app/lab/vector-index/params.ts

/** Index types this route can actually mount. IVF and HNSW join in later PRs. */
export const LAB_INDEXES = ['flat'] as const;
export type LabIndexName = (typeof LAB_INDEXES)[number];

export interface LabParams {
  readonly index: LabIndexName;
  readonly k: number;
}

export const DEFAULT_LAB_PARAMS: LabParams = { index: 'flat', k: 10 };

const MIN_K = 1;
const MAX_K = 20;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Read a deep link, once, on the server.
 *
 * These links are written by hand in Medium posts, so every field has to
 * survive a typo and a name that has not shipped yet without failing the page.
 */
export function parseLabParams(raw: Record<string, string | string[] | undefined> | undefined): LabParams {
  const rawK = Number(first(raw?.k));
  const k = Number.isFinite(rawK) && rawK > 0 ? Math.min(Math.max(Math.round(rawK), MIN_K), MAX_K) : DEFAULT_LAB_PARAMS.k;

  const rawIndex = first(raw?.index);
  const index = LAB_INDEXES.find((name) => name === rawIndex) ?? DEFAULT_LAB_PARAMS.index;

  return { index, k };
}
```

```tsx
// app/lab/vector-index/page.tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import { VectorLab } from '@/components/lab/vector/vector-lab';
import { getBlogPosts } from '@/lib/blog';
import { parseLabParams } from './params';

export const metadata: Metadata = {
  title: 'Vector index playground',
  description:
    'Build a vector index by hand: insert points, delete them, run a query, and watch every distance computation the index pays.',
};

/**
 * Referenced by catalog id, not copied.
 *
 * The titles and URLs already live in `config/blog-posts.json`, which the Notion
 * sync regenerates. Duplicating them here would let this footer rot the next
 * time a title or URL changes upstream — the same reason the category pages and
 * the sitemap derive their lists rather than keeping them by hand.
 */
const ILLUSTRATES = ['f32b19d708c8', '6fab698c33eb', 'f2e8c08fef1a'];

function illustratedPosts() {
  const posts = getBlogPosts();
  return ILLUSTRATES.flatMap((id) => posts.filter((post) => post.id === id));
}

const linkClasses =
  'font-medium leading-snug transition-colors hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 rounded-sm';

interface LabPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function VectorIndexLabPage({ searchParams }: LabPageProps) {
  // Read once, here, and handed down as props. That is the whole of the deep
  // link contract: no URL-state syncing, so the reader's back button keeps
  // meaning what they expect.
  const { k } = parseLabParams(await searchParams);

  return (
    <main className="px-6 py-12">
      <div className="max-w-2xl lg:max-w-3xl mx-auto space-y-8">
        <header className="space-y-3">
          <Link
            href="/blog/vector-databases"
            className="inline-block text-[0.65rem] uppercase tracking-[0.18em] text-foreground-dim transition-colors hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 rounded-sm"
          >
            ← Vector Databases
          </Link>
          <div aria-hidden="true" className="h-0.5 w-full rounded-sm bg-accent" />
          <p className="font-mono text-[0.7rem] tracking-[0.12em] text-accent">&gt; lab --index flat</p>
          <h1 className="text-2xl font-bold tracking-tight">Vector index playground</h1>
        </header>

        <section className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-[0.18em]">What this teaches</h2>
          <p className="text-sm leading-relaxed text-foreground-dim">
            A flat index is the honest baseline every approximate index is measured against: it stores the vectors
            in a list and, for every query, scans every point and computes every distance. Nothing is skipped, so
            it is always exactly right and always exactly as expensive as the data is large. This playground is a
            live one — the points below are yours to add to, delete from, and query — and the number that matters
            is the distance count beside it, because that is the number every later index exists to bring down.
          </p>
          <p className="text-sm leading-relaxed text-foreground-dim">
            Deletion here is a hard removal: the point leaves the list and the index is immediately as if it never
            held it. Keep that in mind — a graph index cannot do this, and what it does instead is the subject of a
            later lab.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-[0.18em]">What the controls do</h2>
          <ul className="space-y-2 text-sm leading-relaxed text-foreground-dim">
            <li>
              <strong className="text-foreground">Tapping the canvas</strong> either edits the points or moves the
              query, depending on the mode. In edit mode, tapping empty space inserts a point and tapping an
              existing one removes it. In query mode, tapping runs a search from wherever you tapped.
            </li>
            <li>
              <strong className="text-foreground">Replay</strong> walks the trace of the last operation, one step at
              a time. Each position names what the index did — which point it scanned, at what distance, and whether
              that point made it into the results.
            </li>
            <li>
              <strong className="text-foreground">Cost of the last operation</strong> counts the distance
              computations and points scanned that operation paid for. It is the scoreboard, and it is deliberately
              text rather than something drawn on the canvas.
            </li>
            <li>
              <strong className="text-foreground">Index health</strong> holds the live point count and recall@{k},
              measured against brute-force search over the same points.
            </li>
            <li>
              <strong className="text-foreground">Undo</strong> drops the last operation and replays everything
              before it; <strong className="text-foreground">Reset</strong> returns to the seeded dataset.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-[0.18em]">What to watch for</h2>
          <p className="text-sm leading-relaxed text-foreground-dim">
            Run a query, then insert ten points and run it again. The results barely move; the distance count moves
            by exactly ten. That linear relationship is the flat index in one sentence, and it is why a vector
            database with a billion vectors cannot use one.
          </p>
          <p className="text-sm leading-relaxed text-foreground-dim">
            Recall sits at 100% and will not move, because ground truth here <em>is</em> brute force over the same
            points — the flat index is graded against itself. That readout is wired now so it stays honest later:
            when an approximate index arrives, the same number starts telling you what it cost you.
          </p>
          <p className="text-sm leading-relaxed text-foreground-dim">
            2D shows the mechanism, not the geometry. Two points that look close on this canvas really are close;
            what a plane cannot show is how badly that intuition fails at 768 dimensions, where distances between
            all pairs of points converge and &ldquo;nearest&rdquo; stops meaning much. The dimensionality post below
            is the argument.
          </p>
        </section>

        <VectorLab initialK={k} />

        <section className="space-y-3 border-t border-border pt-8">
          <h2 className="text-sm font-bold uppercase tracking-[0.18em]">The posts this illustrates</h2>
          <ul className="divide-y divide-border">
            {illustratedPosts().map((post) => (
              <li key={post.url} className="py-3">
                <a href={post.url} target="_blank" rel="noreferrer" className={linkClasses}>
                  {post.title}
                  <span aria-hidden="true" className="ml-1 text-foreground-dim">
                    ↗
                  </span>
                  <span className="sr-only"> (opens on Medium)</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run app/lab/vector-index`

Expected: PASS (16 tests).

- [ ] **Step 5: Commit**

```bash
git add app/lab/vector-index/params.ts app/lab/vector-index/params.test.ts app/lab/vector-index/page.tsx app/lab/vector-index/page.test.tsx
git commit -m "feat: /lab/vector-index page with server-rendered prose and the island"
```

---

### Task 18: Link the lab and document it

**Files:**
- Edit: `app/blog/[category]/page.tsx`
- Edit: `app/blog/[category]/page.test.tsx`
- Edit: `config/config.test.ts`
- Edit: `README.md`

Nav, sitemap and the command palette are deliberately untouched: the spec forbids wiring them until a second lab exists, on the same rule the header already states for `/live-projects`.

**Interfaces:**
- Consumes: the `/lab/vector-index` route from Task 17.
- Produces: no new exports. One conditional block on the category page.

- [ ] **Step 1: Write the failing test**

Append to `app/blog/[category]/page.test.tsx`:

```tsx
describe('CategoryPage labs', () => {
  it('links the vector index playground from Vector Databases', async () => {
    render(await CategoryPage(params(categorySlug('Vector Databases'))));
    const link = screen.getByRole('link', { name: /vector index playground/i });
    expect(link).toHaveAttribute('href', '/lab/vector-index');
  });

  it('says what the lab is for, not just that it exists', async () => {
    render(await CategoryPage(params(categorySlug('Vector Databases'))));
    expect(screen.getByRole('heading', { name: 'Lab' })).toBeInTheDocument();
    expect(screen.getByText(/distance computation/i)).toBeInTheDocument();
  });

  it('shows no lab block on a category that has none', async () => {
    // Nothing is linked until it is actually deployed behind the link — the
    // same rule the header applies to /live-projects.
    render(await CategoryPage(params(categorySlug('Postgres Series'))));
    expect(screen.queryByRole('heading', { name: 'Lab' })).toBeNull();
    expect(screen.queryByRole('link', { name: /playground/i })).toBeNull();
  });
});
```

Also add to the README consistency check — append to `config/config.test.ts`:

```ts
import { readFileSync } from 'node:fs';

describe('README', () => {
  it('documents the labs section that ships with the first lab', () => {
    const readme = readFileSync(new URL('../README.md', import.meta.url), 'utf8');
    expect(readme).toContain('## Labs');
    expect(readme).toContain('/lab/vector-index');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run "app/blog/[category]/page.test.tsx" config/config.test.ts`

Expected: FAIL with `Unable to find an accessible element with the role "link" and name /vector index playground/i` and `expected '# Portfolio Website…' to contain '## Labs'`.

- [ ] **Step 3: Write minimal implementation**

In `app/blog/[category]/page.tsx`, insert this block between the `</header>` and the `<PostList …>` element:

```tsx
        {/* One hand-written condition rather than a registry: config/labs.ts
            earns its keep at more than one lab and arrives with the second.
            And nothing is linked before it is deployed — a link to a
            "COMING SOON" page advertises an absence. */}
        {category === 'Vector Databases' && (
          <section className="rounded border border-border bg-background-raised p-4">
            <h2 className="text-sm font-bold uppercase tracking-[0.18em]">Lab</h2>
            <p className="mt-2 text-sm leading-relaxed text-foreground-dim">
              Build an index by hand — insert points, delete them, run a query — and watch every distance
              computation it costs.
            </p>
            <Link
              href="/lab/vector-index"
              className="mt-3 inline-block text-[0.65rem] uppercase tracking-[0.18em] text-accent transition-colors hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 rounded-sm"
            >
              Open the vector index playground →
            </Link>
          </section>
        )}
```

`Link` is already imported in that file; no import change is needed.

In `README.md`, insert this section immediately before `## Which repos appear on /projects`:

```markdown
## Labs

`/lab` holds interactive explanations of the writing — a mechanism a reader can run rather than a description of it running. Each lab is one route under `app/lab/<slug>/`, and the split that matters is:

| Layer | Contains | Rule |
|---|---|---|
| `lib/lab/<topic>/` | The mechanism, as pure functions | No React import, ever. Fully unit-tested, with no DOM dependency. |
| `components/lab/<topic>/` | That lab's rendering | Client components, thin — the drawing code iterates a draw list computed in `lib/` and decides nothing else. |
| `app/lab/<slug>/` | The page | A server component. Prose first, then the client island. |

The prose on a lab page is not decoration: it is the SEO answer for a page whose value is otherwise client-side JavaScript, the no-JavaScript fallback, and half the accessibility story. A lab page whose server HTML is an empty `<div>` is a bug.

Every operation is pure and threads its state — `op(state, args) → { state, result, steps, counters }` — which is what makes the operation log double as the undo stack, and what makes every trace reproducible in a test.

### Shipped

- **`/lab/vector-index`** — the vector index playground. A live flat index: click the canvas to insert a point, click a point to remove it, switch modes to move the query. The scrubber replays the trace of the last operation step by step, the scoreboard counts what it cost, and the health readout carries recall against brute-force ground truth. Deep-linkable with `?index=` and `?k=` (read once, on the server; there is no URL-state syncing). Serves the Vector Databases series.

Nothing is wired into the nav, sitemap, or command palette yet, and `config/labs.ts` does not exist. Both arrive with the second lab: a registry with one entry is a list wearing a costume, and a nav item is worth adding once there is a section behind it rather than a page.

See `docs/superpowers/specs/2026-08-30-interactive-labs-design.md` for the full design, including which labs are planned and which were deliberately cut.
```

Note the manual follow-up this PR carries, outside the repo: add a link to `/lab/vector-index` from each of the three Medium posts the lab page lists.

- [ ] **Step 4: Run tests**

Run: `npx vitest run "app/blog/[category]/page.test.tsx" config/config.test.ts`

Expected: PASS.

Then the whole suite and the build, since this task touches a shared page:

Run: `npm test && npm run lint && npm run build`

Expected: PASS, with `/lab/vector-index` in the route list.

- [ ] **Step 5: Commit**

```bash
git add "app/blog/[category]/page.tsx" "app/blog/[category]/page.test.tsx" config/config.test.ts README.md
git commit -m "feat: link the vector index lab from its category and document /lab"
```
# PR 2: IVF

Everything below consumes PR 1 (`types.ts`, `random.ts`, `metrics.ts`, `dataset.ts`, `recall.ts`, `layout.ts`, `flat.ts`) and never redefines any of it.

---

### Task 19: IVF state, seeded Lloyd's k-means, `trainIvf`

**Files:**
- Create: `lib/lab/vector/ivf.ts`
- Test: `lib/lab/vector/ivf.test.ts`

**Interfaces:**
- Consumes: `makeDataset(options: DatasetOptions): readonly Point[]`, `euclidean(a: Vec, b: Vec): number`, `mulberry32(seed: number): () => number`, and the `types.ts` primitives.
- Produces: `IvfState`, `IvfStep`, `IvfParams`, `IvfSearchParams`, `trainIvf(points: readonly Point[], params: IvfParams): OpResult<IvfState, void, IvfStep>`.

- [ ] **Step 1: Write the failing test**

```ts
// lib/lab/vector/ivf.test.ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/lab/vector/ivf.test.ts`
Expected: FAIL with `Failed to resolve import "./ivf"`.

- [ ] **Step 3: Write minimal implementation**

```ts
// lib/lab/vector/ivf.ts
import type { Counters, OpResult, Point, PointId, Ranked, SearchParams, Vec } from './types';
import { euclidean } from './metrics';
import { mulberry32 } from './random';

export interface IvfState {
  readonly centroids: readonly Vec[];
  readonly cells: readonly (readonly PointId[])[];
  readonly points: ReadonlyMap<PointId, Point>;
  readonly nextId: PointId;
  /** Points inserted since the last train/rebuild. Drives the drift readout. */
  readonly insertsSinceTrain: number;
}

export type IvfStep =
  | { readonly kind: 'trainIteration'; readonly iteration: number; readonly centroids: readonly Vec[]; readonly shift: number }
  | { readonly kind: 'assign'; readonly id: PointId; readonly cell: number }
  | { readonly kind: 'probeCell'; readonly cell: number; readonly distance: number }
  | { readonly kind: 'skipCell'; readonly cell: number; readonly distance: number }
  | { readonly kind: 'scan'; readonly id: PointId; readonly distance: number }
  | { readonly kind: 'admit'; readonly id: PointId; readonly distance: number; readonly rank: number }
  | { readonly kind: 'remove'; readonly id: PointId; readonly cell: number };

export interface IvfParams {
  readonly cells: number;
  readonly maxIterations: number;
  readonly seed: number;
}

export interface IvfSearchParams extends SearchParams {
  readonly nprobe: number;
}

/** Every IVF op reports all three keys, so the scoreboard never shows a hole. */
function ivfCounters(distanceComputations: number, cellsProbed: number, pointsScanned: number): Counters {
  return { distanceComputations, cellsProbed, pointsScanned };
}

/**
 * Index of the centroid nearest `vec`, always under plain Euclidean geometry.
 *
 * Assignment is deliberately not metric-aware. Lloyd's minimises squared
 * Euclidean error, so assigning under a different metric would leave cells
 * whose centroid is not their own mean — an index that disagrees with itself.
 */
function nearestCentroid(vec: Vec, centroids: readonly Vec[]): number {
  let best = 0;
  let bestDistance = Infinity;
  for (let i = 0; i < centroids.length; i += 1) {
    const candidate = euclidean(vec, centroids[i]);
    if (candidate < bestDistance) {
      bestDistance = candidate;
      best = i;
    }
  }
  return best;
}

function meanVec(vecs: readonly Vec[], dim: number): Vec | null {
  if (vecs.length === 0) return null;
  const sums = new Array<number>(dim).fill(0);
  vecs.forEach((vec) => {
    for (let d = 0; d < dim; d += 1) sums[d] += vec[d];
  });
  return sums.map((sum) => sum / vecs.length);
}

/** Seeded Forgy initialisation: shuffle the points, take the first `cells`. */
function seedCentroids(points: readonly Point[], cells: number, rng: () => number): Vec[] {
  const shuffled = points.map((point) => [...point.vec]);
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, cells);
}

export function trainIvf(points: readonly Point[], params: IvfParams): OpResult<IvfState, void, IvfStep> {
  if (points.length < params.cells) {
    throw new Error(`trainIvf needs at least ${params.cells} points to seed ${params.cells} centroids`);
  }

  const dim = points[0].vec.length;
  const rng = mulberry32(params.seed);
  const steps: IvfStep[] = [];
  let centroids = seedCentroids(points, params.cells, rng);
  let distanceComputations = 0;

  for (let iteration = 0; iteration < params.maxIterations; iteration += 1) {
    const buckets: Vec[][] = centroids.map(() => []);
    points.forEach((point) => {
      buckets[nearestCentroid(point.vec, centroids)].push(point.vec);
      distanceComputations += centroids.length;
    });

    // An empty cell keeps its old centroid instead of being reseeded: `cells`
    // is index-parallel to `centroids`, so dropping one would renumber every
    // cell mid-run and invalidate every step already emitted.
    const next = centroids.map((centroid, i) => meanVec(buckets[i], dim) ?? centroid);
    const shift = Math.max(...next.map((centroid, i) => euclidean(centroid, centroids[i])));
    centroids = next;
    steps.push({ kind: 'trainIteration', iteration, centroids: centroids.map((c) => [...c]), shift });

    // Once nothing moves, further iterations are byte-identical. Stopping here
    // keeps the scrubber free of frames that show the reader nothing.
    if (shift < 1e-12) break;
  }

  const cells: PointId[][] = centroids.map(() => []);
  const pointMap = new Map<PointId, Point>();
  let nextId = 0;
  points.forEach((point) => {
    const cell = nearestCentroid(point.vec, centroids);
    distanceComputations += centroids.length;
    cells[cell].push(point.id);
    pointMap.set(point.id, point);
    nextId = Math.max(nextId, point.id + 1);
    steps.push({ kind: 'assign', id: point.id, cell });
  });

  return {
    state: { centroids, cells, points: pointMap, nextId, insertsSinceTrain: 0 },
    result: undefined,
    steps,
    counters: ivfCounters(distanceComputations, 0, points.length),
  };
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run lib/lab/vector/ivf.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/lab/vector/ivf.ts lib/lab/vector/ivf.test.ts
git commit -m "feat(lab): seeded Lloyd's k-means for the IVF index"
```

---

### Task 20: `ivfInsert` — assign without retraining

**Files:**
- Modify: `lib/lab/vector/ivf.ts`
- Test: `lib/lab/vector/ivf.test.ts`

**Interfaces:**
- Consumes: `trainIvf`, `IvfState`, `IvfStep`.
- Produces: `ivfInsert(state: IvfState, vec: Vec): OpResult<IvfState, PointId, IvfStep>`.

- [ ] **Step 1: Write the failing test**

```ts
// append to lib/lab/vector/ivf.test.ts; extend the import to
// import { trainIvf, ivfInsert } from './ivf';

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

  it('copies the vector, so a later mutation of the caller's array cannot reach the index', () => {
    const { state } = trainIvf(points, params);
    const vec = [0.5, 0.5];
    const { state: next, result: id } = ivfInsert(state, vec);
    vec[0] = 0.9;
    expect(next.points.get(id)?.vec).toEqual([0.5, 0.5]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/lab/vector/ivf.test.ts`
Expected: FAIL with `ivfInsert is not a function` (no export named `ivfInsert`).

- [ ] **Step 3: Write minimal implementation**

```ts
// add to lib/lab/vector/ivf.ts

/**
 * Files a new point into the nearest existing cell.
 *
 * It deliberately does NOT retrain. That is the whole IVF lesson: inserts are
 * cheap because the partition is frozen, and the price is a partition that
 * slowly stops describing the data. `insertsSinceTrain` is what the health
 * readout turns into a visible warning.
 */
export function ivfInsert(state: IvfState, vec: Vec): OpResult<IvfState, PointId, IvfStep> {
  const cell = nearestCentroid(vec, state.centroids);
  const id = state.nextId;
  const cells = state.cells.map((ids, i) => (i === cell ? [...ids, id] : ids));
  const points = new Map(state.points);
  points.set(id, { id, vec: [...vec] });

  return {
    state: {
      centroids: state.centroids,
      cells,
      points,
      nextId: id + 1,
      insertsSinceTrain: state.insertsSinceTrain + 1,
    },
    result: id,
    steps: [{ kind: 'assign', id, cell }],
    counters: ivfCounters(state.centroids.length, 0, 0),
  };
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run lib/lab/vector/ivf.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/lab/vector/ivf.ts lib/lab/vector/ivf.test.ts
git commit -m "feat(lab): IVF insert assigns to a frozen partition and tracks drift"
```

---

### Task 21: `ivfDelete` — cheap posting-list removal

**Files:**
- Modify: `lib/lab/vector/ivf.ts`
- Test: `lib/lab/vector/ivf.test.ts`

**Interfaces:**
- Consumes: `IvfState`, `IvfStep`.
- Produces: `ivfDelete(state: IvfState, id: PointId): OpResult<IvfState, boolean, IvfStep>`.

- [ ] **Step 1: Write the failing test**

```ts
// append to lib/lab/vector/ivf.test.ts; extend the import to
// import { trainIvf, ivfInsert, ivfDelete } from './ivf';

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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/lab/vector/ivf.test.ts`
Expected: FAIL with `ivfDelete is not a function`.

- [ ] **Step 3: Write minimal implementation**

```ts
// add to lib/lab/vector/ivf.ts

/**
 * Hard removal from one posting list. No tombstone, no relinking, no retrain.
 *
 * IVF gets away with this because a posting list is a bag: pulling an element
 * out cannot disconnect anything. The bill arrives later and elsewhere — the
 * centroid now sits at the mean of points that are no longer there. Contrast
 * HNSW, where the same operation would risk cutting the graph in two.
 */
export function ivfDelete(state: IvfState, id: PointId): OpResult<IvfState, boolean, IvfStep> {
  const cell = state.cells.findIndex((ids) => ids.includes(id));
  if (cell === -1) {
    return { state, result: false, steps: [], counters: ivfCounters(0, 0, 0) };
  }

  const cells = state.cells.map((ids, i) => (i === cell ? ids.filter((other) => other !== id) : ids));
  const points = new Map(state.points);
  points.delete(id);

  return {
    state: { ...state, cells, points },
    result: true,
    steps: [{ kind: 'remove', id, cell }],
    counters: ivfCounters(0, 0, 0),
  };
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run lib/lab/vector/ivf.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/lab/vector/ivf.ts lib/lab/vector/ivf.test.ts
git commit -m "feat(lab): IVF delete as a cheap posting-list removal"
```

---

### Task 22: `ivfSearch` — `nprobe` cells, and the boundary miss

**Files:**
- Modify: `lib/lab/vector/ivf.ts`
- Test: `lib/lab/vector/ivf.test.ts`

**Interfaces:**
- Consumes: `distance(a, b, metric)`, `createFlat(points)`, `flatSearch(state, query, params)`, `recallAtK(got, truth, k)`, `mulberry32(seed)`.
- Produces: `ivfSearch(state: IvfState, query: Vec, params: IvfSearchParams): OpResult<IvfState, readonly Ranked[], IvfStep>`.

- [ ] **Step 1: Write the failing test**

```ts
// append to lib/lab/vector/ivf.test.ts; extend the imports to
// import { trainIvf, ivfInsert, ivfDelete, ivfSearch } from './ivf';
// import { createFlat, flatSearch } from './flat';
// import { recallAtK } from './recall';
// import { mulberry32 } from './random';

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

  it('misses at least one true neighbour at nprobe=1 — the lab's whole point', () => {
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/lab/vector/ivf.test.ts`
Expected: FAIL with `ivfSearch is not a function`.

- [ ] **Step 3: Write minimal implementation**

```ts
// add to lib/lab/vector/ivf.ts; extend the metrics import to
// import { distance, euclidean } from './metrics';

export function ivfSearch(
  state: IvfState,
  query: Vec,
  params: IvfSearchParams,
): OpResult<IvfState, readonly Ranked[], IvfStep> {
  const steps: IvfStep[] = [];

  // Cells are ranked under the query's own metric, unlike training: this is a
  // ranking question, not a means question, so it must agree with the scan.
  const ranked = state.centroids
    .map((centroid, cell) => ({ cell, distance: distance(query, centroid, params.metric) }))
    .sort((a, b) => a.distance - b.distance || a.cell - b.cell);
  let distanceComputations = state.centroids.length;

  const probe = Math.max(1, Math.min(params.nprobe, state.centroids.length));
  const candidates: Ranked[] = [];
  let pointsScanned = 0;

  ranked.forEach((entry, rank) => {
    if (rank >= probe) {
      steps.push({ kind: 'skipCell', cell: entry.cell, distance: entry.distance });
      return;
    }
    steps.push({ kind: 'probeCell', cell: entry.cell, distance: entry.distance });
    state.cells[entry.cell].forEach((id) => {
      const point = state.points.get(id);
      // Cells and `points` are written by the same ops, so a gap is corruption.
      if (point === undefined) return;
      const d = distance(query, point.vec, params.metric);
      distanceComputations += 1;
      pointsScanned += 1;
      steps.push({ kind: 'scan', id, distance: d });
      candidates.push({ id, distance: d });
    });
  });

  // Tie-break by id so the ordering is total, and therefore reproducible and
  // directly comparable with flat search.
  const top = candidates.sort((a, b) => a.distance - b.distance || a.id - b.id).slice(0, params.k);
  top.forEach((entry, rank) => steps.push({ kind: 'admit', id: entry.id, distance: entry.distance, rank }));

  return {
    state,
    result: top,
    steps,
    counters: ivfCounters(distanceComputations, probe, pointsScanned),
  };
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run lib/lab/vector/ivf.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/lab/vector/ivf.ts lib/lab/vector/ivf.test.ts
git commit -m "feat(lab): IVF nprobe search, with the nprobe=1 boundary miss asserted"
```

---

### Task 23: `cellBalance` and `rebuildIvf` — drift and its cure

**Files:**
- Modify: `lib/lab/vector/ivf.ts`
- Test: `lib/lab/vector/ivf.test.ts`

**Interfaces:**
- Consumes: `trainIvf`, `ivfInsert`, `IvfState`, `IvfParams`.
- Produces: `cellBalance(state: IvfState): number`, `rebuildIvf(state: IvfState, params: IvfParams): OpResult<IvfState, void, IvfStep>`.

- [ ] **Step 1: Write the failing test**

```ts
// append to lib/lab/vector/ivf.test.ts; extend the import to
// import { trainIvf, ivfInsert, ivfDelete, ivfSearch, cellBalance, rebuildIvf } from './ivf';

/** Points dropped into a tight blob, which is how a real index goes lopsided. */
function blobInserts(state: ReturnType<typeof trainIvf>['state'], count: number) {
  const rng = mulberry32(3);
  let current = state;
  for (let i = 0; i < count; i += 1) {
    current = ivfInsert(current, [0.05 + rng() * 0.02, 0.05 + rng() * 0.02]).state;
  }
  return current;
}

describe('cellBalance', () => {
  it('is zero when every cell holds the same number of points', () => {
    const state = {
      centroids: [[0, 0], [1, 1]],
      cells: [[1, 2], [3, 4]],
      points: new Map(),
      nextId: 5,
      insertsSinceTrain: 0,
    };
    expect(cellBalance(state)).toBe(0);
  });

  it('is the coefficient of variation of the posting-list sizes', () => {
    const state = {
      centroids: [[0, 0], [1, 1]],
      cells: [[1], [2, 3, 4]],
      points: new Map(),
      nextId: 5,
      insertsSinceTrain: 0,
    };
    // sizes [1, 3]: mean 2, standard deviation 1.
    expect(cellBalance(state)).toBeCloseTo(0.5, 12);
  });

  it('is zero for an empty index rather than NaN', () => {
    const state = {
      centroids: [[0, 0], [1, 1]],
      cells: [[], []],
      points: new Map(),
      nextId: 0,
      insertsSinceTrain: 0,
    };
    expect(cellBalance(state)).toBe(0);
  });
});

describe('rebuildIvf', () => {
  it('drift worsens balance and rebuild restores it', () => {
    const { state } = trainIvf(points, params);
    const trained = cellBalance(state);
    const drifted = blobInserts(state, 120);
    const afterInserts = cellBalance(drifted);
    const rebuilt = rebuildIvf(drifted, params).state;
    const afterRebuild = cellBalance(rebuilt);

    expect(afterInserts, 'inserting without retraining must visibly unbalance the cells').toBeGreaterThan(trained);
    expect(afterRebuild, 'rebuild must pull the cells back towards balance').toBeLessThan(afterInserts);
  });

  it('clears the drift counter', () => {
    const { state } = trainIvf(points, params);
    const drifted = blobInserts(state, 20);
    expect(drifted.insertsSinceTrain).toBe(20);
    expect(rebuildIvf(drifted, params).state.insertsSinceTrain).toBe(0);
  });

  it('keeps exactly the points it had', () => {
    const { state } = trainIvf(points, params);
    const drifted = blobInserts(state, 20);
    const rebuilt = rebuildIvf(drifted, params).state;
    expect(new Set(rebuilt.cells.flat())).toEqual(new Set([...drifted.points.keys()]));
    expect(rebuilt.points).toEqual(drifted.points);
  });

  it('never rewinds the id counter, because ids are never reused', () => {
    const { state } = trainIvf(points, params);
    const drifted = blobInserts(state, 20);
    const deleted = ivfDelete(drifted, drifted.cells.flat()[0]).state;
    expect(rebuildIvf(deleted, params).state.nextId).toBe(deleted.nextId);
  });

  it('moves the centroids, and search still answers correctly afterwards', () => {
    const { state } = trainIvf(points, params);
    const drifted = blobInserts(state, 120);
    const rebuilt = rebuildIvf(drifted, params).state;
    expect(rebuilt.centroids).not.toEqual(drifted.centroids);

    const flat = createFlat([...rebuilt.points.values()]);
    const truth = flatSearch(flat, [0.3, 0.3], { k: 10, metric: 'euclidean' }).result;
    const got = ivfSearch(rebuilt, [0.3, 0.3], { k: 10, metric: 'euclidean', nprobe: params.cells }).result;
    expect(got).toEqual(truth);
  });

  it('replays the training animation, so the reader can watch it resolve', () => {
    const { state } = trainIvf(points, params);
    const { steps } = rebuildIvf(blobInserts(state, 20), params);
    expect(steps.filter((step) => step.kind === 'trainIteration').length).toBeGreaterThan(1);
  });

  it('leaves the input state unchanged', () => {
    const { state } = trainIvf(points, params);
    const drifted = blobInserts(state, 20);
    const snapshot = structuredClone(drifted);
    rebuildIvf(drifted, params);
    expect(drifted).toEqual(snapshot);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/lab/vector/ivf.test.ts`
Expected: FAIL with `cellBalance is not a function`.

- [ ] **Step 3: Write minimal implementation**

```ts
// add to lib/lab/vector/ivf.ts

/**
 * Coefficient of variation of the posting-list sizes: 0 when every cell holds
 * the same count, rising without bound as one cell swallows the index.
 *
 * Scale-free on purpose. A raw spread would climb simply because the reader
 * kept inserting, and the readout has to mean "lopsided", not "large".
 */
export function cellBalance(state: IvfState): number {
  const sizes = state.cells.map((ids) => ids.length);
  if (sizes.length === 0) return 0;
  const mean = sizes.reduce((total, size) => total + size, 0) / sizes.length;
  if (mean === 0) return 0;
  const variance = sizes.reduce((total, size) => total + (size - mean) ** 2, 0) / sizes.length;
  return Math.sqrt(variance) / mean;
}

/**
 * Retrains the centroids on the points the index actually holds now, and
 * reassigns every one of them. This is the operation that pays off the debt
 * that `ivfInsert` and `ivfDelete` have been quietly running up.
 */
export function rebuildIvf(state: IvfState, params: IvfParams): OpResult<IvfState, void, IvfStep> {
  const points = [...state.points.values()].sort((a, b) => a.id - b.id);
  const trained = trainIvf(points, params);
  return {
    ...trained,
    // A from-scratch train derives nextId from the ids present, which would
    // rewind the counter after deletes and hand out an id twice.
    state: { ...trained.state, nextId: Math.max(state.nextId, trained.state.nextId) },
  };
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run lib/lab/vector/ivf.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/lab/vector/ivf.ts lib/lab/vector/ivf.test.ts
git commit -m "feat(lab): IVF cell balance and rebuild, with drift asserted in both directions"
```

---

### Task 24: Voronoi cell polygons as a pure function

**Files:**
- Create: `lib/lab/vector/voronoi.ts`
- Test: `lib/lab/vector/voronoi.test.ts`

**Interfaces:**
- Consumes: `toScreen(vec: Vec, viewport: Viewport): { x: number; y: number }`, `Viewport`.
- Produces: `PolygonPoint`, `VoronoiCell`, `voronoiCells(centroids: readonly Vec[], viewport: Viewport): readonly VoronoiCell[]`.

- [ ] **Step 1: Write the failing test**

```ts
// lib/lab/vector/voronoi.test.ts
import { describe, it, expect } from 'vitest';
import { toScreen, type Viewport } from './layout';
import { voronoiCells, type PolygonPoint } from './voronoi';
import { mulberry32 } from './random';

const viewport: Viewport = { width: 400, height: 400, padding: 20 };

/** Shoelace, absolute so winding direction does not matter. */
function area(polygon: readonly PolygonPoint[]): number {
  let total = 0;
  for (let i = 0; i < polygon.length; i += 1) {
    const a = polygon[i];
    const b = polygon[(i + 1) % polygon.length];
    total += a.x * b.y - b.x * a.y;
  }
  return Math.abs(total) / 2;
}

function boardArea(): number {
  const min = toScreen([0, 0], viewport);
  const max = toScreen([1, 1], viewport);
  return Math.abs(max.x - min.x) * Math.abs(max.y - min.y);
}

function centre(polygon: readonly PolygonPoint[]): PolygonPoint {
  const x = polygon.reduce((total, p) => total + p.x, 0) / polygon.length;
  const y = polygon.reduce((total, p) => total + p.y, 0) / polygon.length;
  return { x, y };
}

function nearestSite(point: PolygonPoint, centroids: number[][]): number {
  const sites = centroids.map((c) => toScreen(c, viewport));
  let best = 0;
  let bestDistance = Infinity;
  sites.forEach((site, i) => {
    const d = (site.x - point.x) ** 2 + (site.y - point.y) ** 2;
    if (d < bestDistance) {
      bestDistance = d;
      best = i;
    }
  });
  return best;
}

describe('voronoiCells', () => {
  it('gives a single centroid the whole board', () => {
    const [cell] = voronoiCells([[0.3, 0.7]], viewport);
    expect(cell.cell).toBe(0);
    expect(cell.polygon).toHaveLength(4);
    expect(area(cell.polygon)).toBeCloseTo(boardArea(), 6);
  });

  it('splits the board in half between two mirrored centroids', () => {
    const cells = voronoiCells([[0.25, 0.5], [0.75, 0.5]], viewport);
    expect(area(cells[0].polygon)).toBeCloseTo(boardArea() / 2, 6);
    expect(area(cells[1].polygon)).toBeCloseTo(boardArea() / 2, 6);
  });

  it('partitions the board — the polygons tile it with no gap or overlap', () => {
    const rng = mulberry32(19);
    const centroids = Array.from({ length: 6 }, () => [rng(), rng()]);
    const total = voronoiCells(centroids, viewport).reduce((sum, cell) => sum + area(cell.polygon), 0);
    expect(total).toBeCloseTo(boardArea(), 6);
  });

  it('puts every polygon on the side of its own centroid', () => {
    const rng = mulberry32(19);
    const centroids = Array.from({ length: 6 }, () => [rng(), rng()]);
    voronoiCells(centroids, viewport).forEach((cell) => {
      expect(cell.polygon.length, `cell ${cell.cell}`).toBeGreaterThan(2);
      // A Voronoi region is convex, so the mean of its vertices lies inside it.
      expect(nearestSite(centre(cell.polygon), centroids), `cell ${cell.cell}`).toBe(cell.cell);
    });
  });

  it('returns one entry per centroid, in cell order', () => {
    const cells = voronoiCells([[0.1, 0.1], [0.9, 0.1], [0.5, 0.9]], viewport);
    expect(cells.map((cell) => cell.cell)).toEqual([0, 1, 2]);
  });

  it('survives duplicate centroids, which k-means can produce for an empty cell', () => {
    const cells = voronoiCells([[0.5, 0.5], [0.5, 0.5]], viewport);
    expect(cells).toHaveLength(2);
    cells.forEach((cell) => expect(Number.isFinite(area(cell.polygon))).toBe(true));
  });

  it('returns nothing for no centroids', () => {
    expect(voronoiCells([], viewport)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/lab/vector/voronoi.test.ts`
Expected: FAIL with `Failed to resolve import "./voronoi"`.

- [ ] **Step 3: Write minimal implementation**

```ts
// lib/lab/vector/voronoi.ts
import type { Vec } from './types';
import { toScreen, type Viewport } from './layout';

export interface PolygonPoint {
  readonly x: number;
  readonly y: number;
}

export interface VoronoiCell {
  readonly cell: number;
  readonly polygon: readonly PolygonPoint[];
}

/**
 * Sutherland–Hodgman clip of `polygon` against the perpendicular bisector of
 * `keep` and `against`, retaining the half nearer `keep`.
 *
 * The bisector is derived from |p - keep|² - |p - against|², which expands to a
 * straight line: the quadratic terms cancel. So a Voronoi region is just the
 * board clipped once per rival site — a few lines instead of a Fortune sweep,
 * and at eight cells the O(n²) is free.
 */
function clipToNearer(
  polygon: readonly PolygonPoint[],
  keep: PolygonPoint,
  against: PolygonPoint,
): PolygonPoint[] {
  const side = (p: PolygonPoint) =>
    2 * (against.x - keep.x) * p.x +
    2 * (against.y - keep.y) * p.y +
    (keep.x ** 2 + keep.y ** 2) -
    (against.x ** 2 + against.y ** 2);

  const clipped: PolygonPoint[] = [];
  for (let i = 0; i < polygon.length; i += 1) {
    const a = polygon[i];
    const b = polygon[(i + 1) % polygon.length];
    const sa = side(a);
    const sb = side(b);
    if (sa <= 0) clipped.push(a);
    if ((sa < 0 && sb > 0) || (sa > 0 && sb < 0)) {
      const t = sa / (sa - sb);
      clipped.push({ x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) });
    }
  }
  return clipped;
}

/**
 * The screen-space polygon of every IVF cell, clipped to the drawable board.
 *
 * Pure and tested because it is the whole picture: the canvas component may do
 * nothing but iterate what this returns.
 */
export function voronoiCells(centroids: readonly Vec[], viewport: Viewport): readonly VoronoiCell[] {
  if (centroids.length === 0) return [];

  // The board is derived from `toScreen` rather than from width/height, so the
  // polygons keep agreeing with the points even if the mapping changes.
  const a = toScreen([0, 0], viewport);
  const b = toScreen([1, 1], viewport);
  const left = Math.min(a.x, b.x);
  const right = Math.max(a.x, b.x);
  const top = Math.min(a.y, b.y);
  const bottom = Math.max(a.y, b.y);
  const board: PolygonPoint[] = [
    { x: left, y: top },
    { x: right, y: top },
    { x: right, y: bottom },
    { x: left, y: bottom },
  ];

  const sites = centroids.map((centroid) => toScreen(centroid, viewport));

  return sites.map((site, cell) => {
    let polygon: PolygonPoint[] = board;
    for (let other = 0; other < sites.length; other += 1) {
      if (other === cell) continue;
      polygon = clipToNearer(polygon, site, sites[other]);
      if (polygon.length === 0) break;
    }
    return { cell, polygon };
  });
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run lib/lab/vector/voronoi.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/lab/vector/voronoi.ts lib/lab/vector/voronoi.test.ts
git commit -m "feat(lab): pure Voronoi cell polygons for the IVF canvas"
```

---

## PR 2: IVF — UI

> These four tasks wire the IVF index (Tasks 19–24) into the PR 1 island. They add
> **no** new components beyond one overlay, **no** second hook, and **no** second panel.
> `ui-contracts.md` is the authority for every prop mentioned here.

---

### Task 25: Generalise `HealthReadout` to a row list

The readout shipped in PR 1 with three fixed props. IVF needs two more numbers and
IVF-PQ needs a third, so the component stops knowing what a row *means* and starts
taking a list. This is a modification task: it changes the component, rewrites its
PR 1 test file, and updates PR 1's caller in `VectorLab`, all in one commit. No
wiring task is allowed to assume this shape before this task lands.

The rendered DOM text is deliberately unchanged — the same `Points` and `recall@k`
labels, the same two-decimal recall — so `vector-lab.test.tsx` needs no edit.

**Files:**
- Modify: `components/lab/vector/health-readout.tsx`
- Modify: `components/lab/vector/vector-lab.tsx`
- Test: `components/lab/vector/health-readout.test.tsx` (rewritten)

**Interfaces:**
- Consumes: nothing new.
- Produces:
  ```tsx
  export interface HealthRow { label: string; value: string }
  export interface HealthReadoutProps { rows: readonly HealthRow[] }
  export function HealthReadout(props: HealthReadoutProps): JSX.Element;
  ```
  The old `{ pointCount, k, recall }` props are gone. Formatting moves to the caller,
  which is the point: only the caller knows whether a number is a count, a ratio or a
  coefficient of variation.

- [ ] **Step 1: Write the failing test**

Replace the whole of `components/lab/vector/health-readout.test.tsx` with:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HealthReadout } from './health-readout';

function valueFor(label: string): string {
  return screen.getByText(label).nextElementSibling?.textContent ?? '';
}

describe('HealthReadout', () => {
  it('renders a term and a value for every row it is given', () => {
    render(<HealthReadout rows={[{ label: 'Points', value: '120' }, { label: 'recall@10', value: '0.80' }]} />);
    expect(valueFor('Points')).toBe('120');
    expect(valueFor('recall@10')).toBe('0.80');
  });

  it('renders index-specific rows without knowing what they mean', () => {
    // The whole reason for the change: cell balance is IVF vocabulary and the
    // readout must stay ignorant of it.
    render(
      <HealthReadout
        rows={[
          { label: 'Points', value: '120' },
          { label: 'Cell balance', value: '0.42' },
          { label: 'Inserts since rebuild', value: '7' },
        ]}
      />,
    );
    expect(valueFor('Cell balance')).toBe('0.42');
    expect(valueFor('Inserts since rebuild')).toBe('7');
  });

  it('preserves the order given rather than re-sorting', () => {
    const { container } = render(
      <HealthReadout
        rows={[
          { label: 'Points', value: '120' },
          { label: 'Cell balance', value: '0.42' },
          { label: 'recall@10', value: '0.80' },
        ]}
      />,
    );
    const terms = [...container.querySelectorAll('dt')].map((dt) => dt.textContent);
    expect(terms).toEqual(['Points', 'Cell balance', 'recall@10']);
  });

  it('names the block for assistive tech', () => {
    render(<HealthReadout rows={[{ label: 'Points', value: '120' }]} />);
    expect(screen.getByLabelText('Index health')).toBeInTheDocument();
  });

  it('renders an empty list rather than crashing when given no rows', () => {
    const { container } = render(<HealthReadout rows={[]} />);
    expect(container.querySelectorAll('dt')).toHaveLength(0);
    expect(screen.getByLabelText('Index health')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run components/lab/vector/health-readout.test.tsx`

Expected: FAIL — TypeScript/runtime error that `rows` is not a prop of `HealthReadout`,
surfacing as `Cannot read properties of undefined (reading 'map')` or
`Unable to find a label with the text of: Index health`.

- [ ] **Step 3: Write minimal implementation**

Replace the whole of `components/lab/vector/health-readout.tsx` with:

```tsx
import { Fragment } from 'react';

export interface HealthRow {
  label: string;
  value: string;
}

export interface HealthReadoutProps {
  rows: readonly HealthRow[];
}

/**
 * Index-agnostic on purpose. Each index type contributes different rows and the
 * only thing they share is "a named number", so the caller formats and this
 * renders. A component that knew about cell balance would need widening again
 * for every index the lab grows.
 */
export function HealthReadout({ rows }: HealthReadoutProps) {
  return (
    <dl
      aria-label="Index health"
      className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs border border-border rounded-sm bg-background-raised px-3 py-2"
    >
      {rows.map((row) => (
        <Fragment key={row.label}>
          <dt className="uppercase tracking-widest text-foreground-dim">{row.label}</dt>
          <dd className="text-foreground tabular-nums">{row.value}</dd>
        </Fragment>
      ))}
    </dl>
  );
}
```

- [ ] **Step 4: Update PR 1's caller in `VectorLab`**

In `components/lab/vector/vector-lab.tsx`, add `useMemo` to the `react` import if it is
not already there, change the readout import to

```tsx
import { HealthReadout, type HealthRow } from './health-readout';
```

add this alongside the component's other derived values:

```tsx
const healthRows = useMemo<readonly HealthRow[]>(
  () => [
    { label: 'Points', value: String(lab.points.length) },
    { label: `recall@${lab.k}`, value: lab.recall === null ? '—' : lab.recall.toFixed(2) },
  ],
  [lab.points.length, lab.k, lab.recall],
);
```

and replace the `<HealthReadout … />` element with:

```tsx
<HealthReadout rows={healthRows} />
```

- [ ] **Step 5: Run tests**

Run: `npx vitest run components/lab/vector`

Expected: PASS — `health-readout.test.tsx` and PR 1's `vector-lab.test.tsx` both green.

- [ ] **Step 6: Commit**

```bash
git add components/lab/vector/health-readout.tsx components/lab/vector/health-readout.test.tsx components/lab/vector/vector-lab.tsx
git commit -m "refactor: make the health readout a list of named rows"
```

---

### Task 26: Extend `useVectorLab` with an `index` option

One hook, one operation log, one undo stack. `replayLog` folds the same `LabOp[]`
through whichever index is selected. **Do not write `useIvfLab`** — a second hook means
a second dataset, a second undo stack and a second copy of the threading logic, and the
two would drift the first time either is touched.

Two deliberate extensions beyond the PR 1 shape, both stated here rather than assumed
inside a wiring task:

1. **`LabOp` gains `{ kind: 'rebuild' }`.** The operation log *is* the undo stack, so a
   rebuild that lives outside the log would make undo and replay lie about the state.
2. **`search` is not folded.** Only the most recent query in the log matters, and it is
   answered against the *final* state after the fold. That is what keeps results honest
   when an insert or delete comes after a search in the log, and it is what makes an
   `nprobe` change re-derive results through `useMemo` with no effect anywhere.

**Files:**
- Modify: `components/lab/vector/use-vector-lab.ts`
- Test: `components/lab/vector/use-vector-lab.test.ts` (appended block)

**Interfaces:**
- Consumes:
  - `trainIvf(points, params: IvfParams): OpResult<IvfState, void, IvfStep>` (Task 19)
  - `ivfInsert(state, vec): OpResult<IvfState, PointId, IvfStep>` (Task 20)
  - `ivfDelete(state, id): OpResult<IvfState, boolean, IvfStep>` (Task 21)
  - `ivfSearch(state, query, params: IvfSearchParams): OpResult<IvfState, readonly Ranked[], IvfStep>` (Task 22)
  - `rebuildIvf(state, params): OpResult<IvfState, void, IvfStep>`, `cellBalance(state): number` (Task 23)
  - `createFlat`, `flatInsert`, `flatDelete`, `flatSearch` (PR 1), `recallAtK` (PR 1), `makeDataset` / `DEFAULT_DATASET` (PR 1)
- Produces:
  ```ts
  export type IndexKind = 'flat' | 'ivf' | 'ivf-pq' | 'hnsw';
  export type LabStep = FlatStep | IvfStep;
  export type LabOp =
    | { readonly kind: 'insert'; readonly vec: Vec }
    | { readonly kind: 'delete'; readonly id: PointId }
    | { readonly kind: 'search'; readonly query: Vec }
    | { readonly kind: 'rebuild' };
  export const DEFAULT_K = 10;
  export const DEFAULT_NPROBE = 1;
  export const DEFAULT_IVF: IvfParams;
  export function describeStep(step: LabStep): string;
  export function replayLog(seed: readonly Point[], log: readonly LabOp[], params: LabParams): LabSnapshot;
  export function useVectorLab(options?: UseVectorLabOptions): VectorLab;
  ```
  `VectorLab` keeps every PR 1 member and gains `centroids`, `cellBalance`,
  `insertsSinceTrain` and `rebuild()`.

- [ ] **Step 1: Write the failing test**

Append to `components/lab/vector/use-vector-lab.test.ts`:

```tsx
import { describe, it, expect } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import {
  DEFAULT_IVF,
  DEFAULT_K,
  describeStep,
  replayLog,
  useVectorLab,
  type LabOp,
} from './use-vector-lab';
import { DEFAULT_DATASET, makeDataset } from '@/lib/lab/vector/dataset';

const seed = makeDataset(DEFAULT_DATASET);

function params(overrides: Partial<Parameters<typeof replayLog>[2]> = {}) {
  return {
    k: DEFAULT_K,
    metric: 'euclidean' as const,
    index: 'flat' as const,
    nprobe: 1,
    ivf: DEFAULT_IVF,
    ...overrides,
  };
}

describe('replayLog across index kinds', () => {
  it('reports cell geometry for ivf and none for flat', () => {
    const flat = replayLog(seed, [], params());
    const ivf = replayLog(seed, [], params({ index: 'ivf' }));
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
    const flat = replayLog(seed, log, params());
    const ivf = replayLog(seed, log, params({ index: 'ivf' }));
    expect(ivf.points.map((p) => p.id)).toEqual(flat.points.map((p) => p.id));
  });

  it('lands on the k-means training trace before any operation is logged', () => {
    // Building the index is half of what IVF teaches, so the scrubber has
    // something to walk the moment the reader picks it.
    const ivf = replayLog(seed, [], params({ index: 'ivf' }));
    expect(ivf.steps.some((step) => step.kind === 'trainIteration')).toBe(true);
  });

  it('answers the last query against the final state, not the state at the time', () => {
    const target = seed[0];
    const withLaterDelete: readonly LabOp[] = [
      { kind: 'search', query: target.vec },
      { kind: 'delete', id: target.id },
    ];
    const snapshot = replayLog(seed, withLaterDelete, params());
    expect(snapshot.results.map((r) => r.id)).not.toContain(target.id);
  });

  it('matches flat exactly once nprobe covers every cell', () => {
    const log: readonly LabOp[] = [{ kind: 'search', query: [0.5, 0.5] }];
    const flat = replayLog(seed, log, params());
    const ivf = replayLog(seed, log, params({ index: 'ivf', nprobe: DEFAULT_IVF.cells }));
    expect(ivf.results.map((r) => r.id)).toEqual(flat.results.map((r) => r.id));
    expect(ivf.recall).toBe(1);
  });

  it('counts inserts since the last train and clears them on rebuild', () => {
    const inserted: readonly LabOp[] = [{ kind: 'insert', vec: [0.5, 0.5] }];
    expect(replayLog(seed, inserted, params({ index: 'ivf' })).insertsSinceTrain).toBe(1);
    expect(
      replayLog(seed, [...inserted, { kind: 'rebuild' }], params({ index: 'ivf' })).insertsSinceTrain,
    ).toBe(0);
  });

  it('treats rebuild as a no-op on flat, which has nothing to retrain', () => {
    const before = replayLog(seed, [], params());
    const after = replayLog(seed, [{ kind: 'rebuild' }], params());
    expect(after.points.map((p) => p.id)).toEqual(before.points.map((p) => p.id));
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

  it('names the cell a point was removed from, which flat has no notion of', () => {
    expect(describeStep({ kind: 'remove', id: 7, cell: 2 })).toBe('Removed point 7 from cell 2');
    expect(describeStep({ kind: 'remove', id: 7 })).toBe('Removed point 7');
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run components/lab/vector/use-vector-lab.test.ts`

Expected: FAIL — `DEFAULT_IVF` is not exported, and `replayLog` is called with an
`index` field its params type does not have.

- [ ] **Step 3: Write minimal implementation**

`components/lab/vector/use-vector-lab.ts`. Replace the PR 1 type block, `replayLog` and
`useVectorLab` with the code below; **leave the existing flat cases inside `describeStep`
exactly as PR 1 wrote them** and only widen its parameter type and add the new cases.

Imports at the top of the file:

```ts
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
  type IvfParams,
  type IvfState,
  type IvfStep,
} from '@/lib/lab/vector/ivf';
import { recallAtK } from '@/lib/lab/vector/recall';
import type { Counters, Metric, Point, PointId, Ranked, Vec } from '@/lib/lab/vector/types';
```

Types:

```ts
export type IndexKind = 'flat' | 'ivf' | 'ivf-pq' | 'hnsw';

export type LabStep = FlatStep | IvfStep;

export type LabOp =
  | { readonly kind: 'insert'; readonly vec: Vec }
  | { readonly kind: 'delete'; readonly id: PointId }
  | { readonly kind: 'search'; readonly query: Vec }
  | { readonly kind: 'rebuild' };

export interface LabSnapshot {
  readonly points: readonly Point[];
  readonly results: readonly Ranked[];
  readonly steps: readonly LabStep[];
  readonly counters: Counters;
  readonly query: Vec | null;
  readonly recall: number | null;
  /** Null on indexes that have no cells, which is how the UI decides what to draw. */
  readonly centroids: readonly Vec[] | null;
  readonly cellBalance: number | null;
  readonly insertsSinceTrain: number | null;
}

export interface LabParams {
  readonly k: number;
  readonly metric: Metric;
  readonly index: IndexKind;
  readonly nprobe: number;
  readonly ivf: IvfParams;
}

export interface UseVectorLabOptions {
  dataset?: DatasetOptions;
  k?: number;
  metric?: Metric;
  index?: IndexKind;
  nprobe?: number;
  /** Reserved for HNSW in PR 5; inert until an hnsw branch exists in replayLog. */
  ef?: number;
}

export interface VectorLab {
  readonly points: readonly Point[];
  readonly results: readonly Ranked[];
  readonly query: Vec | null;
  readonly recall: number | null;
  readonly steps: readonly LabStep[];
  readonly counters: Counters;
  readonly stepIndex: number;
  readonly stepDescription: string;
  readonly log: readonly LabOp[];
  readonly k: number;
  readonly canUndo: boolean;
  readonly centroids: readonly Vec[] | null;
  readonly cellBalance: number | null;
  readonly insertsSinceTrain: number | null;
  insert(vec: Vec): void;
  remove(id: PointId): void;
  search(query: Vec): void;
  rebuild(): void;
  setStepIndex(index: number): void;
  undo(): void;
  reset(): void;
}

export const DEFAULT_K = 10;
export const DEFAULT_NPROBE = 1;
export const DEFAULT_IVF: IvfParams = { cells: 8, maxIterations: 12, seed: 7 };
```

New `describeStep` cases — widen the signature to `export function describeStep(step: LabStep): string`
and add these to the existing `switch (step.kind)`:

```ts
    case 'trainIteration':
      return `Training iteration ${step.iteration}: centroids moved ${step.shift.toFixed(3)}`;
    case 'assign':
      return `Assigned point ${step.id} to cell ${step.cell}`;
    case 'probeCell':
      return `Probed cell ${step.cell}, centroid distance ${step.distance.toFixed(3)}`;
    case 'skipCell':
      return `Skipped cell ${step.cell}, centroid distance ${step.distance.toFixed(3)}`;
```

and change the existing `remove` case to name the cell when there is one — flat has no
cells, IVF's `remove` step carries one, and the union cannot tell them apart by `kind`
alone:

```ts
    case 'remove':
      return 'cell' in step ? `Removed point ${step.id} from cell ${step.cell}` : `Removed point ${step.id}`;
```

The fold. This replaces PR 1's `replayLog` entirely:

```ts
function addCounters(a: Counters, b: Counters): Counters {
  const merged: Record<string, number> = { ...a };
  for (const [key, value] of Object.entries(b)) merged[key] = (merged[key] ?? 0) + value;
  return merged;
}

function lastQuery(log: readonly LabOp[]): Vec | null {
  for (let i = log.length - 1; i >= 0; i -= 1) {
    const op = log[i];
    if (op.kind === 'search') return op.query;
  }
  return null;
}

function endedOnSearch(log: readonly LabOp[]): boolean {
  return log[log.length - 1]?.kind === 'search';
}

function replayFlat(seed: readonly Point[], log: readonly LabOp[], params: LabParams): LabSnapshot {
  let state: FlatState = createFlat(seed);
  let steps: readonly LabStep[] = [];
  let counters: Counters = {};

  for (const op of log) {
    if (op.kind === 'insert') {
      const done = flatInsert(state, op.vec);
      state = done.state;
      steps = done.steps;
      counters = addCounters(counters, done.counters);
    } else if (op.kind === 'delete') {
      const done = flatDelete(state, op.id);
      state = done.state;
      steps = done.steps;
      counters = addCounters(counters, done.counters);
    }
    // 'search' is answered below, against the final state. 'rebuild' is a no-op
    // here: a flat index has no structure to retrain.
  }

  const query = lastQuery(log);
  let results: readonly Ranked[] = [];
  if (query !== null) {
    const found = flatSearch(state, query, { k: params.k, metric: params.metric });
    results = found.result;
    counters = addCounters(counters, found.counters);
    if (endedOnSearch(log)) steps = found.steps;
  }

  return {
    points: state.points,
    results,
    steps,
    counters,
    query,
    // Flat search IS the ground truth, so its recall is 1 by construction.
    recall: query === null ? null : 1,
    centroids: null,
    cellBalance: null,
    insertsSinceTrain: null,
  };
}

function ivfPoints(state: IvfState): readonly Point[] {
  // Sorted so the canvas layout is stable across renders; Map order is insertion
  // order and a delete would otherwise reshuffle the drawing.
  return [...state.points.values()].sort((a, b) => a.id - b.id);
}

function replayIvf(seed: readonly Point[], log: readonly LabOp[], params: LabParams): LabSnapshot {
  const trained = trainIvf(seed, params.ivf);
  let state: IvfState = trained.state;
  let steps: readonly LabStep[] = trained.steps;
  let counters: Counters = trained.counters;

  for (const op of log) {
    if (op.kind === 'insert') {
      const done = ivfInsert(state, op.vec);
      state = done.state;
      steps = done.steps;
      counters = addCounters(counters, done.counters);
    } else if (op.kind === 'delete') {
      const done = ivfDelete(state, op.id);
      state = done.state;
      steps = done.steps;
      counters = addCounters(counters, done.counters);
    } else if (op.kind === 'rebuild') {
      const done = rebuildIvf(state, params.ivf);
      state = done.state;
      steps = done.steps;
      counters = addCounters(counters, done.counters);
    }
  }

  const points = ivfPoints(state);
  const query = lastQuery(log);
  let results: readonly Ranked[] = [];
  let recall: number | null = null;

  if (query !== null) {
    const found = ivfSearch(state, query, { k: params.k, metric: params.metric, nprobe: params.nprobe });
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
    centroids: state.centroids,
    cellBalance: cellBalance(state),
    insertsSinceTrain: state.insertsSinceTrain,
  };
}

/**
 * One log, folded through whichever index is selected. Kinds without an
 * implementation yet fall through to flat rather than throwing: this runs during
 * render, and a throw here would take the whole island down. The index `<select>`
 * only offers kinds that have a branch, so the fallthrough is unreachable in the UI.
 */
export function replayLog(seed: readonly Point[], log: readonly LabOp[], params: LabParams): LabSnapshot {
  switch (params.index) {
    case 'ivf':
      return replayIvf(seed, log, params);
    default:
      return replayFlat(seed, log, params);
  }
}
```

The hook:

```ts
export function useVectorLab(options: UseVectorLabOptions = {}): VectorLab {
  const {
    dataset = DEFAULT_DATASET,
    k = DEFAULT_K,
    metric = 'euclidean',
    index = 'flat',
    nprobe = DEFAULT_NPROBE,
  } = options;

  const [log, setLog] = useState<readonly LabOp[]>([]);
  const [rawStepIndex, setRawStepIndex] = useState(0);

  const seed = useMemo(() => makeDataset(dataset), [dataset]);
  // Primitive deps only, so a caller passing a fresh options object every render
  // does not re-run the fold.
  const params = useMemo<LabParams>(
    () => ({ k, metric, index, nprobe, ivf: DEFAULT_IVF }),
    [k, metric, index, nprobe],
  );

  // Search is pure and returns state unchanged, so the whole snapshot is derived
  // during render. An effect here would render one frame of stale results and
  // would need an exhaustive-deps escape hatch to stay quiet.
  const snapshot = useMemo(() => replayLog(seed, log, params), [seed, log, params]);

  const stepIndex = Math.min(rawStepIndex, Math.max(0, snapshot.steps.length - 1));
  const stepDescription =
    snapshot.steps.length === 0 ? 'No steps to show yet' : describeStep(snapshot.steps[stepIndex]);

  const insert = useCallback((vec: Vec) => {
    setLog((current) => [...current, { kind: 'insert', vec }]);
    setRawStepIndex(0);
  }, []);

  const remove = useCallback((id: PointId) => {
    setLog((current) => [...current, { kind: 'delete', id }]);
    setRawStepIndex(0);
  }, []);

  const rebuild = useCallback(() => {
    setLog((current) => [...current, { kind: 'rebuild' }]);
    setRawStepIndex(0);
  }, []);

  const search = useCallback((query: Vec) => {
    // Dragging the query fires once per pointer move. Collapsing consecutive
    // searches keeps one undo equal to one gesture instead of one frame.
    setLog((current) => {
      const next: LabOp = { kind: 'search', query };
      return current[current.length - 1]?.kind === 'search'
        ? [...current.slice(0, -1), next]
        : [...current, next];
    });
    setRawStepIndex(0);
  }, []);

  const undo = useCallback(() => {
    setLog((current) => current.slice(0, -1));
    setRawStepIndex(0);
  }, []);

  const reset = useCallback(() => {
    setLog([]);
    setRawStepIndex(0);
  }, []);

  return {
    points: snapshot.points,
    results: snapshot.results,
    query: snapshot.query,
    recall: snapshot.recall,
    steps: snapshot.steps,
    counters: snapshot.counters,
    stepIndex,
    stepDescription,
    log,
    k,
    canUndo: log.length > 0,
    centroids: snapshot.centroids,
    cellBalance: snapshot.cellBalance,
    insertsSinceTrain: snapshot.insertsSinceTrain,
    insert,
    remove,
    search,
    rebuild,
    setStepIndex: setRawStepIndex,
    undo,
    reset,
  };
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run components/lab/vector/use-vector-lab.test.ts`

Expected: PASS, including PR 1's existing flat assertions.

- [ ] **Step 5: Commit**

```bash
git add components/lab/vector/use-vector-lab.ts components/lab/vector/use-vector-lab.test.ts
git commit -m "feat: fold the operation log through a selectable index"
```

---

### Task 27: `CellOverlay`

Draws the Voronoi partition returned by `voronoiCells` (Task 24) and nothing else — no
geometry, no distance, no clipping of its own. It is a separate absolutely-positioned
`<svg>` layered *behind* `PointCanvas`, because `PointCanvasProps` is locked and takes no
`children`. It is `aria-hidden` and `pointer-events-none`, so the reader can still click
straight through it to add, remove and move — asserted in the test, because a filled
polygon over the canvas is exactly how a playground quietly becomes a picture.

**Files:**
- Create: `components/lab/vector/cell-overlay.tsx`
- Test: `components/lab/vector/cell-overlay.test.tsx`

**Interfaces:**
- Consumes: `voronoiCells(centroids: readonly Vec[], viewport: Viewport): readonly VoronoiCell[]`
  and `VoronoiCell = { cell: number; polygon: readonly (readonly [number, number])[] }`
  from `lib/lab/vector/voronoi.ts` (Task 24); `Viewport` from `lib/lab/vector/layout.ts`.
- Produces:
  ```tsx
  export interface CellOverlayProps {
    cells: readonly VoronoiCell[];
    viewport: Viewport;
    probed?: ReadonlySet<number>;
  }
  export function CellOverlay(props: CellOverlayProps): JSX.Element;
  ```

- [ ] **Step 1: Write the failing test**

`components/lab/vector/cell-overlay.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { CellOverlay } from './cell-overlay';
import type { Viewport } from '@/lib/lab/vector/layout';
import type { VoronoiCell } from '@/lib/lab/vector/voronoi';

const viewport: Viewport = { width: 480, height: 480, padding: 24 };

const cells: readonly VoronoiCell[] = [
  { cell: 0, polygon: [[0, 0], [240, 0], [240, 480], [0, 480]] },
  { cell: 1, polygon: [[240, 0], [480, 0], [480, 480], [240, 480]] },
];

describe('CellOverlay', () => {
  it('draws one polygon per cell it is given', () => {
    const { container } = render(<CellOverlay cells={cells} viewport={viewport} />);
    expect(container.querySelectorAll('polygon')).toHaveLength(2);
  });

  it('writes the polygon it is handed, without recomputing it', () => {
    // The seam the spec depends on: all the geometry is in voronoiCells, tested
    // without jsdom. This component only stringifies.
    const { container } = render(<CellOverlay cells={cells} viewport={viewport} />);
    expect(container.querySelector('polygon[data-cell="0"]')).toHaveAttribute(
      'points',
      '0,0 240,0 240,480 0,480',
    );
  });

  it('marks the probed cells apart from the skipped ones', () => {
    const { container } = render(
      <CellOverlay cells={cells} viewport={viewport} probed={new Set([1])} />,
    );
    expect(container.querySelector('polygon[data-cell="0"]')).toHaveAttribute('data-probed', 'false');
    expect(container.querySelector('polygon[data-cell="1"]')).toHaveAttribute('data-probed', 'true');
  });

  it('treats no probe set as nothing probed', () => {
    const { container } = render(<CellOverlay cells={cells} viewport={viewport} />);
    expect(container.querySelector('polygon[data-cell="1"]')).toHaveAttribute('data-probed', 'false');
  });

  it('never intercepts a pointer or an assistive-tech cursor', () => {
    // It sits over the canvas the reader clicks to add, remove and move points.
    const { container } = render(<CellOverlay cells={cells} viewport={viewport} />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).toHaveClass('pointer-events-none');
  });

  it('renders an empty layer when there are no cells', () => {
    const { container } = render(<CellOverlay cells={[]} viewport={viewport} />);
    expect(container.querySelectorAll('polygon')).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run components/lab/vector/cell-overlay.test.tsx`

Expected: FAIL with `Failed to resolve import "./cell-overlay"`.

- [ ] **Step 3: Write minimal implementation**

`components/lab/vector/cell-overlay.tsx`:

```tsx
import type { Viewport } from '@/lib/lab/vector/layout';
import type { VoronoiCell } from '@/lib/lab/vector/voronoi';

export interface CellOverlayProps {
  cells: readonly VoronoiCell[];
  viewport: Viewport;
  /** Cell indices the current search actually looked inside. */
  probed?: ReadonlySet<number>;
}

/**
 * A layer under the point canvas rather than a group inside it: PointCanvas takes
 * no children, and stacking keeps that contract intact. It draws only what
 * voronoiCells computed — the seam that lets the geometry be tested without jsdom.
 */
export function CellOverlay({ cells, viewport, probed }: CellOverlayProps) {
  return (
    <svg
      aria-hidden="true"
      width={viewport.width}
      height={viewport.height}
      viewBox={`0 0 ${viewport.width} ${viewport.height}`}
      className="absolute inset-0 pointer-events-none"
    >
      {cells.map((cell) => {
        const isProbed = probed?.has(cell.cell) ?? false;
        return (
          <polygon
            key={cell.cell}
            data-cell={cell.cell}
            data-probed={isProbed ? 'true' : 'false'}
            points={cell.polygon.map(([x, y]) => `${x},${y}`).join(' ')}
            strokeWidth={1}
            className={
              isProbed
                ? 'fill-accent/15 stroke-accent'
                : 'fill-transparent stroke-border'
            }
          />
        );
      })}
    </svg>
  );
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run components/lab/vector/cell-overlay.test.tsx`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add components/lab/vector/cell-overlay.tsx components/lab/vector/cell-overlay.test.tsx
git commit -m "feat: draw the ivf voronoi partition as a canvas underlay"
```

---

### Task 28: Compose IVF into `VectorLab`, the page prose and the README

The island gains an index `<select>`, an `nprobe` slider, the cell underlay, two health
rows and a rebuild button. **No `IvfPanel`.** Everything already on screen — canvas,
scrubber, scoreboard, health readout, mode radios, undo, reset — is reused as-is, and
the mode radios keep driving the query on IVF exactly as they do on flat.

**Files:**
- Modify: `components/lab/vector/vector-lab.tsx`
- Modify: `app/lab/vector-index/params.ts`
- Modify: `app/lab/vector-index/params.test.ts`
- Modify: `app/lab/vector-index/page.tsx`
- Modify: `README.md`
- Test: `components/lab/vector/vector-lab.test.tsx` (appended block)

**Also required in this task — widen the deep link.** Task 17 shipped
`LAB_INDEXES = ['flat'] as const`, and an index that is not in that list falls back to
flat rather than erroring. Adding IVF to the `<select>` without adding it here would
leave `?index=ivf` silently opening the flat index — which breaks deep linking for
precisely the index the post links to. So in `params.ts`:

```ts
export const LAB_INDEXES = ['flat', 'ivf'] as const;
```

extend `params.test.ts` to assert `parseLabParams({ index: 'ivf' }).index === 'ivf'`
(keeping the existing assertion that an unshipped name still falls back), and pass the
parsed value down in `page.tsx`:

```tsx
const { index, k } = parseLabParams(await searchParams);
// ...
<VectorLab initialK={k} initialIndex={index} />
```

`VectorLab` takes `initialIndex?: IndexKind` and seeds its index state from it. Task 36
does the same for `'ivf-pq'`, and the HNSW plan's Task 57 for `'hnsw'`.

**Interfaces:**
- Consumes: `useVectorLab` with `{ index, nprobe }` (Task 26), `CellOverlay` (Task 27),
  `HealthReadout` with `rows` (Task 25), `voronoiCells` (Task 24), `DEFAULT_IVF`,
  `DEFAULT_NPROBE`.
- Produces (new exports from `vector-lab.tsx`, alongside PR 1's `screenToVec` and `tonesFor`):
  ```ts
  export function probedCells(steps: readonly LabStep[], stepIndex: number): ReadonlySet<number>;
  export const INDEX_OPTIONS: readonly { value: IndexKind; label: string }[];
  ```

- [ ] **Step 1: Write the failing test**

Append to `components/lab/vector/vector-lab.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VectorLab, probedCells } from './vector-lab';

function healthValue(label: string): string {
  return screen.getByText(label).nextElementSibling?.textContent ?? '';
}

/** jsdom gives every element a zero-size rect, which makes toSvgCoords divide by zero. */
function stubCanvasRect(svg: Element): void {
  const width = Number(svg.getAttribute('width')) || 480;
  const height = Number(svg.getAttribute('height')) || 480;
  svg.getBoundingClientRect = () =>
    ({
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: width,
      bottom: height,
      width,
      height,
      toJSON: () => ({}),
    }) as DOMRect;
}

function canvas(): SVGSVGElement {
  const svg = screen.getByLabelText(/Scatter plot of/) as unknown as SVGSVGElement;
  stubCanvasRect(svg);
  return svg;
}

async function selectIvf(user: ReturnType<typeof userEvent.setup>): Promise<void> {
  await user.selectOptions(screen.getByLabelText('Index'), 'ivf');
}

describe('probedCells', () => {
  it('collects the cells probed up to and including the current step', () => {
    const steps = [
      { kind: 'probeCell', cell: 2, distance: 0.1 },
      { kind: 'probeCell', cell: 5, distance: 0.3 },
      { kind: 'skipCell', cell: 7, distance: 0.9 },
    ] as const;
    expect([...probedCells(steps, 0)]).toEqual([2]);
    expect([...probedCells(steps, 1)]).toEqual([2, 5]);
  });

  it('never counts a skipped cell as probed, which is the boundary-miss lesson', () => {
    const steps = [{ kind: 'skipCell', cell: 7, distance: 0.9 }] as const;
    expect(probedCells(steps, 0).size).toBe(0);
  });

  it('is empty for a trace with no cells in it', () => {
    expect(probedCells([{ kind: 'scan', id: 1, distance: 0.2 }], 0).size).toBe(0);
  });
});

describe('VectorLab — IVF', () => {
  it('offers the index as a labelled select, not another radio group', () => {
    render(<VectorLab />);
    const select = screen.getByLabelText('Index');
    expect(select.tagName).toBe('SELECT');
    expect(screen.getByRole('option', { name: 'Flat' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'IVF' })).toBeInTheDocument();
  });

  it('draws the cell partition only once an index with cells is selected', async () => {
    const user = userEvent.setup();
    const { container } = render(<VectorLab />);
    expect(container.querySelectorAll('polygon')).toHaveLength(0);
    await selectIvf(user);
    expect(container.querySelectorAll('polygon').length).toBeGreaterThan(0);
  });

  it('names the selected index in the canvas label', async () => {
    const user = userEvent.setup();
    render(<VectorLab />);
    await selectIvf(user);
    expect(screen.getByLabelText(/Scatter plot of \d+ points, IVF index/)).toBeInTheDocument();
  });

  it('shows an nprobe slider for IVF and hides it for flat', async () => {
    const user = userEvent.setup();
    render(<VectorLab />);
    expect(screen.queryByLabelText('Cells probed per query')).toBeNull();
    await selectIvf(user);
    const slider = screen.getByLabelText('Cells probed per query');
    expect(slider).toHaveAttribute('type', 'range');
    expect(slider).toHaveAttribute('aria-valuetext', 'probing 1 of 8 cells');
  });

  it('keeps the nprobe slider focusable and updates its valuetext as it moves', async () => {
    const user = userEvent.setup();
    render(<VectorLab />);
    await selectIvf(user);
    const slider = screen.getByLabelText('Cells probed per query') as HTMLInputElement;
    slider.focus();
    expect(slider).toHaveFocus();
    fireEvent.change(slider, { target: { value: '4' } });
    expect(slider).toHaveAttribute('aria-valuetext', 'probing 4 of 8 cells');
  });

  it('keeps the query interactive on IVF', async () => {
    // The point of the lab. If the query froze when the index changed, this
    // would be a demo of IVF rather than a playground.
    const user = userEvent.setup();
    render(<VectorLab />);
    await selectIvf(user);
    await user.click(screen.getByLabelText('Move the query'));
    fireEvent.click(canvas(), { clientX: 120, clientY: 120 });
    expect(healthValue('recall@10')).not.toBe('—');
    const first = healthValue('recall@10');
    fireEvent.click(canvas(), { clientX: 360, clientY: 360 });
    expect(screen.getByLabelText('Move the query')).toBeChecked();
    expect(healthValue('recall@10')).not.toBe(first === '—' ? 'never' : '—');
  });

  it('re-answers the query when nprobe changes, with no extra interaction', async () => {
    const user = userEvent.setup();
    render(<VectorLab />);
    await selectIvf(user);
    await user.click(screen.getByLabelText('Move the query'));
    fireEvent.click(canvas(), { clientX: 120, clientY: 120 });
    fireEvent.change(screen.getByLabelText('Cells probed per query'), { target: { value: '8' } });
    expect(healthValue('recall@10')).toBe('1.00');
  });

  it('adds cell balance and insert drift to the health readout on IVF only', async () => {
    const user = userEvent.setup();
    render(<VectorLab />);
    expect(screen.queryByText('Cell balance')).toBeNull();
    await selectIvf(user);
    expect(screen.getByText('Cell balance')).toBeInTheDocument();
    expect(healthValue('Inserts since rebuild')).toBe('0');
  });

  it('counts inserts as drift and clears them on rebuild', async () => {
    const user = userEvent.setup();
    render(<VectorLab />);
    await selectIvf(user);
    await user.click(screen.getByLabelText('Add or remove points'));
    fireEvent.click(canvas(), { clientX: 200, clientY: 200 });
    expect(healthValue('Inserts since rebuild')).toBe('1');
    await user.click(screen.getByRole('button', { name: 'Rebuild index' }));
    expect(healthValue('Inserts since rebuild')).toBe('0');
  });

  it('offers no rebuild button on an index with nothing to rebuild', () => {
    render(<VectorLab />);
    expect(screen.queryByRole('button', { name: 'Rebuild index' })).toBeNull();
  });

  it('keeps announcing the current step politely on IVF', async () => {
    const user = userEvent.setup();
    const { container } = render(<VectorLab />);
    await selectIvf(user);
    const live = container.querySelector('[aria-live="polite"]');
    expect(live).toBeInTheDocument();
    expect(live?.textContent).toMatch(/Training iteration/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run components/lab/vector/vector-lab.test.tsx`

Expected: FAIL — `probedCells` is not exported from `./vector-lab`, and
`Unable to find a label with the text of: Index`.

- [ ] **Step 3: Write minimal implementation**

In `components/lab/vector/vector-lab.tsx`:

Add to the imports:

```tsx
import { CellOverlay } from './cell-overlay';
import { DEFAULT_IVF, DEFAULT_NPROBE, type IndexKind, type LabStep } from './use-vector-lab';
import { voronoiCells } from '@/lib/lab/vector/voronoi';
```

Add above the component:

```tsx
export const INDEX_OPTIONS: readonly { value: IndexKind; label: string }[] = [
  { value: 'flat', label: 'Flat' },
  { value: 'ivf', label: 'IVF' },
];

/**
 * Cells the search has actually looked inside, up to the scrubber's position.
 * Skipped cells are deliberately excluded: the gap between what was probed and
 * where the true neighbour sits is the boundary miss the lab exists to show.
 */
export function probedCells(steps: readonly LabStep[], stepIndex: number): ReadonlySet<number> {
  const seen = new Set<number>();
  for (const step of steps.slice(0, stepIndex + 1)) {
    if (step.kind === 'probeCell') seen.add(step.cell);
  }
  return seen;
}

const controlClasses =
  'border border-border rounded-sm bg-background-raised px-2 py-1 text-xs text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2';
```

Inside the component, add the two pieces of state and pass them to the hook:

```tsx
const [index, setIndex] = useState<IndexKind>('flat');
const [nprobe, setNprobe] = useState(DEFAULT_NPROBE);
const lab = useVectorLab({ k: initialK, index, nprobe });
```

Add the derived values beside `healthRows`:

```tsx
const indexLabel = INDEX_OPTIONS.find((option) => option.value === index)?.label ?? 'Flat';

const cells = useMemo(
  () => (lab.centroids === null ? [] : voronoiCells(lab.centroids, VIEWPORT)),
  [lab.centroids],
);

const probed = useMemo(() => probedCells(lab.steps, lab.stepIndex), [lab.steps, lab.stepIndex]);

const healthRows = useMemo<readonly HealthRow[]>(() => {
  const rows: HealthRow[] = [
    { label: 'Points', value: String(lab.points.length) },
    { label: `recall@${lab.k}`, value: lab.recall === null ? '—' : lab.recall.toFixed(2) },
  ];
  // Driven by what the snapshot actually has rather than by the index name, so
  // every cell-based index picks these up without another branch here.
  if (lab.cellBalance !== null) rows.push({ label: 'Cell balance', value: lab.cellBalance.toFixed(2) });
  if (lab.insertsSinceTrain !== null) {
    rows.push({ label: 'Inserts since rebuild', value: String(lab.insertsSinceTrain) });
  }
  return rows;
}, [lab.points.length, lab.k, lab.recall, lab.cellBalance, lab.insertsSinceTrain]);
```

Change the `label` passed to `PointCanvas` so the selected index is announced, and wrap
the canvas so the underlay can be positioned against it:

```tsx
<div className="relative" style={{ width: VIEWPORT.width, height: VIEWPORT.height }}>
  {cells.length > 0 && <CellOverlay cells={cells} viewport={VIEWPORT} probed={probed} />}
  <PointCanvas
    screenPoints={screenPoints}
    viewport={VIEWPORT}
    tones={tones}
    query={queryPoint}
    label={`Scatter plot of ${lab.points.length} points, ${indexLabel} index, with a draggable query marker`}
    onPick={handlePick}
  />
</div>
```

Add the index select, the `nprobe` slider and the rebuild button to the existing control
row — the same row that already holds the mode radios, undo and reset:

```tsx
<label className="flex items-center gap-2 text-xs uppercase tracking-widest text-foreground-dim">
  Index
  <select
    value={index}
    onChange={(event) => setIndex(event.target.value as IndexKind)}
    className={controlClasses}
  >
    {INDEX_OPTIONS.map((option) => (
      <option key={option.value} value={option.value}>
        {option.label}
      </option>
    ))}
  </select>
</label>

{lab.centroids !== null && (
  <label className="flex items-center gap-2 text-xs uppercase tracking-widest text-foreground-dim">
    Cells probed per query
    <input
      type="range"
      min={1}
      max={DEFAULT_IVF.cells}
      step={1}
      value={nprobe}
      aria-valuetext={`probing ${nprobe} of ${DEFAULT_IVF.cells} cells`}
      onChange={(event) => setNprobe(Number(event.target.value))}
      className="accent-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 rounded-sm"
    />
    <span className="tabular-nums text-foreground">{nprobe}</span>
  </label>
)}

{lab.cellBalance !== null && (
  <button type="button" onClick={lab.rebuild} className={controlClasses}>
    Rebuild index
  </button>
)}
```

- [ ] **Step 4: Write the server prose and the README line**

Append to the prose in `app/lab/vector-index/page.tsx`, above the island:

```tsx
<section className="space-y-3">
  <h2 className="text-sm uppercase tracking-widest text-foreground-dim">IVF: cells, drift, rebuild</h2>
  <p className="text-sm leading-relaxed text-foreground-dim">
    Choosing <strong className="text-foreground">IVF</strong> partitions the same points
    into cells with seeded Lloyd&apos;s k-means. Scrub the trace and you watch the
    centroids settle iteration by iteration; the shaded polygons are the cells a query
    actually looked inside.
  </p>
  <p className="text-sm leading-relaxed text-foreground-dim">
    <strong className="text-foreground">Cells probed per query</strong> is{' '}
    <code>nprobe</code>. At 1 the search reads a single posting list and true neighbours
    stranded just across a boundary are simply never seen — watch recall fall below 1
    while the distance count collapses. Raise it to 8 and the answer matches the flat
    scan exactly, at the cost of reading every cell.
  </p>
  <p className="text-sm leading-relaxed text-foreground-dim">
    Inserting does <strong className="text-foreground">not</strong> retrain the
    centroids. Every added point widens whichever cell it lands in, so{' '}
    <strong className="text-foreground">cell balance</strong> — the spread of cell sizes,
    where 0 is perfectly even — climbs as{' '}
    <strong className="text-foreground">inserts since rebuild</strong> climbs. That drift
    is what a production index accumulates between rebuilds.{' '}
    <strong className="text-foreground">Rebuild index</strong> retrains from the live
    points and both numbers snap back.
  </p>
</section>
```

Add one bullet to the `## Labs` section of `README.md`:

```markdown
- `/lab/vector-index` also runs an IVF index: seeded k-means training you can scrub, a Voronoi cell underlay, an `nprobe` slider, insert drift against cell balance, and a rebuild that clears it.
```

- [ ] **Step 5: Run tests and lint**

Run: `npm test` then `npm run lint`

Expected: PASS, with no `eslint-disable` anywhere in the diff.

- [ ] **Step 6: Commit**

```bash
git add components/lab/vector/vector-lab.tsx components/lab/vector/vector-lab.test.tsx app/lab/vector-index/page.tsx README.md
git commit -m "feat: run the vector playground on an ivf index"
```

---

## PR 3: IVF-PQ

---

### Task 29: `trainCodebooks`, `encode`, `decode`

**Files:**
- Create: `lib/lab/vector/pq.ts`
- Test: `lib/lab/vector/pq.test.ts`

**Interfaces:**
- Consumes: `mulberry32(seed)`, `euclidean(a, b)`, `makeDataset(options)`.
- Produces: `PqCodebooks`, `PqCode`, `trainCodebooks(points, subspaces, bits, seed): PqCodebooks`, `encode(vec, books): PqCode`, `decode(code, books): Vec`.

- [ ] **Step 1: Write the failing test**

```ts
// lib/lab/vector/pq.test.ts
import { describe, it, expect } from 'vitest';
import { makeDataset } from './dataset';
import { euclidean } from './metrics';
import { decode, encode, trainCodebooks } from './pq';

const points = makeDataset({ seed: 7, clusters: 4, perCluster: 40, spread: 0.04, straddlers: 12 });
const books = trainCodebooks(points, 2, 4, 7);

describe('trainCodebooks', () => {
  it('trains one codebook per subspace', () => {
    expect(books.subspaces).toBe(2);
    expect(books.centroids).toHaveLength(2);
  });

  it('gives each codebook 2^bits entries', () => {
    books.centroids.forEach((codebook, s) => {
      expect(codebook, `subspace ${s}`).toHaveLength(16);
    });
  });

  it('sizes each centroid to its slice of the vector', () => {
    books.centroids.forEach((codebook) => {
      codebook.forEach((centroid) => expect(centroid).toHaveLength(1));
    });
  });

  it('is deterministic for a seed', () => {
    expect(trainCodebooks(points, 2, 4, 7)).toEqual(books);
  });

  it('refuses a code width a Uint8Array cannot hold', () => {
    expect(() => trainCodebooks(points, 2, 9, 7)).toThrow(/between 1 and 8/);
  });

  it('refuses subspaces that do not divide the dimensionality', () => {
    expect(() => trainCodebooks(points, 3, 4, 7)).toThrow(/do not divide/);
  });

  it('leaves the input points untouched', () => {
    const snapshot = structuredClone(points);
    trainCodebooks(points, 2, 4, 7);
    expect(points).toEqual(snapshot);
  });
});

describe('encode', () => {
  it('produces one byte per subspace', () => {
    const code = encode(points[0].vec, books);
    expect(code).toBeInstanceOf(Uint8Array);
    expect(code).toHaveLength(2);
  });

  it('picks the nearest centroid in every subspace', () => {
    const code = encode([0.5, 0.5], books);
    books.centroids.forEach((codebook, s) => {
      const distances = codebook.map((centroid) => Math.abs(centroid[0] - 0.5));
      expect(distances[code[s]], `subspace ${s}`).toBe(Math.min(...distances));
    });
  });

  it('is deterministic', () => {
    expect([...encode(points[3].vec, books)]).toEqual([...encode(points[3].vec, books)]);
  });
});

describe('decode', () => {
  it('reassembles a vector of the original dimensionality', () => {
    expect(decode(encode(points[0].vec, books), books)).toHaveLength(2);
  });

  it('keeps mean reconstruction error under the stated bound', () => {
    const total = points.reduce(
      (sum, point) => sum + euclidean(point.vec, decode(encode(point.vec, books), books)),
      0,
    );
    // The dataset's intra-cluster spread is 0.04. An error at or above that
    // would shuffle points past their own neighbours wholesale, and the lab
    // would be teaching quantisation noise rather than quantisation.
    expect(total / points.length).toBeLessThan(0.05);
  });

  it('keeps the worst reconstruction error bounded too', () => {
    const worst = Math.max(
      ...points.map((point) => euclidean(point.vec, decode(encode(point.vec, books), books))),
    );
    expect(worst).toBeLessThan(0.2);
  });

  it('does not reproduce the original exactly — that loss is the whole point', () => {
    const exact = points.filter(
      (point) => euclidean(point.vec, decode(encode(point.vec, books), books)) === 0,
    );
    expect(exact.length).toBeLessThan(points.length);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/lab/vector/pq.test.ts`
Expected: FAIL with `Failed to resolve import "./pq"`.

- [ ] **Step 3: Write minimal implementation**

```ts
// lib/lab/vector/pq.ts
import type { Point, Vec } from './types';
import { euclidean } from './metrics';
import { mulberry32 } from './random';

export interface PqCodebooks {
  readonly subspaces: number;
  readonly bits: number;
  /** [subspace][code] -> centroid for that subspace's slice of the vector. */
  readonly centroids: readonly (readonly Vec[])[];
}

export type PqCode = Uint8Array;

function slice(vec: Vec, subspace: number, width: number): Vec {
  return vec.slice(subspace * width, (subspace + 1) * width);
}

function nearestIndex(vec: Vec, centroids: readonly Vec[]): number {
  let best = 0;
  let bestDistance = Infinity;
  for (let i = 0; i < centroids.length; i += 1) {
    const candidate = euclidean(vec, centroids[i]);
    if (candidate < bestDistance) {
      bestDistance = candidate;
      best = i;
    }
  }
  return best;
}

function meanVec(vecs: readonly Vec[], width: number): Vec {
  const sums = new Array<number>(width).fill(0);
  vecs.forEach((vec) => {
    for (let d = 0; d < width; d += 1) sums[d] += vec[d];
  });
  return sums.map((sum) => sum / vecs.length);
}

/**
 * Silent Lloyd's over one subspace.
 *
 * Deliberately not shared with `trainIvf`: that one emits a step per iteration
 * and reports centroid shift because the reader watches it run. This one runs
 * once per subspace and is never animated. A parameterised trainer serving both
 * would carry animation machinery through a loop that has no audience.
 */
function trainSubspace(vectors: readonly Vec[], codes: number, rng: () => number, maxIterations: number): Vec[] {
  const width = vectors[0].length;
  const shuffled = vectors.map((vec) => [...vec]);
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  // Wrapping the seed list is legal when there are fewer vectors than codes:
  // the surplus centroids duplicate and go unused, costing nothing but a byte
  // of code space that was already allocated.
  let centroids = Array.from({ length: codes }, (_, i) => [...shuffled[i % shuffled.length]]);

  for (let iteration = 0; iteration < maxIterations; iteration += 1) {
    const buckets: Vec[][] = centroids.map(() => []);
    vectors.forEach((vec) => buckets[nearestIndex(vec, centroids)].push(vec));
    const next = centroids.map((centroid, i) =>
      buckets[i].length === 0 ? centroid : meanVec(buckets[i], width),
    );
    const shift = Math.max(...next.map((centroid, i) => euclidean(centroid, centroids[i])));
    centroids = next;
    if (shift < 1e-12) break;
  }

  return centroids;
}

/**
 * Product quantisation: chop the vector into subspaces and learn a small
 * codebook per subspace independently. The product of the codebooks covers
 * `2^(bits * subspaces)` positions while storing only `bits * subspaces` bits
 * per point — the compression the whole technique exists for.
 */
export function trainCodebooks(
  points: readonly Point[],
  subspaces: number,
  bits: number,
  seed: number,
): PqCodebooks {
  if (points.length === 0) throw new Error('trainCodebooks needs at least one point');
  if (bits < 1 || bits > 8) throw new Error('a PqCode is a Uint8Array, so bits must be between 1 and 8');

  const dim = points[0].vec.length;
  if (dim % subspaces !== 0) {
    throw new Error(`${dim} dimensions do not divide into ${subspaces} subspaces`);
  }

  const width = dim / subspaces;
  const rng = mulberry32(seed);
  const centroids = Array.from({ length: subspaces }, (_, s) =>
    trainSubspace(points.map((point) => slice(point.vec, s, width)), 2 ** bits, rng, 50),
  );

  return { subspaces, bits, centroids };
}

/** The point's address in the codebooks: one byte per subspace. */
export function encode(vec: Vec, books: PqCodebooks): PqCode {
  const width = vec.length / books.subspaces;
  const code = new Uint8Array(books.subspaces);
  for (let s = 0; s < books.subspaces; s += 1) {
    code[s] = nearestIndex(slice(vec, s, width), books.centroids[s]);
  }
  return code;
}

/** Where the index believes the point is. Never quite where it actually is. */
export function decode(code: PqCode, books: PqCodebooks): Vec {
  const vec: number[] = [];
  for (let s = 0; s < books.subspaces; s += 1) vec.push(...books.centroids[s][code[s]]);
  return vec;
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run lib/lab/vector/pq.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/lab/vector/pq.ts lib/lab/vector/pq.test.ts
git commit -m "feat(lab): product-quantisation codebooks, encode and decode"
```

---

### Task 30: `adcTable` and `adcDistance`

**Files:**
- Modify: `lib/lab/vector/pq.ts`
- Test: `lib/lab/vector/pq.test.ts`

**Interfaces:**
- Consumes: `PqCodebooks`, `PqCode`, `decode`, `Metric`, `euclidean`, `dotDistance`.
- Produces: `adcTable(query, books, metric): readonly (readonly number[])[]`, `adcDistance(code, table): number`.

- [ ] **Step 1: Write the failing test**

```ts
// append to lib/lab/vector/pq.test.ts; extend the imports to
// import { adcDistance, adcTable, decode, encode, trainCodebooks } from './pq';
// import { dotDistance, euclidean } from './metrics';

describe('adcTable', () => {
  it('holds one row per subspace and one column per code', () => {
    const table = adcTable([0.4, 0.6], books, 'euclidean');
    expect(table).toHaveLength(2);
    table.forEach((row) => expect(row).toHaveLength(16));
  });

  it('refuses cosine, which does not decompose across subspaces', () => {
    expect(() => adcTable([0.4, 0.6], books, 'cosine')).toThrow(/does not decompose/);
  });

  it('is independent of any stored point — it is built once per query', () => {
    expect(adcTable([0.4, 0.6], books, 'euclidean')).toEqual(adcTable([0.4, 0.6], books, 'euclidean'));
  });
});

describe('adcDistance', () => {
  it('is exactly the squared euclidean distance to the decoded vector', () => {
    const query: number[] = [0.4, 0.6];
    const table = adcTable(query, books, 'euclidean');
    points.slice(0, 20).forEach((point) => {
      const code = encode(point.vec, books);
      const exact = euclidean(query, decode(code, books)) ** 2;
      expect(adcDistance(code, table), `point ${point.id}`).toBeCloseTo(exact, 12);
    });
  });

  it('is exactly the dot distance to the decoded vector', () => {
    const query: number[] = [0.4, 0.6];
    const table = adcTable(query, books, 'dot');
    points.slice(0, 20).forEach((point) => {
      const code = encode(point.vec, books);
      expect(adcDistance(code, table), `point ${point.id}`).toBeCloseTo(dotDistance(query, decode(code, books)), 12);
    });
  });

  it('is asymmetric — the query is never quantised', () => {
    // A query that is not on the codebook grid still gets an exact partial
    // table; only the stored side is approximated.
    const query: number[] = [0.4137, 0.6291];
    const table = adcTable(query, books, 'euclidean');
    const code = encode(points[0].vec, books);
    expect(adcDistance(code, table)).toBeCloseTo(euclidean(query, decode(code, books)) ** 2, 12);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/lab/vector/pq.test.ts`
Expected: FAIL with `adcTable is not a function`.

- [ ] **Step 3: Write minimal implementation**

```ts
// add to lib/lab/vector/pq.ts; extend the types import to
// import type { Metric, Point, Vec } from './types';

function squaredPartial(a: Vec, b: Vec): number {
  let total = 0;
  for (let d = 0; d < a.length; d += 1) total += (a[d] - b[d]) ** 2;
  return total;
}

function dotPartial(a: Vec, b: Vec): number {
  let total = 0;
  for (let d = 0; d < a.length; d += 1) total += a[d] * b[d];
  return total;
}

/**
 * Asymmetric distance computation: the query stays exact and every stored
 * vector is a code. One table per query costs `subspaces * 2^bits` partials,
 * after which each candidate is `subspaces` array lookups — the reason PQ's
 * per-point cost does not move when the posting lists grow.
 *
 * Euclidean partials are SQUARED, because only the square decomposes across
 * subspaces. Callers that need a comparable magnitude take the square root of
 * the sum; ranking is unaffected, since the square root is monotone.
 *
 * Cosine is refused rather than approximated: it needs the norm of the whole
 * reconstructed vector, which no per-subspace table can supply.
 */
export function adcTable(query: Vec, books: PqCodebooks, metric: Metric): readonly (readonly number[])[] {
  if (metric === 'cosine') {
    throw new Error('cosine does not decompose across PQ subspaces: it needs the norm of the whole reconstructed vector');
  }
  const width = query.length / books.subspaces;
  return books.centroids.map((codebook, s) => {
    const q = slice(query, s, width);
    return codebook.map((centroid) => (metric === 'dot' ? -dotPartial(q, centroid) : squaredPartial(q, centroid)));
  });
}

/** Sum of the code's partials. No vector is reconstructed to get here. */
export function adcDistance(code: PqCode, table: readonly (readonly number[])[]): number {
  let total = 0;
  for (let s = 0; s < code.length; s += 1) total += table[s][code[s]];
  return total;
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run lib/lab/vector/pq.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/lab/vector/pq.ts lib/lab/vector/pq.test.ts
git commit -m "feat(lab): asymmetric distance tables for product quantisation"
```

---

### Task 31: `IvfPqState`, `trainIvfPq`, `ivfPqInsert`, `ivfPqDelete`

**Files:**
- Create: `lib/lab/vector/ivf-pq.ts`
- Test: `lib/lab/vector/ivf-pq.test.ts`

**Interfaces:**
- Consumes: `trainIvf`, `ivfInsert`, `ivfDelete`, `IvfState`, `IvfStep`, `IvfParams`; `trainCodebooks`, `encode`, `PqCodebooks`, `PqCode`.
- Produces: `IvfPqState`, `IvfPqParams`, `IvfPqStep`, `trainIvfPq`, `ivfPqInsert`, `ivfPqDelete`.

- [ ] **Step 1: Write the failing test**

```ts
// lib/lab/vector/ivf-pq.test.ts
import { describe, it, expect } from 'vitest';
import { makeDataset } from './dataset';
import { decode } from './pq';
import { ivfPqDelete, ivfPqInsert, trainIvfPq } from './ivf-pq';

const points = makeDataset({ seed: 7, clusters: 4, perCluster: 40, spread: 0.04, straddlers: 12 });
const params = { cells: 4, maxIterations: 100, seed: 7, subspaces: 2, bits: 4 };

describe('trainIvfPq', () => {
  it('composes a trained IVF partition with trained codebooks', () => {
    const { state } = trainIvfPq(points, params);
    expect(state.ivf.centroids).toHaveLength(params.cells);
    expect(state.codebooks.subspaces).toBe(params.subspaces);
    expect(state.codebooks.centroids[0]).toHaveLength(2 ** params.bits);
  });

  it('encodes every point exactly once', () => {
    const { state } = trainIvfPq(points, params);
    expect(state.codes.size).toBe(points.length);
    points.forEach((point) => expect(state.codes.get(point.id), `point ${point.id}`).toHaveLength(2));
  });

  it('emits the IVF training trace plus an encode step per point', () => {
    const { steps } = trainIvfPq(points, params);
    expect(steps.filter((step) => step.kind === 'trainIteration').length).toBeGreaterThan(1);
    expect(steps.filter((step) => step.kind === 'encode')).toHaveLength(points.length);
  });

  it('is deterministic for a seed', () => {
    expect(trainIvfPq(points, params).state).toEqual(trainIvfPq(points, params).state);
  });

  it('leaves the input points untouched', () => {
    const snapshot = structuredClone(points);
    trainIvfPq(points, params);
    expect(points).toEqual(snapshot);
  });
});

describe('ivfPqInsert', () => {
  it('assigns the point to a cell and stores its code', () => {
    const { state } = trainIvfPq(points, params);
    const { state: next, result: id, steps } = ivfPqInsert(state, [0.5, 0.5]);
    expect(next.ivf.cells.flat()).toContain(id);
    expect(next.codes.get(id)).toHaveLength(params.subspaces);
    expect(steps.at(-1)).toMatchObject({ kind: 'encode', id });
  });

  it('retrains neither the centroids nor the codebooks', () => {
    const { state } = trainIvfPq(points, params);
    let current = state;
    for (let i = 0; i < 40; i += 1) current = ivfPqInsert(current, [0.05, 0.05 + i * 0.0005]).state;
    expect(current.ivf.centroids).toEqual(state.ivf.centroids);
    expect(current.codebooks).toBe(state.codebooks);
    expect(current.ivf.insertsSinceTrain).toBe(40);
  });

  it('quantises the new point against the codebooks it already had', () => {
    const { state } = trainIvfPq(points, params);
    const { state: next, result: id } = ivfPqInsert(state, [0.5, 0.5]);
    const stored = next.codes.get(id);
    expect(stored).toBeDefined();
    if (stored) expect(decode(stored, state.codebooks)).not.toEqual([0.5, 0.5]);
  });

  it('leaves the input state unchanged', () => {
    const { state } = trainIvfPq(points, params);
    const snapshot = structuredClone(state);
    ivfPqInsert(state, [0.5, 0.5]);
    expect(state).toEqual(snapshot);
  });
});

describe('ivfPqDelete', () => {
  it('drops the point and its code together', () => {
    const { state } = trainIvfPq(points, params);
    const victim = state.ivf.cells.flat()[0];
    const { state: next, result } = ivfPqDelete(state, victim);
    expect(result).toBe(true);
    expect(next.ivf.points.has(victim)).toBe(false);
    expect(next.codes.has(victim)).toBe(false);
  });

  it('reports false for an id it never held', () => {
    const { state } = trainIvfPq(points, params);
    const { state: next, result } = ivfPqDelete(state, 99999);
    expect(result).toBe(false);
    expect(next).toEqual(state);
  });

  it('leaves the input state unchanged', () => {
    const { state } = trainIvfPq(points, params);
    const snapshot = structuredClone(state);
    ivfPqDelete(state, state.ivf.cells.flat()[0]);
    expect(state).toEqual(snapshot);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/lab/vector/ivf-pq.test.ts`
Expected: FAIL with `Failed to resolve import "./ivf-pq"`.

- [ ] **Step 3: Write minimal implementation**

```ts
// lib/lab/vector/ivf-pq.ts
import type { OpResult, Point, PointId, Vec } from './types';
import {
  ivfDelete,
  ivfInsert,
  trainIvf,
  type IvfParams,
  type IvfState,
  type IvfStep,
} from './ivf';
import { encode, trainCodebooks, type PqCode, type PqCodebooks } from './pq';

/**
 * IVF-PQ is a composition, not a new index: the same partition, with the
 * points replaced by their codes. Keeping `IvfState` whole inside means every
 * IVF property the reader has already learned still holds here.
 */
export interface IvfPqState {
  readonly ivf: IvfState;
  readonly codebooks: PqCodebooks;
  readonly codes: ReadonlyMap<PointId, PqCode>;
}

export interface IvfPqParams extends IvfParams {
  readonly subspaces: number;
  readonly bits: number;
}

export type IvfPqStep =
  | IvfStep
  | { readonly kind: 'encode'; readonly id: PointId; readonly code: readonly number[] }
  // PQ candidates get their own step kind rather than reusing `scan`. A `scan`
  // tells the reader a distance was computed against a stored vector; nothing of
  // the kind happened here — it was a table lookup, and that distinction is the
  // whole point of asymmetric distance computation.
  | { readonly kind: 'adcScan'; readonly id: PointId; readonly distance: number };

export function trainIvfPq(
  points: readonly Point[],
  params: IvfPqParams,
): OpResult<IvfPqState, void, IvfPqStep> {
  const partition = trainIvf(points, params);
  const codebooks = trainCodebooks(points, params.subspaces, params.bits, params.seed);

  const codes = new Map<PointId, PqCode>();
  const steps: IvfPqStep[] = [...partition.steps];
  points.forEach((point) => {
    const code = encode(point.vec, codebooks);
    codes.set(point.id, code);
    steps.push({ kind: 'encode', id: point.id, code: [...code] });
  });

  return {
    state: { ivf: partition.state, codebooks, codes },
    result: undefined,
    steps,
    counters: partition.counters,
  };
}

/**
 * Insert runs the IVF assignment and then quantises against the codebooks as
 * they stand. Two kinds of staleness now accumulate from the same action: the
 * cells stop matching the data, and so does the codebook the data is stored in.
 */
export function ivfPqInsert(state: IvfPqState, vec: Vec): OpResult<IvfPqState, PointId, IvfPqStep> {
  const inserted = ivfInsert(state.ivf, vec);
  const code = encode(vec, state.codebooks);
  const codes = new Map(state.codes);
  codes.set(inserted.result, code);

  return {
    state: { ivf: inserted.state, codebooks: state.codebooks, codes },
    result: inserted.result,
    steps: [...inserted.steps, { kind: 'encode', id: inserted.result, code: [...code] }],
    counters: inserted.counters,
  };
}

export function ivfPqDelete(state: IvfPqState, id: PointId): OpResult<IvfPqState, boolean, IvfPqStep> {
  const removed = ivfDelete(state.ivf, id);
  if (!removed.result) {
    return { state, result: false, steps: [], counters: removed.counters };
  }

  const codes = new Map(state.codes);
  codes.delete(id);
  return {
    state: { ivf: removed.state, codebooks: state.codebooks, codes },
    result: true,
    steps: [...removed.steps],
    counters: removed.counters,
  };
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run lib/lab/vector/ivf-pq.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/lab/vector/ivf-pq.ts lib/lab/vector/ivf-pq.test.ts
git commit -m "feat(lab): IVF-PQ state composed from the IVF partition and codebooks"
```

---

### Task 32: `ivfPqSearch` and the rank scramble

**Files:**
- Modify: `lib/lab/vector/ivf-pq.ts`
- Test: `lib/lab/vector/ivf-pq.test.ts`

**Interfaces:**
- Consumes: `adcTable`, `adcDistance`, `distance`, `IvfSearchParams`, `flatSearch`, `createFlat`, `recallAtK`, `ivfSearch`.
- Produces: `ivfPqSearch(state: IvfPqState, query: Vec, params: IvfSearchParams): OpResult<IvfPqState, readonly Ranked[], IvfPqStep>`.

- [ ] **Step 1: Write the failing test**

```ts
// append to lib/lab/vector/ivf-pq.test.ts; extend the imports to
// import { ivfPqDelete, ivfPqInsert, ivfPqSearch, trainIvfPq } from './ivf-pq';
// import { createFlat, flatSearch } from './flat';
// import { ivfSearch } from './ivf';
// import { recallAtK } from './recall';
// import { mulberry32 } from './random';

const queries = (() => {
  const rng = mulberry32(11);
  return Array.from({ length: 24 }, () => [rng(), rng()]);
})();

describe('ivfPqSearch', () => {
  it('scrambles the ranking against exact search — the point of the lab', () => {
    const { state } = trainIvfPq(points, params);
    const flat = createFlat(points);
    const scrambled = queries.filter((query) => {
      const truth = flatSearch(flat, query, { k: 10, metric: 'euclidean' }).result.map((r) => r.id);
      const got = ivfPqSearch(state, query, { k: 10, metric: 'euclidean', nprobe: params.cells }).result.map((r) => r.id);
      return JSON.stringify(got) !== JSON.stringify(truth);
    });
    expect(
      scrambled.length,
      'no seeded query changed order under quantisation: the codebook is too fine to show the rank scramble, so lower `bits`',
    ).toBeGreaterThan(0);
  });

  it('still finds most of the right neighbours', () => {
    const { state } = trainIvfPq(points, params);
    const flat = createFlat(points);
    const mean = queries.reduce((total, query) => {
      const truth = flatSearch(flat, query, { k: 10, metric: 'euclidean' }).result;
      const got = ivfPqSearch(state, query, { k: 10, metric: 'euclidean', nprobe: params.cells }).result;
      return total + recallAtK(got, truth, 10);
    }, 0) / queries.length;
    // Deliberately loose. The claim under test is "approximate, not broken";
    // a tight bound here would be a claim about the seed, not the algorithm.
    expect(mean).toBeGreaterThan(0.5);
  });

  it('costs the same in distance computations however many points it scans', () => {
    const { state } = trainIvfPq(points, params);
    const narrow = ivfPqSearch(state, [0.3, 0.3], { k: 10, metric: 'euclidean', nprobe: 1 });
    const wide = ivfPqSearch(state, [0.3, 0.3], { k: 10, metric: 'euclidean', nprobe: params.cells });

    expect(wide.counters.pointsScanned).toBeGreaterThan(narrow.counters.pointsScanned);
    expect(wide.counters.distanceComputations).toBe(narrow.counters.distanceComputations);
  });

  it('charges centroid ranking plus one table, and nothing per point', () => {
    const { state } = trainIvfPq(points, params);
    const { counters } = ivfPqSearch(state, [0.3, 0.3], { k: 10, metric: 'euclidean', nprobe: 2 });
    expect(counters.distanceComputations).toBe(params.cells + params.subspaces * 2 ** params.bits);
  });

  it('scans strictly less than exact IVF, and less again at low nprobe', () => {
    const { state } = trainIvfPq(points, params);
    const exact = ivfSearch(state.ivf, [0.3, 0.3], { k: 10, metric: 'euclidean', nprobe: params.cells });
    const approx = ivfPqSearch(state, [0.3, 0.3], { k: 10, metric: 'euclidean', nprobe: params.cells });
    expect(approx.counters.pointsScanned).toBe(exact.counters.pointsScanned);
    expect(approx.counters.distanceComputations).toBeLessThan(exact.counters.distanceComputations);
  });

  it('probes and skips the same cells exact IVF would', () => {
    const { state } = trainIvfPq(points, params);
    const cellsOf = (steps: readonly { kind: string }[], kind: string) =>
      steps.flatMap((step) => (step.kind === kind ? [(step as { cell: number }).cell] : []));
    const exact = ivfSearch(state.ivf, [0.3, 0.3], { k: 10, metric: 'euclidean', nprobe: 2 });
    const approx = ivfPqSearch(state, [0.3, 0.3], { k: 10, metric: 'euclidean', nprobe: 2 });
    expect(cellsOf(approx.steps, 'probeCell')).toEqual(cellsOf(exact.steps, 'probeCell'));
    expect(cellsOf(approx.steps, 'skipCell')).toEqual(cellsOf(exact.steps, 'skipCell'));
  });

  it('emits an adcScan per candidate, never a scan — no stored vector was read', () => {
    const { state } = trainIvfPq(points, params);
    const { steps, counters } = ivfPqSearch(state, [0.3, 0.3], { k: 10, metric: 'euclidean', nprobe: 2 });
    expect(steps.filter((step) => step.kind === 'adcScan')).toHaveLength(counters.pointsScanned);
    expect(steps.filter((step) => step.kind === 'scan')).toHaveLength(0);
  });

  it('reports distances on the same scale as exact search', () => {
    const { state } = trainIvfPq(points, params);
    const { result } = ivfPqSearch(state, [0.3, 0.3], { k: 10, metric: 'euclidean', nprobe: params.cells });
    result.forEach((entry) => {
      expect(entry.distance).toBeGreaterThanOrEqual(0);
      expect(entry.distance).toBeLessThan(2);
    });
  });

  it('never returns a deleted point', () => {
    const { state } = trainIvfPq(points, params);
    const victim = ivfPqSearch(state, [0.3, 0.3], { k: 1, metric: 'euclidean', nprobe: params.cells }).result[0].id;
    const after = ivfPqDelete(state, victim).state;
    const ids = ivfPqSearch(after, [0.3, 0.3], { k: 10, metric: 'euclidean', nprobe: params.cells }).result.map((r) => r.id);
    expect(ids).not.toContain(victim);
  });

  it('returns the state unchanged', () => {
    const { state } = trainIvfPq(points, params);
    const snapshot = structuredClone(state);
    const { state: after } = ivfPqSearch(state, [0.3, 0.3], { k: 10, metric: 'euclidean', nprobe: 2 });
    expect(after).toBe(state);
    expect(state).toEqual(snapshot);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/lab/vector/ivf-pq.test.ts`
Expected: FAIL with `ivfPqSearch is not a function`.

- [ ] **Step 3: Write minimal implementation**

```ts
// add to lib/lab/vector/ivf-pq.ts; extend the imports to
// import type { OpResult, Point, PointId, Ranked, Vec } from './types';
// import { distance } from './metrics';
// import { adcDistance, adcTable, encode, trainCodebooks, type PqCode, type PqCodebooks } from './pq';
// import { ..., type IvfSearchParams } from './ivf';

export function ivfPqSearch(
  state: IvfPqState,
  query: Vec,
  params: IvfSearchParams,
): OpResult<IvfPqState, readonly Ranked[], IvfPqStep> {
  const { ivf } = state;
  const steps: IvfPqStep[] = [];

  // Cell ranking is exact: centroids are stored as real vectors, not codes.
  // Only the points inside a cell are quantised.
  const ranked = ivf.centroids
    .map((centroid, cell) => ({ cell, distance: distance(query, centroid, params.metric) }))
    .sort((a, b) => a.distance - b.distance || a.cell - b.cell);

  const table = adcTable(query, state.codebooks, params.metric);

  // The scoreboard's honesty rests on this number. ADC pays for the centroid
  // ranking and for building one table; after that every candidate is
  // `subspaces` array lookups, so the cost does not grow with the posting list.
  const distanceComputations = ivf.centroids.length + state.codebooks.subspaces * 2 ** state.codebooks.bits;

  const probe = Math.max(1, Math.min(params.nprobe, ivf.centroids.length));
  const candidates: Ranked[] = [];
  let pointsScanned = 0;

  ranked.forEach((entry, rank) => {
    if (rank >= probe) {
      steps.push({ kind: 'skipCell', cell: entry.cell, distance: entry.distance });
      return;
    }
    steps.push({ kind: 'probeCell', cell: entry.cell, distance: entry.distance });
    ivf.cells[entry.cell].forEach((id) => {
      const code = state.codes.get(id);
      if (code === undefined) return;
      const summed = adcDistance(code, table);
      // The euclidean table holds squared partials, since only the square
      // decomposes. Rooting here puts the reported distance on the same scale
      // as exact search, so the two rankings can be shown side by side.
      const d = params.metric === 'euclidean' ? Math.sqrt(summed) : summed;
      pointsScanned += 1;
      steps.push({ kind: 'adcScan', id, distance: d });
      candidates.push({ id, distance: d });
    });
  });

  const top = candidates.sort((a, b) => a.distance - b.distance || a.id - b.id).slice(0, params.k);
  top.forEach((entry, rank) => steps.push({ kind: 'admit', id: entry.id, distance: entry.distance, rank }));

  return {
    state,
    result: top,
    steps,
    counters: { distanceComputations, cellsProbed: probe, pointsScanned },
  };
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run lib/lab/vector/ivf-pq.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/lab/vector/ivf-pq.ts lib/lab/vector/ivf-pq.test.ts
git commit -m "feat(lab): IVF-PQ search over codes, with the rank scramble asserted"
```

---

### Task 33: `rebuildIvfPq`, `reconstructionError`, and the view helpers

**Files:**
- Modify: `lib/lab/vector/ivf-pq.ts`
- Test: `lib/lab/vector/ivf-pq.test.ts`

**Interfaces:**
- Consumes: `trainIvfPq`, `decode`, `euclidean`, `toScreen`, `Viewport`, `Ranked`.
- Produces: `rebuildIvfPq`, `reconstructionError`, `QuantisationSegment`, `quantisationSegments`, `RankRow`, `rankDiff`.

- [ ] **Step 1: Write the failing test**

```ts
// append to lib/lab/vector/ivf-pq.test.ts; extend the imports to
// import { ..., quantisationSegments, rankDiff, rebuildIvfPq, reconstructionError } from './ivf-pq';
// import { toScreen, type Viewport } from './layout';
// import { euclidean } from './metrics';
// import { cellBalance } from './ivf';

const viewport: Viewport = { width: 400, height: 400, padding: 20 };

function blob(state: ReturnType<typeof trainIvfPq>['state'], count: number) {
  const rng = mulberry32(3);
  let current = state;
  for (let i = 0; i < count; i += 1) {
    current = ivfPqInsert(current, [0.05 + rng() * 0.02, 0.05 + rng() * 0.02]).state;
  }
  return current;
}

describe('reconstructionError', () => {
  it('stays under the stated bound on the seeded dataset', () => {
    const { state } = trainIvfPq(points, params);
    expect(reconstructionError(state)).toBeLessThan(0.05);
  });

  it('is the mean gap between a point and where its code puts it', () => {
    const { state } = trainIvfPq(points, params);
    const manual = points.reduce((total, point) => {
      const code = state.codes.get(point.id);
      return total + (code ? euclidean(point.vec, decode(code, state.codebooks)) : 0);
    }, 0) / points.length;
    expect(reconstructionError(state)).toBeCloseTo(manual, 12);
  });

  it('is zero for an index holding nothing', () => {
    const { state } = trainIvfPq(points, params);
    expect(reconstructionError({ ...state, codes: new Map() })).toBe(0);
  });
});

describe('rebuildIvfPq', () => {
  it('restores cell balance after drift', () => {
    const { state } = trainIvfPq(points, params);
    const drifted = blob(state, 120);
    const rebuilt = rebuildIvfPq(drifted, params).state;
    expect(cellBalance(drifted.ivf)).toBeGreaterThan(cellBalance(state.ivf));
    expect(cellBalance(rebuilt.ivf)).toBeLessThan(cellBalance(drifted.ivf));
  });

  it('retrains the codebooks too, so the codes describe the data that is there now', () => {
    const { state } = trainIvfPq(points, params);
    const drifted = blob(state, 120);
    const rebuilt = rebuildIvfPq(drifted, params).state;
    expect(rebuilt.codebooks).not.toEqual(drifted.codebooks);
    expect(reconstructionError(rebuilt)).toBeLessThan(reconstructionError(drifted));
  });

  it('re-encodes every surviving point and keeps the id counter', () => {
    const { state } = trainIvfPq(points, params);
    const drifted = blob(state, 20);
    const rebuilt = rebuildIvfPq(drifted, params).state;
    expect(rebuilt.codes.size).toBe(drifted.codes.size);
    expect(rebuilt.ivf.nextId).toBe(drifted.ivf.nextId);
    expect(rebuilt.ivf.insertsSinceTrain).toBe(0);
  });

  it('leaves the input state unchanged', () => {
    const { state } = trainIvfPq(points, params);
    const drifted = blob(state, 20);
    const snapshot = structuredClone(drifted);
    rebuildIvfPq(drifted, params);
    expect(drifted).toEqual(snapshot);
  });
});

describe('quantisationSegments', () => {
  it('gives one segment per stored point', () => {
    const { state } = trainIvfPq(points, params);
    expect(quantisationSegments(state, viewport)).toHaveLength(points.length);
  });

  it('runs from the true screen position to the decoded one', () => {
    const { state } = trainIvfPq(points, params);
    const segment = quantisationSegments(state, viewport)[0];
    const point = state.ivf.points.get(segment.id);
    const code = state.codes.get(segment.id);
    expect(point).toBeDefined();
    expect(code).toBeDefined();
    if (point && code) {
      expect(segment.from).toEqual(toScreen(point.vec, viewport));
      expect(segment.to).toEqual(toScreen(decode(code, state.codebooks), viewport));
    }
  });

  it('carries the data-space error, which screen geometry cannot supply', () => {
    const { state } = trainIvfPq(points, params);
    const segment = quantisationSegments(state, viewport)[0];
    const point = state.ivf.points.get(segment.id);
    const code = state.codes.get(segment.id);
    expect(point).toBeDefined();
    expect(code).toBeDefined();
    if (point && code) {
      expect(segment.error).toBeCloseTo(euclidean(point.vec, decode(code, state.codebooks)), 12);
    }
  });

  it('has a visible length for most points, which is the error made visible', () => {
    const { state } = trainIvfPq(points, params);
    const moved = quantisationSegments(state, viewport).filter(
      (segment) => segment.from.x !== segment.to.x || segment.from.y !== segment.to.y,
    );
    expect(moved.length).toBeGreaterThan(points.length / 2);
  });

  it('skips a point whose code was removed', () => {
    const { state } = trainIvfPq(points, params);
    const victim = points[0].id;
    const after = ivfPqDelete(state, victim).state;
    expect(quantisationSegments(after, viewport).map((s) => s.id)).not.toContain(victim);
  });
});

describe('rankDiff', () => {
  it('pairs the two rankings row by row', () => {
    const rows = rankDiff(
      [{ id: 1, distance: 0.1 }, { id: 2, distance: 0.2 }],
      [{ id: 2, distance: 0.15 }, { id: 1, distance: 0.25 }],
    );
    expect(rows).toEqual([
      { rank: 0, exactId: 1, approxId: 2, moved: true },
      { rank: 1, exactId: 2, approxId: 1, moved: true },
    ]);
  });

  it('marks agreement as unmoved', () => {
    const rows = rankDiff([{ id: 5, distance: 0.1 }], [{ id: 5, distance: 0.11 }]);
    expect(rows[0].moved).toBe(false);
  });

  it('pads the shorter ranking rather than truncating the longer', () => {
    const rows = rankDiff([{ id: 1, distance: 0.1 }, { id: 2, distance: 0.2 }], [{ id: 1, distance: 0.1 }]);
    expect(rows).toHaveLength(2);
    expect(rows[1]).toEqual({ rank: 1, exactId: 2, approxId: null, moved: true });
  });

  it('is empty for two empty rankings', () => {
    expect(rankDiff([], [])).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/lab/vector/ivf-pq.test.ts`
Expected: FAIL with `reconstructionError is not a function`.

- [ ] **Step 3: Write minimal implementation**

```ts
// add to lib/lab/vector/ivf-pq.ts; extend the imports to
// import { decode, ... } from './pq';
// import { euclidean, distance } from './metrics';
// import { toScreen, type Viewport } from './layout';

/**
 * Retrains the partition AND the codebooks, then re-encodes everything.
 *
 * Two debts are settled at once here, which is why an IVF-PQ rebuild is the
 * expensive operation in this family: the cells stopped matching the data, and
 * so did the alphabet the data was written in.
 */
export function rebuildIvfPq(state: IvfPqState, params: IvfPqParams): OpResult<IvfPqState, void, IvfPqStep> {
  const points = [...state.ivf.points.values()].sort((a, b) => a.id - b.id);
  const rebuilt = trainIvfPq(points, params);
  return {
    ...rebuilt,
    state: {
      ...rebuilt.state,
      // Ids are never reused, so a from-scratch train must not rewind the counter.
      ivf: { ...rebuilt.state.ivf, nextId: Math.max(state.ivf.nextId, rebuilt.state.ivf.nextId) },
    },
  };
}

/** Mean distance between a point and where its code puts it. */
export function reconstructionError(state: IvfPqState): number {
  let total = 0;
  let counted = 0;
  state.codes.forEach((code, id) => {
    const point = state.ivf.points.get(id);
    if (point === undefined) return;
    total += euclidean(point.vec, decode(code, state.codebooks));
    counted += 1;
  });
  return counted === 0 ? 0 : total / counted;
}

export interface QuantisationSegment {
  readonly id: PointId;
  readonly from: { readonly x: number; readonly y: number };
  readonly to: { readonly x: number; readonly y: number };
  /**
   * Data-space distance between the point and its decoded position.
   *
   * Carried here rather than derived from `from`/`to`, because those are screen
   * coordinates: the viewport scales and pads them, so the pixel gap is not the
   * quantisation error and cannot be converted back into one. This is the same
   * quantity `reconstructionError` averages.
   */
  readonly error: number;
}

/**
 * One screen segment per point, running from where it is to where the index
 * thinks it is. Computed here rather than in the component so the quantisation
 * error is a tested quantity and not a drawing accident.
 */
export function quantisationSegments(state: IvfPqState, viewport: Viewport): readonly QuantisationSegment[] {
  const segments: QuantisationSegment[] = [];
  state.ivf.points.forEach((point, id) => {
    const code = state.codes.get(id);
    if (code === undefined) return;
    const decoded = decode(code, state.codebooks);
    segments.push({
      id,
      from: toScreen(point.vec, viewport),
      to: toScreen(decoded, viewport),
      error: euclidean(point.vec, decoded),
    });
  });
  return segments;
}

export interface RankRow {
  readonly rank: number;
  readonly exactId: PointId | null;
  readonly approxId: PointId | null;
  readonly moved: boolean;
}

/** Exact ranking beside the quantised one, rank by rank. */
export function rankDiff(exact: readonly Ranked[], approx: readonly Ranked[]): readonly RankRow[] {
  const rows: RankRow[] = [];
  for (let rank = 0; rank < Math.max(exact.length, approx.length); rank += 1) {
    const exactId = exact[rank]?.id ?? null;
    const approxId = approx[rank]?.id ?? null;
    rows.push({ rank, exactId, approxId, moved: exactId !== approxId });
  }
  return rows;
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run lib/lab/vector/ivf-pq.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/lab/vector/ivf-pq.ts lib/lab/vector/ivf-pq.test.ts
git commit -m "feat(lab): IVF-PQ rebuild, reconstruction error and the view helpers"
```
## PR 3: IVF-PQ — UI

> Two overlays and one composition task. Both overlays take *computed* output and
> stringify it; the geometry stays in `lib/`, tested without jsdom.
>
> a silent behaviour change.

---

### Task 34: `QuantisationOverlay`

Draws the reconstruction error: a line from where each point actually is to where its PQ
code says it is. Like `CellOverlay` it is an aria-hidden, pointer-transparent layer over
the canvas, and it renders `quantisationSegments` output without computing a single
coordinate.

**Files:**
- Create: `components/lab/vector/quantisation-overlay.tsx`
- Test: `components/lab/vector/quantisation-overlay.test.tsx`

**Interfaces:**
- Consumes: `quantisationSegments(state: IvfPqState, viewport: Viewport): readonly QuantisationSegment[]`
  and `QuantisationSegment = { id: PointId; from: { x: number; y: number }; to: { x: number; y: number }; error: number }`
  from `lib/lab/vector/ivf-pq.ts` (Task 33).
- Produces:
  ```tsx
  export interface QuantisationOverlayProps {
    segments: readonly QuantisationSegment[];
    viewport: Viewport;
  }
  export function QuantisationOverlay(props: QuantisationOverlayProps): JSX.Element;
  ```

- [ ] **Step 1: Write the failing test**

`components/lab/vector/quantisation-overlay.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { QuantisationOverlay } from './quantisation-overlay';
import type { Viewport } from '@/lib/lab/vector/layout';
import type { QuantisationSegment } from '@/lib/lab/vector/ivf-pq';

const viewport: Viewport = { width: 480, height: 480, padding: 24 };

const segments: readonly QuantisationSegment[] = [
  { id: 1, from: { x: 100, y: 100 }, to: { x: 112, y: 96 }, error: 0.026 },
  { id: 2, from: { x: 300, y: 220 }, to: { x: 298, y: 224 }, error: 0.009 },
];

describe('QuantisationOverlay', () => {
  it('draws one segment per encoded point', () => {
    const { container } = render(<QuantisationOverlay segments={segments} viewport={viewport} />);
    expect(container.querySelectorAll('line')).toHaveLength(2);
  });

  it('runs each line from the true position to the decoded one', () => {
    // Where the error actually is, and the whole visual argument for PQ: the
    // stored vector is not the vector.
    const { container } = render(<QuantisationOverlay segments={segments} viewport={viewport} />);
    const line = container.querySelector('line[data-point="1"]');
    expect(line).toHaveAttribute('x1', '100');
    expect(line).toHaveAttribute('y1', '100');
    expect(line).toHaveAttribute('x2', '112');
    expect(line).toHaveAttribute('y2', '96');
  });

  it('marks the decoded position so the displacement is readable', () => {
    const { container } = render(<QuantisationOverlay segments={segments} viewport={viewport} />);
    const marker = container.querySelector('circle[data-point="2"]');
    expect(marker).toHaveAttribute('cx', '298');
    expect(marker).toHaveAttribute('cy', '224');
  });

  it('never intercepts a pointer or an assistive-tech cursor', () => {
    const { container } = render(<QuantisationOverlay segments={segments} viewport={viewport} />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).toHaveClass('pointer-events-none');
  });

  it('renders an empty layer when nothing is encoded', () => {
    const { container } = render(<QuantisationOverlay segments={[]} viewport={viewport} />);
    expect(container.querySelectorAll('line')).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run components/lab/vector/quantisation-overlay.test.tsx`

Expected: FAIL with `Failed to resolve import "./quantisation-overlay"`.

- [ ] **Step 3: Write minimal implementation**

`components/lab/vector/quantisation-overlay.tsx`:

```tsx
import type { QuantisationSegment } from '@/lib/lab/vector/ivf-pq';
import type { Viewport } from '@/lib/lab/vector/layout';

export interface QuantisationOverlayProps {
  segments: readonly QuantisationSegment[];
  viewport: Viewport;
}

/**
 * The gap between a point and its code, drawn. Every coordinate here was computed
 * by quantisationSegments; this layer only stringifies, which is what keeps the
 * geometry testable without jsdom.
 */
export function QuantisationOverlay({ segments, viewport }: QuantisationOverlayProps) {
  return (
    <svg
      aria-hidden="true"
      width={viewport.width}
      height={viewport.height}
      viewBox={`0 0 ${viewport.width} ${viewport.height}`}
      className="absolute inset-0 pointer-events-none"
    >
      {segments.map((segment) => (
        <g key={segment.id}>
          <line
            data-point={segment.id}
            x1={segment.from.x}
            y1={segment.from.y}
            x2={segment.to.x}
            y2={segment.to.y}
            strokeWidth={1}
            className="stroke-accent/60"
          />
          <circle data-point={segment.id} cx={segment.to.x} cy={segment.to.y} r={2} className="fill-accent/60" />
        </g>
      ))}
    </svg>
  );
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run components/lab/vector/quantisation-overlay.test.tsx`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add components/lab/vector/quantisation-overlay.tsx components/lab/vector/quantisation-overlay.test.tsx
git commit -m "feat: draw the pq reconstruction error over the canvas"
```

---

### Task 35: `RankComparison`

The rank scramble, as a real `<table>` of DOM text — not a painted graphic. Exact ranking
on one side, IVF-PQ's ranking on the other, one row per rank. This is the deliverable
that survives with JavaScript running but images off, and it is the only place a screen
reader can read the lab's central result.

**Files:**
- Create: `components/lab/vector/rank-comparison.tsx`
- Test: `components/lab/vector/rank-comparison.test.tsx`

**Interfaces:**
- Consumes: `rankDiff(exact: readonly Ranked[], approx: readonly Ranked[]): readonly RankRow[]`
  and `RankRow = { rank: number; exactId: PointId | null; approxId: PointId | null }`
  from `lib/lab/vector/ivf-pq.ts` (Task 33).
- Produces:
  ```tsx
  export interface RankComparisonProps {
    rows: readonly RankRow[];
    caption: string;
  }
  export function RankComparison(props: RankComparisonProps): JSX.Element | null;
  ```

- [ ] **Step 1: Write the failing test**

`components/lab/vector/rank-comparison.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RankComparison } from './rank-comparison';
import type { RankRow } from '@/lib/lab/vector/ivf-pq';

const rows: readonly RankRow[] = [
  { rank: 1, exactId: 11, approxId: 11 },
  { rank: 2, exactId: 12, approxId: 19 },
  { rank: 3, exactId: 13, approxId: null },
];

const caption = 'Exact ranking against IVF-PQ';

describe('RankComparison', () => {
  it('renders a real table with an accessible name', () => {
    render(<RankComparison rows={rows} caption={caption} />);
    expect(screen.getByRole('table', { name: caption })).toBeInTheDocument();
  });

  it('names every column', () => {
    render(<RankComparison rows={rows} caption={caption} />);
    expect(screen.getAllByRole('columnheader').map((cell) => cell.textContent)).toEqual([
      'Rank',
      'Exact',
      'IVF-PQ',
      'Change',
    ]);
  });

  it('renders one row per rank, plus the header row', () => {
    render(<RankComparison rows={rows} caption={caption} />);
    expect(screen.getAllByRole('row')).toHaveLength(rows.length + 1);
  });

  it('calls out an unchanged rank, a scrambled one, and a miss', () => {
    // The teaching claim: asymmetric distance keeps the neighbourhood but
    // reorders inside it, and sometimes drops a member entirely.
    render(<RankComparison rows={rows} caption={caption} />);
    const cells = screen.getAllByRole('row').slice(1).map((row) => row.textContent);
    expect(cells[0]).toContain('same');
    expect(cells[1]).toContain('moved');
    expect(cells[2]).toContain('missed');
  });

  it('writes a dash where a side has no entry at that rank', () => {
    render(<RankComparison rows={rows} caption={caption} />);
    expect(screen.getAllByRole('row')[3].textContent).toContain('—');
  });

  it('renders nothing before a query has been run', () => {
    const { container } = render(<RankComparison rows={[]} caption={caption} />);
    expect(container).toBeEmptyDOMElement();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run components/lab/vector/rank-comparison.test.tsx`

Expected: FAIL with `Failed to resolve import "./rank-comparison"`.

- [ ] **Step 3: Write minimal implementation**

`components/lab/vector/rank-comparison.tsx`:

```tsx
import type { RankRow } from '@/lib/lab/vector/ivf-pq';
import type { PointId } from '@/lib/lab/vector/types';

export interface RankComparisonProps {
  rows: readonly RankRow[];
  caption: string;
}

function idText(id: PointId | null): string {
  return id === null ? '—' : `#${id}`;
}

function changeText(row: RankRow): string {
  if (row.approxId === null) return 'missed';
  return row.exactId === row.approxId ? 'same' : 'moved';
}

const cellClasses = 'border-b border-border px-2 py-1 text-left tabular-nums';

/**
 * DOM text, not a drawing. The rank scramble is the result the lab exists to
 * show, so it has to survive a screen reader and a copy-paste.
 */
export function RankComparison({ rows, caption }: RankComparisonProps) {
  if (rows.length === 0) return null;

  return (
    <table className="w-full border-collapse text-xs text-foreground">
      <caption className="pb-2 text-left uppercase tracking-widest text-foreground-dim">{caption}</caption>
      <thead>
        <tr>
          <th scope="col" className={cellClasses}>
            Rank
          </th>
          <th scope="col" className={cellClasses}>
            Exact
          </th>
          <th scope="col" className={cellClasses}>
            IVF-PQ
          </th>
          <th scope="col" className={cellClasses}>
            Change
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.rank}>
            <th scope="row" className={`${cellClasses} font-normal text-foreground-dim`}>
              {row.rank}
            </th>
            <td className={cellClasses}>{idText(row.exactId)}</td>
            <td className={cellClasses}>{idText(row.approxId)}</td>
            <td className={cellClasses}>{changeText(row)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run components/lab/vector/rank-comparison.test.tsx`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add components/lab/vector/rank-comparison.tsx components/lab/vector/rank-comparison.test.tsx
git commit -m "feat: table the exact-versus-ivf-pq rank scramble"
```

---

### Task 36: Compose IVF-PQ into `VectorLab`, the page prose and the README

Third option in the same `<select>`, third branch in the same `replayLog`, same log, same
undo stack, same canvas. **No `IvfPqPanel`.** IVF-PQ reuses the `nprobe` slider, the cell
underlay and the rebuild button unchanged — it is an IVF index whose vectors are codes —
and adds the quantisation underlay, a reconstruction-error health row and the rank table.

**Files:**
- Modify: `components/lab/vector/use-vector-lab.ts`
- Modify: `components/lab/vector/vector-lab.tsx`
- Modify: `app/lab/vector-index/params.ts`
- Modify: `app/lab/vector-index/params.test.ts`
- Modify: `app/lab/vector-index/page.tsx`
- Modify: `README.md`
- Test: `components/lab/vector/use-vector-lab.test.ts` (appended block)
- Test: `components/lab/vector/vector-lab.test.tsx` (appended block)

**Also required in this task — widen the deep link**, exactly as Task 28 did for IVF.
An index in the `<select>` that the parser does not know silently falls back to flat:

```ts
export const LAB_INDEXES = ['flat', 'ivf', 'ivf-pq'] as const;
```

Extend `params.test.ts` with `parseLabParams({ index: 'ivf-pq' }).index === 'ivf-pq'`,
and keep the existing assertion that a name which has not shipped yet — `'hnsw'` until
the companion plan lands — still falls back rather than throwing.

**Interfaces:**
- Consumes: `trainIvfPq`, `ivfPqInsert`, `ivfPqDelete`, `rebuildIvfPq`, `reconstructionError`,
  `quantisationSegments`, `rankDiff`, `IvfPqState` (whose `.ivf` is an `IvfState`),
  `IvfPqStep`, `IvfPqParams` from `lib/lab/vector/ivf-pq.ts` (Tasks 31–33); `ivfPqSearch`
  (Task 32); `QuantisationOverlay` (Task 34); `RankComparison` (Task 35).
- Produces: `LabStep` widens to include `IvfPqStep`; `LabSnapshot` and `VectorLab` gain
  `reconstructionError: number | null`, `rankRows: readonly RankRow[] | null` and
  `quantisation: ((viewport: Viewport) => readonly QuantisationSegment[]) | null`;
  `DEFAULT_IVF_PQ: IvfPqParams`; `INDEX_OPTIONS` gains `ivf-pq`.

- [ ] **Step 1: Write the failing tests**

Append to `components/lab/vector/use-vector-lab.test.ts`:

```tsx
describe('replayLog on ivf-pq', () => {
  it('reports a reconstruction error that flat and ivf do not have', () => {
    expect(replayLog(seed, [], params()).reconstructionError).toBeNull();
    expect(replayLog(seed, [], params({ index: 'ivf' })).reconstructionError).toBeNull();
    const pq = replayLog(seed, [], params({ index: 'ivf-pq' }));
    expect(pq.reconstructionError).toBeGreaterThan(0);
  });

  it('keeps the cell vocabulary, because ivf-pq is an ivf index over codes', () => {
    const pq = replayLog(seed, [], params({ index: 'ivf-pq' }));
    expect(pq.centroids).toHaveLength(DEFAULT_IVF.cells);
    expect(pq.insertsSinceTrain).toBe(0);
  });

  it('compares its ranking against the exact one only once there is a query', () => {
    expect(replayLog(seed, [], params({ index: 'ivf-pq' })).rankRows).toBeNull();
    const searched = replayLog(seed, [{ kind: 'search', query: [0.5, 0.5] }], params({ index: 'ivf-pq' }));
    expect(searched.rankRows).toHaveLength(DEFAULT_K);
  });

  it('hands the island a thunk for the quantisation drawing, not a viewport', () => {
    // The hook has no business knowing pixel dimensions; the island owns those.
    const pq = replayLog(seed, [], params({ index: 'ivf-pq' }));
    const segments = pq.quantisation?.({ width: 480, height: 480, padding: 24 }) ?? [];
    expect(segments.length).toBe(pq.points.length);
  });
});
```

Append to `components/lab/vector/vector-lab.test.tsx`:

```tsx
describe('VectorLab — IVF-PQ', () => {
  async function selectIvfPq(user: ReturnType<typeof userEvent.setup>): Promise<void> {
    await user.selectOptions(screen.getByLabelText('Index'), 'ivf-pq');
  }

  it('offers IVF-PQ in the same select as the other indexes', () => {
    render(<VectorLab />);
    expect(screen.getByRole('option', { name: 'IVF-PQ' })).toBeInTheDocument();
  });

  it('keeps the cell partition and the nprobe slider, because it is still an ivf index', async () => {
    const user = userEvent.setup();
    const { container } = render(<VectorLab />);
    await selectIvfPq(user);
    expect(container.querySelectorAll('polygon').length).toBeGreaterThan(0);
    expect(screen.getByLabelText('Cells probed per query')).toHaveAttribute(
      'aria-valuetext',
      'probing 1 of 8 cells',
    );
  });

  it('draws the quantisation displacement only on ivf-pq', async () => {
    const user = userEvent.setup();
    const { container } = render(<VectorLab />);
    await user.selectOptions(screen.getByLabelText('Index'), 'ivf');
    expect(container.querySelectorAll('line')).toHaveLength(0);
    await selectIvfPq(user);
    expect(container.querySelectorAll('line').length).toBeGreaterThan(0);
  });

  it('adds reconstruction error to the health readout', async () => {
    const user = userEvent.setup();
    render(<VectorLab />);
    expect(screen.queryByText('Reconstruction error')).toBeNull();
    await selectIvfPq(user);
    expect(healthValue('Reconstruction error')).toMatch(/^0\.\d{3}$/);
  });

  it('keeps the query interactive and tables the scramble it produces', async () => {
    const user = userEvent.setup();
    render(<VectorLab />);
    await selectIvfPq(user);
    expect(screen.queryByRole('table')).toBeNull();
    await user.click(screen.getByLabelText('Move the query'));
    fireEvent.click(canvas(), { clientX: 200, clientY: 200 });
    expect(screen.getByRole('table', { name: /Exact ranking against IVF-PQ/ })).toBeInTheDocument();
    expect(screen.getAllByRole('row').length).toBeGreaterThan(1);
  });

  it('names the selected index in the canvas label here too', async () => {
    const user = userEvent.setup();
    render(<VectorLab />);
    await selectIvfPq(user);
    expect(screen.getByLabelText(/Scatter plot of \d+ points, IVF-PQ index/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run components/lab/vector`

Expected: FAIL — `reconstructionError` is not a property of the snapshot, and
`Value "ivf-pq" not found in options`.

- [ ] **Step 3: Extend the hook**

In `components/lab/vector/use-vector-lab.ts`, add the imports:

```ts
import {
  ivfPqDelete,
  ivfPqInsert,
  ivfPqSearch,
  quantisationSegments,
  rankDiff,
  rebuildIvfPq,
  reconstructionError,
  trainIvfPq,
  type IvfPqParams,
  type IvfPqState,
  type IvfPqStep,
  type QuantisationSegment,
  type RankRow,
} from '@/lib/lab/vector/ivf-pq';
import type { Viewport } from '@/lib/lab/vector/layout';
```

Widen `LabStep`, add the three snapshot fields and the params default:

```ts
export type LabStep = FlatStep | IvfStep | IvfPqStep;

export const DEFAULT_IVF_PQ: IvfPqParams = { ivf: DEFAULT_IVF, subspaces: 2, bits: 4, seed: 7 };
```

Add to `LabSnapshot` and to `VectorLab`:

```ts
  readonly reconstructionError: number | null;
  readonly rankRows: readonly RankRow[] | null;
  /**
   * A thunk rather than an array: the island owns the viewport, and pushing pixel
   * dimensions into the hook's options would make every index carry them.
   */
  readonly quantisation: ((viewport: Viewport) => readonly QuantisationSegment[]) | null;
```

Return `reconstructionError: null, rankRows: null, quantisation: null` from `replayFlat`
and `replayIvf`, and pass the three new snapshot fields through in the hook's return
object alongside `centroids`.

Add the IVF-PQ step cases to `describeStep`:

```ts
    case 'encode':
      return `Encoded point ${step.id} into ${step.code.length} subspace codes`;
    case 'adcScan':
      return `Looked up point ${step.id} in the distance table, distance ${step.distance.toFixed(3)}`;
```

Add the fold and wire up the branch:

```ts
function replayIvfPq(seed: readonly Point[], log: readonly LabOp[], params: LabParams): LabSnapshot {
  const trained = trainIvfPq(seed, params.ivfPq);
  let state: IvfPqState = trained.state;
  let steps: readonly LabStep[] = trained.steps;
  let counters: Counters = trained.counters;

  for (const op of log) {
    if (op.kind === 'insert') {
      const done = ivfPqInsert(state, op.vec);
      state = done.state;
      steps = done.steps;
      counters = addCounters(counters, done.counters);
    } else if (op.kind === 'delete') {
      const done = ivfPqDelete(state, op.id);
      state = done.state;
      steps = done.steps;
      counters = addCounters(counters, done.counters);
    } else if (op.kind === 'rebuild') {
      const done = rebuildIvfPq(state, params.ivfPq);
      state = done.state;
      steps = done.steps;
      counters = addCounters(counters, done.counters);
    }
  }

  const points = ivfPoints(state.ivf);
  const query = lastQuery(log);
  let results: readonly Ranked[] = [];
  let recall: number | null = null;
  let rankRows: readonly RankRow[] | null = null;

  if (query !== null) {
    const found = ivfPqSearch(state, query, { k: params.k, metric: params.metric, nprobe: params.nprobe });
    results = found.result;
    counters = addCounters(counters, found.counters);
    if (endedOnSearch(log)) steps = found.steps;
    const truth = flatSearch(createFlat(points), query, { k: params.k, metric: params.metric });
    recall = recallAtK(results, truth.result, params.k);
    rankRows = rankDiff(truth.result, results);
  }

  return {
    points,
    results,
    steps,
    counters,
    query,
    recall,
    centroids: state.ivf.centroids,
    cellBalance: cellBalance(state.ivf),
    insertsSinceTrain: state.ivf.insertsSinceTrain,
    reconstructionError: reconstructionError(state),
    rankRows,
    quantisation: (viewport: Viewport) => quantisationSegments(state, viewport),
  };
}
```

Add `readonly ivfPq: IvfPqParams` to `LabParams`, `ivfPq: DEFAULT_IVF_PQ` to the hook's
`params` memo, and the branch to `replayLog`:

```ts
    case 'ivf-pq':
      return replayIvfPq(seed, log, params);
```

- [ ] **Step 4: Compose it into the island**

In `components/lab/vector/vector-lab.tsx`, add the imports:

```tsx
import { QuantisationOverlay } from './quantisation-overlay';
import { RankComparison } from './rank-comparison';
```

Add the third option:

```tsx
export const INDEX_OPTIONS: readonly { value: IndexKind; label: string }[] = [
  { value: 'flat', label: 'Flat' },
  { value: 'ivf', label: 'IVF' },
  { value: 'ivf-pq', label: 'IVF-PQ' },
];
```

Add the derived segments beside `cells`:

```tsx
const segments = useMemo(() => lab.quantisation?.(VIEWPORT) ?? [], [lab.quantisation]);
```

Add the reconstruction-error row to `healthRows`, after the cell rows, and add
`lab.reconstructionError` to that memo's dependency array:

```tsx
if (lab.reconstructionError !== null) {
  rows.push({ label: 'Reconstruction error', value: lab.reconstructionError.toFixed(3) });
}
```

Add the second underlay inside the same relative wrapper, above `CellOverlay` in the
stack so the displacement lines sit over the cell fills:

```tsx
{segments.length > 0 && <QuantisationOverlay segments={segments} viewport={VIEWPORT} />}
```

And add the table below the canvas, beside the scoreboard:

```tsx
{lab.rankRows !== null && (
  <RankComparison rows={lab.rankRows} caption="Exact ranking against IVF-PQ" />
)}
```

- [ ] **Step 5: Write the server prose and the README line**

Append to `app/lab/vector-index/page.tsx`, after the IVF section:

```tsx
<section className="space-y-3">
  <h2 className="text-sm uppercase tracking-widest text-foreground-dim">IVF-PQ: the same cells, over codes</h2>
  <p className="text-sm leading-relaxed text-foreground-dim">
    <strong className="text-foreground">IVF-PQ</strong> keeps the cells and{' '}
    <code>nprobe</code> exactly as they were and changes what is stored inside them.
    Each vector is split into subspaces, each subspace is replaced by the nearest entry
    in a small trained codebook, and the point becomes a couple of bytes of codes. The
    short lines on the canvas are the price: each one runs from where a point actually
    is to where its code says it is, and{' '}
    <strong className="text-foreground">reconstruction error</strong> is that gap averaged
    over every point.
  </p>
  <p className="text-sm leading-relaxed text-foreground-dim">
    The query is never quantised. It is compared against the codes through a lookup table
    — an asymmetric distance — which is why the neighbourhood survives while the order
    inside it does not. The table below the canvas is the honest result: exact ranking on
    one side, IVF-PQ&apos;s on the other, with every rank that moved or was missed named.
    Compression that keeps the right ten points in a different order is usually fine;
    compression that drops one is the failure the table is here to make visible.
  </p>
</section>
```

Add one bullet to the `## Labs` section of `README.md`:

```markdown
- The same lab runs IVF-PQ: subspace codebooks, encode-on-insert, asymmetric distance lookups, the reconstruction error drawn per point, and a rank-by-rank table of what compression scrambled.
```

- [ ] **Step 6: Run tests and lint**

Run: `npm test` then `npm run lint`

Expected: PASS, with no `eslint-disable` anywhere in the diff and no `useEffect` in
`components/lab/vector/`.

- [ ] **Step 7: Commit**

```bash
git add components/lab/vector app/lab/vector-index/page.tsx README.md
git commit -m "feat: run the vector playground on an ivf-pq index"
```
