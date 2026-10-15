# CRITIQUE_85: painted ROAD MAP mocks v2 (art director pass)

Task t-229c0154, 2026-10-15. Read-only on images, nothing in `src/` touched.
Subject: `art-candidates/mockups/road-map-painted-v2/{normal_try1,boss_try2,chapter_try1,locked_try1}.png` (branch `orch/t-1716254a-painted-road-map-mocks-keep-1-fi`). Prior: CRITIQUE_84 (`PAINTED_CRITIQUE.md`, branch `orch/t-cae2a03e-critic-and-layout-check-painted`).
Method: every image opened at full size. Pixel positions are read off by eye (about +-6 px); percentages are of image height, then converted to CSS px on a 390x844 phone (inset needs: top about 47, Pro Max 59; bottom 34).

## 1. Verdicts

| State | Verdict | One line |
|---|---|---|
| 1 normal | **KEEP** | Style anchor. Only leftover: node 33 still shows 3 stars (live art will override). |
| 2 boss (try 2) | **KEEP** | Best of the set: clean, calm rails, Bolt clearly worried, best safe areas. Aspect 910x1729 differs, fit by height and crop sides. |
| 3 chapter | **FIX** | Popup is great; QUESTS and SEASON chips broken, node states contradict "0/10". Small repaint of chips, or rebuild those parts live. |
| 4 locked | **FIX** | Good ice road and gate; wallet at the very top and the plate says CH 4 for level 41. Layout shift covers the margins; the CH label needs a text decision. |

Set consistency: **passes** (large improvement over CRITIQUE_84). Same wallet, plate, six badge icons, plum cliff rim, cream road, cannon, Bolt, PLAY pill (green; red FIGHT BOSS in state 2) and nav in all four. Rubric 19 now passes everywhere.

## 2. Were the CRITIQUE_84 fixes applied?

| Earlier fix | Result |
|---|---|
| Normal: node numbers on every disc | Done: 29 30 31 (done), 32 (YOU), 33 (next), 34 35 (locked). |
| Normal: chest back on the shoulder | Done (right of Bolt). |
| Normal: top block down | Partly. Wallet top 66 CSS now (was 17): passes. |
| Normal: nav lifted | Not enough, see section 3. |
| Normal: node 33 should not look played | **Not fixed**: three stars drawn (also 32 has no stars, correct). |
| Boss: one boss, no chains, calm rails, bigger worry | Done. One boss on one platform, two small flame clusters, rails over calm sky, sweat drop and raised hands. |
| Boss: boss must be the shipped sprite | Still a paint. Art target only; use `boss_*_intact` on a platform piece. |
| Chapter: same HUD as normal | Done (wallet, nav, badges, Bolt, rim all match). |
| Chapter: title MUSIC ATTIC, numbers 41 to 50 in order, reward amounts | Done: x200, x10, x1, CH 5 MUSIC ATTIC, 41 44 43 42 41 reading up, 45 to 50 above. 45 is half hidden by the ribbon, 50 is a crowned boss node. |
| Chapter: busy backdrop | Done: calm purple. |
| Locked: NEED 20 STARS, one space in CH 4 ARCADE | Done. |
| Locked: wallet size, PLAY pill, chest-ring plate, plum rim, Bolt | Done, identical to state 1. |
| Locked: gate/sign, high-contrast padlocks | Done (white numbers on dark padlock discs read at 70 px). |

## 3. Safe areas (390x844, measured)

| Image | Wallet top (% / CSS) | Top verdict | Nav bottom margin (% / CSS) | Bottom verdict |
|---|---|---|---|---|
| normal | 7.9% / 66 | pass (needs 47, Pro Max 59) | 1.1% / 9.6 | **fail** (needs 34) |
| boss try2 | 7.8% / 66 | pass | 4.6% / 39 | pass |
| chapter | 6.1% / 51 | pass on 390, marginal on Pro Max (57 of 59) | 1.8% / 15 | **fail** |
| locked | 2.1% / 17 | **fail** (inside status bar, island overlaps the wallet) | 0.9% / 8 | **fail** |

Side margins: badges and nav sit about 4 to 5 CSS px from the screen edge (badges x about 10 of 852, nav about 10 of 853). Fine for art, but the live badges should keep at least 8.

The worker's report is right: wallet (locked, chapter-on-Pro-Max) and nav (normal, chapter, locked) are too close. Worst: locked wallet 17 px (needs 47 to 59, short by 30 to 42) and locked nav 8 px (short by 26). Normal nav short by about 24, chapter nav about 19.

**Can the game layout fix it instead of repainting? Yes.** The wallet, plate, badges, PLAY pill, chest ring and nav are all separate live pieces in the build (CRITIQUE_84 section 4, ASSETS.md); the painted page is only a target. Place them with `env(safe-area-inset-*)` (or the same fixed values): top block starts at max(inset-top + 8, 56), nav bottom at inset-bottom + 8, PLAY and the road shift up with it. The road scenery behind is a scrolling background, so nothing needs repainting. Repaint only if a painted page is ever used flat, which it must not be. Cost of the shift: about 25 to 40 CSS px less road height; locked/chapter mocks are the ones that would lose the most, so treat them as layouts, not 1:1 targets.

## 4. Per image

