import { describe, it, expect } from 'vitest';
import sitemap from './sitemap';
import { getBlogPosts } from '@/lib/blog';
import { categorySlug } from '@/lib/categories';

describe('sitemap', () => {
  const urls = sitemap().map((entry) => entry.url);

  it('lists the hub pages', () => {
    expect(urls.some((u) => u.endsWith('/'))).toBe(true);
    expect(urls.some((u) => u.endsWith('/blog'))).toBe(true);
  });

  it('lists every category page, so the topic hubs are crawlable', () => {
    const categories = [...new Set(getBlogPosts().map((p) => p.category))];
    categories.forEach((category) => {
      expect(urls.some((u) => u.endsWith(`/blog/${categorySlug(category)}`)), category).toBe(true);
    });
  });

  it('ranks category pages below the blog hub', () => {
    const entries = sitemap();
    const hub = entries.find((e) => e.url.endsWith('/blog'));
    const category = entries.find((e) => e.url.includes('/blog/'));
    expect(category!.priority!).toBeLessThan(hub!.priority!);
  });

  it('emits no duplicate urls', () => {
    expect(new Set(urls).size).toBe(urls.length);
  });
});
