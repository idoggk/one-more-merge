# Rank redo 3 (t-e60c1758)

Score = `tools/rank-clarity.mjs` (threshold 30), with pieces overlaid in order rank-clarity < redo-1 < redo-2 < redo-3. Pieces: `pieces/<unit>_<rank>.webp`, 256 px, bbox fitted to 250. Raw sheets in `raw/`. Each sheet was scored take by take (6 per sheet); the best was kept.

| Piece | Pair(s) | Before | After | Channels |
|---|---|---|---|---|
| spring_5 (broad squat 3-coil, green) | 4-5 / 5-6 | 23.1 / n/a | 81.0 / 48.9 | sil, size, colour, edges / sil, size |
| rivet_gun_6 (tall upright vertical tower, teal) | 5-6 / 6-7 | 20.7 / 33.4 | 65.3 / 71.7 | sil, edges |
| vice_2 (orange, big handwheel, dial) | 1-2 / 2-3 | 21.1 / n/a | 82.7 / 66.4 | all four / sil, colour, edges |
| vice_4 (FIX redo-1: simpler grey/red, one screw column) | 3-4 / 4-5 | n/a | 41.0 / 36.3 | colour, edges / sil (weak) |
| vice_5 (FIX redo-1: purple/gold double jaw, dial, gem) | 4-5 / 5-6 | 18.1 | 36.3 / 48.9 | sil / size. 4-5 still only one channel; crown nub not drawn |
| vice_7 (royal ivory/gold, crown) | 6-7 | 25.0 | 66.3 | sil, size, colour, edges |
| lathe_6 (blue arch with crown) | 5-6 | 23.9 | 71.9 | sil, colour, edges |
| wrecking_ball_4 | 3-4 / 4-5 | 24.8 / n/a | 59.6 / 63.8 | sil, size, colour |
| hydraulic_press_3 (blue/yellow) | 2-3 | 25.1 | 46.5 | colour only (silhouette still like rank 2) |
| blowtorch_5 | 4-5 / 5-6 | 25.9 | 53.7 / 48.6 | size, colour / sil, size |
| pipe_7 (green/gold manifold, crown) | 6-7 | 26.0 | 66.3 | sil, size, colour |
| tesla_tower_7 (triple coil, violet) | 6-7 / 7-8 | 26.5 / 26.0 | 54.4 / 55.8 | sil, size, colour |
| capacitor_4 (wide low three-drum bank) | 3-4 / 4-5 | 26.3 / n/a | 48.1 / 46.0 | sil, colour / colour |
| piston_5 (FIX redo-1: tall upright triple barrel) | 4-5 / 5-6 | 27.4 | 53.5 / 37.2 | sil |
| belt_drive_3 (three-gear staircase, red/cream) | 2-3 / 3-4 | 28.3 | 45.3 / 72.0 | sil, size / sil, size, edges |

Pairs still below 30 in the whole set: router 4-5 (28.3), hydraulic_press 1-2 (29.3), wrecking_ball 1-2 (29.6), hydraulic_press 5-6 (29.7). The lowest of the redrawn pairs is vice 4-5 (36.3).

Not done (no browser lease left): router 4-5 (28.3), hydraulic_press 1-2 (29.3), 5-6 (29.7), wrecking_ball 1-2 (29.6). See NEXT.md.

Notes
- The size channel is almost always near 1 because pieces are all fitted to 250 px; "8 percent bigger per rank" shows up only as bbox ratio before normalising and was only partly honoured by ChatGPT.
- I looked at the chosen picks for rivet_gun_6, vice_2, lathe_6, pipe_7, vice_5 at full size (clean, magenta key removed, no fringe seen). The others were picked by score and not opened one by one: critic pass needed (wrecking_ball_4, hydraulic_press_3, blowtorch_5, tesla_tower_7, capacitor_4, piston_5, belt_drive_3, spring_5, vice_4, vice_7).
- Critic-69 FIX pieces handled: vice_4, vice_5, piston_5. Not touched: the other redo-1 pieces (KEEP).
