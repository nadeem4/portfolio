import { describe, it, expect } from 'vitest';
import { mulberry32 } from './random';

function draw(seed: number, count: number): number[] {
  const rand = mulberry32(seed);
  return Array.from({ length: count }, () => rand());
}

describe('mulberry32', () => {
  it('produces the same sequence for the same seed', () => {
    expect(draw(20260830, 20)).toEqual(draw(20260830, 20));
  });

  it('produces a different sequence for a different seed', () => {
    expect(draw(1, 20)).not.toEqual(draw(2, 20));
  });

  it('gives each generator its own state', () => {
    const first = mulberry32(42);
    const second = mulberry32(42);

    first();
    first();

    // Advancing one generator must not advance the other, or a dataset built
    // mid-render would depend on how many other draws happened first.
    expect(second()).toBe(mulberry32(42)());
  });

  it('stays inside [0, 1)', () => {
    draw(7, 2000).forEach((value) => {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    });
  });

  it('does not repeat a value in a short run', () => {
    const values = draw(99, 500);
    expect(new Set(values).size).toBe(values.length);
  });

  it('spreads roughly uniformly over the unit interval', () => {
    const values = draw(3, 5000);
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    const belowHalf = values.filter((value) => value < 0.5).length;

    expect(mean).toBeGreaterThan(0.47);
    expect(mean).toBeLessThan(0.53);
    expect(belowHalf).toBeGreaterThan(2300);
    expect(belowHalf).toBeLessThan(2700);
  });

  it('accepts a negative seed', () => {
    const values = draw(-1, 10);
    values.forEach((value) => {
      expect(Number.isFinite(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    });
  });
});
