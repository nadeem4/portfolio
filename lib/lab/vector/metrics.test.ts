import { describe, it, expect } from 'vitest';
import { euclidean, cosineDistance, dotDistance, distance } from './metrics';

describe('euclidean', () => {
  it('is zero for identical vectors', () => {
    expect(euclidean([0.3, 0.7], [0.3, 0.7])).toBe(0);
  });

  it('measures a 3-4-5 triangle', () => {
    expect(euclidean([0, 0], [3, 4])).toBeCloseTo(5, 10);
  });

  it('is symmetric', () => {
    expect(euclidean([0.1, 0.9], [0.8, 0.2])).toBeCloseTo(euclidean([0.8, 0.2], [0.1, 0.9]), 12);
  });

  it('grows with separation, so smaller means nearer', () => {
    expect(euclidean([0, 0], [0.1, 0])).toBeLessThan(euclidean([0, 0], [0.2, 0]));
  });
});

describe('cosineDistance', () => {
  it('is zero for vectors pointing the same way', () => {
    expect(cosineDistance([1, 0], [1, 0])).toBeCloseTo(0, 12);
  });

  it('ignores magnitude', () => {
    expect(cosineDistance([1, 1], [5, 5])).toBeCloseTo(0, 12);
  });

  it('is one for orthogonal vectors', () => {
    expect(cosineDistance([1, 0], [0, 1])).toBeCloseTo(1, 12);
  });

  it('is two for opposed vectors', () => {
    expect(cosineDistance([1, 0], [-1, 0])).toBeCloseTo(2, 12);
  });

  it('reports maximum distance rather than NaN against a zero vector', () => {
    // A zero vector has no direction. Returning NaN would make the ranking
    // comparator non-total and silently scramble the result list.
    expect(cosineDistance([0, 0], [1, 0])).toBe(1);
    expect(cosineDistance([0, 0], [0, 0])).toBe(1);
  });
});

describe('dotDistance', () => {
  it('negates the dot product', () => {
    expect(dotDistance([1, 2], [3, 4])).toBeCloseTo(-11, 10);
  });

  it('orders a larger dot product as nearer', () => {
    expect(dotDistance([1, 0], [2, 0])).toBeLessThan(dotDistance([1, 0], [1, 0]));
  });

  it('rewards magnitude where cosine does not', () => {
    expect(dotDistance([1, 0], [5, 0])).toBeLessThan(dotDistance([1, 0], [1, 0]));
    expect(cosineDistance([1, 0], [5, 0])).toBeCloseTo(cosineDistance([1, 0], [1, 0]), 12);
  });
});

describe('distance', () => {
  const a: readonly number[] = [0.2, 0.9];
  const b: readonly number[] = [0.7, 0.1];

  it('dispatches to euclidean', () => {
    expect(distance(a, b, 'euclidean')).toBe(euclidean(a, b));
  });

  it('dispatches to cosine', () => {
    expect(distance(a, b, 'cosine')).toBe(cosineDistance(a, b));
  });

  it('dispatches to dot', () => {
    expect(distance(a, b, 'dot')).toBe(dotDistance(a, b));
  });

  it('ranks nearer points lower under every metric', () => {
    const near: readonly number[] = [1, 0.1];
    const far: readonly number[] = [0.1, 1];
    const query: readonly number[] = [1, 0];

    (['euclidean', 'cosine', 'dot'] as const).forEach((metric) => {
      expect(distance(query, near, metric), metric).toBeLessThan(distance(query, far, metric));
    });
  });
});
