# CRITIQUE 99 — unit style test, round 2 (art-director-critic)

Judged from: ChatGPT raw sheets (`orch/t-bda452f6`, `art-candidates/unit-style-test/raw/`), code vector v2 (`orch/t-d139eaa2`, `.../vector-v2/`, incl. 48 px and greyscale sheets), anchor = red toy cannon in `road-map-painted-v2/normal_try1.png` (`orch/t-1716254a`). I opened the raw sheets, the vector dark sheet, the 48 px colour and greyscale vector sheets and the anchor crop. I could not make my own 48 px / greyscale versions of the ChatGPT sheets (no image tooling was run), so ChatGPT 48 px / grey verdicts are by eye from the full sheet and are marked "est.".

**Missing: STYLE 3 (sticker badge) was never produced** (task t-bda452f6 stopped after 2 sheets). It cannot be judged. Verdict on it: untested, not recommended as a blocker (see ranking).

Note: the three tests do not use the same families. ChatGPT = Cannon / Coil / Press; vector = Cannon / Coil / Bell. Pair verdicts below are within each set; they are not a like-for-like contest.

## Scorecard

| | Style 1 bold toy (GPT) | Style 2 chunky 3D (GPT) | Vector v2 (code) |
|---|---|---|---|
| Families told apart at 48 px (est. for GPT) | Cannon/Coil PASS, Cannon/Press PASS, Coil/Press PASS | Cannon/Coil PASS, Cannon/Press PASS, Coil/Press PASS | Cannon/Coil PASS, Cannon/Bell PASS, Coil/Bell PASS |
| Greyscale pairs | Cannon/Coil PASS (barrel diagonal vs tower), Cannon/Press PASS, **Coil/Press borderline PASS** (both dark base + gold + vertical) | Same as style 1, Coil/Press borderline | Cannon/Coil PASS, Coil/Bell PASS, **Cannon/Bell FAIL-ish** (similar grey, only silhouette separates; README admits it) |
| Ranks 1/4/8 by size, pips, glow | 1 vs 4 PASS; 4 vs 8 PASS only because of ring + 4 pips (body size gap small) | Same; sparkles on r8 help | 1 vs 4 vs 8 PASS: size steps + ring brightness + 1/4/8 pips are all strong; at 48 px badges vanish, ring and pips carry it |
| Clearly a machine | Yes | Yes | Yes, but reads as "toy icon in a ring" more than the anchor |
| Readable parts (5-7 wanted) | Cannon 6, Coil 6 (rings merge into a stack), Press 6 | Cannon 6, Coil 5-6, Press 7 | 6-7 each, listed in README |
| Detail level | Right (slightly glossy for "flat") | Right, edge of busy (highlights, sparkles) | Right, slightly simple; cartoon-vector, lower fidelity than the anchor |
| Match to painted mock UI | Good; the model kept the gloss | **Best**: it is the anchor look | Weaker: flatter and thinner gloss, a different hand; will look like a different game next to painted frames |
| Production effort, 9 families | Medium-high, GPT consistency risk | Medium-high, same risk, plus glow keyed against magenta | Lowest: deterministic SVG, exact outline, one rank template, repeatable |
| Unity animation potential | Needs layered splits after the fact; baked glow fringe | Same, harder (soft gradients, baked shadow) | Best: parts are already separate SVG shapes, so wheels/lever/coil/barrel can be separate sprites |

## Rubric notes (same flaw, same item number in every asset)

- Item 14 (clean edges, critical): both GPT styles FAIL as shipped. Glow rings key pink/pale against magenta, gates failed on r4/r8; slicing trims per piece so rank size is lost (item 20). Fixable only by keying the glow separately or drawing glow in code. Vector PASSES (transparent PNGs from SVG).
- Items 1/2 outline: vector PASS (one weight, warm brown). GPT: weight varies per sheet and between parts (item 1 minor FAIL), colour is warm dark brown (PASS).
- Item 3/4/5 light and highlight: GPT top-left light generally right, highlights multiple (busy). Vector: single gloss, PASS.
- Item 18 busy-ness: Style 2 coil (4 gloss rings plus sparkles) and its rank 8 sparkles exceed 3 detail clusters. Style 1 and vector OK.
- Item 19 family resemblance: GPT within a sheet is good but across later sheets will drift (the main risk). Vector is exact by construction.
- Coil in both GPT sheets reads as a stack of rings / a tyre pile, not an electric machine; the lightning bolt in the vector coil makes the job clear.
- Cannon and Coil both use wheels + gold trim (GPT); wheels are the main shared feature across all families, which weakens pair separation. Vector Bell is on a skid with small wheels too.

Scores (est. against the 20 points): Style 1 ~13/20 REDO, Style 2 ~13/20 REDO, Vector v2 ~16/20 REDO (fails the owner-anchor match, not the technical items). No style reaches PASS; none is REJECT.

## Recommendation

**ONE style: vector v2, upgraded toward the anchor ("vector-plus").** Reasons: only option that is repeatable for 9 families, exact outline, clean transparent edges, separate parts for Unity, and clean rank system (size + ring + pips) that works at 48 px. The weakness is the look (flatter than the painted mock); the owner's rule is "match the anchor", so do not ship it unchanged.

Ranked backup: **#2 Style 2 chunky 3D (GPT)**, used as the hero/art-painted look, with glow/pips added in code, and only if the owner prefers the anchor fidelity over consistency. Style 1 is dominated by Style 2 (not flatter in practice). Style 3 untested; run it only if both fail the owner's eye test.

Fixes required before the family goes to production (vector):
1. Greyscale: give each family a distinct value band (e.g. Cannon dark-mid, Coil light, Bell lightest) so Cannon/Bell stops depending on silhouette alone.
2. Gloss: raise the lit highlight, add a rim light and a mid-tone gradient to match the glossy anchor; keep outline at one weight.
3. 48 px: drop the rank badges (star/bolt) from the rank-1/4 art, keep the star only as a feature on cannon; pips and ring carry rank. Make pips bigger (min 5 px at 48).
4. Rank body silhouette: add a subtle size bump per rank (the 0.68 / 0.82 / 0.96 steps stay) — do not add parts.
5. Avoid shared wheels across families: Cannon = wheels; Coil = flat plinth, no wheels; Press = C-frame on a plate; Bell = A-frame on a skid.

## Ready brief for the first full family (Cannon, 8 ranks)

Draw in SVG, 256 px canvas, 6-10% padding. Cannon on two dark-plum wheels with gold hubs; red barrel (hue lock vermilion #D8281F, mid shadow, gloss), gold muzzle ring, star on the front wheel hub, gold axle bar, small rear red cap. 6 parts: barrel, muzzle ring, wheel x2 (counted as one), hub/star, axle, ground shadow. Outline warm dark brown (#3A1F14) at 3.5% of height, one weight. Light top-left, one gloss shape per part, rim light on the right edge, contact shadow ellipse under. Ranks 1-8: scale 0.68 → 0.96 with the same parts, pips 1/2/4 with ring colour step (dim → bright), glow ring in family red from rank 4 up, ring only (no sparkle) at rank 8. Output: SVG + 128/256 PNG per rank, transparent, plus a 48 px greyscale sheet next to Coil and Press. Acceptance: pair-test at 48 px and greyscale against Coil and Press, rank 4 vs 8 told apart without the ring.

## Open risks

- ChatGPT 48 px / greyscale verdicts are estimates; verify with real downscales before relying on them.
- Style 3 untested.
- Owner has not seen vector next to the anchor in a UI frame: render one cannon in a frame from the painted mock before committing.
- No src, tests or builds were touched or run (docs only).
