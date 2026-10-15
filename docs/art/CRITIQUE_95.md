# CRITIQUE 95: ch6 kit v2, ch7/ch8 entrance retry, 15 badge replacements

Critic task t-eceeeefe. Read-only on images, nothing generated, `src/` untouched. Every image below was opened (full size, contact sheets, 44 px grayscale strip); measurements are my own scripts run on the files (scratch deleted). Branches read (via `git archive`, not checked out):
- kit: `orch/t-bb85a9c5-chatgpt-batch-chapter-6-road-str` (`art-candidates/road-kit-ch6-strip-v2/`)
- panels: `orch/t-52e32914-chatgpt-batch-panel-retry-chapte` (`road-art-5d/raw/ch7_entrance_try2.png`, `ch8_entrance_try2.png`), joined against `ch7_gate_try1.png` (5d) and `ch8_gate_try1.png` (branch `t-e36646bc`, road-art-5c)
- badges: `orch/t-462bc28b-chatgpt-batch-map-badge-fix-and` (`art-candidates/map-badge-2-v2/`)
- prior critiques: CRITIQUE_88, CRITIQUE_89, CRITIQUE_71.

## Summary

| Batch | KEEP | FIX | REDO |
|---|---|---|---|
| 1. ch6 kit v2 (12 pieces + strip) | 12 + strip | 0 | 0 |
| 2. ch7 / ch8 entrance panels | 0 | 0 | 2 (join fails on both) |
| 3. badge replacements (15) | 14 | 1 (ring_open, alpha holes) | 0 |

Overall `changes_requested`: the kit passes, the badge pack passes after one scripted alpha repair, and **both panels fail their join with the neighbouring gate**, which is the reason they were retried.

---

## 1. Chapter 6 kit v2: KEEP

Bow-ties, repeats, seams, edges, road width, all measured or opened.

| Check | Result |
|---|---|
| Bow-ties | **None.** Marks are rectangles (cream tape, orange tape, patch) and a staple pair, so the SYM fold leaves them intact. On curves they fan into wedges that follow the bend; that reads as tape laid on a curve, not a stamped chevron. CRITIQUE_89's critical 4/13/19 failure is fixed. |
| Repeats within 512 px | **None.** One loop holds 4 different marks (cream, orange, staple, flat patch). The loop itself repeats every 512 px (tile3 shows the same 4-mark sequence three times in 1536 px). That is the same period as every other chapter. The rhythm is even and a little sparse (see risks). |
| Open edges on border midpoints | **Pass.** On all 11 road pieces every open edge spans columns/rows 153-358 (206 px), closed edges are empty. `shoulder_edge` is a 46 px strip (234-279), as before. |
| Road width | **205 px** (40 percent of 512), measured 206 with 1 px of antialias. |
| Seams between all pieces when tiled | **Pass, measured.** I took the 3 px band at every open edge (26 edges), and compared every legal pair (side X against the opposite side Y): 144 pairs, mean RGB difference across the 206 px road span median 9.3, p90 11.1, **max 11.7**. The same straight tiled against itself scores 10.1-11.2, so no pairing is worse than the straight loop. Every piece ends in plain flutes plus rim, so the joins are invisible in `tile3_ch6.png` and the contact sheets. |
| Halo | None on dark or light sheet. Rim is one weight on all 12 pieces. |
| Grayscale / 70 px | Rim, flute and tape keep their value steps. The cream tape is the lightest value and is the one mark that still reads at 70 px. |

Per piece: straight_h KEEP, straight_v KEEP, curve_ne/nw/se/sw KEEP (4), s_curve_a/b KEEP (2), t_junction KEEP, cross KEEP, dead_end KEEP, shoulder_edge KEEP (geometry only). `raw/b6v2_ch6_strip.png` KEEP as a source.

Notes for the integration step (not blockers):
- Cream tape starts 42-56 px from the open border on exactly one end of every piece (measured). Two pieces joined cream-end to cream-end put two 80 px cream strips about 100 px apart. That reads as double tape but never overlaps. If it shows in QA, flip the stem/curve orientation at that join or ask for a second strip variant (a/b) so the period becomes 1024 px, as CRITIQUE_89 suggested.
- Only 4 marks per loop. The grey tape in the raw strip is unused. The road is tidy but regular; a second strip with other marks would break the 512 px rhythm. Optional, not a defect.
- Command in the README needs `npm ci` and the v6 `kit.mjs`, which is on a different branch; the output is committed, so this does not block.

---

## 2. Panels: both REDO (the join fails)

Method: lane edges found from the gold rail columns, prop margin from the first column that differs from the floor colour in the outer 340 px, join from the last 8/32 rows of the gate against the first 8/32 rows of the entrance. Values are px of 1024. Targets: margin 80 (floor 61), lane matches the gate.

