# ROAD MAP asset list (step 3 of the mock chain)

Asset Breaker, mission m-f522637e, task t-791f2b99, 2026-10-15. Source: `SPEC.md` and `PIXEL_CHECK.md` in this folder and the mock `art-candidates/mockups/road-map/index.html`. Machine-readable twin: `art-candidates/mockups/road-map/manifest.json` (same ids, every field). No images were generated and `src/` was not touched.

## Totals

| Status | Count | Meaning |
|---|---|---|
| EXISTS | 56 | file in `src/assets/art` or an approved (KEEP) candidate; pieces on sibling branches still have to be imported (see below) |
| NEEDS-SLICE | 0 | raw sheet exists, cut with `tools/slice-sheet.mjs` |
| NEEDS-ART | 27 | brief for ChatGPT; most are FIX items of an existing candidate |
| CODE-DRAWN | 5 | no art, listed so the Implementer builds it in code |
| **Total entries** | **88** | |

By group:

| Group | EXISTS | NEEDS-SLICE | NEEDS-ART | CODE-DRAWN |
|---|---|---|---|---|
| Road nodes | 6 | 0 | 2 | 0 |
| Current-level hero | 2 | 0 | 2 | 1 |
| Road surface kit | 1 | 0 | 7 | 0 |
| Scenery (one panel per chapter, no tiling, CRITIQUE_17) | 1 | 0 | 5 | 1 |
| Props (ch4 landmarks) | 14 | 0 | 4 | 0 |
| Gate, banners, chests | 9 | 0 | 0 | 0 |
| HUD, buttons, panels | 6 | 0 | 1 | 2 |
| Rail badges (6) | 12 | 0 | 6 | 1 |
| Mascot Bolt | 5 | 0 | 0 | 0 |

## Read this first

1. **Zero NEEDS-SLICE.** Every candidate that was generated has already been sliced (webp + png beside the sheet). No raw sheet is waiting. If a NEEDS-ART piece comes back as a sheet, slice it with `node tools/slice-sheet.mjs <sheet.png> --grid CxR --key magenta|green --out <dir> --names a,b,c [--kind icon|panel|strip]` (see the header of `tools/slice-sheet.mjs`); for icons use `--kind icon`, for ribbons and plates `--kind panel` or `strip`.
2. **Most EXISTS pieces live on sibling branches, not on this branch.** The approved candidates (badges, road kits, gate, chests, props, Bolt) are committed on the `orch/t-...` branches named in each row; only the `src/assets/art/*` rows are in this checkout. The Implementer must import them (`tools/import-art.mjs` or a branch merge) before building. Paths are `art-candidates/<batch>/...` on that branch.
3. **Status rule used:** EXISTS = KEEP verdict or already in the game. A candidate with a FIX or REDO verdict is NEEDS-ART (the file is named, the brief says what to change). Bolt batch AT has **no critic verdict yet**; it is counted EXISTS but marked UNREVIEWED and should go through the art-director rubric before import.
4. The mock draws the road with code, one gold centre line and a cool tint for "ahead". Those stay code in every case.
5. Review-page pieces: the review page v3 is not built in this checkout, so the "review page piece" column cites the critic keep-list (CRITIQUE_xx) that approved each piece. Swap in the review-page id once it exists.

Common rules for every brief: STYLE LOCK: warm dark-brown outline (not black) 3-4% of sprite height, light from top-left, thin rim light bottom-right, soft contact shadow, 3-4 value steps, glossy toy-metal look like the accepted medallion/popup kit. KEY: one sprite per grid cell on flat #FF00FF magenta; if the art contains pink, magenta, red-purple or a pink glow use flat #00FF00 green instead; never a gradient or shadow on the key; no baked text or numbers; 6-10% padding inside the cell; nothing within 3 px of the cell edge. RANK CLARITY: states/tiers in one family must differ in at least two of silhouette, size, part count, accent colour, pips, and still read apart at 70 px in grayscale.

Screen units: 8 px grid, phones 360x780 / 390x844 / 430x932, safe area top 48, bottom 32, content column C = floor(W/8)*8. All sizes below are CSS px at 1x and 2x (the 2x is the file size to ship). Z values are from SPEC section 5.

## Road nodes

| id | role | 1x / 2x | nine-slice | states | z / layer | anchor | where | status | source |
|---|---|---|---|---|---|---|---|---|---|
| `node_completed` | Done level node | 80x96 / 160x192 | - | normal (done), pressed | 50 `L50_node_<n>` | centre on path point; sprite top at y-52 (number at y-14) | On the road for every level below the current one; number 28 px on it, three stars under it | **EXISTS** | src/assets/art/node_completed.webp |
| `star_pip` | Star pip (earned/unearned) and sparkle around the hero | 16x16 / 32x32 | - | earned, unearned (code grayscale 50%) | 50 `L50_node_<n> stars, L60_sparkle` | under done node at x -28/-8/+12, y +22 (pip); sparkles 16-24 px around hero | Done nodes (3 pips) and 6 twinkles around the current hero | **EXISTS** | src/assets/art/star.webp |
| `node_locked` | Locked level node | 88x88 / 176x176 | - | locked | 50 `L50_node_<n>` | centre on path point | Ahead of the current level; number 28 px #4f5d82 | **EXISTS** | src/assets/art/node_locked.webp |
| `node_locked_cool` | Locked node, cool blue-grey variant | 88x88 / 176x176 | - | locked | 50 `L50_node_<n>` | same as node_locked | Replaces the hue-rotated node_locked | **NEEDS-ART** | see brief |
| `node_boss` | Boss level node (arena medallion) | 96x104 / 192x208 | - | normal, locked (code tint) | 50 `L50_node_<n> / L60_node_boss` | centre on path point; as hero: y+24 | Level 40; locked-dimmed when ahead, under the boss figure when current | **EXISTS** | src/assets/art/node_boss.webp |
| `node_boss_locked_cool` | Locked boss node, cool variant | 96x104 / 192x208 | - | locked | 50 `L50_node_40` | same as node_boss | Boss level while locked | **NEEDS-ART** | see brief |
| `ribbon_hard` | HARD ribbon (purple) | 80x40 / 160x80 | - | normal, locked (code saturate 50%) | 50 `L50_ribbon_<n> / L60_difficulty_ribbon` | under node at y+32 (done) / y+20 (locked); on hero platform front-right 96x32 rotated 6 degrees | Hard levels (label HARD 14 px white, ink outline, drawn in code) | **EXISTS** | src/assets/art/kit3_ribbon_purple.webp |
| `ribbon_mega` | MEGA hard ribbon (red) | 80x40 / 160x80 | - | normal, locked (code) | 50 `L50_ribbon_<n>` | same as ribbon_hard | Mega hard levels (label MEGA) | **EXISTS** | src/assets/art/kit3_ribbon_red.webp |

## Current-level hero

