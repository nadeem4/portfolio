'use client';

import { useId } from 'react';

export interface ScrubberProps {
  /** Zero-based index of the step being shown. */
  index: number;
  count: number;
  /** The current step in words, e.g. "scanning point 7, distance 0.42". */
  description: string;
  onChange: (index: number) => void;
}

/** The sentence a screen reader hears, in both aria-valuetext and the live region. */
export function stepValueText(index: number, count: number, description: string): string {
  if (count === 0) return 'no steps to replay';
  return `step ${index + 1} of ${count}: ${description}`;
}

/**
 * A native range, not a custom drag surface.
 *
 * Keyboard stepping, touch targets, and not fighting the page scroll all come
 * for free from the platform control; a bespoke one is where that budget goes.
 */
export function Scrubber({ index, count, description, onChange }: ScrubberProps) {
  const id = useId();
  const disabled = count === 0;
  const valueText = stepValueText(index, count, description);

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-[0.65rem] uppercase tracking-[0.18em] text-foreground-dim">
        Replay
      </label>
      <input
        id={id}
        type="range"
        min={0}
        max={Math.max(count - 1, 0)}
        step={1}
        value={disabled ? 0 : index}
        disabled={disabled}
        aria-valuetext={valueText}
        onChange={(event) => !disabled && onChange(Number(event.target.value))}
        className="w-full accent-accent rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
      />
      {/* The valuetext is only read when the slider itself has focus. A reader
          scrubbing with the mouse gets the same sentence from here. */}
      <p role="status" aria-live="polite" className="font-mono text-xs leading-relaxed text-foreground-dim">
        {valueText}
      </p>
    </div>
  );
}
