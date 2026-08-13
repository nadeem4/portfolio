import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchGithubRepos } from './github';

function reposResponse(body: unknown, ok = true) {
  return { ok, json: () => Promise.resolve(body) } as Response;
}

function setupFetchMock(reposBody: unknown, opts: { reposOk?: boolean } = {}) {
  const { reposOk = true } = opts;
  vi.mocked(fetch).mockImplementation(() => Promise.resolve(reposResponse(reposBody, reposOk)));
}

function makeRepo(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    full_name: 'nadeem4/repo',
    name: 'repo',
    description: 'A repo',
    html_url: 'https://github.com/nadeem4/repo',
    stargazers_count: 1,
    language: 'TypeScript',
    updated_at: '2026-01-01T00:00:00Z',
    pushed_at: '2026-01-01T00:00:00Z',
    fork: false,
    license: null,
    ...overrides,
  };
}

describe('fetchGithubRepos', () => {
  const originalToken = process.env.GITHUB_TOKEN;

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    delete process.env.GITHUB_TOKEN;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    if (originalToken === undefined) {
      delete process.env.GITHUB_TOKEN;
    } else {
      process.env.GITHUB_TOKEN = originalToken;
    }
  });

  it('excludes forks and preserves API order (no re-sort by stars)', async () => {
    setupFetchMock([
      makeRepo({
        full_name: 'nadeem4/low-stars',
        name: 'low-stars',
        description: 'A small repo',
        html_url: 'https://github.com/nadeem4/low-stars',
        stargazers_count: 2,
      }),
      makeRepo({
        full_name: 'nadeem4/a-fork',
        name: 'a-fork',
        description: 'Forked repo',
        stargazers_count: 100,
        fork: true,
      }),
      makeRepo({
        full_name: 'nadeem4/high-stars',
        name: 'high-stars',
        description: 'A popular repo',
        html_url: 'https://github.com/nadeem4/high-stars',
        stargazers_count: 42,
        language: 'Python',
        pushed_at: '2026-01-03T00:00:00Z',
      }),
    ]);

    const repos = await fetchGithubRepos('nadeem4');

    // low-stars precedes high-stars in the mocked response despite having fewer
    // stars — the lib must preserve API order rather than re-sort.
    expect(repos.map((r) => r.slug)).toEqual(['nadeem4/low-stars', 'nadeem4/high-stars']);
  });

  describe('description gate', () => {
    it('excludes a repo with a null description', async () => {
      setupFetchMock([
        makeRepo({ full_name: 'nadeem4/undescribed', name: 'undescribed', description: null }),
        makeRepo({ full_name: 'nadeem4/described', name: 'described', description: 'Does a thing' }),
      ]);

      const repos = await fetchGithubRepos('nadeem4');

      expect(repos.map((r) => r.slug)).toEqual(['nadeem4/described']);
    });

    it('excludes a repo whose description is an empty string', async () => {
      setupFetchMock([makeRepo({ description: '' })]);
      expect(await fetchGithubRepos('nadeem4')).toEqual([]);
    });

    it('excludes a repo whose description is only whitespace', async () => {
      setupFetchMock([makeRepo({ description: '   \n\t ' })]);
      expect(await fetchGithubRepos('nadeem4')).toEqual([]);
    });

    it('includes a repo with any real description', async () => {
      setupFetchMock([makeRepo({ description: 'x' })]);
      expect(await fetchGithubRepos('nadeem4')).toHaveLength(1);
    });

    it('makes exactly one API call regardless of repo count', async () => {
      // The old commit-count filter cost one extra request per repo, which is
      // what made this endpoint rate-limit without a token.
      setupFetchMock([
        makeRepo({ full_name: 'nadeem4/a', name: 'a' }),
        makeRepo({ full_name: 'nadeem4/b', name: 'b' }),
        makeRepo({ full_name: 'nadeem4/c', name: 'c' }),
      ]);

      await fetchGithubRepos('nadeem4');

      expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
    });
  });

  it('maps license.name when a recognized license is present', async () => {
    setupFetchMock([makeRepo({ license: { name: 'MIT License' } })]);
    expect((await fetchGithubRepos('nadeem4'))[0].license).toBe('MIT License');
  });

  it('maps license to null when no license object is present', async () => {
    setupFetchMock([makeRepo()]);
    expect((await fetchGithubRepos('nadeem4'))[0].license).toBeNull();
  });

  it('sources updatedAt from pushed_at, not updated_at', async () => {
    setupFetchMock([makeRepo({ updated_at: '2026-02-01T00:00:00Z', pushed_at: '2025-06-15T00:00:00Z' })]);
    expect((await fetchGithubRepos('nadeem4'))[0].updatedAt).toBe('2025-06-15T00:00:00Z');
  });

  it('returns an empty array on a non-ok response', async () => {
    setupFetchMock({}, { reposOk: false });
    expect(await fetchGithubRepos('nadeem4')).toEqual([]);
  });

  it('returns an empty array when the fetch throws', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('network down'));
    expect(await fetchGithubRepos('nadeem4')).toEqual([]);
  });

  it('returns an empty array when the response body is not an array (e.g. a rate-limit error payload)', async () => {
    setupFetchMock({ message: 'API rate limit exceeded', documentation_url: 'https://docs.github.com/rest' });
    expect(await fetchGithubRepos('nadeem4')).toEqual([]);
  });

  it('excludes the profile-README repo ({username}/{username})', async () => {
    setupFetchMock([
      makeRepo({ full_name: 'nadeem4/nadeem4', name: 'nadeem4' }),
      makeRepo({ full_name: 'nadeem4/real-project', name: 'real-project' }),
    ]);

    const repos = await fetchGithubRepos('nadeem4');

    expect(repos.map((r) => r.slug)).toEqual(['nadeem4/real-project']);
  });

  it('sends an Authorization: Bearer header when GITHUB_TOKEN is set', async () => {
    process.env.GITHUB_TOKEN = 'test-token-123';
    setupFetchMock([makeRepo()]);

    await fetchGithubRepos('nadeem4');

    const [, init] = vi.mocked(fetch).mock.calls[0];
    expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer test-token-123');
  });

  it('sends no Authorization header when GITHUB_TOKEN is unset, and still returns results', async () => {
    delete process.env.GITHUB_TOKEN;
    setupFetchMock([makeRepo()]);

    const repos = await fetchGithubRepos('nadeem4');

    for (const [, init] of vi.mocked(fetch).mock.calls) {
      expect((init?.headers as Record<string, string> | undefined)?.Authorization).toBeUndefined();
    }
    expect(repos.map((r) => r.slug)).toEqual(['nadeem4/repo']);
  });
});
