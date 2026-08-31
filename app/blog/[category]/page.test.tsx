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

  it('heads the page typographically, with no banner image to fetch', async () => {
    // The header was a PNG pulled through the image optimizer. Rendering it as
    // type instead means there is no request that can fail, and it stays crisp
    // at any width.
    const { container } = render(await CategoryPage(params(categorySlug('Postgres Series'))));
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Postgres Series');
    expect(screen.getByText(/blog --category/)).toBeInTheDocument();
  });

  it('states the post count and year range under the title', async () => {
    render(await CategoryPage(params(categorySlug('Python Logging'))));
    const expected = posts.filter((p) => p.category === 'Python Logging').length;
    expect(screen.getByText(new RegExp(`${expected} posts`))).toBeInTheDocument();
  });

  it('renders every category without throwing', async () => {
    for (const category of categories) {
      const ui = await CategoryPage(params(categorySlug(category)));
      expect(ui, category).toBeTruthy();
    }
  });

  it('names the category exactly once on the page', async () => {
    // Regression: the h1 and the list heading both rendered the category name,
    // and every row repeated it again as metadata.
    const category = 'Vector Databases';
    render(await CategoryPage(params(categorySlug(category))));
    const visible = screen.getAllByText(category).filter((el) => !el.classList.contains('sr-only'));
    expect(visible).toHaveLength(1);
    expect(visible[0].tagName).toBe('H1');
  });

  it('drops the per-row topic label, keeping the date', async () => {
    const { container } = render(await CategoryPage(params(categorySlug('Postgres Series'))));
    const rows = container.querySelectorAll('ul li');
    expect(rows.length).toBeGreaterThan(1);
    expect(container.querySelectorAll('ul li time').length).toBe(rows.length);
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

describe('CategoryPage labs', () => {
  it('links the vector index playground from Vector Databases', async () => {
    render(await CategoryPage(params(categorySlug('Vector Databases'))));
    const link = screen.getByRole('link', { name: /vector index playground/i });
    expect(link).toHaveAttribute('href', '/lab/vector-index');
  });

  it('says what the lab is for, not just that it exists', async () => {
    render(await CategoryPage(params(categorySlug('Vector Databases'))));
    expect(screen.getByRole('heading', { name: 'Lab' })).toBeInTheDocument();
    expect(screen.getByText(/distance computation/i)).toBeInTheDocument();
  });

  it('shows no lab block on a category that has none', async () => {
    // Nothing is linked until it is actually deployed behind the link — the
    // same rule the header applies to /live-projects.
    render(await CategoryPage(params(categorySlug('Postgres Series'))));
    expect(screen.queryByRole('heading', { name: 'Lab' })).toBeNull();
    expect(screen.queryByRole('link', { name: /playground/i })).toBeNull();
  });
});