| id | role | 1x / 2x | nine-slice | states | z / layer | anchor | where | status | source |
|---|---|---|---|---|---|---|---|---|---|
| `hero_cannon_4` | Player avatar on the current normal/hard node | 96x96 / 192x192 | - | normal | 60 `L60_avatar_cannon` | bottom-centre on platform; sprite at x-48, y-64 | Current node when it is not a boss | **EXISTS** | src/assets/art/cannon_4.webp |
| `boss_junkzilla_intact` | Boss figure when the boss is the current level | 144x144 / 288x288 | - | intact | 60 `L60_boss_figure` | bottom-centre on the boss platform; sprite x-72, y-136 | Level 40 when current (FIGHT BOSS) | **EXISTS** | src/assets/art/boss_junkzilla_intact.webp |
| `avatar_platform_normal` | Gold hero platform (normal) | 176x56 / 352x112 | - | normal | 60 `L60_platform` | centre, y+24 under the hero | Under the current node | **NEEDS-ART** | see brief |
| `avatar_platform_boss` | Gold hero platform (boss arena) | 224x72 / 448x144 | - | normal | 60 `L60_platform` | centre, y+16 | Under the boss figure | **NEEDS-ART** | see brief |
| `hero_glow_ring_you` | Glow, pulsing ring, number plate, YOU tag | 64x32 / 128x64 | - | normal | 60 `L60_glow, L60_ring, L60_number_plate, L60_you_tag` | YOU tag y-92 (boss y-176); plate y+56; glow 272, ring 224x88 | Around the current hero | **CODE-DRAWN** | code |

## Road surface kit

| id | role | 1x / 2x | nine-slice | states | z / layer | anchor | where | status | source |
|---|---|---|---|---|---|---|---|---|---|
| `road_kit_ch4` | Road kit, chapter 4 (ARCADE), 12 pieces | 70x70 / 140x140 | - | normal (travelled gold overlay and ahead-cool tint are code) | 20 `L20_road_surface` | cell centre on the path tile centre; 90 degree rotations in code | The road itself under the nodes, 12 pieces per chapter, path tiles snapped to the cell grid | **NEEDS-ART** FIX (CRITIQUE_70: 4 KEEP / 8 FIX) | see brief |
| `road_kit_ch5_teaser` | Road kit, chapter 5 (MUSIC ATTIC), shown tinted above the gate | 70x70 / 140x140 | - | normal (travelled gold overlay and ahead-cool tint are code) | 20 `L20_road_surface` | cell centre on the path tile centre; 90 degree rotations in code | The road itself under the nodes, 12 pieces per chapter, path tiles snapped to the cell grid | **NEEDS-ART** FIX (CRITIQUE_70: 0 KEEP / 12 FIX) | see brief |
| `road_kit_ch1` | Road kit, ch1, 12 pieces (other chapters, same screen when the road scrolls there) | 70x70 / 140x140 | - | normal (travelled gold overlay and ahead-cool tint are code) | 20 `L20_road_surface` | cell centre on the path tile centre; 90 degree rotations in code | The road itself under the nodes, 12 pieces per chapter, path tiles snapped to the cell grid | **NEEDS-ART** FIX (6 KEEP / 6 FIX: curves, T, cross) | see brief |
| `road_kit_ch2` | Road kit, ch2, 12 pieces (other chapters, same screen when the road scrolls there) | 70x70 / 140x140 | - | normal (travelled gold overlay and ahead-cool tint are code) | 20 `L20_road_surface` | cell centre on the path tile centre; 90 degree rotations in code | The road itself under the nodes, 12 pieces per chapter, path tiles snapped to the cell grid | **NEEDS-ART** FIX (6 KEEP / 6 FIX) | see brief |
| `road_kit_ch3` | Road kit, ch3, 12 pieces (other chapters, same screen when the road scrolls there) | 70x70 / 140x140 | - | normal (travelled gold overlay and ahead-cool tint are code) | 20 `L20_road_surface` | cell centre on the path tile centre; 90 degree rotations in code | The road itself under the nodes, 12 pieces per chapter, path tiles snapped to the cell grid | **EXISTS** KEEP (12 of 12) | art-candidates/road-surface-kit-b3/ch3/road_ch3_<piece>.webp @ orch/t-bf956f7c-road-surface-kit-batch-3-rebuild |
| `road_kit_ch6` | Road kit, ch6, 12 pieces (other chapters, same screen when the road scrolls there) | 70x70 / 140x140 | - | normal (travelled gold overlay and ahead-cool tint are code) | 20 `L20_road_surface` | cell centre on the path tile centre; 90 degree rotations in code | The road itself under the nodes, 12 pieces per chapter, path tiles snapped to the cell grid | **NEEDS-ART** FIX (6 KEEP / 4 FIX / 2 REDO: T and cross) | see brief |
| `road_kit_ch7` | Road kit, ch7, 12 pieces (other chapters, same screen when the road scrolls there) | 70x70 / 140x140 | - | normal (travelled gold overlay and ahead-cool tint are code) | 20 `L20_road_surface` | cell centre on the path tile centre; 90 degree rotations in code | The road itself under the nodes, 12 pieces per chapter, path tiles snapped to the cell grid | **NEEDS-ART** KEEP except straights (10 KEEP / 2 FIX) | see brief |
| `road_kit_ch8` | Road kit, ch8, 12 pieces (other chapters, same screen when the road scrolls there) | 70x70 / 140x140 | - | normal (travelled gold overlay and ahead-cool tint are code) | 20 `L20_road_surface` | cell centre on the path tile centre; 90 degree rotations in code | The road itself under the nodes, 12 pieces per chapter, path tiles snapped to the cell grid | **NEEDS-ART** FIX (6 KEEP / 6 FIX) | see brief |

## Scenery (one panel per chapter, no tiling, CRITIQUE_17)

| id | role | 1x / 2x | nine-slice | states | z / layer | anchor | where | status | source |
|---|---|---|---|---|---|---|---|---|---|
| `scenery_ch4_gate` | Chapter 4 background, upper part (gate end) | 390x844 / 780x1688 | - | normal | 0 `L00_scenery_ch4` | world layer, top-left at x0; scrolls with the road (parallax 0.6 optional) | Behind the road around levels 36-40 and the gate | **EXISTS** KEEP (CRITIQUE_64, join 7.0) | art-candidates/road-art-4/road_panel_ch4_gate.webp @ orch/t-d179438f-road-art-4-chapters-4-and-5-pane |
| `scenery_ch4_entrance` | Chapter 4 background, entrance end | 390x844 / 780x1688 | - | normal | 0 `L00_scenery_ch4` | world layer | Behind levels 30-33 | **NEEDS-ART** FIX (CRITIQUE_64) | see brief |
| `scenery_ch4_body` | Chapter 4 background, middle (levels 34-39) | 390x1200 / 780x2400 | - | normal | 0 `L00_scenery_ch4` | world layer, between entrance and gate panels | Fills the gap between the two delivered panels; mock uses a violet gradient | **NEEDS-ART** | see brief |
| `scenery_ch5_gate` | Chapter 5 teaser background above the gate (tinted grayscale 70% in mock) | 390x844 / 780x1688 | - | normal, locked (code tint + fog) | 0 `L00_scenery_ch5_teaser` | world layer above the gate | Above the closed gate | **NEEDS-ART** FIX (CRITIQUE_64, join 11.8) | see brief |
| `scenery_ch5_entrance` | Chapter 5 entrance background | 390x844 / 780x1688 | - | normal | 0 `L00_scenery_ch5_teaser` | world layer | Under the gate on the next chapter | **NEEDS-ART** FIX (CRITIQUE_64, join 11.8) | see brief |
| `scenery_ch5_card` | Entrance popup picture (CHAPTER 5 MUSIC ATTIC) | 272x120 / 544x240 | - | normal | 95 `L95_panel_scene` | inside popup, x24, y136, 16 px radius clip | Chapter entrance panel scene card | **NEEDS-ART** | see brief |
| `skyline_clouds_fog` | Skyline silhouette, drifting clouds, fog banks above the gate, bottom scrim | 390x96 / 780x192 | - | normal | 70 `L00_skyline, L10_cloud, L70_fog, L70_fog_puffs, L70_bottom_scrim` | full width; fog top at gate y-40 | Atmosphere layers | **CODE-DRAWN** | code |

