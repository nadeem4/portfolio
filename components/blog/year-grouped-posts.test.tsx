import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { YearGroupedPosts } from './year-grouped-posts';
import type { BlogPost } from '@/lib/blog.types';

function post(id: string, title: string, date: string, category = 'Vector Databases'): BlogPost {
  return { id, title, subtitle: '', url: `https://medium.com/@you/p-${id}`, date, category };
}

const posts: BlogPost[] = [
  post('aaaaaaaaaaaa', 'HNSW under the hood', '2026-08-27'),
  post('bbbbbbbbbbbb', 'Kafka at 60M events', '2026-02-06', 'Backend & Infra'),
  post('cccccccccccc', 'LoRA intuition', '2025-11-25', 'LLM Architectures'),
];

describe('YearGroupedPosts', () => {
  it('heads each year once, in the order given', () => {
    render(<YearGroupedPosts posts={posts} />);
    expect(screen.getAllByRole('heading').map((h) => h.textContent)).toEqual(['2026', '2025']);
  });

  it('uses h2 by default and the heading level it is given otherwise', () => {
    const { unmount } = render(<YearGroupedPosts posts={posts} />);
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(2);
    unmount();
    render(<YearGroupedPosts posts={posts} headingLevel={3} />);
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(2);
  });

  it('dates each row as month and day, in a time element', () => {
    const { container } = render(<YearGroupedPosts posts={posts} />);
    const times = [...container.querySelectorAll('ul li time')];
    expect(times.map((t) => t.textContent)).toEqual(['Aug 27', 'Feb 6', 'Nov 25']);
    expect(times[0]).toHaveAttribute('dateTime', '2026-08-27');
  });

  it('links each title to Medium, saying so to a screen reader', () => {
    render(<YearGroupedPosts posts={posts} />);
    const link = screen.getByRole('link', { name: /HNSW under the hood/ });
    expect(link).toHaveAttribute('href', 'https://medium.com/@you/p-aaaaaaaaaaaa');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAccessibleName(/opens on Medium/i);
  });

  it('labels each row with its category by default', () => {
    render(<YearGroupedPosts posts={posts} />);
    expect(screen.getByText('Backend & Infra')).toBeInTheDocument();
  });

  it('can omit the category where every row shares one', () => {
    render(<YearGroupedPosts posts={posts} showCategory={false} />);
    expect(screen.queryByText('Backend & Infra')).toBeNull();
  });

  it('renders nothing for no posts', () => {
    const { container } = render(<YearGroupedPosts posts={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
