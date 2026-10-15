# Map badge batch 2 (t-f1060cbe)

Three ChatGPT sheets (3x3, flat #00FF00 key, one try each, no redo spent), same chat. Raw sheets in `raw/`, trimmed full-res slices in `sheetA_cc/ sheetB_cc/ sheetC_cc/` (PNG, alpha), game-size 2x WebP in `final/` (sizes from ROADMAP_LAYOUT section 4), `contact-dark.png` / `contact-light.png`. Self-scored only; needs an independent critic pass. Style prompt was a condensed primer (chunky steampunk toy look, dark-brown outline, top-left light, brass/copper); the painted road map mock was not attached as a reference (new chat, text-only prompt), so match to it is by description only.

Sliced with a component-based script (the sheets' objects do not sit on an exact 3x3 grid, `tools/slice-sheet.mjs` cell-border gates failed on 4 pieces). Key: flood-fill from the border, edge fringe faded, green despill. Script deleted.

## Sheet A (CRITIQUE_69 fix pieces + new)
| Piece | Verdict | Note |
|---|---|---|
| badge_base_brass_ready / copper_ready / teal_ready | FIX-PARTIAL | Glow is now a thin pale line (no pink), but the baked glow was mostly eaten by the key and the dome is only slightly brighter than idle. Draw the glow in code on the idle base (critic's alternative) or redo with a white key. |
| badge_glyph_events (flag) | KEEP | Bold yellow pennant, thick pole, reads at 48 px. Replaces the thin blue flag. |
| badge_count_bubble | KEEP | Red with cream rim, matches the dots. Replaces gold bubble. |
| badge_burst_discount, badge_overflow, badge_float_pill, rail_plate | KEEP | Empty (text and glyph slots are code). |

## Sheet B
badge_glyph_gear (hole is transparent; thin dark-green edge line inside the hole to clean), badge_glyph_plus (green plus, keep as the "add" cue), badge_glyph_offers_tag (price tag, alternative to the crate), badge_ribbon_lock (padlock cap on cream ribbon, empty), tab_icon_road / units (robot head) / machine / events (calendar star), road_chapter_ring (idle, chest, dark segments). All KEEP; tab icons are the clearest of the set.

## Sheet C
tab_bar_plate (a bit small, 445x181 source), tab_active_plate (glow baked as a hard yellow outline: FIX, make glow in code), road_chapter_plate, road_chapter_track (10 segments + chest cap), badge_ribbon_count_full (gold), badge_lock_closed (faint green line inside the shackle: clean), badge_lock_broken (shake/break frame), road_chapter_ring_ready (hard yellow outline glow, same note) and road_chapter_ring_open. 

## Not done from the list
discount/overflow/float exist now; missing: copper/teal-specific glyph recolours, copper/teal locked variants of new pieces, tab `_active` tints, `badge_lock` shake frame 1 (closed tilted exists). Prices: no spend. ChatGPT quota was not hit.

## Wiring notes
Names match ROADMAP_LAYOUT; `final/*.webp` are fit inside the 2x spec box (aspect kept, so some are smaller on one side). Chapter plate/track/ring pieces are meant to be 9-sliced or used as is.
