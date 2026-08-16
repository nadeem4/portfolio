import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SelectedWriting } from './selected-writing';
import type { BlogPost } from '@/lib/blog.types';

function post(id: string, title: string, subtitle: string): BlogPost {
  return { id, title, subtitle, url: `https://medium.com/@you/p-${id}`, date: '2026-02-06', category: 'Backend & Infra' };
}

const posts: BlogPost[] = [
  post('aaaaaaaaaaaa', 'Kafka at 60M events a day', 'Understanding Kafka through real production experience'),
  post('bbbbbbbbbbbb', 'Protecting Postgres primaries', 'An automated WAL protection control loop'),
];

describe('SelectedWriting', () => {
  it('renders every selected post', () => {
    render(<SelectedWriting posts={posts} total={92} />);
    expect(screen.getByText('Kafka at 60M events a day')).toBeInTheDocument();
    expect(screen.getByText('Protecting Postgres primaries')).toBeInTheDocument();
  });

  it("uses each post's own subtitle as its context line", () => {
    // Sourced from the catalog rather than a parallel list of blurbs, so the
    // two cannot drift apart.
    render(<SelectedWriting posts={posts} total={92} />);
    expect(screen.getByText('Understanding Kafka through real production experience')).toBeInTheDocument();
  });

  it('preserves the curated order rather than re-sorting', () => {
    // Scoped to the list: the first link in the document is the archive link
    // in the section header, not a post.
    const { container } = render(<SelectedWriting posts={posts} total={92} />);
    const titles = [...container.querySelectorAll('ul a')].map((a) => a.textContent);
    expect(titles).toEqual(['Kafka at 60M events a day', 'Protecting Postgres primaries']);
  });

  it('links each post to its Medium url', () => {
    render(<SelectedWriting posts={posts} total={92} />);
    expect(screen.getByRole('link', { name: 'Kafka at 60M events a day' })).toHaveAttribute(
      'href',
      'https://medium.com/@you/p-aaaaaaaaaaaa',
    );
  });

  it('offers a way through to the full archive, with the real total', () => {
    render(<SelectedWriting posts={posts} total={92} />);
    const archive = screen.getByRole('link', { name: /All 92 posts/ });
    expect(archive).toHaveAttribute('href', '/blog');
  });

  it('renders an identicon per post, matching the blog listing', () => {
    const { container } = render(<SelectedWriting posts={posts} total={92} />);
    expect(container.querySelectorAll('svg')).toHaveLength(posts.length);
  });

  it('shows when the most recent post was published', () => {
    // The curated list is ordered for legibility, not recency, so without this
    // a visitor cannot tell whether the last post was yesterday or two years ago.
    render(<SelectedWriting posts={posts} total={94} latestDate="2026-08-15" />);
    expect(screen.getByRole('link', { name: /latest 15 Aug 2026/ })).toBeInTheDocument();
  });

  it('always shows the year, so an old date cannot read as recent', () => {
    render(<SelectedWriting posts={posts} total={94} latestDate="2024-03-02" />);
    expect(screen.getByRole('link', { name: /latest 2 Mar 2024/ })).toBeInTheDocument();
  });

  it('builds the date from the string, not a Date, to avoid a timezone shift', () => {
    // Parsing 2026-08-01 yields UTC midnight, which a negative-offset locale
    // renders as 31 July.
    render(<SelectedWriting posts={posts} total={94} latestDate="2026-08-01" />);
    expect(screen.getByRole('link', { name: /latest 1 Aug 2026/ })).toBeInTheDocument();
  });

  it('omits the recency signal when no date is given', () => {
    render(<SelectedWriting posts={posts} total={94} />);
    expect(screen.queryByText(/latest/i)).not.toBeInTheDocument();
  });

  it('omits the archive link when no total is given', () => {
    // On /blog the archive is already directly below, so the link is redundant.
    render(<SelectedWriting posts={posts} />);
    expect(screen.queryByRole('link', { name: /All \d+ posts/ })).not.toBeInTheDocument();
    expect(screen.getByText('Kafka at 60M events a day')).toBeInTheDocument();
  });

  it('renders nothing when nothing is selected', () => {
    const { container } = render(<SelectedWriting posts={[]} total={0} />);
    expect(container).toBeEmptyDOMElement();
  });
});
