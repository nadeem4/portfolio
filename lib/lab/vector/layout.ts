import type { Point, PointId, Vec } from './types';

export interface Viewport {
  readonly width: number;
  readonly height: number;
  readonly padding: number;
}

export interface ScreenPoint {
  readonly id: PointId;
  readonly x: number;
  readonly y: number;
}

/**
 * Unit space to screen space.
 *
 * The unit square is stretched to fill the padded viewport rather than
 * letterboxed into it. Preserving aspect ratio would mean deciding where the
 * unused band goes, and that decision would have to be repeated by anything
 * that maps a click back — so the caller sizes the canvas square instead and
 * this stays a single multiply.
 *
 * Data-space y grows upward and screen y grows downward, so y is flipped here
 * and nowhere else.
 */
export function toScreen(vec: Vec, viewport: Viewport): { x: number; y: number } {
  const usableWidth = Math.max(0, viewport.width - viewport.padding * 2);
  const usableHeight = Math.max(0, viewport.height - viewport.padding * 2);

  return {
    x: viewport.padding + vec[0] * usableWidth,
    y: viewport.padding + (1 - vec[1]) * usableHeight,
  };
}

export function layoutPoints(points: readonly Point[], viewport: Viewport): readonly ScreenPoint[] {
  return points.map((point) => ({ id: point.id, ...toScreen(point.vec, viewport) }));
}

/**
 * Nearest point to a screen coordinate within `radius` px, or null.
 *
 * Ties resolve to the first point in the list, which is insertion order, so a
 * click on overlapping points always deletes the same one rather than picking
 * whichever the iteration happened to reach last.
 */
export function hitTest(
  screenPoints: readonly ScreenPoint[],
  x: number,
  y: number,
  radius: number,
): PointId | null {
  let nearest: PointId | null = null;
  let nearestDistance = Infinity;

  screenPoints.forEach((point) => {
    const gap = Math.hypot(point.x - x, point.y - y);
    if (gap <= radius && gap < nearestDistance) {
      nearest = point.id;
      nearestDistance = gap;
    }
  });

  return nearest;
}
