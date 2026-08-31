import { describe, it, expect } from 'vitest';
import { toScreen, type Viewport } from './layout';
import { voronoiCells, type PolygonPoint } from './voronoi';
import { mulberry32 } from './random';

const viewport: Viewport = { width: 400, height: 400, padding: 20 };

/** Shoelace, absolute so winding direction does not matter. */
function area(polygon: readonly PolygonPoint[]): number {
  let total = 0;
  for (let i = 0; i < polygon.length; i += 1) {
    const a = polygon[i];
    const b = polygon[(i + 1) % polygon.length];
    total += a.x * b.y - b.x * a.y;
  }
  return Math.abs(total) / 2;
}

function boardArea(): number {
  const min = toScreen([0, 0], viewport);
  const max = toScreen([1, 1], viewport);
  return Math.abs(max.x - min.x) * Math.abs(max.y - min.y);
}

function centre(polygon: readonly PolygonPoint[]): PolygonPoint {
  const x = polygon.reduce((total, p) => total + p.x, 0) / polygon.length;
  const y = polygon.reduce((total, p) => total + p.y, 0) / polygon.length;
  return { x, y };
}

function nearestSite(point: PolygonPoint, centroids: number[][]): number {
  const sites = centroids.map((c) => toScreen(c, viewport));
  let best = 0;
  let bestDistance = Infinity;
  sites.forEach((site, i) => {
    const d = (site.x - point.x) ** 2 + (site.y - point.y) ** 2;
    if (d < bestDistance) {
      bestDistance = d;
      best = i;
    }
  });
  return best;
}

describe('voronoiCells', () => {
  it('gives a single centroid the whole board', () => {
    const [cell] = voronoiCells([[0.3, 0.7]], viewport);
    expect(cell.cell).toBe(0);
    expect(cell.polygon).toHaveLength(4);
    expect(area(cell.polygon)).toBeCloseTo(boardArea(), 6);
  });

  it('splits the board in half between two mirrored centroids', () => {
    const cells = voronoiCells([[0.25, 0.5], [0.75, 0.5]], viewport);
    expect(area(cells[0].polygon)).toBeCloseTo(boardArea() / 2, 6);
    expect(area(cells[1].polygon)).toBeCloseTo(boardArea() / 2, 6);
  });

  it('partitions the board — the polygons tile it with no gap or overlap', () => {
    const rng = mulberry32(19);
    const centroids = Array.from({ length: 6 }, () => [rng(), rng()]);
    const total = voronoiCells(centroids, viewport).reduce((sum, cell) => sum + area(cell.polygon), 0);
    expect(total).toBeCloseTo(boardArea(), 6);
  });

  it('puts every polygon on the side of its own centroid', () => {
    const rng = mulberry32(19);
    const centroids = Array.from({ length: 6 }, () => [rng(), rng()]);
    voronoiCells(centroids, viewport).forEach((cell) => {
      expect(cell.polygon.length, `cell ${cell.cell}`).toBeGreaterThan(2);
      // A Voronoi region is convex, so the mean of its vertices lies inside it.
      expect(nearestSite(centre(cell.polygon), centroids), `cell ${cell.cell}`).toBe(cell.cell);
    });
  });

  it('returns one entry per centroid, in cell order', () => {
    const cells = voronoiCells([[0.1, 0.1], [0.9, 0.1], [0.5, 0.9]], viewport);
    expect(cells.map((cell) => cell.cell)).toEqual([0, 1, 2]);
  });

  it('survives duplicate centroids, which k-means can produce for an empty cell', () => {
    const cells = voronoiCells([[0.5, 0.5], [0.5, 0.5]], viewport);
    expect(cells).toHaveLength(2);
    cells.forEach((cell) => expect(Number.isFinite(area(cell.polygon))).toBe(true));
  });

  it('returns nothing for no centroids', () => {
    expect(voronoiCells([], viewport)).toEqual([]);
  });
});
