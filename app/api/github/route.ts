import { NextResponse } from 'next/server';
import { fetchPinnedRepos } from '@/lib/github';
import { featuredProjects } from '@/config/featured-projects';

export const revalidate = 21600;

export async function GET() {
  const repos = await fetchPinnedRepos(featuredProjects.map((project) => project.repoSlug));
  return NextResponse.json(repos);
}
