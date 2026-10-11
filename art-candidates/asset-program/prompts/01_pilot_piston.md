# Pilot: Piston, ranks 1-8 (one 4x2 sheet)

Attach to the chat first: `anchors/anchor_cannon_ranks1-8.png`, `anchors/anchor_coil_ranks1-8.png`, `anchors/anchor_bell_ranks1-8.png` (if you use your old "Create Tray Asset" chat, the style anchors are already there; still attach these three, they show the sheet format).

Save the result as `inbox/piston_sheet_v1.png` (v2, v3 for retries). Then see `00_how_to_run.md`.

## Prompt A (paste as is)

```
Create image. Use my 3 attached anchor sheets as the exact reference for BOTH the art style and the sheet format.

Make one sheet: 4 columns x 2 rows = 8 equal cells, reading order left to right, top to bottom. Landscape 3:2. It shows ONE machine, a pneumatic PISTON PUNCH, at 8 upgrade ranks. Rank 1 is top-left, rank 4 top-right, rank 5 bottom-left, rank 8 bottom-right.

STYLE (match my anchors exactly): chunky toy-like game gadget in 3/4 view (camera in front, slightly left of centre and slightly above, the same in every cell), thick dark outline that is a darker shade of each part's own colour (never pure black), glossy enamel paint with one soft white highlight blob and one thin specular streak on the upper left, light from the top left, soft core shadow on the lower right, brass trim and round rivets, a cream base plate with rounded feet under the machine, hand-painted mobile game asset finish. Simple big readable shapes: at most about 12 distinct parts per machine; every detail must still read when the machine is shown 64 pixels wide.

COLOUR: rust red (#d05a3a) is the dominant body colour (about 60%), brass and gold accents about 25%, cream plate about 15%.

LAYOUT: pure flat white background (#ffffff) and nothing else. Each machine is centred in its own cell with a wide white margin. Machines never touch each other, the cell borders or the sheet edge. All 8 machines are drawn at roughly the same size on the sheet (they may grow a little as the rank goes up).

FORBIDDEN: any text, numbers, letters, labels, watermarks, rank badges, crowns, frames, grid lines, cast shadows on the floor, glow halos or aura around the machine, floating sparkles, smoke or particles. Glowing cores and gems that are part of the machine are fine.

RANK LADDER: it is the SAME machine growing up. Every rank = the previous rank plus ONE clearly visible new part that changes the outline. Keep the base plate shape and the camera identical.
1. One stubby red cylinder with a flat piston head on a plain cream plate, one small nozzle. No brass yet.
2. Rank 1 plus a small silver pressure gauge on the side and a second short rod.
3. Rank 2 plus brass rings on the cylinder, brass rivets, brass corners on the plate.
4. Rank 3 plus four short pistons in a cross around the cylinder, with a steam vent pipe on each side.
5. Rank 4 with gold rings and gold piston heads, a round glass window showing a glowing orange pressure core, a gold-edged plate.
6. Rank 5 plus a tall central hydraulic cylinder rising behind and a big gold flywheel on the back. Clearly the biggest silhouette change so far.
7. Rank 6 where the core is a blue-white crystal pressure chamber, plus a ring of small gold pistons floating above the top, attached by short pipes.
8. Rank 7 plus eight pistons in a star around a crowned gold manifold, small solid gears riding on the pipes, an ornate gold and white plate. The most impressive machine on the sheet.

Before you answer, check: 8 cells, identical camera angle, pure white background, no text anywhere, no two neighbouring ranks look alike.
```

## Follow-ups (use only what the first result needs)

| Problem | Paste |
|---|---|
| Background is not pure white, has a floor or shadows | `Same sheet, but the background must be pure flat white #ffffff with no floor, no shadows and no gradient. Change nothing else.` |
| Neighbouring ranks look too alike (say which) | `Ranks 4 and 5 look too alike. Keep the whole sheet, but redraw rank 5 so its outline is clearly different from rank 4: [new part from the plan]. Do not change the other cells.` |
| A rank is a different machine | `Rank 6 is a different machine. Redraw it as rank 5 plus [the part from the plan], same camera, same plate, same colours. Keep the other cells exactly.` |
| Glow, aura, sparkles or smoke around the machines | `Remove every glow halo, aura, sparkle, smoke and particle outside the machines. Glowing parts that belong to the machine stay. Change nothing else.` |
| Too busy / noisy | `Simplify every machine: fewer, bigger parts, bolder shapes, no tiny details. They must read at 64 pixels wide. Keep the ranks and the style.` |
| Flat, low contrast | `Stronger value contrast: darker outlines, a brighter specular highlight on the upper left, deeper shadow on the lower right. Same designs.` |
| Machines touch or are cut off | `Redraw with a wider white gap between all cells; no machine may touch another or the sheet edge. Same designs.` |
| Different camera from the anchors | `Use the exact camera of my attached anchor sheets: 3/4 view from the front, slightly above. Same designs.` |

## Rules for the retry loop

- At most 3 rounds for one sheet (`../RUBRIC.md`). After round 3, change the rank plan, not the wording.
- Change one thing per follow-up. Long follow-ups make the model redo everything.
- Always ask for the full sheet again; do not ask for single cells unless a sheet is otherwise approved (then use "redraw only rank N" and splice it in).
