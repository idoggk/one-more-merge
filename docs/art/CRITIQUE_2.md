# CRITIQUE 2: harsh art-director pass over the art run v2 (UI kit)

Date 2026-10-13, task t-51240626. Default verdict REDO; if in doubt REDO. Scale is 1-20 here (the 40-point rubric of PROMPT_PACK_V2 section 2, halved); CRITIQUE_1 used 1-10, so do not compare raw scores. Thresholds used: **PASS 18-20, REDO 14-17, REJECT 1-13**, any critical failure caps the score at 13.

## What was judged

The art run v2 so far has produced **23 final UI-kit assets** (R01 to R04 plus the grey button of R05) across four branches. Newest version of each asset was judged; superseded v01 versions only for the "what improved" comparison.

| Branch | Task | Content |
|---|---|---|
| `orch/t-6c0936d5-art-run-v2-batches-r01-r02-ui-ki` (4fe48ac) | R01-R02 | 12 sheets v01: panels std/card/popup/well, toast, tooltip, ribbons gold/red/blue/green/purple/event |
| `orch/t-e764e76a-art-run-v2-redo-the-r01-r02-fail` (07e0d4c) | redo | well + ribbons gold/red/blue/green regenerated (v02), event ribbon regenerated in the later branch |
| `orch/t-fc1b0b06-art-run-v2-finish-the-ribbon-and` (3e9b9b7) | R03 | well, ribbons gold/red/purple/event "accepted", 6 bars generated and sliced |
| `orch/t-21a496ce-art-run-v2-batches-r04-r05-ui-ki` (602adb8) | R04/R05 | slider track and knob, two tabs, grey button. **btn_yellow and the rest of R05 are missing** |

Method: every contact sheet, every sliced PNG and every raw sheet that decides a verdict was opened. Each asset was also rendered at 110 px and 70 px on cream and mid grey, in grayscale, and on magenta (fringe and white-leftover check), plus 5x corner zooms of the panel, purple ribbon, well and xp bar. Metrics (canvas fill, aspect, saturation, luminance) and the slicer `gates.json` back the eye. Compared with: the CRITIQUE_1 verdict on the v01 of the same asset, the in-game originals (`src/assets/art/btn_green`, `btn_blue`, `ui_ribbon`, `ui_card`, `ui_console`), and the UI kit v3 mockups (`art-candidates/screens-v3` shots 05, 15). The v3 kit is the standard: thick dark-brown outline, glossy enamel face, gold bezel, rivets, pill silhouettes with a visible lip.

## Pass rate versus pass 1

| | PASS | REDO | REJECT | Total | Pass rate |
|---|---|---|---|---|---|
| **Art run v2 (this pass)** | 7 | 13 | 3 | 23 | **30%** |
| Pass 1, everything | 113 | 72 | 7 | 192 | 59% |
| Pass 1, same categories (B08 panels, B09 ribbons, B10 buttons, B11 bars, B12 toggles/tabs) | 6 | 21 | 3 | 30 | 20% |

The honest comparison is the last row: on the **same UI-kit categories the pass rate rose from 20% to 30%**, not above the 59% headline. The 59% included easy categories (chests, system icons). Average score now 15.0 of 20 (pass 1 average 6.6 of 10); no asset scores 19 or 20. Nothing here is "native to a top-tier mobile game" yet: the best pieces (card panel, blue/green plaques, tabs, knob) are at the level of the in-game originals, not above them.

Per batch:

| Batch | Pass | Redo | Reject | Pass rate |
|---|---|---|---|---|
| R01 panels (std, card, popup, well) | 1 | 3 | 0 | 25% |
| R02 toast, tooltip | 0 | 2 | 0 | 0% |
| R02/R03 ribbons (gold, red, purple, event, blue, green) | 2 | 3 | 1 | 33% |
| R03 bars (3 frames, 3 fills) | 0 | 5 | 1 | 0% |
| R04 slider, tabs (track, knob, active, inactive) | 3 | 0 | 1 | 75% |
| R05 grey button | 1 | 0 | 0 | 100% |

## Verdict tables

Columns: score /20, 70 px reads (Y yes, M marginal, N no), gate = slicer status (pass/warn/fail; v01 files carry only the old gate), one reason.

### R01-R02 panels, toast, tooltip

