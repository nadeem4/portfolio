import Parser from 'rss-parser';
import type { MediumPost } from './medium.types';

const parser = new Parser();

const IMG_SRC_REGEX = /<img[^>]+src="([^"]+)"/i;

/**
 * Extracts the `src` of the first `<img>` tag found in a blob of HTML.
 * Returns null when there is no content, or no img tag with a src attribute.
 */
export function extractFirstImageUrl(html: string | null | undefined): string | null {
  if (!html) return null;
  const match = html.match(IMG_SRC_REGEX);
  return match ? match[1] : null;
}

export async function parseMediumFeed(xml: string): Promise<MediumPost[]> {
  const feed = await parser.parseString(xml);
  return (feed.items ?? []).map((item) => ({
    title: item.title ?? 'Untitled',
    link: item.link ?? '',
    pubDate: item.pubDate ?? '',
    categories: item.categories ?? [],
    contentSnippet: item.contentSnippet ?? '',
    imageUrl: extractFirstImageUrl(item['content:encoded']),
  }));
}

export async function fetchMediumPosts(feedUrl: string): Promise<MediumPost[]> {
  try {
    const res = await fetch(feedUrl, { next: { revalidate: 21600 }, signal: AbortSignal.timeout(5000) });
    if (!res.ok) return [];
    const xml = await res.text();
    return await parseMediumFeed(xml);
  } catch {
    return [];
  }
}
