import { describe, it, expect } from 'vitest';
import { makeDataset, DEFAULT_DATASET, type DatasetOptions } from './dataset';
import { euclidean } from './metrics';
import type { Point, Vec } from './types';

const OPTIONS: DatasetOptions = { seed: 7, clusters: 4, perCluster: 40, spread: 0.04, straddlers: 4 };

function centroidOf(points: readonly Point[]): Vec {
  const x = points.reduce((sum, point) => sum + point.vec[0], 0) / points.length;
  const y = points.reduce((sum, point) => sum + point.vec[1], 0) / points.length;
  return [x, y];
}

/** Empirical centroids, so the assertions never depend on how centres are placed. */
function clusterCentroids(points: readonly Point[], options: DatasetOptions): Vec[] {
  return Array.from({ length: options.clusters }, (_unused, cluster) =>
    centroidOf(points.slice(cluster * options.perCluster, (cluster + 1) * options.perCluster)),
  );
}

function straddlersOf(points: readonly Point[], options: DatasetOptions): readonly Point[] {
  return points.slice(options.clusters * options.perCluster);
}

describe('makeDataset', () => {
  it('produces one point per cluster member plus one per straddler', () => {
    expect(makeDataset(OPTIONS)).toHaveLength(OPTIONS.clusters * OPTIONS.perCluster + OPTIONS.straddlers);
  });

  it('numbers ids sequentially from zero', () => {
    const points = makeDataset(OPTIONS);
    expect(points.map((point) => point.id)).toEqual(points.map((_unused, index) => index));
  });

  it('keeps every coordinate inside the unit square', () => {
    makeDataset(OPTIONS).forEach((point) => {
      expect(point.vec).toHaveLength(2);
      point.vec.forEach((component) => {
        expect(component).toBeGreaterThanOrEqual(0);
        expect(component).toBeLessThanOrEqual(1);
      });
    });
  });

  it('is reproducible for a given seed', () => {
    expect(makeDataset(OPTIONS)).toEqual(makeDataset(OPTIONS));
  });

  it('changes with the seed', () => {
    expect(makeDataset(OPTIONS)).not.toEqual(makeDataset({ ...OPTIONS, seed: OPTIONS.seed + 1 }));
  });

  it('builds clusters that are tight relative to their separation', () => {
    const points = makeDataset(OPTIONS);
    const centroids = clusterCentroids(points, OPTIONS);

    const radii = points.slice(0, OPTIONS.clusters * OPTIONS.perCluster).map((point, index) =>
      euclidean(point.vec, centroids[Math.floor(index / OPTIONS.perCluster)]),
    );
    const meanRadius = radii.reduce((sum, radius) => sum + radius, 0) / radii.length;

    const separations = centroids.flatMap((a, i) =>
      centroids.slice(i + 1).map((b) => euclidean(a, b)),
    );

    expect(meanRadius).toBeLessThan(0.25 * Math.min(...separations));
  });

  it('strands every straddler between exactly two cluster centres', () => {
    // This is the lab's central teaching claim in embryo: PR 2 asserts that IVF
    // at nprobe=1 misses these points, which is only meaningful if they really
    // do sit on a boundary rather than inside a cell.
    const points = makeDataset(OPTIONS);
    const centroids = clusterCentroids(points, OPTIONS);

    straddlersOf(points, OPTIONS).forEach((straddler) => {
      const sorted = centroids.map((centroid) => euclidean(straddler.vec, centroid)).sort((a, b) => a - b);

      // Roughly equidistant from its two nearest clusters. The tolerance is
      // loose because the centroids are measured from sampled members, which
      // wobble; the far-cluster assertion below is what makes the claim sharp.
      expect((sorted[1] - sorted[0]) / sorted[0]).toBeLessThan(0.3);
      expect(sorted[2] / sorted[0]).toBeGreaterThan(1.8);
    });
  });

  it('places straddlers well outside the cluster cores', () => {
    const points = makeDataset(OPTIONS);
    const centroids = clusterCentroids(points, OPTIONS);

    const radii = points.slice(0, OPTIONS.clusters * OPTIONS.perCluster).map((point, index) =>
      euclidean(point.vec, centroids[Math.floor(index / OPTIONS.perCluster)]),
    );
    const meanRadius = radii.reduce((sum, radius) => sum + radius, 0) / radii.length;

    straddlersOf(points, OPTIONS).forEach((straddler) => {
      const nearest = Math.min(...centroids.map((centroid) => euclidean(straddler.vec, centroid)));
      expect(nearest).toBeGreaterThan(3 * meanRadius);
    });
  });

  it('omits straddlers when there is no boundary to straddle', () => {
    const points = makeDataset({ ...OPTIONS, clusters: 1, straddlers: 5 });
    expect(points).toHaveLength(OPTIONS.perCluster);
  });
});

describe('DEFAULT_DATASET', () => {
  it('is adversarial by default rather than by opt-in', () => {
    expect(DEFAULT_DATASET.clusters).toBeGreaterThanOrEqual(2);
    expect(DEFAULT_DATASET.straddlers).toBeGreaterThan(0);
  });

  it('is a playground-sized dataset', () => {
    const points = makeDataset(DEFAULT_DATASET);
    expect(points.length).toBeGreaterThan(50);
    expect(points.length).toBeLessThan(500);
  });

  it('strands its straddlers on boundaries too', () => {
    const points = makeDataset(DEFAULT_DATASET);
    const centroids = clusterCentroids(points, DEFAULT_DATASET);

    straddlersOf(points, DEFAULT_DATASET).forEach((straddler) => {
      const sorted = centroids.map((centroid) => euclidean(straddler.vec, centroid)).sort((a, b) => a - b);
      expect((sorted[1] - sorted[0]) / sorted[0]).toBeLessThan(0.3);
    });
  });
});
