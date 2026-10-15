# CRITIQUE_92: rank redo 4 (6 pieces) + remaining weak-pair brief

Independent critic pass (t-163e390a) on `art-candidates/rank-redo-4/pieces` (branch `orch/t-1f5ed098-...`, merged here). Each piece was opened inside a full-family strip (ranks 1..8 of its family: 256 px on cream, then 70 px on dark, 70 px greyscale, 70 px on tan). Edge numbers measured with a small alpha scan (no magenta key left in any piece, 0 light-halo pixels on the edge ring). Not re-run: `tools/rank-clarity.mjs` (needs `npm install` for sharp); pair scores below are the worker's README values.

**Totals: 3 KEEP, 3 FIX, 0 REDO.** The rank-clarity gain is real for all six (all pairs 44-66). The three FIX verdicts are about progression and family language, not clarity.

**Set-wide note (applies to all six):** every piece is fitted to ~250 of 262 px, so padding is 1-3% on the long side (rubric 20 wants 6-10%). This matches how redo-3 pieces were fitted, so it is a pipeline convention, not a per-piece fault. Cheap fix at wiring time: scale to 90% on import.

## Per piece

| Piece | Verdict | Score | Fails | Note |
|---|---|---|---|---|
| router_5 | FIX | 16/20 | 20, 19 | see below |
| hydraulic_press_2 | KEEP | 18/20 | 20 (top gauge 1% from edge) | |
| hydraulic_press_6 | KEEP | 18/20 | 20 (touches both sides) | |
| wrecking_ball_2 | KEEP | 18/20 | 20 (0 padding sides) | |
| pipe_6 | FIX | 16/20 | 19, 18 | see below |
| capacitor_2 | FIX | 15/20 | 19, 18 | see below |

**router_5 (teal ball-valve, yellow lever).** Clear at 70 px, greyscale included: one big sphere body, one side pipe, lever. Fails: the rank order reads backwards. Rank 4 has four pipes, a red wheel and a gear boss; rank 5 has one pipe and a lever, so it looks like a lesser unit than rank 4. Teal is also new to a red/blue/gold family. Fix: "keep the teal sphere and lever, add a second pipe on the right and a gold gear boss on the front, so it has more parts than rank 4 and fewer than the crowned rank 6." Lever tip is 3% from the top edge.

**hydraulic_press_2 (green single-piston tower, gauge, side tank).** Best of the six. Silhouette (tall column with side tank) differs from rank 1 (wide blue arch) and rank 3 (twin pillars). Clean edge, warm outline, same cream base. Minor: the gauge repeats on rank 3, so the motif no longer marks rank. Optional, not blocking.

**hydraulic_press_6 (red gantry, single ram, anvil).** Strong silhouette, reads at 70 px, much larger than 5 and 7. Same family hardware. Note: it has fewer parts than 5 and 7 (single ram vs triple), but its size and gold anvil carry the "bigger" read; acceptable. Rank 4 has no approved piece at all (see backlog), so 3-4 and 4-5 are unscored.

**wrecking_ball_2 (blue/gold twin-post gantry, two balls).** Clear jump from rank 1 (single red ball) and from rank 3 (blue arm, red ball). Gold and blue ball is a good accent. It fills the full cell width; trim to the standard padding on import.

**pipe_6 (copper-orange boiler tower, gauge).** Biggest silhouette change in the set, readable at 70 px, but two problems. It reads as a fire hydrant, not a pipe: every other rank is horizontal pipework with the red wheel. And it has fewer parts than rank 5 (twin pipes) and rank 7 (crown manifold). Fix: "keep the tall orange tower, add the red handwheel on top and two gold side elbows, so it shares the family wheel and has more parts than rank 5."

**capacitor_2 (short green battery block, two terminals).** Clean edges, different from rank 1 and 3. But it is the only block shape in a family of drums (rank 1 one drum, rank 3 two drums, rank 4 three drums with a bolt). It reads as a lunchbox and looks plainer than rank 1. Fix: "keep green, replace the block with a short wide drum with two gold terminal caps and a small gold bolt so it has more detail than rank 1 and still sits lower than the twin-drum rank 3." Acceptable as a stopgap if the owner wants it in now.

## Remaining weak pairs (prioritised brief for the next ChatGPT batch)

Source: README of redo 4 plus the redo-3 SCORES list; not re-scored here. Threshold 30 = fail. "Near threshold" means passes one channel only, in practice still looks alike.

**P1: fixes to the six pieces above (3 small redraws, one sheet each).** router_5, pipe_6, capacitor_2 per the notes.

**P2: holes in the ladder (no piece at all, cannot be scored):**
1. hydraulic_press rank 4 (no approved piece in any layer; pairs 3-4 and 4-5 unknown).
2. vice rank 8 and pipe rank 8.
3. wrecking_ball rank 7 (ranks listed 1-6, 8).

**P3: weakest pairs left (lowest score first):**
1. dynamo 6-7 (30.1)
2. rivet_gun 4-5 (31.3)
3. piston 3-4 (31.4)
4. tesla_tower 3-4 (31.7)
5. lathe 1-2 (32.2) and 3-4 (32.9)
6. wrench 5-6 (33.0)
7. blowtorch 6-7 (33.3)
8. hydraulic_press 6-7 (34.1; likely better now that rank 6 is redrawn, re-score first)
9. blueprint 2-3 (34.8)
10. router 3-4 (35.4)
11. wrecking_ball 5-6 (35.9)
12. vice 4-5 (36.3, one channel only: silhouette; rank 4 grey/red flat and rank 5 purple/gold are both flat-wide jaw blocks). Ask for rank 5 as a tall upright column vice (screw in front, jaw on top) so size and part count differ too.

**P4: family look-alikes the pair score will not catch** (seen in the strips): vice rank 6 is a blue vice with a crown, close to rank 3 (go back to a gold or ivory body). Router and pipe rank 7 and 8 are crown-on-cluster in the same shape (router 7-8 12.8 originally, pipe 6-7 now fine). Re-run `node tools/rank-clarity.mjs` after `npm install` once all redo pieces are overlaid to get a true current list; the 30-36 band above is from before redo 4.

## Prompt rules to carry into the next batch
- State the "part count order" in the prompt (e.g. "rank 5 has more parts than rank 4 and fewer than rank 6"), because pieces picked by score alone can go backwards in richness.
- Keep each family's signature part (router: pipe openings; pipe: red handwheel; capacitor: drum with gold caps; hydraulic press: vertical piston).
- Ask for 90% scale inside the cell, or scale at import.
