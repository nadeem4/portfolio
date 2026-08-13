'use client';

import { catalogStats, categoryStats } from '@/lib/blog-stats';
import type { BlogPost } from '@/lib/blog.types';

interface CategoryCardsProps {
  posts: BlogPost[];
  selected: string | null;
  onSelect: (category: string | null) => void;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Formats an ISO date as "Aug 2026".
 *
 * Built from the string rather than a Date: parsing `2026-08-01` yields UTC
 * midnight, which a negative-offset locale renders as the previous month.
 */
function monthLabel(iso: string): string {
  const [year, month] = iso.split('-');
  return `${MONTHS[Number(month) - 1]} ${year}`;
}

interface CardProps {
  label: string;
  count: number;
  /** Bar width as a percentage of the largest category. */
  weight: number;
  meta: string;
  isSelected: boolean;
  onClick: () => void;
}

function Card({ label, count, weight, meta, isSelected, onClick }: CardProps) {
  return (
    <button
      type="button"
      aria-pressed={isSelected}
      onClick={onClick}
      className={`rounded border bg-background-raised px-2.5 py-2 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 ${
        isSelected ? 'border-accent' : 'border-border hover:border-accent'
      }`}
    >
      {/* Fixed two-line height: without it, labels that wrap push their count
          and bar out of alignment with the cards beside them. */}
      <span className="block min-h-[1.8rem] text-[0.65rem] uppercase leading-snug tracking-wider text-foreground">
        {label}
      </span>
      <span className="mt-1 block text-lg font-bold leading-none text-accent">{count}</span>
      <span aria-hidden="true" className="mt-1.5 block h-0.5 rounded-sm bg-border">
        <span className="block h-full rounded-sm bg-accent" style={{ width: `${weight}%` }} />
      </span>
      <span className="mt-1 block text-[0.6rem] uppercase tracking-wider text-foreground-dim">{meta}</span>
    </button>
  );
}

/**
 * The blog's primary navigation and its main depth signal.
 *
 * Categories are ordered by most recent activity, so current work leads. Each
 * card carries its post count and a bar showing weight relative to the largest
 * category, so volume stays visible without dictating position.
 *
 * The "All" bar is the way back to the unfiltered list. It is always present
 * rather than appearing only once a filter is active: an earlier version relied
 * on a small dim text link beside the list heading, which read as a label
 * rather than a control and left people stuck inside a category.
 *
 * It sits above the grid rather than inside it. With twelve categories, All as
 * a thirteenth card left an orphan on the final row at every breakpoint —
 * thirteen is prime, so it tiles evenly at no column count. Twelve divides
 * cleanly by two, three, and four. Keeping All out also stops it reading as a
 * category, which it isn't. It carries only the total; the masthead above
 * already states the year range.
 */
export function CategoryCards({ posts, selected, onSelect }: CategoryCardsProps) {
  const stats = categoryStats(posts);
  const summary = catalogStats(posts);
  if (stats.length === 0 || !summary) return null;

  const highest = Math.max(...stats.map((stat) => stat.count));
  const showingAll = selected === null;

  return (
    <div role="group" aria-label="Filter by category" className="space-y-2">
      <button
        type="button"
        aria-pressed={showingAll}
        onClick={() => onSelect(null)}
        className={`flex w-full items-center justify-between rounded border bg-background-raised px-2.5 py-2.5 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 ${
          showingAll ? 'border-accent' : 'border-border hover:border-accent'
        }`}
      >
        <span className="text-[0.65rem] uppercase tracking-wider text-foreground">All</span>
        <span className="text-base font-bold leading-none text-accent">{summary.total}</span>
      </button>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card
            key={stat.category}
            label={stat.category}
            count={stat.count}
            weight={(stat.count / highest) * 100}
            meta={monthLabel(stat.latest)}
            isSelected={stat.category === selected}
            onClick={() => onSelect(stat.category === selected ? null : stat.category)}
          />
        ))}
      </div>
    </div>
  );
}
