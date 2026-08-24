import { ImageResponse } from 'next/og';
import { getBlogPosts } from '@/lib/blog';
import { categoryFromSlug, categorySlugs } from '@/lib/categories';
import { categoryStats } from '@/lib/blog-stats';

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = 'image/png';
export const alt = 'Category banner';

/** Prerendered alongside the page, so the card is a static asset. */
export function generateStaticParams() {
  return categorySlugs().map((category) => ({ category }));
}

const AMBER = '#e8a33d';
const GROUND = '#0b0f14';
const TEXT = '#e6edf3';
const DIM = '#8b93a0';
const RULE = '#1c2530';

/**
 * The category's social card.
 *
 * Type only, matching the page header it accompanies — a link shared to
 * LinkedIn should look like the page it opens. Earlier versions gave each
 * category a generated colour and glyph; the colours fought the one accent the
 * site has, and the glyphs were decoration rather than information.
 *
 * This exists solely for crawlers. The page sets the same words in real type,
 * so nothing here needs to be fetched for a reader to see the header.
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
          position: 'relative',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'center',
          backgroundColor: GROUND,
          padding: '80px',
          fontFamily: 'monospace',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: '100%',
            height: 10,
            backgroundColor: AMBER,
          }}
        />

        <div style={{ display: 'flex', color: AMBER, fontSize: 34 }}>&gt; blog --category</div>
        <div
          style={{
            display: 'flex',
            color: TEXT,
            fontSize: 74,
            fontWeight: 700,
            marginTop: 22,
            maxWidth: 1000,
          }}
        >
          {category}
        </div>
        <div style={{ display: 'flex', width: 420, height: 1, backgroundColor: RULE, marginTop: 34 }} />
        <div style={{ display: 'flex', color: DIM, fontSize: 30, marginTop: 24 }}>
          {count} {count === 1 ? 'post' : 'posts'}
          {years ? `  ·  ${years}` : ''}
        </div>
      </div>
    ),
    { ...size }
  );
}
