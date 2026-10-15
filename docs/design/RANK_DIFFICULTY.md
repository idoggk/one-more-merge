# How hard is each unit rank to reach?

Mission m-a1ae0b28, task t-26efe451. Read-only measurement: no gameplay code, `levels.json` or `puzzles.json` was changed.
Pace is **CALM** (the shipped default `DEFAULT_PACE`). Commit measured: `5c3a5ca` (+ the two new tools below).

**Question:** per unit family and rank 1-8, how many merges, how many units, how much time, and at which level can a player first reach it?
**Numbers reported:** (a) exact merge/unit counts from the merge rules (formulas), (b) per level and family, the share of 20 simulated runs that reach rank k (Wilson 95% interval), the median second and median player-merge count at which it appears.

## Plain summary

Ranks 2-3 are free: every level hands them out within about 20 seconds (cannon rank 3 at 21 s / 6 merges on L1). Rank 4 is easy for cannons (L3, ~53 s) and still comfortable for the other families by L8-L16. **Rank 5 is the first real work** (cannon L7, ~77 s, 65% of runs; about 20 merges in a 60-90 s level). **Rank 6 has a cliff at L21:** in chapters 1-2 a cannon rank 6 appears in only 5-20% of runs (L12 20%, L7 10%), then on L21 (chapter 3, where starting ranks become 2 and copies are capped at 4) 90% of runs get it in 70 s. **Rank 7 and 8 are cannon-only in practice**: cannon rank 7 at L30 (75%), rank 8 at L43 (50%); other families rarely pass rank 6 (coil r7 L46, bell r7 L41) and never reach rank 8 under the normal merge-a-random-pair player. Rank 8 costs about 112-165 s, i.e. nearly the whole level clock (median level 125-165 s on those levels). The *support/relay* families (fan, magnet, battery) and the rocket are **too hard to progress**: battery tops out around rank 3 (L32), fan/magnet around rank 4 (L65/L67, chapter 7), rocket stops at rank 4 (L6) and never gets rank 5 in more than 25% of runs, because those families are scarce in the supply. Too easy: ranks 2-3 everywhere, rank 4 for cannons from L3. Too hard / cliff: rank 6 before L21, rank 7-8 outside cannon, every rank >=5 for non-cannon families.

## Measured vs estimated

| Item | Status |
|---|---|
| Merges and rank-1-equivalent units per rank (table 1) | **Formula**, exact from the merge rules (plain merge: 2^(k-1)-1 merges; sandwich: see below). Not simulated. |
| Reach %, median seconds, median player merges, first level (tables 2-4) | **Measured** with the game's own `newLevel / drop / tick` under CALM, 20 runs per level and bot, seeds fixed. |
| Sandwich effect | Formula (table 1) is exact for the best case. The *measured* sandwich run (`--merge-rule sandwichBonus`) is in the data folder; with n=20 the differences vs today are inside the intervals (about +-20 percentage points), so **no clear effect found**, not "no effect". The bot never aims at a sandwich. |
| "Typical units consumed" | **Estimated.** Mass needed is 2^(k-1) rank-1 units whatever the route. Parts physically dropped = player merges + 1 for a pure plain-merge chain; the sim records merges, not units, so a real count of parts fed is not measured. Free higher-rank copies and starting ranks mean the player feeds fewer than 2^(k-1) rank-1 units. |
| Real players | **Not measured.** Bots only (below). |

### Table 1 (formula): cost of rank k from rank-1 units

Plain merge: two rank r make rank r+1. Sandwich (+2): four rank r parts make rank r+2 in one merge, S(k) = min(1+2S(k-1), 1+4S(k-2)). Seconds assume one merge every 3.5 s (the "novice" bot speed).

| rank | rank-1 units (min) | merges, plain | merges, best with sandwich +2 | s plain | s sandwich |
|---|---|---|---|---|---|
| 1 | 1 | 0 | 0 | 0 | 0 |
| 2 | 2 | 1 | 1 | 4 | 4 |
| 3 | 4 | 3 | 1 | 11 | 4 |
| 4 | 8 | 7 | 3 | 25 | 11 |
| 5 | 16 | 15 | 5 | 53 | 18 |
| 6 | 32 | 31 | 11 | 109 | 39 |
| 7 | 64 | 63 | 21 | 221 | 74 |
| 8 | 128 | 127 | 43 | 445 | 151 |

