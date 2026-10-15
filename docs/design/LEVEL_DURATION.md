# Level duration: how long do levels 1-80 really take?

Task t-7ab374d3 (mission m-0f7b78b6). Owner: "even the first levels finish in SECONDS. A level can be easy but cannot be seconds."
Read-only measurement. No gameplay, `levels.json` or `puzzles.json` was changed. The only new file besides this one is `tools/level-duration.ts` (read-only table printer).

## 0. Question and the number reported (stated before measuring)

- Question: how many seconds of game time does a CALM-pace bot need to clear each saga level, and why?
- Reported number: **median clear time in seconds** over 20 seeded runs per bot per level (wins only), for three bots of different speed, plus total enemy HP and HP per second. Flag: **under 45 s**.
- Expectation: the first chapters are short for a fast player; the clock (45-165 s) is a ceiling, not a floor, so nothing stops a fast player finishing in a fraction of it.

**Scope note: the game has 80 saga levels, not 100.** `src/content/levels.json` has `levels.length = 80` (8 chapters of 10, boss on every 10th). There is no level 81-100, so "a sample up to the last level" is simply all 80. The other level families are not saga levels and were not timed: `puzzles.json` (40 daily puzzles + drills), `yards.json` (10 yards), `budgetLevels.json` (3 merge-budget levels), `rush.json` (boss rush).

## 1. What was measured and what was estimated

