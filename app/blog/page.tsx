import type { Metadata } from 'next';
import Link from 'next/link';
import { BlogHub } from '@/components/blog/blog-hub';
import { BlogMasthead } from '@/components/blog/blog-masthead';
import { CategoryNav } from '@/components/blog/category-nav';
import { SeriesTiles } from '@/components/blog/series-tiles';
import { YearGroupedPosts } from '@/components/blog/year-grouped-posts';
import { getBlogPosts } from '@/lib/blog';

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
 * A launchpad, not the archive: search and topics in the sidebar, the featured
 * series and the ten newest posts in the main column, and a hand-off to
 * /blog/archive for the full run. Curated highlights live on the homepage only,
 * so they are not repeated here.
 */
export default function BlogPage() {
  const posts = getBlogPosts();

  return (
    <main className="mx-auto max-w-page px-6 py-16 sm:px-10 sm:py-20">
      <header className="rise-in">
        <h1 className="text-5xl font-semibold tracking-tight">Writing</h1>
        <div className="mt-5">
          <BlogMasthead posts={posts} />
        </div>
      </header>

      <div className="mt-14">
        <BlogHub posts={posts} sidebar={<CategoryNav posts={posts} />}>
          <div className="space-y-16">
            <SeriesTiles posts={posts} />
            <section>
              <h2 className="text-2xl font-semibold tracking-tight">Latest</h2>
              <div className="mt-6">
                <YearGroupedPosts posts={posts.slice(0, LATEST)} headingLevel={3} />
              </div>
              <Link
                href="/blog/archive"
                className="link-underline mt-6 inline-flex min-h-11 items-center font-mono text-sm text-foreground-soft hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                Full archive
              </Link>
            </section>
          </div>
        </BlogHub>
      </div>
    </main>
  );
}
