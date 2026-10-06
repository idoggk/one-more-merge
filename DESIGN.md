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
- **Playtest kit**: local event log (pause → export playtest log) + PLAYTEST.md observation script.

## Meta plan (ChatGPT, after playtest) — discovery challenges, not calendar gates
1 relay→cannon: Practice Bench (sandbox) · 2 all 3 families in one chain: Corner Bench (board mask) ·
3 two payload cannons in one chain: **Magnet** · 4 magnet makes a match: **Battery** · 5 battery discharge in a win: **Fan** ·
6 fan push makes a match: Mad Fridge Remix · 7 win with a new toy + all originals: Blueprint Bench.
Unlocks are optional loadout picks; no Bolts / +% damage until players show demand.

## Open experiments
- Kickback: fuse-on-landing vs plain drops (ChatGPT's request), measure player reactions.
- Pull-supply tray (tap to release a matching pair, 5 charges) vs auto-supply at equal rank mass.
- Full-board connectivity: novice median chain 29 = packed board fires everything. Watch for "hoarding beats merging".
- Wild ideas parked: fridge door becomes your cannon; bass-drop bell sweep on beat; Junkzilla rebuilt
  into your machine on the win screen; mega-cannon recoil causing accidental matches.
