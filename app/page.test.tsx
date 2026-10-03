import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import HomePage from './page';
import type { GithubRepo } from '@/lib/github.types';

const pinned: GithubRepo[] = [
  {
    slug: 'nadeem4/nl2sql',
    name: 'nl2sql',
    description: 'Ask your database questions in English.',
    url: 'https://github.com/nadeem4/nl2sql',
    stars: 4,
    language: 'Python',
    updatedAt: '2026-08-01T00:00:00Z',
    license: null,
    homepage: 'https://nadeem4nk-nl2sql-demo.hf.space/',
  },
];

vi.mock('@/lib/projects', () => ({
  getProjects: vi.fn(async () => ({ pinned, others: [] })),
}));

function h2Texts() {
  return screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent ?? '');
}

describe('HomePage', () => {
  it('leads with the name and a working search over the writing', async () => {
    render(await HomePage());
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(screen.getByRole('searchbox', { name: /search my writing/i })).toBeInTheDocument();
  });

  it('runs experience, then projects, then writing, then tools, as separate sections', async () => {
    render(await HomePage());
    const headings = h2Texts();
    const order = ['Experience', 'Projects', 'Writing', 'Tools I use'].map((name) => headings.indexOf(name));
    expect(order.every((index) => index >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  it('features the pinned repos', async () => {
    render(await HomePage());
    expect(screen.getAllByText(/nl2sql/).length).toBeGreaterThan(0);
  });

  it('shows selected and latest writing side by side rather than behind tabs', async () => {
    render(await HomePage());
    expect(screen.getByRole('heading', { name: 'Selected' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Latest' })).toBeInTheDocument();
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
  });

  it('has no sales devices: no contact pitch section and no numbers strip', async () => {
    render(await HomePage());
    expect(h2Texts()).not.toContain('Contact');
    expect(screen.queryByText(/posts .* domains/i)).not.toBeInTheDocument();
  });

  it('uses the shared page width', async () => {
    const { container } = render(await HomePage());
    expect(container.querySelector('main > div')).toHaveClass('max-w-page');
  });
});
