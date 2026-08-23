import type { Metadata } from 'next';
import Image from 'next/image';
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
      <div className="max-w-2xl mx-auto space-y-8">
        <header className="space-y-4">
          {/* The category's social card, reused as the page banner so the two
              can never drift apart. Decorative: the h1 below states the same
              name, so announcing it twice would only be noise. Routed through
              next/image because at 1200x630 this is the page's LCP element and
              the raw PNG is ~40KB at every viewport. */}
          <Image
            src={`/blog/${slug}/opengraph-image`}
            alt=""
            width={1200}
            height={630}
            priority
            className="w-full rounded border border-border"
          />
          <div className="space-y-2">
            <Link
              href="/blog"
              className="inline-block text-[0.65rem] uppercase tracking-[0.18em] text-foreground-dim transition-colors hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 rounded-sm"
            >
              ← All writing
            </Link>
            <h1 className="text-2xl font-bold tracking-tight">{category}</h1>
            {stat && (
              <p className="text-[0.65rem] uppercase tracking-[0.18em] text-foreground-dim">
                {stat.count} {stat.count === 1 ? 'post' : 'posts'}
                <span aria-hidden="true" className="mx-1.5 opacity-50">
                  ·
                </span>
                {stat.earliest.slice(0, 4)}
                {stat.earliest.slice(0, 4) !== stat.latest.slice(0, 4) && `–${stat.latest.slice(0, 4)}`}
              </p>
            )}
          </div>
        </header>

        <PostList heading={category} posts={posts} />
      </div>
    </main>
  );
}
