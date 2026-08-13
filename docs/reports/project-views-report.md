# Projects page: view tabs (Recent / Most Starred / Open Source)

## What was implemented

1. **`lib/github.types.ts`** — added `license: string | null` to `GithubRepo`.
2. **`lib/github.ts`** (`fetchGithubRepos`)
   - Maps `license: item.license?.name ?? null` from GitHub's `license` object.
   - Sources `updatedAt` from `item.pushed_at` instead of `item.updated_at`.
   - Removed the `.sort((a, b) => b.stars - a.stars)` call — the lib now returns
     repos in API order (already most-recently-pushed-first, via the existing
     `sort=pushed` query param). Sorting/filtering is now a UI-layer concern.
   - Added `pushed_at` and `license` to the internal `GithubApiRepo` shape.
3. **`components/projects/sort-repos.ts`** (new) — pure `sortRepos(repos, view)`
   helper with three views: `'recent'` (no-op), `'stars'` (sort desc, copies
   the array), `'open-source'` (filter to `license !== null`). Matches the
   `filterByCategory` / `filterPostsByCategory` pure-function convention
   already used by Skills and Blog.
4. **`components/projects/project-list.tsx`** (new, `'use client'`) — owns
   `view` (`ProjectView`, default `'recent'`) and `visibleCount` (default 5)
   state. Renders three filter chips (Recent / Most Starred / Open Source)
   using the exact `chipClasses` string copied from `SkillsVisual` /
   `BlogList` (bordered chip, `aria-pressed`, accent hover/active). Switching
   tabs resets `visibleCount` to 5. Renders `sortRepos(repos, view).slice(0,
   visibleCount)` as `ProjectCard`s. Shows a "Load more" button (styled with
   the same bordered-button class used by `ResumeSection` /
   `ContactSection`) that reveals everything remaining in one click, and
   disappears once nothing is hidden. Shows a dim
   "No open-source-licensed repos yet." message (same `text-foreground-dim
   leading-relaxed` class as the site's other empty-state text) when the
   Open Source view filters to zero results.
5. **`components/projects/project-card.tsx`** — added a `lastWorkedOn()`
   helper (`Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short'
   })`) and appended its output to the existing language/stars stats line,
   e.g. `TypeScript · 5 stars · Jan 2026`. No prop-shape changes.
6. **`app/projects/page.tsx`** — replaced the inline `<ul>` of `ProjectCard`s
   with `<ProjectList repos={repos} pipelines={projectPipelines} />`. The
   `repos.length === 0` fallback stays in the page unchanged, ahead of
   `ProjectList`.

Also updated `lib/github.test.ts` (rewritten fixtures/assertions for
`license`, `pushed_at`-sourced `updatedAt`, and preserved API order) and
`lib/projects.test.ts` (added `license: null` to its mock `GithubRepo` so it
still type-checks against the widened interface).

## TDD evidence

For every new/changed piece of logic: test written first, run to confirm a
correctly-reasoned failure (RED), then minimal implementation, then rerun to
confirm pass (GREEN).

- **`lib/github.test.ts`** (rewritten before touching `lib/github.ts`): ran
  first and got 4 expected failures — `license` mapping missing (`undefined`
  vs `'MIT License'`/`null`), `updatedAt` still reading `updated_at`
  (`'2026-02-01...'` instead of the expected `pushed_at` value
  `'2025-06-15...'`), and the stars-sort assertion failing because the repo
  order didn't match the (now un-sorted) expectation. Implemented the three
  `lib/github.ts` changes; all 7 tests passed.
- **`components/projects/sort-repos.test.ts`**: written before
  `sort-repos.ts` existed; run failed with "Failed to resolve import
  './sort-repos'" (module not found — correct RED for a not-yet-created
  module). Implemented `sort-repos.ts`; all 5 cases passed (recent no-op,
  stars-desc, open-source filter, open-source-with-zero-results, and
  empty-array input for all three views).
- **`components/projects/project-card.test.tsx`** (new test file, component
  had no existing test): written first asserting `/Jan 2026/` text from
  `updatedAt: '2026-01-15T00:00:00Z'`; ran and failed with "Unable to find an
  element with the text: /Jan 2026/" against the unmodified component (RED).
  Added `lastWorkedOn()` and the stats-line interpolation; test passed
  (GREEN).
