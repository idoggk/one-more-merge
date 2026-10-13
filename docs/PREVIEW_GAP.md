# Preview gap: does hiding the damage preview widen planner vs greedy?

Measurement only (t-0bc6be93). No game code changed; everything is in `tools/preview-gap.ts`. Raw numbers: `docs/preview-gap-raw/*.tsv`; the tables below are `docs/preview-gap-raw/REPORT.md`, regenerated from them.

## Verdict: KEEP THE PREVIEW

Hiding or coarsening the number never moves planner/greedy much (-0.06 to +0.12), moves it the wrong way on LAST 6 and LAST 8, and the two "widening" tool ideas add at most 0.04 and the Gear Bomb idea nothing. The success rule ("some variant gives a ratio below 0.85 while the human-proxy bot is not crushed") is read below. By its strict reading nothing is gained from hiding, because the capped levels already pass it with the FULL preview.

### How the 0.85 rule was read
Ratios in the tables are **planner damage / bot damage** (always >= 1). The brief's "below 0.85" is the inverse, **bot / planner**, so a variant passes when planner/greedy > 1.18 (greedy/planner < 0.85).

| set | full: greedy/planner | coarse | hidden | best variant below 0.85? |
|---|---|---|---|---|
| LAST 6 | 0.75 | 0.76 | 0.76 | already yes at FULL (hiding gains nothing) |
| LAST 8 | 0.70 | 0.73 | 0.73 | already yes at FULL (hiding makes greedy **better**) |
| LAST 10 | 0.82 | 0.75 | 0.75 | yes at FULL too; hiding widens it by 0.07, the only real effect |
| Level 4 | 0.88 | 0.90 | 0.89 | no |
| Level 14 | 0.89 | 0.89 | 0.88 | no |
| Level 22 | 0.89 | 0.88 | 0.86 | no (closest: 0.86 hidden) |

So the budget levels were already built to defeat greedy (a design target of 15-25% short), and the preview adds nothing to that. On ordinary boards no variant gets under 0.85. The human proxy keeps 0.93-1.01 of its full-preview damage under every variant, so it is not crushed, but there is also no gap to buy.

