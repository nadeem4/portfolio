import { selectedWriting } from '@/config/selected-writing';
import { getBlogPosts } from './blog';
import type { BlogPost } from './blog.types';

/**
 * Resolves post ids to posts, preserving the order of the ids.
 *
 * Curation order is the whole point, so the ids drive the result rather than
 * catalog order. Ids matching no post are skipped rather than producing holes,
 * which keeps a stale entry from breaking the page — a test catches those.
 */
export function selectPosts(posts: BlogPost[], ids: string[]): BlogPost[] {
  const byId = new Map(posts.map((post) => [post.id, post]));
  return ids.map((id) => byId.get(id)).filter((post): post is BlogPost => post !== undefined);
}

export function getSelectedPosts(): BlogPost[] {
  return selectPosts(getBlogPosts(), selectedWriting);
}
