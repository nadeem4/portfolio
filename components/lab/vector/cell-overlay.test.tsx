import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { CellOverlay } from './cell-overlay';
import type { Viewport } from '@/lib/lab/vector/layout';
import type { VoronoiCell } from '@/lib/lab/vector/voronoi';

// The live viewport (see vector-lab.tsx), not the 480x360 or 400x400 older
// briefs quote -- this component must not assume any particular size.
const viewport: Viewport = { width: 720, height: 520, padding: 28 };

// voronoiCells returns { x, y } polygon points, not [x, y] tuples -- matching
// lib/lab/vector/voronoi.ts's actual PolygonPoint shape here rather than the
// tuple shape an earlier brief described.
const cells: readonly VoronoiCell[] = [
  {
    cell: 0,
    polygon: [
      { x: 0, y: 0 },
      { x: 240, y: 0 },
      { x: 240, y: 480 },
      { x: 0, y: 480 },
    ],
  },
  {
    cell: 1,
    polygon: [
      { x: 240, y: 0 },
      { x: 480, y: 0 },
      { x: 480, y: 480 },
      { x: 240, y: 480 },
    ],
  },
];

describe('CellOverlay', () => {
  it('draws one polygon per cell it is given', () => {
    const { container } = render(<CellOverlay cells={cells} viewport={viewport} />);
    expect(container.querySelectorAll('polygon')).toHaveLength(2);
  });

  it('writes the polygon it is handed, without recomputing it', () => {
    // The seam the spec depends on: all the geometry is in voronoiCells, tested
    // without jsdom. This component only stringifies.
    const { container } = render(<CellOverlay cells={cells} viewport={viewport} />);
    expect(container.querySelector('polygon[data-cell="0"]')).toHaveAttribute(
      'points',
      '0,0 240,0 240,480 0,480',
    );
  });

  it('marks the probed cells apart from the skipped ones', () => {
    const { container } = render(
      <CellOverlay cells={cells} viewport={viewport} probed={new Set([1])} />,
    );
    expect(container.querySelector('polygon[data-cell="0"]')).toHaveAttribute('data-probed', 'false');
    expect(container.querySelector('polygon[data-cell="1"]')).toHaveAttribute('data-probed', 'true');
  });

  it('treats no probe set as nothing probed', () => {
    const { container } = render(<CellOverlay cells={cells} viewport={viewport} />);
    expect(container.querySelector('polygon[data-cell="1"]')).toHaveAttribute('data-probed', 'false');
  });

  it('never intercepts a pointer or an assistive-tech cursor', () => {
    // It sits over the canvas the reader clicks to add, remove and move points.
    const { container } = render(<CellOverlay cells={cells} viewport={viewport} />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).toHaveClass('pointer-events-none');
  });

  it('renders an empty layer when there are no cells', () => {
    const { container } = render(<CellOverlay cells={[]} viewport={viewport} />);
    expect(container.querySelectorAll('polygon')).toHaveLength(0);
  });

  it('does not swallow a click aimed at the canvas beneath it', () => {
    // pointer-events-none is a CSS declaration jsdom does not enforce, so this
    // asserts the actual contract: no click handler exists to consume the event.
    const { container } = render(<CellOverlay cells={cells} viewport={viewport} />);
    const svg = container.querySelector('svg');
    expect(svg?.onclick).toBeNull();
  });
});
