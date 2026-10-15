# SCREW YARD asset list (step 3 of the mock chain)

Asset Breaker, task t-454597ec, 2026-10-15. Source: `SPEC.md` and `PIXEL_CHECK.md` in this folder, the mock `art-candidates/mockups/screw-yard/index.html` and `docs/design/SCREW_YARD_3D_ASSETS.md` (finished; it recommends approach B, code-built three.js sprites). Machine-readable twin: `art-candidates/mockups/screw-yard/manifest.json` (same ids, every field). No images were generated and `src/` was not touched.

## Totals

| Status | Count | Meaning |
|---|---|---|
| EXISTS | 16 | file in `src/assets/art` (or a proof sprite in `art-candidates/screw-yard-3d`) |
| NEEDS-SLICE | 0 | raw sheet exists, cut with `tools/slice-sheet.mjs` |
| NEEDS-ART | 11 | must be made; each has an `approach` |
| CODE-DRAWN | 22 | no art, the Implementer builds it in code |
| **Total entries** | **49** | |

| Group | EXISTS | NEEDS-SLICE | NEEDS-ART | CODE-DRAWN |
|---|---|---|---|---|
| Background and light | 1 | 0 | 0 | 4 |
| HUD | 2 | 0 | 1 | 8 |
| Boxes and holding row | 2 | 0 | 1 | 1 |
| Object stage and screws | 1 | 0 | 5 | 3 |
| Tools | 0 | 0 | 4 | 0 |
| Coach and effects | 3 | 0 | 0 | 3 |
| Result panel (win and fail) | 7 | 0 | 0 | 3 |

## Read this first

1. **Zero NEEDS-SLICE.** No raw sheet is waiting. GPT-image pieces that come back as a sheet: `node tools/slice-sheet.mjs <sheet.png> --grid CxR --key magenta|green --out <dir> --names a,b,c [--kind icon|panel|strip]`.
2. **Art that was MISSING in the mock** (magenta stickers): `tool_icon_broom/hammer/drill`, `tool_tile_green`, `screw_head_R/U/Y/G`, `star_empty`. All are NEEDS-ART below. Everything else the mock draws is EXISTS or code.
3. **Approach split.** CODE-3D-RENDER for anything that must be one consistent 3D family, recolourable by hex and animated by frames: the four screw heads, the spin frames, the toolbox upgrade. GPT-image for the three tool icons, the tool tile and the unlit star (small, flat-lit icons where one-off charm beats consistency, and they match the accepted kit). The 3D doc is finished, so no "decide after" note is needed. Owner still has to approve the proof look before the first 24-sprite batch (proof flaws are listed in the doc).
4. **Object blocks stay CODE-DRAWN** (as the mock and the build do). A `block_wood` render is in the 3D first batch; swap only after the owner picks the look.
5. **Mock file names vs game files:** the mock reuses `sy_background`, `sy_tray`, `sy_toolbox_open`, `star`, `icon_pause`, `icon_timer`, `kit3_panel_popup`, `kit3_ribbon_red/blue`, `starburst`, `cannon_5`, `ui_hand` (SPEC section 1). Rows for `btn_green`, `btn_brass`, `kit3_panel_card`, `ui_coach_compact`, `ui_bubble` are the closest existing files for pieces the mock drew in code; the Implementer should confirm them in the scene.
6. Note N2 of the pixel check: the Bell at 360x780 in the screws state has screw heads about 14 px; hit areas need slop in the game (not an art item).

### Common rules for every GPT-image brief

STYLE LOCK: warm dark-brown outline (not black) 3-4% of sprite height, light from top-left, thin rim light bottom-right, soft contact shadow, 3-4 value steps, glossy toy-metal look like the accepted medallion/popup kit. KEY: one sprite per grid cell on flat #FF00FF magenta; if the art contains pink, magenta, red-purple or a pink glow use flat #00FF00 green instead (the broom, hammer and drill icons have orange/red: magenta is fine unless the grip is pink-red, then green); never a gradient or shadow on the key; no baked text or numbers; 6-10% padding inside the cell; nothing within 3 px of the cell edge. RANK CLARITY: states/tiers in one family must differ in at least two of silhouette, size, part count, accent colour, pips, and still read apart at 70 px in grayscale. Here that means: the four screw heads differ by head SHAPE and colour (round, diamond, triangle, plus; red, blue, gold, green) and must separate in grayscale by shape alone; the three tool icons differ by silhouette (long vertical broom, T-shaped hammer, L-shaped drill) and accent colour (yellow, red-orange, blue); lit vs unlit star differ by value and fill.

