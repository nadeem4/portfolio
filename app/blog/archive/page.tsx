import type { Metadata } from 'next';
import Link from 'next/link';
import { YearGroupedPosts } from '@/components/blog/year-grouped-posts';
import { getBlogPosts } from '@/lib/blog';

export const metadata: Metadata = {
  title: 'Archive',
  description: 'Every post, newest first.',
};

/**
 * The complete run, newest first, grouped by year.
 *
 * Kept as its own page so the hub does not have to be both a launchpad and a
 * hundred-item list. Anyone who wants the whole thing in one scroll still has
 * somewhere to go, and it is one URL to hand out.
 */
export default function ArchivePage() {
  const posts = getBlogPosts();

  return (
    <main className="mx-auto max-w-page px-6 py-16 sm:px-10 sm:py-20">
      <div className="max-w-3xl">
        <header className="rise-in">
          <Link
            href="/blog"
            className="link-underline -mt-3 inline-flex min-h-11 items-center font-mono text-sm text-foreground-dim hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            ← Blog
          </Link>
          <h1 className="mt-4 text-5xl font-semibold tracking-tight">Archive</h1>
          <p className="mt-4 font-mono text-sm text-foreground-dim">{posts.length} posts, newest first</p>
        </header>

        <div className="mt-14">
          <YearGroupedPosts posts={posts} />
        </div>
      </div>
    </main>
  );
}
