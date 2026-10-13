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
| `--coverage 0.02,0.85` | | allowed share of the cell the object covers |

## Pipeline per cell
1. Gate `cellBorder` runs on the full original cell, then the cell is cropped 2 px inward.
2. Key colour to alpha (tolerance + feather). Enclosed key regions (shackles, gear centres) go transparent too.
3. Alpha eroded 1 px (cross filter). Edge pixels (within 2 px of the silhouette) that lean towards the key more than the interior does are recoloured with the nearest interior colour; dark outlines are not touched.
4. Trim to the alpha bounding box, re-pad (default 8%), centre on a square canvas (or the requested aspect).
5. Write `<name>.png` (2x: long side = 2 x size), `<name>.webp` (1x, quality 90), `contact-dark.png`, `contact-light.png` (labelled; failed cells in red, shown on dark and light backgrounds so halos are visible) and `gates.json`.

## Gates (exit code 1 and `gates.json` when any fails)
| Gate | Fails when |
|---|---|
| `cellBorder` | any pixel with alpha above 16 within 3 px of the original cell border (neighbour slivers, objects too big) |
| `empty` | nothing left after keying |
| `corners` | an output corner is not transparent |
| `alpha` | no opaque pixels, or no transparency at all |
| `coverage` | the object covers less/more of the cell than the range (specks, flooded cells) |
| `aspect` | only with `--aspect`: object ratio differs from the request by more than 10% |
| `keyLeft` | magenta-ish opaque pixels survive (white key: near-white edge pixels survive) |
| `halo` | more than 4% of edge-ring pixels are much lighter than the object body (pale fringe) |
| `whiteInHoles` | an enclosed near-white region (at least 0.2% of the bbox) sits in a non-white surround, i.e. a hole that was painted white instead of key |

Gates are a mechanical pre-filter for the critic pass, not a replacement for it. A legitimately bright rim or a white eye ring inside a dark body can trip `halo` / `whiteInHoles`; the critic decides.

## Tests
`tests/sliceSheet.test.ts` builds synthetic sheets in code (clean, cell-edge sliver, white in a hole, pale halo, magenta-tinted fill, wrong aspect, speck, white key) and checks that each gate trips on its bad fixture and passes on the clean one. The module also exports `sliceSheet(buffer|path, options)` for use from other tools.

## Not done here
No sheet segmentation by connected components (grid cells only), no 9-slice insets, no per-asset size presets; see section 6 of PROMPT_PACK_V2.md for the fuller spec.
