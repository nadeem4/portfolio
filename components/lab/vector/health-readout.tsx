import { useId } from 'react';

export interface HealthReadoutProps {
  pointCount: number;
  /** How many neighbours recall was measured over. */
  k: number;
  /** Fraction in 0..1, or null when no query has been asked yet. */
  recall: number | null;
}

export function formatRecall(recall: number | null): string {
  // "No query yet" and "found nothing" are different states; 0% for the first
  // would read as a broken index.
  return recall === null ? '—' : `${Math.round(recall * 100)}%`;
}

/**
 * What the index is, beside what the last operation cost.
 *
 * Recall is measured against brute-force search over the same live points, so
 * ground truth is exact and free at playground sizes.
 */
export function HealthReadout({ pointCount, k, recall }: HealthReadoutProps) {
  const headingId = useId();

  return (
    <section aria-labelledby={headingId} className="rounded border border-border bg-background-raised p-4">
      <h3 id={headingId} className="text-[0.65rem] uppercase tracking-[0.18em] text-foreground-dim">
        Index health
      </h3>
      <dl className="mt-3 grid grid-cols-2 gap-3">
        <div>
          <dt className="text-[0.6rem] uppercase tracking-[0.14em] text-foreground-dim">Points</dt>
          <dd data-testid="lab-point-count" className="mt-1 font-mono text-lg text-foreground">
            {pointCount}
          </dd>
        </div>
        <div>
          <dt className="text-[0.6rem] uppercase tracking-[0.14em] text-foreground-dim">recall@{k}</dt>
          <dd className="mt-1 font-mono text-lg text-foreground">{formatRecall(recall)}</dd>
        </div>
      </dl>
    </section>
  );
}
