import { NextResponse } from 'next/server';
import { fetchMediumPosts } from '@/lib/medium';
import { getCategoryOverrides, applyCategoryOverrides } from '@/lib/blog-categories';
import { siteConfig } from '@/config/site';

export const revalidate = 21600;

export async function GET() {
  const [posts, overrides] = await Promise.all([
    fetchMediumPosts(siteConfig.mediumFeedUrl),
    getCategoryOverrides(),
  ]);
  return NextResponse.json(applyCategoryOverrides(posts, overrides));
}
