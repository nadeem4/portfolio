import { existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Whether a resume PDF is present to link to.
 *
 * Checked rather than configured so the download reappears on its own once a
 * file is added, with no flag to remember. Evaluated at build time, which is
 * when every page that uses it is rendered.
 *
 * The previous `public/resume.pdf` was a raw LinkedIn export carrying a personal
 * mobile number, "Top Skills: Cursors, Claude Code Subagents", and a link to a
 * domain that no longer resolves. It was removed rather than shipped.
 */
export function hasResume(): boolean {
  return existsSync(join(process.cwd(), 'public', 'resume.pdf'));
}
