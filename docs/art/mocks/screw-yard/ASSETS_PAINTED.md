# SCREW YARD PAINTED v2 asset list (step 3 of the mock chain)

Asset Breaker, task t-c006287d, 2026-10-15. Source: the four painted mocks `art-candidates/mockups/screw-yard-painted-v2/v2_01_start.png`, `v2_02_mid.png`, `v2_03_danger.png`, `v2_04_win.png` (branch `orch/t-640f9aa7-painted-screw-yard-mocks-fix-01`), critic #86 (`docs/art/mocks/screw-yard/PAINTED_CRITIQUE_V2.md`, verdicts 01 KEEP, 02 KEEP, 03 FIX, 04 KEEP), the earlier Screw Yard list (`ASSETS.md` and `art-candidates/mockups/screw-yard/manifest.json`, branch `orch/t-454597ec-asset-breaker-break-the-screw-ya`) and `docs/design/SCREW_YARD_3D_ASSETS.md`. Machine-readable twin: `art-candidates/mockups/screw-yard-painted-v2/manifest.json` (same fields as the road map manifest plus `approach`). No images were generated and `src/` was not touched. All four images were opened and viewed.

## Totals

| Status | Count | Meaning |
|---|---|---|
| EXISTS | 16 | file in `src/assets/art` (or a proof sprite in `art-candidates/screw-yard-3d`) |
| NEEDS-SLICE | 0 | raw sheet exists, cut with `tools/slice-sheet.mjs` |
| NEEDS-ART | 29 | must be made; each has an `approach` and a `brief` |
| CODE-DRAWN | 23 | no art, the Implementer builds it in code |
| **Total entries** | **68** | |

| Group | EXISTS | NEEDS-SLICE | NEEDS-ART | CODE-DRAWN |
|---|---|---|---|---|
| Background and light | 1 | 0 | 1 | 4 |
| HUD | 2 | 0 | 3 | 8 |
| Boxes and holding row | 2 | 0 | 3 | 1 |
| Object stage and screws | 1 | 0 | 16 | 2 |
| Tools | 0 | 0 | 5 | 0 |
| Coach and effects | 3 | 0 | 0 | 4 |
| Result panel (win and fail) | 7 | 0 | 1 | 4 |

NEEDS-ART by approach: CODE-3D-RENDER 16 (4 screw heads, 4 side views, spin frames, collar, hole ring, plank, toolbox, row beam, turntable, steel NEXT box), GPT-image 13 (3 blank object stages, backdrop, tool icon sheet + 3 icon rows + tile, round button base, title plate, unlit star, win pieces).

## Read this first

