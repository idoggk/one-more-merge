# Road map new pieces v2 (t-a7584630, applies CRITIQUE_93)

ChatGPT, one chat, 4 images, 0 re-rolls, nothing bought. Primer sent in condensed form (style lock, palette, negatives, key rule), not verbatim.

| Piece | Folder | How |
|---|---|---|
| ch4 road kit (12, REDO) | `ch4_kit/road_ch4_*.webp` | `raw/ch4_strip.png` (green key, one straight top-down strip: cream ribbon, gold lane lines, plum wall, mirror-symmetric, no centre marks). `CHEVRON=0 GRIDP=0 INLAY=0 node tools/kit.mjs raw/ch4_strip.png green 0,336,1536,688 ch4 ch4_kit 205` (kit.mjs copied from branch road-kit-script-fix-2). 512 cell, road 205 px (40 %), open edges on border midpoints. |
| bg_sky_purple (new) | `final/bg_sky_purple.webp` | 1024x1536, no key, calm centre column. Game scales to cover 390x844 (aspect 0.46 vs 0.67: crop the sides). |
| scenery_ch4_body (new) | `final/scenery_ch4_body.webp` | 1024x1536 full sky plate with islands on both sides, centre empty. Slot is 390x1200: cut vertical slices or scale to width and tile 2 with the sky. |
| plaque_title_pill (FIX) | `final/plaque_title_pill.webp` | re-rolled at 8:1 (result 6.5:1 with padding), empty. |
| chapter_bar_track (FIX) | `final/chapter_bar_track.webp` | re-rolled at 8:1 (7.2:1), empty groove. |
| clouds x6 (FIX) | `fixed/cloud_*.webp` | maroon outline pixels recoloured toward #8C63C4 from the v1 sprites. |
| node_you / boss platform (FIX) | `fixed/node_*_platform.webp` | trimmed to the visible platform, 7 % padding. Glow is still baked (no separate glow file). |

Raw sources in `raw/`. Contact sheets `contact_ch4_dark.png`, `contact_ch4_light.png` (a winding road made from the kit).

## Known issues
- Ch4 T and cross show a pale gold bar across the arm mouths (mirror/rows of kit.mjs at the junction centre). Straights, curves, S curves and dead end seam cleanly. Critic should judge; a CHEVRON/GRIDP-style fix in kit.mjs may be needed.
- Strip is 4.4:1, walls thinner than in the mock; the road is flat top-down (no cliff depth).
- Not done: ring segments (skipped, draw in code), road_kit_ch4_ice (run the same kit on a recoloured strip once ch4 is accepted), neon cube blue, neon arch, open gate (need browser re-rolls, left out by the 2-sheet limit). Nothing wired into src.
