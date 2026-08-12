import { describe, it, expect } from 'vitest';
import { filterPostsByCategory, getCategories } from './filter-posts';
import type { MediumPost } from '@/lib/medium.types';

const posts: MediumPost[] = [
  { title: 'A', link: 'https://a', pubDate: '', categories: ['Data'], contentSnippet: '' },
  { title: 'B', link: 'https://b', pubDate: '', categories: ['ML'], contentSnippet: '' },
];

describe('filterPostsByCategory', () => {
  it('returns all posts when no category is selected', () => {
    expect(filterPostsByCategory(posts, null)).toEqual(posts);
  });

  it('returns only posts that include the selected category', () => {
    expect(filterPostsByCategory(posts, 'ML')).toEqual([posts[1]]);
  });
});

describe('getCategories', () => {
  it('returns the unique, sorted set of categories across all posts', () => {
    expect(getCategories(posts)).toEqual(['Data', 'ML']);
  });
});
