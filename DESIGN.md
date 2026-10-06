# One More Merge: Junk Machine — design (vertical slice)

Origin: ChatGPT's revision-3 spec ("Mobile game ideas" chat) + a Claude ⇄ ChatGPT brainstorm on 2026-10-05.
Roles: Claude Code writes all code; ChatGPT generates all art.

## Core loop
Portrait, one finger. 5×6 board of gadgets. Drag a gadget onto an identical one (family + rank) to merge.
The new gadget fires immediately and sparks its orthogonal neighbours; relays carry the spark further.
Every gadget that fires damages the target above the board. Beat 3 targets (Tin Can, Mad Fridge,
Junkzilla) before one shared 135 s clock. After target 1 and 2: pick 1 of 3 perks.

| Family | Rank-1 dmg | Passive | When woken by a cascade |
|---|---|---|---|
| Cannon | 10 | auto-fires every 3 s at **⅓ damage** | full payload shot; ends the branch |
| Coil | 4 | — | zaps cardinal tiles at distance 1 (rank 2+: 1–2), charges them ×(1+0.35·rank) |
| Bell | 3 | — | rings whole row; rank 2 +up/down; rank 3+ +whole column |

Relays never wake their own family (no bell→bell, coil→coil).

Damage = base × 2.25^(rank−1) × strongest coil charge × perk; cascade total × combo (1+0.08·(n−1), cap 3) × overdrive.
Each gadget fires at most once per cascade (BFS, visited set) — always bounded.

## Decisions from the brainstorm (rev 3 → slice)
- **Payload cannons** (ChatGPT + Claude agreed): passive fire is weak (⅓), cascade shots are full.
  Makes *where* cannons sit next to relays matter.
- **Kickback** (Claude proposed, ChatGPT constrained it): each target damage threshold (75/50/25%)
  and any player cascade of ≥8 gadgets (8 s cooldown) knocks a part loose. It lands next to a
  *lonely* gadget (odd count of its family+rank) and fuses with it → one secondary cascade.
  Never overwrites a gadget; never recurses beyond the finite thresholds. Restores the
  "the machine surprises me" promise from the original pitch.
- **No same-family relays**: bells never ring bells, coils never zap coils. On a packed board one merge used
  to fire 80%+ of the machine in 61% of novice cascades (placement irrelevant); now 21%.
- **Target HP** 4,200 / 21,000 / 34,000 (rev3 ×1.3) to compensate for all of the above — see sim below.
- Supply stays automatic (2.2 s, seeded 6/4/2 bag). Pull-supply tray is a candidate experiment.
- Meta: deferred. Direction agreed: unlock *toys* (new families, board shapes, blueprints) via
  discovery challenges, not permanent +% damage. Core keeps data-driven content ids to allow it.
- Scope: phone-browser vertical slice first; keyboard a11y, service worker, Capacitor, soak tests later.

## Sim (tools/sim.ts, 200 seeds, actual TS engine)
| Variant | novice 5 s random | greedy 2.5 s | cascade-seeking 2.5 s |
|---|---|---|---|
| rev3 rules | 76% win, 125 s | 98%, 108 s | 100%, 77.5 s |
| rev3 + kickback | 100%, 66 s | 100%, 62.5 s | 100%, 37.5 s |
| payload + kickback, HP×2 | 57%, 110 s | 98%, 92.5 s | 100%, 60 s |
| **+ no same-family relays, HP×1.3 (current)** | **51%, 110 s** | **97%, 100 s** | **100%, 63 s** |