Screen units: 8 px grid, phones 360x780 / 390x844 / 430x932, safe area top 48, bottom 32, content column C = floor(W/8)*8, HB = floor(H/8)*8. Sizes are CSS px at 1x and 2x (the 2x is the file size to ship). Z values from SPEC section 5.

## Background and light

| id | role | 1x / 2x | nine-slice | states | z / layer | anchor | where | status | approach | source |
|---|---|---|---|---|---|---|---|---|---|---|
| `sy_background` | Wooden workbench background | 390x844 / 780x1688 | - | normal | 0 `L00_bench_background` | full bleed, cover-fit, centred | Behind everything, all states | **EXISTS** | - | src/assets/art/sy_background.webp |
| `key_light_vignette` | Soft top-left key light and edge vignette | 390x844 / 780x1688 | - | normal | 2 `L02_key_light_and_vignette` | full bleed | Over the bench | **CODE-DRAWN** | - | code |
| `object_spotlight` | Warm bloom behind the object | 320x320 / 640x640 | - | normal | 40 `L40_object_spotlight` | centre of the object stage | Behind the object | **CODE-DRAWN** | - | code |
| `danger_vignette` | Red edge vignette at 1 slot left | 390x844 / 780x1688 | - | normal | 70 `L70_danger_vignette` | full bleed | Danger state (row 4/5) | **CODE-DRAWN** | - | code |
| `dim_overlay` | Modal dim, 58 percent ink | 390x844 / 780x1688 | - | normal | 90 `L90_dim` | full bleed | Win and fail | **CODE-DRAWN** | - | code |

## HUD

| id | role | 1x / 2x | nine-slice | states | z / layer | anchor | where | status | approach | source |
|---|---|---|---|---|---|---|---|---|---|---|
| `hud_back_button` | Back (X) round brass button | 48x48 / 96x96 | - | normal, pressed | 80 `L80_back_button` | X0+16, y 56 | Top left | **CODE-DRAWN** | - | code |
| `hud_title_plate` | Title plate: SCREW YARD / object name | 264x48 / 528x96 | 20/20/20/20 | normal | 80 `L80_title_plate` | X0+72, y 56, width C-144 | Top centre | **CODE-DRAWN** | - | code |
| `hud_pause_button` | Pause button | 48x48 / 96x96 | - | normal, pressed | 80 `L80_pause_button` | X0+C-64, y 56 | Top right | **EXISTS** | - | src/assets/art/icon_pause.webp |
| `hud_taps_plate` | TAPS n/budget plate | 120x48 / 240x96 | 20/20/20/20 | normal | 80 `L80_taps_plate` | X0+16, y 112 | Stats row, left | **CODE-DRAWN** | - | code |
| `hud_bonus_clock` | BONUS clock pill (bonus only, never ends the yard) | 96x48 / 192x96 | 20/20/20/20 | idle (grey), running, amber (25%), red (10%), out | 80 `L80_bonus_clock` | after TAPS plate, flex width C-288 | Stats row, centre | **CODE-DRAWN** | - | src/assets/art/icon_timer.webp |
| `star_meter_star` | Star (lit) in the 3-star meter and the result panel | 32x32 / 64x64 | - | lit | 80 `L80_star_meter / L93_stars` | meter x X0+C-128, 3 x 32 with 8 gap; panel 3 x 64 | HUD meter and result panel | **EXISTS** | - | src/assets/art/star.webp |
| `star_empty` | Star (unlit) | 32x32 / 64x64 | - | unlit | 80 `L80_star_meter / L93_stars` | same slots as star_meter_star | Star meter after a star is lost, fail panel | **NEEDS-ART** | GPT-image | see brief |
| `turn_arrow` | Rotate view arrows (left, right) | 56x56 / 112x112 | - | normal, pressed | 80 `L80_turn_left / L80_turn_right` | X0+16 / X0+C-72, y HB-168 | Below the object stage | **CODE-DRAWN** | - | code |
| `turn_label_chip` | FRONT 1/4 chip + hint line | 160x32 / 320x64 | 16/16/16/16 | normal | 80 `L80_turn_label` | centre, y HB-168, block 208x56 | Between the arrows | **CODE-DRAWN** | - | code |
| `chip_boxes_to_go` | N BOXES TO GO chip | 152x24 / 304x48 | 12/12/12/12 | normal | 62 `L62_boxes_to_go_chip` | X0+16, y 248 | Under the active toolbox | **CODE-DRAWN** | - | code |
| `chip_holding_row` | HOLDING ROW n/5 chip (red "1 SLOT LEFT!" in danger) | 176x24 / 352x48 | 12/12/12/12 | normal, danger (red) | 62 `L62_holding_row_chip` | centre, y 352 | Under the holding row | **CODE-DRAWN** | - | code |

