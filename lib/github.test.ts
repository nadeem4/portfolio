import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchGithubRepos } from './github';

function reposResponse(body: unknown, ok = true) {
  return { ok, json: () => Promise.resolve(body) } as Response;
}

function commitsResponse(opts: { ok?: boolean; linkHeader?: string | null } = {}) {
  const { ok = true, linkHeader = null } = opts;
  return {
    ok,
    json: () => Promise.resolve([]),
    headers: { get: (name: string) => (name.toLowerCase() === 'link' ? linkHeader : null) },
  } as unknown as Response;
}

// GitHub's real Link header looks like:
// <https://api.github.com/repositories/1/commits?per_page=1&page=2>; rel="prev", <...page=3>; rel="last"
function lastPageLinkHeader(lastPage: number) {
  return `<https://api.github.com/repositories/1/commits?per_page=1&page=${lastPage - 1}>; rel="prev", <https://api.github.com/repositories/1/commits?per_page=1&page=${lastPage}>; rel="last"`;
}

function fullNameFromCommitsUrl(url: string): string {
  const match = url.match(/\/repos\/([^/]+\/[^/]+)\/commits/);
  return match ? match[1] : '';
}

/**
 * Sets up the global fetch mock to branch on URL: the repo-list endpoint
 * returns `reposBody`, and any per-repo commits endpoint returns whatever
 * `commitsFor` produces for that repo's full_name (defaulting to a
 * comfortably-sufficient commit count of 5 so tests that don't care about
 * commit filtering aren't affected by it).
 */
