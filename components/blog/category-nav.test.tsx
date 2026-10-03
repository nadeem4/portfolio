import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CategoryNav } from './category-nav';
import type { BlogPost } from '@/lib/blog.types';

function post(id: string, category: string, date: string): BlogPost {
  return { id, title: id, subtitle: '', url: `https://medium.com/learnwithnk/p-${id}`, date, category };
}

const posts: BlogPost[] = [
  post('aaaaaa', 'Zebra Topic', '2020-08-01'),
  post('bbbbbb', 'Zebra Topic', '2020-07-01'),
  post('cccccc', 'Zebra Topic', '2020-06-01'),
  post('dddddd', 'Mid Topic', '2026-01-01'),
  post('eeeeee', 'Alpha & Beta', '2024-01-01'),
];

describe('CategoryNav', () => {
  it('is a navigation landmark named by its visible Topics heading', () => {
    render(<CategoryNav posts={posts} />);
    expect(screen.getByRole('navigation', { name: 'Topics' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Topics' })).toBeInTheDocument();
  });

  it('leads with All posts, linking the archive with the total', () => {
    render(<CategoryNav posts={posts} />);
    const all = screen.getAllByRole('link')[0];
    expect(all).toHaveTextContent('All posts');
    expect(all).toHaveTextContent(String(posts.length));
    expect(all).toHaveAttribute('href', '/blog/archive');
  });

  it('shows each topic post count', () => {
    render(<CategoryNav posts={posts} />);
    expect(screen.getByRole('link', { name: /Zebra Topic/ })).toHaveTextContent('3');
    expect(screen.getByRole('link', { name: /Alpha & Beta/ })).toHaveTextContent('1');
  });

  it('links each topic to its page, slugified', () => {
    render(<CategoryNav posts={posts} />);
    expect(screen.getByRole('link', { name: /Zebra Topic/ })).toHaveAttribute('href', '/blog/zebra-topic');
    expect(screen.getByRole('link', { name: /Alpha & Beta/ })).toHaveAttribute('href', '/blog/alpha-beta');
  });

  it('orders topics by post count, breaking ties by name', () => {
    // Biggest topics first, since that is where most of the writing is. The
    // name tie-break keeps equal-sized topics from swapping between builds.
    render(<CategoryNav posts={posts} />);
    const names = screen.getAllByRole('link').map((a) => a.textContent);
    expect(names.slice(1)).toEqual(['Zebra Topic3', 'Alpha & Beta1', 'Mid Topic1']);
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
