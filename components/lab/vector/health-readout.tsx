import { Fragment, useId } from 'react';

export interface HealthRow {
  label: string;
  value: string;
  /**
   * DOM hook for one row's value. Optional and index-agnostic: only
   * `vector-lab.tsx` knows that a sibling test locates the point count this
   * way, so this component just forwards whatever it is given.
   */
  testId?: string;
}

export interface HealthReadoutProps {
  rows: readonly HealthRow[];
}

/**
 * Kept here rather than folded into `HealthReadout` itself: formatting a
 * fraction as a rounded percentage is a decision about what recall MEANS, and
 * only a caller building a row knows that. "No query yet" and "found nothing"
 * are different states; 0% for the first would read as a broken index.
 */
export function formatRecall(recall: number | null): string {
  return recall === null ? '—' : `${Math.round(recall * 100)}%`;
}

/**
 * Index-agnostic on purpose. Each index type contributes different rows and the
 * only thing they share is "a named number", so the caller formats and this
 * renders. A component that knew about cell balance would need widening again
 * for every index the lab grows.
 *
 * Wrapped in a `<section>` (rather than a bare `<dl>`) so the block keeps an
 * implicit ARIA "region" role, which `vector-lab.test.tsx` already queries by.
 */
export function HealthReadout({ rows }: HealthReadoutProps) {
  const headingId = useId();

  return (
    <section aria-labelledby={headingId} className="rounded border border-border bg-background-raised p-4">
      <h3 id={headingId} className="text-[0.65rem] uppercase tracking-[0.18em] text-foreground-dim">
        Index health
      </h3>
      <dl className="mt-3 grid grid-cols-2 gap-3">
        {rows.map((row) => (
          <div key={row.label}>
            <dt className="text-[0.6rem] uppercase tracking-[0.14em] text-foreground-dim">{row.label}</dt>
            <dd data-testid={row.testId} className="mt-1 font-mono text-lg text-foreground">
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
