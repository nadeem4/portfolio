import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchGithubRepos } from './github';

function jsonResponse(body: unknown, ok = true) {
  return { ok, json: () => Promise.resolve(body) } as Response;
}

describe('fetchGithubRepos', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('excludes forks and sorts the remaining repos by stars descending', async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse([
        {
          full_name: 'nadeem4/low-stars',
          name: 'low-stars',
          description: 'A small repo',
          html_url: 'https://github.com/nadeem4/low-stars',
          stargazers_count: 2,
          language: 'TypeScript',
          updated_at: '2026-01-01T00:00:00Z',
          fork: false,
        },
        {
          full_name: 'nadeem4/a-fork',
          name: 'a-fork',
          description: 'Forked repo',
          html_url: 'https://github.com/nadeem4/a-fork',
          stargazers_count: 100,
          language: 'Python',
          updated_at: '2026-01-02T00:00:00Z',
          fork: true,
        },
        {
          full_name: 'nadeem4/high-stars',
          name: 'high-stars',
          description: 'A popular repo',
          html_url: 'https://github.com/nadeem4/high-stars',
          stargazers_count: 42,
          language: 'Python',
          updated_at: '2026-01-03T00:00:00Z',
          fork: false,
        },
      ]),
    );

    const repos = await fetchGithubRepos('nadeem4');

    expect(repos).toEqual([
      {
        slug: 'nadeem4/high-stars',
        name: 'high-stars',
        description: 'A popular repo',
        url: 'https://github.com/nadeem4/high-stars',
        stars: 42,
        language: 'Python',
        updatedAt: '2026-01-03T00:00:00Z',
      },
      {
        slug: 'nadeem4/low-stars',
        name: 'low-stars',
        description: 'A small repo',
        url: 'https://github.com/nadeem4/low-stars',
        stars: 2,
        language: 'TypeScript',
        updatedAt: '2026-01-01T00:00:00Z',
      },
    ]);
  });

  it('returns an empty array on a non-ok response', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({}, false));
    const repos = await fetchGithubRepos('nadeem4');
    expect(repos).toEqual([]);
  });

  it('returns an empty array when the fetch throws', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('network down'));
    const repos = await fetchGithubRepos('nadeem4');
    expect(repos).toEqual([]);
  });

  it('returns an empty array when the response body is not an array (e.g. a rate-limit error payload)', async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({
        message: 'API rate limit exceeded',
        documentation_url: 'https://docs.github.com/rest',
      }),
    );
    const repos = await fetchGithubRepos('nadeem4');
    expect(repos).toEqual([]);
  });
});
