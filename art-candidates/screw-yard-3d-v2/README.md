# Screw Yard 3D v2 (pass 2, after CRITIQUE_87): the 16 CODE-3D-RENDER assets

Rendered for the painted Screw Yard mock v2 (manifest `art-candidates/mockups/screw-yard-painted-v2/manifest.json`). Free tools only: three.js 0.170 in headless Chrome (software GL), sharp. `src/` is untouched; nothing is wired into the game.

What changed in pass 2 (critique #87: REDO toolbox, turntable, spin strip; FIX heads, side screws, collar, ring, beam, next box; plank minor):
- **Seam notch gone** (heads, collar, ring): circles are explicit polygons without a repeated closing vertex, seam turned to the back; lathe seam turned to the back.
- **Fit to the manifest slot**: every asset is cropped to its content (object + ink + shadow, union over all spin frames) and scaled so the limiting axis leaves 6.5% each side, centred; furniture may stretch up to 10% to hit the slot. Fill table: `FILL_REPORT.md` (toolbox 86x87%, beam 87x87%, turntable 85x87%, was 64-82% and off-centre).
- **Colour value split**: R `#ff805c`, U `#1c45ac`, Y `#f2b632`, G `#1f8238` so the four read as four grays at 70 px (see `contact-small-*.png`). One bright specular glint top-left on every head.
- **Heads**: flatter cap tier. **Side screws**: head 1.3x, light steel shank tinted by the colour, 8 finer thread turns.
- **Ring**: inner brass wall plus dark floor. **Plank**: holes and rings 15% bigger, centred. **Next box**: darker well floor.
- **Toolbox (redo)**: warm wood body, wide red open lid with brass latch and two brass hinges, cream 3-well tray, steel 2-well NEXT pair. **Beam**: big deep round wells, end pegs removed. **Turntable (redo)**: round disc of 8 radial planks with strong value gaps and visible grain, thick bevelled wood rim.
- **Spin strip (redo)**: coarse thread (one full turn = one pitch of travel, so frame 12 == frame 0 and the loop is seamless), rim notch so the 4-fold cross cannot hide the rotation, specular not baked into the spin, all four colours: `screw_spin_frames` (red, manifest id) plus `screw_spin_frames_U`, `_Y`, `_G`.
- Baked shadows now use a near-overhead light (short, stays inside the slot). `--shadow off` renders every asset without a baked shadow.

Look: glossy toy 3D, one light rig (key top-left, warm rim back-right), warm dark-brown ink outline (3.5% of sprite height, `#3a2216`), orthographic camera, transparent background. Files: `1x/<id>.png`, `2x/<id>.png` (2x exactly twice 1x), slotted variants in `variants/`. Contact sheets: `contact-dark.png`, `contact-light.png`, `contact-small-*.png` (110 px, 70 px, 70 px grayscale), `contact-spin-*.png` (4 colours x 12 frames, 2x enlarged).

| id | 1x | 2x | notes |
|---|---|---|---|
| screw_head_R / U / Y / G | 48x48 | 96x96 | Phillips, pitch 52 |
| screw_side_R / U / Y / G | 40x48 | 80x96 | helical thread |
| screw_washer_collar | 56x56 | 112x112 | steel washer, baked soft shadow |
| screw_spin_frames (+_U/_Y/_G) | 576x48 | 1152x96 | 12 frames per row |
| hole_ring_brass | 48x48 | 96x96 | brass ring, inner wall |
| plank_5hole_3d | 160x48 | 320x96 | oak plank, 5 holes |
| toolbox_wide_open_3d | 340x108 | 680x216 | wood body, red lid |
| holding_row_beam_3d | 358x76 | 716x152 | oak beam, 5 deep wells |
| next_box_steel | 72x56 | 144x112 | steel tray |
| turntable_disc | 390x150 | 780x300 | radial-plank disc |

## Re-render

```
npm install                      # three, puppeteer-core, sharp (all already devDependencies)
node tools/render-yard-3d-v2.mjs                    # everything, about 5 minutes with software GL
node tools/render-yard-3d-v2.mjs --only screw_head_R,toolbox_wide_open_3d --variants off
node tools/yard-3d-v2-contact.mjs                   # rebuild the contact sheets
node tools/yard-3d-v2-fill.mjs                      # rebuild FILL_REPORT.md
node tools/render-yard-3d-v2.mjs --shadow off --out <dir>   # no baked shadows
```

Chrome path: env `CHROME` (default `C:/Program Files/Google/Chrome/Application/chrome.exe`). To change a colour edit `COLORS` in `tools/render-yard-3d-v2.mjs`; sizes, camera and shadows are in `SPEC`.

## Known limits

- Pixel sizes and lighting are matched by eye to the painted v2 images; the Pixel Checker should measure them. The painted mock has slightly more saturated, hand-painted highlights.
- Head-glyph / shape coding for the four colours is still an open owner question; slotted vs Phillips is not a colour code.
- The baked shadows (collar, plank, toolbox, row, next box, turntable) fall to the right; the game may want them off, then set `shadow: 0` in `SPEC`.
- Spin frames spin about the shank axis of a tilted screw; the cross is 4-fold symmetric, the thread is what makes the spin read.

## Round 2 (after CRITIQUE 91: FIX toolbox, turntable, spin strip; side screws minor)

- **Toolbox**: body and walls now red like the painted mock (lid, body, trim one red family); dark-red cavity floor, dark inner-shadow strip under the lid, deeper tray wells. Baked shadow removed (it caused the grey sliver on the right edge); clean alpha.
- **Turntable**: 12-wedge sunburst replaced by 5 horizontal plank seams with staggered butt joints and wood grain; honey rim (the mock's wood, no red-brown); baked shadow removed, no halo.
- **Spin strip** (all four colours): thread pitch 0.2 -> 0.095 with 10 turns and a thinner tube, so it reads as a screw not a spring; rim notch removed; tilt identical in every frame; loop stays seamless (a full turn of a helix is the same shape).
- **Side screws**: darker core for a visible groove between turns, sharper tip.
- Fill report (`FILL_REPORT.md`): toolbox 85x87%, turntable 85x87%, spin 85x88%, 0 flagged.
- Re-rendered at 1x and 2x with the manifest ids; contact sheets rebuilt. Toolbox and turntable no longer carry a baked shadow (`shadow: 0` in SPEC); the game draws its own.
