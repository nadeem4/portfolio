import { get } from '@vercel/edge-config';
import type { MediumPost } from './medium.types';

const OVERRIDES_KEY = 'blogCategoryOverrides';

export async function getCategoryOverrides(): Promise<Record<string, string>> {
  try {
    const overrides = await Promise.race([
      get<Record<string, string>>(OVERRIDES_KEY),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Edge Config timeout')), 5000)),
    ]);
    return overrides ?? {};
  } catch {
    return {};
  }
}

export function applyCategoryOverrides(posts: MediumPost[], overrides: Record<string, string>): MediumPost[] {
  return posts.map((post) => {
    const override = overrides[post.link];
    if (!override) return post;
    return { ...post, categories: [override] };
  });
}
