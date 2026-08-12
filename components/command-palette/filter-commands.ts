import type { Command } from './commands';

export function filterCommands(commands: Command[], query: string): Command[] {
  const q = query.trim().toLowerCase();
  if (!q) return commands;
  return commands.filter((command) => command.label.toLowerCase().includes(q));
}
