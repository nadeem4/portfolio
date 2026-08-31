import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HealthReadout, formatRecall } from './health-readout';

describe('formatRecall', () => {
  it('renders a fraction as a whole percentage', () => {
    expect(formatRecall(1)).toBe('100%');
    expect(formatRecall(0.7)).toBe('70%');
    expect(formatRecall(0)).toBe('0%');
  });

  it('renders a dash when no query has been asked', () => {
    // Zero recall and no query at all are different states, and showing 0%
    // before the first search would read as a broken index.
    expect(formatRecall(null)).toBe('—');
  });
});

describe('HealthReadout', () => {
  it('shows how many points are in the index', () => {
    render(<HealthReadout pointCount={42} k={10} recall={null} />);
    expect(screen.getByTestId('lab-point-count')).toHaveTextContent('42');
    expect(screen.getByText('Points')).toBeInTheDocument();
  });

  it('labels recall with the k it was measured at', () => {
    render(<HealthReadout pointCount={42} k={10} recall={1} />);
    expect(screen.getByText('recall@10')).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('follows k rather than hardcoding ten', () => {
    render(<HealthReadout pointCount={42} k={5} recall={0.8} />);
    expect(screen.getByText('recall@5')).toBeInTheDocument();
    expect(screen.getByText('80%')).toBeInTheDocument();
  });

  it('shows a dash until a query has been asked', () => {
    render(<HealthReadout pointCount={42} k={10} recall={null} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('has an accessible name', () => {
    render(<HealthReadout pointCount={42} k={10} recall={null} />);
    expect(screen.getByRole('region', { name: /index health/i })).toBeInTheDocument();
  });

  it('draws nothing', () => {
    const { container } = render(<HealthReadout pointCount={42} k={10} recall={1} />);
    expect(container.querySelector('svg')).toBeNull();
  });

  it('renders an empty index honestly', () => {
    render(<HealthReadout pointCount={0} k={10} recall={null} />);
    expect(screen.getByTestId('lab-point-count')).toHaveTextContent('0');
  });
});
