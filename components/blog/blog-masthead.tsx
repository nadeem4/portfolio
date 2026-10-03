import { catalogStats } from '@/lib/blog-stats';
import type { BlogPost } from '@/lib/blog.types';

interface BlogMastheadProps {
  posts: BlogPost[];
}

/**
 * The one-sentence intro under the /blog heading.
 *
 * The total and first year are derived from the catalog, so the sentence stays
 * true as the sync job adds posts. Always describes the whole catalog.
 */
export function BlogMasthead({ posts }: BlogMastheadProps) {
  const stats = catalogStats(posts);
  if (!stats) return null;

  return (
    <p className="max-w-[56ch] text-lg text-foreground-dim">
      {stats.total} posts since {stats.firstYear}, mostly on Postgres, Kafka, vector databases and the systems around
      LLMs. Each one opens on Medium.
    </p>
  );
}
