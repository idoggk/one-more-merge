# Decoy boards and the NEXT strip (measurement only, no game change)

Task t-18ba2d06, 2026-10-13/14. Follow-up to `docs/PREVIEW_GAP.md`, which found that hiding the damage preview does not make thinking pay and that the planner-vs-greedy gap comes from level design. Two questions here:

1. Can capped-merge boards be **authored** so that the "biggest merge" is a trap, giving planner/greedy of at least **1.5**, while a human proxy keeps at least **0.8** of its normal damage?
2. Does a **NEXT strip** (the next 2 incoming parts shown) help a human-proxy bot, instead of removing information?

No file under `src/` changed. Everything is `tools/decoy-boards.ts` + `tools/decoy-boards.json` (the 6 boards) + this doc. Output is deterministic (static table, supply chunks and the merged report were each run twice and byte-compared; identical).

## Short answer

- **Yes, on the planner side, in a boards-only setting.** With the exact planner and no incoming parts all six decoy boards give planner/greedy of **2.19 to 5.65** (needs 1.5). The human proxy keeps **0.85 to 1.28** of its normal damage (needs 0.8). Both criteria pass on all six.
- **No, once incoming parts are simulated and the planner is the stated depth 3.** The gap shrinks everywhere (new parts re-open merges for greedy). Decoy boards: chain 1.34 / 1.62 / 1.54, sandwich 1.22 / 1.64 / 1.19. Only **3 of 6** reach 1.5 (chain-6a lower bound 1.55, sand-6a 1.57, chain-8a 1.49); the pooled chain kind is 1.50 [1.47, 1.53], sandwich 1.28.
- **The ordinary capped boards are not flat either**: pooled planner/greedy 1.18 with supply (1.01 to 1.38 per board) and 1.22 to 1.95 with the exact planner and no supply. Decoys add about +0.3 (chain) and +0.1 (sandwich) over ordinary, not a different regime.
- **The sandwich decoys win mostly by making greedy run dry**, not by out-planning it (see "Caveats"). Treat the sandwich numbers as weaker evidence.
- **NEXT strip:** a human-proxy bot that sees the next 2 parts gains **+14%** damage on ordinary and chain boards and **+26%** on sandwich boards; the planner gains at most 0 to 16% (pooled about +4%), so the strip helps the player who plans least. Most of that is the 2-ply look the strip invites (1.06 to 1.23 without any strip); the strip itself adds +2 to +8% on top. See the NEXT-strip tables.

## Method

