/**
 * Deterministic identicons for blog posts.
 *
 * Medium posts have no cover image once the RSS feed is out of the pipeline, so
 * each post draws its own mark instead. The seed is the post's hex id, which is
 * stable across Medium slug rewrites and publication moves — so a post's mark
 * never changes, even when its title or URL does.
 *
 * Pure by design: no DOM, no JSX, no unseeded randomness. Rendering lives in
 * `components/blog/identicon.tsx`.
 */

export const IDENTICON_SIZE = 7;

/** Columns generated before mirroring. Column 3 is the axis and mirrors onto itself. */
const HALF = 4;

/** Proportion of cells left dark. Tuned so marks read as patterns, not noise or blocks. */
const THRESHOLD = 0.47;

/** Seed used when an id carries no hex at all, so junk input still yields a valid mark. */
const FALLBACK = 'fallback';

/** FNV-1a over the id's hex content. Small, stable, and dependency-free. */
function seedFrom(id: string): number {
  const hex = id.toLowerCase().replace(/[^0-9a-f]/g, '');
  const source = hex.length > 0 ? hex : FALLBACK;
  let seed = 0x811c9dc5;
  for (let i = 0; i < source.length; i++) {
    seed ^= source.charCodeAt(i);
    seed = Math.imul(seed, 0x01000193);
  }
  return seed >>> 0;
}

/** mulberry32 — a compact seeded PRNG. Same seed, same sequence, every time. */
function mulberry32(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Builds the identicon grid for a post id.
 *
 * Only the left half is generated; it is mirrored onto the right so the mark is
 * symmetric and reads as a deliberate glyph rather than static.
 */
export function identiconCells(id: string): boolean[][] {
  const next = mulberry32(seedFrom(id));
  const rows: boolean[][] = [];

  for (let r = 0; r < IDENTICON_SIZE; r++) {
    const row = new Array<boolean>(IDENTICON_SIZE).fill(false);
    for (let c = 0; c < HALF; c++) {
      const on = next() > THRESHOLD;
      row[c] = on;
      row[IDENTICON_SIZE - 1 - c] = on;
    }
    rows.push(row);
  }

  return rows;
}