function setupFetchMock(
  reposBody: unknown,
  opts: {
    reposOk?: boolean;
    commitsFor?: (fullName: string) => Response;
  } = {},
) {
  const { reposOk = true, commitsFor } = opts;
  vi.mocked(fetch).mockImplementation((input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('/commits')) {
      const fullName = fullNameFromCommitsUrl(url);
      const response = commitsFor
        ? commitsFor(fullName)
        : commitsResponse({ linkHeader: lastPageLinkHeader(5) });
      return Promise.resolve(response);
    }
    return Promise.resolve(reposResponse(reposBody, reposOk));
  });
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
        language: 'TypeScript',
        updated_at: '2026-01-01T00:00:00Z',
        pushed_at: '2026-01-01T00:00:00Z',
      }),
      makeRepo({
        full_name: 'nadeem4/a-fork',
        name: 'a-fork',
        description: 'Forked repo',
        html_url: 'https://github.com/nadeem4/a-fork',
        stargazers_count: 100,
        language: 'Python',
        updated_at: '2026-01-02T00:00:00Z',
        pushed_at: '2026-01-02T00:00:00Z',
        fork: true,
      }),
      makeRepo({
        full_name: 'nadeem4/high-stars',
        name: 'high-stars',
        description: 'A popular repo',
        html_url: 'https://github.com/nadeem4/high-stars',
        stargazers_count: 42,
        language: 'Python',
        updated_at: '2026-01-03T00:00:00Z',
        pushed_at: '2026-01-03T00:00:00Z',
      }),
    ]);

    const repos = await fetchGithubRepos('nadeem4');

    // low-stars appears before high-stars in the mocked API response even
    // though high-stars has more stars — the lib must preserve that order,
    // not re-sort by stars.
    expect(repos).toEqual([
      {
        slug: 'nadeem4/low-stars',
        name: 'low-stars',
        description: 'A small repo',
        url: 'https://github.com/nadeem4/low-stars',
        stars: 2,
        language: 'TypeScript',
        updatedAt: '2026-01-01T00:00:00Z',
        license: null,
      },
      {
        slug: 'nadeem4/high-stars',
        name: 'high-stars',
        description: 'A popular repo',
        url: 'https://github.com/nadeem4/high-stars',
        stars: 42,
        language: 'Python',
        updatedAt: '2026-01-03T00:00:00Z',
        license: null,
      },
    ]);
  });

  it('maps license.name when a recognized license is present', async () => {
    setupFetchMock([
      makeRepo({
        full_name: 'nadeem4/licensed',
        name: 'licensed',
        description: 'Has a license',
        html_url: 'https://github.com/nadeem4/licensed',
        license: { name: 'MIT License' },
      }),
    ]);

    const repos = await fetchGithubRepos('nadeem4');

    expect(repos[0].license).toBe('MIT License');
  });

  it('maps license to null when no license object is present', async () => {
    setupFetchMock([
      makeRepo({
        full_name: 'nadeem4/unlicensed',
        name: 'unlicensed',
        description: 'No license',
        html_url: 'https://github.com/nadeem4/unlicensed',
      }),
    ]);

    const repos = await fetchGithubRepos('nadeem4');

    expect(repos[0].license).toBeNull();
  });

  it('sources updatedAt from pushed_at, not updated_at', async () => {
    setupFetchMock([
      makeRepo({
        full_name: 'nadeem4/repo',
        updated_at: '2026-02-01T00:00:00Z',
        pushed_at: '2025-06-15T00:00:00Z',
      }),
    ]);

    const repos = await fetchGithubRepos('nadeem4');

    expect(repos[0].updatedAt).toBe('2025-06-15T00:00:00Z');
  });

  it('returns an empty array on a non-ok response', async () => {
    setupFetchMock({}, { reposOk: false });
    const repos = await fetchGithubRepos('nadeem4');
    expect(repos).toEqual([]);
  });

  it('returns an empty array when the fetch throws', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('network down'));
    const repos = await fetchGithubRepos('nadeem4');
    expect(repos).toEqual([]);
  });

  it('returns an empty array when the response body is not an array (e.g. a rate-limit error payload)', async () => {
    setupFetchMock({
      message: 'API rate limit exceeded',
      documentation_url: 'https://docs.github.com/rest',
    });
    const repos = await fetchGithubRepos('nadeem4');
    expect(repos).toEqual([]);
  });

  it('excludes the profile-README repo ({username}/{username})', async () => {
    setupFetchMock([
      makeRepo({
        full_name: 'nadeem4/nadeem4',
        name: 'nadeem4',
        html_url: 'https://github.com/nadeem4/nadeem4',
      }),
      makeRepo({
        full_name: 'nadeem4/real-project',
        name: 'real-project',
        html_url: 'https://github.com/nadeem4/real-project',
      }),
    ]);

    const repos = await fetchGithubRepos('nadeem4');

    expect(repos.map((r) => r.slug)).toEqual(['nadeem4/real-project']);
  });

  it('excludes repos with fewer than 3 commits (2 via Link header, 1 via no Link header)', async () => {
    setupFetchMock(
      [
        makeRepo({ full_name: 'nadeem4/two-commits', name: 'two-commits' }),
        makeRepo({ full_name: 'nadeem4/one-commit', name: 'one-commit' }),
      ],
      {
        commitsFor: (fullName) => {
          if (fullName === 'nadeem4/two-commits') {
            return commitsResponse({ linkHeader: lastPageLinkHeader(2) });
          }
          // No Link header at all => only one page => exactly 1 commit.
          return commitsResponse({ linkHeader: null });
        },
      },
    );

    const repos = await fetchGithubRepos('nadeem4');

    expect(repos).toEqual([]);
  });

  it('includes repos with exactly 3 commits or more', async () => {
    setupFetchMock(
      [
        makeRepo({ full_name: 'nadeem4/three-commits', name: 'three-commits' }),
        makeRepo({ full_name: 'nadeem4/many-commits', name: 'many-commits' }),
      ],
      {
        commitsFor: (fullName) => {
          if (fullName === 'nadeem4/three-commits') {
            return commitsResponse({ linkHeader: lastPageLinkHeader(3) });
          }
          return commitsResponse({ linkHeader: lastPageLinkHeader(20) });
        },
      },
    );

    const repos = await fetchGithubRepos('nadeem4');

    expect(repos.map((r) => r.slug).sort()).toEqual([
      'nadeem4/many-commits',
      'nadeem4/three-commits',
    ]);
  });

  it('excludes a repo whose commits endpoint returns a non-200 (e.g. empty repo 409) without throwing or aborting other repos', async () => {
    setupFetchMock(
      [
        makeRepo({ full_name: 'nadeem4/empty-repo', name: 'empty-repo' }),
        makeRepo({ full_name: 'nadeem4/healthy-repo', name: 'healthy-repo' }),
      ],
      {
        commitsFor: (fullName) => {
          if (fullName === 'nadeem4/empty-repo') {
            return commitsResponse({ ok: false });
          }
          return commitsResponse({ linkHeader: lastPageLinkHeader(5) });
        },
      },
    );

    const repos = await fetchGithubRepos('nadeem4');

    expect(repos.map((r) => r.slug)).toEqual(['nadeem4/healthy-repo']);
  });

  it('sends an Authorization: Bearer header on both the repo-list and commits fetches when GITHUB_TOKEN is set', async () => {
    process.env.GITHUB_TOKEN = 'test-token-123';
    setupFetchMock([makeRepo({ full_name: 'nadeem4/repo' })]);

    await fetchGithubRepos('nadeem4');

    const calls = vi.mocked(fetch).mock.calls;
    const reposCall = calls.find(([input]) => String(input).includes('/users/'));
    const commitsCall = calls.find(([input]) => String(input).includes('/commits'));

    expect(reposCall).toBeDefined();
    expect(commitsCall).toBeDefined();

    const reposHeaders = reposCall?.[1]?.headers as Record<string, string>;
    const commitsHeaders = commitsCall?.[1]?.headers as Record<string, string>;

    expect(reposHeaders.Authorization).toBe('Bearer test-token-123');
    expect(commitsHeaders.Authorization).toBe('Bearer test-token-123');
  });

  it('sends no Authorization header when GITHUB_TOKEN is unset, and still returns results', async () => {
    delete process.env.GITHUB_TOKEN;
    setupFetchMock([makeRepo({ full_name: 'nadeem4/repo' })]);

    const repos = await fetchGithubRepos('nadeem4');

    const calls = vi.mocked(fetch).mock.calls;
    for (const [, init] of calls) {
      const headers = init?.headers as Record<string, string> | undefined;
      expect(headers?.Authorization).toBeUndefined();
    }

    expect(repos.map((r) => r.slug)).toEqual(['nadeem4/repo']);
  });
});
