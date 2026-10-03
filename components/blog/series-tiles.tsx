import Link from 'next/link';
import { SERIES } from '@/config/series';
import { categorySlug } from '@/lib/categories';
import type { BlogPost } from '@/lib/blog.types';

interface SeriesTilesProps {
  posts: BlogPost[];
}

/**
 * The featured series, as tiles linking to their category pages.
 *
 * Counts are read from the catalog on every build, so they cannot go stale. A
 * series whose category has no posts is skipped rather than linked to an empty
 * page.
 */
export function SeriesTiles({ posts }: SeriesTilesProps) {
  const tiles = SERIES.map((series) => ({
    ...series,
    count: posts.filter((post) => post.category === series.category).length,
  })).filter((tile) => tile.count > 0);

  if (tiles.length === 0) return null;

  return (
    <section>
      <h2 className="text-2xl font-semibold tracking-tight">Series</h2>
      <ul className="mt-5 grid gap-4 sm:grid-cols-3">
        {tiles.map((tile) => (
          <li key={tile.category}>
            <Link
              href={`/blog/${categorySlug(tile.category)}`}
              className="flex h-full flex-col justify-between gap-6 rounded-md border border-border bg-background-raised p-6 transition-colors hover:border-border-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <span>
                <span className="block text-lg font-semibold tracking-tight text-foreground">{tile.category}</span>
                <span className="mt-2 block text-sm text-foreground-dim">{tile.description}</span>
              </span>
              <span className="font-mono text-xs text-foreground-soft">
                {tile.count} {tile.count === 1 ? 'post' : 'posts'}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
