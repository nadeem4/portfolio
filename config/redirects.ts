import blogPosts from './blog-posts.json';

/**
 * codewithnk.com used to be the Medium custom domain, so every post was served
 * at `/<slug>-<hash>`. The domain now points at this portfolio, and those old
 * links are still live in LinkedIn posts, so they have to keep resolving.
 *
 * Medium still maps the custom domain to the personal profile. While a post
 * sits on that profile, *every* Medium URL for it — `/@nadeem4-nk13/<slug>`,
 * `nadeem4-nk13.medium.com/<slug>`, even `/p/<hash>` — 301s back to
 * codewithnk.com. Forwarding one of those would be an infinite loop, so a post
 * is only safe to forward once it has moved into a publication.
 *
 * That makes this list grow on its own: as posts move into LearnWithNK and the
 * catalog is re-synced, their URLs stop being profile URLs and they start
 * getting forwarded. Posts still on the profile 404 until they move, which is
 * the same as today and strictly better than a redirect loop.
 */
const isPublicationUrl = (url: string) => /^https:\/\/medium\.com\/[^@]/.test(url);

const slugOf = (url: string) => new URL(url).pathname.split('/').pop();

export const mediumPostRedirects = blogPosts
  .filter((post) => isPublicationUrl(post.url))
  .map((post) => ({
    source: `/${slugOf(post.url)}`,
    destination: post.url,
    // Temporary on purpose: a 308 is cached by browsers indefinitely, and
    // these URLs should come home if the posts are ever hosted here.
    permanent: false,
  }));
