import { describe, it, expect } from 'vitest';
import { getBlogPosts } from './blog';

const posts = getBlogPosts();

describe('getBlogPosts', () => {
  it('returns the catalog synchronously, not a Promise', () => {
    expect(posts).not.toBeInstanceOf(Promise);
    expect(Array.isArray(posts)).toBe(true);
  });

  it('returns the whole catalog, not a feed-sized slice', () => {
    // Medium's RSS feed caps at 10 items; the catalog is the reason this page exists.
    expect(posts.length).toBeGreaterThan(80);
  });
});

describe('catalog integrity', () => {
  it('gives every post all six fields, non-empty', () => {
    for (const post of posts) {
      for (const field of ['id', 'title', 'subtitle', 'url', 'date', 'category'] as const) {
        expect(post[field], `${field} on ${post.id}`).toBeTruthy();
      }
    }
  });

  it('uses unique, well-formed hex ids', () => {
    const ids = posts.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(id).toMatch(/^[0-9a-f]{6,}$/);
    }
  });

  it('ends every url with its own id, so the two can never drift apart', () => {
    for (const post of posts) {
      expect(post.url, post.id).toMatch(new RegExp(`${post.id}$`));
    }
  });

  it('points every url at Medium over https', () => {
    for (const post of posts) {
      expect(post.url).toMatch(/^https:\/\/medium\.com\//);
    }
  });

  it('dates every post as an ISO calendar date', () => {
    for (const post of posts) {
      expect(post.date, post.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Number.isNaN(Date.parse(post.date)), post.id).toBe(false);
    }
  });

  it('assigns every post a non-empty category', () => {
    // Deliberately not checked against an enumerated list. Category is a Notion
    // select, so the source constrains the values; mirroring them here only
    // broke the build when a new one was legitimately added.
    for (const post of posts) {
      expect(post.category.trim(), post.id).toBeTruthy();
    }
  });

  it('orders posts newest-first, breaking ties by id so the file is deterministic', () => {
    // 25 posts share a date with another, so the tie-break is load-bearing:
    // without it the daily sync job would emit phantom diffs.
    const expected = [...posts].sort((a, b) => (a.date === b.date ? a.id.localeCompare(b.id) : b.date.localeCompare(a.date)));
    expect(posts.map((p) => p.id)).toEqual(expected.map((p) => p.id));
  });
});
