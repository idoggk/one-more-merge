# Screw Yard GPT pieces v2 (CRITIQUE_94 applied)

Source critique: `docs/art/CRITIQUE_94.md` (branch orch/t-a8cb7b37-critic-the-13-gpt-screw-yard-pie). Source batch: `art-candidates/screw-yard-new/` (branch orch/t-5c263b0f-chatgpt-batch-the-13-gpt-image-s). Nothing here is wired into `src/`. Not critic-reviewed yet.

`raw/` = full 1254 px ChatGPT sheets (v1 sheets copied from the old batch, `*_v2.png` generated in this task). `ref/` = style references uploaded to ChatGPT (painted mock v2 images from branch orch/t-640f9aa7-painted-screw-yard-mocks-fix-01, 3D contact sheet from orch/t-d8a0d462-3d-screw-yard-renders-punchy-red, old cannon sprite). `sliced/<group>/` = keyed, trimmed, padded sprites: `.png` is 2x (the shipped size), `.webp` is 1x. Key magenta, `--tol 100`, `tools/slice-sheet.mjs`.

| piece | verdict in 94 | what was done | file | PNG size (2x) |
|---|---|---|---|---|
| tool_icon_broom / hammer / drill | KEEP | re-sliced from the 1254 raw sheet at 2x (96 css) | sliced/tool_icons/ | 192x192 |
| tool_tile_cream_brass | KEEP | re-sliced at 2x | sliced/tool_tile/ | 224x212 |
| tool_tile_cream_brass_pressed | FIX | same sprite scaled to 94% and 10% darker (script, not regenerated) | sliced/tool_tile/ | 224x212 |
| btn_round_brass_base | KEEP | re-sliced at 2x | sliced/btn/ | 192x192 |
| btn_round_brass_base_pressed | FIX | 94% scale, 10% darker | sliced/btn_pressed/ | 192x192 |
| plate_plum_brass | FIX | re-sliced at 2x (528 wide). Real shape is 4.3:1, slot is 5.5:1: nine-slice caps must be about 140 px of 1024, test at 264x48 | sliced/plate/ | 528x123 |
| star_empty | FIX | re-sliced and darkened 12% so it reads empty beside the gold star | sliced/star/ | 64x64 |
| cannon_stage_blank | FIX | re-sliced from the 1254 raw at 2x. It has 12 brass-ringed holes (counted: 6 barrel, 1 bracket, 2 upper carriage, 2 lower carriage, wheel hub) so the "about 14" was wrong | sliced/cannon_stage_blank/ | 696x696 (object fills the 696x560 box; canvas is square) |
| coil_stage_blank | REDO | regenerated (1 try) with the cannon sprite + mock + 3D sheet + old coil as references. Painted-3D style now matches the cannon; about 12 holes (5 petal ends, ball, 3 spring, base) | sliced/coil_stage/ | 696x696 |
| bell_stage_blank | REDO | regenerated (1 try), golden brass frame, 5 bells; about 12 holes, frame colour no longer cream | sliced/bell_stage/ | 696x696 |
| result_hero_pieces_cannon | FIX | re-sliced from raw at 2x only, NOT regenerated (budget: lease released after 2 sheets) | sliced/result_hero_pieces_cannon/ | 640x640 |
| sy_backdrop_painted | FIX | not regenerated; added the critic's code-style dim as a baked variant: brown overlay 0% at 55% height rising to 38% at the bottom (`sliced/backdrop/sy_backdrop_painted_dim.*`, 780x1688 webp). The original stays in `raw/` | sliced/backdrop/ | |

`contact-stages-dark.png` / `contact-stages-light.png`: cannon, coil, bell, win pieces side by side (the family check).

## Still open (browser lease released after 2 sheets)

1. result_hero_pieces_cannon: one GPT try with the final cannon stage sprite attached ("the same cannon taken apart"), since carriage blocks differ a little from the stage. Halo gate warns 7.5% (light wood and brass, false positive as in 94).
2. sy_backdrop_painted: redo with softer depth of field only if the dim overlay looks muddy in game.
3. Pixel Checker: measure the 12 hole centres of each stage by tool. Hole counts here are by eye.
4. Critic pass on coil/bell (hole count, outline weight versus the cannon).
5. Pressed variants should still be scaled in code in game (0.94) if the baked ones are not used.
6. Stage canvases are square 696x696 (object padded), not 696x560; anchor by the object bbox.
