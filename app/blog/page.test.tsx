import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import BlogPage from './page';
import { getBlogPosts } from '@/lib/blog';
import { catalogStats } from '@/lib/blog-stats';
import { SERIES } from '@/config/series';

const posts = getBlogPosts();
const stats = catalogStats(posts)!;

describe('BlogPage', () => {
  it('is headed Writing, with a one-sentence intro computed from the catalog', () => {
    render(<BlogPage />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Writing');
    expect(screen.getByText(new RegExp(`^${stats.total} posts since ${stats.firstYear},`))).toBeInTheDocument();
  });

  it('is a launchpad, not the archive: it does not render every post', () => {
    // Regression: the hub used to list all of them, duplicating the topic pages
    // and growing without bound.
    const { container } = render(<BlogPage />);
    const links = container.querySelectorAll('a[href^="https://medium.com"]');
    expect(links.length).toBeLessThan(posts.length);
  });

  it('offers a search field covering the whole catalog', () => {
    render(<BlogPage />);
    const field = screen.getByRole('searchbox');
    expect(field).toHaveAccessibleName('Search');
    expect(field).toHaveAccessibleDescription(new RegExp(`${posts.length} posts`));
  });

  it('links every topic, plus All posts', () => {
    render(<BlogPage />);
    const nav = within(screen.getByRole('navigation', { name: /topics/i }));
    const topics = new Set(posts.map((p) => p.category));
    expect(nav.getAllByRole('link')).toHaveLength(topics.size + 1);
  });

  it('features the series as tiles', () => {
    render(<BlogPage />);
    expect(screen.getByRole('heading', { name: 'Series' })).toBeInTheDocument();
    SERIES.forEach((series) =>
      expect(screen.getByRole('link', { name: new RegExp(series.description) })).toBeInTheDocument(),
    );
  });

  it('leaves the curated highlights to the homepage', () => {
    render(<BlogPage />);
    expect(screen.queryByRole('heading', { name: /selected writing/i })).toBeNull();
  });

  it('lists the ten newest posts under Latest, grouped by year', () => {
    render(<BlogPage />);
    const latest = screen.getByRole('heading', { name: /^latest$/i, level: 2 }).closest('section') as HTMLElement;
    const titles = within(latest)
      .getAllByRole('link')
      .filter((a) => a.getAttribute('href')?.startsWith('https://medium.com'));
    expect(titles).toHaveLength(10);
    posts.slice(0, 10).forEach((post, i) => expect(titles[i]).toHaveTextContent(post.title));
    expect(within(latest).getByRole('heading', { level: 3, name: posts[0].date.slice(0, 4) })).toBeInTheDocument();
  });

  it('hands off to the archive for the full run', () => {
    render(<BlogPage />);
    expect(screen.getByRole('link', { name: /full archive/i })).toHaveAttribute('href', '/blog/archive');
  });
});
