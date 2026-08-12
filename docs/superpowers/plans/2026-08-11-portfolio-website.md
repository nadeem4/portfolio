# Portfolio Website Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Next.js portfolio site (blog aggregation from Medium, curated GitHub projects, a "coming soon" live-projects section, resume download, and contact links) deployable to Vercel with no traditional database.

**Architecture:** Next.js App Router with Server Components fetching data at ISR-revalidate time (6h) directly from `lib/` data functions; the same data functions are also exposed as public JSON route handlers (`/api/medium`, `/api/github`). Blog posts default to their Medium tags, with an optional per-post category override stored in Vercel Edge Config (a free, first-party key-value config store, editable from the Vercel dashboard with no redeploy). Dark-by-default theme with a light/dark toggle via `next-themes`. Interactive pieces (skills visual, blog filter, command palette, pipeline diagrams) are Client Components built on small, independently-tested pure functions.

**Tech Stack:** Next.js, React, TypeScript, Tailwind CSS, next-themes, rss-parser, cmdk, motion, clsx, tailwind-merge, @vercel/edge-config, Vitest, React Testing Library.

## Global Constraints

- No relational/document database anywhere. Data is static config, fetched server-side from Medium RSS / GitHub API, or (for blog category overrides only) stored in Vercel Edge Config — a key-value config store, not a general-purpose database.
- ISR revalidate window is 6 hours (`21600` seconds) for blog and project data.
- No contact form — mailto link + social icons only.
- No E2E framework for v1 (Playwright can be added later).
- TDD for all `lib/` data-layer functions and all interactive component logic (Vitest + React Testing Library); purely presentational components get a smoke test.
- Theme: dark-by-default with a light/dark toggle, `next-themes` with `attribute="class"`, `defaultTheme="dark"`, `enableSystem={false}` (explicit toggle only, no system-preference detection).
- Visual language: monochrome palette + single accent color, monospace-influenced typography.
- External fetch failures degrade gracefully: Medium/GitHub/Edge Config fetch errors return an empty array/object, never an unhandled crash.

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `next-env.d.ts`
- Create: `tailwind.config.ts`
- Create: `postcss.config.js`
- Create: `vitest.config.ts`
- Create: `vitest.setup.ts`
- Create: `.gitignore`
- Create: `.eslintrc.json`
- Create: `lib/utils.ts`
- Test: `lib/utils.test.ts`

**Interfaces:**
- Consumes: nothing (first task)
- Produces: `cn(...inputs: ClassValue[]): string` from `lib/utils.ts`, used by later component tasks for conditional class names. Vitest configured with `@/*` path alias, jsdom environment, `matchMedia` and `IntersectionObserver` stubs available globally in tests.

- [ ] **Step 1: Initialize package.json and install dependencies**

`tailwindcss`, `postcss`, and `autoprefixer` are pinned to major versions compatible with the v3-style `tailwind.config.ts`/`postcss.config.js`/`@tailwind` directives used later in this task and in Task 3 — an unpinned install pulls Tailwind v4, which needs a different PostCSS plugin and config shape. `eslint` is pinned to v8 because it's the last major that supports the legacy `.eslintrc.json` format this task writes in Step 3 — ESLint 9 requires a flat `eslint.config.js` instead.

```bash
npm init -y
npm install next react react-dom next-themes rss-parser cmdk motion clsx tailwind-merge
npm install -D typescript @types/react @types/react-dom @types/node "tailwindcss@^3.4.0" "postcss@^8.4.0" "autoprefixer@^10.4.0" "eslint@^8.57.0" eslint-config-next vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

- [ ] **Step 2: Add scripts to package.json**

Edit `package.json` so the `"scripts"` key reads:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint .",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

- [ ] **Step 3: Write config files**

`tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

`next.config.ts`:

```ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {};

export default nextConfig;
```

`next-env.d.ts`:

```ts
/// <reference types="next" />
/// <reference types="next/image-types/global" />
```

`tailwind.config.ts`:

```ts
import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        accent: 'var(--accent)',
        border: 'var(--border)',
      },
    },
  },
  plugins: [],
};

export default config;
```

`postcss.config.js`:

```js
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

`vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: false,
  },
});
```

`vitest.setup.ts`:

```ts
import '@testing-library/jest-dom/vitest';

if (!window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

class IntersectionObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
// @ts-expect-error jsdom has no IntersectionObserver
window.IntersectionObserver = IntersectionObserverStub;
```

`.gitignore`:

```
node_modules
.next
.env*.local
.DS_Store
*.tsbuildinfo
next-env.d.ts
```

`.eslintrc.json`:

```json
{
  "extends": "next/core-web-vitals"
}
```

- [ ] **Step 4: Write the failing test for `cn`**

Create `lib/utils.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { cn } from './utils';

describe('cn', () => {
  it('merges class names and drops falsy values', () => {
    expect(cn('a', false && 'b', 'c')).toBe('a c');
  });

  it('resolves conflicting tailwind classes to the last one', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4');
  });
});
```

- [ ] **Step 5: Run test to verify it fails**

Run: `npx vitest run lib/utils.test.ts`
Expected: FAIL — `lib/utils.ts` does not exist yet.

- [ ] **Step 6: Implement `cn`**

Create `lib/utils.ts`:

```ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 7: Run test to verify it passes**

Run: `npx vitest run lib/utils.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json tsconfig.json next.config.ts next-env.d.ts tailwind.config.ts postcss.config.js vitest.config.ts vitest.setup.ts .gitignore .eslintrc.json lib/utils.ts lib/utils.test.ts
git commit -m "chore: scaffold Next.js project with Vitest and cn utility"
```

---

### Task 2: Static Site Config & Types

**Files:**
- Create: `config/site.ts`
- Create: `config/skills.ts`
- Create: `config/featured-projects.ts`
- Create: `config/live-projects.ts`
- Test: `config/config.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `siteConfig: { name, role, pitch, email, socials: { github, linkedin, medium }, mediumFeedUrl }` from `config/site.ts`
  - `SkillGroup` type `{ category: 'Languages' | 'Data' | 'ML' | 'Infra'; items: string[] }` and `skillGroups: SkillGroup[]` from `config/skills.ts`
  - `FeaturedProject` type `{ repoSlug: string; blurb: string; pipeline?: { label: string }[] }` and `featuredProjects: FeaturedProject[]` from `config/featured-projects.ts`
  - `LiveProject` type `{ name: string; status: 'coming-soon' }` and `liveProjects: LiveProject[]` from `config/live-projects.ts`

- [ ] **Step 1: Write the failing test**

Create `config/config.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { siteConfig } from './site';
import { skillGroups } from './skills';
import { featuredProjects } from './featured-projects';
import { liveProjects } from './live-projects';

