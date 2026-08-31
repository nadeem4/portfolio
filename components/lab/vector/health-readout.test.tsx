import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HealthReadout, formatRecall } from './health-readout';

function valueFor(label: string): string {
  return screen.getByText(label).nextElementSibling?.textContent ?? '';
}

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
  it('renders a term and a value for every row it is given', () => {
    render(<HealthReadout rows={[{ label: 'Points', value: '120' }, { label: 'recall@10', value: '0.80' }]} />);
    expect(valueFor('Points')).toBe('120');
    expect(valueFor('recall@10')).toBe('0.80');
  });

  it('renders index-specific rows without knowing what they mean', () => {
    // The whole reason for the change: cell balance is IVF vocabulary and the
    // readout must stay ignorant of it.
    render(
      <HealthReadout
        rows={[
          { label: 'Points', value: '120' },
          { label: 'Cell balance', value: '0.42' },
          { label: 'Inserts since rebuild', value: '7' },
        ]}
      />,
    );
    expect(valueFor('Cell balance')).toBe('0.42');
    expect(valueFor('Inserts since rebuild')).toBe('7');
  });

  it('preserves the order given rather than re-sorting', () => {
    const { container } = render(
      <HealthReadout
        rows={[
          { label: 'Points', value: '120' },
          { label: 'Cell balance', value: '0.42' },
          { label: 'recall@10', value: '0.80' },
        ]}
      />,
    );
    const terms = [...container.querySelectorAll('dt')].map((dt) => dt.textContent);
    expect(terms).toEqual(['Points', 'Cell balance', 'recall@10']);
  });

  it('names the block for assistive tech', () => {
    render(<HealthReadout rows={[{ label: 'Points', value: '120' }]} />);
    expect(screen.getByLabelText('Index health')).toBeInTheDocument();
  });

  it('renders an empty list rather than crashing when given no rows', () => {
    const { container } = render(<HealthReadout rows={[]} />);
    expect(container.querySelectorAll('dt')).toHaveLength(0);
    expect(screen.getByLabelText('Index health')).toBeInTheDocument();
  });

  it('attaches an optional test id to a row value, for a sibling test that needs a stable DOM hook', () => {
    // vector-lab.test.tsx locates the point count by data-testid rather than by
    // label text, so that hook has to survive the generalisation to rows.
    render(<HealthReadout rows={[{ label: 'Points', value: '120', testId: 'lab-point-count' }]} />);
    expect(screen.getByTestId('lab-point-count')).toHaveTextContent('120');
  });
});
