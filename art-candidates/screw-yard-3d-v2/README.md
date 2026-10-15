# Screw Yard 3D v2: the 16 CODE-3D-RENDER assets

Rendered for the painted Screw Yard mock v2 (`docs/art/mocks/screw-yard/ASSETS_PAINTED.md`, manifest `art-candidates/mockups/screw-yard-painted-v2/manifest.json` on branch `orch/t-c006287d-asset-breaker-screw-yard-painted`). Free tools only: three.js 0.170 in headless Chrome (software GL), sharp. `src/` is untouched; nothing is wired into the game.

Look: glossy toy 3D, one light rig (key top-left, warm rim back-right, warm env map), warm dark-brown ink outline (3.5% of sprite height, `#3a2216`), orthographic camera per asset (pitch 52 for heads/collar/ring/plank, 26 for side screws, 50 for toolbox/row/box, 21 for the turntable, yaw 0). Transparent background, 7.5% padding.

Screws: pan-head with a real recess. Phillips cross (cut through the cap, dark floor) is the default; slotted heads are in `variants/` (`_slot`). Side views and spin frames have a real helical thread; thread/core are darker shades of the head colour. Colours: red `#e8452c`, blue `#2f6fe0`, gold `#f2b632`, green `#2fa84f`.

Files: `1x/<id>.png`, `2x/<id>.png` (2x is exactly twice 1x). Contact sheets: `contact-dark.png`, `contact-light.png` (everything, incl. slotted variants), `contact-small-dark.png` / `contact-small-light.png` (screws, collar and ring at 110 px, 70 px and 70 px grayscale), `contact-spin-dark.png` / `contact-spin-light.png` (the 12 spin frames at 4x).

| id | 1x | 2x | notes |
|---|---|---|---|
| screw_head_R / U / Y / G | 48x48 | 96x96 | Phillips, top-ish view (pitch 52) |
| screw_side_R / U / Y / G | 40x48 | 80x96 | with helical thread, pitch 26 |
| screw_washer_collar | 56x56 | 112x112 | neutral steel washer, two value steps, baked soft shadow |
| screw_spin_frames | 576x48 | 1152x96 | 12 frames in one row, 48 / 96 px each, red; recolour by hex with `--hex` edit in `SPEC` |
| hole_ring_brass | 48x48 | 96x96 | brass ring around a dark hole |
| plank_5hole_3d | 160x48 | 320x96 | oak plank, 5 holes with brass rings (3-hole not rendered) |
| toolbox_wide_open_3d | 340x108 | 680x216 | red body, cream 3-well tray, steel 2-well NEXT pair, brass latch and hinges, no baked text |
| holding_row_beam_3d | 358x76 | 716x152 | oak beam, 5 recessed wells, end pegs |
| next_box_steel | 72x56 | 144x112 | steel tray with one square well |
| turntable_disc | 390x150 | 780x300 | 3-plank oak disc, bevelled edge, baked shadow |

Variants (not in the manifest): `variants/{1x,2x}/screw_head_{R,U,Y,G}_slot.png`, `screw_side_*_slot.png`.

## Re-render

```
npm install                      # three, puppeteer-core, sharp (all already devDependencies)
node tools/render-yard-3d-v2.mjs                    # everything, about 5 minutes with software GL
node tools/render-yard-3d-v2.mjs --only screw_head_R,toolbox_wide_open_3d --variants off
node tools/yard-3d-v2-contact.mjs                   # rebuild the contact sheets
```

Chrome path: env `CHROME` (default `C:/Program Files/Google/Chrome/Application/chrome.exe`). To change a colour edit `COLORS` in `tools/render-yard-3d-v2.mjs`; sizes, camera and shadows are in `SPEC`.

## Known limits

- Pixel sizes and lighting are matched by eye to the painted v2 images; the Pixel Checker should measure them. The painted mock has slightly more saturated, hand-painted highlights.
- Head-glyph / shape coding for the four colours is still an open owner question; slotted vs Phillips is not a colour code.
- The baked shadows (collar, plank, toolbox, row, next box, turntable) fall to the right; the game may want them off, then set `shadow: 0` in `SPEC`.
- Spin frames spin about the shank axis of a tilted screw; the cross is 4-fold symmetric, the thread is what makes the spin read.
