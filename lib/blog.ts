import { fetchMediumPosts } from './medium';
import { getBlogCategories, applyBlogCategories } from './blog-categories';
import { siteConfig } from '@/config/site';
import type { MediumPost } from './medium.types';

export async function getBlogPosts(): Promise<MediumPost[]> {
  const posts = await fetchMediumPosts(siteConfig.mediumFeedUrl);
  const categories = getBlogCategories();
  return applyBlogCategories(posts, categories);
}
