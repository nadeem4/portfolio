import { ImageResponse } from 'next/og';
import { getBlogPosts } from '@/lib/blog';
import { categoryFromSlug, categorySlugs } from '@/lib/categories';
import { categoryStats } from '@/lib/blog-stats';
import { categoryArt } from '@/lib/category-art';

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = 'image/png';
export const alt = 'Category banner';

/** Prerendered alongside the page, so the banner is a static asset. */
export function generateStaticParams() {
  return categorySlugs().map((category) => ({ category }));
}

/** Brand amber. Held constant across categories as the one fixed anchor. */
const BRAND = '#e8a33d';
const GROUND = '#0b0f14';
const DIM = '#8b93a0';

const CELL = 62;

/**
 * The category's banner, used both as the page header and its social card.
 *
 * Generated rather than commissioned: fourteen categories would otherwise mean
 * fourteen hand-made images to keep in sync with a list that moves whenever
 * posts are recategorised in Notion.
 *
 * Each category derives its own accent and glyph from its name, so the banners
 * are distinguishable at a glance instead of being one template with the text
 * swapped. The prompt line stays brand amber in every one of them, so the set
 * still reads as a family.
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

  const { accent, cells } = categoryArt(category);

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
        {/* The category's glyph, bled off the right edge as texture rather than
            an icon — it carries the distinction the hue alone cannot. */}
        <div
          style={{
            position: 'absolute',
            top: 92,
            right: -78,
            display: 'flex',
            flexDirection: 'column',
            opacity: 0.17,
          }}
        >
          {cells.map((row, r) => (
            <div key={r} style={{ display: 'flex' }}>
              {row.map((on, c) => (
                <div
                  key={`${r}-${c}`}
                  style={{
                    width: CELL,
                    height: CELL,
                    backgroundColor: on ? accent : 'transparent',
                  }}
                />
              ))}
            </div>
          ))}
        </div>

        {/* Full-bleed rule in the category's accent, so the colour registers
            even when the name is short. */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: '100%',
            height: 10,
            backgroundColor: accent,
          }}
        />

        <div style={{ display: 'flex', color: BRAND, fontSize: 34 }}>&gt; blog --category</div>
        <div
          style={{
            display: 'flex',
            color: accent,
            fontSize: 74,
            fontWeight: 700,
            marginTop: 22,
            maxWidth: 900,
          }}
        >
          {category}
        </div>
        <div style={{ display: 'flex', color: DIM, fontSize: 30, marginTop: 24 }}>
          {count} {count === 1 ? 'post' : 'posts'}
          {years ? `  ·  ${years}` : ''}
        </div>
      </div>
    ),
    { ...size }
  );
}
