import catalog from '@/config/blog-posts.json';
import type { BlogPost } from './blog.types';

/**
 * The blog catalog, generated from Notion and committed to the repo.
 *
 * Medium's RSS feed caps at ten items against ninety-two published posts, so the
 * feed is not used at all — this file is the whole source. Because it is imported
 * at build time rather than fetched, a malformed catalog fails the build instead
 * of silently rendering an empty blog page in production.
 *
 * Already ordered newest-first (ties broken by id) by the sync job, so there is
 * nothing to sort at runtime.
 */
export function getBlogPosts(): BlogPost[] {
  return catalog;
}
