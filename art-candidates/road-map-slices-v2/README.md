# Road map slices v2 (CRITIQUE_90 applied)

Input: the 10 slices of `art-candidates/road-map-slices/` (branch `orch/t-afbda932-slice-the-10-needs-slice-road-ma`), verdicts from `docs/art/CRITIQUE_90.md`. Files: `<name>.png` (1x), `<name>@2x.png`. Contact sheets: `contact-dark.png`, `contact-light.png` (3x nearest zoom of the @2x files).

## Correction to the v1 README
v1 claimed "6% padding". That was wrong: opaque pixels touched the canvas edge on 6 pieces (units, events, coin_bolt, settings, both glyphs). In v2 every icon was trimmed to its alpha bounding box and refitted with a real 6% transparent margin per side (measured at alpha > 8: at least 4 px at @2x, 2 px at 1x on every side; aspect ratio kept, so the content is about 4 to 12% smaller than in v1). Canvas sizes are unchanged.

## Method (all pieces except the scenery card)
1. Upscale the @2x slice to 4x (Lanczos), binarise alpha, erode the edge (1 px at @2x, 0.5 px for pieces without contamination).
2. Decontaminate: pixels in the outer edge band get the blurred colour of the interior (kills the tan and purple painted-background fringe).
3. Soften alpha slightly, trim, fit into the canvas with 6% padding, downscale to @2x and 1x from the 4x master.
No source re-cut was done (the painted sources are not on this branch). Resolution is still limited by the original ~70 px crops, so the @2x files are not sharper than v1, only cleaner.

## Status per piece
| file | size 1x | v2 status |
|---|---|---|
| icon_nut_coin | 30x30 | KEEP, re-padded |
| nav_icon_units | 34x36 | FIXED: padded, edge cleaned |
| nav_icon_events | 34x36 | FIXED: padded, cream halo removed |
| nav_icon_road | 34x36 | KEEP + FIXED: cream light rim baked into the slice (pin was invisible on the dark bar). A redo (brief A in CRITIQUE_90) is optional |
| nav_icon_machine | 34x36 | **NEEDS-ART**: padded placeholder only (ragged, grey, no outline). Redo with brief B |
| icon_coin_bolt | 44x44 | FIXED: padded, tan rim removed |
| settings_button | 50x50 | FIXED: padded, purple fringe removed |
| badge_glyph_collect | 32x32 | FIXED: padded, sliver removed. Cannon is still low-res; brief C only if the owner wants it crisper |
| badge_glyph_events | 32x32 | FIXED: padded, sliver removed. Brief D only if wanted |
| scenery_ch5_card | 247x108 | KEEP at **1x only**. No @2x file is shipped: v1's @2x was a soft upscale of a 480x190 source. A real 2x needs a 960x380 painting |

## Next ChatGPT batch list (add to the batch)
1. **nav_icon_machine** (required). Prompt: "A chunky cartoon open-end wrench tilted 45 degrees, steel-blue grey metal with a gold highlight, thick warm dark-brown outline, three small gold sparks near the head fully inside the frame. Glossy mobile-game icon matching a red cannon and a stopwatch." Style lock: glossy cartoon, thick warm dark-brown outline (about 4% of height), light from top-left with a thin right rim light, 3 to 4 value steps, no text, centred with 8% empty margin, flat pure magenta (#FF00FF) background, no ground shadow, 1024x1024. Slice with a magenta key to avoid halo.
2. nav_icon_road (optional, brief A), badge_glyph_collect (optional, brief C), badge_glyph_events (optional, brief D): see `docs/art/CRITIQUE_90.md`.
3. scenery_ch5_card at 960x380 (optional, only if a true 2x is wanted).

Open owner decision: single currency icon (nut coin vs bolt coin vs icon_bolt).
