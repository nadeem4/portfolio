# SEO / Polish Batch — Implementation Report

Branch: `feature-seo-polish` (worktree `C:\portfolio\.claude\worktrees\portfolio-polish`)

## 1. Favicon — `app/icon.tsx`

Uses `ImageResponse` from `next/og` at the App Router `app/icon.tsx` convention.
32x32 PNG, dark background `#0b0f14` matching `--background`, amber `#e8a33d`
`>_` glyph (monospace prompt cursor), centered — kept intentionally minimal given
favicon-size constraints. `size = { width: 32, height: 32 }`,
`contentType = 'image/png'`.

## 2. OpenGraph image — `app/opengraph-image.tsx`

1200x630 PNG via `ImageResponse`. Dark background `#0b0f14`, a small `> whoami`
prompt line in accent amber, `siteConfig.name` large and bold in accent amber,
`siteConfig.role` below it in dimmed gray (`#8b93a0`), all in a
flex-column/flex layout with inline styles only (no Tailwind classes — Satori,
which powers `ImageResponse`, doesn't have access to the app's compiled
Tailwind CSS, so this file intentionally hand-rolls plain inline styles that
mirror the site's CSS variable values). `size = { width: 1200, height: 630 }`,
`contentType = 'image/png'`.

## 3. `app/sitemap.ts`

Returns a `MetadataRoute.Sitemap` covering `/`, `/blog`, `/projects`,
`/live-projects`, using `getSiteUrl()` from the new `lib/site-url.ts` helper
for the base URL. `/` gets `priority: 1`, `changeFrequency: 'monthly'`;
`/blog` and `/projects` get `priority: 0.7`, `changeFrequency: 'daily'`
(content changes there); `/live-projects` gets `priority: 0.7`,
`changeFrequency: 'monthly'`.

## 4. `app/robots.ts`

Returns a `MetadataRoute.Robots` allowing all crawlers on all paths
(`userAgent: '*', allow: '/'`) and pointing `sitemap` at
`${getSiteUrl()}/sitemap.xml`.

## 5. Base URL / `metadataBase` — `lib/site-url.ts`

Extracted a single shared helper, `getSiteUrl()`, used by `app/layout.tsx`
(`metadataBase`), `app/sitemap.ts`, and `app/robots.ts`:

```ts
export function getSiteUrl(): string {
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return 'http://localhost:3000';
}
```

`VERCEL_PROJECT_PRODUCTION_URL` (stable production domain) is checked before
the more general `VERCEL_URL` (which changes per-deployment, e.g. on preview
deployments), so production metadata/sitemap/robots always point at the
canonical domain once one exists, while preview deployments still get a
correct (if deployment-specific) URL. Falls back to `http://localhost:3000`
for local dev — this matches the value observed in local
`sitemap.xml`/`robots.txt` output even though the dev server actually ran on
port 3001/3002 in this environment (port 3000 was occupied by another
process); that's expected, since the helper is a static fallback constant, not
a request-derived value, and there's no real production domain configured yet
per the task context.

Covered by `lib/site-url.test.ts` (3 tests, written first / red-green TDD):
no-env fallback, `VERCEL_PROJECT_PRODUCTION_URL` precedence over `VERCEL_URL`,
and `VERCEL_URL`-only fallback.

`app/layout.tsx` now sets `metadataBase: new URL(getSiteUrl())` in the
existing `metadata` export.

## 6. Footer "Built with" badge

Added a second line to `components/layout/footer.tsx`:

```tsx
<footer className="border-t border-border px-6 py-8 text-xs uppercase tracking-widest font-medium text-foreground-dim">
  <div>{new Date().getFullYear()} {siteConfig.name}</div>
  <div className="mt-2">Built with Next.js, TypeScript, and Vercel</div>
</footer>
```

Both lines inherit the footer's existing utility classes (`text-xs uppercase
tracking-widest font-medium text-foreground-dim`) unchanged — no new classes
invented, just an `mt-2` spacer on the new line. Plain text, no icon library.

## 7. Vercel Analytics

`npm install @vercel/analytics` (added to `package.json`/`package-lock.json`).
Added `<Analytics />` from `@vercel/analytics/next` inside `<body>` in
`app/layout.tsx`, alongside the existing `ThemeProvider`/`Header`/children/
`Footer`/`CommandPalette` tree. Zero-config; no-ops outside Vercel.

## Verification

### `npm test`

```
Test Files  25 passed (25)
     Tests  83 passed (83)
```

Baseline was 80/80; +3 new tests for `getSiteUrl()` in `lib/site-url.test.ts`
(TDD: written and confirmed failing — `Failed to resolve import "./site-url"`
— before `lib/site-url.ts` was created).

### `npx tsc --noEmit`

Clean, no output/errors.

### `npm run build`

Succeeded. Route output includes all four new routes:

```
Route (app)           Revalidate  Expire
┌ ○ /
├ ○ /_not-found
├ ○ /api/github               6h      1y
├ ○ /api/medium               6h      1y
├ ○ /blog                     6h      1y
├ ○ /icon
├ ○ /live-projects
├ ○ /opengraph-image
├ ○ /projects                 6h      1y
├ ○ /robots.txt
└ ○ /sitemap.xml
```

`npm run dev` (used later for manual verification) touched `next-env.d.ts`
(rewrote `.next/types/...` imports to `.next/dev/types/...`); re-running
`npm run build` restored it to the committed state, confirming that diff was
a dev-only artifact and not something that needed to be committed.
`tsconfig.json` was not touched by either.

### Manual dev-server verification

Started `npm run dev` in the background (port 3000 was occupied by an
unrelated process in this environment, so Next.js auto-selected 3001/3002).

`curl http://localhost:3001/sitemap.xml`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
<url><loc>http://localhost:3000/</loc><changefreq>monthly</changefreq><priority>1</priority></url>
<url><loc>http://localhost:3000/blog</loc><changefreq>daily</changefreq><priority>0.7</priority></url>
<url><loc>http://localhost:3000/projects</loc><changefreq>daily</changefreq><priority>0.7</priority></url>
<url><loc>http://localhost:3000/live-projects</loc><changefreq>monthly</changefreq><priority>0.7</priority></url>
</urlset>
```

`curl http://localhost:3001/robots.txt`:

```
User-Agent: *
Allow: /

Sitemap: http://localhost:3000/sitemap.xml
```

`curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3001/icon` → `200`
`curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3001/opengraph-image` → `200`

### Browser-confirmed (Playwright MCP available in this environment)

- Navigated to `/` — page loads, title "Nadeem Khan", only console entry was
  a harmless 404 for the browser's default `/favicon.ico` request (expected;
  Next serves `/icon` instead, which the App Router auto-wires as the actual
  favicon `<link>` — no manual `<link>` tag needed).
