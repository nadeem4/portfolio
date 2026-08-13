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

function authHeaders(): Record<string, string> {
  const token = process.env.GITHUB_TOKEN;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Fetches the public repos worth showing on /projects.
 *
 * A repo qualifies if it is not a fork, is not the profile-README repo, and
 * **has a description**. The description gate replaced a minimum-commit-count
 * filter, which measured how someone worked rather than whether the work was
 * good — it hid a from-scratch transformer squashed into one commit while
 * showing a folder of contest solutions with seven.
 *
 * Writing a description is an act of curation, so it is a far better signal,
 * it is entirely under the author's control, and it guarantees no card renders
 * without one. It also removes a per-repo API call, which is what previously
 * made this endpoint rate-limit without a token.
 *
 * Curation exceptions live in `config/project-overrides.ts`, applied by
 * `lib/projects.ts` — this function stays purely about what GitHub reports.
 */
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

    return (data as GithubApiRepo[])
      .filter(
        (item) =>
          item.fork !== true &&
          item.full_name !== `${username}/${username}` &&
          (item.description ?? '').trim() !== '',
      )
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
