import { describe, it, expect } from 'vitest';
import { sortRepos } from './sort-repos';
import type { GithubRepo } from '@/lib/github.types';

function repo(name: string, stars: number): GithubRepo {
  return {
    slug: `nadeem4/${name}`,
    name,
    description: `${name} description`,
    url: `https://github.com/nadeem4/${name}`,
    stars,
    language: 'TypeScript',
    updatedAt: '2026-01-01T00:00:00Z',
    license: null,
  };
}

const repos: GithubRepo[] = [repo('low-stars', 2), repo('high-stars', 42)];

describe('sortRepos', () => {
  it('returns repos unchanged for the recent view, preserving pinned order', () => {
    expect(sortRepos(repos, 'recent')).toEqual(repos);
  });

  it('sorts repos by stars descending for the stars view', () => {
    expect(sortRepos(repos, 'stars')).toEqual([repos[1], repos[0]]);
  });

  it('does not mutate the input when sorting by stars', () => {
    sortRepos(repos, 'stars');
    expect(repos.map((r) => r.name)).toEqual(['low-stars', 'high-stars']);
  });

  it('returns an empty array unchanged for any view', () => {
    expect(sortRepos([], 'recent')).toEqual([]);
    expect(sortRepos([], 'stars')).toEqual([]);
  });
});
