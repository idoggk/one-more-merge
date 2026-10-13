# Slicing ChatGPT sheets: `tools/slice-sheet.mjs`

Turns one sheet (a grid of objects on a flat key colour) into clean sprites and checks them. Plain Node, uses `sharp` (already a devDependency; no new dependency).

```
npm run slice -- <sheet.png> --grid 3x2 --key magenta --out art-candidates/foo --names a,b,c,d,e,f
```

| Option | Default | Meaning |
|---|---|---|
| `--grid CxR` | required | columns x rows; cells are equal slices of the sheet |
| `--key magenta\|white\|none` | `magenta` | flat background colour to remove (#FF00FF / #FFFFFF); `none` keeps the PNG's own alpha |
| `--out <dir>` | required | output folder |
| `--names a,b,...` | `cell_N` | one name per cell, row-major |
| `--pad 8` | 8 | percent of the long side re-added around the trimmed object |
| `--aspect 4:1` | none | requested object ratio; one value for all cells or one per cell (`1:1,4:1,...`). The canvas is grown to it and gate `aspect` checks the object |
| `--size 128` | 128 | long side of the 1x output |
| `--tol 40 --feather 50` | 40 / 50 | key distance (RGB) below which a pixel is fully transparent, and the ramp up to fully opaque |
| `--coverage 0.02,0.85` | per kind | pass range for the share of the cell the object covers (warn band: down to half the minimum, up to maximum + 0.10) |
| `--kind panel\|strip\|icon\|unit\|sheet` | `sheet` | gate profile. `strip` (ribbons, bars, toasts): the two short ends may touch the cell border, the long sides may not. `panel`: must be fully inside. Others: default ranges |
| `--despeckle 16` | 16 px (or 0.02% of the cell) | opaque components smaller than this are removed right after keying, before any gate (stray near-key pixels, dust) |

## Pipeline per cell
1. Gate `cellBorder` runs on the full original cell, then the cell is cropped 2 px inward.
2. Key colour to alpha (tolerance + feather). Enclosed key regions (shackles, gear centres) go transparent too.
3. Alpha eroded 1 px (cross filter). Edge pixels (within 2 px of the silhouette) that lean towards the key more than the interior does are recoloured with the nearest interior colour; dark outlines are not touched.
4. Trim to the alpha bounding box, re-pad (default 8%), centre on a square canvas (or the requested aspect).
5. Write `<name>.png` (2x: long side = 2 x size), `<name>.webp` (1x, quality 90), `contact-dark.png`, `contact-light.png` (labelled; failed cells in red, shown on dark and light backgrounds so halos are visible) and `gates.json`.

## Gates (each is pass, warn or fail; exit code 1 only on fail)
`gates.json` lists every gate per cell as `{status, pass, value, threshold, detail}`. A cell has `status` (worst gate), `failed[]`, `warned[]` and `flags[]` (e.g. `aspect-warn`). Warned cells are still written; contact sheets label them WARN (amber) and failures FAIL (red).

| Gate | Fails / warns when |
|---|---|
| `cellBorder` | fail: any pixel with alpha above 16 within 3 px of the original cell border, measured after despeckle (neighbour slivers, objects too big). `--kind strip`: only the long sides are checked, so the short ends may touch |
| `empty` | fail: nothing left after keying |
| `corners` | fail: an output corner is not transparent |
| `alpha` | fail: no opaque pixels, or no transparency at all |
| `coverage` | pass inside the range; warn down to half the minimum / up to max + 0.10; fail beyond (specks, flooded cells). Ranges are per kind |
| `aspect` | only with `--aspect`: object ratio within 10% of the request passes, 10-25% warns (`aspect-warn`, measured ratio in `value`), over 25% fails |
| `keyLeft` | fail: magenta-ish opaque pixels survive (white key: near-white edge pixels survive) |
| `halo` | judged on the outermost pixel layer only: warn above 4% much lighter than the body, fail above 8%. The depth 1-3 figure is kept in `detail` for context (a designed cream rim inside a dark outline is not a fringe) |
| `whiteInHoles` | fail: a SMALL enclosed near-white region (1.5%-10% of the bbox, each side under 40% of the object) in a non-white surround, i.e. a hole painted white instead of key. Large cream/white panel centres are content and ignored (counted in `detail`) |

Gates are a mechanical pre-filter for the critic pass, not a replacement for it. A legitimately bright rim or a white eye ring inside a dark body can trip `halo` / `whiteInHoles`; the critic decides.

## Tests
`tests/sliceSheet.test.ts` builds synthetic sheets in code (clean, cell-edge sliver, white in a hole, pale halo, magenta-tinted fill, wrong aspect, speck, white key) and checks that each gate trips on its bad fixture and passes on the clean one. The module also exports `sliceSheet(buffer|path, options)` for use from other tools.

The v2 tuning adds fixtures for: a stray corner pixel (no longer trips `cellBorder`), a larger sliver (still fails), a strip touching both ends (passes as `strip`, fails as `panel`, long sides still checked), a big cream panel centre (passes), a white blob in a hole (fails), a halo (fails in every kind), graded aspect (3:1 vs 2:1 fails; 3.5:1 vs 3:1 warns) and the coverage warn band.

## Re-gate of R01-R02
The 12 raw sheets of the first art run (`omm_ui_*_v01.png`, 1x1 grid, magenta key, pad 0) were re-sliced with the tuned slicer (`--kind panel` for panels/tooltip, `--kind strip` for toast and ribbons, aspect per the pack). Before = the run's gates (old thresholds, coverage 0.5-1 for panels).

| Output | Before (failed gates) | After | Reason / remaining defect |
|---|---|---|---|
| ui_panel_std | cellBorder (stray px) | **pass** | false positive removed by despeckle |
| ui_panel_popup | cellBorder | **pass** | same |
| ui_panel_card | cellBorder | **pass** | same (aspect 0.807 vs 0.8) |
| ui_tooltip | cellBorder | **pass** | same |
| ui_toast | cellBorder, whiteInHoles | **pass** | cream centre is large content; strip ends allowed |
| ui_ribbon_blue | cellBorder, aspect 3.71, halo 17%, whiteInHoles | **warn** | aspect 3.711 vs 3:1 (23.7% off, `aspect-warn`); halo is 0.0% on the outermost layer (the 17% was the designed rim) |
| ui_ribbon_gold | cellBorder, aspect 3.705 | **warn** | aspect 3.705 vs 3:1 (23.5% off) |
| ui_ribbon_green | cellBorder (253 px), aspect 4.05, whiteInHoles | **fail** | real: aspect 4.048 vs 3:1 (34.9% off). Touching the ends is now allowed |
| ui_ribbon_purple | cellBorder (248 px), aspect 4.05, keyLeft 407 px, halo, whiteInHoles | **fail** | real: aspect 4.048 (34.9% off) and keyLeft 407 px (violet reads as magenta; needs the green key per the pack's key rule) |
| ui_ribbon_red | cellBorder (266 px), aspect 4.05, halo, whiteInHoles | **fail** | real: aspect 4.048 (34.9% off) |
| ui_ribbon_event | cellBorder, aspect 5.56 | **fail** | real: aspect 5.562 vs 4:1 (39% off) |
| ui_panel_well | cellBorder, coverage 0.458, aspect 3.06, halo 66.5% | **fail** | real: aspect 3.057 vs 2:1 (52.9% off), a 3:1 plaque. Coverage 0.458 now passes the panel profile; halo is 2.2% on the outermost layer (pass) |

Result: 5 pass (all false positives), 2 warn (ribbons at 3.7:1 are written and flagged), 5 fail for real reasons (wrong aspect, plus the violet key on purple). These need a redo or an explicit aspect decision, not a gate change. The contact sheets must still be viewed by the critic; gates are only a pre-filter.

## Not done here
No sheet segmentation by connected components (grid cells only), no 9-slice insets, no per-asset size presets; see section 6 of PROMPT_PACK_V2.md for the fuller spec.

## Trim, fill and strip gates (slicer fix 3)

Since task t-2d95ddb9 every cell is trimmed to the object box before padding, and two gates keep tiny art out of big canvases: `fill` (strips: object at least 90 percent of the output width; other kinds: larger side at least 70 percent of the canvas) and `minHeight` (strips: object at least 24 px tall at 1x). Strips and panels export at 1024 px (PNG) / 512 px (WebP). `--key green` handles violet, purple and pink subjects. Details, root cause and the re-gate results: docs/art/SLICER_FIX_3.md.
