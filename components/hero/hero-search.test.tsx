import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HeroSearch } from './hero-search';
import type { BlogPost } from '@/lib/blog.types';

function post(id: string, title: string, category = 'Postgres Series', date = '2026-03-19'): BlogPost {
  return { id, title, subtitle: '', category, date, url: `https://medium.com/p/${id}` } as BlogPost;
}

const posts = [
  post('a', 'Protecting PostgreSQL primaries from replication slot failures'),
  post('b', 'How Kafka really works', 'Backend & Infra', '2026-02-06'),
  post('c', 'Indexing deep dive: HNSW', 'Vector Databases', '2026-08-20'),
];

describe('HeroSearch', () => {
  it('labels the field and states the catalogue size', () => {
    render(<HeroSearch posts={posts} />);
    expect(screen.getByRole('searchbox', { name: /search my writing/i })).toBeInTheDocument();
    expect(screen.getByText(/3 posts/)).toBeInTheDocument();
  });

  it('shows matching posts with a count as the visitor types', async () => {
    render(<HeroSearch posts={posts} />);
    await userEvent.type(screen.getByRole('searchbox'), 'kafka');
    expect(screen.getByText('1 match')).toBeInTheDocument();
    const link = screen.getByRole('link', { name: /how kafka really works/i });
    expect(link).toHaveAttribute('href', 'https://medium.com/p/b');
    expect(link).toHaveAttribute('target', '_blank');
    expect(screen.queryByRole('link', { name: /hnsw/i })).not.toBeInTheDocument();
  });

  it('says plainly when nothing matches', async () => {
    render(<HeroSearch posts={posts} />);
    await userEvent.type(screen.getByRole('searchbox'), 'cobol');
    expect(screen.getByText(/no post matches/i)).toBeInTheDocument();
  });

  it('offers example queries that run a search when chosen', async () => {
    render(<HeroSearch posts={posts} />);
    await userEvent.click(screen.getByRole('button', { name: 'hnsw' }));
    expect(screen.getByRole('searchbox')).toHaveValue('hnsw');
    expect(screen.getByRole('link', { name: /indexing deep dive: hnsw/i })).toBeInTheDocument();
  });

  it('caps the list so the hero stays one screen tall', async () => {
    const many = Array.from({ length: 9 }, (_, i) => post(`p${i}`, `Postgres note ${i}`));
    render(<HeroSearch posts={many} />);
    await userEvent.type(screen.getByRole('searchbox'), 'postgres');
    expect(screen.getAllByRole('listitem')).toHaveLength(5);
    expect(screen.getByText('9 matches')).toBeInTheDocument();
  });
});
