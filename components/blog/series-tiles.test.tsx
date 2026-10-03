import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SeriesTiles } from './series-tiles';
import { SERIES } from '@/config/series';
import { getBlogPosts } from '@/lib/blog';
import { categorySlug } from '@/lib/categories';

const posts = getBlogPosts();
const tile = (category: string) => screen.getByRole('link', { name: new RegExp(category) });

describe('SeriesTiles', () => {
  it('renders a tile per series, linking to its category page', () => {
    render(<SeriesTiles posts={posts} />);
    SERIES.forEach((series) => {
      expect(tile(series.category)).toHaveAttribute('href', `/blog/${categorySlug(series.category)}`);
    });
  });

  it('shows the live post count from the catalog', () => {
    render(<SeriesTiles posts={posts} />);
    SERIES.forEach((series) => {
      const count = posts.filter((p) => p.category === series.category).length;
      expect(tile(series.category)).toHaveTextContent(`${count} posts`);
    });
  });

  it('shows each series description', () => {
    render(<SeriesTiles posts={posts} />);
    SERIES.forEach((series) => expect(screen.getByText(series.description)).toBeInTheDocument());
  });

  it('skips a series with no posts rather than linking to an empty page', () => {
    render(<SeriesTiles posts={posts.filter((p) => p.category !== 'Postgres Series')} />);
    expect(screen.queryByRole('link', { name: /Postgres Series/ })).toBeNull();
  });

  it('is headed Series', () => {
    render(<SeriesTiles posts={posts} />);
    expect(screen.getByRole('heading', { name: 'Series' })).toBeInTheDocument();
  });
});
