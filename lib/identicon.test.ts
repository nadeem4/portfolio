import { describe, it, expect } from 'vitest';
import { IDENTICON_SIZE, identiconCells } from './identicon';

// Real ids from the catalog, so distinctness is proven against the data we ship.
const REAL_IDS = [
  'bdb4bd9cf398',
  '3b5bf9705c59',
  '8081ced8f765',
  'a74a5a51f353',
  '39042bde73e7',
  '764a0d3f4e2f',
  'c1ccda17c54',
];

function render(cells: boolean[][]): string {
  return cells.map((row) => row.map((on) => (on ? '#' : '.')).join('')).join('\n');
}

describe('identiconCells', () => {
  it('returns a square grid of the declared size', () => {
    const cells = identiconCells('bdb4bd9cf398');
    expect(cells).toHaveLength(IDENTICON_SIZE);
    for (const row of cells) {
      expect(row).toHaveLength(IDENTICON_SIZE);
    }
  });

  it('is deterministic — the same id always produces the same grid', () => {
    for (const id of REAL_IDS) {
      expect(identiconCells(id)).toEqual(identiconCells(id));
    }
  });

  it('produces a distinct grid for every real catalog id', () => {
    const seen = new Set(REAL_IDS.map((id) => render(identiconCells(id))));
    expect(seen.size).toBe(REAL_IDS.length);
  });

  it('is horizontally symmetric', () => {
    for (const id of REAL_IDS) {
      for (const row of identiconCells(id)) {
        for (let c = 0; c < IDENTICON_SIZE; c++) {
          expect(row[c]).toBe(row[IDENTICON_SIZE - 1 - c]);
        }
      }
    }
  });

  it('lights some but not all cells, so the mark reads as a pattern', () => {
    for (const id of REAL_IDS) {
      const lit = identiconCells(id).flat().filter(Boolean).length;
      expect(lit).toBeGreaterThan(0);
      expect(lit).toBeLessThan(IDENTICON_SIZE * IDENTICON_SIZE);
    }
  });

  it('never throws on empty, short, or non-hex input', () => {
    for (const junk of ['', 'z', 'not-hex-at-all', '   ', '💥']) {
      expect(() => identiconCells(junk)).not.toThrow();
      expect(identiconCells(junk)).toHaveLength(IDENTICON_SIZE);
    }
  });

  it('ignores case and surrounding whitespace in the id', () => {
    expect(identiconCells('BDB4BD9CF398')).toEqual(identiconCells('bdb4bd9cf398'));
  });

  it('treats an id as its hex content, so a full URL seeds like the bare id', () => {
    // Guards against a caller accidentally passing a URL; it must not throw.
    expect(() => identiconCells('https://medium.com/@you/post-bdb4bd9cf398')).not.toThrow();
  });

  // Golden test. Locks the generated art so a refactor of the PRNG or seeding
  // cannot silently change every mark on the site. If this fails, the change was
  // either deliberate — regenerate it — or an accidental visual regression.
  it('renders a stable pattern for a known id', () => {
    expect(render(identiconCells('bdb4bd9cf398'))).toMatchInlineSnapshot(`
      "..#.#..
      .#.#.#.
      #..#..#
      .#.#.#.
      ..#.#..
      ..#.#..
      #.#.#.#"
    `);
  });
});
