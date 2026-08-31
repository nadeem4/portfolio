import type { Metric, Vec } from './types';

/**
 * Every metric here returns a value where SMALLER MEANS NEARER.
 *
 * That is the whole reason `cosineDistance` and `dotDistance` exist as
 * distances rather than as similarities: one comparator then orders results
 * under all three, so no index has to know which metric it is ranking by.
 */

export function euclidean(a: Vec, b: Vec): number {
  let sum = 0;
  for (let i = 0; i < a.length; i += 1) {
    const delta = a[i] - b[i];
    sum += delta * delta;
  }
  return Math.sqrt(sum);
}

function dotProduct(a: Vec, b: Vec): number {
  let sum = 0;
  for (let i = 0; i < a.length; i += 1) {
    sum += a[i] * b[i];
  }
  return sum;
}

/** `1 - cosineSimilarity`, so the range is 0 (aligned) to 2 (opposed). */
export function cosineDistance(a: Vec, b: Vec): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  // A zero vector has no direction, so cosine is genuinely undefined here.
  // Reporting the maximum distance keeps the ordering total; NaN would make
  // every comparison against it false and quietly corrupt the ranking.
  if (denominator === 0) {
    return 1;
  }

  return 1 - dot / denominator;
}

/** `-dot`. Unnormalised, so magnitude counts — that is the point of it. */
export function dotDistance(a: Vec, b: Vec): number {
  return -dotProduct(a, b);
}

/** Dispatch by metric name. */
export function distance(a: Vec, b: Vec, metric: Metric): number {
  switch (metric) {
    case 'euclidean':
      return euclidean(a, b);
    case 'cosine':
      return cosineDistance(a, b);
    case 'dot':
      return dotDistance(a, b);
  }
}
