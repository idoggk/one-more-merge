# CRITIQUE_93: road map NEEDS-ART candidates, parts 1-3 (19 of 22 ids)

Critic: art-director-critic, read-only on images. Date 2026-10-15.
Judged: `art-candidates/road-map-new/` on `orch/t-91628e3e-chatgpt-batch-the-last-road-map` (it contains parts 1-3, sheets 1-9) against
`art-candidates/mockups/road-map-painted-v2/manifest.json` (branch `orch/t-d4d4c5e1-asset-breaker-road-map-painted-m`) and the painted mocks
`normal_try1.png`, `locked_try1.png` (branch `orch/t-1716254a-painted-road-map-mocks-keep-1-fi`).
Method: every sprite opened (contact sheets on dark and light), nodes also rendered at 89 / 70 / 44 px and in grayscale. Sizes, padding, semi-transparent edge share and road-kit opening widths measured with a script (scratch removed).
Nothing was generated or edited; no `src/` change.

## 1. Verdict in one paragraph

The set matches the painted mock well: bright, glossy, warm-gold-rimmed toy metal, light top-left, warm dark-brown outline, no dark steampunk. Keys are clean (no magenta or green fringe visible on dark or light; 3-4 px safe padding everywhere, 18-43 px in practice). The problems are NOT the paint, they are fit and a few specific pieces:

1. **Road kit is the weak point.** It is a flat top-down "street tile" kit (plum cobble rim, dashed yellow centre line). The mock road is a smooth cream ribbon with a deep purple side wall and gold edge lanes, drawn in perspective. Tiles do not share size or road width, so they will not seam. Verdict REDO as a family (see 4).
2. **Aspect ratios do not fit the manifest slots** for buttons, wallet, plate, plaque and sign (they are 2.0-2.9:1 where slots are 3.3-8.4:1). They need nine-slice or a re-roll; not a style problem.
3. **Clouds carry a dark maroon outline** the mock does not have (the mock clouds are soft). FIX.
4. **Ring segments are brass pipes**, and the s6 pink/mix cubes are near-invisible (superseded by sheet 8).
5. Open gate is two halves, blue cube does not match the gold-cornered pink cubes.

REDO: road kit (12 pieces, one family), ring segments, s6 pink/mix cubes (already superseded). FIX: clouds, plaque, bar track, you/boss platform crops, blue cube, neon arch, open gate. Everything else KEEP.

## 2. Per-piece table

Scores use the 20-point rubric (C = critical). "Slot" = manifest 1x size; 2x is double. "Fill" = sprite bbox aspect vs slot aspect (a mismatch means stretching distorts it).
Edge check: no key fringe seen on dark or light backgrounds unless noted.

### Road nodes (sheet 1, 2)

| id / file | slot (1x) | sprite bbox | fill / fit | style vs mock | verdict | notes |
|---|---|---|---|---|---|---|
| node_done_disc / `s1/node_done_disc` | 89x49 | 222x127 (1.75 vs 1.82) | good | green gloss disc, gold rim: matches mock | KEEP | live number + stars go on top |
| node_done_next / `s1/node_done_next` | (same) | 222x128 | good | cream disc, gold rim | KEEP | differs from done in accent colour + live stars/no stars (2 criteria: accent, pips). At 44 px grayscale both are pale discs: the live star pips must always show on done. |
| node_you_platform / `s1/node_you_platform` | 110x46 | 220x156 (1.41 vs 2.39) | too tall: baked glow and thick rim wall | gold platform, sparkles: matches mock | FIX | crop/scale so the platform top is ~110x46 and the glow is a separate additive layer. As is, it is 1.5x the slot height and the 9.9% semi-transparent glow halo is baked. |
| node_you_ember / `s1/node_you_ember` | 110x46 | 222x151 | same issue, smaller | red-orange lava disc, clearly different | KEEP | boss approach variant. Distinct from next and you in hue, grey value and rim. |
| node_locked_padlock / `s1/node_locked_padlock` | 62x57 | 222x212 (1.05 vs 1.09) | good | gunmetal disc, steel padlock: matches mock (nodes 34/35) | KEEP | README's "cellBorder FAIL" is stale: padding is 22 px, shackle is complete |
| node_locked_ice / `s1/node_locked_ice` | 88x88 (cool) | 222x214 | good | blue glass disc + same padlock | KEEP | accent colour only differs from steel variant, fine: they are variants, never adjacent in one chapter. |
| node_boss_platform / `s2/node_boss_platform` | 120x51 | 485x281 (1.73 vs 2.35) | too tall | red/gold studded arena, dark centre | KEEP + FIX scale | silhouette (wide studded ring) clearly differs from the done/you discs. Crop to the top-face ellipse or slightly squash for the slot. |
| node_boss_mini / `s2/node_boss_mini` | far/small boss | 360x309 | n/a (extra) | crowned winged medallion, dark face | KEEP | very good silhouette at 44 px (wings + crown), unlike every other node. Extra, useful for the far view. |

