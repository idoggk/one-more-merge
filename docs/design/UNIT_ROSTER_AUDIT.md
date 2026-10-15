# Unit roster audit and simplification proposal

Task t-563ebd9e (mission m-f005ee7b). Docs only: nothing in `src/`, `levels.json` or `puzzles.json` changed. Nothing here is built; every rule change below needs an owner decision first, then goes behind a default-off flag and is measured by the sim tools (owner answer Q#84).

Owner words: "the units are hard to distinguish between, I can't understand the differences and the rules of many are too hard to handle."

## Plain summary

1. There are **39 unit families** (13 original + 26 "roster B") plus 2 power-up tools. Two thirds have a **conditional rule** (edge only, 3rd in chain, 4 full sides, needs a twin, needs 2 Gears...).
2. A player must hold **about 12 different "who wakes whom" patterns** in their head (touching 4, 2 cells out, row, column, diagonal, L, jump, hop, same-kind, staircase...) and 6 on-board hit conditions.
3. At phone size **the art does not separate them**: at rank 3+ almost every unit is the same blue / gold / red brass machine, and rank 7-8 are all crowned gold. Of 126 adjacent-rank pairs checked, **83 fail** the project's own "differs in 2 of 4 channels" test.
4. Helpers (Fan, Magnet, Battery, Amplifier, Beacon) are rare in supply and barely rank up (battery tops out near rank 3, fan/magnet near rank 4 per `RANK_DIFFICULTY.md`): effectively **dead**. Coil is the **dominant** relay (reaches farthest, from level 1). Mortar is **weak** (needs 6-link chains).
5. **Proposal: 9 core families**, each with one rule, one colour, one silhouette, one job word: Cannon, Rocket, Arc, Coil, Bell, Fuse Box (board) and Battery, Fan, Magnet (cards). 4 legendary one-offs for boss rewards. 26 units cut or folded in.
6. Rank = size + pips + glow, identical in every family; family colour never changes with rank.
7. Intro pace: one new family every 4 levels (L1 Cannon, L3 Coil, L7 Bell, L11 Rocket...) with a popup and a forced demo; no new unit while a new boss mechanic is introduced.
8. Cost: roughly 2-3 weeks of work for the rules/levels/tests, plus 1 art pass of 9 families x 8 ranks (72 images, 17 current paintings are reusable). Biggest cost is level data and collection/crate economy, not code.
9. Three owner questions at the end: what happens to the collection (cut units as skins?), is Coil nerfed or the others buffed, and do cards stay off-board.
10. This audit uses the code as it is today with all roster flags on; "dead/dominant/weak" come from the repo docs (limits listed at the end).

## 1. Inventory

Sources: `src/content/units.ts`, `unitJobs.ts`, `perks.ts`, `roster1..7.ts`, `src/core/cascade.ts`, `support.ts`, `types.ts`, `sceneCopy.ts` (guide unlock levels), `unlockPlan.ts`, `docs/ROSTER.md`, `docs/design/RANK_DIFFICULTY.md`.
Role: D = damage, R = relay (wakes others), S = support card (off board, tap to fire), H = helper (on board, no hit), U = utility.
**Rules** = distinct conditions or exceptions in the rule text and code branch (my count from the card text and the `cascade.ts` / `support.ts` branch; +-1). **First** = first level the player can meet it: guide `unlock` for the first 8, the gift level in `unlockPlan.ts` for gifts, otherwise "crate" (no fixed level; crates open at L10 / L20 / L30 / L50). **Ranks** = progression: shooters/relays rank 1-8 (cap 6 below L21, 8 from L21), helpers/cards 1-6. Rarity in brackets.

### 1.1 Original 13

| Id | Name | Role | Rule in one sentence | Rules | Interacts with | Player must remember | First | Notes |
|---|---|---|---|---|---|---|---|---|
| cannon | Cannon (C) | D | Shoots a weak shot by itself; woken by a chain it fires a full shot. | 2 | Everything wakes it; batteries prime it | Keep a few on the board | L1 | Rank 7-8 is the only rank-8 most players ever see |
| coil | Coil (C) | R | Hits and wakes OTHER kinds 2 cells up/down and 1 left/right. | 3 (other kinds only, shape, reach) | Wakes shooters | "Other kinds only" | L1 | **Dominant**: best reach, earliest, supplied most (BOSS_HARMS_UNITS: "Coil dominates most levels") |
| bell | Bell (C) | R | Hits and wakes every other machine in its row. | 2 | Wakes shooters, coils | Row, not column | L1 | |
| horn | Horn (C) | R | Same as Bell but its column. | 2 | same | Column | crate | Mirror of Bell: easily confused |
| fuse_box | Fuse Box (R) | R | Hits and wakes other kinds on its 4 diagonals, 2 cells out. | 3 | same | Diagonal | crate | |
| fan | Fan (C) | H/S | Pushes one part (board) or clears hazards in a 3x3 (card). | 3 | Boss attacks, junk, frost | Changes by flag: board mover or card | L23 guide; starter | **Dead-ish**: rank 4 only in chapter 7 |
| magnet | Magnet (R) | H/S | Pulls a part in (board) or brings a twin next to a part (card). | 3 | Merge pairs | same | L12 | Rank 4 only from L67 |
| battery | Battery (R) | H/S | Next shooter chain hits x1.5 (board) or x2 (card). | 3 | Shooters | Tap, then merge | L17 | Rank 3 max near L32 |
| rocket | Rocket (R) | D | Never shoots alone; woken by a chain it fires a big shot (x1.3 Cannon). Merging it yourself bursts (card flag). | 2-3 | Chains | Put it inside chains | L6 | Stuck at rank 4 in sims (supply) |
| mortar | Mortar (R) | D | Hits harder the later it fires in a chain: x0.9 first link up to x1.65-x2 six links in. | 3 (depth, cap, order) | Long chains | Put it at the end | crate | **Weak**: needs a 6-link chain; below Cannon at short chains |
| arc_welder | Arc Welder (E) | D | Woken, fires x0.75 and jumps to the nearest other shooter, waking it. | 4 (never another welder, nearest, fallback to machine, x0.75) | Shooters | Mix shooter kinds | crate | |
| amplifier | Amplifier (R) | H/S | Marks a shooter: its next hit x1.3-1.6. | 3 | Shooters | The mark stays until used | crate | Same job as Battery |
| signal_beacon | Signal Beacon (E/L) | H/S | Marks nearest shooter + relay (board) or fires a whole row/column (card). | 4 | Anything on the line | Row vs column choice | gift L50 | Two different jobs by flag |

### 1.2 Roster B (26) from the code

| Id | Name | Role | Rule in one sentence | Rules | Must remember | First |
|---|---|---|---|---|---|---|
| nail_gun | Nail Gun (C) | D | +20% for every other machine in its row (max x1.8) and strips armor pips. | 3 | Row count | gift L10 |
| jackhammer | Jackhammer (R) | D | Its hits ignore shields. | 1 (but nothing visible: shields are a timed multiplier) | Only matters on shield levels | gift L20 |
| gear | Gear (R) | R | Chain jumps to the farthest other Gear; a lone Gear wakes 2 cells away in its row. | 3 | Needs two | gift L25 |
| saw_blade | Saw Blade (E) | D | x1.5 on the outer ring, x0.7 inside. | 2 | Edge only | gift L30 |
| wrench | Wrench (C) | S (passive) | After a rank 3+ merge your next merge counts +1 rank for its perks. Never on the board. | 3 | Invisible, no tap | gift L13 |
| piston | Piston (C) | D | +25% per EMPTY touching cell (max x2); board edge does not count. | 3 | Keep space around it | crate |
| spring | Spring (C) | R | Skips exactly the next part in line, wakes the one after (within 3). | 3 | Hop over one | crate |
| belt_drive | Belt Drive (E) | R | Chain enters one side, exits at the FAR end of the line. | 3 | Far end | crate |
| blowtorch | Blowtorch (R) | D | x1.5 per hazard in its column burned (max x2.25). | 3 | Hazards | gift L35 |
| pipe | Pipe (R) | R | Wakes touching parts then every same-kind part joined to them (max 4). | 4 | Same-kind groups | crate |
| blast_plate | Blast Plate (R) | S | Tap a cell: the next boss attack on it is blocked. | 3 | Only boss levels | gift L40 |
| tesla_tower | Tesla Tower (L) | D | Each relay within 3 cells in the chain charges it +12% (max 6). | 4 | Relays near it | crate (crates B) |
| capacitor | Capacitor (E) | R | Does not pass the chain on: banks it and releases it at the start of your NEXT merge to 1 touching part. | 4 | Delayed effect | crate |
| blueprint | Blueprint (E) | S | Shows next 3 deliveries; tap a part and the next different delivery becomes a copy at number 1. | 4 | Needs reading the queue | crate |
| ladder | Ladder (E) | R | Wakes the touching part exactly 1 number higher, then 1 higher again... | 4 | Needs consecutive numbers | crate |
| rewind_crank | Rewind Crank (E) | S | Every 10 merges, tap to undo your last merge (everything goes back). | 3 | Off in puzzles/bounties | crate |
| crane | Crane (L) | R | Lifts a touching part onto its twin mid-chain, once per level. | 4 | Needs twins | crate (crates B) |
| dynamo | Dynamo (L) | R | In a full 2x2 block wakes the 12-cell ring around it; alone only the 4 touching. | 3 | Needs a 2x2 block | crate (crates B) |
| wrecking_ball | Wrecking Ball (E) | D | Hits x0.6 next to the waker, +0.3 per extra step, max x2. | 3 | Distance from the waker | crate |
| robot_arm | Robot Arm (L) | D | Does the job of the last relay that woke it (never a legendary's). | 4 | Memory of the last relay | crate (crates B) |
| tilt_lever | Tilt Lever (L) | S | Every 15 merges, tap an edge: everything slides, twins merge (max 3), each fires its own chain. | 5 | Order of merges | crate (crates B) |
| rivet_gun | Rivet Gun (C) | D | x2 if it is the 3rd part to fire in the chain (x1 when you merge it). | 2 | Count the order | crate |
| vice | Vice (C) | R | On an edge: wakes 3 cells inward and shooters hit x1.4; off the edge only the 4 touching. | 3 | Edge only | crate |
| router | Router (R) | R | Wakes an L: 2 straight, then 2 turning clockwise; picks the L with most parts, up to 2 Ls. | 4 | Which L | crate |
| hydraulic_press | Hydraulic Press (E) | D | x3 if all 4 touching cells hold parts, else x0.7 (never on an edge). | 3 | Full sides | crate |
| lathe | Lathe (E) | D | On an edge hits x0.7 + 0.25 per step to the opposite edge (max x2); off the edge x0.5. | 4 | Edge only, distance | crate |

Plus power-up tools `row_surge`, `gear_bomb` (made by big merges, tapped once; `TUNING.tools`) and per-level items (overcharge L13, spark L26, corner L22). These are not families.

### 1.3 Totals the player faces

- 39 families: 15 shooters, 14 relays, 10 support/card/helper (5 of them can be on board or card depending on `TUNING.rosterB`).
- Every unit also has 3 level perks (L3/L6/L9) that **change the job**: 39 x 3 = 117 more rules (`units.ts` `ROSTER_PERKS`, `UNIT_PERKS_TODAY`, `roster1..7.ts`) and a second set when the roster flag flips, so the same unit has two sets of rules.
- Rule load per player-visible unit: median 3 conditions, up to 5 (Tilt Lever). About 25 of the 39 units are **conditional** (value depends on place, order, count or neighbours; my reading of the cards, not a code count).
- The 14 relays use about ten different wake shapes (touching, cross-2, row, column, diagonal, L, far end, jump, hop, same-kind, staircase): for the player that is "it lights up some neighbours", ten times over.

## 2. Dead, dominant, weak

| Verdict | Units | Evidence |
|---|---|---|
| Dominant | **Coil** | `BOSS_HARMS_UNITS.md`: "Coil dominates most levels today"; present from L1, widest reach, supplied most. Rank 8 = cannon-only, then coil (`RANK_DIFFICULTY.md` table 3) |
| Dead | **Fan, Magnet, Battery** (helpers), by extension Amplifier, Beacon | `RANK_DIFFICULTY.md`: scarce supply, rank 4 only in chapter 7 (fan L65, magnet L67), battery never above rank 3; their art ranks 5-8 are never seen. Helpers deal no damage and often arrive after the chain is over |
| Weak | **Mortar** (also Rivet Gun, Arc Welder, Hydraulic Press per `ROSTER.md` sims) | Mortar hits x0.9 first link and only reaches x1.65 six links deep; a typical chain is 2-4 links. `ROSTER.md` lists Rivet Gun as the weakest shooter and Press as weak-to-even |
| Never needed | Jackhammer, Wrench, Blueprint | Jackhammer matters only on shield levels; Wrench is passive and invisible |

Limit: the "dominant / weak" labels are from the repo docs and the brief; I did not rerun sims. I could not find the project memory notes mentioned in the brief, so nothing here is taken from them.

## 3. Distinguishability at phone size

Method: looked at the review page sheet `art-candidates/owner-review-v9/img/units-78_0.webp` (rank 7-8 of the roster B units), `art-candidates/rank-clarity/strips/ALL_70.png`, `art-candidates/rank-clarity/scores.md` (126 adjacent-rank pairs, 83 fail), `docs/art/AUDIT.md`. On a ~118 px cell on a 6.7" phone, one rank-1 sprite is about 60 px tall in the tray (the NEXT strip is drawn at 62 px).

Findings:

1. **Rank changes the colour, not just the size.** The strip of cannon rank 1-8 starts red and ends blue, gold and crowned: by rank 4 a Cannon looks like the blue-gold Vice. Colour is the strongest cue at 70 px and it is not stable per family.
2. **Every roster B unit is a brass machine with blue and red parts.** Of the units in the v9 sheet only a few have a unique silhouette: Crane (tall tower), Robot Arm (a swan-neck arm), Tesla Tower / Wrecking Ball (spherical), the Press (black trapezoid), Rocket (a diagonal tube). The rest are a rectangle of brass with pipes.
3. **22 of 39 units are code-drawn** (`AUDIT.md`: roster 2-7 are placeholders, 3-4 flat colours, rank grows only a count or dimension).
4. **Parts per family:** a clear read needs 1-2 big shapes; Dynamo, Router, Gear, Pipe, Capacitor all have 4-8 ports/knobs.

Pairs a player will confuse (my judgement, to be confirmed on device):

| Pair | Why |
|---|---|
| Bell vs Horn | Same job rotated 90 degrees, both gold brass; the only difference is which line lights up |
| Coil vs Capacitor vs Dynamo | Stacked coils/cylinders with blue tips |
| Vice vs Lathe vs Press vs Piston | Boxy brass frames with a screw/handle; all "edge or neighbour condition" shooters |
| Gear vs Pipe vs Router vs Belt Drive | Round brass bodies with ports |
| Nail Gun vs Rivet Gun vs Cannon | Barrels on a base; 3 different shooters with different rules |
| Fuse Box vs Blast Plate vs Wrench | Orange/grey boxes |
| Amplifier vs Battery vs Signal Beacon | Three "mark / boost next shooter" jobs in green/teal/red cylinders |
| Any two at rank 7-8 | All crowned, gold, red/blue (36 worst adjacent-rank pairs plus the units sheet) |
| Rank n vs rank n+1 of the same unit | 83 of 126 pairs below the 2-of-4 threshold |

## 4. Proposed roster (9 core families)

Principle: **one rule per unit, no "only if" conditions, one colour, one silhouette.** Name = job. Relays differ only by WHERE they wake; shooters differ only by HOW the hit is made; cards differ by the thing they change.

| # | Family (new name) | Today | Colour | Silhouette | Rule (player-facing, one line) |
|---|---|---|---|---|---|
| 1 | **Gun** (Cannon) | Cannon | red | barrel on a block, 1 barrel | "Shoots alone. Hits for full damage when a chain wakes it." |
| 2 | **Rocket** | Rocket | orange | diagonal tube, fins | "Only fires in chains, hits 1.5x." |
| 3 | **Arc** (Arc Welder) | Arc Welder | blue | two prongs | "Fires, then jumps to another shooter." |
| 4 | **Cross** (Coil) | Coil | cyan | plus-sign coil | "Wakes the 4 parts touching it and 2 more up/down." |
| 5 | **Row** (Bell) | Bell | yellow | bell / dome | "Wakes everything in its row." |
| 6 | **Diagonal** (Fuse Box) | Fuse Box | pink | X-box | "Wakes the 4 diagonal corners." |
| 7 | **Boost** (Battery) | Battery | green | cell with plus | CARD: "Tap it: your next chain hits double." |
| 8 | **Fan** | Fan | pale blue | 3 blades | CARD: "Tap a spot: clears junk, ice and boss attacks around it." |
| 9 | **Pair** (Magnet) | Magnet | purple | U magnet | CARD: "Tap a part: a twin appears next to it." |

Legendary one-offs (boss rewards, max 1 on the board or 1 card, each keeps its rule and sits outside the 9 families): **Rewind Crank** (UNDO, the simplest strong card), **Gear** (link two Gears), **Tesla Tower** (storm bolt from nearby relays), **Blast Plate** (boss block). 4 total.
### Before and after

| Today (39) | After | What happens |
|---|---|---|
| cannon, nail_gun, piston, rivet_gun | **Gun** | Nail Gun / Rivet Gun / Piston cut as rules; may live on as skins/rarities (Q1) |
| rocket, mortar, hydraulic_press, jackhammer | **Rocket** | Mortar and Press cut (weak); Jackhammer cut (invisible rule) |
| arc_welder, saw_blade, lathe, blowtorch, wrecking_ball, robot_arm | **Arc** keeps; Saw Blade, Lathe, Blowtorch, Wrecking Ball, Robot Arm cut | All "position/hazard/memory" shooters go |
| tesla_tower | Legendary | keep, simplified |
| coil, spring, vice, capacitor, ladder, router | **Cross** (Coil) | Coil keeps, reach trimmed (Q2); other relays cut |
| bell, horn, belt_drive, pipe | **Row** (Bell) | Horn folded: Bell rings its row, and from L6 its column (a perk, not a unit) |
| fuse_box | **Diagonal** | keep |
| dynamo, crane, gear | Gear legendary; Crane and Dynamo cut | |
| battery, amplifier, signal_beacon | **Boost** (card) | Amplifier and Beacon folded into one "next hit bigger" card |
| fan, blast_plate | **Fan** (card) | Blast Plate's block merged into the Fan clear; Blast Plate legendary variant for bosses |
| magnet, blueprint | **Pair** (card) | Blueprint cut |
| rewind_crank | Legendary | keep |
| tilt_lever, wrench | cut | Wrench invisible; Tilt Lever has 5 rules |

Result: 39 -> 9 core + 4 legendary = 13 families; 26 of today's families are cut or folded in.

### Elite and boss-only

- Boss-only/elite drops (one per chapter boss, chapters 3-8): Rewind Crank, Gear, Tesla Tower, Blast Plate. They are rewards, so a player learns the 9 first. At most one legendary on the board.
- Tools (Row Surge, Gear Bomb) stay as tapped board parts; they are not units.

### Rank progression stays readable (same in every family)

- Rank 1-2: base size, no pips.
- Rank 3-4: bigger (x1.08 per rank), 1-2 pips (small dots) on the base plate.
- Rank 5-6: another size step, a glow ring in the family colour.
- Rank 7-8: crown + aura in the **family** colour (never gold for all).
- The family hue is locked: red stays red from rank 1 to 8 (fixes the cannon-to-blue drift). The silhouette is constant across ranks; only size, pips and glow change. This is also how `RANK_CLARITY` asks for "2 of 4 channels" to differ between neighbouring ranks: size and pips/glow.
- Card families have ranks 1-6 only, shown as pips on the card.

### Introduction pace

One new family every 4 levels, each with a popup (picture, name, one line, a 5-second demo board), and no new family on a boss level:

| Level | New | Notes |
|---|---|---|
| 1 | Gun | |
| 3 | Cross | first relay |
| 7 | Row | |
| 11 | Rocket | |
| 15 | Boost card | first card |
| 19 | Diagonal | |
| 23 | Fan card | |
| 27 | Arc | |
| 31 | Pair card | |
| 40-80 | legendary rewards | one per chapter boss |

Today Rocket is L6, Magnet L12, Fan L23 (guide) and the rest only by crate with no popup; players meet mortar / horn / fuse box in crates with the guide row at `unlock: 999`, so most players never read them.

## 5. Migration cost estimate (per family)

S = under 1 day, M = 1-3 days, L = 3-5 days (one worker). Costs include flag + tests behind `TUNING`, flags-off golden unchanged.

| Family | Rules code (`cascade.ts`, `support.ts`) | Art | Level data | Tests | Notes |
|---|---|---|---|---|---|
| Gun (Cannon) | S (mostly existing) | S (new palette lock for ranks) | M (supply tuning for fewer kinds) | S | Fold 3 rules out |
| Rocket | S | S | S | S | Drop mortar path (Mortar tests, perk texts) |
| Arc | M (remove welder-skip rules, simplify) | M (repaint to blue) | S | M | 4 rules -> 2 |
| Cross (Coil) | S (reach trim) | S | M (rebalance: Coil dominates every level) | M (sim) | Most level data touched |
| Row (Bell) | S (Horn merged) | S | S | S | Remove Horn gallery |
| Diagonal | S | S | S | S | |
| Boost (Battery) | M (merge Amp/Beacon marks) | S | S | M | Remove 2 families + `amp` field paths |
| Fan | M (add Blast Plate block to clear) | S | S | M | |
| Pair (Magnet) | S | S | S | S | |
| Legendary x4 | M (keep as is, remove perks code) | S (repaint 4) | S | M | |
| **Cut 26 units** | L (delete 26 branches, `Roster1..7Family` types, saves repair) | S (stop shipping 22 code-drawn sprites) | L (crate tables, collection goals, unlock plan, saves holding cut units: need a mapping) | L (perks, golden, QA panel, replay compat) | The expensive part is saves and the collection economy |

Totals (one worker): rules code ~12 days, art ~8 days (72 sprites at 8 ranks, many repainted for rank hue lock; 10 of the 17 painted units reusable), level data ~8 days (replaying the sims for 80 levels, `levels.json` via tools), tests ~10 days. I give this an honest +-50%: the save/collection migration is the unknown. Nothing costs money.

## 6. Owner questions

1. **What happens to the cut units in a player's collection?** Option A: delete them and refund Bolts/cards. Option B (recommended): keep them as skins/rarities of the 9 families (same rule as the family, different art/stats), so the collection and crates stay worth opening.
2. **Coil is dominant: nerf Coil (2 cells -> 1 cell) or buff the others?** Recommended: trim Coil and make Row/Diagonal start earlier (L3-L19), measured by the sim tools.
3. **Do the three helpers stay off-board cards?** Recommended yes: board helpers deal no hit and sit in a cell the player needs; cards stay out of the way but need the "tap when full" rule explained once.

## 7. Limits

- Rule counts are by reading card text and code branches; not an exhaustive static count.
- Distinguishability is a judgement from sheets and score files, not a user test. A 5-unit "tell them apart in 2 seconds" test on the owner's iPhone 14 Pro Max would confirm it.
- No sims rerun; reach/difficulty numbers are those in `RANK_DIFFICULTY.md`.
- Cost estimates are rough and exclude the Unity port.
