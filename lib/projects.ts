import { fetchGithubRepos, fetchPinnedNames } from './github';
import { siteConfig } from '@/config/site';
import { featured, hidden } from '@/config/project-overrides';
import type { GithubRepo } from './github.types';

/**
 * Applies the curation overrides to an automatically fetched repo list.
 *
 * `hidden` is applied first, so a repo named in both lists stays hidden.
 * `featured` then pins repos to the front in the order listed; everything else
 * keeps its incoming order, which `fetchGithubRepos` already sorts by recency.
 */
export function applyOverrides(repos: GithubRepo[], featuredNames: string[], hiddenNames: string[]): GithubRepo[] {
  const hiddenSet = new Set(hiddenNames);
  const rank = new Map(featuredNames.map((name, index) => [name, index]));

  return repos
    .filter((repo) => !hiddenSet.has(repo.name))
    .sort((a, b) => {
      // Both unranked must compare equal, not Infinity - Infinity, which is NaN
      // and leaves the sort order undefined. Returning 0 keeps Array#sort's
      // stability, which is what preserves the incoming recency order.
      const rankA = rank.get(a.name) ?? Infinity;
      const rankB = rank.get(b.name) ?? Infinity;
      return rankA === rankB ? 0 : rankA - rankB;
    });
}

export async function getGithubRepos(): Promise<GithubRepo[]> {
  const repos = await fetchGithubRepos(siteConfig.githubUsername);
  return applyOverrides(repos, featured, hidden);
}

export interface Projects {
  /** Repos pinned on the GitHub profile, in pin order. */
  pinned: GithubRepo[];
  /** Every other shown repo, most recently pushed first. */
  others: GithubRepo[];
}

/**
 * The repos for the homepage and /projects, split by the owner's GitHub pins.
 *
 * Pins come live from GitHub when a token is available; otherwise `featured`
 * in `config/project-overrides.ts` stands in, so it should mirror the profile.
 * `hidden` still wins over both.
 */
export async function getProjects(): Promise<Projects> {
  const [repos, pinnedNames] = await Promise.all([
    fetchGithubRepos(siteConfig.githubUsername),
    fetchPinnedNames(siteConfig.githubUsername),
  ]);
  const shown = applyOverrides(repos, [], hidden);
  const names = pinnedNames ?? featured;
  const byName = new Map(shown.map((repo) => [repo.name, repo]));
  const pinned = names.map((name) => byName.get(name)).filter((repo): repo is GithubRepo => repo !== undefined);
  const pinnedSet = new Set(pinned.map((repo) => repo.name));

  return { pinned, others: shown.filter((repo) => !pinnedSet.has(repo.name)) };
}
