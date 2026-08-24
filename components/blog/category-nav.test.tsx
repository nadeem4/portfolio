import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CategoryNav } from './category-nav';
import type { BlogPost } from '@/lib/blog.types';

function post(id: string, category: string, date: string): BlogPost {
  return { id, title: id, subtitle: '', url: `https://medium.com/learnwithnk/p-${id}`, date, category };
}

const posts: BlogPost[] = [
  post('aaaaaa', 'Zebra Topic', '2026-08-01'),
  post('bbbbbb', 'Zebra Topic', '2026-07-01'),
  post('cccccc', 'Zebra Topic', '2026-06-01'),
  post('dddddd', 'Alpha & Beta', '2020-01-01'),
];

describe('CategoryNav', () => {
  it('renders one chip per topic', () => {
    render(<CategoryNav posts={posts} />);
    expect(screen.getByRole('link', { name: /Zebra Topic/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Alpha & Beta/ })).toBeInTheDocument();
  });

  it('shows each topic post count', () => {
    render(<CategoryNav posts={posts} />);
    expect(screen.getByRole('link', { name: /Zebra Topic/ })).toHaveTextContent('3');
    expect(screen.getByRole('link', { name: /Alpha & Beta/ })).toHaveTextContent('1');
  });

  it('links each chip to its topic page, slugified', () => {
    render(<CategoryNav posts={posts} />);
    expect(screen.getByRole('link', { name: /Zebra Topic/ })).toHaveAttribute('href', '/blog/zebra-topic');
    expect(screen.getByRole('link', { name: /Alpha & Beta/ })).toHaveAttribute('href', '/blog/alpha-beta');
  });

  it('orders topics alphabetically, so publishing never moves them', () => {
    // Regression: ordering by recency reshuffled the whole row on every post,
    // which makes the nav unlearnable. Zebra is the most recent here and must
    // still come last.
    render(<CategoryNav posts={posts} />);
    const names = screen.getAllByRole('link').map((a) => a.textContent);
    expect(names[0]).toContain('Alpha & Beta');
    expect(names[1]).toContain('Zebra Topic');
  });

  it('marks the active topic as the current page', () => {
    render(<CategoryNav posts={posts} active="Zebra Topic" />);
    expect(screen.getByRole('link', { name: /Zebra Topic/ })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: /Alpha & Beta/ })).not.toHaveAttribute('aria-current');
  });

  it('renders nothing for an empty catalog', () => {
    const { container } = render(<CategoryNav posts={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
