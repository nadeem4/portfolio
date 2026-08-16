import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WritingActivity } from './writing-activity';
import type { BlogPost } from '@/lib/blog.types';

function post(id: string, date: string, category: string): BlogPost {
  return { id, title: id, subtitle: `${id} subtitle`, url: `https://medium.com/@you/p-${id}`, date, category };
}

// Newest first, as the catalog is.
const posts: BlogPost[] = [
  post('aaaaaa', '2026-08-15', 'Backend & Infra'),
  post('bbbbbb', '2026-02-06', 'Postgres Series'),
  post('cccccc', '2020-02-08', 'Backend & Infra'),
];

describe('WritingActivity', () => {
  it('states the catalog total', () => {
    render(<WritingActivity posts={posts} />);
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('states how many domains the writing spans', () => {
    render(<WritingActivity posts={posts} />);
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('states when the most recent post was published', () => {
    // The reason this component exists: a visitor skimming the first screen
    // cannot otherwise tell whether the last post was yesterday or years ago.
    render(<WritingActivity posts={posts} />);
    expect(screen.getByText('15 Aug 2026')).toBeInTheDocument();
  });

  it('always includes the year, so a stale date cannot read as recent', () => {
    render(<WritingActivity posts={[post('dddddd', '2023-03-02', 'Backend & Infra')]} />);
    expect(screen.getByText('2 Mar 2023')).toBeInTheDocument();
  });

  it('builds the date from the string, not a Date, to avoid a timezone shift', () => {
    render(<WritingActivity posts={[post('eeeeee', '2026-08-01', 'Backend & Infra')]} />);
    expect(screen.getByText('1 Aug 2026')).toBeInTheDocument();
  });

  it('renders nothing for an empty catalog rather than claiming zero posts', () => {
    const { container } = render(<WritingActivity posts={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