**Measured (the game's own code, not a copy of its rules)**
- `tools/level-report.ts` plays every level through the real model (`newLevel` / `drop` / `tick`, 50 ms ticks) under the shipped **CALM** pace, with three scripted players. Time is simulated game seconds from level start to the `won` phase.
  - `rand25`: any legal merge, every 2.5 s ±20% (a casual player who does not look).
  - `smart3`: the best previewed merge, every 3 s ±20% (a thinking player).
  - `smart1`: the best previewed merge, every 1 s ±20% (a fast tapper; the closest thing to "seconds").
  - (`plan3`, a 2-ply planner, is in the CSV but not tabled; it tracks smart3.)
- Every level: n = 20 seeds per bot (planner n = 4). Seeds are fixed (`level*1009 + i*7919`), so the run is deterministic.
- Static shape per level (machines, total HP, clock) comes from `newLevel()` through `tools/level-duration.ts`.

**Estimated / derived (inference, labelled)**
- HP per second = total HP ÷ smart3 median clear time. It is an effective damage rate of the whole team including passive fire and cascades, not a rating of any unit.
- "Waves" in this game are *machines in a row on one board and one clock* (`def.waves`; boss levels add the boss as the last machine). A level with `waves` unset is one machine. Wave k+1 appears when machine k breaks, after a 2.5 s CALM breather; there is no wave timer. So "spawn time" of wave k is simply "when wave k-1 died + 2.5 s", it cannot be earlier or later. Parts for the player arrive every 1.7 s (first quarter of the clock), 1.9, 2.1, 2.4 s (`supply_seconds`), plus extra parts earned per merge (reactive supply).
- The "min clear time" curve in section 5 is a recommendation, not a measurement.

**Not measured**
- Real people. These are scripted players with perfect board knowledge and no thumb latency. Whether the owner's "seconds" means a 1 s/merge tapper is a guess; the numbers show that a player at that speed would see 9-40 s.
- Time outside the sim: intro, tutorial popups, result screen, animations (animations never pause the simulation, but modals do).
- Tools, items, kits, capsules and boosters: the bots never use them (the item tray is ignored; perk offers take option 1). They can only make levels shorter, so the real numbers are probably at or below these.
- PACE `today` and `mania` were not timed (only the shipped CALM). Browser smoke (`tools/smoke-levels.mjs`) was read and not used for timing: it runs a 300 ms merge bot in Chrome and only prints the phase/HP after a fixed wait, with no clear time (and `FASTKILL` forces HP to 1).
- Spread inside one level (p10/p90) is not in the CSV; only medians are.

## 2. Reproduce

```
git rev-parse HEAD                       # commit of the tool; game data = master a157f3d
npm install
npx vite-node tools/level-report.ts --from 1 --to 80 --n 20 --nplan 4 --pace calm --out <dir>
npx vite-node tools/level-duration.ts --dir <dir> [--min 45] [--bot smart3]     # prints the table in section 4
```
Runtime about 3 minutes on the dev machine. Node v24.19.0, vite-node from `package.json`.

**Noise checks**
- Determinism: L1-12 re-run, CSV columns 1-40 byte-identical (diff empty).
- Sample size: L1-30 re-run with n = 40 (the first 20 seeds are shared, so this is not independent). Difference of medians n=20 vs n=40: smart1 median 0.05 s, max 1.25 s; rand25 median 0.95 s, max 6.9 s; smart3 median 0.35 s, max 18.8 s (one level; the thinker's time on goal/boss levels is jumpy). So smart1 numbers are stable to about ±1 s, smart3/rand25 about ±1-7 s, with a rare large outlier.
- Win rates: smart1 won 100% of runs on every level (20/20). rand25 and smart3 never fell below 75%. Clear times are medians of wins, so they flatter the slow bots on the hardest levels.

## 3. Findings in plain words

Counting levels with a median clear under 45 s (of 80):

| player | under 45 s | under 30 s | under 20 s | min | median | max |
|---|---|---|---|---|---|---|
| casual (rand, 2.5 s/merge) | 5 | 1 | 0 | 26.9 s | 89.6 s | 138.3 s |
| thinker (smart, 3 s/merge) | 6 | 2 | 0 | 24.2 s | 83.6 s | 159.0 s |
| fast tapper (smart, 1 s/merge) | **71** | **39** | **10** | 9.0 s | 30.4 s | 64.4 s |

Median per chapter (levels 10c-9 to 10c), casual / thinker / fast tapper, seconds:

| chapter | casual | thinker | fast tapper | clock |
|---|---|---|---|---|
| 1 (L1-10) | 50 | 43 | 14 | 70 |
| 2 (L11-20) | 71 | 61 | 23 | 95 |
| 3 (L21-30) | 90 | 89 | 33 | 125 |
| 4 (L31-40) | 85 | 84 | 25 | 125 |
| 5 (L41-50) | 116 | 94 | 38 | 165 |
| 6 (L51-60) | 102 | 105 | 41 | 165 |
| 7 (L61-70) | 106 | 105 | 33 | 165 |
| 8 (L71-80) | 127 | 116 | 36 | 165 |

So: a slow or thinking player is fine from level 7 on (L1-6 are 24-50 s even for them, and L1-2 are 24-32 s). A **fast tapper clears level 1 in 9 s, level 2 in 9 s, levels 3-6 in 12-14 s, and even the chapter bosses in 15-59 s**. The owner is playing like the fast tapper. Only 9 of 80 levels hold the fast tapper past 45 s (L27 54 s, L32 54 s, L43 64 s, L50 59 s, L54 50 s, L56 57 s, L65 52 s, L74 50 s, L52 45 s).

### Root causes

1. **Nothing sets a minimum.** Every number in the level data is a *ceiling* (clock 45-165 s) or a *win-rate target*: `tools/sim-levels.ts` fits HP so a bot wins 85-95% (Normal) before the clock runs out. Duration is the by-product. Clear time is almost exactly proportional to how fast the player merges (fast tapper is about 1/3 of the thinker's time, matching the 3:1 merge-rate ratio), so a quicker player gets a proportionally shorter level, with no lower bound.
2. **HP is low for the damage the team does, in the early levels.** L1 has 1000 HP on one machine, L2 800 HP. The effective team rate is 29-41 HP/s for the thinker, which clears them in 24-28 s; the fast tapper does it in 9 s (about 9 merges). L3-L6 are 2 machines of 2500-3300 HP total, 12-14 s for the fast tapper. These are tutorial-type levels (`teach` boards, `no_kickback`) deliberately small, and the fit left them small.
3. **Per-hit cap gives only a weak floor.** A hit is capped at 35% of the machine's max HP (`TUNING.cascadeCap = 0.35`), so one machine needs at least 3 player hits (about 3 s for a 1 s/merge player). That floor is far below the measured times, so it never binds in the early game. It does bind on high-HP levels: L46 (99,300 HP), L48 (104,400), L51 (70,600), L53 (83,750) are *cleared by the fast tapper in 21-41 s*, with effective rates of 1000-1400 HP/s: huge cascades and the cap, not HP, decide those levels. Raising HP there changes little.
4. **Waves are not a timeline.** A level has 1-5 machines (L1-2: 1; L3-6: 2; L7-19: 3; L20+: 4-5). Each next machine appears 2.5 s after the previous breaks, so waves add only a few seconds of breather plus a 30% HP ramp per machine; they cannot stretch a level for a fast player. Spawn times simply follow the kills (see the machines column).
5. **Goal levels are not shorter by design, but several are small.** Rank/chain goal levels end on a goal machine, but where the HP machines in front are small (L23: 4,851 HP, 43 s for the fast tapper; L14: 5,200 HP; L4: 2,600 HP) the goal is reached in the first moments. Chain levels with big goals (chain 11 on L27/L32) are the ones that *do* hold a fast player (54 s), for the right reason: they need setup.
6. **Boss levels do not add time.** L10 is three machines, 4,500 HP: the fast tapper 15 s, the thinker 57 s. L20 12,800 HP: 22 s. L30 49,900 HP: 30 s. The boss is a mini-event for a fast player, not a fight.
7. **Tools and perks (not measured, direction known).** Overdrive, capsules, items and perk picks all add damage; the bots use none, so real clear times are likely at or below the table.
8. **The clock tells the player the wrong thing.** A 70 s clock with a 9-14 s clear invites the feeling that the level is trivial; star lines (`star_times`) are set from the 2.5 s/3 s bots (e.g. L1 36 s / 32 s), so a fast tapper 3-stars L1-L6 with a huge margin (the level-report flag "3STAR_FREE" appears on L2-L5).

## 4. Table: levels 1-80 (CALM, n = 20 per bot)

Columns: `machines` = HP machines in the stage (including the boss or the goal machine); `total HP` = sum of the machines' HP (goal levels: the HP machines before the goal; the goal machine has no HP); `clock s` = level clock; casual / thinker / fast tapper = median clear seconds; `HP/s` = total HP ÷ thinker clear; last column flags under 45 s (`UNDER (all)` = even the thinker is under 45 s; `fast-tapper only`; blank = all three bots 45 s or more).

| L | kind | machines | goal | total HP | clock s | rand 2.5s | smart 3s | smart 1s | HP/s (smart3) | < 45 s |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | normal | 1 |  | 1000 | 45 | 32 | 24 | 9 | 41 | UNDER (all) |
| 2 | normal | 1 |  | 800 | 45 | 27 | 28 | 9 | 29 | UNDER (all) |
| 3 | normal | 2 |  | 2800 | 70 | 45 | 41 | 13 | 68 | UNDER (all) |
| 4 | rank4 | 2 | rank4 | 2600 | 70 | 50 | 43 | 14 | 61 | UNDER (all) |
| 5 | normal | 2 |  | 2500 | 70 | 43 | 40 | 14 | 63 | UNDER (all) |
| 6 | normal | 2 |  | 3300 | 70 | 40 | 39 | 12 | 84 | UNDER (all) |
| 7 | rank4 | 3 | rank4 | 5000 | 95 | 62 | 56 | 21 | 89 | fast-tapper only |
| 8 | mini | 3 |  | 4800 | 95 | 61 | 46 | 14 | 105 | fast-tapper only |
| 9 | normal | 3 |  | 5199 | 95 | 55 | 63 | 22 | 82 | fast-tapper only |
| 10 | boss | 3 |  | 4500 | 95 | 54 | 57 | 15 | 79 | fast-tapper only |
| 11 | normal | 3 |  | 9150 | 95 | 70 | 74 | 24 | 123 | fast-tapper only |
| 12 | rank4 | 3 | rank4 | 7900 | 95 | 70 | 59 | 20 | 133 | fast-tapper only |
| 13 | normal | 3 |  | 8850 | 95 | 76 | 61 | 21 | 145 | fast-tapper only |
| 14 | chain12 | 3 | chain12 | 5200 | 95 | 71 | 55 | 20 | 94 | fast-tapper only |
| 15 | rank5 | 3 | rank5 | 7850 | 95 | 67 | 59 | 32 | 133 | fast-tapper only |
| 16 | rank5 | 3 | rank5 | 8750 | 95 | 76 | 49 | 28 | 177 | fast-tapper only |
| 17 | normal | 3 |  | 7950 | 95 | 70 | 71 | 22 | 113 | fast-tapper only |
| 18 | mini | 3 |  | 8700 | 95 | 71 | 54 | 26 | 161 | fast-tapper only |
| 19 | normal | 3 |  | 9801 | 95 | 69 | 66 | 23 | 148 | fast-tapper only |
| 20 | boss | 4 |  | 12800 | 125 | 100 | 69 | 22 | 184 | fast-tapper only |
| 21 | rank6 | 4 | rank6 | 19200 | 125 | 78 | 83 | 29 | 230 | fast-tapper only |
| 22 | normal | 4 |  | 18550 | 125 | 74 | 95 | 32 | 194 | fast-tapper only |
| 23 | chain12 | 4 | chain12 | 4851 | 125 | 80 | 59 | 43 | 82 | fast-tapper only |
| 24 | rank6 | 4 | rank6 | 20300 | 125 | 95 | 96 | 34 | 211 | fast-tapper only |
| 25 | normal | 4 |  | 20950 | 125 | 91 | 94 | 33 | 223 | fast-tapper only |
| 26 | rank6 | 4 | rank6 | 17750 | 125 | 90 | 66 | 24 | 267 | fast-tapper only |
| 27 | chain11 | 4 | chain11 | 6900 | 125 | 63 | 82 | 54 | 84 |  |
| 28 | mini | 4 |  | 27500 | 125 | 86 | 72 | 37 | 380 | fast-tapper only |
| 29 | chain10 | 4 | chain10 | 16599 | 125 | 91 | 96 | 33 | 172 | fast-tapper only |
| 30 | boss | 5 |  | 49900 | 165 | 132 | 89 | 30 | 560 | fast-tapper only |
| 31 | normal | 4 |  | 30000 | 125 | 76 | 70 | 23 | 429 | fast-tapper only |
| 32 | chain11 | 4 | chain11 | 11150 | 125 | 83 | 84 | 54 | 133 |  |
| 33 | normal | 4 |  | 24550 | 125 | 82 | 72 | 23 | 340 | fast-tapper only |
| 34 | rank7 | 4 | rank7 | 21399 | 125 | 97 | 93 | 22 | 229 | fast-tapper only |
| 35 | normal | 4 |  | 22050 | 125 | 77 | 111 | 36 | 198 | fast-tapper only |
| 36 | rank6 | 4 | rank6 | 22101 | 125 | 85 | 66 | 24 | 334 | fast-tapper only |
| 37 | normal | 4 |  | 14800 | 125 | 82 | 78 | 25 | 190 | fast-tapper only |
| 38 | mini | 4 |  | 23200 | 125 | 90 | 80 | 20 | 290 | fast-tapper only |
| 39 | normal | 4 |  | 28950 | 125 | 93 | 104 | 36 | 278 | fast-tapper only |
| 40 | boss | 5 |  | 46300 | 165 | 125 | 110 | 40 | 421 | fast-tapper only |
| 41 | chain11 | 5 | chain11 | 61400 | 165 | 122 | 110 | 38 | 557 | fast-tapper only |
| 42 | chain12 | 5 | chain12 | 33650 | 165 | 90 | 89 | 33 | 380 | fast-tapper only |
| 43 | rank7 | 5 | rank7 | 45550 | 165 | 116 | 128 | 64 | 355 |  |
| 44 | chain7 | 5 | chain7 | 35200 | 165 | 99 | 94 | 36 | 376 | fast-tapper only |
| 45 | normal | 4 |  | 34150 | 125 | 87 | 79 | 39 | 432 | fast-tapper only |
| 46 | rank6 | 5 | rank6 | 99300 | 165 | 117 | 71 | 21 | 1395 | fast-tapper only |
| 47 | normal | 4 |  | 26600 | 125 | 71 | 88 | 32 | 304 | fast-tapper only |
| 48 | mini | 5 |  | 104400 | 165 | 137 | 85 | 31 | 1224 | fast-tapper only |
| 49 | normal | 4 |  | 34800 | 125 | 98 | 117 | 40 | 298 | fast-tapper only |
| 50 | boss | 5 |  | 85900 | 165 | 128 | 159 | 59 | 540 |  |
| 51 | chain12 | 5 | chain12 | 70600 | 165 | 120 | 59 | 41 | 1192 | fast-tapper only |
| 52 | normal | 4 |  | 22500 | 125 | 87 | 106 | 45 | 211 |  |
| 53 | rank7 | 5 | rank7 | 83750 | 165 | 102 | 84 | 23 | 997 | fast-tapper only |
| 54 | chain8 | 5 | chain8 | 38100 | 165 | 101 | 134 | 50 | 283 |  |
| 55 | normal | 4 |  | 30650 | 125 | 81 | 101 | 35 | 303 | fast-tapper only |
| 56 | rank7 | 5 | rank7 | 26150 | 165 | 114 | 76 | 57 | 345 |  |
| 57 | normal | 4 |  | 37050 | 125 | 88 | 76 | 23 | 490 | fast-tapper only |
| 58 | mini | 5 |  | 75800 | 165 | 116 | 105 | 35 | 722 | fast-tapper only |
| 59 | normal | 4 |  | 39800 | 125 | 90 | 113 | 43 | 352 | fast-tapper only |
| 60 | boss | 5 |  | 107200 | 165 | 116 | 107 | 29 | 1000 | fast-tapper only |
| 61 | normal | 4 |  | 19400 | 125 | 85 | 73 | 25 | 265 | fast-tapper only |
| 62 | rank6 | 5 | rank6 | 52350 | 165 | 122 | 102 | 34 | 513 | fast-tapper only |
| 63 | normal | 4 |  | 28800 | 125 | 91 | 63 | 21 | 456 | fast-tapper only |
| 64 | normal | 4 |  | 26500 | 125 | 85 | 117 | 39 | 226 | fast-tapper only |
| 65 | chain10 | 5 | chain10 | 36400 | 165 | 106 | 132 | 52 | 275 |  |
| 66 | normal | 4 |  | 21450 | 125 | 83 | 85 | 29 | 254 | fast-tapper only |
| 67 | rank7 | 5 | rank7 | 56300 | 165 | 133 | 113 | 33 | 500 | fast-tapper only |
| 68 | mini | 5 |  | 46400 | 165 | 120 | 107 | 39 | 432 | fast-tapper only |
| 69 | normal | 4 |  | 15750 | 125 | 91 | 90 | 29 | 175 | fast-tapper only |
| 70 | boss | 5 |  | 45200 | 165 | 123 | 105 | 28 | 429 | fast-tapper only |
| 71 | normal | 4 |  | 21350 | 125 | 81 | 78 | 25 | 274 | fast-tapper only |
| 72 | chain12 | 5 | chain12 | 33950 | 165 | 135 | 119 | 35 | 286 | fast-tapper only |
| 73 | normal | 4 |  | 21950 | 125 | 78 | 54 | 18 | 409 | fast-tapper only |
| 74 | rank7 | 5 | rank7 | 34400 | 165 | 127 | 143 | 50 | 240 |  |
| 75 | chain12 | 5 | chain12 | 55100 | 165 | 138 | 116 | 39 | 474 | fast-tapper only |
| 76 | normal | 4 |  | 41250 | 125 | 92 | 79 | 26 | 523 | fast-tapper only |
| 77 | normal | 4 |  | 24150 | 125 | 92 | 112 | 45 | 215 | fast-tapper only |
| 78 | mini | 5 |  | 69900 | 165 | 131 | 111 | 36 | 627 | fast-tapper only |
| 79 | rank7 | 5 | rank7 | 36700 | 165 | 121 | 136 | 43 | 271 | fast-tapper only |
| 80 | boss | 5 |  | 62700 | 165 | 132 | 135 | 30 | 464 | fast-tapper only |

## 5. Recommendation: target curve

Rule of thumb: "easy" is a win rate, "seconds" is a duration. Keep the win-rate fits and add a **duration floor** measured with the *fast tapper* (smart1) as the shortest believable human, and the thinker (smart3) as the typical one. Floors are median clear seconds under CALM:

| levels | thinker floor (smart3) | fast-tapper floor (smart1) | today (thinker / fast, median) |
|---|---|---|---|
| 1-3 (tutorial) | 60 s | 30 s | 24-41 / 9-13 |
| 4-10 | 75 s | 40 s | 39-63 / 12-22 |
| 11-20 | 90 s | 45 s | 49-74 / 20-32 |
| 21-40 | 105 s | 55 s | 59-111 / 20-54 |
| 41-60 | 120 s | 65 s | 59-159 / 21-64 |
| 61-80 | 135 s | 75 s | 54-143 / 18-52 |

- **Boss levels (x0) and mini-bosses (x8)**: floor +30% (a boss fight should be the longest level of its chapter: today L10/L20/L30 are 57/69/89 s thinker and 15/22/30 s fast, shorter than neighbours in places).
- **MANIA levels**: about one per chapter of 10 (suggested L5, L15, L25, ... L75, the quiet slot between the first level and the x8 mini-boss), explicitly **allowed to be shorter**: 30 s thinker / 20 s fast tapper floor, because the whole point is a burst. Label them on the road ("MANIA") so a short level is expected, not a bug. This is a design proposal; MANIA is currently a pace block (`TUNING` `mania`), not a per-level setting, and was not timed here.
- **Chapter 1 is where the owner feels it.** Smallest change that matters: L1-L6 must not be under 30 s for a fast tapper; today they are 9-14 s.
- Do not ask for a *maximum*: the clock is already the ceiling, and the thinker is at 50-85% of it.

These floors are a starting proposal sized from the table (about double today's fast-tapper time in chapter 1, +30-60% later). They need the owner's call on how fast "fast" is: if he taps faster than 1 s/merge the same HP gives him less than the floor, and `level-report` would need a smart0.5 bot.

## 6. Which knobs to turn (existing tools only)

Never hand-edit `hp`, `minion_hp`, `goal.n` or `star_times` in `levels.json` / `puzzles.json`. The repo's tools write them:

1. **HP per level: `tools/sim-levels.ts`.** It binary-searches `hp` for a win-rate target and writes `levels.json` (hp only); `--dry` first, `--pace calm`, `--from/--to`, `--n`, `--every N` (bot think seconds). Today its target is win rate at a 3 s bot, so by itself it will not raise early HP. **Needed change (not made here): a second constraint "median clear of the 1 s bot ≥ floor", or run it with `--every 1.5-2` for the tutorial range so the fitted HP is larger.** Expect clear time to rise roughly with HP, but check: it is not linear (cap 35%, breathers, cascades); that proportionality is inferred and not tested here.
2. **Chain/rank-goal levels: `tools/fit-goals.ts`** (fits `goal.n` and HP of staged goal levels; `--dry` first) for L14, L23, L27, L32, L41-L44 etc.
3. **Boss and mini-boss HP and cap: `tools/effort-fit.ts`** (writes `src/content/effortOverlay.json`, the table read while `TUNING.effortModel` is ON; flag currently OFF; verify with `tools/effort-audit.ts`). The overlay can also lower `bossCap` (the per-hit cap fraction on the boss machine), the one knob that sets a minimum number of hits regardless of damage: the cap floor today is only ceil(1/0.35) = 3 hits per machine.
4. **Star lines after any HP change: `tools/star-times.ts --write [--only ...]`** (2★ = casual median, 3★ = thinker median). Always re-run it after steps 1-3 or the stars go stale ("3STAR_FREE").
5. **Verify: `tools/level-report.ts` then `tools/level-duration.ts --dir <dir>`** (this task) and `npm test`. Keep a before/after table in the PR.
6. **Content knobs that are not HP** (tuning.ts, then re-fit): `TUNING.cascadeCap` (lower = more hits per machine = a hard floor; affects every level, so re-run the whole fit), the `breather` (2.5 s CALM), `waves` count and `STAGE_RAMP` (0.3) in `game.ts` (code, out of scope here), the clock `time_seconds` (a longer clock never lengthens a level by itself).
7. **Order:** sim-levels (HP) → fit-goals (goal levels) → effort-fit (bosses, if effortModel ships) → star-times → level-report/level-duration → tests.

## 7. Open items

- The big uncertainty is the real player. Ask the owner (or log a playtest) for real clear times of L1-L10; compare with the 9-14 s of the fast tapper.
- 100 levels: the game has 80. If 100 are wanted, they do not exist yet.
- This measures CALM only; a MANIA/TODAY run (`--pace`) is one command away.
