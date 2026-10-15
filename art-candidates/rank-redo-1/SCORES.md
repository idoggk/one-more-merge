# Rank redo 1 (t-14819aae) - near-twin pairs redrawn

Score = tools/rank-clarity.mjs (higher = more distinct, threshold 30). Pieces: `pieces/<unit>_<rank>.webp` (256 px, bbox fitted to 250 px).

| Pair | Before | After | Verdict |
|---|---|---|---|
| router 7-8 | 12.8 | 37.1 (silhouette + edges differ) | DONE: tall tower, emerald domes, twin side domes, red dial (raw sheet `raw/router8_sheet.png`, cell 1) |
| vice 2-3 | 15.2 | 31.2 | DONE (sheet `raw/vice345_sheet.png` cell 5 = rank 3, 232 px box) |
| vice 3-4 | 15.7 | 32.7 | DONE (cell 6 = rank 4, double jaw, 242 px box) |
| vice 4-5 | 18.1 | 34.6 (silhouette differs) | DONE (cell 4 = rank 5, tower + dial, 252 px box) |
| vice 5-6 | 26.7 | 34.5 | side effect of new rank 5 |
| rivet_gun 7-8 | 15.3 | 42.2 (silhouette + edges differ) | DONE: brass wings, red dial, emerald tank (sheet `raw/rivet8_sheet.png` cell 3) |
| piston 3-4 | 17.1 | 31.4 | DONE (sheet `raw/piston45_sheet.png` cell 3 = rank 4, V-twin barrels) |
| piston 4-5 | 18.6 | 27.4 | IMPROVED, still weak (<30): cell 6 = rank 5, triple-barrel block with emerald tank |
| piston 5-6 | 28 | 51.6 | side effect |
| piston 7-8 | 17.0 | 38.8 | DONE (sheet `raw/piston8_sheet.png` cell 5) |

Tries used: 1 per piece (all accepted first sheet). Not started: spring 6-7/7-8, capacitor 5-6/6-7, belt_drive 6-7, blowtorch 7-8, dynamo 7-8, robot_arm 7-8, blast_plate 3-4, hydraulic_press 7-8 (see NEXT.md). Pieces here are candidates only; nothing wired into src.
