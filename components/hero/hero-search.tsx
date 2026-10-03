'use client';

import { useState } from 'react';
import Link from 'next/link';
import { searchPosts } from '@/lib/search';
import type { BlogPost } from '@/lib/blog.types';

const SUGGESTIONS = ['kafka', 'hnsw', 'replication slot'];
/** Results shown before handing off to the blog, so the hero stays one screen tall. */
const MAX_RESULTS = 5;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function monthYear(iso: string): string {
  const [year, month] = iso.split('-');
  return `${MONTHS[Number(month) - 1]} ${year}`;
}

const focusRing = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2';

/**
 * A working search over the post catalogue, in the hero.
 *
 * It is the homepage's signature element because it is real: the same keyword
 * search the blog uses, run in the browser over every post. It answers the
 * question a visitor with a topic in mind actually has, and it looks like the
 * retrieval tools the owner builds rather than like a marketing banner.
 */
export function HeroSearch({ posts }: { posts: BlogPost[] }) {
  const [query, setQuery] = useState('');
  const trimmed = query.trim();
  const matches = trimmed ? searchPosts(posts, trimmed) : [];

  return (
    <section
      aria-label="Search my writing"
      className="rise-in rounded-md border border-border bg-background-raised [animation-delay:80ms]"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 px-5 pt-5">
        <label htmlFor="hero-search" className="font-semibold">
          Search my writing
        </label>
        <span className="font-mono text-xs text-foreground-dim">{posts.length} posts, runs in your browser</span>
      </div>
      <div className="px-5 pb-2 pt-3">
        <input
          id="hero-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => event.key === 'Escape' && setQuery('')}
          placeholder="kafka, hnsw, replication slot"
          className={`h-11 w-full rounded border border-border-strong bg-background px-3 font-mono text-[15px] text-foreground placeholder:text-foreground-dim ${focusRing}`}
        />
        <div aria-live="polite" className="mt-1 font-mono text-xs text-foreground-dim">
          {trimmed ? (
            <p className="py-2">{`${matches.length} ${matches.length === 1 ? 'match' : 'matches'}`}</p>
          ) : (
            <p className="flex flex-wrap items-center">
              <span className="mr-1">Try</span>
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => setQuery(suggestion)}
                  className={`inline-flex min-h-11 items-center px-1.5 text-foreground underline decoration-border-strong underline-offset-4 hover:text-accent ${focusRing}`}
                >
                  {suggestion}
                </button>
              ))}
            </p>
          )}
        </div>
      </div>

      {trimmed && matches.length === 0 && (
        <p className="mx-5 border-t border-border py-3 text-sm text-foreground-dim">
          No post matches that. Try a topic, such as kafka or rag.
        </p>
      )}

      {matches.length > 0 && (
        <ol className="px-5">
          {matches.slice(0, MAX_RESULTS).map((post, index) => (
            <li key={post.id} className="rise-in border-t border-border" style={{ animationDelay: `${index * 60}ms` }}>
              <a href={post.url} target="_blank" rel="noreferrer" className={`group flex gap-3 py-3 ${focusRing}`}>
                <span className="w-4 shrink-0 font-mono text-xs text-foreground-dim">{index + 1}</span>
                <span className="min-w-0">
                  <span className="block text-[15px] font-medium leading-snug group-hover:text-accent">{post.title}</span>
                  <span className="font-mono text-xs text-foreground-dim">
                    {post.category}, {monthYear(post.date)}
                  </span>
                  <span className="sr-only"> (opens on Medium)</span>
                </span>
              </a>
            </li>
          ))}
        </ol>
      )}

      <div className="border-t border-border px-5 py-1">
        <Link href="/blog" className={`link-underline inline-flex min-h-11 items-center text-sm hover:text-accent ${focusRing}`}>
          Browse all posts
        </Link>
      </div>
    </section>
  );
}
