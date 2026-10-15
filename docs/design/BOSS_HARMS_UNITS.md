# BOSS_HARMS_UNITS — should bosses be able to harm units?

Owner question. Design only: no code changed. Sources read: `src/core/boss.ts`, `src/core/roster3.ts` (Blast Plate), `src/core/support.ts`, `src/core/types.ts`, `src/content/tuning.ts`, `src/content/levels.json` (L80, read only), `tests/flagsOff.test.ts`, DESIGN.md rounds 20-34.

## 1. What bosses do to units today

**Units have no HP, no death and no damage state.** A `Gadget` (`src/core/types.ts`) holds family, rank, cooldown and marks. The only health in the game is the monster's (`s.hp`). Bosses never "attack a unit"; they cast one telegraphed board attack (`bossTick` in `boss.ts`). Some of those attacks already remove, move or lock units:

| Attack | Boss | Effect on units today |
|---|---|---|
| CLAMP | Tin Can King | marked machine (highest rank) is stuck 2/3/4 s: no drag, no drop into it. Not damage. |
| SUCTION | Viper Queen | 1 machine (2 in the last phase) **vanishes**: the lowest-rank ones, ties by cell. The only attack that deletes a machine of any rank. |
| BOMB | Pressure Popper, King (final phase) | pops **one** rank-1/2 neighbour of the marked empty cell. Higher ranks are safe. Defused by covering the cell or firing beside it. |
| MIRROR / CONVEYOR / PULL / BOUNCE / TOW / PORTALS / SLICK | various | move or swap machines. No loss. |
| FROST | Fridge Overlord | a row accepts no parts. |
| HOT / REST / SPLIT | Toasters, Rex, Junkzilla | cascade modifiers: shooters in a column hit half as hard, relays in a row wake nobody, links cannot cross a divider. |
| JUNK | Brick Printer, Toasters (final) | up to 2 inert blocks fill empty cells for 8 s. |
| RANSOM | Chrono Chimera | costs 2 s of clock, not a unit. |

Other facts:
- Only the **Blast Plate** (roster 3, needs `TUNING.roster3`) blocks a boss cast. A block also stuns the boss at L9 (`WardState.stun`).
- Suction and bomb victims are removed with a `bossHit` event carrying `removedIds`. They are free to replace: the next delivery refills the cell. Nothing is "rebuilt" because nothing is lost for good.
- Every boss attack is telegraphed 2.5 s ahead (3.5 s on PACE CALM): dashed coral target plus countdown. The first clamp is a guided dodge (r23). One attack is explained once on the wake card.
- **Level 80** (`levels.json`): `monster: junkzilla`, 4 waves, `minion_hp = hp = 31350`, 165 s, MEGA_HARD, `boss_node: true`. Per `CHAPTER_BOSS` code, chapter 8's boss is Chrono Chimera (RANSOM, final phase PORTALS), so the L80 fight is: wave minions (`wave_visuals`) then the boss. Check which name the game shows before quoting it to players.
- Boss Rush and Bounties use the same `bossTick`, with event rules (no helpers, rank cap 6).

**Answer:** bosses already harm units only in the weak sense of SUCTION (any rank, but always the cheapest) and BOMB (rank 1-2). Nothing hurts a high-rank unit, and nothing is damaged, stunned or shielded as a persistent state.

## 2. Options

Shared rules for all options: new behaviour is behind a flag, default OFF; targets are chosen deterministically at warning time from the board (like today); the 2.5 s warning stays the only trigger; a Blast Plate ward still blocks the cast; a hit never removes the last machine that could still merge; death of the boss cancels everything.

