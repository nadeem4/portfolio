# GitHub Repo Description Drafts (nadeem4)

Research done read-only via `gh api` GET requests. No repository was modified, and no write/mutating `gh` command was run.

## Step 1 filter results

- Fetched `users/nadeem4/repos?type=owner&sort=pushed&per_page=100` — 40 repos returned.
- After excluding forks and the `nadeem4/nadeem4` profile-README repo: **34 candidates**.
- After requiring commit count >= 3 (via `gh api -i "repos/nadeem4/{repo}/commits?per_page=1"` and the `Link` header's `rel="last"` page number, exactly matching `lib/github.ts`'s `fetchCommitCount`/`parseLastPage` logic): **19 repos pass the full portfolio filter.**

The 19 repos that pass the filter: `doc_generator`, `nl2sql`, `post_training`, `aurora`, `medalflow`, `boilerplate_code`, `search_algorithm`, `microservice_demo`, `airbnb_for_car`, `spring_boot_multi_module_framework`, `chess_engine_using_python`, `rain_in_austrailia_kaggle`, `MET-CS-664---Artificial-Intelligence`, `collateral_management`, `hesita_angular_app`, `code_gladiator_2020`, `hackerrank`, `nutrient_detector`, `vehcile_tracking_system`.

Repos that were candidates but got excluded for having fewer than 3 commits (per the Link-header technique, some of these numbers look surprising but were computed with the exact same method the app uses): `ibiz` (2), `mini-gpt` (1 — despite a `rel="next"` entry, `rel="last"` page was 1), `compress` (1), `metadata_app_react` (1), `excel_to_sql` (1), `face_detected_using_opencv-frontal_detection` (1), `odyssey_spring_project` (1), `digital_asset_angular_app` (1), `profile` (2), `insurance_eligibilty_checker_platform` (2), `grant_tracking_app` (2), `research_paper` (1), `GoogleCodeJam` (1), `microbet` (1), `zikher_coding_assessment` (2).

## Step 2: which of the 19 have an empty description

Of the 19 passing repos, **9 have an empty (`null`) description**: `post_training`, `search_algorithm`, `MET-CS-664---Artificial-Intelligence`, `collateral_management`, `hesita_angular_app`, `code_gladiator_2020`, `hackerrank`, `nutrient_detector`, `vehcile_tracking_system`.

The other 10 (`doc_generator`, `nl2sql`, `aurora`, `medalflow`, `boilerplate_code`, `microservice_demo`, `airbnb_for_car`, `spring_boot_multi_module_framework`, `chess_engine_using_python`, `rain_in_austrailia_kaggle`) already have descriptions and were left untouched.

## Step 3: drafted descriptions

| Repo | Current description | Drafted description | Evidence |
|---|---|---|---|
| `post_training` | (empty) | A collection of small, runnable implementations of LLM post-training and alignment methods, from RL basics to DPO, RLHF, and RLAIF. | README.md — describes scope (RL fundamentals in Gymnasium, toy chess Q-learning, planned sections for SFT, preference optimization/DPO/IPO/KTO/ORPO, reward modeling/PPO/GRPO, RLAIF, constitutional/safety tuning, evaluation, distillation) |
| `search_algorithm` | (empty) | Implements the BM25 search ranking algorithm two ways (via the `rank_bm25` library and from scratch) and compares the resulting scores. | Top-level listing + `bm25/readme.md` + `bm25/bm25_with_library.py`, `bm25/bm25_without_library.py`, `requirements.txt` (rank-bm25, nltk) |
| `MET-CS-664---Artificial-Intelligence` | (empty) | Coursework and assignment solutions for the MET CS 664 Artificial Intelligence course. | README.md ("This repo contains assignment of MET CS 664 course...") |
| `collateral_management` | (empty) | An Angular app prototype for managing collateral requests and transfers. | README.md (generic Angular CLI boilerplate, no description) + top-level file listing/`src/app` structure showing `modules/request` and `modules/transfer` (each with its own routing, store, services, models) + `package.json` (name: "angular-app") |
| `hesita_angular_app` | (empty) | An Angular dashboard prototype for searching and tracking a list of locations, with search, count-card, and recently-updated-location panels. | README.md (generic Angular CLI boilerplate, no description) + `src/app` structure showing a single `home-page` and components `search-panel`, `location-panel`, `count-card`, `recently-updated-locations`, `sidebar`, `navbar` + `package.json` (name: "hesita-angular-app") |
| `code_gladiator_2020` | (empty) | Python solutions to two problems from the Code Gladiator 2020 coding contest. | Top-level file listing (`bayblade.py`, `powerpuff_girl.py`, no README) + file contents (small stdin/stdout competitive-programming solutions matching contest-style problem names) |
| `hackerrank` | (empty) | Solutions to HackerRank practice problems, organized by topic (implementation, strings). | Top-level file listing (`implementation/`, `strings/`, `.vscode/`, no README); language field: Python |
| `nutrient_detector` | (empty) | UNCLEAR (partially) — see note. This is not a code project; it's an archive of reference papers, datasheets, and design notes (NIR spectroscopy, light-based nutrient/nitrate detection). Suggested description if kept on the portfolio: "A reference archive of papers and design notes for a light-based (NIR spectroscopy) nutrient-detection research project — no source code." | Top-level file listing: ~45 PDFs/DOCX/PPTX files on NIR spectroscopy, infrared detectors, nutrient/nitrate detection, plus a `9-8-16/` folder with a "design consideration.docx" and "nir spectrometer.docx". No README, no code files, `language` field is `null`. |
| `vehcile_tracking_system` | (empty) | Solidity smart contracts (project name "Floorchain 2.0") modeling auto-dealer floorplan financing — lender agreements and vehicle inventory/state tracking. | Top-level file listing (`.sol` Solidity contracts + zips, no README) + contents of `VehicleStateContract14.sol` (Lender/Dealer roles, inventory state machine: InTransit/InInventory/Sold/Funded/PaidOff) + `LenderAgreementContract.json` workflow definition (`"DisplayName": "Floorchain 2.0"`, roles Lender/Dealer/Vehicle) |

### Note on `nutrient_detector`

This repo genuinely has no source code — it is a folder of PDFs, a PPTX, a DOCX, and a zip, all related to near-infrared (NIR) spectroscopy and light-based nutrient/nitrate detection, apparently reference material collected for a research or coursework project. A one-sentence factual description is possible (given above) but flagged here because it's an unusual case for a "project" listing — the repo owner may prefer to exclude it from the portfolio entirely rather than describe it as a project. Nothing was fabricated about what it does technically since there is no code to describe.

## Zero write operations confirmation

All commands used were read-only: `gh api "users/nadeem4/repos?..."`, `gh api -i "repos/nadeem4/{repo}/commits?per_page=1"`, `gh api repos/nadeem4/{repo}/readme`, and `gh api repos/nadeem4/{repo}/contents[...]`. No `gh repo edit`, no `gh api` with `-X PATCH/POST/PUT/DELETE`, and no `git push` were run. No repository, description, or file on GitHub was modified.
