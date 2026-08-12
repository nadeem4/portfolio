import { NextResponse } from 'next/server';
import { getBlogPosts } from '@/lib/blog';

export const revalidate = 21600;

export async function GET() {
  const posts = await getBlogPosts();
  return NextResponse.json(posts);
}
