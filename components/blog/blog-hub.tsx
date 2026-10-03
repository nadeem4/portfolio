'use client';

import { useId, useState, type ReactNode } from 'react';
import { searchPosts } from '@/lib/search';
import { PostList } from './post-list';
import type { BlogPost } from '@/lib/blog.types';

interface BlogHubProps {
  posts: BlogPost[];
  /** Rendered in the sidebar under the search field, e.g. the topic list. Stays put while searching. */
  sidebar?: ReactNode;
  /**
   * The browse view: series and latest. Passed in rather than rendered here so
   * it stays a server component; only the search box and its results need to
   * run on the client.
   */
  children: ReactNode;
}

/**
 * The blog's entry point: search and topics in a sidebar, browse in the main
 * column. Stacked on small screens.
 *
 * Search replaces the browse view rather than filtering in place. The question
 * "where is the post about X" is asked far more often than "show me
 * everything", and a query that quietly reordered the page behind the box
 * would leave people unsure whether they were looking at results or the
 * archive.
 *
 * The whole catalog ships to the client for this. It is a few tens of KB of
 * JSON the page already imports at build time, which buys instant results with
 * no request per keystroke and no search service to run.
 */
export function BlogHub({ posts, sidebar, children }: BlogHubProps) {
  const [query, setQuery] = useState('');
  const id = useId();
  const trimmed = query.trim();
  const searching = trimmed.length > 0;
  const results = searching ? searchPosts(posts, trimmed) : [];

  return (
    <div className="grid gap-12 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-16">
      <aside className="space-y-9">
        <div>
          <label htmlFor={`${id}-q`} className="mb-2 block font-mono text-xs text-foreground-dim">
            Search
          </label>
          <div className="flex h-11 items-center gap-2 rounded border border-border-strong bg-background px-3 focus-within:border-accent">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-4 w-4 shrink-0 text-foreground-dim"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-4-4" />
            </svg>
            <input
              id={`${id}-q`}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => event.key === 'Escape' && setQuery('')}
              aria-describedby={`${id}-hint`}
              placeholder="Titles and topics"
              className="h-full w-full min-w-0 bg-transparent text-sm text-foreground placeholder:text-foreground-dim focus:outline-none"
            />
            {searching && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="-mr-2 h-11 shrink-0 rounded px-2 text-sm text-foreground-dim transition-colors hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                Clear
              </button>
            )}
          </div>
          <p id={`${id}-hint`} className="sr-only">
            Searches all {posts.length} posts by title, summary or topic.
          </p>
        </div>
        {sidebar}
      </aside>

      <div className="min-w-0">
        {/* Counts are announced rather than only shown, so a screen reader hears
            the result set change without moving focus out of the field. */}
        <p aria-live="polite" className="sr-only">
          {searching ? `${results.length} ${results.length === 1 ? 'match' : 'matches'} for ${trimmed}` : ''}
        </p>

        {searching ? (
          results.length > 0 ? (
            <PostList heading={`${results.length} ${results.length === 1 ? 'match' : 'matches'}`} posts={results} />
          ) : (
            <p className="text-foreground-dim">
              No posts match <span className="font-mono text-foreground">{trimmed}</span>. Try a topic name, or a
              word from a title.
            </p>
          )
        ) : (
          children
        )}
      </div>
    </div>
  );
}
