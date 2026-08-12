import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProjectList } from './project-list';
import type { GithubRepo } from '@/lib/github.types';

function makeRepo(overrides: Partial<GithubRepo> & { name: string }): GithubRepo {
  return {
    slug: `nadeem4/${overrides.name}`,
    description: '',
    url: `https://github.com/nadeem4/${overrides.name}`,
    stars: 0,
    language: 'TypeScript',
    updatedAt: '2026-01-01T00:00:00Z',
    license: null,
    ...overrides,
  };
}

// Given in recency order (index 0 = most recently pushed).
const repos: GithubRepo[] = [
  makeRepo({ name: 'repo-a', stars: 10, license: null }),
  makeRepo({ name: 'repo-b', stars: 50, license: 'MIT License' }),
  makeRepo({ name: 'repo-c', stars: 5, license: null }),
  makeRepo({ name: 'repo-d', stars: 30, license: 'MIT License' }),
  makeRepo({ name: 'repo-e', stars: 1, license: null }),
  makeRepo({ name: 'repo-f', stars: 99, license: null }),
  makeRepo({ name: 'repo-g', stars: 20, license: 'MIT License' }),
];

describe('ProjectList', () => {
  it('shows at most 5 repos in the given recent order by default', () => {
    render(<ProjectList repos={repos} pipelines={{}} />);

    expect(screen.getByText('repo-a')).toBeInTheDocument();
    expect(screen.getByText('repo-b')).toBeInTheDocument();
    expect(screen.getByText('repo-c')).toBeInTheDocument();
    expect(screen.getByText('repo-d')).toBeInTheDocument();
    expect(screen.getByText('repo-e')).toBeInTheDocument();
    expect(screen.queryByText('repo-f')).not.toBeInTheDocument();
    expect(screen.queryByText('repo-g')).not.toBeInTheDocument();
  });

  it('re-sorts by stars and resets to showing 5 when Most Starred is clicked', () => {
    render(<ProjectList repos={repos} pipelines={{}} />);

    fireEvent.click(screen.getByRole('button', { name: 'Most Starred' }));

    // Top 5 by stars: repo-f (99), repo-b (50), repo-d (30), repo-g (20), repo-a (10)
    expect(screen.getByText('repo-f')).toBeInTheDocument();
    expect(screen.getByText('repo-b')).toBeInTheDocument();
    expect(screen.getByText('repo-d')).toBeInTheDocument();
    expect(screen.getByText('repo-g')).toBeInTheDocument();
    expect(screen.getByText('repo-a')).toBeInTheDocument();
    // Lowest two by stars are not in the top 5.
    expect(screen.queryByText('repo-c')).not.toBeInTheDocument();
    expect(screen.queryByText('repo-e')).not.toBeInTheDocument();
  });

  it('filters to only licensed repos when Open Source is clicked', () => {
    render(<ProjectList repos={repos} pipelines={{}} />);

    fireEvent.click(screen.getByRole('button', { name: 'Open Source' }));

    expect(screen.getByText('repo-b')).toBeInTheDocument();
    expect(screen.getByText('repo-d')).toBeInTheDocument();
    expect(screen.getByText('repo-g')).toBeInTheDocument();
    expect(screen.queryByText('repo-a')).not.toBeInTheDocument();
    expect(screen.queryByText('repo-c')).not.toBeInTheDocument();
    expect(screen.queryByText('repo-e')).not.toBeInTheDocument();
    expect(screen.queryByText('repo-f')).not.toBeInTheDocument();
  });

  it('shows a dim empty-state message when no repo is open-source licensed', () => {
    const unlicensed = repos.map((repo) => ({ ...repo, license: null }));
    render(<ProjectList repos={unlicensed} pipelines={{}} />);

    fireEvent.click(screen.getByRole('button', { name: 'Open Source' }));

    expect(screen.getByText(/no open-source-licensed repos yet/i)).toBeInTheDocument();
  });

  it('reveals the rest of the list on Load more and then hides the button', () => {
    render(<ProjectList repos={repos} pipelines={{}} />);

    expect(screen.queryByText('repo-f')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /load more/i }));

    expect(screen.getByText('repo-f')).toBeInTheDocument();
    expect(screen.getByText('repo-g')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /load more/i })).not.toBeInTheDocument();
  });
});
