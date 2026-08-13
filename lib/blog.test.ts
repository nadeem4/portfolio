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

const OUT_OF_ORDER_FEED = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
  <title>Example Feed</title>
  <item>
    <title>Older Post</title>
    <link>https://medium.com/@you/older-post</link>
    <pubDate>Mon, 01 Jun 2026 12:00:00 GMT</pubDate>
    <description><![CDATA[Older.]]></description>
  </item>
  <item>
    <title>Newest Post</title>
    <link>https://medium.com/@you/newest-post</link>
    <pubDate>Wed, 12 Aug 2026 15:47:58 GMT</pubDate>
    <description><![CDATA[Newest.]]></description>
  </item>
  <item>
    <title>Middle Post</title>
    <link>https://medium.com/@you/middle-post</link>
    <pubDate>Thu, 15 Jul 2026 09:00:00 GMT</pubDate>
    <description><![CDATA[Middle.]]></description>
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

  it('returns posts sorted newest-first by pubDate, regardless of feed order', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true, text: () => Promise.resolve(OUT_OF_ORDER_FEED) } as Response);

    const posts = await getBlogPosts();

    expect(posts.map((post) => post.title)).toEqual(['Newest Post', 'Middle Post', 'Older Post']);
  });
});