1. **The painted HUD is not sliced.** Critic #86: rebuild it as live layers anchored to the safe area. Painted pieces are the look target only. Slicing the image is used for nothing except the optional icon crop fallback (`tool_icon_*` `crop` field).
2. **Safe area is wider than v1.** Top row starts at y 64 (island band runs to 59 css; the mocks start at 28 and 37). Bottom: tool tiles end above `HB-40` (home bar 34 css; the mocks are 6 css short in 01/02, 18 css short in 03). Manifest `grid.safeArea` says 64 / 40 instead of 48 / 32.
3. **Screws are the heart.** They must read as REAL screws: dome, chamfer, cross recess, thread. CODE-3D-RENDER for all heads, side views, spin frames and the new `screw_washer_collar`. The collar is the fix for gold on tan wood, green on the red plate and red on the red band (critic #86); it also gives colour-blind players a neutral edge. Head-shape or glyph coding for the four colours is an open owner question; the render tool gets a `--glyph on|off` flag so both can be built.
4. **Hit areas.** Painted screw heads are 28-34 css; the code pads the tap target to 44 css (not an art item).
5. **Image 03 is the weak one.** FIX: labels (NEXT, HOLDING ROW, tool names 8-10 css), a red screw on the red band, a baked red glow, tool tiles in the home-bar zone. Nothing from 03 is the source of an asset. The danger glow, ring and "1 SLOT LEFT!" tag are code (`danger_vignette`, `row_danger_glow`).
6. **The blank cannon comes from 02** (all 12 holes visible and empty at the right moment): `cannon_stage_blank`, GPT-image, plus the measured hole list below. The CODE-3D-RENDER alternative (`plank_5hole_3d`, `block_wood`, `hole_ring_brass`) is the fallback and the way to build Coil and Bell if the GPT stages drift.
7. **Zero NEEDS-SLICE.** GPT sheets come back as one image; cut with `node tools/slice-sheet.mjs <sheet.png> --grid CxR --key magenta|green --out <dir> --names a,b,c [--kind icon|panel|strip]`. Never ask GPT for baked text; every label (SCREW YARD, TAPS, BONUS, NEXT, HOLDING ROW, tool names, 1 SLOT LEFT!, PLAY AGAIN) is live text.
8. **Open owner decisions that change the list:** undo/redo vs turn arrows (`undo_redo_glyph`, `turn_label_chip`); shape/glyph coding of the four screw colours.

## Common rules for every GPT-image brief

STYLE LOCK: glossy 3D toy look of the painted Screw Yard v2 mock (attach `v2_02_mid.png` as style master), warm dark-brown outline 3-4% of sprite height (not black), light from top-left, thin rim light bottom-right, soft contact shadow, 3-4 value steps. KEY: one sprite per cell on flat #FF00FF magenta (flat #00FF00 green if the art has red-pink or magenta; the red toolbox and red hammer usually allow magenta), never a gradient or shadow on the key, no baked text or numbers, 6-10% padding, nothing within 3 px of the cell edge. RANK CLARITY: items in one family differ in at least two of silhouette, size, part count, accent colour, pips, and read apart at 70 px in grayscale. Here: the three tool icons differ by silhouette (vertical broom, T hammer, L drill) and accent (yellow, red-orange, blue); lit vs unlit star by value and fill; the four screws by colour plus (if accepted) a glyph on the dome, and must stay separate in grayscale.

Screen units: 8 px grid, phones 360x780 / 390x844 / 430x932, content column C = floor(W/8)*8, HB = floor(H/8)*8. Sizes are CSS px at 1x and 2x (2x is the shipped file). The mocks are 852x1846 (about 2.18 per css px at 390 wide).

## Background and light

| id | role | 1x / 2x | states | z / layer | anchor | status | approach | source / notes |
|---|---|---|---|---|---|---|---|---|
| `sy_background` | Wooden workbench background | 390x844 / 780x1688 | normal | 0 `L00_bench_background` | full bleed, cover-fit, centred | **EXISTS** | - | src/assets/art/sy_background.webp. Fallback. The painted look wants `sy_backdrop_painted` (below); until it lands the existing bench is kept warm and lower contrast than the screws. |
| `key_light_vignette` | Soft top-left key light and edge vignette | 390x844 / 780x1688 | normal | 2 `L02_key_light_and_vignette` | full bleed | **CODE-DRAWN** | - | Radial gradient, no art. |
| `object_spotlight` | Warm bloom behind the object | 320x320 / 640x640 | normal | 40 `L40_object_spotlight` | centre of the object stage | **CODE-DRAWN** | - |  |
| `danger_vignette` | Red edge vignette at 1 slot left | 390x844 / 780x1688 | normal | 70 `L70_danger_vignette` | full bleed | **CODE-DRAWN** | - | Code overlay only. Image 03 has the red glow baked in: never slice it. Weak: about 10 percent edge alpha at 1 slot left (critic #86). |
| `dim_overlay` | Modal dim, 58 percent ink | 390x844 / 780x1688 | normal | 90 `L90_dim` | full bleed | **CODE-DRAWN** | - |  |
| `sy_backdrop_painted` | Blurred workshop backdrop (shelves, jars, plants, screws), no UI, no object | 390x844 / 780x1688 | normal | 0 `L00_bench_background` | full bleed, cover-fit | **NEEDS-ART** | GPT-image | Optional upgrade. Keep contrast lower than the screws (critic #83). |

## HUD

| id | role | 1x / 2x | states | z / layer | anchor | status | approach | source / notes |
|---|---|---|---|---|---|---|---|---|
| `hud_back_button` | Back (X) round brass button | 48x48 / 96x96 | normal, pressed | 80 `L80_back_button` | X0+16, y 64 (safe top 64, NOT 56: critic #86, Dynamic Island band runs to 59 css) | **CODE-DRAWN** | - | Code layer on the shared `btn_round_brass_base`; arrow glyph in code. Hit area 48. Do not slice the painted button. |
| `hud_title_plate` | Title plate: SCREW YARD / object name | 264x48 / 528x96 | normal | 80 `L80_title_plate` | X0+72, y 64, width C-144 | **CODE-DRAWN** | - | Code layer on `plate_plum_brass` (nine-slice). Title text live (Lilita One 22/12). |
| `hud_pause_button` | Pause button | 48x48 / 96x96 | normal, pressed | 80 `L80_pause_button` | X0+C-64, y 64 | **EXISTS** | - | src/assets/art/icon_pause.webp. Icon `icon_pause` on the shared `btn_round_brass_base`. |
| `hud_taps_plate` | TAPS n/budget plate | 120x48 / 240x96 | normal | 80 `L80_taps_plate` | X0+16, y 120 | **CODE-DRAWN** | - | Cream plate, code-drawn; value red (#d6211f) live text 22, caption 12. Painted plate in the mock is reference only. |
| `hud_bonus_clock` | BONUS clock pill (bonus only, never ends the yard) | 96x48 / 192x96 | idle (grey), running, amber (25%), red (10%), out | 80 `L80_bonus_clock` | after TAPS plate, flex width C-288, y 120 | **CODE-DRAWN** | - | src/assets/art/icon_timer.webp. Pill in code: grey idle/running, red at 10 percent (03 shows 0:06 on red). Clock glyph `icon_timer`. Text live. |
| `star_meter_star` | Star (lit) in the 3-star meter and the result panel | 32x32 / 64x64 | lit | 80 `L80_star_meter / L93_stars` | meter x X0+C-128, 3 x 32 with 8 gap; panel 3 x 64 | **EXISTS** | - | src/assets/art/star.webp. Top of the star row, same slots in 01-03. Painted stars are gold with a dark outline; `star.webp` is the match. |
| `turn_label_chip` | FRONT 1/4 chip + hint line | 160x32 / 320x64 | normal | 80 `L80_turn_label` | centre, y HB-168, block 208x56 | **CODE-DRAWN** | - | Not in the painted mock (undo/redo arrows replaced it). Keep only if the owner picks turn arrows over undo/redo. |
| `chip_boxes_to_go` | N BOXES TO GO chip | 152x24 / 304x48 | normal | 62 `L62_boxes_to_go_chip` | X0+16, y 248 | **CODE-DRAWN** | - | Painted mock shows two small NEXT boxes instead of a chip; chip stays as a code fallback. |
| `chip_holding_row` | HOLDING ROW brass label plate | 176x24 / 352x48 | normal, danger (red) | 62 `L62_holding_row_chip` | centre, y 352 | **CODE-DRAWN** | - | Painted: brass pill with live text "HOLDING ROW" (14 css, was too small in v1 and 03). Code nine-slice on `btn_brass` colours. |
| `btn_round_brass_base` | Empty round brass-ringed brown button (back, pause, undo, redo share it) | 48x48 / 96x96 | normal, pressed | 80 `L80_round_buttons` | back X0+16 y 64; pause X0+C-64 y 64; undo/redo bottom row | **NEEDS-ART** | GPT-image | Glyphs (arrow, pause bars, undo, redo) are drawn in code in gold. Undo/redo vs turn arrows is an open owner question; the base is the same. |
| `plate_plum_brass` | Title plate: dark plum plate, brass border, rivets (nine-slice) | 264x56 / 528x112 | normal | 80 `L80_title_plate` | X0+72, y 64 | **NEEDS-ART** | GPT-image | Fallback: code-drawn gradient plate (current). |
| `star_empty` | Star (unlit), dark brown hollow star | 32x32 / 64x64 | unlit | 80 `L80_star_meter / L93_stars` | same slots as star_meter_star | **NEEDS-ART** | GPT-image | Painted mock draws it dark brown. Code fallback: lit star at 50 percent grayscale. |
| `undo_redo_glyph` | Undo / redo curved arrows (gold) on `btn_round_brass_base` | 48x48 / 96x96 | normal | 81 `L81_undo_redo` | bottom row, left and right of the turntable | **CODE-DRAWN** | - | Open owner decision (critic #83/#86): undo/redo vs the older turn arrows. |

## Boxes and holding row

| id | role | 1x / 2x | states | z / layer | anchor | status | approach | source / notes |
|---|---|---|---|---|---|---|---|---|
| `sy_toolbox_open` | Active toolbox (3 wells), also small NEXT boxes | 152x88 / 304x176 | 0/3, 1/3, 2/3, full, brass variant `sy_toolbox_open_brass` | 60 `L60_active_toolbox / L60_next_boxes` | active X0+16, y 168; next boxes 72x40 at X0+C-168, y 192 | **EXISTS** | - | src/assets/art/sy_toolbox_open.webp. Fallback until `toolbox_wide_open_3d` lands (per-colour tint is lossy). |
| `sy_tray` | Holding row, 5 wells (5th well red) | 320x80 / 640x160 | 0..5 filled, danger (code glow + ring) | 60 `L60_holding_row` | centred, y 280; wells at 11/30/49/68/87 percent | **EXISTS** | - | src/assets/art/sy_tray.webp. Fallback until `holding_row_beam_3d` lands. The painted row is a lighter orange beam; the red 5th-well ring is a code overlay. |
| `row_danger_glow` | Red ring on the 5th well plus "1 SLOT LEFT!" tag | 336x96 / 672x192 | normal | 61 `L61_danger_glow / L61_last_well_ring` | behind the row; ring on well 5 | **CODE-DRAWN** | - | Ring and tag in code (red #e8452c pill with tail). Painted 03 ring is reference only. |
| `toolbox_wide_open_3d` | Wide open red toolbox: 3 cream wells (left) and 2 steel NEXT wells (right), brass latch and hinges | 340x108 / 680x216 | 0/3, 1/3, 2/3, full | 60 `L60_active_toolbox` | X0+16, y 168 | **NEEDS-ART** | CODE-3D-RENDER | art-candidates/screw-yard-3d/box.png. Replaces `box_open_3d` of the v1 list. The painted mock always shows red; per-colour boxes stay a hex param. Proof `box.png` exists. |
| `holding_row_beam_3d` | Holding row: orange wood beam with 5 round wells and end pegs | 358x76 / 716x152 | empty, danger (code ring) | 62 `L62_holding_row` | X0+16, y 230 | **NEEDS-ART** | CODE-3D-RENDER | Same plank_5hole part family. Brass label is code (`chip_holding_row`). |
| `next_box_steel` | Small grey NEXT box (steel well) | 72x56 / 144x112 | normal | 60 `L60_next_boxes` | inside the wide toolbox, right | **NEEDS-ART** | CODE-3D-RENDER | Skip when the wide toolbox is rendered as one piece. |

## Object stage and screws

| id | role | 1x / 2x | states | z / layer | anchor | status | approach | source / notes |
|---|---|---|---|---|---|---|---|---|
| `sy_screw` | Current baked screw (tinted per colour) | 48x48 / 96x96 | normal | 50 `L50_object_stage` | screw hole | **EXISTS** | - | src/assets/art/sy_screw.webp. Fallback until the four painted-look heads land. |
| `turntable_disc` | Wooden round display platform the object stands on | 390x150 / 780x300 | normal | 30 `L30_turntable` | object stage, centred under the object, y about HB-300 | **NEEDS-ART** | CODE-3D-RENDER | Fallback: code-drawn ellipse with a plank-line texture. |
| `cannon_stage_blank` | Blank Cannon on the turntable: barrel, red and blue bands, carriage, wheels, EMPTY brass-ringed holes, no screws | 348x280 / 696x560 | normal | 45 `L45_object_stage` | object stage centre, y about 745-1350 of 1846 in the mock | **NEEDS-ART** | GPT-image | Painted look is the target of the mock. Hole centres must be MEASURED by tool, not by eye, before the Implementer builds. Critic #86: gold screws on tan wood and green on red read badly, so every hole gets a neutral steel collar (`screw_washer_collar`) under the screw. |
| `coil_stage_blank` | Blank Coil object, empty brass-ringed holes | 348x280 / 696x560 | normal | 45 `L45_object_stage` | same as cannon_stage_blank | **NEEDS-ART** | GPT-image | Second priority. Bell likewise (`bell_stage_blank`, same size). |
| `bell_stage_blank` | Blank Bell object, empty brass-ringed holes | 348x280 / 696x560 | normal | 45 `L45_object_stage` | same as cannon_stage_blank | **NEEDS-ART** | GPT-image | Third priority. |
| `hole_ring_brass` | Empty screw hole with brass ring (also the neutral rim a screw sits in) | 48x48 / 96x96 | empty, hint glow (code) | 48 `L48_holes` | hole centre | **NEEDS-ART** | CODE-3D-RENDER | Not needed for `cannon_stage_blank` (holes are painted in). Needed for code-built objects and for Coil/Bell if the GPT stages are not approved. |
| `screw_head_R` | Screw red, top view (seated on the object) | 48x48 / 96x96 | seated, lifted (scale 1.25) | 50 `L50_object_stage` | on a hole, centre | **NEEDS-ART** | CODE-3D-RENDER | art-candidates/screw-yard-3d/screw_red.png. Proof sprite exists with known flaws (dome inset, thread hint, env map). Shape coding (glyph pip on the dome) is an open owner question: render with `--glyph on/off`. |
| `screw_side_R` | Screw red, side view with thread (toolbox wells, row, flying, popped-up) | 40x48 / 80x96 | in well, in row, flying, popped on object | 52 `L52_screw_side` | well centre, base of thread | **NEEDS-ART** | CODE-3D-RENDER | Painted v2 shows screws in wells and row with visible threads; the top view alone would look flat there. |
| `screw_head_U` | Screw blue, top view (seated on the object) | 48x48 / 96x96 | seated, lifted (scale 1.25) | 50 `L50_object_stage` | on a hole, centre | **NEEDS-ART** | CODE-3D-RENDER | art-candidates/screw-yard-3d/screw_blue.png. Proof sprite exists with known flaws (dome inset, thread hint, env map). Shape coding (glyph pip on the dome) is an open owner question: render with `--glyph on/off`. |
| `screw_side_U` | Screw blue, side view with thread (toolbox wells, row, flying, popped-up) | 40x48 / 80x96 | in well, in row, flying, popped on object | 52 `L52_screw_side` | well centre, base of thread | **NEEDS-ART** | CODE-3D-RENDER | Painted v2 shows screws in wells and row with visible threads; the top view alone would look flat there. |
| `screw_head_Y` | Screw gold, top view (seated on the object) | 48x48 / 96x96 | seated, lifted (scale 1.25) | 50 `L50_object_stage` | on a hole, centre | **NEEDS-ART** | CODE-3D-RENDER | art-candidates/screw-yard-3d/screw_gold.png. Proof sprite exists with known flaws (dome inset, thread hint, env map). Shape coding (glyph pip on the dome) is an open owner question: render with `--glyph on/off`. |
| `screw_side_Y` | Screw gold, side view with thread (toolbox wells, row, flying, popped-up) | 40x48 / 80x96 | in well, in row, flying, popped on object | 52 `L52_screw_side` | well centre, base of thread | **NEEDS-ART** | CODE-3D-RENDER | Painted v2 shows screws in wells and row with visible threads; the top view alone would look flat there. |
| `screw_head_G` | Screw green, top view (seated on the object) | 48x48 / 96x96 | seated, lifted (scale 1.25) | 50 `L50_object_stage` | on a hole, centre | **NEEDS-ART** | CODE-3D-RENDER | Proof sprite does not exist for green (only red, blue, gold): render it. |
| `screw_side_G` | Screw green, side view with thread (toolbox wells, row, flying, popped-up) | 40x48 / 80x96 | in well, in row, flying, popped on object | 52 `L52_screw_side` | well centre, base of thread | **NEEDS-ART** | CODE-3D-RENDER | Painted v2 shows screws in wells and row with visible threads; the top view alone would look flat there. |
| `screw_washer_collar` | Neutral steel collar under every screw | 56x56 / 112x112 | normal | 49 `L49_collar` | hole centre | **NEEDS-ART** | CODE-3D-RENDER | Fixes the main colour clash and helps colour-blind players. Optional glyph pip on the screw head is the second aid (open owner decision). |
| `screw_spin_frames` | Screw spin sheet, 12 frames (one colour, recoloured by hex) | 48x48 / 96x96 | normal | 66 `L66_flying_screw` | centre on the flying screw | **NEEDS-ART** | CODE-3D-RENDER | Fallback: code rotation of the static head. |
| `plank_5hole_3d` | Plank with holes for code-built objects (3-hole and 5-hole) | 160x48 / 320x96 | normal | 46 `L46_planks` | per object layout | **NEEDS-ART** | CODE-3D-RENDER | art-candidates/screw-yard-3d/plank.png. Proof `plank.png` exists (3 holes). Also `block_wood` (the Taken Apart block). |
| `object_blocks` | Object blocks (code-drawn fallback) | 320x280 / 640x560 | normal | 45 `L45_object_stage` | object stage | **CODE-DRAWN** | - | Kept code until the owner picks the painted stage. A `block_wood` render exists in the 3D plan. |
| `screw_legend_strip` | Legend: four screw heads at 32 px | 160x40 / 320x80 | normal | 52 `L52_legend` | under the stage | **CODE-DRAWN** | - | Shape plus colour if the glyph option is accepted. |

## Coach and effects

| id | role | 1x / 2x | states | z / layer | anchor | status | approach | source / notes |
|---|---|---|---|---|---|---|---|---|
| `coach_bubble` | Coach bubble: TAP A SCREW | 208x48 / 416x96 | normal | 64 `L64_coach_bubble` | above the object, never blocks a tap | **EXISTS** | - | src/assets/art/ui_coach_compact.webp. TAP A SCREW bubble, state 01 only. |
| `warning_bubble` | Warning bubble (1 slot left) | 208x48 / 416x96 | normal | 64 `L64_warning_bubble` | above the object | **EXISTS** | - | src/assets/art/ui_bubble.webp. Small red "!" bubble over the right end of the row, state 03. |
| `tutorial_hand` | Pointing hand | 56x56 / 112x112 | normal | 65 `L65_tutorial_hand` | fingertip on a screw | **EXISTS** | - | src/assets/art/ui_hand.webp. State 01 only; hidden in 02/03 (critic #83). |
| `popup_plus_one` | +1 SCREW chip | 80x24 / 160x48 | normal | 66 `L66_popup_plus_one` | above the landing well | **CODE-DRAWN** | - |  |
| `fx_sparkle` | Gold sparkles / twinkles | 16x16 / 32x32 | normal | 66 `L66_sparkle / L93_sparkle` | around screws, stars | **CODE-DRAWN** | - |  |
| `fx_screw_trail` | Trail dots behind the flying screw | 8x8 / 16x16 | normal | 66 `L66_flying_screw` | behind the screw, 6 dots | **CODE-DRAWN** | - |  |
| `fx_confetti` | Confetti ribbons on the win panel (red, blue, gold, green) | 390x500 / 780x1000 | normal | 94 `L94_confetti` | panel, falling | **CODE-DRAWN** | - | Code particles, 24 cap, off with reduced motion. |

## Result panel (win and fail)

| id | role | 1x / 2x | states | z / layer | anchor | status | approach | source / notes |
|---|---|---|---|---|---|---|---|---|
| `result_panel` | Result panel TAKEN APART! / ROW FULL! | 336x528 / 672x1056 | normal | 92 `L92_result_panel` | X0+24, y 144, (C-48)x528 | **EXISTS** | - | src/assets/art/kit3_panel_popup.webp. Closest accepted panel. Painted 04 adds four brass corner screws and a sunburst; confirm at build, a corner-screw overlay is code (4 `sy_screw` fallback heads). |
| `result_ribbon` | Title ribbon (red win, blue/grey fail) | 272x80 / 544x160 | win (red/blue), fail (grey-blue tint in code) | 93 `L93_ribbon_title` | panel y -32 | **EXISTS** | - | src/assets/art/kit3_ribbon_red.webp. Also `kit3_ribbon_blue`. |
| `result_rays` | Rays behind the hero object | 256x256 / 512x512 | normal | 93 `L93_object_hero` | centre behind the hero, y 56 | **EXISTS** | - | src/assets/art/starburst.webp.  |
| `result_hero_object` | Hero object (Cannon) on the panel | 96x96 / 192x192 | normal | 93 `L93_object_hero` | panel y 56, centred | **EXISTS** | - | src/assets/art/cannon_5.webp. Fallback hero. The painted win shows the cannon in pieces: see `result_hero_pieces_cannon`. Coil/Bell use `coil_5`, `bell_5` until their pieces exist. |
| `result_efficiency_chips` | TAPS n/budget and ROW PEAK n/5 chips | 136x32 / 272x64 | good, bad (red) | 93 `L93_efficiency_chips` | panel y 232 | **CODE-DRAWN** | - |  |
| `result_bonus_chip` | TIME BONUS chip | 160x32 / 320x64 | normal | 93 `L93_bonus_chip` | panel y 272 | **CODE-DRAWN** | - | Gold #ffcf33. |
| `result_reward_card` | Reward row: +6 CANNON CARDS (x2 at 3 stars) | 288x64 / 576x128 | normal | 93 `L93_reward_row` | panel y 312 | **EXISTS** | - | src/assets/art/kit3_panel_card.webp.  |
| `btn_primary` | PLAY AGAIN / TRY AGAIN primary button | 208x64 / 416x128 | normal, pressed (`btn_green_pressed`) | 93 `L93_primary_button` | panel y 392 | **EXISTS** | - | src/assets/art/btn_green.webp. PLAY AGAIN: green with glint sweep (code), height at least 56 css. |
| `btn_secondary` | NEXT: COIL brass button | 208x48 / 416x96 | normal, pressed | 93 `L93_secondary_button` | panel y 472 | **EXISTS** | - | src/assets/art/btn_brass.webp. Tall brass, 46 css on the mock (passes 44). Keep at least 48 css in the build. |
| `fail_hint_row` | Hint: DRILL / BROOM | 208x40 / 416x80 | normal | 93 `L93_efficiency_chips` | under the chips on fail | **CODE-DRAWN** | - | Uses the three painted tool icons at 32 px. |
| `result_hero_pieces_cannon` | Cannon taken apart: barrel, carriage blocks, blue brackets, red plate, two wheels; NO screws | 320x240 / 640x480 | normal | 93 `L93_object_hero` | panel y 160, centred, over the sunburst | **NEEDS-ART** | GPT-image | Coil and Bell pieces later (same template). |
| `fx_glint_play_again` | Glint sweep on PLAY AGAIN | 120x56 / 240x112 | normal | 95 `L95_glint` | btn_primary | **CODE-DRAWN** | - | Code gradient sweep. |

## Tools

| id | role | 1x / 2x | states | z / layer | anchor | status | approach | source / notes |
|---|---|---|---|---|---|---|---|---|
| `tool_icons_sheet` | Three tool icons in one GPT sheet (broom, hammer, drill), sliced to tool_icon_* | 96x32 / 192x64 | normal | 80 `L80_tool_*` | sheet only | **NEEDS-ART** | GPT-image | The painted icons in v2_01 are clean and can be cropped as a zero-cost fallback (see the three `tool_icon_*` rows, `crop` field, mock px of 852x1846). The three read apart by silhouette (vertical, T, L) and accent colour (yellow, red, blue). |
| `tool_icon_broom` | BROOM tool icon (vertical broom with yellow bristles) | 40x40 / 80x80 | normal, disabled (code gray) | 81 `L81_tool_broom` | centre of the tool tile, upper two thirds | **NEEDS-ART** | GPT-image | Bristles pointing down-left; idle wiggle 4 degrees. |
| `tool_icon_hammer` | HAMMER tool icon (T-shaped hammer, red-orange handle) | 40x40 / 80x80 | normal, disabled (code gray) | 81 `L81_tool_hammer` | centre of the tool tile, upper two thirds | **NEEDS-ART** | GPT-image | Hit tap-squash. |
| `tool_icon_drill` | DRILL tool icon (L-shaped blue drill) | 40x40 / 80x80 | normal, disabled (code gray) | 81 `L81_tool_drill` | centre of the tool tile, upper two thirds | **NEEDS-ART** | GPT-image | Slight chuck turn on ready. |
| `tool_tile_cream_brass` | Cream tile with brass frame and an empty label strip in the lower third (nine-slice) | 104x112 / 208x224 | normal, pressed, disabled (code gray), ready glow (code) | 80 `L80_tool_*` | centred row, tile bottom edge at HB-40-8 (clear of the 34 css home bar), 3 tiles, gap 8-16 | **NEEDS-ART** | GPT-image | Critic #86: the painted tiles sit 6 css (01/02) and 18 css (03) inside the home-bar zone; the live build places them above it. Label text live, at least 12 css (v1 03 had 8-10). |

## NEEDS-ART briefs (29)

Every NEEDS-ART row has an `approach`. Ready prompts (GPT-image) and render briefs (CODE-3D-RENDER):

### `sy_backdrop_painted` (GPT-image)

Single full-page image, no sprite key. PROMPT: "Create an image, phone portrait 9:19.5. An empty cosy toy workshop, warm daylight from top-left, blurred shelves with jars and plants, a wooden workbench in the lower half with a few loose brass and steel screws, pale blueprint paper bottom-left. Soft depth of field, warm low-contrast colours, NO UI, NO text, NO cannon, NO turntable. Same painted glossy toy style as the attached mock. Keep the centre (where the cannon stands) calm and the corners busy." Fail if text or an object sits in the middle 60 percent.

### `turntable_disc` (CODE-3D-RENDER)

Code brief (tools/render-yard-3d.mjs): flat cylinder 3 planks wide, visible plank seams, bevelled edge, warm oak, same camera and rig as the screw heads, brown outline 3-4 percent, contact shadow baked at 40 percent. 1024 px source, transparent.

### `cannon_stage_blank` (GPT-image)

PROMPT (same ChatGPT chat as the v2 mocks, or attach v2_02_mid.png as style master): "Create an image on flat #FF00FF magenta. EXACTLY the wooden toy cannon from the attached mock (golden wood barrel with red and blue bands and a brass muzzle ring, blue and red carriage, big blue-spoked wheels with brass rims) seen from the SAME camera angle, but with ALL screws removed: every screw position is an empty round hole with a plain brass ring, 12 holes, the wheel hub is an empty brass ring too. No screws, no turntable, no shadow on the key, no text. 6-10 percent padding." Then Pixel Checker measures the 12 hole centres (see ASSETS_PAINTED.md, Hole map) and writes them to a per-object hole list in the build.

### `coil_stage_blank` (GPT-image)

Same prompt as cannon_stage_blank with "the coil toy from coil_5 art" instead of the cannon. Do after the cannon is approved.

### `bell_stage_blank` (GPT-image)

Same prompt as cannon_stage_blank with "the bell toy from bell_5 art".

### `hole_ring_brass` (CODE-3D-RENDER)

Code brief: torus brass ring around a dark hole, same rig and outline as the screw heads. 256 px source.

### `screw_head_R` (CODE-3D-RENDER)

Code brief (SCREW_YARD_3D_ASSETS.md approach B): round dome Phillips head, #e8452c, bevelled rim, steel-grey slot depth, metal env map, light top-left, ink ring 3-4 percent. Must read as a REAL screw (dome, chamfer, cross recess), not a button. Sits in a neutral steel collar (screw_washer_collar), never directly on a same-hue part. Colour is a hex param, not a tint.

### `screw_side_R` (CODE-3D-RENDER)

Code brief: same head as screw_head_R seen from 20 degrees above the side, 6-8 visible thread rings, straight shank, #e8452c, transparent, 256 px source. Thread rings in a darker shade of the same hex, not grey.

### `screw_head_U` (CODE-3D-RENDER)

Code brief (SCREW_YARD_3D_ASSETS.md approach B): round dome Phillips head, #2f6fe0, bevelled rim, steel-grey slot depth, metal env map, light top-left, ink ring 3-4 percent. Must read as a REAL screw (dome, chamfer, cross recess), not a button. Sits in a neutral steel collar (screw_washer_collar), never directly on a same-hue part. Colour is a hex param, not a tint.

### `screw_side_U` (CODE-3D-RENDER)

Code brief: same head as screw_head_U seen from 20 degrees above the side, 6-8 visible thread rings, straight shank, #2f6fe0, transparent, 256 px source. Thread rings in a darker shade of the same hex, not grey.

### `screw_head_Y` (CODE-3D-RENDER)

Code brief (SCREW_YARD_3D_ASSETS.md approach B): round dome Phillips head, #f2b632, bevelled rim, steel-grey slot depth, metal env map, light top-left, ink ring 3-4 percent. Must read as a REAL screw (dome, chamfer, cross recess), not a button. Sits in a neutral steel collar (screw_washer_collar), never directly on a same-hue part. Colour is a hex param, not a tint.

### `screw_side_Y` (CODE-3D-RENDER)

Code brief: same head as screw_head_Y seen from 20 degrees above the side, 6-8 visible thread rings, straight shank, #f2b632, transparent, 256 px source. Thread rings in a darker shade of the same hex, not grey.

### `screw_head_G` (CODE-3D-RENDER)

Code brief (SCREW_YARD_3D_ASSETS.md approach B): round dome Phillips head, #2fa84f, bevelled rim, steel-grey slot depth, metal env map, light top-left, ink ring 3-4 percent. Must read as a REAL screw (dome, chamfer, cross recess), not a button. Sits in a neutral steel collar (screw_washer_collar), never directly on a same-hue part. Colour is a hex param, not a tint.

### `screw_side_G` (CODE-3D-RENDER)

Code brief: same head as screw_head_G seen from 20 degrees above the side, 6-8 visible thread rings, straight shank, #2fa84f, transparent, 256 px source. Thread rings in a darker shade of the same hex, not grey.

### `screw_washer_collar` (CODE-3D-RENDER)

Code brief: flat steel washer, two value steps (#c9ced6 / #6e7480), ink ring 3 percent, same rig. Gives gold on tan wood, green on red plate and red on red band a neutral edge (critic #86). 256 px source.

### `screw_spin_frames` (CODE-3D-RENDER)

Code brief: rotate Y 0-360 in 12 steps, transparent, same rig as screw_head_R. Needs `--frames 12` in tools/render-yard-3d.mjs.

### `plank_5hole_3d` (CODE-3D-RENDER)

Code brief: warm oak plank, bevel, 3 or 5 round holes with brass rings, visible grain.

### `toolbox_wide_open_3d` (CODE-3D-RENDER)

Code brief: three.js open toolbox, red body (#d22a22) with darker inner rim, cream inset tray with 3 round wells, steel divider and 2 smaller grey NEXT wells, brass latch top centre, two brass hinges bottom, brown outline 3-4 percent, 1024 px source. Body hex is a param (recolour by hex). Labels "NEXT" are live text on the two small wells.

### `holding_row_beam_3d` (CODE-3D-RENDER)

Code brief: oak beam, rounded corners, 5 round recessed wells of equal size (wells 58 css, centre spacing 63), beam pegs sticking out left and right, same rig. Beam colour must stay lighter and warmer than the bench so wells read.

### `next_box_steel` (CODE-3D-RENDER)

Code brief: small open steel tray, one square well, same rig.

### `btn_round_brass_base` (GPT-image)

PROMPT: "Create an image, 2 cells in one row on flat #FF00FF magenta: (1) an empty round game button, thick glossy brass ring, dark chocolate-brown glossy centre, no symbol, (2) the same pressed (centre darker, 3 percent smaller). Match the round buttons in the attached mock. STYLE LOCK: glossy 3D toy look of the painted Screw Yard v2 mock (attach art-candidates/mockups/screw-yard-painted-v2/v2_02_mid.png as the STYLE MASTER), warm dark-brown outline 3-4% of sprite height (never black), light from top-left, thin rim light bottom-right, soft contact shadow, 3-4 value steps. KEY: one sprite per cell on flat #FF00FF magenta (use flat #00FF00 green if the art has red-pink or magenta), no gradient or shadow on the key, no baked text or numbers, 6-10% padding, nothing within 3 px of the cell edge."

### `plate_plum_brass` (GPT-image)

PROMPT: "Create an image, 1 cell on flat #FF00FF magenta: an EMPTY wide title plate, dark plum-brown glossy centre, thin brass border with a small rivet at each end, flat plain centre (text is added later), 264:56 proportion. STYLE LOCK: glossy 3D toy look of the painted Screw Yard v2 mock (attach art-candidates/mockups/screw-yard-painted-v2/v2_02_mid.png as the STYLE MASTER), warm dark-brown outline 3-4% of sprite height (never black), light from top-left, thin rim light bottom-right, soft contact shadow, 3-4 value steps. KEY: one sprite per cell on flat #FF00FF magenta (use flat #00FF00 green if the art has red-pink or magenta), no gradient or shadow on the key, no baked text or numbers, 6-10% padding, nothing within 3 px of the cell edge."

### `star_empty` (GPT-image)

PROMPT: "Create an image, 1 cell on flat #FF00FF magenta: the same chunky five-point star silhouette as the gold game star, but UNLIT: flat dark brown (#5c3a2e) body, slightly lighter rim, no gold, no sparkle, shallow inner bevel so it reads as an empty slot. STYLE LOCK: glossy 3D toy look of the painted Screw Yard v2 mock (attach art-candidates/mockups/screw-yard-painted-v2/v2_02_mid.png as the STYLE MASTER), warm dark-brown outline 3-4% of sprite height (never black), light from top-left, thin rim light bottom-right, soft contact shadow, 3-4 value steps. KEY: one sprite per cell on flat #FF00FF magenta (use flat #00FF00 green if the art has red-pink or magenta), no gradient or shadow on the key, no baked text or numbers, 6-10% padding, nothing within 3 px of the cell edge." Must differ from the lit star by at least 40 percent in grayscale.

### `tool_icons_sheet` (GPT-image)

PROMPT (ready to paste, one chat, attach v2_02_mid.png): "Create an image, 3 cells in one row on flat #FF00FF magenta, one chunky toy icon per cell, no tile behind them, no text: (1) a BROOM, long vertical, light-wood handle, blue band, yellow bristle block pointing down-left; (2) a HAMMER, T-shaped, steel head and red-orange handle with a brass cap, tilted 30 degrees; (3) a cordless DRILL, L-shaped, blue body with orange-yellow trim and a steel chuck. Exactly the style and angle of the three icons on the tool tiles in the attached mock. STYLE LOCK: glossy 3D toy look of the painted Screw Yard v2 mock (attach art-candidates/mockups/screw-yard-painted-v2/v2_02_mid.png as the STYLE MASTER), warm dark-brown outline 3-4% of sprite height (never black), light from top-left, thin rim light bottom-right, soft contact shadow, 3-4 value steps. KEY: one sprite per cell on flat #FF00FF magenta (use flat #00FF00 green if the art has red-pink or magenta), no gradient or shadow on the key, no baked text or numbers, 6-10% padding, nothing within 3 px of the cell edge." Slice: node tools/slice-sheet.mjs <sheet.png> --grid 3x1 --key magenta --out <dir> --names tool_icon_broom,tool_icon_hammer,tool_icon_drill --kind icon

### `tool_icon_broom` (GPT-image)

From `tool_icons_sheet` (one GPT sheet, prompt there). Cell broom.

### `tool_icon_hammer` (GPT-image)

From `tool_icons_sheet` (one GPT sheet, prompt there). Cell hammer.

### `tool_icon_drill` (GPT-image)

From `tool_icons_sheet` (one GPT sheet, prompt there). Cell drill.

### `tool_tile_cream_brass` (GPT-image)

PROMPT: "Create an image, 2 cells in one row on flat #FF00FF magenta: an EMPTY rounded square game button tile, cream face, thick glossy brass frame, a slightly darker blank cream label strip across the bottom third, flat plain centre so an icon and a text label are added later. Cell 1 normal, cell 2 pressed (3 percent smaller, frame darker). Match the tool tiles in the attached mock. STYLE LOCK: glossy 3D toy look of the painted Screw Yard v2 mock (attach art-candidates/mockups/screw-yard-painted-v2/v2_02_mid.png as the STYLE MASTER), warm dark-brown outline 3-4% of sprite height (never black), light from top-left, thin rim light bottom-right, soft contact shadow, 3-4 value steps. KEY: one sprite per cell on flat #FF00FF magenta (use flat #00FF00 green if the art has red-pink or magenta), no gradient or shadow on the key, no baked text or numbers, 6-10% padding, nothing within 3 px of the cell edge."

### `result_hero_pieces_cannon` (GPT-image)

PROMPT (attach v2_04_win.png and v2_02_mid.png): "Create an image on flat #FF00FF magenta: the wooden toy cannon from the attached mock taken apart and floating slightly apart (barrel with red and blue bands, two blue brackets, wooden carriage blocks with a red plate, two wheels), holes visible with brass rings, NO screws anywhere, no text, no sparkles. STYLE LOCK: glossy 3D toy look of the painted Screw Yard v2 mock (attach art-candidates/mockups/screw-yard-painted-v2/v2_02_mid.png as the STYLE MASTER), warm dark-brown outline 3-4% of sprite height (never black), light from top-left, thin rim light bottom-right, soft contact shadow, 3-4 value steps. KEY: one sprite per cell on flat #FF00FF magenta (use flat #00FF00 green if the art has red-pink or magenta), no gradient or shadow on the key, no baked text or numbers, 6-10% padding, nothing within 3 px of the cell edge." Loose screws, confetti and sparkles in the mock are separate: 6 `screw_side_*` sprites tumbled in code.


## Hole map (state 01, indicative)

Eyeballed from `v2_01_start.png` (852x1846 px), same cannon in all four mocks. Pixel Checker measures with a tool before the Implementer builds. 12 holes; most heads are round Phillips, three are slotted.

| hole | x | y | head in the mock |
|---|---|---|---|
| barrel_top_left | 305 | 815 | Phillips red |
| barrel_top_mid | 415 | 815 | Phillips gold |
| barrel_top_right | 525 | 790 | blue, side view, popped up |
| barrel_left | 282 | 940 | Phillips blue |
| barrel_mid | 452 | 942 | Phillips gold |
| barrel_right | 567 | 875 | Phillips green |
| bracket | 325 | 1060 | slotted gold |
| carriage_top | 550 | 1112 | Phillips red |
| wheel_hub | 143 | 1213 | Phillips gold |
| red_plate | 426 | 1236 | Phillips green |
| carriage_right | 604 | 1262 | slotted blue |
| wheel_rear | 690 | 1208 | slotted red |

Clashes to remove by the collar: `barrel_top_left` (red on the red band), `barrel_mid` and `bracket` (gold on tan wood), `red_plate` (green on red).

## State to asset map

| Mock | Needs beyond the shared kit |
|---|---|
| 01 start | coach bubble, tutorial hand, 3 lit stars, 12 seated screws, empty row and toolbox |
| 02 mid | 2 lit stars, `screw_side_*` in well 1 and the row, flying screw (`screw_spin_frames`, `fx_screw_trail`), `popup_plus_one`, empty holes |
| 03 danger | 1 lit star + `star_empty` x2, red clock pill, 4 screws in row, `row_danger_glow`, `danger_vignette`, warning bubble, tool tiles lightly glowing (code) |
| 04 win | `result_*`, `result_hero_pieces_cannon`, 3 lit stars, loose screws (code scatter of `screw_side_*`), `fx_confetti`, PLAY AGAIN glint, NEXT: COIL |

## CODE-3D-RENDER order (tools/render-yard-3d.mjs)

1. Fix the three proof screws (dome inset, thread hint, metal env map, 3-4% brown outline), add green: `screw_head_R/U/Y/G`.
2. `screw_washer_collar`, then `screw_side_R/U/Y/G`.
3. `--frames 12` spin sheet: `screw_spin_frames`.
4. `toolbox_wide_open_3d`, `holding_row_beam_3d` (+ `plank_5hole_3d`).
5. `turntable_disc`, `hole_ring_brass`.
6. Owner approves the look from a contact sheet (dark and light background, 110 px, 70 px, grayscale) before the full batch. Acceptance per sprite: critic rubric 18/20, 6-10% padding.

GPT-image order: `tool_icons_sheet` + `tool_tile_cream_brass`, `btn_round_brass_base` + `plate_plum_brass` + `star_empty`, `cannon_stage_blank`, `result_hero_pieces_cannon`, `sy_backdrop_painted`, then `coil_stage_blank` and `bell_stage_blank`. Each sheet: critic pass before slicing, at most 2 redos.

## Open points for the Implementer and owner

- Build behind a flag, OFF, with the existing assets as fallback (`sy_screw`, `sy_toolbox_open`, `sy_tray`, code tool tiles).
- Undo/redo vs turn arrows: owner decision pending.
- Shape/glyph coding for the four screw colours: owner decision pending.
- One more try of mock 03 (critic): bigger labels, red barrel screw off the red band, same y as 01/02, weaker glow. Does not block the assets above.
- All pixel positions in this list are estimates; the Pixel Checker measures safe areas and hole centres.
- Image 02 has `BONUS 0:31` and 03 `0:06`: clock text is live; the pill colour states are code.
