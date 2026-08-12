import type { MediumPost } from '@/lib/medium.types';

export function filterPostsByCategory(posts: MediumPost[], category: string | null): MediumPost[] {
  if (!category) return posts;
  return posts.filter((post) => post.categories.includes(category));
}

export function getCategories(posts: MediumPost[]): string[] {
  return Array.from(new Set(posts.flatMap((post) => post.categories))).sort();
}