| Asset | Source | Verdict | Score | 70 px | One reason |
|---|---|---|---|---|---|
| `ui_panel_card` | v01 | **PASS** | 18 | Y | Thick gold bezel, four rivets, cream face; same family as the in-game `ui_card` and the v3 kit. Benchmark of the batch. Still no dark outline. |
| `ui_panel_popup` | v01 | REDO | 17 | Y | Nearly the same object as `ui_panel_std` with a thicker bezel; no header notch for a ribbon, outline is a soft brass edge, not the 4-5% dark outline. |
| `ui_panel_std` | v01 | REDO | 15 | Y | Thin brass edge, almost no dark outline, cream face is empty and flat; duplicates popup, weaker than the in-game `ui_card`. |
| `ui_panel_well` | v02 | REDO | 14 | M | Gold bezel straight onto navy with **no dark outline**, flat inner face with no depth; gate fail (aspect 2.59 vs 2.0, 10% halo). Better than v01 (66% halo, black outline), still not shippable. |
| `ui_toast` | v01 | REDO | 15 | M | Fixed gold end knobs on a pale cream pill that vanishes on a light screen; the 5:1 strip is fine but the face is blank and low contrast. |
| `ui_tooltip` | v01 | REDO | 14 | M | The pointer is a separate gold wedge floating under the frame, not fused to it; 40% of the canvas is empty; reads as two assets. |

### Ribbons

| Asset | Source | Verdict | Score | 70 px | One reason |
|---|---|---|---|---|---|
| `ui_ribbon_blue` | v02 | **PASS** | 18 | Y | Clean gold frame with four rivets, glossy blue, correct fill (88% wide, 15 px margin); gate warn only (3.56 vs 3.0). It is a plaque, not a ribbon, but it is the cleanest of the six. |
| `ui_ribbon_green` | v02 | **PASS** | 18 | Y | Same frame as blue in green (consistent, and green has good contrast to gold); gate warn (3.55 vs 3.0). |
| `ui_ribbon_red` | v02 | REDO | 14 | Y | Gate fail, aspect 4.95 vs 3.0; the frame is thinner and the rivets smaller than blue/green, so red does not match its siblings; red on red-orange gold hurts contrast. |
| `ui_ribbon_purple` | v01 | REDO | 14 | Y | Pill with side knobs, a different silhouette from the rectangular plaques; **176 magenta-ish pixels leaked** because a violet subject was keyed on magenta (the primer says use green); aspect fail 4.05. Never redone. |
| `ui_ribbon_event` | v02 | REDO | 14 | M | Lost the scroll tails that gave v01 its event identity; now a small plaque with brackets, only 36% of the canvas covered, near-white face on a light UI. Better crop, worse idea. |
| `ui_ribbon_gold` | v02 | **REJECT** | 10 | M | Flat orange-gold bar with no trim, no rivets, no outline: it looks like a button, not part of the kit; gate fail aspect 4.7 vs 3.0. Failed after two attempts. |

### Bars (R03): raw art is good, the shipped slices are not

| Asset | Source | Verdict | Score | 70 px | Gate | One reason |
|---|---|---|---|---|---|---|
| `bar_hp_frame` | v01 | REDO | 14 | N | warn | Raw sheet (rounded red tube, brass caps, dark window) is good, but the shipped PNG is a 92x15 px object in a 256x23 canvas; at 70 px it is a hairline. Re-slice. |
| `bar_loading_frame` | v01 | REDO | 14 | N | warn | Same story; near-identical to hp frame (only the window is a bit taller). |
| `bar_xp_frame` | v01 | **REJECT** | 12 | N | fail | Third copy of the red tube: hp, xp and loading are interchangeable, so the xp bar has no identity; halo fail 8.2%; same tiny slice. |
| `bar_fill_green` | v01 | REDO | 15 | N | pass | Raw fill is correct (rounded left cap, square right edge, gloss strip, can be cropped to a percentage). Shipped as 84x11 px in a 256 canvas, so no usable fill. |
| `bar_fill_yellow` | v01 | REDO | 14 | N | pass | Same: good raw, tiny shipped slice; yellow vs gold bezel will be low contrast. |
| `bar_fill_red` | v01 | REDO | 14 | N | pass | Same; red fill in a red frame will disappear, the frame needs a different colour. |

