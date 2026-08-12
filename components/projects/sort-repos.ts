import type { GithubRepo } from '@/lib/github.types';

export type ProjectView = 'recent' | 'stars' | 'open-source';

export function sortRepos(repos: GithubRepo[], view: ProjectView): GithubRepo[] {
  if (view === 'stars') {
    return [...repos].sort((a, b) => b.stars - a.stars);
  }
  if (view === 'open-source') {
    return repos.filter((repo) => repo.license !== null);
  }
  return repos;
}
