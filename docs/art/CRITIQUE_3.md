# CRITIQUE 3: harsh art-director pass over the slicer-fix-3 outputs

Date 2026-10-13, task t-ad53ce5c. Default verdict REDO. Scale 1-20 as in CRITIQUE_2 (the 40-point rubric of `PROMPT_PACK_V2.md` section 2 halved). **PASS 18-20, REDO 14-17, REJECT 1-13**, a critical failure caps the score at 13. Compared with: CRITIQUE_2 (branch `orch/t-51240626-harsh-critic-pass-2-judge-art-ru`), the in-game originals (`src/assets/art/res_bar`, `btn_green`, `ui_ribbon`, `ui_card`), the UI kit v3 mockup bars (`art-candidates/screens-v3/assets/bar_*`, branch `orch/t-9a3d84f9-ui-kit-v3-fixes-full-screen-mock`).

## What was judged, and what was not found

| Source | Branch | Content |
|---|---|---|
| slicer3 | `orch/t-2d95ddb9-slicer-fix-3-trim-to-the-object` (7602731) | 6 `*_v02` bar slices (3 frames, 3 fills) and 6 re-gated v01 pieces (`regate/`: panels std, popup, card, well, toast, tooltip) |
| "redo run" | **not found** | No branch after 7602731 exists (the newest `pack-v2` content is slicer3 itself, and `t-21a496ce` has 4 v02 files that are older). Nothing was regenerated after CRITIQUE_2: the six bar slices and six panel pieces are the **same ChatGPT art** as before, only re-cut. The pass-2 redo requests (distinct hp/xp/loading frames, gold/red/purple/event ribbons, slider track, tooltip, well) are therefore **still open**. If a redo branch exists under another name, give me the branch and I will judge it. |

Method: all 12 PNGs opened at full size; each rendered at 110 px and 70 px on cream and navy, in grayscale, and on magenta; bars also tested **as a pair** (each fill cropped into a frame window at 55%); side by side with the in-game originals and v3 mockup bars. The 12 `regate` and `_v02` files are not new art, so for them the verdict is a carry-over of CRITIQUE_2 unless the slice itself changed it.

## Did slicer fix 3 work? Yes, for the cut

Bars were 84-92 px of art in a 256 px canvas (CRITIQUE_2). Now the art fills 98% of a 1024 px wide canvas, 88-131 px tall, no halo, magenta fully gone, no cell-border flags. The structural defect that made every bar unusable is fixed and the bars survive the crop test (fill) and the stretch test (frame). It is the one clear improvement of this pass.

## Verdict tables

Columns: score /20, 70 px reads (Y/M/N, judged on the long side, bars are inherently thin), gate, one reason.

### Bars (the real subject of this pass)

| Asset | Verdict | Score | 70 px | Gate | One reason |
|---|---|---|---|---|---|
| `bar_fill_green_v02` | **PASS** | 18 | M | pass | Round left cap, flat cuttable right end, gloss strip, dark green outline; reads in a frame window (tested) and survives 70 px as a bright line. |
| `bar_fill_yellow_v02` | **PASS** | 18 | M | pass | Same construction, best contrast of the three inside the dark window; slight mottled texture, outline a little thin but clean. |
| `bar_hp_frame_v02` | REDO | 17 | M | warn (9.45 vs 11) | Strongest frame (red enamel tube, brass end caps with rivets, dark window) but the window is flat charcoal, the dark outline is thin next to the 4-5% style lock, and aspect still 14% short of the ask. |
| `bar_loading_frame_v02` | REDO | 14 | M | pass | The same red tube as hp, only 7% taller; no loading identity (the pass-2 request was "cream and brass long box"); dull next to the v3 mockup. |
| `bar_fill_red_v02` | REDO | 15 | N | pass | Good fill, wrong colour for this kit: inside the red frames (all three) it merges with the tube rim (pair test). Fine in a dark-window frame, which does not exist yet. |
| `bar_xp_frame_v02` | **REJECT** | 13 | M | pass | Still the third copy of the red tube (a thin gold inner line is the only difference); no identity for XP; critical failure X3 (duplicate), same reason as pass 2. |

### Re-gated panels, toast, tooltip (art unchanged since pass 2, only re-cut)

