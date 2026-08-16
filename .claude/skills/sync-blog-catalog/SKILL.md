---
name: sync-blog-catalog
description: Use when the Notion blog database has changed and config/blog-posts.json needs regenerating, or when blog posts, categories, titles or subtitles on the site are out of date with Notion
---

# Sync the blog catalog from Notion

## Overview

`config/blog-posts.json` is the site's only source of blog content. Medium is not fetched at runtime — its RSS feed caps at 10 items against ~92 published posts, which is why the catalog exists. The catalog is generated from a Notion database and committed.

**Core principle:** regenerate the whole file, then diff every field against the previous version. Never hand-edit entries.

## Source

Data source URL: `collection://5969f396-0382-49d7-a9ca-520a44f1da2a`
View URL: `https://app.notion.com/p/1912e11f20d84d0fa1ebc4f1ff5b2ec7?v=e59336612cc04030a3026a3e5bd3a0d7`

## Use view mode, not SQL

`notion-query-data-sources` has two modes and they bill differently:

| Mode | Quota |
|---|---|
| `sql` | **Workspace usage limit. Exhaustible, and has been exhausted.** |
| `view` | **None on any plan.** |

Prefer view mode:

```json
{ "mode": "view",
  "view_url": "https://app.notion.com/p/1912e11f20d84d0fa1ebc4f1ff5b2ec7?v=e59336612cc04030a3026a3e5bd3a0d7",
  "page_size": 100 }
```

Both Notion tools are deferred here. Load them first, by fully-qualified name:
`ToolSearch("select:mcp__plugin_Notion_notion__notion-query-data-sources,mcp__plugin_Notion_notion__notion-fetch")`

Reach for SQL only for an aggregate view mode can't express, such as `GROUP BY "Category"` — and spend those queries deliberately. If SQL returns `reached the usage limit`, switch to view mode and derive the aggregate in node.

### Always check `has_more` — truncation is silent and destructive

`page_size` caps at **100**. The catalog is at **94** — six rows from the cliff.

**If you ignore `has_more`, the failure is silent and it deletes data:** a truncated Notion snapshot diffed against the full file reports the missing posts as *removed*, and regeneration then writes a file without them.

**Always run the cursor loop, unconditionally.** Do not check `has_more` once, see `false`, and move on — that works until the day it doesn't, and the day it doesn't is silent. Paging costs nothing in view mode.

```
loop: fetch -> if has_more, fetch again with start_cursor: <next_cursor> -> until has_more is false
```

Before diffing, sanity-check the row count against the committed file. **If Notion returns materially fewer rows than the file has, suspect truncation before you conclude posts were deleted.**

## Record shape

Six keys, in this order. Field names differ between Notion and the file:

| File key | Notion column |
|---|---|
| `id` | `Post ID` |
| `title` | `Title` |
| `subtitle` | `Subtitle` |
| `url` | `Medium URL` |
| `date` | `date:Published Date:start` (already `YYYY-MM-DD`) |
| `category` | `Category` |

Copy `title` and `subtitle` **verbatim** — no rewording, no punctuation fixes.

**File format: two-space indent, LF line endings, trailing newline.** Produce it with `JSON.stringify(posts, null, 2) + '\n'`. The committed file is LF; on Windows git will warn `LF will be replaced by CRLF`. If a run writes CRLF, **all 94 lines rewrite** and the field diff drowns in a whole-file phantom change — the same failure the sort tie-break exists to prevent.

**View mode returns more columns than you need, and one of them is a trap.** Alongside the six above it returns `date:Published Date:is_datetime` and a top-level **`url` that is the Notion page URL, not the Medium URL**. The file's `url` key must come from `Medium URL`. Mapping the wrong one wires 92 rows to Notion pages — silently, since both are valid URLs. Drop every column not in the table.

Normalise a missing subtitle defensively: treat `null`, `""`, and an absent key alike and emit `""`. Never invent one.

## Sort order is load-bearing

**`date` descending, ties broken by `id` ascending — plain lexicographic string compare**, matching the verification snippet's `a.id < b.id`. Ids are hex but variable-length, so string order and numeric-hex order are not the same; write the comparator to agree with the checker.

Twenty-seven posts share a publication date with at least one other. Without the tie-break, regeneration emits a different order each run and the diff fills with phantom changes. This matters more once a scheduled job is opening the PRs.

## Categories drift

`BLOG_CATEGORIES` in `lib/blog.types.ts` must list **every option defined in the Notion select**, not just those currently carrying posts. The catalog test rejects any category not in that list.

