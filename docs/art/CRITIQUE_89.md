# CRITIQUE 89: chapter 6 road kit (cardboard strip) and three chapter 7/8 panels

Critic task t-ed3a68f0. Images opened and judged at full size, 110 px, 70 px, grayscale (by eye). Branches read: `orch/t-f93985f9-chatgpt-batch-chapter-6-road-str` (kit), `orch/t-3201b3b4-chatgpt-batch-panel-fixes-chapte` (panels). Nothing was generated, `src/` untouched. Cell geometry measured by script (alpha at the four cell borders); panel margins read by eye and confirmed by a column-difference script where the background is flat (ch7 entrance, ch7 gate).

## Part 1: chapter 6 road kit

### Raw strip `raw/b6_ch6_strip.png`: KEEP (as a source)
Warm cardboard, flutes, rough rim, 6 tape pieces at different angles, two flat patches, cracks, a staple. No mark repeats. One light direction, warm brown palette. This is the best road surface art so far. The problem is only what the kit does to it.

### Kit pieces (12): verdict REDO (kit step, not the strip)

Measured (alpha > 128 on each cell border):
- Every open edge sits on the border midpoint: columns/rows 153-358 (206 px, spec 205 = 40 percent; 1 px wide is fine). Closed edges are empty on all 12 pieces. Cross, T, both curves families, dead end, S-curves, straights all agree, so tile-to-tile joins line up geometrically. PASS.
- `shoulder_edge`: open edge only 46 px (234-279) on W and E, a thin kerb strip. Intended, but confirm in the integration that this is a separate decoration layer, not a road piece.

Visual (contact sheets dark and light, `tile3_ch6.png`):
- **Bow-tie tape (critical, rubric 4, 13, 19).** `SYM` folds the lower half of the road onto the upper half (kit.mjs line 79: `if (v > ROADW/2 && SYM) v = ROADW - v`). Every slanted tape strip becomes a chevron or bow-tie, the square patch becomes a trapezoid, the crack becomes a symmetric pair. It reads as a stamped symmetric pattern, not hand-laid tape. The raw strip looks hand-made; the kit looks procedural. Fails family resemblance with the raw art it came from.
- **Visible repeat (rubric 18, 19).** `tile3_ch6.png` shows the same bow-tie, trapezoid and crack three times in 1536 px. The task rule "no repeating stamp inside 512 px" holds, but the period is 512 px (every cell is the same straight) and each cell has only 3 big marks, so the repeat reads at once on a long road. This is worse than the other chapters because the marks are large and high contrast against the flat cardboard.
- Curves: the mirrored tread fans around the ring, so tape becomes wedges and the cardboard flutes bend. Acceptable for cardboard, but the wedges are the same bow-tie flaw. Seams at cell borders are not visible (flutes and rim continue).
- Rim: dark rough border is the same weight on all pieces; no halo on dark or light contact sheets. PASS. Road is slightly dark and low contrast against a dark background, so the kerb is what keeps it readable at 70 px (it does).
- Grayscale: value steps rim / flute / tape survive. PASS.

Score: about 13/20, critical 4/13/19 fail. **Verdict: REDO.**

### Decision on the mirror: FIX the kit input, do not edit the mirror

Why not just skip mirroring for tape: the mirror exists so every curve end matches the straight. A curve joins E to S; the curve's outer/inner ring sits on a different side of the road at each end, and the rotated straight has its top rim on the other side. Without symmetry across the centreline the road profile cannot match at both ends. `SYM=0` would give a visible step in rim and tape at one end of every curve. So the mirror cannot go; the content that goes through it must survive it.

Two options, in order:

1. **FIX brief (recommended, no new image): composite tape after the mirror.** Run the kit with the strip's tape and patches removed (use the bare cardboard: take rows from a tape-free stretch, or mask tape by colour), keep SYM for the bare flutes and rim, then stamp the 6 real tape/patch/crack sprites (cut from the raw strip with their alpha) onto straights, curves and junctions at fixed u positions, unmirrored and rotated to follow the road direction on curves (tape across the road is rotated with the local tangent). Make 2 straight variants (a, b) with different tape sets so a run of straights alternates and the repeat period becomes 1024 px. Cost: kit.mjs work (an overlay step), no image budget.
2. **REDO the strip (fallback, one ChatGPT image):** "Cardboard road strip, magenta key, same style as the attached strip. Every tape piece and patch lies square across the road (long edge perpendicular to the road, no tilt), centred on the road centreline or spanning its full width, 4 pieces of different width and crumple, no two alike; cracks and the staple on the centreline only." Square tape is unchanged by the mirror, so it survives SYM. Still one 512 period, so also ask for two strips (a, b).

Also for either option: reduce overlay count per 512 cell to 2 large marks plus small cracks, and keep marks 24 px or more clear of the cell borders so crossfade at the loop (F = 64 px) never blends a tape into the next cell's tape.

Per piece:

| Piece | Verdict | Note |
|---|---|---|
| straight_h, straight_v | REDO | bow-tie tape; make 2 variants each |
| curve_ne/nw/se/sw | REDO | wedge tape; re-stamp tape along the tangent |
| s_curve_a, s_curve_b | REDO | same; geometry fine |
| t_junction, cross | REDO | centre trapezoid reads as a logo; use bare centre plus one cross-tape |
| dead_end | REDO | cap shape is good (KEEP the cap geometry), re-stamp tape |
| shoulder_edge | KEEP | geometry only, check against the final rim colour |

