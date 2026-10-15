# Screw Yard GPT pieces v3 (CRITIQUE_96 applied)

Source critique: `docs/art/CRITIQUE_96.md`. Builds on `art-candidates/screw-yard-new-v2/` (KEEP pieces stay there: cannon, coil, tool icons, round buttons, empty star). Nothing is wired into `src/`. Not critic-reviewed yet.

Chat setup: one ChatGPT chat, a condensed primer (style lock, palette, key rule, format rules, READY), then references attached per piece (cannon stage, coil stage, painted mock v2 02 mid / 04 win; mocks copied to `ref/`). One try per piece, both accepted at first sight.

| piece | what was done | file | PNG size |
|---|---|---|---|
| bell_stage_blank | REGENERATED (1 try). Wood frame, base and posts like the cannon, brass bells, blue rod with red caps. Holes counted by eye: 5 top rail, 2+2 posts, 3 base = 12, none on the bells. Sliced with `tools/slice-sheet.mjs` (1x1, magenta, tol 100), all gates pass | sliced/bell_stage/ | 696x696 |
| win pieces (barrel, carriage, red block, blue bracket, 2 wheels) | REGENERATED (1 try) with the final cannon stage attached. The sheet layout is uneven (barrel crosses the equal 3x2 gutter), so it was cropped by hand-set column splits and each piece sliced 1x1; all gates pass. Barrel carries 6+ holes like the stage | sliced/win_pieces/<name>/ | 320 px class (see files) |
| tool_tile_cream_brass and pressed | DEFRINGED by script (magenta-tinted pixels within 6 px of the silhouette replaced by the nearest clean interior colour: 689 and 705 px). Checked by eye on cream: fringe gone | sliced/tool_tile/ | 224x212 |
| plate_plum_brass | code-only nine-slice (no regeneration), see CRITIQUE_96 | | |

Raw sheets (full size) are in `raw/`. Contact sheets: `contact-pieces-dark.png`, `contact-pieces-light.png` (6 win pieces, bell, cannon stage side by side).

## Still open (browser lease released after 2 sheets, as the contract says)

1. **sy_backdrop_painted: NOT regenerated.** Brief is in CRITIQUE_96 section 3 (dimmed calm wooden workshop, no loose screws in the lower 60%, clutter only in the top 35%, centre empty, 780x1688 portrait). Attach `ref/mock_v2_02_mid.png`. The v2 baked dim stays the fallback.
2. Pixel Checker: measure hole centres on the bell and the barrel.
3. Critic pass on bell and win pieces (family check, outline weight against the cannon).
4. Win pieces were not scaled to the stage's scale; fit them to the cannon's pixel scale in code.
5. No image-limit message appeared; the chat still has capacity for the backdrop.
