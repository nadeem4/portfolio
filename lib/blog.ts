import { fetchMediumPosts } from './medium';
import { getCategoryOverrides, applyCategoryOverrides } from './blog-categories';
import { siteConfig } from '@/config/site';
import type { MediumPost } from './medium.types';

export async function getBlogPosts(): Promise<MediumPost[]> {
  const [posts, overrides] = await Promise.all([
    fetchMediumPosts(siteConfig.mediumFeedUrl),
    getCategoryOverrides(),
  ]);
  return applyCategoryOverrides(posts, overrides);
}