| Panel | Left margin | Right margin | Lane (outer rail edges) | Gate lane |
|---|---|---|---|---|
| ch7 entrance try2 | **117** | **82** | 314-708 | ch7 gate: 339-685 |
| ch7 gate (reference) | 71 | 62 | 339-685 | |
| ch8 entrance try2 | **64** | **73** | **410-613** (203 wide) | ch8 gate: 375-650 (275 wide) |
| ch8 gate (reference) | 38 | 42 | 375-650 | |

### ch7 entrance try2: REDO (margins pass, join fails)

- Margins pass: 117 / 82 (the fork tip is the closest prop, 2 px over the 80 target). Props are small and calm, top and bottom 150 rows are empty floor.
- Join with `ch7_gate_try1` **fails on style, not on colour**. The gate has no rails: a plain cream lane, soft edge, **brown** dash bars, no outline. The new entrance has **gold segmented rails** (x 322-350 and 675-702), **gold pill dashes**, and a heavier outline. At the seam the rails appear from nowhere and the lane steps from 343 px wide (gate, no rails) to 394 px (entrance, with rails), 25 px on each side. Floor and lane colours do match (lane 245,230,200 vs 246,228,192; floor 228,190,135 vs 239,197,129); the mean seam difference is 11.7 over all columns and 3.8 in the lane centre, which would hide, but the rails and dash colour would not.
- Style note: with rails, dashes and outline this panel reads as the ch8 road language moved to sand; ch7 and ch6 have no rails.
- Verdict: REDO (one image). Score about 13/20, fails rubric 19 (family with the gate) and 17.
- **Redo brief (<=35 words):** "Redo ch7 entrance: 19 remove gold rails and gold pill dashes; plain cream lane x 341-684 (33-67 percent of width), soft edge, brown rounded dash bars like the gate; keep the current small props and margins (at least 80 px)."
- Attach `ch7_gate_try1.png` as a style reference if the owner can upload it; otherwise give the lane colour (245,230,200) and brown dash as text. Alternative with no new image: accept this panel and regenerate the ch7 gate with the same rails (also one image); do not wire a mixed pair.

### ch8 entrance try2: REDO (margin below target, join fails clearly)

- Margins 64 / 73: above the 61 floor, below the 80 target. The closest items are flowers and bush on the left; nothing touches the edge. Dome no longer clipped (the old 3 px problem is solved). One medallion, constant lane, art quality is high (dome, orrery, lamps read at 70 px).
- **Lane does not match the gate, the worker's "about 408-615" is right and it is a real mismatch.** Measured lane outer edge 410-613 (203 px) against the gate's 375-650 (275 px): a **35-37 px step per side, 72 px of width**, about 26 percent narrower. The colour also changes: gate lane is a pale blue-white marble (192,208,245) with a centre column of gold 4-point star diamonds and blue star medallions, entrance lane is **warm cream marble** (228,203,177) with **gold dash pills** and a plain gold coin medallion. Rails are in the same gold, but everything else differs. Mean seam difference 28.7 over all columns, 34.5 in the lane centre. A 120-160 px code band (CRITIQUE_71) could hide a funnel taper, but it cannot hide a change of lane pattern and colour inside a single chapter.
- Verdict: REDO (one image, or a gate/entrance pair). Score about 14/20: fails rubric 19 against its own gate and 20 (margin under 80), and the join is the point of the retry.
- **Redo brief (<=35 words):** "Redo ch8 entrance: 19 make the lane pale blue-white marble, outer gold rails x 375-650 (36.6-63.5 percent), gold star-diamond column and blue star medallion like the gate; 20 keep props 100+ px from both edges."
- Because the lane is the hard part, give the lane as pixel/percent numbers and the colour in text and name the gate's elements (diamond column every ~70 px, blue-ringed star medallion every ~400 px). The previous 5c ch8 entrance matched this lane (CRITIQUE_71); if a new try again fails, take that panel and fix only the dome margin in code (crop or shift the dome sprite) rather than a third generation.
- Also note, for the gate: margins 38 / 42 are below the 61 floor (CRITIQUE_71 accepted it because nothing clips). If the pair is regenerated together, ask for the gate props at 80 px as well.

Open point for the lead: ch7 gate (339-685) and ch7 entrance (314-708) were briefed as 318-705 / 385-640; the generator never hits the numbers. Ask for lane as percent of width and measure the edge column before accepting; the maker's eye reading was right on ch7 margins but missed the rails and dash style.

---

## 3. Map badge replacements (15): 14 KEEP, 1 FIX

Compared against the painted road map mock style (bright, clean, glossy, flat brown-dark outline) and against CRITIQUE_88. The "steampunk" drift is gone: pieces are bright, saturated, glossy cartoon with one weight of warm dark-brown outline and top-left light. This is the right look.

Checks applied to all 15: no baked glow or outline-glow (edge pixels measured: 380-950 semi-transparent px per piece, all on the 1-2 px antialias rim; no halo ring on dark or light sheets); no green fringe or green line (counted green-tinted semi-transparent pixels: 0 on gear, lock_closed, lock_steel, ribbon_lock, gem, wrench; 21-45 on the rings and bases are the antialias rim and look clean at 2x); padding 7-9 percent on every piece (measured 15/236, 7/110 etc.); WebP sizes fit the 2x spec.

