'use client';

import { useCallback, useId, useMemo, useState } from 'react';
import { PointCanvas, type PointTone } from './point-canvas';
import { Scrubber } from './scrubber';
import { Scoreboard } from './scoreboard';
import { HealthReadout } from './health-readout';
import { DEFAULT_K, useVectorLab } from './use-vector-lab';
import type { FlatStep } from '@/lib/lab/vector/flat';
import { hitTest, layoutPoints, toScreen, type Viewport } from '@/lib/lab/vector/layout';
import type { PointId, Ranked, Vec } from '@/lib/lab/vector/types';

// Sized for the wide layout: the canvas is the instrument, and a spatial view
// needs room. The rail beside it is a fixed 16rem rather than a fraction --
// readouts do not get more useful when stretched, and every pixel the rail
// does not take is canvas. It collapses underneath on narrow viewports.
const VIEWPORT: Viewport = { width: 720, height: 520, padding: 28 };
/** Generous enough for a fingertip; the canvas is tap-to-act on a phone. */
const HIT_RADIUS = 12;

type ClickMode = 'edit' | 'query';

const modeButtonBase =
  'rounded-sm border px-2.5 py-1.5 text-xs font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2';

const buttonClasses =
  'rounded-sm border border-border bg-background-raised px-3 py-1.5 text-[0.65rem] uppercase tracking-[0.18em] text-foreground-dim transition-colors hover:text-accent disabled:opacity-40 disabled:hover:text-foreground-dim focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2';

/**
 * The inverse of `toScreen`, obtained by probing it at two corners.
 *
 * The mapping — including the padding — belongs to `lib/layout`, so restating
 * it here would be a second copy free to drift. Two probes pin an affine map,
 * and a flipped axis falls out of the sign without a special case.
 */
export function screenToVec(viewport: Viewport, x: number, y: number): Vec {
  const origin = toScreen([0, 0], viewport);
  const unit = toScreen([1, 1], viewport);
  return [(x - origin.x) / (unit.x - origin.x), (y - origin.y) / (unit.y - origin.y)];
}

/** Which points the canvas should stand out, given where the scrubber is. */
export function tonesFor(
  steps: readonly FlatStep[],
  stepIndex: number,
  results: readonly Ranked[],
): ReadonlyMap<PointId, PointTone> {
  const tones = new Map<PointId, PointTone>();
  for (const result of results) tones.set(result.id, 'result');
  // The step under the scrubber is what the reader is looking at, so it wins
  // over the standing result set.
  const step = steps[stepIndex];
  if (step) tones.set(step.id, 'current');
  return tones;
}

export interface VectorLabProps {
  /** How many neighbours a search returns. Set from `?k=` on the page. */
  initialK?: number;
}

export function VectorLab({ initialK = DEFAULT_K }: VectorLabProps) {
  const lab = useVectorLab({ k: initialK });
  const [mode, setMode] = useState<ClickMode>('edit');
  const modeName = useId();

  const screenPoints = useMemo(() => layoutPoints(lab.points, VIEWPORT), [lab.points]);
  const tones = useMemo(
    () => tonesFor(lab.steps, lab.stepIndex, lab.results),
    [lab.steps, lab.stepIndex, lab.results],
  );
  const queryPoint = lab.query ? toScreen(lab.query, VIEWPORT) : null;
  const ranks = useMemo(
    () => new Map(lab.results.map((result, rank) => [result.id, rank])),
    [lab.results],
  );

  const handlePick = useCallback(
    (x: number, y: number) => {
      if (mode === 'query') {
        lab.search(screenToVec(VIEWPORT, x, y));
        return;
      }
      const hit = hitTest(screenPoints, x, y, HIT_RADIUS);
      if (hit === null) lab.insert(screenToVec(VIEWPORT, x, y));
      else lab.remove(hit);
    },
    [lab, mode, screenPoints],
  );

  const label =
    `${lab.points.length} points plotted on a unit square` +
    (lab.query ? ', with the query marker placed' : '') +
    (mode === 'query' ? '. Tap to move the query.' : '. Tap empty space to insert, tap a point to remove it.');

  return (
    <div data-testid="lab-shell" className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_16rem]">
      <div className="space-y-3">
        <PointCanvas
          screenPoints={screenPoints}
          viewport={VIEWPORT}
          tones={tones}
          ranks={ranks}
          query={queryPoint}
          label={label}
          onPick={handlePick}
        />

        <Scrubber
          index={lab.stepIndex}
          count={lab.steps.length}
          description={lab.stepDescription}
          onChange={lab.setStepIndex}
        />

        {/* The narration is the teaching mechanism, so it is set at reading size
            directly under the canvas rather than as a caption on the slider. */}
        <p data-testid="lab-narration" className="text-sm leading-relaxed text-foreground">
          {lab.steps.length === 0 ? (
            <span className="text-foreground-dim">
              Switch to <strong className="text-foreground">Move the query</strong> and tap the canvas to run a search.
            </span>
          ) : (
            lab.stepDescription
          )}
        </p>
      </div>

      <div className="space-y-4">
        {/* Segmented buttons rather than radios: two small radios above a large
            canvas are easy to miss, and the pressed state reads at a glance. */}
        <div>
          <p id={modeName} className="mb-2 text-[0.65rem] uppercase tracking-[0.18em] text-foreground-dim">
            Tapping the canvas
          </p>
          <div role="group" aria-labelledby={modeName} className="flex flex-wrap gap-1.5">
            {(
              [
                ['edit', 'Add or remove points'],
                ['query', 'Move the query'],
              ] as const
            ).map(([value, text]) => (
              <button
                key={value}
                type="button"
                aria-pressed={mode === value}
                onClick={() => setMode(value)}
                className={
                  mode === value
                    ? `${modeButtonBase} border-accent bg-accent text-background`
                    : `${modeButtonBase} border-border bg-background-raised text-foreground-dim hover:text-accent`
                }
              >
                {text}
              </button>
            ))}
          </div>
        </div>

        <Scoreboard counters={lab.counters} previous={lab.previousCounters ?? undefined} />
        <HealthReadout pointCount={lab.points.length} k={lab.k} recall={lab.recall} />

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={lab.undo} disabled={!lab.canUndo} className={buttonClasses}>
            Undo
          </button>
          <button type="button" onClick={lab.reset} className={buttonClasses}>
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}
