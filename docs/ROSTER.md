# ROSTER — units, rarities, crates, unlocks (single source)

This file brings together the units design that was spread across task summaries:
- Direction B, 23 units (t-3d56deb5)
- 11 more units, batch order and unlock plan (t-e2128dd7)
- Lead decisions on the ChatGPT critique (t-b445b8a9)

Read this before you touch units, crates or unlocks. When a decision changes, update this file in the same commit.

### Review fixes (review t-60136108, fixed in t-07325155)

Blocking items:
1. **Spring vs Belt Drive twin.** Spring is now **HOP** (Lead call). The chain skips exactly the next part in line and wakes the one after it. Its L3/L6/L9 stay short-range. Belt Drive stays the only long **BRIDGE**.
2. **Jackhammer did Mortar's job.** Jackhammer is now **BYPASS** only: its shield-breaking L3 and B's "x2 vs armored" are gone, and its L3 got a different job upgrade. Nail Gun's label stays **ROW**; armor stripping is its secondary note. Q3 is closed.
3. **Saw Blade L6 broke the cap** (corners x2 = +100%). L6 is now "corners x1.25 more, total edge bonus capped at +72%". The cap rule (section 1) is now stated per unit, so each cap fits that unit's job.
4. **Capacitor L9 broke the anti-loop rule** ("stores two chains"). L9 is now "the release wakes 2 touching parts instead of 1". It still stores only one chain and releases it once.
5. **Nail Gun's per-cell bonus had no cap** (+80% on a 5-wide row, +180% with L9). It is now capped: **max x1.8**, and x2.2 at L9. Piston's L9 also has a stated cap now (x2.2).

Non-blocking notes from the same review, also fixed:
- Coil's label changed from REACH to **RANGE** (Signal Beacon keeps REACH). Its reach is stated as up to 8 cells (2 in each of 4 directions), not "about 6".
- Bell/Horn wording fits the 5-column x 6-row board: a row has 4 other cells and a column has 5.
- Robot Arm L3 "copies Support effects" didn't work with off-board Support cards. It has a new L3.
- Crane: the part made by its mid-chain merge counts as already fired in that cascade.
- Tesla Tower: +12% per charge, max 6 charges (+72%).
- Signal Beacon: the chosen shooter still fires at most once per cascade. Its L6 no longer adds damage (the trio table says REACH never changes damage).
- New "Overlap checks" list: Fan vs Blowtorch, and Magnet vs Crane vs Tilt Lever.

Status (2026-10-10): **design only.** The live game still has 13 units in 3 rarities with Wood / Iron / Gold crates (`src/content/units.ts`). B0 and B1 rules sit behind `TUNING.unitsB0` / `TUNING.unitsB1` (default OFF). The toolbox crate art sits behind the QA switch `CRATES: OLD/TOOLBOX`. Monetization is design only: the premium lane stays a **MOCK**, with no real payments.

Labels used below:
- **[B]** = from the Direction B text.
- **[X]** = from the expansion (t-e2128dd7).
- **[LEAD]** = a Lead decision from t-b445b8a9.
- **[TODAY]** = the perk that ships today (`UNIT_PERKS`).
- **DRAFT** = rebuilt or proposed by the doc writer, never approved. Check it before you build it.

---

## 1. Rules every unit follows

- **One clear job per unit.** Each level card shows a "GOOD HERE" tip that names the unit that fits the level.
- **Three types:**
  - **Shooter** hits the target.
  - **Relay** passes the chain to other parts (it wakes them).
  - **Support** is a Helper card. In B it moves off the board and you tap it (owner pick "Helpers = B"). Fan and Magnet used to be MOVERs; they are now Support.
- **Two kinds of level:**
  - Merge rank on the board (1-8; helpers stop at 6).
  - Collection level (1-10, from duplicates + Bolts).
