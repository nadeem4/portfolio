import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Scoreboard, counterLabel } from './scoreboard';

describe('counterLabel', () => {
  it('turns an index vocabulary key into words', () => {
    expect(counterLabel('distanceComputations')).toBe('Distance computations');
    expect(counterLabel('pointsScanned')).toBe('Points scanned');
  });

  it('falls back to the raw key for a counter it has never seen', () => {
    // Counter keys are per-index and grow with each new one, so an unlabelled
    // key must still render rather than disappear from the readout.
    expect(counterLabel('cellsProbed')).toBe('cellsProbed');
  });
});

describe('Scoreboard', () => {
  it('renders every counter as DOM text', () => {
    // Never painted into the canvas: a number inside an svg is invisible to a
    // screen reader and uncopyable to everyone else.
    render(<Scoreboard counters={{ distanceComputations: 41, pointsScanned: 41 }} />);
    expect(screen.getByText('Distance computations')).toBeInTheDocument();
    expect(screen.getAllByText('41')).toHaveLength(2);
  });

  it('draws nothing', () => {
    const { container } = render(<Scoreboard counters={{ distanceComputations: 41 }} />);
    expect(container.querySelector('svg')).toBeNull();
    expect(container.querySelector('canvas')).toBeNull();
  });

  it('pairs each label with its value in a description list', () => {
    const { container } = render(<Scoreboard counters={{ distanceComputations: 41, pointsScanned: 40 }} />);
    expect([...container.querySelectorAll('dt')].map((n) => n.textContent)).toEqual([
      'Distance computations',
      'Points scanned',
    ]);
    expect([...container.querySelectorAll('dd')].map((n) => n.textContent)).toEqual(['41', '40']);
  });

  it('has an accessible name', () => {
    render(<Scoreboard counters={{ distanceComputations: 41 }} />);
    expect(screen.getByRole('region', { name: /cost of the last operation/i })).toBeInTheDocument();
  });

  it('says so when nothing has run yet, rather than showing an empty box', () => {
    render(<Scoreboard counters={{}} />);
    expect(screen.getByText(/no operation has run yet/i)).toBeInTheDocument();
  });

  it('renders a zero rather than hiding it', () => {
    // Zero distance computations is a real and interesting answer.
    render(<Scoreboard counters={{ distanceComputations: 0 }} />);
    expect(screen.getByText('0')).toBeInTheDocument();
  });
});

describe('Scoreboard deltas', () => {
  it('shows how a counter moved against the previous operation', () => {
    // "129" alone is inert. The change is the linear relationship the prose
    // promises — insert ten points, pay ten more distance computations.
    render(<Scoreboard counters={{ distanceComputations: 139 }} previous={{ distanceComputations: 129 }} />);
    expect(screen.getByText('+10')).toBeInTheDocument();
  });

  it('marks a fall as well as a rise', () => {
    render(<Scoreboard counters={{ distanceComputations: 120 }} previous={{ distanceComputations: 129 }} />);
    expect(screen.getByText('-9')).toBeInTheDocument();
  });

  it('shows no delta when the counter did not move', () => {
    render(<Scoreboard counters={{ distanceComputations: 129 }} previous={{ distanceComputations: 129 }} />);
    expect(screen.queryByText(/^[+-]/)).not.toBeInTheDocument();
  });

  it('shows no delta when there is nothing to compare against', () => {
    render(<Scoreboard counters={{ distanceComputations: 129 }} />);
    expect(screen.queryByText(/^[+-]/)).not.toBeInTheDocument();
  });
});
