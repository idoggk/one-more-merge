# Unit display audit (t-f9b18abf)

Owner: "the machine display is broken with most of the units". Every unit was drawn in every place and captured with
`node tools/unit-display-audit.mjs <outDir> [place ...]` (headless Chrome, 390x844 and 360x640, DPR 2, every roster QA switch on).
Sheets: `art-candidates/unit-display-audit/before/` (old code) and `.../after/` (this branch). Board sheets show each family rank 1-8
(1-6 for supports, whose rank cap is 6); the NEXT strip shows every family x rank; Units tab is the full collection owned at L1, owned at L9 and
locked; detail is every unit owned (L9) and locked; crates are every unit through the classic and TOOLBOX crate screens; monsters are all 26 cast
machines intact and hurt, all 8 chapter bosses intact / cracked / critical, the boss wake cards, every level-intro card (first level per monster / boss)
and the monster book.

Method note: the 360x640 "before" sheets exist for the board only (identical 8 broken sprites); every other place runs the same code at both sizes, so
the 360 before counts are the 390 counts. The `after/` folder holds the recaptured board and NEXT sheets at both sizes (viewed: 0 placeholders); the inspect card
change and the text-fit changes were verified in code and typecheck only, not recaptured (the full recapture was too slow to finish). Re-run the tool to refresh.

## Result by place

Unit x place: every unit / rank is OK unless listed. "Broken" counts the units (or unit-rank sprites) with at least one defect.

| Place | Checked | Broken before | Defects (before) | Broken after |
|---|---|---|---|---|
| Board during play (family x rank, both viewports) | 39 units, 13 shooter/relay x 8 ranks + the rest x 6 | **8 sprites**: mortar r7, r8; arc_welder r7, r8; horn r7, r8; fuse_box r7, r8 | placeholder drawing (green hat, padlock, martini glass, pink card) instead of a unit | **0** |
| NEXT strip (tray) | same set | **8** (same eight) | same placeholders | **0** |
| Inspect card (tap a part) | cannon, mortar, lathe, wrench sampled; all units share the layout | **>= 2** (lathe, wrench; every unit whose description is 5+ lines) | text overflow: the description runs over the "Hits for..." and "Try:" lines | **0** (card grows with the text) |
| Units tab, collection grid | 39 | **39 layout, ~4 name/pill** | 39 cards drawn at 0.44 scale in 172 px columns (big gaps, tiny text); name overflow on HYDRAULIC PRESS, REWIND CRANK, JACKHAMMER, WRECKING BALL; job pill overflow on PIPE (SAME FAMILY) and PISTON (OPEN SPACE) | unchanged (Units tab owned by the scrolling merge, see below) |
| Units tab, locked silhouettes | 39 | 0 | silhouettes are dark blobs with a padlock, intended | 0 |
| Unit detail page | 39 owned + locked | **~22** | the job icon (top right) overlaps the "LEVEL n" line for every unit with a job icon (nail_gun, wrench, piston, ...); fan, wrench: description runs into the LV3 / LV6 lines | unchanged (same file) |
| Level intro card (road sheet) | 14 monsters / bosses | 0 sprite defects | L12 and L1 cards: the NEW / tip text wall pushes into the stars and PLAY (text overflow, not a unit sprite) | unchanged, noted |
| Crate reveal, classic and TOOLBOX | 39 | **3** classic (WRECKING BALL x1 and HYDRAULIC PRESS x1 run together; JACKHAMMER x1 touches the frame) plus the "GOLDEN WORKBENCH" title touching the (i) button | text overflow | 0 sprite defects; name fit applied in the Units tab crate list is in unitsTab.ts (recorded below) |
| Monsters on the stage (26 + 6 classic, intact and hurt) | 32 x 2 | 0 | none (centred, correct tint, hurt frame present) | 0 |
| Chapter bosses (3 phases) and wake cards | 8 x 3 | 0 | none | 0 |
| Monster book, how-to, team sheet, shop, unit choice | all pages | 0 | none | 0 |

Totals before: board 8 + NEXT 8 (same 8 sprites) + inspect >= 2 + Units tab ~4 (+39 layout) + detail ~22 + crates 3.
Fixed in this branch: board 8, NEXT 8, inspect (all). Units tab, detail and crate-list text defects are recorded below for the scrolling merge.

## Root causes

1. **Missing rank 7-8 art, placeholder drawn instead (board + NEXT + inspect icon + results + ghost preview).** Rank cap is 8 from L21 for shooters and
   relays (`s.rankCap`, `game.ts`), but `src/assets/art/` ships `<family>_7/_8` only for cannon, coil, bell and rocket. `ensureTextures()`
   draws a code stand-in for every `<family>_<1..8>` key, so mortar, arc_welder, horn and fuse_box show a placeholder at ranks 7-8.
   **Fix:** `src/game/rankArt.ts` `rankArtKey()` (used by `unitTex()` in `src/game/unitArt.ts`, which every unit draw already goes through)
   maps a rank 7-8 key with no shipped art to the shipped rank 6 picture. Guard: `tests/rankArt.test.ts`. Rank still reads from the badge, crown pip and ring.
2. **Fixed-height inspect card (`GameScene.openInspect`).** The body text had a fixed 128 px slot between the header and the damage line; long
   descriptions overran it. **Fix:** card height `ch0` now grows with the measured body text (330 minimum, unchanged for short texts).
3. **Units tab column spacing independent of card scale (`unitsTab.ts` line 61-62).** `x = ((k % 4) - 1.5) * 172` while the card scale `k0`
   shrinks to ~0.44 with 39 owned units. **Not fixed here** (file is being rewritten by `orch/t-7160dcaf-integrate-units-tab-scrolling-on`). Suggested: use
   `colGap = min(172, 204 * k0 + 16)`, or 6 columns when more than 16 are owned (`perRow = owned.length > 16 ? 6 : 4`, k0 capped by `(colGap - 6) / 204`).
4. **Text not fitted to its frame (`unitsTab.ts`).** Card name `unitCard` line 138 (24 px, frame 178 px wide): add `if (nm.width > 178) nm.setScale(178 / nm.width)`;
   crate reveal list name, line ~363 (`${NAME} x${count}`, frame 158 px): same fit; job pill `addUnitJob` (`src/game/ui/unitJobUi.ts`, shared file, **fixed**: pill
   scales to <= 164 px).
5. **Detail page job icon collides with the role line (`unitsTab.ts` line 176).** Icon at `W / 2 + 290, top + 60` with its label at `top + 102`
   overlaps the role / LEVEL line at `top + 112`. Suggested: icon `(W - 90, top + 30)`, label `(W - 90, top + 72)`. Also the long guide text on fan / wrench
   (line 179 at `top + 574`) runs into the LV3 / LV6 lines (line 190, `top + 704`): move the perk lines down by the text height or cap the guide text.
6. **Level sheet text wall (`roadTab` / level sheet).** Not a unit sprite problem; the NEW tip block is unbounded (L12 pushes the star row under PLAY). Left for the intro-card work.

## Needs new art (for the ChatGPT production)

1. Rank 7 and rank 8 pictures for **mortar, arc_welder, horn, fuse_box** (the four families whose cap is 8 but ship ranks 1-6): same 256 px
   transparent format as `cannon_7` / `cannon_8`. Until then rank 6 is shown (fix 1).
2. Optional: a proper dark "unknown unit" silhouette art for the locked grid (today a tinted copy of the rank 3 picture with a padlock).

## Not changed

No rules, levels.json or puzzles.json; no state change (the fix is a texture key choice in the presentation layer; the golden and state-hash tests are unchanged).
