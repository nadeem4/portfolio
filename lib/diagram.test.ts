import { describe, it, expect } from 'vitest';
import { readDiagramSvg } from './diagram';

describe('readDiagramSvg', () => {
  it('returns the committed SVG without its source-hash comment', () => {
    const svg = readDiagramSvg('public/diagrams/cdc-v2.svg');
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).not.toContain('source-sha256');
  });
});
