import { describe, it, expect } from 'vitest';
import { sortRepos } from './sort-repos';
import type { GithubRepo } from '@/lib/github.types';

function repo(name: string, stars: number, updatedAt: string): GithubRepo {
  return {
    slug: `nadeem4/${name}`,
    name,
    description: `${name} description`,
    url: `https://github.com/nadeem4/${name}`,
    stars,
    language: 'TypeScript',
    updatedAt,
    license: null,
  };
}

// Deliberately mismatched: the pinned order is neither star order nor date order,
// so each view has to prove it applied its own rule.
const repos: GithubRepo[] = [
  repo('pinned-old', 2, '2021-08-01T00:00:00Z'),
  repo('newest', 5, '2026-06-01T00:00:00Z'),
  repo('most-starred', 42, '2024-01-01T00:00:00Z'),
];

describe('sortRepos', () => {
  it('leaves the featured view untouched, preserving pinned order', () => {
    expect(sortRepos(repos, 'featured')).toEqual(repos);
  });

  it('sorts strictly by push date for the recent view, discarding pinning', () => {
    // The default view used to be labelled "Recent" while showing pinned order,
    // which put the newest repo eighth on the real site.
    expect(sortRepos(repos, 'recent').map((r) => r.name)).toEqual(['newest', 'most-starred', 'pinned-old']);
  });

  it('sorts strictly by stars for the stars view, discarding pinning', () => {
    expect(sortRepos(repos, 'stars').map((r) => r.name)).toEqual(['most-starred', 'newest', 'pinned-old']);
  });

  it('does not mutate the input', () => {
    sortRepos(repos, 'recent');
    sortRepos(repos, 'stars');
    expect(repos.map((r) => r.name)).toEqual(['pinned-old', 'newest', 'most-starred']);
  });

  it('returns an empty array unchanged for any view', () => {
    expect(sortRepos([], 'featured')).toEqual([]);
    expect(sortRepos([], 'recent')).toEqual([]);
    expect(sortRepos([], 'stars')).toEqual([]);
  });
});