- **Levels 3 / 6 / 9 upgrade the job.** They change how the unit works, not only its numbers. Between milestones: shooters +4% per level, relays +2% per level, support units level their own effect (as today).
- **Engine rules still hold** (CLAUDE.md): each gadget fires at most once per cascade; the strongest coil charge wins and charges never stack; moves and swaps never deal damage.
- **Anti-loop rule for every "hold / release" unit** [LEAD] (Capacitor, Fuse Box, and anything later that stores a chain):
  1. it releases **once**;
  2. a release never stores another release;
  3. a unit never re-triggers itself.
- **Caps on scaling bonuses** [LEAD]: any bonus that adds up (per shooter, per cell, per charge, or by stacking multipliers) has a stated cap in its own row. No level line may go past it unless that line raises the cap by name. Caps per unit:
  - **Arc Welder**: arc bonus at most **+72%**, and at most **4 shooters** count.
  - **Saw Blade**: total edge bonus (ring x corner) at most **+72%** (x1.72).
  - **Nail Gun**: at most **x1.8**; x2.2 at L9.
  - **Piston**: at most **x2**; x2.2 at L9.
  - **Wrecking Ball**: at most **x2**; x2.3 at L3.
  - **Mortar**: at most **x2**; x2.15 at L3.
  - **Tesla Tower**: at most **6 charges** (+12% each, +72%).
  - **Pipe**: at most 4 parts; 6 at L3.

---

## 2. Roster: 34 units (Common 9 / Rare 10 / Epic 9 / Legendary 6; 12 Shooters, 12 Relays, 10 Support)

The Batch column says when a unit ships:
- **Live** = in the game today (its new B job comes with B0/B1/B2).
- **B1-B6** = new-unit batches, each behind a flag with sims (section 4).

### Common (9)

| Unit | Type | Job | L3 | L6 | L9 | Batch |
|---|---|---|---|---|---|---|
| Cannon | Shooter | **FIRE**: steady hit, plus an auto-shot. [B] | Rank 4+ chain shots x1.2 [TODAY] | Every 8th chain shot x2 [TODAY] | Rank 7-8 auto-shots x2 [TODAY] | Live (starter) |
| Nail Gun | Shooter | **ROW**: +20% per filled cell in its row, **max x1.8**. Secondary: each shot strips **1 armor pip**. Raw damage a little below Cannon (DRAFT number: x0.9). [B]+[LEAD] | Strips 2 pips on rank 4+ (DRAFT) | A full row: +1 extra nail, x0.5 (DRAFT) | Filled cells in its column count too; cap rises to **x2.2** (DRAFT) | B1 |
| Piston | Shooter | **OPEN SPACE**: +25% per EMPTY touching cell, max x2. The board edge does not count as empty. [X] | Empty diagonal cells count too, +10% each (still max x2) | When it fires, it pushes the nearest touching part 1 cell away (no damage) | Cap rises to **x2.2** when the board holds 8 or fewer parts (DRAFT; was x2.5) | B2 |
| Coil | Relay | **RANGE**: wakes up to 2 cells out in each of the 4 straight directions (up to 8 cells). [B] | Rank 5+ reaches 3 cells [TODAY] | Every 6th fire also wakes its diagonals [TODAY] | Rank 7-8 reaches 4 cells [TODAY] | Live (starter) |
| Bell | Relay | **ROW**: wakes **every other part in its row** (up to 4 on the 5-wide board). [B]+[LEAD] | Also wakes the cells above and below [B example; TODAY Side Chime] | Every 6th ring wakes the rows above and below [TODAY] | Rank 7-8 rings its row AND column [TODAY] | Live (starter) |
| Horn | Relay | **COLUMN**: wakes **the nearest 4 parts in its column** (a 6-tall column has 5 others, so 4 keeps it even with Bell). [B]+[LEAD] | Also wakes left and right [TODAY Side Blast] | Every 6th blast wakes the side columns [TODAY] | Rank 7-8 blasts its column AND row [TODAY] | Live |
| Spring | Relay | **HOP**: on the side opposite the entry, the chain skips exactly the next part in line and wakes the one after it. Both must be within 3 cells. The skipped part does not wake. Short-range by design; the long bridge is Belt Drive. [X]+[LEAD] | Hops both ways along the entry line (still within 3 cells) (DRAFT) | If the landing part is a Spring, it hops again (each Spring once per cascade) (DRAFT) | If the hop would leave the board, it hops 90° along the wall instead (still within 3 cells) (DRAFT) | B2 |
| Fan | Support | **CLEAR**: tap to clear junk / frost / lock in a 3x3. [B] | 3x3 becomes a plus shape 2 long each way (DRAFT) | 2 uses per level (DRAFT) | Also clears a queued boss attack aimed into the area (DRAFT) | Live (starter) |
| Wrench | Support | **UPGRADE**: after a rank-3+ merge, your next merge counts as **+1 rank for effects**. Its real rank does not change. [LEAD] | Rank-2+ merges arm it (DRAFT) | Holds 2 armed merges (DRAFT) | +2 ranks for effects after a rank-6+ merge (DRAFT) | B2 |

