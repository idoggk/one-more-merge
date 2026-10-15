# Level pace refit: levels 1-80 to a minimum clear time

Task t-a177b529 (mission m-59b4b6e3). Owner decision (Q#46): a normal level takes about 1 minute early and about 2 minutes later, never seconds.
Built on `docs/design/LEVEL_DURATION.md` (measured clear times, root causes, proposed curve).

## 1. What shipped, and how to look at it

- **Behind a flag, default OFF.** QA panel row **LEVEL PACE 2** (section LEVELS AND TESTS, `levelPace2`). ON = the refitted numbers for the next level you start; OFF = the live levels.
- `src/content/levels.json` and `puzzles.json` are **not changed**, so `tests/flagsOff.test.ts` and `tests/golden/flagsOff.json` pass untouched (the flag lives outside `TUNING`, like `RESOURCE_FLY`, so the golden's TUNING digest does not move either).
- The refit numbers are in `src/content/levelPace2.json`, **written by the tools** (nothing hand-edited): per level `hp`, `minion_hp` (boss / mini-boss stages), `time_seconds` (the clock), `star_times`, and `mania: true` on the 8 MANIA levels. `src/content/levelPace2.ts` swaps them into `LEVELS` in place when the flag is ON and restores the originals when it is OFF.
- Nothing in the model changed: same rules, same bots, same supply. Waves (machine counts) are unchanged on every level, because no tool owns them (see section 5).

## 2. The target and what was met

Floor curve (`tools/pace-lib.ts` `floorFor`), median clear seconds under CALM:

| levels | floor |
|---|---|
| 1-3 | 45 s (tutorial) |
| 4-15 | 60 s |
| 16-30 | ramp 60 -> 90 s |
| 31-50 | ramp 90 -> 120 s |
| 51-80 | 120 s |
| boss (x0) and mini-boss (x8) | +30% |
| MANIA (L5, 15, 25, 35, 45, 55, 65, 75: one per chapter) | about half, never below 30 s |

**Met:** the thinker bot (best previewed merge every 3 s) is at or above the floor on every one of the 80 levels (n = 20 per level, medians of wins). Median over the 72 non-MANIA levels: **thinker 83 s -> 123 s**. Chapter medians (thinker): 43 -> 67, 61 -> 83, 83 -> 95, 80 -> 115, 94 -> 129, 105 -> 142, 102 -> 138, 112 -> 138 s. Level 1-3 went from 24-41 s to 51 s, L4-L15 from 39-74 s to 63-83 s (L5 and L15 are MANIA).

**NOT met: the fast bot (1 s per merge) floor, on all 80 levels.** The fast bot went from a median of 29 s to 46 s on the 72 non-MANIA levels (L1-L6: 9-14 s -> 16-22 s; later chapters 20-64 s -> 31-91 s, bosses included), but it is never at 60 s on L1-15 or 120 s on L50+. Why, measured, not guessed:

- Clear time grows far slower than HP. L1 with the clock lifted: x1 HP = 25 s thinker / 9 s fast; x2 = 39 / 14; x4 = 56 / 20; x8 = 84 / 30 (one-off probe script, not committed, n = 10). The fast bot needs roughly x16-x30 HP to reach 45 s, which would put the thinker at 110-160 s on level 1. Same shape on L5 and L15.
- So HP alone cannot give a 1 s/merge player 60 s without giving a 3 s/merge player 2.5-3 minutes, and the fast bot cannot be below the thinker's time x 1/3 for the same HP (the 3:1 merge rate).
- Decision taken: the **thinker floor is the hard constraint**; the fast bot is pushed up only while the thinker stays under 1.15x its floor (`THINKER_CEIL`). A real fix for the fast tapper needs a mechanic that is independent of merge speed (a slower supply, a per-machine minimum hit count through a lower `cascadeCap`, a boss `bossCap` via `tools/effort-fit.ts`, or more waves). Those are code or tuning changes, outside "tools only", and left as a follow-up.

**Other levels not fully inside the target**
- **MANIA goal levels L15 (rank 5), L65 (chain 10), L75 (chain 12)** cannot be made short by HP: the goal machine sets the time (thinker 43 / 87 / 73 s, floor 30 / 60 / 60). They are as intense as the goal allows.
- **L24 (rank 6): thinker win 70%** (it was 75% before; the rank-6 goal, not HP, decides it). **L57: thinker win 85%** at the new HP. All other levels: thinker win >= 85% (most 100%).
- **Casual bot (random merge every 2.5 s) loses more often** on some high-HP levels (it is not a fit target; the fit holds the thinker): L14 30%, L16 40%, L30 25%, L46 55%, L67 45%, L73 55%, L76 55% win (n = 20). Worth a look before the flag goes live.
- Late bosses and mini-bosses run 161-211 s for the thinker (floor 156 s = 120 s +30%), the clock is 285 s.
- L73 needed x12.7 total HP to move from a 54 s to a 136 s thinker clear (it had the lowest effective rate of the late levels).
- Star lines (`star_times`, 2 stars = casual median, 3 stars = thinker median; L1-10 use the generous chapter-1 rule) were re-derived on the new numbers with `tools/star-times.ts --pace2 --write`, so they follow the new clocks (L1 36/32 s -> 68/64 s).

## 3. Method (what the tools do now)

1. `tools/pace-lib.ts` (new, pure, tested in `tests/levelPace2.test.ts`): the floor curve, clock rule (about 1.8x the floor, steps of 5 s, never below today's except MANIA), and the search `fitK`: smallest HP multiplier where the thinker's median reaches 1.03x the floor (HP is only raised; MANIA levels may go down to x0.15), then, if the fast bot is below the floor, a larger multiplier while the thinker stays under 1.15x the floor.
2. `tools/sim-levels.ts --pace2` (the median-clear-time floor constraint the doc asked for): plays the real model with the same bots and think-time jitter as `level-report`, n = 10 per candidate on held-out seeds (`level*1009 + i*7919 + 100000`), requires the thinker to win >= 80% in the search and >= 85% at the end (otherwise the clock grows 15% up to 4 times), and writes `levelPace2.json` only.
3. `tools/star-times.ts --pace2 --write` re-derives the star lines (n = 20 here; default is 40).
4. `tools/level-report.ts --pace2` and `tools/level-duration.ts --pace2` measure the result (the before/after tables below; seeds `level*1009 + i*7919`, n = 20 per bot).
5. `tools/fit-goals.ts` was **not** re-run: goal levels kept their `goal.n`; the thinker still wins them (see the table) and the doc's note that their losses are goal-limited holds.

## 4. Before / after (CALM, n = 20 per bot, medians of wins, seconds)

`before` = live `levels.json`; `after` = flag ON. Win rate is the thinker's. "total HP" sums the machines of the stage (goal levels: the HP machines before the goal). The fast column is the 1 s/merge bot. Noise: the thinker's median moves about +-1-7 s between runs (LEVEL_DURATION.md section 2), so +-5% at the floor is inside the noise; a handful of levels (L34, L50, L56-58) sit 5-30% above the floor for that reason and because the search keeps a margin.

| L | kind | floor s | waves | total HP before | total HP after | clock s | thinker s (win) before | thinker s (win) after | fast s before | fast s after | 2/3 star s before | 2/3 star s after | note |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | normal | 45 | 1 | 1000 | 3500 | 45->85 | 24 (100%) | 51 (100%) | 9 | 18 | 36/32 | 68/64 | fast < floor |
| 2 | normal | 45 | 1 | 800 | 3150 | 45->85 | 28 (100%) | 51 (100%) | 9 | 18 | 36/32 | 68/61 | fast < floor |
| 3 | normal | 45 | 2 | 2800 | 4500 | 70->85 | 41 (100%) | 51 (100%) | 13 | 16 | 56/52 | 68/63 | fast < floor |
| 4 | rank4 | 60 | 2 | 2600 | 7150 | 70->110 | 43 (100%) | 66 (100%) | 14 | 22 | 56/51 | 88/81 | fast < floor |
| 5 | normal | 30 | 2 | 2500 | 1450 | 70->60 | 40 (100%) | 33 (100%) | 14 | 11 | 56/49 | 48/40 | MANIA, fast < floor |
| 6 | normal | 60 | 2 | 3300 | 10700 | 70->110 | 39 (100%) | 67 (100%) | 12 | 21 | 56/49 | 88/82 | fast < floor |
| 7 | rank4 | 60 | 3 | 5000 | 7250 | 95->110 | 56 (100%) | 70 (100%) | 21 | 25 | 76/66 | 88/80 | fast < floor |
| 8 | mini | 78 | 3 | 4800 | 17000 | 95->145 | 46 (100%) | 87 (100%) | 14 | 29 | 76/68 | 116/112 | fast < floor |
| 9 | normal | 60 | 3 | 5199 | 5650 | 95->110 | 63 (100%) | 69 (100%) | 22 | 23 | 76/72 | 88/81 | fast < floor |
| 10 | boss | 78 | 3 | 4500 | 10700 | 95->145 | 57 (100%) | 91 (100%) | 15 | 27 | 76/69 | 116/97 | fast < floor |
| 11 | normal | 60 | 3 | 9150 | 9150 | 95->110 | 74 (100%) | 74 (100%) | 24 | 24 | 76/72 | 87/76 | fast < floor |
| 12 | rank4 | 60 | 3 | 7900 | 9800 | 95->110 | 59 (100%) | 63 (100%) | 20 | 22 | 70/60 | 76/65 | fast < floor |
| 13 | normal | 60 | 3 | 8850 | 11850 | 95->110 | 61 (100%) | 70 (100%) | 21 | 23 | 71/61 | 83/72 | fast < floor |
| 14 | chain12 | 60 | 3 | 5200 | 16550 | 95->110 | 55 (100%) | 83 (100%) | 20 | 28 | 64/54 | 88/84 | fast < floor, casual win 30% |
| 15 | rank5 | 30 | 3 | 7850 | 1300 | 95->60 | 59 (100%) | 43 (100%) | 32 | 9 | 71/61 | 48/44 | MANIA, fast < floor |
| 16 | rank5 | 62 | 3 | 8750 | 24000 | 95->115 | 49 (100%) | 85 (100%) | 28 | 22 | 66/51 | 92/80 | fast < floor, casual win 40% |
| 17 | normal | 64 | 3 | 7950 | 8600 | 95->120 | 71 (100%) | 73 (100%) | 22 | 23 | 76/72 | 87/75 | fast < floor |
| 18 | mini | 86 | 3 | 8700 | 31300 | 95->155 | 54 (100%) | 96 (100%) | 26 | 36 | 71/54 | 124/98 | fast < floor |
| 19 | normal | 68 | 3 | 9801 | 17750 | 95->125 | 66 (100%) | 84 (100%) | 23 | 29 | 76/66 | 98/77 | fast < floor |
| 20 | boss | 91 | 4 | 12800 | 29600 | 125->165 | 69 (100%) | 96 (100%) | 22 | 36 | 95/71 | 132/96 | fast < floor |
| 21 | rank6 | 72 | 4 | 19200 | 19200 | 125->130 | 83 (100%) | 83 (100%) | 29 | 29 | 96/83 | 96/83 | fast < floor |
| 22 | normal | 74 | 4 | 18550 | 18550 | 125->135 | 95 (100%) | 95 (100%) | 32 | 32 | 100/96 | 108/96 | fast < floor |
| 23 | chain12 | 76 | 4 | 4851 | 6201 | 125->140 | 59 (95%) | 81 (85%) | 43 | 45 | 72/59 | 94/80 | fast < floor |
| 24 | rank6 | 78 | 4 | 20300 | 36000 | 125->170 | 96 (75%) | 121 (70%) | 34 | 51 | 87/72 | 110/93 | fast < floor, thinker win < 85% |
| 25 | normal | 40 | 4 | 20950 | 3150 | 125->75 | 94 (100%) | 45 (100%) | 33 | 15 | 100/96 | 53/45 | MANIA, fast < floor |
| 26 | rank6 | 82 | 4 | 17750 | 40950 | 125->150 | 66 (100%) | 86 (100%) | 24 | 46 | 93/68 | 117/84 | fast < floor |
| 27 | chain11 | 84 | 4 | 6900 | 13100 | 125->155 | 82 (90%) | 90 (95%) | 54 | 54 | 80/67 | 105/89 | fast < floor |
| 28 | mini | 112 | 4 | 27500 | 60300 | 125->205 | 72 (100%) | 132 (100%) | 37 | 40 | 91/74 | 154/133 | fast < floor |
| 29 | chain10 | 88 | 4 | 16599 | 20600 | 125->160 | 96 (85%) | 103 (90%) | 33 | 37 | 100/91 | 114/98 | fast < floor |
| 30 | boss | 117 | 5 | 49900 | 199600 | 165->215 | 89 (100%) | 131 (100%) | 30 | 60 | 122/88 | 172/131 | fast < floor, casual win 25% |
| 31 | normal | 92 | 4 | 30000 | 38300 | 125->170 | 70 (100%) | 108 (100%) | 23 | 39 | 84/71 | 127/110 | fast < floor |
| 32 | chain11 | 93 | 4 | 11150 | 31350 | 125->170 | 84 (95%) | 107 (100%) | 54 | 35 | 97/84 | 124/107 | fast < floor |
| 33 | normal | 95 | 4 | 24550 | 54100 | 125->175 | 72 (100%) | 109 (100%) | 23 | 36 | 80/67 | 128/110 | fast < floor |
| 34 | rank7 | 96 | 4 | 21399 | 39900 | 125->175 | 93 (100%) | 151 (100%) | 22 | 57 | 100/94 | 140/136 | fast < floor |
| 35 | normal | 49 | 4 | 22050 | 9050 | 125->90 | 111 (95%) | 52 (100%) | 36 | 16 | 100/96 | 61/52 | MANIA, fast < floor |
| 36 | rank6 | 99 | 4 | 22101 | 41601 | 125->180 | 66 (100%) | 115 (100%) | 24 | 40 | 85/66 | 132/114 | fast < floor |
| 37 | normal | 101 | 4 | 14800 | 50050 | 125->185 | 78 (100%) | 114 (100%) | 25 | 46 | 89/76 | 141/113 | fast < floor |
| 38 | mini | 133 | 4 | 23200 | 104599 | 125->240 | 80 (100%) | 155 (100%) | 20 | 49 | 92/78 | 182/158 | fast < floor |
| 39 | normal | 104 | 4 | 28950 | 33100 | 125->190 | 104 (95%) | 117 (100%) | 36 | 47 | 100/96 | 137/118 | fast < floor |
| 40 | boss | 137 | 5 | 46300 | 120600 | 165->250 | 110 (100%) | 161 (100%) | 40 | 59 | 124/107 | 190/164 | fast < floor |
| 41 | chain11 | 107 | 5 | 61400 | 80500 | 165->195 | 110 (100%) | 119 (100%) | 38 | 42 | 126/109 | 137/117 | fast < floor |
| 42 | chain12 | 108 | 5 | 33650 | 79550 | 165->195 | 89 (95%) | 123 (90%) | 33 | 42 | 106/89 | 144/122 | fast < floor |
| 43 | rank7 | 110 | 5 | 45550 | 45550 | 165->200 | 128 (80%) | 129 (95%) | 64 | 64 | 132/125 | 151/131 | fast < floor |
| 44 | chain7 | 111 | 5 | 35200 | 55050 | 165->230 | 94 (85%) | 118 (90%) | 36 | 52 | 115/98 | 144/121 | fast < floor |
| 45 | normal | 56 | 4 | 34150 | 20400 | 125->105 | 79 (100%) | 56 (100%) | 39 | 31 | 92/79 | 68/57 | MANIA, fast < floor |
| 46 | rank6 | 114 | 5 | 99300 | 272250 | 165->210 | 71 (100%) | 119 (100%) | 21 | 41 | 114/72 | 168/133 | fast < floor, casual win 55% |
| 47 | normal | 116 | 4 | 26600 | 69000 | 125->210 | 88 (90%) | 129 (100%) | 32 | 45 | 100/87 | 154/133 | fast < floor |
| 48 | mini | 152 | 5 | 104400 | 372600 | 165->275 | 85 (100%) | 167 (100%) | 31 | 65 | 119/89 | 220/166 | fast < floor |
| 49 | normal | 119 | 4 | 34800 | 53250 | 125->215 | 117 (80%) | 134 (100%) | 40 | 53 | 100/96 | 159/137 | fast < floor |
| 50 | boss | 156 | 5 | 85900 | 125500 | 165->285 | 159 (90%) | 190 (100%) | 59 | 72 | 132/128 | 220/191 | fast < floor |
| 51 | chain12 | 120 | 5 | 70600 | 223000 | 165->220 | 59 (100%) | 121 (100%) | 41 | 45 | 96/59 | 167/123 | fast < floor |
| 52 | normal | 120 | 4 | 22500 | 48300 | 125->220 | 106 (100%) | 136 (100%) | 45 | 59 | 100/96 | 159/137 | fast < floor |
| 53 | rank7 | 120 | 5 | 83750 | 208250 | 165->220 | 84 (100%) | 142 (100%) | 23 | 33 | 117/75 | 176/139 | fast < floor |
| 54 | chain8 | 120 | 5 | 38100 | 38100 | 165->220 | 134 (100%) | 134 (100%) | 50 | 50 | 132/128 | 163/141 | fast < floor |
| 55 | normal | 60 | 4 | 30650 | 14250 | 125->110 | 101 (100%) | 81 (100%) | 35 | 23 | 100/96 | 88/81 | MANIA, fast < floor |
| 56 | rank7 | 120 | 5 | 26150 | 77150 | 165->220 | 76 (100%) | 149 (100%) | 57 | 46 | 122/105 | 168/146 | fast < floor |
| 57 | normal | 120 | 4 | 37050 | 216000 | 125->220 | 76 (100%) | 156 (85%) | 23 | 72 | 88/75 | 176/164 | fast < floor |
| 58 | mini | 156 | 5 | 75800 | 268800 | 165->285 | 105 (100%) | 191 (100%) | 35 | 91 | 123/106 | 228/181 | fast < floor |
| 59 | normal | 120 | 4 | 39800 | 52100 | 125->220 | 113 (95%) | 136 (100%) | 43 | 50 | 100/96 | 155/133 | fast < floor |
| 60 | boss | 156 | 5 | 107200 | 406700 | 165->285 | 107 (100%) | 181 (100%) | 29 | 57 | 127/110 | 228/188 | fast < floor |
| 61 | normal | 120 | 4 | 19400 | 62450 | 125->220 | 73 (100%) | 134 (100%) | 25 | 47 | 86/73 | 160/138 | fast < floor |
| 62 | rank6 | 120 | 5 | 52350 | 154600 | 165->220 | 102 (100%) | 129 (100%) | 34 | 45 | 123/106 | 176/127 | fast < floor |
| 63 | normal | 120 | 4 | 28800 | 136750 | 125->220 | 63 (100%) | 133 (100%) | 21 | 47 | 93/63 | 175/135 | fast < floor |
| 64 | normal | 120 | 4 | 26500 | 63050 | 125->220 | 117 (100%) | 138 (100%) | 39 | 46 | 100/96 | 161/139 | fast < floor |
| 65 | chain10 | 60 | 5 | 36400 | 8300 | 165->110 | 132 (85%) | 87 (100%) | 52 | 22 | 132/128 | 88/84 | MANIA, fast < floor |
| 66 | normal | 120 | 4 | 21450 | 59450 | 125->220 | 85 (100%) | 144 (100%) | 29 | 49 | 98/85 | 169/147 | fast < floor |
| 67 | rank7 | 120 | 5 | 56300 | 229350 | 165->220 | 113 (100%) | 139 (100%) | 33 | 56 | 129/110 | 176/139 | fast < floor, casual win 45% |
| 68 | mini | 156 | 5 | 46400 | 236100 | 165->285 | 107 (100%) | 190 (100%) | 39 | 59 | 125/108 | 225/176 | fast < floor |
| 69 | normal | 120 | 4 | 15750 | 93200 | 125->220 | 90 (100%) | 137 (100%) | 29 | 54 | 100/92 | 175/138 | fast < floor |
| 70 | boss | 156 | 5 | 45200 | 177400 | 165->285 | 105 (100%) | 195 (100%) | 28 | 85 | 124/96 | 221/185 | fast < floor |
| 71 | normal | 120 | 4 | 21350 | 43500 | 125->220 | 78 (100%) | 134 (100%) | 25 | 49 | 92/79 | 155/133 | fast < floor |
| 72 | chain12 | 120 | 5 | 33950 | 95000 | 165->220 | 119 (85%) | 122 (100%) | 35 | 36 | 130/113 | 167/125 | fast < floor |
| 73 | normal | 120 | 4 | 21950 | 279300 | 125->220 | 54 (100%) | 136 (100%) | 18 | 48 | 74/55 | 176/137 | fast < floor, casual win 55% |
| 74 | rank7 | 120 | 5 | 34400 | 34400 | 165->220 | 143 (100%) | 143 (100%) | 50 | 50 | 132/128 | 167/145 | fast < floor |
| 75 | chain12 | 60 | 5 | 55100 | 8600 | 165->130 | 116 (95%) | 73 (95%) | 39 | 26 | 132/117 | 89/76 | MANIA, fast < floor |
| 76 | normal | 120 | 4 | 41250 | 286900 | 125->220 | 79 (100%) | 139 (100%) | 26 | 49 | 94/81 | 176/139 | fast < floor, casual win 55% |
| 77 | normal | 120 | 4 | 24150 | 29950 | 125->220 | 112 (90%) | 138 (100%) | 45 | 47 | 100/96 | 160/138 | fast < floor |
| 78 | mini | 156 | 5 | 69900 | 181200 | 165->285 | 111 (100%) | 170 (100%) | 36 | 51 | 132/112 | 226/181 | fast < floor |
| 79 | rank7 | 120 | 5 | 36700 | 40900 | 165->220 | 136 (100%) | 136 (90%) | 43 | 54 | 132/128 | 161/139 | fast < floor |
| 80 | boss | 156 | 5 | 62700 | 215100 | 165->285 | 135 (95%) | 211 (100%) | 30 | 55 | 132/128 | 228/202 | fast < floor |

thinker under its floor: none; fast bot under its floor: 80 of 80 levels
non-MANIA medians of the 72 levels: thinker 83 -> 123 s, fast 29 -> 46 s

| chapter | thinker before | thinker after | fast before | fast after | casual before | casual after |
|---|---|---|---|---|---|---|
| 1 | 43 | 67 | 14 | 22 | 50 | 71 |
| 2 | 61 | 83 | 22 | 24 | 71 | 92 |
| 3 | 83 | 95 | 33 | 45 | 86 | 95 |
| 4 | 80 | 115 | 24 | 46 | 85 | 118 |
| 5 | 94 | 129 | 36 | 52 | 116 | 129 |
| 6 | 105 | 142 | 41 | 50 | 102 | 185 |
| 7 | 102 | 138 | 29 | 49 | 91 | 176 |
| 8 | 112 | 138 | 35 | 49 | 121 | 180 |

## 5. Reproduce

```
git rev-parse HEAD                      # code commit of this task (data = master e79e451 + this branch)
npm install
# fit (8 parallel ranges, about 7 min on 8 cores), then join and derive the stars
npx vite-node tools/sim-levels.ts --pace2 --from 1 --to 10 --n 10 --pace2-out <dir>/p2_0.json     # ... 11-20 .. 71-80
npx vite-node tools/sim-levels.ts --pace2-merge <dir>/p2_0.json,...,<dir>/p2_7.json                # writes src/content/levelPace2.json
npx vite-node tools/star-times.ts --pace2 --write --n 20 --only 1,2,3,4,5,6,7,8,9,10               # ... per range
# measure
npx vite-node tools/level-report.ts --from 1 --to 80 --n 20 --nplan 1 --pace calm --out <dir>             # before
npx vite-node tools/level-report.ts --from 1 --to 80 --n 20 --nplan 1 --pace calm --pace2 --out <dir>     # after (files tagged calm+pace2)
npx vite-node tools/level-duration.ts --dir <dir> --pace2                                                 # duration table
npm test && npm run typecheck && node tools/smoke-levels.mjs 1 80 4                                       # checks (smoke: flag OFF)
```
Seeds are fixed (search `level*1009 + i*7919 + 100000`, report `level*1009 + i*7919`), so the runs repeat. The fit ranges can run alone; the star step writes one file, so run its ranges one after another or check afterwards that all 80 entries have `star_times`.

## 6. Limits (what this does not say)

- Scripted players with perfect board knowledge and no thumb latency; no tools, items or boosters (they only shorten levels). Whether the owner plays like the 1 s/merge bot is unknown: that bot is still at 16-22 s on L1-6 under this flag. Real times need a playtest.
- The fit uses n = 10 per candidate; the report n = 20. The thinker's median has a +-1-7 s spread, so single-level differences of a few seconds are noise.
- Only CALM was fitted and measured (the shipped pace). TODAY and MANIA pace were not.
- MANIA levels are marked in the data (`mania: true`) but **not labelled on the road yet** (UI work, not done here).
- Smoke test (`tools/smoke-levels.mjs 1 80 4`) ran with the flag OFF (default): 80 levels, no errors. It was not run with the flag ON; the flag ON path is covered by the model tests and the bot runs above.

## 7. Follow-ups

- Decide how to hold the fast tapper (a mechanic independent of merge speed: `cascadeCap` / `bossCap`, supply rate, or more waves per level), or accept 20-45 s for a 1 s/merge player.
- Label MANIA levels on the road.
- Review the casual-bot win rates listed above, and L24 / L57, before turning the flag on by default.
- When the flag goes live: merge `levelPace2.json` into `levels.json` and regenerate the golden on purpose (`OMM_UPDATE_GOLDEN=1`).
