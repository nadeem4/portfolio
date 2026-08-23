import { describe, it, expect } from 'vitest';
import { size, contentType, generateStaticParams } from './opengraph-image';
import { getBlogPosts } from '@/lib/blog';

describe('category opengraph image', () => {
  it('is a 1200x630 png, the size social cards expect', () => {
    expect(size).toEqual({ width: 1200, height: 630 });
    expect(contentType).toBe('image/png');
  });

  it('prerenders a banner for every category the pages generate', () => {
    const categories = new Set(getBlogPosts().map((p) => p.category));
    expect(generateStaticParams()).toHaveLength(categories.size);
  });
});
