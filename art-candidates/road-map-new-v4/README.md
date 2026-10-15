# Road map new pieces v4 (t-e68b29f6, applies CRITIQUE_95 and CRITIQUE_97)

ChatGPT: 2 images (one chat each, 0 re-rolls), nothing bought. The ch4 T-junction and cross were fixed in code, no image.

| Piece | File | How |
|---|---|---|
| ch7 entrance (REDO) | `road_panel_ch7_entrance_v4.webp` (1024x1536) | `raw/ch7_entrance_v4_try1.png`. Prompt: attached ch7 gate as reference, lane 33-67 % of width, plain cream, brown dashes, no rails/outline/gold. |
| ch8 entrance (REDO) | `road_panel_ch8_entrance_v4.webp` (1024x1536) | `raw/ch8_entrance_v4_try1.png`, then a per-row horizontal warp (see below). |
| ch4 t_junction, cross (REDO) | `road_ch4_t_junction.webp`, `road_ch4_cross.webp` (512 cell) | Composited from the ch4 straight_h and straight_v: the main road's lower (and, for the cross, upper) wall and gold rail are removed over the arm width, so the arm's cream surface and gold rails flow into the main road. Same pixels as the straights, so the paint cannot differ. |
| ch4 straight_h, straight_v | `road_ch4_straight_h.webp`, `road_ch4_straight_v.webp` | Ghost-stud fix only (faint stud squares at the cut end, CRITIQUE_97): clean wall pixels copied over them. |

## Measured (outer lane edges, px of 1024)

| | Gate | New entrance |
|---|---|---|
| ch7 lane (cream) | 349-675 (top) .. 344-679 (bottom) | 348-676 (top) .. 343-680 (bottom). Lane colour (243,231,206) vs gate (243,227,196). Floor identical. |
| ch8 outer rails | 381-642 (top) .. 368-656 (bottom) | raw 382-642 .. 367-656; **after warp: 367-656 on every row** = gate bottom, so the join has no step. |
| margins (nearest prop to the edge) | | ch7 about 98 / 106 (shadow to 77, crate itself 106); ch8 101 / 86 after warp. |

Join images: `join_ch7_gate_over_entrance.png`, `join_ch8_gate_over_entrance.png` (gate on top, entrance below). No step, no change of lane colour or pattern.

ch8 warp: the generated lane widened by 14 px per side from top to bottom (perspective), like the gate does, so the entrance top (382-642) did not meet the gate bottom (368-656). I fitted a line to each rail and remapped every row horizontally so the rails are straight at 368/656; the floor on each side is stretched linearly, and the right-hand scroll prop is squeezed 7 % so its margin stays above 80 px. Medallions and diamonds stay centred.

## Not done (2-sheet budget used, lease released)

- `node_you_platform` (REDO: re-roll at 2x, no pink halo, glow in code).
- `scenery_ch4_body` (FIX: alpha islands, arcade theme, no baked sky).
- clouds x6 (FIX: soft painterly, no outline, to match bg_sky_purple).
- The other ch4 pieces (curves, S curves, dead end, shoulder edge) still carry the ghost studs; the same patch (copy 36 clean px over x 14-50 / y 462-498) applies to them.
- Code-side alternative if the you-platform keeps failing: draw the platform in the renderer (a code ellipse with the node colour plus glow) instead of a baked sprite.
- Nothing is wired into `src/`. Also still true from CRITIQUE_97: README claims "road 205 px = 40 %" are wall to wall; the walkable surface is about 22 %.
