import { ImageResponse } from 'next/og';
import { getBlogPosts } from '@/lib/blog';
import { categoryFromSlug, categorySlugs } from '@/lib/categories';
import { categoryStats } from '@/lib/blog-stats';

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = 'image/png';
export const alt = 'Category';

/** Prerendered alongside the page, so the banner is a static asset. */
export function generateStaticParams() {
  return categorySlugs().map((category) => ({ category }));
}

/**
 * The category's banner, used both as the page header and its social card.
 *
 * Generated rather than commissioned: fourteen categories would otherwise mean
 * fourteen hand-made images to keep in sync with a list that moves whenever
 * posts are recategorised in Notion. Mirrors the palette and prompt motif of
 * the site-wide opengraph image.
 */
export default async function CategoryImage({ params }: { params: Promise<{ category: string }> }) {
  const { category: slug } = await params;
  const category = categoryFromSlug(slug) ?? 'Writing';
  const stat = categoryStats(getBlogPosts()).find((s) => s.category === category);
  const count = stat?.count ?? 0;
  const years =
    stat && stat.earliest.slice(0, 4) !== stat.latest.slice(0, 4)
      ? `${stat.earliest.slice(0, 4)}–${stat.latest.slice(0, 4)}`
      : (stat?.latest.slice(0, 4) ?? '');

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'center',
          backgroundColor: '#0b0f14',
          padding: '80px',
          fontFamily: 'monospace',
        }}
      >
        <div style={{ display: 'flex', color: '#e8a33d', fontSize: 36 }}>&gt; blog --category</div>
        <div
          style={{
            display: 'flex',
            color: '#e8a33d',
            fontSize: 76,
            fontWeight: 700,
            marginTop: 24,
          }}
        >
          {category}
        </div>
        <div style={{ display: 'flex', color: '#8b93a0', fontSize: 30, marginTop: 24 }}>
          {count} {count === 1 ? 'post' : 'posts'}
          {years ? `  ·  ${years}` : ''}
        </div>
      </div>
    ),
    { ...size }
  );
}
