import { describe, it, expect } from 'vitest';
import { mediumPostRedirects } from './redirects';
import blogPosts from './blog-posts.json';

const slugOf = (url: string) => new URL(url).pathname.split('/').pop();
const inPublication = (url: string) => !url.includes('/@');

describe('legacy Medium custom-domain redirects', () => {
  it('never targets a URL that bounces back to the old domain', () => {
    // Medium still maps codewithnk.com to the personal profile, so anything
    // under medium.com/@nadeem4-nk13 or nadeem4-nk13.medium.com 301s straight
    // back here. Forwarding to one would be an infinite loop.
    mediumPostRedirects.forEach(({ destination, source }) => {
      expect(destination, source).toMatch(/^https:\/\/medium\.com\/[^@]/);
      expect(destination, source).not.toContain('nadeem4-nk13.medium.com');
    });
  });

  it('forwards every post that already lives in a publication', () => {
    const expected = blogPosts.filter((p) => inPublication(p.url));
    expect(mediumPostRedirects).toHaveLength(expected.length);
    expected.forEach((post) => {
      const rule = mediumPostRedirects.find((r) => r.source === `/${slugOf(post.url)}`);
      expect(rule?.destination, post.title).toBe(post.url);
    });
  });

  it('skips posts still on the personal profile, which have no working URL yet', () => {
    blogPosts
      .filter((p) => !inPublication(p.url))
      .forEach((post) => {
        const slug = `/${slugOf(post.url)}`;
        expect(mediumPostRedirects.some((r) => r.source === slug), post.title).toBe(false);
      });
  });

  it('leaves the portfolio\'s own routes alone', () => {
    const sources = mediumPostRedirects.map((r) => r.source);
    ['/', '/blog', '/projects', '/live-projects', '/api/blog'].forEach((route) => {
      expect(sources).not.toContain(route);
    });
  });

  it('emits one rule per path', () => {
    const sources = mediumPostRedirects.map((r) => r.source);
    expect(new Set(sources).size).toBe(sources.length);
    sources.forEach((s) => expect(s).toMatch(/^\/[^/]+-[0-9a-f]{11,12}$/));
  });
});
