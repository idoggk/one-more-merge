# Rank FIX 5 (t-3acda9dd, applies CRITIQUE_92)

One ChatGPT image (magenta key, 3 cells in a row), 0 re-rolls, nothing bought. Raw: `raw/rankfix_sheet.png`. Sliced by empty column runs, keyed, 1 px erode, trimmed, fitted to 90% of a 256 px cell, webp. Originals for comparison in `orig/`. `pieces/contact.png` shows dark and light backgrounds. Not critic-checked yet.

| Piece | Change vs original | Intended order |
|---|---|---|
| `pieces/router_5.webp` | same teal sphere + yellow lever, now pipe openings left AND right plus a gold gear boss on the front | richer than a one-pipe valve; still needs the critic to check it is above rank 4 (four pipes + wheel) and below crowned rank 6 |
| `pieces/pipe_6.webp` | no longer a hydrant tower: wide horizontal copper pipework, red handwheel on top, two gold elbows, gauge, teal brackets | shares the family red wheel, many parts |
| `pieces/capacitor_2.webp` | green drum (not a block) with two gold terminal stacks, side bolt, teal cradle on cream base | drum family, more detail than rank 1 |

## Known issues
- Pieces are 256 px; the originals were ~262 px. Both fit to 90%.
- pipe_6 is now a wide landscape machine (700x563 px source), so it is a different footprint from the old tall tower; check it against pipe ranks 5 and 7 in the family strip.
- Rank clarity pair scores (`tools/rank-clarity.mjs`) were not re-run.