### R04-R05 slider, tabs, button

| Asset | Source | Verdict | Score | 70 px | Gate | One reason |
|---|---|---|---|---|---|---|
| `ui_tab_active` | v01 | **PASS** | 18 | Y | pass | Green enamel with a raised centre bump, gold trim, rivets; reads as "selected". Canvas is a 256 square with the tab only 27% of it (trim problem of the slicer, not of the art). |
| `ui_tab_inactive` | v01 | **PASS** | 18 | Y | pass | Same silhouette in cream, clear active/inactive pairing; same canvas waste. |
| `ui_slider_knob` | v01 | **PASS** | 18 | Y | pass | Round gold ring, cream dome, dark outline, correct top-left light; the best-lit asset of the run. |
| `btn_grey` | v01 | **PASS** | 18 | Y | pass | Disabled button in the toy-enamel style of the v3 kit, 4:1 pill, rivets; the canvas is a 256 square with 28% fill (trim). |
| `ui_slider_track` | v01 | **REJECT** | 10 | N | fail | Same flaw as pass 1 (it was a REJECT then): 21 px tall, touches the top and bottom edges, 7.3:1 instead of the 12:1 asked for; a short capsule, not a track. |

## The worst offenders

| # | Asset | Score | Verdict | What is wrong |
|---|---|---|---|---|
| 1 | `ui_ribbon_gold` | 10 | REJECT | Plain gold bar with no trim; aspect fail; failed twice. |
| 2 | `ui_slider_track` | 10 | REJECT | Cropped 21 px sliver, wrong aspect (second time rejected). |
| 3 | `bar_xp_frame` | 12 | REJECT | Third identical red tube; halo fail; shipped 36% width. |
| 4 | all six bars | 14-15 | REDO | Good raw art destroyed or left unfixed at slicing: 84-92 px of art in a 256 canvas. |
| 5 | `ui_tooltip` | 14 | REDO | Disconnected pointer. |
| 6 | `ui_panel_well` | 14 | REDO | No dark outline, flat inside, gate fail. |
| 7 | `ui_ribbon_purple` | 14 | REDO | Magenta leak; wrong key colour; different silhouette. |
| 8 | `ui_ribbon_event` | 14 | REDO | Lost the scroll, near-white small plaque. |
| 9 | `ui_ribbon_red` | 14 | REDO | Frame does not match blue/green; aspect fail. |

## What improved (versus CRITIQUE_1 and v01)

1. **No more fixed-size "finished object" strips in the ribbons.** v01 ribbons touched the canvas edges and flared past it; v02 sits inside the canvas with margin and the end caps are small.
2. **Style drift is gone.** Every asset is brass, enamel and cream; no chrome, no cold steel, no photoreal. The cold-chrome xp frame of pass 1 (REJECT) is now warm red and brass.
3. **No white leftover in holes and no baked text** anywhere (`whiteInHoles` passes on all v02 files, no letters or numbers).
4. **Halo down sharply:** well 66% edge halo (v01) to 10%; ribbons 15-17% to 0% (blue, green, gold, red pass the halo gate).
5. **Aspect honesty:** the gates now tell the truth about aspect and stretchability, and the redo asked for what failed.
6. **New strong pieces:** tabs, knob and grey button are at or near the quality of the in-game originals; blue and green plaques are clean.
7. **Bars are conceptually right at last:** frame and fill are separate, fills have a rounded left cap and a cuttable right edge, which was the whole point of the pass-1 redo.

## What still repeats

1. **Wrong canvas use survives the slicer.** Bars: art is 84-92 px of a 256 px canvas (the slicer pads instead of trimming to the box and the strip kind did not enforce the 95% width rule). Tabs, button and knob sit in 256 px squares with 27-58% fill.
2. **Aspect is still wrong:** gold, red, purple (4-5:1 instead of 3:1), well (2.6 vs 2), slider track (7.3 vs 12), bars (9.4 vs 11). The prompt states the ratio, ChatGPT ignores it, and nobody enforces it before acceptance.
3. **Outline weight is below the style lock.** Panels, well, gold ribbon and toast have a brass edge with no 4-5% dark-brown outline; the v3 kit and the in-game buttons have one. The kit reads softer than the originals.
4. **Family drift inside a set.** Three ribbon frames (rectangle with rivets, pill with side knobs, plain bar, bracketed plaque), three red bar frames that look the same, panels std and popup nearly duplicate.
5. **Red-on-red and gold-on-gold:** red fill in a red frame, yellow fill next to a gold bezel, gold ribbon without a contrasting rim.
6. **"Ribbon" is not a ribbon.** The pass-1 redo asked for one idea per asset; the result is plaques, and the one real ribbon (event) lost its tails.
7. **Status drift:** the asset list marks gold, red, purple and event ribbons "accepted" although gold, red and purple fail the gate and the critic score is 10-14.
8. **Missing:** btn_yellow and the rest of R05 never arrived; R06-R13 and all N batches have not started.

