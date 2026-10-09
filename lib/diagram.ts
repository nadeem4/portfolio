import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Reads a committed diagram SVG (see scripts/render-diagrams.mjs) for inlining.
 * The leading source-hash comment is for the sync test, not the page.
 */
export function readDiagramSvg(path: string): string {
  return readFileSync(join(process.cwd(), path), 'utf8').replace(/^<!-- source-sha256: [0-9a-f]+ -->\r?\n/, '');
}