## Boxes and holding row

| id | role | 1x / 2x | nine-slice | states | z / layer | anchor | where | status | approach | source |
|---|---|---|---|---|---|---|---|---|---|---|
| `sy_toolbox_open` | Active toolbox (3 wells), also small NEXT boxes | 152x88 / 304x176 | - | 0/3, 1/3, 2/3, full, brass variant `sy_toolbox_open_brass` | 60 `L60_active_toolbox / L60_next_boxes` | active X0+16, y 168; next boxes 72x40 at X0+C-168, y 192 | Under the stats row | **EXISTS** | - | src/assets/art/sy_toolbox_open.webp |
| `box_open_3d` | Open toolbox, 3 holes, rendered per colour (upgrade) | 152x88 / 304x176 | - | normal | 60 `L60_active_toolbox` | same as sy_toolbox_open | Replaces sy_toolbox_open behind the Object Yard art flag | **NEEDS-ART** | CODE-3D-RENDER | see brief |
| `sy_tray` | Holding row, 5 wells (5th well red) | 320x80 / 640x160 | - | 0..5 filled, danger (code glow + ring) | 60 `L60_holding_row` | centred, y 280; wells at 11/30/49/68/87 percent | Centre of the screen | **EXISTS** | - | src/assets/art/sy_tray.webp |
| `row_danger_glow` | Red glow under the row and pulsing ring on the last well | 336x96 / 672x192 | - | normal | 61 `L61_danger_glow / L61_last_well_ring` | behind the row; ring on well 5 | Row at 4/5 and 5/5 | **CODE-DRAWN** | - | code |

## Object stage and screws

| id | role | 1x / 2x | nine-slice | states | z / layer | anchor | where | status | approach | source |
|---|---|---|---|---|---|---|---|---|---|---|
| `object_blocks` | The Taken Apart object (Cannon, Coil, Bell), isometric blocks with holes | 384x280 / 768x560 | - | intact, screws removed (holes), grey tilted -6 degrees on fail | 50 `L50_object_stage` | centred in the stage (y 384, height HB-176-384) | Centre | **CODE-DRAWN** | - | code |
| `screw_head_R` | Screw head ROUND, red (Cannon) | 48x48 / 96x96 | - | seated, lifted (scale 1.25) | 50 `L50_object_stage` | on a screw hole, centre | Object, flying screw, row wells, legend | **NEEDS-ART** | CODE-3D-RENDER | art-candidates/screw-yard-3d/screw_red.png |
| `screw_head_U` | Screw head DIAMOND, blue (Coil) | 48x48 / 96x96 | - | seated, lifted | 50 `L50_object_stage` | as screw_head_R | as screw_head_R | **NEEDS-ART** | CODE-3D-RENDER | art-candidates/screw-yard-3d/screw_blue.png |
| `screw_head_Y` | Screw head TRIANGLE, gold (Bell) | 48x48 / 96x96 | - | seated, lifted | 50 `L50_object_stage` | as screw_head_R | as screw_head_R | **NEEDS-ART** | CODE-3D-RENDER | art-candidates/screw-yard-3d/screw_gold.png |
| `screw_head_G` | Screw head PLUS, green (Support) | 48x48 / 96x96 | - | seated, lifted | 50 `L50_object_stage` | as screw_head_R | as screw_head_R | **NEEDS-ART** | CODE-3D-RENDER | see brief |
| `screw_spin_frames` | Screw spin sheet, 12 frames (one colour, recoloured by hex) | 48x48 / 96x96 | - | normal | 66 `L66_flying_screw` | centre on the flying screw | Tapped screw spin-out | **NEEDS-ART** | CODE-3D-RENDER | see brief |
| `sy_screw` | Current baked screw (tinted per colour) | 48x48 / 96x96 | - | normal | 50 `L50_object_stage` | screw hole | Live game today | **EXISTS** | - | src/assets/art/sy_screw.webp |
| `screw_hole` | Empty screw hole | 16x16 / 32x32 | - | normal | 50 `L50_object_stage` | screw position | After a screw leaves | **CODE-DRAWN** | - | code |
| `screw_legend_strip` | Legend strip: ROUND red Cannon, DIAMOND blue Coil, TRIANGLE gold Bell, PLUS green Support | 360x72 / 720x144 | 16/16/16/16 | normal | 70 `L70_screw_legend` | under the object, 72 px tall | Teaching state only | **CODE-DRAWN** | - | code |

