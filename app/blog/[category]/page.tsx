import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PostList } from '@/components/blog/post-list';
import { filterPostsByCategory } from '@/components/blog/filter-posts';
import { getBlogPosts } from '@/lib/blog';
import { categoryFromSlug, categorySlugs } from '@/lib/categories';
import { categoryStats } from '@/lib/blog-stats';

interface CategoryPageProps {
  params: Promise<{ category: string }>;
}

/**
 * One page per category, including the single-post ones.
 *
 * Generated from the catalog rather than a hand-kept list, so a category added
 * in Notion gets a page on the next sync with nothing to remember.
 */
export function generateStaticParams() {
  return categorySlugs().map((category) => ({ category }));
}

function statFor(category: string) {
  return categoryStats(getBlogPosts()).find((stat) => stat.category === category);
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { category: slug } = await params;
  const category = categoryFromSlug(slug);
  if (!category) return {};

  const stat = statFor(category);
  const count = stat?.count ?? 0;

  return {
    title: category,
    description: `${count} ${count === 1 ? 'post' : 'posts'} on ${category}, from ${stat?.earliest.slice(0, 4)} to ${stat?.latest.slice(0, 4)}.`,
  };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { category: slug } = await params;
  const category = categoryFromSlug(slug);
  if (!category) notFound();

  const posts = filterPostsByCategory(getBlogPosts(), category);
  const stat = statFor(category);

  return (
    <main className="px-6 py-12">
      <div className="max-w-2xl lg:max-w-3xl mx-auto space-y-8">
        {/* Set in type rather than as a banner image. A generated PNG had to be
            fetched through the image optimizer to appear, which is a request
            that can fail — and did, in dev. Type cannot fail, stays sharp at
            any width, and costs nothing to load. The social card is still a
            PNG, because a crawler has no other way to read one. */}
        <header className="space-y-3">
          <Link
            href="/blog"
            className="inline-block text-[0.65rem] uppercase tracking-[0.18em] text-foreground-dim transition-colors hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 rounded-sm"
          >
            ← All writing
          </Link>
          <div aria-hidden="true" className="h-0.5 w-full rounded-sm bg-accent" />
          <p className="font-mono text-[0.7rem] tracking-[0.12em] text-accent">&gt; blog --category</p>
          <h1 className="text-2xl font-bold tracking-tight">{category}</h1>
          {stat && (
            <>
              <div aria-hidden="true" className="h-px w-full bg-border" />
              <p className="text-[0.65rem] uppercase tracking-[0.18em] text-foreground-dim">
                {stat.count} {stat.count === 1 ? 'post' : 'posts'}
                <span aria-hidden="true" className="mx-1.5 opacity-50">
                  ·
                </span>
                {stat.earliest.slice(0, 4)}
                {stat.earliest.slice(0, 4) !== stat.latest.slice(0, 4) && `–${stat.latest.slice(0, 4)}`}
              </p>
            </>
          )}
        </header>

        {/* One hand-written condition rather than a registry: config/labs.ts
            earns its keep at more than one lab and arrives with the second.
            And nothing is linked before it is deployed — a link to a
            "COMING SOON" page advertises an absence. */}
        {category === 'Vector Databases' && (
          <section className="rounded border border-border bg-background-raised p-4">
            <h2 className="text-sm font-bold uppercase tracking-[0.18em]">Lab</h2>
            <p className="mt-2 text-sm leading-relaxed text-foreground-dim">
              Build an index by hand — insert points, delete them, run a query — and watch every distance
              computation it costs.
            </p>
            <Link
              href="/lab/vector-index"
              className="mt-3 inline-block text-[0.65rem] uppercase tracking-[0.18em] text-accent transition-colors hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 rounded-sm"
            >
              Open the vector index playground →
            </Link>
          </section>
        )}

        {/* The h1 above already names the topic, and every post on this page
            carries it — so the list heading and the per-row topic label would
            both be the same words repeated. The heading stays in the tree for
            assistive technology; the row label goes entirely, leaving the date,
            which is the part that actually differs. */}
        <PostList heading={category} posts={posts} headingHidden showCategory={false} />
      </div>
    </main>
  );
}