### 1. normal_try1 (KEEP)
Numbers 29 30 31 32 33 34 35 read in order bottom to top; locked 34/35 grey padlocks read at 70 px; PLAY, YOU tag, cannon, six badges survive grayscale (dark nav and sky, bright road). Spelling clean: DAILY, QUESTS 2/5, COLLECT, EVENT 2D 4H, OFFERS -50%, SEASON 7/30, CH 4 ARCADE 2/10, PLAY LEVEL 32, ROAD UNITS MACHINE EVENTS. Faint ghost discs at the top of the road are still near invisible (harmless). Leftover: node 33 stars (live text overrides), nav margin (layout). Score 18/20 (fails 20 for nav padding; 12 faint ghost discs). Note: state 1 shows 3 done nodes yet progress 2/10, small logic mismatch, live data will correct it.

### 2. boss_try2 (KEEP)
Best image of the set. Boss reads as a dark red silhouette against the orange glow, platform shows "40" in a clear ring. Bolt worried is readable at 110 px. FIGHT BOSS pill reads at 70 px as the red exception. Numbers 36 37 38 (done), 39 YOU, 40 boss. Minor: the 39 numeral is dark brown on a dark disc (low contrast, live text should be cream); the YOU tag is below the node here but above it in states 1 and 4 (pick one: above); aspect 0.526 vs 0.462. Score 18/20. Do not ship the painted boss, it is a look target for `boss_*_intact`.

### 3. chapter_try1 (FIX)
Popup keeps its quality: ribbon CHAPTER 5, music-attic scene card, plate MUSIC ATTIC, x200 / x10 / x1, green LET'S GO, cheering Bolt (same Bolt as state 1). Defects: (a) QUESTS chip is a stray "7" (should be 2/5); (b) SEASON shows a black blob where 7/30 should be; (c) EVENT chip 2D 4H missing; (d) nodes 41 to 44 show three stars while the plate says 0/10 and the popup is an entrance: they should be unplayed; (e) PLAY pill hidden (by design); (f) nodes 46 to 49 shrink to about 25 to 30 CSS (perspective, acceptable as non-tappable); (g) nav is wider than in the other states (x 10 to 843 against 25 to 828), another reason to build it live. Score 15/20, redo note: "Fix: 15 repaint chips QUESTS 2/5, EVENT 2D 4H, SEASON 7/30 as in state 1; 12 remove stars from 41 to 44." Cheaper: do the chips as live text and keep only the popup and scenery from this paint.

### 4. locked_try1 (FIX)
Strongest "locked" read: warm bright road below, frosted ice above, gate with gold padlock and sign NEED 20 STARS (spelled right), padlock nodes 42 43 with white numerals. Defects: (a) safe areas (wallet 17 px, nav 8 px, section 3); (b) plate says CH 4 ARCADE 10/10 while the current level is 41 and CHAPTER mock says level 41 starts CH 5: set the live plate to CH 5 MUSIC ATTIC (or 0/10), or change the story so the gate sits at the end of CH 4; (c) done nodes 39, 40 at 3 stars, 40 was the CH 4 boss in the boss mock, fine; (d) gate is a long way above node 43 (empty frost road between): acceptable. Score 17/20. Redo note: "Fix: 20 shift wallet and nav inward (or place live); 15 plate text CH 5 MUSIC ATTIC 0/10 to match the chapter mock."

## 5. Consistency check across the four

| Piece | normal | boss | chapter | locked |
|---|---|---|---|---|
| Wallet (nut, gem, gear, + buttons) | same | same | same, slightly higher | same, at the top edge |
| Chapter plate (cream, brass, bar, chest) | same | same | narrower, dark empty bar | same, green full bar |
| Badge icons (gift, medal, cannon, stopwatch, gem, crown) | yes | yes | yes | yes |
| Badge chips | all 4 present | all 4 present | QUESTS garbled, EVENT and SEASON missing | all 4 present |
| Road rim (plum cliff, cream, gold line) | yes | yes | yes | yes (ice on upper half) |
| Hero cannon, platform, YOU tag | yes | yes (tag below) | n/a | yes |
| Bolt design | same | same (worried) | same (cheer) | same (point) |
| PLAY pill | PLAY LEVEL 32 | FIGHT BOSS red | hidden | PLAY LEVEL 41 |
| Nav (floating, pin ROAD) | yes | yes | wider | yes |
| Spelling | pass | pass | pass (chips aside) | pass |
| Node numbers in sequence | 29 to 35 | 36 to 40 | 41 to 50 | 39 to 43 |

Numbers across the set run 29 to 50 without gap or repeat (35/36 and 40/41 join as chapter edges), but state 1 (2/10), 2 (9/10) and 4 (10/10) disagree on what the "done" count is. That is data, not art.

Rubric note: the same flaw gets the same item number: 20 safe areas / padding (normal nav, chapter nav, locked wallet and nav), 15 text (chapter chips, locked plate text), 12 low contrast in grayscale (boss 39).

## 6. Next steps

1. Build the road map screen with live HUD pieces placed by safe-area insets; use the paints only as art targets (no repaint for safe areas).
2. Keep normal_try1 and boss_try2 as references. For chapter, either one repaint try for the three chips or live text; unplay nodes 41 to 44.
3. Settle the plate text for the locked state (CH 5 or CH 4) and put the YOU tag above the node everywhere.
4. Road kit and node discs (empty, with live numbers and stars) stay the priority; they cannot come from these pages.
