# Slicer fix 3: trim to the object, strip fill gate, v02 bar slices

Task t-2d95ddb9, 2026-10-13. Source finding: CRITIQUE_2 ("the six RAW bar sheets are good but the shipped bar slices are unusable: 84-92 px of art in a 256 px canvas").

## Root cause

`tools/slice-sheet.mjs` already cropped to the object box, then undid it while padding:

1. `pad` was a percentage of the **long** side and was applied to **all four sides**. A 1950 x 210 px bar got 156 px of margin above and below, so the canvas became 2262 x 522.
2. The canvas was then grown to the **requested aspect** (11:1 asked, 9.4:1 drawn), which stretched the width again: 522 x 11 = 5742 px. The object was 34 percent of the canvas width.
3. The canvas was then scaled to a 256 px long side, so a 1950 px bar became 88 x 11 px.
4. No gate looked at how much of the canvas the object used, so the sheet passed (`aspect` warn only, `coverage` measured against the raw cell).

## Fix (`tools/slice-sheet.mjs`)

- Trim to the object bounding box first. Strips pad by half the **short** side (8 percent of it by default), with a floor of about 8 px in the 2x output so a rectangular end never fills the corners. The strip canvas keeps the object's own shape: the requested aspect is judged by the `aspect` gate, never forced by growing the canvas. Panels also keep their own shape unless an aspect is requested; icon, unit and sheet cells stay square.
- New gate `fill`: strips fail when the object is under 90 percent of the output width; every other kind fails when its larger side is under 70 percent of the canvas. Exported as `fillGate(box, w, h, kind)` for tests.
- New gate `minHeight` (strips): fails when the object is under 24 px tall at 1x.
- Strips and panels export at 1024 px (PNG, 2x) and 512 px (WebP, 1x) instead of 256 / 128; the old size was too soft for a 9-slice on a 3x phone. `--size` still overrides.
- `--key green` (flat #00FF00) is supported, with a `keyLeft` gate for green-ish pixels, for violet, purple and pink subjects (CRITIQUE_2 change 8).
- All other tuned gates are unchanged (cellBorder, coverage, aspect, corners, alpha, keyLeft, halo, whiteInHoles).

## Tests (`tests/sliceSheet.test.ts`, section "trim to the object box and the fill gates")

- Regression: a 9.5:1 bar asked for 11:1 ends with the object at 90 percent or more of the canvas width (old code: 34 percent), `fill` passes, the PNG is 1024 px wide.
- A small object in a big cell is cropped to its box for panel, strip and icon.
- `fillGate` unit cases: the old shipped bars (88 px in 256) fail, 231/256 passes and 230/256 fails (90 percent edge), panels and units judged on the larger side.
- A hairline strip (3 px tall) fails `minHeight`.
- A pink-violet disc on the green key slices clean; on the magenta key the key gates trip.

## Re-sliced bars (`art-candidates/pack-v2/<name>_v02/`, new files; the old `*_v2` folders are untouched)

Command: `node tools/slice-sheet.mjs <raw> --grid 1x1 --key magenta --kind strip --aspect R:1 --names <name>_v02 --out art-candidates/pack-v2/<name>_v02` with the raw sheets from `art-candidates/pack-v2/raw/` of the art-run branches (t-fc1b0b06 / t-21a496ce).

| Asset | Gate | PNG (2x) | WebP (1x) | Object / canvas width | Aspect (asked) | Halo | Notes |
|---|---|---|---|---|---|---|---|
| bar_fill_green_v02 | PASS | 1024x88 | 512x44 | 98% | 14.01 (14) | 0 | |
| bar_fill_red_v02 | PASS | 1024x89 | 512x45 | 98% | 13.75 (14) | 0.6% | |
| bar_fill_yellow_v02 | PASS | 1024x90 | 512x45 | 98% | 13.57 (14) | 0 | |
| bar_hp_frame_v02 | WARN | 1024x123 | 512x61 | 98% | 9.45 (11), 14% off | 0 | aspect warn only: the model drew 9.4:1 |
| bar_loading_frame_v02 | PASS | 1024x131 | 512x66 | 99% | 8.75 (8) | 0 | |
| bar_xp_frame_v02 | PASS | 1024x109 | 512x55 | 98% | 10.82 (10) | 0 | halo was a FAIL (8.2%) in the old slice |

Before: 84-92 px of art in a 256 px canvas (hp frame 88 x 11 in 256 x 23). Now every bar is 1008 px of art in a 1024 px canvas, 44-66 px tall at 1x. A slice passing the gates is not an accepted asset: the critic scores were 12-15 (xp frame REJECT because it duplicates the hp frame) and the acceptance rule needs 18/20, so the frames go back to the critic and the hp / xp / loading frames still need the distinct regenerations listed in PROMPT_PACK_V2 section 11.

## Early R01-R02 outputs re-gated (v01 raws from branch t-6c0936d5, tuned slicer, `art-candidates/pack-v2/regate/`)

The v01 slices only carried the old gates (every one was flagged `cellBorder`; the well also coverage, aspect and halo; the toast whiteInHoles).

| Asset | Slicer kind, aspect | Gate now | PNG | Aspect | Fill | Remaining |
|---|---|---|---|---|---|---|
| ui_panel_std_v01 | panel 1:1 | PASS | 1024x1024 | 1.016 | 86% | - |
| ui_panel_popup_v01 | panel 1:1 | PASS | 1024x1024 | 1.02 | 86% | - |
| ui_panel_card_v01 | panel 4:5 | PASS | 819x1024 | 0.807 | 84% | - |
| ui_panel_well_v01 | panel 2:1 | **FAIL** | 1024x512 | 3.057 | 86% | aspect 53% off (the raw is 3:1, not 2:1); the 66 percent halo of the first pass is gone at this resolution |
| ui_toast_v01 | strip 5:1 | PASS | 1024x205 | 5.365 | 98% | - |
| ui_tooltip_v01 | panel 4:3 | **FAIL** | 1024x768 | 1.722 | 86% | aspect 29% off (plate plus detached pointer); the critic's "pointer floats" finding stands |

The old `cellBorder` flags came from the pre-tuning slicer; they are gone. The real defects the critic found (well aspect and bezel, tooltip pointer) are exactly what still fails. Panels at 84-86 percent fill carry the 8 percent pad on each side, which is inside the 70 percent panel gate.

## What this does not do

- It does not make any asset "accepted"; the acceptance rule (gate not FAIL and critic 18/20 or more) is in PROMPT_PACK_V2 section 4 and `asset-list-v2.json`.
- 9-slice inset export and S5 component segmentation from PROMPT_PACK_V2 section 6 are still not implemented.
