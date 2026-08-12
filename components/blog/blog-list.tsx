'use client';

import { useState } from 'react';
import type { MediumPost } from '@/lib/medium.types';
import { filterPostsByCategory, getCategories } from './filter-posts';

interface BlogListProps {
  posts: MediumPost[];
}

export function BlogList({ posts }: BlogListProps) {
  const [category, setCategory] = useState<string | null>(null);

  if (posts.length === 0) {
    return <p>Posts temporarily unavailable — check back soon.</p>;
  }

  const categories = getCategories(posts);
  const visible = filterPostsByCategory(posts, category);

  return (
    <div>
      <div role="group" aria-label="Filter by category">
        <button type="button" onClick={() => setCategory(null)} aria-pressed={category === null}>
          All
        </button>
        {categories.map((c) => (
          <button key={c} type="button" onClick={() => setCategory(c)} aria-pressed={category === c}>
            {c}
          </button>
        ))}
      </div>
      <ul>
        {visible.map((post) => (
          <li key={post.link}>
            <a href={post.link} target="_blank" rel="noreferrer">
              {post.title}
            </a>
            <p>{post.contentSnippet}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
