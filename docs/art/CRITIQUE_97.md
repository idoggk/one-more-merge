# CRITIQUE_97: road map FIX batch (ch4 kit, sky, scenery, plaque, bar, clouds, platforms)

Critic: art-director-critic, read-only on images. Date 2026-10-15.
Judged: `art-candidates/road-map-new-v2/` (branch `orch/t-a7584630-chatgpt-batch-road-map-fix-and-r`) against CRITIQUE_93, the painted mock v2 `normal_try1.png` (branch `orch/t-1716254a-painted-road-map-mocks-keep-1-fi`) and the chapter 1/6 kits in `art-candidates/road-surface-kit-b6/` (branch `orch/t-b8ba6c65-road-kit-script-fix-2-chapter-1`).
Every file was opened. No image was generated or edited, no `src/` change. Sizes are read off the images by eye (no image library in this worktree), so treat pixel numbers as +-5 px.

## 1. Verdict in one paragraph

The paint is on target: the new ch4 strip is the cream ribbon, gold lane lines and plum wall of the mock, and the straights, curves, S curves and dead end are clean. Two things stop a KEEP on the kit: **T-junction and cross are not joined** (the arm road is a flat patch laid over an unbroken main wall, with a pale gold bar across the mouth), and **the cream surface is only about 22% of the cell** (see 2), half of what the README claims. The sky is very good; the scenery is good but fights the "Arcade" chapter theme and cannot tile as is. Plaque and bar are right in style but still too tall for the slot. Clouds lost the maroon but are a different painting style from the new sky. The "you" platform got worse (tiny and soft).

## 2. Ch4 road kit (12 pieces)

| check | result |
|---|---|
| mirror symmetric | **FAIL (small)**. The top wall has an extra dark inner row and a different stud phase from the bottom wall (straight_h, dead_end, s_curve). The README says mirror symmetric; it is not. Reads as a light/depth cue, so it is acceptable if drawn once and never flipped. |
| open edges on border midpoints | PASS. Road meets x or y = 256 on every open edge; shoulder_edge is a wall only (OK). |
| road 205 px = 40% of 512 | **MISLEADING**. 205 px is the whole band wall-to-wall (about 155 to 360 in the cell). The walkable cream surface incl. gold lines is about 110-115 px = 22% of the cell. Chapters 1-3 and 6 measure road + rail at 40%, so the OUTER width matches (kit width is consistent with the others and will not step at a chapter change), but a node disc 89 px wide on a 112 px road leaves almost no shoulder. Decide in code which width the nodes assume. |
| no bow-ties | PASS. Curves are clean concentric arcs, the S curves have no pinch. |
| no repeats within 512 px | PASS for the road tiles (source strip 1536 wide, no repeated block in a 512 window). The stud rhythm is a regular 85 px beat, which reads as a rivet row, not a repeat. |
| seams | straights, curves, S curves, dead end seam cleanly on the contact sheets (dark and light). |
| **ghost studs** | **FAIL**. Every piece with the left edge cut shows two faint, semi-transparent stud squares at x about 20-45 on the top and bottom wall (straight_h, curves, T, cross, dead_end, shoulder_edge). In a long row they repeat every cell as pale smudges. This is rubric 14/16. Fix in kit.mjs or paint out. |
| T-junction / cross | **FAIL (critical, rubric 17/19)**. The side walls of the main road are NOT opened where the arm leaves: the arm's cream road ends in a pale gold bar lying on top of the wall, so the arm looks like a separate tile stuck on. Chapter 6 and chapter 1 junctions open the rail and let the road flow through. Cut the main wall open over the arm width and let the arm's gold lane lines turn into the main road's lane lines. |
| centre line | The README promises "no centre marks", the art has a dashed gold centre line. It is pretty and consistent, but then the junction and cross must break the dash across the centre square (they do, cleanly) and the dead end should stop the dash before the cap (it does). Keep, but fix the README. |

Style versus mock: the mock road is a perspective ribbon with a deep wall and thick gold lane edges; this is flat top-down with a thin wall and no cliff depth, so it reads as "cobbled bridge". It does fit the toy-metal family (gold rim, warm light), and next to the ch1 and ch6 kits it is the same game. Score: straight/curve/S/dead end 16/20; T and cross 11/20.

**Verdict: KEEP straight_h, straight_v, curve_ne/nw/se/sw, s_curve_a/b, dead_end, shoulder_edge (after the ghost stud fix). REDO t_junction and cross.**

FIX brief (kit): "Redo T and cross: 17 open the main road's side wall over the arm width and continue the gold lane lines round the corner, 14 remove the pale gold bar and the ghost studs at x 20-45, 19 keep the same cream tile rows through the centre square."

## 3. Backgrounds and scenery

