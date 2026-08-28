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
    // The header's PaletteTrigger lives in a separate client tree, so it
    // reaches this dialog through a window event rather than shared state.
    function handleToggle() {
      setOpen((prev) => !prev);
    }
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('command-palette:toggle', handleToggle);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('command-palette:toggle', handleToggle);
    };
  }, []);

  if (!open) return null;

  const results = filterCommands(commands, query);

  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      label="Command palette"
      shouldFilter={false}
      overlayClassName="fixed inset-0 z-40 bg-black/60"
      contentClassName="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-lg border border-accent/50 bg-background-raised shadow-2xl"
    >
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <span aria-hidden="true" className="text-accent">
          ❯
        </span>
        <Command.Input
          value={query}
          onValueChange={setQuery}
          placeholder="Jump to..."
          className="w-full bg-transparent text-sm text-foreground placeholder:text-foreground-dim outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 rounded-sm"
        />
      </div>
      <Command.List className="max-h-80 overflow-y-auto p-2">
        <Command.Empty className="px-3 py-2 text-sm text-foreground-dim">No results found.</Command.Empty>
        {results.map((command) => (
          <Command.Item
            key={command.id}
            onSelect={() => {
              window.location.href = command.href;
              setOpen(false);
            }}
            className="cursor-pointer rounded px-3 py-2 text-sm text-foreground transition-colors data-[selected=true]:bg-accent/10 data-[selected=true]:text-accent"
          >
            {command.label}
          </Command.Item>
        ))}
      </Command.List>
    </Command.Dialog>
  );
}
