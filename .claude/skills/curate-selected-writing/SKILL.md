---
name: curate-selected-writing
description: Use when choosing which blog posts lead on the homepage, when new posts have been published and config/selected-writing.ts may need revisiting, or when deciding what writing to feature
---

# Curate the Selected writing list

## Overview

`config/selected-writing.ts` holds a handful of post ids that lead on the homepage, above a 92-post archive. It is the site's answer to a real problem: the strongest post was previously row ~30 of a flat list, styled identically to an introductory explainer, and a recruiter screening in thirty seconds never reached it.

**Core principle: this is a filter, not a shelf.** Every post added weakens the ones already there. The question is never "is this post good" — it is "is this stronger than the weakest post currently on the list."

## Why curation at all

Research across ~23 personal sites of senior and staff engineers found the pattern is close to universal: Brooker's "Publications", Larson's "Popular", O'Toole's "Popular Posts", Willison's "Guides", Vanlightly's "Analyses". **None presented an undifferentiated list of everything they had written.**

The same research found the design-portfolio "case study" convention is essentially absent from engineering sites — one clear instance in 23. Do not write new long-form pages to feature. The material already exists; the job is selection.

## Selection criteria, in priority order

1. **Operated beats explained.** A post about a system the author ran in production outranks a tutorial, and both outrank a third-party case study. Writing about someone else's architecture is reading about scale, not operating it — a hiring manager reviewing this site named exactly that distinction.
2. **Numbers that are checkable.** `60M+ events/day` in a title does work that "a guide to Kafka" cannot.
3. **Corroborates something else on the site.** A post about NL2SQL backs the `nl2sql` repo. Mutual reinforcement beats two unconnected claims.
4. **Recent enough to represent current work**, but recency alone is not a reason.

## Ordering is a separate decision from selection

Select for strength. **Order for skim-legibility.**

The first reader is a recruiter giving the page seconds, so a post with a concrete number in its title leads even if a subtler post is stronger. The strongest piece sits at position two, where anyone who slowed down will reach it.

Do not sort by date. Do not sort by category.

## Hard constraints

| Constraint | Why |
|---|---|
| **Three to six entries.** A test enforces the cap. | Beyond six it stops reading as a selection. |
| **Ids only** — no titles or blurbs in the config. | Titles live in the catalog; duplicating them invites drift. |
| **Context lines come from each post's `subtitle`.** | The component reads `post.subtitle`. Never hand-write a parallel blurb. |
| **Every id must resolve** against `config/blog-posts.json`. A test enforces this. | A typo silently drops a post from the homepage. |

Because context lines are subtitles, **a post with a weak subtitle is a weak candidate** regardless of merit. One post's subtitle is a scraped image credit; **17** are truncated Medium intro paragraphs ending in an ellipsis. No test catches these. Read the subtitle before selecting — fix it in Notion and resync if the post deserves the slot.

## The bar rises as the list fills

At three entries, a good post can simply be added. **At the cap, nothing gets added without something being removed**, so the bar is "stronger than the weakest incumbent" rather than "good".

## What does not belong — an absolute veto

These are disqualifying, not merely weighted. A post in any of these categories does not go on the list even if it satisfies every other criterion.

This matters where criteria collide: `mini-gpt` is a featured repo, so "Attention Mechanism Basics" corroborates it under criterion 3 — and is still excluded, because it is primer-tier. **Criterion 3 cannot rescue a vetoed post.**

- Explainer-tier posts — "Embeddings 101", "Attention Mechanism Basics"
- Third-party case studies — WhatsApp, YouTube Vitess, AWS Lambda
- Introductory series where the author is teaching rather than reporting
- Anything whose subtitle would embarrass the homepage

## Procedure

1. Read the current list and the catalog. Note each candidate's category, date, and **subtitle**.
2. For a genuinely new candidate, ask: which current entry is it stronger than? If none, stop — no change. "No change" is a normal outcome and usually the right one.
3. If it displaces one, remove that one. Keep the count inside three to six.
4. **Audit the incumbents too.** Ask of each: would this earn its slot today? A standalone removal is in scope — dropping to five is better than carrying a weak sixth, since a weak entry costs the others. Removing without replacing needs no displacer.
5. Re-check ordering: is the most skim-legible entry still first?
6. Run `npx vitest run`.

### What the tests do and do not catch

They assert every id resolves, no duplicates, the three-to-six cap, and `subtitle.trim().length > 20`.

**That length check catches nothing real.** All 92 posts pass it — the shortest subtitle is 38 characters, including every truncated one. **Subtitle quality is entirely a manual judgement.** Do not treat a green test run as evidence the context lines are good.

## Common mistakes

| Mistake | Consequence |
|---|---|
| Adding without removing | Six becomes nine; it reads as another archive |
| Selecting on recency | Newest is not strongest; the archive already sorts by date |
| Ordering by strength | The best post buried below the fold for a skimming reader |
| Hand-writing context lines | Drifts from the catalog the moment a subtitle changes |
| Featuring a post with an ellipsis subtitle | Truncated Medium intro text renders as the description |
| Writing a new post to feature | The material exists; this is a selection problem |
| Treating a green test run as quality assurance | The tests check ids and counts, never whether a post deserves its slot |
| Never revisiting incumbents | The list silently ages into whatever was true when it was written |
