# Unity port: boundary of step 2 and the remaining order

Plan: `docs/design/UNITY_PORT_PLAN.md` (section 6 phase 0, section 9). `src/` is frozen and read only; the TS core is the reference. Sizes below are bytes of `src/core` / `src/content` files at this commit.

## How the boundary was chosen

`game.ts` (87 KB) imports almost every other core module, and `merge()` inside it calls `resolveCascade` (`cascade.ts`, 60 KB, which imports roster1..7), damage, supply, boss and support hooks. A merge is therefore not separable from the cascade in the TS code itself, but the **board effect** of a merge/move/swap is: it is a handful of lines in `game.ts` (`makeGadget`, `capOf`, `canMerge`, the grid part of `newLevel`, `dropNow`, the grid writes of `merge`) plus `sandwich.ts` (5 KB, imports only `tuning` and `types`). Modules were ordered by how few other modules they import (`rng`, `types`, `sandwich`, `openings`, `remix` are leaves; `game`, `cascade`, `support`, `tools`, `marks`, `hitFormula` sit at the top).

## Step 2 (done): board slice, C# `Board.cs` + `Content.cs`

In (all in plain C#, netstandard2.1, no UnityEngine):
- Content tables: `FAMILIES` (39, same order), `isShooter`, `isRelay`, flags-off `UNITS` (role, rarity, slot), `MAX_RANK` 6, Saga rank cap 8 from level 21, `capOf`. Asserted against the TS tables.
- Start board of every level (all 80): teaching starts, default squad on layout A, shooter override (L6 rocket), `start_extra`, GAPS / CORNERS masks, boss and mini-boss second squad placed with the seeded `Rng(seed ^ 0xb055)` shuffle, Jumpstart. Asserted by state hash for all 80 levels.
- Placing: `drop` = refuse (same cell, out of range, empty cell, wrong id, masked cell), move, swap. Move/swap never change a rank.
- Plain merge: same family and rank, rank+1 capped, Saga cap compaction (two cap parts become one), one cell freed, new id, family kept.
- Sandwich rule (`TUNING.mergeRule` today / sandwich2 / sandwichBonus, `sandwich.ts`): neighbour search, pair choice, +2 rank with cap clipping, the `bonus` flag. Included because it is pure board logic.

Out (stays in TS, ported later): the Overdrive amount the sandwich bonus pays (`sandwichOd`, needs `odNeeded`), anything a merge triggers (cascade, damage, supply of new parts, odd/bonus counters, items, tools), `varied openings` layouts (flag off), the remix modifiers SUCTION / JAM / ROW_GAPS (no level in `levels.json` uses them; their drop locks come with remix), boss drop locks (`bossBlocked`, tow, slick, portals), puzzles, tutorial phase, roster B / support / toy flags (all assumed OFF).

## Remaining order (each step: C# + a cases file from `tools/export-parity-*.ts` + xUnit parity tests)

3. **Cascade core** (`cascade.ts` default families only: cannon, coil, bell, plus `hitFormula.ts` damage numbers, `TUNING` damage constants): bounded BFS, once-per-cascade rule, strongest charge wins. Needs `Gadget.cd`, perks list. Parity: activation lists + totals for the board cases of step 2. This is the biggest and riskiest step.
4. **Game state + `tick`** (`game.ts` state, `newGame`, `newLevel` rest: hp, time, stages/waves, goal, `supplyPeriod`, packet/bag supply, reactive supply, Overdrive, kickback, `applyDamage`, win/lose), `pace`/`replay`. Parity: replay `tests/golden/flagsOff.json`.
5. **Boss and remix** (`boss.ts`, `remix.ts`): attacks, drop locks, relabel, ransom, chapter bosses.
6. **Roster families** (`roster1..7.ts`, the cascade branches they add, `marks.ts`, Wrench/Crane/Capacitor state), each behind its flag.
7. **Support cards, tools, items** (`support.ts`, `tools.ts`, `spareParts`, items in `game.ts`).
8. **Meta that the phone build needs** (not the board): `puzzle`/`yardSolver`/`screw*`/`yard*` (Screw Yard; `screw.ts` only imports `rng`, so it can move earlier if wanted), `crates*`, `economy`, `season`, `endless`, `bounty`, `rush`, `unlockPlan`, `mastery`, `budget`.

Rules of the road for every step: the TS core stays the reference; the exporter must fail loudly if the TS result is something the C# slice does not model (as `export-parity-board.ts` does with its `check()`), so a hash match means the same thing in both.