### Option A — None (keep today's mix) + readability polish
- **Description:** no new harm. Keep SUCTION/BOMB as they are. Spend the effort on clearer telegraphs.
- **Player sees:** same telegraphs; add a short "LOST: rank-1 Cannon" popup when suction/bomb removes something.
- **Balance:** unchanged. Helpers/Coil/Mortar keep today's roles (suction hits cheap units, so Coil and helpers at rank 1 are the usual victims).
- **Team-building:** unchanged. No reason to pick a unit for "toughness".
- **Merge flow:** none.
- **Risks:** bosses stay "rule changers", not threats; the owner's feeling that bosses are toothless remains.
- **Effort:** S (copy + popup only). **Flag:** none (or `bossLossPopup`, visual only).
- **Tests:** existing `tests/boss.test.ts` unchanged; golden unchanged.

### Option B — STUN: a boss hit disables a unit for a few seconds (recommended)
- **Description:** new cast `jolt` (reusing the clamp pattern). It marks the highest-rank **non-boss-immune** machine (or a row, for later bosses). On hit, that machine is **stunned for 3/4/5 s by phase**: it keeps its place, can still be dragged and merged (merging cleanses it and the merged machine is fine), but it does not fire and does not pass the chain (a stunned relay is a dead end, a stunned shooter deals no damage). No deletion, nothing to rebuild.
- **Player sees:** same dashed-coral telegraph + countdown on the target cell, plus a bolt/zig-zag icon and the text `STUN 3s: merge it to cleanse`. During stun: grey tint, small sleeping "zZ" icon, a shrinking ring timer, `STUNNED` badge on the card. Popup on hit: `STUNNED!`; popup on cleanse: `CLEANSED`. Reuses clamp's visual slot and the existing "marked cell" diagram on the boss card. One rule per boss.
- **Balance:**
  - Coil (a relay; wakes others) dominates most levels today. Stunning a relay breaks the chain, so the boss counter is "keep a second relay or merge out". That gives Bell/Horn/Fuse Box a real job.
  - Mortar (weak, order-based) is not targeted more than others: target the highest rank in a *shooter* only on every second cast, so Mortar is not punished extra.
  - Helpers: off-board Support cards are untouchable (they are not on the board); on-board helpers can be stunned like any machine. Helpers that already matter less (they are the rank-6 cap) are an unlikely first target because the highest rank is chosen.
  - Fits the existing difficulty: stun duration 3-5 s is like the clamp's 2-4 s, so the calibrated novice win rates should stay near. Needs a sim pass to check L10-L80.
- **Team-building:** adds value to redundancy (two relay types, a Blast Plate ward) and to a non-Coil relay. Does not push any unit to be mandatory.
- **Merge flow:** a stunned machine is skipped by the cascade resolver (treated like a locked cell for firing), but it can still be a merge partner. Rank mass and family are preserved, and the merge frees one cell as always. The "each gadget activates at most once per cascade" invariant is untouched. Move/swap never deal damage.
- **Risks:** cascade previews must show the stun skip (the preview must not mutate state); a stunned mid-chain machine can look like a bug unless the icon is loud; interaction with HOT/REST/SPLIT final phases (do not cast `jolt` as the second attack on the same boss that casts them within one warning window).
- **Effort:** M. **Flag:** `TUNING.bossStun` (default false). QA switch: `qaFlag` in the BOSS section of `ui/qaPanel.ts`.
- **Tests:** unit tests for target pick, duration by phase, cleanse by merge, cascade skip, preview purity, Blast Plate block; determinism (seed + actions); `FLAG_REGISTRY` entry `bossStun: [false, ...]` in `tests/flagsOff.test.ts` and the flags-off golden must stay byte-identical (the flag-off path must not read any new state). One flag-ON test that proves the hash changes.

