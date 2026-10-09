import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { cdcDiagram } from './cdc-diagram';

const source = readFileSync(join(process.cwd(), cdcDiagram.source), 'utf8');
const svg = readFileSync(join(process.cwd(), cdcDiagram.svg), 'utf8');
const nodeIds = [...source.matchAll(/^\s{2}(\w+)[[({]/gm)].map((m) => m[1]);

describe('cdcDiagram', () => {
  it('reads the nodes from the Mermaid source', () => {
    expect(nodeIds).toEqual(['pg', 'ps', 'dbz', 'kafka', 'xf', 'sf', 'sfapi', 'dl', 'lake']);
  });

  it('gives every node a guarantee, and names no node the source lacks', () => {
    expect(Object.keys(cdcDiagram.nodes).sort()).toEqual([...nodeIds].sort());
  });

  it.each(Object.entries(cdcDiagram.nodes))('%s has a name and a one-sentence-or-two guarantee without em dashes', (_, node) => {
    expect(node.name.length).toBeGreaterThan(2);
    expect(node.guarantee.length).toBeGreaterThan(30);
    expect(`${node.name} ${node.guarantee}`).not.toMatch(/—/);
  });

  it('keeps the committed SVG in sync with its source (run `npm run diagrams` after editing the .mmd)', () => {
    // Line endings are normalised, as the render script does, so a CRLF checkout on Windows hashes the same.
    const sha = createHash('sha256').update(source.split('\r\n').join('\n')).digest('hex');
    expect(svg.startsWith(`<!-- source-sha256: ${sha} -->`)).toBe(true);
  });

  it('renders each node under the id the component looks it up by', () => {
    nodeIds.forEach((id) => expect(svg).toContain(`id="${cdcDiagram.svgId}-flowchart-${id}-`));
  });

  it('states 60M+ as a month-end peak and links the CDC series', () => {
    expect(cdcDiagram.caption).toMatch(/60M\+ row changes a day at month-end peak/);
    expect(cdcDiagram.seriesUrl).toMatch(/^https:\/\/medium\.com\/learnwithnk\//);
  });
});
