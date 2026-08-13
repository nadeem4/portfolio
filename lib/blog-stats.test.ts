import { describe, it, expect } from 'vitest';
import { catalogStats, categoryStats } from './blog-stats';
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
