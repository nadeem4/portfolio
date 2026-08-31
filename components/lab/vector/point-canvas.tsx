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

const POINT_RADIUS = 4;
const QUERY_RADIUS = 9;

export interface PointCanvasProps {
  /** Already positioned by `layoutPoints`. This file does no geometry. */
  screenPoints: readonly ScreenPoint[];
  viewport: Viewport;
  /** id → tone. Anything absent is idle. Classification happens upstream. */
  tones?: ReadonlyMap<PointId, PointTone>;
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

export function PointCanvas({ screenPoints, viewport, tones, query, label, onPick }: PointCanvasProps) {
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

      {query && (
        <motion.g
          data-testid="lab-query"
          data-motion={shouldReduceMotion ? 'reduced' : 'full'}
          initial={false}
          animate={{ x: query.x, y: query.y }}
          transition={shouldReduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 300, damping: 30 }}
        >
          <circle r={QUERY_RADIUS} strokeWidth={2} className="fill-none stroke-accent" />
          <circle r={2} className="fill-accent" />
        </motion.g>
      )}
    </svg>
  );
}
