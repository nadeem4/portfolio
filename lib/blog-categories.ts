import { get } from '@vercel/edge-config';
import type { MediumPost } from './medium.types';

const OVERRIDES_KEY = 'blogCategoryOverrides';

export async function getCategoryOverrides(): Promise<Record<string, string>> {
  try {
    const overrides = await get<Record<string, string>>(OVERRIDES_KEY);
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
