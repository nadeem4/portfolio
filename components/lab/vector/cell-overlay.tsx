'use client';

import type { Viewport } from '@/lib/lab/vector/layout';
import type { VoronoiCell } from '@/lib/lab/vector/voronoi';

export interface CellOverlayProps {
  cells: readonly VoronoiCell[];
  viewport: Viewport;
  /** Cell indices the current search actually looked inside. */
  probed?: ReadonlySet<number>;
}

/**
 * A layer under the point canvas rather than a group inside it: PointCanvas
 * takes no `children`, and stacking keeps that contract intact. It draws only
 * what voronoiCells computed -- the seam that lets the geometry be tested
 * without jsdom, so no coordinate is touched here beyond stringifying it.
 */
export function CellOverlay({ cells, viewport, probed }: CellOverlayProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox={`0 0 ${viewport.width} ${viewport.height}`}
      // Sits behind PointCanvas and never eats a click meant for it -- the
      // canvas is how the reader inserts, deletes and queries.
      className="pointer-events-none absolute inset-0"
    >
      {cells.map((cell) => {
        const isProbed = probed?.has(cell.cell) ?? false;
        return (
          <polygon
            key={cell.cell}
            data-cell={cell.cell}
            data-probed={isProbed ? 'true' : 'false'}
            points={cell.polygon.map((p) => `${p.x},${p.y}`).join(' ')}
            strokeWidth={1}
            className={isProbed ? 'fill-accent/15 stroke-accent' : 'fill-transparent stroke-border'}
          />
        );
      })}
    </svg>
  );
}
