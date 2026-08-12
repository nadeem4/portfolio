import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchPinnedRepos } from './github';

function jsonResponse(body: unknown, ok = true) {
  return { ok, json: () => Promise.resolve(body) } as Response;
}

describe('fetchPinnedRepos', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('normalizes a successful repo response', async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({
        name: 'example-pipeline',
        description: 'A data pipeline',
        html_url: 'https://github.com/yourhandle/example-pipeline',
        stargazers_count: 42,
        language: 'Python',
        updated_at: '2026-01-01T00:00:00Z',
      }),
    );

    const repos = await fetchPinnedRepos(['yourhandle/example-pipeline']);
    expect(repos).toEqual([
      {
        slug: 'yourhandle/example-pipeline',
        name: 'example-pipeline',
        description: 'A data pipeline',
        url: 'https://github.com/yourhandle/example-pipeline',
        stars: 42,
        language: 'Python',
        updatedAt: '2026-01-01T00:00:00Z',
      },
    ]);
  });

  it('skips a repo that returns a non-ok response (e.g. renamed or deleted)', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({}, false));
    const repos = await fetchPinnedRepos(['yourhandle/missing-repo']);
    expect(repos).toEqual([]);
  });

  it('skips a repo whose request throws', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('network down'));
    const repos = await fetchPinnedRepos(['yourhandle/example-pipeline']);
    expect(repos).toEqual([]);
  });

  it('fetches multiple repos independently, keeping only the successful ones', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        jsonResponse({
          name: 'repo-a',
          description: '',
          html_url: 'https://github.com/yourhandle/repo-a',
          stargazers_count: 1,
          language: null,
          updated_at: '2026-01-01T00:00:00Z',
        }),
      )
      .mockResolvedValueOnce(jsonResponse({}, false));

    const repos = await fetchPinnedRepos(['yourhandle/repo-a', 'yourhandle/repo-b']);
    expect(repos).toHaveLength(1);
    expect(repos[0].slug).toBe('yourhandle/repo-a');
  });
});