- Navigated directly to `/opengraph-image` and screenshotted it: dark
  background, "> whoami" and "Nadeem Khan" in amber, role line in dimmed
  gray below — matches design intent, legible, not garbled.
- Navigated directly to `/icon` and screenshotted it: dark background with
  the amber `>_` glyph centered, confirming the generated PNG content
  (screenshot captures page content, not literal browser-tab chrome, but this
  is the same image Next.js serves as the favicon).
- Screenshot files and the `.playwright-mcp` directory created during
  verification were deleted afterward — not part of the commit.

Dev server(s) were stopped after verification (confirmed via
`Get-NetTCPConnection -LocalPort 3001`, then `Stop-Process`).

### `npm run lint`

Fails with the known pre-existing ESLint plugin-resolution conflict from
nested worktrees ("ESLint couldn't determine the plugin \"@next/next\"
uniquely" — because both this worktree's and the parent repo's
`node_modules/@next/eslint-plugin-next` are discoverable). This is the
already-investigated/accepted issue mentioned in the task instructions, not
introduced by this change. Not fixed, per instructions.

### `git status --porcelain`

Clean after the three commits below.

## Files changed

- `app/icon.tsx` (new)
- `app/opengraph-image.tsx` (new)
- `app/sitemap.ts` (new)
- `app/robots.ts` (new)
- `lib/site-url.ts` (new)
- `lib/site-url.test.ts` (new)
- `app/layout.tsx` (modified — `metadataBase`, `<Analytics />`)
- `components/layout/footer.tsx` (modified — "Built with" line)
- `package.json`, `package-lock.json` (modified — `@vercel/analytics` dependency)

## Commits

1. `53a340c` — Add generated favicon and OpenGraph image
2. `89e2ec5` — Add sitemap, robots.txt, and shared site URL helper
3. `0c99edc` — Add metadataBase, footer stack badge, and Vercel Analytics

## Concerns / judgment calls

- **Satori CSS limits (`ImageResponse`)**: kept both `icon.tsx` and
  `opengraph-image.tsx` to flexbox layout, inline styles, plain hex colors,
  and `fontFamily: 'monospace'` (the generic family, not the site's actual
  `next/font` JetBrains Mono binary — loading a custom font file into
  `ImageResponse` requires fetching font data and passing it via the `fonts`
  option, which felt like unnecessary complexity/overengineering for a small
  favicon/OG image; the generic monospace fallback is visually consistent
  enough with the site's monospace identity and was confirmed legible in the
  screenshot).
- **Commit grouping**: `app/layout.tsx` carries both the `metadataBase`
  change and the `<Analytics />` wiring in the same file, so it couldn't be
  cleanly split across the "sitemap/robots" and "footer/analytics" commits
  without hunk-level patching. I grouped the whole `layout.tsx` diff into the
  third commit (with the `@vercel/analytics` dependency it depends on) to
  keep every commit independently buildable/bisectable, rather than splitting
  a single file's diff across commits and risking a broken intermediate
  state.
- **Base-URL fallback logic**: matches the task's suggested snippet exactly
  (`VERCEL_PROJECT_PRODUCTION_URL` → `VERCEL_URL` → `http://localhost:3000`).
  No production domain exists yet, so all generated URLs currently resolve to
  `localhost:3000` regardless of the actual dev server port — this is
  expected/by-design, not a bug.