Supply is about one part per 1.7-2.4 s (`TUNING.supplyPeriod`, `supplyCurve`), so a rank-8 from pure rank-1 parts would also need ~128 drops (4-5 minutes): it only works because levels supply higher-rank copies (copy cap per level) and start with rank 2-3 boards.

Level rank rules (read from `levels.json` / `game.ts`): `starting_rank` 1 on L1-20, 2 on L21-40, 3 on L41-60, 2 on L61-80; copy cap 1 (L1-5), 2 (L6-20), 4 (L21-30), 5 (L31-40), 6 (L41-50), 7 (L51-80); rank cap 6 below L21 and 8 from L21 (`game.ts:300`). Level clock (`time_seconds`) 45 s on L1 up to 125 s and more later.

### Table 2 (measured): pooled over every (level, family) where rank k is reached by >=20% of runs; random bot, CALM, today's rule

| rank | (level, family) pairs | median s | p10-p90 of per-level s | median player merges | median level length s |
|---|---|---|---|---|---|
| 2 | 255 | 0 | 0-18 | 0 | 116 |
| 3 | 251 | 11 | 0-46 | 3 | 116 |
| 4 | 237 | 35 | 7-70 | 10 | 116 |
| 5 | 205 | 63 | 28-88 | 18 | 125 |
| 6 | 168 | 91 | 63-116 | 26 | 125 |
| 7 | 93 | 105 | 84-137 | 30 | 154 |
| 8 | 30 | 126 | 102-147 | 36 | 165 |

Caution: ranks 2 and 3 show 0 s because from L21 on the board *starts* with rank 2-3 units; the per-level 11 s / 3 merges for rank 3 is the honest first-chapter figure (cannon L1: 21 s, 6 merges incl. kickback fuses).

### Table 3 (measured): where a player first reaches rank k, by family

Cell: first level (chapter) where >=50% of 20 random-bot runs reach it, with the reach, median second and median merges at that level. `[...]` = earliest level where at least 1 in 20 runs got it (only shown when earlier). `-` = never reached by 50% of runs on any of the 80 levels. Random bot = a random legal merge every 3.5 s, goal-aware.

| family | r4 | r5 | r6 | r7 | r8 |
|---|---|---|---|---|---|
| cannon | L3 (ch1) 100% 53 s/15m | L7 (ch1) 65% 77 s/22m | L21 (ch3) 90% 70 s/20m [L4 5%] | L30 (ch3) 75% 126 s/36m | L43 (ch5) 50% 112 s/32m |
| coil | L8 (ch1) 65% 74 s/21m | L16 (ch2) 75% 81 s/23m | L33 (ch4) 50% 95 s/27m | L40 (ch4) 50% 151 s/43m | - [L40 5%] |
| bell | L8 (ch1) 50% 70 s/20m | L21 (ch3) 75% 46 s/13m [L5 5%] | L26 (ch3) 50% 105 s/30m | L41 (ch5) 60% 126 s/36m | - [L21 5%] |
| rocket | L6 (ch1) 80% 39 s/11m | - [L6 25%] | - | - | - |
| magnet | L67 (ch7) 60% 137 s/39m [L25 30%] | - [L67 20%] | - [L67 5%] | - | - |
| fan | L65 (ch7) 60% 130 s/37m [L27 5%] | - [L65 15%] | - | - | - |
| battery | - [L32 30%] | - [L32 10%] | - [L69 5%] | - | - |

Ranks 2-3 per family (same bot): cannon L1/L1, coil L2/L2 (50%), rocket L6/L6, bell L2/L3, magnet L12/L25, fan L23/L65, battery L17/L32. The rank-seeking bot (always merges the highest-rank pair) gets further: cannon r6 L4 (60%), r7 L21 (55%), r8 L22 (55%); coil r6 L26, r7/r8 L34; bell r6 L26, r7 L34, r8 L42; rocket stops at r4 (L6); fan/magnet/battery stop at rank 2-3. Complete tables for both bots and both merge rules are produced by the commands below.

### Table 4 (measured): best chance for rank k per chapter (any family, random bot)

