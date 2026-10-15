# Critique #87: rendered 3D Screw Yard assets (screw-yard-3d-v2)

Critic: art-director-critic, 2026-10-15. Subject: `art-candidates/screw-yard-3d-v2/` (branch `orch/t-373c27b6-render-the-16-code-3d-render-scr`, commit 1ecbdd1). Benchmark: painted mock `v2_02_mid.png` (branch `orch/t-640f9aa7-painted-screw-yard-mocks-fix-01`). Checked: contact sheets on dark and light, 110 / 70 px / grayscale sheet, spin strip, and an alpha scan of every 1x file (bounding box, padding, semi-transparent and light low-alpha pixels). No files were changed.

## Overall

The screws read as screws (domed pan head, cut-through Phillips cross, helical thread), and red / blue / gold / green are clearly different in colour. Light is top-left, outline is a consistent warm brown, edges are clean on both backgrounds. Next to the painted mock they look like a plainer, softer toy version: heads are tall buttons, side screws look like coil springs, and the three "furniture" pieces (toolbox, beam, turntable) are weak. Set consistency: good among the screws, poor between screws and furniture.

Problems that hit several assets:
- **Mesh seam notch.** All heads, the collar and the ring have a small notch / step on the right edge at about 3 o'clock (rubric 14, critical). Fix once in the renderer (close the revolve seam or rotate the seam to the back).
- **Grayscale (12).** At 70 px grayscale red, blue and green sit within about one value step; only gold separates. Colour alone carries identity, which the owner has not decided on. Add a value gap (darker blue, lighter red) or the glyph/shape code.
- **Content does not fill the manifest size (20, size).** Toolbox art is 219 px wide in a 340 px sprite (left pad 69, right 51), beam 292 in 358 (37 / 28), turntable 297 in 390 (49 / 43), next box touches the right edge (pad 0). The sprites are the right file size, but placed in the manifest slot they would draw about 35% too small and off-centre. Re-frame so the object fills the slot with 6-10% padding and the baked shadow stays inside.
- **Baked shadows fall right** on six assets; the game should be able to drop them. Ship a no-shadow variant.

## Per asset

| Asset | Score | Verdict | Failed items |
|---|---|---|---|
| screw_head_R / U / Y / G | 16/20 | FIX | 14 (seam notch), 12 (R and U too close in gray), 6 weak AO under cap step |
| screw_side_R / U / Y / G | 14/20 | FIX | 13 (thread reads as a coil spring: wide as the head, too few turns), 10 (head too small vs thread), 14 (seam) |
| screw_washer_collar | 15/20 | FIX | 14 (seam), 20 (right shadow, uneven pad 3 / 2), 7 |
| screw_spin_frames | 11/20 | REDO | 10, 18, 19 (see below) |
| hole_ring_brass | 16/20 | FIX | 14 (seam), 17 (hole looks flat black, no inner wall) |
| plank_5hole_3d | 16/20 | KEEP after minor fix | 20 (left pad 11, right 8), holes small vs the mock |
| toolbox_wide_open_3d | 9/20 | REDO | 19, 20, 10, 17 |
| holding_row_beam_3d | 13/20 | FIX | 20, 19, 17 |
| next_box_steel | 14/20 | FIX | 20 (right pad 0, shadow clipped), 13, 14 |
| turntable_disc | 11/20 | REDO | 19, 20, 13, 17 |

Notes:
- **Heads.** Colours are distinct; cross reads at 70 px. Pan head is a good choice. The two-tier dome looks like a bottle cap; flatten the top tier a little. Mock heads are shinier with a single bright spec; ours are matte-soft (item 4).
- **Side views.** Blue and red thread tones are close to the head tone, so the screw loses the head/shank break at 70 px. Use a lighter steel-ish shank tinted by the colour, with 6-8 finer turns.
- **Spin strip.** All 12 frames look nearly the same: only the cross turns and the thread barely shifts, so it does not read as rotation. The face is washed pale (item 8) and the cross reads as an X. Red only; the other three colours are missing. Redo with the thread phase shifting a full pitch over 12 frames, the face at the same brightness as the head asset, and all four colours (or a documented recolour switch).
- **Toolbox.** Reads as a small pixel lunchbox, not the mock's big open red lid over a cream three-well tray with a steel NEXT pair. No lid, flat colours, tiny and off-centre. Redo: show the open lid back, deep wells with inner shadow, brass hinges and latch, fill the 340 x 108 slot.
- **Row beam.** Five small shallow wells; the mock has big round deep recesses (about 60% of beam height). Pegs add width and push the content off-centre.
- **Turntable.** Plank seams are faint, one flat orange. The mock is a thick radial-plank disc with visible bevel and wear. Add contrast between planks and a thicker rim.

## Redo notes (one sentence each, max 35 words)

- Heads: "Fix: 14 remove the 3 o'clock seam notch, 12 darken blue and lighten red so they differ by 2 value steps, 4 add one bright specular shape top-left."
- Side screws: "Fix: 13 use 6-8 finer thread turns with a lighter metallic shank, 10 enlarge the head to 1.3x, 14 remove the seam."
- Collar and ring: "Fix: 14 remove the seam, 20 centre and shorten the right shadow so padding is equal, 17 give the ring an inner wall."
- Spin strip: "Redo: 10 shift the thread one full pitch across the 12 frames, 8 match the face brightness of the head asset, 19 render all four colours."
- Plank: "Fix: 20 centre horizontally, enlarge hole rings about 15%."
- Toolbox: "Redo: 19 draw the open lid, deep cream wells and brass hinges as in the mock, 20 fill the 340 x 108 slot with 6-10% padding, 17 raise the camera pitch."
- Row beam: "Fix: 19 make the wells large and deep (about 60% of beam height), 20 remove the end pegs from the slot width and centre."
- Next box: "Fix: 20 keep the shadow inside the sprite (pad at least 3 px right), 13 give the well a darker inner wall."
- Turntable: "Redo: 19 radial planks with strong value gaps and a thick bevelled rim, 20 fill the 390 x 150 slot, 13 add wood grain and wear."

## Sizes against the manifest

Every file has the manifest size at 1x and exactly twice at 2x (heads 48, sides 40 x 48, collar 56, ring 48, plank 160 x 48, toolbox 340 x 108, beam 358 x 76, next box 72 x 56, turntable 390 x 150, spin 576 x 48). The failure is not file size but the object's share of the sprite (see Overall). Padding is right for the screws (6-9%).

## Variants (slotted)

Slotted heads and side views are not in the manifest. They look as good as the Phillips ones and share the seam notch. The slot reads worse at 70 px than the cross; prefer Phillips unless the owner wants slot for one colour family.

## Next steps

1. Fix the seam and shadow options in `tools/render-yard-3d-v2.mjs`, re-render everything.
2. Redo the toolbox, turntable and spin strip, fix the beam and the next box.
3. Re-critique (redo 1 of at most 2).
