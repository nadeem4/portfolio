import type { Ranked } from './types';

/**
 * Fraction of truth's top-k ids present in got's top-k. Range 0..1.
 *
 * The denominator is how many true neighbours actually exist, not k: asking for
 * ten neighbours from a three-point index is full recall, and scoring it 0.3
 * would make the health readout drop every time the reader deletes points.
 *
 * Both lists are truncated to k first, so an id the index ranked twentieth does
 * not count as a hit at k=10.
 */
export function recallAtK(got: readonly Ranked[], truth: readonly Ranked[], k: number): number {
  const wanted = truth.slice(0, k);
  if (wanted.length === 0) {
    return 1;
  }

  const found = new Set(got.slice(0, k).map((ranked) => ranked.id));
  const hits = wanted.filter((ranked) => found.has(ranked.id)).length;
  return hits / wanted.length;
}
