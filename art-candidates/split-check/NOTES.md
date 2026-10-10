# GameScene split vs origin/master: visual check (t-5426b756)

`master/` = origin/master (1631209), `split/` = this branch (merge of a98492c + origin/master). Same tool (`tools/shots.mjs`, 390x763 @2x), each from its own checkout with its own `npm ci`; PNGs here are halved to 390 wide.

Pixel compare of all 18 states at full size (threshold 8/255):
- Identical (0 px): qa_tools, level_result, s4_level1_result, pz_drills, units_shop.
- Tiny diffs, all in animated or non-deterministic regions: units_tab / u2_tab / units_all (card art shimmer), units_detail (the animated demo board), jobs_odds (400 px), result_win, wf_result10, shield11, mid_l15 (live board/boss animation), settings (only the build label line: it carries each checkout's own commit id and time).
- jobs_gold / jobs_iron / units_crate differ only in WHICH cards the crate rolled (crate rolls are not seeded); layout, odds button, frames and text positions are the same.

No layout, text, colour or position differences. Fonts matter: a first master run showed fallback fonts because its node_modules was a junction that Vite refused to serve; after a real `npm ci` in the master checkout both match.

Smoke: `PAGES=4 node tools/smoke-levels.mjs 1 80 3` -> NO ERRORS.
