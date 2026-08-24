'use client';

import { useState, type ReactNode } from 'react';
import { searchPosts } from '@/lib/search';
import { PostList } from './post-list';
import type { BlogPost } from '@/lib/blog.types';

interface BlogHubProps {
  posts: BlogPost[];
  /**
   * The browse view — topic nav, highlights, latest. Passed in rather than
   * rendered here so it stays a server component; only the search box and its
   * results need to run on the client.
   */
  children: ReactNode;
}

/**
 * The blog's entry point: search on top, browse underneath.
 *
 * Search replaces the browse view rather than filtering in place. With a
 * hundred posts across fourteen topics, the question "where is the post about
 * X" is asked far more often than "show me everything", and a query that
 * quietly reordered the page behind the box would leave people unsure whether
 * they were looking at results or the archive.
 *
 * The whole catalog ships to the client for this. It is roughly 25KB of JSON
 * the page already imports at build time, which buys instant results with no
 * request per keystroke and no search service to run.
 */
export function BlogHub({ posts, children }: BlogHubProps) {
  const [query, setQuery] = useState('');
  const trimmed = query.trim();
  const searching = trimmed.length > 0;
  const results = searching ? searchPosts(posts, trimmed) : [];

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-2.5 rounded border border-border bg-background-raised px-3 py-2.5 focus-within:border-accent">
        <span aria-hidden="true" className="font-mono text-sm text-accent">
          &gt;
        </span>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => event.key === 'Escape' && setQuery('')}
          aria-label={`Search ${posts.length} posts by title, summary or topic`}
          placeholder="search titles and topics"
          className="w-full bg-transparent font-mono text-sm text-foreground placeholder:text-foreground-dim focus:outline-none"
        />
        {searching && (
          <button
            type="button"
            onClick={() => setQuery('')}
            className="shrink-0 font-mono text-[0.6rem] uppercase tracking-[0.14em] text-foreground-dim transition-colors hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 rounded-sm"
          >
            Clear
          </button>
        )}
      </div>

      {/* Counts are announced rather than only shown, so a screen reader hears
          the result set change without moving focus out of the field. */}
      <p aria-live="polite" className="sr-only">
        {searching ? `${results.length} ${results.length === 1 ? 'match' : 'matches'} for ${trimmed}` : ''}
      </p>

      {searching ? (
        results.length > 0 ? (
          <PostList heading={`${results.length} ${results.length === 1 ? 'match' : 'matches'}`} posts={results} />
        ) : (
          <p className="leading-relaxed text-foreground-dim">
            No posts match <span className="font-mono text-foreground">{trimmed}</span>. Try a topic name, or a
            word from a title.
          </p>
        )
      ) : (
        children
      )}
    </div>
  );
}
