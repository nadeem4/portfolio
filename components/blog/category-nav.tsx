import Link from 'next/link';
import { categoryStats } from '@/lib/blog-stats';
import { categorySlug } from '@/lib/categories';
import type { BlogPost } from '@/lib/blog.types';

interface CategoryNavProps {
  posts: BlogPost[];
  /** Category whose page is currently showing, if any. Marks that row current. */
  active?: string | null;
}

const ROW =
  '-mx-2.5 flex min-h-11 items-center justify-between gap-3 rounded px-2.5 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';

/**
 * Every topic as a vertical list with its post count, led by "All posts".
 *
 * Ordered by post count, biggest first, since that is where most of the writing
 * is; ties break by name so equal-sized topics never swap between builds.
 */
export function CategoryNav({ posts, active = null }: CategoryNavProps) {
  const stats = categoryStats(posts);
  if (stats.length === 0) return null;

  const ordered = [...stats].sort((a, b) => b.count - a.count || a.category.localeCompare(b.category));

  return (
    <nav aria-labelledby="blog-topics-heading">
      <h2 id="blog-topics-heading" className="mb-2 font-mono text-xs text-foreground-dim">
        Topics
      </h2>
      <ul>
        <li>
          <Link href="/blog/archive" className={`${ROW} text-foreground hover:bg-background-raised`}>
            All posts
            <span className="font-mono text-xs">{posts.length}</span>
          </Link>
        </li>
        {ordered.map((stat) => {
          const isCurrent = stat.category === active;
          return (
            <li key={stat.category}>
              <Link
                href={`/blog/${categorySlug(stat.category)}`}
                aria-current={isCurrent ? 'page' : undefined}
                className={`${ROW} ${
                  isCurrent
                    ? 'bg-background-raised text-foreground'
                    : 'text-foreground-dim hover:bg-background-raised hover:text-foreground'
                }`}
              >
                {stat.category}
                <span className="font-mono text-xs">{stat.count}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
