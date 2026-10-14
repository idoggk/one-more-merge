# Pace caps (t-157b3f78)

Why: the pacing investigation (t-75b4d08f) found that free copies make ranks arrive too fast. Kickback twins (a free
twin of a lonely part at ANY rank) are 45-60% of the rank mass added in chapters 3-8 (83% on L40); matchmaker copies add
another 20-35%.

## What it does
- `TUNING.paceCaps` (default **false**, QA row **PACE CAPS**: "Free copies stop above rank 4, so top ranks take longer").
- When on: a plain kickback twin (`planDrop` with `fuse = false`, used by `landDrop`) only copies parts of rank <= `paceCapTwin` (4);
  a matchmaker copy (`matchmakerPick`, ordinary picks and the no-legal-pair rescue) only copies rank <= `paceCapMatch` (4).
- `TUNING.kickbackTwinMaxRank` and `TUNING.matchCopyMax` (both 8 = no change) are the raw caps; the flag lowers them to 4.
- Fuses (`kickbackMaxRank`), the bag, the rescue pair, level `ordinary_copy_rank_cap` and every other mechanic are untouched.
- Flag OFF is byte-identical: the 12 level hashes and the puzzle hash in `tests/golden/flagsOff.json` are unchanged; only `_tuningDigest` moved.

## Proof
`npx vite-node tools/sim-pace-caps.ts --n 20` (thinker bot: best previewed merge every 3 s +-20%, current HP, CALM pace, 20 runs per cell;
never writes levels.json or puzzles.json). "Win time" = mean over won runs; "first rank 6" = mean over runs that reached it.

| Level | Flag | Win rate | Win time (s) | First rank 6 (s) | Reached rank 6 | Reached rank 8 |
|---|---|---|---|---|---|---|
| L15 | OFF | 100% | 63 | 33 | 20/20 | 0/20 |
| L15 | ON | 100% | 63 | 61 | 3/20 | 0/20 |
| L30 | OFF | 100% | 88 | 21 | 20/20 | 0/20 |
| L30 | ON | 100% | 110 | 57 | 20/20 | 0/20 |
| L40 | OFF | 100% | 105 | 52 | 20/20 | 20/20 |
| L40 | ON | 100% | 119 | 66 | 20/20 | 0/20 |
| L45 | OFF | 100% | 93 | 12 | 20/20 | 16/20 |
| L45 | ON | 100% | 113 | 60 | 20/20 | 0/20 |
| L55 | OFF | 100% | 101 | 42 | 20/20 | 20/20 |
| L55 | ON | 85% | 108 | 79 | 20/20 | 0/20 |
| L65 | OFF | 90% | 139 | 60 | 20/20 | 9/20 |
| L65 | ON | 80% | 154 | 60 | 20/20 | 0/20 |
| L75 | OFF | 100% | 118 | 76 | 20/20 | 4/20 |
| L75 | ON | 95% | 145 | 84 | 20/20 | 0/20 |

Reading: rank 8 is never reached with the caps on; first rank 6 comes 4-48 s later (L45 12 s -> 60 s, L30 21 s -> 57 s); wins take
0-22 s longer. Win rate drops on three late levels (L55 -100 -> 85%, L65 90 -> 80%, L75 100 -> 95%), so those need an HP refit if the caps ship.