## What the preview is and how it was modelled
- Game: `previewMerge(s, from, to)` (`src/core/game.ts`) dry-runs the real cascade on a copy and returns count, total damage and activations; `mergePreview` / `hitFormula` (`src/core/hitFormula.ts`, `src/game/mergeAssist.ts`) present it as the on-screen number and formula.
- **FULL**: the bot ranks merges by previewed damage (today).
- **COARSE**: tier word from the previewed damage as a share of a reference HP (0.75 x the planner's best K-merge damage, which is how the Budget Levels set HP): weak < 4%, ok < 10%, strong < 22%, huge. Ties broken by the hidden-view information below.
- **HIDDEN**: no damage number. The bot sees chain length (machines woken), which machines wake (it uses the summed rank of woken shooters as a tiebreak) and the result rank; it takes the longest chain.
- Reference bots: **random** legal merge; **blind** = highest-rank merge, no preview read at all ("just merge what you can"); **human proxy** = the same view-greedy bot with 20% random mistakes; **planner** = the exact memoised search over boards (`Planner` in the tool, every number from the real `drop`).
- All bots play K merges on a board with HP lifted; the score is total damage dealt. Ratio = sum planner damage / sum bot damage over boards, 95% interval from a seeded 1000-resample bootstrap over boards.
- Boards (200 each): **capped** = the shipped Budget Level board (board 0) plus 199 seeded re-seatings of it (the generator's `mutate`); LAST 6 / 8 / 10 use their 6 / 8 / 10 merges. **Normal** = saga levels 4, 14, 22 (8 start parts each): the real start board advanced 3-8 s by the real engine with a reseeded supply and random merges, then K = 5 merges (about 9-12 parts). Normal levels have no merge cap in the game; the K-merge horizon is the measurement device. Levels with larger start boards (e.g. level 8, 16 parts) were too slow for the exact planner.
- Caveat: the planner is an omniscient merge-order optimiser; real play also has the clock, supply and kickback, none of which are in this model.

## Results (200 boards each)
Columns: planner/greedy and planner/human-proxy per preview variant with 95% intervals; "human kept" = proxy damage relative to its own FULL; planner/blind and planner/random on the FULL row.

### LAST 10 (200 boards, planner mean damage 2851)
| preview | planner/greedy [95%] | planner/human-proxy [95%] | human kept vs full | greedy dmg vs full | planner/blind [95%] | planner/random [95%] |
|---|---|---|---|---|---|---|
| full | 1.22 [1.20, 1.25] | 1.40 [1.36, 1.45] | 1.00 | 1.00 | 2.46 [2.33, 2.60] | 2.80 [2.70, 2.92] |
| coarse | 1.33 [1.30, 1.37] | 1.48 [1.43, 1.54] | 0.94 | 0.92 |  |  |
| hidden | 1.34 [1.31, 1.37] | 1.51 [1.46, 1.57] | 0.93 | 0.91 |  |  |

### LAST 6 (200 boards, planner mean damage 953)
| preview | planner/greedy [95%] | planner/human-proxy [95%] | human kept vs full | greedy dmg vs full | planner/blind [95%] | planner/random [95%] |
|---|---|---|---|---|---|---|
| full | 1.34 [1.30, 1.38] | 1.44 [1.39, 1.49] | 1.00 | 1.00 | 2.38 [2.26, 2.50] | 2.35 [2.26, 2.45] |
| coarse | 1.31 [1.28, 1.35] | 1.44 [1.39, 1.49] | 1.00 | 1.02 |  |  |
| hidden | 1.31 [1.28, 1.34] | 1.45 [1.39, 1.50] | 1.00 | 1.03 |  |  |

### LAST 8 (200 boards, planner mean damage 1809)
| preview | planner/greedy [95%] | planner/human-proxy [95%] | human kept vs full | greedy dmg vs full | planner/blind [95%] | planner/random [95%] |
|---|---|---|---|---|---|---|
| full | 1.43 [1.39, 1.48] | 1.52 [1.47, 1.58] | 1.00 | 1.00 | 2.26 [2.19, 2.34] | 2.44 [2.37, 2.52] |
| coarse | 1.37 [1.34, 1.41] | 1.51 [1.46, 1.56] | 1.01 | 1.04 |  |  |
| hidden | 1.37 [1.34, 1.41] | 1.52 [1.48, 1.58] | 1.00 | 1.04 |  |  |

### Level 4, K = 5 (200 boards, planner mean damage 520)
| preview | planner/greedy [95%] | planner/human-proxy [95%] | human kept vs full | greedy dmg vs full | planner/blind [95%] | planner/random [95%] |
|---|---|---|---|---|---|---|
| full | 1.13 [1.11, 1.15] | 1.21 [1.18, 1.24] | 1.00 | 1.00 | 1.81 [1.74, 1.89] | 1.86 [1.79, 1.94] |
| coarse | 1.11 [1.10, 1.13] | 1.20 [1.17, 1.23] | 1.01 | 1.01 |  |  |
| hidden | 1.12 [1.10, 1.14] | 1.21 [1.18, 1.24] | 1.00 | 1.01 |  |  |

### Level 14, K = 5 (200 boards, planner mean damage 618)
| preview | planner/greedy [95%] | planner/human-proxy [95%] | human kept vs full | greedy dmg vs full | planner/blind [95%] | planner/random [95%] |
|---|---|---|---|---|---|---|
| full | 1.12 [1.10, 1.15] | 1.20 [1.17, 1.23] | 1.00 | 1.00 | 1.79 [1.71, 1.87] | 1.86 [1.78, 1.95] |
| coarse | 1.12 [1.10, 1.15] | 1.21 [1.18, 1.24] | 0.99 | 1.00 |  |  |
| hidden | 1.13 [1.11, 1.16] | 1.23 [1.20, 1.26] | 0.97 | 0.99 |  |  |

### Level 22, K = 5 (200 boards, planner mean damage 1132)
| preview | planner/greedy [95%] | planner/human-proxy [95%] | human kept vs full | greedy dmg vs full | planner/blind [95%] | planner/random [95%] |
|---|---|---|---|---|---|---|
| full | 1.12 [1.10, 1.14] | 1.20 [1.16, 1.24] | 1.00 | 1.00 | 1.74 [1.65, 1.84] | 1.86 [1.77, 1.95] |
| coarse | 1.13 [1.11, 1.16] | 1.22 [1.19, 1.26] | 0.98 | 0.99 |  |  |
| hidden | 1.16 [1.13, 1.18] | 1.24 [1.20, 1.27] | 0.97 | 0.97 |  |  |

The preview does matter against a player who ignores everything: blind is 1.7-2.5x behind the planner against greedy's 1.1-1.4x. But removing the number only moves a view-reading player toward that, by at most +0.12.

## Widening ideas (one parameter each, planner and bots may both use tools, a tool use costs no merge)
Setup: sandwich +1 BONUS rule on, `TUNING.tools` on, max 1 tool made per level (as the owner decided); each row changes one parameter against "tools as built". LAST 6: 100 boards. LAST 8: 40 boards (the exact planner with tool moves takes about 100 s per board per config; this is fewer than 200 and is labelled so). LAST 10 was not run (too slow).

### LAST 6 (100 boards)
| config | planner mean damage | planner/greedy full [95%] | planner/greedy hidden [95%] | planner/human hidden [95%] |
|---|---|---|---|---|
| no tools | 950 | 1.36 [1.31, 1.43] | 1.30 [1.26, 1.35] | 1.48 [1.41, 1.55] |
| tools as built (chain 5, Gear Bomb +1 rank) | 1004 | 1.38 [1.33, 1.45] | 1.34 [1.29, 1.39] | 1.51 [1.44, 1.59] |
| tools at chain 4 | 1022 | 1.40 [1.34, 1.47] | 1.35 [1.31, 1.40] | 1.50 [1.44, 1.58] |
| Gear Bomb x1.5 (+1.5 rank) | 1004 | 1.38 [1.33, 1.45] | 1.34 [1.29, 1.39] | 1.51 [1.44, 1.59] |

### LAST 8 (40 boards)
| config | planner mean damage | planner/greedy full [95%] | planner/greedy hidden [95%] | planner/human hidden [95%] |
|---|---|---|---|---|
| no tools | 1859 | 1.43 [1.34, 1.55] | 1.39 [1.31, 1.46] | 1.57 [1.45, 1.72] |
| tools as built (chain 5, Gear Bomb +1 rank) | 1958 | 1.46 [1.37, 1.57] | 1.41 [1.34, 1.48] | 1.58 [1.47, 1.71] |
| tools at chain 4 | 1985 | 1.47 [1.38, 1.59] | 1.43 [1.35, 1.51] | 1.59 [1.47, 1.73] |
| Gear Bomb x1.5 (+1.5 rank) | 1958 | 1.46 [1.37, 1.57] | 1.41 [1.34, 1.48] | 1.58 [1.47, 1.71] |

Reading: tools at chain 4 lifts the planner's damage by 2-3% and planner/greedy by 0.01-0.02, inside the intervals. **Gear Bomb x1.5 is identical to the baseline**: a Gear Bomb needs a sandwich merge, which almost never occurs on these boards (the tool made is the Row Surge), so the bomb strength parameter is untested rather than disproved. Neither idea is a widening lever.

## Reproduce
Chunks print raw TSV to stdout; `report` aggregates (the report is deterministic: chunks re-run byte-identical, spot-checked LAST 6 boards 0-11 and Level 4 boards 0-11 against the committed files, and the report was run twice and diffed).

```
npx vite-node tools/preview-gap.ts capped last6 0 200  > docs/preview-gap-raw/capped-last6.tsv
npx vite-node tools/preview-gap.ts capped last8 0 40   > docs/preview-gap-raw/capped-last8-0-40.tsv     # chunks of 40 (200 boards)
npx vite-node tools/preview-gap.ts capped last10 0 34  > docs/preview-gap-raw/capped-last10-0-34.tsv    # chunks of 34 (200 boards)
npx vite-node tools/preview-gap.ts normal 4 0 200 5    > docs/preview-gap-raw/normal-L4.tsv             # also 14 and 22
npx vite-node tools/preview-gap.ts tools last6 0 13    > docs/preview-gap-raw/tools-last6-0-13.tsv      # chunks of 13 (100 boards)
npx vite-node tools/preview-gap.ts tools last8 0 5     > docs/preview-gap-raw/tools-last8-0-5.tsv       # chunks of 5 (40 boards)
npx vite-node tools/preview-gap.ts report docs/preview-gap-raw/*.tsv
```
Run times (8 cores): LAST 6 about 5 min per 200 boards, LAST 8 about 17 min, LAST 10 about 37 min, each Normal level about 4 min, so split into chunks as above.

## Follow-ups worth considering instead
- The gap on capped levels comes from level design (decoy pairs), not from hidden information: authoring more decoys is the lever that works.
- If thinking support is the goal, test planning aids (e.g. NEXT strip) against the human proxy rather than removing information.
- To test the Gear Bomb idea, build boards where sandwiches occur.
