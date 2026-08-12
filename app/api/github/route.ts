import { NextResponse } from 'next/server';
import { getGithubRepos } from '@/lib/projects';

export const revalidate = 21600;

export async function GET() {
  const repos = await getGithubRepos();
  return NextResponse.json(repos);
}
