# Screw Yard: how to get better 3D assets ("Screwdom 3D" look)

Owner: Screw Yard art is among the weakest (AUDIT.md 1.13: screw 2, plates/boxes 1-2 "child made", objects 2). Budget: 0.

## What the game needs today
- Screws in 4-6 colours (`SCREW_COLORS` in `ScrewScene.ts`), baked per colour as `oy_screw_N`; owner: "screw looks weird" (tint on grey shifts shading).
- Plates (3 shapes), colour boxes (open toolbox, 3 holes), holding row (5 slots), blocks of the Taken Apart objects (Cannon, Coil, Bell; `yardObjects.ts`), 4 turned views, helper icons.
- Needs: one camera angle, one light (top-left), same ink outline, any colour, many sizes, spin / pop animation.

## Free tools found on this machine
- Chrome 155 (used by `tools/shots.mjs`) and `puppeteer-core`, `sharp`: present. three.js 0.170.0: installed from npm (free, MIT), pinned exact as a devDependency (cdnjs `three/0.170.0` is the same file if the npm copy is unwanted).
- Blender: **not installed** (not on PATH, no `C:\Program Files\Blender Foundation`). Free to download, but nothing was installed.

## The three approaches

| | A. ChatGPT images + `slice-sheet.mjs` | B. Code-built 3D in three.js, rendered to PNG | C. Blender script (free) |
|---|---|---|---|
| Quality ceiling | Highest painterly look, best "hero" feel | Clean toy/plastic look; good with an env map, bevels, AO; not hand-painted | Highest 3D: real AO, GI, soft shadows, bevel/subsurf |
| Consistency | Weak: each sheet drifts in angle, light, outline (CRITIQUE 8/9/17: perspective, seams, 16 of 36 offers FIX) | Perfect: one camera, one rig, one outline, by construction | Perfect, same as B |
| Effort | Per asset: prompt, retry, slice, critic pass; hours of owner browser time | One-off 1-2 days for a part library, then minutes per asset or colour | Install + learn bpy API; 2-3 days to match B |
| Cost | 0 (owner's existing plan) but uses the reserved browser | 0 | 0 (Blender GPL); install is a ~350 MB download |
| Recolour / resize | No: each colour is a new generation (or a lossy tint) | Yes: change a hex, re-render at any size | Yes |
| Animation | Hard: redraw frames, drift between them | Easy: render N frames of a spin (rotate Y 0-360), pop = scale in code; sprite sheet of 24-36 frames | Easy, best quality, slow to batch |
| Risks | Inconsistent set; baked text; no exact hole positions for gameplay | "Looks like code" if lit flat; software GL is slow for big sheets; outline needs tuning | Blender not installed; headless setup on Windows; more moving parts for a one-person flow |

## Proof (approach B)
`node tools/render-yard-3d.mjs` renders 6 assets into `art-candidates/screw-yard-3d/`: 3 screws (red, blue, gold), hex nut, plank with 3 holes, toolbox box. See that folder's README. Result: lighting, angle, shadow and outline are identical across all six, colours match the game's palette, runtime ~10 s. Honest rating: a clean "toy 3D" look already beats the current code-drawn plates; it is not yet Screwdom-polished (cross sits proud of the dome, no thread, flat metal, thin outline). Each of those is a code tweak, not a new tool.

## Recommendation: B (code-built three.js sprites), with A kept only for hero marketing images
Reason: the failures in the critic logs are consistency failures; B removes them structurally, is free, already runs here, and gives recolour, resize and spin frames. A stays optional for non-gameplay hero art. C is the upgrade path if B's ceiling is too low: reuse the same part definitions, nothing to throw away.

## Exact first batch (v1, 24 sprites, 512 px, transparent)
1. Screws: `screw_red, blue, gold, green, purple, orange` head-on at the game camera (6).
2. Screw spin frames: `screw_red_spin_00..11` (12 frames, one colour, then recolour the rest on demand) (12, counts as 1 sheet).
3. Parts: `nut`, `washer`, `bolt_long` (hex head, thread), `plank_3hole`, `plank_5hole`, `bar_steel`, `block_wood` (the Taken Apart block, tinted per palette index) (7).
4. Containers: `box_open` (open toolbox, 3 holes, per colour tint) and `bin_row` (holding row, 5 slots) (2).
Acceptance per sprite: critic rubric 18/20, readable at 70 px and grayscale, 6-10% padding.

## Next steps
1. Fix the known rough spots (cross inset, thread, env map for metal, 3-4% brown outline).
2. Add `--frames N` spin output and a `slice`-compatible manifest; import with `tools/import-art.mjs` behind the existing Object Yard art flag (not done here; `src/` untouched).
3. Owner picks look from the proof; then build the first batch.
