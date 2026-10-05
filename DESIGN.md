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

## Open experiments
- Kickback: fuse-on-landing vs plain drops (ChatGPT's request), measure player reactions.
- Pull-supply tray (tap to release a matching pair, 5 charges) vs auto-supply at equal rank mass.
- Full-board connectivity: novice median chain 29 = packed board fires everything. Watch for "hoarding beats merging".
- Wild ideas parked: fridge door becomes your cannon; bass-drop bell sweep on beat; Junkzilla rebuilt
  into your machine on the win screen; mega-cannon recoil causing accidental matches.
