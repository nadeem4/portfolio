import type { GithubRepo } from './github.types';

export async function fetchPinnedRepos(slugs: string[]): Promise<GithubRepo[]> {
  const results = await Promise.all(
    slugs.map(async (slug): Promise<GithubRepo | null> => {
      try {
        const res = await fetch(`https://api.github.com/repos/${slug}`, {
          next: { revalidate: 21600 },
          headers: { Accept: 'application/vnd.github+json' },
          signal: AbortSignal.timeout(5000),
        });
        if (!res.ok) return null;
        const data = await res.json();
        return {
          slug,
          name: data.name,
          description: data.description ?? '',
          url: data.html_url,
          stars: data.stargazers_count,
          language: data.language,
          updatedAt: data.updated_at,
        };
      } catch {
        return null;
      }
    }),
  );
  return results.filter((repo): repo is GithubRepo => repo !== null);
}
