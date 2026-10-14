# Effort Model v1: player power, enemy effort, boss powers, starter kits

Design document only (task t-755e045c, 2026-10-13). No change to `src/` or `levels.json`. Companion file: `docs/effort-model-spec.json` (per-level targets, generated from `src/content/levels.json` and `docs/EFFORT_AUDIT.md` of task t-bd0d6010). Everything here is a proposal behind a new flag `TUNING.effortModel` (default OFF) that does not exist yet.

## Plain-words summary

1. Effort is measured in seconds, not HP: effort = HP divided by the damage per second the player really deals. A level's effort budget is its clock times a target "need" (about 0.40 to 0.69, mean 0.51 to 0.58), shaped as a curve with breather levels and a boss peak.
2. The last boss must be at least 50% of the level by TIME (lower end of the 95% interval). Today it is 50% of the HP but only 32% of the time (8 of 8 chapter bosses, 16 of 16 boss and mini levels are under). The fix is a boss HP multiplier per level (first order: target share divided by today's share, 1.4x to 2.8x), minions shrink so the level's total effort stays the same. Four levels (40, 68, 78, 80) need a second lever (a smaller per-hit cap on the boss stage) to keep the boss at 75% of the HP or less.
3. Every boss and mini-boss gets one new signature power that is visible (at least 600 ms telegraph, own banner, colour and sound), outcome-changing (armor that rejects chain damage, row lock, hostage shooter, enrage gauge, healing echoes, shield cells, decoys...) and counterable. Target: powers ON versus OFF costs the blind bot 10% to 20% more merges or clock (measured on the boss stage; today the average is 2.0% of the whole clock, at most about 6% of the boss stage), and a bot that reads the warning recovers at least 40% of that.
4. Every ordinary level gets a starter kit = layout (A to D) x rank mix (same rank mass) x units given. Rules guarantee no two adjacent levels start alike (the spec has 51 distinct kits in 61 ordinary levels, largest group 3, today 14). The kit is kept effort-neutral by a bounded HP trim (at most plus or minus 10%).
5. Nothing ships until the owner approves: slice S1 builds the flagged overlay and the boss-share fix, S2 the powers (impact order), S3 the kits, S4 the refit of HP and stars with `tools/sim-levels.ts` and `tools/star-times.ts` (never by hand). Five owner decisions are in section 6.

Reading rule: M = measured (from the audit, bots), E = model estimate from tuning constants that slice S1 replaces with a measurement. Bots are not people; where a number comes from a bot it says so.

---

## 0. Inputs

- `docs/EFFORT_AUDIT.md` (smart@3 = the "thinker" bot, best previewed merge about every 3 s; random@2.5; planner n=6; 30 runs per level). Key facts used here: boss HP share is exactly 50% but boss time share is 20% to 41% (mean 32%); 14 of 35 powered levels show a time cost with an interval excluding zero, mean absolute cost 2.0% of the clock; 35% of ON/OFF pairs are identical; 44 distinct whole starts in 77 non-teach levels, largest group 14; "need STARTER" (effort HP / (dps x clock)) spans 0.17 to 0.90, mean 0.56.
- `src/content/tuning.ts` (rank multiplier 2.25, cascade cap 0.35, calm pace: first boss cast 8 s then every 16 s, warning 3.5 s), `src/content/units.ts` (39 units), `src/core/game.ts` (stage split: minions share `minion_hp` with a 1 + 0.3 i ramp, the boss is `hp`), `src/core/boss.ts` (16 attacks), `docs/OPENING_VARIETY.md` (layouts A to D).
- Not re-measured here: no simulation was run for this document; every new number is derived from the audit tables or marked E.

---

## 1. THE MODEL

### 1.1 Effort

**Stage effort** `E_s = HP_s / D_s` seconds, where `D_s` is the sustained damage per second the reference player (smart@3 "thinker") deals while that stage is alive: everything that really lands (cascade cap, overkill carry, boss hazards, breather time excluded).

**Level effort** `E_L = sum of E_s` over the stages. Units: seconds of active play. (The "effort seconds" column in 1.3 divides chapter-mean HP by chapter-mean dps, so the need column there mixes a ratio of means with the audit's mean of ratios: direction only.)

**Goal levels** (31 of the 80 levels) have no HP, so effort comes from the goal: `E_goal = G x t_g`, where `G` is the goal size (goal units: the level's goal count) and `t_g` is the thinker's seconds per goal unit, `(win time - first goal progress time) / G`, measured with smart@3 in `tools/sim-levels.ts` (n at least 30). Need = `E_goal / clock`, the same definition as for HP levels. Refit: `G_next = G x need_target / need_measured` (goal size moves, never HP; `levels.json` only through the tool). The boss-share rule does not apply; the goal stage time share target is 0.25 to 0.40. The spec carries `goal_size_mult_first_order = need_target / audit need_starter` per goal level. Until S1 measures `t_g` this is a first-order estimate (E).

**Need** `n_L = E_L / clock_L`. Calibration of the shipped game: the levels were fitted so the thinker wins about 90%, which gives a mean need of 0.56 (audit D). The effort budget of a level is `B_L = n_target x clock` (spec field `effort_budget_s`).

**Boss time share** `tau = E_boss / E_L`, measured as time (see 2.1), not as HP.

**Boss power tax**: the time a power adds is already inside `E_boss` when powers are ON, so every fit and every share is measured with powers ON (the shipped condition). A power that costs 10% of the boss fight is an effort credit the HP can give back; this is how a power "costs" effort in the budget.

### 1.2 Player power

`P` = sustained damage per second at the thinker's pace. Closed form used for costing:

```
P  =  mu x ( sum over machines i in the average cascade of  h_i )  x  (1 - kappa)  +  P_auto
h_i = base_u x 2.25^(rank_i - 1) x m_job(u) x levelMult(u, unit level) x perk
```

- `mu` = merges per second of the thinker: about 0.31 (one merge per 3.2 s with jitter); reactive parts keep the board alive, so this is also the supply cap.
- the sum runs over the machines that fire in an average cascade: 5.9 to 8.6 machines (audit D, chain avg STARTER).
- `kappa` = cap loss (a cascade deals at most 0.35 of the machine's max HP): small on ordinary machines, matters on small stages.
- `P_auto` = cannon auto-shots (0.15 of a full shot every 3.0 s under calm: about 0.05 of a hit per second per cannon).
- `m_job` = the unit's job factor on a typical board (table 1.5), `levelMult` = +4% per unit level for shooters, +2% for relays.

Four independent supplies change `P`: (a) **rank mix** (rank mass on the board and how it is distributed: damage per mass rises with rank because 2.25 > 2: 10 per mass at r1, 11.25 at r2, 12.66 at r3, 14.24 at r4); (b) **trigger and chain potential** (relays and their reach set how many machines fire: the chain length); (c) **units unlocked** (the roster a player may bring: STARTER, GIFT, CEILING squads); (d) **units and parts given by the game** (level gifts, `start_extra` helpers, item grants, the delivery bag, the starter kit).

### 1.3 Calibration against the audit (M)

"Cannon-equivalent rank" = the rank at which a plain cannon would deal the implied damage per fired machine: `d = P x 3.0 s / chain avg` then `r_eq = 1 + ln(d / 10) / ln 2.25`.

| chapter (levels) | start rank (mass) | dps STARTER (M) | dps CEILING (M) | CEILING / STARTER | chain avg STARTER (M) | implied dmg per fired machine | cannon-eq rank | effort HP mean (M) | effort seconds (HP / dps) | need STARTER (M) | need target (this model) |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 (1-10) | 1 (8) | 80 | 84 | 1.05x | 5.9 | 41 | 2.7 | 3 250 | 41 | 0.51 | 0.51 |
| 2 (11-20) | 1 (8) | 160 | 223 | 1.39x | 8.6 | 56 | 3.1 | 8 695 | 54 | 0.56 | 0.52 |
| 3 (21-30) | 2 (16) | 295 | 468 | 1.59x | 7.1 | 125 | 4.1 | 20 250 | 69 | 0.51 | 0.53 |
| 4 (31-40) | 2 (16) | 334 | 482 | 1.44x | 7.1 | 142 | 4.3 | 24 450 | 73 | 0.58 | 0.54 |
| 5 (41-50) | 3 (32) | 674 | 1 222 | 1.81x | 8.0 | 253 | 5.0 | 56 095 | 83 | 0.61 | 0.55 |
| 6 (51-60) | 3 (32) | 733 | 715 | 0.98x | 7.2 | 306 | 5.2 | 53 160 | 72 | 0.56 | 0.56 |
| 7 (61-70) | 2 (16) | 430 | 541 | 1.26x | 7.3 | 176 | 4.5 | 34 855 | 81 | 0.58 | 0.57 |
| 8 (71-80) | 2 (16) | 513 | 571 | 1.11x | 7.2 | 215 | 4.8 | 40 145 | 78 | 0.59 | 0.58 |

Findings the table makes visible:

1. **Power resets at level 61**: the start rank falls from 3 back to 2, STARTER dps drops from 733 to 430 and the effort HP of chapters 7 and 8 (35k, 40k) is lower than chapters 5 and 6 (56k, 53k). The late game is smaller than the middle game. This is a design question (decision D5), not a bug.
2. **Unit power is mostly rank**: the cannon-equivalent rank climbs 2.7 to 5.2 over the first six chapters; chain length stays at 6 to 9. Rank mass (and the start rank) carries the curve, chain length and units add 5% to 80% (CEILING / STARTER dps) on top.
3. **Units given** (GIFT versus STARTER need, chapter means): about 1.0x in chapter 1, 1.1x chapter 2, 1.06x chapter 3, 1.4x chapter 4, 1.2x chapter 5; chapters 6 to 8 are noise (the squad search lost on L51 to L77, audit limits). The owner-visible gift schedule (Nail Gun L10, Wrench L13, Jackhammer L20, Gear L25, Saw Blade L30, Blowtorch L35, Blast Plate L40, Signal Beacon L50) is therefore worth about plus 5% to plus 40% dps where it helps, and nothing is fitted around it: the levels are fitted on the STARTER squad at unit level 1.

### 1.4 Power by chapter, what each supply adds (the table to cost against)

Per chapter, `P_chapter = P_STARTER (above)`. Supply multipliers on top (E, from the audit squads and the tuning constants):

| supply | effect on P | source |
|---|---|---|
| unit level (expected L 1 to 6 across the game) | shooters +4% per level, relays +2% per level: +4% to +20% | `levelMult` (M) |
| level perks L3 / L6 / L9 | +3% to +12% each (Heavy Barrel, Lucky Eight...) | `UNIT_PERKS_TODAY` (E) |
| GIFT squad (guaranteed gifts) | 1.0x to 1.4x | audit D (M, noisy) |
| CEILING squad (lucky open crates) | 0.98x to 1.81x | audit D (M, noisy) |
| starter kit (layout x mix x gift) | 0.80x to 1.2x on the opening only (about the first 25% of the level) | section 4 (E) |
| tools (Row Surge, Gear Bomb) | +1.2 and +2.25 cannon-hits per use | 1.5 (E) |

### 1.5 Unit contribution tables (39 units, plus 2 tools)

**How to read**: `base` is `TUNING.base` (M). Damage at rank r is `base x 2.25^(r-1)`: r1 = 1x, r2 = 2.25x, r3 = 5.06x, r4 = 11.4x, r5 = 25.6x, r6 = 57.7x, r7 = 130x, r8 = 292x (audit raw table, M, 18 units). `m` = typical job factor on a mid board (E). `CI` = contribution index per cascade in "cannon hits at the same rank" (1.0 = a plain cannon firing once at that rank). For shooters `CI = base/10 x m`. For relays `CI = base/10 + F x 0.25 x 1.25`, where `F` = cells the relay reaches on a typical board (clarity ruleset, shipped), 0.25 = chance that a reached cell holds a shooter (half the cells filled, half of those shooters) and 1.25 = chain extension through woken relays. CI scales with `2.25^(rank-1)` when the whole board is at one rank, so the table is rank-free; use the rank row above for absolute damage. S1 builds `tools/unit-cost.ts` on top of `tools/squad-swap.ts` to replace every E with a measured marginal dps per unit and rank.

**U1. Shooters (15)**

| unit | rarity | trigger | base | dmg r1 / r4 / r7 | job and `m` (E) | CI (E) |
|---|---|---|---|---|---|---|
| cannon | common | MERGE-FIRE + AUTO (3.0 s, 0.15x) | 10 | 10 / 114 / 1297 | plain, m 1.00 | 1.00 |
| rocket | rare | WAKE or MERGE | 13 | 13 / 148 / 1687 | 1.3x cannon, chain-only, m 1.00 | 1.30 |
| mortar | rare | WAKE (depth) | 11 | 11 / 125 / 1427 | hits grow with machines already fired, m 1.40 | 1.54 |
| arc_welder | epic | WAKE (spread) | 10 | 10 / 114 / 1297 | arcs to a second shooter, m 1.50 | 1.50 |
| nail_gun | common | WAKE, POSITIONAL (row) | 9 | 9 / 103 / 1168 | +0.2 per other part in its row, cap 1.8, m 1.50 | 1.35 |
| jackhammer | rare | WAKE, ignores shield | 12 | 12 / 137 / 1557 | m 1.00 (1.3 on shield levels) | 1.20 |
| saw_blade | epic | WAKE, POSITIONAL (edge) | 10 | 10 / 114 / 1297 | edge 1.5, inside 0.7, m 1.18 | 1.18 |
| piston | common | WAKE, POSITIONAL (empty cells) | 9 | 9 / 103 / 1168 | +0.25 per empty touching cell, cap 2, m 1.50 early, 1.20 late | 1.20 |
| blowtorch | rare | WAKE, POSITIONAL (hazards) | 12 | 12 / 137 / 1557 | x1.5 per hazard in column (max x2.25), m 1.00, 1.80 in hazard levels | 1.20 (2.2) |
| tesla_tower | legendary | WAKE (charge) | 13 | 13 / 148 / 1687 | +0.12 per relay charge, max 6, m 1.36 | 1.77 |
| wrecking_ball | epic | WAKE (distance) | 18 | 18 / 205 / 2335 | 0.6 next door, +0.3 per board step, max 2, m 1.20 | 2.16 |
| robot_arm | legendary | WAKE (copy) | 12 | 12 / 137 / 1557 | shoots AND repeats the last relay's job, m 1.30 | 1.56 + relay job |
| rivet_gun | common | WAKE, COUNTED (3rd to fire) | 10 | 10 / 114 / 1297 | x2 as 3rd part, m 1.25 | 1.25 |
| hydraulic_press | epic | WAKE, POSITIONAL (full sides) | 12 | 12 / 137 / 1557 | x3 if 4 sides full else 0.7 + 0.1 per side, m 1.10 | 1.32 |
| lathe | epic | WAKE, POSITIONAL (edge line) | 9 | 9 / 103 / 1168 | edge up to x2, off the edge x0.5, m 1.00 | 0.90 |

**U2. Relays (14)** (base is the relay's own hit; `F` = reach)

| unit | rarity | trigger and reach (shipped clarity rules) | base | dmg r1 / r4 / r7 | F (E) | CI (E) |
|---|---|---|---|---|---|---|
| coil | common | WAKE-OUT: cross, 2 cells each way (up to 8) | 4 | 4 / 46 / 519 | 5.5 | 2.10 |
| bell | common | row (up to 4) | 3 | 3 / 34 / 389 | 4.0 | 1.55 |
| horn | common | column (up to 5) | 3 | 3 / 34 / 389 | 4.7 | 1.77 |
| fuse_box | rare | four diagonal corners | 4 | 4 / 46 / 519 | 2.4 | 1.15 |
| gear | rare | 4 touching, merged gear jumps to a far gear | 3 | 3 / 34 / 389 | 3.2 | 1.30 |
| spring | common | hops over exactly one part, reach 3 | 3 | 3 / 34 / 389 | 1.5 | 0.77 |
| belt_drive | epic | bridges to the far end of its line | 3 | 3 / 34 / 389 | 1.5 | 0.77 |
| pipe | rare | wakes same-family parts joined to a touching part (cap 4, 6 at L3) | 3 | 3 / 34 / 389 | 2.5 | 1.08 |
| capacitor | epic | banks one chain, releases it into touching parts | 6 | 6 / 68 / 779 | 1.5 | 1.07 |
| ladder | epic | wakes the touching part one rank above, then on up | 8 | 8 / 91 / 1038 | 1.2 | 1.18 |
| crane | legendary | lifts a touching part onto its twin, once per level | 8 | 8 / 91 / 1038 | 1.0 | 1.11 |
| dynamo | legendary | full 2x2 block wakes a ring of up to 12, else 4 touching | 3 | 3 / 34 / 389 | 4.0 | 1.55 |
| vice | common | only on an edge: 3 cells inward, shooters woken x1.4 | 3 | 3 / 34 / 389 | 2.4 (edge) | 1.35 |
| router | rare | wakes the best L of up to 6 cells | 3 | 3 / 34 / 389 | 4.0 | 1.55 |

**U3. Helpers, supports and tools (10 + 2), base damage 0: value is an uplift**

| unit | rarity | trigger | what it gives | uplift on P (E) |
|---|---|---|---|---|
| fan | common | MOVER (push / clear junk) | space and hazard clearing, no damage | 0% damage, +3% merges kept |
| magnet | rare | MOVER (fetch a matching part) | a free merge now and then | +4% |
| battery | rare | PRIME (x1.5 on the next shot, +0.2 at L3) | one shooter hits harder | +6% |
| amplifier | rare | MARK (x1.3 on the strongest shooter) | | +5% |
| signal_beacon | epic (legendary under crates B) | MARK (x1.15, anywhere) | | +4% |
| wrench | common | passive: next merge counts +1 rank for effects | +1 rank on one cascade in about 4 merges | +10% |
| blast_plate | rare | CARD (blocks 1 attack, 2 at L6) | cancels a boss cast: cuts the power tax | removes up to the whole power tax of one cast |
| blueprint | epic | CARD (shows 3 deliveries, swaps 1) | fewer wasted merges | +5% |
| rewind_crank | epic | CARD (undoes a merge within 8 s) | fewer misplays | +3% |
| tilt_lever | legendary | CARD (slides the board, up to 3 free merges) | 3 merges per 12 to 15 | +12% |
| row_surge (tool) | n/a | made by a chain of 5+ (max 2 tools on board) | wakes a whole row once | about +1.2 cannon hits per use |
| gear_bomb (tool) | n/a | made by a sandwich merge | wakes 4 touching machines each hitting as +1 rank | about +2.25 cannon hits per use |

**U4. Trigger types: how often each activates (thinker pace, E except where marked)**

| trigger type | what causes it | rate per minute | notes |
|---|---|---|---|
| MERGE-FIRE | the unit is the merged part | about 19 merges per minute x the unit's share of merges | M (smart@3 interval 3.0 s, jittered) |
| WAKE-FIRE | a relay in the cascade reaches it | about 135 machine-fires per minute across the board (19 x 7.2) | chain avg M |
| AUTO-FIRE | cannon timer, 0.15x of a full shot | 20 per minute per cannon | quiet pace: no number shown |
| POSITIONAL | edge, empty cell, full side, row population | multiplier applies on every fire; share depends on the board | saw, lathe, piston, press, nail |
| COUNTED | every Nth fire or the Nth machine in a chain | 1 in N | rivet gun, Lucky Eight, Sixth Salvo |
| MARK / PRIME | helper output, one use per cascade, never stacks | 1 per helper per cascade | invariant: strongest wins |
| CARD | off-board, charges by machines fired in your chains (need 10 to 16) | about 1 per 1.5 to 2 cascades | rosterB only |
| MOVER | reshapes the board | 1 per 4 to 6 merges | fan, magnet |

**U5. How to cost a new unit or a rank change (the procedure)**

1. Pick the trigger type (U4) and the job (U1 to U3). Write its base damage.
2. Estimate `m` from its rule (positional share, counted share, cap) and `F` if it is a relay. `CI = ...` as defined above. A unit is balanced for its rarity when `CI` sits inside the band: common 0.9 to 1.5, rare 1.1 to 1.8, epic 1.2 to 2.2, legendary 1.5 to 2.6 (the current table sits inside these bands except coil, which is a common at 2.10, and wrecking_ball at 2.16, both known strong picks in the audit's squads).
3. Run `tools/unit-cost.ts --unit <id>` (S1): swaps it into the STARTER squad on three levels per chapter and reports the marginal dps with an interval; accept when it matches the CI band within 20%.
4. **Rank change**: if `rankMult` moves from 2.25 to x, every damage at rank r scales by `(x / 2.25)^(r-1)`: r4 by 0.79x at x = 2.1, r7 by 0.52x. The level HP overlay must be scaled by the same factor per chapter (use the cannon-eq rank column in 1.3). If the rank cap moves from 6 (`MAX_RANK`) to 8, the CEILING dps of chapters 5 to 8 changes by up to 2.25^2 on the top machine, so the boss HP multipliers in the spec must be refitted (section 5).
5. **Worked example**: a new common relay "Tuning Fork" waking the 2 cells left and right (F = 1.6), base 3: `CI = 0.3 + 1.6 x 0.25 x 1.25 = 0.80`: below the common band, so give it base 5 (CI 1.0) or reach 3 (F 2.6, CI 1.11).

### 1.6 Units and parts the game gives, versus boss HP

The "supply side" of a level is `P x clock x n`: what the player can deal. The "demand side" is minions + boss + power tax. Supply gifts are credited as follows, so they stay inside the fit and do not hide a spike:

- level gifts (units): GIFT / STARTER dps ratio per chapter (table in 1.3); they are NOT fitted around, they are headroom: the win rate of the thinker with the gift squad must stay at or above the STARTER squad (audit: the levels where GIFT loses, mostly L51 to L77, are search noise; S1 re-runs the search).
- `start_extra` helper cells: kit axis `GH` (+8% opening power, section 4).
- item grants and the first-purchase tools: tools are off in boss levels pre-level per the 2026-10-11 decision (allowed but not pre-level, no star penalty), so they are not in the boss budget.

---

## 2. TARGET DISTRIBUTION

### 2.1 How the 50% is measured, and the rule that produces it

Two possible measures:

| measure | definition | problem |
|---|---|---|
| HP share | boss HP / total stage HP (static) | already exactly 50% today and the owner still sees a small boss: the boss is a bigger machine that dies fast (a larger machine takes larger hits: cap 0.35 of max HP, and the board's rank mass grows during a level) |
| **TIME share (recommended)** | `tau = (win time - second-to-last kill time) / (win time - level start)`, smart@3, winning runs only, mean, report the 95% interval; passes when the LOWER end of the interval is at least 0.50 | measures what the player lives: seconds of fight. Includes the power tax. |

**Recommendation: time share, powers ON, thinker bot, lower CI end at least 0.50, design target 0.56 for chapter bosses, 0.52 for mini-bosses, 0.60 for the final boss (L80).** Reason: the audit shows a 50% HP boss gives 20% to 41% of the time (mean 32%), so any HP-only rule is wrong by a factor of about 1.5 to 2.5 per level.

**HP rule that produces it** (first order, per level, then iterated by the fit loop):

```
t_b = audit time share of the boss (M, spec field last_share_audit)
boss HP multiplier    = tau / t_b
minion HP multiplier  = (1 - tau) / (1 - t_b)
```

Derivation: the boss clears `HP_b` in `t_b x E` seconds, so its rate is `HP_b / (t_b E)`; the new boss time `tau E` needs `HP_b' = HP_b x tau / t_b`; the same for minions with `1 - t_b`. Total effort `E` is unchanged by construction. Resulting boss HP share:

| level kind | tau target | boss HP multiplier range | minion multiplier range | boss HP share afterwards |
|---|---|---|---|---|
| mini-boss (8) | 0.52 | 1.44 to 2.48 | 0.61 to 0.75 | 66% to 80% |
| chapter boss (8) | 0.56 (0.60 on L80) | 1.37 to 2.80 | 0.54 to 0.75 | 65% to 84% |

Per level values are in the spec (`hp_first_order`). Because the rate of a bigger machine also rises (the cap grows with HP), the multiplier is a starting point; the fit loop in section 5 re-measures `t_b` and corrects (2 to 3 passes).

**HP-share ceiling**: if the first-order boss share would exceed 75% of HP (the minions become a decoration), the second lever is used: a lower per-hit cap on the boss stage (`TUNING.effortModel.bossCap`, guess 0.20 instead of 0.35), which slows the boss in seconds without adding HP. The spec flags `needs_cap_lever` on L40 (84%), L68 (77%), L78 (80%), L80 (81%). Owner decision D2 chooses the lever.

Cause note (honest): the audit attributes the low boss time share to the cap. Another suspect is board growth: the player's rank mass rises during the level, so the last stage is cleared faster per HP regardless of the cap. S1 begins with a 20-minute diagnostic (cap off versus on, `--part a`) to separate the two; the HP rule above works for either cause because it uses the measured rate.

**Minion shares**: the minion pool is split with the shipped ramp `w_i = 1 + 0.3 i` over `waves` stages; the spec gives the normalized weights per level (for example L10: 0.435 / 0.565, L40: 0.172 / 0.224 / 0.276 / 0.328). Floor: the minions together stay at least 35% of their old HP so the level still has an arc.

### 2.2 Targets by level kind

| kind | last machine time share target | lower bound | minions | need target | powers |
|---|---|---|---|---|---|
| teach (L1 to L3) | untouched | none | untouched | audit value | none |
| normal (staged) | 0.28 to 0.38 (the 30% ramp) | none | ramp 1 + 0.3 i | curve below | light monster behaviour only, see 3.5 |
| goal (rank / chain) | goal stage time 0.25 to 0.40 | none | HP stages before the goal | curve below, lever is goal size and time, not HP | light behaviour |
| mini-boss level | 0.52 | CI lower end at least 0.50 | share `1 - tau` | curve (position 8: 0.58 + chapter offset) | one signature power (section 3), 2+ casts |
| boss level | 0.56 (L80: 0.60) | CI lower end at least 0.50 | share `1 - tau` | curve (position 10: 0.62 + offset) | one signature power, 3+ casts, armor phases at 66% and 33% |
| mania (pace = mania; Rush) | 0.35 to 0.45 | none | flat | 0.35 to 0.45 (short bursts) | OFF by design (`bossAttacks = false`); no saga level uses it today |

Casts: the boss share must leave room for the powers. `casts = 1 + floor((T_boss - first) / every)`. With the first cast at 6 s (calm today 8 s) and an interval of `cast_every_s_max` (spec; 16 s, or 13 s on L10 whose boss fight is only 33 s), every boss gets at least 3 casts and every mini at least 2.

### 2.3 Pacing curve across the chapters

`need_target(level) = shape[position in chapter] + 0.01 x (chapter - 1)`:

| position | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 (mini) | 9 | 10 (boss) |
|---|---|---|---|---|---|---|---|---|---|---|
| shape | 0.40 | 0.46 | 0.50 | 0.52 | 0.46 | 0.54 | 0.56 | 0.58 | 0.50 | 0.62 |
| role | breather (new unit gift, fresh start) | ramp | ramp | ramp | breather (goal level) | ramp | ramp | mini peak | breather before the boss | boss peak |

Rules (checked by the spec and by S1's test): need stays between 0.30 and 0.70; step between neighbouring levels at most plus or minus 0.15, into a boss at most plus 0.20, after a boss at most minus 0.25; breathers are positions 1, 5 and 9 (30 levels); chapter means rise from 0.51 (chapter 1) to 0.58 (chapter 8). Today the audit shows steps of plus 208% (L51 to L52), minus 72% (L50 to L51) and boss levels of 0.55 to 0.90: the shaped curve removes these.

Scale of the refit (spec `total_hp_mult_first_order = need target / need STARTER`): 28 of 80 levels change total HP by more than 25% (12 goal, 12 normal, 2 mini, 2 boss), range 0.58x to 3.1x (L72, a goal level fitted at need 0.17, goes up). On goal levels the lever is the goal size or time, not HP. This is why S4 is gated by the owner.

---

## 3. BOSS POWER REDESIGN

### 3.1 Rules every power must pass

**Visible** (telegraph at least 600 ms before anything resolves; shipped calm warning is 3.5 s, so the floor is a hard minimum, not a goal):

1. boss wind-up pose or animation, 800 to 1200 ms, unique per boss;
2. a banner with power name and icon, at least 1000 ms; the first cast of a level adds a 500 ms 0.5x slow-motion and an 8 to 10 px camera shake;
3. a colour vignette on the screen edge for the whole warning, one colour per power;
4. marked cells or rows with a countdown ring and number, plus an icon of the counter ("break key");
5. one unique sound sting per power (0.6 to 1.0 s) and a different resolve sound; 16 stings;
6. QA rule (S2 test): at warning time the scene exposes at least 4 telegraph layers (1 to 4) and no resolve can occur earlier than 600 ms after the banner starts.

**Outcome-changing**: a measurable change to the player's plan, tested by the A/B (below). Not "marks a cell the bot never wanted to touch".

**Counterable**: the warning card names the counter with an icon, at least one counter exists on every legal board, and a reader bot that performs it recovers at least 40% of the loss.

**Fairness**: never unwinnable (a legal merge always exists after a cast; a power aborts if it would remove the last live pair; no permanent loss beyond one rank per machine per cast; hostages return); never hidden (the visibility test above); one power pending at a time; no cast in the first 6 s or during a breather; no cast while a cascade is resolving; blast_plate cancels any power.

**Impact basis (denominator)**: every percentage below is measured on the BOSS STAGE, from the moment the boss stage starts to the win (merges needed or seconds), powers ON versus OFF. It is not a share of the whole level clock. Level-clock equivalent = stage % x boss time share (about 0.5 to 0.6): +10% / +15% / +20% on the stage is about +5% / +8% / +11% of the clock. The audit's 2.0% mean cost is of the whole clock, and the boss stage is only about 32% of it today, so today's best case is at most about 6% of the boss stage (upper bound: part of the audited cost sits in minion-stage light powers). The step is therefore about 1.7x to 3.3x today's cost, not 5x to 10x. Reachability: with the boss fight at 52% to 60% of the level, +15% of the stage is a few seconds of the 35 to 70 s fight; spring_tonic (heals about 12% of boss dps per echo, 4 echoes) and brick_armor are sized against that stage basis. S2's `tools/boss-ab.ts` reports both bases.

**Impact target (A/B)**, measured with common random numbers (same seed, same bot seed, powers ON versus OFF = `TUNING.bossAttacks=false`), `n >= 60` per arm, smart@3 (the blind bot):

| tier | merges needed or clock time, ON versus OFF | blind-bot win rate drop | reader-bot win rate drop | reader recovers |
|---|---|---|---|---|
| mini-boss | at least +10% | at most 25 points | at most 6 points | at least 40% of the loss |
| chapter boss | at least +15% | at most 25 points | at most 6 points | at least 40% |
| final boss (L80) | at least +20% | at most 25 points | at most 6 points | at least 40% |

A power passes if EITHER merges needed or time cost reaches the tier floor (the win rate is saturated near 100% on the thinker, so it is a guard rail, not the main metric). Today's audited powers cost 2.0% of the clock on average (at most about 6% of the boss stage) and only 14 of 35 are distinguishable from zero, so every number above is about a 1.7x to 3.3x step on the same stage basis. The "reader bot" does not exist yet: S2 delivers `tools/boss-ab.ts` with it (smart@3 plus a per-power `counter()` hook executed during the warning).

### 3.2 Coherence: archetypes so the bosses do not feel alike

Every chapter's mini-boss teaches the skill its boss then tests.

| chapter | mini-boss (lesson) | archetype | chapter boss (exam) | archetype | skill taught |
|---|---|---|---|---|---|
| 1 | L8 Pressure Popper: PRESSURE POP | COUNTDOWN | L10 Tin Can King: LID ARMOR | ARMOR (timed) | read the marks; plan around armor |
| 2 | L18 Carousel Crab: DOUBLE TRACK | SCRAMBLE | L20 Fridge Overlord: DEEP FREEZE | LOCK | see rows move or lock |
| 3 | L28 Vanity Moth: MIRAGE | SUMMON (decoys) | L30 Viper Queen: SNATCH | THEFT | protect your best unit |
| 4 | L38 Brick Printer: BRICK ARMOR | ARMOR (stacking) | L40 Twin Toasters: OVERHEAT | ENRAGE | keep chains big |
| 5 | L48 Scrap Kraken: INK CELLS | SHIELD CELLS | L50 Piano-saurus Rex: ENCORE | SUMMON (healers) | clear the right target |
| 6 | L58 Spring Jack: SPRING TONIC | HEAL / INTERRUPT | L60 Junkzilla: PLATE ARMOR | ARMOR (plates) + SHIELD CELLS | interrupt, break armor |
| 7 | L68 Oil Otter: SLICK RINK | SCRAMBLE (aimed) | L70 Rivet Rhino: RIVET PIN | LOCK (pin) | read arrows, merge into the pinned |
| 8 | L78 Portal Possum: PORTAL TRAP | SCRAMBLE (exile) | L80 Chrono Chimera: THREE FORMS | COMPOSITE | everything above |

No two adjacent chapter bosses share an archetype (ARMOR, LOCK, THEFT, ENRAGE, SUMMON, ARMOR+SHIELD, LOCK, COMPOSITE: the two LOCKs are five chapters apart and differ in rule). The six archetypes the owner named (armor phases rejecting chain damage, board lock on a row, stealing or corrupting a part, enrage timers, summons, shield cells needing a sandwich) are each a chapter boss or mini-boss signature.

**Break key**: where a power needs "a sandwich" (INK CELLS, PLATE ARMOR) the break key is a sandwich merge when `TUNING.mergeRule` is a sandwich rule, otherwise a chain of 4 (INK) or 5 (PLATE). Decision D4.

### 3.3 The 16 signature powers

Common to all: telegraph as in 3.1, fairness as in 3.1, impact target by tier. "Replaces" names the shipped attack; shipped attacks stay as the secondary cast where noted (the existing `second` attack of a chapter boss still alternates in the final phase).

| # | level, boss | id | signature (what happens) | visible (distinct) | plan change | counter | cost |
|---|---|---|---|---|---|---|---|
| 1 | L8 Pressure Popper | `pressure_pop` | belly gauge fills over 3.5 s, then 2 marked machines (highest ranks up to rank 3) each lose 1 rank and their cells scorch for 4 s (no drops). Replaces `bomb` | belly swells, red steam, rising hiss then BANG, red pulse on the marked cells with a number | rank mass loss 2 to 4 per unanswered cast, 2 cells of space | merge or move the marked machines; wake a marked machine in a chain (vents it) | S, about 150 lines (extends bomb) |
| 2 | L10 Tin Can King | `lid_armor` | at 66% and 33% HP and on every cast the lid slams shut for 6 s: damage from woken machines x0.25 (the merged part and the first link count in full). Two chains of 4+ (or one sandwich) crack it open early. Keeps `clamp` as secondary | steel lid sprite with a crack counter 0/2, CLANG + 8 px shake, damage numbers turn grey "BLOCKED" | players bank the board and release one big chain; dps about x0.4 during the lid | build while closed, or crack the lid with two chains of 4+ | M, about 300 lines (damage rule in `applyDamage` + UI) |
| 3 | L18 Carousel Crab | `double_track` | two rows slide in opposite directions by one cell | chevron tracks on both rows, clack sound, tint | up to 10 cells shuffle, planned pairs separate | merge a pair in the rows first; plan the new neighbours (direction is shown) | S, about 120 lines (extends `conveyor`) |
| 4 | L20 Fridge Overlord | `deep_freeze` | the BUSIEST row (most parts) freezes for 5 s: frozen machines cannot be dragged or wake; merging INTO one thaws it; each chain link that touches the shell deals 1 of 2 ice damage. Keeps `conveyor` as secondary | cold wave sweeps the row from the fridge door, blue vignette, creak sting, ice shell with 2 crack pips | up to 5 machines (about 30% of the board) out of play | merge into the frozen machine, chain through the ice, build in other rows | M, about 300 lines |
| 5 | L28 Vanity Moth | `mirage_decoys` | 2 glitter decoys copy your two highest parts into empty adjacent cells: solid, cannot be dragged or merged, and a chain that reaches one ENDS there. They pop when a neighbour wakes or after 10 s. Replaces `mirror` | sparkle ring and wing flash, translucent shimmering copies, "DECOYS" banner | chains shortened by 1 to 3 links, 2 cells blocked | wake a neighbour to pop them, or route chains around | M, about 260 lines |
| 6 | L30 Viper Queen | `snatch` | the cell of your highest-rank SHOOTER is marked; at the deadline whatever stands there is taken for 10 s (shown in a hostage slot with a timer); it returns at rank minus 1 unless you deal 8% of the boss's max HP before the timer ends (then it returns whole). Keeps `mirror` as secondary | green line from the queen to the marked cell, coil wrapping a machine, hostage icon with countdown | your best shooter is absent for 10 s: damage down by its share | move the marked machine away and leave a cheap part in the marked cell (she takes what stands there); or merge it onward | M, about 320 lines |
| 7 | L38 Brick Printer | `brick_armor` | prints up to 3 bricks onto empty cells; each standing brick makes the printer take 10% less damage (up to minus 30%), shown as plates stacking on its body. Bricks stay until cleared (one chain link beside a brick clears it). Replaces `blocks` | printer clatter, bricks drop with a thud, plate lights on the boss body | dps minus 10% to 30% while bricks stand, plus board space | fire a chain beside the bricks | M, about 240 lines |
| 8 | L40 Twin Toasters | `overheat` | a heat gauge on the toasters rises 1 per 3 s; a chain of 3+ lowers it by 1, a chain of 5+ by 3. At 8 a 3.5 s BURST warning starts; at 10 two columns burst: every machine still inside loses 1 rank and the columns stay hot 4 s (shooters half damage). Keeps `blocks` as secondary | big thermometer, toast pops, columns glow orange and shimmer, rising whistle | an enrage timer: sustained big chains or evacuate | keep chains at 5+ so the gauge never fills, or leave the two columns | M, about 300 lines |
| 9 | L48 Scrap Kraken | `ink_cells` | 3 cells next to your highest parts are inked: a machine standing or placed there deals no damage and wakes nobody. A sandwich merge touching an ink cell (or a chain of 4 through a neighbour) breaks it. Replaces `pull` | tentacle slap and splash, dark dripping tiles with the break-key icon | up to 3 machines go silent | sandwich or chain of 4 beside the ink; or avoid placing there | M, about 280 lines |
| 10 | L50 Piano-saurus Rex | `encore_echoes` | 2 echo blocks appear on empty cells; each heals Rex 1.5% of max HP per 4 s while standing, has 2 hit points (one per chain link that touches it), expires after 12 s; total healing capped at 20% of max HP per fight. Keeps `pull` as secondary | piano notes spawn the echoes, green healing numbers, pulsing note glyphs | roughly minus 40% net dps while both stand: they become the first target | clear them with chain links | L, about 450 lines (new board entity and heal) |
| 11 | L58 Spring Jack | `spring_tonic` | Jack drinks a tonic: heals 3% of max HP at the deadline unless a chain of 3+ lands during the 3.5 s warning ("SPILLED": he takes x1.2 for 3 s). At most 4 heals per fight. Replaces `bounce` | raised bottle, fizzing, green trail up his HP bar | about 12% of boss dps is eaten by heals | any chain of 3+ in the window (no board change needed) | S, about 160 lines |
| 12 | L60 Junkzilla | `plate_armor` | 3 armor plates on the body (each armor phase restores 1): while at least 1 stands, chain damage beyond the 3rd link is rejected. A plate breaks to a chain of 5+ (the break key) or a sandwich; after 25 s a plate softens by itself. Keeps `split` and `bounce` as secondary | plates on the body, CLANG on a rejected hit, grey "BLOCKED" numbers, plate shatter | chain play weaker until plates are gone: break them first, then burst | chain of 5+ or a sandwich to shatter a plate | L, about 500 lines |
| 13 | L68 Oil Otter | `slick_rink` | a 2x3 oil puddle for 6 s; any part dropped on oil slides one cell along an arrow, and the arrows point AWAY from the twin of your best pair at warning time. Keeps `conveyor` as secondary | rainbow sheen, pulsing arrows, squeak sting | your best merge is broken if you drop carelessly | do the best merge first, drop outside the oil, or use the arrows to land beside another twin | S, about 140 lines (extends `slick`) |
| 14 | L70 Rivet Rhino | `rivet_pin` | 3 rivets pin your 3 highest-damage machines for 7 s: pinned machines cannot be dragged or dropped on and hit x0.5; merging INTO a pinned machine releases it. Replaces `tow` | Rhino stamp, rivets fly with trails, big rivet heads on the machines, clang | your best shooters are frozen and weak: replan around anchors | merge a twin into each pinned machine; build the chain through them | M, about 220 lines |
| 15 | L78 Portal Possum | `portal_trap` | two portals open for 6 s; any delivered part that would land next to a portal is exiled to the farthest empty cell and the matchmaker is off for 6 s. Replaces `portals`, which today HELPS the player | swirling portals, parts visibly fly in and pop out at the far corner with a trail | fewer ready pairs: merges needed rises | drag the exiled parts back, drop away from portals, or use a portal to shortcut a dragged machine | M, about 240 lines |
| 16 | L80 Chrono Chimera | `chrono_forms` | three forms by HP thirds: CLOCK (time ransom, minus 4 s from the clock unless both marked machines wake in one chain, plus a pendulum bar), then SNATCH (power 6), then PLATE ARMOR (power 12) with a 12 s cast interval. Keeps `portals` removed | head swap cinematic: 100 ms hit-stop, 0.5x slow-motion for 500 ms, new colour and music layer per form | the final exam combines three learned counters | as the three powers; ransom clock never below 10 s | L, about 450 lines (reuses 6 and 12) |

**Build order by impact per cost** (from the audit: powers that change the damage rule or remove a shooter move the clock; marks on cells the bot never touches do not):

1. armor family (2, 7, 12, 9: one shared "damage rule" code path plus break keys), highest impact;
2. theft and enrage (6, 8) and lock (4, 14);
3. summons (5, 10) and heal (11);
4. scramble lessons (1, 3, 13, 15) and the composite (16, reusing 6 and 12).

**Light behaviour on ordinary levels** (frost, suction, hot, rest, split, tow, ransom: audit "light" rows) is out of scope: 8 of its 19 levels already show a significant cost; S2 only retires the two that never bite (light frost: 91% whiff, light tow: identical in 100% of runs) by replacing them with a light version of the armor lid or the ink cell.

---

## 4. START VARIETY MODEL

### 4.1 The starter kit

`kit = (layout, rank mix, gift)`; id format `A-T16-GJACK`. The kit is dealt per ordinary and goal level by a seeded no-repeat deal (like `layoutFor`, depends only on the level definition, so seed + actions stays deterministic); teach levels (1 to 3) and boss and mini levels (x0, x8) keep their scripted starts (the second PAIR8 set already makes them unique).

**Axis 1, layout** (`src/content/openings.ts`, shipped behind `TUNING.variedOpenings`): A, B, C, D, the same starter parts (for a given rank mix) and the same rank mass; first-chain power index A 1.00, B 0.75, C 0.75, D 1.00 (M, `docs/OPENING_VARIETY.md`).

**Axis 2, rank mix** at constant rank mass (mass = sum of 2^(rank-1); 8 / 16 / 32 for start rank 1 / 2 / 3). Enumerated for 8 parts (or fewer at mass 8):

| start mass | FLAT | PEAK | TWIN-PEAK |
|---|---|---|---|
| 8 (L1 to L20) | F8: 8 x r1 | P7: 1 x r2 + 6 x r1 (7 parts) | D6: 2 x r2 + 4 x r1 (6 parts) |
| 16 (L21 to L40, L61 to L80) | F16: 8 x r2 | S16: 1 x r3 + 5 x r2 + 2 x r1 | T16: 2 x r3 + 2 x r2 + 4 x r1 |
| 32 (L41 to L60) | F32: 8 x r3 | S32: 1 x r4 + 5 x r3 + 2 x r2 | T32: 2 x r4 + 3 x r3 + 1 x r2 + 2 x r1 |

**Per-cell rank rules (what `newLevel` must express).** Today `newLevel` (`src/core/game.ts`) places every starter part at one `def.starting_rank`; a kit needs a per-slot rank. The 8 layout slots are taken in a fixed order: shooter[0], shooter[1] (the Jumpstart pair), shooter[2], shooter[3], coil[0], coil[1], bell[0], bell[1]. Ranks are dealt to the slots in that order: F = all slots at the start rank; S16 = slot 0 r3, slots 1 to 5 r2, slots 6 to 7 r1; T16 = slots 0 to 1 r3, 2 to 3 r2, 4 to 7 r1; S32 and T32 = the same shapes one rank up (S32: r4, five r3, two r2; T32: two r4, three r3, one r2, two r1); P7 = slot 0 r2, slots 1 to 6 r1, slot 7 empty; D6 = slots 0 to 1 r2, slots 2 to 5 r1, slots 6 to 7 empty. Layout cells do not change (`openings.ts` keeps them), only the rank per cell and the empty slots are new; the spec carries the table as `kit_catalog.cell_rules`. A mix with an unpaired part (S16's single r3) is legal; the "at least 5 live pairs at move 1" check is the guard.

**Invariants amended.** The OPENING_VARIETY tests (mass, part count, family multiset equal across layouts) are kept but compare the four layouts of the SAME mix; two mixes of one start mass differ in part count by design (P7 has 7 parts, D6 has 6). Empty slots are legal. The Jumpstart Kit still upgrades layout.shooter[0..1] by one rank on top of the kit (so a peaked mix with a Jumpstart opens one rank higher on slots 0 and 1); it is an opt-in item outside the kit mass check and outside the effort budget, and the kit tests run with jumpstart off. If the owner prefers to keep part count fixed, drop P7 and D6 (chapters 1 and 2 then vary by layout and `GH` only; spec levels 5, 7, 9, 11, 12, 13, 16, 19 would be re-dealt): the cost is fewer distinct kits in chapters 1 and 2.

**Axis 3, units given by the game**: `G0` plain; `GH` one helper cell (the existing `start_extra` path, including the `myHelper` substitution; levels that already carry a `start_extra` keep `GH`); `GNAIL`, `GJACK`, `GSAW`, `GTORCH` = a default squad shooter of Nail Gun (from L11), Jackhammer (L21), Saw Blade (L31) or Blowtorch (L36). Precedence (spec `kit_catalog.gift_rules`): `def.shooter` (a level-fixed shooter; today only L6, rocket) wins, then the squad the player picked (`opts.shooter`, Roster B), then the gift. A gift never overrides a player's choice: it applies only when `def.shooter` is unset and the player has not picked a squad; otherwise it degrades to `G0` for that player. Kit variety statistics are therefore stated for the default squad; a player with a chosen squad still gets layout and rank mix variety.

### 4.2 Rules ("no two adjacent levels start alike")

1. adjacent levels never share a layout;
2. adjacent ordinary levels differ in at least 2 of the 3 axes;
3. any 4 consecutive ordinary levels use at least 3 of the 4 layouts;
4. a gift never repeats on adjacent levels (G0 excepted; fixed `start_extra` levels excepted);
5. G0 is at most 40% of a chapter (from L11);
6. every kit has at least 5 live pairs at move 1 (the opening-variety rule) and a kit power index `kp` of 0.75 to 1.15 (B and C layouts alone give 0.75; the HP trim clamp of -10% is reached on 8 kits);
7. B and C layouts (weak openings) are paired with a peaked rank mix or a gift where the roster allows.

The spec contains the dealt kit per level (`starter_kit_id`), generated by a seeded script that checks the rules: **61 ordinary levels, 51 distinct kits, largest identical group 3 (today 14), 0 adjacent levels with the same layout, 0 adjacent levels alike on 2 of 3 axes.** Ranks 1 to 3 hold the kit pool small in chapter 1 (no gifts exist yet before L11), so chapter 1 relies on layout and mix only, and relaxed rules apply there (flagged in the spec through the kit ids).

### 4.3 How the kit enters the effort budget

The effort budget `B_L` does not change with the kit; what changes is how fast the opening goes. Model: `kp` = (layout factor) x (mix factor) x (gift factor), estimated as layout (1.00, 0.75, 0.75, 1.00), mix (1.00 flat; 1.02 to 1.06 for peaked mixes) and gift (1.00 to 1.08). The mix factor is computed as the damage sum `10 x 2.25^(rank-1)` over the mix divided by the same sum for the flat mix of equal rank mass: P7 1.03, D6 1.06, S16 1.02, T16 1.03, S32 1.02, T32 1.04. (The first draft said 1.08 to 1.14, three to five times too high.) It is pure convexity; chain effects of a peaked board (a big part waking more neighbours) are not in it and are what S3 measures. The opening is about the first 25% of the effort, so `HP trim = (kp - 1) x 50%`, clamped to plus or minus 10%, applied to the level's total HP (spec `starter_kit.hp_trim_pct_est`). With the corrected factors `kp` spans 0.77 to 1.10 and the trim spans -10% to +5%: the layout factor dominates, the mix hardly moves HP. A weak kit (B or C layout) therefore gets less HP, a strong kit slightly more; the overlay carries it. `kp` and the 50% are E: S3 measures them with `tools/opening-variety.ts --kits` (first-chain damage and chain length per kit) and with an A/B of the same level under kits A and B (the "opening horizon" omega), and replaces the estimates before the refit.

---

## 5. HOW TO REFIT

Hard rules: `levels.json` is never hand-edited. The overlay is a separate table read only while `TUNING.effortModel` is ON (default OFF), so the live levels do not move until the owner approves. levels.json changes only in S4 through `tools/sim-levels.ts` (HP) and `tools/star-times.ts --write` (stars), after approval.

**The overlay table** (`src/content/effortOverlay.json`, generated, S1): per level `{ bossHpMult, minionHpMult, bossCap?, totalHpMult, powerId, kitId, trimPct }`, produced from `docs/effort-model-spec.json` by `tools/effort-fit.ts --write`. `newLevel` applies it only when the flag is ON; OFF is byte-identical (the flags-off guard in `tests/flagsOff.test.ts`: add `effortModel` to the registered flags and regenerate the TUNING digest only, as was done for the earlier flags).

**Procedure** (S1 and S4; each command is the exact verb):

1. Baseline and tools: `npm ci && npm run typecheck && npm test`.
2. Measure today's time shares (audit part A, 30 runs): `npx vite-node tools/effort-audit.ts --part a --from 1 --to 80 --n 30` (chunks of 14, 31, 35 levels as in the audit reproduction block).
3. Generate the first-order overlay: `npx vite-node tools/effort-fit.ts --spec docs/effort-model-spec.json --write` (applies `tau / t_b`, `(1 - tau) / (1 - t_b)` and the kit trims).
4. Re-measure with the flag ON (the tool gains `--effort`): `npx vite-node tools/effort-audit.ts --part a --effort --levels 8,10,18,20,28,30,38,40,48,50,58,60,68,70,78,80 --n 30`. Pass: `tau` lower CI end at least 0.50 on all 16 levels, mean within plus or minus 0.03 of target. If not, `tools/effort-fit.ts --iterate` multiplies each boss multiplier by `tau_target / tau_measured` and repeats (at most 3 passes); levels still over the 75% HP-share ceiling switch to the cap lever (`bossCap` 0.20, then 0.15).
5. Fit the total effort to the need curve: `npx vite-node tools/sim-levels.ts --smart --effort --levels <list> --dry` and compare to the spec `need_target`; ordinary levels move `totalHpMult`; goal levels move the goal size or time (a separate table, not HP).
6. Powers (S2) and kits (S3) are added to the overlay one family at a time and steps 4 and 5 repeat (powers change the boss time, kits change the opening).
7. After owner approval only: `npx vite-node tools/sim-levels.ts --fit-smart --effort --from 1 --to 80` (writes HP to `levels.json`, never raises a level the thinker already wins by more than the target), then `npx vite-node tools/star-times.ts --write --n 40` (2 stars = median ordinary player, 3 stars = median thinker), then `npx vite-node tools/level-report.ts --from 1 --to 80 --n 8` for the win bands (thinker about 90%, ordinary 85 to 95%, never idle-wins).
8. The flag stays OFF until the owner flips it; levels.json is regenerated with the flag ON only at that point.

**The sim spec** (`docs/effort-model-spec.json`, schema `effort-model-spec/1`): constants; need curve; targets by kind; kit catalog with rules and generation statistics; the 16 powers (id, archetype, tier impact target, casts, size); per-chapter power table; and 80 level rows with `need_target`, `effort_budget_s`, `total_hp_mult_first_order`, `breather`, `last_share_target`, `last_share_floor_lower_ci`, `last_share_audit`, `boss_time_budget_s`, `minion_time_budget_s`, `minion_stage_weights`, `hp_first_order` (with `needs_cap_lever`), `boss_power_id`, `min_casts`, `first_cast_s`, `cast_every_s_max`, `starter_kit_id` and `starter_kit`. Check: `node -e "JSON.parse(require('fs').readFileSync('docs/effort-model-spec.json','utf8'))"`.

---

## 6. FIVE DECISIONS ONLY THE OWNER CAN MAKE

**D1. How big is the last boss?**
- A (recommended): time share 56% for chapter bosses, 52% for mini-bosses, 60% for the final boss. You would SEE: minions die quickly (about 40 to 50% of the old time) and the boss bar is a long fight of about 35 to 70 s with 3+ powers cast.
- B: exactly the floor, 50% by time. You would SEE: the boss fight about 10% shorter, about 2 powers per fight, minions still take half the level.
Recommendation: A, because powers need casts to be felt (2 casts at 50% is too few for the armor family).

**D2. Which lever gives the boss its size?**
- A (recommended): raise boss HP, shrink minion HP, keep the 35% per-hit cap; on L40, L68, L78, L80 add a smaller per-hit cap on the boss stage. You would SEE: bigger boss HP numbers (1.4x to 2.8x) and tiny minions.
- B: lower the per-hit cap for every boss stage (0.35 to 0.20) and keep HP. You would SEE: the same HP numbers but big chains no longer take a quarter of the bar in one hit, so the boss "takes a lot of hits".
Recommendation: A, then B only where the boss would hold more than 75% of the HP, because B changes the feel of a big chain.

**D3. May a power destroy rank mass?** (pressure_pop, overheat, snatch: at most one rank per machine per cast)
- A (recommended): yes, capped at one rank per machine per cast, always telegraphed, with a counter. You would SEE: a machine visibly shrink one rank after a missed warning, red flash.
- B: no permanent loss; powers only delay, lock, silence or steal temporarily (hostage returns whole). You would SEE: nothing is ever lost, bosses feel gentler, impact targets are harder to reach (about 10% instead of 15% to 20%).
Recommendation: A for chapter bosses, B for mini-bosses (lessons are gentle).

**D4. Is a sandwich the break key for shield cells and plates?**
- A (recommended for now): a chain of 4 (ink cells) or 5 (plates) is the key; sandwich is an extra option when `mergeRule` is a sandwich rule. You would SEE: the same boss everywhere, no dependence on the sandwich test.
- B: sandwich only (the test rule becomes mandatory in the boss fights). You would SEE: "SANDWICH TO BREAK" icons; players who do not know the rule get stuck on the armor family.
Recommendation: A until the sandwich test (2026-10-11 decision) is approved for the main game, then offer B as a follow-up.

**D5. Starter kits and chapters 7 and 8.**
- A (recommended): ship the kits at the shipped rank mass (mass 8 / 16 / 32 / 16 by chapter pair) and, in the same refit, raise chapters 7 and 8 to mass 32 so the late game is the biggest (HP up about 1.5x). Dependency: the spec's default numbers for levels 61 to 80 (mass 16 mixes, boss and minion multipliers, kp, trims) are computed on the shipped state and marked `provisional_pending_D5`; each of those levels carries a `d5_a` block with the mass-32 variant (mixes F32/S32/T32, kp and trims recomputed, HP multipliers x1.5; effort seconds and need targets unchanged because power rises with the HP). If the owner picks A, S1 and S3 use the `d5_a` blocks for chapters 7 and 8. You would SEE: levels 61 to 80 start with taller parts and bigger numbers; no more drop in HP at level 61.
- B: kits only; keep the reset to rank 2 at level 61. You would SEE: the same plain boards the audit found, but with varied layouts and units; chapters 7 and 8 stay smaller than 5 and 6.
Recommendation: A, since the audit shows the reset (dps 733 to 430) as the biggest hole in the power curve; a kit-only release hides it.

---

## 7. SLICE PLAN

Order: S1 gives the owner the boss-share fix behind the flag with proof; S2 the powers; S3 the kits; S4 the refit and the stars. Each slice is a separate branch and ends with the verification block. Nothing changes live levels while the flag is OFF.

**S1. Effort overlay and boss HP share behind the flag** (size M, about 400 lines plus 2 tools)
- Adds: `TUNING.effortModel` (default false) and `TUNING.effortModelOpts` (`tau`, `bossCap`), `src/content/effortOverlay.json` (generated), the overlay read in `newLevel` (boss and minion HP only), `tools/effort-fit.ts`, `tools/unit-cost.ts`, `--effort` in `tools/effort-audit.ts` and `tools/sim-levels.ts`, QA row EFFORT MODEL, tests.
- Acceptance: (1) flag OFF: `tests/flagsOff.test.ts` golden state hashes unchanged (TUNING digest regenerated only); (2) flag ON, measured PRE-POWER (shipped attacks, no new S2 powers; S2 later adds 10% or more to the boss time, so S2 re-fits the boss multiplier and S1's numbers are provisional until then; the final acceptance is tau lower CI at least 0.50 POST-POWER in S4): tau lower CI end at least 0.50 on all 16 boss and mini levels, mean within plus or minus 0.03 of target; (3) total need within plus or minus 0.05 of the baseline need on those levels (effort neutral); (4) boss HP share at most 75% except where the cap lever is on; (5) the cap versus board-growth diagnostic is reported in the doc; (6) the 41-unit table in 1.5 gets its measured column.
- Verify: `npm run typecheck && npm test`; `npx vite-node tools/effort-audit.ts --part a --effort --levels 8,10,18,20,28,30,38,40,48,50,58,60,68,70,78,80 --n 30`; `npx vite-node tools/effort-fit.ts --check`; `npx vite-node tools/unit-cost.ts --all --n 12`.

**S2. Boss powers in order of impact** (four sub-slices, each behind `TUNING.effortModel` plus the per-power id in the overlay)
- S2a armor family (powers 2, 7, 12, 9; size L): shared damage-rule code path and break keys.
- S2b theft, enrage, lock (6, 8, 4, 14; size M each).
- S2c summons and heal (5, 10, 11; size M, L, S).
- S2d scramble lessons and the composite (1, 3, 13, 15, 16).
- Adds: `tools/boss-ab.ts` (ON versus OFF with common random numbers, the reader bot with a per-power `counter()` hook), the telegraph layers and 16 stings (visual QA: `tools/shots.mjs`), `tests/bossPowers.test.ts`.
- Acceptance per power: the tier floor in 3.1 (merges or time at least +10% / +15% / +20%, n at least 60); reader recovers at least 40%; blind win rate drop at most 25 points, reader at most 6; telegraph QA passes (4 layers, at least 600 ms before resolve); never unwinnable (property test over 200 seeded boards: a legal merge always exists after the cast); deterministic (same seed and actions give the same state); flag OFF unchanged.
- Verify: `npm test`; `npx vite-node tools/boss-ab.ts --power <id> --n 60 --bots blind,reader`; `node tools/shots.mjs` (screenshot of the warning frame).

**S3. Starter kits** (size M, about 300 lines)
- Adds: `src/content/starterKits.ts` (kit catalog, deal), overlay field `kitId`, the layout hook generalised from `openings.ts`, `tools/opening-variety.ts --kits`, `tests/starterKits.test.ts`.
- Acceptance: the adjacency rules of 4.2 hold for all 80 levels (test); at least 5 live pairs at move 1 on every kit; rank mass, part count and family multiset equal across the four layouts of each mix as in 4.1; distinct whole starts at least 48 of 61 ordinary levels with the largest group at most 3 (the "today 28 distinct, group 14" is the audit's whole-start count on the 61 ordinary levels excluding first deliveries; the audit's 44 distinct in 77 non-teach levels also counts the 16 scripted boss and mini levels, each unique; S3 recounts both populations with one tool before comparing); `kp` per kit within 0.85 to 1.15 after the HP trim; flag OFF byte-identical.
- Verify: `npm test`; `npx vite-node tools/opening-variety.ts --kits`; `npx vite-node tools/level-report.ts --from 21 --to 30 --n 8 --effort`.

**S4. Refit stars and HP** (size L: mostly sim time, about 4 to 6 hours of runs in chunks)
- Procedure: section 5 steps 5 to 8, after the owner has answered D1 to D5.
- Acceptance: need within plus or minus 0.05 of `need_target` on at least 90% of the levels and within plus or minus 0.10 on all; boss time share lower CI at least 0.50 on 16 of 16; thinker win rate 85 to 95% on ordinary and 80 to 95% on boss levels with powers ON; ordinary player (random@2.5) 2 stars at least 50% of the time; no level with a neighbour step beyond the 2.3 rules; the 3-star share per level between 35% and 65%.
- Verify: `npm run typecheck && npm test`; `npx vite-node tools/sim-levels.ts --smart --effort --dry`; `npx vite-node tools/star-times.ts --n 40 --effort` (dry); the audit report regenerated with `--part report --effort` and compared with the spec. The diff of `levels.json` is produced by the tools only and reviewed as a numbers-only change.

---

## S1 results

Task t-9092cab7, 2026-10-14. Flag `TUNING.effortModel` (default OFF), QA row EFFORT MODEL, overlay `src/content/effortOverlay.json` (generated by `tools/effort-fit.ts`, never hand-edited, `--check` replays it from the spec and its recorded measurements), `newLevel` reads it for boss HP, minion pool and the boss-stage per-hit cap (`hitCap`, `GameState.bossCap`) only while the flag is ON. `levels.json` and `puzzles.json` are untouched. Flag OFF: the 12 level hashes and the puzzle hash in `tests/golden/flagsOff.json` are unchanged; only `_tuningDigest` was regenerated (`7d55033e:5520` to `3c84616a:5626`, the two new TUNING keys). Measured with `npx vite-node tools/effort-audit.ts --part a --effort --smart-only --levels ... --n 30` (the same smart@3 bot, seeds and time-share definition as the audit; `--smart-only` skips the random and planner arms), pre-power (shipped attacks, no S2 powers), baseline = the same command without `--effort`.

**Verdict: S1 meets the acceptance on 6 of 16 levels (L10, L18, L38, L58, L60, L70). 8 of 16 have the interval's lower end at or above 0.50 (those six plus L20 and L50), all 16 beat their audit time share, and the 10 failing levels are limited by the levers D2 allows (below): two are near misses (L8: interval 0.003 short; L20: need +0.053 against the 0.05 limit), the rest are not reachable with HP and the cap steps 0.20 / 0.15 alone. Nothing here is hidden: the table is the final measurement of the checked-in overlay.**

### Final table (n = 30 smart@3 runs per level, flag ON, checked-in overlay)

need = total stage HP / (mean damage per second x clock) of the same runs (the audit's definition); "d need" = ON minus baseline; pass = CI lower >= 0.50 and mean within 0.03 of target and |d need| <= 0.05 and boss HP share <= 75% unless the cap lever is on.

| L | kind | target | tau base | tau ON (mean) | CI lower | CI upper | need base | need ON | d need | boss HP share | cap | win ON | result |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 8 | mini | 0.52 | 0.342 | 0.508 | 0.497 | 0.518 | 0.430 | 0.423 | -0.007 | 67.0% | - | 100% | fail (CI 0.003 short) |
| 10 | boss | 0.56 | 0.414 | 0.575 | 0.572 | 0.579 | 0.558 | 0.572 | +0.015 | 74.5% | 0.15 | 100% | PASS |
| 18 | mini | 0.52 | 0.358 | 0.524 | 0.514 | 0.535 | 0.534 | 0.547 | +0.013 | 74.2% | 0.2 | 100% | PASS |
| 20 | boss | 0.56 | 0.314 | 0.515 | 0.506 | 0.523 | 0.513 | 0.566 | +0.053 | 74.1% | 0.15 | 100% | fail (need +0.003 over) |
| 28 | mini | 0.52 | 0.269 | 0.496 | 0.482 | 0.510 | 0.513 | 0.555 | +0.042 | 74.0% | 0.15 | 100% | fail (CI) |
| 30 | boss | 0.56 | 0.321 | 0.457 | 0.452 | 0.463 | 0.492 | 0.584 | +0.092 | 74.0% | 0.15 | 100% | fail |
| 38 | mini | 0.52 | 0.335 | 0.518 | 0.501 | 0.536 | 0.536 | 0.553 | +0.016 | 68.3% | - | 100% | PASS |
| 40 | boss | 0.56 | 0.203 | 0.373 | 0.362 | 0.383 | 0.598 | 0.618 | +0.019 | 75.0% | 0.2 | 100% | fail |
| 48 | mini | 0.52 | 0.326 | 0.474 | 0.448 | 0.501 | 0.501 | 0.532 | +0.031 | 74.0% | 0.15 | 100% | fail |
| 50 | boss | 0.56 | 0.368 | 0.520 | 0.509 | 0.531 | 0.909 | 1.001 | +0.092 | 74.0% | 0.2 | 50% | fail (baseline win rate was already 37%) |
| 58 | mini | 0.52 | 0.296 | 0.529 | 0.512 | 0.545 | 0.574 | 0.593 | +0.019 | 73.1% | - | 100% | PASS |
| 60 | boss | 0.56 | 0.346 | 0.562 | 0.544 | 0.581 | 0.590 | 0.637 | +0.047 | 73.1% | - | 100% | PASS |
| 68 | mini | 0.52 | 0.239 | 0.400 | 0.392 | 0.408 | 0.575 | 0.597 | +0.023 | 75.0% | 0.2 | 100% | fail |
| 70 | boss | 0.56 | 0.361 | 0.557 | 0.534 | 0.581 | 0.543 | 0.528 | -0.015 | 66.6% | - | 100% | PASS |
| 78 | mini | 0.52 | 0.211 | 0.320 | 0.298 | 0.343 | 0.624 | 0.650 | +0.026 | 74.9% | 0.2 | 100% | fail |
| 80 | boss | 0.60 | 0.260 | 0.440 | 0.391 | 0.488 | 0.742 | 0.694 | -0.048 | 75.0% | 0.2 | 100% | fail |

Mean boss time share over the 16 levels: 0.31 before, 0.49 with the overlay (chapter bosses 0.37 to 0.58, minis 0.32 to 0.53). The boss HP share is at or under 75% on all 16 (the five at 75.0% to 74.9% are cap-lever levels, allowed).

Per-level overlay in the file (boss HP multiplier, minion pool multiplier, cap; `pick` = which fit state was kept, see below): L8 x1.2235 / x0.611 / -; L10 x1.5465 / x0.5434 / 0.15; L18 x1.5169 / x0.533 / 0.2; L20 x1.5641 / x0.5495 / 0.15; L28 x1.6247 / x0.5708 / 0.15; L30 x2.649 / x0.9307 / 0.15; L38 x1.4677 / x0.6823 / -; L40 x1.65 / x0.55 / 0.2; L48 x1.9807 / x0.6959 / 0.15; L50 x1.8547 / x0.6517 / 0.2; L58 x1.3189 / x0.4849 / -; L60 x1.523 / x0.5611 / -; L68 x1.89 / x0.63 / 0.2; L70 x1.2252 / x0.615 / -; L78 x1.82 / x0.61 / 0.2; L80 x1.62 / x0.54 / 0.2.

### How the fit went (honest history)

The first-order numbers of the spec (pass 0) were measured first, then three correction passes (the doc's maximum), each pass = a full n = 30 measurement of the 16 levels. Mean boss time share per measured overlay state:

| L | base | state 0 (spec first order) | state 1 | state 2 | state 3 |
|---|---|---|---|---|---|
| 8 | .342 | .480 | .559 | .508 | .473 |
| 10 | .414 | .434 | .592 | .575 | .501 |
| 18 | .358 | .483 | .511 | .511 | .524 |
| 20 | .314 | .502 | .486 | .497 | .515 |
| 28 | .269 | .509 | .485 | .488 | .496 |
| 30 | .321 | .398 | .450 | .457 | .429 |
| 38 | .335 | .529 | .512 | .518 | .536 |
| 40 | .203 | .373 | .366 | .330 | .280 |
| 48 | .326 | .420 | .474 | .473 | .474 |
| 50 | .368 | .490 | .520 | no win | .485 |
| 58 | .296 | .539 | .529 | .551 | .493 |
| 60 | .346 | .534 | .562 | .579 | .505 |
| 68 | .239 | .400 | .391 | .391 | .386 |
| 70 | .361 | .542 | .563 | .568 | .557 |
| 78 | .211 | .320 | .313 | .337 | .323 |
| 80 | .260 | .440 | .407 | .326 | no win |

Levels passing the full criteria per state: 1, 4, 4, 3 of 16. The last pass was not better than the second, because the response to the HP multipliers is noisy and nonlinear (next section). The tool therefore ends with `--finalize`: it records the pass-3 measurement and keeps, per level, the measured state whose recorded stage times score best (time share closest to target, effort within 8% of the baseline); the picks are in the overlay (`pick`), are a pure function of the recorded times, and the 11 levels whose pick was not state 3 were re-measured (the table above). Changes against the doc's section 5: (1) the iteration solves boss and minion stages for `tau x E` and `(1 - tau) x E` with `E` = the baseline clear time (effort neutral), using a power law `T = c x multiplier^e` per stage instead of `tau_target / tau_measured` on the boss alone (a secant on `T = a + b x multiplier` was tried first and blew up on L10: x30); (2) the last pass aims 0.01 above the target and refuses noisy slopes; (3) the cap lever starts on the four spec levels (0.20) and steps to 0.15 where the boss HP share would pass 75%.

### Cap versus board growth (the diagnostic the doc promised)

`tools/effort-diag.ts` plays the thinker against the boss stage with the boss HP multiplied and the cap set, minions unchanged (n = 8, winning runs, boss time = last stage). "cut" = share of the thinker's hits whose raw damage was above the cap.

| L | boss HP x | cap | boss time s | hits | cut | mean raw hit | mean cap | wins |
|---|---|---|---|---|---|---|---|---|
| 10 | 1 | 0.35 | 23.5 | 7.8 | 0% | 255 | 788 | 8/8 |
| 10 | 2 | 0.35 | 34.1 | 11.5 | 0% | 349 | 1575 | 8/8 |
| 10 | 3 | 0.35 | 35.4 | 12.0 | 0% | 493 | 2363 | 8/8 |
| 10 | 4 / 6 | any | - | - | - | - | - | 0/8 (the 95 s clock) |
| 10 | 1 | 0.15 | 23.7 | 7.9 | 11% | 256 | 338 | 8/8 |
| 10 | 3 | 0.15 | 35.4 | 12.0 | 5% | 495 | 1013 | 8/8 |
| 30 | 1 | 0.35 | 28.6 | 10.0 | 0% | 2203 | 8733 | 8/8 |
| 30 | 2 | 0.35 | 28.2 | 9.6 | 0% | 4473 | 17465 | 8/8 |
| 30 | 4 | 0.35 | 64.8 | 21.9 | 0% | 4011 | 34930 | 8/8 |
| 30 | 2 | 0.15 | 30.0 | 10.3 | 14% | 4666 | 7485 | 8/8 |
| 40 | 1 | 0.35 | 21.3 | 7.3 | 0% | 3165 | 8103 | 8/8 |
| 40 | 1 | 0.20 | 23.0 | 7.9 | 21% | 3014 | 4630 | 8/8 |
| 40 | 1 | 0.15 | 25.8 | 8.6 | 45% | 2941 | 3473 | 8/8 |
| 40 | 2 | 0.35 | 42.7 | 14.3 | 0% | 2707 | 16205 | 8/8 |
| 40 | 6 | 0.35 | 71.7 | 23.5 | 0% | 5233 | 48615 | 2/8 |

Reading: (1) **the cap is almost never the limit.** At the shipped 0.35 no hit is cut on any of these rows; a 0.20 cap cuts 0% to 11% of hits (21% on L40 at x1), 0.15 cuts 4% to 14% (45% on L40 at x1). So the cap is a weak lever and only on L40 does it bite at all. (2) **Board growth is the cause.** Boss time rises far slower than boss HP: L10 x1 to x3 HP gives +51% time (23.5 to 35.4 s) because the mean raw hit grows from 255 to 493 while the fight lasts (the board gets taller the longer you merge); L30 x1 to x2 is flat (28.6 to 28.2 s) with the raw hit doubling (2203 to 4473). The per-stage elasticity of time to HP is about 0.15 to 0.6, which is why the first-order `tau / t_b` multipliers (constant rate assumption, section 2.1) land short and the fit loop needs the power law. (3) **Consequence for D2.** Reaching 0.52 to 0.60 with HP alone means boss HP x2.6 to x6 on L30, L40, L68, L78, L80; at the 75% HP-share ceiling the minions then cannot shrink (they must stay at least a third of the boss HP), the total effort rises (need +0.09 to +0.67 in intermediate states), and wins fall under the clock (L40 x6: 2 of 8 wins; L78 and L80 collapsed to 3% and 0% wins in the pass-3 state). L30, L40, L68, L78 and L80 are the levers' hard limit; L28 and L48 miss the interval floor by 0.018 and 0.052 at mean 0.496 and 0.474; L50 starts from a 37% baseline win rate.

What would close them (owner decision, not built): (a) a lower boss-stage cap step (0.10) on L40, L68, L78, L80: it is the only lever whose effect grows as the boss grows; (b) allow 85% boss HP share on those levels; (c) accept the S2 powers as part of the missing time (a power adds boss time, and S1 is pre-power by definition); (d) a longer clock on those levels in S4 (L78 and L80 lost their wins under the 165 s clock in the pass-3 state).

### The measured unit column (tools/unit-cost.ts)

`npx vite-node tools/unit-cost.ts --all --n 8 --window 40` (run as 5 chunks; the doc's `--n 12` was reduced to keep each chunk inside the tool time limit). Same swap rule as squad-swap: base squad cannon + coil + bell, unit level 1, all roster batches on, levels 25 / 45 / 65, paired seeds (supply seed and bot seed vary per run), dps over the first 40 s of play. Ratio = unit dps / base dps (1.00 = the base squad); 95% interval of the paired ratios over 24 runs. `CI (E)` is the estimate from section 1.5.

| unit | kind | CI (E) | measured ratio | 95% interval | by level 25 / 45 / 65 |
|---|---|---|---|---|---|
| cannon | shooter | 1.00 | 1.00 | reference | - |
| rocket | shooter | 1.30 | 1.05 | 0.95 to 1.15 | 1.15 / 0.99 / 1.01 |
| mortar | shooter | 1.54 | 0.86 | 0.76 to 0.95 | 0.90 / 0.82 / 0.85 |
| arc_welder | shooter | 1.50 | 0.75 | 0.64 to 0.86 | 0.87 / 0.67 / 0.71 |
| nail_gun | shooter | 1.35 | 1.30 | 1.01 to 1.58 | 1.28 / 1.21 / 1.40 |
| jackhammer | shooter | 1.20 | 0.98 | 0.89 to 1.08 | 1.03 / 0.97 / 0.95 |
| saw_blade | shooter | 1.18 | 1.70 | 1.35 to 2.04 | 1.64 / 1.66 / 1.79 |
| piston | shooter | 1.20 | 1.05 | 0.97 to 1.13 | 1.15 / 1.02 / 0.97 |
| blowtorch | shooter | 1.20 | 0.99 | 0.94 to 1.05 | 1.00 / 1.02 / 0.96 |
| tesla_tower | shooter | 1.77 | 1.29 | 1.14 to 1.43 | 1.42 / 1.25 / 1.19 |
| wrecking_ball | shooter | 2.16 | 1.24 | 1.07 to 1.42 | 1.37 / 1.22 / 1.13 |
| robot_arm | shooter | 1.56 | 0.96 | 0.86 to 1.06 | 1.03 / 0.90 / 0.95 |
| rivet_gun | shooter | 1.25 | 0.99 | 0.90 to 1.09 | 1.03 / 0.99 / 0.96 |
| hydraulic_press | shooter | 1.32 | 0.73 | 0.66 to 0.80 | 0.74 / 0.68 / 0.76 |
| lathe | shooter | 0.90 | 1.96 | 1.59 to 2.34 | 1.96 / 1.86 / 2.07 |
| coil, bell | relay | 2.10, 1.55 | 1.00 | reference (the base relays) | - |
| horn | relay | 1.77 | 1.60 | 1.24 to 1.96 | 1.70 / 1.49 / 1.60 |
| fuse_box | relay | 1.15 | 1.11 | 0.87 to 1.35 | 1.22 / 1.23 / 0.87 |
| gear | relay | 1.30 | 0.87 | 0.70 to 1.04 | 0.79 / 0.95 / 0.87 |
| spring | relay | 0.77 | 1.24 | 1.06 to 1.42 | 1.21 / 1.22 / 1.28 |
| belt_drive | relay | 0.77 | 1.31 | 1.07 to 1.55 | 1.03 / 1.44 / 1.46 |
| pipe | relay | 1.08 | 1.08 | 0.88 to 1.28 | 1.38 / 1.00 / 0.87 |
| capacitor | relay | 1.07 | 1.72 | 1.55 to 1.88 | 1.95 / 1.62 / 1.58 |
| ladder | relay | 1.18 | 1.03 | 0.92 to 1.15 | 0.98 / 1.04 / 1.09 |
| crane | relay | 1.11 | 1.15 | 1.01 to 1.28 | 1.38 / 1.07 / 1.00 |
| dynamo | relay | 1.55 | 1.09 | 0.88 to 1.29 | 1.20 / 1.20 / 0.87 |
| vice | relay | 1.35 | 1.21 | 0.98 to 1.45 | 1.62 / 1.04 / 0.99 |
| router | relay | 1.55 | 2.70 | 2.11 to 3.28 | 2.10 / 2.46 / 3.52 |
| fan | helper | +0% | 1.06 | 0.94 to 1.18 | 1.04 / 1.11 / 1.03 |
| magnet | helper | +4% | 1.19 | 1.05 to 1.32 | 1.11 / 1.14 / 1.31 |
| battery | helper | +6% | 1.13 | 0.99 to 1.28 | 1.04 / 1.12 / 1.25 |
| amplifier | helper | +5% | 1.13 | 0.99 to 1.26 | 1.01 / 1.12 / 1.25 |
| signal_beacon | helper | +4% | 1.16 | 1.01 to 1.31 | 1.04 / 1.12 / 1.33 |
| wrench | helper | +10% | 1.22 | 1.09 to 1.35 | 1.13 / 1.13 / 1.39 |
| blueprint | helper | +5% | 1.31 | 1.04 to 1.58 | 1.42 / 1.15 / 1.36 |
| blast_plate, rewind_crank, tilt_lever | card | 0% / +3% / +12% | 1.13 / 1.12 / 1.12 | 1.00 to 1.25 | identical 1.07 / 1.00 / 1.31 |

Caveats, read before using the column: (1) the base squad is the reference, so a relay's ratio is "this relay in the bell's place" and cannot be read as its absolute value; (2) the three cards show identical numbers per level, so the card was never exercised (its charge, 10 to 16 fired machines, is not reached in 40 s by the bot, or autoSupport does not tap it): the 1.12 to 1.13 is the effect of the extra toy on the supply, not the card, and every helper row contains that same supply effect (about +5% to +10%, fan's +6% is the pure supply effect); treat those four cards as not measured; (3) the measurement is one 40 s window, so units that pay late (tesla charge, ladders, positionals that need a tall board) are under-measured; (4) several estimates in 1.5 are far off: saw_blade, lathe and router measure 1.5x to 3x the estimate, mortar, arc_welder, hydraulic_press and spring-style hops measure below it, which is what the column is for; (5) the two power tools (Row Surge, Gear Bomb) need `TUNING.tools` and a sandwich rule and are not in this run.

### What S1 shipped

`TUNING.effortModel` + `effortModelOpts` (tau targets, cap steps), `src/content/effort.ts` + `effortOverlay.json`, `hitCap(s)` in `src/core/game.ts` (used by `applyDamage`, the carry hit, `hitFormula`, and the bots' `capOf`), `tools/effort-fit.ts` (`--write`, `--check`, `--iterate`, `--finalize`, `--rebuild`, `--report`), `tools/effort-diag.ts`, `tools/unit-cost.ts`, `--effort` / `--levels` / `--smart-only` in `tools/effort-audit.ts`, `--effort` (always dry) in `tools/sim-levels.ts`, QA row EFFORT MODEL (`tests/qaPanel.test.ts` row list), `tests/effortModel.test.ts` (overlay application, flag OFF identity with an absurd overlay, cap lever, boss share ON vs OFF on L10 / L18 / L38 at n = 4, fit determinism and replay, tampered overlay fails, `timesOf`), flags-off registry entry and golden digest.

---

## 8. Limits and unresolved risks

- Unit tables 1.5 contain E estimates (job factors, reach, uplifts); S1 replaces them. The CEILING and GIFT squads of the audit are noisy (n = 8 search), so the supply multipliers in 1.4 are direction, not precision.
- The first-order boss HP multipliers assume constant rates; larger machines and growing boards break that, hence the iteration and the cap lever. The values 2.8x on L40 and 2.5x on L78 are expected to move.
- All impact numbers come from bots that do not read warnings. The reader bot is new work (S2); until it exists "counterable" is a design claim, not a measurement.
- Telegraph visibility is a design standard here; the visual quality (sprites, stings) depends on the art program and is not part of these slices beyond placeholders.
- Goal levels have no HP lever: their effort is time. The refit changes their goal size or clock, which the overlay table covers in S4, not S1.
- Kits assume the opening-variety numbers (layouts B and C at 0.75) hold across ranks; the mix factors (1.02 to 1.06) are computed convexity only, chain effects are unmeasured. Gifts apply to the default squad only (4.1).
- Review round 2 (task t-5d8169f2) fixed B1 to B4 and the goal-level formula. Still open, by design: (a) `docs/EFFORT_AUDIT.md`, `tools/effort-audit.ts` and the `--effort` flag live on branch `orch/t-bd0d6010-effort-audit-of-all-80-levels-bo`, not on this branch: merge that branch first, or the commands and links here dangle; (b) the double-run determinism check (`tools/effort-audit.ts` twice on 5 levels at small n, compare the JSON) was not run and is a separate task after the merge; (c) the telegraph rule "at least 4 layers exposed by the scene" needs an event or API in GameScene that does not exist, only the 600 ms floor is checkable from core events, and the reader bot and "counterable" stay unmeasured until S2; (d) spec `cast_every_s_max` 13 and `first_cast_s` 6 on L10 differ from the shipped calm pace (8 s first, 16 s every), so a pace change is implied (2.2); (e) the no-adjacent-gift rule is not met at L16 and L17 (both GH) because levels with a fixed `start_extra` are excepted, which the spec generator statistics do not break out; (f) raising boss HP raises the 0.35 per-hit cap with it, so the cap versus board growth diagnostic in S1 comes before any 1.4x to 2.8x number is promised to the owner.
- Mania and Rush effort targets are placeholders: no saga level uses them today.
