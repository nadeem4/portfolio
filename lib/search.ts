import type { BlogPost } from './blog.types';

/**
 * Filters the catalog by a free-text query.
 *
 * The catalog is the whole blog — there is no server to ask — so search runs
 * over the same array the page already renders. At a hundred posts a linear
 * scan per keystroke is far below the threshold where an index would earn its
 * complexity.
 *
 * Terms are ANDed: typing more words narrows, which is what people expect from
 * a search box and the opposite of what an OR would do. Title, subtitle and
 * category are all searched, so a topic name works as a query and a post is
 * findable by what it is about rather than only by what it is called.
 *
 * Results keep catalog order — newest first. Relevance scoring would reorder
 * them for no clear gain when the whole result set fits on a screen.
 */
export function searchPosts(posts: BlogPost[], query: string): BlogPost[] {
  const terms = query.toLowerCase().split(/[^a-z0-9_]+/i).filter(Boolean);
  if (terms.length === 0) return posts;

  return posts.filter((post) => {
    const haystack = `${post.title} ${post.subtitle} ${post.category}`.toLowerCase();
    return terms.every((term) => haystack.includes(term));
  });
}
