import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Header } from './header';
import { hasLiveProjects } from '@/config/live-projects';

describe('Header', () => {
  it('links to home, the blog, and projects', () => {
    render(<Header />);
    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'Blog' })).toHaveAttribute('href', '/blog');
    expect(screen.getByRole('link', { name: 'Projects' })).toHaveAttribute('href', '/projects');
  });

  it('links to live projects only once something is actually deployed', () => {
    // A nav item leading to a page reading "COMING SOON" advertises an absence;
    // the link appears on its own when a project's status turns 'live'.
    render(<Header />);
    const link = screen.queryByRole('link', { name: 'Live Projects' });
    if (hasLiveProjects) {
      expect(link).toHaveAttribute('href', '/live-projects');
    } else {
      expect(link).not.toBeInTheDocument();
    }
  });
});
