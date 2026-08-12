import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProjectCard } from './project-card';
import type { GithubRepo } from '@/lib/github.types';

const repo: GithubRepo = {
  slug: 'nadeem4/example-repo',
  name: 'example-repo',
  description: 'An example repo',
  url: 'https://github.com/nadeem4/example-repo',
  stars: 5,
  language: 'TypeScript',
  updatedAt: '2026-01-15T00:00:00Z',
  license: 'MIT License',
};

describe('ProjectCard', () => {
  it('shows a fixed calendar-format last-worked-on date derived from updatedAt', () => {
    render(<ProjectCard repo={repo} />);
    expect(screen.getByText(/Jan 2026/)).toBeInTheDocument();
  });
});
