# CRITIQUE_98: rank fix 5, road map v3, Screw Yard v3

Critic: art-director-critic, read-only on images. 2026-10-15. Every file opened (full size, family strip at 140 px cream, 70 px dark, 70 px greyscale). Alpha stats measured with a small PIL scan (padding, semi-transparent share, key-colour pixels). `tools/rank-clarity.mjs` NOT run (no node_modules here), so pair scores are my channel count, not the tool's number. Neighbour ranks come from `art-candidates/owner-review/img` (commit eb6a90a); rank 8 of pipe and capacitor were not in the strip.

Judged: `art-candidates/rank-fix-5` and `road-map-new-v3` (branch `orch/t-3acda9dd-...`), `screw-yard-new-v3` (branch `orch/t-128e8548-...`), against CRITIQUE_92, CRITIQUE_93/97, CRITIQUE_96, painted mock v2 (`normal_try1.png`, `mock_v2_02_mid.png`) and the 3D set `screw-yard-3d-v2`.

**Totals: 8 KEEP, 3 FIX, 0 REDO** (pipe_6, cube glow, bell stage are the FIX items; backdrop and plate still open from CRITIQUE_96).

## 1. Rank fix 5 (rank-clarity rule)

Set-wide: all three are padded 5-14% (rubric 20 pass), 0 key-colour fringe, 1.7-1.9% semi-transparent edge. All three share one new rendering (cream plate, teal clamp feet, soft shading) that differs from the older siblings (red or blue studded feet, harder gold). That is a mild family drift (19), worth fixing in the pipe brief only.

| Piece | Score | Verdict | Fails |
|---|---|---|---|
| router_5 | 18/20 | **KEEP** | 19 (minor) |
| pipe_6 | 16/20 | **FIX** | 19, 18 |
| capacitor_2 | 18/20 | **KEEP (stopgap-plus)** | 19 (minor) |

**router_5 (teal sphere, yellow lever, gear boss, 2 pipe ends).** Versus rank 4 (blue cube, 4 gold pipe ends, red wheel): silhouette differs (sphere vs cube), accent colour differs (teal vs blue/red), size similar, parts: 4 ends and a wheel vs 2 ends, lever and gear, so part count is flat, not rising. That is 3 of 5 channels apart, so the rule (2 of 5) passes. Versus rank 6 (crowned red/blue cluster, many ports): clearly less, crown marks the jump. At 70 px and greyscale the ball and lever read at once. Not fully met: CRITIQUE_92 asked for "more parts than rank 4"; it has the same count, not fewer. Accept. Note for the sheet: teal is the only teal in a red/blue/gold family, but it is the clearest rank marker in the strip.

**pipe_6 (copper-orange wide boiler, red wheel, two gold elbows, gauge).** Fixes the hydrant problem: the wheel and horizontal pipework are now family language. Remaining problems: (a) it is the lowest piece in the strip. Rank 5 is three tall blue tanks, rank 7 is a tall crowned cluster, rank 6 is a flat landscape plate with 14% padding top and bottom, so visual mass drops at rank 6 then jumps back; (b) the palette (copper, olive-teal feet) is the only non-blue/red/gold piece and its rendering is more detailed and realistic than rank 5 and 7, so it looks like another game next to them. At 70 px it still reads against rank 5 (wide vs three upright tanks) and rank 7, so clarity passes; progression and family do not.
Redo note: "Fix: 19 recolour to blue tanks and gold/red hardware, 18 raise it taller than rank 5 with a second tier of pipes and the same red studded feet."

**capacitor_2 (green horizontal drum, 2 gold terminal caps, side bolt).** Fixes the lunchbox: it is now a drum, with more parts than rank 1 (single upright drum) and fewer than rank 3 (twin upright drums). Versus rank 1: silhouette (horizontal vs upright), size, accent colour (green vs red), part count (2 caps and bolt vs 1 cap) all differ, 4 of 5. Versus rank 3: silhouette, colour, size differ. Reads at 70 px and greyscale (long barrel with two knobs). Only complaint: it is the one horizontal drum in an upright family and the base feet are teal, not red. Acceptable; if re-rolled later, ask for red feet.

## 2. Road map v3 (blue cube, neon arch, open gate)

All padded 5-11%, 1.0-2.3% semi, no green or key fringe (the 2865 magenta pixels on the arch are the real neon bulbs and invader). Compared with the mock: the arch is the same object as the mock's neon arch (purple stone, magenta bulbs, invader), and the cube glows like the mock's blue cubes.

