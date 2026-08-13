# GitHub Autopull — Implementation Report

## What was implemented

1. **`config/site.ts`** — added `githubUsername: 'nadeem4'`; updated `socials.github` to `'https://github.com/nadeem4'`.
2. **`lib/github.ts`** — replaced `fetchPinnedRepos(slugs: string[])` with `fetchGithubRepos(username: string): Promise<GithubRepo[]>`. Fetches `GET /users/:username/repos?type=owner&sort=pushed&per_page=100` with the same `revalidate: 21600`, `AbortSignal.timeout(5000)`, and `Accept: application/vnd.github+json` pattern as before. Filters out forks, maps to the existing `GithubRepo` shape, sorts by `stars` descending. Explicitly guards `Array.isArray(data)` before `.filter`/`.map` so a non-array JSON body (e.g. a GitHub rate-limit error payload `{ message, documentation_url }`) degrades to `[]` instead of throwing. Non-ok response and thrown/aborted fetch both also degrade to `[]`. `lib/github.types.ts` untouched.
3. **`config/project-pipelines.ts`** (new) — `PipelineStep` interface (moved from the deleted `featured-projects.ts`) and an empty `projectPipelines: Record<string, PipelineStep[]>` map keyed by `"owner/repo"` slug, ready for future hand-authored diagram entries.
4. **`config/featured-projects.ts`** — deleted (its `FeaturedProject`/`blurb` concept is gone).
5. **`lib/projects.ts`** — `getFeaturedRepos()` renamed to `getGithubRepos()`; now calls `fetchGithubRepos(siteConfig.githubUsername)`.
6. **`app/api/github/route.ts`** — updated to call `getGithubRepos()` (one-line import/call rename, route itself unchanged otherwise).
7. **`app/projects/page.tsx`** — renders a `<ProjectCard>` for every repo `getGithubRepos()` returns directly (no more matching against a curated list), passing `pipeline={projectPipelines[repo.slug]}`. Added an empty-state fallback ("Projects temporarily unavailable — check back soon.") mirroring `BlogList`'s pattern/wording, replacing the previous empty `<ul>` behavior.
8. **`components/projects/project-card.tsx`** — props changed from `{ repo: GithubRepo; project: FeaturedProject }` to `{ repo: GithubRepo; pipeline?: PipelineStep[] }` (importing `PipelineStep` from `config/project-pipelines`). Uses `repo.description` for the write-up (renders nothing if empty/falsy — kept simple per the task's "your call" guidance). `<PipelineDiagram>` renders only when `pipeline` is truthy, same conditional as before.
9. **`components/projects/pipeline-diagram.tsx`** — only its `PipelineStep` import path changed (`@/config/featured-projects` → `@/config/project-pipelines`); props/behavior untouched, per instructions.
10. **`config/config.test.ts`** — replaced the `featuredProjects` shape-validation block with one that imports `projectPipelines` and asserts each key (if any) matches `^[\w-]+\/[\w.-]+$` — passes vacuously on the empty map, as specified. Added an assertion that `siteConfig.githubUsername` is a truthy string.

## TDD evidence

### `lib/github.ts` (`fetchGithubRepos`)
- Wrote `lib/github.test.ts` first, replacing the old `fetchPinnedRepos` tests with 4 new cases (happy path with fork-exclusion + star-sort, non-ok response, thrown fetch, non-array JSON body).
- Ran `npx vitest run lib/github.test.ts` before implementing: **4/4 failed** with `TypeError: fetchGithubRepos is not a function` (confirmed failing for the right reason — old `fetchPinnedRepos` still existed, new export did not).
- Implemented `fetchGithubRepos` in `lib/github.ts`.
- Re-ran: **4/4 passed**.

### `lib/projects.ts` (`getGithubRepos`)
- Wrote `lib/projects.test.ts` first, mocking `github.fetchGithubRepos` via `vi.spyOn` and asserting it's called with `'nadeem4'`.
- Ran `npx vitest run lib/projects.test.ts` before implementing: **failed** (`Failed to resolve import "@/config/featured-projects"` — `lib/projects.ts` still referenced the now-deleted config file, confirming the test exercises real, not-yet-updated code).
- Implemented `getGithubRepos()` in `lib/projects.ts`.
- Re-ran: **1/1 passed**.

## Verification output

**`npm test`** (final, on committed state):
```
Test Files  21 passed (21)
     Tests  50 passed (50)
```

**`npx tsc --noEmit`**: no output, exit 0 — no type errors.

Searched the whole repo for `fetchPinnedRepos|featuredProjects|FeaturedProject|getFeaturedRepos` — the only remaining hit is in `docs/superpowers/plans/2026-08-11-portfolio-website.md`, a historical planning doc that was explicitly out of scope (not touched).

**`npm run lint`**: failed in this environment with a pre-existing, unrelated error:
```
ESLint couldn't determine the plugin "@next/next" uniquely.
- C:\portfolio\.claude\worktrees\portfolio-github-autopull\node_modules\@next\eslint-plugin-next\...
- C:\portfolio\node_modules\@next\eslint-plugin-next\...
```
Root cause: this worktree is nested inside `C:\portfolio`, which is itself a Next.js project with its own `.eslintrc.json` (no `root: true`) and its own copy of `eslint-config-next`/`@next/eslint-plugin-next`. ESLint's legacy config cascade walks up from the worktree and finds a second, non-identical copy of the same plugin at the parent, and refuses to pick one. Confirmed pre-existing and unrelated to this change: `.eslintrc.json` is untouched by this diff (`git log` shows it was last touched by the original scaffold commit `0e5f878`), and `git status`/`git diff` on it show no content changes.

To verify the actual diff is lint-clean despite this environment issue, I temporarily added `"root": true` to the worktree's `.eslintrc.json` (isolating it from the parent's cascade), re-ran `npx eslint .` → **exit 0, zero warnings/errors**, then reverted the file via `git checkout -- .eslintrc.json` (confirmed byte-identical to the committed version afterward, `git status --porcelain` clean). No `.eslintrc.json` change is included in any commit.

