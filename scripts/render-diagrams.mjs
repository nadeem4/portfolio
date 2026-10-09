#!/usr/bin/env node
/**
 * Renders every diagrams/*.mmd to public/diagrams/<name>.svg with mermaid-cli,
 * black and white, then stamps the source's sha256 into the SVG so a test can
 * tell when the committed SVG has fallen behind its source.
 *
 * Run with `npm run diagrams` after editing a .mmd file. Rendering needs a
 * headless browser, which is why it runs here and not in the Vercel build.
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const MERMAID_CLI = '@mermaid-js/mermaid-cli@11.4.2';
const src = 'diagrams';
const out = join('public', 'diagrams');
mkdirSync(out, { recursive: true });

/** Hash of the source with line endings normalised, so a CRLF checkout on Windows hashes the same. */
function sourceHash(text) {
  return createHash('sha256').update(text.split('\r\n').join('\n')).digest('hex');
}

for (const file of readdirSync(src).filter((f) => f.endsWith('.mmd'))) {
  const name = file.replace(/\.mmd$/, '');
  const target = join(out, `${name}.svg`);
  execFileSync(
    'npx',
    ['-y', MERMAID_CLI, '-i', join(src, file), '-o', target, '-c', join(src, 'mermaid.config.json'), '-b', 'transparent', '--svgId', name],
    { stdio: 'inherit', shell: process.platform === 'win32' },
  );
  const sha = sourceHash(readFileSync(join(src, file), 'utf8'));
  writeFileSync(target, `<!-- source-sha256: ${sha} -->\n${readFileSync(target, 'utf8')}`);
  console.log(`rendered ${target}`);
}
