import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import BlogPage from './page';
import { getBlogPosts } from '@/lib/blog';
import { getSelectedPosts } from '@/lib/selected-writing';

const posts = getBlogPosts();
const selected = getSelectedPosts();

describe('BlogPage', () => {
  it('is a launchpad, not the archive — it does not render every post', () => {
    // Regression: the hub used to list all of them, duplicating the topic pages
    // and growing without bound.
    const { container } = render(<BlogPage />);
    const links = container.querySelectorAll('a[href^="https://medium.com"]');
    expect(links.length).toBeLessThan(posts.length);
  });

  it('offers a search field covering the whole catalog', () => {
    render(<BlogPage />);
    expect(screen.getByRole('searchbox')).toHaveAccessibleName(new RegExp(`${posts.length} posts`));
  });

  it('links every topic', () => {
    render(<BlogPage />);
    const nav = within(screen.getByRole('navigation', { name: /categories/i }));
    const topics = new Set(posts.map((p) => p.category));
    expect(nav.getAllByRole('link')).toHaveLength(topics.size);
  });

  it('leads with the curated highlights', () => {
    render(<BlogPage />);
    expect(screen.getByRole('heading', { name: /selected writing/i })).toBeInTheDocument();
  });

  it('never repeats a highlight in the Latest block', () => {
    render(<BlogPage />);
    const latest = screen.getByRole('heading', { name: /^latest$/i }).closest('section');
    selected.forEach((post) => {
      expect(within(latest as HTMLElement).queryByText(post.title), post.title).toBeNull();
    });
  });

  it('hands off to the archive for the full run', () => {
    render(<BlogPage />);
    expect(screen.getByRole('link', { name: /full archive/i })).toHaveAttribute('href', '/blog/archive');
  });
});