## Tools

| id | role | 1x / 2x | nine-slice | states | z / layer | anchor | where | status | approach | source |
|---|---|---|---|---|---|---|---|---|---|---|
| `tool_icon_broom` | BROOM tool icon | 32x32 / 64x64 | - | normal, disabled (code gray) | 80 `L80_tool_broom` | centre of the tool tile, x-16 y-18 | Tool tile and the fail hint row | **NEEDS-ART** | GPT-image | see brief |
| `tool_icon_hammer` | HAMMER tool icon | 32x32 / 64x64 | - | normal, disabled | 80 `L80_tool_hammer` | as broom | as broom | **NEEDS-ART** | GPT-image | see brief |
| `tool_icon_drill` | DRILL tool icon | 32x32 / 64x64 | - | normal, disabled | 80 `L80_tool_drill` | as broom | as broom | **NEEDS-ART** | GPT-image | see brief |
| `tool_tile_green` | Glossy rounded tile behind each tool | 112x64 / 224x128 | 24/24/24/24 | normal, pressed, disabled (code gray) | 80 `L80_tool_*` | centred row at y HB-96; tw 112/104/120, gap 8-16 | Bottom row, 3 tiles | **NEEDS-ART** | GPT-image | see brief |

## Coach and effects

| id | role | 1x / 2x | nine-slice | states | z / layer | anchor | where | status | approach | source |
|---|---|---|---|---|---|---|---|---|---|---|
| `coach_bubble` | Coach bubble: TAP A SCREW | 208x48 / 416x96 | 24/24/24/24 | normal | 64 `L64_coach_bubble` | above the object, never blocks a tap | Start state | **EXISTS** | - | src/assets/art/ui_coach_compact.webp |
| `warning_bubble` | Warning bubble (1 slot left) | 208x48 / 416x96 | 24/24/24/24 | normal | 64 `L64_warning_bubble` | above the object | Danger state | **EXISTS** | - | src/assets/art/ui_bubble.webp |
| `tutorial_hand` | Pointing hand | 56x56 / 112x112 | - | normal | 65 `L65_tutorial_hand` | fingertip on a screw | Start state | **EXISTS** | - | src/assets/art/ui_hand.webp |
| `popup_plus_one` | +1 SCREW chip | 80x24 / 160x48 | - | normal | 66 `L66_popup_plus_one` | above the landing well | On landing | **CODE-DRAWN** | - | code |
| `fx_sparkle` | Gold sparkles / twinkles | 16x16 / 32x32 | - | normal | 66 `L66_sparkle / L93_sparkle` | around screws, stars | Mid state, star pop | **CODE-DRAWN** | - | code |
| `fx_screw_trail` | Trail dots behind the flying screw | 8x8 / 16x16 | - | normal | 66 `L66_flying_screw` | behind the screw, 6 dots | During flight | **CODE-DRAWN** | - | code |

