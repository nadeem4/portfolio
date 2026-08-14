import type { GithubRepo } from '@/lib/github.types';

export type ProjectView = 'featured' | 'recent' | 'stars';

/**
 * `featured` returns the list untouched: it arrives with pinned repos at the
 * front, courtesy of `applyOverrides`.
 *
 * `recent` and `stars` re-sort strictly, deliberately discarding the pinning.
 * The default view was previously labelled "Recent" while showing pinned order,
 * so the newest repo sat eighth — a sort control that does not sort reads as a
 * bug on the page whose job is to demonstrate craft.
 */
export function sortRepos(repos: GithubRepo[], view: ProjectView): GithubRepo[] {
  if (view === 'stars') {
    return [...repos].sort((a, b) => b.stars - a.stars);
  }
  if (view === 'recent') {
    // updatedAt is an ISO timestamp, so lexicographic order is chronological.
    return [...repos].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }
  return repos;
}
