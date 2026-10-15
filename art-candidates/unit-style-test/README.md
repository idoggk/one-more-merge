# Unit style test (task t-bda452f6)

STYLE TEST only, nothing wired into `src/`. Goal: find a unit look that is readable (owner: current unit art is a mess, he cannot tell units apart).

Owner correction applied mid-task: theme is MACHINES, middle level of detail (not messy, not abstract icons). A first attempt (bells / coils / cannon as flat icons) was off theme and was discarded.

Families (all confusable today per `docs/design/UNIT_ROSTER_AUDIT.md`: round/boxy brass machines with pipes): **Cannon** (red), **Coil** (cyan-blue), **Hydraulic Press** (emerald green). Ranks 1 / 4 / 8 = size + pips (0/2/4) + glow ring only; the machine is identical across ranks.

Style anchor uploaded to ChatGPT: `ref/style_anchor_cannon.png` (cropped from the painted road-map mock `normal_try1.png`).

## Status

| Style | Sheet | State |
|---|---|---|
| 1 bold toy machine | `raw/sheet_style1_bold_toy.png` | done (sliced: `style1_bold_toy/`) |
| 2 chunky 3D toy machine | `raw/sheet_style2_chunky_3d.png` | done (sliced: `style2_chunky_3d/`) |
| 3 sticker badge machine | not produced | LEFT: lease released after 2 sheets per the brief |

## Prompts (sent in one chat, after the primer + READY and the anchor image)

Primer (summary): workshop-machine theme; chunky glossy toy machine like the anchor cannon; 5-7 readable parts; thick dark-brown outline; one dominant colour per family; readable at 48 px and greyscale; no tiny gears/screws, no text, no abstract icons; rank only by size, pips, glow ring; flat magenta #FF00FF background; equal cells, wide gutters.

Style 2: "Make ONE image, landscape 1536x1024, a 3 by 3 sheet on flat magenta #FF00FF. STYLE 2 'chunky 3D toy machine': soft shaded glossy 3D toy machines exactly in the look of the attached cannon ... Row 1 CANNON, vermilion red: cannon on two dark wheels, gold muzzle ring, star on the wheel hub, facing up-right. Row 2 COIL, cyan-blue: squat machine on a dark base plate with two small wheels, fat cyan electromagnet coil of 3 chunky loops round a central post, gold cap. Row 3 HYDRAULIC PRESS, emerald green: boxy C-frame on a dark base, big green piston on top pressing onto a gold anvil plate, one lever handle. 5-7 readable parts each, recognisable at 48 px and in greyscale, no tiny gears, no text."

Style 1: same machines, "drawn FLAT: flat colour blocks, no gradients, no soft shading, one simple highlight shape, very thick dark-brown outline (about 6 percent), 5-6 big parts each, bolder simpler shapes than the anchor".

Style 3 (not run), suggested: same three machines, each centred on a flat coloured disc (red / cyan / green = family colour), thick outline, 4-5 big parts, rank by size + pips + glow ring.

## Findings / caveats

- Both sheets read clearly at thumbnail size: three distinct silhouettes (wheeled barrel / coil tower on a cart / C-frame press). Style 2 is close to the painted mock; Style 1 came out only slightly flatter than Style 2 (ChatGPT kept some gloss) with a heavier outline and a simpler Press.
- Coil and Cannon both have wheels and gold trim, which weakens separation; Coil's loops can read as a stack of rings. Consider a distinct base or no wheels for non-Cannon families.
- Ranks differ mainly by size: at 48 px rank 1 vs 4 is clear, 4 vs 8 is weaker without the glow.
- Sliced pieces (`style*/`, via `tools/slice-sheet.mjs`) are ROUGH: the glow rings are pale pink/yellow and key badly against magenta (keyLeft/halo gates fail on rank 4/8), and slicing trims each piece to its own size, so rank size is lost per piece. Judge from the raw sheets and `contact-*.png`; a final pipeline would key glow separately.
- Image creations used: 3 (1 discarded off-theme, 2 on theme). No limit message was hit.
