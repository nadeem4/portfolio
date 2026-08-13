'use client';

import { categoryStats } from '@/lib/blog-stats';
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

/**
 * The blog's primary navigation and its main depth signal.
 *
 * Ordered by most recent activity, so current work leads. Each card carries its
 * post count and a bar showing weight relative to the largest category, so
 * volume stays visible without dictating position.
 */
export function CategoryCards({ posts, selected, onSelect }: CategoryCardsProps) {
  const stats = categoryStats(posts);
  if (stats.length === 0) return null;

  const highest = Math.max(...stats.map((stat) => stat.count));

  return (
    <div role="group" aria-label="Filter by category" className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
      {stats.map((stat) => {
        const isSelected = stat.category === selected;
        return (
          <button
            key={stat.category}
            type="button"
            aria-pressed={isSelected}
            onClick={() => onSelect(isSelected ? null : stat.category)}
            className={`rounded border bg-background-raised px-2.5 py-2 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 ${
              isSelected ? 'border-accent' : 'border-border hover:border-accent'
            }`}
          >
            {/* Fixed two-line height: without it, categories whose names wrap push
                their count and bar out of alignment with the cards beside them. */}
            <span className="block min-h-[1.8rem] text-[0.65rem] uppercase leading-snug tracking-wider text-foreground">
              {stat.category}
            </span>
            <span className="mt-1 block text-lg font-bold leading-none text-accent">{stat.count}</span>
            <span aria-hidden="true" className="mt-1.5 block h-0.5 rounded-sm bg-border">
              <span className="block h-full rounded-sm bg-accent" style={{ width: `${(stat.count / highest) * 100}%` }} />
            </span>
            <span className="mt-1 block text-[0.6rem] uppercase tracking-wider text-foreground-dim">
              {monthLabel(stat.latest)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
