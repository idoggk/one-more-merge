# Harsh scoring rubric

One rule: **score what a player sees on a phone, not what the generator tried to do.** If you are unsure between two scores, take the lower one. A score of 7 must be earned; 9 and 10 are not expected from AI-generated art without hand repair.

## Scale (absolute, against top-grossing mobile games)

| Score | Meaning |
|---|---|
| 10 | Indistinguishable from the best polished art in a top-5 grossing mobile game. Not expected from us. |
| 9 | Would pass a top studio's art review with no notes. |
| **8** | **Ship bar for hero assets** (units, crates, primary buttons). Small notes only; a fan would not notice. |
| **7** | **Ship bar for secondary assets** (icons, plates, backgrounds). Good, consistent, nothing embarrassing. |
| 6 | Strong indie. Style is clear but there are visible weak spots (mush, noise, one wrong shape). Needs a pass. |
| 5 | Generic or "AI-looking": clean but soulless, too many tiny details, inconsistent materials. Redo or repair. |
| 4 | Visible defects at phone size, or off-style next to our anchors. Redo. |
| 3 | Placeholder (our code-drawn units). |
| 1-2 | Hurts the game. |

Two numbers are always given: **vs anchors** (does it look like the same artist as `cannon_4`, `coil_3`, `bell_3`, the crates and buttons?) and **absolute** (against the industry bar above). The absolute score is the one that decides.

## Unit art (one picture, or one rank of a ladder)

