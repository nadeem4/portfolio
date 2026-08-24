import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CategoryCards } from './category-cards';
import type { BlogPost } from '@/lib/blog.types';

function post(id: string, category: string, date: string): BlogPost {
  return { id, title: id, subtitle: '', url: `https://medium.com/@you/p-${id}`, date, category };
}

const posts: BlogPost[] = [
  post('aaaaaa', 'Current', '2026-08-01'),
  post('bbbbbb', 'Current', '2026-07-01'),
  post('cccccc', 'Current', '2026-06-01'),
  post('dddddd', 'Stale & Old', '2020-01-01'),
];

describe('the All card', () => {
  // Regression: the chip row had an "All" chip. Converting to cards dropped it,
  // leaving only a 10px dim text link as the way back to the full list, which
  // read as a label rather than a control.
  it('renders first, ahead of every category', () => {
    render(<CategoryCards posts={posts} />);
    expect(screen.getAllByRole('link')[0]).toHaveTextContent(/All/);
  });

  it('shows the total post count across the catalog', () => {
    render(<CategoryCards posts={posts} />);
    expect(screen.getByRole('link', { name: /All/ })).toHaveTextContent('4');
  });

  it('points back at the unfiltered archive', () => {
    render(<CategoryCards posts={posts} />);
    expect(screen.getByRole('link', { name: /All/ })).toHaveAttribute('href', '/blog');
  });

  it('sits outside the category grid, so the categories tile evenly', () => {
    // All is not a category, and adding it to the grid perturbs how the cards
    // tile at every breakpoint.
    const { container } = render(<CategoryCards posts={posts} />);
    const grid = container.querySelector('.grid');
    expect(grid?.querySelectorAll('a')).toHaveLength(2); // the two categories, not All
  });

  it('marks itself as the current page when no category is active', () => {
    render(<CategoryCards posts={posts} />);
    expect(screen.getByRole('link', { name: /All/ })).toHaveAttribute('aria-current', 'page');
  });

  it('is not current once a category page is showing', () => {
    render(<CategoryCards posts={posts} active="Current" />);
    expect(screen.getByRole('link', { name: /All/ })).not.toHaveAttribute('aria-current');
  });
});

describe('CategoryCards', () => {
  it('renders one card per category', () => {
    render(<CategoryCards posts={posts} />);
    expect(screen.getByRole('link', { name: /Current/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Stale/ })).toBeInTheDocument();
  });

  it('shows each category post count', () => {
    render(<CategoryCards posts={posts} />);
    expect(screen.getByRole('link', { name: /Current/ })).toHaveTextContent('3');
    expect(screen.getByRole('link', { name: /Stale/ })).toHaveTextContent('1');
  });

  it('links each card to its own category page, slugified', () => {
    render(<CategoryCards posts={posts} />);
    expect(screen.getByRole('link', { name: /Current/ })).toHaveAttribute('href', '/blog/current');
    expect(screen.getByRole('link', { name: /Stale/ })).toHaveAttribute('href', '/blog/stale-old');
  });

  it('orders the most recently active category first, after the All card', () => {
    render(<CategoryCards posts={posts} />);
    const names = screen.getAllByRole('link').map((a) => a.textContent);
    expect(names[1]).toContain('Current');
  });

  it('marks the active category as the current page', () => {
    render(<CategoryCards posts={posts} active="Stale & Old" />);
    expect(screen.getByRole('link', { name: /Stale/ })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: /Current/ })).not.toHaveAttribute('aria-current');
  });

  it('renders nothing for an empty catalog', () => {
    const { container } = render(<CategoryCards posts={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