## Props (ch4 landmarks)

| id | role | 1x / 2x | nine-slice | states | z / layer | anchor | where | status | source |
|---|---|---|---|---|---|---|---|---|---|
| `road_landmark_ch4_a_1` | Chapter 4 side prop (arcade cabinet / blocks / instrument) | 80x80 / 160x160 | - | normal | 10 `L10_prop_<n>` | bottom-centre, placed 8 px grid at the road shoulder, outside x 72 / C-72 above y 432 | Beside the road in chapter 4 | **EXISTS** KEEP (CRITIQUE_65) | art-candidates/road-art-4c/road_landmark_ch4_a_1.png (webp beside it) @ orch/t-e82cdeb2-critic-pass-on-road-art-4c-and-f |
| `road_landmark_ch4_a_2` | Chapter 4 side prop (arcade cabinet / blocks / instrument) | 80x80 / 160x160 | - | normal | 10 `L10_prop_<n>` | bottom-centre, placed 8 px grid at the road shoulder, outside x 72 / C-72 above y 432 | Beside the road in chapter 4 | **EXISTS** KEEP (CRITIQUE_65) | art-candidates/road-art-4c/road_landmark_ch4_a_2.png (webp beside it) @ orch/t-e82cdeb2-critic-pass-on-road-art-4c-and-f |
| `road_landmark_ch4_a_3` | Chapter 4 side prop (arcade cabinet / blocks / instrument) | 80x80 / 160x160 | - | normal | 10 `L10_prop_<n>` | bottom-centre, placed 8 px grid at the road shoulder, outside x 72 / C-72 above y 432 | Beside the road in chapter 4 | **EXISTS** KEEP (CRITIQUE_65) | art-candidates/road-art-4c/road_landmark_ch4_a_3.png (webp beside it) @ orch/t-e82cdeb2-critic-pass-on-road-art-4c-and-f |
| `road_landmark_ch4_a_4` | Chapter 4 side prop (arcade cabinet / blocks / instrument) | 80x80 / 160x160 | - | normal | 10 `L10_prop_<n>` | bottom-centre, placed 8 px grid at the road shoulder, outside x 72 / C-72 above y 432 | Beside the road in chapter 4 | **EXISTS** KEEP (CRITIQUE_65) | art-candidates/road-art-4c/road_landmark_ch4_a_4.png (webp beside it) @ orch/t-e82cdeb2-critic-pass-on-road-art-4c-and-f |
| `road_landmark_ch4_a_5` | Chapter 4 side prop (arcade cabinet / blocks / instrument) | 80x80 / 160x160 | - | normal | 10 `L10_prop_<n>` | bottom-centre, placed 8 px grid at the road shoulder, outside x 72 / C-72 above y 432 | Beside the road in chapter 4 | **EXISTS** KEEP (CRITIQUE_65) | art-candidates/road-art-4c/road_landmark_ch4_a_5.png (webp beside it) @ orch/t-e82cdeb2-critic-pass-on-road-art-4c-and-f |
| `road_landmark_ch4_a_6` | Chapter 4 side prop (arcade cabinet / blocks / instrument) | 80x80 / 160x160 | - | normal | 10 `L10_prop_<n>` | bottom-centre, placed 8 px grid at the road shoulder, outside x 72 / C-72 above y 432 | Beside the road in chapter 4 | **EXISTS** KEEP (CRITIQUE_65) | art-candidates/road-art-4c/road_landmark_ch4_a_6.png (webp beside it) @ orch/t-e82cdeb2-critic-pass-on-road-art-4c-and-f |
| `road_landmark_ch4_b_1` | Chapter 4 side prop (arcade cabinet / blocks / instrument) | 80x80 / 160x160 | - | normal | 10 `L10_prop_<n>` | bottom-centre, placed 8 px grid at the road shoulder, outside x 72 / C-72 above y 432 | Beside the road in chapter 4 | **EXISTS** KEEP (CRITIQUE_65) | art-candidates/road-art-4c/road_landmark_ch4_b_1.png (webp beside it) @ orch/t-e82cdeb2-critic-pass-on-road-art-4c-and-f |
| `road_landmark_ch4_b_3` | Chapter 4 side prop (arcade cabinet / blocks / instrument) | 80x80 / 160x160 | - | normal | 10 `L10_prop_<n>` | bottom-centre, placed 8 px grid at the road shoulder, outside x 72 / C-72 above y 432 | Beside the road in chapter 4 | **EXISTS** KEEP (CRITIQUE_65) | art-candidates/road-art-4c/road_landmark_ch4_b_3.png (webp beside it) @ orch/t-e82cdeb2-critic-pass-on-road-art-4c-and-f |
| `road_landmark_ch4_b_5` | Chapter 4 side prop (arcade cabinet / blocks / instrument) | 80x80 / 160x160 | - | normal | 10 `L10_prop_<n>` | bottom-centre, placed 8 px grid at the road shoulder, outside x 72 / C-72 above y 432 | Beside the road in chapter 4 | **EXISTS** KEEP (CRITIQUE_65) | art-candidates/road-art-4c/road_landmark_ch4_b_5.png (webp beside it) @ orch/t-e82cdeb2-critic-pass-on-road-art-4c-and-f |
| `road_landmark_ch4_c_1` | Chapter 4 side prop (arcade cabinet / blocks / instrument) | 80x80 / 160x160 | - | normal | 10 `L10_prop_<n>` | bottom-centre, placed 8 px grid at the road shoulder, outside x 72 / C-72 above y 432 | Beside the road in chapter 4 | **EXISTS** KEEP (CRITIQUE_65) | art-candidates/road-art-4c/road_landmark_ch4_c_1.png (webp beside it) @ orch/t-e82cdeb2-critic-pass-on-road-art-4c-and-f |
| `road_landmark_ch4_c_2` | Chapter 4 side prop (arcade cabinet / blocks / instrument) | 80x80 / 160x160 | - | normal | 10 `L10_prop_<n>` | bottom-centre, placed 8 px grid at the road shoulder, outside x 72 / C-72 above y 432 | Beside the road in chapter 4 | **EXISTS** KEEP (CRITIQUE_65) | art-candidates/road-art-4c/road_landmark_ch4_c_2.png (webp beside it) @ orch/t-e82cdeb2-critic-pass-on-road-art-4c-and-f |
| `road_landmark_ch4_c_3` | Chapter 4 side prop (arcade cabinet / blocks / instrument) | 80x80 / 160x160 | - | normal | 10 `L10_prop_<n>` | bottom-centre, placed 8 px grid at the road shoulder, outside x 72 / C-72 above y 432 | Beside the road in chapter 4 | **EXISTS** KEEP (CRITIQUE_65) | art-candidates/road-art-4c/road_landmark_ch4_c_3.png (webp beside it) @ orch/t-e82cdeb2-critic-pass-on-road-art-4c-and-f |
| `road_landmark_ch4_c_4` | Chapter 4 side prop (arcade cabinet / blocks / instrument) | 80x80 / 160x160 | - | normal | 10 `L10_prop_<n>` | bottom-centre, placed 8 px grid at the road shoulder, outside x 72 / C-72 above y 432 | Beside the road in chapter 4 | **EXISTS** KEEP (CRITIQUE_65) | art-candidates/road-art-4c/road_landmark_ch4_c_4.png (webp beside it) @ orch/t-e82cdeb2-critic-pass-on-road-art-4c-and-f |
| `road_landmark_ch4_c_5` | Chapter 4 side prop (arcade cabinet / blocks / instrument) | 80x80 / 160x160 | - | normal | 10 `L10_prop_<n>` | bottom-centre, placed 8 px grid at the road shoulder, outside x 72 / C-72 above y 432 | Beside the road in chapter 4 | **EXISTS** KEEP (CRITIQUE_65) | art-candidates/road-art-4c/road_landmark_ch4_c_5.png (webp beside it) @ orch/t-e82cdeb2-critic-pass-on-road-art-4c-and-f |
| `road_landmark_ch4_b_2` | Chapter 4 side prop | 80x80 / 160x160 | - | normal | 10 `L10_prop_<n>` | bottom-centre at the road shoulder | Beside the road in chapter 4 | **NEEDS-ART** FIX (CRITIQUE_65) | see brief |
| `road_landmark_ch4_b_4` | Chapter 4 side prop | 80x80 / 160x160 | - | normal | 10 `L10_prop_<n>` | bottom-centre at the road shoulder | Beside the road in chapter 4 | **NEEDS-ART** FIX (CRITIQUE_65) | see brief |
| `road_landmark_ch4_b_6` | Chapter 4 side prop | 80x80 / 160x160 | - | normal | 10 `L10_prop_<n>` | bottom-centre at the road shoulder | Beside the road in chapter 4 | **NEEDS-ART** FIX (CRITIQUE_65) | see brief |
| `road_landmark_ch4_c_6` | Chapter 4 side prop | 80x80 / 160x160 | - | normal | 10 `L10_prop_<n>` | bottom-centre at the road shoulder | Beside the road in chapter 4 | **NEEDS-ART** FIX (CRITIQUE_65) | see brief |

