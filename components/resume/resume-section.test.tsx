import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ResumeSection } from './resume-section';
import { hasResume } from '@/lib/resume';

describe('ResumeSection', () => {
  it('offers the download when a resume is present', () => {
    render(<ResumeSection available />);
    expect(screen.getByRole('link', { name: /download resume/i })).toHaveAttribute('href', '/resume.pdf');
  });

  it('renders nothing when no resume is present', () => {
    // Better to show no resume than to ship one that leaks a phone number.
    const { container } = render(<ResumeSection available={false} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('defaults to whether the file actually exists', () => {
    const { container } = render(<ResumeSection />);
    if (hasResume()) {
      expect(screen.getByRole('link', { name: /download resume/i })).toBeInTheDocument();
    } else {
      expect(container).toBeEmptyDOMElement();
    }
  });
});
