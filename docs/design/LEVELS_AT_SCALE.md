# Levels at scale (t-b9ba31e9, mission m-0f7b78b6)

Owner (2026-10-15): "We will need tens of thousands of levels just to start an MVP." Also: even the first levels finish in seconds; a level can be easy but not seconds. This doc is design only: no `src/`, `levels.json` or `puzzles.json` changes. Minimum duration itself is measured in sibling task t-7ab374d3; here it is only a quality gate with a placeholder number.

## 1. How levels work today

| Thing | Where | Size / count | How it is made |
|---|---|---|---|
| Saga levels | `src/content/levels.json`, read by `src/content/levels.ts` (`LEVELS`) | 80 levels, 53 KB pretty-printed (about 370 bytes per level; 3 teaching levels carry a scripted board) | Authored by hand (ChatGPT rounds), then HP is fitted by `tools/sim-levels.ts` (writes `hp` only) |
| Level fields | `LevelDef` | monster, hp, time_seconds (45 to 165 s), modifier, difficulty, behaviour, goal (rank / chain), waves, minion_hp, wave_visuals, mini_boss, star_times, seed | The board is NOT stored. `newLevel()` (src/core/game.ts) builds it from 8 chapter-starter parts at fixed cells (`STARTING_CELLS`, or 4 layouts when `variedOpenings`), then the seeded supply stream (`seed`) feeds parts |
| Mix of the 80 | | 49 plain, 18 "make rank N", 13 "chain of N"; 8 mini-bosses, 8 bosses; modifiers only on 5; behaviours on 21; 6 monster types | |
| Endless Road | `src/core/endless.ts` | 0 bytes per floor | After L80: floor n picks a calibrated L31+ template by hash, HP x1.05 per floor in a block of 10, x1.12 per block. Floor 5 mini-boss, floor 10 boss. Same rules, only HP grows |
| Daily seeds | `src/content/dailySeeds.ts`, `tools/daily-seeds.ts` | 120 numbers (about 1.3 KB) | A seed ships only if a random 5 s novice bot AND a cascade bot both win it |
| Workshop puzzles | `src/content/puzzles.json` (148 KB: 40 dailies + unit drills), `tools/gen-puzzles.ts`, solver `src/core/puzzle.ts` | about 3 to 4 KB per puzzle | Random board; the real engine enumerates every merge sequence (cap `MAX_LINES` 12000); HP is picked so the difficulty score lands in the slot's band. Exact: a win line is stored as `solution` |
| Screw Yard | `src/content/yards.json` (32 KB, 10 yards per week), `tools/gen-yards.ts`, `src/core/yardGen.ts` + `yardSolver.ts` | about 3 KB per yard | Generated per week from knobs, solved exactly, kept if its score is nearest the 10 to 68 climb |
| Last Merges (budget) | `budgetLevels.json` (6 KB), `tools/make-budget-levels.ts` | a handful | Authored boards, exact planner sets HP |
| Daily run | `newGame(seed)` | 0 bytes | Seed to whole run (supply, perk and kickback `Rng` streams) |
| Tests | `tests/levelReport.test.ts`, `goals.test.ts`, `endless.test.ts`, `openings.test.ts`, `teaching.test.ts`, `puzzles.test.ts`, `yard2.test.ts`, `tests/golden/flagsOff.json` (12 level hashes), `core.test.ts` invariants (seed + actions identical state) | | |
| Reports | `tools/level-report.ts` (4 bots per level, CSV/MD), `tools/sim-levels.ts`, `fit-goals.ts`, `star-times.ts` | | |
| Load | `levels.json`, `puzzles.json`, `yards.json` are static JSON imports, so they sit in the main JS bundle (about 240 KB raw JSON together). No lazy loading exists | | |

Three facts that shape everything below:

1. **A saga level is about 12 numbers.** Everything dynamic comes from the engine plus the seed. Scale is a parameter problem, not an asset problem.
2. **Saga levels have no exact solver.** Play is real time with a random supply, so "solvable" today means "a bot wins often enough". Only puzzles, yards and budget levels are provably solvable (exhaustive search or planner).
3. **HP is fitted to a bot win rate** (`sim-levels.ts`: novice 85-95% Normal). Nothing fits clear time. High-win-rate HP plus fast chains is the likely cause of the "finishes in seconds" report. A min-duration gate must be part of the fit, not a check afterwards.

The Endless Road is a warning: HP x1.12 per block of 10 means about x290 at floor 500 and x83,000 at floor 1000 with a fixed clock. Scaling must use several axes (time, wave count, behaviours, board twists, goals), not HP alone.

