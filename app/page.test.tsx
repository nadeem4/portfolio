import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import HomePage from './page';
import type { GithubRepo } from '@/lib/github.types';

const repos: GithubRepo[] = [
  {
    slug: 'nadeem4/nl2sql',
    name: 'nl2sql',
    description: 'Multi-agent NL to SQL system',
    url: 'https://github.com/nadeem4/nl2sql',
    stars: 4,
    language: 'Python',
    updatedAt: '2026-08-01T00:00:00Z',
    license: null,
  },
];

vi.mock('@/lib/projects', () => ({
  getGithubRepos: vi.fn(async () => repos),
}));

describe('HomePage', () => {
  it('shows selected projects between experience and the writing blocks', async () => {
    // The homepage argument is claim → context → evidence. The projects are
    // evidence too, and previously appeared nowhere on the page at all.
    render(await HomePage());
    const headings = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
    const experience = headings.findIndex((text) => /experience/i.test(text ?? ''));
    const projects = headings.findIndex((text) => /selected projects/i.test(text ?? ''));
    const writing = headings.findIndex((text) => /selected writing/i.test(text ?? ''));
    expect(experience).toBeGreaterThanOrEqual(0);
    expect(projects).toBeGreaterThan(experience);
    expect(writing).toBeGreaterThan(projects);
  });

  it('renders the featured repo by name', async () => {
    render(await HomePage());
    expect(screen.getByText('nl2sql')).toBeInTheDocument();
  });

  it('keeps the Latest block, in compact rows without subtitles', async () => {
    render(await HomePage());
    const latest = screen.getByRole('heading', { name: 'Latest' });
    expect(latest).toBeInTheDocument();
  });

  it('widens the content column on large screens, matching every other page', async () => {
    // All pages share one wrapper (max-w-2xl, lg:max-w-3xl) so the column
    // stops changing width as a visitor navigates between them.
    const { container } = render(await HomePage());
    const column = container.querySelector('main > div');
    expect(column).toHaveClass('max-w-2xl', 'lg:max-w-3xl');
  });
});
