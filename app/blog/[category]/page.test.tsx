import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import CategoryPage, { generateStaticParams, generateMetadata } from './page';
import { getBlogPosts } from '@/lib/blog';
import { categorySlug } from '@/lib/categories';

const posts = getBlogPosts();
const categories = [...new Set(posts.map((p) => p.category))];
const params = (category: string) => ({ params: Promise.resolve({ category }) });

describe('generateStaticParams', () => {
  it('prerenders one page per category, including single-post ones', () => {
    const generated = generateStaticParams();
    expect(generated).toHaveLength(categories.length);
    categories.forEach((category) => {
      expect(generated).toContainEqual({ category: categorySlug(category) });
    });
  });
});

describe('CategoryPage', () => {
  it('lists every post in the category and nothing else', async () => {
    const category = 'Vector Databases';
    render(await CategoryPage(params(categorySlug(category))));

    const mine = posts.filter((p) => p.category === category);
    const others = posts.filter((p) => p.category !== category);

    mine.forEach((post) => expect(screen.getByText(post.title)).toBeInTheDocument());
    others.forEach((post) => expect(screen.queryByText(post.title)).toBeNull());
  });

  it('renders a header image for the category', async () => {
    const slug = categorySlug('Postgres Series');
    render(await CategoryPage(params(slug)));
    const banner = document.querySelector('img');
    // next/image rewrites src through the optimizer, so the original path
    // arrives url-encoded inside the query string.
    expect(decodeURIComponent(banner?.getAttribute('src') ?? '')).toContain(
      `/blog/${slug}/opengraph-image`,
    );
  });

  it('renders every category without throwing', async () => {
    for (const category of categories) {
      const ui = await CategoryPage(params(categorySlug(category)));
      expect(ui, category).toBeTruthy();
    }
  });

  it('404s on a slug no category maps to', async () => {
    await expect(CategoryPage(params('not-a-real-category'))).rejects.toThrow();
  });
});

describe('generateMetadata', () => {
  it('titles the page with the category', async () => {
    const meta = await generateMetadata(params(categorySlug('LLM Architectures')));
    expect(meta.title).toContain('LLM Architectures');
    expect(meta.description).toBeTruthy();
  });
});
