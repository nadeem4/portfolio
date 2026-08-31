import { describe, it, expect } from 'vitest';
import { recallAtK } from './recall';
import type { Ranked } from './types';

function ranking(...ids: number[]): Ranked[] {
  return ids.map((id, index) => ({ id, distance: index * 0.1 }));
}

describe('recallAtK', () => {
  it('is one when the rankings agree', () => {
    expect(recallAtK(ranking(1, 2, 3), ranking(1, 2, 3), 3)).toBe(1);
  });

  it('is zero when the rankings share nothing', () => {
    expect(recallAtK(ranking(4, 5, 6), ranking(1, 2, 3), 3)).toBe(0);
  });

  it('reports the fraction of true neighbours found', () => {
    expect(recallAtK(ranking(1, 9, 3, 8), ranking(1, 2, 3, 4), 4)).toBe(0.5);
  });

  it('ignores the order within the top k', () => {
    expect(recallAtK(ranking(3, 1, 2), ranking(1, 2, 3), 3)).toBe(1);
  });

  it('ignores ids the index ranked below k', () => {
    // A hit at rank 5 is a miss at k=2. Counting it would flatter every index.
    expect(recallAtK(ranking(8, 9, 1, 2), ranking(1, 2), 2)).toBe(0);
  });

  it('ignores truth entries below k', () => {
    expect(recallAtK(ranking(1, 2), ranking(1, 2, 3, 4), 2)).toBe(1);
  });

  it('divides by the number of true neighbours that exist, not by k', () => {
    // Asking for 10 against a 3-point index is full recall, not 0.3.
    expect(recallAtK(ranking(1, 2, 3), ranking(1, 2, 3), 10)).toBe(1);
  });

  it('is one when there is nothing to recall', () => {
    expect(recallAtK(ranking(1, 2), [], 5)).toBe(1);
    expect(recallAtK([], [], 5)).toBe(1);
  });

  it('is zero when the index returned nothing', () => {
    expect(recallAtK([], ranking(1, 2), 2)).toBe(0);
  });
});
