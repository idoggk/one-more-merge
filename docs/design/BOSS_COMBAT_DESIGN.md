# BOSS_COMBAT_DESIGN — bosses that deal damage and break machines

Owner: "maybe we should have the boss dealing damage in some way and even breaking machines. We need to make the interaction with it better." Design only: no code, `levels.json` or `puzzles.json` changed. Nothing is bought. Builds on `BOSS_HARMS_UNITS.md` (stun) and `BOSS_ROSTER.md` (names/art, branch `orch/t-b9e6b783-boss-roster-themed-bosses-for-ev`). The owner lifted the rule freeze (Q#84), so these are rule changes: each needs an owner pick before it is built, sits behind a default-OFF flag, and is measured by the sim tools.

## Summary (10 lines)

1. Today a boss is a **puzzle-rule changer, not a fighter**: one telegraphed cast every 12 s that moves, locks or (rarely) pops a cheap machine. Machines have no HP, so nothing can be "damaged" or "broken".
2. It feels passive because the boss never hurts anything you care about, and a dodge costs nothing but a drag.
3. The same casts sometimes **freeze merging** (clamp = no drag/drop, frost row = no drop, junk blocks = locked cell, tow). That is the "merging is frozen" complaint.
4. Four designs: **A BREAK** (broken machine, repair by merge), **B JOLT** (stun, = BOSS_HARMS_UNITS option B, cleansed by merge), **C WEAR** (machine HP, boss chips, merge heals), **D STRIKE LANE** (big smash, a repair part).
5. All four keep merging fully available: a hit machine can always be dragged and merged; merging is also the cure.
6. Recommendation: **A BREAK**, smallest slice = chapter bosses only, one cast `crack`, repaired by merging. Flag `bossBreak`.
7. Prototype: model + sim only (no art), measured with `tools/level-report.ts` on L10-L80, win-rate bands must hold.
8. Gate: no level may drop more than 8 points of novice win rate; ON path must never leave the board with no legal merge.
9. Flags OFF: golden unchanged.
10. Three owner questions at the end.

## 1. The current boss loop in plain words

Source: `src/core/boss.ts` (`bossTick`), `TUNING.bossEvery/bossWarn`, `levels.json`.

- Chapter boss (L10, 20 ... 80): 90 s boss clock, one HP bar, three cosmetic armor looks at 66% / 33%. Minis (L8, 18 ...): 60 s, no phases. Boss levels hold 125-165 s (L10 and L8: 95 s) and HP 2,250 (L10) to 53,600 (L60); minion waves come first.
- First attack at 8 s, then **every 12 s**. Each attack has a 2.5 s warning (3.5 s on PACE CALM): dashed coral target cell/row plus a countdown. Target is chosen from the board at warning time, deterministically.
- The cast does one of: lock a machine (CLAMP), refuse parts in a row (FROST), delete the lowest-rank machine (SUCTION), pop a rank 1-2 neighbour (BOMB), shift/swap machines (CONVEYOR, MIRROR, PULL, BOUNCE, TOW), change cascade maths (HOT, REST, SPLIT), put 8 s junk blocks (JUNK), cost 2 s of clock (RANSOM). In its last phase a chapter boss alternates in its chapter's mini-boss attack.
- The player's answer is always "move or merge the marked machine in 2.5 s", or ignore it.

**Why it is passive**
1. Nothing of value is at stake: SUCTION and BOMB take the cheapest machines, which the next delivery refills for free. High ranks are never hurt.
2. Machines have no HP or damage state, so there is no "broken" to fix, no loss to feel and no repair to do.
3. Most casts are neutral reshuffles (conveyor, mirror, bounce, pull) that look like animation, not an attack.
4. The boss does not react to what you are doing; the boss HP bar is just the level goal.
5. Only the Blast Plate (roster 3) can block a cast; other units have no answer.

**Where merging is frozen today** (freeze audit input)

| Source | What freezes | Code |
|---|---|---|
| CLAMP | marked machine: no drag from, no drop into, 2-4 s | `bossBlocked().noDrag/noDrop` |
| FROST | a whole row accepts no drop, 2-4 s | `bossBlocked().noDrop` |
| JUNK | up to 2 cells locked 8 s | `locked()` via `bossBlockCells` |
| Pending clamp/suction/bomb/blocks | marked cells excluded from deliveries | `bossPendingCells` |
| TOW | linked pair moves together | `bossTick` tow |
| `sandwichBlocked` | boss no-drag cells cannot be absorbed | `game.ts` |

Clamp is the worst: the **highest-rank machine** (the one you most want to merge) cannot be dragged. Rule for all designs below: **no new cast may block drag, drop or merge**. Existing clamp/frost/junk are the freeze audit's fix list (section 4).

## 2. Four designs

Shared rules for all four:
- Telegraph: the existing 2.5 s warning (PACE CALM 3.5 s) with **1-2 s of clear lead**: dashed target on the cell, plus an icon and a ring that fills. Reuse the clamp telegraph slot.
- Cast cadence stays 12 s (first at 8 s), so the cast count per level is unchanged.
- New states live in `BossState`/`GameState` fields that the flags-off path never reads. Targets are deterministic (row-major ties). A Blast Plate ward still blocks a cast.
- Merging is **never frozen**: a hit machine can always be dragged, dropped and merged; only its firing changes.
- Boss death clears every damaged/broken state.
- Failure gate: every design is run through `tools/level-report.ts` (section 5); a design that moves a level's novice win rate by more than 8 points, or ever leaves no legal merge, is retuned or rejected.

### Design A — BREAK (a hit breaks the machine; merging repairs it) — recommended

- **Attack:** new cast `crack`. Warning: red crack icon on the target cell (the highest-rank **shooter or relay** not already broken; every second cast the lowest-rank non-helper, so cheap units also matter), ring fills 2.5 s. Two targets in the last phase.
- **Hit:** the machine becomes **BROKEN** for 6 s (phase 1) / 8 s (phase 2) / 10 s (phase 3): it does not fire, does not pass the chain, but still sits, drags and merges. No machine is deleted.
- **Counter / repair:** (1) **merge it** (as the source or the partner): the result is repaired, instantly; (2) merge any other machine adjacent: it gets "patched" and wakes at half time; (3) dodge: move or merge the target before the hit; (4) a Blast Plate ward blocks the cast. If untouched, it self-repairs at the timer end, so it is never a permanent loss.
- **Shown on screen:** intro popup on the boss card "BREAKS A MACHINE: merge it to repair" with the marked-cell diagram; boss HP bar with 3 armor notches; telegraph = dashed coral cell, crack icon, filling ring; broken state = grey tint, cracked overlay, wrench icon, shrinking ring timer, `BROKEN` badge, popup `BROKEN!` then `REPAIRED`. The preview overlay shows the broken skip in cascades.
- **Merging:** untouched; merging cures it. Merge-assist can highlight "merge this to repair".
- **Scaling:** mini-boss: 1 target, 6 s, no phases. Chapter boss: duration by phase, 2 targets in phase 3. Chapters 1-2: always a cheap target so players learn; chapters 5-8: the best target plus a second boss attack in the last phase.
- **Knobs:** duration per phase, targets per cast, which rank class is targeted, cast interval, self-repair on/off, patch bonus.
- **Flag / effort:** `TUNING.bossBreak` (default false). **M.** QA switch in the BOSS section of `qaPanel.ts`.
- **Tests:** target pick; duration by phase; merge repairs; cascade skip and preview purity; ward block; determinism; save/replay with broken state; ON hash differs, OFF golden byte-identical; sim gate.

### Design B — JOLT (stun; BOSS_HARMS_UNITS option B)

- **Attack:** cast `jolt`: the highest-rank machine is marked (bolt icon).
- **Hit:** **STUNNED** for 3/4/5 s: no firing, no passing the chain; it can still be dragged and merged.
- **Counter:** merge cleanses it; dodge by moving it; ward blocks.
- **Shown:** same as A with a zZ badge and a bolt icon.
- **Merging:** untouched.
- **Scaling:** as A.
- **Knobs:** duration, target class.
- **Flag / effort:** `bossStun`; **M**. Same tests as A.
- Difference to A: shorter, always targets the strongest machine and feels like a lock, not like damage. It is the safest but does not answer "damage / break machines".

### Design C — WEAR (machines have HP; the boss chips them)

- **Attack:** cast `chip`: marks 1-2 machines; each hit removes 1 "wear" point. A machine has 2 points (3 for rank 5+).
- **Hit:** wear 1 = crack overlay, still works; wear 2 = **BROKEN** (as A, until repaired); the points come back when merged.
- **Counter / repair:** a merge gives the result full HP; a **Wrench** (existing tool/item slot) repairs a machine for free; shield = ward.
- **Shown:** HP pips under each damaged machine, crack overlays, a wrench icon on the broken one.
- **Merging:** untouched.
- **Scaling:** more wear per hit in later chapters; mini-bosses chip one point.
- **Knobs:** points per machine, chip count, wrench cost.
- **Flag / effort:** `bossWear`; **L**: a new per-machine state to save and draw, preview shows wear; the wrench is a new tool.
- Pros: the richest interaction, boss feels like a fighter. Cons: bookkeeping on 6+ machines at phone size, which conflicts with the "simple readable units" direction.

### Design D — STRIKE LANE (a big smash that needs a repair part)

- **Attack:** cast `smash` on a lane (row or column), warning 2.5 s with a red lane and a falling-fist icon.
- **Hit:** every machine in the lane takes a break: **BROKEN** until a **repair part** lands (a delivery of a "bolt" piece occupies a cell; tap or drop it onto a broken machine) or 12 s pass. Pushes units one cell back from the lane centre (no deletion).
- **Counter:** move machines out of the lane (dodge), merge them, or spend a bolt piece. Ward blocks.
- **Shown:** lane telegraph; broken machines as in A; the repair bolt piece in the supply tray.
- **Merging:** untouched, but the lane can hold 3-5 machines, so most failure risk lies here.
- **Scaling:** one lane (chapter 1-4), cross-shaped lanes in the last phase.
- **Knobs:** lane size, repair-part rate, break duration.
- **Flag / effort:** `bossStrike`; **L** (new piece type, push rules, supply interaction).
- Risk: one lane breaks several machines at once and can empty the board's firepower: the sim gate may reject it for early chapters.

## 3. Matrix: effect on the unit roster problems and the freeze audit

Ratings: + helps, 0 neutral, - hurts.

| Issue | A BREAK | B JOLT | C WEAR | D STRIKE LANE |
|---|---|---|---|---|
| Helpers dead (little role on board) | + a broken ward/helper matters; cheap-target rule picks them | 0 | + (wrench item has a job) | 0 |
| Coil dominates (one relay chain) | + broken relay cuts the chain; keep a second relay type | + same | + | + (lane cuts rows of coils) |
| Mortar weak | 0 (no target bias) | 0 | 0 | 0 |
| Pushes toward spam-merge | + merge = cure, so fast merging wins | + | + | + |
| Clarity at 48 px | + one badge | + one badge | - HP pips | + lane |
| Adds a freeze of merging | no | no | no | no |
| Fixes existing clamp freeze | with A, retire clamp's noDrag (flagged) | same | same | same |
| Loss feeling | mild (self-repairs) | mildest | medium | strongest |
| Chance of an unwinnable level | low | lowest | medium | highest |
| Effort | M | M | L | L |

**Freeze audit (applies to the chosen design, all flagged):** replace CLAMP's no-drag with "marked machine is JAMMED: cannot fire, but can be dragged and merged"; FROST keeps its no-drop (row) but never on the row that holds a mergeable pair; JUNK blocks stay (they are terrain, capped at 2). Merge-assist should list "merging blocked" cells as zero by design. This is a **bug-fix tier** (S) that can ship ahead of A.

## 4. Scaling, failure and tests (all designs)

- Mini-boss: single target, short duration, no phases (teaches the rule). Chapter boss: phases lengthen the break and add a second target; last phase alternates in the mini-boss attack as today.
- Early gate: chapters 1-2 break only cheap machines, with 3.5 s warning in CALM.
- Hit never removes the last machine that could still merge, and never breaks a machine already broken.
- Required test list for every design: unit tests in `tests/boss.test.ts`; a `FLAG_REGISTRY` entry in `tests/flagsOff.test.ts`; flags-off golden byte-identical; one ON test that proves the hash changes.

## 5. Recommendation and prototype plan

**Recommend Design A (BREAK).** It answers "breaking machines" literally, is readable (one badge, one cure: merge), keeps merging always available, and is reversible (self-repair), so it is the least likely to make a level unwinnable. It also replaces the clamp's merge freeze. D is the later "chapter 6+" escalation; C is rejected for clutter; B remains a fallback if A tests too punishing.

**Smallest slice (behind `bossBreak`, OFF):**
1. `crack` cast for the 8 chapter bosses only (no minis, no Rush/Bounties), phase-1 duration only, cheap-target rule.
2. Model state `broken: {id, until}[]` in `BossState`; cascade resolver skips broken ids; merge clears them. No art: a tint and a text badge in the QA build.
3. Tests per section 2A.
4. Sim: `npx vite-node tools/level-report.ts --from 10 --to 80 --pace calm --out level-report` with the flag off and on, then `--summary`; compare per-chapter win rates for the four bots (rand25, smart3, smart1, plan3). Accept when no chapter boss level drops more than 8 points of the novice (rand25) win rate and no run ends with zero legal merges.
5. Report to the owner: one table of off vs on, and short capture clips later.

**Order of work:** (a) the S-size freeze fix (clamp jam) and the L10 popup, (b) A prototype, (c) minis, (d) art for the broken state (wrench + crack overlay), (e) chapters 5-8 second attack, (f) optional D.

## 6. Questions for the owner (max 3)

1. Should a broken machine be **fixed by merging it** and also self-repair after the timer (recommended), or stay broken until you fix it (harder, can lose a level)?
2. Should clamp lose its "cannot drag" part so **merging is never frozen** (recommended), even if that makes the Tin Can King easier?
3. Is the first version only the **8 chapter bosses** (recommended), or also mini-bosses and Boss Rush?