- **Engine:** the real `drop`, `previewMerge` and `puzzleMoves` from `src/core`, on `newPuzzle` boards (the Budget Levels engine, `src/core/budget.ts`, same board format as the `last6` / `last8` bench). Enemy HP is huge so damage is never capped. Budget = exactly LAST 6 or LAST 8 merges.
- **Same rank mass as today:** LAST 6 boards have 12 parts and rank mass 22; LAST 8 boards 14 parts and mass 28 (the `last6` / `last8` bench boards). Ordinary comparison board `ord-last8-1` has mass 27 (one rank lowered by the bench `mutate`); it is kept as-is.
- **Ordinary boards (12):** per budget, the shipped bench board (g=0) plus five seeded re-seatings of it (the generator's own `mutate`, same as the preview-gap tool).
- **Bots (as in `tools/preview-gap.ts`):** greedy-with-preview = highest previewed damage now (ties random, seeded); greedy-blind is the same without the number (it is only the baseline in PREVIEW_GAP, not repeated here); human proxy = greedy with 20% uniformly random legal merges; planner = memoised search from the real `drop`. **Static** runs use the exact planner over the whole budget. **Supply** runs use the planner at **depth 3** (re-planned every merge).
- **Incoming parts (supply runs):** one part arrives after each merge (rank 1 with 75%, else rank 2; family cannon 50% / coil 25% / bell 25%; lands on the first empty cell of a seeded shuffled order). The queue is a function of the run seed; all bots of a run see the same queue. **200 runs per board** (seeds 0 to 199; seeds also drive the bots' tie-breaks and mistakes).
- **NEXT variants:** `+next` bots know what the next 2 parts are and where they land. greedy+next and human+next use a **2-ply** score (this merge + best follow-up merge after the next part lands); `greedy2` / `human2` are the same 2-ply bots **without** the strip (so the strip's own value is separable from the value of looking ahead at all). planner+next plans over the known arrivals.
- **Statistics:** ratio of means; 95% interval from a seeded paired bootstrap over runs (1000 resamples). Static runs have no randomness in the planner and greedy, so their greedy intervals are degenerate (width 0 where only tie-breaks vary rarely).
- **Sandwich boards** need the sandwich prototype (`TUNING.mergeRule = 'sandwich2'`: landing next to 2+ same-rank parts absorbs two and gains rank +2), which does not exist inside the puzzle engine. These three boards therefore run in `mode: free` (same board, `puzzle` flag dropped so the rule applies, merge budget enforced by the harness, no clock). Ordinary boards run in `puzzle` mode. `TUNING` is only touched at run time; nothing is saved.

## The six decoy boards

Letter = family (C cannon, K coil, B bell), digit = rank, `..` empty. Rows top to bottom, 5 columns. Authored by seeded hill-climbing from the bench board (mass- and part-count-preserving edits scored by planner/greedy, with a kind-specific proof of the trap), then selected and inspected by hand. The boards are data in `tools/decoy-boards.json`; the search is `tools/decoy-boards.ts search`.

"Trap lines" are the first merge of the greedy bot and the planner's line, from `tools/decoy-boards.ts lines <id>` (cell names `rRcC`, damage, chain length).

### Sandwich decoys

**sand-6a** (LAST 6)
```
  C3 .. .. .. K1
  C2 .. C2 .. B2
  .. .. C2 C2 ..
  .. C1 .. .. ..
  K2 .. .. B2 ..
  K1 .. .. .. B1
```
Trap: the biggest merge (114) is the sandwich in the middle of the four C2s, which swallows the C2 parts the best plan keeps for a 4-chain finish worth 228 to 248 per merge, so greedy deals 179 over 4 merges (no legal merge left for 5 and 6) against the planner's 1012 over 6.

**sand-6b** (LAST 6)
```
  B1 .. .. .. B2
  .. K1 C2 .. ..
  .. C2 C2 C2 ..
  .. .. C2 .. C3
  .. K2 .. K1 ..
  C1 .. .. .. ..
```
Trap: the biggest merge (147) sandwiches three C2s in the cross, which burns the C2s the planner uses one at a time for chains of 4 (124, 202, 237), and greedy is out of merges after 3 (214 total against the planner's 978 over 5; the static board runs dry for the planner too).

**sand-8a** (LAST 8)
```
  .. .. C2 C3 B1
  K2 .. .. .. ..
  B3 .. C2 B2 C2
  .. C2 C2 C1 ..
  .. .. .. K1 ..
  K1 K2 .. .. ..
```
Trap: the biggest merge (134) is a sandwich at r3c2 that uses up the C2 cluster, after which only two small merges remain (greedy 230 over 3 merges against the planner's 1048 over 5, so this board runs dry for both bots before the budget of 8); the planner instead walks the C2s into a 5-chain.

### Chain-setup decoys

**chain-6a** (LAST 6)
```
  C3 .. .. C3 K2
  .. .. .. .. C2
  K2 .. K1 B1 ..
  .. .. .. B1 B1
  C1 K1 .. .. ..
  .. .. B2 .. ..
```
Trap: the two C3s can merge from either end; landing on the right (169, chain 3) fires the K2/C2 neighbours too early, while landing on the left (114, chain 1, quiet) keeps them for later merges of chain 5 to 6 (191 to 240).

**chain-6b** (LAST 6)
```
  C3 C3 .. .. ..
  .. .. K1 .. C2
  C2 .. B2 .. C1
  .. .. K1 C1 ..
  .. .. B1 .. ..
  .. .. B2 .. B1
```
Trap: the biggest first merge (142, chain 8) fires the whole middle once with small ranks, while the planner opens with a cheaper 92 merge that sets up 6-chains on every one of its next five merges (131, 220, 227, 232, 221).

**chain-8a** (LAST 8)
```
  C2 .. .. C3 ..
  .. .. C2 .. C3
  B2 C1 C1 C2 ..
  .. B3 .. .. B1
  K1 .. .. B2 ..
  .. .. K1 K1 ..
```
Trap: greedy opens with a 114 C3 merge and a 102 chain-7, spending the machine chain on low ranks, while the planner starts with two quiet C2 merges (65, 134) that raise the rank under the chain and then plays 4-chains worth 196 to 373.

### Board checks

At least two legal merges at move 1, same part count and rank mass as the bench boards:

| board | LAST | parts | rank mass | legal first merges | distinct first-merge damages |
|---|---|---|---|---|---|
| sand-6a | 6 | 12 | 22 | 16 | 8 |
| sand-6b | 6 | 12 | 22 | 22 | 7 |
| sand-8a | 8 | 14 | 28 | 24 | 12 |
| chain-6a | 6 | 12 | 22 | 12 | 10 |
| chain-6b | 6 | 12 | 22 | 12 | 11 |
| chain-8a | 8 | 14 | 28 | 18 | 11 |

## Result 1: static boards (no incoming parts, exact planner)

200 greedy and human-proxy runs each (seeded tie-breaks and mistakes). "planner/human" is the ratio planner / human-proxy damage. "greedy merges spent" = merges greedy's first line can make before the board has no legal merge. The planner itself spends only 5 merges on sand-6b, sand-8a and chain-6a (no legal merge left for the 6th / 6th / 6th to 8th); it spends all merges on the others. Incoming parts (Result 2) remove these dead ends.

| board | kind | LAST | mass | first merges | planner dmg | planner/greedy [95%] | planner/human [95%] | greedy first-pick trap? | greedy dmg | human dmg | greedy merges spent |
|---|---|---|---|---|---|---|---|---|---|---|---|
| sand-6a | sandwich | 6 | 22 | 16 | 1012 | 5.65 [5.65, 5.65] | 4.24 [3.87, 4.64] | yes | 179 | 239 | 4/6 |
| sand-6b | sandwich | 6 | 22 | 22 | 978 | 4.58 [4.51, 4.65] | 3.59 [3.29, 3.92] | yes | 214 | 272 | 3/6 |
| sand-8a | sandwich | 8 | 28 | 24 | 1048 | 4.56 [4.48, 4.65] | 3.74 [3.47, 4.04] | yes | 230 | 280 | 3/8 |
| chain-6a | chain | 6 | 22 | 12 | 979 | 2.43 [2.43, 2.43] | 2.38 [2.34, 2.41] | yes | 403 | 412 | 5/6 |
| chain-6b | chain | 6 | 22 | 12 | 1123 | 2.19 [2.19, 2.19] | 2.10 [2.05, 2.16] | yes | 512 | 534 | 6/6 |
| chain-8a | chain | 8 | 28 | 18 | 1925 | 2.25 [2.25, 2.25] | 2.16 [2.10, 2.21] | yes | 854 | 893 | 8/8 |
| ord-last6-0 | ordinary | 6 | 22 | 10 | 801 | 1.68 [1.68, 1.68] | 1.74 [1.71, 1.77] | yes | 477 | 461 | 6/6 |
| ord-last6-1 | ordinary | 6 | 22 | 10 | 809 | 1.67 [1.67, 1.67] | 1.73 [1.71, 1.76] | yes | 485 | 467 | 6/6 |
| ord-last6-2 | ordinary | 6 | 22 | 10 | 741 | 1.56 [1.56, 1.56] | 1.62 [1.59, 1.65] | yes | 475 | 457 | 6/6 |
| ord-last6-3 | ordinary | 6 | 22 | 10 | 552 | 1.22 [1.22, 1.22] | 1.25 [1.24, 1.27] | yes | 453 | 440 | 6/6 |
| ord-last6-4 | ordinary | 6 | 22 | 10 | 933 | 1.29 [1.29, 1.29] | 1.39 [1.37, 1.42] | yes | 724 | 670 | 6/6 |
| ord-last6-5 | ordinary | 6 | 22 | 10 | 599 | 1.62 [1.62, 1.62] | 1.67 [1.65, 1.69] | yes | 370 | 360 | 6/6 |
| ord-last8-0 | ordinary | 8 | 28 | 20 | 1713 | 1.95 [1.95, 1.95] | 2.11 [2.09, 2.14] | yes | 880 | 810 | 8/8 |
| ord-last8-1 | ordinary | 8 | 27 | 22 | 1694 | 1.95 [1.95, 1.95] | 2.09 [2.06, 2.12] | yes | 870 | 812 | 8/8 |
| ord-last8-2 | ordinary | 8 | 28 | 20 | 1663 | 1.65 [1.63, 1.66] | 1.69 [1.66, 1.71] | yes | 1011 | 986 | 8/8 |
| ord-last8-3 | ordinary | 8 | 28 | 20 | 1781 | 1.64 [1.62, 1.67] | 1.71 [1.68, 1.75] | yes | 1085 | 1041 | 8/8 |
| ord-last8-4 | ordinary | 8 | 28 | 20 | 1914 | 1.48 [1.48, 1.49] | 1.59 [1.56, 1.62] | yes | 1291 | 1205 | 8/8 |
| ord-last8-5 | ordinary | 8 | 28 | 20 | 1539 | 1.58 [1.58, 1.58] | 1.54 [1.52, 1.56] | yes | 974 | 997 | 8/8 |

Reading: the exact planner beats greedy by 1.2 to 1.95 on ordinary boards already (so "a thinking gap" exists on today's capped boards, as PREVIEW_GAP said). The chain decoys raise that to 2.2 to 2.4. The sandwich decoys raise it to 4.6 to 5.7, but see the dead-end column: greedy cannot spend its budget there.

## Result 2: with incoming parts (depth-3 planner), 200 runs per board

| board | kind | runs | planner/greedy | planner+next / greedy+next | planner/human | planner+next / human+next | human+next / human | human dmg | greedy+next / greedy | planner+next / planner |
|---|---|---|---|---|---|---|---|---|---|---|
| chain-6a | chain | 200 | 1.62 [1.55, 1.68] | 1.39 [1.35, 1.45] | 1.74 [1.67, 1.82] | 1.55 [1.49, 1.62] | 1.17 [1.12, 1.21] | 853 | 1.20 [1.16, 1.25] | 1.04 [1.03, 1.05] |
| chain-6b | chain | 200 | 1.34 [1.30, 1.38] | 1.20 [1.17, 1.23] | 1.45 [1.41, 1.52] | 1.32 [1.27, 1.36] | 1.10 [1.07, 1.14] | 962 | 1.11 [1.08, 1.14] | 1.00 [0.99, 1.01] |
| chain-8a | chain | 200 | 1.54 [1.49, 1.59] | 1.24 [1.20, 1.28] | 1.72 [1.65, 1.80] | 1.48 [1.43, 1.54] | 1.16 [1.12, 1.19] | 1547 | 1.23 [1.19, 1.27] | 0.99 [0.98, 1.01] |
| sand-6a | sandwich | 200 | 1.64 [1.57, 1.72] | 1.12 [1.09, 1.15] | 1.72 [1.64, 1.82] | 1.26 [1.23, 1.31] | 1.40 [1.34, 1.48] | 688 | 1.52 [1.45, 1.59] | 1.03 [1.01, 1.05] |
| sand-6b | sandwich | 200 | 1.22 [1.18, 1.26] | 1.03 [1.02, 1.04] | 1.36 [1.30, 1.41] | 1.16 [1.13, 1.19] | 1.25 [1.20, 1.29] | 986 | 1.26 [1.22, 1.31] | 1.06 [1.05, 1.08] |
| sand-8a | sandwich | 200 | 1.19 [1.15, 1.23] | 1.04 [1.03, 1.06] | 1.41 [1.36, 1.46] | 1.22 [1.19, 1.25] | 1.20 [1.17, 1.25] | 1777 | 1.18 [1.15, 1.22] | 1.04 [1.03, 1.05] |
| ord-last6-0 | ordinary | 200 | 1.38 [1.34, 1.43] | 1.26 [1.23, 1.29] | 1.54 [1.49, 1.59] | 1.41 [1.37, 1.46] | 1.13 [1.11, 1.17] | 776 | 1.14 [1.12, 1.17] | 1.04 [1.02, 1.06] |
| ord-last6-1 | ordinary | 200 | 1.38 [1.34, 1.43] | 1.26 [1.23, 1.29] | 1.54 [1.49, 1.60] | 1.42 [1.37, 1.47] | 1.12 [1.10, 1.15] | 774 | 1.13 [1.11, 1.16] | 1.03 [1.02, 1.05] |
| ord-last6-2 | ordinary | 200 | 1.31 [1.27, 1.35] | 1.04 [1.03, 1.06] | 1.45 [1.40, 1.49] | 1.22 [1.19, 1.26] | 1.22 [1.19, 1.25] | 817 | 1.29 [1.26, 1.33] | 1.03 [1.02, 1.05] |
| ord-last6-3 | ordinary | 200 | 1.01 [1.00, 1.03] | 1.10 [1.07, 1.12] | 1.14 [1.11, 1.18] | 1.27 [1.23, 1.31] | 1.05 [1.03, 1.07] | 775 | 1.07 [1.05, 1.10] | 1.16 [1.13, 1.19] |
| ord-last6-4 | ordinary | 200 | 1.24 [1.20, 1.27] | 1.07 [1.06, 1.09] | 1.36 [1.32, 1.40] | 1.22 [1.19, 1.25] | 1.18 [1.15, 1.22] | 982 | 1.22 [1.19, 1.26] | 1.06 [1.04, 1.07] |
| ord-last6-5 | ordinary | 200 | 1.12 [1.08, 1.17] | 1.07 [1.05, 1.09] | 1.25 [1.20, 1.31] | 1.23 [1.20, 1.27] | 1.17 [1.13, 1.21] | 746 | 1.21 [1.18, 1.25] | 1.15 [1.12, 1.18] |
| ord-last8-0 | ordinary | 200 | 1.22 [1.17, 1.26] | 1.14 [1.11, 1.17] | 1.39 [1.33, 1.44] | 1.33 [1.29, 1.37] | 1.20 [1.16, 1.24] | 1367 | 1.23 [1.19, 1.27] | 1.15 [1.12, 1.17] |
| ord-last8-1 | ordinary | 200 | 1.22 [1.18, 1.27] | 1.11 [1.09, 1.14] | 1.39 [1.34, 1.45] | 1.30 [1.27, 1.35] | 1.19 [1.16, 1.24] | 1359 | 1.23 [1.19, 1.27] | 1.12 [1.09, 1.15] |
| ord-last8-2 | ordinary | 200 | 1.25 [1.20, 1.29] | 1.09 [1.07, 1.11] | 1.42 [1.37, 1.48] | 1.25 [1.21, 1.28] | 1.22 [1.18, 1.26] | 1435 | 1.22 [1.19, 1.26] | 1.07 [1.05, 1.09] |
| ord-last8-3 | ordinary | 200 | 1.12 [1.09, 1.15] | 1.15 [1.12, 1.18] | 1.30 [1.27, 1.35] | 1.34 [1.29, 1.39] | 1.09 [1.06, 1.12] | 1521 | 1.10 [1.07, 1.13] | 1.12 [1.10, 1.15] |
| ord-last8-4 | ordinary | 200 | 1.07 [1.05, 1.08] | 1.05 [1.04, 1.06] | 1.24 [1.20, 1.28] | 1.23 [1.20, 1.27] | 1.06 [1.04, 1.08] | 2000 | 1.07 [1.05, 1.09] | 1.06 [1.04, 1.07] |
| ord-last8-5 | ordinary | 200 | 1.07 [1.05, 1.10] | 1.10 [1.08, 1.12] | 1.24 [1.20, 1.28] | 1.28 [1.24, 1.32] | 1.08 [1.06, 1.11] | 1412 | 1.09 [1.07, 1.11] | 1.11 [1.09, 1.14] |

Columns "planner/greedy" and "planner/human" are the no-strip bots; the "+next" columns compare the same pair when both see the next 2 parts. Per-board, 200 runs, interval from a seeded bootstrap.

### Pooled by kind

Runs pooled per kind (boards of one budget are the same size; read per-board rows first).

| kind | runs | planner/greedy | planner+next / greedy+next | planner/human | planner+next / human+next | human+next / human | human2 (2-ply, no strip) / human | human+next / human2 |
|---|---|---|---|---|---|---|---|---|
| chain | 600 | 1.50 [1.47, 1.53] | 1.27 [1.25, 1.29] | 1.65 [1.61, 1.69] | 1.45 [1.42, 1.49] | 1.14 [1.12, 1.17] | 1.06 [1.04, 1.08] | 1.08 [1.06, 1.09] |
| ordinary | 2400 | 1.18 [1.17, 1.19] | 1.11 [1.10, 1.12] | 1.34 [1.33, 1.36] | 1.29 [1.27, 1.30] | 1.14 [1.13, 1.15] | 1.09 [1.08, 1.10] | 1.05 [1.04, 1.06] |
| sandwich | 600 | 1.28 [1.25, 1.31] | 1.06 [1.05, 1.07] | 1.46 [1.42, 1.49] | 1.21 [1.19, 1.23] | 1.26 [1.23, 1.28] | 1.23 [1.20, 1.25] | 1.02 [1.01, 1.04] |

## Result 3: is the human proxy crushed?

"kept" = the proxy's mean damage on the board divided by its mean damage on the ordinary boards of the same LAST budget (supply runs). "share" = proxy damage / planner damage on the same board, next to the ordinary mean share.

| board | LAST | human dmg | ordinary human dmg | kept | human share of planner dmg | ordinary share |
|---|---|---|---|---|---|---|
| chain-6a | 6 | 853 | 812 | 1.05 | 0.57 | 0.73 |
| chain-6b | 6 | 962 | 812 | 1.19 | 0.69 | 0.73 |
| chain-8a | 8 | 1547 | 1516 | 1.02 | 0.58 | 0.75 |
| sand-6a | 6 | 688 | 812 | 0.85 | 0.58 | 0.73 |
| sand-6b | 6 | 986 | 812 | 1.22 | 0.74 | 0.73 |
| sand-8a | 8 | 1777 | 1516 | 1.17 | 0.71 | 0.75 |

On the static runs (no supply) the proxy deals 239 to 893 against planner 978 to 1925 on decoys (share 0.24 to 0.48), versus 0.47 to 0.80 on ordinary boards: the same trap catches the proxy, which is why the success rule is read here as absolute damage with incoming parts ("kept"), not as the share. By absolute damage the proxy is **not crushed on any decoy** (0.85 to 1.22 of ordinary; the lowest is sand-6a at 0.85). By share of what is possible it falls to about 0.77 to 0.79 of the ordinary share on chain-6a, chain-8a and sand-6a, which is the gap those boards exist to create.

## Success criterion

Planner/greedy at or above **1.5** on decoy boards, human proxy at or above **0.8** of its normal damage.

| setting | planner/greedy at or above 1.5 | human proxy kept at or above 0.8 |
|---|---|---|
| static, exact planner (no supply) | **6 of 6** (2.19 to 5.65) | static damage is not comparable across boards; share 0.24 to 0.47 of the optimum |
| with supply, depth-3 planner | **3 of 6** (chain-6a 1.62, sand-6a 1.64, chain-8a 1.54; lower bounds 1.55, 1.57, 1.49), chain pooled 1.50 | **6 of 6** (0.85 to 1.22) |

Verdict: **the trap exists and is measurable, but with incoming parts only the strongest boards reach 1.5, and ordinary capped boards already sit at 1.2 to 1.4**. Decoys are worth authoring for a handful of boards, not as the main lever.

## NEXT strip

Same boards and runs as Result 2. A bot "+next" sees the next 2 incoming parts and their landing cells.

- **Human proxy with the strip gains +14% on ordinary and chain boards, +26% on sandwich boards** (human+next / human: every board is above 1.0; the smallest are ord-last6-3 at 1.05 and ord-last8-4 at 1.06). It is the largest, most reliable gain in the table.
- **Part of this is looking one step ahead at all**: a 2-ply human without the strip already gains +6% (chain), +9% (ordinary), +23% (sandwich). The strip itself adds +8% (chain), +5% (ordinary), +2% (sandwich) on top (human+next / human2).
- **The planner barely needs it**: planner+next / planner is 0.99 to 1.16 per board (mostly +0 to +7%; the biggest gains, +11 to +16%, are on seven ordinary boards, where the depth-3 plan is still short of optimal).
- **It narrows the planner-vs-human gap, not widens it**: planner+next / human+next is lower than planner / human on 15 of 18 boards (all six decoys; the exceptions are ord-last6-3, ord-last8-3 and ord-last8-5, where the planner profits more than the human; chain pooled 1.65 to 1.45, ordinary 1.34 to 1.29, sandwich 1.46 to 1.21). So the strip is a help to a casual player, and it would **cost the planner/greedy gap** (sandwich pooled 1.28 to 1.06 with both sides on the strip; chain 1.50 to 1.27).

## Recommendation

1. **Do not ship decoy boards as the answer to "make thinking pay".** On the static view they work (2.2 to 5.7), but once parts arrive only 3 of 6 clear 1.5 and the others sit at 1.2 to 1.34, hardly above plain capped boards (1.18). A hand-authored trap is a seasoning for some levels.
2. **If decoys are used, prefer the chain-setup kind.** It is the only kind where greedy still spends all its merges (5/6, 6/6, 8/8) so the gap is a real plan difference, it needs no new merge rule, it runs in the shipped puzzle engine, and the human proxy keeps 1.02 to 1.19 of its damage. The sandwich kind needs the unshipped sandwich prototype and works mostly by leaving greedy with no legal merge (3/6, 3/6, 3/8 merges spent), which a player would feel as a dead end, not as a smarter move.
3. **A NEXT strip is worth building as a planning aid.** It gives the human-like bot +14 to +26% damage for no loss of information, leaves the planner unchanged, and does not push the human proxy down. It cuts the pooled planner-vs-greedy ratio by 0.07 to 0.23 when everyone has it (the price of helping the casual player); if the design wants the 1.5 gap kept with the strip on, use chain decoys with it (chain-6a stays at 1.39 and chain-8a at 1.24 with both sides on the strip).
4. **Next measurement (not done here):** a depth-3 planner is an under-estimate on 8-merge boards (chain-8a planner+next / planner 0.99); rerun with an exact planner and the real supply odds of the level, and put a few real players on chain-6a / chain-6b to check that the "quiet setup" reads as discoverable and not arbitrary.

## Caveats

- Sandwich boards run outside the puzzle engine with the prototype `sandwich2` rule, harness-enforced budget, and no real supply/clock. They are authored against greedy-with-first-found ties; the large static ratios come from greedy's board running dry after 3 to 4 merges, not only from better plans.
- The supply queue is a stand-in (rank 1 / 2 parts, family odds like the bench boards, random landing among empty cells), not the real level supply stream.
- The human proxy is greedy with 20% random mistakes, not a person. "Normal damage" was read as the proxy's damage on ordinary capped boards of the same budget.
- The planner is depth-3 in supply runs; static runs use the exact planner.
- Ordinary boards are seeded re-seatings of the two bench boards, so they are correlated (several share the same top first merge).
- The intervals come from resampling runs of one board; they say nothing about board-to-board variation (read the per-board rows).

## Reproduce

```
npx vite-node tools/decoy-boards.ts list                        # boards, drawings, legal first merges
npx vite-node tools/decoy-boards.ts lines <id>                  # trap lines: planner vs greedy
npx vite-node tools/decoy-boards.ts static [filter]             # Result 1 rows
npx vite-node tools/decoy-boards.ts supply <board> 100 3 <from> # 100 runs from run number <from>, TSV
npx vite-node tools/decoy-boards.ts report <tsv files...>       # Results 2 and 3 and the pooled table
```
`supply` is the slow part (about 4 to 15 minutes of CPU per 100 runs depending on the budget); the runs here used chunks of 100 runs (`from` = 0 and 100) per board, several processes in parallel. Everything is deterministic, so the chunks are reproducible and mergeable.
