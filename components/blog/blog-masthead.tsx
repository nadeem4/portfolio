import { catalogStats } from '@/lib/blog-stats';
import type { BlogPost } from '@/lib/blog.types';

interface BlogMastheadProps {
  posts: BlogPost[];
}

/**
 * States the scale of the catalog in one line.
 *
 * Always describes the whole catalog, never the active filter — its job is
 * stating total scale, and recomputing it on filter would undercut that.
 */
export function BlogMasthead({ posts }: BlogMastheadProps) {
  const stats = catalogStats(posts);
  if (!stats) return null;

  return (
    <p className="text-xs uppercase tracking-[0.18em] text-foreground-dim">
      <span className="font-bold text-accent">{stats.total}</span> posts
      <span aria-hidden="true" className="mx-2 opacity-50">
        ·
      </span>
      <span className="font-bold text-accent">{stats.categoryCount}</span> domains
      <span aria-hidden="true" className="mx-2 opacity-50">
        ·
      </span>
      <span className="font-bold text-accent">{stats.firstYear}</span>
      <span aria-hidden="true" className="mx-1.5 opacity-50">
        —
      </span>
      <span className="font-bold text-accent">{stats.lastYear}</span>
    </p>
  );
}
