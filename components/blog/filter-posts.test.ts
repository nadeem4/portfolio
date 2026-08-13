import { describe, it, expect } from 'vitest';
import { filterPostsByCategory, getCategories } from './filter-posts';
import type { BlogPost } from '@/lib/blog.types';

function post(id: string, category: string): BlogPost {
  return { id, title: id, subtitle: '', url: `https://medium.com/@you/p-${id}`, date: '2026-01-01', category };
}

const posts: BlogPost[] = [post('aaaaaaaaaaaa', 'Data'), post('bbbbbbbbbbbb', 'ML')];

describe('filterPostsByCategory', () => {
  it('returns all posts when no category is selected', () => {
    expect(filterPostsByCategory(posts, null)).toEqual(posts);
  });

  it('returns only posts in the selected category', () => {
    expect(filterPostsByCategory(posts, 'ML')).toEqual([posts[1]]);
  });

  it('returns nothing for a category no post carries', () => {
    expect(filterPostsByCategory(posts, 'Nonexistent')).toEqual([]);
  });
});

describe('getCategories', () => {
  it('returns the unique, sorted set of categories across all posts', () => {
    expect(getCategories(posts)).toEqual(['Data', 'ML']);
  });

  it('collapses duplicates, so a category appears once however many posts use it', () => {
    expect(getCategories([...posts, post('cccccccccccc', 'ML')])).toEqual(['Data', 'ML']);
  });
});
