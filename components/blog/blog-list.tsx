'use client';

import { useState } from 'react';
import type { BlogPost } from '@/lib/blog.types';
import { filterPostsByCategory } from './filter-posts';
import { CategoryCards } from './category-cards';
import { PostList } from './post-list';
import { Identicon } from './identicon';

interface BlogListProps {
  posts: BlogPost[];
  /**
   * Curated highlights, shown above the archive when no category is selected.
   *
   * Hidden while a category is active: a cross-cutting highlight reel sitting
   * above a filtered list of one category reads as noise, and the All card
   * brings it straight back.
   */
  selected?: BlogPost[];
}

export function BlogList({ posts, selected = [] }: BlogListProps) {
  const [category, setCategory] = useState<string | null>(null);

  if (posts.length === 0) {
    return <p className="text-foreground-dim leading-relaxed">Posts temporarily unavailable — check back soon.</p>;
  }

  const visible = filterPostsByCategory(posts, category);

  return (
    <div className="space-y-8">
      <CategoryCards posts={posts} selected={category} onSelect={setCategory} />

      {category === null && selected.length > 0 && <PostList heading="Selected writing" posts={selected} />}

      <div>
        <div className="flex items-baseline justify-between gap-4 pb-1">
          {/* "All posts" rather than "Latest" once highlights sit above: with a
              curated tier present, completeness is the useful distinction. */}
          <h2 className="text-[0.65rem] uppercase tracking-[0.18em] text-foreground-dim">{category ?? 'All posts'}</h2>
          <p className="text-[0.65rem] uppercase tracking-[0.18em] text-foreground-dim">
            {visible.length} {visible.length === 1 ? 'post' : 'posts'}
          </p>
        </div>

        <ul className="divide-y divide-border">
          {visible.map((post) => (
            <li key={post.id} className="flex items-start gap-3 py-3">
              <Identicon
                id={post.id}
                className="h-9 w-9 shrink-0 rounded border border-border bg-background-raised p-1 text-accent"
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
                  <span className="text-accent">{post.category}</span>
                  <span aria-hidden="true" className="mx-1.5 opacity-50">
                    ·
                  </span>
                  <time dateTime={post.date}>{post.date}</time>
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
