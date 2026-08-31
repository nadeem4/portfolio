'use client';

import type { MouseEvent } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import type { PointId } from '@/lib/lab/vector/types';
import type { ScreenPoint, Viewport } from '@/lib/lab/vector/layout';

export type PointTone = 'idle' | 'result' | 'current';

const TONE_CLASS: Record<PointTone, string> = {
  idle: 'fill-foreground-dim',
  result: 'fill-accent',
  current: 'fill-accent stroke-foreground',
};

// Sized against the 720x520 viewBox. The wider layout enlarged the canvas
// without enlarging these, which left the points proportionally smaller than
// they were in the narrow column — the opposite of the intended effect.
const POINT_RADIUS = 6;
const QUERY_RADIUS = 14;
const RANK_OFFSET = 11;

export interface PointCanvasProps {
  /** Already positioned by `layoutPoints`. This file does no geometry. */
  screenPoints: readonly ScreenPoint[];
  viewport: Viewport;
  /** id → tone. Anything absent is idle. Classification happens upstream. */
  tones?: ReadonlyMap<PointId, PointTone>;
  /** id → zero-based rank among the current results. Drawn as 1-based labels. */
  ranks?: ReadonlyMap<PointId, number>;
  query: { x: number; y: number } | null;
  /** Describes what is drawn, for a reader who cannot see it. */
  label: string;
  onPick?: (x: number, y: number) => void;
}

/**
 * A client coordinate in viewBox units.
 *
 * The svg scales to its container, so a raw clientX means nothing until it has
 * been through the rect. jsdom lays nothing out and hands back a zero rect, so
 * that case falls back to 1:1 rather than producing NaN.
 */
export function toSvgCoords(
  rect: { left: number; top: number; width: number; height: number },
  clientX: number,
  clientY: number,
  viewport: Viewport,
): { x: number; y: number } {
  const scaleX = rect.width === 0 ? 1 : viewport.width / rect.width;
  const scaleY = rect.height === 0 ? 1 : viewport.height / rect.height;
  return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
}

export function PointCanvas({ screenPoints, viewport, tones, ranks, query, label, onPick }: PointCanvasProps) {
  const shouldReduceMotion = useReducedMotion();

  function handleClick(event: MouseEvent<SVGSVGElement>) {
    if (!onPick) return;
    const { x, y } = toSvgCoords(event.currentTarget.getBoundingClientRect(), event.clientX, event.clientY, viewport);
    onPick(x, y);
  }

  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={`0 0 ${viewport.width} ${viewport.height}`}
      onClick={handleClick}
      // touch-manipulation drops the double-tap zoom delay without taking over
      // scrolling — the canvas is tap-to-act, never a drag surface.
      className="w-full touch-manipulation rounded border border-border bg-background-raised"
    >
      {screenPoints.map((point) => {
        const tone = tones?.get(point.id) ?? 'idle';
        return (
          <circle
            key={point.id}
            data-testid="lab-point"
            data-point-id={point.id}
            data-tone={tone}
            cx={point.x}
            cy={point.y}
            r={POINT_RADIUS}
            strokeWidth={2}
            className={TONE_CLASS[tone]}
          />
        );
      })}

      {/* Rank is the product of a nearest-neighbour search, and ten identical
          dots hide it entirely. Numbering also makes an eviction legible while
          scrubbing: a label vanishing is the shortlist changing its mind. */}
      {ranks &&
        screenPoints.map((point) => {
          const rank = ranks.get(point.id);
          if (rank === undefined) return null;
          return (
            <text
              key={`rank-${point.id}`}
              data-testid="lab-rank"
              x={point.x + RANK_OFFSET}
              y={point.y - RANK_OFFSET / 2}
              className="fill-accent text-[11px] font-semibold"
            >
              {rank + 1}
            </text>
          );
        })}

      {query && (
        <motion.g
          data-testid="lab-query"
          data-motion={shouldReduceMotion ? 'reduced' : 'full'}
          initial={false}
          animate={{ x: query.x, y: query.y }}
          transition={shouldReduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 300, damping: 30 }}
        >
          {/* A crosshair, not another dot: the query and the results were both
              amber circles and ring-versus-dot did not separate them. */}
          <circle r={QUERY_RADIUS} strokeWidth={2} className="fill-none stroke-accent" />
          <line x1={-QUERY_RADIUS - 6} y1={0} x2={-4} y2={0} strokeWidth={1.5} className="stroke-accent" />
          <line x1={4} y1={0} x2={QUERY_RADIUS + 6} y2={0} strokeWidth={1.5} className="stroke-accent" />
          <line x1={0} y1={-QUERY_RADIUS - 6} x2={0} y2={-4} strokeWidth={1.5} className="stroke-accent" />
          <line x1={0} y1={4} x2={0} y2={QUERY_RADIUS + 6} strokeWidth={1.5} className="stroke-accent" />
        </motion.g>
      )}
    </svg>
  );
}
