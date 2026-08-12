import { fetchPinnedRepos } from './github';
import { featuredProjects } from '@/config/featured-projects';
import type { GithubRepo } from './github.types';

export async function getFeaturedRepos(): Promise<GithubRepo[]> {
  return fetchPinnedRepos(featuredProjects.map((project) => project.repoSlug));
}
