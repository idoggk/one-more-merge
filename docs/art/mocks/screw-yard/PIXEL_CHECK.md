# SCREW YARD mock: pixel check (step 2 of the mock chain)

Pixel Checker, task t-e9ba9093, 2026-10-15. Fixes were made directly in `art-candidates/mockups/screw-yard/index.html`; nothing in `src/` was touched. All 18 clean PNGs and 6 annotated PNGs in that folder were re-rendered (they are the AFTER shots).

**Verdict: PASS.** 0 OPEN items. Notes N1 to N4 are accepted limits, not defects.

## How it was measured

The mock's `?audit=1` (run: `node art-candidates/mockups/screw-yard/render.mjs audit`) only checked taps. It now also checks: text clearing the 4 px plate border, overlaps between any HUD / chip / bubble / popup layers (intentional pairs whitelisted), and whether the coach / warning bubble, legend or turn label covers the drawn object (`OBJECT-COVERED`). Result after the fixes: **CLEAN in 18 of 18** (6 states x 3 sizes: 360x780, 390x844, 430x932). Negative control: `&nobub=1` (old stage height) at start 360x780 reports `OBJECT-COVERED by L64_coach_bubble 36px`. Look, contrast and clipping were also judged by eye on all renders.

Before shots: `docs/art/mocks/screw-yard/before/` (start 360, danger 390, mid 390, win 360, fail 430). After shots: same file names in `art-candidates/mockups/screw-yard/`.

## Check table

| # | Check | Sizes | Result | Found / done |
|---|---|---|---|---|
| 1 | Object hidden by coach / warning bubble | 360, 390, 430 (start, danger) | FIXED | The bubble sat on the bottom of the object (36 px covered at 360). The stage is now shortened by the bubble height (56 start, 40 danger), so the object is fitted above it. Object is 132x160 at 360 (was 178x216, cut). |
| 2 | HUD stats row text at 360 | 360 | FIXED | BONUS plate was 80 wide; "BONUS" touched the border. Taps plate 120 -> 104 wide, so BONUS is 96 (360), 120 (390), 160 (430); text clears the border. |
| 3 | `+1 SCREW` popup covered the red last well | all (mid) | FIXED | Popup moved to y 376, right-aligned to the 16 px margin (clear of the row chip and the red well). |
| 4 | Result panel clipped the HUD plates | all (win, fail) | FIXED | Panel at y 144 cut "24/36" in half behind the ribbon. Panel moved to y 176 (grid), ends 704 at 360x780, inside the safe area. |
| 5 | Win rays crowding the stars | all (win) | FIXED | Starburst 176 -> 144 so it no longer runs under the stars. |
| 6 | MISSING stickers clipped / overlapping | all | FIXED | Width estimate was too small, so stickers overlapped and ran off the right edge; now `(chars+8)*6+8`. |
| 7 | Touch targets >= 44 | all | PASS | Back 48, pause 48, arrows 56, tool tiles 64 high, panel buttons 64 / 48. |
| 8 | Safe areas (top 48, bottom 32) | all | PASS | Only back / title / pause (y 56) in the top band; tools end at HB-32. |
| 9 | 8 px grid, 16 px margins | all | PASS | Audited from column X0. Centred items may sit on a 4 px half step (N1). |
| 10 | Min text 12 px, contrast | all | PASS | Smallest text is 12 px. White on dark plates, ink on cream, outlined white on green / gold. |
| 11 | Text fit inside plates | all | PASS | After the stricter border check (fix 2), 0 hits. |
| 12 | Layer overlaps | all | PASS | Remaining overlaps are intentional: chips over toolbox / tray bottom, flying screw, sparkles, tutorial hand over screws, danger glow, modal over HUD. |
| 13 | Layer order | all | PASS | Matches SPEC: bg 0 / light 2, spotlight 40, stage 50, boxes + tray 60, chips 62, bubbles 64, hand 65, FX 66, danger vignette 70, HUD / tools 80, dim 90, panel 92. |
| 14 | Icon / screw consistency | all | PASS | One screw drawing for tray, box, flying and object; 4 shapes x 4 colours (colour-blind safe); one plate style; one star asset. |
| 15 | Modal states read apart | all | PASS | Win: red ribbon, gold rays, lit stars, green chips. Fail: grey ribbon, grey object, empty stars, red chips. |

## Notes (accepted, not open)

- N1. Centred items (title, row chip, panel buttons) sit on a 4 px half step where C minus the width is not a multiple of 16.
- N2. The Bell is tall: in the screws state at 360x780 the object is 104x144 (screw heads about 14 px), because the 72 px legend takes stage height. Legend is a teaching state. Real tap areas in the game need their own hit slop.
- N3. Font fallback (Arial Black) is used where Lilita One is not installed; real text is narrower, so fits are worst case.
- N4. Behind the win / fail dim, the HUD plates are partly covered by the ribbon (BONUS plate text). That is intended modal layering.

## OPEN items

None.

## Art still missing (for the Asset Breaker, NEEDS-ART)

`tool_icon_broom / hammer / drill` (32x32 in a 64 px tile), `tool_tile_green`, glossy `screw_head_R/U/Y/G`, `star_empty`. Placeholders stay magenta-marked.

## Files changed

- `art-candidates/mockups/screw-yard/index.html` (fixes, stronger audit, `nobub` control switch)
- `art-candidates/mockups/screw-yard/screwyard_*.png`, `annotated_*.png` (re-rendered)
- `docs/art/mocks/screw-yard/PIXEL_CHECK.md`, `docs/art/mocks/screw-yard/before/*.png`