| file | size | read | verdict |
|---|---|---|---|
| bg_sky_purple | 1024x1536 | Deep violet gradient, pink-white cumulus on both sides, small gold sparkles, calm centre column. Matches the mock sky well. Light from below-left on the clouds is a soft rim, fine. Sparkles are baked (about 16 of them) so a scrolled parallax will show them move with the sky: fine. | **KEEP**, 18/20 (20: crop sides; at 390x844 the usable centre is about 55% of the width) |
| scenery_ch4_body | 1024x1536 | Floating cube-rock islands with trees, cottages and baked lit windows, purple-pink glowing cubes. Matches the sky and has a free centre column (about x 270-800). Problems: (a) the sky is baked in, so it cannot be tiled over bg_sky (top clouds and bottom clouds differ, a vertical repeat will show a seam); (b) cottages and trees are the chapter 1 look, the mock chapter 4 "Arcade" has an arcade cabinet, neon arch and blocky pixel props; (c) the island scale is 3x the mock's, so on a 390 px slot the islands crowd the road (left islands reach x 270/1024 = 105 px of 390). | **FIX**. KEEP as a generic "purple sky islands" scenery for a chapter without an arcade theme; for ch4 use alpha islands. |

FIX brief: "Re-roll scenery_ch4_body on a transparent or keyed background: islands only, 40% smaller, arcade cabinet, neon arch and pixel cubes instead of cottages, no baked sky, so it can be placed over bg_sky_purple and tiled."

## 4. Plaque, bar track

| file | size / slot | read | verdict |
|---|---|---|---|
| plaque_title_pill | about 1390x230 (6.0:1) vs slot 236x28 (8.4:1) | Empty cream pill, gold rim, two screws, dark-maroon contact halo. Clean, family match. Still 40% too tall for the slot: scaled to 236 px wide it is 39 px tall, over the slot by 11 px. Screws are baked at the ends (fine if nine-sliced with 60 px caps). | **KEEP** with nine-slice (caps = screws), or re-roll at 9:1. 17/20 (20: 5% padding is fine, baked halo is dark maroon, not brown-black; pure outline weight OK) |
| chapter_bar_track | about 1390x215 (6.5:1) vs slot ~170x14 (12:1) | Empty navy groove, gold rim, glossy top highlight. Right look, matches mock bar and the plaque. Too tall for a 14 px bar: at 170 px wide it is 26 px tall. | **KEEP** as nine-slice, caps 60 px, scaled to 14 px high, or code-draw. 17/20 |

The two read as one family and fit the mock. Both carry a dark maroon halo (about 10 px) that will look like a dirty shadow on the light-purple sky; make it 30% transparent or soften.

## 5. Clouds (6)

Maroon outline: **fixed**. Outlines are now a flat purple (about #8C63C4), 2-3% of the cloud height, no fringe on light or dark. But: the clouds are glossy 3D "bubble" blobs with a hard outline, while the new sky has soft painterly clouds and the mock has soft clouds with no outline. Placed over bg_sky_purple they look like stickers from another game. Also the purple outline vs violet sky has too little contrast on dark sky (outline disappears) and too much on the pale cloud rim of the sky.
Verdict: **FIX** (rubric 19). Use them only as foreground "pop" decorations, or re-roll without outline, soft edge, painterly like the sky. Score 14/20 each; the six share the same flaw.

## 6. Platforms

| file | size | read | verdict |
|---|---|---|---|
| node_you_platform | about 130x85 | Gold coin-like plate, pink-red halo baked at the top edge. Trimmed OK, but the sprite is only 130 px wide for a slot of 110x46 @2x = 220 px: will be upscaled 1.7x and look soft. Also thick: height 85 vs 46 slot. Pink halo at the top is a baked fringe (rubric 14). | **REDO** (small): re-roll at 2x with no halo; glow is code. 11/20 |
| node_boss_platform | about 555x345 | Red lacquer arena with gold studs and glowing inner ring, dark ellipse centre. Crisp, matches mock boss platform. Ratio 1.6 vs slot 2.35: squash 30% or crop. | **KEEP** (squash). 17/20 |

## 7. Summary table

| piece | verdict |
|---|---|
| ch4 straight_h/v, curves x4, s_curve a/b, dead_end, shoulder_edge | KEEP after ghost-stud fix |
| ch4 t_junction, cross | REDO |
| bg_sky_purple | KEEP |
| scenery_ch4_body | FIX (re-roll as alpha islands, arcade theme) |
| plaque_title_pill, chapter_bar_track | KEEP (nine-slice) |
| clouds x6 | FIX (style mismatch with sky) |
| node_you_platform | REDO |
| node_boss_platform | KEEP |

## 8. Process notes

- README claim "road 205 px = 40%" must say "wall to wall; surface 22%".
- README: "mirror symmetric" and "no centre marks" are both wrong for the delivered strip.
- Compare against mock: the mock road is broader and deeper. If the owner wants the mock look, the strip needs a perspective version (thicker plum wall on the outer side, a cliff face).
- Not delivered (as the author said): blue cube, neon arch, open gate re-rolls, ice kit, ring segments (code).
