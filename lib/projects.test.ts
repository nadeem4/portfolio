import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { applyOverrides, getGithubRepos } from './projects';
import * as github from './github';
import type { GithubRepo } from './github.types';

function repo(name: string, stars = 0): GithubRepo {
  return {
    slug: `nadeem4/${name}`,
    name,
    description: `${name} description`,
    url: `https://github.com/nadeem4/${name}`,
    stars,
    language: 'Python',
    updatedAt: '2026-01-01T00:00:00Z',
    license: null,
  };
}

describe('applyOverrides', () => {
  it('removes hidden repos', () => {
    const result = applyOverrides([repo('keep'), repo('drop')], [], ['drop']);
    expect(result.map((r) => r.name)).toEqual(['keep']);
  });

  it('pins featured repos to the front, in the order listed', () => {
    const result = applyOverrides([repo('a'), repo('b'), repo('c')], ['c', 'b'], []);
    expect(result.map((r) => r.name)).toEqual(['c', 'b', 'a']);
  });

  it('preserves the incoming order of everything not featured', () => {
    const result = applyOverrides([repo('a'), repo('b'), repo('c'), repo('d')], ['d'], []);
    expect(result.map((r) => r.name)).toEqual(['d', 'a', 'b', 'c']);
  });

  it('applies hidden before featured, so a repo in both lists stays hidden', () => {
    const result = applyOverrides([repo('a'), repo('b')], ['b'], ['b']);
    expect(result.map((r) => r.name)).toEqual(['a']);
  });

  it('ignores names in either list that match no repo', () => {
    const result = applyOverrides([repo('a')], ['does-not-exist'], ['also-missing']);
    expect(result.map((r) => r.name)).toEqual(['a']);
  });

  it('does not mutate the input array', () => {
    const input = [repo('a'), repo('b')];
    applyOverrides(input, ['b'], []);
    expect(input.map((r) => r.name)).toEqual(['a', 'b']);
  });

  it('returns an empty array unchanged', () => {
    expect(applyOverrides([], ['x'], ['y'])).toEqual([]);
  });
});

describe('getGithubRepos', () => {
  beforeEach(() => {
    vi.spyOn(github, 'fetchGithubRepos');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches GitHub repo data for the configured username', async () => {
    vi.mocked(github.fetchGithubRepos).mockResolvedValue([repo('example-repo', 5)]);

    const repos = await getGithubRepos();

    expect(github.fetchGithubRepos).toHaveBeenCalledWith('nadeem4');
    expect(repos).toHaveLength(1);
    expect(repos[0].slug).toBe('nadeem4/example-repo');
  });

  it('applies the configured overrides to what the API returns', async () => {
    // 'portfolio' is in the hidden list; 'nl2sql' is the first featured entry.
    vi.mocked(github.fetchGithubRepos).mockResolvedValue([repo('portfolio'), repo('other'), repo('nl2sql')]);

    const repos = await getGithubRepos();

    expect(repos.map((r) => r.name)).toEqual(['nl2sql', 'other']);
  });
});
