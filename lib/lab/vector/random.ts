/**
 * mulberry32, inline.
 *
 * Every visitor sees the same picture and every test is reproducible, so
 * `Math.random` is banned throughout `lib/lab` — a seeded generator is the only
 * source of randomness. Mulberry32 is five lines and passes enough of the
 * statistical bar for scattering points on a canvas, which is cheaper than
 * taking a dependency for it.
 *
 * The seed is coerced with `>>> 0` so a negative or fractional seed still lands
 * on a valid 32-bit state rather than poisoning the arithmetic.
 */
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
