import type { BlogPost } from './blog.types';

export interface CategoryStat {
  category: string;
  count: number;
  /** ISO date of the category's oldest post. */
  earliest: string;
  /** ISO date of the category's newest post. */
  latest: string;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Formats an ISO date as "15 Aug 2026".
 *
 * Built from the string, never a Date: parsing `2026-08-01` yields UTC midnight,
 * which a negative-offset locale renders as the previous month. The year is
 * always shown — these dates signal recency, and a bare "15 Aug" reads as this
 * year even when it isn't.
 */
export function formatPostDate(iso: string): string {
  const [year, month, day] = iso.split('-');
  return `${Number(day)} ${MONTHS[Number(month) - 1]} ${year}`;
}

/** "Aug 27": for rows that already sit under a year heading. Built from the string, like formatPostDate. */
export function formatShortDate(iso: string): string {
  const [, month, day] = iso.split('-');
  return `${MONTHS[Number(month) - 1]} ${Number(day)}`;
}

/** "Mar 2026": for rows that carry no year heading. */
export function formatMonthYear(iso: string): string {
  const [year, month] = iso.split('-');
  return `${MONTHS[Number(month) - 1]} ${year}`;
}

/** "2024 to 2026", or a single year when both ends share it. Words, not a dash. */
export function formatYearRange(earliest: string, latest: string): string {
  const [from, to] = [earliest.slice(0, 4), latest.slice(0, 4)];
  return from === to ? from : `${from} to ${to}`;
}

export interface YearGroup {
  year: string;
  posts: BlogPost[];
}

/**
 * Splits a list into runs by year, keeping the order given.
 *
 * Assumes the input is already date-ordered, as the catalog is; it groups
 * consecutive posts rather than re-sorting, so callers keep control of order.
 */
export function groupByYear(posts: BlogPost[]): YearGroup[] {
  const groups: YearGroup[] = [];
  for (const post of posts) {
    const year = post.date.slice(0, 4);
    const last = groups[groups.length - 1];
    if (last?.year === year) last.posts.push(post);
    else groups.push({ year, posts: [post] });
  }
  return groups;
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
 * than claiming "0 posts".
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