- **`components/projects/project-list.test.tsx`**: written before
  `project-list.tsx` existed; run failed with "Failed to resolve import
  './project-list'" (RED). Implemented `project-list.tsx`; all 5 cases
  passed: default view caps at 5 in given order, Most Starred re-sorts and
  resets to 5, Open Source filters to licensed-only, empty-open-source
  message renders, Load More reveals the rest and then the button vanishes.

Confirmed via `Read` of `vitest.setup.ts` that `afterEach(cleanup)` is
already global, so no redundant local cleanup was added to any new test
file (matches the existing convention in `skills-visual.test.tsx` /
`blog-list.test.tsx`).

## Verification output

- `npm test` → **24 test files passed, 64 tests passed**, no regressions
  (baseline before changes was 21 files / 50 tests, all green).
- `npx tsc --noEmit` → **no output, exit clean** (no type errors).
- `npm run lint` → fails with the known pre-existing ESLint plugin-resolution
  error in this nested worktree setup:
  ```
  ESLint couldn't determine the plugin "@next/next" uniquely.
  - .../portfolio-project-views/node_modules/@next/eslint-plugin-next/dist/index.js
  - C:\portfolio\node_modules\@next\eslint-plugin-next\dist\index.js
  ```
  This is a duplicate-plugin-resolution issue between the worktree's
  `node_modules` and the parent repo's `node_modules`, unrelated to this
  change (matches the pre-existing issue flagged in the task instructions).
  Not fixed, per instructions.
- `git status --porcelain` → clean after all three commits.

## Files changed (approximate line counts)

Modified:
- `lib/github.types.ts` — +1
- `lib/github.ts` — net -8 lines (removed `.sort`, added `pushed_at`/`license` mapping)
- `lib/github.test.ts` — rewritten, +100/-20 net vs. original (~150 lines total)
- `lib/projects.test.ts` — +1 (added `license: null` to mock fixture)
- `components/projects/project-card.tsx` — +6/-1
- `app/projects/page.tsx` — net -8 lines (swapped `<ul>` for `<ProjectList>`)

New:
- `components/projects/sort-repos.ts` — 13 lines
- `components/projects/sort-repos.test.ts` — 51 lines
- `components/projects/project-list.tsx` — 73 lines
- `components/projects/project-list.test.tsx` — 93 lines
- `components/projects/project-card.test.tsx` — 22 lines

Total diff across all 3 commits: **356 insertions(+), 20 deletions(-)**
across 11 files (6 modified + 5 new) — well within the 500-800 line budget.

## Commits

1. `0658ce1` — feat: source license and last-pushed date in fetchGithubRepos
2. `3399a4e` — feat: add sortRepos view-sort helper for the projects page
3. `64f6399` — feat: add ProjectList view tabs and last-worked-on date to /projects

## Concerns / judgment calls

- **`sortRepos` return value on `'recent'`**: per the spec's own reference
  implementation, `'recent'` returns the input array as-is (no copy). This
  means `ProjectList` calls `.slice()` on it for the visible window, which is
  non-mutating, so this is safe — just noting the shared-reference behavior
  in case a future caller mutates the returned array in place.
- **Load-more button styling**: `ResumeSection`/`ContactSection` use
  `buttonLinkClasses` on `<a>` tags with `inline-block`. I reused the exact
  same class string on a `<button type="button">` for "Load more" since the
  spec asked to match that bordered-button treatment; `inline-block` on a
  `<button>` is harmless (not display:none by default in this codebase's
  reset) and keeps visual parity.
- **Test-only `makeRepo` fixture helper** in `project-list.test.tsx` — kept
  local to the test file (not extracted into a shared test util) since no
  existing shared test-fixture module exists in this codebase for
  `GithubRepo`; the closest existing convention (`skills-visual.test.tsx`,
  `blog-list.test.tsx`) also inlines fixtures locally.
- Did not touch `pipeline-diagram.tsx`, blog/Medium files, command palette,
  skills, hero, or resume/contact components, per the "what not to do" list.
- Did not add a GitHub auth token or new endpoint — `license` and
  `pushed_at` come from the same repos-list response `fetchGithubRepos`
  already fetches.
- Did not build incremental "load 5 more" paging — one click reveals
  everything remaining, per spec.
- Did not add relative-time formatting — used the fixed
  `Intl.DateTimeFormat` calendar format specified.
