# CRITIQUE 88: map badge batch 2 (27 pieces)

Critic pass on `art-candidates/map-badge-2/` (branch `orch/t-f1060cbe-chatgpt-batch-map-badge-batch-2`). Judged from `contact-dark.png` and `contact-light.png` (every piece visible on both backgrounds) against the painted road map mock v2 (`normal_try1.png`). Individual `final/*.webp` were not opened one by one; edge and fringe notes come from the light sheet. I did not generate or edit images. Score is out of 20 (rubric of art-director-critic); the three "state" checks are listed separately.

## Overall

- **Family resemblance to the mock (critical 19): the batch drifts.** The mock is bright and clean: cream plaques, glossy gold rims, saturated cartoon colour, a flat bright-yellow active tab, a navy tab bar. The batch is dark, dirty steampunk brass: scratched mottled metal, many rivets, brown inner wells. Next to the mock the tab icons, ring and plates look like another game's kit. Fix with a style reference image in the next brief (see list), not with more words.
- **Outline and light are consistent inside the batch** (warm dark brown, about the same weight, light top-left). That part is good.
- **State distinguishability FAILS for the base family.** Idle vs ready (brass, copper, teal): same silhouette, same size, same part count, same accent colour, same pips. The ready dome is a few percent brighter; this differs in 0 of 5 axes at 44 px. Ready must be drawn differently by design (see REDO 1).
- **Chapter ring states:** idle (dark segmented ring, closed chest) vs ready (yellow segments, open chest with coins, sparkles) differ in accent colour and part count: passes (2 of 5). Ready vs open (yellow segments, closed chest) differ only by chest lid/coins/sparkle: **only 1 of 5, FAIL**. The hard yellow outline on both is a fringe (item 14), and is wrong for code-drawn glow.
- **Fringes (critical 14):** on the light sheet the brass_ready, copper_ready and teal_ready bases carry a pale yellow/cyan halo ring; the tab_active_plate and both ready/open rings carry a hard saturated yellow line. These show on light backgrounds only; the mock's map is purple, so the yellow line would read as a glow stroke, but the pale halos are still key residue.
- **Green key leak:** a dark-green line is visible inside the gear hole and in the padlock shackle (lock_closed, clearly on the light sheet). Item 14, small but visible at 2x.

## Per-piece table

Scores are rubric estimates. Verdict KEEP = ship as is, FIX = small hand edit or one-line redo, REDO = new generation.

| # | Piece | Score | Verdict | Failed items | 44 px read | Note |
|---|---|---|---|---|---|---|
| 1 | badge_base_brass_ready | 13 | **REDO** | 14, 19, state | Reads as the idle base | Same as idle plus pale halo. Needs a visibly different silhouette or part (see REDO 1). |
| 2 | badge_base_copper_ready | 13 | **REDO** | 14, 19, state | same | As above. |
| 3 | badge_base_teal_ready | 13 | **REDO** | 14, 19, state | same | Cyan fringe is the strongest of the three. |
| 4 | badge_burst_discount | 18 | **KEEP** | none | Good, red starburst is the clearest piece | Empty, text slot by code. Slightly flat shading is fine. |
| 5 | badge_count_bubble | 18 | **KEEP** | none | Good | Red dome with cream rim, matches the mock's red dots. |
| 6 | badge_float_pill | 17 | **KEEP** | 20 | Fine | Speech-bubble tail; check padding (tail sits close to the corner). |
| 7 | badge_glyph_events (flag) | 17 | **KEEP** | 18 | Reads | Yellow flag, bold. Mock uses a clock/calendar for events; fine as a secondary glyph. |
| 8 | badge_overflow (three dots) | 17 | **KEEP** | none | Dots clear | Use as is. |
| 9 | rail_plate | 15 | **FIX** | 19, 8 | Dark plate, nearly black well | Mock rail badges are cream/gold circles, not dark rectangular plates. Keep as a backing only for text; do not use as the main badge. |
| 10 | badge_glyph_gear | 15 | **FIX** | 14 | Reads | Green line in the hole: clear the hole to transparent and erase the dark-green edge. |
| 11 | badge_glyph_offers_tag | 16 | **FIX** | 19, 18 | Reads as a blank tag | Mock offers use a blue gem with a red -50% flag. Tag is a backup; rope is thin at 44 px. Keep only if code adds a price or gem. |
| 12 | badge_glyph_plus | 17 | **KEEP** | none | Very clear | Pure green plus is the right cue. |
| 13 | badge_ribbon_lock | 15 | **FIX** | 20, 11 | Padlock cap is tiny, ribbon dominates | Padlock under 20 px at 44 px width. Enlarge the padlock. |
| 14 | road_chapter_ring (idle) | 16 | **FIX** | 19 | Reads as a segmented wheel | Fine as a state base but too dark/dirty beside the mock's green progress ring. Brightness tuning (code) or re-brief. |
| 15 | tab_icon_events | 18 | **KEEP** | none | Clear | Calendar with star. Matches the mock's calendar icon. |
| 16 | tab_icon_machine | 14 | **REDO** | 18, 11, 12 | Gears and pipes turn to mush | Too busy: 4+ detail clusters (two gears, pipes, lever, plate). Replace with one wrench or one gear (the mock uses a wrench). |
| 17 | tab_icon_road | 18 | **KEEP** | none | Clear | Road with flag, strongest in the set. |
| 18 | tab_icon_units | 17 | **KEEP** | 19 | Reads as a robot | Brass robot is dark; mock's Bolt is white/blue. Acceptable, recolour later to match Bolt. |
| 19 | badge_lock_broken | 17 | **KEEP** | 18 | Break reads; shards fine | Shake/break frame; the sparkle bits are tiny at 44 px but optional. |
| 20 | badge_lock_closed | 15 | **FIX** | 14, 19 | Reads | Green key line in the shackle. Mock's locked nodes are grey steel: this one is gold, so locked vs unlocked are only distinguished by the glyph. Recolour grey/steel to match the mock and separate from open. |
| 21 | badge_ribbon_count_full (gold ribbon) | 17 | **KEEP** | none | Good | Empty ribbon for "COMPLETE" or count. |
| 22 | road_chapter_plate | 17 | **KEEP** | 19 | Fine | Cream plate. The mock's chapter plate is larger and has a bar inside; this is a plain blank plate: use it but add the progress bar in code. |
| 23 | road_chapter_ring_ready | 12 | **REDO** | 14, 3, 19, state | Sparkles clear but hard yellow outline | Hard yellow outline, baked glow. Redo as the same ring without outline, glow in code. |
| 24 | road_chapter_ring_open | 12 | **REDO** | 14, state | Looks like ready minus sparkle | Needs a different silhouette/part (open lid, rays, etc.); outline as above. |
| 25 | road_chapter_track | 15 | **FIX** | 11, 19 | Segments thin, chest cap tiny | 10 segments at 44 px is hard; code-draw fills. Chest cap should be 2x larger. |
| 26 | tab_active_plate | 12 | **REDO** | 14, 19 | Hard yellow outline | Mock's active tab is a flat bright-yellow plate, no outline. Regenerate flat yellow-gold plate, no glow. |
| 27 | tab_bar_plate | 15 | **FIX** | 19, 20 | Reads | Dark wood and brass; the mock bar is dark navy with a gold edge. Small source (445x181), enlarge to 2x spec. |

