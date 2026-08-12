import { describe, it, expect } from 'vitest';
import { applyBlogCategories, getBlogCategories } from './blog-categories';
import type { MediumPost } from './medium.types';

const posts: MediumPost[] = [
  { title: 'Post One', link: 'https://medium.com/@you/post-one', pubDate: '', categories: ['Some Medium Tag'], contentSnippet: '', imageUrl: null },
  { title: 'Post Two', link: 'https://medium.com/@you/post-two', pubDate: '', categories: ['Another Tag'], contentSnippet: '', imageUrl: null },
];

describe('getBlogCategories', () => {
  it('returns the parsed JSON category map synchronously, not a Promise', () => {
    const categories = getBlogCategories();
    expect(categories).not.toBeInstanceOf(Promise);
    expect(typeof categories).toBe('object');
    expect(categories).not.toBeNull();
  });
});

describe('applyBlogCategories', () => {
  it("assigns a post's category from the map when a matching entry exists", () => {
    const result = applyBlogCategories(posts, { 'https://medium.com/@you/post-one': 'Data Engineering' });
    expect(result[0].categories).toEqual(['Data Engineering']);
  });

  it('assigns "Uncategorized" when no matching entry exists for that post', () => {
    const result = applyBlogCategories(posts, { 'https://medium.com/@you/post-one': 'Data Engineering' });
    expect(result[1].categories).toEqual(['Uncategorized']);
  });

  it("discards the post's original Medium tags entirely, even when there is no map match", () => {
    const result = applyBlogCategories(posts, {});
    expect(result[0].categories).toEqual(['Uncategorized']);
    expect(result[0].categories).not.toContain('Some Medium Tag');
    expect(result[1].categories).toEqual(['Uncategorized']);
    expect(result[1].categories).not.toContain('Another Tag');
  });
});
