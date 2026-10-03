import type { ReactNode } from 'react';
import { formatMonthYear } from '@/lib/blog-stats';
import type { BlogPost } from '@/lib/blog.types';

interface PostListProps {
  heading: string;
  posts: BlogPost[];
  /** Optional control rendered opposite the heading, e.g. a link to the archive. */
  action?: ReactNode;
  /**
   * Hide the heading visually, keeping it for assistive technology.
   *
   * For a page that already names the list directly above it, where a visible
   * heading would just repeat it. The section still needs an accessible name,
   * so the heading stays in the tree rather than being dropped.
   */
  headingHidden?: boolean;
  /**
   * Whether to label each post with its topic. On by default, because most
   * lists here mix topics and the label is how you tell them apart. Turn it off
   * where the whole list is one topic and the label would repeat on every row.
   */
  showCategory?: boolean;
  /**
   * Drop the subtitle, leaving title and meta only.
   *
   * For a list that sits directly under another full-format one, where a
   * second run of identical rows reads as a duplicate rather than a second
   * answer.
   */
  compact?: boolean;
}

/**
 * A headed list of posts in hairline rows: title, optional subtitle, and a mono
 * meta line reading "Category, Mon YYYY".
 *
 * Used for the homepage blocks and the hub's search results.
 *
 * Context lines come from each post's own subtitle rather than a parallel set of
 * hand-written blurbs, so they cannot drift out of sync with the catalog.
 */
export function PostList({
  heading,
  posts,
  action,
  headingHidden = false,
  showCategory = true,
  compact = false,
}: PostListProps) {
  if (posts.length === 0) return null;

  return (
    <section>
      <div className="flex items-center justify-between gap-4">
        <h2 className={headingHidden ? 'sr-only' : 'font-mono text-sm font-medium text-foreground-dim'}>{heading}</h2>
        {action}
      </div>

      <ul className={headingHidden ? 'border-b border-border' : 'mt-3 border-b border-border'}>
        {posts.map((post) => (
          <li key={post.id} className="border-t border-border py-4">
            {/* Every post lives on Medium, so each of these leaves the site.
                The arrow says so before the click; the hidden text says so to
                a screen reader, which otherwise gets no warning at all. */}
            <a
              href={post.url}
              target="_blank"
              rel="noreferrer"
              className="-my-3 block rounded py-3 text-base font-medium leading-snug text-foreground transition-colors hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              {post.title}
              <span aria-hidden="true" className="ml-1 text-foreground-dim">
                ↗
              </span>
              <span className="sr-only"> (opens on Medium)</span>
            </a>
            {!compact && <p className="mt-1 text-sm leading-relaxed text-foreground-dim">{post.subtitle}</p>}
            <p className="mt-1.5 font-mono text-xs text-foreground-dim">
              {showCategory && (
                <>
                  <span>{post.category}</span>,{' '}
                </>
              )}
              <time dateTime={post.date}>{formatMonthYear(post.date)}</time>
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
