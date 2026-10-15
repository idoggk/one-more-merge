# Owner art review v9c (v9b + UNIT STYLE TEST group first; built by tools/build-owner-review-v9c.mjs from a copy of v9b)

Open `index.html` (phone friendly, 390 px wide, dark and light mode, no external requests). Built by `node tools/build-owner-review-v9.mjs` (reads HEAD and the batch branches with git, needs `npm ci` for sharp).

- v9 groups first: painted mocks (8 full-page images, CRITIQUE_85 and 86), then 6 piece groups with 164 pieces, each with the latest critic verdict chip (KEEP / FIX / REDO, grey = none found).
- Earlier groups are the v8 pages, unchanged (copied from branch `orch/t-aad78cee-owner-review-page-v8-everything`).
- LIKE / NOT per piece as in v8, plus a free comment box on every group page. Export JSON now has a `comments` object next to `votes` and `reasons`.
- Verdict chips for the new pieces: KEEP 125, FIX 30, NEW 17.

Files: 193 in this folder (limit: 255 per publish call, 511 per artifact). Total size 18.8 MB.

## Not included yet
- Assembled (non-painted) mocks: the 8 winding-road sheets and the assembled badge sheet.
- Road map v1 pieces replaced by v2/v3/v4/leftovers: 12 (clouds, ch4 scenery, kit pieces).
- Road map v2 pieces replaced by v3, v4 or the final leftovers: 12.
- Map badge batch 2 pieces redone in v2: 13.
- Road map slices v1 (v2 replaced them), first Screw Yard 3D set and intermediate renders (only the final red-fixed set).
- Screw Yard GPT v1/v2 pieces where v3 exists: 16.
- Chapter 6 strip kit v1, chapter 4 and 6 first road kits, ch7/ch8 panel tries (v4 entrances shown instead).
- Unit art: you said it is too detailed and hard to identify; being redone in a new simpler style (see the Style test group when ready).
- 20 other pieces whose latest verdict is REDO and were not redone (named below).
- The old "Being redone" page (24 FIX pieces) and raw sheets, contact sheets and duplicates.
- Kept: every older group that is not superseded or decided yet (popups, HUD, offers, nodes, panels, resources...).
- Rank pieces in the v8 Unit ranks page that the fix batch replaced are still inside that page (atlas not re-cut).
- CRITIQUE_87 as a separate doc is the first 3D render critique (HEAD docs/art/mocks/screw-yard/RENDER_CRITIQUE.md); later verdicts (91) win.
- Screw Yard backdrop and the win hero pieces from v2 are still open in CRITIQUE_98 (backdrop REDO), no new picture exists.
- Chapter 7/8 panel tries have verdicts only for the two try2 pictures (REDO); other tries show "no verdict".
- Pieces whose critic doc line could not be matched show UNJUDGED (list below).
- Map badge v2 contact sheets, raw sheets and @2x files are left out on purpose (pieces only).

## Known weak, being redone (20)
- ring_segment_lit (v1 first pass): Ring segments REDO.
- ring_segment_unlit (v1 first pass): Ring segments REDO.
- neon_cube_mix (v1 first pass): do not use; replaced by sheet 8. 36-41% semi-transparent, invisible on light. Delete from the folder once sheet 8 cubes are accepted.
- neon_cube_pink (v1 first pass): do not use; replaced by sheet 8. 36-41% semi-transparent, invisible on light. Delete from the folder once sheet 8 cubes are accepted.
- neon_cube_mix (v1 first pass): do not use; replaced by sheet 8. 36-41% semi-transparent, invisible on light. Delete from the folder once sheet 8 cubes are accepted.
- neon_cube_pink (v1 first pass): do not use; replaced by sheet 8. 36-41% semi-transparent, invisible on light. Delete from the folder once sheet 8 cubes are accepted.
- road_ch4_cap (v1 first pass): Flat street-tile kit, not the mock ribbon (whole kit REDO).
- road_ch4_curve_bl (v1 first pass): Flat street-tile kit, not the mock ribbon (whole kit REDO).
- road_ch4_curve_br (v1 first pass): Flat street-tile kit, not the mock ribbon (whole kit REDO).
- road_ch4_curve_tl (v1 first pass): Flat street-tile kit, not the mock ribbon (whole kit REDO).
- road_ch4_curve_tr (v1 first pass): Flat street-tile kit, not the mock ribbon (whole kit REDO).
- road_ch4_h (v1 first pass): Flat street-tile kit, not the mock ribbon (whole kit REDO).
- road_ch4_t_down (v1 first pass): Flat street-tile kit, not the mock ribbon (whole kit REDO).
- road_ch4_t_left (v1 first pass): Flat street-tile kit, not the mock ribbon (whole kit REDO).
- road_ch4_t_right (v1 first pass): Flat street-tile kit, not the mock ribbon (whole kit REDO).
- road_ch4_t_up (v1 first pass): Flat street-tile kit, not the mock ribbon (whole kit REDO).
- road_ch4_v (v1 first pass): Flat street-tile kit, not the mock ribbon (whole kit REDO).
- nav_icon_machine (Slices): REDO
- sy_backdrop_painted_dim (v2): Looks the same as before: the bottom third is still bright orange with sharp loose screws in all corners and a sharp blueprint. The baked dim is barely visible in the bottom third. Screws...
- result_hero_pieces_cannon (v2): Not regenerated. Carriage blocks and the red block differ from the final stage; barrel has 7+ holes and the stage has 6. A player would see a different cannon from the one built.

## No verdict found (0)
- none
