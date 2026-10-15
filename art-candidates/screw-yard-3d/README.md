# Screw Yard 3D proof (approach B)

Six sprites built from three.js primitives in code, one fixed light rig and camera, rendered to transparent 512x512 PNG.
Palette is the game's (`SCREW_COLORS` red `e8452c`, blue `27a4c0`, gold `f2c12e`; plank tint `b08d57`; ink `2b1d2e`).

| File | What |
|---|---|
| `screw_red/blue/gold.png` | domed round head, Phillips cross, steel collar |
| `nut.png` | hex nut with a real bore |
| `plank.png` | board with 3 screw holes and steel eyelets |
| `box.png` | toolbox body with 3 holes and brass studs |
| `contact-dark.png`, `contact-light.png` | all six on dark and light backgrounds |

Re-render: `npm install` then `node tools/render-yard-3d.mjs [--size 512] [--only nut,plank] [--out <dir>]`
(uses Chrome at `C:/Program Files/Google/Chrome/Application/chrome.exe`, or set `CHROME`). About 10 s on a laptop, no GPU needed (SwiftShader).
Change a colour: edit the `SPEC` list at the top of the script.

Known rough spots (proof, not final): Phillips cross sits proud of the dome like a sticker; no thread/shank (head-on sprites only);
box is a closed block, not the open toolbox; outline is a thin inverted-hull line, not yet the 3-4% brown of the style lock;
nut metal is flat grey (add an environment map for chrome reflections). None needs a new tool.
Candidates only: nothing here is wired into `src/`.
