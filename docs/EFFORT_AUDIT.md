# Effort audit: enemy effort versus boss powers versus start variety versus player power

Measurement only (task t-bd0d6010, 2026-10-13). No change to `src/` or `levels.json`. Everything below the "Tables" line is the verbatim output of `npx vite-node tools/effort-audit.ts --part report` over the JSON written by the earlier parts (commands at the end).

## Plain-words summary

1. Last boss share: by HP every chapter boss is exactly 50% (minions 50%); by smart@3 time it is 32% on average (8 of 8 chapter bosses under 50%, 16 of 16 boss+mini levels).
2. Boss powers: of 35 powered levels, 14 show a time cost whose 95% interval excludes zero (smart@3); the mean absolute time cost is 2.0% of the clock, 35% of paired runs are byte-identical ON vs OFF, and 31% of runs never felt a single cast.
3. Start variety: 25 distinct layouts, 16 rank mixes and 17 "units given" signatures in 77 non-teach levels; 44 distinct whole starts, the biggest shared by 14 levels (18%); 56% of levels start identically to another one.
4. Player power: need STARTER (share of the clock the starter squad needs) runs from 0.17 to 0.90 (mean 0.56); the best open-crate squad needs 0.44 on average, so unit power can cut the needed clock by about 22%.
5. Why the boss is small and its powers are almost invisible: the boss stage lasts only 32.7 s on average at the 8 chapter bosses and gets 1.9 casts per fight (first cast 8 s after it wakes, then every 16 s, second attack only below 33% HP). Boss HP is 50% of the stage but only about 32% of the time, because the per-hit cap (35% of the machine's max HP) lets a bigger machine take bigger hits.

Reading rule: smart@3 and random@2.5 are bots, ON vs OFF is a paired sim, "felt" is what the bot's merge choice or board lost, not what a human sees. Trust intervals, read point values as direction (limits at the end).

## Tables

## A. Effort share: how much of a level is its last machine

n = 30 smart@3 runs and 30 random@2.5 runs per level (planner n = 6 on boss/mini levels), shipped pace calm. HP share = last stage HP / all stage HP (static, from `newLevel`). Time share = (time from the second-to-last kill to the win) / clear time, smart bot, winning runs only, mean with 95% interval. "last" = the boss on boss/mini levels, the goal machine on goal levels, else the last ordinary machine (levels 1-2 are one machine = 100%).

| L | type | stages (HP) | last HP share | last time share smart@3 | random@2.5 | planner | last stage secs | smart win |
|---|---|---|---|---|---|---|---|---|
| 1 | single | 1000 | 100% | 100% [100%-100%] | 100% | - | 24.3 | 100% [89%-100%] |
| 2 | single | 800 | 100% | 100% [100%-100%] | 100% | - | 27.2 | 100% [89%-100%] |
| 3 | staged | 1217/1583 | 57% | 27% [26%-28%] | 34% | - | 11.1 | 100% [89%-100%] |
| 4 | goal rank4 | 2600 | goal (no HP) | 8% [6%-11%] | 18% | - | 3.8 | 100% [89%-100%] |
| 5 | staged | 1087/1413 | 57% | 25% [24%-26%] | 35% | - | 10.2 | 100% [89%-100%] |
| 6 | staged | 1435/1865 | 57% | 30% [30%-31%] | 32% | - | 11.9 | 100% [89%-100%] |
| 7 | goal rank4 | 2174/2826 | goal (no HP) | 0% [0%-1%] | 7% | - | 0.3 | 100% [89%-100%] |
| 8 | mini | 1043/1357/2400 | 50% | 34% [33%-35%] | 30% | 34% | 15.6 | 100% [89%-100%] |
| 9 | staged | 1333/1733/2133 | 41% | 13% [13%-14%] | 20% | - | 8.5 | 100% [89%-100%] |
| 10 | BOSS | 978/1272/2250 | 50% | 41% [41%-42%] | 30% | 42% | 23.5 | 100% [89%-100%] |
| 11 | staged | 2346/3050/3754 | 41% | 15% [13%-17%] | 21% | - | 11.1 | 100% [89%-100%] |
| 12 | goal rank4 | 3435/4465 | goal (no HP) | 3% [2%-4%] | 4% | - | 2.0 | 100% [89%-100%] |
| 13 | staged | 2269/2950/3631 | 41% | 16% [15%-16%] | 21% | - | 9.6 | 100% [89%-100%] |
| 14 | goal chain12 | 2261/2939 | goal (no HP) | 2% [1%-3%] | 16% | - | 1.0 | 100% [89%-100%] |
| 15 | goal rank5 | 3413/4437 | goal (no HP) | 6% [4%-8%] | 15% | - | 4.0 | 100% [89%-100%] |
| 16 | goal rank5 | 3804/4946 | goal (no HP) | 11% [8%-15%] | 13% | - | 6.7 | 100% [89%-100%] |
| 17 | staged | 2038/2650/3262 | 41% | 19% [18%-20%] | 23% | - | 13.3 | 100% [89%-100%] |
| 18 | mini | 1891/2459/4350 | 50% | 36% [35%-37%] | 30% | 37% | 19.7 | 100% [89%-100%] |
| 19 | staged | 2513/3267/4021 | 41% | 16% [15%-17%] | 21% | - | 10.5 | 100% [89%-100%] |
| 20 | BOSS | 1641/2133/2626/6400 | 50% | 31% [30%-33%] | 29% | 25% | 22.3 | 100% [89%-100%] |
| 21 | goal rank6 | 4923/6400/7877 | goal (no HP) | 1% [1%-2%] | 16% | - | 1.2 | 100% [89%-100%] |
| 22 | staged | 3198/4158/5117/6077 | 33% | 9% [9%-9%] | 20% | - | 8.6 | 100% [89%-100%] |
| 23 | goal chain12 | 1244/1617/1990 | goal (no HP) | 15% [10%-21%] | 30% | - | 12.1 | 97% [83%-99%] |
| 24 | goal rank6 | 5205/6767/8328 | goal (no HP) | 9% [5%-12%] | 15% | - | 8.0 | 83% [66%-93%] |
| 25 | staged | 3612/4696/5779/6863 | 33% | 10% [9%-11%] | 17% | - | 9.2 | 100% [89%-100%] |
| 26 | goal rank6 | 4551/5917/7282 | goal (no HP) | 8% [4%-12%] | 15% | - | 7.1 | 100% [89%-100%] |
| 27 | goal chain11 | 1769/2300/2831 | goal (no HP) | 15% [10%-19%] | 15% | - | 13.2 | 87% [70%-95%] |
| 28 | mini | 3526/4583/5641/13750 | 50% | 27% [25%-29%] | 28% | 28% | 19.0 | 100% [89%-100%] |
| 29 | goal chain10 | 4256/5533/6810 | goal (no HP) | 8% [5%-10%] | 6% | - | 7.5 | 87% [70%-95%] |
| 30 | BOSS | 4302/5592/6883/8173/24950 | 50% | 32% [31%-33%] | 28% | 35% | 28.3 | 100% [89%-100%] |
| 31 | staged | 5172/6724/8276/9828 | 33% | 15% [15%-16%] | 16% | - | 10.9 | 100% [89%-100%] |
| 32 | goal chain11 | 2859/3717/4574 | goal (no HP) | 7% [4%-9%] | 13% | - | 6.2 | 97% [83%-99%] |
| 33 | staged | 4233/5503/6772/8042 | 33% | 20% [17%-24%] | 17% | - | 14.5 | 100% [89%-100%] |
| 34 | goal rank7 | 5487/7133/8779 | goal (no HP) | 1% [0%-2%] | 17% | - | 0.7 | 100% [89%-100%] |
| 35 | staged | 3802/4942/6083/7223 | 33% | 20% [18%-22%] | 16% | - | 22.2 | 97% [83%-99%] |
| 36 | goal rank6 | 5667/7367/9067 | goal (no HP) | 10% [4%-15%] | 8% | - | 10.1 | 100% [89%-100%] |
| 37 | staged | 2552/3317/4083/4848 | 33% | 14% [13%-14%] | 16% | - | 10.4 | 100% [89%-100%] |
| 38 | mini | 2974/3867/4759/11600 | 50% | 33% [31%-36%] | 28% | 30% | 25.4 | 100% [89%-100%] |
| 39 | staged | 4991/6489/7986/9484 | 33% | 26% [25%-27%] | 18% | - | 27.7 | 97% [83%-99%] |
| 40 | BOSS | 3991/5189/6386/7584/23150 | 50% | 20% [18%-22%] | 25% | 19% | 22.9 | 100% [89%-100%] |
| 41 | goal chain11 | 10586/13762/16938/20114 | goal (no HP) | 0% [0%-1%] | 4% | - | 0.3 | 100% [89%-100%] |
| 42 | goal chain12 | 5802/7542/9283/11023 | goal (no HP) | 0% [0%-1%] | 10% | - | 0.3 | 90% [74%-97%] |
| 43 | goal rank7 | 7853/10209/12566/14922 | goal (no HP) | 4% [2%-6%] | 15% | - | 6.2 | 83% [66%-93%] |
| 44 | goal chain7 | 6069/7890/9710/11531 | goal (no HP) | 0% [0%-1%] | 1% | - | 0.5 | 90% [74%-97%] |
| 45 | staged | 5888/7654/9421/11187 | 33% | 11% [11%-12%] | 20% | - | 10.1 | 100% [89%-100%] |
| 46 | goal rank6 | 17121/22257/27393/32529 | goal (no HP) | 14% [9%-18%] | 10% | - | 11.7 | 100% [89%-100%] |
| 47 | staged | 4586/5962/7338/8714 | 33% | 13% [11%-14%] | 20% | - | 11.5 | 93% [79%-98%] |
| 48 | mini | 9000/11700/14400/17100/52200 | 50% | 33% [31%-34%] | 26% | 31% | 29.5 | 100% [89%-100%] |
| 49 | staged | 6000/7800/9600/11400 | 33% | 11% [10%-11%] | 17% | - | 12.4 | 67% [49%-81%] |
| 50 | BOSS | 7405/9627/11848/14070/42950 | 50% | 37% [35%-38%] | 29% | 29% | 58.3 | 87% [70%-95%] |
| 51 | goal chain12 | 12172/15824/19476/23128 | goal (no HP) | 8% [7%-9%] | 12% | - | 4.5 | 100% [89%-100%] |
| 52 | staged | 3879/5043/6207/7371 | 33% | 12% [11%-12%] | 18% | - | 12.4 | 100% [89%-100%] |
| 53 | goal rank7 | 14440/18772/23103/27435 | goal (no HP) | 3% [3%-4%] | 6% | - | 2.8 | 100% [89%-100%] |
| 54 | goal chain8 | 6569/8540/10510/12481 | goal (no HP) | 2% [0%-3%] | 2% | - | 2.3 | 97% [83%-99%] |
| 55 | staged | 5284/6870/8455/10041 | 33% | 16% [15%-17%] | 16% | - | 16.3 | 100% [89%-100%] |
| 56 | goal rank7 | 4509/5861/7214/8566 | goal (no HP) | 19% [12%-25%] | 25% | - | 21.3 | 97% [83%-99%] |
| 57 | staged | 6388/8304/10221/12137 | 33% | 20% [18%-21%] | 15% | - | 14.7 | 100% [89%-100%] |
| 58 | mini | 6534/8495/10455/12416/37900 | 50% | 30% [27%-33%] | 31% | 29% | 31.0 | 100% [89%-100%] |
| 59 | staged | 6862/8921/10979/13038 | 33% | 10% [9%-10%] | 19% | - | 11.0 | 90% [74%-97%] |
| 60 | BOSS | 9241/12014/14786/17559/53600 | 50% | 35% [34%-36%] | 31% | 31% | 36.7 | 100% [89%-100%] |
| 61 | staged | 3345/4348/5352/6355 | 33% | 11% [10%-11%] | 16% | - | 7.9 | 100% [89%-100%] |
| 62 | goal rank6 | 9026/11734/14441/17149 | goal (no HP) | 6% [3%-9%] | 8% | - | 7.2 | 100% [89%-100%] |
| 63 | staged | 4966/6455/7945/9434 | 33% | 17% [16%-17%] | 15% | - | 10.5 | 100% [89%-100%] |
| 64 | staged | 4569/5940/7310/8681 | 33% | 8% [8%-9%] | 18% | - | 9.9 | 100% [89%-100%] |
| 65 | goal chain10 | 6276/8159/10041/11924 | goal (no HP) | 2% [1%-3%] | 4% | - | 3.3 | 87% [70%-95%] |
| 66 | staged | 3698/4808/5917/7027 | 33% | 7% [7%-7%] | 15% | - | 6.1 | 100% [89%-100%] |
| 67 | goal rank7 | 9707/12619/15531/18443 | goal (no HP) | 12% [9%-14%] | 13% | - | 13.3 | 100% [89%-100%] |
| 68 | mini | 4000/5200/6400/7600/23200 | 50% | 24% [23%-25%] | 22% | 24% | 25.4 | 100% [89%-100%] |
| 69 | staged | 2716/3530/4345/5159 | 33% | 10% [10%-10%] | 15% | - | 9.1 | 100% [89%-100%] |
| 70 | BOSS | 3897/5066/6234/7403/22600 | 50% | 36% [34%-39%] | 25% | 41% | 37.0 | 100% [89%-100%] |
| 71 | staged | 3681/4785/5890/6994 | 33% | 15% [14%-15%] | 15% | - | 11.5 | 100% [89%-100%] |
| 72 | goal chain12 | 5853/7609/9366/11122 | goal (no HP) | 25% [22%-28%] | 16% | - | 30.7 | 87% [70%-95%] |
| 73 | staged | 3784/4920/6055/7191 | 33% | 16% [15%-16%] | 15% | - | 8.6 | 100% [89%-100%] |
| 74 | goal rank7 | 5931/7710/9490/11269 | goal (no HP) | 0% [0%-0%] | 20% | - | 0.0 | 100% [89%-100%] |
| 75 | goal chain12 | 9500/12350/15200/18050 | goal (no HP) | 2% [1%-3%] | 6% | - | 1.9 | 97% [83%-99%] |
| 76 | staged | 7112/9246/11379/13513 | 33% | 12% [11%-12%] | 15% | - | 9.4 | 100% [89%-100%] |
| 77 | staged | 4164/5413/6662/7911 | 33% | 9% [9%-10%] | 16% | - | 10.5 | 93% [79%-98%] |
| 78 | mini | 6026/7834/9641/11449/34950 | 50% | 21% [18%-24%] | 25% | 28% | 24.5 | 100% [89%-100%] |
| 79 | goal rank7 | 6328/8226/10124/12022 | goal (no HP) | 6% [4%-7%] | 16% | - | 7.6 | 97% [83%-99%] |
| 80 | BOSS | 5405/7027/8648/10270/31350 | 50% | 26% [24%-28%] | 28% | 36% | 32.9 | 90% [74%-97%] |

**Last boss under 50% of the level's effort** (strict <50%): by HP 0 of 16 boss+mini levels (the HP split is built as exactly 50% boss / 50% minions, so rounding decides); by smart@3 time 16 of 16; by smart@3 time with the interval's upper end under 50%: 16. Chapter bosses only (8): HP 0, time 8. All 80 levels, last machine under 50% by time: 78 (ordinary staged levels are designed with a 30% ramp, so the last machine is about 28-36%: that is not a boss).

Histogram of the last machine's time share (smart@3), all levels with data:

| share | levels | which |
|---|---|---|
| 0-10% | 30 | 4 7 12 14 15 21 22 24 25 26 29 32 34 36 41 42 43 44 51 53 54 59 62 64 65 66 74 75 77 79 |
| 10-20% | 25 | 9 11 13 16 17 19 23 27 31 37 45 46 47 49 52 55 56 57 61 63 67 69 71 73 76 |
| 20-30% | 12 | 3 5 28 33 35 39 40 58 68 72 78 80 |
| 30-40% | 10 | 6 8 18 20 30 38 48 50 60 70 |
| 40-50% | 1 | 10 |
| 50-60% | 0 |  |
| 60-70% | 0 |  |
| 70-80% | 0 |  |
| 80-90% | 0 |  |
| 90-100% | 2 | 1 2 |

Per chapter (mean over the chapter's levels):

| chapter | levels | mean last HP share (staged, non-goal) | mean last time share (all) | boss level time share | boss HP share | boss+mini under 50% (time) |
|---|---|---|---|---|---|---|
| 1 | 10 | 52% | 38% | 41% [41%-42%] | 50% | 2/2 |
| 2 | 10 | 44% | 16% | 31% [30%-33%] | 50% | 2/2 |
| 3 | 10 | 41% | 13% | 32% [31%-33%] | 50% | 2/2 |
| 4 | 10 | 38% | 17% | 20% [18%-22%] | 50% | 2/2 |
| 5 | 10 | 40% | 12% | 37% [35%-38%] | 50% | 2/2 |
| 6 | 10 | 39% | 15% | 35% [34%-36%] | 50% | 2/2 |
| 7 | 10 | 38% | 13% | 36% [34%-39%] | 50% | 2/2 |
| 8 | 10 | 39% | 13% | 26% [24%-28%] | 50% | 2/2 |

10 worst levels, metric A (lowest last-boss time share among the 16 boss/mini levels):

| rank | L | type | time share | HP share |
|---|---|---|---|---|
| 1 | 40 | BOSS | 20% [18%-22%] | 50% |
| 2 | 78 | mini | 21% [18%-24%] | 50% |
| 3 | 68 | mini | 24% [23%-25%] | 50% |
| 4 | 80 | BOSS | 26% [24%-28%] | 50% |
| 5 | 28 | mini | 27% [25%-29%] | 50% |
| 6 | 58 | mini | 30% [27%-33%] | 50% |
| 7 | 20 | BOSS | 31% [30%-33%] | 50% |
| 8 | 30 | BOSS | 32% [31%-33%] | 50% |
| 9 | 48 | mini | 33% [31%-34%] | 50% |
| 10 | 38 | mini | 33% [31%-36%] | 50% |

## B. Boss power impact: powers ON vs OFF (common random numbers)

Every ability, from `src/core/boss.ts` (cadence under calm: first cast 8 s after the boss wakes, then every 16 s, 3.5 s warning; ordinary-monster "light" behaviours first at 10 s then every 18 s; a clamp/frost/hot/rest/split effect lasts 2/3/4 s by armor phase):

| attack | name in game | what it does | board footprint | counterplay | player sees (code: GameScene.ts bossWarn ~l.2407, board cells ~l.5521) |
|---|---|---|---|---|---|
| clamp | CLAMP | marked top-rank machine cannot be dragged or dropped on for 2/3/4 s (by armor phase) | 1 cell | merge or move the marked machine in the warning window | beam + sound + event text on every target cell (row/column/boundary attacks: pulsing marked cells), lesson card the first time; effect text on hit |
| frost | FROST | a row cannot receive new parts for 2/3/4 s | 5 cells (the emptiest row) | build in other rows; parts land elsewhere | beam + sound + event text on every target cell (row/column/boundary attacks: pulsing marked cells), lesson card the first time; effect text on hit |
| suction | SUCTION | the 1 (2 in final phase) lowest-rank machines vanish at the deadline | 1-2 cells | merge or move the marked machines | beam + sound + event text on every target cell (row/column/boundary attacks: pulsing marked cells), lesson card the first time; effect text on hit |
| hot | HOT COLUMN | shooters in one column hit half as hard for 2/3/4 s (passive shots too) | up to 6 cells (a column) | move shooters out of the column | beam + sound + event text on every target cell (row/column/boundary attacks: pulsing marked cells), lesson card the first time; effect text on hit |
| rest | REST ROW | coils/bells in one row wake nobody for 2/3/4 s | up to 5 cells (a row) | move relays out of the row | beam + sound + event text on every target cell (row/column/boundary attacks: pulsing marked cells), lesson card the first time; effect text on hit |
| split | SPLIT | links cannot cross one column boundary for 2/3/4 s | whole board (relay links) | chain on one side | beam + sound + event text on every target cell (row/column/boundary attacks: pulsing marked cells), lesson card the first time; effect text on hit |
| bomb | BOMB | removes the lowest-rank (<= 2) neighbour of one empty cell at the deadline | 1 cell + neighbours | move a machine onto the bomb cell or wake a neighbour in a chain | beam + sound + event text on every target cell (row/column/boundary attacks: pulsing marked cells), lesson card the first time; effect text on hit |
| conveyor | ROW SLIDES | a row shifts one cell right, wrapping | up to 5 cells | plan the new neighbours | beam + sound + event text on every target cell (row/column/boundary attacks: pulsing marked cells), lesson card the first time; effect text on hit |
| mirror | MIRROR | the highest-rank and the lowest-rank machine swap places | 2 cells | none beyond moving them first | beam + sound + event text on every target cell (row/column/boundary attacks: pulsing marked cells), lesson card the first time; effect text on hit |
| blocks | JUNK | up to 2 empty cells next to machines become junk for 8 s | 2 cells | fire a chain beside a block to clear it | beam + sound + event text on every target cell (row/column/boundary attacks: pulsing marked cells), lesson card the first time; effect text on hit |
| pull | PULL UP | the highest-rank machine with an empty cell above moves up one cell | 2 cells | fill the cell above | beam + sound + event text on every target cell (row/column/boundary attacks: pulsing marked cells), lesson card the first time; effect text on hit |
| bounce | BOUNCE | the most surrounded machine jumps to the farthest empty cell | 2 cells | none | beam + sound + event text on every target cell (row/column/boundary attacks: pulsing marked cells), lesson card the first time; effect text on hit |
| slick | SLICK | a dropped machine slides one cell along an arrow for 4 s | 2 cells | avoid dropping on the oil | beam + sound + event text on every target cell (row/column/boundary attacks: pulsing marked cells), lesson card the first time; effect text on hit |
| portals | PORTALS | two empty cells become portals for 4 s (a shortcut, helps the player) | 2 cells | use them | beam + sound + event text on every target cell (row/column/boundary attacks: pulsing marked cells), lesson card the first time; effect text on hit |
| tow | TOW BAR | two linked machines move together for 4 s | 2 cells | merge either to release | beam + sound + event text on every target cell (row/column/boundary attacks: pulsing marked cells), lesson card the first time; effect text on hit |
| ransom | TIME RANSOM | takes 2 s from the clock unless both marked machines wake in one chain | 2 cells | chain through both | beam + sound + event text on every target cell (row/column/boundary attacks: pulsing marked cells), lesson card the first time; effect text on hit |

A/B method: the same level, the same game seed and the same bot seed run twice: ON (shipped) and OFF (`TUNING.bossAttacks = false`, the MANIA switch, so no boss or light-monster cast at all). Chapter bosses get a third arm NOSEC (the final-phase second attack cancelled at its warning). Runs stay identical until the first cast changes the board, so most of the difference is the power itself. "Time cost" = mean(elapsed ON - elapsed OFF) as a share of the level clock, a loss counting as the whole clock (win and speed in one number). "Identical" = ON and OFF ended with the same win, time and damage (the power changed nothing at all). "Felt" cast = it removed or moved a machine, took clock time, placed junk, or the standing hazard made the bot's best merge worse; "board effect" adds hazards that merely sat on occupied cells.

### B1. Smart bot @3 s (per level; "ON vs OFF" rows are all powers; on chapter bosses the second row is the final-phase second attack alone, ON vs NOSEC)

| L | boss / monster | attack | n | casts/run | board effect | felt | player responded | runs never felt | identical runs | win ON-OFF [95%] | flips (won only ON / only OFF) | time cost % clock [95%] | merges ON-OFF | units lost/run | clock s taken/run |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 8 | PRESSURE POPPER | bomb | 30 | 1.0 | 0% | 0% | 100% | 0% | 73% | 0.00 [0.00..0.00] | 0/0 | 0.0 [-0.0..0.1] | 0.0 [0.0..0.0] | 0.00 | 0.0 |
| 10 | TIN CAN KING | clamp+bomb (all) | 30 | 1.0 | 100% | 0% | 0% | 100% | 100% | 0.00 [0.00..0.00] | 0/0 | 0.0 [0.0..0.0] | 0.0 [0.0..0.0] | 0.00 | 0.0 |
| 10 | TIN CAN KING | clamp (primary only) | 30 | 1.0 | 100% | 0% | 0% | 100% | 100% | 0.00 [0.00..0.00] | 0/0 | 0.0 [0.0..0.0] | 0.0 [0.0..0.0] | 0.00 | 0.0 |
| 10 | TIN CAN KING | bomb (second) | 30 | 0.0 | - | - | - | 100% | 100% | 0.00 [0.00..0.00] | 0/0 | 0.0 [0.0..0.0] | 0.0 [0.0..0.0] | 0.00 | 0.0 |
| 18 | CAROUSEL CRAB | conveyor | 30 | 1.0 | 100% | 100% | 0% | 0% | 0% | 0.00 [0.00..0.00] | 0/0 | 0.9 [0.5..1.4] | 0.1 [0.0..0.3] | 0.00 | 0.0 |
| 19 | ordinary monster (light) | light frost | 30 | 3.0 | 10% | 0% | 0% | 100% | 80% | 0.00 [0.00..0.00] | 0/0 | 0.1 [-0.2..0.4] | 0.0 [-0.1..0.1] | 0.00 | 0.0 |
| 20 | FRIDGE OVERLORD | frost+conveyor (all) | 30 | 1.2 | 78% | 3% | 0% | 97% | 47% | 0.00 [0.00..0.00] | 0/0 | 1.0 [0.5..1.4] | 0.0 [-0.1..0.2] | 0.00 | 0.0 |
| 20 | FRIDGE OVERLORD | frost (primary only) | 30 | 1.0 | 93% | 0% | 0% | 100% | 47% | 0.00 [0.00..0.00] | 0/0 | 1.0 [0.5..1.4] | 0.0 [-0.1..0.2] | 0.00 | 0.0 |
| 20 | FRIDGE OVERLORD | conveyor (second) | 30 | 0.2 | 14% | 14% | 0% | 97% | 100% | 0.00 [0.00..0.00] | 0/0 | 0.0 [0.0..0.0] | 0.0 [0.0..0.0] | 0.00 | 0.0 |
| 24 | ordinary monster (light) | light suction | 30 | 4.6 | 72% | 72% | 0% | 0% | 0% | -0.17 [-0.30..-0.03] | 0/5 | 2.3 [-3.7..8.2] | 0.8 [-1.6..3.2] | 3.30 | 0.0 |
| 25 | ordinary monster (light) | light frost | 30 | 5.0 | 0% | 0% | 0% | 100% | 97% | 0.00 [0.00..0.00] | 0/0 | 0.0 [0.0..0.0] | 0.0 [0.0..0.0] | 0.00 | 0.0 |
| 28 | VANITY MOTH | mirror | 30 | 1.0 | 86% | 86% | 0% | 17% | 27% | 0.00 [0.00..0.00] | 0/0 | 0.7 [0.0..1.3] | 0.2 [-0.0..0.5] | 0.00 | 0.0 |
| 29 | ordinary monster (light) | light suction | 30 | 5.1 | 91% | 91% | 0% | 0% | 0% | -0.13 [-0.26..-0.01] | 0/4 | 2.8 [-1.8..7.3] | 1.0 [-0.9..2.8] | 4.63 | 0.0 |
| 30 | VIPER QUEEN | suction+mirror (all) | 30 | 1.7 | 58% | 58% | 0% | 17% | 7% | 0.00 [0.00..0.00] | 0/0 | 0.4 [-0.1..0.9] | 0.2 [-0.1..0.5] | 0.83 | 0.0 |
| 30 | VIPER QUEEN | suction (primary only) | 30 | 1.0 | 83% | 83% | 0% | 17% | 7% | 0.00 [0.00..0.00] | 0/0 | 0.5 [-0.1..1.1] | 0.3 [-0.0..0.6] | 0.83 | 0.0 |
| 30 | VIPER QUEEN | mirror (second) | 30 | 0.7 | 23% | 23% | 0% | 83% | 90% | 0.00 [0.00..0.00] | 0/0 | -0.2 [-0.4..0.0] | -0.1 [-0.2..0.0] | 0.00 | 0.0 |
| 35 | ordinary monster (light) | light suction | 30 | 5.7 | 84% | 84% | 0% | 0% | 0% | -0.03 [-0.10..0.03] | 0/1 | 10.4 [8.4..12.4] | 3.7 [3.0..4.5] | 4.73 | 0.0 |
| 37 | ordinary monster (light) | light hot | 30 | 3.9 | 85% | 47% | 0% | 7% | 0% | 0.00 [0.00..0.00] | 0/0 | -0.0 [-0.2..0.2] | 0.0 [-0.1..0.1] | 0.00 | 0.0 |
| 38 | BRICK PRINTER | blocks | 30 | 1.4 | 98% | 98% | 65% | 0% | 50% | 0.00 [0.00..0.00] | 0/0 | 0.7 [0.2..1.1] | 0.3 [0.1..0.5] | 0.00 | 0.0 |
| 39 | ordinary monster (light) | light hot | 30 | 5.4 | 99% | 49% | 0% | 0% | 0% | 0.00 [0.00..0.00] | 0/0 | 0.8 [-0.4..2.0] | 0.3 [-0.2..0.8] | 0.00 | 0.0 |
| 40 | TWIN TOASTERS | hot+blocks (all) | 30 | 1.4 | 79% | 74% | 0% | 23% | 23% | 0.00 [0.00..0.00] | 0/0 | -0.4 [-0.9..0.1] | -0.3 [-0.5..0.0] | 0.00 | 0.0 |
| 40 | TWIN TOASTERS | hot (primary only) | 30 | 1.2 | 84% | 0% | 0% | 100% | 23% | 0.00 [0.00..0.00] | 0/0 | -0.4 [-0.9..0.1] | -0.3 [-0.5..0.0] | 0.00 | 0.0 |
| 40 | TWIN TOASTERS | blocks (second) | 30 | 0.2 | 40% | 40% | 0% | 93% | 100% | 0.00 [0.00..0.00] | 0/0 | 0.0 [0.0..0.0] | 0.0 [0.0..0.0] | 0.00 | 0.0 |
| 43 | ordinary monster (light) | light frost | 30 | 7.0 | 7% | 0% | 0% | 100% | 50% | -0.17 [-0.30..-0.03] | 0/5 | 7.3 [3.9..10.8] | 3.9 [2.1..5.7] | 0.00 | 0.0 |
| 44 | ordinary monster (light) | light suction | 30 | 5.4 | 75% | 75% | 0% | 0% | 0% | -0.10 [-0.21..0.01] | 0/3 | 0.9 [-4.4..6.2] | 0.3 [-2.5..3.1] | 4.07 | 0.0 |
| 47 | ordinary monster (light) | light rest | 30 | 4.5 | 96% | 46% | 0% | 7% | 7% | -0.07 [-0.16..0.02] | 0/2 | 3.8 [-4.2..11.7] | 1.4 [-1.8..4.7] | 0.00 | 0.0 |
| 48 | SCRAP KRAKEN | pull | 30 | 1.4 | 74% | 74% | 0% | 20% | 40% | 0.00 [0.00..0.00] | 0/0 | 0.3 [-0.0..0.7] | 0.2 [-0.0..0.4] | 0.00 | 0.0 |
| 49 | ordinary monster (light) | light rest | 30 | 6.0 | 100% | 38% | 0% | 0% | 0% | -0.30 [-0.47..-0.13] | 0/9 | 2.1 [1.0..3.2] | 0.7 [0.3..1.2] | 0.00 | 0.0 |
| 50 | PIANO-SAURUS REX | rest+pull (all) | 30 | 3.6 | 92% | 71% | 0% | 3% | 3% | -0.07 [-0.20..0.06] | 1/3 | -0.1 [-1.6..1.3] | -0.2 [-0.9..0.6] | 0.00 | 0.0 |
| 50 | PIANO-SAURUS REX | rest (primary only) | 30 | 2.7 | 95% | 0% | 0% | 100% | 3% | -0.17 [-0.33..-0.00] | 1/6 | 0.2 [-1.2..1.6] | -0.0 [-0.8..0.7] | 0.00 | 0.0 |
| 50 | PIANO-SAURUS REX | pull (second) | 30 | 1.0 | 86% | 86% | 0% | 17% | 73% | 0.10 [-0.01..0.21] | 3/0 | -0.3 [-1.2..0.5] | -0.1 [-0.6..0.3] | 0.00 | 0.0 |
| 52 | ordinary monster (light) | light hot | 30 | 5.3 | 96% | 37% | 0% | 7% | 0% | 0.00 [0.00..0.00] | 0/0 | 1.0 [0.3..1.7] | 0.5 [0.1..0.8] | 0.00 | 0.0 |
| 54 | ordinary monster (light) | light suction | 30 | 6.4 | 90% | 90% | 0% | 0% | 0% | 0.10 [-0.01..0.21] | 3/0 | -18.6 [-25.0..-12.1] | -10.2 [-13.6..-6.7] | 5.77 | 0.0 |
| 55 | ordinary monster (light) | light rest | 30 | 5.1 | 100% | 37% | 0% | 7% | 7% | 0.00 [0.00..0.00] | 0/0 | 1.4 [0.4..2.4] | 0.5 [0.1..0.9] | 0.00 | 0.0 |
| 57 | ordinary monster (light) | light split | 30 | 3.7 | 96% | 42% | 0% | 3% | 3% | 0.00 [0.00..0.00] | 0/0 | 5.5 [3.7..7.3] | 2.2 [1.4..2.9] | 0.00 | 0.0 |
| 58 | SPRING JACK | bounce | 30 | 1.8 | 89% | 89% | 0% | 10% | 10% | 0.00 [0.00..0.00] | 0/0 | -4.0 [-5.8..-2.2] | -2.1 [-3.1..-1.1] | 0.00 | 0.0 |
| 59 | ordinary monster (light) | light rest | 30 | 6.0 | 98% | 22% | 0% | 13% | 17% | -0.10 [-0.21..0.01] | 0/3 | 2.2 [1.0..3.5] | 1.1 [0.6..1.6] | 0.00 | 0.0 |
| 60 | JUNKZILLA | split+bounce (all) | 30 | 2.0 | 97% | 77% | 0% | 0% | 3% | 0.00 [0.00..0.00] | 0/0 | 0.4 [-0.1..0.8] | 0.2 [-0.0..0.4] | 0.00 | 0.0 |
| 60 | JUNKZILLA | split (primary only) | 30 | 1.8 | 100% | 0% | 0% | 100% | 7% | 0.00 [0.00..0.00] | 0/0 | 0.3 [-0.1..0.8] | 0.2 [-0.1..0.4] | 0.00 | 0.0 |
| 60 | JUNKZILLA | bounce (second) | 30 | 0.2 | 67% | 67% | 0% | 87% | 93% | 0.00 [0.00..0.00] | 0/0 | 0.1 [-0.1..0.2] | 0.0 [-0.0..0.1] | 0.00 | 0.0 |
| 63 | ordinary monster (light) | light tow | 30 | 3.0 | 100% | 0% | 0% | 100% | 100% | 0.00 [0.00..0.00] | 0/0 | 0.0 [0.0..0.0] | 0.0 [0.0..0.0] | 0.00 | 0.0 |
| 68 | OIL OTTER | slick+conveyor (all) | 30 | 1.6 | 70% | 15% | 0% | 77% | 90% | 0.00 [0.00..0.00] | 0/0 | -0.0 [-0.1..0.0] | 0.0 [0.0..0.0] | 0.00 | 0.0 |
| 70 | RIVET RHINO | tow+slick (all) | 30 | 2.2 | 78% | 0% | 0% | 100% | 100% | 0.00 [0.00..0.00] | 0/0 | 0.0 [0.0..0.0] | 0.0 [0.0..0.0] | 0.00 | 0.0 |
| 70 | RIVET RHINO | tow (primary only) | 30 | 1.6 | 78% | 0% | 0% | 100% | 100% | 0.00 [0.00..0.00] | 0/0 | 0.0 [0.0..0.0] | 0.0 [0.0..0.0] | 0.00 | 0.0 |
| 70 | RIVET RHINO | slick (second) | 30 | 0.5 | 81% | 0% | 0% | 100% | 100% | 0.00 [0.00..0.00] | 0/0 | 0.0 [0.0..0.0] | 0.0 [0.0..0.0] | 0.00 | 0.0 |
| 73 | ordinary monster (light) | light ransom | 30 | 2.6 | 0% | 0% | 78% | 0% | 100% | 0.00 [0.00..0.00] | 0/0 | 0.0 [0.0..0.0] | 0.0 [0.0..0.0] | 0.00 | 0.0 |
| 77 | ordinary monster (light) | light frost | 30 | 6.0 | 6% | 0% | 0% | 100% | 83% | 0.00 [0.00..0.00] | 0/0 | 0.2 [0.0..0.3] | 0.1 [-0.0..0.2] | 0.00 | 0.0 |
| 78 | PORTAL POSSUM | portals+mirror (all) | 30 | 1.5 | 75% | 14% | 0% | 80% | 80% | 0.00 [0.00..0.00] | 0/0 | -0.2 [-0.4..0.0] | -0.1 [-0.2..0.0] | 0.00 | 0.0 |
| 80 | CHRONO CHIMERA | ransom+portals (all) | 30 | 2.1 | 74% | 60% | 18% | 0% | 20% | 0.00 [0.00..0.00] | 0/0 | 0.4 [-0.3..1.2] | 0.3 [-0.2..0.7] | 0.00 | 2.5 |
| 80 | CHRONO CHIMERA | ransom (primary only) | 30 | 1.6 | 77% | 77% | 23% | 0% | 20% | 0.00 [0.00..0.00] | 0/0 | 0.4 [-0.3..1.2] | 0.3 [-0.2..0.7] | 0.00 | 2.5 |
| 80 | CHRONO CHIMERA | portals (second) | 30 | 0.5 | 64% | 0% | 0% | 100% | 100% | 0.00 [0.00..0.00] | 0/0 | 0.0 [0.0..0.0] | 0.0 [0.0..0.0] | 0.00 | 0.0 |

### B2. Random bot @2.5 s

| L | boss / monster | attack | n | casts/run | board effect | felt | player responded | runs never felt | identical runs | win ON-OFF [95%] | flips (won only ON / only OFF) | time cost % clock [95%] | merges ON-OFF | units lost/run | clock s taken/run |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 8 | PRESSURE POPPER | bomb | 30 | 1.0 | 30% | 30% | 47% | 23% | 67% | 0.00 [0.00..0.00] | 0/0 | 0.3 [0.1..0.6] | 0.1 [0.0..0.3] | 0.30 | 0.0 |
| 10 | TIN CAN KING | clamp+bomb (all) | 30 | 1.0 | 66% | 0% | 0% | 100% | 93% | 0.00 [0.00..0.00] | 0/0 | 0.0 [0.0..0.0] | 0.0 [0.0..0.0] | 0.00 | 0.0 |
| 10 | TIN CAN KING | clamp (primary only) | 30 | 1.0 | 66% | 0% | 0% | 100% | 93% | 0.00 [0.00..0.00] | 0/0 | 0.0 [0.0..0.0] | 0.0 [0.0..0.0] | 0.00 | 0.0 |
| 10 | TIN CAN KING | bomb (second) | 30 | 0.0 | - | - | - | 100% | 100% | 0.00 [0.00..0.00] | 0/0 | 0.0 [0.0..0.0] | 0.0 [0.0..0.0] | 0.00 | 0.0 |
| 18 | CAROUSEL CRAB | conveyor | 30 | 1.0 | 100% | 100% | 0% | 7% | 7% | 0.03 [-0.03..0.10] | 1/0 | -0.7 [-1.9..0.6] | -0.2 [-0.6..0.3] | 0.00 | 0.0 |
| 19 | ordinary monster (light) | light frost | 30 | 3.5 | 11% | 0% | 0% | 100% | 80% | 0.00 [0.00..0.00] | 0/0 | 0.7 [-0.7..2.1] | 0.2 [-0.4..0.7] | 0.00 | 0.0 |
| 20 | FRIDGE OVERLORD | frost+conveyor (all) | 30 | 1.6 | 23% | 15% | 0% | 77% | 70% | 0.00 [0.00..0.00] | 0/0 | -0.0 [-0.2..0.2] | 0.0 [-0.1..0.1] | 0.00 | 0.0 |
| 20 | FRIDGE OVERLORD | frost (primary only) | 30 | 1.1 | 13% | 0% | 0% | 100% | 90% | 0.00 [0.00..0.00] | 0/0 | 0.0 [-0.0..0.0] | 0.0 [0.0..0.0] | 0.00 | 0.0 |
| 20 | FRIDGE OVERLORD | conveyor (second) | 30 | 0.5 | 47% | 47% | 0% | 77% | 77% | 0.00 [0.00..0.00] | 0/0 | -0.0 [-0.2..0.2] | 0.0 [-0.1..0.1] | 0.00 | 0.0 |
| 24 | ordinary monster (light) | light suction | 30 | 4.8 | 88% | 88% | 0% | 0% | 0% | -0.03 [-0.15..0.08] | 1/2 | -1.4 [-6.9..4.1] | -0.8 [-3.5..1.9] | 4.20 | 0.0 |
| 25 | ordinary monster (light) | light frost | 30 | 4.6 | 6% | 0% | 0% | 100% | 93% | 0.00 [0.00..0.00] | 0/0 | 0.2 [-0.3..0.7] | 0.1 [-0.2..0.4] | 0.00 | 0.0 |
| 28 | VANITY MOTH | mirror | 30 | 1.4 | 83% | 83% | 0% | 7% | 20% | 0.00 [0.00..0.00] | 0/0 | 0.3 [-0.5..1.2] | 0.2 [-0.2..0.7] | 0.00 | 0.0 |
| 29 | ordinary monster (light) | light suction | 30 | 4.7 | 84% | 84% | 0% | 0% | 0% | -0.03 [-0.15..0.08] | 1/2 | 4.0 [-2.3..10.2] | 2.0 [-1.1..5.1] | 3.97 | 0.0 |
| 30 | VIPER QUEEN | suction+mirror (all) | 30 | 2.1 | 75% | 75% | 0% | 3% | 3% | 0.00 [0.00..0.00] | 0/0 | 0.7 [-0.8..2.2] | 0.5 [-0.5..1.5] | 1.37 | 0.0 |
| 30 | VIPER QUEEN | suction (primary only) | 30 | 1.6 | 85% | 85% | 0% | 7% | 3% | 0.00 [0.00..0.00] | 0/0 | 0.9 [-0.6..2.3] | 0.6 [-0.4..1.6] | 1.37 | 0.0 |
| 30 | VIPER QUEEN | mirror (second) | 30 | 0.5 | 40% | 40% | 0% | 80% | 83% | 0.00 [0.00..0.00] | 0/0 | -0.2 [-0.5..0.1] | -0.1 [-0.3..0.1] | 0.00 | 0.0 |
| 35 | ordinary monster (light) | light suction | 30 | 4.1 | 80% | 80% | 0% | 3% | 0% | 0.00 [-0.09..0.09] | 1/1 | 5.8 [-0.3..11.9] | 2.9 [-0.1..5.9] | 3.27 | 0.0 |
| 37 | ordinary monster (light) | light hot | 30 | 4.1 | 92% | 63% | 0% | 0% | 0% | 0.00 [0.00..0.00] | 0/0 | 1.0 [-0.3..2.2] | 0.5 [-0.1..1.1] | 0.00 | 0.0 |
| 38 | BRICK PRINTER | blocks | 30 | 1.5 | 89% | 89% | 84% | 10% | 40% | 0.00 [0.00..0.00] | 0/0 | 0.9 [-0.3..2.0] | 0.4 [-0.2..0.9] | 0.00 | 0.0 |
| 39 | ordinary monster (light) | light hot | 30 | 4.6 | 96% | 74% | 0% | 0% | 0% | 0.00 [0.00..0.00] | 0/0 | 0.2 [-0.9..1.4] | 0.2 [-0.4..0.8] | 0.00 | 0.0 |
| 40 | TWIN TOASTERS | hot+blocks (all) | 30 | 1.7 | 90% | 82% | 16% | 17% | 10% | 0.00 [0.00..0.00] | 0/0 | 0.0 [-0.2..0.2] | -0.0 [-0.1..0.0] | 0.00 | 0.0 |
| 40 | TWIN TOASTERS | hot (primary only) | 30 | 1.2 | 97% | 0% | 0% | 100% | 10% | 0.00 [0.00..0.00] | 0/0 | 0.1 [-0.1..0.2] | 0.0 [-0.1..0.1] | 0.00 | 0.0 |
| 40 | TWIN TOASTERS | blocks (second) | 30 | 0.5 | 71% | 71% | 57% | 67% | 83% | 0.00 [0.00..0.00] | 0/0 | -0.1 [-0.2..0.1] | -0.0 [-0.1..0.0] | 0.00 | 0.0 |
| 43 | ordinary monster (light) | light frost | 30 | 6.3 | 7% | 0% | 0% | 100% | 70% | 0.03 [-0.03..0.10] | 1/0 | -1.2 [-4.2..1.8] | -0.9 [-2.9..1.2] | 0.00 | 0.0 |
| 44 | ordinary monster (light) | light suction | 30 | 5.0 | 86% | 86% | 0% | 0% | 0% | 0.00 [0.00..0.00] | 0/0 | 8.1 [3.4..12.9] | 5.2 [2.1..8.3] | 4.33 | 0.0 |
| 47 | ordinary monster (light) | light rest | 30 | 3.8 | 95% | 57% | 0% | 0% | 3% | 0.00 [0.00..0.00] | 0/0 | 1.0 [-0.5..2.6] | 0.5 [-0.3..1.2] | 0.00 | 0.0 |
| 48 | SCRAP KRAKEN | pull | 30 | 1.8 | 70% | 70% | 0% | 17% | 47% | 0.03 [-0.03..0.10] | 1/0 | -1.3 [-2.3..-0.4] | -0.8 [-1.4..-0.2] | 0.00 | 0.0 |
| 49 | ordinary monster (light) | light rest | 30 | 4.9 | 95% | 55% | 0% | 7% | 3% | 0.00 [0.00..0.00] | 0/0 | 1.2 [-0.3..2.7] | 0.5 [-0.2..1.3] | 0.00 | 0.0 |
| 50 | PIANO-SAURUS REX | rest+pull (all) | 30 | 2.0 | 83% | 72% | 0% | 10% | 20% | 0.00 [0.00..0.00] | 0/0 | 0.4 [-0.9..1.6] | 0.2 [-0.6..1.0] | 0.00 | 0.0 |
| 50 | PIANO-SAURUS REX | rest (primary only) | 30 | 1.5 | 95% | 0% | 0% | 100% | 20% | 0.00 [0.00..0.00] | 0/0 | 0.4 [-0.9..1.6] | 0.2 [-0.6..1.0] | 0.00 | 0.0 |
| 50 | PIANO-SAURUS REX | pull (second) | 30 | 0.5 | 50% | 50% | 0% | 73% | 87% | 0.00 [0.00..0.00] | 0/0 | -0.0 [-0.0..0.0] | 0.0 [0.0..0.0] | 0.00 | 0.0 |
| 52 | ordinary monster (light) | light hot | 30 | 4.1 | 94% | 67% | 0% | 0% | 0% | 0.00 [0.00..0.00] | 0/0 | -1.0 [-3.0..1.0] | -0.5 [-1.5..0.5] | 0.00 | 0.0 |
| 54 | ordinary monster (light) | light suction | 30 | 5.6 | 80% | 80% | 0% | 0% | 0% | -0.13 [-0.26..-0.01] | 0/4 | 7.1 [0.8..13.5] | 4.6 [0.5..8.7] | 4.47 | 0.0 |
| 55 | ordinary monster (light) | light rest | 30 | 4.0 | 90% | 46% | 0% | 17% | 23% | 0.00 [0.00..0.00] | 0/0 | 1.3 [-0.1..2.6] | 0.6 [-0.0..1.2] | 0.00 | 0.0 |
| 57 | ordinary monster (light) | light split | 30 | 4.4 | 91% | 54% | 0% | 3% | 10% | 0.00 [0.00..0.00] | 0/0 | 0.9 [-0.0..1.7] | 0.4 [-0.1..0.8] | 0.00 | 0.0 |
| 58 | SPRING JACK | bounce | 30 | 2.2 | 87% | 87% | 0% | 0% | 0% | -0.03 [-0.10..0.03] | 0/1 | 2.1 [0.6..3.6] | 1.4 [0.4..2.3] | 0.00 | 0.0 |
| 59 | ordinary monster (light) | light rest | 30 | 4.5 | 95% | 59% | 0% | 0% | 3% | 0.00 [0.00..0.00] | 0/0 | 0.0 [-2.1..2.2] | -0.0 [-1.0..1.0] | 0.00 | 0.0 |
| 60 | JUNKZILLA | split+bounce (all) | 30 | 2.1 | 88% | 73% | 0% | 7% | 10% | 0.00 [0.00..0.00] | 0/0 | 0.9 [0.1..1.6] | 0.6 [0.1..1.2] | 0.00 | 0.0 |
| 60 | JUNKZILLA | split (primary only) | 30 | 1.5 | 100% | 0% | 0% | 100% | 23% | 0.00 [0.00..0.00] | 0/0 | 0.6 [-0.1..1.3] | 0.4 [-0.1..0.9] | 0.00 | 0.0 |
| 60 | JUNKZILLA | bounce (second) | 30 | 0.6 | 65% | 65% | 0% | 63% | 67% | 0.00 [0.00..0.00] | 0/0 | 0.3 [0.0..0.6] | 0.2 [-0.0..0.5] | 0.00 | 0.0 |
| 63 | ordinary monster (light) | light tow | 30 | 4.7 | 79% | 0% | 0% | 100% | 100% | 0.00 [0.00..0.00] | 0/0 | 0.0 [0.0..0.0] | 0.0 [0.0..0.0] | 0.00 | 0.0 |
| 68 | OIL OTTER | slick+conveyor (all) | 30 | 1.6 | 70% | 13% | 0% | 80% | 80% | 0.00 [0.00..0.00] | 0/0 | -0.1 [-0.3..0.1] | -0.1 [-0.2..0.0] | 0.00 | 0.0 |
| 70 | RIVET RHINO | tow+slick (all) | 30 | 1.8 | 76% | 0% | 0% | 100% | 100% | 0.00 [0.00..0.00] | 0/0 | 0.0 [0.0..0.0] | 0.0 [0.0..0.0] | 0.00 | 0.0 |
| 70 | RIVET RHINO | tow (primary only) | 30 | 1.4 | 88% | 0% | 0% | 100% | 100% | 0.00 [0.00..0.00] | 0/0 | 0.0 [0.0..0.0] | 0.0 [0.0..0.0] | 0.00 | 0.0 |
| 70 | RIVET RHINO | slick (second) | 30 | 0.5 | 43% | 0% | 0% | 100% | 100% | 0.00 [0.00..0.00] | 0/0 | 0.0 [0.0..0.0] | 0.0 [0.0..0.0] | 0.00 | 0.0 |
| 73 | ordinary monster (light) | light ransom | 30 | 4.0 | 59% | 59% | 36% | 0% | 3% | 0.00 [0.00..0.00] | 0/0 | 1.0 [-0.7..2.6] | 0.4 [-0.4..1.2] | 0.00 | 4.7 |
| 77 | ordinary monster (light) | light frost | 30 | 4.7 | 9% | 0% | 0% | 100% | 60% | 0.00 [0.00..0.00] | 0/0 | -0.1 [-1.4..1.1] | -0.1 [-0.8..0.6] | 0.00 | 0.0 |
| 78 | PORTAL POSSUM | portals+mirror (all) | 30 | 2.0 | 54% | 8% | 0% | 83% | 83% | 0.03 [-0.03..0.10] | 1/0 | -0.1 [-0.2..0.1] | -0.0 [-0.1..0.0] | 0.00 | 0.0 |
| 80 | CHRONO CHIMERA | ransom+portals (all) | 30 | 2.1 | 61% | 53% | 19% | 3% | 27% | -0.03 [-0.10..0.03] | 0/1 | -0.4 [-1.4..0.5] | -0.3 [-0.9..0.3] | 0.00 | 2.3 |
| 80 | CHRONO CHIMERA | ransom (primary only) | 30 | 1.6 | 72% | 72% | 26% | 3% | 27% | -0.03 [-0.10..0.03] | 0/1 | -0.4 [-1.4..0.5] | -0.3 [-0.9..0.3] | 0.00 | 2.3 |
| 80 | CHRONO CHIMERA | portals (second) | 30 | 0.6 | 29% | 0% | 0% | 100% | 100% | 0.00 [0.00..0.00] | 0/0 | 0.0 [0.0..0.0] | 0.0 [0.0..0.0] | 0.00 | 0.0 |

### B3. Planner @3 s (n = 6 per arm: wide intervals, read as a sanity check only)

| L | boss / monster | attack | n | casts/run | board effect | felt | player responded | runs never felt | identical runs | win ON-OFF [95%] | flips (won only ON / only OFF) | time cost % clock [95%] | merges ON-OFF | units lost/run | clock s taken/run |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 8 | PRESSURE POPPER | bomb | 6 | 1.0 | 0% | 0% | 100% | 0% | 100% | 0.00 [0.00..0.00] | 0/0 | 0.0 [0.0..0.0] | 0.0 [0.0..0.0] | 0.00 | 0.0 |
| 10 | TIN CAN KING | clamp+bomb (all) | 6 | 1.0 | 100% | 0% | 0% | 100% | 100% | 0.00 [0.00..0.00] | 0/0 | 0.0 [0.0..0.0] | 0.0 [0.0..0.0] | 0.00 | 0.0 |
| 10 | TIN CAN KING | clamp (primary only) | 6 | 1.0 | 100% | 0% | 0% | 100% | 100% | 0.00 [0.00..0.00] | 0/0 | 0.0 [0.0..0.0] | 0.0 [0.0..0.0] | 0.00 | 0.0 |
| 10 | TIN CAN KING | bomb (second) | 6 | 0.0 | - | - | - | 100% | 100% | 0.00 [0.00..0.00] | 0/0 | 0.0 [0.0..0.0] | 0.0 [0.0..0.0] | 0.00 | 0.0 |
| 18 | CAROUSEL CRAB | conveyor | 6 | 1.0 | 100% | 100% | 0% | 0% | 33% | 0.00 [0.00..0.00] | 0/0 | 0.7 [-0.3..1.6] | 0.5 [0.1..0.9] | 0.00 | 0.0 |
| 20 | FRIDGE OVERLORD | frost+conveyor (all) | 6 | 1.0 | 33% | 0% | 0% | 100% | 83% | 0.00 [0.00..0.00] | 0/0 | 0.0 [0.0..0.0] | 0.0 [0.0..0.0] | 0.00 | 0.0 |
| 20 | FRIDGE OVERLORD | frost (primary only) | 6 | 1.0 | 33% | 0% | 0% | 100% | 83% | 0.00 [0.00..0.00] | 0/0 | 0.0 [0.0..0.0] | 0.0 [0.0..0.0] | 0.00 | 0.0 |
| 20 | FRIDGE OVERLORD | conveyor (second) | 6 | 0.0 | - | - | - | 100% | 100% | 0.00 [0.00..0.00] | 0/0 | 0.0 [0.0..0.0] | 0.0 [0.0..0.0] | 0.00 | 0.0 |
| 28 | VANITY MOTH | mirror | 6 | 1.5 | 56% | 56% | 0% | 33% | 33% | 0.00 [0.00..0.00] | 0/0 | 2.2 [0.2..4.3] | 1.0 [0.1..1.9] | 0.00 | 0.0 |
| 30 | VIPER QUEEN | suction+mirror (all) | 6 | 1.8 | 91% | 91% | 0% | 0% | 0% | 0.00 [0.00..0.00] | 0/0 | 1.2 [0.0..2.3] | 0.7 [-0.2..1.5] | 1.00 | 0.0 |
| 30 | VIPER QUEEN | suction (primary only) | 6 | 1.0 | 100% | 100% | 0% | 0% | 0% | 0.00 [0.00..0.00] | 0/0 | 1.2 [0.0..2.3] | 0.7 [-0.2..1.5] | 1.00 | 0.0 |
| 30 | VIPER QUEEN | mirror (second) | 6 | 0.8 | 80% | 80% | 0% | 33% | 50% | 0.00 [0.00..0.00] | 0/0 | 0.0 [0.0..0.0] | 0.0 [0.0..0.0] | 0.00 | 0.0 |
| 38 | BRICK PRINTER | blocks | 6 | 1.0 | 100% | 100% | 17% | 0% | 83% | 0.00 [0.00..0.00] | 0/0 | 0.1 [-0.1..0.3] | 0.0 [0.0..0.0] | 0.00 | 0.0 |
| 40 | TWIN TOASTERS | hot+blocks (all) | 6 | 1.0 | 67% | 67% | 0% | 33% | 33% | 0.00 [0.00..0.00] | 0/0 | 0.2 [-0.2..0.6] | 0.0 [0.0..0.0] | 0.00 | 0.0 |
| 40 | TWIN TOASTERS | hot (primary only) | 6 | 1.0 | 67% | 0% | 0% | 100% | 33% | 0.00 [0.00..0.00] | 0/0 | 0.2 [-0.2..0.6] | 0.0 [0.0..0.0] | 0.00 | 0.0 |
| 40 | TWIN TOASTERS | blocks (second) | 6 | 0.0 | - | - | - | 100% | 100% | 0.00 [0.00..0.00] | 0/0 | 0.0 [0.0..0.0] | 0.0 [0.0..0.0] | 0.00 | 0.0 |
| 48 | SCRAP KRAKEN | pull | 6 | 1.2 | 71% | 71% | 0% | 33% | 67% | 0.00 [0.00..0.00] | 0/0 | 0.1 [-0.1..0.2] | 0.2 [-0.2..0.5] | 0.00 | 0.0 |
| 50 | PIANO-SAURUS REX | rest+pull (all) | 6 | 1.7 | 70% | 50% | 0% | 33% | 33% | 0.00 [0.00..0.00] | 0/0 | 0.8 [-0.3..2.0] | 0.3 [-0.3..1.0] | 0.00 | 0.0 |
| 50 | PIANO-SAURUS REX | rest (primary only) | 6 | 1.0 | 100% | 0% | 0% | 100% | 33% | 0.00 [0.00..0.00] | 0/0 | 0.8 [-0.3..2.0] | 0.3 [-0.3..1.0] | 0.00 | 0.0 |
| 50 | PIANO-SAURUS REX | pull (second) | 6 | 0.7 | 25% | 25% | 0% | 83% | 83% | 0.00 [0.00..0.00] | 0/0 | 0.0 [0.0..0.0] | 0.0 [0.0..0.0] | 0.00 | 0.0 |
| 58 | SPRING JACK | bounce | 6 | 1.2 | 100% | 100% | 0% | 0% | 0% | 0.00 [0.00..0.00] | 0/0 | -5.4 [-8.0..-2.8] | -3.0 [-4.3..-1.7] | 0.00 | 0.0 |
| 60 | JUNKZILLA | split+bounce (all) | 6 | 1.5 | 78% | 67% | 0% | 17% | 17% | 0.00 [0.00..0.00] | 0/0 | 0.3 [-0.3..0.8] | 0.2 [-0.2..0.5] | 0.00 | 0.0 |
| 60 | JUNKZILLA | split (primary only) | 6 | 1.0 | 100% | 0% | 0% | 100% | 17% | 0.00 [0.00..0.00] | 0/0 | 0.3 [-0.3..0.8] | 0.2 [-0.2..0.5] | 0.00 | 0.0 |
| 60 | JUNKZILLA | bounce (second) | 6 | 0.5 | 33% | 33% | 0% | 83% | 100% | 0.00 [0.00..0.00] | 0/0 | 0.0 [0.0..0.0] | 0.0 [0.0..0.0] | 0.00 | 0.0 |
| 68 | OIL OTTER | slick+conveyor (all) | 6 | 1.5 | 67% | 11% | 0% | 83% | 83% | 0.00 [0.00..0.00] | 0/0 | 0.0 [0.0..0.0] | 0.0 [0.0..0.0] | 0.00 | 0.0 |
| 70 | RIVET RHINO | tow+slick (all) | 6 | 2.7 | 75% | 0% | 0% | 100% | 100% | 0.00 [0.00..0.00] | 0/0 | 0.0 [0.0..0.0] | 0.0 [0.0..0.0] | 0.00 | 0.0 |
| 70 | RIVET RHINO | tow (primary only) | 6 | 2.3 | 79% | 0% | 0% | 100% | 100% | 0.00 [0.00..0.00] | 0/0 | 0.0 [0.0..0.0] | 0.0 [0.0..0.0] | 0.00 | 0.0 |
| 70 | RIVET RHINO | slick (second) | 6 | 0.3 | 50% | 0% | 0% | 100% | 100% | 0.00 [0.00..0.00] | 0/0 | 0.0 [0.0..0.0] | 0.0 [0.0..0.0] | 0.00 | 0.0 |
| 78 | PORTAL POSSUM | portals+mirror (all) | 6 | 2.5 | 93% | 27% | 0% | 33% | 33% | 0.00 [0.00..0.00] | 0/0 | -1.2 [-2.4..0.1] | -0.7 [-1.5..0.2] | 0.00 | 0.0 |
| 80 | CHRONO CHIMERA | ransom+portals (all) | 6 | 2.3 | 71% | 57% | 21% | 0% | 0% | 0.00 [0.00..0.00] | 0/0 | -0.2 [-0.7..0.2] | -0.2 [-0.5..0.2] | 0.00 | 2.7 |
| 80 | CHRONO CHIMERA | ransom (primary only) | 6 | 1.8 | 73% | 73% | 27% | 0% | 0% | 0.00 [0.00..0.00] | 0/0 | -0.2 [-0.7..0.2] | -0.2 [-0.5..0.2] | 0.00 | 2.7 |
| 80 | CHRONO CHIMERA | portals (second) | 6 | 0.5 | 67% | 0% | 0% | 100% | 100% | 0.00 [0.00..0.00] | 0/0 | 0.0 [0.0..0.0] | 0.0 [0.0..0.0] | 0.00 | 0.0 |

### B4. Pooled per attack (smart@3 and random@2.5 together, ON vs OFF rows of levels where the attack is the only or the first attack; chapter bosses' second attack shown separately)

| attack | levels | casts | board effect | felt | responded | whiff | runs never felt | identical runs | time cost % clock [95%] | win ON-OFF |
|---|---|---|---|---|---|---|---|---|---|---|
| blocks [as second attack] | 40 | 19 | 63% | 63% | 42% | 37% | 80% | 92% | -0.0 | 0.000 |
| blocks | 38 | 87 | 93% | 93% | 75% | 7% | 5% | 45% | 0.8 | 0.000 |
| bomb [as second attack] | 10 | 0 | 0% | 0% | 0% | - | 100% | 100% | 0.0 | 0.000 |
| bomb | 8 | 60 | 15% | 15% | 73% | 85% | 12% | 70% | 0.2 | 0.000 |
| bounce [as second attack] | 60 | 23 | 65% | 65% | 0% | 35% | 75% | 80% | 0.2 | 0.000 |
| bounce | 58 | 122 | 88% | 88% | 0% | 12% | 5% | 5% | -0.9 | -0.017 |
| clamp | 10 | 59 | 83% | 0% | 0% | 17% | 100% | 97% | 0.0 | 0.000 |
| conveyor [as second attack] | 20 | 22 | 36% | 36% | 0% | 64% | 87% | 88% | -0.0 | 0.000 |
| conveyor | 18 | 61 | 100% | 100% | 0% | 0% | 3% | 3% | 0.1 | 0.017 |
| frost | 19 20 25 43 77 | 1263 | 9% | 0% | 0% | 91% | 100% | 75% | 0.8 | -0.013 |
| hot | 37 39 40 52 | 898 | 94% | 51% | 0% | 6% | 27% | 4% | 0.2 | 0.000 |
| mirror [as second attack] | 30 | 37 | 30% | 30% | 0% | 70% | 82% | 87% | -0.2 | 0.000 |
| mirror | 28 | 70 | 84% | 84% | 0% | 16% | 12% | 23% | 0.5 | 0.000 |
| portals [as second attack] | 80 | 31 | 45% | 0% | 0% | 55% | 100% | 100% | 0.0 | 0.000 |
| pull [as second attack] | 50 | 45 | 73% | 73% | 0% | 27% | 45% | 80% | -0.2 | 0.050 |
| pull | 48 | 95 | 72% | 72% | 0% | 28% | 18% | 43% | -0.5 | 0.017 |
| ransom | 73 80 | 293 | 48% | 48% | 43% | 52% | 1% | 38% | 0.2 | -0.008 |
| rest | 47 49 50 55 59 | 1284 | 96% | 39% | 0% | 4% | 25% | 9% | 1.4 | -0.063 |
| slick [as second attack] | 70 | 30 | 63% | 0% | 0% | 37% | 100% | 100% | 0.0 | 0.000 |
| split | 57 60 | 341 | 95% | 34% | 0% | 5% | 52% | 11% | 1.8 | 0.000 |
| suction | 24 29 30 35 44 54 | 1621 | 83% | 83% | 0% | 17% | 2% | 1% | 1.9 | -0.044 |
| tow | 63 70 | 320 | 86% | 0% | 0% | 14% | 100% | 100% | 0.0 | 0.000 |

### B5. Ranking: boss / monster powers by impact (smart@3, ON vs OFF, largest absolute time cost first)

| rank | L | boss | attack | time cost % clock [95%] | win ON-OFF | runs never felt | significant (interval excludes 0) |
|---|---|---|---|---|---|---|---|
| 1 | 54 | ordinary monster (light) | light suction | -18.6 [-25.0..-12.1] | 0.10 | 0% | yes |
| 2 | 35 | ordinary monster (light) | light suction | 10.4 [8.4..12.4] | -0.03 | 0% | yes |
| 3 | 43 | ordinary monster (light) | light frost | 7.3 [3.9..10.8] | -0.17 | 100% | yes |
| 4 | 57 | ordinary monster (light) | light split | 5.5 [3.7..7.3] | 0.00 | 3% | yes |
| 5 | 58 | SPRING JACK | bounce | -4.0 [-5.8..-2.2] | 0.00 | 10% | yes |
| 6 | 47 | ordinary monster (light) | light rest | 3.8 [-4.2..11.7] | -0.07 | 7% | no |
| 7 | 29 | ordinary monster (light) | light suction | 2.8 [-1.8..7.3] | -0.13 | 0% | no |
| 8 | 24 | ordinary monster (light) | light suction | 2.3 [-3.7..8.2] | -0.17 | 0% | no |
| 9 | 59 | ordinary monster (light) | light rest | 2.2 [1.0..3.5] | -0.10 | 13% | yes |
| 10 | 49 | ordinary monster (light) | light rest | 2.1 [1.0..3.2] | -0.30 | 0% | yes |
| 11 | 55 | ordinary monster (light) | light rest | 1.4 [0.4..2.4] | 0.00 | 7% | yes |
| 12 | 52 | ordinary monster (light) | light hot | 1.0 [0.3..1.7] | 0.00 | 7% | yes |
| 13 | 20 | FRIDGE OVERLORD | frost+conveyor (all) | 1.0 [0.5..1.4] | 0.00 | 97% | yes |
| 14 | 18 | CAROUSEL CRAB | conveyor | 0.9 [0.5..1.4] | 0.00 | 0% | yes |
| 15 | 44 | ordinary monster (light) | light suction | 0.9 [-4.4..6.2] | -0.10 | 0% | no |
| 16 | 39 | ordinary monster (light) | light hot | 0.8 [-0.4..2.0] | 0.00 | 0% | no |
| 17 | 28 | VANITY MOTH | mirror | 0.7 [0.0..1.3] | 0.00 | 17% | yes |
| 18 | 38 | BRICK PRINTER | blocks | 0.7 [0.2..1.1] | 0.00 | 0% | yes |
| 19 | 80 | CHRONO CHIMERA | ransom+portals (all) | 0.4 [-0.3..1.2] | 0.00 | 0% | no |
| 20 | 40 | TWIN TOASTERS | hot+blocks (all) | -0.4 [-0.9..0.1] | 0.00 | 23% | no |
| 21 | 60 | JUNKZILLA | split+bounce (all) | 0.4 [-0.1..0.8] | 0.00 | 0% | no |
| 22 | 30 | VIPER QUEEN | suction+mirror (all) | 0.4 [-0.1..0.9] | 0.00 | 17% | no |
| 23 | 48 | SCRAP KRAKEN | pull | 0.3 [-0.0..0.7] | 0.00 | 20% | no |
| 24 | 78 | PORTAL POSSUM | portals+mirror (all) | -0.2 [-0.4..0.0] | 0.00 | 80% | no |
| 25 | 77 | ordinary monster (light) | light frost | 0.2 [0.0..0.3] | 0.00 | 100% | yes |
| 26 | 50 | PIANO-SAURUS REX | rest+pull (all) | -0.1 [-1.6..1.3] | -0.07 | 3% | no |
| 27 | 19 | ordinary monster (light) | light frost | 0.1 [-0.2..0.4] | 0.00 | 100% | no |
| 28 | 68 | OIL OTTER | slick+conveyor (all) | -0.0 [-0.1..0.0] | 0.00 | 77% | no |
| 29 | 8 | PRESSURE POPPER | bomb | 0.0 [-0.0..0.1] | 0.00 | 0% | no |
| 30 | 37 | ordinary monster (light) | light hot | -0.0 [-0.2..0.2] | 0.00 | 7% | no |
| 31 | 10 | TIN CAN KING | clamp+bomb (all) | 0.0 [0.0..0.0] | 0.00 | 100% | no |
| 32 | 25 | ordinary monster (light) | light frost | 0.0 [0.0..0.0] | 0.00 | 100% | no |
| 33 | 63 | ordinary monster (light) | light tow | 0.0 [0.0..0.0] | 0.00 | 100% | no |
| 34 | 70 | RIVET RHINO | tow+slick (all) | 0.0 [0.0..0.0] | 0.00 | 100% | no |
| 35 | 73 | ordinary monster (light) | light ransom | 0.0 [0.0..0.0] | 0.00 | 0% | no |

10 worst levels, metric B (weakest powers: smallest absolute time cost, smart@3):

| rank | L | boss | attack | time cost % clock | identical runs | never felt |
|---|---|---|---|---|---|---|
| 1 | 73 | ordinary monster (light) | light ransom | 0.0 [0.0..0.0] | 100% | 0% |
| 2 | 70 | RIVET RHINO | tow+slick (all) | 0.0 [0.0..0.0] | 100% | 100% |
| 3 | 63 | ordinary monster (light) | light tow | 0.0 [0.0..0.0] | 100% | 100% |
| 4 | 25 | ordinary monster (light) | light frost | 0.0 [0.0..0.0] | 97% | 100% |
| 5 | 10 | TIN CAN KING | clamp+bomb (all) | 0.0 [0.0..0.0] | 100% | 100% |
| 6 | 37 | ordinary monster (light) | light hot | -0.0 [-0.2..0.2] | 0% | 7% |
| 7 | 8 | PRESSURE POPPER | bomb | 0.0 [-0.0..0.1] | 73% | 0% |
| 8 | 68 | OIL OTTER | slick+conveyor (all) | -0.0 [-0.1..0.0] | 90% | 77% |
| 9 | 19 | ordinary monster (light) | light frost | 0.1 [-0.2..0.4] | 80% | 100% |
| 10 | 50 | PIANO-SAURUS REX | rest+pull (all) | -0.1 [-1.6..1.3] | 3% | 3% |

## C. Start variety

Start = what `newLevel(def)` hands the player (default loadout, shipped flags; the flag-ON rows use `TUNING.variedOpenings`, default OFF). "Identical-start share" = share of levels whose start equals at least one other level's on that axis; "pair share" = share of level pairs that are identical on it; "effective starts" = 2^entropy.

| axis | scope | distinct | levels sharing with another | pair share | largest group | effective starts |
|---|---|---|---|---|---|---|
| layout (cells + families + blocked cells) | all 80 | 28 | 57/80 (71%) | 22% | 37 | 10.0 |
| layout (cells + families + blocked cells) | 77 non-teach | 25 | 57/77 (74%) | 24% | 37 | 8.9 |
| layout (cells + families + blocked cells) | ordinary only (no teach, boss, mini) | 9 | 57/61 (93%) | 39% | 37 | 4.0 |
| rank mix (family+rank multiset, cells ignored) | all 80 | 18 | 73/80 (91%) | 12% | 22 | 10.8 |
| rank mix (family+rank multiset, cells ignored) | 77 non-teach | 16 | 72/77 (94%) | 13% | 22 | 10.0 |
| rank mix (family+rank multiset, cells ignored) | ordinary only (no teach, boss, mini) | 13 | 56/61 (92%) | 18% | 22 | 7.4 |
| units given (families on board, bag, item, shooter, gift) | all 80 | 19 | 67/80 (84%) | 20% | 31 | 8.1 |
| units given (families on board, bag, item, shooter, gift) | 77 non-teach | 17 | 66/77 (86%) | 20% | 30 | 7.5 |
| units given (families on board, bag, item, shooter, gift) | ordinary only (no teach, boss, mini) | 16 | 50/61 (82%) | 26% | 30 | 6.7 |
| first 6 parts delivered (smart bot, 20 s) | all 80 | 79 | 2/80 (3%) | 0% | 2 | 78.6 |
| first 6 parts delivered (smart bot, 20 s) | 77 non-teach | 76 | 2/77 (3%) | 0% | 2 | 75.6 |
| first 6 parts delivered (smart bot, 20 s) | ordinary only (no teach, boss, mini) | 60 | 2/61 (3%) | 0% | 2 | 59.6 |
| whole designed start (layout + rank mix + units given; deliveries excluded: they depend on how the bot plays) | all 80 | 47 | 43/80 (54%) | 4% | 14 | 32.0 |
| whole designed start (layout + rank mix + units given; deliveries excluded: they depend on how the bot plays) | 77 non-teach | 44 | 43/77 (56%) | 5% | 14 | 29.7 |
| whole designed start (layout + rank mix + units given; deliveries excluded: they depend on how the bot plays) | ordinary only (no teach, boss, mini) | 28 | 43/61 (70%) | 7% | 14 | 18.3 |
| layout, varied-openings flag ON | all 80 | 41 | 48/80 (60%) | 5% | 11 | 25.5 |
| layout, varied-openings flag ON | 77 non-teach | 38 | 48/77 (62%) | 6% | 11 | 23.5 |
| layout, varied-openings flag ON | ordinary only (no teach, boss, mini) | 22 | 48/61 (79%) | 9% | 11 | 13.6 |
| whole start, varied-openings flag ON | all 80 | 63 | 26/80 (33%) | 1% | 5 | 55.4 |
| whole start, varied-openings flag ON | 77 non-teach | 60 | 26/77 (34%) | 1% | 5 | 52.6 |
| whole start, varied-openings flag ON | ordinary only (no teach, boss, mini) | 44 | 26/61 (43%) | 2% | 5 | 37.7 |

Largest identical whole-start groups (non-teach):

| group | levels | count |
|---|---|---|
| 1 | 24 29 33 37 61 62 63 66 71 73 75 76 77 79 | 14 |
| 2 | 4 5 7 9 15 19 | 6 |
| 3 | 43 44 46 47 56 | 5 |
| 4 | 32 39 69 72 | 4 |
| 5 | 23 27 65 | 3 |
| 6 | 25 35 67 | 3 |
| 7 | 34 64 | 2 |
| 8 | 42 55 | 2 |
| 9 | 49 57 | 2 |
| 10 | 54 59 | 2 |

Per chapter (non-teach): distinct layouts / rank mixes / units-given / first deliveries / whole starts:

| chapter | levels | layouts | rank mixes | units given | first parts | whole starts |
|---|---|---|---|---|---|---|
| 1 | 7 | 4 | 3 | 3 | 7 | 4 |
| 2 | 10 | 6 | 5 | 8 | 10 | 9 |
| 3 | 10 | 5 | 4 | 7 | 10 | 8 |
| 4 | 10 | 6 | 4 | 6 | 10 | 8 |
| 5 | 10 | 5 | 3 | 5 | 9 | 7 |
| 6 | 10 | 7 | 5 | 7 | 10 | 9 |
| 7 | 10 | 7 | 5 | 5 | 10 | 7 |
| 8 | 10 | 5 | 3 | 3 | 10 | 5 |

10 worst levels, metric C (members of the largest identical-start groups, level lists above; the biggest group is the worst offender). Units given never varies by design: every ordinary level starts with the same 8 starter families (4 shooters, 2 coils, 2 bells) and a standard bag; only a few levels add a helper (`start_extra`), an item teach, or a gift.


## D. Player power versus enemy effort

Squads (found by `--part dsearch`, smart@3 damage per second on a representative level of each roster segment; unit levels from the plan's expected-level table per chapter, applied as the damage multiplier only): STARTER = Cannon/Coil/Bell at unit level 1 (what levels.json was fitted with), STARTER+LV = same squad at the expected unit level, GIFT = best squad using only starters and the guaranteed level gifts (nail_gun L10, wrench L13, jackhammer L20, gear L25, saw_blade L30, blowtorch L35, blast_plate L40, signal_beacon L50), CEILING = best squad if the player also owns every unit of an open crate rarity (a lucky crate run; Legendary excluded because crates B is off). Support cards (Blast Plate, Blueprint, ...) are not played. Roster segments and the squads chosen:

| from level | rep level | GIFT squad | CEILING squad | GIFT dps | CEILING dps |
|---|---|---|---|---|---|
| 1 | 5 | cannon/bell+coil | cannon/bell+coil | 75 | 75 |
| 11 | 13 | nail_gun/bell+coil | wrecking_ball/bell+router/+wrench | 186 | 234 |
| 14 | 17 | nail_gun/bell+coil/+wrench | wrecking_ball/horn+coil | 206 | 234 |
| 21 | 22 | cannon/coil+bell | saw_blade/bell+router | 333 | 465 |
| 26 | 28 | nail_gun/coil+bell/+fan | nail_gun/coil+router/+fan | 595 | 619 |
| 31 | 31 | saw_blade/coil+bell | saw_blade/coil+vice/+wrench | 748 | 780 |
| 36 | 38 | saw_blade/bell+coil | lathe/coil+bell | 515 | 593 |
| 41 | 45 | nail_gun/coil+bell/+wrench | lathe/bell+router/+wrench | 810 | 973 |
| 51 | 64 | nail_gun/bell+gear/+wrench | nail_gun/bell+vice/+wrench | 659 | 683 |

DPS = total damage dealt / time played (cascade cap and kill carry-over included), smart@3, n = 20 per cell. Effort = sum of the level's finite stage HP (goal levels exclude the goal machine, whose cost is time). Need = effort / (DPS x clock): the share of the clock the squad needs on average; above 1 means the bot loses on average. Win and chain from the same runs.

| L | clock | effort HP | STARTER dps | STARTER+LV dps | GIFT dps | CEILING dps | need STARTER | need STARTER+LV | need GIFT | need CEILING | win S/S+LV/G/C | chain avg S / C |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 45 | 1000 | 42 | 43 | 43 | 43 | 0.53 | 0.52 | 0.52 | 0.52 | 100%/100%/100%/100% | 3.0 / 3.0 |
| 2 | 45 | 800 | 35 | 33 | 33 | 33 | 0.51 | 0.54 | 0.54 | 0.54 | 100%/100%/100%/100% | 3.9 / 3.9 |
| 3 | 70 | 2800 | 82 | 80 | 80 | 80 | 0.49 | 0.50 | 0.50 | 0.50 | 100%/100%/100%/100% | 6.6 / 6.6 |
| 4 | 70 | 2600 (+goal) | 82 | 84 | 76 | 76 | 0.45 | 0.44 | 0.49 | 0.49 | 100%/100%/100%/100% | 5.9 / 4.9 |
| 5 | 70 | 2500 | 69 | 71 | 73 | 73 | 0.52 | 0.51 | 0.49 | 0.49 | 100%/100%/100%/100% | 4.7 / 8.1 |
| 6 | 70 | 3300 | 97 | 97 | 75 | 75 | 0.49 | 0.49 | 0.63 | 0.63 | 100%/100%/100%/100% | 7.2 / 7.4 |
| 7 | 95 | 5000 (+goal) | 105 | 96 | 127 | 127 | 0.50 | 0.55 | 0.41 | 0.41 | 100%/100%/100%/100% | 5.3 / 5.2 |
| 8 | 95 | 4800 | 117 | 124 | 113 | 113 | 0.43 | 0.41 | 0.45 | 0.45 | 100%/100%/100%/100% | 10.0 / 7.1 |
| 9 | 95 | 5199 | 87 | 89 | 92 | 92 | 0.63 | 0.62 | 0.59 | 0.59 | 100%/100%/100%/100% | 6.7 / 5.8 |
| 10 | 95 | 4500 | 86 | 87 | 132 | 132 | 0.55 | 0.55 | 0.36 | 0.36 | 100%/100%/100%/100% | 5.8 / 8.1 |
| 11 | 95 | 9150 | 135 | 130 | 125 | 249 | 0.71 | 0.74 | 0.77 | 0.39 | 100%/100%/100%/100% | 6.1 / 9.0 |
| 12 | 95 | 7900 (+goal) | 149 | 161 | 165 | 228 | 0.56 | 0.52 | 0.50 | 0.36 | 100%/100%/100%/100% | 10.4 / 10.3 |
| 13 | 95 | 8850 | 159 | 166 | 189 | 238 | 0.59 | 0.56 | 0.49 | 0.39 | 100%/100%/100%/100% | 9.6 / 7.7 |
| 14 | 95 | 5200 (+goal) | 112 | 113 | 145 | 171 | 0.49 | 0.48 | 0.38 | 0.32 | 100%/100%/80%/100% | 6.5 / 6.5 |
| 15 | 95 | 7850 (+goal) | 157 | 182 | 146 | 262 | 0.53 | 0.45 | 0.57 | 0.32 | 100%/100%/100%/100% | 7.3 / 9.8 |
| 16 | 95 | 8750 (+goal) | 230 | 273 | 268 | 250 | 0.40 | 0.34 | 0.34 | 0.37 | 100%/100%/100%/100% | 9.0 / 6.8 |
| 17 | 95 | 7950 | 127 | 124 | 205 | 233 | 0.66 | 0.68 | 0.41 | 0.36 | 100%/100%/100%/100% | 6.8 / 8.1 |
| 18 | 95 | 8700 | 173 | 191 | 194 | 201 | 0.53 | 0.48 | 0.47 | 0.45 | 100%/100%/100%/100% | 12.0 / 8.5 |
| 19 | 95 | 9801 | 160 | 169 | 160 | 208 | 0.64 | 0.61 | 0.65 | 0.50 | 100%/100%/100%/100% | 8.8 / 10.4 |
| 20 | 125 | 12800 | 200 | 192 | 257 | 192 | 0.51 | 0.53 | 0.40 | 0.53 | 100%/100%/100%/100% | 9.7 / 9.7 |
| 21 | 125 | 19200 (+goal) | 288 | 318 | 318 | 559 | 0.53 | 0.48 | 0.48 | 0.27 | 100%/100%/100%/100% | 5.6 / 8.3 |
| 22 | 125 | 18550 | 229 | 331 | 331 | 464 | 0.65 | 0.45 | 0.45 | 0.32 | 100%/100%/100%/100% | 5.8 / 8.7 |
| 23 | 125 | 4851 (+goal) | 118 | 142 | 142 | 225 | 0.33 | 0.27 | 0.27 | 0.17 | 95%/100%/100%/100% | 7.5 / 7.9 |
| 24 | 125 | 20300 (+goal) | 273 | 297 | 297 | 374 | 0.60 | 0.55 | 0.55 | 0.43 | 75%/85%/85%/100% | 6.4 / 10.1 |
| 25 | 125 | 20950 | 237 | 190 | 190 | 411 | 0.71 | 0.88 | 0.88 | 0.41 | 100%/100%/100%/100% | 6.2 / 10.2 |
| 26 | 125 | 17750 (+goal) | 347 | 386 | 336 | 366 | 0.41 | 0.37 | 0.42 | 0.39 | 100%/100%/100%/100% | 9.7 / 10.9 |
| 27 | 125 | 6900 (+goal) | 157 | 244 | 258 | 267 | 0.35 | 0.23 | 0.21 | 0.21 | 90%/100%/100%/100% | 6.4 / 7.0 |
| 28 | 125 | 27500 | 436 | 419 | 582 | 627 | 0.50 | 0.53 | 0.38 | 0.35 | 100%/100%/100%/100% | 8.4 / 12.3 |
| 29 | 125 | 16599 (+goal) | 246 | 232 | 181 | 393 | 0.54 | 0.57 | 0.73 | 0.34 | 85%/95%/65%/100% | 6.1 / 10.4 |
| 30 | 165 | 49900 | 618 | 643 | 710 | 990 | 0.49 | 0.47 | 0.43 | 0.31 | 100%/100%/100%/100% | 8.9 / 11.4 |
| 31 | 125 | 30000 | 484 | 511 | 747 | 776 | 0.50 | 0.47 | 0.32 | 0.31 | 100%/100%/100%/100% | 7.8 / 7.6 |
| 32 | 125 | 11150 (+goal) | 178 | 156 | 187 | 331 | 0.50 | 0.57 | 0.48 | 0.27 | 95%/100%/100%/100% | 6.3 / 7.0 |
| 33 | 125 | 24550 | 401 | 446 | 530 | 358 | 0.49 | 0.44 | 0.37 | 0.55 | 100%/100%/100%/100% | 6.7 / 7.0 |
| 34 | 125 | 21399 (+goal) | 298 | 385 | 496 | 510 | 0.57 | 0.45 | 0.35 | 0.34 | 100%/100%/95%/100% | 5.5 / 4.9 |
| 35 | 125 | 22050 | 221 | 243 | 440 | 529 | 0.80 | 0.72 | 0.40 | 0.33 | 95%/100%/100%/100% | 4.5 / 8.2 |
| 36 | 125 | 22101 (+goal) | 458 | 398 | 605 | 402 | 0.39 | 0.44 | 0.29 | 0.44 | 100%/100%/100%/100% | 6.4 / 7.0 |
| 37 | 125 | 14800 | 211 | 234 | 226 | 232 | 0.56 | 0.51 | 0.52 | 0.51 | 100%/100%/100%/100% | 9.3 / 9.1 |
| 38 | 125 | 23200 | 340 | 365 | 516 | 586 | 0.55 | 0.51 | 0.36 | 0.32 | 100%/100%/100%/100% | 11.0 / 10.0 |
| 39 | 125 | 28950 | 278 | 284 | 570 | 594 | 0.83 | 0.82 | 0.41 | 0.39 | 95%/100%/100%/100% | 5.4 / 6.4 |
| 40 | 165 | 46300 | 476 | 504 | 402 | 497 | 0.59 | 0.56 | 0.70 | 0.56 | 100%/100%/100%/100% | 7.8 / 10.0 |
| 41 | 165 | 61400 (+goal) | 635 | 480 | 624 | 1422 | 0.59 | 0.78 | 0.60 | 0.26 | 100%/70%/95%/100% | 9.1 / 10.3 |
| 42 | 165 | 33650 (+goal) | 445 | 516 | 555 | 933 | 0.46 | 0.40 | 0.37 | 0.22 | 95%/100%/95%/100% | 8.1 / 10.1 |
| 43 | 165 | 45550 (+goal) | 445 | 529 | 744 | 1505 | 0.62 | 0.52 | 0.37 | 0.18 | 80%/80%/90%/95% | 7.2 / 10.0 |
| 44 | 165 | 35200 (+goal) | 367 | 363 | 502 | 943 | 0.58 | 0.59 | 0.43 | 0.23 | 85%/85%/100%/100% | 6.3 / 8.2 |
| 45 | 125 | 34150 | 440 | 368 | 809 | 970 | 0.62 | 0.74 | 0.34 | 0.28 | 100%/100%/100%/100% | 6.4 / 8.5 |
| 46 | 165 | 99300 (+goal) | 1885 | 2008 | 1454 | 2472 | 0.32 | 0.30 | 0.41 | 0.24 | 100%/100%/100%/100% | 9.5 / 10.3 |
| 47 | 125 | 26600 | 335 | 395 | 311 | 733 | 0.63 | 0.54 | 0.68 | 0.29 | 90%/100%/100%/100% | 6.5 / 7.8 |
| 48 | 165 | 104400 | 1305 | 1509 | 1947 | 1398 | 0.48 | 0.42 | 0.32 | 0.45 | 100%/100%/100%/100% | 13.5 / 11.7 |
| 49 | 125 | 34800 | 308 | 328 | 360 | 920 | 0.90 | 0.85 | 0.77 | 0.30 | 80%/100%/100%/100% | 6.1 / 9.2 |
| 50 | 165 | 85900 | 578 | 623 | 827 | 926 | 0.90 | 0.84 | 0.63 | 0.56 | 90%/100%/100%/100% | 7.3 / 8.4 |
| 51 | 165 | 70600 (+goal) | 1696 | 1178 | 1194 | 1004 | 0.25 | 0.36 | 0.36 | 0.43 | 100%/100%/0%/80% | 6.5 / 7.8 |
| 52 | 125 | 22500 | 232 | 227 | 215 | 640 | 0.78 | 0.79 | 0.84 | 0.28 | 100%/100%/60%/100% | 5.2 / 9.3 |
| 53 | 165 | 83750 (+goal) | 1282 | 1329 | 949 | 1277 | 0.40 | 0.38 | 0.53 | 0.40 | 100%/100%/20%/100% | 10.4 / 6.9 |
| 54 | 165 | 38100 (+goal) | 388 | 404 | 304 | 337 | 0.60 | 0.57 | 0.76 | 0.69 | 100%/90%/50%/90% | 6.1 / 5.7 |
| 55 | 125 | 30650 | 320 | 376 | 639 | 408 | 0.77 | 0.65 | 0.38 | 0.60 | 100%/100%/100%/100% | 6.2 / 6.9 |
| 56 | 165 | 26150 (+goal) | 565 | 538 | 220 | 426 | 0.28 | 0.29 | 0.72 | 0.37 | 100%/100%/30%/100% | 8.7 / 7.0 |
| 57 | 125 | 37050 | 561 | 667 | 362 | 443 | 0.53 | 0.44 | 0.82 | 0.67 | 100%/100%/100%/100% | 7.5 / 6.0 |
| 58 | 165 | 75800 | 799 | 779 | 453 | 684 | 0.58 | 0.59 | 1.01 | 0.67 | 100%/100%/55%/100% | 6.8 / 6.1 |
| 59 | 125 | 39800 | 368 | 411 | 173 | 331 | 0.87 | 0.77 | 1.84 | 0.96 | 95%/90%/0%/55% | 4.8 / 5.1 |
| 60 | 165 | 107200 | 1116 | 1076 | 2153 | 1598 | 0.58 | 0.60 | 0.30 | 0.41 | 100%/100%/100%/100% | 9.6 / 6.3 |
| 61 | 125 | 19400 | 310 | 234 | 175 | 300 | 0.50 | 0.66 | 0.89 | 0.52 | 100%/100%/100%/100% | 5.6 / 7.4 |
| 62 | 165 | 52350 (+goal) | 661 | 720 | 250 | 1118 | 0.48 | 0.44 | 1.27 | 0.28 | 100%/100%/0%/100% | 7.5 / 11.6 |
| 63 | 125 | 28800 | 504 | 560 | 555 | 497 | 0.46 | 0.41 | 0.41 | 0.46 | 100%/100%/100%/100% | 9.2 / 7.7 |
| 64 | 125 | 26500 | 248 | 274 | 652 | 680 | 0.86 | 0.77 | 0.33 | 0.31 | 100%/100%/100%/100% | 5.4 / 9.0 |
| 65 | 165 | 36400 (+goal) | 318 | 317 | 1712 | 665 | 0.69 | 0.70 | 0.13 | 0.33 | 85%/100%/50%/100% | 6.4 / 6.7 |
| 66 | 125 | 21450 | 287 | 280 | 465 | 305 | 0.60 | 0.61 | 0.37 | 0.56 | 100%/100%/100%/100% | 7.1 / 6.4 |
| 67 | 165 | 56300 (+goal) | 797 | 858 | 940 | 434 | 0.43 | 0.40 | 0.36 | 0.79 | 100%/100%/100%/25% | 7.7 / 7.5 |
| 68 | 165 | 46400 | 490 | 520 | 444 | 499 | 0.57 | 0.54 | 0.63 | 0.56 | 100%/100%/100%/100% | 9.1 / 9.2 |
| 69 | 125 | 15750 | 199 | 209 | 350 | 224 | 0.63 | 0.60 | 0.36 | 0.56 | 100%/100%/100%/100% | 6.1 / 6.5 |
| 70 | 165 | 45200 | 484 | 555 | 262 | 689 | 0.57 | 0.49 | 1.04 | 0.40 | 100%/100%/0%/100% | 9.1 / 8.5 |
| 71 | 125 | 21350 | 316 | 307 | 219 | 216 | 0.54 | 0.56 | 0.78 | 0.79 | 100%/100%/100%/100% | 6.5 / 4.8 |
| 72 | 165 | 33950 (+goal) | 1185 | 1067 | 831 | 480 | 0.17 | 0.19 | 0.25 | 0.43 | 85%/90%/35%/100% | 7.5 / 5.6 |
| 73 | 125 | 21950 | 491 | 472 | 507 | 511 | 0.36 | 0.37 | 0.35 | 0.34 | 100%/100%/100%/100% | 8.3 / 8.8 |
| 74 | 165 | 34400 (+goal) | 249 | 495 | 536 | 928 | 0.84 | 0.42 | 0.39 | 0.22 | 100%/100%/60%/100% | 5.4 / 8.6 |
| 75 | 165 | 55100 (+goal) | 559 | 558 | 694 | 650 | 0.60 | 0.60 | 0.48 | 0.51 | 95%/100%/70%/100% | 9.7 / 10.3 |
| 76 | 125 | 41250 | 553 | 588 | 540 | 756 | 0.60 | 0.56 | 0.61 | 0.44 | 100%/100%/100%/100% | 5.7 / 6.9 |
| 77 | 125 | 24150 | 225 | 250 | 106 | 177 | 0.86 | 0.77 | 1.83 | 1.09 | 90%/100%/0%/0% | 6.2 / 4.8 |
| 78 | 165 | 69900 | 681 | 672 | 515 | 594 | 0.62 | 0.63 | 0.82 | 0.71 | 100%/100%/100%/90% | 7.7 / 7.4 |
| 79 | 165 | 36700 (+goal) | 352 | 447 | 1285 | 366 | 0.63 | 0.50 | 0.17 | 0.61 | 100%/100%/100%/55% | 6.6 / 5.8 |
| 80 | 165 | 62700 | 524 | 573 | 906 | 1037 | 0.72 | 0.66 | 0.42 | 0.37 | 95%/100%/100%/100% | 8.0 / 8.7 |

Per chapter means (need = share of the clock):

| chapter | effort HP (mean) | dps STARTER | dps CEILING | need STARTER | need STARTER+LV | need GIFT | need CEILING | ceiling / starter dps |
|---|---|---|---|---|---|---|---|---|
| 1 | 3250 | 80 | 84 | 0.51 | 0.51 | 0.50 | 0.50 | 1.05x |
| 2 | 8695 | 160 | 223 | 0.56 | 0.54 | 0.50 | 0.40 | 1.39x |
| 3 | 20250 | 295 | 468 | 0.51 | 0.48 | 0.48 | 0.32 | 1.59x |
| 4 | 24450 | 334 | 482 | 0.58 | 0.55 | 0.42 | 0.40 | 1.44x |
| 5 | 56095 | 674 | 1222 | 0.61 | 0.60 | 0.49 | 0.30 | 1.81x |
| 6 | 53160 | 733 | 715 | 0.56 | 0.55 | 0.76 | 0.55 | 0.98x |
| 7 | 34855 | 430 | 541 | 0.58 | 0.56 | 0.58 | 0.48 | 1.26x |
| 8 | 40145 | 513 | 571 | 0.59 | 0.53 | 0.61 | 0.55 | 1.11x |

10 worst levels, metric D (largest jump in need STARTER versus the previous level, i.e. spikes and drops of enemy effort over player power):

| rank | L | need STARTER | previous | change |
|---|---|---|---|---|
| 1 | 51 | 0.25 | 0.90 | -72% |
| 2 | 72 | 0.17 | 0.54 | -68% |
| 3 | 52 | 0.78 | 0.25 | +208% |
| 4 | 56 | 0.28 | 0.77 | -63% |
| 5 | 74 | 0.84 | 0.36 | +134% |
| 6 | 36 | 0.39 | 0.80 | -52% |
| 7 | 73 | 0.36 | 0.17 | +106% |
| 8 | 47 | 0.63 | 0.32 | +99% |
| 9 | 23 | 0.33 | 0.65 | -49% |
| 10 | 53 | 0.40 | 0.78 | -49% |

10 levels where the CEILING squad is most overpowered (lowest need CEILING):

| rank | L | need CEILING | need STARTER | win CEILING |
|---|---|---|---|---|
| 1 | 23 | 0.17 | 0.33 | 100% |
| 2 | 43 | 0.18 | 0.62 | 95% |
| 3 | 27 | 0.21 | 0.35 | 100% |
| 4 | 42 | 0.22 | 0.46 | 100% |
| 5 | 74 | 0.22 | 0.84 | 100% |
| 6 | 44 | 0.23 | 0.58 | 100% |
| 7 | 46 | 0.24 | 0.32 | 100% |
| 8 | 41 | 0.26 | 0.59 | 100% |
| 9 | 32 | 0.27 | 0.50 | 100% |
| 10 | 21 | 0.27 | 0.53 | 100% |


### Unit power by rank (damage of one fire, `rawDamage`, before relays and multipliers)

| unit | role | r1 | r2 | r3 | r4 | r5 | r6 | r7 | r8 |
|---|---|---|---|---|---|---|---|---|---|
| cannon | shooter | 10 | 23 | 51 | 114 | 256 | 577 | 1297 | 2919 |
| rocket | shooter | 13 | 29 | 66 | 148 | 333 | 750 | 1687 | 3795 |
| mortar | shooter | 11 | 25 | 56 | 125 | 282 | 634 | 1427 | 3211 |
| arc_welder | shooter | 10 | 23 | 51 | 114 | 256 | 577 | 1297 | 2919 |
| nail_gun | shooter | 9 | 20 | 46 | 103 | 231 | 519 | 1168 | 2627 |
| jackhammer | shooter | 12 | 27 | 61 | 137 | 308 | 692 | 1557 | 3503 |
| saw_blade | shooter | 10 | 23 | 51 | 114 | 256 | 577 | 1297 | 2919 |
| piston | shooter | 9 | 20 | 46 | 103 | 231 | 519 | 1168 | 2627 |
| blowtorch | shooter | 12 | 27 | 61 | 137 | 308 | 692 | 1557 | 3503 |
| rivet_gun | shooter | 10 | 23 | 51 | 114 | 256 | 577 | 1297 | 2919 |
| hydraulic_press | shooter | 12 | 27 | 61 | 137 | 308 | 692 | 1557 | 3503 |
| lathe | shooter | 9 | 20 | 46 | 103 | 231 | 519 | 1168 | 2627 |
| wrecking_ball | shooter | 18 | 41 | 91 | 205 | 461 | 1038 | 2335 | 5255 |
| coil | relay | 4 | 9 | 20 | 46 | 103 | 231 | 519 | 1168 |
| bell | relay | 3 | 7 | 15 | 34 | 77 | 173 | 389 | 876 |
| horn | relay | 3 | 7 | 15 | 34 | 77 | 173 | 389 | 876 |
| fuse_box | relay | 4 | 9 | 20 | 46 | 103 | 231 | 519 | 1168 |
| gear | relay | 3 | 7 | 15 | 34 | 77 | 173 | 389 | 876 |

## Modelling limits (honest list)

- Bots are not people: smart@3 picks the best previewed merge every ~3 s (jittered 0.8-1.2x), random@2.5 any legal merge, planner a 2-ply lookahead on a JSON copy. None of them dodges a boss warning on purpose (they do not read warnings), none uses items, tools, support cards or the scrap button, none drags to defuse a bomb except by accident. So "player responded" is about 0 for most attacks by construction; a human who reads the warning would feel less of a hazard and a human who ignores it would feel what the bot feels.
- ON vs OFF turns every boss / light-monster cast off (`TUNING.bossAttacks = false`, the MANIA switch). Level modifiers (SUCTION / JAM / ROW_GAPS remix hazards, GAPS and CORNERS masks) are NOT toggled and are not audited as boss powers. The ordinary-monster "light" behaviours (frost, suction, hot, rest, split, tow, ransom) are audited with the same A/B because they use the same code; the chain shield (L11, L33) is not.
- Common random numbers hold only until the first cast changes the board: the game seed and the bot seed are the same in both arms, but afterwards the two games diverge, so single paired differences are chaotic. The mean difference, its 95% interval and the share of byte-identical pairs are the usable outputs. n = 30 per arm per bot (planner 6) means an interval of about +-3 to +-8 points of the clock on levels where the power matters; small real effects (< 2%) are below the noise.
- "Felt" is conservative: a hazard counts as felt only when it removed/moved a machine, cost clock seconds, placed junk, or made the bot's best merge worse at a decision (a probe that compares the best option with and without the standing hazard). Effects that live outside the merge choice (frost: fewer cells for incoming parts; tow: linked drag; clamp on a machine the bot never wanted to move) are therefore under-counted, and show up only through the ON-OFF time and identical-run numbers. "Board effect" (cells under the hazard) over-counts.
- Telegraph visibility is read from the code (GameScene.ts: beam, sound, event text on bossWarn; marked-cell drawing; lesson cards), not from screenshots or playtests. A cast the player cannot notice is therefore measured by board outcome (whiff / not felt / identical run), not by pixels.
- Effort = HP and bot time, not human effort. Time share counts from the previous kill to the win and includes the breather and the cascade carry-over; the cascade cap (35% of the machine's max HP per hit) means HP is not proportional to time. Goal levels (rank / chain) have an HP-free last machine whose cost is only time; their HP share is shown as "goal".
- Start variety: "units given" is only what `newLevel` and the plan hand over (families on board, bag, item teach, shooter override, the gift of the previous level); crates, perks (none exist in saga levels), jumpstart kits and the player's own squad choice are outside it. First deliveries depend on how the bot plays and are shown but excluded from the whole-start signature. The varied-openings flag is measured as an alternative, it is not the shipped default.
- Player power: the squads (GIFT, CEILING) were picked by a greedy search on ONE representative level per roster segment with n = 8 runs (noisy), then replayed on every level of the segment; on some later levels (L51-L77) the searched squad loses where the starter squad wins, so GIFT and CEILING columns mix real unit power with search noise and with bot blindness to support cards and unit jobs. Unit levels use only the damage multiplier (shooter +4%/level, relay +2%/level) at the plan's expected level per chapter, not the level-3/6/9 perks. CEILING assumes every unit of an open crate rarity is owned (Epic from level 11, Legendary excluded), which no player has. Support cards (Blast Plate, Blueprint, Rewind Crank, Tilt Lever) are never played. levels.json HP was fitted with the starter squad at unit level 1, so STARTER is the calibration reference.
- Roster flags 1-7 are switched on for part D only (to build the squads); parts A-C run with shipped flags. Pace is the shipped CALM. Items granted by thresholds and Overdrive are active as in the game, but the bots never place items.
- Determinism: no Math.random and no clock; bot seed = level x 1009 + i x 7919, game seed = the level's own seed. Re-running a part reproduces the JSON byte for byte (run twice and compared with cmp: A L28-30, B L35-38, C, D L59-60 and the squad search file were identical; the other chunks were run once).

## Reproduction

```
npm ci && npm run typecheck
npx vite-node tools/effort-audit.ts --part a --from 1 --to 14 --n 30      # then --from 15 --to 45, --from 46 --to 80 (each under ~3 min)
npx vite-node tools/effort-audit.ts --part b --from 1 --to 30 --n 30 --nplan 6   # then 31-60, 61-80 (2-4 min each)
npx vite-node tools/effort-audit.ts --part c
npx vite-node tools/effort-audit.ts --part dsearch                        # ~4 min
npx vite-node tools/effort-audit.ts --part d --from 1 --to 40 --n 20      # then --from 41 --to 80
npx vite-node tools/effort-audit.ts --part report --write docs/EFFORT_AUDIT.md
```

Partial results go to `effort-audit-data/` (scratch, never committed; `--out DIR` changes it). `--part report` is a pure function of those JSON files.
