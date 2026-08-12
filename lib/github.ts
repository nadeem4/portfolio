import type { GithubRepo } from './github.types';

interface GithubApiRepo {
  full_name: string;
  name: string;
  description: string | null;
  html_url: string;
  stargazers_count: number;
  language: string | null;
  updated_at: string;
  fork: boolean;
}

export async function fetchGithubRepos(username: string): Promise<GithubRepo[]> {
  try {
    const res = await fetch(
      `https://api.github.com/users/${username}/repos?type=owner&sort=pushed&per_page=100`,
      {
        next: { revalidate: 21600 },
        headers: { Accept: 'application/vnd.github+json' },
        signal: AbortSignal.timeout(5000),
      },
    );
    if (!res.ok) return [];

    const data = await res.json();
    if (!Array.isArray(data)) return [];

    return (data as GithubApiRepo[])
      .filter((item) => item.fork !== true)
      .map(
        (item): GithubRepo => ({
          slug: item.full_name,
          name: item.name,
          description: item.description ?? '',
          url: item.html_url,
          stars: item.stargazers_count,
          language: item.language,
          updatedAt: item.updated_at,
        }),
      )
      .sort((a, b) => b.stars - a.stars);
  } catch {
    return [];
  }
}
