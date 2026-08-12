import blogCategoriesData from '@/config/blog-categories.json';
import type { MediumPost } from './medium.types';

const UNCATEGORIZED = 'Uncategorized';

const blogCategories: Record<string, string> = blogCategoriesData;

export function getBlogCategories(): Record<string, string> {
  return blogCategories;
}

export function applyBlogCategories(posts: MediumPost[], categories: Record<string, string>): MediumPost[] {
  return posts.map((post) => ({
    ...post,
    categories: [categories[post.link] ?? UNCATEGORIZED],
  }));
}