When categories change, fetch the schema to get the authoritative option list — `notion-fetch` on the data source URL returns it, and `notion-fetch` has no query quota:

```
notion-fetch  id: collection://5969f396-0382-49d7-a9ca-520a44f1da2a
```

This has already bitten once: `Data Science` and `Software Engineering` were added in Notion, and the catalog test failed until they were added to `BLOG_CATEGORIES`.

## Auditing without changing anything

To answer "is the catalog still in sync?" **do not run the procedure below** — it writes the file. Instead: fetch Notion into a scratch file outside the repo, diff it against the committed `config/blog-posts.json` in memory, and report. Touch nothing in the repo.

## Procedure

Regenerating. For a read-only check, use the section above instead.

1. Copy the current file aside so you can diff against it.
2. Fetch all rows in view mode, paging until `has_more` is false.
3. **Dump the raw payload to a scratch file outside the repo, then map, sort and write the output with a script.** Do not hand-transcribe records into the file. Transcription is the largest risk in this task: 94 records × 6 fields, and a single dropped character in a subtitle ships a corrupted post with a **fully green test suite**, because nothing validates content. Scripting it makes the copy verbatim and everything after it mechanical.
4. Diff **all five non-id fields**, not just `category`. Report added, removed, and changed posts with before → after values.
5. Reconcile per-category counts against Notion.
6. Check every id in `config/selected-writing.ts` still resolves — a recategorised or deleted post must not silently drop off the homepage.
7. If the Notion select gained options, update `BLOG_CATEGORIES`.
8. Run `npx vitest run`, `npx tsc --noEmit`, `npm run build`.

## Verification

Run via the Bash tool — this is POSIX shell, not PowerShell.

```bash
node -e "const p=require('./config/blog-posts.json'); const ids=p.map(x=>x.id);
console.log('records:',p.length);
console.log('unique ids:',new Set(ids).size);
console.log('malformed:',ids.filter(i=>!/^[0-9a-f]{6,}\$/.test(i)));
console.log('missing fields:',p.filter(x=>!x.id||!x.title||!x.url||!x.date||!x.category||x.subtitle===undefined).length);
const s=[...p].sort((a,b)=>a.date<b.date?1:a.date>b.date?-1:(a.id<b.id?-1:1));
console.log('sort correct:',JSON.stringify(s)===JSON.stringify(p));
const c={}; for(const x of p)c[x.category]=(c[x.category]||0)+1; console.log(c);"
```

Every count must reconcile with Notion. Report a mismatch plainly rather than explaining it away.

## Delegating to a subagent

The transcription is long and mechanical, so a subagent is reasonable. Tell it explicitly to use view mode and why — an agent that discovers the SQL quota mid-run will fail partway through verification, which has happened.

## Common mistakes

| Mistake | Consequence |
|---|---|
| Using SQL mode by default | Exhausts the workspace quota, then blocks later syncs |
| Diffing only `category` | Silent title, subtitle, url or date changes ship unnoticed |
| Omitting the id tie-break | Phantom diffs on every regeneration |
| Forgetting `BLOG_CATEGORIES` | Catalog test fails, or a new category ships unvalidated |
| Assuming `id` is 12 hex chars | One real post has an 11-char id (`c1ccda17c54`); the check is `{6,}` |
| Hand-editing an entry | Next regeneration silently reverts it |
| Ignoring `has_more` | Truncated fetch reports real posts as deleted, then drops them |
| Mapping the view's `url` column | Wires every post to its Notion page instead of Medium |
| Running the regenerate procedure for an audit | Rewrites the file when you only meant to look |

## Data problems that are not sync bugs

Some entries are faithfully in sync and still wrong, because the source is wrong. Report these; do not fix them in the file, since regeneration reverts it. They are Notion edits.

- `ac6850a49e05` — subtitle is `"Photo by Alexandre Debiève on Unsplash"`, a scraped image credit. It renders on the site.
- `d82f53b57c31` — subtitle is wrapped in literal quote characters.
- **17** subtitles are truncated Medium intro paragraphs ending in an ellipsis rather than written descriptions.

## Counts in this file go stale

The post count, shared-date count and ellipsis count above are true at the time of writing and drift with every sync. Treat them as orientation, not assertions — recompute anything you are about to rely on. Comments elsewhere in the repo carry the same hazard; `config/selected-writing.ts` and `components/blog/selected-writing.tsx` have both quoted a hardcoded archive size that a later sync falsified.
