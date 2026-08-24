import Link from 'next/link';
import { catalogStats, categoryStats } from '@/lib/blog-stats';
import { categorySlug } from '@/lib/categories';
import type { BlogPost } from '@/lib/blog.types';

interface CategoryCardsProps {
  posts: BlogPost[];
  /** Category whose page is currently showing, if any. Marks that card current. */
  active?: string | null;
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

const cardClass = (isCurrent: boolean) =>
  `rounded border bg-background-raised px-2.5 py-2 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 ${
    isCurrent ? 'border-accent' : 'border-border hover:border-accent'
  }`;

interface CardProps {
  label: string;
  count: number;
  /** Bar width as a percentage of the largest category. */
  weight: number;
  meta: string;
  href: string;
  isCurrent: boolean;
}

function Card({ label, count, weight, meta, href, isCurrent }: CardProps) {
  return (
    <Link href={href} aria-current={isCurrent ? 'page' : undefined} className={`block ${cardClass(isCurrent)}`}>
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
    </Link>
  );
}

/**
 * The blog's primary navigation and its main depth signal.
 *
 * Categories are ordered by most recent activity, so current work leads. Each
 * card carries its post count and a bar showing weight relative to the largest
 * category, so volume stays visible without dictating position.
 *
 * The cards are links to per-category pages rather than in-page filters. The
 * filter had no URL, so a topic could not be shared, linked from a talk, or
 * indexed — and the catalog had grown well past the point where one page was a
 * comfortable way to browse it.
 *
 * The "All" card is the way back to the unfiltered archive. It is always
 * present rather than appearing only once a category is open: an earlier
 * version relied on a small dim text link beside the list heading, which read
 * as a label rather than a control and left people stuck inside a category.
 *
 * It sits above the grid rather than inside it, for two reasons. All is not a
 * category, so presenting it as one of the cards misrepresents it. And adding a
 * card to the grid perturbs how the categories tile — when this was written
 * there were twelve, and a thirteenth card orphaned a single item on the final
 * row at every breakpoint. The category count is data and moves as posts are
 * recategorised, so the layout should not depend on any particular value of it.
 *
 * It carries only the total; the masthead above already states the year range.
 */
export function CategoryCards({ posts, active = null }: CategoryCardsProps) {
  const stats = categoryStats(posts);
  const summary = catalogStats(posts);
  if (stats.length === 0 || !summary) return null;

  const highest = Math.max(...stats.map((stat) => stat.count));
  const showingAll = active === null;

  return (
    <nav aria-label="Blog categories" className="space-y-2">
      <Link
        href="/blog"
        aria-current={showingAll ? 'page' : undefined}
        className={`flex w-full items-center justify-between rounded border bg-background-raised px-2.5 py-2.5 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 ${
          showingAll ? 'border-accent' : 'border-border hover:border-accent'
        }`}
      >
        <span className="text-[0.65rem] uppercase tracking-wider text-foreground">All</span>
        <span className="text-base font-bold leading-none text-accent">{summary.total}</span>
      </Link>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card
            key={stat.category}
            label={stat.category}
            count={stat.count}
            weight={(stat.count / highest) * 100}
            meta={monthLabel(stat.latest)}
            href={`/blog/${categorySlug(stat.category)}`}
            isCurrent={stat.category === active}
          />
        ))}
      </div>
    </nav>
  );
}
