import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VectorLab, screenToVec, tonesFor } from './vector-lab';
import { toScreen, type Viewport } from '@/lib/lab/vector/layout';

const viewport: Viewport = { width: 480, height: 360, padding: 24 };

function pointCount() {
  return Number(screen.getByTestId('lab-point-count').textContent);
}

function canvas() {
  return screen.getByRole('img', { name: /points plotted/i });
}

describe('screenToVec', () => {
  it('round-trips through toScreen', () => {
    // Derived from two probes of toScreen rather than a second copy of the
    // padding maths, so the two cannot drift apart.
    for (const vec of [[0, 0], [1, 1], [0.25, 0.75], [0.5, 0.5]]) {
      const screenPoint = toScreen(vec, viewport);
      const back = screenToVec(viewport, screenPoint.x, screenPoint.y);
      expect(back[0]).toBeCloseTo(vec[0], 10);
      expect(back[1]).toBeCloseTo(vec[1], 10);
    }
  });
});

describe('tonesFor', () => {
  it('marks the current result set', () => {
    const tones = tonesFor([], -1, [{ id: 4, distance: 0.1 }, { id: 9, distance: 0.2 }]);
    expect(tones.get(4)).toBe('result');
    expect(tones.get(9)).toBe('result');
  });

  it('marks the step under the scrubber, which wins over the result set', () => {
    const tones = tonesFor([{ kind: 'scan', id: 4, distance: 0.3 }], 0, [{ id: 4, distance: 0.1 }]);
    expect(tones.get(4)).toBe('current');
  });

  it('leaves everything else out, so the canvas defaults it to idle', () => {
    const tones = tonesFor([], -1, []);
    expect(tones.size).toBe(0);
  });
});

describe('VectorLab', () => {
  it('renders a labelled canvas naming how many points are drawn', () => {
    render(<VectorLab />);
    expect(canvas()).toHaveAccessibleName(new RegExp(`${pointCount()} points plotted`));
  });

  it('renders the scrubber, scoreboard and health readout as DOM', () => {
    render(<VectorLab />);
    expect(screen.getByRole('slider', { name: /replay/i })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /cost of the last operation/i })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /index health/i })).toBeInTheDocument();
  });

  it('inserts a point where the reader taps empty space', () => {
    render(<VectorLab />);
    const before = pointCount();
    // Inside the padding gutter, so it can never land on a seeded point.
    fireEvent.click(canvas(), { clientX: 5, clientY: 5 });
    expect(pointCount()).toBe(before + 1);
  });

  it('deletes the point the reader taps', () => {
    const { container } = render(<VectorLab />);
    const before = pointCount();
    const marker = container.querySelector('[data-testid="lab-point"]')!;
    fireEvent.click(canvas(), {
      clientX: Number(marker.getAttribute('cx')),
      clientY: Number(marker.getAttribute('cy')),
    });
    expect(pointCount()).toBe(before - 1);
  });

  it('runs a search in query mode instead of editing', async () => {
    // A mode toggle rather than a drag handle: a drag surface on a canvas is
    // where touch scrolling and keyboard access both go to die.
    const user = userEvent.setup();
    render(<VectorLab />);
    const before = pointCount();
    await user.click(screen.getByRole('radio', { name: /move the query/i }));
    fireEvent.click(canvas(), { clientX: 240, clientY: 180 });
    expect(pointCount()).toBe(before);
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('draws the query marker once a query has been placed', async () => {
    const user = userEvent.setup();
    const { container } = render(<VectorLab />);
    expect(container.querySelector('[data-testid="lab-query"]')).toBeNull();
    await user.click(screen.getByRole('radio', { name: /move the query/i }));
    fireEvent.click(canvas(), { clientX: 240, clientY: 180 });
    expect(container.querySelector('[data-testid="lab-query"]')).toBeInTheDocument();
  });

  it('fills the scrubber from the trace of the last operation', () => {
    render(<VectorLab />);
    fireEvent.click(canvas(), { clientX: 5, clientY: 5 });
    const slider = screen.getByRole('slider', { name: /replay/i });
    expect(slider).not.toBeDisabled();
    expect(slider).toHaveAttribute('aria-valuetext', expect.stringContaining('appending point'));
  });

  it('scrubbing back changes the announced step', () => {
    render(<VectorLab />);
    fireEvent.click(canvas(), { clientX: 5, clientY: 5 });
    fireEvent.click(canvas(), { clientX: 9, clientY: 9 });
    const slider = screen.getByRole('slider', { name: /replay/i });
    fireEvent.change(slider, { target: { value: '0' } });
    expect(slider).toHaveAttribute('aria-valuetext', expect.stringContaining('step 1 of'));
    expect(screen.getByRole('status')).toHaveTextContent(/step 1 of/);
  });

  it('disables undo until something has been done', async () => {
    const user = userEvent.setup();
    render(<VectorLab />);
    const undo = screen.getByRole('button', { name: /undo/i });
    expect(undo).toBeDisabled();
    fireEvent.click(canvas(), { clientX: 5, clientY: 5 });
    expect(undo).toBeEnabled();
    await user.click(undo);
    expect(undo).toBeDisabled();
  });

  it('undo removes the last operation, not the last point', async () => {
    const user = userEvent.setup();
    render(<VectorLab />);
    const before = pointCount();
    fireEvent.click(canvas(), { clientX: 5, clientY: 5 });
    fireEvent.click(canvas(), { clientX: 9, clientY: 9 });
    await user.click(screen.getByRole('button', { name: /undo/i }));
    expect(pointCount()).toBe(before + 1);
  });

  it('reset restores the seeded dataset', async () => {
    const user = userEvent.setup();
    render(<VectorLab />);
    const before = pointCount();
    fireEvent.click(canvas(), { clientX: 5, clientY: 5 });
    fireEvent.click(canvas(), { clientX: 9, clientY: 9 });
    await user.click(screen.getByRole('button', { name: /reset/i }));
    expect(pointCount()).toBe(before);
    expect(screen.getByRole('slider', { name: /replay/i })).toBeDisabled();
  });

  it('takes k from its props, which is how a deep link configures it', async () => {
    const user = userEvent.setup();
    render(<VectorLab initialK={3} />);
    expect(screen.getByText('recall@3')).toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: /move the query/i }));
    fireEvent.click(canvas(), { clientX: 240, clientY: 180 });
    expect(screen.getByText('100%')).toBeInTheDocument();
  });
});