## Gate, banners, chests

| id | role | 1x / 2x | nine-slice | states | z / layer | anchor | where | status | source |
|---|---|---|---|---|---|---|---|---|---|
| `road_gate_closed` | Closed chapter gate arch | 224x128 / 448x256 | - | closed, open (see road_gate_open) | 40 `L40_gate_arch` | centre-bottom on the path, 352 px gap after the boss | Between the boss (L40) and the next chapter | **EXISTS** KEEP (CRITIQUE_36) | art-candidates/road-art-1/s1/road_gate_closed.webp @ orch/t-b0e816ef-road-art-1-gates-banners-chests |
| `road_gate_open` | Open chapter gate arch | 224x128 / 448x256 | - | open | 40 `L40_gate_arch` | same as closed | After the boss is cleared and the star target met | **EXISTS** KEEP (CRITIQUE_36) | art-candidates/road-art-1/s1/road_gate_open.webp @ orch/t-b0e816ef-road-art-1-gates-banners-chests |
| `road_gate_lock` | Padlock on the closed gate | 48x48 / 96x96 | - | locked | 41 `L40_gate_plate` | centre of the gate door | On the closed gate | **EXISTS** KEEP (CRITIQUE_36) | art-candidates/road-art-1/s1/road_gate_lock.webp @ orch/t-b0e816ef-road-art-1-gates-banners-chests |
| `gate_need_plate` | NEED 20 star plate below the gate | 144x32 / 288x64 | kit3_panel_card.webp inset 30 | normal | 40 `L40_gate_plate` | centre, under the gate | Below the closed gate | **EXISTS** | src/assets/art/kit3_panel_card.webp |
| `banner_entry` | CH 4 entry banner (purple) | 240x112 / 480x224 | - | normal | 40 `L40_banner_entry` | centre on path at the chapter start | Above level 31 | **EXISTS** | src/assets/art/kit3_ribbon_purple.webp |
| `banner_next` | Next chapter banner (blue) | 240x112 / 480x224 | - | normal, locked (code tint) | 40 `L40_banner_next` | centre above the gate | Chapter 5 teaser | **EXISTS** | src/assets/art/kit3_ribbon_blue.webp |
| `road_chest_wood` | Milestone chest on the road shoulder (wood) | 64x64 / 128x128 | - | closed, open, glow (ready, art + code pulse) | 55 `L55_chest_<n>` | centre, 88 px left or right of the path midpoint; label pill 64x16 below | After levels 33 and 36 (mock uses chest_closed / chest_open) | **EXISTS** KEEP (CRITIQUE_38, closed/open/ready) | art-candidates/road-art-3/sB/road_chest_wood_closed.webp, sC/road_chest_wood_open.webp, sD/road_chest_wood_ready.webp @ orch/t-67dcb282-road-art-3-fixes-for-gates-chest |
| `road_chest_iron` | Milestone chest on the road shoulder (iron) | 64x64 / 128x128 | - | closed, open, glow (ready, art + code pulse) | 55 `L55_chest_<n>` | centre, 88 px left or right of the path midpoint; label pill 64x16 below | After levels 33 and 36 (mock uses chest_closed / chest_open) | **EXISTS** KEEP (CRITIQUE_38, closed/open/ready) | art-candidates/road-art-3/sB/road_chest_iron_closed.webp, sC/road_chest_iron_open.webp, sD/road_chest_iron_ready.webp @ orch/t-67dcb282-road-art-3-fixes-for-gates-chest |
| `road_chest_gold` | Milestone chest on the road shoulder (gold) | 64x64 / 128x128 | - | closed, open, glow (ready, art + code pulse) | 55 `L55_chest_<n>` | centre, 88 px left or right of the path midpoint; label pill 64x16 below | After levels 33 and 36 (mock uses chest_closed / chest_open) | **EXISTS** KEEP (CRITIQUE_38, closed/open/ready) | art-candidates/road-art-3/sB/road_chest_gold_closed.webp, sC/road_chest_gold_open.webp, sD/road_chest_gold_ready.webp @ orch/t-67dcb282-road-art-3-fixes-for-gates-chest |

## HUD, buttons, panels

| id | role | 1x / 2x | nine-slice | states | z / layer | anchor | where | status | source |
|---|---|---|---|---|---|---|---|---|---|
| `wallet_pill` | Bolts and gems pill (2x) plus icon | 128x48 / 256x96 | kit3_panel_well.webp inset 30 | normal, pressed | 82 `L82_wallet_hud` | x X0+16 and X0+152, y 56 | Top HUD | **EXISTS** | src/assets/art/kit3_panel_well.webp + icon_bolt.webp + icon_gem.webp |
| `icon_settings_gear` | Settings gear icon in the 48x48 button | 32x32 / 64x64 | - | normal, pressed | 82 `L82_wallet_hud` | centre of button at X0+C-64, y 56 | Top right HUD | **NEEDS-ART** | see brief |
| `chapter_plate` | Chapter title plate with progress and chest | 358x56 / 716x112 | kit3_panel_card.webp inset 30 | normal | 80 `L80_chapter_plate` | x X0+16, y 112 | Under the wallet row | **EXISTS** | src/assets/art/kit3_panel_card.webp + chest_closed.webp (48 px) + hp_frame/hp_fill (progress) |
| `play_button` | PLAY / FIGHT BOSS button | 272x64 / 544x128 | btn_green.webp inset 24 | normal (btn_green), pressed (btn_green_pressed), boss (btn_red), locked (code gray) | 86 `L86_play_button` | x X0+96, y HB-184 | Bottom row | **EXISTS** | src/assets/art/btn_green.webp, btn_green_pressed.webp, btn_red.webp, btn_red_pressed.webp |
| `chapter_chip` | Chapter chip: progress ring with chest | 64x64 / 128x128 | - | normal, ready (chapter cleared, chest wiggles) | 86 `L86_chapter_chip` | x X0+16, y HB-184 | Bottom row left of PLAY | **EXISTS** | src/assets/art/chest_closed.webp (+ code ring) |
| `back_to_me_pill` | BACK TO ME pill | 176x32 / 352x64 | - | normal, pressed | 87 `L87_back_to_me` | centre, y HB-224; hit area 48 high | Appears after scrolling half a screen away | **CODE-DRAWN** | code |
| `nav_bar` | Bottom nav bar with 4 text tabs | 368x72 / 736x144 | - | normal, tab active (gold) | 88 `L88_nav_bar` | x X0+8, y HB-104; tabs 80/88/96 wide | Bottom | **CODE-DRAWN** | code |
| `locked_toast_and_tooltip` | Locked toast and badge tooltip | 240x64 / 480x128 | ui_bubble.webp inset 24 | normal | 62 `L62_locked_toast, L92_badge_tooltip` | toast above the back pill; tooltip between the rails | On tap of a locked node / long press on a badge | **EXISTS** | src/assets/art/ui_bubble.webp |
| `chapter_panel` | Chapter entrance popup frame, scene frame, reward cards, ribbon, LET'S GO | 340x480 / 680x960 | kit3_panel_popup.webp inset 44 | normal | 95 `L95_chapter_panel, _panel_ribbon, _reward_row, _go_button` | centred, y = round8(H/2 - 232) | Popup on entering a new chapter | **EXISTS** | src/assets/art/kit3_panel_popup.webp, kit3_panel_well.webp, kit3_panel_card.webp, kit3_ribbon_purple.webp, btn_green.webp, star.webp |

