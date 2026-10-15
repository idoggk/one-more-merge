# Level timeline: a clear-time floor that does not depend on merge speed

Task t-141225ee (mission m-59b4b6e3). Follow-up of `docs/design/LEVEL_PACE_REFIT.md`: HP alone lifts a thinking player (3 s per merge) to the floor, but a fast tapper (1 s per merge) still clears L1-6 in 16-22 s, because more HP cannot slow merge speed.

## 1. Three options

All three are behind the NEW QA flag **LEVEL TIMELINE** (`levelTimeline`, default OFF, only active when LEVEL PACE 2 is ON) and need the per-level floor `floor_s` that `tools/write-floors.ts` now writes into `levelPace2.json`.

**A. Stretched arrival (waves on a timeline).** Machine k may not appear before `a_k`, sized so the last machine cannot arrive before about 80% of the floor; before that the board plays on an empty stage.
- For: simple to read ("wave 2 in 20 s").
- Against: levels with ONE machine (L1, L2, and every goal level) have no waves to stretch, so they need a new fake wave split; an empty stage while waiting is boring (nothing to hit, merges feel pointless); damage dealt "before arrival" is either lost (frustrating) or must be banked anyway.

**B. Armor clock (banked damage).** The machine's armor opens on a clock: of the total HP, only `t / span` may have landed at time t (`span` = 97% of the floor). Blows the player makes earlier are **banked** (never lost) and land as the armor opens.
- For: works on every level shape (1 machine, several waves, boss stage) with the same rule; a thinker who is already at the floor is almost untouched (his damage arrives slower than the clock anyway); the player keeps merging and building (the bank grows, the HP bar chases the clock, bigger boards = stronger finish); no skipped enemies, waves still break in order; MANIA levels excluded, goal machines (rank / chain) untouched because the goal, not HP, sets their time.
- Against: a fast player sees the bar move at a fixed speed. This is what the indicator is for (section 2).

**C. Wave breather that scales with the floor.** After each machine breaks, a quiet pause (no supply, `TUNING.breather` today 2.5 s in CALM) of `floor * share / waves`.
- For: reuses existing breather code.
- Against: single-machine levels get nothing; a pause with no supply and no damage is the most boring way to wait; stacks to a long dead time for 5-wave levels.

**Recommendation: B.** Only B gives a floor on single-machine levels and on boss stages without inventing fake waves, loses no damage, and leaves the player something to do (merge, build, set up big chains) while the armor opens. The cost is a readability job, done with a bar under the HP bar.

## 2. What was built

- `src/content/levelTimeline.ts`: flag (`LEVEL_TIMELINE`), `timelineSpan(level)` (undefined unless both flags are ON, the level has a `floor_s` and is not MANIA), pure `timelineRelease`.
- `src/core/game.ts`: `GameState.tl` (only set when the flag is ON): `applyDamage` adds new blows to `tl.bank` and lets only the opened amount land (carry-over and released damage pass through); `tick` releases the bank every 50 ms. Everything else (hit cap, shield, thresholds, kills, waves) is the same code path, fed by the released damage. Flags OFF: `s.tl` is never set, no other line runs.
- `src/game/ui/timelineHud.ts` (one line in `hud.ts`): a thin bar under the HP bar. Gold fill = the armor clock, dark notches = where each machine breaks, label `ARMOR OPENS IN 23s` / `ARMOR OPENING · 1.2K QUEUED` / `ARMOR OPEN`.
- QA switch LEVEL TIMELINE (LEVELS AND TESTS section). `tools/level-report.ts --pace2 --timeline`, `tools/level-duration.ts --pace2 --timeline` measure it.
- Not touched: `levels.json`, `puzzles.json`, `GameScene.ts`, `tests/golden/`.

Why the fast bot lands about at the floor: `span = 0.97 * floor`, and the last blows land within a few seconds after the clock closes.
