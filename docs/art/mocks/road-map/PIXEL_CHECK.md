# ROAD MAP mock: pixel check (step 2 of the mock chain)

Pixel Checker, mission m-f522637e, task t-1a8c93b7, 2026-10-15. Fixes were made directly in `art-candidates/mockups/road-map/index.html`; nothing in `src/` was touched. The 18 clean PNGs and 6 annotated PNGs in that folder were re-rendered (they are the AFTER shots).

**Verdict: PASS.** 0 OPEN items. 5 notes (N1 to N5) below are accepted limits, not defects; the missing-art list is at the end.

## How it was measured

`index.html?state=<s>&w=<W>&h=<H>&audit=1` now prints a machine check (tap size, safe area, off-screen clip, 8 px grid, tap overlap, screen-layer overlap, text under 12 px, text wider than its box). Run on all 6 states x 3 sizes = 18 runs. Result after the fixes: **CLEAN in 18 of 18**. Negative control: a copy with a 40 px gear and a too-wide tooltip was flagged (`TAP<44`, `TEXT-OVER`), so the audit does catch these faults. Contrast and look checks were done by eye on the renders.

Before shots (old render) are in `docs/art/mocks/road-map/pixel_check/before/` (7 files: normal at all three sizes, plus locked 360, chapter 360, rails 360, boss 430). After shots are the same file names in `art-candidates/mockups/road-map/`.

Phones: 360x780 (column C = 360), 390x844 (C = 384, X0 = 3), 430x932 (C = 424, X0 = 3). Note: at 360 the column is the whole width, so the SPEC value 352 was wrong.

## Check table

| # | Check | Sizes | Result | What was found / done |
|---|---|---|---|---|
| 1 | Bottom row, nav y on 8 px grid | all | FIXED | Bottom-anchored layers hung from `H` (844, 780, 932), so y was 4 off (chip, PLAY, nav, back pill). Now hang from `HB = floor(H/8)*8` (840 / 776 / 928); the 4 px slack sits inside the home-bar safe area. |
| 2 | x on 8 px grid (from column) | all | PASS | All tap targets sit on 8 from X0. Centred items (back pill, panel buttons, tab group) may sit on a half step (N1). |
| 3 | Nav tab widths | 430 | FIXED | Tab was 98 wide (off grid). Now `floor((C-32)/4/8)*8` = 80 / 88 / 96; the tab group is centred in the bar (inner pad 12 / 8 / 12). |
| 4 | Nav text fit, no collision | all | FIXED | MACHINE and EVENTS touched at 16 px and the NEW tag sat on the bar edge. Letter spacing 0, 14 px when the tab is under 88, tag moved to the tab corner. Text 84 of 88 px (fallback font is wider than Lilita One). |
| 5 | Touch targets >= 44 | all | FIXED | Gear 40 -> 48; wallet pills 40 -> 48 high; chapter plate 48 -> 56. All others >= 48 (badges 64x80, chip 64, PLAY 64, tabs 56, go 56). BACK TO ME pill is 32 visible with a 48 hit area (`data-hit`). |
| 6 | Safe area top 48 | all | PASS | Nothing interactive above y 56. Only the debug MISSING sticker sits in the band. |
| 7 | Safe area bottom 32 | all | PASS | Nav ends at HB-32 (808 / 744 / 896), 4 px clear of the home bar line. |
| 8 | Margins and gutters | all | PASS | HUD, plate, bottom row 16; rail badges 8 from the column edge (decoration weight, SPEC 2). Wallet-to-plate gap 8; plate-to-first-badge gap 8. |
| 9 | HUD stack | all | FIXED | Chapter chest poked 8 px over the plate and touched the gear. Plate is now 56 high (112 to 168), chest 48 sits inside. Rails moved 168 -> 176 (pitch 88 kept). |
| 10 | Badge: icon vs chip overlap | all | FIXED | The timer / count chip covered most of the icon (QUESTS, EVENT, SEASON). Icon moves up to y 4 when a chip is present, chip is centred at y 40 (48x16), label at y 64. Badge box stays 64x80. |
| 11 | Badge label text fit | all | FIXED | COLLECT / SEASON ran past the 64 px pill at 12 px + 0.3 tracking. Tracking 0 and overflow hidden; text now inside the pill. |
| 12 | Min text size 12 | all | PASS | Smallest text anywhere is 12 px (badge labels, chips, captions). Debug stickers excluded. |
| 13 | Text contrast | all | FIXED | Locked level numbers `#6d7a9b` on silver (about 3.6:1) darkened to `#4f5d82` (about 5.5:1). Others checked: ink on cream, white-outlined on green / purple, white on `#5d6d92` chips (5.3:1), `#6b4a2a` on cream (about 6:1): PASS. |
| 14 | Text outline on coloured plates | all | PASS | White text on green, purple, red uses the 2 px ink outline (`.outl`). |
| 15 | Locked toast vs BACK TO ME pill | 360, 390 | FIXED | Toast and pill touched; pill text `36` was clipped (144 wide). Pill 176 wide, 8 above PLAY; toast is capped to end 8 above the pill. |
| 16 | Chest L34 hidden under chapter plate | 360, 390 | FIXED | At 360 the road chest sat behind the plate. The current node is now placed at max(52% of H, 440), so the chest top clears y 168. |
| 17 | Boss view: L39 behind PLAY | 430 | FIXED | Boss focus 56% -> 53%; L39 now sits above the bottom row. |
| 18 | Dim layer order (rails state) | all | FIXED | The dim (z 81) left wallet bright and plate dim. Dim is now z 89: wallet, plate, PLAY row and nav are dimmed together; badges (90) and tooltip (92) stay lit. |
| 19 | Rails tooltip and legend | 360 | FIXED | Tooltip text overran its box; legend was 168 tall with text on the border. Tooltip spans X0+80 to the right rail minus 8 (8 px gap to both rails), text 14 / 12 px centred. Legend 120 tall, 4 centred 12 px lines, moved up to y 456 so it no longer overlaps the chapter chip and PLAY row. |
| 20 | Chapter panel title | 360, 390 | FIXED | MUSIC ATTIC at 36 px touched both panel edges. Now 32 px in a 24-inset box. |
| 21 | Overlaps between screen layers | all | PASS | 0 overlaps among wallet, plate, badges, chip, PLAY, back pill, toast, nav, tooltip, legend (audit). |
| 22 | Intentional overlaps | all | PASS | Number plate over platform, hero over platform, YOU tag over hero, chest chip over coin bottom: by design. |
| 23 | Clipping at the screen edge | all | PASS | No tap target leaves 0..W. Right-rail -50% tag ends 4 px inside the screen. |
| 24 | Layer order | all | PASS | Matches SPEC section 5: scenery 0, props 10, road 20, gate / banners 40, nodes 50, chests 55, hero 60, toast 62, Bolt 65, fog 70, plate 80, wallet 82, badges 84, bottom row 86, nav 88, dim 89/90, tooltip 92, panel 95, Bolt peek / confetti 96. Wallet pills (82) sit above the plate (80) they never touch. |
| 25 | Icon and badge consistency | all | PASS | Six badges share one coin (`badge_bell`), one 32 px icon box, same label pill, same chip, same dot. Chip-less badges (DAILY, COLLECT) put the icon at y 12; chip badges at y 4, so icon centres differ by 8 (N2). |
| 26 | Rank / readability rules | all | PASS | Node states differ in 3 ways: colour (green / white-blue / gold hero), size (80x96 done, 88 locked, 176 platform), star pips. Done, current, locked and boss read apart in grayscale (done dark ring, locked pale, hero gold plate). Unit ranks are not part of this screen. |
| 27 | Road scroll-under | 360 | PASS (N3) | Node 31 sits half under the PLAY scrim at 360. Scrolling content passing behind the bottom row is normal; the current node and the next two are fully clear. |

