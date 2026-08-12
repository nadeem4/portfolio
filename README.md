# Portfolio Website

Personal portfolio built with Next.js (App Router). Aggregates Medium blog posts and pinned GitHub repos with no traditional database — see `docs/superpowers/specs/2026-08-11-portfolio-website-design.md` for the full design.

## Before deploying

1. Replace the placeholder values in `config/site.ts` with your real name, email, socials, and Medium handle.
2. Replace `config/featured-projects.ts` with your real repo slugs and project blurbs.
3. Replace `public/resume.pdf` with your real resume.
4. Update `config/live-projects.ts` as you ship real live projects.
5. Provision a Vercel Edge Config store (Storage tab in the dashboard) and run `vercel env pull --yes` so `EDGE_CONFIG` is set locally.
6. Optionally set `GITHUB_TOKEN` to a fine-grained PAT scoped to "Public Repositories (read-only)" — this raises the GitHub API rate limit and enables the commit-count filter on `/projects`. Without it, the site still works, just at GitHub's unauthenticated 60 req/hour limit.

## Categorizing blog posts

Blog categories default to whatever tags a post already has on Medium. To override a post's category without a code change, edit the `blogCategoryOverrides` key in the Edge Config store (Vercel dashboard → Storage → your store), adding an entry keyed by the post's Medium URL:

```json
{ "https://medium.com/@you/some-post": "Data Engineering" }
```

## Development

```bash
npm install
npm run dev      # start the dev server
npm test         # run the Vitest suite
npm run build    # production build
npm run lint     # run ESLint
```

## Deployment

Connected to Vercel: push to `main` for production, open a PR for a preview deployment. No environment variables are required to run the site; optionally, connecting a Vercel Edge Config store and setting `EDGE_CONFIG` enables per-post blog category overrides (see "Categorizing blog posts" above).