## Result panel (win and fail)

| id | role | 1x / 2x | nine-slice | states | z / layer | anchor | where | status | approach | source |
|---|---|---|---|---|---|---|---|---|---|---|
| `result_panel` | Result panel TAKEN APART! / ROW FULL! | 336x528 / 672x1056 | 48/48/48/48 | normal | 92 `L92_result_panel` | X0+24, y 144, (C-48)x528 | Win and fail | **EXISTS** | - | src/assets/art/kit3_panel_popup.webp |
| `result_ribbon` | Title ribbon (red win, blue/grey fail) | 272x80 / 544x160 | - | win (red/blue), fail (grey-blue tint in code) | 93 `L93_ribbon_title` | panel y -32 | Top of the panel | **EXISTS** | - | src/assets/art/kit3_ribbon_red.webp |
| `result_rays` | Rays behind the hero object | 256x256 / 512x512 | - | normal | 93 `L93_object_hero` | centre behind the hero, y 56 | Win | **EXISTS** | - | src/assets/art/starburst.webp |
| `result_hero_object` | Hero object (Cannon) on the panel | 96x96 / 192x192 | - | normal | 93 `L93_object_hero` | panel y 56, centred | Win; grey in fail | **EXISTS** | - | src/assets/art/cannon_5.webp |
| `result_efficiency_chips` | TAPS n/budget and ROW PEAK n/5 chips | 136x32 / 272x64 | 16/16/16/16 | good, bad (red) | 93 `L93_efficiency_chips` | panel y 232 | Win and fail (red) | **CODE-DRAWN** | - | code |
| `result_bonus_chip` | TIME BONUS chip | 160x32 / 320x64 | 16/16/16/16 | normal | 93 `L93_bonus_chip` | panel y 272 | Win | **CODE-DRAWN** | - | code |
| `result_reward_card` | Reward row: +6 CANNON CARDS (x2 at 3 stars) | 288x64 / 576x128 | 24/24/24/24 | normal | 93 `L93_reward_row` | panel y 312 | Win | **EXISTS** | - | src/assets/art/kit3_panel_card.webp |
| `btn_primary` | PLAY AGAIN / TRY AGAIN primary button | 208x64 / 416x128 | 32/32/32/32 | normal, pressed (`btn_green_pressed`) | 93 `L93_primary_button` | panel y 392 | Win and fail | **EXISTS** | - | src/assets/art/btn_green.webp |
| `btn_secondary` | NEXT: COIL / BACK TO EVENT secondary button | 208x48 / 416x96 | 24/24/24/24 | normal, pressed | 93 `L93_secondary_button` | panel y 472 | Win and fail | **EXISTS** | - | src/assets/art/btn_brass.webp |
| `fail_hint_row` | Hint: DRILL / BROOM | 208x40 / 416x80 | - | normal | 93 `L93_efficiency_chips` | under the chips on fail | Fail | **CODE-DRAWN** | - | code |

## Animation notes (all visual only, honour reduced motion, never pause the simulation)

