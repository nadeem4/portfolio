import { describe, it, expect } from 'vitest';
import { sortRepos } from './sort-repos';
import type { GithubRepo } from '@/lib/github.types';

const repos: GithubRepo[] = [
  {
    slug: 'nadeem4/low-stars',
    name: 'low-stars',
    description: '',
    url: 'https://github.com/nadeem4/low-stars',
    stars: 2,
    language: 'TypeScript',
    updatedAt: '2026-01-01T00:00:00Z',
    license: 'MIT License',
  },
  {
    slug: 'nadeem4/high-stars',
    name: 'high-stars',
    description: '',
    url: 'https://github.com/nadeem4/high-stars',
    stars: 42,
    language: 'Python',
    updatedAt: '2026-01-02T00:00:00Z',
    license: null,
  },
];

describe('sortRepos', () => {
  it('returns repos unchanged for the recent view (already recency-ordered on input)', () => {
    expect(sortRepos(repos, 'recent')).toEqual(repos);
  });

  it('sorts repos by stars descending for the stars view', () => {
    expect(sortRepos(repos, 'stars')).toEqual([repos[1], repos[0]]);
  });

  it('filters to only licensed repos for the open-source view', () => {
    expect(sortRepos(repos, 'open-source')).toEqual([repos[0]]);
  });

  it('returns an empty array when no repos are licensed for the open-source view', () => {
    const unlicensed: GithubRepo[] = [{ ...repos[1], license: null }];
    expect(sortRepos(unlicensed, 'open-source')).toEqual([]);
  });

  it('returns an empty array unchanged for any view', () => {
    expect(sortRepos([], 'recent')).toEqual([]);
    expect(sortRepos([], 'stars')).toEqual([]);
    expect(sortRepos([], 'open-source')).toEqual([]);
  });
});
