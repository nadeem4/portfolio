import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Header } from './header';
import { siteConfig } from '@/config/site';

const pathname = vi.hoisted(() => ({ current: '/' }));
vi.mock('next/navigation', () => ({ usePathname: () => pathname.current }));

describe('Header', () => {
  beforeEach(() => {
    pathname.current = '/';
  });

  it('shows the name wordmark as the home link, not a generic "Home" label', () => {
    render(<Header />);
    expect(screen.getByRole('link', { name: siteConfig.name })).toHaveAttribute('href', '/');
    expect(screen.queryByRole('link', { name: 'Home' })).not.toBeInTheDocument();
  });

  it('links to the blog and projects', () => {
    render(<Header />);
    expect(screen.getByRole('link', { name: 'Blog' })).toHaveAttribute('href', '/blog');
    expect(screen.getByRole('link', { name: 'Projects' })).toHaveAttribute('href', '/projects');
  });

  it('marks the section you are in, including its sub-pages', () => {
    pathname.current = '/blog/postgres-series';
    render(<Header />);
    expect(screen.getByRole('link', { name: 'Blog' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Projects' })).not.toHaveAttribute('aria-current');
  });

  it('shows a visible command-palette trigger', () => {
    render(<Header />);
    expect(screen.getByRole('button', { name: 'Open command palette' })).toBeInTheDocument();
  });

  it('has no Live Projects link: live systems are a homepage section, not a page', () => {
    render(<Header />);
    expect(screen.queryByRole('link', { name: 'Live Projects' })).not.toBeInTheDocument();
  });
});
