/**
 * Deterministic banner art for a blog category.
 *
 * Every category page carries a generated banner. Built from the same template
 * they were indistinguishable at a glance, so each category derives its own
 * accent colour and glyph — the trick `lib/identicon.ts` already uses for
 * posts, applied to a category name instead of a post id.
 *
 * The glyph is seeded from the category name alone, so it never changes. The
 * hue cannot work that way: hashing a name to a hue put five of the fourteen
 * categories inside a thirty-degree band and left two one degree apart, which
 * is unique as a hex string and indistinguishable to an eye. Hues are therefore
 * spaced evenly around the wheel by the category's position in the sorted list,
 * which guarantees the widest possible separation for however many exist.
 *
 * The cost is that adding or removing a category re-spaces the others. Sorting
 * by name rather than recency at least keeps that to catalog edits: publishing
 * a post never moves a category, only introducing a new one does.
 *
 * Pure by design: no DOM, no JSX, no unseeded randomness.
 */

import { allCategories } from './categories';

export const GLYPH_SIZE = 7;

/** Columns generated before mirroring. The last is the axis and mirrors onto itself. */
const HALF = 4;

/** Proportion of cells left dark. Tuned so glyphs read as patterns, not noise or blocks. */
const THRESHOLD = 0.5;

/** Seed used for an empty name, so junk input still yields valid art. */
const FALLBACK = 'category';

/**
 * Fixed saturation and lightness.
 *
 * Every hue is legible on the near-black banner ground at these values, which
 * is what makes it safe to take the hue straight from the hash rather than
 * curating a palette by hand.
 */
const SATURATION = 0.62;
const LIGHTNESS = 0.62;

/** FNV-1a over the whole name. Small, stable, and dependency-free. */
function seedFrom(name: string): number {
  const source = name.trim().toLowerCase() || FALLBACK;
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
 * HSL to a hex string.
 *
 * Emitted as hex rather than an `hsl()` string because this is consumed by
 * satori inside `next/og`, and hex is the form it parses most predictably.
 */
function hslToHex(hue: number, saturation: number, lightness: number): string {
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const secondary = chroma * (1 - Math.abs(((hue / 60) % 2) - 1));
  const match = lightness - chroma / 2;

  const [r, g, b] = (
    hue < 60
      ? [chroma, secondary, 0]
      : hue < 120
        ? [secondary, chroma, 0]
        : hue < 180
          ? [0, chroma, secondary]
          : hue < 240
            ? [0, secondary, chroma]
            : hue < 300
              ? [secondary, 0, chroma]
              : [chroma, 0, secondary]
  ).map((channel) =>
    Math.round((channel + match) * 255)
      .toString(16)
      .padStart(2, '0'),
  );

  return `#${r}${g}${b}`;
}

export interface CategoryArt {
  /** Hue in degrees, evenly spaced against the other categories. */
  hue: number;
  /** Accent hex, legible on the dark banner ground. */
  accent: string;
  /** Mirrored glyph grid, drawn large and faint behind the label. */
  cells: boolean[][];
}

/**
 * @param categories The set to space this category's hue against. Defaults to
 * the whole catalog; passed explicitly only by tests.
 */
export function categoryArt(category: string, categories: string[] = allCategories()): CategoryArt {
  const seed = seedFrom(category);
  const next = mulberry32(seed);

  // Unknown names sort to the end rather than colliding with the first entry.
  const index = categories.indexOf(category);
  const total = Math.max(categories.length, 1);
  const hue = ((index < 0 ? total : index) * 360) / total;
  const cells: boolean[][] = [];

  for (let r = 0; r < GLYPH_SIZE; r++) {
    const row = new Array<boolean>(GLYPH_SIZE).fill(false);
    for (let c = 0; c < HALF; c++) {
      const on = next() > THRESHOLD;
      row[c] = on;
      row[GLYPH_SIZE - 1 - c] = on;
    }
    cells.push(row);
  }

  return { hue, accent: hslToHex(hue, SATURATION, LIGHTNESS), cells };
}
