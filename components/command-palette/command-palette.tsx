'use client';

import { useEffect, useState } from 'react';
import { Command } from 'cmdk';
import { commands } from './commands';
import { filterCommands } from './filter-commands';

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
      if (event.key === 'Escape') {
        setOpen(false);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!open) return null;

  const results = filterCommands(commands, query);

  return (
    <Command.Dialog open={open} onOpenChange={setOpen} label="Command palette" shouldFilter={false}>
      <Command.Input value={query} onValueChange={setQuery} placeholder="Jump to..." />
      <Command.List>
        <Command.Empty>No results found.</Command.Empty>
        {results.map((command) => (
          <Command.Item
            key={command.id}
            onSelect={() => {
              window.location.href = command.href;
              setOpen(false);
            }}
          >
            {command.label}
          </Command.Item>
        ))}
      </Command.List>
    </Command.Dialog>
  );
}