State distinctness at 70 px grayscale (rendered): done vs next small tone difference only; next vs you differ in rim thickness + glow + size; locked reads as "padlock on grey" (clear); boss reads as a studded ring or crowned medallion (clear). Adjacent pairs done/you, you/locked, locked/boss pass 2+ criteria. done/next relies on the live pips (documented above).

### Buttons, plates, wallet (sheets 2-4)

| id / file | slot | sprite bbox | fill / fit | style | verdict | notes |
|---|---|---|---|---|---|---|
| play_button_green (+ pressed, disabled) / `s3/` | 276x76 (3.63) | 467x191 (2.45) | too tall | glossy green pill, gold rim: matches mock | KEEP | needs a nine-slice (caps ~190 px of the 467). Pressed is a darker, flatter green (OK: tone + inset). Disabled grey-green reads as off. |
| play_button_red (+ pressed, glow, disabled) / `s2/` | 276x76 | 461x187 (2.47) | too tall | red gloss pill, same family as green | KEEP | glow variant has the halo baked (8.5% semi): fine as an overlay, do not place under the base. Red disabled and green disabled are both grey: same look is fine. |
| wallet_pill_cream / `s3/wallet_pill_cream` | 133x37 (3.6) | 489x169 (2.9) | too tall; baked plus socket on the right | cream pill, gold rim: matches mock | KEEP | decision needed: use the baked socket OR `wallet_plus_button`, not both. |
| wallet_plus_button / `s3/wallet_plus_button` | ~28 px | 201x205 | good | brass coin, cream cross | KEEP | 44 px tap target is drawn bigger in code; the cross reads at 28 px. |
| chapter_plate / `s3/chapter_plate` | 236x78 (3.0) | 497x209 (2.4) | too tall; screws baked | cream plate, gold rim, 2 screws | KEEP | nine-slice with screws kept in the corners. |
| chapter_bar_track / `s4/chapter_bar_track` | bar ~170x14 | 486x127 (3.8) | too tall for a 14 px bar | dark plum pill with gold rim | FIX | fine art, but 3.8:1 vs ~12:1 in the mock: stretching 3x horizontally distorts the rim. Use as nine-slice with caps of 60 px, or code-draw the bar. |
| plaque_title_pill / `s4/plaque_title_pill` | 236x28 (8.4) | 533x153 (3.5) | far too tall, screws baked | cream plate | FIX | slot is a thin strip; stretching 2.4x vertically-compressed distorts screws. Re-roll at about 8:1, or nine-slice (screws would then repeat badly). |
| chest_ring_frame / `s4/chest_ring_frame` | 78x76 | 273x275 | good | gold ring, dark purple centre | KEEP | live chest goes in the centre. The three states (filling / ready / pressed) differ only by code glow and bounce: OK. |
| ring_segment_lit / unlit / `s4/` | arcs in the ring | 329x317 | wrong: green 90-degree brass-capped PIPES | not a ring arc, looks like a plumbing elbow | REDO | draw the progress arc in code (green and dark arc on the ring); drop these. If art is wanted: flat rounded arc segment, no end caps, no pipe highlight. |
| gate_need_sign / `s4/gate_need_sign` | 90x27 (3.3) | 503x245 (2.05) | too tall | wooden plank sign, 4 nails: matches mock sign | KEEP | wood is the one natural brown in the set but it matches the mock. Re-crop to about 3:1 (text is live). |