## Rail badges (6)

| id | role | 1x / 2x | nine-slice | states | z / layer | anchor | where | status | source |
|---|---|---|---|---|---|---|---|---|---|
| `badge_base_brass` | Medallion coin, brass family (idle and locked) | 56x56 / 112x112 | - | normal, pressed, locked, glow (ready) | 84 `L84_badge_<name>` | badge box top-left; rails at X0+8 (left) / X0+C-72 (right), y 176 + 88 i | Left rail and right rail (3 per side) | **EXISTS** KEEP (CRITIQUE_69) | art-candidates/map-badge-1/bases/badge_base_brass.png + badge_base_brass_locked.png @ orch/t-7a7ea2eb-map-badge-art-batch-1-retry-the |
| `badge_base_brass_ready` | Medallion coin, brass family, ready (glow) state | 56x56 / 112x112 | - | glow (ready) | 84 `L84_badge_<name>` | badge box top-left; rails at X0+8 (left) / X0+C-72 (right), y 176 + 88 i | Left rail and right rail (3 per side) | **NEEDS-ART** FIX (CRITIQUE_69) | see brief |
| `badge_base_copper` | Medallion coin, copper family (idle and locked) | 56x56 / 112x112 | - | normal, pressed, locked, glow (ready) | 84 `L84_badge_<name>` | badge box top-left; rails at X0+8 (left) / X0+C-72 (right), y 176 + 88 i | Left rail and right rail (3 per side) | **EXISTS** KEEP (CRITIQUE_69) | art-candidates/map-badge-1/bases/badge_base_copper.png + badge_base_copper_locked.png @ orch/t-7a7ea2eb-map-badge-art-batch-1-retry-the |
| `badge_base_copper_ready` | Medallion coin, copper family, ready (glow) state | 56x56 / 112x112 | - | glow (ready) | 84 `L84_badge_<name>` | badge box top-left; rails at X0+8 (left) / X0+C-72 (right), y 176 + 88 i | Left rail and right rail (3 per side) | **NEEDS-ART** FIX (CRITIQUE_69) | see brief |
| `badge_base_teal` | Medallion coin, teal family (idle and locked) | 56x56 / 112x112 | - | normal, pressed, locked, glow (ready) | 84 `L84_badge_<name>` | badge box top-left; rails at X0+8 (left) / X0+C-72 (right), y 176 + 88 i | Left rail and right rail (3 per side) | **EXISTS** KEEP (CRITIQUE_69) | art-candidates/map-badge-1/bases/badge_base_teal.png + badge_base_teal_locked.png @ orch/t-7a7ea2eb-map-badge-art-batch-1-retry-the |
| `badge_base_teal_ready` | Medallion coin, teal family, ready (glow) state | 56x56 / 112x112 | - | glow (ready) | 84 `L84_badge_<name>` | badge box top-left; rails at X0+8 (left) / X0+C-72 (right), y 176 + 88 i | Left rail and right rail (3 per side) | **NEEDS-ART** FIX (CRITIQUE_69) | see brief |
| `badge_glyph_daily` | Badge face icon for DAILY | 32x32 / 64x64 | - | normal, ready (code wiggle), opened | 84 `L84_badge_daily` | icon box 32x32 at (12, 12), or (12, 4) when a chip is present | DAILY badge | **EXISTS** KEEP (CRITIQUE_69) | art-candidates/map-badge-1/glyphs/badge_glyph_daily.png + badge_glyph_daily_open.png @ orch/t-7a7ea2eb-map-badge-art-batch-1-retry-the |
| `badge_glyph_quests` | Badge face icon for QUESTS | 32x32 / 64x64 | - | normal | 84 `L84_badge_quests` | icon box 32x32 at (12, 12), or (12, 4) when a chip is present | QUESTS badge | **EXISTS** KEEP (CRITIQUE_69) | art-candidates/map-badge-1/glyphs/badge_glyph_quests.png @ orch/t-7a7ea2eb-map-badge-art-batch-1-retry-the |
| `badge_glyph_album` | Badge face icon for COLLECT | 32x32 / 64x64 | - | normal | 84 `L84_badge_collect` | icon box 32x32 at (12, 12), or (12, 4) when a chip is present | COLLECT badge | **EXISTS** KEEP (CRITIQUE_69) | art-candidates/map-badge-1/glyphs/badge_glyph_album.png @ orch/t-7a7ea2eb-map-badge-art-batch-1-retry-the |
| `badge_glyph_offers` | Badge face icon for OFFER | 32x32 / 64x64 | - | normal | 84 `L84_badge_offer` | icon box 32x32 at (12, 12), or (12, 4) when a chip is present | OFFER badge | **EXISTS** KEEP (CRITIQUE_69); weak on copper, crate is semantically weak, coin or price tag would read better | art-candidates/map-badge-1/glyphs/badge_glyph_offers.png @ orch/t-7a7ea2eb-map-badge-art-batch-1-retry-the |
| `badge_glyph_season` | Badge face icon for SEASON | 32x32 / 64x64 | - | normal | 84 `L84_badge_season` | icon box 32x32 at (12, 12), or (12, 4) when a chip is present | SEASON badge | **EXISTS** KEEP (CRITIQUE_69) | art-candidates/map-badge-1/glyphs/badge_glyph_season.png @ orch/t-7a7ea2eb-map-badge-art-batch-1-retry-the |
| `badge_glyph_events` | Badge face icon for EVENT | 32x32 / 64x64 | - | normal | 84 `L84_badge_event` | icon box 32x32 at (12, 4) (chip present) | EVENT badge, right rail | **NEEDS-ART** FIX (CRITIQUE_69) | see brief |
| `badge_ribbon_timer` | Timer chip (cream, urgent red, expired grey) 48x16 | 48x16 / 96x32 | - | normal, urgent, expired | 84 `L84_badge_<name> chip` | badge box (8, 36)-(56, 52): chip centred at y 40; label at y 64 | EVENT (2D 4H) and OFFER (05:12) badges | **EXISTS** KEEP (CRITIQUE_69) | art-candidates/map-badge-1/parts/badge_ribbon_timer.png, _urgent, _expired @ orch/t-7a7ea2eb-map-badge-art-batch-1-retry-the |
| `badge_ribbon_count` | Count chip (2/5, 7/30) 48x16 | 48x16 / 96x32 | - | normal | 84 `L84_badge_<name> chip` | same as timer chip | QUESTS and SEASON badges | **EXISTS** KEEP (CRITIQUE_69) | art-candidates/map-badge-1/parts/badge_ribbon_count.png @ orch/t-7a7ea2eb-map-badge-art-batch-1-retry-the |
| `badge_dot` | Red notification dot (and green variant) | 16x16 / 32x32 | - | red, green | 84 `L84_badge_<name> dot` | coin's top-right (x 44, y 0) | DAILY, COLLECT (red); green when claimed | **EXISTS** KEEP (CRITIQUE_69) | art-candidates/map-badge-1/parts/badge_dot.png, badge_dot_green.png @ orch/t-7a7ea2eb-map-badge-art-batch-1-retry-the |
| `badge_new_lock` | NEW tag and padlock overlay | 32x20 / 64x40 | - | new, lock | 84 `L84_badge_<name> / L88 nav NEW tag` | coin corner; padlock centred on the coin when locked | Locked badges, NEW label on a tab or badge | **EXISTS** KEEP (CRITIQUE_69) | art-candidates/map-badge-1/parts/badge_new.png, badge_lock.png @ orch/t-7a7ea2eb-map-badge-art-batch-1-retry-the |
| `badge_count_bubble` | Round count bubble (alternative to the chip) | 20x20 / 40x40 | - | normal | 84 `L84_badge_<name> count` | coin's top-right | Optional count on any badge | **NEEDS-ART** FIX (CRITIQUE_69) | see brief |
| `badge_tag_percent` | -50% sale tag | 40x24 / 80x48 | - | normal | 84 `L84_badge_offer tag` | coin top-right, rotated 8 degrees | OFFER badge | **NEEDS-ART** | see brief |
| `badge_label_pill` | Badge label pill 64x16 (ink, white 12 px text) | 64x16 / 128x32 | - | normal | 84 `L84_badge_<name> label` | badge box (0, 64) | Under each badge | **CODE-DRAWN** | code |

