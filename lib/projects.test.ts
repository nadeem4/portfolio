import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getGithubRepos } from './projects';
import * as github from './github';

describe('getGithubRepos', () => {
  beforeEach(() => {
    vi.spyOn(github, 'fetchGithubRepos');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches GitHub repo data for the configured username', async () => {
    vi.mocked(github.fetchGithubRepos).mockResolvedValue([
      {
        slug: 'nadeem4/example-repo',
        name: 'example-repo',
        description: 'An example repo',
        url: 'https://github.com/nadeem4/example-repo',
        stars: 5,
        language: 'TypeScript',
        updatedAt: '2026-01-01T00:00:00Z',
        license: null,
      },
    ]);

    const repos = await getGithubRepos();

    expect(github.fetchGithubRepos).toHaveBeenCalledWith('nadeem4');
    expect(repos).toHaveLength(1);
    expect(repos[0].slug).toBe('nadeem4/example-repo');
  });
});