## 2. How other games supply content (general knowledge, not re-verified, no figures quoted)

- Match-3 leaders hand-author thousands of levels and add a batch weekly; they lean on live data (win rate, attempts per level) to re-tune HP/moves after launch. Difficulty is a sawtooth: easy, easy, hard, breather.
- Endless or arcade puzzlers (block puzzles, 2048-likes, Tetris variants) generate on the fly and gate by "never deal an unsolvable state"; difficulty is a function of a score or index.
- Daily puzzles (Wordle, Sudoku, Spelunky-style daily seeds) are one seed per date; content is a formula plus a quality list.
- Roguelikes and merge games loop chapters: same building blocks, new combinations, each loop raises a few knobs and unlocks a new twist.
- Merge games (merge-and-quest) mostly supply content as events, quests and orders, not as a numbered road: live-ops cadence replaces volume.
- Almost nobody plays 50,000 distinct levels. At about 2 minutes a level, 10,000 levels is about 330 hours. The real requirement is "the road never visibly ends and never repeats noticeably", plus a launch set that feels crafted. See question 1.

## 3. Three options

Shared compact format (used by A and B): one level is a tuple, not the pretty `LevelDef`:

```
[monsterId, hpExp(u8, log scale), time/5 (u8), modifier|behaviour (u8), goalKind|goalN (u8), waves|miniBoss|mania (u8), seed (u32)]
```
About 10 bytes binary, about 45 to 60 bytes as compact JSON. Everything else (names, copy, visuals, rewards, stars) is derived by existing code (`levelReward`, `starGoals`, CAST by chapter).

### Option A: seeded procedural generator, solver/bot validated

- **Description.** `genLevel(index)` is a pure function: index to chapter, position in block, target difficulty from a ramp curve, then parameters picked from the allowed set with `Rng(hash(index))`. A build tool runs the quality gates over index ranges and writes a small ledger (indices rejected and re-rolled with a salt; fitted HP and time).
- **Data per level.** 0 bytes if fully formula (ledger lists only exceptions: about 4 bytes each); about 10 bytes with the HP fit stored. 10,000 levels = 100 KB tuples (about 30 KB gzipped); 50,000 = 500 KB. Load: ship 100-level chunks (about 1 to 6 KB each), `import()` the current chunk and prefetch the next; the first 100 stay in the main bundle.
- **Quality gates.**
  - Solvable: saga levels = bot gates (thinker bot wins at least the band; idle and 1 s spam bots stay under their caps, as `sim-levels.ts` and `level-report-lib.ts` do today). No proof is possible for real-time play; say so in the ledger ("bot-verified").
  - Min duration: HP is fitted so the thinker bot's median clear time is at least `MIN_CLEAR` and the 10th percentile is at least about half of it (no lucky 8 s clears). `MIN_CLEAR` and the ramp of target durations come from t-7ab374d3.
  - Ramp: smoothed difficulty score (HP/dps, clock, behaviour weight, goal weight) must rise with a sawtooth: breather every 5th, mini-boss 5th, boss 10th, never a drop larger than a set fraction.
  - Uniqueness: fingerprint = (monster, behaviour, modifier, goal, HP bucket, wave count); no repeat inside a window of N levels, and a twist budget (existing `conceptsOf` / `newConcepts`): at most one concept new to the player per level.
  - MANIA label: see section 4.
- **Readability.** The level intro card already prints one line of rule text (`BEHAVIOUR_TEXT`, `goalText`). A generator may only use concepts that have a card line, at most 2 at once, and it must show chapter cast and name from a fixed table. Weakness: pure generation tends to feel samey past a few hundred levels.
- **Effort: L.** Generator, bot-fit pipeline with duration objective, ledger, chunk loader, road virtualisation.
- **Risks.** Bot compute (see section 5); bots are not humans (a smart bot clears a chain level that a human cannot see); sameness; HP-only scaling collapses (see Endless warning).
- **Tests.** `genLevel(i)` equals itself and a stored golden hash of levels 1 to 1000; bounds on every field for a 50,000 sweep (cheap, no sim); ramp and cadence checks on the sweep; fingerprint window check; sampled bot gate (about 40 levels, n = 20) in `npm test`, full ledger in a tool run; `flagsOff` golden unchanged; chunk files parse and cover the index range without gaps.

### Option B: hybrid, authored/curated first ~300, then generated endless chapters

