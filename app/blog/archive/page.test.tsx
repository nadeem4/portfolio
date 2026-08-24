import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ArchivePage from './page';
import { getBlogPosts } from '@/lib/blog';

const posts = getBlogPosts();

describe('ArchivePage', () => {
  it('lists every post in the catalog', () => {
    const { container } = render(<ArchivePage />);
    expect(container.querySelectorAll('a[href^="https://medium.com"]')).toHaveLength(posts.length);
  });

  it('states the total', () => {
    render(<ArchivePage />);
    expect(screen.getByText(new RegExp(`${posts.length} posts`))).toBeInTheDocument();
  });

  it('keeps catalog order, newest first', () => {
    const { container } = render(<ArchivePage />);
    const first = container.querySelector('a[href^="https://medium.com"]');
    expect(first).toHaveTextContent(posts[0].title);
  });

  it('offers a way back to the hub', () => {
    render(<ArchivePage />);
    expect(screen.getByRole('link', { name: /blog/i })).toHaveAttribute('href', '/blog');
  });
});