### State pairs (the two-axes rule)

| Pair | Axes that differ | 44 px grayscale | Result |
|---|---|---|---|
| ring idle vs ring ready | ring colour (stone vs gold), chest (closed vs open), part count (coins and stars), ring value | idle: light stone ring, chest dark; ready: lid up, coin pile | **pass, 4 axes** |
| ring ready vs ring open | accent colour (gold vs green), part count (coins vs empty chest), pip (check mark), ring value (bright vs dark) | ready is clearly lighter than open; check pip is tiny at 44 px but the dark ring and empty chest carry it | **pass, 3-4 axes** |
| ring idle vs ring open | ring colour, lid, pip | clear | pass |
| base ready (brass / copper / teal) vs idle | star pip on top rim, flared rim | **cannot be verified: no idle base exists in any branch** (only the three `_ready` bases were ever made; CRITIQUE_88 compared the v1 "ready" to a non-existent idle) | see risk below |

### Per piece

| Piece | Score | Verdict | Note |
|---|---|---|---|
| badge_base_brass_ready | 18 | KEEP | Gold rim, cream dome, star pip. Clean. |
| badge_base_copper_ready | 18 | KEEP | Same. In grayscale copper and teal collapse to a similar mid-grey; that is fine because the hue is what identifies the badge family, not the state. |
| badge_base_teal_ready | 18 | KEEP | Same. |
| badge_glyph_gear | 18 | KEEP | Hole is transparent, no green line (the translucent-inside pixels I counted are the intended hole). |
| badge_glyph_offers_gem | 19 | KEEP | Blue gem plus red flag, matches the mock's offers badge. Strongest piece. |
| badge_lock_closed | 18 | KEEP | Gold padlock, keyhole transparent, no green line. |
| badge_lock_steel | 18 | KEEP | Grey-blue steel; differs from the gold lock by colour and value. |
| badge_ribbon_lock | 16 | KEEP | Padlock is now about 35 percent of width and readable. Ribbon is wavy and 117x88, so it only works as a corner ribbon; do not stretch. |
| road_chapter_ring (idle) | 18 | KEEP | Light stone ring, closed chest, bright. |
| road_chapter_ring_ready | 18 | KEEP | Gold ring, open chest with coins, no outline glow. |
| **road_chapter_ring_open** | 11 | **FIX (critical 14)** | **The green segments are semi-transparent.** The green key ate the green ring: 17 percent of the filled disc (4928 of 28919 px, 18981 in the full-size PNG) has alpha under 200, and the ring band averages alpha 120-160/255 in half of its sectors (over magenta, 5 segments and the check badge show purple). On the light sheet the segments are pale, on the dark sheet they are dark; in game the map will show through. Other rings and bases measure 0.0 percent. |
| road_chapter_track | 17 | KEEP | 8 wide slots, chest cap about 2x the track height, no translucent pixels. Dark-brown slots are the one muddy note; they are the recess for code-drawn fills, so fine. |
| tab_active_plate | 16 | KEEP | Flat bright yellow, thin brown outline, no glow. The big corner highlight is a bit glossy; flat-fill it in code if wanted (the worker said the same). |
| tab_bar_plate | 18 | KEEP | Navy body with thin gold edge, 885x230 (about 3.8:1, not 5:1; clear it is a cap that scales horizontally, so use 9-slice or stretch only along x). |
| tab_icon_machine | 18 | KEEP | One wrench on a cream tile, 2 detail clusters, readable at 44 px. Fixes the CRITIQUE_88 REDO 2. |

**FIX brief for road_chapter_ring_open (script, no new image):** "Fix 14: set alpha to 255 for every pixel inside the outer ring circle (fill holes in the silhouette), restore the colour of the 5 purple-looking segments to the opaque neighbours' green-grey (about 100,125,100), and re-check the check badge; do the same on `full/` and `final/`."
If the segment colour is lost along with the alpha, regenerate the ring open on a **magenta** key (not green), because green is the ring colour.

The wide gap between a "ready" base and a missing "idle" base is the one open design point: the new bases are only the ready state. Draw idle in code (same disc, no star pip, desaturated and darker, no rim flare) or ask for one idle base per colour. Say which, so the two-axes rule can be shown with a grayscale strip like the ring one.

---

## Risks and notes (unresolved)

- ch7 and ch8 panel numbers are pixel-measured by me but from the raw 1024x1536 files; no per-row lane trace, so a lane that wobbles mid-panel would not show. Eyes on all four panels showed straight lanes.
- ch8 gate is the older 5c panel (margins 38/42); not part of this batch, so not scored.
- Kit seam metric compares the 3 px at the border only; it does not measure flute phase, but tile3 and the contact sheets show no visible step.
- ring_open and tab_active_plate halo checks were done on the PNG/WebP alpha and on magenta, dark and light backgrounds; I did not check them in the game.
- Not wired, not in the registry; none of this changes `src/`.