## Mascot Bolt

| id | role | 1x / 2x | nine-slice | states | z / layer | anchor | where | status | source |
|---|---|---|---|---|---|---|---|---|---|
| `bolt_idle` | Bolt: idle beside the hero (L65) | 64x72 / 128x144 | - | normal | 65 `L65_bolt_mascot` | bottom-centre, 56 px beside the hero platform | Beside the current hero / chapter panel | **EXISTS** UNREVIEWED (batch AT, no critic pass found in this checkout) | art-candidates/batch-at/at1/bolt_idle.png (+ .webp) @ orch/t-3d9a6523-backlog-at-mascot-bolt-and-tutor |
| `bolt_happy` | Bolt: happy hop (loop on the road, cheer on reward) | 64x72 / 128x144 | - | normal | 65 `L65_bolt_mascot` | same as idle | Beside the current hero / chapter panel | **EXISTS** UNREVIEWED (batch AT, no critic pass found in this checkout) | art-candidates/batch-at/at1/bolt_happy.png (+ .webp) @ orch/t-3d9a6523-backlog-at-mascot-bolt-and-tutor |
| `bolt_point` | Bolt: point at the next node | 64x72 / 128x144 | - | normal | 65 `L65_bolt_mascot` | same as idle, hand toward the next node | Beside the current hero / chapter panel | **EXISTS** UNREVIEWED (batch AT, no critic pass found in this checkout) | art-candidates/batch-at/at1/bolt_point.png (+ .webp) @ orch/t-3d9a6523-backlog-at-mascot-bolt-and-tutor |
| `bolt_peek_side` | Bolt: peek in from the side of the entrance panel | 64x72 / 128x144 | - | normal | 96 `L96_bolt_peek` | panel edge, half visible | Beside the current hero / chapter panel | **EXISTS** UNREVIEWED (batch AT, no critic pass found in this checkout) | art-candidates/batch-at/at1/bolt_peek_side.png (+ .webp) @ orch/t-3d9a6523-backlog-at-mascot-bolt-and-tutor |
| `bolt_worried` | Bolt: worried at locked nodes | 64x72 / 128x144 | - | normal | 65 `L65_bolt_mascot` | same as idle | Beside the current hero / chapter panel | **EXISTS** UNREVIEWED (batch AT, no critic pass found in this checkout) | art-candidates/batch-at/at1/bolt_worried.png (+ .webp) @ orch/t-3d9a6523-backlog-at-mascot-bolt-and-tutor |

## Animation notes (all visual only, honour reduced motion, never pause the simulation)

| id | animation (name, duration, easing) |
|---|---|
| `node_completed` | popIn 350ms Back.easeOut; pressSquash 120ms Quad.easeOut; unlockPop 350ms Back.easeOut |
| `star_pip` | starFlyIn 450ms Cubic.easeOut; twinkle 1400ms Sine.easeInOut |
| `node_locked` | lockedShake 300ms Sine.easeInOut |
| `node_boss` | popIn 350ms Back.easeOut; bossBreath 1800ms Sine.easeInOut |
| `ribbon_hard` | popIn 350ms Back.easeOut |
| `ribbon_mega` | popIn 350ms Back.easeOut |
| `hero_cannon_4` | heroBob 1200ms Sine.easeInOut |
| `boss_junkzilla_intact` | heroBob 1200ms Sine.easeInOut |
| `avatar_platform_normal` | platformGlow 1600ms Sine.easeInOut |
| `hero_glow_ring_you` | glowPulse 1600ms Sine.easeInOut; ringPulse 1600ms Quad.easeOut; youBob 1200ms Sine.easeInOut |
| `road_kit_ch4` | goldDraw 600ms Quad.easeOut |
| `road_kit_ch5_teaser` | goldDraw 600ms Quad.easeOut |
| `road_kit_ch1` | goldDraw 600ms Quad.easeOut |
| `road_kit_ch2` | goldDraw 600ms Quad.easeOut |
| `road_kit_ch3` | goldDraw 600ms Quad.easeOut |
| `road_kit_ch6` | goldDraw 600ms Quad.easeOut |
| `road_kit_ch7` | goldDraw 600ms Quad.easeOut |
| `road_kit_ch8` | goldDraw 600ms Quad.easeOut |
| `scenery_ch5_card` | cardKenBurns 6000ms Sine.easeInOut |
| `skyline_clouds_fog` | cloudDrift 38000ms Linear |
| `road_gate_closed` | gateShake 350ms Sine.easeInOut |
| `road_gate_open` | gateOpen 500ms Back.easeOut |
| `road_gate_lock` | lockJiggle 400ms Sine.easeInOut |
| `gate_need_plate` | popIn 350ms Back.easeOut |
| `banner_entry` | popIn 350ms Back.easeOut |
| `road_chest_wood` | chestRattle 500ms Sine.easeInOut; chestOpen 400ms Back.easeOut |
| `road_chest_iron` | chestRattle 500ms Sine.easeInOut; chestOpen 400ms Back.easeOut |
| `road_chest_gold` | chestRattle 500ms Sine.easeInOut; chestOpen 400ms Back.easeOut |
| `wallet_pill` | pressSquash 120ms Quad.easeOut; countUp 600ms Quad.easeOut |
| `icon_settings_gear` | pressSquash 120ms Quad.easeOut; gearTurn 300ms Cubic.easeOut |
| `chapter_plate` | chestWiggle 600ms Sine.easeInOut |
| `play_button` | pressSquash 120ms Quad.easeOut; glintSweep 3400ms Linear |
| `chapter_chip` | chestWiggle 600ms Sine.easeInOut |
| `back_to_me_pill` | popIn 350ms Back.easeOut; pressSquash 120ms Quad.easeOut |
| `nav_bar` | pressSquash 120ms Quad.easeOut |
| `locked_toast_and_tooltip` | popIn 350ms Back.easeOut; autoHide 200ms Quad.easeIn |
| `chapter_panel` | panelPop 550ms Back.easeOut; rewardPop 350ms Back.easeOut; glintSweep 3400ms Linear; confettiTwinkle 1400ms Sine.easeInOut |
| `badge_base_brass` | popIn 350ms Back.easeOut; floatBob 2400ms Sine.easeInOut; pressSquash 120ms Quad.easeOut |
| `badge_base_brass_ready` | popIn 350ms Back.easeOut; floatBob 2400ms Sine.easeInOut; pressSquash 120ms Quad.easeOut |
| `badge_base_copper` | popIn 350ms Back.easeOut; floatBob 2400ms Sine.easeInOut; pressSquash 120ms Quad.easeOut |
| `badge_base_copper_ready` | popIn 350ms Back.easeOut; floatBob 2400ms Sine.easeInOut; pressSquash 120ms Quad.easeOut |
| `badge_base_teal` | popIn 350ms Back.easeOut; floatBob 2400ms Sine.easeInOut; pressSquash 120ms Quad.easeOut |
| `badge_base_teal_ready` | popIn 350ms Back.easeOut; floatBob 2400ms Sine.easeInOut; pressSquash 120ms Quad.easeOut |
| `badge_glyph_daily` | attentionWiggle 700ms Sine.easeInOut; sparkleBurst 600ms Quad.easeOut |
| `badge_ribbon_timer` | urgentPulse 800ms Sine.easeInOut |
| `badge_dot` | dotPop 250ms Back.easeOut; dotPulse 1200ms Sine.easeInOut |
| `badge_new_lock` | newWobble 600ms Sine.easeInOut |
| `badge_count_bubble` | popIn 350ms Back.easeOut |
| `badge_tag_percent` | tagWobble 900ms Sine.easeInOut |
| `bolt_idle` | breatheBlink 2400ms Sine.easeInOut |
| `bolt_happy` | boltHop 2200ms Quad.easeOut |
| `bolt_peek_side` | peekIn 450ms Back.easeOut |

