# Screw Yard 3D renders v2 — re-critique (critique #91)

Subject: `art-candidates/screw-yard-3d-v2/` on branch `orch/t-5e05f8ac-fix-the-3d-screw-yard-renders-pe`, against the painted mock v2 (`art-candidates/mockups/screw-yard-painted-v2/`, branch `orch/t-640f9aa7-...`).
Looked at: contact-light (all 19 + variants), contact-small (110 px / 70 px grayscale), contact-spin-light, 2x toolbox, turntable, head_R, FILL_REPORT. Not every 2x file was opened. CRITIQUE_87 itself was not found in the repo; its items are taken from the task brief (seam notch, toolbox/turntable/spin strip redo, fill 85-88% centred, plank).

## CRITIQUE_87 items

| item | result |
|---|---|
| 3 o'clock seam notch on heads/collar/ring | FIXED. Heads, collar, ring are smooth at 3 o'clock on the contact sheet and on 2x head_R. |
| Fill 85-88%, centred | FIXED for the limiting axis (report: all 19 ok, pads within 1 px). Collar 73% and ring 75% on the other axis are accepted (circles). |
| Plank | FIXED. Larger holes, brass rings, reads as a 5-hole plank. |
| Toolbox redone | PARTLY. Reads as an open toolbox with lid, latch, 3-well tray and 2 NEXT wells. Still flat and does not match the mock (see below). |
| Turntable redone | PARTLY. Real wood with bevelled rim, good value gaps. Wrong layout versus mock; faint halo. |
| Spin strip redone | PARTLY. Loops, four colours, but reads as a spring (see below). |

## Per asset (KEEP / FIX / REDO)

- **screw_head_R/U/Y/G** (plus slot variants): 17/20. KEEP. Clean top-left gloss, one outline weight, four colours distinct by hue. In 70 px grayscale R (light grey) and Y (lighter grey) are close; hue carries it. Note: add a 1-step value separation (R darker) if colour-blind readability matters.
- **screw_side_R/U/Y/G**: 16/20. FIX (minor). Head is good. The thread is a pale-grey ribbed cone with a dark tip; it reads as a screw at 110 px but low contrast against the cream, tip is mushy at 70 px. Fix: 8 darker thread groove, steel in 3 value steps, sharper tip.
- **screw_washer_collar**: 17/20. KEEP. Steel read is good.
- **hole_ring_brass**: 18/20. KEEP.
- **holding_row_beam_3d**: 16/20. KEEP for now. Wells are deep and read as wells at 87% fill; beam is very thin (76 px slot), the mock beam is a chunky plank with a nameplate. Optional FIX: thicker front face.
- **next_box_steel**: 17/20. KEEP. Dark well floor works.
- **plank_5hole_3d**: 17/20. KEEP.
- **toolbox_wide_open_3d**: 13/20. FIX. (a) Body is orange-brown, mock body is red with red rim; here the lid is red and the body is not, so the two read as different objects. (b) A grey shadow sliver sticks out on the right edge (14, halo/fringe on light bg). (c) Wells are plain beige/dark boxes with little depth; the lid is a flat panel. Redo note: "Redo: 13 make body red like the mock, 14 remove the grey sliver at the right edge, 6 add inner shadow under the lid and deeper wells."
- **turntable_disc**: 13/20. FIX. (a) 12 sunburst wedges look like a pie/clock, the mock is a plain wood disc with a few plank seams; busy-ness (18). (b) Faint grey rim shadow at lower left/right edges shows as a halo on light backgrounds (14). (c) Wood is warm but the rim is a saturated red-brown not in the mock. Redo note: "Redo: 18 replace the sunburst with 4-5 parallel plank seams, 14 trim the grey shadow ring, 8 use the mock's honey wood for rim."
- **screw_spin_frames (R) and _U/_Y/_G**: 14/20. FIX. The 12 frames loop (cross is 4-fold symmetric, frame 12 flows into frame 1), the colours are distinct. But: the coarse thread is a fat coil that reads as a spring or bolt-on-spring, not a screw (13/17); the rim notch shows as odd nicks in frames 5-12 that look like render glitches at 70 px (14); the figure tilts so the silhouette jumps slightly between frames. Redo note: "Redo: 13 thread to about half the pitch with a visible groove so it reads as a screw, 14 make the rim notch a deliberate slot, 17 keep the tilt identical in every frame."

## Questions from the brief

- Seam notch at 3 o'clock gone: yes.
- Screws read as real screws: heads yes; side screws yes at 110 px; spin strip not yet (spring look).
- Colours distinct: yes by hue. Value: R and Y are only moderately apart in grayscale.
- Spin strip loops smoothly: yes numerically; the rim notch is the only visible per-frame jump.
- Fill 85-88% and centred: yes, per report and the sheets.
- Matches painted mock v2: partly. Head, ring, steel parts are close in spirit but the mock is painted and richer (chrome tapered threads, deep wells). The toolbox colour and turntable layout differ.

## Set consistency

The set is consistent in light, outline and palette. The toolbox and turntable are the odd ones out (flatter, different red). This is redo 1 of 2 for toolbox, turntable and spin strip, so one redo remains. If it fails again, switch approach (paint over the render or build them in the mock's own style) rather than another pass.

## Summary

KEEP: heads, collar, ring, beam, next box, plank. FIX: side screws (minor). FIX (redo 2): toolbox, turntable, spin strip.
