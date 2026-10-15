# Fill report: screw-yard-3d-v2 (1x files)

Content = pixels with alpha > 8 (object, ink outline and baked shadow), measured against the manifest slot.
Rule: the limiting axis fills 84-90% (6-8% padding per side) and the content is centred (left/right and top/bottom padding within 1 px).
The renderer fits every asset to its slot (union bbox over all frames, same crop for spin frames); fill on the other axis follows the object's own aspect.

| asset | slot | content | fill W | fill H | pad L / R / T / B (px) | check |
|---|---|---|---|---|---|---|
| holding_row_beam_3d | 358x76 | 311x66 | 87% | 87% | 24 / 23 / 5 / 5 | ok |
| hole_ring_brass | 48x48 | 42x36 | 88% | 75% | 3 / 3 / 6 / 6 | ok |
| next_box_steel | 72x56 | 61x49 | 85% | 88% | 6 / 5 / 4 / 3 | ok |
| plank_5hole_3d | 160x48 | 138x42 | 86% | 88% | 11 / 11 / 3 / 3 | ok |
| screw_head_G | 48x48 | 42x39 | 88% | 81% | 3 / 3 / 5 / 4 | ok |
| screw_head_R | 48x48 | 42x39 | 88% | 81% | 3 / 3 / 5 / 4 | ok |
| screw_head_U | 48x48 | 42x39 | 88% | 81% | 3 / 3 / 5 / 4 | ok |
| screw_head_Y | 48x48 | 42x39 | 88% | 81% | 3 / 3 / 5 / 4 | ok |
| screw_side_G | 40x48 | 34x42 | 85% | 88% | 3 / 3 / 3 / 3 | ok |
| screw_side_R | 40x48 | 34x42 | 85% | 88% | 3 / 3 / 3 / 3 | ok |
| screw_side_U | 40x48 | 34x42 | 85% | 88% | 3 / 3 / 3 / 3 | ok |
| screw_side_Y | 40x48 | 34x42 | 85% | 88% | 3 / 3 / 3 / 3 | ok |
| screw_spin_frames | 48x48 | 41x42 | 85% | 88% | 4 / 3 / 3 / 3 | ok |
| screw_spin_frames_G | 48x48 | 41x42 | 85% | 88% | 4 / 3 / 3 / 3 | ok |
| screw_spin_frames_U | 48x48 | 41x42 | 85% | 88% | 4 / 3 / 3 / 3 | ok |
| screw_spin_frames_Y | 48x48 | 41x42 | 85% | 88% | 4 / 3 / 3 / 3 | ok |
| screw_washer_collar | 56x56 | 49x41 | 88% | 73% | 4 / 3 / 8 / 7 | ok |
| toolbox_wide_open_3d | 340x108 | 292x94 | 86% | 87% | 24 / 24 / 7 / 7 | ok |
| turntable_disc | 390x150 | 333x131 | 85% | 87% | 29 / 28 / 10 / 9 | ok |

0 asset(s) flagged "check".
