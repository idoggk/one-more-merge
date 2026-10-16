# Asset cleanup plan (PLAN ONLY, nothing deleted)

Owner request 2026-10-16: take unused and duplicate assets out of git; worktrees take ~7 minutes to start because the checkout is heavy.
Measured on branch `orch/t-96fe8064-asset-inventory-and-removal-plan` (base `e0dae9c`), tracked files only. Sizes are MiB.

## 1. Measured

- **3623 tracked files, 855 MiB (897 MB)** in the checkout. `.git` history is extra and does not shrink by deleting files (see section 6).
- 1182 PNG = 746 MiB, 1432 webp = 87 MiB, everything else (code, docs, json) is under 25 MiB.

| Top-level | Files | MiB |
|---|---:|---:|
| `art-candidates/` | 2265 | 719.2 |
| `docs/` | 253 | 103.6 (86.5 is `docs/qa-guide`, 9.5 `docs/art`) |
| `src/` | 677 | 16.6 (14.3 is `src/assets/art`, the game art) |
| `assets_src/` | 6 | 8.7 |
| `unity/` | 186 | 4.4 |
| `tools/`, `tests/`, `public/`, root files | 235 | 2.7 |

Biggest `art-candidates/` subfolders (MiB / files): `unit-display-audit/before` 72.0 / 53, `unit-display-audit/after` 46.9 / 34, `rank-redo-3/raw` 29.5 / 15, `owner-review-v9/img` 26.4 / 188, `mockups/screw-yard` 22.0 / 28, `mockups/screw-yard-painted-v2` 18.6 / 12, `owner-review-v9c/img` 18.8 / 157, `owner-review-v9b/img` 18.4 / 145, `mockups/road-map` 16.7 / 27, `screw-yard-new-v2/raw` 16.6 / 10, `rank-redo-2/raw` 16.3 / 9. Full per-folder numbers: `docs/art/asset_cleanup_manifest.csv`.

## 2. Exact duplicates (md5 of content)

- **395 files / 83.7 MiB** are extra byte-identical copies (list with the copy that stays: `docs/art/asset_cleanup_dupes.csv`).
- `owner-review-v9b` and `owner-review-v9c` are copies of `owner-review-v9`: 167 of 193 and 189 of 206 files are identical (35.5 MiB).
- Rest: `screw-yard-new*` raw sheets repeated in `mockups/screw-yard-painted-v2/ref` and `screw-yard-new-v2` (about 27 MiB), `mockups` internal copies (10 MiB), `unit-display-audit`, `unit-style-test`, `rank-redo-4`, `split-check` (about 5 MiB).
- Near-duplicates (same picture re-encoded as webp/png, `@2x`, resized) are not caught by hashing; they sit in the REMOVE-SUPERSEDED folders instead.

## 3. Summary by class

| Class | Files | MiB | Meaning |
|---|---:|---:|---|
| KEEP-IN-GAME | 1100 | 25.6 | `src/`, `public/`, `tests/`, `tools/`, `unity/`, root config, `assets_src/app_icon.png` (used by `tools/make-icons.mjs`) |
| KEEP-APPROVED | 300 | 38.6 | `docs/art/*` (owner instruction), `owner-review-v9` (the one surviving voting page, cited by `OWNER_TASTE_RULES.md`), `mockups/screw-yard-painted-v2/v2_04_win.png` (owner LIKED) |
| KEEP-DOCS | 189 | 16.5 | text kept even inside removed folders (README, NOTES, json, html, scripts) so DESIGN.md and doc links still resolve; `docs/` text and `docs/readme` images |
| ASK | 156 | 46.7 | owner decision needed, see section 5 |
| REMOVE-DUPLICATE | 411 | 83.9 | byte-identical to a file that stays (or to the one copy kept inside a removed group) |
| REMOVE-REJECTED | 55 | 40.7 | owner voted NOT and no later version uses it |
| REMOVE-SUPERSEDED | 980 | 269.0 | old iterations (v1 to v3), raw sheets and sliced pieces whose finals already live in `src/assets/art` |
| REMOVE-REGENERABLE | 432 | 334.1 | screenshots rebuilt by scripts (`unit-display-audit`, `docs/qa-guide/img`, QA before/after shots, HTML-mock renders) |
| **Total** | **3623** | **855.2** | |

REMOVE-DUPLICATE is 411 files here against 395 in section 2 because the page code (html/css/js) of the v9b/v9c copies is counted as duplicate too.

## 4. Rules used

