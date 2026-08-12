import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getFeaturedRepos } from './projects';
import { featuredProjects } from '@/config/featured-projects';

function jsonResponse(body: unknown, ok = true) {
  return { ok, json: () => Promise.resolve(body) } as Response;
}

describe('getFeaturedRepos', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('fetches GitHub repo data for every configured featured project', async () => {
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

    const repos = await getFeaturedRepos();

    expect(repos).toHaveLength(featuredProjects.length);
    expect(repos[0].slug).toBe(featuredProjects[0].repoSlug);
  });
});