| asset | name | type | ms | detail |
|---|---|---|---|---|
| `object_spotlight` | breathe | loop | 3200 | alpha 0.8 to 1, still under reduced motion |
| `danger_vignette` | pulse | loop | 600 | alpha 0.35 to 0.6; steady under reduced motion |
| `hud_back_button` | pressSquash | press | 120 | scale 0.94, overshoot 1.06, 1 |
| `hud_pause_button` | pressSquash | press | 120 | scale 0.94, overshoot 1.06, 1 |
| `hud_taps_plate` | countUp | number | 200 | value ticks on each tap; pop 1.1 on change |
| `hud_bonus_clock` | clockPulse | loop | 600 | at red; no shake on timeout |
| `star_meter_star` | starPop | pop | 600 | scale 0 to 1.4 to 0.9 to 1, 8 degree wobble, 250 ms apart from 300 ms |
| `turn_arrow` | pressSquash | press | 120 | scale 0.94, overshoot 1.06, 1 |
| `turn_arrow` | turn | spin | 250 | object rotates 90 degrees, view label updates |
| `chip_holding_row` | chipPop | pop | 240 | scale 1.15 to 1 on change |
| `sy_toolbox_open` | boxMoment | burst | 620 | lid slam, latch flash, ring, 8 sparks (existing) |
| `sy_toolbox_open` | slideIn | slide | 300 | next box slides in from the right |
| `sy_tray` | landPop | pop | 240 | screw lands: scale 1.2, 0.92, 1 |
| `row_danger_glow` | pulse | loop | 600 | glow and ring; row, stage and chip shake 4 px per 400 ms; steady glow under reduced motion |
| `object_blocks` | fail tilt | tilt | 400 | greys and tilts -6 degrees |
| `screw_head_R` | spinOut | spin | 320 | 2 turns, lift 10 px, scale 1.25 |
| `screw_head_R` | fly | arc | 380 | arc to next free well, trail dots |
| `screw_head_R` | landPop | pop | 240 | 1.2, 0.92, 1 |
| `tool_icon_broom` | idleWiggle | loop | 2400 | tilt 4 degrees, one sparkle |
| `tool_icon_hammer` | idleWiggle | loop | 2400 | tilt 4 degrees |
| `tool_icon_drill` | idleWiggle | loop | 2400 | tilt 4 degrees |
| `tool_tile_green` | pressSquash | press | 120 | scale 0.94, overshoot 1.06, 1 |
| `tool_tile_green` | glint | sweep | 600 | every 4 s on ready |
| `coach_bubble` | popIn | pop | 350 | scale 0 to 1.12 to 1, Back.easeOut |
| `warning_bubble` | popIn | pop | 350 | scale 0 to 1.12 to 1, Back.easeOut |
| `tutorial_hand` | tapHint | loop | 1200 | taps 6 px toward the screw |
| `popup_plus_one` | riseFade | rise | 600 | rises 24 px and fades |
| `fx_sparkle` | twinkle | loop | 800 | scale 0 to 1 to 0 |
| `fx_screw_trail` | trailFade | fade | 380 | dots fade by distance |
| `result_panel` | panelPop | pop | 400 | Back.easeOut; fail panel after the object greys |
| `result_rays` | spin | loop | 14000 | one turn per 14 s |
| `result_reward_card` | flyToCollection | fly | 600 | cards fly out on claim (resourceFly) |
| `btn_primary` | pressSquash | press | 120 | scale 0.94, overshoot 1.06, 1 |
| `btn_primary` | glint | sweep | 600 | white sweep every 2.6 s |
| `btn_secondary` | pressSquash | press | 120 | scale 0.94, overshoot 1.06, 1 |

## NEEDS-ART briefs (11)

