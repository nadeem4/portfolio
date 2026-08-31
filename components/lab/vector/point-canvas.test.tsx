import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PointCanvas, toSvgCoords, type PointTone } from './point-canvas';
import type { PointId } from '@/lib/lab/vector/types';
import type { ScreenPoint, Viewport } from '@/lib/lab/vector/layout';

// motion's useReducedMotion reads a media query that jsdom stubs to a fixed
// value, so the preference is flipped at the hook rather than at matchMedia.
const motionState = vi.hoisted(() => ({ reduced: false }));
vi.mock('motion/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('motion/react')>();
  return { ...actual, useReducedMotion: () => motionState.reduced };
});

const viewport: Viewport = { width: 480, height: 360, padding: 24 };

// Hand-built rather than produced by layoutPoints: this component's contract is
// that it draws exactly what it is handed, so the test hands it exact numbers.
const screenPoints: readonly ScreenPoint[] = [
  { id: 1, x: 24, y: 336 },
  { id: 2, x: 240, y: 180 },
  { id: 3, x: 456, y: 24 },
];

function markers(container: HTMLElement) {
  return [...container.querySelectorAll('[data-testid="lab-point"]')];
}

describe('toSvgCoords', () => {
  it('scales a client coordinate into viewBox units', () => {
    const rect = { left: 100, top: 50, width: 960, height: 720 };
    expect(toSvgCoords(rect, 100, 50, viewport)).toEqual({ x: 0, y: 0 });
    expect(toSvgCoords(rect, 1060, 770, viewport)).toEqual({ x: 480, y: 360 });
  });

  it('treats a zero-sized rect as 1:1 rather than dividing by zero', () => {
    // jsdom lays nothing out, so every rect is zero. NaN coordinates there
    // would make every click in the test suite meaningless.
    const rect = { left: 0, top: 0, width: 0, height: 0 };
    expect(toSvgCoords(rect, 12, 20, viewport)).toEqual({ x: 12, y: 20 });
  });
});

describe('PointCanvas', () => {
  it('exposes the canvas as an image with the label it is given', () => {
    render(<PointCanvas screenPoints={screenPoints} viewport={viewport} query={null} label="14 points plotted" />);
    expect(screen.getByRole('img', { name: '14 points plotted' })).toBeInTheDocument();
  });

  it('draws one marker per screen point, at the coordinates it was given', () => {
    // jsdom does not lay out or paint SVG, so there is no rendered geometry to
    // assert on. The assertion is on the attributes handed to the element,
    // which is the whole of what this component decides.
    const { container } = render(
      <PointCanvas screenPoints={screenPoints} viewport={viewport} query={null} label="points" />,
    );
    const drawn = markers(container).map((node) => [node.getAttribute('cx'), node.getAttribute('cy')]);
    expect(drawn).toEqual([
      ['24', '336'],
      ['240', '180'],
      ['456', '24'],
    ]);
  });

  it('preserves the order it was given rather than re-sorting', () => {
    const { container } = render(
      <PointCanvas screenPoints={screenPoints} viewport={viewport} query={null} label="points" />,
    );
    expect(markers(container).map((node) => node.getAttribute('data-point-id'))).toEqual(['1', '2', '3']);
  });

  it('sets the viewBox from the viewport it is given', () => {
    render(<PointCanvas screenPoints={screenPoints} viewport={viewport} query={null} label="points" />);
    expect(screen.getByRole('img', { name: 'points' })).toHaveAttribute('viewBox', '0 0 480 360');
  });

  it('tones each point from the map, defaulting to idle', () => {
    const tones = new Map<PointId, PointTone>([
      [2, 'result'],
      [3, 'current'],
    ]);
    const { container } = render(
      <PointCanvas screenPoints={screenPoints} viewport={viewport} tones={tones} query={null} label="points" />,
    );
    expect(markers(container).map((node) => node.getAttribute('data-tone'))).toEqual(['idle', 'result', 'current']);
  });

  it('draws no query marker when there is no query', () => {
    const { container } = render(
      <PointCanvas screenPoints={screenPoints} viewport={viewport} query={null} label="points" />,
    );
    expect(container.querySelector('[data-testid="lab-query"]')).toBeNull();
  });

  it('draws the query marker where it is told', () => {
    const { container } = render(
      <PointCanvas screenPoints={screenPoints} viewport={viewport} query={{ x: 120, y: 90 }} label="points" />,
    );
    expect(container.querySelector('[data-testid="lab-query"]')).toHaveAttribute('data-motion', 'full');
  });

  it('drops the query marker transition when the reader prefers reduced motion', () => {
    motionState.reduced = true;
    const { container } = render(
      <PointCanvas screenPoints={screenPoints} viewport={viewport} query={{ x: 120, y: 90 }} label="points" />,
    );
    expect(container.querySelector('[data-testid="lab-query"]')).toHaveAttribute('data-motion', 'reduced');
    motionState.reduced = false;
  });

  it('reports a click in viewBox units', () => {
    const onPick = vi.fn();
    render(
      <PointCanvas screenPoints={screenPoints} viewport={viewport} query={null} label="points" onPick={onPick} />,
    );
    fireEvent.click(screen.getByRole('img', { name: 'points' }), { clientX: 240, clientY: 180 });
    expect(onPick).toHaveBeenCalledWith(240, 180);
  });

  it('is inert when given no pick handler', () => {
    const { container } = render(
      <PointCanvas screenPoints={screenPoints} viewport={viewport} query={null} label="points" />,
    );
    expect(() => fireEvent.click(screen.getByRole('img', { name: 'points' }))).not.toThrow();
    expect(container.querySelector('svg')).toBeInTheDocument();
  });
});