describe('site config', () => {
  it('has the fields required to render the hero and contact sections', () => {
    expect(siteConfig.name).toBeTruthy();
    expect(siteConfig.email).toContain('@');
    expect(siteConfig.mediumFeedUrl).toMatch(/^https:\/\/medium\.com\/feed\//);
    expect(siteConfig.socials.github).toContain('github.com');
  });

  it('groups skills under the four expected categories', () => {
    const categories = skillGroups.map((g) => g.category);
    expect(categories).toEqual(['Languages', 'Data', 'ML', 'Infra']);
    skillGroups.forEach((group) => expect(group.items.length).toBeGreaterThan(0));
  });

  it('gives every featured project a repo slug and a blurb', () => {
    expect(featuredProjects.length).toBeGreaterThan(0);
    featuredProjects.forEach((project) => {
      expect(project.repoSlug).toMatch(/^[\w-]+\/[\w.-]+$/);
      expect(project.blurb).toBeTruthy();
    });
  });

  it('marks live projects as coming-soon until a real URL is added', () => {
    expect(liveProjects.length).toBeGreaterThan(0);
    liveProjects.forEach((project) => expect(project.status).toBe('coming-soon'));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run config/config.test.ts`
Expected: FAIL — none of the config modules exist yet.

- [ ] **Step 3: Implement config files**

Create `config/site.ts` (replace the placeholder values with your real details before deploying):

```ts
export const siteConfig = {
  name: 'Your Name',
  role: 'Backend / Data / ML Engineer',
  pitch: 'I build reliable data and ML systems and ship them end to end.',
  email: 'you@example.com',
  socials: {
    github: 'https://github.com/yourhandle',
    linkedin: 'https://linkedin.com/in/yourhandle',
    medium: 'https://medium.com/@yourhandle',
  },
  mediumFeedUrl: 'https://medium.com/feed/@yourhandle',
};
```

Create `config/skills.ts`:

```ts
export interface SkillGroup {
  category: 'Languages' | 'Data' | 'ML' | 'Infra';
  items: string[];
}

export const skillGroups: SkillGroup[] = [
  { category: 'Languages', items: ['Python', 'TypeScript', 'SQL', 'Go'] },
  { category: 'Data', items: ['Spark', 'Kafka', 'Airflow', 'dbt'] },
  { category: 'ML', items: ['PyTorch', 'scikit-learn', 'MLflow'] },
  { category: 'Infra', items: ['AWS', 'Docker', 'Kubernetes', 'Terraform'] },
];
```

Create `config/featured-projects.ts`:

```ts
export interface PipelineStep {
  label: string;
}

export interface FeaturedProject {
  repoSlug: string;
  blurb: string;
  pipeline?: PipelineStep[];
}

export const featuredProjects: FeaturedProject[] = [
  {
    repoSlug: 'yourhandle/example-pipeline',
    blurb: 'Batch ETL pipeline processing 10M+ events/day.',
    pipeline: [{ label: 'Kafka' }, { label: 'Spark' }, { label: 'S3' }, { label: 'Redshift' }],
  },
];
```

Create `config/live-projects.ts`:

```ts
export interface LiveProject {
  name: string;
  status: 'coming-soon';
}

export const liveProjects: LiveProject[] = [{ name: 'First live project', status: 'coming-soon' }];
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run config/config.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add config/
git commit -m "feat: add static site, skills, and project config"
```

---

### Task 3: Design Tokens & Theme Toggle

**Files:**
- Create: `app/globals.css`
- Create: `components/theme/theme-provider.tsx`
- Create: `components/theme/theme-toggle.tsx`
- Test: `components/theme/theme-toggle.test.tsx`

**Interfaces:**
- Consumes: nothing new
- Produces: `<ThemeProvider>` (wraps `next-themes`' provider) and `<ThemeToggle />` from `components/theme/`, used by the root layout in Task 10.

- [ ] **Step 1: Write the failing test**

Create `components/theme/theme-toggle.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider } from './theme-provider';
import { ThemeToggle } from './theme-toggle';

function renderWithTheme() {
  return render(
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <ThemeToggle />
    </ThemeProvider>,
  );
}

describe('ThemeToggle', () => {
  it('offers to switch to light mode when starting in dark mode', async () => {
    renderWithTheme();
    expect(await screen.findByRole('button', { name: /switch to light theme/i })).toBeInTheDocument();
  });

  it('switches the document theme class when clicked', async () => {
    renderWithTheme();
    const button = await screen.findByRole('button', { name: /switch to light theme/i });
    fireEvent.click(button);
    await waitFor(() => expect(document.documentElement.classList.contains('light')).toBe(true));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run components/theme/theme-toggle.test.tsx`
Expected: FAIL — `theme-provider.tsx` and `theme-toggle.tsx` do not exist yet.

- [ ] **Step 3: Implement the theme provider and toggle**

Create `components/theme/theme-provider.tsx`:

```tsx
'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import type { ComponentProps } from 'react';

export function ThemeProvider({ children, ...props }: ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
```

Create `components/theme/theme-toggle.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  const nextTheme = theme === 'dark' ? 'light' : 'dark';

  return (
    <button
      type="button"
      onClick={() => setTheme(nextTheme)}
      aria-label={`Switch to ${nextTheme} theme`}
      className="rounded border border-border px-2 py-1 text-sm"
    >
      {theme === 'dark' ? 'Light' : 'Dark'}
    </button>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run components/theme/theme-toggle.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 5: Add design tokens**

Create `app/globals.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --background: #0a0a0a;
  --foreground: #ededed;
  --accent: #22d3ee;
  --border: #27272a;
}

.light {
  --background: #ffffff;
  --foreground: #0a0a0a;
  --accent: #0891b2;
  --border: #e4e4e7;
}

body {
  background-color: var(--background);
  color: var(--foreground);
  font-family: ui-monospace, SFMono-Regular, 'JetBrains Mono', monospace;
}
```

- [ ] **Step 6: Commit**

```bash
git add app/globals.css components/theme/
git commit -m "feat: add dark/light theme tokens and toggle"
```

---

### Task 4: Medium Feed Parser

**Files:**
- Create: `lib/medium.types.ts`
- Create: `lib/medium.ts`
- Test: `lib/medium.test.ts`

**Interfaces:**
- Consumes: nothing new
- Produces: `MediumPost { title, link, pubDate, categories: string[], contentSnippet }` type, `parseMediumFeed(xml: string): Promise<MediumPost[]>`, and `fetchMediumPosts(feedUrl: string): Promise<MediumPost[]>` from `lib/medium.ts` — used by the blog page (Task 13) and the Medium route handler (Task 6).

- [ ] **Step 1: Write the failing tests**

Create `lib/medium.types.ts`:

```ts
export interface MediumPost {
  title: string;
  link: string;
  pubDate: string;
  categories: string[];
  contentSnippet: string;
}
```

Create `lib/medium.test.ts`:

```ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run lib/medium.test.ts`
Expected: FAIL — `lib/medium.ts` does not exist yet.

- [ ] **Step 3: Implement the parser**

Create `lib/medium.ts`:

```ts
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
    const res = await fetch(feedUrl, { next: { revalidate: 21600 } });
    if (!res.ok) return [];
    const xml = await res.text();
    return await parseMediumFeed(xml);
  } catch {
    return [];
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/medium.test.ts`
Expected: PASS (7 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/medium.types.ts lib/medium.ts lib/medium.test.ts
git commit -m "feat: add Medium RSS feed parser with graceful fallbacks"
```

---

### Task 5: Blog Category Overrides (Edge Config)

**Files:**
- Create: `lib/blog-categories.ts`
- Test: `lib/blog-categories.test.ts`
- Modify: `package.json` (add `@vercel/edge-config`)

**Interfaces:**
- Consumes: `MediumPost` type from `lib/medium.types.ts` (Task 4)
- Produces: `getCategoryOverrides(): Promise<Record<string, string>>` and `applyCategoryOverrides(posts: MediumPost[], overrides: Record<string, string>): MediumPost[]` from `lib/blog-categories.ts` — used by the Medium route handler (Task 6) and the blog page (Task 13).

Categories default to whatever tags a post already has on Medium. `blogCategoryOverrides` is an optional JSON object stored in Vercel Edge Config, keyed by the post's Medium URL, that — when present for a post — replaces that post's categories entirely. This lets you fix or set a post's category from the Vercel dashboard at any time, without a code change or redeploy.

- [ ] **Step 1: Install the Edge Config client**

```bash
npm install @vercel/edge-config
```

- [ ] **Step 2: Write the failing tests**

Create `lib/blog-categories.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { applyCategoryOverrides, getCategoryOverrides } from './blog-categories';
import type { MediumPost } from './medium.types';

vi.mock('@vercel/edge-config', () => ({ get: vi.fn() }));

import { get } from '@vercel/edge-config';

const posts: MediumPost[] = [
  { title: 'Post One', link: 'https://medium.com/@you/post-one', pubDate: '', categories: ['Tag From Medium'], contentSnippet: '' },
  { title: 'Post Two', link: 'https://medium.com/@you/post-two', pubDate: '', categories: ['Another Tag'], contentSnippet: '' },
];

describe('applyCategoryOverrides', () => {
  it("replaces a post's categories with the override when one exists", () => {
    const result = applyCategoryOverrides(posts, { 'https://medium.com/@you/post-one': 'Data Engineering' });
    expect(result[0].categories).toEqual(['Data Engineering']);
  });

  it("leaves a post's Medium tags untouched when no override exists for it", () => {
    const result = applyCategoryOverrides(posts, { 'https://medium.com/@you/post-one': 'Data Engineering' });
    expect(result[1].categories).toEqual(['Another Tag']);
  });

  it('returns posts unchanged when there are no overrides at all', () => {
    expect(applyCategoryOverrides(posts, {})).toEqual(posts);
  });
});

describe('getCategoryOverrides', () => {
  beforeEach(() => {
    vi.mocked(get).mockReset();
  });

  it('returns the override map stored in Edge Config', async () => {
    vi.mocked(get).mockResolvedValue({ 'https://medium.com/@you/post-one': 'Data Engineering' });
    expect(await getCategoryOverrides()).toEqual({ 'https://medium.com/@you/post-one': 'Data Engineering' });
  });

  it('returns an empty object when no override map is configured yet', async () => {
    vi.mocked(get).mockResolvedValue(undefined);
    expect(await getCategoryOverrides()).toEqual({});
  });

  it('returns an empty object when the Edge Config read fails', async () => {
    vi.mocked(get).mockRejectedValue(new Error('edge config unavailable'));
    expect(await getCategoryOverrides()).toEqual({});
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run lib/blog-categories.test.ts`
Expected: FAIL — `lib/blog-categories.ts` does not exist yet.

- [ ] **Step 4: Implement**

Create `lib/blog-categories.ts`:

```ts
import { get } from '@vercel/edge-config';
import type { MediumPost } from './medium.types';

const OVERRIDES_KEY = 'blogCategoryOverrides';

export async function getCategoryOverrides(): Promise<Record<string, string>> {
  try {
    const overrides = await get<Record<string, string>>(OVERRIDES_KEY);
    return overrides ?? {};
  } catch {
    return {};
  }
}

export function applyCategoryOverrides(posts: MediumPost[], overrides: Record<string, string>): MediumPost[] {
  return posts.map((post) => {
    const override = overrides[post.link];
    if (!override) return post;
    return { ...post, categories: [override] };
  });
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run lib/blog-categories.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json lib/blog-categories.ts lib/blog-categories.test.ts
git commit -m "feat: add Edge Config-backed blog category overrides"
```

---

### Task 6: Medium API Route Handler

**Files:**
- Create: `app/api/medium/route.ts`

**Interfaces:**
- Consumes: `fetchMediumPosts` and `MediumPost` from `lib/medium.ts` (Task 4), `getCategoryOverrides` and `applyCategoryOverrides` from `lib/blog-categories.ts` (Task 5), `siteConfig.mediumFeedUrl` from `config/site.ts` (Task 2)
- Produces: `GET /api/medium` returning `MediumPost[]` (with category overrides already applied) as JSON, revalidated every 6 hours.

- [ ] **Step 1: Implement the route handler**

There's no new pure logic here (it's a thin wrapper around already-tested functions), so this task is verified with a manual run rather than a unit test — Next.js route handlers require the dev server, which Vitest's jsdom environment does not provide.

Create `app/api/medium/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { fetchMediumPosts } from '@/lib/medium';
import { getCategoryOverrides, applyCategoryOverrides } from '@/lib/blog-categories';
import { siteConfig } from '@/config/site';

export const revalidate = 21600;

export async function GET() {
  const [posts, overrides] = await Promise.all([
    fetchMediumPosts(siteConfig.mediumFeedUrl),
    getCategoryOverrides(),
  ]);
  return NextResponse.json(applyCategoryOverrides(posts, overrides));
}
```

- [ ] **Step 2: Verify manually**

This route can only be exercised once `app/layout.tsx` exists (Task 10). Note it here and re-verify with `curl http://localhost:3000/api/medium` after Task 10's build check passes.

- [ ] **Step 3: Commit**

```bash
git add app/api/medium/route.ts
git commit -m "feat: expose Medium posts as a JSON route handler"
```

---

### Task 7: GitHub Repo Fetcher

**Files:**
- Create: `lib/github.types.ts`
- Create: `lib/github.ts`
- Test: `lib/github.test.ts`

**Interfaces:**
- Consumes: nothing new
- Produces: `GithubRepo { slug, name, description, url, stars, language, updatedAt }` type and `fetchPinnedRepos(slugs: string[]): Promise<GithubRepo[]>` from `lib/github.ts` — used by the projects page (Task 14) and the GitHub route handler (Task 8).

- [ ] **Step 1: Write the failing tests**

Create `lib/github.types.ts`:

```ts
export interface GithubRepo {
  slug: string;
  name: string;
  description: string;
  url: string;
  stars: number;
  language: string | null;
  updatedAt: string;
}
```

Create `lib/github.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchPinnedRepos } from './github';

function jsonResponse(body: unknown, ok = true) {
  return { ok, json: () => Promise.resolve(body) } as Response;
}

describe('fetchPinnedRepos', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('normalizes a successful repo response', async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({
        name: 'example-pipeline',
        description: 'A data pipeline',
        html_url: 'https://github.com/yourhandle/example-pipeline',
        stargazers_count: 42,
        language: 'Python',
        updated_at: '2026-01-01T00:00:00Z',
      }),
    );

    const repos = await fetchPinnedRepos(['yourhandle/example-pipeline']);
    expect(repos).toEqual([
      {
        slug: 'yourhandle/example-pipeline',
        name: 'example-pipeline',
        description: 'A data pipeline',
        url: 'https://github.com/yourhandle/example-pipeline',
        stars: 42,
        language: 'Python',
        updatedAt: '2026-01-01T00:00:00Z',
      },
    ]);
  });

  it('skips a repo that returns a non-ok response (e.g. renamed or deleted)', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({}, false));
    const repos = await fetchPinnedRepos(['yourhandle/missing-repo']);
    expect(repos).toEqual([]);
  });

  it('skips a repo whose request throws', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('network down'));
    const repos = await fetchPinnedRepos(['yourhandle/example-pipeline']);
    expect(repos).toEqual([]);
  });

  it('fetches multiple repos independently, keeping only the successful ones', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        jsonResponse({
          name: 'repo-a',
          description: '',
          html_url: 'https://github.com/yourhandle/repo-a',
          stargazers_count: 1,
          language: null,
          updated_at: '2026-01-01T00:00:00Z',
        }),
      )
      .mockResolvedValueOnce(jsonResponse({}, false));

    const repos = await fetchPinnedRepos(['yourhandle/repo-a', 'yourhandle/repo-b']);
    expect(repos).toHaveLength(1);
    expect(repos[0].slug).toBe('yourhandle/repo-a');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run lib/github.test.ts`
Expected: FAIL — `lib/github.ts` does not exist yet.

- [ ] **Step 3: Implement the fetcher**

Create `lib/github.ts`:

```ts
import type { GithubRepo } from './github.types';

export async function fetchPinnedRepos(slugs: string[]): Promise<GithubRepo[]> {
  const results = await Promise.all(
    slugs.map(async (slug): Promise<GithubRepo | null> => {
      try {
        const res = await fetch(`https://api.github.com/repos/${slug}`, {
          next: { revalidate: 21600 },
          headers: { Accept: 'application/vnd.github+json' },
        });
        if (!res.ok) return null;
        const data = await res.json();
        return {
          slug,
          name: data.name,
          description: data.description ?? '',
          url: data.html_url,
          stars: data.stargazers_count,
          language: data.language,
          updatedAt: data.updated_at,
        };
      } catch {
        return null;
      }
    }),
  );
  return results.filter((repo): repo is GithubRepo => repo !== null);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/github.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/github.types.ts lib/github.ts lib/github.test.ts
git commit -m "feat: add GitHub pinned-repo fetcher with per-repo error isolation"
```

---

### Task 8: GitHub API Route Handler

**Files:**
- Create: `app/api/github/route.ts`

**Interfaces:**
- Consumes: `fetchPinnedRepos` from `lib/github.ts` (Task 7), `featuredProjects` from `config/featured-projects.ts` (Task 2)
- Produces: `GET /api/github` returning `GithubRepo[]` as JSON, revalidated every 6 hours.

- [ ] **Step 1: Implement the route handler**

Create `app/api/github/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { fetchPinnedRepos } from '@/lib/github';
import { featuredProjects } from '@/config/featured-projects';

export const revalidate = 21600;

export async function GET() {
  const repos = await fetchPinnedRepos(featuredProjects.map((project) => project.repoSlug));
  return NextResponse.json(repos);
}
```

- [ ] **Step 2: Verify manually**

Same as Task 6 — re-verify with `curl http://localhost:3000/api/github` after Task 10's build check passes.

- [ ] **Step 3: Commit**

```bash
git add app/api/github/route.ts
git commit -m "feat: expose pinned GitHub repos as a JSON route handler"
```

---

### Task 9: Command Palette

**Files:**
- Create: `components/command-palette/commands.ts`
- Create: `components/command-palette/filter-commands.ts`
- Create: `components/command-palette/command-palette.tsx`
- Test: `components/command-palette/filter-commands.test.ts`
- Test: `components/command-palette/command-palette.test.tsx`

**Interfaces:**
- Consumes: nothing new
- Produces: `<CommandPalette />` from `components/command-palette/command-palette.tsx`, used by the root layout in Task 10.

- [ ] **Step 1: Write the failing test for the filter logic**

Create `components/command-palette/filter-commands.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { filterCommands } from './filter-commands';
import type { Command } from './commands';

const commands: Command[] = [
  { id: 'blog', label: 'Go to Blog', href: '/blog' },
  { id: 'resume', label: 'Open Resume', href: '/resume.pdf' },
];

describe('filterCommands', () => {
  it('returns every command for an empty query', () => {
    expect(filterCommands(commands, '')).toEqual(commands);
  });

  it('matches labels case-insensitively by substring', () => {
    expect(filterCommands(commands, 'RESUME')).toEqual([commands[1]]);
  });

  it('returns an empty array when nothing matches', () => {
    expect(filterCommands(commands, 'zzz')).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run components/command-palette/filter-commands.test.ts`
Expected: FAIL — `filter-commands.ts` does not exist yet.

- [ ] **Step 3: Implement commands and filter logic**

Create `components/command-palette/commands.ts`:

```ts
export interface Command {
  id: string;
  label: string;
  href: string;
}

export const commands: Command[] = [
  { id: 'home', label: 'Go to Home', href: '/' },
  { id: 'blog', label: 'Go to Blog', href: '/blog' },
  { id: 'projects', label: 'Go to Projects', href: '/projects' },
  { id: 'live-projects', label: 'Go to Live Projects', href: '/live-projects' },
  { id: 'resume', label: 'Open Resume', href: '/resume.pdf' },
];
```

Create `components/command-palette/filter-commands.ts`:

```ts
import type { Command } from './commands';

export function filterCommands(commands: Command[], query: string): Command[] {
  const q = query.trim().toLowerCase();
  if (!q) return commands;
  return commands.filter((command) => command.label.toLowerCase().includes(q));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run components/command-palette/filter-commands.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Write the failing test for the palette component**

Create `components/command-palette/command-palette.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CommandPalette } from './command-palette';

describe('CommandPalette', () => {
  it('opens when Ctrl+K is pressed and lists all commands', async () => {
    render(<CommandPalette />);
    fireEvent.keyDown(document, { key: 'k', ctrlKey: true });
    expect(await screen.findByPlaceholderText('Jump to...')).toBeInTheDocument();
    expect(screen.getByText('Go to Blog')).toBeInTheDocument();
  });

  it('filters commands as the user types', async () => {
    render(<CommandPalette />);
    fireEvent.keyDown(document, { key: 'k', ctrlKey: true });
    const input = await screen.findByPlaceholderText('Jump to...');
    await userEvent.type(input, 'resume');
    expect(screen.getByText('Open Resume')).toBeInTheDocument();
    expect(screen.queryByText('Go to Blog')).not.toBeInTheDocument();
  });

  it('closes on Escape', async () => {
    render(<CommandPalette />);
    fireEvent.keyDown(document, { key: 'k', ctrlKey: true });
    await screen.findByPlaceholderText('Jump to...');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByPlaceholderText('Jump to...')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npx vitest run components/command-palette/command-palette.test.tsx`
Expected: FAIL — `command-palette.tsx` does not exist yet.

- [ ] **Step 7: Implement the palette component**

Create `components/command-palette/command-palette.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';
import { Command } from 'cmdk';
import { commands } from './commands';
import { filterCommands } from './filter-commands';

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
      if (event.key === 'Escape') {
        setOpen(false);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!open) return null;

  const results = filterCommands(commands, query);

  return (
    <Command.Dialog open={open} onOpenChange={setOpen} label="Command palette" shouldFilter={false}>
      <Command.Input value={query} onValueChange={setQuery} placeholder="Jump to..." />
      <Command.List>
        <Command.Empty>No results found.</Command.Empty>
        {results.map((command) => (
          <Command.Item
            key={command.id}
            onSelect={() => {
              window.location.href = command.href;
              setOpen(false);
            }}
          >
            {command.label}
          </Command.Item>
        ))}
      </Command.List>
    </Command.Dialog>
  );
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npx vitest run components/command-palette/command-palette.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 9: Commit**

```bash
git add components/command-palette/
git commit -m "feat: add Cmd+K command palette for site navigation"
```

---

### Task 10: Root Layout, Header, Footer

**Files:**
- Create: `components/layout/header.tsx`
- Create: `components/layout/footer.tsx`
- Create: `app/layout.tsx`
- Create: `app/page.tsx`
- Test: `components/layout/header.test.tsx`
- Test: `components/layout/footer.test.tsx`

**Interfaces:**
- Consumes: `ThemeProvider`, `ThemeToggle` (Task 3), `CommandPalette` (Task 9), `siteConfig` (Task 2)
- Produces: `<Header />`, `<Footer />` from `components/layout/`; `app/layout.tsx` wraps every page. This task produces the first buildable version of the app — `npm run build` must succeed after this task.

- [ ] **Step 1: Write the failing tests**

Create `components/layout/header.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Header } from './header';

describe('Header', () => {
  it('links to every main section', () => {
    render(<Header />);
    expect(screen.getByRole('link', { name: 'Blog' })).toHaveAttribute('href', '/blog');
    expect(screen.getByRole('link', { name: 'Projects' })).toHaveAttribute('href', '/projects');
    expect(screen.getByRole('link', { name: 'Live Projects' })).toHaveAttribute('href', '/live-projects');
  });
});
```

Create `components/layout/footer.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Footer } from './footer';
import { siteConfig } from '@/config/site';

describe('Footer', () => {
  it("shows the site owner's name", () => {
    render(<Footer />);
    expect(screen.getByText(new RegExp(siteConfig.name))).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run components/layout/header.test.tsx components/layout/footer.test.tsx`
Expected: FAIL — `header.tsx` and `footer.tsx` do not exist yet.

- [ ] **Step 3: Implement Header and Footer**

Create `components/layout/header.tsx`:

```tsx
import Link from 'next/link';
import { ThemeToggle } from '@/components/theme/theme-toggle';

export function Header() {
  return (
    <header className="flex items-center justify-between border-b border-border px-6 py-4">
      <Link href="/">Home</Link>
      <nav className="flex gap-4">
        <Link href="/blog">Blog</Link>
        <Link href="/projects">Projects</Link>
        <Link href="/live-projects">Live Projects</Link>
      </nav>
      <ThemeToggle />
    </header>
  );
}
```

Create `components/layout/footer.tsx`:

```tsx
import { siteConfig } from '@/config/site';

export function Footer() {
  return (
    <footer className="border-t border-border px-6 py-4 text-sm">
      {new Date().getFullYear()} {siteConfig.name}
    </footer>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run components/layout/header.test.tsx components/layout/footer.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 5: Wire up the root layout and a placeholder home page**

Create `app/layout.tsx`:

```tsx
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { ThemeProvider } from '@/components/theme/theme-provider';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { CommandPalette } from '@/components/command-palette/command-palette';
import { siteConfig } from '@/config/site';
import './globals.css';

export const metadata: Metadata = {
  title: siteConfig.name,
  description: siteConfig.pitch,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          <Header />
          {children}
          <Footer />
          <CommandPalette />
        </ThemeProvider>
      </body>
    </html>
  );
}
```

Create `app/page.tsx` (placeholder — replaced with the real Hero in Task 11):

```tsx
export default function HomePage() {
  return (
    <main className="px-6 py-12">
      <h1>Portfolio</h1>
    </main>
  );
}
```

- [ ] **Step 6: Verify the app builds**

Run: `npm run build`
Expected: build succeeds with no errors.

Run: `npm run dev` (in a background terminal), then in another terminal:
`curl http://localhost:3000/api/medium` and `curl http://localhost:3000/api/github`
Expected: both return `200` with a JSON array (empty array is fine if the placeholder Medium handle / repo in `config/site.ts` / `config/featured-projects.ts` haven't been replaced with real ones yet).

- [ ] **Step 7: Commit**

```bash
git add components/layout/ app/layout.tsx app/page.tsx
git commit -m "feat: wire up root layout with header, footer, and command palette"
```

---

### Task 11: Hero Section

**Files:**
- Create: `components/hero/hero.tsx`
- Modify: `app/page.tsx`
- Test: `components/hero/hero.test.tsx`

**Interfaces:**
- Consumes: `siteConfig` from `config/site.ts` (Task 2)
- Produces: `<Hero />` from `components/hero/hero.tsx`

- [ ] **Step 1: Write the failing test**

Create `components/hero/hero.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Hero } from './hero';
import { siteConfig } from '@/config/site';

describe('Hero', () => {
  it('shows the name, role, and pitch', () => {
    render(<Hero />);
    expect(screen.getByRole('heading', { name: siteConfig.name })).toBeInTheDocument();
    expect(screen.getByText(siteConfig.role)).toBeInTheDocument();
    expect(screen.getByText(siteConfig.pitch)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run components/hero/hero.test.tsx`
Expected: FAIL — `hero.tsx` does not exist yet.

- [ ] **Step 3: Implement Hero**

Create `components/hero/hero.tsx`:

```tsx
import { siteConfig } from '@/config/site';

export function Hero() {
  return (
    <section aria-label="Introduction">
      <h1>{siteConfig.name}</h1>
      <p>{siteConfig.role}</p>
      <p>{siteConfig.pitch}</p>
    </section>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run components/hero/hero.test.tsx`
Expected: PASS (1 test)

- [ ] **Step 5: Wire Hero into the home page**

Edit `app/page.tsx`:

```tsx
import { Hero } from '@/components/hero/hero';

export default function HomePage() {
  return (
    <main className="px-6 py-12">
      <Hero />
    </main>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add components/hero/ app/page.tsx
git commit -m "feat: add hero section to home page"
```

---

### Task 12: Skills Visual

**Files:**
- Create: `components/skills/filter-by-category.ts`
- Create: `components/skills/skills-visual.tsx`
- Modify: `app/page.tsx`
- Test: `components/skills/filter-by-category.test.ts`
- Test: `components/skills/skills-visual.test.tsx`

**Interfaces:**
- Consumes: `skillGroups`, `SkillGroup` from `config/skills.ts` (Task 2)
- Produces: `<SkillsVisual />` from `components/skills/skills-visual.tsx`

- [ ] **Step 1: Write the failing test for the filter logic**

Create `components/skills/filter-by-category.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { filterByCategory } from './filter-by-category';
import type { SkillGroup } from '@/config/skills';

const groups: SkillGroup[] = [
  { category: 'Languages', items: ['Python'] },
  { category: 'Data', items: ['Spark'] },
];

describe('filterByCategory', () => {
  it('returns all groups when no category is selected', () => {
    expect(filterByCategory(groups, null)).toEqual(groups);
  });

  it('returns only the matching group when a category is selected', () => {
    expect(filterByCategory(groups, 'Data')).toEqual([{ category: 'Data', items: ['Spark'] }]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run components/skills/filter-by-category.test.ts`
Expected: FAIL — `filter-by-category.ts` does not exist yet.

- [ ] **Step 3: Implement the filter**

Create `components/skills/filter-by-category.ts`:

```ts
import type { SkillGroup } from '@/config/skills';

export function filterByCategory(groups: SkillGroup[], category: string | null): SkillGroup[] {
  if (!category) return groups;
  return groups.filter((group) => group.category === category);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run components/skills/filter-by-category.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Write the failing test for the component**

Create `components/skills/skills-visual.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SkillsVisual } from './skills-visual';

describe('SkillsVisual', () => {
  it('shows every category by default', () => {
    render(<SkillsVisual />);
    expect(screen.getByText('Python')).toBeInTheDocument();
    expect(screen.getByText('Spark')).toBeInTheDocument();
  });

  it('narrows to one category when its chip is clicked', () => {
    render(<SkillsVisual />);
    fireEvent.click(screen.getByRole('button', { name: 'Data' }));
    expect(screen.getByText('Spark')).toBeInTheDocument();
    expect(screen.queryByText('Python')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npx vitest run components/skills/skills-visual.test.tsx`
Expected: FAIL — `skills-visual.tsx` does not exist yet.

- [ ] **Step 7: Implement the component**

Create `components/skills/skills-visual.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { skillGroups } from '@/config/skills';
import { filterByCategory } from './filter-by-category';

export function SkillsVisual() {
  const [active, setActive] = useState<string | null>(null);
  const visible = filterByCategory(skillGroups, active);
  const categories = skillGroups.map((group) => group.category);

  return (
    <section aria-label="Skills">
      <div role="group" aria-label="Skill categories">
        <button type="button" onClick={() => setActive(null)} aria-pressed={active === null}>
          All
        </button>
        {categories.map((category) => (
          <button key={category} type="button" onClick={() => setActive(category)} aria-pressed={active === category}>
            {category}
          </button>
        ))}
      </div>
      {visible.map((group) => (
        <div key={group.category}>
          <h3>{group.category}</h3>
          <ul>
            {group.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npx vitest run components/skills/skills-visual.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 9: Wire into the home page**

Edit `app/page.tsx`:

```tsx
import { Hero } from '@/components/hero/hero';
import { SkillsVisual } from '@/components/skills/skills-visual';

export default function HomePage() {
  return (
    <main className="px-6 py-12">
      <Hero />
      <SkillsVisual />
    </main>
  );
}
```

- [ ] **Step 10: Commit**

```bash
git add components/skills/ app/page.tsx
git commit -m "feat: add interactive skills visual to home page"
```

---

### Task 13: Blog Page

**Files:**
- Create: `components/blog/filter-posts.ts`
- Create: `components/blog/blog-list.tsx`
- Create: `app/blog/page.tsx`
- Test: `components/blog/filter-posts.test.ts`
- Test: `components/blog/blog-list.test.tsx`

**Interfaces:**
- Consumes: `MediumPost` type, `fetchMediumPosts` from `lib/medium.ts` (Task 4), `getCategoryOverrides` and `applyCategoryOverrides` from `lib/blog-categories.ts` (Task 5), `siteConfig.mediumFeedUrl` from `config/site.ts` (Task 2)
- Produces: `<BlogList posts={MediumPost[]} />` from `components/blog/blog-list.tsx`; `app/blog/page.tsx` route (posts rendered here already have category overrides applied).

- [ ] **Step 1: Write the failing test for the filter/category logic**

Create `components/blog/filter-posts.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { filterPostsByCategory, getCategories } from './filter-posts';
import type { MediumPost } from '@/lib/medium.types';

const posts: MediumPost[] = [
  { title: 'A', link: 'https://a', pubDate: '', categories: ['Data'], contentSnippet: '' },
  { title: 'B', link: 'https://b', pubDate: '', categories: ['ML'], contentSnippet: '' },
];

describe('filterPostsByCategory', () => {
  it('returns all posts when no category is selected', () => {
    expect(filterPostsByCategory(posts, null)).toEqual(posts);
  });

  it('returns only posts that include the selected category', () => {
    expect(filterPostsByCategory(posts, 'ML')).toEqual([posts[1]]);
  });
});

describe('getCategories', () => {
  it('returns the unique, sorted set of categories across all posts', () => {
    expect(getCategories(posts)).toEqual(['Data', 'ML']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run components/blog/filter-posts.test.ts`
Expected: FAIL — `filter-posts.ts` does not exist yet.

- [ ] **Step 3: Implement the filter logic**

Create `components/blog/filter-posts.ts`:

```ts
import type { MediumPost } from '@/lib/medium.types';

export function filterPostsByCategory(posts: MediumPost[], category: string | null): MediumPost[] {
  if (!category) return posts;
  return posts.filter((post) => post.categories.includes(category));
}

export function getCategories(posts: MediumPost[]): string[] {
  return Array.from(new Set(posts.flatMap((post) => post.categories))).sort();
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run components/blog/filter-posts.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Write the failing test for BlogList**

Create `components/blog/blog-list.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BlogList } from './blog-list';
import type { MediumPost } from '@/lib/medium.types';

const posts: MediumPost[] = [
  { title: 'Data Post', link: 'https://a', pubDate: '', categories: ['Data'], contentSnippet: 'about data' },
  { title: 'ML Post', link: 'https://b', pubDate: '', categories: ['ML'], contentSnippet: 'about ml' },
];

describe('BlogList', () => {
  it('shows every post by default', () => {
    render(<BlogList posts={posts} />);
    expect(screen.getByText('Data Post')).toBeInTheDocument();
    expect(screen.getByText('ML Post')).toBeInTheDocument();
  });

  it('narrows to one category when its filter is clicked', () => {
    render(<BlogList posts={posts} />);
    fireEvent.click(screen.getByRole('button', { name: 'ML' }));
    expect(screen.getByText('ML Post')).toBeInTheDocument();
    expect(screen.queryByText('Data Post')).not.toBeInTheDocument();
  });

  it('shows a fallback message when there are no posts', () => {
    render(<BlogList posts={[]} />);
    expect(screen.getByText(/posts temporarily unavailable/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npx vitest run components/blog/blog-list.test.tsx`
Expected: FAIL — `blog-list.tsx` does not exist yet.

- [ ] **Step 7: Implement BlogList**

Create `components/blog/blog-list.tsx`:

```tsx
'use client';

import { useState } from 'react';
import type { MediumPost } from '@/lib/medium.types';
import { filterPostsByCategory, getCategories } from './filter-posts';

interface BlogListProps {
  posts: MediumPost[];
}

export function BlogList({ posts }: BlogListProps) {
  const [category, setCategory] = useState<string | null>(null);

  if (posts.length === 0) {
    return <p>Posts temporarily unavailable — check back soon.</p>;
  }

  const categories = getCategories(posts);
  const visible = filterPostsByCategory(posts, category);

  return (
    <div>
      <div role="group" aria-label="Filter by category">
        <button type="button" onClick={() => setCategory(null)} aria-pressed={category === null}>
          All
        </button>
        {categories.map((c) => (
          <button key={c} type="button" onClick={() => setCategory(c)} aria-pressed={category === c}>
            {c}
          </button>
        ))}
      </div>
      <ul>
        {visible.map((post) => (
          <li key={post.link}>
            <a href={post.link} target="_blank" rel="noreferrer">
              {post.title}
            </a>
            <p>{post.contentSnippet}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npx vitest run components/blog/blog-list.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 9: Create the blog page**

Create `app/blog/page.tsx`:

```tsx
import { BlogList } from '@/components/blog/blog-list';
import { fetchMediumPosts } from '@/lib/medium';
import { getCategoryOverrides, applyCategoryOverrides } from '@/lib/blog-categories';
import { siteConfig } from '@/config/site';

export const revalidate = 21600;

export default async function BlogPage() {
  const [posts, overrides] = await Promise.all([
    fetchMediumPosts(siteConfig.mediumFeedUrl),
    getCategoryOverrides(),
  ]);
  return (
    <main className="px-6 py-12">
      <h1>Blog</h1>
      <BlogList posts={applyCategoryOverrides(posts, overrides)} />
    </main>
  );
}
```

- [ ] **Step 10: Verify the app still builds**

Run: `npm run build`
Expected: build succeeds with no errors.

- [ ] **Step 11: Commit**

```bash
git add components/blog/ app/blog/
git commit -m "feat: add blog page with category filtering"
```

---

### Task 14: Projects Page

**Files:**
- Create: `components/projects/pipeline-diagram.tsx`
- Create: `components/projects/project-card.tsx`
- Create: `app/projects/page.tsx`
- Test: `components/projects/pipeline-diagram.test.tsx`

**Interfaces:**
- Consumes: `GithubRepo`, `fetchPinnedRepos` from `lib/github.ts` (Task 7); `FeaturedProject`, `featuredProjects` from `config/featured-projects.ts` (Task 2)
- Produces: `<PipelineDiagram steps={{label: string}[]} />`, `<ProjectCard repo={GithubRepo} project={FeaturedProject} />` from `components/projects/`

- [ ] **Step 1: Write the failing test for PipelineDiagram**

Create `components/projects/pipeline-diagram.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PipelineDiagram } from './pipeline-diagram';

describe('PipelineDiagram', () => {
  it('renders every step label in order', () => {
    render(<PipelineDiagram steps={[{ label: 'Kafka' }, { label: 'Spark' }, { label: 'S3' }]} />);
    const labels = screen.getAllByText(/^(Kafka|Spark|S3)$/).map((el) => el.textContent);
    expect(labels).toEqual(['Kafka', 'Spark', 'S3']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run components/projects/pipeline-diagram.test.tsx`
Expected: FAIL — `pipeline-diagram.tsx` does not exist yet.

- [ ] **Step 3: Implement PipelineDiagram**

Create `components/projects/pipeline-diagram.tsx`:

```tsx
'use client';

import { motion } from 'motion/react';

interface PipelineDiagramProps {
  steps: { label: string }[];
}

export function PipelineDiagram({ steps }: PipelineDiagramProps) {
  return (
    <div aria-label="Architecture pipeline" className="flex items-center gap-2">
      {steps.map((step, index) => (
        <motion.div
          key={step.label}
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: index * 0.1 }}
          className="flex items-center gap-2"
        >
          <span className="rounded border border-border px-2 py-1 text-xs">{step.label}</span>
          {index < steps.length - 1 && <span aria-hidden="true">→</span>}
        </motion.div>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run components/projects/pipeline-diagram.test.tsx`
Expected: PASS (1 test)

- [ ] **Step 5: Implement ProjectCard (presentational, smoke-tested via the page build)**

Create `components/projects/project-card.tsx`:

```tsx
import type { GithubRepo } from '@/lib/github.types';
import type { FeaturedProject } from '@/config/featured-projects';
import { PipelineDiagram } from './pipeline-diagram';

interface ProjectCardProps {
  repo: GithubRepo;
  project: FeaturedProject;
}

export function ProjectCard({ repo, project }: ProjectCardProps) {
  return (
    <li className="border border-border rounded p-4">
      <h2>
        <a href={repo.url} target="_blank" rel="noreferrer">
          {repo.name}
        </a>
      </h2>
      <p>{project.blurb}</p>
      <p>
        {repo.language ?? 'N/A'} · {repo.stars} stars
      </p>
      {project.pipeline && <PipelineDiagram steps={project.pipeline} />}
    </li>
  );
}
```

- [ ] **Step 6: Create the projects page**

Create `app/projects/page.tsx`:

```tsx
import { ProjectCard } from '@/components/projects/project-card';
import { fetchPinnedRepos } from '@/lib/github';
import { featuredProjects } from '@/config/featured-projects';

export const revalidate = 21600;

export default async function ProjectsPage() {
  const repos = await fetchPinnedRepos(featuredProjects.map((project) => project.repoSlug));

  return (
    <main className="px-6 py-12">
      <h1>Projects</h1>
      <ul>
        {featuredProjects.map((project) => {
          const repo = repos.find((r) => r.slug === project.repoSlug);
          if (!repo) return null;
          return <ProjectCard key={project.repoSlug} repo={repo} project={project} />;
        })}
      </ul>
    </main>
  );
}
```

- [ ] **Step 7: Verify the app still builds**

Run: `npm run build`
Expected: build succeeds with no errors.

- [ ] **Step 8: Commit**

```bash
git add components/projects/ app/projects/
git commit -m "feat: add projects page with animated pipeline diagrams"
```

---

### Task 15: Live Projects Page

**Files:**
- Create: `app/live-projects/page.tsx`
- Test: `app/live-projects/page.test.tsx`

**Interfaces:**
- Consumes: `liveProjects`, `LiveProject` from `config/live-projects.ts` (Task 2)
- Produces: `/live-projects` route

- [ ] **Step 1: Write the failing test**

Create `app/live-projects/page.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import LiveProjectsPage from './page';
import { liveProjects } from '@/config/live-projects';

describe('LiveProjectsPage', () => {
  it('lists every configured live project as coming soon', () => {
    render(<LiveProjectsPage />);
    liveProjects.forEach((project) => {
      expect(screen.getByText(project.name)).toBeInTheDocument();
    });
    expect(screen.getAllByText(/coming soon/i)).toHaveLength(liveProjects.length);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run app/live-projects/page.test.tsx`
Expected: FAIL — `app/live-projects/page.tsx` does not exist yet.

- [ ] **Step 3: Implement the page**

Create `app/live-projects/page.tsx`:

```tsx
import { liveProjects } from '@/config/live-projects';

export default function LiveProjectsPage() {
  return (
    <main className="px-6 py-12">
      <h1>Live Projects</h1>
      <ul>
        {liveProjects.map((project) => (
          <li key={project.name}>
            {project.name} — Coming soon
          </li>
        ))}
      </ul>
    </main>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run app/live-projects/page.test.tsx`
Expected: PASS (1 test)

- [ ] **Step 5: Commit**

```bash
git add app/live-projects/
git commit -m "feat: add live projects page with coming-soon placeholders"
```

---

### Task 16: Resume & Contact Sections

**Files:**
- Create: `components/resume/resume-section.tsx`
- Create: `components/contact/contact-section.tsx`
- Create: `public/resume.pdf` (placeholder)
- Modify: `app/page.tsx`
- Test: `components/resume/resume-section.test.tsx`
- Test: `components/contact/contact-section.test.tsx`

**Interfaces:**
- Consumes: `siteConfig` from `config/site.ts` (Task 2)
- Produces: `<ResumeSection />`, `<ContactSection />` from `components/resume/` and `components/contact/`

- [ ] **Step 1: Write the failing tests**

Create `components/resume/resume-section.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ResumeSection } from './resume-section';

describe('ResumeSection', () => {
  it('links to the downloadable resume PDF', () => {
    render(<ResumeSection />);
    const link = screen.getByRole('link', { name: /download resume/i });
    expect(link).toHaveAttribute('href', '/resume.pdf');
  });
});
```

Create `components/contact/contact-section.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ContactSection } from './contact-section';
import { siteConfig } from '@/config/site';

describe('ContactSection', () => {
  it('shows a mailto link and every social link', () => {
    render(<ContactSection />);
    expect(screen.getByRole('link', { name: siteConfig.email })).toHaveAttribute('href', `mailto:${siteConfig.email}`);
    expect(screen.getByRole('link', { name: 'GitHub' })).toHaveAttribute('href', siteConfig.socials.github);
    expect(screen.getByRole('link', { name: 'LinkedIn' })).toHaveAttribute('href', siteConfig.socials.linkedin);
    expect(screen.getByRole('link', { name: 'Medium' })).toHaveAttribute('href', siteConfig.socials.medium);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run components/resume/resume-section.test.tsx components/contact/contact-section.test.tsx`
Expected: FAIL — neither component exists yet.

- [ ] **Step 3: Implement both sections**

Create `components/resume/resume-section.tsx`:

```tsx
export function ResumeSection() {
  return (
    <section aria-label="Resume">
      <h2>Resume</h2>
      <a href="/resume.pdf" download>
        Download Resume (PDF)
      </a>
    </section>
  );
}
```

Create `components/contact/contact-section.tsx`:

```tsx
import { siteConfig } from '@/config/site';

export function ContactSection() {
  return (
    <section aria-label="Contact">
      <h2>Contact</h2>
      <a href={`mailto:${siteConfig.email}`}>{siteConfig.email}</a>
      <nav aria-label="Social links">
        <a href={siteConfig.socials.github} target="_blank" rel="noreferrer">
          GitHub
        </a>
        <a href={siteConfig.socials.linkedin} target="_blank" rel="noreferrer">
          LinkedIn
        </a>
        <a href={siteConfig.socials.medium} target="_blank" rel="noreferrer">
          Medium
        </a>
      </nav>
    </section>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run components/resume/resume-section.test.tsx components/contact/contact-section.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 5: Add a resume placeholder and wire both sections into the home page**

Create `public/resume.pdf` as an empty placeholder file — **replace this with your real resume PDF before deploying**:

```bash
echo "Replace this file with your real resume PDF before deploying." > public/resume.pdf
```

Edit `app/page.tsx`:

```tsx
import { Hero } from '@/components/hero/hero';
import { SkillsVisual } from '@/components/skills/skills-visual';
import { ResumeSection } from '@/components/resume/resume-section';
import { ContactSection } from '@/components/contact/contact-section';

export default function HomePage() {
  return (
    <main className="px-6 py-12">
      <Hero />
      <SkillsVisual />
      <ResumeSection />
      <ContactSection />
    </main>
  );
}
```

- [ ] **Step 6: Verify the app still builds**

Run: `npm run build`
Expected: build succeeds with no errors.

- [ ] **Step 7: Commit**

```bash
git add components/resume/ components/contact/ public/resume.pdf app/page.tsx
git commit -m "feat: add resume download and contact sections to home page"
```

---

### Task 17: Final Integration, README, and Deployment Prep

**Files:**
- Create: `README.md`
- Modify: `config/site.ts`, `config/featured-projects.ts` (verify no leftover template values break the build)

**Interfaces:**
- Consumes: the whole app built in Tasks 1–16
- Produces: a documented, deployable repository with Edge Config provisioned

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: all tests across every task pass.

- [ ] **Step 2: Run a full production build**

Run: `npm run build`
Expected: build succeeds with no errors or type errors.

- [ ] **Step 3: Provision Vercel Edge Config**

This step needs the Vercel dashboard/browser and cannot be fully scripted — stop and complete it manually, then continue.

```bash
vercel link
```

Then, from the [Vercel dashboard](https://vercel.com/dashboard) → your project → **Storage** tab → **Create Database** → **Edge Config**, create a store and connect it to this project. Once connected:

```bash
vercel env pull --yes
```

Expected: `.env.local` now contains an `EDGE_CONFIG` connection string.

In the Edge Config store's dashboard page, add one key so the app has something to read from day one:
- Key: `blogCategoryOverrides`
- Value: `{}`

Add real entries later (e.g. `"https://medium.com/@you/some-post": "Data Engineering"`) whenever you want to override a specific post's category — no redeploy needed.

- [ ] **Step 4: Manually verify all routes with the dev server**

Run: `npm run dev`, then visit and check each renders without errors:
- `http://localhost:3000/` — Hero, Skills, Resume, Contact
- `http://localhost:3000/blog` — Blog list (or the "temporarily unavailable" fallback if `config/site.ts` still has placeholder values), with categories reflecting any `blogCategoryOverrides` entries
- `http://localhost:3000/projects` — Project cards with pipeline diagrams
- `http://localhost:3000/live-projects` — Coming-soon placeholder
- Press `Ctrl+K` (or `Cmd+K`) anywhere — command palette opens and navigates
- Click the theme toggle in the header — page switches between dark and light

- [ ] **Step 5: Write the README**

Create `README.md`:

```markdown
# Portfolio Website

Personal portfolio built with Next.js (App Router). Aggregates Medium blog posts and pinned GitHub repos with no traditional database — see `docs/superpowers/specs/2026-08-11-portfolio-website-design.md` for the full design.

## Before deploying

1. Replace the placeholder values in `config/site.ts` with your real name, email, socials, and Medium handle.
2. Replace `config/featured-projects.ts` with your real repo slugs and project blurbs.
3. Replace `public/resume.pdf` with your real resume.
4. Update `config/live-projects.ts` as you ship real live projects.
5. Provision a Vercel Edge Config store (Storage tab in the dashboard) and run `vercel env pull --yes` so `EDGE_CONFIG` is set locally.

## Categorizing blog posts

Blog categories default to whatever tags a post already has on Medium. To override a post's category without a code change, edit the `blogCategoryOverrides` key in the Edge Config store (Vercel dashboard → Storage → your store), adding an entry keyed by the post's Medium URL:

\`\`\`json
{ "https://medium.com/@you/some-post": "Data Engineering" }
\`\`\`

## Development

\`\`\`bash
npm install
npm run dev      # start the dev server
npm test         # run the Vitest suite
npm run build    # production build
\`\`\`

## Deployment

Connected to Vercel: push to `main` for production, open a PR for a preview deployment. The only environment variable required is `EDGE_CONFIG`, auto-provisioned when the Edge Config store is connected to the project.
```

- [ ] **Step 6: Commit**

```bash
git add README.md
git commit -m "docs: add project README with setup and deployment notes"
```
