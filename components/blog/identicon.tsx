import { IDENTICON_SIZE, identiconCells } from '@/lib/identicon';

interface IdenticonProps {
  /** Post id — the seed. The same id always renders the same mark. */
  id: string;
  className?: string;
}

/** viewBox units per cell, leaving a 1-unit gutter so cells read as distinct blocks. */
const CELL = 10;
const GAP = 1;
const EXTENT = IDENTICON_SIZE * CELL;

/**
 * Renders a post's identicon.
 *
 * Decorative only — the post title sits beside it and carries the meaning — so it
 * is hidden from assistive technology. Fill is `currentColor`, so the mark picks
 * up the accent colour from CSS and adapts to the light theme without a second palette.
 */
export function Identicon({ id, className }: IdenticonProps) {
  const cells = identiconCells(id);

  return (
    <svg
      viewBox={`0 0 ${EXTENT} ${EXTENT}`}
      className={className}
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      {cells.map((row, r) =>
        row.map((on, c) =>
          on ? (
            <rect
              key={`${r}-${c}`}
              x={c * CELL + GAP / 2}
              y={r * CELL + GAP / 2}
              width={CELL - GAP}
              height={CELL - GAP}
              rx={0.8}
            />
          ) : null,
        ),
      )}
    </svg>
  );
}
