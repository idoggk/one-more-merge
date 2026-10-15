# CRITIQUE 96: Screw Yard fix batch v2

Critic pass on `art-candidates/screw-yard-new-v2/` (branch `orch/t-6ff267bd-chatgpt-batch-screw-yard-fix-and`), following CRITIQUE_94. I opened the stage sprites, the dark and light contact sheets, the tool/tile/button/plate/star contact sheets, the win pieces and the dimmed backdrop, and compared them with painted mock v2 (`ref/mock_v2_02_mid.png`). I did not run pixel tools (no node_modules in this worktree), so sizes come from the README and hole counts are by eye. The 3D set was only used as a style reference; the 3D contact sheet is in `ref/`.

## Verdict table

| Piece | Score | Verdict | Failed | Note |
|---|---|---|---|---|
| cannon_stage_blank | 18/20 | **KEEP** | 20 | Matches the mock: wood, red and blue bands, brass rings, top-left light. 12 holes by eye. Canvas is square 696x696, so anchor by object bbox. |
| coil_stage_blank | 16/20 | **KEEP (with notes)** | 10-11 at 70 px, 18 | Now one family with the cannon (soft painted 3D, brass rings, same blue). Only the base is wood, the rest is blue and brass, so it is less "wood toy" than the cannon. The petal cluster is busy; the silhouette reads well. About 12 holes: 5 petal ends, 1 ball, 3 spring, 3 base (2 visible plus 1 hidden) - Pixel Checker must measure. Outline is thin red-brown. |
| bell_stage_blank | 14/20 | **FIX** | 8, 9, 13, 18, 19 | Silhouette is great, but it is almost all yellow gold, with one blue stripe. No wood anywhere, so it is the odd one next to the cannon and coil. Highlights are hot and saturated, which gives no value steps in grayscale (item 12 risk). Holes sit on the bells themselves (5 bell holes plus frame), more than 12 and some on moving parts. Thin red outline. Redo note below. |
| result_hero_pieces_cannon | 15/20 | **REDO (still open)** | 17, 19 | Not regenerated. Carriage blocks and the red block differ from the final stage; barrel has 7+ holes and the stage has 6. A player would see a different cannon from the one built. |
| sy_backdrop_painted_dim | 14/20 | **REDO (still open)** | 8, 9, 12 | Looks the same as before: the bottom third is still bright orange with sharp loose screws in all corners and a sharp blueprint. The baked dim is barely visible in the bottom third. Screws in play will compete with those. Not regenerated. |
| tool_icon_broom / hammer / drill | 19 / 19 / 18 | **KEEP** | 20 | Re-sliced at 192 px. Distinct silhouettes (diagonal, T, L), readable at 70 px and in grayscale. Hammer matches the mock. |
| tool_tile_cream_brass | 16/20 | **FIX** | 14 (critical) | A **magenta/purple fringe runs along the bottom edge** (visible on dark and light). It is leftover key colour. Defringe or re-slice with a tighter tolerance and a despill pass. Otherwise a good match with the mock tile. Size 224x212. |
| tool_tile pressed | 14/20 | **FIX** | 14 | Same fringe, now at 94% scale and darker, so the state reads. After defringing, keep. |
| btn_round_brass_base | 18/20 | **KEEP** | 20 | Clean at 192 px. |
| btn_round_brass_base_pressed | 18/20 | **KEEP** | 20 | Smaller and darker, reads as pressed. |
| plate_plum_brass | 16/20 | **FIX (code)** | 17, 20 | Clean edge and scallops; 528x123 is 4.3:1 against the 5.5:1 slot, so set nine-slice caps to the real cap width (~70 px at 528) and test at 264x48. Nothing to regenerate. |
| star_empty | 17/20 | **KEEP** | 12 | Reads empty beside the gold star; slightly dull edge. 64 px is exactly the manifest slot, but it is 1x only: ship a 128 px version if the star is 2x. |

## Checks you asked for

* **Style match to the mock:** cannon, coil, tools and buttons match. Bell does not (yellow only). Win pieces drift. The 3D set uses a softer, lower-outline look; the GPT pieces carry a thin warm outline, which is the same mix the mock has, so acceptable.
* **Blank stages really blank:** yes, no screws painted on any of the three; every hole is an empty brass-ringed hole. Cannon has 12. Coil is about 12 and bell looks like 14-17 (5 bell holes, ~8 frame holes, 3-4 base holes): by eye, not measured.
* **Tool icons readable:** yes at 70 px and grayscale.
* **Fit at 2x without upscaling:** icons 192, buttons 192, tile 224x212, plate 528 wide, stages 696 canvas (object at about 620 px wide for the cannon): all at or above the 2x manifest sizes, so no upscaling needed. Backdrop 780x1688 is the 2x cover fit; raw is 852 wide.
* **Clean edges:** stages clean on both backgrounds (no halo visible; the gate's 7.5-14% is the light wood/brass false positive). **Tool tile and pressed tile have a magenta fringe.** Check the buttons and plate for the same on a dark background: none visible.

## Still needs regeneration

### 1. Bell stage (one redo)

Attach `sliced/cannon_stage_blank/cannon_stage_blank.png` and `sliced/coil_stage/coil_stage_blank.png` as style masters, plus the current bell.

> "Same toy-set material as the two attached sprites: soft painted 3D, thin warm-brown outline (#4a2a1a, about 3% of height), light from top left, subtle rim light. Redraw the attached bell chime: the frame, base and side posts in warm natural wood (#d99a3c grain), the bells in brass, the rod and weights blue (#2f6fd6) with red (#d63a2a) end caps. Brass-ringed EMPTY holes only: exactly 12 (2 per post, 3 on the base, 5 on the top rail), none on the bells. No screws, no text. Flat #FF00FF background, centred, 8% padding."

### 2. Win pieces (cannon taken apart)

Attach the final cannon stage and `ref/mock_v2_04_win.png`.

> "The SAME cannon as attached, taken apart into 5 floating pieces, fully visible, nothing overlapping: barrel (exactly the same holes and bands), carriage block, red end block, blue bracket, 2 wheels. Same wood, same red/blue/brass, same outline. No screws, empty brass-ringed holes only, small gaps between pieces, flat #FF00FF background, 8% padding."

### 3. Backdrop (redo, needed for real)

> "Same painted workshop bench, top-down tilt, much more depth of field: foreground bench surface smooth, warm and low contrast (muted tan-brown, no bright orange), no loose screws, bolts or blueprint in the lower 60%; clutter only in the top 35%, soft-focus. Leave the centre empty for a game board. 780x1688, portrait. No text."

## Other fixes (no GPT)

1. Defringe both tool tile PNGs (replace magenta-tinted edge pixels with the neighbouring brass colour, or re-slice with `--tol 120` and despill).
2. Plate nine-slice caps ~70 px of 528.
3. Pixel Checker: measure the 12 hole centres per stage; flag the bell until redone.
4. Record the stage halo gate exception (8% limit versus 7.5-14% for light wood and brass) in the slice tool notes.

## Set consistency

Cannon, coil, tools, buttons are one family. Bell and win pieces are not. Backdrop is too busy and too bright to sit under the stages.
