import type { Metadata } from 'next';
import Link from 'next/link';
import { PostList } from '@/components/blog/post-list';
import { getBlogPosts } from '@/lib/blog';

export const metadata: Metadata = {
  title: 'Archive',
  description: 'Every post, newest first.',
};

/**
 * The complete run, newest first.
 *
 * Kept as its own page so the hub does not have to be both a launchpad and a
 * hundred-item list. Anyone who wants the whole thing in one scroll still has
 * somewhere to go, and it is one URL to hand out.
 */
export default function ArchivePage() {
  const posts = getBlogPosts();

  return (
    <main className="px-6 py-12">
      <div className="max-w-2xl mx-auto space-y-8">
        <header className="space-y-3">
          <Link
            href="/blog"
            className="inline-block text-[0.65rem] uppercase tracking-[0.18em] text-foreground-dim transition-colors hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 rounded-sm"
          >
            ← Blog
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">Archive</h1>
          <p className="text-[0.65rem] uppercase tracking-[0.18em] text-foreground-dim">
            {posts.length} posts, newest first
          </p>
        </header>

        <PostList heading="All posts" posts={posts} />
      </div>
    </main>
  );
}
