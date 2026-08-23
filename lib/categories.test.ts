import { describe, it, expect } from 'vitest';
import { categorySlug, categoryFromSlug, categorySlugs } from './categories';
import { getBlogPosts } from './blog';

const categories = [...new Set(getBlogPosts().map((p) => p.category))];

describe('categorySlug', () => {
  it('kebab-cases a plain name', () => {
    expect(categorySlug('Vector Databases')).toBe('vector-databases');
  });

  it('collapses an ampersand into a single separator', () => {
    expect(categorySlug('Azure & Cloud Fundamentals')).toBe('azure-cloud-fundamentals');
    expect(categorySlug('Java & Spring Boot')).toBe('java-spring-boot');
  });

  it('keeps an internal hyphen from doubling up', () => {
    expect(categorySlug('J-Space Primer')).toBe('j-space-primer');
  });

  it('produces a URL-safe, non-empty slug for every category in the catalog', () => {
    categories.forEach((category) => {
      const slug = categorySlug(category);
      expect(slug, category).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    });
  });

  it('never collides two categories onto one slug', () => {
    const slugs = categories.map(categorySlug);
    expect(new Set(slugs).size).toBe(categories.length);
  });
});

describe('categoryFromSlug', () => {
  it('round-trips every category in the catalog', () => {
    categories.forEach((category) => {
      expect(categoryFromSlug(categorySlug(category)), category).toBe(category);
    });
  });

  it('returns null for a slug no category maps to', () => {
    expect(categoryFromSlug('not-a-real-category')).toBeNull();
  });
});

describe('categorySlugs', () => {
  it('lists one slug per category in the catalog', () => {
    const slugs = categorySlugs();
    expect(slugs).toHaveLength(categories.length);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});
