import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Footer } from './footer';
import { siteConfig } from '@/config/site';

describe('Footer', () => {
  it("shows the site owner's name with a copyright mark", () => {
    render(<Footer />);
    expect(screen.getByText(new RegExp(`© \\d{4} ${siteConfig.name}`))).toBeInTheDocument();
  });

  it('carries the contact details the homepage no longer repeats in a section', () => {
    render(<Footer />);
    expect(screen.getByRole('link', { name: siteConfig.email })).toHaveAttribute('href', `mailto:${siteConfig.email}`);
    expect(screen.getByRole('link', { name: /github/i })).toHaveAttribute('href', siteConfig.socials.github);
    expect(screen.getByRole('link', { name: /linkedin/i })).toHaveAttribute('href', siteConfig.socials.linkedin);
  });

  it('drops the "built with" template line', () => {
    render(<Footer />);
    expect(screen.queryByText(/built with/i)).not.toBeInTheDocument();
  });
});
