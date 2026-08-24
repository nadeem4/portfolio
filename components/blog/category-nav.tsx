import Link from 'next/link';
import { categoryStats } from '@/lib/blog-stats';
import { categorySlug } from '@/lib/categories';
import type { BlogPost } from '@/lib/blog.types';

interface CategoryNavProps {
  posts: BlogPost[];
  /** Category whose page is currently showing, if any. Marks that chip current. */
  active?: string | null;
}

/**
 * Links to every topic, with its post count.
 *
 * Ordered alphabetically, deliberately. An earlier version ordered by most
 * recent activity so current work led — but that reorders the whole row every
 * time a post ships, so nobody can learn where a topic sits. Alphabetical is
 * the only order that stays put, and recency is already carried by the Latest
 * block below and by each topic page.
 *
 * Rendered as a wrapping chip row rather than a card grid. The grid gave each
 * topic a count, a bar and a date in a fixed-height tile, which cost most of a
 * screen at fourteen topics and would cost more at twenty — pushing the actual
 * writing below the fold on a phone. The chips carry the two facts worth
 * scanning and let the number of topics grow without redesigning the page.
 */
export function CategoryNav({ posts, active = null }: CategoryNavProps) {
  const stats = categoryStats(posts);
  if (stats.length === 0) return null;

  const ordered = [...stats].sort((a, b) => a.category.localeCompare(b.category));

  return (
    <nav aria-label="Blog categories" className="flex flex-wrap gap-1.5">
      {ordered.map((stat) => {
        const isCurrent = stat.category === active;
        return (
          <Link
            key={stat.category}
            href={`/blog/${categorySlug(stat.category)}`}
            aria-current={isCurrent ? 'page' : undefined}
            className={`inline-flex items-center gap-2 rounded-full border bg-background-raised px-3 py-1.5 text-[0.65rem] uppercase tracking-wider transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 ${
              isCurrent ? 'border-accent' : 'border-border hover:border-accent'
            }`}
          >
            <span className="text-foreground">{stat.category}</span>
            <span className="font-bold text-accent">{stat.count}</span>
          </Link>
        );
      })}
    </nav>
  );
}
