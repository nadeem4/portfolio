# Portfolio Website — Design Spec

**Date:** 2026-08-11
**Status:** Approved by user, pending spec review sign-off

## Purpose & Audience

A personal portfolio website whose primary goal is landing job interviews (recruiters/hiring managers as primary audience), for a backend/data/ML engineer. It aggregates:

- Blog posts written on Medium, grouped by category
- A curated selection of GitHub repos
- A "live projects" section (currently empty — placeholder for future deployed projects)
- A downloadable resume
- Contact links

## Stack Decision

**Next.js (App Router) on Vercel.**

Considered and rejected:
- **Astro on Vercel/Netlify** — leaner by default, but smaller ecosystem for the interactive features (command palette, animated diagrams) this project wants, and a less common stack for future collaboration.
- **Plain Vite + React SPA** — simplest, but Medium's RSS feed doesn't support CORS, so client-side fetching would still need a proxy/serverless function anyway, while losing SSG's SEO and performance benefits.

**No database anywhere.** All content resolves to one of:
- Static config (TypeScript/JSON) committed to the repo — skills, featured-project blurbs, resume file reference, live-project placeholders, contact links
- Server-side fetch at ISR revalidation — Medium RSS (blog posts), GitHub REST API (pinned repo stats)

## Architecture

```mermaid
flowchart TD
    A["Visitor Browser"] --> B["Next.js App Router (Vercel)"]
    B --> C["Static Pages (SSG)<br/>About / Skills / Resume / Contact"]
    B --> D["ISR Pages (revalidate every 6 hours)<br/>Blog listing / Projects"]
    D --> E["Route Handler: /api/medium<br/>fetches + parses Medium RSS at revalidate"]
    D --> F["Route Handler: /api/github<br/>fetches pinned repo data via GitHub API"]
    C --> G["Static config (JSON/TS)<br/>featured projects, skills, resume PDF, live-project placeholders"]
    E --> H[("Medium RSS feed")]
    F --> I[("GitHub REST API")]

    classDef node fill:#fff,stroke:#000,color:#000;
    class A,B,C,D,E,F,G,H,I node;
```

- Pages are pre-rendered (SSG) and cached; ISR pages quietly re-fetch in the background every 6 hours, so visitors always get a fast static response, never a live fetch waterfall.
- Route handlers are serverless functions included free on Vercel — not a persistent backend, not a database.
- Hosting cost: $0 on Vercel's free (Hobby) tier at personal-portfolio traffic scale.

## Visual Direction

- Dark-by-default, with a light/dark toggle.
- Monochrome palette + single accent color.
- Technical/monospace-influenced typography (fits the command-palette and pipeline-diagram features, and the backend/ML audience).
- Minimal motion — subtle transitions, not heavy animation, consistent with reference sites researched (Jack Jeznach, Tamal Sen style minimalism) rather than SaaS-bright/gradient-heavy design.

## Site Structure & Content

| Section | Content | Source |
|---|---|---|
| Hero / About | Name, role, one-line pitch, links (GitHub/LinkedIn/Medium/email) | Static config |
| Skills | Interactive tech-stack visual, grouped (Languages, Data, ML, Infra) | Static config |
| Blog | Medium posts, auto-categorized by Medium tags, filterable | Medium RSS (ISR) |
| Projects (GitHub) | Pinned repos with custom write-up + live stats (stars, last updated, language) | Curated repo-slug list + GitHub API (ISR) |
| Live Projects | "Coming soon" placeholder cards now; real project cards added as shipped | Static config |
| Resume | Download button (PDF) | Static file in `/public` |
| Contact | mailto: link + social icons, no form | Static config |

### Cool features (in scope for v1)

1. **Interactive skills visual** — categorized grid/graph (Languages → Data → ML → Infra) with hover states, not a generic progress-bar list.
2. **Animated architecture/pipeline diagrams** — for 2-3 featured projects, a small SVG diagram (e.g. `Kafka → Spark → S3 → Redshift`) that animates on scroll/hover within that project's card/detail view — shows real system-design work rather than telling.
3. **Command palette (Cmd+K)** — jump to any section, open resume, or go to a project via keyboard (`cmdk` library).

### Explicitly out of scope for v1

- Contact form (mailto + social links only — avoids needing a form-handling service)
- Any database or persistent backend
- E2E test framework (Playwright can be added later if the site grows)

## Error Handling

- Medium RSS fetch failure/empty feed → blog section shows a graceful "posts temporarily unavailable" state; last successfully cached ISR result is served if one exists, rather than breaking the page.
- A pinned repo that's renamed/deleted on GitHub → that card is skipped rather than showing broken data.
- All external fetches (RSS parse, GitHub API) have a timeout, try/catch, and typed fallback (empty array) — never an unhandled crash.

## Testing (TDD)

- Data-layer units are the primary TDD targets: Medium RSS parser (XML → typed post objects, category extraction) and GitHub fetch/normalize function are pure-ish functions — tests written first (Vitest), covering happy path, empty feed, malformed XML, and API error/rate-limit cases.
- UI components with real logic get React Testing Library coverage: command palette filtering/keyboard nav, skills-visual grouping, blog category filtering.
- Purely presentational components (hero, footer) don't need dedicated tests.
- No E2E framework for v1.

## Deployment

- Vercel project connected to a GitHub repo; auto-deploy on push to `main`, preview deployments on PRs/branches.
- Custom domain pointed at Vercel if/when available; otherwise the free `*.vercel.app` subdomain.
