import { useId } from 'react';
import type { Counters } from '@/lib/lab/vector/types';

/**
 * Counter keys are each index's own vocabulary, so this is a lookup rather than
 * a transform — an unlabelled key still has to appear, spelled as it is.
 */
const COUNTER_LABELS: Record<string, string> = {
  distanceComputations: 'Distance computations',
  pointsScanned: 'Points scanned',
};

export function counterLabel(key: string): string {
  return COUNTER_LABELS[key] ?? key;
}

export interface ScoreboardProps {
  counters: Counters;
  /** The previous operation's counters, when there was one, for the delta. */
  previous?: Counters;
}

/** What the last operation cost. DOM text, never painted into the canvas. */
export function Scoreboard({ counters, previous }: ScoreboardProps) {
  const headingId = useId();
  const entries = Object.entries(counters);

  return (
    <section
      aria-labelledby={headingId}
      className="rounded border border-border bg-background-raised p-4"
    >
      <h3 id={headingId} className="text-[0.65rem] uppercase tracking-[0.18em] text-foreground-dim">
        Cost of the last operation
      </h3>
      {entries.length === 0 ? (
        <p className="mt-3 text-sm leading-relaxed text-foreground-dim">No operation has run yet.</p>
      ) : (
        <dl className="mt-3 grid grid-cols-2 gap-3">
          {entries.map(([key, value]) => (
            <div key={key}>
              <dt className="text-[0.6rem] uppercase tracking-[0.14em] text-foreground-dim">{counterLabel(key)}</dt>
              <dd className="mt-1 flex items-baseline gap-2 font-mono text-lg text-foreground">
                {value}
                {/* The movement, not just the level: inserting ten points costs
                    ten more distance computations, and that is the whole lesson
                    of a flat index stated as a number. */}
                {(() => {
                  const before = previous?.[key];
                  if (before === undefined || before === value) return null;
                  const delta = value - before;
                  return (
                    <span className="text-xs text-accent">
                      {delta > 0 ? `+${delta}` : `${delta}`}
                    </span>
                  );
                })()}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}
