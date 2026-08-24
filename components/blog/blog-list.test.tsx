import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { BlogList } from './blog-list';
import type { BlogPost } from '@/lib/blog.types';

function post(id: string, title: string, category: string, subtitle = ''): BlogPost {
  return { id, title, subtitle, url: `https://medium.com/@you/p-${id}`, date: '2026-02-06', category };
}

const posts: BlogPost[] = [
  post('aaaaaaaaaaaa', 'Data Post', 'Data', 'about data'),
  post('bbbbbbbbbbbb', 'ML Post', 'ML', 'about ml'),
];

describe('BlogList', () => {
  it('shows every post', () => {
    render(<BlogList posts={posts} />);
    expect(screen.getByText('Data Post')).toBeInTheDocument();
    expect(screen.getByText('ML Post')).toBeInTheDocument();
  });

  it('offers a card per category as the way into each topic', () => {
    render(<BlogList posts={posts} />);
    // Scoped to the nav: the post titles below also contain the category words.
    const nav = within(screen.getByRole('navigation', { name: /categories/i }));
    expect(nav.getByRole('link', { name: /Data/ })).toHaveAttribute('href', '/blog/data');
    expect(nav.getByRole('link', { name: /ML/ })).toHaveAttribute('href', '/blog/ml');
  });

  it('always offers a way back to the full list', () => {
    render(<BlogList posts={posts} />);
    expect(screen.getByRole('link', { name: /All/ })).toBeInTheDocument();
  });

  it('shows a fallback message when there are no posts', () => {
    render(<BlogList posts={[]} />);
    expect(screen.getByText(/posts temporarily unavailable/i)).toBeInTheDocument();
  });

  it('renders an identicon for every visible post', () => {
    const { container } = render(<BlogList posts={posts} />);
    expect(container.querySelectorAll('svg')).toHaveLength(posts.length);
  });

  it('no longer renders remote thumbnail images', () => {
    // Cover images came from the Medium RSS payload, which is no longer fetched.
    const { container } = render(<BlogList posts={posts} />);
    expect(container.querySelector('img')).not.toBeInTheDocument();
  });

  it('shows the hand-written subtitle', () => {
    render(<BlogList posts={posts} />);
    expect(screen.getByText('about data')).toBeInTheDocument();
  });

  it('shows the published date as a machine-readable time element', () => {
    const { container } = render(<BlogList posts={posts} />);
    const time = container.querySelector('time');
    expect(time).toHaveAttribute('dateTime', '2026-02-06');
    expect(time).toHaveTextContent('2026-02-06');
  });

  it('shows curated highlights above the archive', () => {
    render(<BlogList posts={posts} selected={[posts[1]]} />);
    expect(screen.getByRole('heading', { name: /selected writing/i })).toBeInTheDocument();
  });

  it('renders no highlights section when none are supplied', () => {
    render(<BlogList posts={posts} />);
    expect(screen.queryByRole('heading', { name: /selected writing/i })).not.toBeInTheDocument();
  });

  it('labels the list as the full archive, not "Latest"', () => {
    render(<BlogList posts={posts} selected={[posts[1]]} />);
    expect(screen.getByRole('heading', { name: /all posts/i })).toBeInTheDocument();
  });

  it('links each post to its Medium url', () => {
    render(<BlogList posts={posts} />);
    expect(screen.getByRole('link', { name: 'Data Post' })).toHaveAttribute(
      'href',
      'https://medium.com/@you/p-aaaaaaaaaaaa',
    );
  });
});
