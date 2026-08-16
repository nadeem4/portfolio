import { catalogStats, formatPostDate } from '@/lib/blog-stats';
import type { BlogPost } from '@/lib/blog.types';

interface WritingActivityProps {
  posts: BlogPost[];
}

/**
 * Scale and currency, in one line under the hero.
 *
 * The curated Selected writing block below is ordered for legibility rather
 * than recency, and the section carrying that signal sits past the experience
 * list — roughly 1150px down, below the fold. A visitor skimming the first
 * screen could not otherwise tell whether the last post was yesterday or years
 * ago, which is the one thing this line exists to answer.
 */
export function WritingActivity({ posts }: WritingActivityProps) {
  const stats = catalogStats(posts);
  if (!stats) return null;

  // The catalog is sorted newest-first.
  const latest = posts[0].date;

  return (
    <p className="text-[0.65rem] uppercase tracking-[0.18em] text-foreground-dim">
      <span className="font-bold text-accent">{stats.total}</span> posts
      <span aria-hidden="true" className="mx-2 opacity-50">
        ·
      </span>
      <span className="font-bold text-accent">{stats.categoryCount}</span> domains
      <span aria-hidden="true" className="mx-2 opacity-50">
        ·
      </span>
      latest <span className="font-bold text-accent">{formatPostDate(latest)}</span>
    </p>
  );
}
