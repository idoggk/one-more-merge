# road-map-new: ChatGPT batch for the NEEDS-ART assets of the painted road map v2

Source list: `art-candidates/mockups/road-map-painted-v2/manifest.json` and `docs/art/mocks/road-map/ASSETS_PAINTED.md`
(branch `orch/t-d4d4c5e1-asset-breaker-road-map-painted-m`), the 22 entries with `status: NEEDS-ART` and `painted: true`.
Style reference uploaded to every chat: `normal_try1.png` (sheets 1, 3, 4, 5) or `boss_try2.png` (sheet 2), from branch `orch/t-1716254a-painted-road-map-mocks-keep-1-fi`.
Key colour: flat #FF00FF magenta. Prompts are in the manifest `brief` fields; each sheet prompt was condensed from them (primer.txt was not pasted, the brief's own style lock was used).

Status: 11 of 22 manifest ids covered (sheets 1-4). Sheet 5 was sent but the browser lease hit its 20-minute cap before it could be downloaded. Nothing is approved; all files are candidates and need the art critic.

Folders: `raw/` untouched ChatGPT sheets; `sN/` sliced sprites (`.png` full size, `.webp` 1x copy, `contact-dark.png`, `contact-light.png`).
Sheets 2-4 were cut with `tools/slice-sheet-gaps.mjs --tol 115 --feather 70` (the sprites are not on an even grid, so `slice-sheet.mjs` cut them). Sheet 1 was cut with `slice-sheet.mjs --grid 3x2 --tol 120 --feather 80` (its padlock cells still report a cellBorder warning-fail: the shackle top sits within 3 px of the row edge; the sprites are complete when viewed).
Files are at the sheet's native resolution, not yet scaled to the 2x manifest sizes.

| manifest id | file(s) | notes |
|---|---|---|
| node_done_disc | s1/node_done_disc, s1/node_done_next | green and cream-gold ("next") discs |
| node_you_platform | s1/node_you_platform, s1/node_you_ember | gold platform with glow, ember variant |
| node_locked_padlock | s1/node_locked_padlock, s1/node_locked_ice | gunmetal and icy variants |
| node_boss_platform | s2/node_boss_platform, s2/node_boss_mini | studded red/gold arena, crowned winged mini |
| play_button_red | s2/play_button_red, _pressed, _glow, _disabled | |
| play_button_green | s3/play_button_green, _pressed, _disabled | |
| wallet_pill_cream | s3/wallet_pill_cream, s3/wallet_plus_button | |
| chapter_plate | s3/chapter_plate, s4/chapter_bar_track | |
| plaque_title_pill | s4/plaque_title_pill | |
| chest_ring_frame | s4/chest_ring_frame, s4/ring_segment_lit, s4/ring_segment_unlit | segments came out as brass-capped pipe arcs, not plain arcs: redo candidate |
| gate_need_sign | s4/gate_need_sign | |

Not done (sheet 5 prompt was sent in chat "Create Sprite Sheet", c/6ad0d7c0-2b54-83eb-a54a-a398b5c0cd41, result not collected):
prop_arcade_cabinet, prop_neon_arch, prop_star_tower, prop_tree_set (sheet 5, 3x3 incl. snow trees), prop_island_blocks, prop_cloud_puffs (needs green key), road_gate_closed_frost (closed and open), road_kit_ch4 (12 pieces, 2 sheets), road_kit_ch4_ice (12 pieces plus transition, 2 sheets), bg_sky_purple (single), scenery_ch4_body (single).

## Part 2 (task t-6c68dcbd): sheets 5-7

Status now: 15 of 22 ids covered (part 1: 11, part 2 adds prop_arcade_cabinet, prop_neon_arch, prop_star_tower, prop_tree_set, prop_island_blocks, prop_cloud_puffs). Candidates, native resolution, not approved. Sliced with `slice-sheet-gaps.mjs --tol 115 --feather 70`.

| manifest id | file(s) | notes |
|---|---|---|
| prop_arcade_cabinet | s5/prop_arcade_cabinet | |
| prop_neon_arch | s5/prop_neon_arch | |
| prop_star_tower | s5/prop_star_tower | |
| prop_tree_set | s5/tree_round, tree_pine, tree_small, tree_*_snow | 3 + 3 snow variants (manifest asked 6+3 trees: only 3 shapes made) |
| prop_island_blocks | s6/island_1..6, neon_cube_blue | clean |
| prop_island_blocks (cubes) | s6/neon_cube_pink, neon_cube_mix | REDO: pink cubes were keyed out with the magenta background; re-roll on green #00FF00 |
| prop_cloud_puffs | s7/cloud_small, wide, tall, three, big, tiny | green key, clean (6 clouds, 5 asked) |

Raw sheets in raw/sheet5..7. Sheet 5 was collected from chat c/6ad0d7c0-... (not regenerated); sheets 6-7 were sent in the same chat.

Still to do (7 ids): road_gate_closed_frost (closed + open, ref locked_try1.png), road_kit_ch4 (12 pieces, 2 sheets), road_kit_ch4_ice (12 + transition, 2 sheets), bg_sky_purple (single 390x844), scenery_ch4_body (single 390x1200); plus the neon-cube redo on green key. Need about 2 more browser leases.