### Option C — STRIKE: the boss hits a lane or cell and destroys a unit that can be rebuilt
- **Description:** new cast `smash` marks one cell or one row. On hit, the unit there is **destroyed** and replaced by a **wreck** for 6 s. The wreck is an inert block. Tap it, or fire beside it, and it rebuilds as the same family one rank lower (min rank 1). This is JUNK blocks plus suction merged into one rule.
- **Player sees:** red lane/cell telegraph (like FROST's row), `SMASH` icon, a crack animation and a wreck sprite with a countdown ring. Popup: `DESTROYED`, then `REBUILT -1`. More text than B; the wreck is a new asset.
- **Balance:** strongest effect. Hits rank mass (the invariants say merge preserves rank mass; the rebuild is a deliberate exception and must be gated by the flag). Likely makes bosses harder than calibrated; every boss level needs a refit (the sim tools exist, but it is a large job). Coil-heavy builds suffer most because one smash can cut the chain; helpers die quietly.
- **Team-building:** pushes players to keep spare units; rewards ward cards. Could feel punishing for new players.
- **Merge flow:** a wreck occupies a cell like a junk block (inert, merges frozen). It needs new "rebuild" rules and a rank-mass exception.
- **Risks:** feels like a loss, not a puzzle. Breaks the cozy tone; more support questions; save/replay compatibility if the wreck is stored in state.
- **Effort:** L. **Flag:** `TUNING.bossSmash`.
- **Tests:** everything in B plus rank-mass accounting, rebuild paths (tap, chain, expiry), replay determinism, refit sims for 8 chapters, flags-off golden unchanged.

### Option D — SHIELDS: the boss protects itself or a lane instead of harming units
- **Description:** the boss raises a shield (the Fridge's chain shield already exists as a light behaviour: x0.75 damage until a 4+ chain). New cast `plating`: for 4 s damage is cut by half unless the chain is 5+ or a Mortar/Rocket (armor-breaker) fires. It never touches units.
- **Player sees:** a shield bubble on the boss, `SHIELD` icon, `Chain 5+ to break` copy. This is already taught on L11, so players know the picture.
- **Balance:** pushes long chains and Rocket/Mortar. Hardest for builds without a big finisher; helpers (a Magnet or Fan) become more valuable. No unit is lost.
- **Team-building:** rewards armor-breakers (Mortar, Jackhammer BYPASS role). Mortar becomes less weak.
- **Merge flow:** none beyond the damage formula.
- **Risks:** it does not answer the owner's question (bosses still do not harm units). Only a damage tweak; may feel like a tax.
- **Effort:** S-M. **Flag:** `TUNING.bossPlating`.
- **Tests:** damage formula tests; golden unchanged; calibration sim.

## 3. Recommendation: Option B (STUN)

It gives bosses a real bite on a unit without making anything vanish. It is readable (a marked cell, a timer ring, `merge to cleanse`), reuses the clamp telegraph that players already know, keeps rank mass and all invariants, needs no new asset family (a tint + zZ badge), and gives non-Coil relays a role. Build it as one flag, test with the flags-off golden, and ship OFF until a sim pass shows L10-L80 novice win rates stay within the calibrated bands.

## 4. Questions for the owner (max 2)

1. Should a stunned unit be **cleansed by merging it** (recommended, always solvable), or only by waiting out the timer?
2. Should the first version cover only the 8 chapter bosses (recommended), or also mini-bosses and Boss Rush / Bounties?

## 5. Five more ideas to improve the core game (ranked by value)

1. **Merge preview of the boss threat.** Show the marked cell's outcome ("this merge dodges the clamp") on the merge-assist overlay. Cheapest big readability win; boss attacks were the weakest-understood part in the critiques (Slick 4/10, Ransom 2/10).
2. **"Why did I lose" recap.** On a failed level show the last 3 events (boss cast, clock, missing chain) with one suggested fix. Raises retries; it builds on the existing level report.
3. **Unit tips tied to the boss card.** The boss card says "good here: Bell + Horn" with the owned units highlighted. Links collection to boss levels; supports team-building.
4. **Combo/chain streak meter with a payoff.** Visible chain meter that grants a small bonus at x6/x10 (flag-gated). Rewards the skill the game is about; needs a damage-balance sim.
5. **Practice mode for a boss attack.** From the Monster Book, replay the first 30 s of a beaten boss with its attack on a loop. Teaches the rules without risking a level; reuses Bounty/Rush boards.

Do not hand-edit `levels.json` or `puzzles.json` for any of this; refits go through the `tools/` scripts.