## Part 2: panels

Shared reference: ch7 entrance and gate are flat cartoon (cardboard-warm, soft outline, pale road with dashes); ch8 is a rich painted night-observatory style with a marble road. The chapter 7 pair is a good match for each other except lane edge and dash differences (below). Targets: margin 80 px target, 61 px floor, lane per brief.

### ch7 entrance `ch7_entrance_try1.png`: REDO (about 14/20)
- Edge margins (rubric 20, critical for the set): pallet left about 30 px, forklift and conveyor right about 35-40 px. The pallet and the forklift forks touch the 61 px floor line with room to spare below it. FAIL. The bottom of the pallet and the right props are also cropped by shadows reaching the edge.
- Lane about 350-675 (brief 318-705): 325 px against 387 px, 16 percent narrower, so it will not join the gate/other panels at full lane width.
- Style: strong dark-brown lane outlines and dark dashes; props have the correct heavy outline and lighting top-left. Props are good quality. The lane has a hard outline while the ch7 gate has none (join mismatch, see below).
- Composition: all props sit in the vertical middle third, top and bottom thirds are empty: fine for a scrolling strip, but the same prop vocabulary (cardboard boxes) as ch6 tape road, so chapter identity is weak.
- Redo: "20 shrink every prop 25 percent and keep all props inside x 100-300 and x 730-925; 17 widen the lane to x 318-705 (31-69 percent of width) and remove the dark lane outline to match the gate; 18 drop the conveyor so each side has one cluster."

### ch7 gate `ch7_gate_try1.png`: KEEP (about 17/20, no critical fail)
- Margins measured: left 71, right 66 px. Above the 61 floor, below the 80 target. Acceptable; the outer crate on the right (about x 940) is the closest. No change needed unless the gate gets slid into a scene with props at the sides.
- Lane about 340-685 (345 px): about 40 px narrower than the briefed 318-705. The gantry posts are placed outside the lane, good read of a gate at 70 px (orange against the cream road). Light top-left, outline weight matches the entrance.
- Join risk with the entrance: lane edge treatment differs (no outline here, dark outline there), dash colour differs (light taupe here, dark brown there) and lane tone differs (cream vs paler cream, entrance reads about lum 225, gate about 213 on the lane). Fix on the entrance side (see above); do not redo the gate.
- Small: gate shadow falls to the right-down under the bar, light is top-left, consistent.
- Minor FIX (optional): the ground blobs on the left and right sides are faint but unrepeated; fine.

### ch8 entrance `ch8_entrance_try1.png`: REDO (about 13/20)
- Margins: dome base left about 25 px, telescope right about 45 px (barrel tip about x 980), orrery base about 90. Floor 61 fails on both sides. The corner rings and constellation lines are cropped by the border by design (ground pattern, fine), the props are not. FAIL (critical for the set).
- Lane: about 405-620 (215 px, 21 percent of width). The ch8 gate is 385-640 and the chapter 6 kit road is 40 percent; this lane is about half as wide as the other chapters' lane and will force a step at the join. FAIL.
- Style: gorgeous painted look, gold trim, blue night palette, one light source top-left with warm window glow. Medium scale props and a lane medallion, riveted gold rails are well drawn. It is a different render style (soft painted gradients, glow, tiny detail) from the ch7 flat cartoon; acceptable as a new chapter but the detail density is high. Rubric 18: more than 3 detail clusters per side (dome with trees, banner, stairs; table with scroll and books; stars; ground tracery). At 70 px the dome and table blur together.
- Grayscale: the dark ground and the dark dome merge (value steps too close); the marble lane stays readable.
- Medallion at the lane centre will repeat at every tile if the panel is tiled; it should be a one-off at the gate, not on the entrance, or the road needs a tile without it.
- Redo: "20 put every prop inside x 120-310 and x 715-905 (shrink 30 percent); 17 make the lane x 385-640 with the gold rails exactly 8 px wide at x 385 and x 640; 18 cut each side to one main prop plus one small accent, and remove the lane medallion."

## Summary table

| Piece | Verdict | Score | Failed items |
|---|---|---|---|
| ch6 strip (raw) | KEEP | 18 | none |
| ch6 kit, 11 pieces | REDO (kit input, option 1) | 13 | 4, 13, 18, 19 |
| ch6 shoulder_edge | KEEP | 17 | none |
| ch7 entrance | REDO | 14 | 20, 17 |
| ch7 gate | KEEP | 17 | none critical |
| ch8 entrance | REDO | 13 | 20, 17, 18, 12 |

Set consistency: ch7 panels are close (outline weight, light direction, palette) but need lane width, lane outline and dash colour unified. ch8 is a separate, higher-detail look; do not mix its lane with ch7 values.

## Next steps (ordered)
1. Implement the post-mirror tape overlay in `tools/kit.mjs` (option 1) and rebuild the ch6 kit with 2 straight variants; re-run the contact and `tile3` sheets and the alpha border check in this doc.
2. ch7 entrance and ch8 entrance try 2 with the prompts above; add lane widths as percentages, keep lanes at the briefed x positions, attach the ch7 gate / ch8 gate as reference (needs the owner's upload).
3. After try 2, run the margin and join measurements again (columns at the panel seam) before any wiring.
