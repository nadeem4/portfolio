import type { BlogPost } from '@/lib/blog.types';

export function filterPostsByCategory(posts: BlogPost[], category: string | null): BlogPost[] {
  if (!category) return posts;
  return posts.filter((post) => post.category === category);
}

export function getCategories(posts: BlogPost[]): string[] {
  return Array.from(new Set(posts.map((post) => post.category))).sort();
}
