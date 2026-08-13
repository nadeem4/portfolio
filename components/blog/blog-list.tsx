'use client';

import { useState } from 'react';
import type { BlogPost } from '@/lib/blog.types';
import { filterPostsByCategory, getCategories } from './filter-posts';
import { Identicon } from './identicon';

interface BlogListProps {
  posts: BlogPost[];
}

const chipClasses =
  'rounded border border-border px-3 py-1 text-xs uppercase tracking-widest font-medium text-foreground-dim transition-colors hover:border-accent hover:text-accent aria-[pressed=true]:border-accent aria-[pressed=true]:text-accent aria-[pressed=true]:bg-accent/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2';

export function BlogList({ posts }: BlogListProps) {
  const [category, setCategory] = useState<string | null>(null);

  if (posts.length === 0) {
    return <p className="text-foreground-dim leading-relaxed">Posts temporarily unavailable — check back soon.</p>;
  }

  const categories = getCategories(posts);
  const visible = filterPostsByCategory(posts, category);

  return (
    <div className="space-y-6">
      <div role="group" aria-label="Filter by category" className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setCategory(null)} aria-pressed={category === null} className={chipClasses}>
          All
        </button>
        {categories.map((c) => (
          <button key={c} type="button" onClick={() => setCategory(c)} aria-pressed={category === c} className={chipClasses}>
            {c}
          </button>
        ))}
      </div>
      <ul className="divide-y divide-border">
        {visible.map((post) => (
          <li key={post.id} className="flex items-start gap-4 py-4">
            <Identicon
              id={post.id}
              className="h-20 w-20 shrink-0 rounded border border-border bg-background-raised p-2 text-accent"
            />
            <div>
              <a
                href={post.url}
                target="_blank"
                rel="noreferrer"
                className="font-medium transition-colors hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 rounded-sm"
              >
                {post.title}
              </a>
              <p className="mt-1 text-foreground-dim leading-relaxed">{post.subtitle}</p>
              <time dateTime={post.date} className="mt-2 block text-xs uppercase tracking-widest text-foreground-dim">
                {post.date}
              </time>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