Idle never wins. Placement-aware play clears ~35% faster than greedy merging — arrangement matters.
Bots are not humans: real fun needs observed playtests (see ChatGPT's 5-person script in its research doc).

## Round 2 (ChatGPT review → adopted)
- **Hybrid Kickback**: only HP-threshold drops auto-fuse (9 per run max). Big-cascade (≥8) drops just land next to a lonely match and wait for the player.
- **Slowing supply** (ChatGPT's curve, scaled ×0.75 after sim): 2.1 s → 2.4 s (15 s) → 2.85 s (45 s) → 3.4 s (90 s). Late pressure = clock, not sorting.
  ChatGPT's unscaled curve (2.8→4.5 s) made the run unwinnable for every bot: parts are the main damage source.
- **Occupancy guard**: at 25/30 filled, deliveries wait in the tray; resume at 22.
- **HP** 3,000 / 15,000 / 24,000.

Ablation (matched seeds 1–200, rev3 HP unless stated). Wins / median winning time:

| Variant | novice | greedy | cascade | kickback dmg share (cascade bot) |
|---|---|---|---|---|
| A rev3 baseline | 152 / 125 s | 195 / 108 s | 200 / 77.5 s | 0% |
| B family filter only | 8 | 165 | 200 / 85 s | 0% |
| C payload only | 12 | 123 | 200 / 85 s | 0% |
| D threshold kickback only | 200 / 95 s | 200 / 72 s | 200 / 50 s | 37% |
| E pacing curve only | 0 | 0 | 35 | 0% |
| **Current (120 seeds)** | **58%, 120 s** | **74%, 101 s** | **99%, 71 s** | 39% |

Watch-outs: Kickback is ~40% of skilled damage (ChatGPT: "don't let the free reward carry the run");
under slow supply the random novice sometimes beats greedy merging — dense boards chain more ("hoarding").

## Round 3
- **Kickback rank cap** (ChatGPT's pick over 'reduced damage' / 'lowest rank'): threshold drops auto-fuse only into rank 1–2 pieces;
  otherwise they become plain drops. Never skips the player's expensive upgrades. Kickback share of skilled damage 40% → 22%.
- **Hoarding is fine** (ChatGPT): a crammed contraption going off is the fantasy. New 'hoard until 24 then merge' bot wins 0/200.
- **Friendlier opening**: HP 2,250 / 11,250 / 18,000. 200 seeds: novice 78%/115 s, greedy 64%/111 s, cascade 98%/66 s, hoarder 0%, idle 0%.
  **Challenge mode** (HP ×1.4) unlocks after the first win; separate best time.
- **Rearranging matters** (answers ChatGPT's repeated 'bots never move pieces'): new *builder* bot may spend an action moving a
  relay beside a pair. 200/200 wins at **50.7 s** vs 65.7 s for merge-only cascade bot — ~23% faster. Its chains are
  deliberately saturated (83%): intentional full-machine eruptions, the payoff, not accidental noise.
- **Kickback telegraph**: landing cell planned when the panel breaks, reserved from deliveries, shown with a pulsing marker
  while the part arcs down; re-planned only if the board changed.

## Round 4
- **First 60 s** (ChatGPT: 'deliver the first I-built-that payoff within ~15 s'): Tin Can HP 2,250 → 1,200. First panel break +
  Kickback now at median 23 s (novice) / 9–13 s (skilled), was 31 s / 21–34 s. Win rates unchanged-or-better; idle still never wins.
- **Magnet spec (first unlockable toy, ChatGPT)**: activated by merge or by a relay (family filter applies). Deals no damage,
  emits no relay pulse. When its ID reaches the BFS queue head it scans up/right/down/left for an empty neighbour, looks up to
  two cells beyond along that ray (first occupied cell blocks), and pulls that gadget in if it is unactivated, unqueued,
  unreserved and not a Magnet. First eligible ray only; atomic move; BFS continues on the updated board. Never swaps,
  auto-merges, crosses occupied cells, moves queued gadgets, targets a Kickback reservation, or triggers activations by moving.

- **Magnet implemented** as first unlock: challenge 'wake 3 cannons in one chain you started' → Magnet (2 tokens added to the bag),
  switchable on the title screen. Sim: bots never plan pulls, so magnets only dilute supply (novice 82% → 54%, skilled unchanged).
  Needs human testing: is pulling a satisfying set-up tool? If not, give magnets a small damage value or a smaller bag share.
  Round 5 (ChatGPT): keep 0 damage, 1 token per 13 → novice with magnets 66% (vs 82% without).
- **Battery & Fan implemented** (ChatGPT round-5 rules): Battery primes the first adjacent unprimed Cannon (up/right/down/left);
  primes present before a cascade discharge ×1.5 on that cannon's chain shot, then clear; never stack, never passive.
  Fan pushes the first adjacent unqueued, unreserved non-fan gadget one cell outward into an empty unreserved cell.
  Neither deals damage or wakes anything. Unlock chain: Magnet (3 cannons in a chain) → Battery (merge a magnet-pulled
  gadget) → Fan (fire a primed cannon). Title shows toggles + next challenge.
  Sim with all three toys on (bots never use toy abilities = worst case): novice 82% → 36%, cascade bot 63 → 78 s.
  Toy damage 4 only recovers to 46%. Open question for humans: do toy abilities pay back their supply slot?
  → Aligned with ChatGPT's TOY_RULES.md: one helper toy per run (exclusive toggles; = magnet case, novice 66%);
  Battery may prime a *queued* cannon, which spends it on its turn in the same chain; fired cannons are ineligible;
  merges transfer primers with OR; primers survive moves; Fan never moves queued/activated pieces.
- **Playtest kit**: local event log (pause → export playtest log) + PLAYTEST.md observation script.

## Round 6 — REMIX (ChatGPT REMIX_RULES.md v1, implemented)
Post-win mode: one 135 s fight vs one big opponent, single HP pool (sum of the 3 normal HPs = 30,450), same board/supply/Kickback,
0–1 helper toy. Warnings at 18/36/…/126 s, 3 s countdown, never stack, wait for falling Kickback parts, target cells (not ids).
- **Vacuum Viper**: marks the lowest-rank part; removes whatever occupies that cell at the deadline (move it away to save it).
- **Toaster Twins**: marks the highest-rank part; shoves it to the first free U/R/D/L neighbour (open/close neighbours to steer; jam if none).
- **Grand Piano-saurus**: marks the fullest row; locks it 4 s (no merges/moves/deliveries/relays into it; blocks helper rays).
Records: fastest win per opponent + loadout. Sim (200 seeds): cascade bot 58% / 100% / 100% (vacuum / twins / piano), builder 100% ~68–73 s,
novice ≤ 6% — intended as the harder post-win mode. Note: one HP pool means no perk picks in Remix.

## Meta plan (ChatGPT, after playtest) — discovery challenges, not calendar gates
1 relay→cannon: Practice Bench (sandbox) · 2 all 3 families in one chain: Corner Bench (board mask) ·
3 two payload cannons in one chain: **Magnet** · 4 magnet makes a match: **Battery** · 5 battery discharge in a win: **Fan** ·
6 fan push makes a match: Mad Fridge Remix · 7 win with a new toy + all originals: Blueprint Bench.
Unlocks are optional loadout picks; no Bolts / +% damage until players show demand.

## Rounds 8-10: first playtest, MAX signatures, polish
- **Playtest 1 (Ido, phone)**: loved the core loop; ranks hard to tell apart (tried mixed-rank merges); wanted a real tutorial;
  the boss win "just pops up". Fixes: dice-pip rank plates (ChatGPT r8), non-matches fade to 45% while holding, a mismatch
  explains "2 ≠ 3", a 6-step coached tutorial on the real start board (every chain validated against the engine), first-time tips,
  How-to-play pages, and a boss-defeat sequence that is skippable after 600 ms.
- **MAX (rank 6) signatures** (ChatGPT r9, tests in max.test.ts): Cannon Backfire, Coil Arc Bridge, Bell **Corner Chime**
  (one diagonal non-bell, UL>UR>DL>DR, because our bells already ring their column; ChatGPT r10 accepted it and rejected
  "rings twice"), Magnet Twin Pull, Battery Split Charge, Fan Long Gust. They add wake-ups, never damage. Rank 5 is cosmetic.
- **Feel** (r9 timings): drag tilt and shadow, squash 1.06/0.94, delivery arcs, rolling HP, modal enter 220 ms / exit 140 ms,
  shake only for payloads or MAX, music ducks ~3 dB under chain chords, prefers-reduced-motion disables shake, HiDPI rendering.
- **r10 "make the spectacle predictable"**: held-merge preview (the first 3 real links at 35%, MAX endpoints in gold,
  a 35% ghost of the result); sticky drop target (enter 70% / leave 90%); one feedback lane (MAX name 450 ms, no floating
  labels); sprites normalized by their alpha bounds (76% height, 84% width cap, shared baseline); idle life limited to
  2 gadgets per 1.8-2.6 s beat; monster sway ±0.5°; 12% cream wash on the stage; a 180 ms cue on a Kickback's match;
  ONE MORE! scaled to ≥52 px. No new art needed.

## Rounds 11-12 + playtest 3: impact, Daily, merges, explainers, HOME + Bolts
- **Impact without shake** (r11): monster squash/knockback tiers, a warm silhouette flash, and a gold wave over the board on a boss kill. The camera stays still (only MAX keeps a tiny kick); Shake can be toggled.
- **Daily Bench** (r11): one validated seed per local date (tools/daily-seeds.ts: a novice bot must win 2 of 3 attempts and the cascade bot must win), normal rules, no helper, unlimited retries, today's best only.
- **Playtest 3 (merges)**: a moved/swapped piece stayed where the finger let go, because reconcile() skipped the drag view and dragView was cleared after commitDrop. Targeting now uses the nearest cell to the held PIECE (40 px above the finger), with hysteresis and no dead zones, plus a safety net for a lost pointerup.
- **Explainers that stop the clock**: the first chain, the first Kickback fuse and the first spare part; the HP bar shows chunk marks at 75/50/25%.
- **HOME** (r12): wallet bar, YOUR MACHINE (layered v10 art; per-family mastery = highest rank ever merged/fused; tiers 1-2/3-4/5-6), helper row, PLAY, Daily/Challenge/Remix, Workshop, Records/How to play. The result screen shows this run's machine instead of the old illustration.
- **Bolts** (r12, src/core/economy.ts + tests): 6 base (30 s + 3 merges) + 4/boss + chain bonus 2/4/6 + 8 full clear; +8 first Daily; 12 onboarding once. Cosmetic chassis finishes only (20-140), so balance and records stay fair. Finishes are chassis tints for now; proper material masks are still to request from ChatGPT.

## Merge fest (playtest 3: "merging must be the main thing, always something to merge, a merge fest")
- **Matchmaker deliveries** (game.ts `matchmakerPick`): 60% of deliveries copy a lonely gadget's family AND rank, preferring the lowest 3 lonely groups. Every delivery does this when the board has no legal pair. It's a pure function of (seed, ordinal, board), so the NEXT preview stays exact.
- **Faster supply**: 1.7 / 1.9 / 2.1 / 2.4 s. **Turret (passive cannon) damage**: 0.33 → 0.15. **HP ×1.2**.
- Sim (200 seeds): novice 85% (was 82%), greedy 100% (was 80% without the matchmaker), cascade 40 s. Damage split: player ~66% / passive ~6-8% / kickback ~23%.
- Daily seeds regenerated under the new rules (DAILY_VERSION 2).

## Clarity ruleset (playtest 3: "I don't understand what each machine does"; ChatGPT r14)
- One fixed, visible shape per family; rank changes damage only. Coil = a 2-cell + cross. Bell = its row. Cannon = shooter (weak auto shots, full shot when chained). No hidden coil charge bonus. MAX mechanics are off (kept behind TUNING.clarity=false / legacy tests).
- UI: tap a gadget for an inspect card (role icon, one power line, reach mini-map, damage, try-this; pauses the clock). A held Coil/Bell shades its reach.
- Sim: without the coil bonus the novice bot fell to 20%. HP ×0.55 (800 / 7400 / 11900) restores ~86% (interpolated from ×0.6 = 82% and ×0.5 = 92%). Daily seeds v3.

## SAGA (ChatGPT r15 + Ido: a level path, harder levels, core + dynamic resources)
- **Levels** (src/content/levels.json, 60): one monster, one board (PAIR8 at the level's starting rank), one clock. Supply phases 1.7/1.9/2.1/2.4 s at 0/25/50/75% of the level time. Matchmaker ordinary copies are capped at a per-level rank. Modifiers: SUCTION (vacuum: unpaired rank ≤2), JAM (one empty cell for 5 s, every 16 s), ROW_GAPS (a row's empty cells for 4 s, every 20 s), CORNERS_2/4 (permanent). Stars: clear / ≤80% time / ≤60% time.
- **Calibration** (tools/sim-levels.ts): r15's HP table was untested (novice won 100% early and 5% late). Each level's HP is binary-searched to novice-bot targets: L1-3 97%, Normal 90%, Hard 72%, Mega 57%. Idle never wins.
- **Economy**: core = Bolts. Dynamic = Jumpstart Kit (pre-level: starter shooter pair +1 rank) and Time Capsule (+15 s once in a level 4+). Level rewards from levelEconomy.json (first clear / replay cap / new stars / free kits and capsules / star milestones / eligible fail 4 Bolts once per level per day).
- **Home** = ROAD (scrolling path, HARD/MEGA HARD tags, workers, sticky PLAY LEVEL N) / MACHINE (team, workshop, mastery) / EVENTS (Daily L3, Challenge L5, Remix L10, Junk Run). The tutorial leads straight into level 1. Rocket and events also unlock by clearing level 5.
- Not yet: ranks 7-8 (art imported in v13; MAX_RANK stays 6 for now), the 2-piece rescue delivery, and buying kits/capsules with Bolts in the Workshop.

## Round 16: critique fixes, chapter rhythm, two-piece rescue, ranks 7-8
- **Rhythm** per chapter position (novice targets): 95/93/91/88/**72 HARD**/95/91/88/85/**57 MEGA**; L1-3 at 97%. Calibrated with 400 bot seeds per level plus a 400-seed held-out check (tools/sim-levels.ts --n 400).
- **Two-piece rescue**: with no legal pair and nothing lonely to copy, a matching rank-1 core pair arrives.
- **Ranks 7-8** (Saga L21+ only): damaging core families cap at 8 (2.25×/rank as before); helpers, events and the classic run stay at 6. In Saga, two cap pieces compact into one cap piece (frees a cell, fires once). Copy caps 4/5/6/7 for L21-30/31-40/41-50/51-60. Showcase: L21 starts with a rank-6 shooter pair and L41 with rank 7, so those two calibrate to ~3× the HP of their neighbours (the opening merge is a huge hit).
- UI: short HUD names, Time Capsule in the bottom lane with a 350 ms hold, level card (no HP, star outlines with goals, Jumpstart switch), result Bolts breakdown, curved road, quiet road background, EVENTS cards, Daily +1 Kit, shop caps 3 kits / 2 capsules.

## Round 17: meta loop
- **Chapters**: the first clear of each chapter-end level (10, 20, ...) awards a chapter medal (collection only, no battle effect), shown with a chest-opening presentation and on a medal shelf in MACHINE. The road strip shows chapter progress and previews the chest.
- **Bolt sinks**: hero ornaments Brass Whistle 250 / Violet Pennant 450 / Clockwork Finial 700, on their own mount (never deliveries). Backdrops and weekly keepsakes are deferred until they have art.
- **High ranks**: the numeral always shows and a crown marks the cap; rank 7/8 dice plates. The L21/L41 showcase overrides were removed (ordinary chapter starters; refit to ordinary HP). An optional showcase practice is still to do.
- **Onboarding**: three one-time lessons (road, star goals, boosters).
- **Playtest**: an in-game Playtest Stats page (Settings). r17's human plan: Ido as the expert, 5 friends as the novice cohort; first-try clear rate by chapter position, spike follow-through, booster purchase rate, owned-booster use rate, high-rank payoff rating.

## Round 18: the first five minutes
- **Warm-up** on first launch = ONE coached merge ("Same machine. Same number."), then straight into L1. The full 6-step tutorial remains under Replay tutorial.
- **Teaching levels** (levels.json `teach`): L1 = cannons only (board + bag), no kickback/overdrive ("Merge matching cannons. The new cannon fires."). L2 = a board where either coil merge fires exactly 3 (coil -> same-row bell -> cannon; engine-tested both directions), no kickback/overdrive. L3 = 7 starters incl. a lone cannon rank 2, kickback on ("Break a panel. Its part falls onto your board."). HP refit to the 97% novice target (L1 780, L2 800, L3 1950).
- **Progressive reveal**: header Kits after the first kit, Capsules after L4; chapter strip after L3; overdrive from L3; scrap from L4; Workshop after L5; L1 result has no chain stat and no chest countdown; the Kit row on the level card only once a kit is owned; the delivery tip comes later ("NEXT brings another gadget").

## Round 19: the drained board
- Finding (tools/occupancy.ts): a fast player (1 merge/s) ran the board at ~5/30 cells with chains of ~3, while 5s novices ran ~17/30 with chains of 6-7, so the big moments rewarded slow play. Cause: supply 0.42-0.59 parts/s < 1 merge/s, and matchmaker copies pair instantly.
- Fix (ChatGPT r19 pick): **packet controller**. Same deadlines; 3 parts below round(14·C/30) occupied, 2 below round(18·C/30), else 1 (C = usable cells). L1 off, L2 after its first chain, others after 8 s. Extras are ordinary bag tokens (never copies).
- Result: novice boards ~20-23 with chains 8-11 (p90 16-21); fast chain-seeking clears 12-34% faster than fast greedy (skill pays). Fast players still finish early levels in 15-20 s.
- Bug found by the fast-bot sweep: the kickback plain-part fallback could land in a CORNERS-masked/locked cell (stuck, unmergeable). Fixed; legalPairs ignores locked cells; regression test plays full levels.
- All 60 levels recalibrated (400 + 400 held-out seeds). UI: flames off the bottom lane, no floating RANK text (badge pulse), passive hits are particles only, the merge streak lives in the lane, the ornament stands on the chassis.

## Round 20: chapter bosses (L10/20/30/40/50/60)
- One boss, one HP bar, a 90 s clock, 16 starters (PAIR8 plus a seeded second set); the boss attack replaces the level modifier; packets unchanged. Armor phases > 66% / 66-33% / <= 33% are cosmetic (sprite intact/cracked/critical, ARMOR BROKEN) with no damage gates. Attacks: warning at 8 s then every 12 s, 2.5 s telegraph, effect 2/3/4 s by phase (src/core/boss.ts):
  - L10 Tin Can King CLAMP (highest-rank cell: no drag out / no drop in)
  - L20 Fridge Overlord FROST ROW (no deliveries or drops into the row)
  - L30 Viper Queen SUCTION (1/1/2 lowest-rank parts removed)
  - L40 Twin Toasters HOT COLUMN (shooters there ×0.5)
  - L50 Piano-saurus Rex REST ROW (relays there wake nobody)
  - L60 Junkzilla SPLIT (no relay wake crosses the divider)
- Presentation: boss name-card intro, BUILD YOUR MACHINE, telegraph icon + shape + countdown, a first-ever boss-warning explainer, a BOSS tag on the road and level card, the boss rule on the card. Calibrated: L10 81%, L20-60 69-78% novice (400 + held-out). Tested: setup, clamp, the three cascade modifiers, suction, full fights with no duplicate ids.

## Round 21: boss critique + external-playtest configuration
- Boss fixes: no ordinary face patches on boss sprites (the Twins had a third head); one telegraph language (warning = dashed coral + countdown + consequence; active = plum fill, solid coral/cream border, duration + consequence); split icon at the top of the divider (never on the HP bar); the defeat line goes in the lane so the whole stage stays visible; HUD bottom controls fade; boss cards carry the attack icon and never show the star lesson.
- Road: the first-visit lesson is dismissed by tapping the glowing node (no GOT IT), shown only for levels <= 3; floating worker decorations removed.
- **Playtest mode** (`?playtest=1`, persisted; `?playtest=0` turns it off): EVENTS shows only Daily (after L10); helpers are hidden and never enter runs; the cosmetics Workshop is hidden. Bolts, Kits and Capsules stay.
- Merge-intent telemetry: `drag_end` {from, to, highlighted, legal, kind move/merge/mismatch, hold ms} separates intended drops from input failures.
- r21 plan for 20 strangers: 5 diagnostic sessions, fix, then 15 validation sessions. Gates: 12/15 explain matching, 10/15 show a chain, zero stuck sprites or duplicate merges. A separate first-boss trial on a copied save. Track voluntary next-level starts, occupancy and chains by human merge speed, fail -> retry/booster/exit, and return within 24-48 h.

## Open experiments
- Kickback: fuse-on-landing vs plain drops (ChatGPT's request), measure player reactions.
- Pull-supply tray (tap to release a matching pair, 5 charges) vs auto-supply at equal rank mass.
- Full-board connectivity: novice median chain 29 = packed board fires everything. Watch for "hoarding beats merging".
- Wild ideas parked: fridge door becomes your cannon; bass-drop bell sweep on beat; Junkzilla rebuilt
  into your machine on the win screen; mega-cannon recoil causing accidental matches.

### Round 22 (playtest prep)
- Bosses share a feet baseline at 88% of stage height (max 78% wide / 80% tall); attack tints/outlines draw under machines so rank badges stay readable.
- Lane text auto-fits, never below 26 game px (≈14 CSS px); boss copy shortened rather than shrunk further.
- Boss levels show only the first-ever boss-warning lesson (in the bottom lane, sim paused); every other tip/lesson is deferred to a normal level; defeat clears the coach. No star/booster lessons on boss cards.
- Boss card: a 5×2 mini-board diagram of the attack shape (dashed coral = warning), plus the escape arrow for clamp/suction.
- ChatGPT: freeze the build once the stranger test starts; ship fixes only between cohorts.
- **Difficulty re-based on a human pace (r22).** Finding: a random legal merge every 2 s won 100% of all 60 levels (incl. MEGA HARD and bosses) in ~30 s of a 65-90 s clock — calibration used a 5 s random bot, far slower than any person. L4-60 HP refit (`sim-levels.ts --every 3`, 100 seeds + held-out) to the same chapter rhythm for a random merge every 3 s; HP roughly ×2-2.5. L1-3 teaching levels unchanged.
- **Star goals per level** (`tools/star-times.ts --write` → `star_times`): 2 stars = median clear of a random merge every 2 s; 3 stars = median clear of a best-chain merge every 1.5 s. A live star countdown (★★★ 12s) sits in the stage's top-left.

### Round 23 (variety in the first 20 levels — spec in docs/ROUND23_FIRST_20.md)
- Ido played to L11: fun, but L1-10 samey and easy; didn't understand the L10 boss attack. Wants L1-10 near-sure, ramp after.
- **Goal levels** (`goal` in levels.json): MAKE RANK N (a player merge reaching rank N) and CHAIN xN (one player-rooted cascade of N). The goal replaces HP (monster HP 1e9, no HP-panel kickback, no damage numbers); the HP bar shows goal progress. L4/7/12 rank 4, L15/16 rank 5, L5 x12, L11 x16, L14 x18, L18 x16 (random-3s players reach x16 in ~80-97%, x20 in 20-70%; a fast greedy chain-seeker never reaches big chains — fast merging drains the board — so chain-goal 3 stars = 75% of the 2-star time).
- **Behaviours**: chain shield (Fridge L8/13: damage x0.75 until a 4+ chain opens it for 6 s), light suction (Viper L9/14) and light frost (L19) reuse the boss system (`light`: first at 10 s, every 15 s, no armor phases).
- **Twists earlier**: CORNERS at L7, new GAPS mask (2,1)+(2,3) at L15/18. **New machines earlier**: Rocket L6 (shooter override), Magnet L12, Battery L17 (`start_extra`).
- Win targets (random-3s bot): L4-9 97%, L10 95%, L11/16 95%, ch.2 normals 90%, L14/19 80%, L20 85%.
- **Boss clarity**: the first clamp is a guided dodge (sim frozen, arrow to a safe cell, only that move accepted); the clamp sits on the machine; touching a clamped machine says STUCK; DODGED! when the cell was emptied; deliveries and kickback never refill a cell marked by a pending clamp/suction.
