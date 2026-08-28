import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SelectedProjects } from './selected-projects';
import type { GithubRepo } from '@/lib/github.types';

function repo(name: string, stars: number): GithubRepo {
  return {
    slug: `nadeem4/${name}`,
    name,
    description: `${name} does one thing well`,
    url: `https://github.com/nadeem4/${name}`,
    stars,
    language: 'Python',
    updatedAt: '2026-08-01T00:00:00Z',
    license: null,
  };
}

const repos: GithubRepo[] = [repo('nl2sql', 4), repo('medalflow', 0), repo('aurora', 0), repo('mini-gpt', 0)];

describe('SelectedProjects', () => {
  it('shows only the first three repos, which arrive featured-first', () => {
    // getGithubRepos already pins the featured list to the front, so slicing
    // here is what keeps the homepage showing the flagship work.
    render(<SelectedProjects repos={repos} />);
    expect(screen.getByText('nl2sql')).toBeInTheDocument();
    expect(screen.getByText('medalflow')).toBeInTheDocument();
    expect(screen.getByText('aurora')).toBeInTheDocument();
    expect(screen.queryByText('mini-gpt')).toBeNull();
  });

  it('links each repo to GitHub and says so to assistive tech', () => {
    render(<SelectedProjects repos={repos} />);
    const link = screen.getByRole('link', { name: /nl2sql/ });
    expect(link).toHaveAttribute('href', 'https://github.com/nadeem4/nl2sql');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAccessibleName(/opens on GitHub/i);
  });

  it('shows each repo description, since the description is the curation signal', () => {
    render(<SelectedProjects repos={repos} />);
    expect(screen.getByText('nl2sql does one thing well')).toBeInTheDocument();
  });

  it('links through to the full projects page', () => {
    render(<SelectedProjects repos={repos} />);
    expect(screen.getByRole('link', { name: 'All projects' })).toHaveAttribute('href', '/projects');
  });

  it('renders nothing when the repo fetch came back empty', () => {
    // Mirrors /projects: a GitHub outage hides the section rather than
    // rendering an empty frame.
    const { container } = render(<SelectedProjects repos={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
