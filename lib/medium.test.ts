import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { parseMediumFeed, fetchMediumPosts, extractFirstImageUrl } from './medium';

const COVER_IMAGE_URL = 'https://cdn-images-1.medium.com/max/1024/0*AcIcpqWcW3KLlqS0';

const VALID_FEED = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/"><channel>
  <title>Example Feed</title>
  <item>
    <title>Post One</title>
    <link>https://medium.com/@you/post-one</link>
    <pubDate>Mon, 01 Jun 2026 12:00:00 GMT</pubDate>
    <category>Data Engineering</category>
    <description><![CDATA[A short summary of post one.]]></description>
    <content:encoded><![CDATA[<figure><img alt="" src="${COVER_IMAGE_URL}" /><figcaption>Photo by <a href="https://example.com">Thomas Foster</a> on <a href="https://example.com">Unsplash</a></figcaption></figure><p>The last post walked through...</p>]]></content:encoded>
  </item>
</channel></rss>`;

const NO_IMAGE_FEED = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/"><channel>
  <title>Example Feed</title>
  <item>
    <title>Text Only Post</title>
    <link>https://medium.com/@you/text-only-post</link>
    <pubDate>Mon, 01 Jun 2026 12:00:00 GMT</pubDate>
    <description><![CDATA[A short summary.]]></description>
    <content:encoded><![CDATA[<p>Just words, no pictures here.</p>]]></content:encoded>
  </item>
</channel></rss>`;

const NO_CONTENT_ENCODED_FEED = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
  <title>Example Feed</title>
  <item>
    <title>No Content Field Post</title>
    <link>https://medium.com/@you/no-content-field-post</link>
    <pubDate>Mon, 01 Jun 2026 12:00:00 GMT</pubDate>
    <description><![CDATA[A short summary.]]></description>
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
    expect(posts[0].imageUrl).toBe(COVER_IMAGE_URL);
  });

  it('sets imageUrl to null when the post content has no img tag', async () => {
    const posts = await parseMediumFeed(NO_IMAGE_FEED);
    expect(posts).toHaveLength(1);
    expect(posts[0].imageUrl).toBeNull();
  });

  it('sets imageUrl to null when the post has no content:encoded field at all', async () => {
    const posts = await parseMediumFeed(NO_CONTENT_ENCODED_FEED);
    expect(posts).toHaveLength(1);
    expect(posts[0].imageUrl).toBeNull();
  });

  it('returns an empty array for a feed with no items', async () => {
    const posts = await parseMediumFeed(EMPTY_FEED);
    expect(posts).toEqual([]);
  });

  it('throws on malformed XML', async () => {
    await expect(parseMediumFeed(MALFORMED_FEED)).rejects.toThrow();
  });
});

describe('extractFirstImageUrl', () => {
  it('extracts the src of the first img tag', () => {
    const html = '<figure><img alt="" src="https://cdn.example.com/first.png" /></figure>';
    expect(extractFirstImageUrl(html)).toBe('https://cdn.example.com/first.png');
  });

  it('returns the first image url when multiple img tags are present', () => {
    const html = '<img src="https://cdn.example.com/first.png"><p>text</p><img src="https://cdn.example.com/second.png">';
    expect(extractFirstImageUrl(html)).toBe('https://cdn.example.com/first.png');
  });

  it('returns null when there is no img tag', () => {
    expect(extractFirstImageUrl('<p>Just words, no pictures here.</p>')).toBeNull();
  });

  it('returns null for an img tag with no src attribute', () => {
    expect(extractFirstImageUrl('<img alt="broken" />')).toBeNull();
  });

  it('returns null for an empty string', () => {
    expect(extractFirstImageUrl('')).toBeNull();
  });

  it('returns null for null or undefined input', () => {
    expect(extractFirstImageUrl(null)).toBeNull();
    expect(extractFirstImageUrl(undefined)).toBeNull();
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
