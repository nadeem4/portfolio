import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/config/blog-categories.json', () => ({
  default: { 'https://medium.com/@you/post-one': 'Data Engineering' },
}));

import { getBlogPosts } from './blog';

const VALID_FEED = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
  <title>Example Feed</title>
  <item>
    <title>Post One</title>
    <link>https://medium.com/@you/post-one</link>
    <pubDate>Mon, 01 Jun 2026 12:00:00 GMT</pubDate>
    <category>Some Medium Tag</category>
    <description><![CDATA[A short summary of post one.]]></description>
  </item>
  <item>
    <title>Post Two</title>
    <link>https://medium.com/@you/post-two</link>
    <pubDate>Mon, 01 Jun 2026 12:00:00 GMT</pubDate>
    <category>Another Tag</category>
    <description><![CDATA[A short summary of post two.]]></description>
  </item>
</channel></rss>`;

describe('getBlogPosts', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('fetches Medium posts and assigns categories from the config file', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true, text: () => Promise.resolve(VALID_FEED) } as Response);

    const posts = await getBlogPosts();

    expect(posts).toHaveLength(2);
    expect(posts[0].title).toBe('Post One');
    expect(posts[0].categories).toEqual(['Data Engineering']);
  });

  it('assigns "Uncategorized" when a post has no matching entry in the config file', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true, text: () => Promise.resolve(VALID_FEED) } as Response);

    const posts = await getBlogPosts();

    expect(posts[1].title).toBe('Post Two');
    expect(posts[1].categories).toEqual(['Uncategorized']);
  });
});
