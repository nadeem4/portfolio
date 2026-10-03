import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import type { GithubRepo } from '@/lib/github.types';
import type { Projects } from '@/lib/projects';

const getProjects = vi.fn<() => Promise<Projects>>();
vi.mock('@/lib/projects', () => ({ getProjects: () => getProjects() }));

import ProjectsPage, { metadata, revalidate } from './page';

function makeRepo(name: string, updatedAt: string, homepage: string | null = null): GithubRepo {
  return {
    slug: `nadeem4/${name}`,
    name,
    description: `${name} description`,
    url: `https://github.com/nadeem4/${name}`,
    stars: 3,
    language: 'Python',
    updatedAt,
    license: null,
    homepage,
  };
}

async function renderPage() {
  render(await ProjectsPage());
}

beforeEach(() => getProjects.mockReset());

describe('ProjectsPage', () => {
  it('keeps the six-hour revalidation and mentions live demos in the description', () => {
    expect(revalidate).toBe(21600);
    expect(String(metadata.description)).toMatch(/live demos/i);
  });

  it('shows the pinned repos, then recent others, then earlier work in a details element', async () => {
    getProjects.mockResolvedValue({
      pinned: [makeRepo('nl2sql', '2026-09-01T00:00:00Z', 'https://nadeem4nk-nl2sql-demo.hf.space/')],
      others: [makeRepo('medalflow', '2026-08-01T00:00:00Z'), makeRepo('chess_engine', '2021-03-01T00:00:00Z')],
    });
    await renderPage();

    expect(screen.getByRole('heading', { level: 1, name: 'Projects' })).toBeInTheDocument();
    expect(screen.getByText('Things you can run in a browser first, then the code behind them.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Pinned' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'nl2sql playground' })).toBeInTheDocument();

    const others = screen.getByRole('region', { name: 'Other repositories' });
    expect(within(others).getByRole('link', { name: /medalflow/ })).toBeInTheDocument();
    expect(within(others).queryByRole('link', { name: /chess_engine/ })).not.toBeInTheDocument();

    const earlier = screen.getByText('Earlier work, before 2024').closest('details')!;
    expect(earlier).not.toBeNull();
    expect(within(earlier).getByRole('link', { name: /chess_engine/ })).toBeInTheDocument();
  });

  it('leaves out the earlier-work disclosure when there is no older repo', async () => {
    getProjects.mockResolvedValue({ pinned: [], others: [makeRepo('medalflow', '2026-08-01T00:00:00Z')] });
    await renderPage();

    expect(screen.queryByText(/earlier work/i)).not.toBeInTheDocument();
  });

  it('falls back to a sentence linking to GitHub when nothing loads', async () => {
    getProjects.mockResolvedValue({ pinned: [], others: [] });
    await renderPage();

    expect(screen.queryByRole('heading', { name: 'Pinned' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /github/i })).toHaveAttribute('href', expect.stringContaining('github.com'));
    expect(document.body.textContent).not.toMatch(/[–—]/);
  });
});
