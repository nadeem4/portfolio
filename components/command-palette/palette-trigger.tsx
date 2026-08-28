'use client';

export function PaletteTrigger() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent('command-palette:toggle'))}
      aria-label="Open command palette"
      className="rounded border border-border px-2 py-1 text-xs uppercase tracking-widest font-medium text-foreground-dim transition-colors hover:border-accent hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
    >
      ⌘K
    </button>
  );
}
