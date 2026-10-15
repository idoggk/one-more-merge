# CRITIQUE 94: the 13 GPT-image Screw Yard assets

Critic pass on branch `orch/t-5c263b0f-chatgpt-batch-the-13-gpt-image-s` (`art-candidates/screw-yard-new/`). Compared against the painted mock `v2_02_mid.png`, the 3D set (`screw-yard-3d-v2`) and the manifest (`screw-yard-painted-v2/manifest.json`). I opened the raw sheets and the sliced contact sheets. Scores use the 20-point rubric; the note numbers are rubric items. Gate numbers (halo %, hole counts) come from the author's gates.json and my own count by eye, not a new measurement.

## Set-level findings

1. **The sliced sprites are 256x256 for everything** (plate 1024x325), not "2x". The manifest needs 696x560 (2x) for each stage, 96x96 for round buttons and about 192 px for tool icons. The stages would be upscaled 2.7x. The raw sheets are 1254 px with the object about 1000 px wide, so the data exists: re-slice at full size (a slice-tool setting, not a new image).
2. **Style split.** Tools, tile, button, plate, star and cannon match the mock: glossy toy look, warm brown outline, top-left light. Coil and bell are flatter and cartoonier, with a heavier, more uniform outline. Cannon, coil and bell do not look like one set.
3. **"Blank" is only half true.** The holes are brass-ringed and no screws are painted, which is good. But each stage has about 14 holes and the mock has 12 (manifest `holeMap01`). Extra holes are fine only if the Pixel Checker maps them; every unused hole in play would show as an empty hole, so the surplus must be removed or declared decorative.
4. **Light rim, key and edges.** The sliced edges are clean on the dark contact sheets. The stage and win-piece halo gate FAIL (12-14%) comes from brass and pale wood, as the author says. I agree it is a false positive, but the gate threshold should be recorded, not ignored.
5. The 3D set uses a flat, soft, low-outline look (screw heads with no outline), while the GPT pieces carry a dark brown outline. Mixed in one scene this is visible at the screw collars. Not a blocker, since the mock itself has the same mix.

## Per piece

| # | Piece (manifest id) | Score | Verdict | Failed items | Note |
|---|---|---|---|---|---|
| 1 | tool_icon_broom | 19/20 | **KEEP** | 20 (tight padding) | Reads at 64 px (yellow bristles and blue band). Re-slice at 192 px with 6-8% padding. |
| 2 | tool_icon_hammer | 19/20 | **KEEP** | 20 | Silhouette is clearly T-shaped, red handle contrasts with the grey head. Grey head is the lowest-chroma area, fine. |
| 3 | tool_icon_drill | 18/20 | **KEEP** | 18, 20 | Blue body is big and reads at 64 px. At 64 px hammer and drill share blue/red/grey accents but the silhouettes (T vs L) stay distinct; in grayscale all three still separate by shape. |
| 4 | tool_icons_sheet (raw) | n/a | KEEP | | Same sheet as 1-3, no separate work needed. |
| 5 | tool_tile_cream_brass | 18/20 | **KEEP** | 20 | Good match with the mock tile; the label bar at the bottom is kept blank. Re-slice at 2x size; nine-slice insets of 24 need checking against the corner radius. |
| 6 | tool_tile pressed | 15/20 | **FIX** | 12, 17 | Not smaller or darker than the normal tile, so the state is invisible. Scale and darken in code (0.94, -8% value), or drop the file. |
| 7 | btn_round_brass_base | 18/20 | **KEEP** | 20 | Clean brass ring with brown centre, matches the mock buttons. Good at 48 px. |
| 8 | btn_round_brass_base pressed | 14/20 | **FIX** | 12, 17 | Centre is darker (good) but the size is identical to the normal button. Apply the 3% scale in code; the rest is fine. |
| 9 | plate_plum_brass | 16/20 | **FIX** | 17, 20 | Scalloped ends and rivets match the mock plate. The shape is 1024x325 (3.1:1) while the manifest slot is 264x48 (5.5:1) with nine-slice 20; the scalloped caps would be squashed to 48 px high. Check the cap crop keeps the whole scallop, or set the nine-slice to the real cap width (about 140 px of 1024). |
| 10 | star_empty | 17/20 | **FIX** | 12 | Brown on brown, reads as an empty slot, silhouette is right. The inner bevel is faint in grayscale, so deepen the inner face (darker) to be clearly empty next to the gold star. Minor, can be done in code with a multiply tint. |
| 11 | cannon_stage_blank | 16/20 | **FIX** | 14 (halo gate, false positive), 18, 20 | Best of the three stages and the right style. Camera and carriage differ from the mock (barrel higher, muzzle blue/red order). About 14 holes against 12. Resolution is the real blocker: 256 px vs 696x560. Re-slice from the 1254 raw; remove or declare the extra holes. |
| 12 | coil_stage_blank | 13/20 | **FIX (second try = REDO)** | 3, 9, 13, 19 | Looks like another game: flat vector gloss, uniform heavy outline, no wood grain or soft shading. The petals are blue plastic, while the cannon is wood. Redo from the 3D look: soft rim light, same outline weight as the cannon, holes limited to the real hole count. |
| 13 | bell_stage_blank | 13/20 | **FIX (second try = REDO)** | 3, 13, 19 | Same issue as the coil: cartoon vector bells. Holes are the small dark dots on the frame, and read at 110 px. The frame colour (cream and blue) is not in the mock palette. Redo with the cannon prompt's wood-and-brass material set. |
| 14 | result_hero_pieces_cannon | 15/20 | **FIX** | 14 (halo gate), 17, 19 | Parts match the cannon stage in colours. Carriage blocks are redrawn and differ from the stage, so the win animation would show an object that does not match the one just built. Pieces float slightly apart, which is right. Resolution as for 11. |
| 15 | sy_backdrop_painted | 14/20 | **FIX** | 8, 9, 12 | Beautiful, but bottom third is bright orange wood with sharp loose screws at the corners that compete with the game screws; the manifest asked for a "warm low-contrast" backdrop. Overlay a code dim (40% brown at the bottom) or redo with a softer depth of field. Dimension 852x1846 is below 780x1688 2x cover-fit at larger phones only slightly; fine. |

