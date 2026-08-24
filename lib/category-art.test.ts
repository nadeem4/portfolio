import { describe, it, expect } from 'vitest';
import { categoryArt, GLYPH_SIZE } from './category-art';
import { getBlogPosts } from './blog';

const categories = [...new Set(getBlogPosts().map((p) => p.category))];

describe('categoryArt', () => {
  it('is deterministic — the same name always yields the same art', () => {
    expect(categoryArt('Vector Databases')).toEqual(categoryArt('Vector Databases'));
  });

  it('keeps a glyph stable regardless of what else is in the catalog', () => {
    // The glyph is seeded by name alone, so only the hue moves with the set.
    const a = categoryArt('Postgres Series', ['Postgres Series', 'Other']);
    const b = categoryArt('Postgres Series', ['Another', 'Postgres Series', 'Third']);
    expect(b.cells).toEqual(a.cells);
  });

  it('spaces hues far enough apart to tell two categories apart by eye', () => {
    // Regression: hashing the name to a hue put five categories inside a
    // thirty-degree band and left two 1 degree apart. Unique as hex strings,
    // identical to an eye — which is what the banners are actually for.
    const hues = categories.map((c) => categoryArt(c).hue).sort((a, b) => a - b);
    const gaps = hues.slice(1).map((h, i) => h - hues[i]);
    expect(Math.min(...gaps)).toBeGreaterThanOrEqual(20);
  });

  it('produces a valid hex accent for every category in the catalog', () => {
    categories.forEach((category) => {
      expect(categoryArt(category).accent, category).toMatch(/^#[0-9a-f]{6}$/);
    });
  });

  it('gives every category in the catalog its own accent', () => {
    const accents = categories.map((c) => categoryArt(c).accent);
    expect(new Set(accents).size).toBe(categories.length);
  });

  it('gives every category in the catalog its own glyph', () => {
    const glyphs = categories.map((c) => JSON.stringify(categoryArt(c).cells));
    expect(new Set(glyphs).size).toBe(categories.length);
  });

  it('mirrors the glyph, so it reads as a deliberate mark rather than static', () => {
    categories.forEach((category) => {
      categoryArt(category).cells.forEach((row) => {
        for (let c = 0; c < GLYPH_SIZE; c++) {
          expect(row[c], category).toBe(row[GLYPH_SIZE - 1 - c]);
        }
      });
    });
  });

  it('never renders a glyph that is entirely on or entirely off', () => {
    categories.forEach((category) => {
      const flat = categoryArt(category).cells.flat();
      expect(flat.some(Boolean), `${category} all-off`).toBe(true);
      expect(flat.every(Boolean), `${category} all-on`).toBe(false);
    });
  });

  it('still yields valid art for an empty name', () => {
    const art = categoryArt('   ');
    expect(art.accent).toMatch(/^#[0-9a-f]{6}$/);
    expect(art.cells).toHaveLength(GLYPH_SIZE);
  });
});
