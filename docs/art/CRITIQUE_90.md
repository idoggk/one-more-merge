# CRITIQUE 90: road map painted v2 slices (10 pieces)

Reviewed: `art-candidates/road-map-slices/` from branch `orch/t-afbda932-slice-the-10-needs-slice-road-ma` (read-only). I opened `contact-dark.png` and `contact-light.png` (3x zoom of the @2x files) and measured every @2x file for size and bounding box. Painted mock v2 sources were not re-opened (they live on `orch/t-d4d4c5e1-asset-breaker-road-map-painted-m`), so "consistent with mock" is judged from the pieces side by side: one glossy, warm-outlined, top-left-lit family. Fine.

## Checks that apply to all ten
- **Sizes**: every 1x and @2x file matches the README sizes exactly (30, 50, 34x36, 44, 32, 247x108; @2x doubled). PASS.
- **Padding (item 20) fails on most pieces.** The README claims 6% padding, but opaque pixels touch the canvas edge on the @2x files: nav_icon_events (full left/right/top/bottom, 155 border px), nav_icon_units (x 0 to 67), badge_glyph_collect (rows 0 and 63), badge_glyph_events (rows 0 and 63), icon_coin_bolt (x 0 to 87), settings_button (rows 0 and 99). Pieces that run to the edge look cramped and can clip when scaled or when a glow or tween is added.
- **Palette/light**: all pieces light from top-left with a warm dark outline, except nav_icon_road (flat dark pin, no outline or light) and nav_icon_machine (grey, no outline).
- **Edges**: faint tan or purple contamination from the painted background shows on the light sheet on cannon, stopwatch, bolt coin, settings and the nut coin's right edge. It is subtle on dark and visible on light.
- The whole set is consistent in style. The weak members are the machine wrench and the road pin.

## Per piece

| piece | score | verdict | failed items |
|---|---|---|---|
| icon_nut_coin | 18/20 | **KEEP** | 14 minor (dark shadow on right edge), 20 |
| nav_icon_units | 17/20 | **FIX** | 20 touches edges, 7 |
| nav_icon_events | 16/20 | **FIX** | 20 (no padding, flush on 4 sides), 14 |
| nav_icon_road | 15/20 | **KEEP with code rim, else FIX** | 1, 3, 12 (no outline or light, near-black on dark) |
| nav_icon_machine | 10/20 | **REDO, NEEDS-ART** | 1, 14 (C), 18, 10 |
| icon_coin_bolt | 16/20 | **FIX** | 14 (C) tan shadow rim at bottom, 20 |
| settings_button | 16/20 | **FIX** | 14 (C) purple fringe on lower rim, 20 |
| badge_glyph_collect | 14/20 | **FIX** (re-cut), else NEEDS-ART | 14 (C), 20 (cannon touches edge), 7 |
| badge_glyph_events | 15/20 | **FIX** (re-cut) | 14 (C) tan sliver at base, 20 |
| scenery_ch5_card | 17/20 | **KEEP at 1x, FIX @2x** | 20 n/a, softness at 2x |

### Notes and fix sentences
- **icon_nut_coin**: KEEP. Clean hexagon, reads at 70 px and in grayscale. Only note: darken-to-black pixels on the right edge, ignore.
- **nav_icon_units** (Bolt head): the best nav icon, silhouette distinct (antenna, earcups). Fix: 20 re-pad to 6% so the earcups do not touch x=0 and x=67; no art change.
- **nav_icon_events**: calendar with star, reads well. Fix: 20 re-pad so the rings and the frame sit inside 6% margin; 14 shave 1 px on the bottom edge to remove the cream halo.
- **nav_icon_road**: pin reads in shape but is dark brown-black with a hole, no outline, no top-left light. On the dark nav it is invisible. Keep only for the gold active tab, and add a light rim in code. Better: re-cut or redo it as a lighter, outlined pin (see brief A).
- **nav_icon_machine**: ragged wrench edges (14), glow cut off, outline missing, wrench is a thin grey shape that looks like a different game next to the glossy siblings (19). The cut cannot be fixed by re-cutting; the sparks were clipped at the crop. **NEEDS-ART**, brief B.
- **icon_coin_bolt**: strong, benchmark quality. Fix: 14 erode the bottom 2 px shadow rim and decontaminate the tan; 20 re-pad to 6%. Keep one single currency icon (owner decision still open).
- **settings_button**: fix: 14 decontaminate the purple pixels on the lower rim (replace fringe colour with the gold rim colour); 20 re-pad.
- **badge_glyph_collect**: cannon is usable at 32 px but the tan sliver and edge contact fail critical item 14. Fix: re-cut inside a tighter disc mask with 2 px erosion and 6% padding. If the sliver is baked into the shape, NEEDS-ART (brief C).
- **badge_glyph_events**: same fix, tighter mask, remove base sliver, re-pad. If still dirty, brief D.
- **scenery_ch5_card**: crisp enough at 1x (247x108). At @2x it is the 480x190 source upscaled, soft. Ship 1x; do not claim @2x. Painting a 960x380 version is optional.

## Summary
KEEP 1 (nut coin) · KEEP with condition 2 (road pin, scenery at 1x) · FIX 6 · REDO/NEEDS-ART 1 (machine); collect and events glyphs fall back to NEEDS-ART if the re-cut leaves slivers.
Priority: re-cut pass for padding on all pieces (one script, fix 20 everywhere), decontaminate edges (14), then art for the machine wrench and optionally the road pin.

## ChatGPT briefs (NEEDS-ART)
Style lock for all: glossy cartoon mobile-game icon, thick warm dark-brown outline (about 4% of height), light from top-left, thin rim light on the right, soft shading, 3 or 4 value steps, no text, centred with 8% empty margin, on a flat pure magenta (#FF00FF) background with no shadow on the ground, 1024x1024.

- **A. nav_icon_road (optional)**: "A map pin / road marker icon, rounded teardrop shape in warm cream with a gold rim and a dark brown outline, a small dark centre circle, readable on a dark navy bar. Same glossy style as a cannon and calendar icon in a puzzle game."
- **B. nav_icon_machine**: "A chunky cartoon open-end wrench tilted 45 degrees, steel-blue grey metal with a gold highlight, thick warm dark-brown outline, three small gold sparks near the head fully inside the frame. Glossy mobile-game icon matching a red cannon and a stopwatch."
- **C. badge_glyph_collect**: "A cute red toy cannon with a gold muzzle ring and a small gold star on the dark wheel, three-quarter view facing up-right, thick warm dark-brown outline, no ground shadow."
- **D. badge_glyph_events**: "A silver stopwatch with a cream dial, blue hands, two gold top buttons, thick warm dark-brown outline, no ground shadow, front view."

Do not generate these until the owner approves; slicing pass afterwards should use a magenta key to avoid halo.