### Rare (10)

| Unit | Type | Job | L3 | L6 | L9 | Batch |
|---|---|---|---|---|---|---|
| Rocket | Shooter | **BURST**: big hit when you merge it, small when a chain wakes it. [B] | Rank 4+ hits x1.15 [TODAY] | Every 6th fire x1.5 [TODAY] | Rank 7-8 hits as if 4 links deep, x1.35 [TODAY] | Live |
| Mortar | Shooter | **DEPTH**: x1.0, +0.12 per machine already fired in this chain, max x2. It also **breaks shield segments**. [B]+[LEAD] | Cap x2.15 (B0 `capPerk`) | Every 6th fire counts 2 links deeper [TODAY] | Rank 7-8 always hits as 4 deep [TODAY] | Live (B0 order rule flagged) |
| Jackhammer (was Drill) | Shooter | **BYPASS**: its hits **ignore shields**. Breaking shields is Mortar's job and armor pips are Nail Gun's, so it does neither. B's "x2 vs armored" is dropped (Q3, Lead). [B]+[LEAD] | While the target's shield is up, its hits x1.3 (DRAFT) | Every 4th hit x1.5 (DRAFT) | Rank 7-8 also hits the tile behind the target (DRAFT) | B1 |
| Blowtorch | Shooter | **HAZARDS**: the shot runs up its column and burns Frost / Junk / Clamp, x1.5 per hazard burned. [X] | Also burns Bomb / Slick | Also burns the column to its right | Once per level, burns a boss mark early | B3 |
| Fuse Box | Relay | **DIAGONAL**: wakes 2 cells along each diagonal. Anti-loop rule applies. [B]+[LEAD] | Rank 4+ also sparks 2 more diagonal cells [TODAY] | Every 5th spark also wakes up/down/left/right [TODAY] | Rank 7-8 sparks full diagonals [TODAY] | Live (B1 reach flagged) |
| Gear | Relay | **LINK**: any two Gears pass the chain to each other, anywhere on the board. Stays as designed. [B]+[LEAD] | A Gear also wakes its 4 touching cells (DRAFT) | A third Gear joins the link (DRAFT) | Linked Gears' shooters x1.2 (DRAFT) | B1 |
| Pipe | Relay | **SAME FAMILY**: wakes same-family parts joined to its neighbours, max 4. [X] | Max 6 | Flows along diagonals too | The last part in the flow x1.3 | B3 |
| Magnet | Support | **PAIR**: tap a part and its twin arrives next to it. [B] | Pulls from 1 cell further [TODAY] | Every 4th use pulls twice [TODAY] | The pulled twin wakes on arrival [TODAY Snap In] | Live |
| Battery | Support | **SETUP**: pick one shooter; its next shot is **x1.5**. [LEAD] | x1.7 (DRAFT; today High Voltage +0.20) | Pick 2 shooters (DRAFT; today Twin Charge) | The charge stays through one missed cascade (DRAFT) | Live (B1 job flagged) |
| Blast Plate | Support | **DEFENCE**: tap a cell to block the next boss attack there. [X] | Covers 1x2 | Blocks 2 hits | When a block lands, the boss is stunned 2 s | B3 |

### Epic (9)

