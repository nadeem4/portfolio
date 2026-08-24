import { describe, it, expect } from 'vitest';
import { searchPosts } from './search';
import type { BlogPost } from './blog.types';

function post(id: string, title: string, subtitle: string, category: string): BlogPost {
  return { id, title, subtitle, url: `https://medium.com/learnwithnk/p-${id}`, date: '2026-01-01', category };
}

const posts: BlogPost[] = [
  post('a1', 'Scalable Inference with RDMA and Tiered KV Caching', 'Serving at scale', 'AI System Design'),
  post('b2', 'How Kafka Really Works', 'Lessons from 60M events a day', 'Backend & Infra'),
  post('c3', 'Postgres Logical Replication Internals', 'restart_lsn explained', 'Postgres Series'),
];

describe('searchPosts', () => {
  it('returns everything for an empty or whitespace query', () => {
    expect(searchPosts(posts, '')).toEqual(posts);
    expect(searchPosts(posts, '   ')).toEqual(posts);
  });

  it('matches the title regardless of case', () => {
    expect(searchPosts(posts, 'kafka').map((p) => p.id)).toEqual(['b2']);
    expect(searchPosts(posts, 'KAFKA').map((p) => p.id)).toEqual(['b2']);
  });

  it('matches the subtitle, so a post is findable by what it is about', () => {
    expect(searchPosts(posts, 'restart_lsn').map((p) => p.id)).toEqual(['c3']);
  });

  it('matches the category, so a topic name works as a query', () => {
    expect(searchPosts(posts, 'postgres series').map((p) => p.id)).toEqual(['c3']);
  });

  it('requires every term to match, so extra words narrow rather than widen', () => {
    expect(searchPosts(posts, 'kv caching').map((p) => p.id)).toEqual(['a1']);
    expect(searchPosts(posts, 'kafka postgres')).toEqual([]);
  });

  it('treats punctuation as a term separator, so "kv-caching" finds "KV Caching"', () => {
    expect(searchPosts(posts, 'kv-caching').map((p) => p.id)).toEqual(['a1']);
  });

  it('matches on prefixes of a word, not just whole words', () => {
    // Someone typing "replic" should reach "Replication" before finishing it.
    expect(searchPosts(posts, 'replic').map((p) => p.id)).toEqual(['c3']);
  });

  it('preserves catalog order rather than reordering by relevance', () => {
    // The catalog is already newest-first, which is the ordering people expect
    // from a blog. A relevance score would shuffle it for no clear gain.
    expect(searchPosts(posts, 'a').map((p) => p.id)).toEqual(
      posts.filter((p) => searchPosts([p], 'a').length).map((p) => p.id),
    );
  });

  it('returns nothing when a term matches no post', () => {
    expect(searchPosts(posts, 'kubernetes')).toEqual([]);
  });
});
