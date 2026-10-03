import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { YearGroupedPosts } from '@/components/blog/year-grouped-posts';
import { filterPostsByCategory } from '@/components/blog/filter-posts';
import { getBlogPosts } from '@/lib/blog';
import { categoryFromSlug, categorySlugs } from '@/lib/categories';
import { categoryStats, formatYearRange } from '@/lib/blog-stats';

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
    <main className="mx-auto max-w-page px-6 py-16 sm:px-10 sm:py-20">
      <div className="max-w-3xl">
        {/* Set in type rather than as a banner image. A generated PNG had to be
            fetched through the image optimizer to appear, which is a request
            that can fail. Type cannot fail, stays sharp at any width, and costs
            nothing to load. The social card is still a PNG, because a crawler
            has no other way to read one. */}
        <header className="rise-in">
          <Link
            href="/blog"
            className="link-underline -mt-3 inline-flex min-h-11 items-center font-mono text-sm text-foreground-dim hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            ← All writing
          </Link>
          <h1 className="mt-4 text-5xl font-semibold tracking-tight">{category}</h1>
          {stat && (
            <p className="mt-4 font-mono text-sm text-foreground-dim">
              {stat.count} {stat.count === 1 ? 'post' : 'posts'}, {formatYearRange(stat.earliest, stat.latest)}
            </p>
          )}
        </header>

        {/* The h1 already names the topic and every post here carries it, so
            the per-row topic label is dropped, leaving the date and title. */}
        <div className="mt-14">
          <YearGroupedPosts posts={posts} showCategory={false} />
        </div>
      </div>
    </main>
  );
}
