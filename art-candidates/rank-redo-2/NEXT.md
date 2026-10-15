# NEXT (rank redo 2, t-11f704eb)
Flow as rank-redo-1 (see ../rank-redo-1/NEXT.md), plus these lessons:
- Prompt: 3x2 magenta sheet, "wide equal magenta gaps, NO black lines or borders, keep every unit well inside its cell", attach the LOWER rank as a flat-on-white jpg (make with sharp `.flatten({background:'#fff'})`), name the 1-2 things that must differ (silhouette/scale/accent colour). Attach via file_upload on the "Attach photos" input (`find` for "file input elements" twice; first call often fails), download with a JS blob anchor, import_download.
- Slice with batch V slice.mjs (`git show 9105991^:art-candidates/batch-v/_tmp/slice.mjs`), edit the cell inset from 2 to an env var INS; use INS=16 if the sheet has black grid lines. Fit into 250 box on 256 canvas. Score by copying redo-1 + redo-2 pieces over art-candidates/rank-clarity/pieces, `node tools/rank-clarity.mjs --units <u> --no-strips`, then `git checkout -- art-candidates/rank-clarity`. Always score 2-3 cells and keep the best.
- Needs `npm install` in the worktree for sharp.
- BROWSER_SESSION lease is taken back after a time cap (about 10 sheets); my ChatGPT tab (chat 6ad032c1..., spring rank 5 sheet generating) was left open.

Remaining, worst first (scores from art-candidates/rank-clarity/scores.md; redo-1 and redo-2 pairs are done):
- spring 4-5 (23.1): redraw rank 5 as a broad squat three-coil machine, green accents (prompt was sent, sheet not downloaded).
- rivet_gun 5-6 (20.7, 6-7 33.4): redraw rank 6. vice 1-2 (21.1), vice 6-7 (25). lathe 5-6 (23.9), wrecking_ball 3-4 (24.8), hydraulic_press 2-3 (25.1), blowtorch 4-5 (25.9), pipe 6-7 (26), tesla_tower 7-8 (26) and 6-7 (26.5), capacitor 3-4 (26.3), piston 5-6 (27.7, fixed by redo-1) and piston 4-5 (27.4, weak), belt_drive 2-3 (28.3), router 4-5 (28.3), hydraulic_press 1-2 (29.3), wrecking_ball 1-2 (29.6), hydraulic_press 5-6 (29.7).
- Then the 30-36 band: pipe 5-6, dynamo 6-7, capacitor 1-2, rivet_gun 4-5, tesla 3-4, lathe 1-2 and 3-4, wrench 5-6, blowtorch 6-7, rivet_gun 6-7, hydraulic_press 6-7, capacitor 4-5, blueprint 2-3, router 3-4, wrecking_ball 5-6.
