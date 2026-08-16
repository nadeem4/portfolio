import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PostList } from './post-list';
import { ArchiveLink } from './archive-link';
import type { BlogPost } from '@/lib/blog.types';

function post(id: string, title: string, subtitle: string): BlogPost {
  return { id, title, subtitle, url: `https://medium.com/@you/p-${id}`, date: '2026-02-06', category: 'Backend & Infra' };
}

const posts: BlogPost[] = [
  post('aaaaaaaaaaaa', 'Kafka at 60M events a day', 'Understanding Kafka through real production experience'),
  post('bbbbbbbbbbbb', 'Protecting Postgres primaries', 'An automated WAL protection control loop'),
];

describe('PostList', () => {
  it('renders the heading it is given', () => {
    render(<PostList heading="Latest" posts={posts} />);
    expect(screen.getByRole('heading', { name: 'Latest' })).toBeInTheDocument();
  });

  it('renders every post', () => {
    render(<PostList heading="Selected writing" posts={posts} />);
    expect(screen.getByText('Kafka at 60M events a day')).toBeInTheDocument();
    expect(screen.getByText('Protecting Postgres primaries')).toBeInTheDocument();
  });

  it("uses each post's own subtitle as its context line", () => {
    // Sourced from the catalog rather than a parallel list of blurbs, so the
    // two cannot drift apart.
    render(<PostList heading="Latest" posts={posts} />);
    expect(screen.getByText('Understanding Kafka through real production experience')).toBeInTheDocument();
  });

  it('preserves the order given rather than re-sorting', () => {
    const { container } = render(<PostList heading="Latest" posts={posts} />);
    const titles = [...container.querySelectorAll('ul a')].map((a) => a.textContent);
    expect(titles).toEqual(['Kafka at 60M events a day', 'Protecting Postgres primaries']);
  });

  it('links each post to its Medium url', () => {
    render(<PostList heading="Latest" posts={posts} />);
    expect(screen.getByRole('link', { name: 'Kafka at 60M events a day' })).toHaveAttribute(
      'href',
      'https://medium.com/@you/p-aaaaaaaaaaaa',
    );
  });

  it('renders an identicon per post', () => {
    const { container } = render(<PostList heading="Latest" posts={posts} />);
    expect(container.querySelectorAll('svg')).toHaveLength(posts.length);
  });

  it('renders the action opposite the heading when given', () => {
    render(<PostList heading="Selected writing" posts={posts} action={<ArchiveLink total={94} />} />);
    expect(screen.getByRole('link', { name: /All 94 posts/ })).toHaveAttribute('href', '/blog');
  });

  it('renders no action when none is given', () => {
    render(<PostList heading="Latest" posts={posts} />);
    expect(screen.queryByRole('link', { name: /All \d+ posts/ })).not.toBeInTheDocument();
  });

  it('renders nothing when there are no posts', () => {
    const { container } = render(<PostList heading="Latest" posts={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('ArchiveLink', () => {
  it('carries only the total, not a date', () => {
    // It previously also carried the newest post's date, which made the whole
    // element one link to /blog — clicking a date that named a specific post
    // landed you on a list instead.
    render(<ArchiveLink total={94} />);
    const link = screen.getByRole('link', { name: /All 94 posts/ });
    expect(link).toHaveAttribute('href', '/blog');
    expect(link.textContent).not.toMatch(/latest/i);
  });
});
