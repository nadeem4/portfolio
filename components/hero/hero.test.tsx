import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Hero } from './hero';
import { siteConfig } from '@/config/site';

describe('Hero', () => {
  it('leads with the name as the page heading, then the role, pitch and current work', () => {
    render(<Hero />);
    expect(screen.getByRole('heading', { level: 1, name: siteConfig.name })).toBeInTheDocument();
    expect(screen.getByText(siteConfig.role)).toBeInTheDocument();
    expect(screen.getByText(siteConfig.pitch)).toBeInTheDocument();
    expect(screen.getByText(siteConfig.now)).toBeInTheDocument();
  });

  it('links out to GitHub, LinkedIn, Medium and email as plain links, not sales buttons', () => {
    render(<Hero />);
    expect(screen.getByRole('link', { name: /github/i })).toHaveAttribute('href', siteConfig.socials.github);
    expect(screen.getByRole('link', { name: /linkedin/i })).toHaveAttribute('href', siteConfig.socials.linkedin);
    expect(screen.getByRole('link', { name: /medium/i })).toHaveAttribute('href', siteConfig.socials.medium);
    expect(screen.getByRole('link', { name: siteConfig.email })).toHaveAttribute('href', `mailto:${siteConfig.email}`);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('keeps em and en dashes out of the copy', () => {
    const { container } = render(<Hero />);
    expect(container.textContent).not.toMatch(/[–—]/);
  });
});
