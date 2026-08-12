import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ResumeSection } from './resume-section';

describe('ResumeSection', () => {
  it('links to the downloadable resume PDF', () => {
    render(<ResumeSection />);
    const link = screen.getByRole('link', { name: /download resume/i });
    expect(link).toHaveAttribute('href', '/resume.pdf');
  });
});