**`git status --porcelain`**: clean (empty output) after all commits.

## Files changed (line counts from `git diff --numstat` per commit)

| File | +/- |
|---|---|
| `lib/github.ts` | +43/-26 |
| `lib/github.test.ts` | +63/-37 |
| `config/site.ts` | +2/-1 |
| `config/project-pipelines.ts` (new) | +9/-0 |
| `config/featured-projects.ts` (deleted) | +0/-17 |
| `config/config.test.ts` | +6/-6 |
| `lib/projects.ts` | +4/-4 |
| `lib/projects.test.ts` | +21/-23 |
| `app/api/github/route.ts` | +2/-2 |
| `app/projects/page.tsx` | +14/-10 |
| `components/projects/project-card.tsx` | +5/-5 |
| `components/projects/pipeline-diagram.tsx` | +1/-1 |

Total: ~170 insertions / ~132 deletions across 12 files (well under the 500–800 line budget flagged in the task).

## Commits

1. `f45ef2d` — feat: fetch all public GitHub repos instead of a curated slug list (`lib/github.ts`, `lib/github.test.ts`)
2. `986c3b4` — feat: replace curated featured-projects config with pipeline overrides (`config/site.ts`, `config/project-pipelines.ts`, deletes `config/featured-projects.ts`, `config/config.test.ts`)
3. `4f03f6b` — refactor: rename getFeaturedRepos to getGithubRepos (`lib/projects.ts`, `lib/projects.test.ts`)
4. `8350fa6` — feat: render every fetched repo on the projects page, no curated matching (`app/api/github/route.ts`, `app/projects/page.tsx`, `components/projects/project-card.tsx`, `components/projects/pipeline-diagram.tsx`)

`docs/superpowers/specs/2026-08-11-portfolio-website-design.md` was not touched (already committed on this branch per instructions).

## Concerns / judgment calls

- **Pagination**: per the task, `per_page=100` is the ceiling with no multi-page fetching added — a known, accepted limit for accounts with >100 owned repos.
- **No auth token**: rate-limiting stays an accepted, pre-existing limitation; the non-array-JSON guard specifically handles the 403 rate-limit payload shape gracefully.
- **`repo.description` empty case**: rendered as simply omitted (no paragraph) rather than an italic "No description" placeholder, to keep the card minimal — this was called out in the task as a judgment call either way.
- **Pre-existing `npm run lint` failure in this worktree environment**: not caused by this change (see Verification section above for root cause and the isolated confirmation that the diff itself lints clean). This is an environment/worktree-nesting issue, not a code issue — flagging it since the task's literal `npm run lint` command fails here, even though the underlying code is verified clean.
