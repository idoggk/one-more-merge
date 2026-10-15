# SCREW YARD mock

Static mock of the object yard (Dismantle and Collect). Spec: `docs/art/mocks/screw-yard/SPEC.md`.

Open `index.html?state=mid` in Chrome (states: `start mid danger win fail screws`, size `&w=390&h=844`, `&grid=1`, `&names=1`, `&audit=1`).
Allow local file access if images do not load: start Chrome with `--allow-file-access-from-files`.

Re-render all PNGs, or only one state (from the repo root):

```powershell
node art-candidates/mockups/screw-yard/render.mjs
node art-candidates/mockups/screw-yard/render.mjs win
node art-candidates/mockups/screw-yard/render.mjs audit
```

Outputs: `screwyard_<state>_<W>x<H>.png` (2x; 390x844, 360x780, 430x932) and `annotated_<state>_390x844.png` (grid, safe areas, layer names).
`audit` prints measured checks (tap target 44, safe areas, 8 px grid, overlaps, text fit) for 6 states x 3 sizes.
Magenta hatched boxes and `MISSING <name>` stickers mark placeholder art.
