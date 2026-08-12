import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ContactSection } from './contact-section';
import { siteConfig } from '@/config/site';

describe('ContactSection', () => {
  it('shows a mailto link and every social link', () => {
    render(<ContactSection />);
    expect(screen.getByRole('link', { name: siteConfig.email })).toHaveAttribute('href', `mailto:${siteConfig.email}`);
    expect(screen.getByRole('link', { name: 'GitHub' })).toHaveAttribute('href', siteConfig.socials.github);
    expect(screen.getByRole('link', { name: 'LinkedIn' })).toHaveAttribute('href', siteConfig.socials.linkedin);
    expect(screen.getByRole('link', { name: 'Medium' })).toHaveAttribute('href', siteConfig.socials.medium);
  });
});
