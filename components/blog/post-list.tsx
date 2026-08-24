import type { ReactNode } from 'react';
import { Identicon } from './identicon';
import type { BlogPost } from '@/lib/blog.types';

interface PostListProps {
  heading: string;
  posts: BlogPost[];
  /** Optional control rendered opposite the heading, e.g. a link to the archive. */
  action?: ReactNode;
  /**
   * Hide the heading visually, keeping it for assistive technology.
   *
   * For a page that already names the list directly above it — a category page
   * states its topic in the h1 — where a visible heading would just repeat it.
   * The section still needs an accessible name, so the heading stays in the
   * tree rather than being dropped.
   */
  headingHidden?: boolean;
  /**
   * Whether to label each post with its topic. On by default, because most
   * lists here mix topics and the label is how you tell them apart. Turn it off
   * where the whole list is one topic and the label would repeat on every row.
   */
  showCategory?: boolean;
}

/**
 * A headed list of posts.
 *
 * Used for the homepage blocks, the search results, the archive and each
 * category page, which differ only in their heading, contents, and how much
 * context each row still needs.
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
}: PostListProps) {
  if (posts.length === 0) return null;

  return (
    <section>
      <div className="flex items-baseline justify-between gap-4">
        <h2 className={headingHidden ? 'sr-only' : 'text-sm font-bold uppercase tracking-[0.18em]'}>{heading}</h2>
        {action}
      </div>

      <ul className={headingHidden ? 'divide-y divide-border' : 'mt-4 divide-y divide-border'}>
        {posts.map((post) => (
          <li key={post.id} className="flex items-start gap-3 py-3">
            <Identicon
              id={post.id}
              className="h-8 w-8 shrink-0 rounded border border-border bg-background-raised p-1 text-accent"
            />
            <div>
              <a
                href={post.url}
                target="_blank"
                rel="noreferrer"
                className="font-medium leading-snug transition-colors hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 rounded-sm"
              >
                {post.title}
              </a>
              <p className="mt-1 text-sm leading-relaxed text-foreground-dim">{post.subtitle}</p>
              <p className="mt-1.5 text-[0.6rem] uppercase tracking-[0.14em] text-foreground-dim">
                {showCategory && (
                  <>
                    <span className="text-accent">{post.category}</span>
                    <span aria-hidden="true" className="mx-1.5 opacity-50">
                      ·
                    </span>
                  </>
                )}
                <time dateTime={post.date}>{post.date}</time>
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
