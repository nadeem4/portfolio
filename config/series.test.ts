import { describe, it, expect } from 'vitest';
import { SERIES } from './series';
import { getBlogPosts } from '@/lib/blog';

const categories = new Set(getBlogPosts().map((post) => post.category));

describe('SERIES', () => {
  it('names the three featured series in order', () => {
    expect(SERIES.map((s) => s.category)).toEqual(['Vector Databases', 'Postgres Series', 'AI System Design']);
  });

  it('points every series at a category the catalog actually has', () => {
    // A renamed category in Notion would otherwise leave a tile linking to a 404.
    SERIES.forEach((series) => expect(categories.has(series.category), series.category).toBe(true));
  });

  it('gives every series a one-line description with no dashes', () => {
    SERIES.forEach((series) => {
      expect(series.description.length).toBeGreaterThan(0);
      expect(series.description).not.toMatch(/[–—]/);
    });
  });
});
