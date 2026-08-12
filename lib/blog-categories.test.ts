import { describe, it, expect, vi, beforeEach } from 'vitest';
import { applyCategoryOverrides, getCategoryOverrides } from './blog-categories';
import type { MediumPost } from './medium.types';

vi.mock('@vercel/edge-config', () => ({ get: vi.fn() }));

import { get } from '@vercel/edge-config';

const posts: MediumPost[] = [
  { title: 'Post One', link: 'https://medium.com/@you/post-one', pubDate: '', categories: ['Tag From Medium'], contentSnippet: '' },
  { title: 'Post Two', link: 'https://medium.com/@you/post-two', pubDate: '', categories: ['Another Tag'], contentSnippet: '' },
];

describe('applyCategoryOverrides', () => {
  it("replaces a post's categories with the override when one exists", () => {
    const result = applyCategoryOverrides(posts, { 'https://medium.com/@you/post-one': 'Data Engineering' });
    expect(result[0].categories).toEqual(['Data Engineering']);
  });

  it("leaves a post's Medium tags untouched when no override exists for it", () => {
    const result = applyCategoryOverrides(posts, { 'https://medium.com/@you/post-one': 'Data Engineering' });
    expect(result[1].categories).toEqual(['Another Tag']);
  });

  it('returns posts unchanged when there are no overrides at all', () => {
    expect(applyCategoryOverrides(posts, {})).toEqual(posts);
  });
});

describe('getCategoryOverrides', () => {
  beforeEach(() => {
    vi.mocked(get).mockReset();
  });

  it('returns the override map stored in Edge Config', async () => {
    vi.mocked(get).mockResolvedValue({ 'https://medium.com/@you/post-one': 'Data Engineering' });
    expect(await getCategoryOverrides()).toEqual({ 'https://medium.com/@you/post-one': 'Data Engineering' });
  });

  it('returns an empty object when no override map is configured yet', async () => {
    vi.mocked(get).mockResolvedValue(undefined);
    expect(await getCategoryOverrides()).toEqual({});
  });

  it('returns an empty object when the Edge Config read fails', async () => {
    vi.mocked(get).mockRejectedValue(new Error('edge config unavailable'));
    expect(await getCategoryOverrides()).toEqual({});
  });
});
