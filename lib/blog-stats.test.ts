import { describe, it, expect } from 'vitest';
import { catalogStats, categoryStats, formatMonthYear, formatShortDate, formatYearRange, groupByYear } from './blog-stats';
import { getBlogPosts } from './blog';
import type { BlogPost } from './blog.types';

function post(id: string, category: string, date: string): BlogPost {
  return { id, title: id, subtitle: '', url: `https://medium.com/@you/p-${id}`, date, category };
}

describe('categoryStats', () => {
  it('counts the posts in each category', () => {
    const stats = categoryStats([
      post('aaaaaa', 'Data', '2026-01-01'),
      post('bbbbbb', 'Data', '2026-02-01'),
      post('cccccc', 'AI', '2026-03-01'),
    ]);
    expect(stats.find((s) => s.category === 'Data')?.count).toBe(2);
    expect(stats.find((s) => s.category === 'AI')?.count).toBe(1);
  });

  it('orders categories by most recent post first', () => {
    const stats = categoryStats([
      post('aaaaaa', 'Stale', '2020-01-01'),
      post('bbbbbb', 'Current', '2026-08-01'),
      post('cccccc', 'Middle', '2024-05-01'),
    ]);
    expect(stats.map((s) => s.category)).toEqual(['Current', 'Middle', 'Stale']);
  });

  it('breaks ties on the same last-active date by category name', () => {
    // Real case: Azure & Cloud Fundamentals and Java & Spring Boot both end on
    // 2024-09-16. Without a tie-break their cards could swap between builds.
    const stats = categoryStats([post('aaaaaa', 'Zebra', '2024-09-16'), post('bbbbbb', 'Alpha', '2024-09-16')]);
    expect(stats.map((s) => s.category)).toEqual(['Alpha', 'Zebra']);
  });

  it('bounds each category with its earliest and latest post', () => {
    const stats = categoryStats([
      post('aaaaaa', 'Data', '2024-03-01'),
      post('bbbbbb', 'Data', '2026-07-01'),
      post('cccccc', 'Data', '2025-01-01'),
    ]);
    expect(stats[0].earliest).toBe('2024-03-01');
    expect(stats[0].latest).toBe('2026-07-01');
  });

  it('returns an empty array for an empty catalog', () => {
    expect(categoryStats([])).toEqual([]);
  });
});

describe('catalogStats', () => {
  it('totals the posts and the distinct categories', () => {
    const summary = catalogStats([
      post('aaaaaa', 'Data', '2024-01-01'),
      post('bbbbbb', 'Data', '2025-01-01'),
      post('cccccc', 'AI', '2026-01-01'),
    ]);
    expect(summary?.total).toBe(3);
    expect(summary?.categoryCount).toBe(2);
  });

  it('spans the true first and last year, regardless of input order', () => {
    const summary = catalogStats([
      post('bbbbbb', 'Data', '2026-08-12'),
      post('aaaaaa', 'Data', '2020-02-08'),
      post('cccccc', 'AI', '2023-05-01'),
    ]);
    expect(summary?.firstYear).toBe(2020);
    expect(summary?.lastYear).toBe(2026);
  });

  it('returns null for an empty catalog, so the masthead can render nothing', () => {
    expect(catalogStats([])).toBeNull();
  });
});

describe('against the real catalog', () => {
  const posts = getBlogPosts();

  it('accounts for every post exactly once across categories', () => {
    const counted = categoryStats(posts).reduce((sum, s) => sum + s.count, 0);
    expect(counted).toBe(posts.length);
  });

  it('reports a category count matching the distinct categories present', () => {
    expect(catalogStats(posts)?.categoryCount).toBe(new Set(posts.map((p) => p.category)).size);
  });

  it('leads with a more recently active category than it ends with', () => {
    const stats = categoryStats(posts);
    expect(stats[0].latest > stats[stats.length - 1].latest).toBe(true);
  });
});

describe('formatShortDate', () => {
  it('formats as month and unpadded day, for rows already grouped under a year', () => {
    expect(formatShortDate('2026-08-27')).toBe('Aug 27');
    expect(formatShortDate('2026-02-06')).toBe('Feb 6');
  });
});

describe('formatMonthYear', () => {
  it('formats as month and year', () => {
    expect(formatMonthYear('2026-03-19')).toBe('Mar 2026');
    expect(formatMonthYear('2020-12-01')).toBe('Dec 2020');
  });
});

describe('groupByYear', () => {
  it('groups posts by year, keeping the order given', () => {
    const a = post('aaaaaa', 'Data', '2026-08-01');
    const b = post('bbbbbb', 'Data', '2026-02-01');
    const c = post('cccccc', 'AI', '2025-11-01');
    expect(groupByYear([a, b, c])).toEqual([
      { year: '2026', posts: [a, b] },
      { year: '2025', posts: [c] },
    ]);
  });

  it('returns an empty array for no posts', () => {
    expect(groupByYear([])).toEqual([]);
  });
});

describe('formatYearRange', () => {
  it('joins two different years with "to", never a dash', () => {
    expect(formatYearRange('2020-02-08', '2026-08-12')).toBe('2020 to 2026');
  });

  it('collapses to one year when both ends share it', () => {
    expect(formatYearRange('2026-01-01', '2026-08-12')).toBe('2026');
  });
});
