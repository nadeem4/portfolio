import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BlogHub } from './blog-hub';
import type { BlogPost } from '@/lib/blog.types';

function post(id: string, title: string, category: string, subtitle = ''): BlogPost {
  return { id, title, subtitle, url: `https://medium.com/learnwithnk/p-${id}`, date: '2026-02-06', category };
}

const posts: BlogPost[] = [
  post('aaaaaaaaaaaa', 'How Kafka Really Works', 'Backend & Infra', 'sixty million events'),
  post('bbbbbbbbbbbb', 'Designing RAG Systems', 'AI System Design', 'retrieval and chunking'),
];

const browse = <p>browse view</p>;
const type = (value: string) => fireEvent.change(screen.getByRole('searchbox'), { target: { value } });

describe('BlogHub', () => {
  it('shows the browse view when nothing has been typed', () => {
    render(<BlogHub posts={posts}>{browse}</BlogHub>);
    expect(screen.getByText('browse view')).toBeInTheDocument();
  });

  it('replaces the browse view with matches once a query is typed', () => {
    render(<BlogHub posts={posts}>{browse}</BlogHub>);
    type('kafka');
    expect(screen.queryByText('browse view')).not.toBeInTheDocument();
    expect(screen.getByText('How Kafka Really Works')).toBeInTheDocument();
    expect(screen.queryByText('Designing RAG Systems')).not.toBeInTheDocument();
  });

  it('searches the subtitle as well as the title', () => {
    render(<BlogHub posts={posts}>{browse}</BlogHub>);
    type('chunking');
    expect(screen.getByText('Designing RAG Systems')).toBeInTheDocument();
  });

  it('counts the matches so the result set is never ambiguous', () => {
    render(<BlogHub posts={posts}>{browse}</BlogHub>);
    type('kafka');
    expect(screen.getByRole('heading', { name: /1 match/i })).toBeInTheDocument();
  });

  it('says so plainly when nothing matches, rather than showing an empty list', () => {
    render(<BlogHub posts={posts}>{browse}</BlogHub>);
    type('kubernetes');
    expect(screen.getByText(/no posts match/i)).toBeInTheDocument();
  });

  it('treats a whitespace-only query as empty', () => {
    render(<BlogHub posts={posts}>{browse}</BlogHub>);
    type('   ');
    expect(screen.getByText('browse view')).toBeInTheDocument();
  });

  it('clears back to the browse view on Escape', () => {
    render(<BlogHub posts={posts}>{browse}</BlogHub>);
    type('kafka');
    fireEvent.keyDown(screen.getByRole('searchbox'), { key: 'Escape' });
    expect(screen.getByText('browse view')).toBeInTheDocument();
  });

  it('labels the field for assistive technology', () => {
    render(<BlogHub posts={posts}>{browse}</BlogHub>);
    expect(screen.getByRole('searchbox')).toHaveAccessibleName(/search/i);
  });

  it('announces result counts politely as they change', () => {
    const { container } = render(<BlogHub posts={posts}>{browse}</BlogHub>);
    expect(container.querySelector('[aria-live="polite"]')).toBeTruthy();
  });
});
