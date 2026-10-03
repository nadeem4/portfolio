'use client';

export function PaletteTrigger() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent('command-palette:toggle'))}
      aria-label="Open command palette"
      className="hidden h-11 items-center gap-2 rounded border border-border px-3 text-sm text-foreground-dim transition-colors hover:border-border-strong hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 sm:inline-flex"
    >
      Jump to
      <kbd className="font-mono text-xs text-foreground-soft">Ctrl K</kbd>
    </button>
  );
}
