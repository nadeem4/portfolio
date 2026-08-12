# Portfolio Website

Personal portfolio built with Next.js (App Router). Aggregates Medium blog posts and pinned GitHub repos with no traditional database — see `docs/superpowers/specs/2026-08-11-portfolio-website-design.md` for the full design.

## Before deploying

1. Replace the placeholder values in `config/site.ts` with your real name, email, socials, and Medium handle.
2. Replace `config/featured-projects.ts` with your real repo slugs and project blurbs.
3. Replace `public/resume.pdf` with your real resume.
4. Update `config/live-projects.ts` as you ship real live projects.
5. Optionally set `GITHUB_TOKEN` to a fine-grained PAT scoped to "Public Repositories (read-only)" — this raises the GitHub API rate limit and enables the commit-count filter on `/projects`. Without it, the site still works, just at GitHub's unauthenticated 60 req/hour limit.

## Categorizing blog posts

Blog categories come from `config/blog-categories.json`, a plain JSON map of Medium post URL to category string:

```json
{ "https://medium.com/@you/some-post": "Data Engineering" }
```

A post whose URL isn't in the file shows as "Uncategorized". Edit the file directly — by hand, or via a separate automated process outside this repo's code that proposes updates as a pull request — and the category takes effect on the next deploy.

## Development

```bash
npm install
npm run dev      # start the dev server
npm test         # run the Vitest suite
npm run build    # production build
npm run lint     # run ESLint
```

## Deployment

Connected to Vercel: push to `main` for production, open a PR for a preview deployment. No environment variables are required to run the site.
