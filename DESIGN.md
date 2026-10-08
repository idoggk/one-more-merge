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

### Round 24 (Ido: easier early stars, tips missed while merging, one big merge auto-wins, units unclear, QA reset)
- Chapter 1 stars: 3 stars = 1.3x the median clear of an ordinary 2 s pace (capped at 0.6T), 2 stars = 0.8T.
- Teaching never talks over play: warm-up instructions sit next to the pair; "what just happened" lines wait for GOT IT; in-level tips and the teaching-level lesson pause the game (explain()).
- **MAX HIT**: one cascade deals at most 35% of a saga monster's max HP (`TUNING.cascadeCap`) — a win takes at least three real chains; the lane says MAX HIT. HP refit barely moved (the cap only bites on huge chains).
- **Machine Guide** replaces the old How-to-play: one page per machine with a looping mini-board (source pulses, zaps to what it wakes, bolts to the monster); locked machines say where you meet them. First level with a new machine opens its page; L4+ one-time "tap any machine" hint.
- Settings > "Start over (wipe progress)" (second tap confirms) for QA.

### Round 25 — power-up items (Ido's idea; ChatGPT spec in docs/ROUND25_ITEM_RULES.md, art v18)
- From L13, the 50% HP panel break drops a capsule into a one-slot tray instead of its kickback part (max one per level; goal levels only via an explicit teaching grant: L16 SPARK at 8 s). Deterministic item RNG; kind = the level's teaching kind, else uniform among unlocked kinds with an eligible machine (else the ordinary kickback).
- OVERCHARGE (Cannon/Rocket, 2 charges: chain shot x1.5), SPARK (Cannon/Rocket, 1: wakes occupied U/R/D/L neighbours of other families), CORNER KIT (Bell, 1: wakes diagonals except Bells). Charges spend only in player-rooted cascades (not passive, not automatic kickback cascades), even when a boss modifier blocks the benefit; REST ROW blocks corner wakes, SPLIT blocks crossing item wakes; MAX HIT cap unchanged.
- Merge keeps the attachment (with two, the destination's survives); kickback fuse transfers it; scrap/suction destroy it. Drag the item (or tap it, then a machine); valid machines get a gold rim; first item of each kind freezes the clock until it is applied (coach + hand). Badge upper-left with OVERCHARGE pips. Machine Guide has a POWER-UPS page.
- Calibration bots never use items, so items are pure upside for players (L13+ slightly easier than the numbers).

### Round 26 — chapters 3-6 variety (ChatGPT table)
- Ch.3 displacement (Fan intro L23 + Magnet), ch.4 payloads (Battery, Rocket, SPARK, light HOT COLUMN from L37), ch.5 connections (CORNER KIT, GAPS, light REST ROW from L47), ch.6 mastery. Relief levels 21/26/31/36/41/46/51/56. Old remix modifiers (SUCTION/JAM/ROW_GAPS) retired from the saga.
- New light behaviours `hot` / `rest` reuse the boss system (10 s, every 15 s, 2.5 s warning, 2 s active). Guaranteed items: L38 SPARK, L42/L48 CORNER (8 s grants), L55 CORNER (50% break). Item rims use the item's colour.
- Goal tuning (goal-aware random-3s): rank 7 is unreachable with ch.3 copy caps (L28 25-36% even at 90 s) → rank 6 there; chain goals raised to x16-x22 by chapter.

### Round 27 — boss roster (Ido: "a lot of bosses, art and concepts, not repetitive"; ChatGPT MINIBOSS_RULES + art v19)
- Six MINI-BOSSES at L8/18/28/38/48/58 (60 s, 16 starters, cosmetic damage states): Pressure Popper BOMB (cover it or fire beside it, else a rank-1/2 neighbour pops), Carousel Crab CONVEYOR (fullest row slides right with wrap), Vanity Moth MIRROR (highest and a different lowest machine swap), Brick Printer JUNK BLOCKS (max 2 inert blocks, cleared by a player chain beside them, 8 s), Scrap Kraken PULL (highest machine yanked one row up unless the cell above is filled), Spring Jack BOUNCE (most-surrounded machine to the farthest empty cell). Telegraphs show destinations; each attack explained once.
- Chapter bosses escalate: at <=33% HP they alternate their chapter's mini-boss attack (second first): King+BOMB, Overlord+CONVEYOR, Viper+MIRROR, Toasters+BLOCKS, Rex+PULL, Junkzilla+BOUNCE. "FINAL PHASE · NEW ATTACK"; card says "Final phase: also ...".
- Shield lesson moved to L11. Mini-boss targets 95/92/90/88/86/85 by chapter.

### Round 28 — cast, stages, collection, fight music
- 12 new ordinary characters (ChatGPT art v20), two per chapter, as a VISUAL layer (`visual` in levels.json; mechanics stay with `monster`): Kettle Grump, Colander Clatter, Sock Cyclops, Iron Duchess, Toolbox Terrier, Cone Goblin, Pixel Pug, Joystick Jester, Gramophone Goose, Accordion Imp, Wheelie Warthog, Satellite Scuttler. Old monsters remain at chapter positions 3/5 + teaching levels. No old face patches on cast art.
- One backdrop per chapter (stage_ch1..6: kitchen, laundry, garage, arcade, music attic, scrapyard dusk).
- MONSTER BOOK on the MACHINE tab: monsters / mini-bosses / bosses, silhouettes until beaten, "met at" level.
- Fight music modes: mini-boss (bouncy), boss (phrygian + stab), final phase (faster).

### Round 29 — chapters 7-8, Boss Rush, QA smoke, stronger items, faster load
- **Chapters 7-8 (L61-80)**: Packing Depot + Observatory Salvage backdrops, cast Parcel Pup / Pallet Pal / Telescope Toad / Radar Rascal (art v21). New attacks (docs/ROUND29_CHAPTER_7_8_RULES.md): Oil Otter SLICK (manual drops on the oil slide one cell along the arrow, 4 s), Rivet Rhino TOW BAR (two linked machines move together, all-or-nothing; merging either releases), Portal Possum PORTALS (a drop on an empty portal exits at the other), Chrono Chimera TIME RANSOM (wake both marked machines in one player chain or lose 2 s, which also counts for stars). Ch.7-8 minis also escalate in their last third (Otter+CONVEYOR, Possum+MIRROR); bosses Rhino+SLICK, Chimera+PORTALS. Chapter boss by `CHAPTER_BOSS`/`chapterBossIdx`.
- **Boss Rush** (EVENTS; L20 + 1 mini + 2 bosses beaten): weekly seeded course (beaten mini, then two beaten bosses), fresh boards with event rules (rank cap 6, copy cap 4, no helpers/Rocket/boosters), HP fitted per boss/slot to 85/80/75% (`tools/rush-fit.ts` → rush.json), cumulative weekly Bolts 8/18/40 (only the delta is paid), permanent medal on first full course, gold RUSH stamps in the Monster Book.
- `tools/smoke-levels.mjs` plays every level in the real scene and reports page errors (found + fixed a hit-face crash). `tools/item-check.ts` showed items worth +1% for random play → OVERCHARGE x2, SPARK/CORNER 2 uses.
- Boss / cast / chapter-stage art loads after the first frame.

### Round 30 — handover to a fresh ChatGPT chat, critique fixes, Monster Bounties
- The old design chat hit its size limit; design continues in a new chat seeded with screenshots/r30/PROJECT_BRIEF.md.
- ChatGPT critique (board-only comprehension: Slick 4/10, Tow 6/10, Ransom 2/10) → BEST CHAIN/BEST RANK goal strip, "3★ · 9s left", boss HP phase dividers at 66/33%, brass tow rod + cyan couplers + TOWED, oil cyan edge + bold slide arrow + landing glow, ransom violet frames + tether turning red in the last 0.75 s, larger lighter road silhouettes, clearer copy.
- **Monster Bounties** (EVENTS; needs 3 beaten bosses/minis): 3 date-seeded beaten opponents per day, each with a twist (two holes / two corners / Rockets instead of Cannons), Rush event rules and fitted HP. +10 Bolts per first daily win; mastery star per bounty for >= 20 s left or a x12 chain; Monster Book shows ★N; mastery milestones 3/8/15 pay 30/60/120 Bolts. Challenge + Remix share one CLASSIC MODES card.

### Round 32 — UNIT COLLECTION (Ido: units + leveling = main progression and monetization)
- Ido's decisions: cards from crates earned in play + premium Gem crates (mock store) + Bolt packs; level-up = duplicates + Bolts; 7 existing + 6 new units.
- ChatGPT r32 spec adopted after review (pushed back on: dropping the Gem store, wasted Amplifier/Beacon buffs, same-family relays, ignoring level-driven difficulty, squad starting cells). Levels 1-10, cards/Bolts per rarity (`content/units.ts`), shooters +4%/level, relays +2%/level, helpers level their utility (Amplifier x1.30+0.03, Beacon x1.15+0.02).
- Crates: wood 3 / iron 8 (1+ rare) / gold 20 (4+ rare); odds 72/24/4; guaranteed slots prefer missing units; epic pity (iron +1, gold +3, forced at 6); new-unit pity after 3 dry crates; first Wood brings Horn; Gold brings an Epic while none owned. Bolt packs: Role 150 (5 cards of a chosen role), Featured 450 (14, 8+ featured), Big 900 (30, 18+ featured), featured unit rotates daily. Gems ~7/day free (daily 2, all bounties 2, Rush 20/week, chapter boss 5); mock Gem packs 80/500/1200.
- New units: Mortar (shooter, deeper chain = harder, x0.9..x1.65), Arc Welder (shooter x0.75 that arcs into the strongest touching machine), Horn (relay: column), Fuse Box (relay: diagonals), Amplifier (marks strongest touching shooter/relay: next hit x1.3), Signal Beacon (marks nearest shooter + relay: x1.15). Marks persist until the machine fires; merges keep the larger.
- Squad: 1 shooter + Relay A (from ch.2) + Relay B (from ch.3) + 1 helper; relays take the Coil / Bell starting cells and bag shares. Fan is a starter. UNITS nav tab with collection grid, unit detail (animated demo, level effect, upgrade), crate reveal, shop.
- TODO: L3/L6/L9 milestone perks (spec agreed), choose-1-of-3 at the first mini-boss Iron, art v22 (unit sprites, crates, gem, card frames), recalibrate chapters 3-8 for expected unit levels.

### Round 33 — STAGES: several machines per level (Ido: "levels are too short… like JunkIlla, ~5 in a stage")
- A level is now a stage of machines on one board and one clock (`waves`, `wave_visuals` in levels.json; engine `GameState.stage`). L1–L2 stay single (tutorial), L3 = 2, chapter 1 = 3 machines, chapter 2 = 4, chapter 3+ = 5. Each later machine has +30% of the first one's HP share (`STAGE_RAMP`). Overkill carries into the next machine (capped like any hit). Item/bonus thresholds count over the whole stage, not per machine.
- Goal levels: the HP machines come first, the LAST machine is the goal (only breaks to that rank / chain). Bosses and mini-bosses: minions first (`minion_hp`), the boss wakes as the last machine and its attack clock starts then (`BossState.t0`). Rush and Bounty fights stay single boss fights.
- Level card shows the strip of machines (GOAL / BOSS tags); HUD header `2/5 NAME`; banner per new machine; the loss card says which machine you reached.
- Clocks: +45% of the old time per extra machine (the board snowballs), ~1.7 min in chapter 1 up to ~4 min late. HP refit with `tools/sim-levels.ts --staged` (random 3 s bot, same win-rate tables); star times recomputed.
- QA TOOLS panel (Settings > QA TOOLS): start over, jump to any level (earlier levels count as 2-star clears), all units at LV 5, currency, crates.

### Round 34 — ONBOARDING (Ido: "L13 was overwhelming for a player who is not a merge specialist; make sure the user sees the clock and the bosses")
- Debut audit: L4-L19 introduced a new idea almost every level. New schedule, by removing extras (never adding): ch1 = stages L3, rank goal L4, Rocket L6, mini-boss L8, boss L10 (L5/L7/L9 practice). ch2 = shield L11, Magnet L12, first power-up L13 (no shield, no Rocket swap), chain goal L14 (n 12, NORMAL), L15/L16 practice, Battery L17, suction L19, boss L20. Corners / gaps / frost (L25) / spark (L26) move to chapter 3. No forced shooter swap after L6 (the squad's shooter is the player's choice).
- The level card marks a first-time idea with NEW! and big dark text (`newConcepts()` in levels.ts).
- Clock: moved from the header corner to a draining ring left of the HP bar (where the eyes are); machine counter on the right; "30 SECONDS LEFT!" in the board lane; last 10 seconds count down in big digits over the board.
- Bosses: the first time a boss wakes (stage end), the clock stops on a card with its name, rule and board diagram.
- Calm board, chapters 1-2: deliveries (and the NEXT tray) wait at 20 of 30 parts. A casual player (random merge / 3 s) sat at 24-25 of 30 the whole level; now 20. HP refit L1-L20, star times redone.
- Fixed: the old run-mode "Next monster!" tip fired at the start of any Fridge level.

### Round 35 — REACTIVE SUPPLY (Ido: "the screen gets extremely chaotic real fast… keep a lot of merges but let the player think")
- Saga levels no longer deliver parts on a timer. Each player merge EARNS parts: 2 while the board holds < 14 parts, 1 below 22, none above (`REACT_TWO/REACT_CAP` in game.ts). Earned parts drop in 0.35 s apart. With no pair on the board, one part trickles in every 2 s (no soft-lock). Kickback and break drops are unchanged.
- Result: the board holds still while you look at it, settles around 18-20 parts, and every merge still brings new material (lots of merges).
- The calm cap (chapters 1-2, tray holds at 20) stays. All 80 levels refit for a 3.5 s random bot (was 3 s) so a thinking player has room; star times redone.

### Round 36 — SCREW YARD weekly event (Ido: "an outside-core mini game in the logic of Screwdom 3D… for a period of time, tiers, a grand prize")
- `src/core/screw.ts` (pure) + `src/game/ScrewScene.ts`. Stacked metal plates held by coloured screws; a screw comes out only if no higher plate covers it; a plate falls with its last screw. Screws go to the 2 open toolboxes of their colour (3 each, a full box leaves and the next colour rolls in) or to the 5-slot tray; tray full = lost.
- Generator: random plates -> a covering-respecting removal order -> coloured in triples (= toolbox queue) -> nearby colour swaps so the tray matters -> kept only if a sensible greedy player clears it (tests: yards 1-24 all solvable). Probe (`tools/yard-probe.ts`): a random tapper wins 100% of yard 1-3, 67% of yard 8, 12% of yard 20.
- Weekly event (week = Rush week): yard n = this week's clears + 1, seed = week*1000+n (a retry is the same pile). 8 tiers at 1/3/5/8/11/14/17/20 clears: 60 Bolts, 10 Gems, Wood crate, 200 Bolts, Iron crate, 30 Gems, Iron crate, GRAND PRIZE Gold crate + an epic unit card (a missing one first). Every clear also pays 15+3n Bolts.
- Screwdrivers (1 per attempt; 3 to start): +1 level win, +1 Bounty win, +2 Rush fight, +1 Daily bonus. EVENTS card replaces Classic modes (now a link on the Daily card); opens after level 4.

### Round 37 — polish + safety
- Screw Yard: square corner-screw panels (25% of plates), toolbox handles, rivets, "1 SLOT LEFT!" tray warning; EVENTS tab dot while an attempt waits; level 4 announces the event; results show the screwdriver.
- First stage of a player's life explains the HUD once (clock ring + machine counter), before anything moves.
- Distinct procedural placeholders for the six r32 units until ChatGPT's sprites land.
- Bug: the boss-wake banner / name plate read the live boss 0.4-1.5 s later; beating it in that window crashed the update loop. They now capture the boss when it wakes. Found by `FASTKILL=1 node tools/smoke-levels.mjs` (pushes every level through its machine, goal and boss transitions).

### Round 38 — ChatGPT design review (fresh chat "Game Design Critique"), applied strictly
- Reactive supply: a merge earns +2 at 0-11 parts, +1 at 12-17, +0 at 18+ (board ~15-17); earned parts wait 0.6 s after the merge (payoff on a still board); a pairless board gets a rescue part after 2.5 s, then every 3 s. NEXT capsule shows "MERGE → +N".
- Machines per level / clocks: ch1 2 (L4-6) then 3, ch2 3, ch3-4 4, ch5-8 4 (goal levels 5); mini-bosses 3/3/4/5 and bosses 3/4/5/5 machines total. Clock by machines: 2 -> 1:10, 3 -> 1:35, 4 -> 2:05, 5 -> 2:45 (nothing over 3 min; "4:00 retries are retention poison"). Boss = 35% of a boss stage's HP (sim-levels scales minions + boss together). All 80 refit (3.5 s bot) + star times.
- Boss wake = ONE paused card (dimmed board, NEW! when the attack is new, name, rule, diagram, GOT IT). Level cards show m:ss and "N MINIONS → BOSS". Stars lesson = one line above PLAY. 30 s ribbon 1.1 s. Rank numerals +25%.
- Upgrade Prescription on loss: the squad unit closest to its next level, what that level gives, cards x/y, and LEVEL UP / GET CARDS.
- Screw Yard: thicker plates clustered to 78% of the yard, stronger shadows, first-yard tip as a top toast that leaves after the first screw, event card "TIER x/8 · screwdrivers · ends in" + grand prize line.
- Trophies: TROPHIES button, "ON SHELF x/4" header, check badge, 3-segment gold mastery strip, four fixed sockets on a shelf plank.
- Declined: removing the "3★ · Ns left" chip (Ido liked it); a 2-part NEXT preview (the matchmaker reads the board, so part 2 cannot be promised exactly).

### Round 38b — art landed
- v22 pack recovered from the ChatGPT Library (the chat itself stalled): 36 rank sprites (Mortar, Arc Welder in the corrected welding-box design, Horn, Fuse Box, Amplifier, Signal Beacon), 16 trophy figurines, wood/iron/gold crates closed + open (open art swaps in before the cards fly), rarity card frames, gem icon, shelf plinths. Amplifier recoloured teal in code (hue shift of the orange-red body only) - it read as the orange Fuse Box.
- Screw Yard art (separate chat, approved piece by piece): neutral-steel long / short / square plates with see-through holes (generator now uses these three measured shapes; screw count fixed by long<->short swaps), neutral screw head tinted per colour, open toolbox with wells (tinted, screws land in the wells, a full box lifts away), tray with five wells and a red warning well.
- `tools/import-art.py` (trim + resize + webp), `tools/import-v22.py`; `sy_` art is lazy-loaded.

### Round 39 — art in context (ChatGPT art-director review) + audits
- Canonical unit portrait everywhere (collection card + crate reveal = the tier for the unit's level); crate rows centred, buttons follow content, small NEW tags; BEACON label; grey NO CRATES; "x/y UNITS OWNED" strip; header "L25 · CYCLOPS" (the counter shows 2/4); no damage float when the chain ribbon already shows the total; MERGE -> +N in a cream pill; unit-detail demo + cards fit sprites by visible bounds.
- Screw Yard: brass layer kept untinted over the tinted toolbox (`sy_toolbox_open_brass`, extracted by hue), dark through-holes under the plate art, "N TOOLBOXES LEFT" pill, ChatGPT workbench background.
- Trophy shelf: 4 even sockets, trophies +45%, lock on empty plinths. Gold star-time ticks on the clock ring.
- Authored helper extras become the selected helper (ROUND_33_RULES).
- Declined: "board Mortar is old art" (per-rank sprites by design).
- `tools/boss-audit.ts`: every final-phase attack is pre-taught by its chapter's mini-boss. Found a regression of r34 (frost moved off L19 -> new at the L20 boss): frost restored on L19 (refit). Junkzilla split / Rivet Rhino tow / Chrono ransom are boss signatures with no light version; the paused wake card is their lesson.
- Full FASTKILL smoke 80/80, no errors.

### Round 40 — runway + unit targeting (ChatGPT "next 5": Endless Road > Saga Mastery > Season > Featured Unit > Level Factory)
- ENDLESS ROAD (`src/core/endless.ts`): opens when L80 is cleared; the road's PLAY button becomes ENDLESS · FLOOR n. Floors are built from calibrated chapter 4-8 levels (block of 10: floor 5 = mini-boss level, floor 10 = boss level), HP +5% per floor in a block and x1.12 per block, seeded per floor. First clear: 8 Bolts (+Wood crate on x5, Iron on x10, Gold every 30th) + a screwdriver; replays 2 Bolts. Declined ChatGPT's "loss sends you back to the last checkpoint" (up to 9 floors of replay = the retry pain it warned about itself): a loss retries the same floor. QA jump 81 clears the saga.
- FEATURED CRATE (crate shop, top row): featured unit rotates every 48 h among the 9 non-starters (owned or not); 120 Gems / 540 for 5; an Iron roll where cards of the featured unit's rarity become it 60% of the time; guaranteed within 5 crates (counter shown, resets on a drop).

### Round 40b-41 — Saga Mastery + Workshop Season
- SAGA MASTERY (`src/core/mastery.ts`): every cleared level shows two contracts (chain N+ by chapter, no SCRAP, no machine above rank 5/6 (never blocking a rank goal), finish with 8+ empty cells; seeded per level). A win that meets one earns a medal: +10 Bolts, every 10th medal a Wood crate, every 30th Iron, all 160 a Gold crate. Declined ChatGPT's "15% faster" contract (stars already reward speed).
- WORKSHOP SEASON (`src/core/season.ts`): 28 days, 30 tiers x 100 XP. 3 daily tasks (15 XP) + 4 weekly (100 XP), seeded per day / week, counted from level wins, 3 stars, chains of 8+, crate opens, Screw Yard plays, Bounty wins, unit level-ups, mastery medals, endless floors; +75 XP for a full Boss Rush and for the Screw Yard grand prize. Free lane (Bolts, Wood every 5, Iron every 10, Gold at 30); premium lane (mock $4.99: Bolts, Gems, Iron, Gold and 6+ cards of the season's featured unit). SEASON button on the road (tier + red dot when claimable), CLAIM ALL.

### Round 42 — WORKSHOP PUZZLES (Ido: "like a chess puzzle - win in X moves; hard; practice using the units"; "practices like merge only the blue units; challenges tied to a unit when you unlock it")
- Engine puzzle mode (`newPuzzle`, `GameState.puzzle`): an exact board, merges only (no moves / swaps), optional `only` families, each merge spends a move; out of moves with HP left = lost. No clock, supply, passive fire, kickback or overdrive; unit levels do not apply (puzzles are exact).
- `tools/gen-puzzles.ts`: random boards around chosen units; exhaustive search of every merge sequence with the real engine; HP = 97% of the best line; kept only if <= 8% of lines win AND the greedy line (best damage each step) fails. `src/content/puzzles.json`: 40 daily puzzles (3 merges, ~30% with a "merge only" rule) + 3 drills per unit (2 merges / 2 merges "only this unit" (helpers: + one relay) / 3 merges). Test: every stored solution wins.
- DAILY PUZZLE leads the Events tab (+40 Bolts +3 Gems on the first solve of the day, streak); Daily Bench + Challenge + Remix moved to "Other modes". Puzzle HUD: merges-left ring, rule chip, HINT (restarts and lights the first move), results with TRY AGAIN / HINT. UNIT DRILLS on each owned unit's page (+25 Bolts +2 of its cards per first solve); a newly unlocked unit announces its drills.

### Round 44 — PUZZLE RAMP + GRADUATED HELP (the owner got stuck on the first "win in N merges" puzzle)
- Difficulty score 0..100 per puzzle (`src/core/puzzle.ts`, from the solver): depth 20 + rarity of a win 40 (log2 lines per solution) + dead first merges 12 + tempting traps 10 + greedy fails 10 + order matters 8. The r42 set scored 64–100 everywhere (daily 1: 93; drills opened at 50–80 and dipped mid-set). `npx vite-node tools/puzzle-curve.ts [file]` prints the curve.
- `tools/gen-puzzles.ts` now picks each machine's HP so the score lands in a band: drills 1 merge "many ways win" (6–16) → 2 merges "only this unit" (24–36) → 3 merges (44–56); dailies climb from ~10 to ~68 over 24 days (1 → 2 → 3 merges), then hold 60–68. Each puzzle stores its `score`. Tests assert the ramp.
- The daily is the player's own day count (starts at the warm-up; moves on only after a solve; after 40 it repeats the hard tail), not the calendar slot.
- Help, never forced: RESTART always (a restart after a merge counts as a try). After 2 failed tries HINT lights the part to move first; after 4 NEXT MOVE lights a correct merge from the board as it is (solver; restarts if the line is dead). Drills only: SKIP after 6 (no reward, no Season credit). No skip on the daily: it has a streak + reward, and NEXT MOVE already gets you through. Rewards stay once per puzzle/day: HINT is free, a shown move halves the reward. The 8 s idle hint (biggest chain) is off in puzzles, where it pointed at the trap.

### Round 45 — UNIT QUICK FIXES (units research)
- Helpers stop at rank 6, so the L9 rank perks that asked for rank 7-8 never fired. Magnet Snap In, Fan Launch, Amplifier Long Range and Beacon GO! now trigger at rank 6. Battery's text says "shooter" (it always primed any shooter). L9 Universal Socket now primes 2 touching shooters at any battery rank, like its text says. Sims never set unit levels, so the calibration does not move. No levels refit.
- A mark that is placed and used in the same cascade is spent (`amps[].spent`) and is not written back to the board. This happens with Beacon GO!, or when an Amplifier marks a machine that is already queued.
- Amplifier and Beacon marks are drawn as a violet ring with an up-arrow badge. Cascade lines get their own colours: Horn brass, Fuse Box pink, Arc blue, mark violet (kept apart from the coil and bridge cyans). Horn and Fuse Box show a range preview while dragging. Cannon auto-shots show a small damage number.