## Did the primer, the magenta key and the tuned slicer fix the technical flaws?

| Fix | Verdict | Evidence |
|---|---|---|
| **Primer** (style lock, negatives, format rules) | **Mostly yes for style, no for geometry.** | Palette, materials and the no-text rule are respected on all 23 assets. Aspect and canvas-fill rules in the primer are ignored on about half. |
| **Magenta key** | **Yes, except where the subject is violet.** | No white holes, no baked backgrounds, clean edges on 20 of 23. Purple ribbon leaked 176 magenta pixels: the prompt should have used the green key, as the primer says. Halo is still above 8% on the well (10%) and the xp frame (8%). |
| **Tuned slicer** (despeckle, graded gates, profiles) | **Partly.** | The gates now separate pass, warn and fail honestly (aspect 29% off is a fail, a 14% miss is a warn), and despeckle removed specks. But it let through (a) bars shipped at 36% width, (b) 256 px squares for 4:1 buttons and tabs, (c) the ribbon redo marked accepted despite a gate fail, (d) the 1x/2x outputs are only 256 px wide, too soft for a 9-slice on a 3x phone. The R01-R02 v01 panels were never re-gated with the tuned slicer and still carry the old cell-border flags. |

## What to change in the prompts and the pipeline

1. **Slicer first:** trim every output to the object box with 2-4 px padding; for `--kind strip` reject any output where the object is under 90% of the canvas width and re-slice the existing raw bars (the raw bar sheets are good). Add a gate that fails when the object height is under 24 px at 1x. Re-gate panels, toast and tooltip with the tuned slicer.
2. **Acceptance rule:** an asset cannot become "accepted" when its gate is `fail` or its critic score is under 18; the asset list status must come from this file.
3. **Ask for the aspect twice and in pixels:** "exactly 3:1, the object is 1500 px wide and 500 px tall, touching the left and right edges of the 1536x1024 canvas". For strips, ask for a fixed-width tube ("slightly longer than you think") and crop in the pipeline.
4. **Outline sentence:** add to every UI prompt "dark chocolate-brown outline, 4-5% of the object height, around the outer brass edge too, like Image 1 (the btn_green original)". Attach `btn_green` or `ui_panel_card` as the outline reference.
5. **One family frame:** after the card panel, blue and green plaques are accepted, generate everything else (red, gold, purple, event) "with exactly the same frame as Image 1, only the face colour changes", or colour-shift blue/green in the pipeline instead of regenerating.
6. **Real ribbon:** event and gold ribbons are asked as "folded scroll banner with two swallow-tail ends and a flat centre", no plaque.
7. **Colour separation:** red frame needs a navy or cream window with a gold rim; the red fill goes into a dark navy window; the yellow fill gets a dark outline thicker than the others; gold ribbon gets a deep red-brown rim.
8. **Key colour:** violet, pink and purple subjects use the flat green key; state it in the prompt, not only in the primer.
9. **Bar frame variety:** hp = red tube with heart-free cap, xp = blue tube with round caps, loading = cream-and-brass long box; same family, three silhouettes.
10. **Slider track:** ask for a 12:1 groove drawn by the model as a thick tube (about 60 px high on the raw), then downscale, instead of the 21 px sliver.
11. **Tooltip:** "the pointer is part of the frame outline, one continuous contour".

## Redo list

`art-candidates/prompt-pack/redo-list.json` now carries a `pass2` block with every REDO and REJECT of this pass and its fix sentence (16 items), and a status summary. R05 remainders and the superseded v01 files need no entry.
