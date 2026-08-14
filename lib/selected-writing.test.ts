import { describe, it, expect } from 'vitest';
import { getSelectedPosts, selectPosts } from './selected-writing';
import { getBlogPosts } from './blog';
import { selectedWriting } from '@/config/selected-writing';
import type { BlogPost } from './blog.types';

function post(id: string): BlogPost {
  return {
    id,
    title: id,
    subtitle: `${id} subtitle`,
    url: `https://medium.com/@you/p-${id}`,
    date: '2026-01-01',
    category: 'Backend & Infra',
  };
}

describe('selectPosts', () => {
  it('returns posts in the order given, not catalog order', () => {
    const catalog = [post('aaaaaa'), post('bbbbbb'), post('cccccc')];
    expect(selectPosts(catalog, ['cccccc', 'aaaaaa']).map((p) => p.id)).toEqual(['cccccc', 'aaaaaa']);
  });

  it('skips ids that match no post rather than returning holes', () => {
    const catalog = [post('aaaaaa')];
    expect(selectPosts(catalog, ['aaaaaa', 'missing']).map((p) => p.id)).toEqual(['aaaaaa']);
  });

  it('returns an empty array when nothing is selected', () => {
    expect(selectPosts([post('aaaaaa')], [])).toEqual([]);
  });
});

describe('the configured selection', () => {
  const catalog = getBlogPosts();

  it('resolves every configured id against the catalog', () => {
    // Guards typos: a bad id would otherwise drop a post from the homepage silently.
    const resolved = getSelectedPosts();
    expect(resolved).toHaveLength(selectedWriting.length);
    for (const id of selectedWriting) {
      expect(catalog.some((p) => p.id === id), `unresolved id: ${id}`).toBe(true);
    }
  });

  it('lists no id twice', () => {
    expect(new Set(selectedWriting).size).toBe(selectedWriting.length);
  });

  it('stays small enough to read as a selection rather than an archive', () => {
    expect(selectedWriting.length).toBeGreaterThanOrEqual(3);
    expect(selectedWriting.length).toBeLessThanOrEqual(6);
  });

  it('gives every selected post a subtitle to use as its context line', () => {
    for (const selected of getSelectedPosts()) {
      expect(selected.subtitle.trim().length, selected.title).toBeGreaterThan(20);
    }
  });
});
