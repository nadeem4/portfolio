---
name: verify-deploy
description: Use after deploying the portfolio to Vercel, when a deployment needs checking, or when something works locally but is suspected broken in production
---

# Verify a production deployment

## Overview

Most of this site is static and behaves identically everywhere. A handful of things **only work correctly in production**, and one of them looks like a bug locally. This is the checklist for what actually differs.

**Core principle:** verify against the deployed URL, not a local build. The checks that matter are exactly the ones a local build cannot answer.

## Shape of the site — read this before probing routes

There are **exactly four pages**: `/`, `/blog`, `/projects`, `/live-projects`, plus `/api/blog`, `/api/github`, `/opengraph-image`, `/icon`, `/sitemap.xml`, `/robots.txt`.

**There are no local post routes.** Every blog entry links out to `medium.com`. `/blog/<slug>` does not exist and never has.

This matters because probing a non-existent route with `curl "$U/blog/$SLUG"` on an empty `$SLUG` silently requests `$U/` and returns **200 with the homepage** — a false pass that looks like a healthy post page. If a check "passes" but the title is the site default, you fetched the homepage. Verify what you actually requested.

## The thing that looks broken locally and isn't

`lib/site-url.ts` reads `VERCEL_PROJECT_PRODUCTION_URL`, then `VERCEL_URL`, then falls back to `http://localhost:3000`. Neither env var exists locally, so **every local build stamps `localhost:3000` into `og:image`, `sitemap.xml`, `robots.txt`, and `metadataBase`.**

This has already been reported as a production bug — that link previews would break when the URL was pasted into Slack or LinkedIn. It is not a bug. It is the fallback doing its job. **Confirm it in production rather than concluding either way from a local build.**

## Checks that only production can answer

| Check | Expected | Why local can't tell you |
|---|---|---|
| `og:image` on `/` | Absolute URL on the deployed domain | Local always says `localhost:3000` |
| `sitemap.xml` | Deployed domain, **exactly 3 URLs** — `/`, `/blog`, `/projects` | Same fallback |
| `robots.txt` | Deployed domain in the `Sitemap:` line | Same fallback |
| `/opengraph-image` | HTTP 200, `image/png`, ~38 KB | Satori renders at request time |
| `/icon` | HTTP 200, `image/png`, ~400 bytes | Same |
| `/api/github` | ~13 repos, `nl2sql` first | GitHub rate limits are per-IP and Vercel's are shared |

Three sitemap URLs is correct even though the site lists 92 posts — the posts are external.
| Nav | No "Live Projects" until one is `live` | Conditional on config |

## Curl is blocked by default

Bare `curl` gets 403s from bot protection on some hosts, and a 403 is easy to misread as "the site is broken". **Always send a browser user agent.** A conclusion drawn from a bare curl has already been wrong once.

```bash
UA="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36"
curl -s -A "$UA" --max-time 25 "$URL/"
```

## Static checks

```bash
U="https://<deployment>.vercel.app"
UA="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36"

for p in "" blog projects live-projects; do
  code=$(curl -s -o /dev/null -w "%{http_code}" -A "$UA" --max-time 25 "$U/$p")
  title=$(curl -s -A "$UA" --max-time 25 "$U/$p" | grep -o '<title>[^<]*</title>' | head -1)
  printf "  %-14s %s  %s\n" "/$p" "$code" "$title"
done

curl -s -A "$UA" "$U/" | grep -oE '<meta property="og:image"[^>]*>'
curl -s -A "$UA" "$U/sitemap.xml" | grep -o '<loc>[^<]*</loc>'
curl -s -A "$UA" "$U/robots.txt"
curl -s -o /dev/null -w "og-image  status=%{http_code} type=%{content_type} bytes=%{size_download}\n" -A "$UA" "$U/opengraph-image"
curl -s -o /dev/null -w "icon      status=%{http_code} type=%{content_type} bytes=%{size_download}\n" -A "$UA" "$U/icon"
```

Label the fields. Unlabelled, `/icon` prints `200 image/png 404` — where **404 is the byte count**, not a status. That has already caused a double-take in a skill whose whole point is not misreading status codes.

All four pages must return 200 with **four distinct titles**. They were identical once — every page rendered `Nadeem Khan`.

### `/api/github` — non-empty is not the bar

Empty means rate-limited. But one stale repo also passes "non-empty". Assert the shape:

- roughly **13** repos, with **`nl2sql` first** (the pinned order from `config/project-overrides.ts`)
- no repo whose `description` is empty — the description gate should have excluded it

The endpoint also returns `stars` and `updatedAt` for every repo. **Use it to check the tab ordering objectively** rather than eyeballing: `Recent` must equal the API sorted by `updatedAt` descending, `Most Starred` by `stars` descending.

## Interactive checks

Static HTML cannot confirm the client components work. Drive the deployed site with the Playwright MCP tools (load via `ToolSearch` first — they are deferred).

- **Blog filter:** unfiltered shows the archive plus the 6-post Selected block; picking a category narrows to that category's count and hides Selected; the **All** card restores both.
- **Project tabs:** `Featured` is the pinned order, `Recent` sorts strictly by push date, `Most Starred` strictly by stars. These must differ from each other — a tab that doesn't reorder is the bug this page had.

Counting `ul.divide-y > li` on `/blog` unfiltered returns **archive + selected**, not the post total. Both lists match that selector.

**Playwright MCP writes snapshots into `.playwright-mcp/` in the repo root.** For a read-only verification that is an unwanted side effect — delete the directory afterwards and confirm `git status` is unchanged. It is gitignored, so it will not be committed by accident, but do not leave it behind regardless.

## Web Analytics

`@vercel/analytics` is in `app/layout.tsx`. `/_vercel/insights/script.js` returns:

- **200** — Analytics is enabled and collecting. Correct.
- **404** — Analytics is not enabled in the Vercel project settings. **A dashboard step, not a code fix** — do not go looking for the bug in the repo. The site collects nothing until it is switched on.

Either result is explainable; neither is a deployment fault.

## Common mistakes

| Mistake | Consequence |
|---|---|
| Bare `curl` with no user agent | 403 misread as a broken site |
| Concluding `og:image` is broken from a local build | Chasing a bug that does not exist |
| Only checking HTTP status | Misses identical titles, empty API responses, wrong sort order |
| Assuming `/api/github` non-empty means healthy | Empty means rate-limited; one stale repo also passes "non-empty" |
| Looking in the repo for the analytics 404 | It is a dashboard setting |
| Probing `/blog/<slug>` | No such route; curl falls back to `/` and returns a false 200 |
| Reading `size_download` as a status code | `/icon` legitimately prints `404` bytes |
| Leaving `.playwright-mcp/` behind | Read-only verification should not dirty the working tree |
