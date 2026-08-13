import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProjectList } from './project-list';
import type { GithubRepo } from '@/lib/github.types';

function makeRepo(overrides: Partial<GithubRepo> & { name: string }): GithubRepo {
  return {
    slug: `nadeem4/${overrides.name}`,
    description: `${overrides.name} description`,
    url: `https://github.com/nadeem4/${overrides.name}`,
    stars: 0,
    language: 'TypeScript',
    updatedAt: '2026-01-01T00:00:00Z',
    license: null,
    ...overrides,
  };
}

// Given in recency order (index 0 = most recently pushed), with featured repos
// already pinned to the front by applyOverrides upstream. Nine repos, so two
// sit beyond the seven-repo default and Load more stays exercised.
const repos: GithubRepo[] = [
  makeRepo({ name: 'repo-a', stars: 10 }),
  makeRepo({ name: 'repo-b', stars: 50 }),
  makeRepo({ name: 'repo-c', stars: 5 }),
  makeRepo({ name: 'repo-d', stars: 30 }),
  makeRepo({ name: 'repo-e', stars: 1 }),
  makeRepo({ name: 'repo-f', stars: 99 }),
  makeRepo({ name: 'repo-g', stars: 20 }),
  makeRepo({ name: 'repo-h', stars: 7 }),
  makeRepo({ name: 'repo-i', stars: 60 }),
];

describe('ProjectList', () => {
  it('shows the first seven repos in the given order by default, matching the featured count', () => {
    render(<ProjectList repos={repos} pipelines={{}} />);

    for (const name of ['repo-a', 'repo-b', 'repo-c', 'repo-d', 'repo-e', 'repo-f', 'repo-g']) {
      expect(screen.getByText(name)).toBeInTheDocument();
    }
    expect(screen.queryByText('repo-h')).not.toBeInTheDocument();
    expect(screen.queryByText('repo-i')).not.toBeInTheDocument();
  });

  it('offers only the Recent and Most Starred views', () => {
    render(<ProjectList repos={repos} pipelines={{}} />);

    expect(screen.getByRole('button', { name: 'Recent' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Most Starred' })).toBeInTheDocument();
    // The Open Source view filtered by licence presence, which is not what the
    // term means; it was removed rather than left to collide with contributions.
    expect(screen.queryByRole('button', { name: /open source/i })).not.toBeInTheDocument();
  });

  it('re-sorts strictly by stars when Most Starred is clicked, discarding pinned order', () => {
    render(<ProjectList repos={repos} pipelines={{}} />);

    fireEvent.click(screen.getByRole('button', { name: 'Most Starred' }));

    // Top seven by stars: f(99) i(60) b(50) d(30) g(20) a(10) h(7)
    for (const name of ['repo-f', 'repo-i', 'repo-b', 'repo-d', 'repo-g', 'repo-a', 'repo-h']) {
      expect(screen.getByText(name)).toBeInTheDocument();
    }
    expect(screen.queryByText('repo-c')).not.toBeInTheDocument();
    expect(screen.queryByText('repo-e')).not.toBeInTheDocument();
  });

  it('resets to the default count when the view changes', () => {
    render(<ProjectList repos={repos} pipelines={{}} />);

    fireEvent.click(screen.getByRole('button', { name: /load more/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Most Starred' }));

    expect(screen.getByRole('button', { name: /load more/i })).toBeInTheDocument();
  });

  it('reveals the rest of the list on Load more and then hides the button', () => {
    render(<ProjectList repos={repos} pipelines={{}} />);

    expect(screen.queryByText('repo-h')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /load more/i }));

    expect(screen.getByText('repo-h')).toBeInTheDocument();
    expect(screen.getByText('repo-i')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /load more/i })).not.toBeInTheDocument();
  });

  it('shows no Load more button when everything already fits', () => {
    render(<ProjectList repos={repos.slice(0, 3)} pipelines={{}} />);
    expect(screen.queryByRole('button', { name: /load more/i })).not.toBeInTheDocument();
  });
});
