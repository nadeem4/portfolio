import { describe, it, expect } from 'vitest';
import { filterCommands } from './filter-commands';
import type { Command } from './commands';

const commands: Command[] = [
  { id: 'blog', label: 'Go to Blog', href: '/blog' },
  { id: 'resume', label: 'Open Resume', href: '/resume.pdf' },
];

describe('filterCommands', () => {
  it('returns every command for an empty query', () => {
    expect(filterCommands(commands, '')).toEqual(commands);
  });

  it('matches labels case-insensitively by substring', () => {
    expect(filterCommands(commands, 'RESUME')).toEqual([commands[1]]);
  });

  it('returns an empty array when nothing matches', () => {
    expect(filterCommands(commands, 'zzz')).toEqual([]);
  });
});
