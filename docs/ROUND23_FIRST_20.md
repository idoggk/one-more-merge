# Round 23 — first 20 levels for variety (ChatGPT spec, condensed)

Ido (played to L11): fun; L1-10 felt samey; a bit easy; boss L10 fun but attack not understood. Wants L1-10 near-sure wins, ramp after.

| L | Monster | One new thing | Goal | Modifier / behaviour | Tag |
|---|---|---|---|---|---|
| 1-3 | existing | existing teaching | defeat | existing | Normal |
| 4 | Tin Can | build one bigger machine | MAKE RANK 4 | none | Normal |
| 5 | Mad Fridge | connect machines deliberately | CHAIN x6 | none | Normal |
| 6 | Toaster Twins | Rocket joins the bag | defeat | core trio + Rocket | Normal |
| 7 | Tin Can | build around missing corners | MAKE RANK 4 | CORNERS | Normal |
| 8 | Mad Fridge | a chain opens its shield | defeat | CHAIN SHIELD | Normal |
| 9 | Vacuum Viper | move a threatened piece | defeat | SUCTION (light) | Normal |
| 10 | Tin Can King | first boss, guided first clamp | defeat | CLAMP | Boss |
| 11 | Toaster Twins | relief, bigger start board | CHAIN x8 | Rocket kept | Normal |
| 12 | Tin Can | Magnet creates a match | MAKE RANK 4 | starting Magnet | Normal |
| 13 | Mad Fridge | shield + Rocket payloads | defeat | CHAIN SHIELD | Normal |
| 14 | Vacuum Viper | protect pieces while chaining | CHAIN x8 | SUCTION (light) | Hard |
| 15 | Piano-saurus | two gaps | MAKE RANK 5 | GAPS | Normal |
| 16 | Tin Can | relief, higher-rank payoff | MAKE RANK 5 | two rank-3 pairs at start | Normal |
| 17 | Mad Fridge | Battery boosts a cannon | defeat | starting Battery beside a cannon | Normal |
| 18 | Toaster Twins | chain around gaps | CHAIN x10 | GAPS, Rocket | Normal |
| 19 | Mad Fridge | frozen rows | defeat | FROST ROW (light) | Hard |
| 20 | Fridge Overlord | boss | defeat | boss FROST | Boss |

Difficulty (random-3s bot): L4-9 97%, L10 95%, relief L11/L16 95%, other ch.2 normals 90%, L14/L19 Hard 80%, L20 85%.

## Goals
- **Make rank N**: a player-committed merge creates rank >= N (any family). Starters, deliveries, kickback fuses don't count. Win settles after that merge's cascade. HUD: "MAKE RANK 5 · 4/5" where the HP bar lives.
- **Chain xN**: one cascade rooted in a player merge activates >= N unique gadgets (engine count incl. root). HUD: "CHAIN x8 · BEST x6".
- Goal levels: monster has no finite HP (bar + damage numbers hidden, reactions stay); HP-triggered kickback off. Win banner "RANK 5 BUILT!" / "CHAIN x8!". Stars: explicit 2/3-star deadlines from goal-aware bots.

## Twists
- CORNERS: mask (0,0),(0,4),(5,0),(5,4). GAPS: mask (2,1),(2,3) (ordinary missing cells).

## Behaviours
1. **Chain shield** (Fridge): damage x0.75 while closed; a player-rooted cascade with >= 4 activations opens it for 6 s (that whole cascade counts at x1); later qualifying cascades refresh. Card: "Chains of 4 open its shield." HUD: "CHAIN x4 TO OPEN" / "OPEN · 5.2s".
2. **Suction (light)**: first warning 10 s, then every 15 s, 2.5 s telegraph, one target = lowest-rank occupied (row-major tie), skip if < 4 gadgets; empty target whiffs.
3. **Clamp**: boss rules; the clamped piece still fires in chains. Lane "CLAMPED · cannot move · 2.0s".
4. **Frost row (light)**: warning 10 s, every 15 s, 2.5 s telegraph, active 2 s; row with most empty cells (lowest-row tie).

## Guided first boss attack (L10)
At the first warning pause; spotlight the target + one adjacent empty cell (or a legal merge destination) with a repeating arrow: "Move this machine out of the marked cell." Accept only that action (real engine action). Resume the full telegraph; clamp closes on the empty cell; lane "SAFE! The clamp missed." Lesson complete only after the action.
