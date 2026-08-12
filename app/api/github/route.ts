import { NextResponse } from 'next/server';
import { getFeaturedRepos } from '@/lib/projects';

export const revalidate = 21600;

export async function GET() {
  const repos = await getFeaturedRepos();
  return NextResponse.json(repos);
}