| Unit | Type | Job | L3 | L6 | L9 | Batch |
|---|---|---|---|---|---|---|
| Arc Welder | Shooter | **SPREAD**: jumps to the nearest other shooter, never to another welder. Bonus capped at **+72% / 4 shooters**. [B]+[LEAD] | Rank 4+ own shot x0.9 [TODAY] | Every 5th fire arcs once more [TODAY] | Rank 7-8 arcs to two machines [TODAY] | Live (B0 welder rule flagged) |
| Saw Blade | Shooter | **EDGE**: x1.5 on the outer ring, x0.7 inside. Total edge bonus capped at **+72%** (x1.72). [B]+[LEAD] | x1.6 on the ring (DRAFT) | Corners x1.25 more; total still capped at +72% (DRAFT; replaces B's "corners x2") | x0.85 inside (DRAFT) | B1 |
| Wrecking Ball | Shooter | **DISTANCE**: x0.6 when its waker is next door, +0.3 per extra cell of distance, max x2. [X] | Max x2.3 | Knocks the part it swings over 1 cell | From 4+ cells away, also wakes the cell behind it | B5 |
| Belt Drive (was Conveyor) | Relay | **BRIDGE**: the chain enters one side and exits at the far end of its line. The cells in between do **not** wake. [LEAD] | The far end wakes 2 deep (DRAFT) | Belt to Belt keeps going (DRAFT) | The exit part fires x1.25 (DRAFT) | B2 |
| Capacitor | Relay | **HOLD**: stores the chain and releases it at the start of your NEXT merge. Anti-loop rule applies. [B]+[LEAD] | Shows what it holds (DRAFT) | The release adds +1 link of depth (DRAFT) | The release wakes 2 touching parts instead of 1. It still stores one chain and releases it once (DRAFT; replaces B's "stores two chains", which broke the anti-loop rule) | B4 |
| Ladder | Relay | **STAIRCASE**: wakes the touching part exactly 1 rank above it, then the next step, and so on. [X] | The staircase may go down | May skip one rank | Top step x1.5 | B4 |
| Amplifier | Support | **DAMAGE**: the next cascade deals **+30%** to the target. Moves Rare -> Epic. [LEAD] | +35% (DRAFT) | 2 charges (DRAFT) | Also counts the passive shots in that cascade (DRAFT) | Live (B1 job flagged) |
| Blueprint | Support | **PLAN**: shows the next 3 deliveries; swap one. Copies arrive at **rank 1**. [B]+[LEAD] | Shows 4 (DRAFT) | Swap 2 (DRAFT) | One swapped copy arrives at rank 2 (DRAFT) | B4 |
| Rewind Crank | Support | **UNDO**: undoes the last merge, RNG included. Charges every 10 merges. Off in drills, the daily and bounties. [X] | Charges every 8 | 2 charges | Shows the delivery you rewound | B4 |

### Legendary (6)

| Unit | Type | Job | L3 | L6 | L9 | Batch |
|---|---|---|---|---|---|---|
| Tesla Tower | Shooter | **STORM**: 1 charge for each relay that fires in the cascade **within 3 cells of the Tower**, then one big bolt at the end. Each charge adds +12%, max 6 charges (+72%) (DRAFT numbers). [B]+[LEAD] | Range 4 cells (DRAFT) | Support units in range count too (DRAFT) | The bolt also strikes the boss's next attack mark (DRAFT) | B3 |
| Robot Arm | Shooter | **COPY**: remembers the last relay that woke it, then fires and does that relay's job. Cannot copy Legendaries. [X] | Its own shot x1.2 when it copies a Rare or Epic relay (DRAFT; replaces "copies Support effects", which didn't work with off-board Support cards) | Copies 2 jobs | Copies at the relay's L9 | B6 |
| Crane | Relay | **LIFT**: when woken, lifts a touching part onto its matching twin, so it merges mid-chain. Acts **once per stage**. The merged part counts as **already fired** in that cascade. [B]+[LEAD] | Reaches 2 cells (DRAFT) | Once per stage plus once per boss phase (DRAFT) | The lifted merge wakes its new neighbours (DRAFT) | B5 |
| Dynamo | Relay | **2x2 SQUARE**: in a full 2x2 block, wakes the ring of up to 12 around it; otherwise its 4 touching cells. [X] | An L-shape counts as a block | Two Dynamos make a ring 2 cells wide | Parts in the block x1.25 | B5 |
| Signal Beacon | Support | **REACH**: pick a shooter; **every relay can reach it once per cascade**. The shooter still fires at most once per cascade. Moves Epic -> Legendary. [B]+[LEAD] | Pick 2 shooters (DRAFT) | After the chosen shooter fires, the chain goes on from it to its 4 touching cells (DRAFT; replaces "fires x1.15", which broke "never changes damage") | Lasts 2 cascades (DRAFT) | Live (B1 job flagged) |
| Tilt Lever | Support | **TILT**: tap an edge; every part slides that way, twins merge, max 3 merges. Charges every 15 merges. [X] | Charges every 12 | Max 4 merges | Tilts only one row or column | B6 |

### Support trio, side by side [LEAD]

| Card | Kind | What it does | Never |
|---|---|---|---|
| Battery | SETUP | One chosen shooter's next shot x1.5 | stacks with another Battery mark |
| Amplifier | DAMAGE | Next cascade +30% to the target | applies to more than one cascade |
| Signal Beacon | REACH | Every relay can reach the chosen shooter, once per cascade | changes damage |

### Overlap checks

- **Spring vs Belt Drive**: Spring hops over exactly one part, short-range. Belt Drive bridges to the far end of its line. Neither wakes the cells it passes over.
- **Jackhammer vs Mortar vs Nail Gun**: Jackhammer ignores shields, Mortar breaks shield segments, Nail Gun strips armor pips (its secondary note).
- **Fan vs Blowtorch**: Fan is a tap card that clears hazards in an area and deals no damage. Blowtorch is a shooter: it only burns hazards in its own column, and only when it fires, and the burn is what powers its hit.
- **Magnet vs Crane vs Tilt Lever**: Magnet (tap card) brings a twin next to a part you pick, with no merge. Crane (relay) merges a touching pair mid-chain, once per stage. Tilt Lever (tap card) slides the whole board for up to 3 merges, on a long charge.

### Candidates for later batches [LEAD] (not in the 34; no rarity slot reserved)

| Unit | Rarity | Type | Job | Twin risk to check |
|---|---|---|---|---|
| Rivet Gun | Common | Shooter | x2 if it is the 3rd part woken in the cascade | Mortar (depth) |
| Vice | Common | Relay | On the board edge: wakes the next 3 cells inward | Bell / Horn |
| Hydraulic Press | Epic | Shooter | Huge hit only when all 4 neighbours are filled | Nail Gun (fullness); opposite of Piston |
| Lathe | Epic | Shooter | On the edge: grows with distance to the opposite edge | Saw Blade (edge) |
| Router | Rare | Relay | Wakes in an L-shape | Fuse Box / Coil |

---

## 3. Lead decisions, quick list (t-b445b8a9)

1. Conveyor -> **Belt Drive** (the name clashed with the boss attack). Works as a **bridge**: the chain enters one side and exits at the far end without waking the cells between.
2. Drill -> **Jackhammer** (the name clashed with the Screw Yard Drill booster). It **bypasses shields**, and that is its only job (no shield breaking, no x2 vs armored). Mortar keeps **DEPTH** and also **breaks shield segments**.
3. Nail Gun strips **1 armor pip per shot**. Raw damage a little below Cannon.
4. Gear = **LINK** (two Gears pass the chain). Stays.
5. Tesla Tower counts only relays **within 3 cells**.
6. Blueprint copies arrive at **rank 1**.
7. Crane acts **once per stage**.
8. Scaling bonuses are capped: Arc Welder **+72% / 4 shooters**, Saw Blade **+72% total edge bonus**. Other caps are listed per unit in section 1.
9. Bell and Horn both **wake up to 4 along the line**. This fixes the row = 5 vs column = 4 imbalance.
10. Support trio: Battery SETUP / Amplifier DAMAGE / Signal Beacon REACH (table above).
11. Wrench: after a rank-3+ merge, your next merge counts **+1 rank for effects**.
12. Fuse Box / Capacitor anti-loop: release once, never store another release, never re-trigger itself.
13. Rivet Gun, Vice, Hydraulic Press, Lathe and Router added as later candidates.
14. Crate rules, section 5.
15. Spring = **HOP** (skips exactly the next part, wakes the one after it, short-range), so it is not a twin of Belt Drive (t-07325155).

---

## 4. Batch order

Every batch ships behind its own TUNING flag (default OFF) with balance sims (`tools/sim.ts`, `tools/level-report.ts`). Level HP is refit **once, at the end** (owner decision), not per batch.

| Batch | Units | Status |
|---|---|---|
| B0 | Rule fixes on the existing 13: helper copies + bag tokens, Mortar chain order, welders skip welders | Built, `TUNING.unitsB0` OFF |
| B1 (rules) | Helper jobs, shared BOOSTED mark, Fuse/Horn reach | Built, `TUNING.unitsB1` OFF |
| B1 (units) | Nail Gun, Jackhammer, Gear, Saw Blade | Not started |
| B2 | Wrench, Piston, Spring, Belt Drive | Not started |
| B3 | Blowtorch, Pipe, Blast Plate, Tesla Tower | Not started |
| B4 | Capacitor, Blueprint, Ladder, Rewind Crank | Not started |
| B5 | Crane, Dynamo, Wrecking Ball | Not started |
| B6 | Robot Arm, Tilt Lever | Not started |
| Later | Rivet Gun, Vice, Hydraulic Press, Lathe, Router | Candidates |

The B1 rules in code predate this doc. They differ from the section 2 jobs in places (for example B1 Battery = "x2 on a touching shooter"; here Battery = "chosen shooter x1.5"). See Q1.

---

## 5. Crates (toolbox theme)

Crates are toolboxes, so they feel like part of the workshop world.

| Crate (replaces) | Cards | Guarantee | Common | Rare | Epic | Legendary | Where from |
|---|---|---|---|---|---|---|---|
| Tool Bag (Wood) | 3 | — | 82% | 16% | 2% | 0% | Free: level rewards, milestones |
| Toolbox (Iron) | 8 | at least 1 Rare | 70% | 24% | 5.5% | 0.5% | Bosses, events, Gems |
| Tool Chest (Gold) | 20 | at least 4 Rare + 1 Epic | 58% | 30% | 10% | 2% | Chapter bosses, season, Gems |
| Golden Workbench (new) | about 10 [LEAD] | **1 Legendary** | 50% | 32% | 14% | 4% | Top tier; premium lane (MOCK) |

### Display rules [LEAD]
- **Show per-card odds and guarantees separately; never blend them.** For example: "each card: 70 / 24 / 5.5 / 0.5" on one line, then "guaranteed: 1+ Rare" on its own line. Never write "about 1.4 Rares per crate".
- **Pity counters are per rarity and always visible.** Example: "Legendary guaranteed in N Toolboxes" (B draft: about 40).
- A pity counter moves **only on crates that can drop that rarity**. A Tool Bag (0% Legendary) never moves the Legendary counter.
- Today's shared Epic pity and the new-unit pity (`EPIC_PITY`, `NEW_UNIT_PITY`) become per-rarity counters shown on the crate card.

### Latch roll-up [LEAD]
- The latch is **one chained roll per open, decided BEFORE the contents are rolled**. Animation can't change the result.
- Bag -> Toolbox or better: **25%**. Then -> Chest or better: **3%**. Then -> Workbench: **0.15%**. Each step only happens if the one before it succeeded.
- After the roll, the crate opens as the upgraded kind, and that kind's odds and guarantees apply.
- The odds sheet shows the latch chances next to the crate odds.

### Duplicates past level 10
- Spare duplicates past level 10 become **Spare Parts**: a wild card of the same rarity, usable on any unit of that rarity.

### Level cost
- Common / Rare / Epic: as today (`LEVEL_CARDS`, `LEVEL_BOLTS`).
- Legendary cards per level (B draft): 1, 1, 1, 2, 2, 3, 4, 6, 8. Legendary Bolts not set (Q6).

### Premium
- The premium lane, the Gem packs and Workbench purchases stay a **MOCK**. No real payments, no store SDK.

---

## 6. Unlock plan (t-e2128dd7)

80 levels = 8 chapters x 10 (`src/content/levels.json`). This fits the staggered-unlock rule (owner: "fewer unlocks in levels 2-6").

| Chapter | Unit unlocks | Crate unlocks |
|---|---|---|
| 1 (L1-10) | Starters: Cannon, Coil, Bell, Fan. Nothing new in L2-6. L10 boss gives **Nail Gun** | **Tool Bag** (from the L10 boss) |
| 2 (L11-20) | L13 gift **Wrench**. L20 boss gives **Jackhammer** | **Toolbox** opens |
| 3 (L21-30) | L25 gift **Gear**. L30 boss gives **Saw Blade** | **Tool Chest** opens |
| 4 (L31-40) | L35 **Blowtorch**. L40 **Blast Plate** | — |
| 5 (L41-50) | L50 boss gives **Signal Beacon** | **Golden Workbench** opens |
| 6-8 (L51-80) | Crates only | — |

Rules:
- A unit can drop from crates only after its batch ships **and** a crate that can drop its rarity is open.
- A gift lands on the level where its matching boss attack or board shape first appears, with a GOOD HERE tip.
- Existing non-starters (Horn, Rocket, Mortar, Fuse Box, Magnet, Battery, Amplifier, Arc Welder) move to crates in this plan. Q8 covers today's road debuts (Rocket L6, Magnet L12, Battery L17).

---

## 7. Open questions (need an owner or Lead answer before building)

1. **B1 rules vs this roster.** The flagged B1 helper jobs (Battery x2 touching, Amplifier x1.6 within 2, Beacon x1.3 anywhere, on-board helpers passing the chain) differ from the Lead's support trio (SETUP x1.5 chosen / DAMAGE +30% next cascade / REACH). Which one wins? And are Support cards fully **off the board** (tap cards) or still on-board parts?
2. **Armor pips and shield segments don't exist yet.** Today's only shield is the timed chain shield (x0.75 until a 4+ chain opens it; `shieldMult` in `game.ts`), and armor phases are cosmetic. Nail Gun (pips), Jackhammer (bypass) and Mortar (segments) need a new boss defence model. Pick it before B1.
3. ~~**Jackhammer's x2 vs armored** overlaps Nail Gun's pip stripping.~~ **Closed** (Lead, t-07325155): Jackhammer is "bypass shields" only.
4. **Rarity moves for owned units.** Amplifier goes Rare -> Epic and Signal Beacon Epic -> Legendary. How do saves convert card counts and levels?
5. **Owner OK on the 11 expanded units** is still pending (t-e2128dd7).
6. **Legendary Bolts per level** are not set. The card table is a B draft.
7. **Exact pity sizes** per rarity per crate (only "Legendary in about 40 Toolboxes" exists), and how Featured Crate pity fits in.
8. **Today's road debuts** (Rocket L6, Magnet L12, Battery L17, Horn from the first Wood crate) vs the unlock plan. Keep them as gifts, or crates only?
9. **Golden Workbench price and source** in the mock economy, plus its free sources (season tier 30? endless?).
10. **All DRAFT L3/L6/L9 lines**, and Nail Gun's exact raw damage (DRAFT x0.9).
11. **Belt Drive's line**: is "far end" the far edge of its row or column (by entry side), or the far end of a run of joined Belts?
12. **Crane "once per stage"**: per boss stage or per level, for levels without stages?
13. **Candidate twins**: Vice vs Bell/Horn, Lathe vs Saw Blade. Decide before giving them batch slots.
14. **Wrench "+1 rank for effects"**: does it raise rank-gated perks (for example "Rank 7-8 ...") and Tesla/Mortar multipliers, or only the job's own rank scaling?
