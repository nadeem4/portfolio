import { fetchGithubRepos } from './github';
import { siteConfig } from '@/config/site';
import type { GithubRepo } from './github.types';

export async function getGithubRepos(): Promise<GithubRepo[]> {
  return fetchGithubRepos(siteConfig.githubUsername);
}
