import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Experience } from './experience';
import { roles } from '@/config/experience';

describe('Experience', () => {
  it('names every employer', () => {
    render(<Experience />);
    for (const role of roles) {
      expect(screen.getAllByText(new RegExp(role.company)).length, role.company).toBeGreaterThan(0);
    }
  });

  it('shows a period for every role, so level can be established', () => {
    render(<Experience />);
    for (const role of roles) {
      expect(screen.getByText(role.period), role.company).toBeInTheDocument();
    }
  });

  it('gives every role a line of scope', () => {
    render(<Experience />);
    for (const role of roles) {
      expect(screen.getByText(role.scope), role.company).toBeInTheDocument();
    }
  });

  it('lists roles newest first', () => {
    const { container } = render(<Experience />);
    const first = container.querySelector('li');
    expect(first).toHaveTextContent(roles[0].company);
    expect(first).toHaveTextContent(roles[0].period);
  });
});

describe('the configured history', () => {
  it('anchors the scale claims to a job and a date rather than the hero', () => {
    // The hero previously carried "10TB+/day" with no employer or date attached.
    const withNumbers = roles.filter((role) => /\d/.test(role.scope));
    expect(withNumbers.length).toBeGreaterThan(0);
    for (const role of withNumbers) {
      expect(role.period, role.company).toMatch(/\d{4}/);
    }
  });

  it('stays short enough to read as a summary rather than a resume', () => {
    expect(roles.length).toBeGreaterThanOrEqual(3);
    expect(roles.length).toBeLessThanOrEqual(6);
  });

  it('gives every role all five fields, non-empty', () => {
    for (const role of roles) {
      for (const field of ['company', 'title', 'period', 'location', 'scope'] as const) {
        expect(role[field]?.trim(), `${field} on ${role.company}`).toBeTruthy();
      }
    }
  });

  it('keeps scope lines to a single readable line', () => {
    for (const role of roles) {
      expect(role.scope.length, role.company).toBeLessThan(280);
    }
  });
});
