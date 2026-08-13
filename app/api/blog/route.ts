import { NextResponse } from 'next/server';
import { getBlogPosts } from '@/lib/blog';

// The catalog is committed to the repo, so this can be prerendered outright.
export const dynamic = 'force-static';

export function GET() {
  return NextResponse.json(getBlogPosts());
}
