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
