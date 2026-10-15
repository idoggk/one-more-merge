# Screw Yard painted v2: GPT-image batch (13 assets)

Source: ChatGPT, one chat, style master = `v2_02_mid.png` (branch orch/t-640f9aa7-painted-screw-yard-mocks-fix-01). Prompts are from `docs/art/mocks/screw-yard/ASSETS_PAINTED.md` (branch orch/t-c006287d-asset-breaker-screw-yard-painted), lightly shortened. Each sheet was generated once (no redo needed). Not critic-reviewed yet; nothing here is wired into `src/`.

Raw ChatGPT output is in `raw/`; keyed, trimmed, padded sprites (`.png` = 2x, `.webp` = 1x) are in `sliced/<group>/` with `gates.json` and contact sheets. Key: magenta, `--tol 100` (the default tolerance left a magenta-tinted baked shadow under the objects).

| manifest id | file | raw sheet | notes |
|---|---|---|---|
| tool_icon_broom | sliced/tool_icons/tool_icon_broom.* | raw/sy_tool_icons_sheet.png (cell 1 of 3) | gates pass |
| tool_icon_hammer | sliced/tool_icons/tool_icon_hammer.* | same (cell 2) | gates pass |
| tool_icon_drill | sliced/tool_icons/tool_icon_drill.* | same (cell 3) | gates pass |
| tool_icons_sheet | raw/sy_tool_icons_sheet.png | | the sheet itself |
| tool_tile_cream_brass | sliced/tool_tile/tool_tile_cream_brass.* | raw/sy_tool_tile_sheet.png (cell 1) | gates pass |
| tool_tile_cream_brass (pressed) | sliced/tool_tile/tool_tile_cream_brass_pressed.* | same (cell 2) | pressed is not visibly 3% smaller; scale it in code |
| btn_round_brass_base | sliced/btn/btn_round_brass_base.* | raw/sy_ui_sheet.png (top left) | gates pass |
| btn_round_brass_base (pressed) | sliced/btn_pressed/btn_round_brass_base_pressed.* | same (top right) | gates pass |
| plate_plum_brass | sliced/plate/plate_plum_brass.* | same (middle) | gates pass; plate has scalloped ends, nine-slice caps must keep them |
| star_empty | sliced/star/star_empty.* | same (bottom) | gates pass; brown, readable vs lit gold star |
| cannon_stage_blank | sliced/cannon_stage/cannon_stage_blank.* | raw/sy_cannon_stage_blank.png | halo gate FAIL = false positive (light wood and brass at the rim); looks clean on dark and light. About 14 holes are visible, not exactly 12: Pixel Checker must measure hole centres |
| coil_stage_blank | sliced/coil_stage/coil_stage_blank.* | raw/sy_coil_stage_blank.png | gates pass; hole count about 14, to be measured. Reference was `coil_5.webp` |
| bell_stage_blank | sliced/bell_stage/bell_stage_blank.* | raw/sy_bell_stage_blank.png | gates pass; reference was `bell_5.webp` |
| result_hero_pieces_cannon | sliced/win_pieces/result_hero_pieces_cannon.* | raw/sy_win_pieces_cannon.png | halo gate FAIL = same false positive; pieces differ a bit from the blank cannon (carriage blocks), no screws |
| sy_backdrop_painted | raw/sy_backdrop_painted.png (852x1846, no key) | | full page, calm centre, busy corners; bottom is fairly bright, check contrast against screws (critic #83) |

Not done: critic pass, resizing to manifest sizes (348x280 etc.), hole measurement.
