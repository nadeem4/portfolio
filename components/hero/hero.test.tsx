import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Hero } from './hero';
import { siteConfig } from '@/config/site';

describe('Hero', () => {
  it('shows the name, role, and pitch', () => {
    render(<Hero />);
    expect(screen.getByRole('heading', { name: siteConfig.name })).toBeInTheDocument();
    expect(screen.getByText(siteConfig.role)).toBeInTheDocument();
    expect(screen.getByText(siteConfig.pitch)).toBeInTheDocument();
  });
});