1. Never remove anything under `src/`, `public/`, `tests/`, `tools/`, `unity/`, root config, `levels.json`, `puzzles.json`, or any text file (md, json, html, css, js, mjs, ts), except exact copies of a text file that stays (the v9b/v9c page code). Checked by script: 0 removals there.
2. `docs/art/*` and the owner favourites are KEEP-APPROVED.
3. Among byte-identical files keep one, preferring src/public, then docs, then the lowest-risk class.
4. REMOVE-REJECTED: owner NOT list (`docs/art/owner_not_ids.md`): `road-kit-ch6-strip*` (road_ch6_*), `road-map-new-v4` (ch7/ch8 entrance v4), `mockups/road-map-painted` and `-v2` (mock_road_* and boss_try2/normal_try1), `mockups/screw-yard-painted-v2` except the LIKED `04_win`.
5. REMOVE-SUPERSEDED: older line of the same work (`rank-redo-1..4`, `rank-fix-5`, `rank-clarity`, `units-*`, `unit-style-test`, `road-map-new` to `-v3`, `road-art-5d`, `level-road-v2`, `map-badge-2`, `screw-yard-new`, `-v2`, `screw-yard-3d`, `pack-v2`), plus `raw/ref/full/variants` intermediates of the newest lines. Unit and road art are being redrawn (ladder option B, road v4/v6), so the old iterations are not a base.
6. REMOVE-REGENERABLE: screenshots with a generating script in `tools/` (`qa-guide-shots.mjs`, `build-qa-guide.mjs` which embeds its own copies, `render.mjs`) or pure before/after QA captures whose findings are written in `docs/`.
7. ASK: anything unreviewed or without a clear owner verdict.

## 5. ASK list (46.7 MiB)

| Path | MiB | Question |
|---|---:|---|
| `art-candidates/crate-screen` | 18.5 | crate animation frames; still the base for crate art? |
| `art-candidates/roster-b1` | 12.5 | crate_*, saw_blade, jackhammer, gear sheets, referenced in DESIGN.md |
| `assets_src/store_01..05` | 6.8 | store screenshots; needed for a store listing? (iPhone path is WebGL, no store) |
| `screw-yard-new-v3/sliced`, `screw-yard-3d-v2/1x,2x`, `screw-yard-backdrop`, `map-badge-2-v2/final` | 6.4 | finals of the newest lines; keep only if wired. Screw Yard is parked behind road and core board |
| `owner-review-v9b/img`, `-v9c/img` (non-identical files) | 2.4 | later-round sheets that differ from v9 |

## 6. What it saves

| | Files | MiB |
|---|---:|---:|
| Now | 3623 | 855 |
| After removing all REMOVE-* (safe set) | 1745 | 128 |
| Also removing every ASK | 1589 | 81 |

Checkout shrinks by about 85% in size and 52% in file count; `art-candidates` goes from 2265 to 510 files (including ASK). Time for a fresh worktree should drop roughly with size (about 7 min to about 1 min, estimate not measured).

## 7. What is safe, and what to know first

- Safe as one commit: the REMOVE-DUPLICATE set (84 MiB), `docs/qa-guide/img`, `unit-display-audit`, and the REJECTED set. Nothing in the build, `npm test` or `tools/sim.ts` reads `art-candidates/` or `docs/qa-guide/img` (script reads only; tool scripts that write there will just recreate the folder).
- Links to deleted images in `docs/art/*.md` (for example `UNIT_DISPLAY_AUDIT.md`) will break; the text and findings stay.
- **Git history is not reduced** by deleting files. For fast clones and worktrees also consider: sparse checkout without `art-candidates/` (instant, no deletion), moving old art to a zip release or an external folder, or a history rewrite (owner decision, outside this plan).
- **The favourites are not in this branch.** `road-map-painted-v4/road_map_v4_try1.png`, `v5`, `v6`, `core-board-painted-v1..v3` and `unit-ladder-*` do not exist in the tracked tree at `e0dae9c` (they live on other `orch/*` branches, e.g. the v4 mock on `orch/t-dfbe6e9a-*`), so this plan could not protect them by path. Before deleting, merge those branches or add them to the KEEP-APPROVED list. Also `master` is stale (227 files, 576 commits behind this branch).
- The manifest groups by folder; where a folder has several classes it has one row per class.

Files: `docs/art/asset_cleanup_manifest.csv` (path_or_folder, class, size_mb, files, reason), `docs/art/asset_cleanup_dupes.csv` (per-file duplicates).