- **Description.** Levels 1 to 80 stay as they are (re-fit for duration). Levels 81 to about 300 are produced by Option A's generator, then a human reviews them on a contact sheet per chapter and edits or rejects (the curated tier). From L301 on, "chapters loop with scaling": chapter k of a loop reuses the curated chapter's recipe, raises several knobs (clock, wave count, behaviour pairs, board twist from `LAYOUTS`/modifiers, rank goal) and changes cast skin. This replaces the HP-only `endless.ts`.
- **Data per level.** Curated tier: the compact tuple above (about 60 bytes JSON), 300 levels about 18 KB, all in the main bundle. Loop tier: 0 bytes (recipe id + loop number + seed), chunks not needed until about L3,000, chunk loader added at the 10,000 step.
- **Quality gates.** Same as A, plus: curated tier needs a human "approved" flag in the file; loop tier inherits the recipe's approval and is bot-gated on a sample per loop (all 10 per chapter at loop k, since the numbers are only scaled).
- **Readability.** Best: the first 300 are a taught, paced experience (one new idea per level, named bosses); loops re-show known ideas in a bigger form, so the card text is already learned. Weakness: past L300 a player can notice repeats of recipes; mitigated by the extra knobs.
- **Effort: M** for the first ~300 plus loop (reuses most of A as a smaller slice); the L in A is deferred until you need 10,000 pure-generated levels.
- **Risks.** Human review time per 100 levels (about one contact sheet per 10, from `level-report.ts`); loop scaling can still outgrow what the engine supports (rank cap 8 from L21, board is 6x5, so late levels must use time and goals, not bigger boards); the first-300 quality bar sets expectations.
- **Tests.** As A, plus: L1 to 80 hashes unchanged apart from the intentional duration refit (documented golden update); loop k+1 is strictly harder than loop k on the difficulty score at equal position; curated file has no unapproved entries.

### Option C: templated puzzle families with parameter ranges

- **Description.** Treat each family as a template with an exact solver, and the road is a mix of families: Workshop Puzzle (win in N merges, `puzzle.ts`), Last Merges (`budget.ts` planner), Screw Yard (`yardSolver.ts`) and goal levels. Each family has parameter ranges (pairs, singles, moves, colours, plates) and a difficulty score; a generator draws parameters and keeps the instance if the exact solver proves it solvable and the score matches the slot.
- **Data per level.** Today puzzles cost 3 to 4 KB each (board list + solution), yards about 3 KB: 10,000 puzzles would be 35 MB raw, so store only `(family, params, seed)` (about 8 bytes) and regenerate at load or on demand from the seed (generation costs up to 300 board attempts; must be cached per chunk). Solutions are recomputed or stored as short move lists (about 6 bytes per move). 10,000 levels about 100 KB; 50,000 about 500 KB, still chunked.
- **Quality gates.**
  - Solvable: proven (exhaustive or planner), the only option where it is.
  - Min duration: a puzzle has no clock, so duration is "moves needed" times think time. Gate on min moves (for example 3 or more) and on `tempting` / `greedyFails` so it is not a one-glance answer.
  - Ramp: the existing score band per slot (10 to 68 on yards, 1 to 3 merges on puzzles).
  - Uniqueness: canonical board hash (rotate and reflect not applicable on a 5x6 board with fixed art, so only family + sorted board) must not repeat.
  - MANIA: not applicable to untimed puzzle families; only the timed saga families can carry the label.
