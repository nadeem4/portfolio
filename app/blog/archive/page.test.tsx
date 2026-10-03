import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ArchivePage from './page';
import { getBlogPosts } from '@/lib/blog';

const posts = getBlogPosts();
const years = [...new Set(posts.map((p) => p.date.slice(0, 4)))];

describe('ArchivePage', () => {
  it('lists every post in the catalog', () => {
    const { container } = render(<ArchivePage />);
    expect(container.querySelectorAll('a[href^="https://medium.com"]')).toHaveLength(posts.length);
  });

  it('states the total in a mono line under the title', () => {
    render(<ArchivePage />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Archive');
    expect(screen.getByText(new RegExp(`${posts.length} posts`))).toHaveClass('font-mono');
  });

  it('groups posts under one heading per year', () => {
    render(<ArchivePage />);
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual(years);
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