| Piece | Score | Verdict | Fails / note |
|---|---|---|---|
| prop_neon_arch | 18/20 | **KEEP** | Fixes CRITIQUE_93 wash-out: bulbs and invader stay saturated on dark and light. Wider than slot, fit by height. 20/20 padding. |
| road_gate_open | 18/20 | **KEEP** | One sprite with both doors swung open (the CRITIQUE_93 request). Warm wood and gold, glowing yellow centre. It is brighter and friendlier than the mock's slim dark gate and the frost gate; use it only as the open state of the same gate, not near the closed one. |
| prop_neon_cube_blue | 15/20 | **FIX** | 14, 4 |

**prop_neon_cube_blue.** Now matches the pink cubes' glass look and reads as a blue neon cube at 70 px. But the cyan glow halo is cropped by a hard-ish edge and looks smudgy on cream, and there are 3-4 stray cyan specks outside the cube on the right edge (visible on the dark contact sheet). The pink cubes have gold corner caps (CRITIQUE_93 item 7); this one still has none, so it does not match them. Redo note: "Fix: 14 remove the stray glow specks and fade the halo to zero alpha, 19 add gold corner caps like neon_cube_pink."
Low-risk alternative: use it as is on the purple sky only (the mock sky hides the smudge) and defer.

## 3. Screw Yard v3

| Piece | Score | Verdict | Fails |
|---|---|---|---|
| bell_stage_blank | 17/20 | **KEEP** (was FIX in 96) | 18 |
| win_barrel, win_blue_bracket, win_red_block, win_carriage, win_wheel_a/b | 17-18/20 | **KEEP** | 19 (minor) |
| tool_tile_cream_brass (+ pressed) | 18/20 | **KEEP** | none |

**bell_stage_blank.** CRITIQUE_96's three complaints are fixed: wood frame and base, brass bells, blue rod with red caps (same palette as the cannon), no holes on the bells. Holes counted by eye at 348 px: 5 on the top rail, 2 per post (the right post shows 2, the left 2), 3 on the base, so 12. Not measured, the Pixel Checker should still confirm. 18 is still weak: five bells, the rod, caps and the holes make four detail clusters. Silhouette and greyscale value steps are good (wood mid, bells light, red/blue dark caps). Padding 6.6-9.8%.

**Win pieces.** Same barrel, carriage, red block, blue bracket and wheels as the final cannon in `mock_v2_02_mid` and the contact sheet: wood grain, red and blue lacquer, brass-ringed holes, same outline. All six on equal 320 canvases, 6.6-10.9% side padding, 0.7-0.9% semi, no halo. The two wheels are identical sprites (same bbox), fine for a left/right pair but they must be flipped or offset. Note the barrel shows 7 holes and the red block shows 2, while the assembled cannon in the sheet shows holes in different spots, so a player sees close but not exact parts (minor). Vertical padding is 17-26% on wide pieces; anchor by bbox.

**Tool tile.** The magenta fringe from CRITIQUE_96 is gone on both states (checked on the cream sheet and by pixel scan: 0 key-colour pixels). The pressed tile is smaller and darker, it reads. Still empty tile (live icon and label on top). KEEP.

**Versus the 3D set (`screw-yard-3d-v2`).** The 3D set has no stage pieces, only screws, plank, washer, holes, toolbox and turntable. Those are clean, flat-lit and outline-free, while the GPT stage and win pieces carry a warm outline and painterly wood. Mix the two only if the screws sit inside brass holes (they do). Do not use the 3D wooden plank, holes and washer beside the new bell stage, since the 3D wood is flat orange and the GPT wood is grained.

## 4. Still open (not covered by this batch)

1. Backdrop `sy_backdrop_painted_dim` is still the v2 file (CRITIQUE_96 REDO). Brief unchanged: smooth low-contrast bench in the lower 60%, no loose screws or blueprint, clutter only in the top 35%.
2. Plate nine-slice (code: caps about 70 px of 528).
3. Rank-clarity run: `node tools/rank-clarity.mjs` with these three pieces overlaid, then update the weak-pair list in CRITIQUE_92.
4. Measure the 12 holes per stage in the Pixel Checker pass.

## 5. Briefs

- **pipe_6 FIX**: "Same pipe as attached: copper-orange body with red handwheel and two gold elbows, but raise it into a taller two-tier cluster of blue tanks and gold pipes (more parts than rank 5), red studded feet, same flat toy shading as pipe_5, thin warm-brown outline, flat #FF00FF background, 8% padding."
- **neon_cube_blue FIX**: "Same blue glass cube with the brass corner caps of the attached pink cube, glow as a soft halo that fades to nothing, no stray sparks, flat #FF00FF background, 8% padding."
