import { describe, it, expect } from 'vitest';
import { toScreen, layoutPoints, hitTest, type ScreenPoint, type Viewport } from './layout';
import type { Point } from './types';

const SQUARE: Viewport = { width: 100, height: 100, padding: 0 };
const PADDED: Viewport = { width: 100, height: 100, padding: 10 };

describe('toScreen', () => {
  it('puts the data-space origin at the bottom left', () => {
    // Data-space y grows upward, screen y grows downward. The flip lives here
    // so the drawing component never has to think about it.
    expect(toScreen([0, 0], SQUARE)).toEqual({ x: 0, y: 100 });
  });

  it('puts [1, 1] at the top right', () => {
    expect(toScreen([1, 1], SQUARE)).toEqual({ x: 100, y: 0 });
  });

  it('puts the centre in the middle', () => {
    expect(toScreen([0.5, 0.5], SQUARE)).toEqual({ x: 50, y: 50 });
  });

  it('insets the unit square by the padding on every side', () => {
    expect(toScreen([0, 0], PADDED)).toEqual({ x: 10, y: 90 });
    expect(toScreen([1, 1], PADDED)).toEqual({ x: 90, y: 10 });
    expect(toScreen([0.5, 0.5], PADDED)).toEqual({ x: 50, y: 50 });
  });

  it('fills a non-square viewport rather than letterboxing it', () => {
    const wide: Viewport = { width: 200, height: 100, padding: 0 };
    expect(toScreen([0.5, 0.5], wide)).toEqual({ x: 100, y: 50 });
    expect(toScreen([1, 0], wide)).toEqual({ x: 200, y: 100 });
  });

  it('collapses to the padding when the viewport is smaller than its padding', () => {
    const tiny: Viewport = { width: 10, height: 10, padding: 20 };
    expect(toScreen([0, 0], tiny)).toEqual({ x: 20, y: 20 });
    expect(toScreen([1, 1], tiny)).toEqual({ x: 20, y: 20 });
  });
});

describe('layoutPoints', () => {
  const points: Point[] = [
    { id: 3, vec: [0, 1] },
    { id: 7, vec: [0.5, 0.5] },
    { id: 9, vec: [1, 0] },
  ];

  it('returns one screen point per point, in order, keeping ids', () => {
    expect(layoutPoints(points, SQUARE)).toEqual([
      { id: 3, x: 0, y: 0 },
      { id: 7, x: 50, y: 50 },
      { id: 9, x: 100, y: 100 },
    ]);
  });

  it('returns nothing for an empty index', () => {
    expect(layoutPoints([], SQUARE)).toEqual([]);
  });

  it('leaves the input alone', () => {
    const before = JSON.parse(JSON.stringify(points));
    layoutPoints(points, SQUARE);
    expect(points).toEqual(before);
  });
});

describe('hitTest', () => {
  const screenPoints: ScreenPoint[] = [
    { id: 3, x: 0, y: 0 },
    { id: 7, x: 50, y: 50 },
    { id: 9, x: 100, y: 100 },
  ];

  it('finds the point under the cursor', () => {
    expect(hitTest(screenPoints, 52, 50, 10)).toBe(7);
  });

  it('finds a point the cursor sits exactly on', () => {
    expect(hitTest(screenPoints, 50, 50, 0)).toBe(7);
  });

  it('counts the radius as a hit, not a miss', () => {
    expect(hitTest(screenPoints, 60, 50, 10)).toBe(7);
  });

  it('returns null beyond the radius', () => {
    expect(hitTest(screenPoints, 70, 50, 10)).toBeNull();
  });

  it('returns the nearest of several candidates', () => {
    const crowded: ScreenPoint[] = [
      { id: 1, x: 0, y: 0 },
      { id: 2, x: 8, y: 0 },
      { id: 3, x: 4, y: 0 },
    ];
    expect(hitTest(crowded, 5, 0, 50)).toBe(3);
  });

  it('breaks a tie towards the first point, so a click never flickers', () => {
    const tied: ScreenPoint[] = [
      { id: 7, x: 0, y: 0 },
      { id: 9, x: 20, y: 0 },
    ];
    expect(hitTest(tied, 10, 0, 50)).toBe(7);
  });

  it('returns null for an empty canvas', () => {
    expect(hitTest([], 10, 10, 50)).toBeNull();
  });
});
