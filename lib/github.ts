import type { GithubRepo } from './github.types';

interface GithubApiRepo {
  full_name: string;
  name: string;
  description: string | null;
  html_url: string;
  stargazers_count: number;
  language: string | null;
  updated_at: string;
  pushed_at: string;
  fork: boolean;
  license: { name: string } | null;
}

const MIN_COMMIT_COUNT = 3;

function authHeaders(): Record<string, string> {
  const token = process.env.GITHUB_TOKEN;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Parses a GitHub `Link` response header and returns the `page` query
 * parameter of the entry with `rel="last"`, or null if there's no such entry.
 */
function parseLastPage(linkHeader: string): number | null {
  for (const part of linkHeader.split(',')) {
    if (!part.includes('rel="last"')) continue;
    const match = part.match(/[?&]page=(\d+)/);
    if (match) return parseInt(match[1], 10);
  }
  return null;
}

/**
 * Derives a repo's total commit count via `GET /commits?per_page=1`: with
 * exactly one commit per page, the `page` number on the `rel="last"` Link
 * header entry equals the total commit count. No Link header on an
 * otherwise-successful response means there's only a single page (1 commit).
 * Any non-200 response (e.g. 409 for an empty repo, 404, rate-limited 403)
 * is treated as 0 commits rather than thrown, so one repo's failure never
 * aborts the rest.
 */
async function fetchCommitCount(fullName: string): Promise<number> {
  try {
    const res = await fetch(`https://api.github.com/repos/${fullName}/commits?per_page=1`, {
      next: { revalidate: 21600 },
      headers: { Accept: 'application/vnd.github+json', ...authHeaders() },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return 0;

    const linkHeader = res.headers.get('Link');
    if (!linkHeader) return 1;

    return parseLastPage(linkHeader) ?? 1;
  } catch {
    return 0;
  }
}

export async function fetchGithubRepos(username: string): Promise<GithubRepo[]> {
  try {
    const res = await fetch(
      `https://api.github.com/users/${username}/repos?type=owner&sort=pushed&per_page=100`,
      {
        next: { revalidate: 21600 },
        headers: { Accept: 'application/vnd.github+json', ...authHeaders() },
        signal: AbortSignal.timeout(5000),
      },
    );
    if (!res.ok) return [];

    const data = await res.json();
    if (!Array.isArray(data)) return [];

    const candidates = (data as GithubApiRepo[]).filter(
      (item) => item.fork !== true && item.full_name !== `${username}/${username}`,
    );

    const commitCounts = await Promise.all(
      candidates.map((item) => fetchCommitCount(item.full_name)),
    );

    return candidates
      .filter((_, index) => commitCounts[index] >= MIN_COMMIT_COUNT)
      .map(
        (item): GithubRepo => ({
          slug: item.full_name,
          name: item.name,
          description: item.description ?? '',
          url: item.html_url,
          stars: item.stargazers_count,
          language: item.language,
          updatedAt: item.pushed_at,
          license: item.license?.name ?? null,
        }),
      );
  } catch {
    return [];
  }
}
