import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@vercel/edge-config', () => ({ get: vi.fn() }));

import { get } from '@vercel/edge-config';
import { getBlogPosts } from './blog';

const VALID_FEED = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
  <title>Example Feed</title>
  <item>
    <title>Post One</title>
    <link>https://medium.com/@you/post-one</link>
    <pubDate>Mon, 01 Jun 2026 12:00:00 GMT</pubDate>
    <category>Data Engineering</category>
    <description><![CDATA[A short summary of post one.]]></description>
  </item>
</channel></rss>`;

describe('getBlogPosts', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    vi.mocked(get).mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('fetches Medium posts and applies category overrides from Edge Config', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true, text: () => Promise.resolve(VALID_FEED) } as Response);
    vi.mocked(get).mockResolvedValue({ 'https://medium.com/@you/post-one': 'Data Engineering' });

    const posts = await getBlogPosts();

    expect(posts).toHaveLength(1);
    expect(posts[0].title).toBe('Post One');
    expect(posts[0].categories).toEqual(['Data Engineering']);
  });
});
