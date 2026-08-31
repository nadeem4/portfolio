import type { Vec } from './types';
import { toScreen, type Viewport } from './layout';

export interface PolygonPoint {
  readonly x: number;
  readonly y: number;
}

export interface VoronoiCell {
  readonly cell: number;
  readonly polygon: readonly PolygonPoint[];
}

/**
 * Sutherland–Hodgman clip of `polygon` against the perpendicular bisector of
 * `keep` and `against`, retaining the half nearer `keep`.
 *
 * The bisector is derived from |p - keep|² - |p - against|², which expands to a
 * straight line: the quadratic terms cancel. So a Voronoi region is just the
 * board clipped once per rival site — a few lines instead of a Fortune sweep,
 * and at eight cells the O(n²) is free.
 */
function clipToNearer(
  polygon: readonly PolygonPoint[],
  keep: PolygonPoint,
  against: PolygonPoint,
): PolygonPoint[] {
  const side = (p: PolygonPoint) =>
    2 * (against.x - keep.x) * p.x +
    2 * (against.y - keep.y) * p.y +
    (keep.x ** 2 + keep.y ** 2) -
    (against.x ** 2 + against.y ** 2);

  const clipped: PolygonPoint[] = [];
  for (let i = 0; i < polygon.length; i += 1) {
    const a = polygon[i];
    const b = polygon[(i + 1) % polygon.length];
    const sa = side(a);
    const sb = side(b);
    if (sa <= 0) clipped.push(a);
    if ((sa < 0 && sb > 0) || (sa > 0 && sb < 0)) {
      const t = sa / (sa - sb);
      clipped.push({ x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) });
    }
  }
  return clipped;
}

/**
 * The screen-space polygon of every IVF cell, clipped to the drawable board.
 *
 * Pure and tested because it is the whole picture: the canvas component may do
 * nothing but iterate what this returns.
 */
export function voronoiCells(centroids: readonly Vec[], viewport: Viewport): readonly VoronoiCell[] {
  if (centroids.length === 0) return [];

  // The board is derived from `toScreen` rather than from width/height, so the
  // polygons keep agreeing with the points even if the mapping changes.
  const a = toScreen([0, 0], viewport);
  const b = toScreen([1, 1], viewport);
  const left = Math.min(a.x, b.x);
  const right = Math.max(a.x, b.x);
  const top = Math.min(a.y, b.y);
  const bottom = Math.max(a.y, b.y);
  const board: PolygonPoint[] = [
    { x: left, y: top },
    { x: right, y: top },
    { x: right, y: bottom },
    { x: left, y: bottom },
  ];

  const sites = centroids.map((centroid) => toScreen(centroid, viewport));

  return sites.map((site, cell) => {
    let polygon: PolygonPoint[] = board;
    for (let other = 0; other < sites.length; other += 1) {
      if (other === cell) continue;
      polygon = clipToNearer(polygon, site, sites[other]);
      if (polygon.length === 0) break;
    }
    return { cell, polygon };
  });
}
