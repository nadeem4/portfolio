import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Footer } from './footer';
import { siteConfig } from '@/config/site';

describe('Footer', () => {
  it("shows the site owner's name", () => {
    render(<Footer />);
    expect(screen.getByText(new RegExp(siteConfig.name))).toBeInTheDocument();
  });
});