| chapter | r4 | r5 | r6 | r7 | r8 |
|---|---|---|---|---|---|
| 1 (L1-10) | cannon L3 100% | cannon L7 65% | cannon L7 10% | - | - |
| 2 (L11-20) | cannon L11 100% | cannon L16 100% | cannon L12 20% | - | - |
| 3 (L21-30) | cannon L21 100% | cannon L21 100% | cannon L30 95% | cannon L30 75% | cannon L30 30% |
| 4 (L31-40) | 100% | 100% | cannon L31 100% | cannon L40 55% | cannon L40 20% |
| 5 (L41-50) | 100% | 100% | cannon L43 100% | cannon L50 90% | cannon L43 50% |
| 6 (L51-60) | 100% | 100% | 100% | cannon L60 95% | cannon L53 65% |
| 7 (L61-70) | 100% | 100% | cannon L67 100% | cannon L62 75% | cannon L62 40% |
| 8 (L71-80) | 100% | 100% | cannon L72 100% | cannon L80 80% | cannon L75 35% |

**Under CALM, the first level a player can reach each rank (cannon, the fastest family, 50%+ of runs):** r2 L1, r3 L1, r4 L3, r5 L7, r6 L21 (1 in 20 on L4), r7 L30, r8 L43 (the best chapter-3 cannon run for r8 is 30% at L30, and 5% at L21).

## Findings

1. **Too easy:** rank 2-3 (always inside 20 s), rank 4 for cannon (by L3), rank 4-5 once chapters 2+ start with rank 2-3 boards (100% by the first level of every chapter from ch2).
2. **Cliff at L21:** cannon rank 6 goes from 5-20% (L1-20) to 90% on L21 because the starting rank and copy cap jump together. Chapter 1-2 players cannot realistically see rank 6, then everyone gets it in one level.
3. **Cliff at ranks 7-8 outside the cannon:** cannon r7 at 75% on L30 versus coil r7 at 50% on L40 and bell r7 at 60% on L41; r8 only exists as a one-family achievement.
4. **Scarce families:** rocket (first appears L6, stuck at r4), magnet (L12), fan (L23), battery (L17) are supplied so rarely that their higher ranks are almost unreachable (fan r4 only on chapter 7, battery never r4). If rank art/effects for 5-8 matter on those families, players will not see them.
5. Rank 8 costs about the whole clock (median 126 s at pooled >=20% reach, 112 s for the cannon at L43 where level length is about 125-165 s). It is a late-chapter, cannon-only milestone, not a progression ladder.

## Limits (honest)

- Bots, not people: a random-pair merge every 3.5 s (goal-aware like `tools/sim-levels.ts`) and a "rank-seeking" bot. Neither plans sandwiches, neither uses scrap, perks beyond choice 1, or the family-filter; real skilled players will reach ranks sooner and unskilled later.
- n = 20 runs per level and bot: a 50% result has a Wilson 95% interval of roughly 30-70%; `reach` of 5% means 1 run in 20 (interval 1-24%). Treat single-level values (for example L21 vs L22) as ordered by tens of percentage points only.
- "Reached" means a unit of that rank was on the board at any tick, including starting boards, kickback fuses and sandwiches. It does not require that the player kept it.
- Only the shipped CALM pace and flags default OFF/ON as in `DEFAULT_PACE`; the TODAY and MANIA paces, boss hazards that destroy units during boss levels, and the Screw Yard are not modelled separately (bosses do run inside `tick`).
- The sim ran in the `random`/`rankseek` kind for all 80 levels, `today` and `sandwichBonus` merge rules; `sandwich2` was not run.

## Reproduce

Everything is deterministic: seeds are `level seed * 31 + run`. The whole run was repeated and diffed: identical output (8 level chunks, byte-identical text).

```
# per-chunk run (about 15 s per chunk of 10 levels), repeat for chunks 0..7 (levels 10*i+1 .. 10*i+10)
npx vite-node tools/rank-difficulty.ts --n 20 --levels 1,2,3,4,5,6,7,8,9,10 --json c0.json
npx vite-node tools/rank-difficulty.ts --n 20 --merge-rule sandwichBonus --levels 1,2,...,10 --json c0.json

# tables (formula table + 4 measured tables): dir with c0.json..c7.json for today, optional second dir for sandwichBonus
npx vite-node tools/rank-difficulty-table.ts docs/design/rank-difficulty-data/today docs/design/rank-difficulty-data/sandwichBonus
```

Raw data (text + json per chunk): `docs/design/rank-difficulty-data/today/` and `.../sandwichBonus/`. Tools added: `tools/rank-difficulty.ts` (the sim wrapper; it uses the game's own `newLevel`, `drop`, `legalPairs`, `tick`, no rule is reimplemented) and `tools/rank-difficulty-table.ts`. Not used: `tools/smoke-levels.mjs`, solver scripts (they test level clearability, not ranks).