(The brief counted 13 assets; counted as the manifest ids above, items 4 and the two pressed variants are sheet or state files.)

## Verdict summary

* **KEEP (5):** broom, hammer, drill, tool tile, round button.
* **FIX, cheap (code or re-slice only, 7):** tile pressed, button pressed, plate nine-slice, star tint, cannon stage resolution and hole count, win pieces, backdrop dim.
* **REDO (2):** coil stage, bell stage (family resemblance fails).

## FIX / REDO brief list

1. **Re-slice all sprites from the raw sheets at full resolution** (tools/slice-sheet.mjs with an output size of 696x560 for stages, 192 for icons, 192 for tile, 96-192 for buttons). The 256 px outputs are unusable for the 2x targets. Keep the `--tol 100` key. Keep 6-10% padding (item 20).
2. **cannon_stage_blank:** re-slice only. Then the Pixel Checker maps the holes. If 14 holes remain, either choose which two are decorative (rim rivets) or ask for a single GPT edit "exactly 12 empty brass-ringed holes, positions as the mock".
3. **coil_stage_blank (REDO):** attach `cannon_stage_blank.png` (the sprite, not only coil_5) as the style master plus coil_5 for the shape. Prompt: "same toy material as the attached cannon: soft painted 3D, thin warm-brown outline 3% of height, light from top left, subtle rim light; blue plastic petals with brass-ringed empty holes; about 10 holes; flat #FF00FF key." One try.
4. **bell_stage_blank (REDO):** same method with bell_5. Frame in golden wood like the cannon, not cream; bells in brass; empty holes only on the frame and the base, 8-10 of them.
5. **result_hero_pieces_cannon:** one more try with the *final cannon stage sprite* attached, "the SAME cannon taken apart, same carriage blocks and the same red plate, no screws". Do this after the stage is fixed so the pieces can match.
6. **Pressed variants (tile, button):** do not regenerate. Scale 0.94 and darken in code.
7. **plate_plum_brass:** set the nine-slice to the real cap width (measure about 140 px at 1024 wide) and test at 264x48; if the scallop gets squashed, ask GPT for a 5.5:1 plate.
8. **star_empty:** darken the inner face in code, or accept as is if the QA screenshot reads fine next to the gold star.
9. **sy_backdrop_painted:** add a code overlay under the playfield (brown, about 35% at the bottom third) and check that the screw colours stay readable (rubric 8). Redo only if the overlay looks muddy.
10. **Process:** record the stage halo gate threshold exception (light wood and brass, 12-14% against 8%) in the slicing tool notes so the next critic does not chase it.

## Standards missing (proposed)

* A style lock with numbers: outline 3-4% of sprite height in `#4a2a1a`, palette from the cannon (wood `#d99a3c`, brass `#e8a825`, blue `#2f6fd6`, red `#d63a2a`).
* A stage hole count per object (cannon 12, coil ?, bell ?) in the manifest, so "blank" is checkable.