| Dimension | Weight | What the reviewer checks |
|---|---|---|
| Silhouette and readability | 25% | Black-fill silhouette at 64 px (review sheet row 3): identifiable in one second, distinct from the other units of its role. Details below ~6% of the object's width do not count. |
| Material and light | 20% | Three clear values (dark / mid / light), highlight top-left only, correct materials (enamel vs brass vs steel vs glass), no smeared gradients or mush, no random noise. Greyscale row must still read. |
| Style match | 15% | Same outline treatment (dark tint of each part's own colour, never pure black), same top-left light, brass trim and rivets, cream base plate with rounded feet, same 3/4 camera, same chunkiness as the anchors. |
| Colour | 10% | Family colour dominant (about 60% family hue, 25% brass/gold, 15% cream), saturated but not neon, reads on the wood slot. |
| Rank progression (ladders only; single pictures score this dimension 0 and the weight moves to Silhouette) | 20% | Each rank = previous rank plus one visible change; silhouette changes at every step (IoU with previous rank below 0.93); the ladder is monotone: no rank looks like a different object; rank 8 clearly beats rank 7. Shuffle test: a stranger can put the ranks in order. |
| Technical cleanliness | 10% | Transparent background, no white fringe, grey halo / leftover floor shadow or specks (both are review-sheet flags), centred with padding, nothing clipped, no text or watermark, file size sane. Check with the review sheet flags. |

Appeal ("do I want to collect this") is the tie-breaker, +/- 0.5.

## Hard caps (the score cannot exceed the cap, whatever the average)

| Defect | Cap |
|---|---|
| Baked text, numbers, watermark, rank badge | 4 |
| Wrong machine for the unit's job, or unreadable what it is | 4 |
| Different camera angle or lighting from the anchors | 5 |
| White fringe / background remnants visible on the dark slot | 5 |
| Anatomy errors: parts floating without a reason, impossible mechanics, doubled or melted parts | 5 |
| More than one object per cell, or object cut by the edge | 4 |
| Ladder where two neighbouring ranks are near-identical (IoU > 0.93) | 6 for the ladder |
| Ladder where one rank is a different design (IoU < 0.45 with the previous) | 6 for the ladder |
| Aura / glow halo / particles outside the object (the game adds glow in code) | 6 |

## UI pieces, icons, backgrounds (same scale, different weights)

| Piece | Weights |
|---|---|
| Button / panel / bar (9-slice) | Style match 20, Material and light (lip, gloss, bezel, rivets) 25, Stretch safety (no detail in the stretch zone, corners hold) 20, Readability of text on it (contrast >= 4.5:1) 15, States complete (idle, press, disabled) 10, Technical 10 |
| Icon | Readable at 32 px 30, Single concept 20, Style match 20, Material 15, Technical 15 |
| Background / scene | Depth (vignette, layers) 25, Warm top-left light 15, Nothing busy behind the header or board 20, Authored at >= 2x display size 15, Style match 15, Technical 10 |
| Effect sprite (muzzle, impact, link motif) | Distinct by shape and motion, not only colour 30, Readable in 120-250 ms 25, Style match 15, Fits the effect budget 15, Technical 15 |

## Review protocol (every asset, in this order)

1. **Flags.** Run `tools/review-sheet.mjs`. Every flag is looked at; none is ignored.
2. **Look at actual size.** Board row (118 px) and tray row (62 px) first, enlarged view second. If it only looks good enlarged, it fails.
3. **Side by side with an anchor.** If a stranger could not tell which is ours, it passes style; if they could, say what differs.
4. **Devil's advocate.** Write the 5 worst things about it before writing any praise.
5. **Score each dimension, apply the caps, write the verdict:** `SHIP` (>= bar), `REPAIR` (list exact fixes, small edits or a targeted re-prompt), `REDO` (re-prompt with changes), `DROP`.
6. **Log it** in `scores/scores.csv` (date, asset, version, each dimension, caps hit, final, verdict, the 5 flaws).
7. A **second look after a night** for anything scored 8 or more. Fresh eyes lower scores more often than raise them.

Iteration rule: at most 3 prompt rounds per sheet. If round 3 is still below 7, change the concept (rank plan or parts), not the wording.

## Calibration: what our current art scores (harsh, absolute)

Done by Claude from the pictures in `src/assets/art` and the review sheet. These are judgement, not measurement, and the absolute column is from memory of top games, not side-by-side screenshots (see `BENCHMARK.md`).

| Asset | vs anchors | Absolute | Why |
|---|---|---|---|
| Tool chest crate (`crate_chest`) | 9 | **7.5** | Best piece we have: strong silhouette, convincing brass and enamel, clear values. Lacks a hero-level light drama. |
| Cannon ladder (`cannon_1..8`) | 9 | **7.0** | Progression is the best we have (barrels, tank at 8) but ranks 2 and 3 (toaster, teapot) are different objects, and tiny rivets and pipes turn to noise at 64 px. |
| Magnet ladder (`magnet_1..6`) | 8 | **6.5** | Clear horseshoe; progression mostly additions; low contrast purple on purple in places. |
| Coil ladder (`coil_1..8`) | 8 | **6.0** | Progression broken: rank 5 is a flower-shaped different object (silhouette overlap with rank 6 is 0.46); greyscale row is a low-contrast blob at 64 px. |
| Single roster-B picture (`unit_tesla_tower`, `unit_piston`...) | 8 | **7.0 as an object, 2 as a ladder** | Good object, but one picture for all ranks means rank is invisible. This is the biggest gap in the game's unit art. |
| Primary buttons (`btn_green`, `btn_blue`) | 9 | **7.0** | Good bezel and rivets; flatter gloss and thinner lip than the top games' chunky buttons. |
| Cards and plates (`ui_card`, `hud_header`, `res_bar`) | 8 | **6.5** | Clean and consistent, but plain and quiet: nothing feels alive or valuable. |
| Star, bolt icon | 7 | **6.0 / 6.5** | Readable, a little soft and generic. |
| Code-drawn units and glyphs (the 22 fallbacks) | 2 | **3.0** | Flat placeholders. |

So the honest picture: our best art sits at 7 to 7.5, the ship bar is 8, and the unit ladders for the 22 roster-B units do not exist. Everything new is judged against 8, not against what we already have.