- **Readability.** Best per level (small board, one rule, single "aha"), but it changes what the game is: the core is a real-time merge fight, and puzzles are a side mode today. Players on the road would see a different game every few levels.
- **Effort: M** per family if the solver exists (it does for 3), **L** to make a road that weaves them with saga levels.
- **Risks.** Exhaustive solver does not scale to bigger boards (cap 12,000 lines); load-time generation on phones; possibly wrong product shape (the owner's complaint is about saga fights being too quick).
- **Tests.** Every generated instance re-solved in test (sample) and `solution` replays to a win through the real engine; deterministic generation hash; no duplicates within a chunk; min-moves bound.

### Comparison

| | A procedural | B hybrid (recommended) | C families |
|---|---|---|---|
| Bytes per level | 0 to 10 | 60 (curated), 0 (loop) | about 8 plus solve cost |
| 10k / 50k in bundle | 100 KB / 500 KB, lazy chunks | about 18 KB + recipes; chunks only if you pre-bake | 100 KB / 500 KB, lazy chunks |
| Solvable proof | bot-verified only | bot-verified; curated eyeballed | proven |
| Feel at L1 to 300 | generic | crafted | different game |
| Effort | L | M (L later) | M to L |
| Biggest risk | sameness, bot compute | review time | product shape |

## 4. Quality gates, one place

1. **Schema and bounds** (free, run on all 50,000): fields in range, rank/goal reachable under the rank cap, modifier/behaviour pair allowed.
2. **Determinism**: same index, same level; seed plus actions gives identical state (existing invariant).
3. **Win band**: thinker bot at least the band, idle never wins, spam bot under cap (reuse `level-report-lib.ts` flags).
4. **Min duration**: HP fitted with the duration objective; median thinker clear at least `MIN_CLEAR(index)` and p10 at least half of it. Number from t-7ab374d3; a rank/chain goal level counts the time to reach the goal, not HP.
5. **Ramp**: smoothed difficulty rises, sawtooth cadence fixed (5 mini, 10 boss, breather after boss).
6. **Uniqueness**: fingerprint window plus a concept budget (one new concept per level, at most two at once).
7. **MANIA labelling.** `pace` is a global switch today (`TUNING.paces`: today / calm / mania, CALM ships). A MANIA level is therefore a per-level flag `pace: 'mania'` that needs engine support (separate task in `src/`). Rules: never before the first few chapters, at most 1 in 10 levels, shown on the road node and intro card, HP fitted and gated under the MANIA pace (`sim-levels.ts --pace mania`), never counted for the ramp slope.
8. **Human sampling**: 1 level in 100 viewed as a contact sheet (monster, board, rule text, stars); curated tier reviews all.

## 5. Path to 1,000, 10,000 and 50,000

Compute is unmeasured: the worktree has no `node_modules`, so a bot-run speed was not timed. Step 0 below measures it. Rough scale: one gate = about 20 runs x about 3 minutes of play at 20 ticks per second = 1,200 ticks x 20; multiply by the number of bots (4 in `level-report.ts`) and by about 10 bisection steps for the fit.

**Step 0 (S): make the fit measure duration.** Add a clear-time objective to the HP fit (`sim-levels.ts`), time one bot run, refit L1 to 80 and report. Without this, every generated level inherits the seconds problem.

**Step 1: about 1,000 good levels (M).**
- Option B's generator slice (A-lite): `genLevel(index)` for chapters beyond 8 using a parameter table per chapter (monster, behaviour pool, goal pool, time band), compact tuple file, all in the bundle (about 60 KB).
- Gates 1 to 6 on every level; gate 8 on all of L81 to L300, 1 in 20 afterward.
- Replace HP-only growth in `endless.ts` with multi-knob scaling per loop.
- Road: window the road list (the road perf work already virtualises drawing; check save and map code for any `LEVELS.length` assumption).
- Exit test: golden hash for L1 to 1,000; a human plays L81 to L120 at the intended duration.

**Step 2: 10,000 (M).**
- Chunked lazy loading (100 levels per chunk, prefetch the next one; offline fallback = chunk cache); first chunk and L1 to 300 stay in the bundle.
- Tool run `gen-levels.ts --from --to` writing chunk files plus a ledger; nightly full gate run, CI sample.
- New twist families appear every few hundred levels (unit unlocks, new modifiers) so loops are not repeats.
- Telemetry hook (if any is added later): win rate and attempts per level feed a re-fit; keep it optional.
- Exit test: bundle budget test (main bundle growth under a set number), chunk gap test, 10,000-row sweep under a minute.

**Step 3: 50,000 (S to M on top of step 2).**
- Fully formula-driven: no per-level fitted data, only the ledger of rejected indices and per-loop fitted constants (500 KB or less, or computed on load per chunk).
- Live content: seasonal or event chunks added over the air (needs a server or static file host; the project is a static GitHub Pages build today, so a JSON file next to the app works).
- Honest check: 50,000 levels at 2 minutes is about 1,700 hours of play. The gate set must be sampled, not exhaustive, at this size.

## 6. Recommendation

**Option B (hybrid)**, built on Option A's generator, with Option C's solver families kept as a separate daily/side mode where they already live.

Why: the owner's real problem is "levels end in seconds and we will run out". B fixes duration first, gives a crafted first 300 (where retention is decided), and reaches 10,000 and 50,000 with the same generator and no per-level art or hand data. A alone risks a generic road from L1; C changes the product.

## 7. Questions for the owner (at most 2)

1. **Is "tens of thousands" a launch need or a "never runs out" promise?** 1,000 good levels at about 2 minutes is about 33 hours of play. If launch only needs an endless-feeling road, we ship the 1,000 step and the loader, and 10,000 / 50,000 follow after we see real play data.
2. **After about L300, is it fine that levels are known recipes made harder (new clock, waves, behaviour pairs) rather than each being a new idea?** If not, Option B needs a bigger authored tier (about 1,000), which is review time, not engineering time.