Counts: KEEP = 4, 5, 6, 7, 8, 12, 15, 17, 18, 19, 21, 22 = **12**; FIX = 9, 10, 11, 13, 14, 20, 25, 27 = **8**; REDO = 1, 2, 3, 16, 23, 24, 26 = **7**.

## FIX / REDO list (brief-ready)

Attach `normal_try1.png` as the style reference to every sheet. Flat `#00FF00` key again, but keep the pieces inside their cells with 10% margin. State rule: adjacent states differ in at least 2 of silhouette, size, part count, accent colour, pips; and check the 44 px grayscale before accepting.

### REDO

1. **badge_base_{brass,copper,teal}_ready** (items 14, 19, state): same base as idle but with: a wider flared rim (silhouette +10%), a raised bright-cream inner dome, and a small bright-yellow star pip on the top rim. No glow or outline baked in; the glow and pulse are code. Pale halos removed.
2. **tab_icon_machine** (18, 11, 12): one big wrench (or single gear) on the cream tile, no pipes, at most 2 detail clusters, same frame as the other tab icons.
3. **road_chapter_ring_ready** (14, 19, state): ring with bright gold segments, chest lid open with coins and one star; no outer outline, no glow.
4. **road_chapter_ring_open** (14, state): must differ from ready: lid open and empty, segments green or grey-green (claimed), small check mark; no outline.
5. **tab_active_plate** (14, 19): flat bright-yellow rounded plate with a thin dark-brown outline like the mock's active tab, no yellow outline, no rivets. Glow in code.

### FIX (hand edit, or redo if cheaper)

6. **badge_glyph_gear**: erase the dark-green line inside the hole; make the hole fully transparent.
7. **badge_lock_closed**: erase the green shackle line; also make a steel/grey variant (matches the mock's locked nodes) so locked and open differ by colour as well as glyph.
8. **badge_ribbon_lock**: padlock at 2x size (about 35% of ribbon width).
9. **road_chapter_track**: chest cap at 2x size; segments wider, with 8 instead of 10 if needed.
10. **road_chapter_ring (idle)**: brighten the dark segments toward the mock's palette (lighter wood grey), still clearly different from ready.
11. **tab_bar_plate**: navy body with a thin gold edge as in the mock; regenerate at or above 2x the spec size.
12. **rail_plate / badge_glyph_offers_tag**: rail plate only as a text backing; for offers prefer a blue gem plus red discount flag (as in the mock) instead of the blank tag; ask for the tag as an alternate only.

### Code-side notes (not for ChatGPT)

- Ready glow for bases, ring and active tab: draw in code (additive pulse, soft radial), do not rely on baked outlines.
- Tint locked variants in code if no grey art arrives.

## Standards to add

- Outline weight 3-4% of height in warm dark brown #3a2210 (observed consistent; write it into the style lock).
- Style lock should say "bright, clean, glossy cartoon like the mock" instead of "steampunk brass, scratched". The word steampunk is what pushed this batch dark.
- Every state set needs a grayscale 44 px strip in its README to prove the two-axes rule.

## Verdict

changes_requested: 12 KEEP, 8 FIX, 7 REDO. Ready-state bases and the chapter ring ready/open pair are the blockers, plus the active tab plate.
