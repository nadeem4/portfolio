import Parser from 'rss-parser';
import type { MediumPost } from './medium.types';

const parser = new Parser();

export async function parseMediumFeed(xml: string): Promise<MediumPost[]> {
  const feed = await parser.parseString(xml);
  return (feed.items ?? []).map((item) => ({
    title: item.title ?? 'Untitled',
    link: item.link ?? '',
    pubDate: item.pubDate ?? '',
    categories: item.categories ?? [],
    contentSnippet: item.contentSnippet ?? '',
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
