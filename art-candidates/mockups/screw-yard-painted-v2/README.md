# Screw Yard painted mocks v2 (ChatGPT, 2026-10-15, task t-640f9aa7)

Consistent set built from critique #83 (`docs/art/mocks/screw-yard/PAINTED_CRITIQUE.md` on branch `orch/t-3caf8dd1-critic-and-layout-check-painted`). Image 01 of v1 (`ref/painted_01_start.png`) was uploaded as a reference into ONE ChatGPT chat, then the four states were asked for in that chat, so the cannon, toolbox, HUD, drill and bench carry over. All images 852x1846 (about 9:19.5).

| File | State | Tries | Winner |
|---|---|---|---|
| `v2_01_start.png` | Start, TAPS 0/36, BONUS 0:52, hand + TAP A SCREW | 1 | yes |
| `v2_02_mid.png` | Mid, TAPS 14/36, 2 stars, 2/5 row, flying red screw, +1 SCREW, empty brass-ringed holes | 1 | yes |
| `v2_03_danger.png` | Danger, 27/36, 1 star, red clock 0:06, row 4/5, red ring, 1 SLOT LEFT!, no hand, weak red glow, 3 screws left, top block lowered | 2 | try 2 wins (`v2_03_danger_try1.png` kept for reference: red glow too heavy, hand and TAP A SCREW still there, warning bubble near the edge) |
| `v2_04_win.png` | Win panel, TAKEN APART!, 3 stars, cannon in pieces (the 01 cannon), PLAY AGAIN, NEXT: COIL | 1 | yes |

`ref/` holds the v1 images used as reference (v1 01 was the master).

## Prompts (same chat; image 01 v1 attached to the first)

1. Create an image. The attached image is the STYLE MASTER ... Redraw as ONE finished full-page phone-portrait screen, 9:19.5, keeping EXACTLY the same glossy 3D toy look, same wooden cannon with red and blue bands, same red toolbox, same HOLDING ROW, brass buttons, plum title plate, BROOM/HAMMER/DRILL tiles with the blue and red drill, undo/redo arrows, bench. Fixes: top block about 5 percent lower, clock pill filled with stopwatch and BONUS 0:52, screws contrast with the part they sit on (no red-on-red, blue-on-blue, gold-on-brass), larger NEXT / HOLDING ROW / tool labels, clear bottom margin. Keep hand and TAP A SCREW. 12 real screws.
2. Same screen, same style, same size and top margin, SAME cannon / toolbox / HUD / drill / bench; only the state changes: MID-PUZZLE (14/36, 2 stars, BONUS 0:31, blue screw in toolbox well 1, row 2/5 gold + green, about 6 screws left with empty brass-ringed holes, flying red screw with sparkle trail and +1 SCREW; no hand, no bubble).
3b. Retry (winner): "Redo the DANGER screen with these corrections only: remove the hand and TAP A SCREW bubble, keep the small red warning bubble over the holding row's right end; red screen-edge glow about 10 percent; exactly 3 screws left; whole top bar about 5 percent lower with empty wooden margin."
3. Same screen ... DANGER (27/36, 1 star, red BONUS clock 0:06, toolbox 2/3, row 4/5 red, blue, gold, green, 5th well red ring + 1 SLOT LEFT!, about 3 screws left, red edge glow about 20 percent, worried warning bubble, tool tiles lightly glowing).
4. Same style ... WIN: dimmed screen behind a cream-and-brass panel, red ribbon TAKEN APART!, 3 stars, sunburst, confetti, the SAME wooden cannon taken apart, chips TAPS 24/36 and ROW PEAK 2/5, +6 CANNON CARDS, green PLAY AGAIN with glint, tall brass NEXT: COIL, nothing legible behind.

## Critique fix list vs result

- 03 REDO: now the 01 cannon, toolbox, row beam, cream TAPS plate, blue/red drill. Done.
- 04 hero pile: now the 01 cannon in pieces. Done. NEXT: COIL is about 100 px tall on 1846 (about 46 css px at 390 wide): passes 44. Tool tiles behind the panel are gone. Done.
- Same cannon / toolbox / HUD / drill in all four: yes.
- Live BONUS clock face: painted in 01-03 (still must be live text in game).
- Screw/band colour clashes: improved, not gone. A red screw still sits on the red band at the top of the barrel in 01, and a red screw on the red plate edge in 02/03. Pixel Checker should note it.
- Top block lowered: 01 and 02 moved down about 35 px (about 16 css px), 03 about 50 px (about 23 css px), none reach the 40 css px asked; 04 panel hides the HUD. The painted HUD is meant to be rebuilt as live layers anchored to the safe area anyway.
- Small text: NEXT, HOLDING ROW and tool labels are larger in 01/02; in 03 they are the old size.

## Still open

- Undo/redo vs turn arrows (owner decision from critique #83): all four keep the undo/redo arrows.
- Exact safe-area numbers need the Pixel Checker.
- Danger: red glow is baked into the painting, must be a code overlay at build time.
