import type { Metadata } from 'next';
import Link from 'next/link';
import { BlogHub } from '@/components/blog/blog-hub';
import { BlogMasthead } from '@/components/blog/blog-masthead';
import { CategoryNav } from '@/components/blog/category-nav';
import { PostList } from '@/components/blog/post-list';
import { getBlogPosts } from '@/lib/blog';
import { getSelectedPosts } from '@/lib/selected-writing';

export const metadata: Metadata = {
  title: 'Blog',
  description:
    'Writing on Postgres CDC, Kafka at scale, distributed SQL execution, and applied AI infrastructure.',
};

/** How many recent posts the hub shows before handing off to the archive. */
const LATEST = 10;

/**
 * The blog hub.
 *
 * A launchpad, not the archive. It used to render all ninety-eight posts in one
 * list; every topic now has its own page, so the hub was duplicating fourteen
 * pages that do the job better, and the list only grew. It now answers what is
 * here and where to start — search, topics, highlights, and what is new — and
 * sends the full run to /blog/archive.
 */
export default function BlogPage() {
  const posts = getBlogPosts();
  const selected = getSelectedPosts();

  // Highlights sit directly above Latest, so a pinned post appearing in both
  // reads as a duplicate rather than as two answers to two questions.
  const selectedIds = new Set(selected.map((post) => post.id));
  const latest = posts.filter((post) => !selectedIds.has(post.id)).slice(0, LATEST);

  return (
    <main className="px-6 py-12">
      <div className="max-w-2xl lg:max-w-3xl mx-auto space-y-8">
        <header className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Blog</h1>
          <BlogMasthead posts={posts} />
        </header>

        <BlogHub posts={posts}>
          <div className="space-y-8">
            <CategoryNav posts={posts} />
            {selected.length > 0 && <PostList heading="Selected writing" posts={selected} />}
            <PostList
              heading="Latest"
              posts={latest}
              action={
                <Link
                  href="/blog/archive"
                  className="text-[0.65rem] uppercase tracking-[0.18em] text-foreground-dim transition-colors hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
                >
                  Full archive →
                </Link>
              }
            />
          </div>
        </BlogHub>
      </div>
    </main>
  );
}
