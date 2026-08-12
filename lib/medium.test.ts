import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { parseMediumFeed, fetchMediumPosts } from './medium';

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

const EMPTY_FEED = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel><title>Empty Feed</title></channel></rss>`;

const MALFORMED_FEED = `<rss version="2.0"><channel><title>Broken`;

describe('parseMediumFeed', () => {
  it('parses posts from a valid RSS feed', async () => {
    const posts = await parseMediumFeed(VALID_FEED);
    expect(posts).toHaveLength(1);
    expect(posts[0].title).toBe('Post One');
    expect(posts[0].link).toBe('https://medium.com/@you/post-one');
    expect(posts[0].categories).toContain('Data Engineering');
  });

  it('returns an empty array for a feed with no items', async () => {
    const posts = await parseMediumFeed(EMPTY_FEED);
    expect(posts).toEqual([]);
  });

  it('throws on malformed XML', async () => {
    await expect(parseMediumFeed(MALFORMED_FEED)).rejects.toThrow();
  });
});

describe('fetchMediumPosts', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns parsed posts when the fetch succeeds', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true, text: () => Promise.resolve(VALID_FEED) } as Response);
    const posts = await fetchMediumPosts('https://medium.com/feed/@you');
    expect(posts).toHaveLength(1);
    expect(posts[0].title).toBe('Post One');
  });

  it('returns an empty array when the response is not ok', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: false, text: () => Promise.resolve('') } as Response);
    const posts = await fetchMediumPosts('https://medium.com/feed/@you');
    expect(posts).toEqual([]);
  });

  it('returns an empty array when the network request throws', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('network down'));
    const posts = await fetchMediumPosts('https://medium.com/feed/@you');
    expect(posts).toEqual([]);
  });

  it('returns an empty array when the feed XML is malformed', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true, text: () => Promise.resolve(MALFORMED_FEED) } as Response);
    const posts = await fetchMediumPosts('https://medium.com/feed/@you');
    expect(posts).toEqual([]);
  });
});
