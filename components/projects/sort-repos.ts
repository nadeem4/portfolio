import type { GithubRepo } from '@/lib/github.types';

export type ProjectView = 'recent' | 'stars';

/**
 * `recent` returns the list untouched: it arrives already ordered by push date,
 * with featured repos pinned to the front by `applyOverrides`.
 *
 * `stars` re-sorts strictly by star count, deliberately discarding the pinning.
 * A sort control that does not actually sort is worse than no control.
 */
export function sortRepos(repos: GithubRepo[], view: ProjectView): GithubRepo[] {
  if (view === 'stars') {
    return [...repos].sort((a, b) => b.stars - a.stars);
  }
  return repos;
}