| Asset | Verdict | Score | 70 px | Gate | One reason |
|---|---|---|---|---|---|
| `ui_panel_card_v01` | **PASS** | 18 | Y | pass | Gold bezel, rivets, cream face; still the benchmark; outline slightly thin. Now 1024x819 and uncropped. |
| `ui_panel_popup_v01` | REDO | 17 | Y | pass | Near-duplicate of std with a thicker bezel, no header notch, soft brass edge. |
| `ui_panel_std_v01` | REDO | 15 | Y | pass | Thin brass line, no dark outline, empty flat cream face; weaker than the in-game `ui_card`. |
| `ui_panel_well_v01` | REDO | 14 | M | **fail** (aspect 3.06 vs 2) | Pale-gold bezel straight onto navy, no dark outline, flat inner face. The v02 well of the art run is the better version; this file should be dropped, not re-gated. |
| `ui_toast_v01` | REDO | 15 | M | pass | Best-made strip of the set (brass caps, dark outline) but the cream face is blank and low contrast on a cream screen. |
| `ui_tooltip_v01` | REDO | 14 | M | **fail** (aspect 1.72 vs 1.33) | The pointer is a loose gold wedge under the frame, not one contour; still two objects. |

## Pass rate versus pass 1 and pass 2

| | PASS | REDO | REJECT | Total | Pass rate |
|---|---|---|---|---|---|
| **Pass 3 (this), all 12** | 3 | 8 | 1 | 12 | **25%** |
| Pass 3, the 6 bars only (same bars as pass 2) | 2 | 3 | 1 | 6 | **33%** (pass 2: 0 of 6) |
| Pass 2 | 7 | 13 | 3 | 23 | 30% |
| Pass 1 | 113 | 72 | 7 | 192 | 59% |

Honest reading: the bars went from 0 of 6 to 2 of 6 **only because the slice was fixed**; no new art exists. The overall pass rate (25%) is below pass 2 (30%) because this set deliberately has no new tabs, knob or buttons to pad it. Average score 15.7 of 20 (pass 2: 15.0). Nothing scores 19 or 20.

## Family resemblance: do the pieces look like one kit?

Partly. Shared: brass end caps with two rivets, enamel gloss, dark outline, upper-left light. These tie the bars to the toast, panels and in-game ribbon. What breaks the family:

1. **Window colour.** The in-game bar (`res_bar`) and the v3 mockup frames use an ivory window inside a brass tube; the v02 frames use a flat charcoal window inside a red tube. A charcoal well is not in the cream / brass kit and makes the bars the heaviest, darkest objects of the UI set.
2. **Frame material.** Panels, toast and ribbons are brass; the bars are red enamel with brass only at the caps. The v3 kit bars were all brass or silver with different cap shapes; the red tubes lost that variety and became one repeated object.
3. **Outline weight.** The in-game originals carry a thick chocolate outline; bars, panels, well and toast carry a thin one. The kit still reads softer than the originals.
4. **Three bars, one silhouette.** hp, xp and loading are the same object at three heights. Pass 2 asked for three silhouettes; nobody regenerated.
5. **Red on red.** Red fill disappears in a red frame.

Not yet in the picture at all: the buttons (only grey, blue, green exist), the yellow button, ribbon gold/red/purple/event, slider track, and the whole R06-R13 range. Buttons, panels, ribbons, bars, slider and tabs cannot be judged as one kit while half the set is missing or rejected.

## Set-level verdict

**REDO. Nothing here is ready for the owner as a "premium" set.** What can be shown now, as a small honest "bar fills" sample: `bar_fill_green_v02` and `bar_fill_yellow_v02` (paired with `bar_hp_frame_v02`, which reads well as a pair but is not accepted). `ui_panel_card` stays the panel benchmark. Everything else is a work in progress.

What still repeats since pass 2: (1) duplicate frames (xp / loading = hp); (2) aspect ignored by the model (hp 9.45 vs 11, well 3.06 vs 2, tooltip 1.72 vs 1.33); (3) soft outlines below the 4-5% lock; (4) colour collision (red fill in red tube, gold on gold); (5) status drift: asset lists must follow this file, not the slicer gate; (6) missing pieces: no redo run exists.

## Next actions (in order)

1. Run the actual redo (ChatGPT): three **different** frames (hp = red tube with a navy or ivory window, xp = blue tube with round caps, loading = cream-and-brass long box), same family frame as `ui_panel_card`, outline sentence and `btn_green` as the outline reference (see the pass-2 `promptFix` entries, unchanged).
2. Keep `bar_fill_green_v02` and `bar_fill_yellow_v02`; make a red fill with a bright rim outline for an ivory or navy window.
3. Drop `ui_panel_well_v01` and `ui_tooltip_v01` from the asset list; use the v02 well or regenerate; tooltip pointer must be one contour.
4. Ribbon gold / red / purple (green key) / event, slider track, btn_yellow and R05 are still outstanding; the run must finish before another critic pass is useful.

## Redo list

`art-candidates/prompt-pack/redo-list.json` carries a new `pass3` block with all 12 judgments and the carried fix sentences.