## Notes (accepted, not open)

- N1. Centred items (back pill, panel buttons, nav tab group at 360 and 430) land on a 4 px half step because C minus the item width is not a multiple of 16. Visual centring wins over the grid there.
- N2. Chip-less badges (DAILY, COLLECT) have the icon 8 px lower than chip badges. If the final badge art has a chip slot built in, remove this offset.
- N3. At 360x780 the road viewport is about 4 nodes; node 31 is partly hidden by the PLAY row.
- N4. The mock still renders in Arial Black (Lilita One not installed); real text is narrower, so every fit above is the worst case.
- N5. The legend text is 12 px caps with 0 tracking at 360; that is the minimum allowed size.

## OPEN items

None.

## Art that is still missing (the Asset Breaker should list these as NEEDS-ART)

Unchanged from SPEC section 8; the placeholders are still magenta-marked, so none of them blocks PASS on layout:

1. `rail_badge_frame` (round medallion with label ribbon, dot, chip slot, % tag). Needed size 64x80 per badge, chip slot 48x16 at y 40, icon box 32x32.
2. `bolt_pose_*` (idle, hop, point, peek, worried), about 64x72 each.
3. `road_surface_kit` (path material, endcaps, junctions), 40 px surface and 56 px outline widths.
4. `gate_arch` closed and open, 224x128.
5. `scenery_ch4_panel`, `scenery_ch5_panel` (one tall painted panel per chapter, no tiling), plus `scenery_ch5_card` 272x120.
6. `prop_sheet_ch4`, `fog_banks`, `avatar_platform` (normal 176x56, boss 224x72).
7. Dedicated rail icons (quests, collection, daily, event, offer, season) 32x32, and a settings gear.
8. Cool-blue locked variants of `node_locked` and `node_boss` (now a CSS hue-rotate).

## Files changed

- `art-candidates/mockups/road-map/index.html` (fixes plus `?audit=1`)
- `art-candidates/mockups/road-map/roadmap_*.png`, `annotated_*.png` (re-rendered)
- `docs/art/mocks/road-map/PIXEL_CHECK.md` (this file), `docs/art/mocks/road-map/pixel_check/before/*.png`
- `docs/art/mocks/road-map/SPEC.md` (section 2 anchors updated)
