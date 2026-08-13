import type { BlogPost } from './blog.types';

export interface CategoryStat {
  category: string;
  count: number;
  /** ISO date of the category's oldest post. */
  earliest: string;
  /** ISO date of the category's newest post. */
  latest: string;
}

export interface CatalogStats {
  total: number;
  categoryCount: number;
  firstYear: number;
  lastYear: number;
}

/**
 * Per-category counts and date ranges, ordered by most recent post first.
 *
 * Recency rather than size or alphabet: the second-largest category last saw a
 * post in 2024 and is the least representative of current work, so ordering by
 * count would lead with the stalest material. Recency is also derived, so it
 * stays correct as the sync job adds posts, with no list for anyone to maintain.
 *
 * Ties on `latest` break by category name — Azure & Cloud Fundamentals and
 * Java & Spring Boot both end on 2024-09-16, and their order must not drift
 * between builds.
 *
 * ISO dates compare lexicographically, so no Date parsing is needed.
 */
export function categoryStats(posts: BlogPost[]): CategoryStat[] {
  const byCategory = new Map<string, CategoryStat>();

  for (const post of posts) {
    const stat = byCategory.get(post.category);
    if (!stat) {
      byCategory.set(post.category, {
        category: post.category,
        count: 1,
        earliest: post.date,
        latest: post.date,
      });
      continue;
    }
    stat.count++;
    if (post.date < stat.earliest) stat.earliest = post.date;
    if (post.date > stat.latest) stat.latest = post.date;
  }

  return [...byCategory.values()].sort((a, b) =>
    a.latest === b.latest ? a.category.localeCompare(b.category) : b.latest.localeCompare(a.latest),
  );
}

/**
 * Whole-catalog totals for the masthead.
 *
 * Returns null for an empty catalog so the masthead can render nothing rather
 * than claiming "0 POSTS · 0 DOMAINS".
 */
export function catalogStats(posts: BlogPost[]): CatalogStats | null {
  if (posts.length === 0) return null;

  let firstYear = Number.POSITIVE_INFINITY;
  let lastYear = Number.NEGATIVE_INFINITY;

  for (const post of posts) {
    const year = Number(post.date.slice(0, 4));
    if (year < firstYear) firstYear = year;
    if (year > lastYear) lastYear = year;
  }

  return {
    total: posts.length,
    categoryCount: new Set(posts.map((post) => post.category)).size,
    firstYear,
    lastYear,
  };
}