### Props, islands, clouds (sheets 5-7)

| id / file | slot | sprite bbox | style | verdict | notes |
|---|---|---|---|---|---|
| prop_arcade_cabinet / `s5/prop_arcade_cabinet` | 118x176 (0.67) | 287x377 (0.76) | pink invader screen, red/blue cabinet: matches mock | KEEP | reads at 44 px by screen + joystick. |
| prop_neon_arch / `s5/prop_neon_arch` | 80x112 (0.71) | 369x344 (1.07) | purple arch, white bulb ring, invader | FIX | 33% of its pixels are semi-transparent (baked neon glow); on the light contact sheet the bulbs and screen go white and washed. Test on the purple sky; if it shows a milky halo, re-roll with the glow separated or opaque. Also wider than the slot: scale to fit height, slot ratio will not fill. |
| prop_star_tower / `s5/prop_star_tower` | 57x87 (0.66) | 362x376 (0.96) | purple pavilion, gold star: matches mock | KEEP | 18% semi-transparent (star glow); acceptable. Wider than slot, scale to height. |
| prop_tree_set / `s5/tree_round, tree_pine, tree_small` + `_snow` | 50x64 (0.78) | 285x309, 248x328, 222x260 | voxel-ish glossy trees on a grass or stone plinth | KEEP + note | clean edges. Only 3 shapes (manifest wanted 6): small is nearly the round tree scaled. Each tree brings its own plinth, which doubles up when set on an island top: crop the plinth in code or use as stand-alone "stump islands". Snow variants read well (white cap = state change, shape unchanged: fine, state is chapter-wide). |
| prop_island_blocks / `s6/island_1..6` | 80x60 (1.33) | 336x264, 456x228, 264x336, 244x226, 300x294, 289x263 | grass-top brick plateaus, glowing windows | KEEP + note | clean. Grass is a hot lime green, more saturated than the mock's calm green and teal tops (colour script: chroma belongs to the interactables). Tint 15-20% toward the mock green in code or re-roll; do not use lime at full strength next to the road. island_3 is tall (0.79) and island_2 wide (2.0): good variety. |
| neon_cube_blue / `s6/neon_cube_blue` | ~80 | 258x259 | glass cube, no brass corners | FIX | does not match the pink cubes of sheet 8 (gold corner caps). Re-roll blue with the same brass corner caps. 9.6% semi: glow. |
| neon_cube_pink, neon_cube_mix / `s6/` | n/a | 218x243 | translucent white shells: the pink was keyed out | REDO (already superseded) | do not use; replaced by sheet 8. 36-41% semi-transparent, invisible on light. Delete from the folder once sheet 8 cubes are accepted. |
| neon_cube_pink, neon_cube_mix, neon_cube_pink_small / `s8/` | ~80 | 353x370, 376x381, 289x297 | pink glass cube with brass corners; mix is blue-violet | KEEP | glow halo is soft and lit (reads on dark purple). On the light sheet there is a pale yellow glow ring: harmless on the purple sky. The small one is an extra: usable as a far version. |
| prop_cloud_puffs / `s7/cloud_*` (6) | 165x105 (1.57) | big 524x376 (1.39), wide 539x268 (2.0), tall 310x388, three 371x263, small 256x229, tiny 228x172 | lavender gloss puffs, dark MAROON outline | FIX (all 6) | the mock clouds are soft, outline-free, purple-white with a pink rim light; these carry a hard 4-6 px maroon outline and read as stickers on a purple sky. Change the outline pixels to a mid purple (about #8C63C4) or re-roll without outline; keep the soft top-left highlight. cloud_big (two blobs) is a different form from the others: fine. |

### Gates and cubes (sheet 8)

| id / file | slot | sprite bbox | style | verdict | notes |
|---|---|---|---|---|---|
| road_gate_closed_frost / `s8/gate_closed_frost` | 170x108 (1.57) | 477x371 (1.29) | stone pillars with snow caps, iron double gate, gold chain + padlock | KEEP | brighter and chunkier than the mock's slim black gate, but same family as the gold padlock and snow. Reads at 44 px (padlock + spikes). |
| road_gate_closed_frost (open) / `s8/gate_open_left, gate_open_right` | open state | 196x372 each | door ajar at each post | FIX | two sprites: needs a code layout (left and right of the road, same y) and a shared anchor; each also has a different snow cap / door angle: check they pair. Alternative: ask for one sprite with both doors swung open. |
| gate_closed_small / `s8/gate_closed_small` | not requested | 394x302 | same gate, smaller | KEEP (extra) | far view only; do not ship two gate designs near each other. |

### Road kit chapter 4 (sheet 9, 12 pieces)

Mock road: smooth cream ribbon, gold lane lines, deep purple raised side wall, perspective-tilted S-curve (normal_try1, locked_try1). Kit: flat top-down tiles, plum cobblestone border, short orange dashes down the centre.

| piece | bbox | notes |
|---|---|---|
| road_ch4_v | 262x278 | road about 80 px wide in a 262 px tile (30%); cobbles 70 px each side |
| road_ch4_h | 286x270 | road about 83 px of 270 (31%); tile is 24 px wider than v, edges differ |
| curve_br / bl / tr / tl | 283x281, 284x281, 285x273, 284x274 | road about 70 px of 280 (25%): narrower than the straights; corner is a chamfered cut-out, not a circle arc |
| t_up / t_down / t_left / t_right | 300x271, 298x267, 280x297, 290x297 | road about 66-70 px; none is square; bar and stem do not line up with v and h |
| cross | 312x299 | road about 65-70 px; widest tile |
| cap | 267x298 | arch end; road about 80 px |

Findings:
- No common tile size: widths 262-312 and heights 267-298; trimmed bboxes are irregular because cobbles stick out (items 16, 20).
- Road opening width differs by type (straights about 80-83 px, curves/T/cross about 66-72 px): a straight joined to a curve shows a 10-15 px step at the seam, centre line and dashes do not meet.
- The rim stones are plum with dark outline, higher contrast than the mock's road and a different material. Dashes are a street-map idiom not in the mock (mock: solid gold edge lanes).
- Naming vs shape was checked on the sheet: br, bl, tr, tl, t_up (stem up, bar across the bottom), t_down, t_left, t_right, cross, cap all match their names.
- Stone rim reads clearly at 44 px; the paint itself (gloss, outline) is in family with the rest.
- It cannot carry the "done (gold line lit) / ahead (line dim)" states without a second pass: the dashes are small; the manifest overlay is code-drawn gold lines over a smooth road.

Verdict: **REDO as a family** (not a normalise-and-ship). Reason: even after resize and pad to a 140 px grid the road widths still differ by type and the look is a different game from the painted ribbon road. Cheaper alternative if the owner likes this look: normalise all tiles to one tile size and one road width (about 30% of the tile, same on all four edges), re-roll the curves as true quarter arcs, remove the dashes (code draws the gold lane), then re-test with `road_kit_ch4_ice` made the same way.

## 3. Style, edges, readability summary

| check | result |
|---|---|
| style match (bright glossy toy, not dark steampunk) | pass for all pieces except the maroon-outlined clouds (FIX) and the cobble road kit (different idiom). The iron gate is the darkest piece: acceptable. |
| key edges | no magenta/green fringe on dark or light; 0.1-1% semi-transparent edge on solid art, 9-41% only on glow/glass pieces (arch, tower star, cubes, glow variants) which is baked light, not an edge fault. |
| padding | all sprites have 18-43 px (6-10%) padding, none touches the cell edge. |
| 44 px readability | nodes: padlock, boss ring, crown medallion, gold platform read; done/next differ in tone only. Buttons are shape-only anyway. Cubes and clouds read as blobs (decor, fine). Road kit rim readable. |
| size and fill | art is native resolution (not 2x) and mostly 1.2-1.5x too tall for pill-style slots; nodes, locked, props fit. Most sprites are larger than their 2x slot (downscale only); not every slot was measured against the prop size in the mock. |
| state distinctness | see node paragraph in section 2. |

## 4. FIX / REDO brief list (ordered by impact)

All briefs: same artist, same painted toy-metal look as `normal_try1.png`; warm dark-brown outline 3-4% of height; light top-left; no baked text; flat key #00FF00 for pink/red art, #FF00FF otherwise; one sprite per cell, 6-10% padding.

1. **REDO road_kit_ch4 (12 pieces) and make it the pattern for road_kit_ch4_ice.** "Square tiles all the same size (say 512x512), road opening exactly 30% of the tile width and centred on every edge that connects; curves are true quarter circles; flat cream surface, raised plum stone wall on both sides with a thin gold edge line, NO centre dashes, no cobble outcrops past the tile edge. Edge cells at the join must be identical on every piece (same colour and width)." Generate straight + 1 curve first, check the seam, then the rest.
2. **FIX clouds (6)**: "Soft lavender-white puffs, no dark outline, thin pink rim light bottom-right, highlight top-left." Quick fix: recolour the maroon outline pixels to #8C63C4.
3. **REDO ring_segment_lit / unlit**: do not re-roll as pipes; draw the arc in code over `chest_ring_frame`. If art wanted: "flat 90-degree rounded arc segment of a ring, no end caps, glossy green (lit) or dull dark plum (unlit)".
4. **FIX plaque_title_pill**: "Cream plaque, gold rim, thin strip 8:1, two small screws at the ends, empty." (or nine-slice ignoring the screws).
5. **FIX chapter_bar_track**: nine-slice 60 px caps, or code-draw. Not art work.
6. **FIX node_you_platform and node_boss_platform**: crop to the platform top (about 2.4:1 for the gold one, 2.35:1 for the boss); put the glow in a separate additive image. No new art needed.
7. **FIX neon_cube_blue**: re-roll with gold corner caps like `s8/neon_cube_pink`; delete `s6/neon_cube_pink` and `s6/neon_cube_mix`.
8. **FIX prop_neon_arch**: check on the purple sky; if the bulbs wash out, re-roll with an opaque arch and a separate glow.
9. **FIX gate_open**: either one sprite with both doors swung open or lock a code layout for the left/right halves.
10. Not art: nine-slice or crop the green/red play buttons, wallet pill, chapter plate and gate sign to their slots; pick the baked plus socket or the separate plus button; tint the island grass 15-20% toward the mock green.

Still missing (3 ids, not judged): `road_kit_ch4_ice`, `bg_sky_purple`, `scenery_ch4_body`. Do not start `road_kit_ch4_ice` until item 1 is settled, or it repeats the same defect.

## 5. Standard to fix before the next batch

The style lock names no pixel numbers. Propose: outline 3-4% of sprite height in #4A2A1A-ish warm brown (measured: the set already sits there); road tile = square 512 px, road width 30%; pill buttons drawn at the slot aspect (3.6:1) so nine-slice is not needed; glows always as a separate file.