Details (what moves) are in `manifest.json` under `animation[].detail`. Presets follow `docs/art/UI_JUICE.md`; easings are Phaser names.

## NEEDS-ART briefs (27)

- **`node_locked_cool`** (88x88 / 176x176): Same shape and padlock as node_locked, body recoloured cool blue-grey (#9fb0d0 / #5d6d92), no warm tones, flat plain face where a 28 px number is drawn in code. Must differ from the done node in colour, size (88 vs 80x96) and pips (none). Fallback: keep the code tint (needs no art). Common rules apply. Note: Low priority: code tint is acceptable.
- **`node_boss_locked_cool`** (96x104 / 192x208): node_boss silhouette in desaturated cool blue-grey with a small padlock plate; the gear crown stays so it still reads as the boss. Common rules apply. Note: Low priority: code tint fallback exists.
- **`avatar_platform_normal`** (176x56 / 352x112): Top-down-ish gold disc platform 176x56 (3.1:1), cream-yellow top, thick warm-brown rim, 3-4 bolts on the rim, soft shadow under. Reads clearly against any scenery. Fallback: code-drawn ellipse (current live look). Common rules apply. Note: Optional polish.
- **`avatar_platform_boss`** (224x72 / 448x144): Same family as avatar_platform_normal but wider 224x72 with a double rim and 6 bolts so the boss platform differs in size and part count. Common rules apply. Note: Optional polish.
- **`road_kit_ch4`** (70x70 / 140x140, FIX (CRITIQUE_70: 4 KEEP / 8 FIX), existing: art-candidates/road-surface-kit-b2/ch4/road_ch4_<piece>.webp @ orch/t-f807c19c-road-surface-kit-batch-2-chapter): Re-derive straights and curves with the kit-v3 loop: straights must repeat on themselves (edge diff under 8/255, now 57-65/255) and each curve must match the straight at both ends (now 48-83/255). Keep s_curve_a/b, dead_end, shoulder_edge (KEEP). Plank colours must not collapse to one grey in grayscale. Flat plan view, no perspective. Common rules apply. Note: Pieces: straight_h, straight_v, curve_ne, curve_nw, curve_se, curve_sw, t_junction, cross, dead_end, s_curve_a, s_curve_b, shoulder_edge
- **`road_kit_ch5_teaser`** (70x70 / 140x140, FIX (CRITIQUE_70: 0 KEEP / 12 FIX), existing: art-candidates/road-surface-kit-b3/ch5/road_ch5_<piece>.webp @ orch/t-bf956f7c-road-surface-kit-batch-3-rebuild): Recommended new strip: stop the rust/primer clash, drop the saturated orange, remove the L-plate repeat, curve join steps under 8/255. Teaser is shown grayscale 70% so only 4-5 pieces are needed first (straight_v, curve_ne/nw, dead_end, shoulder_edge). Common rules apply. Note: Low priority: only visible above the closed gate.
- **`road_kit_ch1`** (70x70 / 140x140, FIX (6 KEEP / 6 FIX: curves, T, cross), existing: art-candidates/road-surface-kit-b3/ch1/road_ch1_<piece>.webp @ orch/t-bf956f7c-road-surface-kit-batch-3-rebuild): curves: offset u by one chevron period, 40 px blend; T and cross: flat centre strip, no mirrored zigzag. Common rules apply. Note: Not drawn in the ch4 mock; needed when the road shows other chapters. Priority after ch4.
- **`road_kit_ch2`** (70x70 / 140x140, FIX (6 KEEP / 6 FIX), existing: art-candidates/road-surface-kit-b3/ch2/road_ch2_<piece>.webp @ orch/t-bf956f7c-road-surface-kit-batch-3-rebuild): curves: whole squares per quarter turn; T and cross: centre on the same 2x2 grid as the arms. Common rules apply. Note: Not drawn in the ch4 mock; needed when the road shows other chapters. Priority after ch4.
- **`road_kit_ch6`** (70x70 / 140x140, FIX (6 KEEP / 4 FIX / 2 REDO: T and cross), existing: art-candidates/road-surface-kit-b2/ch6/road_ch6_<piece>.webp @ orch/t-f807c19c-road-surface-kit-batch-2-chapter): redo T and cross (dark band hole), curve steps under 8/255. Common rules apply. Note: Not drawn in the ch4 mock; needed when the road shows other chapters. Priority after ch4.
- **`road_kit_ch7`** (70x70 / 140x140, KEEP except straights (10 KEEP / 2 FIX), existing: art-candidates/road-surface-kit-b3/ch7/road_ch7_<piece>.webp @ orch/t-bf956f7c-road-surface-kit-batch-3-rebuild): straights: remove the ghost constellation patch at the loop seam. Common rules apply. Note: Not drawn in the ch4 mock; needed when the road shows other chapters. Priority after ch4.
- **`road_kit_ch8`** (70x70 / 140x140, FIX (6 KEEP / 6 FIX), existing: art-candidates/road-surface-kit-b3/ch8/road_ch8_<piece>.webp @ orch/t-bf956f7c-road-surface-kit-batch-3-rebuild): curves sheared diamonds; T and cross busy gold zigzag. Common rules apply. Note: Not drawn in the ch4 mock; needed when the road shows other chapters. Priority after ch4.
- **`scenery_ch4_entrance`** (390x844 / 780x1688, FIX (CRITIQUE_64), existing: art-candidates/road-art-4/road_panel_ch4_entrance.webp @ orch/t-d179438f-road-art-4-chapters-4-and-5-pane): Move the grand piano and stool at least 6% in from the left edge, keep plank rows continuous across the top, join to the gate panel under 8/255. Pure plan view. Common rules apply.
- **`scenery_ch4_body`** (390x1200 / 780x2400): Plain arcade carpet/floor continuing the ch4 gate panel, top and bottom 120 px match the two neighbours exactly (reference both). Flat plan view, no vanishing point, no props within 10% of the sides. Fallback: code gradient plus props. Common rules apply. Note: Height is an estimate: 9 nodes x 160 pitch.
- **`scenery_ch5_gate`** (390x844 / 780x1688, FIX (CRITIQUE_64, join 11.8), existing: art-candidates/road-art-4/road_panel_ch5_gate.webp @ orch/t-d179438f-road-art-4-chapters-4-and-5-pane): Cover the seam in code (80-120 px band) or re-roll with the entrance top rows as reference; pull the grey slabs off the left and right edges. Common rules apply. Note: Teaser is dimmed, so a code band is an acceptable fix.
- **`scenery_ch5_entrance`** (390x844 / 780x1688, FIX (CRITIQUE_64, join 11.8), existing: art-candidates/road-art-4/road_panel_ch5_entrance.webp @ orch/t-d179438f-road-art-4-chapters-4-and-5-pane): Calmer gravel (larger, fewer stones), lane lines at the same x as the gate bottom. Common rules apply.
- **`scenery_ch5_card`** (272x120 / 544x240): Painted music-attic interior (piano, records, dusty light), 272x120 (2.27:1), full-bleed rectangle with no outline or key (it is clipped by the frame). Stand-in is stage_ch5.webp. STYLE LOCK: warm dark-brown outline (not black) 3-4% of sprite height, light from top-left, thin rim light bottom-right, soft contact shadow, 3-4 value steps, glossy toy-metal look like the accepted medallion/popup kit. KEY: none, opaque rectangle. RANK CLARITY: states/tiers in one family must differ in at least two of silhouette, size, part count, accent colour, pips, and still read apart at 70 px in grayscale.
- **`road_landmark_ch4_b_2`** (80x80 / 160x160, FIX (CRITIQUE_65), existing: art-candidates/road-art-4c/road_landmark_ch4_b_2.png @ orch/t-e82cdeb2-critic-pass-on-road-art-4c-and-f): Fix only: remove green patches between drums (a re-key with #00FF00 green background is the likely cure, or hand-clean). Common rules apply.
- **`road_landmark_ch4_b_4`** (80x80 / 160x160, FIX (CRITIQUE_65), existing: art-candidates/road-art-4c/road_landmark_ch4_b_4.png @ orch/t-e82cdeb2-critic-pass-on-road-art-4c-and-f): Fix only: remove olive green inside loop (a re-key with #00FF00 green background is the likely cure, or hand-clean). Common rules apply.
- **`road_landmark_ch4_b_6`** (80x80 / 160x160, FIX (CRITIQUE_65), existing: art-candidates/road-art-4c/road_landmark_ch4_b_6.png @ orch/t-e82cdeb2-critic-pass-on-road-art-4c-and-f): Fix only: remove green by legs (a re-key with #00FF00 green background is the likely cure, or hand-clean). Common rules apply.
- **`road_landmark_ch4_c_6`** (80x80 / 160x160, FIX (CRITIQUE_65), existing: art-candidates/road-art-4c/road_landmark_ch4_c_6.png @ orch/t-e82cdeb2-critic-pass-on-road-art-4c-and-f): Fix only: remove green at top-right and left of frame (a re-key with #00FF00 green background is the likely cure, or hand-clean). Common rules apply.
- **`icon_settings_gear`** (32x32 / 64x64): Chunky brass gear, 8 teeth, centre hole, same glossy toy-metal language as the gear_1..8 units but plainer; must be readable at 32 px and in grayscale (clear hole, thick teeth). Button base reuses btn_brass nine-slice. Common rules apply. Note: Mock uses a unicode glyph.
- **`badge_base_brass_ready`** (56x56 / 112x112, FIX (CRITIQUE_69), existing: art-candidates/map-badge-1/bases/badge_base_brass_ready.png @ orch/t-7a7ea2eb-map-badge-art-batch-1-retry-the): re-key glow (no pink), warm gold-white glow, brighter top so ready differs from idle in grayscale; use green #00FF00 key so the glow is not contaminated. Common rules apply. Note: Cheaper alternative from the critic: draw the glow in code on the idle base and skip this art.
- **`badge_base_copper_ready`** (56x56 / 112x112, FIX (CRITIQUE_69), existing: art-candidates/map-badge-1/bases/badge_base_copper_ready.png @ orch/t-7a7ea2eb-map-badge-art-batch-1-retry-the): re-key glow (no pink), warm gold-white glow, brighter top so ready differs from idle in grayscale; use green #00FF00 key so the glow is not contaminated. Common rules apply. Note: Cheaper alternative from the critic: draw the glow in code on the idle base and skip this art.
- **`badge_base_teal_ready`** (56x56 / 112x112, FIX (CRITIQUE_69), existing: art-candidates/map-badge-1/bases/badge_base_teal_ready.png @ orch/t-7a7ea2eb-map-badge-art-batch-1-retry-the): white-mint glow, no pink; use green #00FF00 key so the glow is not contaminated. Common rules apply. Note: Cheaper alternative from the critic: draw the glow in code on the idle base and skip this art.
- **`badge_glyph_events`** (32x32 / 64x64, FIX (CRITIQUE_69), existing: art-candidates/map-badge-1/glyphs/badge_glyph_events.png @ orch/t-7a7ea2eb-map-badge-art-batch-1-retry-the): Bold yellow pennant with a thick pole (about 2x thicker than now), no blue; must stay readable at 32 px and in grayscale. Common rules apply.
- **`badge_count_bubble`** (20x20 / 40x40, FIX (CRITIQUE_69), existing: art-candidates/map-badge-1/parts/badge_count_bubble.png @ orch/t-7a7ea2eb-map-badge-art-batch-1-retry-the): Red or cream-rimmed bubble like the dots; gold on gold vanishes on brass. Empty, number drawn in code. Common rules apply. Note: Optional: chips cover the mock.
- **`badge_tag_percent`** (40x24 / 80x48): Empty red tag with a notched left edge and a cream rim, 40x24 (5:3), no baked text (code draws -50% at 12 px white with 2 px ink outline). Use green #00FF00 key because the art is red. Common rules apply. Note: Mock draws it in CSS; code fallback works.

Suggested order: (1) road_kit_ch4 (the road is the owner's top complaint), (2) badge glyph events + ready bases (or code glow), (3) scenery ch4 entrance and body, (4) platform and gear, (5) the other chapters' kits and ch5 teaser.

## Open points for the Implementer

- Source pixel size of the road-art-4 panels was not measured (no image tooling in this checkout); check before choosing cover scaling.
- Nine-slice insets for `kit3_*` and buttons are quoted from `src/game/ui/levelIntro.ts` (44 popup, 30-40 well); verify the others on the file.
- Badge ids in the mock are placeholders: DAILY=glyph_daily, QUESTS=glyph_quests, COLLECT=glyph_album, EVENT=glyph_events (FIX), OFFER=glyph_offers, SEASON=glyph_season; mail glyphs exist but are not on this screen.
- Nothing in the mock needs chapters 6-8 art; their kits are listed for scrolling.