- **`star_empty`** (32x32 / 64x64, approach **GPT-image**): Same star silhouette, size and outline as star.webp, body recoloured flat dull grey-brown (#8a7a72 / #5c4f4a), no gold, no sparkle, inner hollow so it reads as an empty slot. Distinct from the lit star by value (grayscale gap at least 40 percent) and by colour. Note: Mock greys `star.webp`; code grayscale 50 percent is an acceptable fallback (no art needed). Common rules apply (magenta key, no baked text).
- **`box_open_3d`** (152x88 / 304x176, approach **CODE-3D-RENDER**): Code brief, no GPT prompt: three.js toolbox, open top, 3 round wells, same camera and rig as the screw heads, warm brown outline 3-4 percent, 512 px source, per-colour body hex. Note: Optional. First-batch item 4 of SCREW_YARD_3D_ASSETS.md; recolour by hex, not by tint.
- **`screw_head_R`** (48x48 / 96x96, approach **CODE-3D-RENDER**): Code brief: three.js, round dome with slot, tight to the game camera, light top-left, ink ring 3-4 percent. Fix proof flaws: dome inset, thread hint, metal env map. Note: Proof sprite exists (with known flaws). 96x96 at 2x. #e8452c.
- **`screw_head_U`** (48x48 / 96x96, approach **CODE-3D-RENDER**): Code brief: diamond-shaped head, same rig as screw_head_R. Note: #3a8bf0. Diamond (rotated-square) head, not a round one.
- **`screw_head_Y`** (48x48 / 96x96, approach **CODE-3D-RENDER**): Code brief: triangle head with rounded corners, same rig. Note: #ffc933. Triangle head.
- **`screw_head_G`** (48x48 / 96x96, approach **CODE-3D-RENDER**): Code brief: plus/cross head, same rig, cross inset not proud of the dome. Note: #3fbf5f. Plus-shaped head. No proof sprite yet.
- **`screw_spin_frames`** (48x48 / 96x96, approach **CODE-3D-RENDER**): Code brief: rotate Y 0-360 in 12 steps, transparent, same rig. Note: Optional: code rotation of the static head is the fallback. Needs `--frames` in tools/render-yard-3d.mjs.
- **`tool_icon_broom`** (32x32 / 64x64, approach **GPT-image**): Single chunky toy broom, bristles pointing down-left, light-wood handle, orange-yellow bristle block, glossy. Common rules apply (magenta key, no baked text).
- **`tool_icon_hammer`** (32x32 / 64x64, approach **GPT-image**): Single chunky claw hammer, steel head with a red-orange grip, head on the upper right, glossy. Common rules apply (magenta key, no baked text).
- **`tool_icon_drill`** (32x32 / 64x64, approach **GPT-image**): Single chunky cordless drill, blue body with a steel chuck, pointing right, glossy. Common rules apply (magenta key, no baked text).
- **`tool_tile_green`** (112x64 / 224x128, approach **GPT-image**): Empty glossy rounded-rectangle button tile, green (#3fbf5f), same bevel, rim and outline as btn_green. Centre flat so a 32 px icon and a 14 px label sit on it. Label is drawn in code. Note: Fallback: nine-slice of `btn_green.webp` (EXISTS, with `btn_green_pressed`). Needs no tool name or label baked in. Common rules apply (magenta key, no baked text).

### Ready-to-paste GPT-image prompt (one sheet, 4 cells)

> A 2x2 sprite sheet on a perfectly flat #FF00FF magenta background, no gradient, no shadow on the background, 4 separate glossy toy game icons, each centred in its own cell with 8 percent padding, nothing touching the cell edge: (1) a chunky toy BROOM with a long vertical silhouette, light-wood handle, yellow bristle block; (2) a chunky toy CLAW HAMMER with a T-shaped silhouette, steel head, red-orange grip; (3) a chunky toy cordless DRILL with an L-shaped silhouette, blue body, steel chuck; (4) an EMPTY unlit 5-point star, flat dull grey-brown, hollow centre. Warm dark-brown outline (not black) about 3.5 percent of the icon height, same weight on all four. Light from the top-left, thin rim light on the bottom-right edge, soft contact shadow under each icon, 3 to 4 value steps, glossy toy-metal look. No text, no letters, no numbers. Must stay readable at 70 px in grayscale.

Slice: `node tools/slice-sheet.mjs <sheet.png> --grid 2x2 --key magenta --out art-candidates/screw-yard-icons --names tool_icon_broom,tool_icon_hammer,tool_icon_drill,star_empty --kind icon`. Then critic pass (20-point rubric) before import.

### CODE-3D-RENDER order (tools/render-yard-3d.mjs)

1. Fix proof flaws: cross inset into the dome, thread hint, env map for the metal, 3-4% brown outline.
2. Add the plus and diamond and triangle head variants (the proof has round heads only: red, blue, gold) and render `screw_head_R/U/Y/G` at 96x96 (2x of 48).
3. Add `--frames 12` spin output; optional `box_open_3d`.
4. Import with `tools/import-art.mjs` behind the Object Yard art flag. Acceptance per sprite: critic rubric 18/20, readable at 70 px and grayscale, 6-10% padding.

## Open points for the Implementer

- Build behind a flag, default OFF; art keys fall back to procedural textures when a file is missing.
- 5 wells vs a tighter 4-well row is still open (SPEC section 8); `STAR_PEAK` and `BOOK_PEAK` would follow.
- Hit areas: screws need slop at 360x780 (N2). The clock is a bonus pill only.
- Fonts: Lilita One, fallback Arial Black; text is drawn in code, never baked into art.
