# Road art 5d (t-3201b3b4): ch7 entrance, ch7 gate, ch8 entrance, try 1

Brief: art-candidates/road-art-5d/NEXT.md (branch orch/t-ecced817-panel-fixes-chapter-7-entrance-a) and docs/art/CRITIQUE_71.md (branch orch/t-85bf0280-critic-pass-on-the-chapter-6-7-a).
Source: ChatGPT, one new chat (primer sent as a condensed single-line version, answered READY), one try per panel, 2026-10-15. No reference images attached. Raw 1024x1536 PNGs only; not keyed, sliced or converted (road panels have no key colour). Nothing is in the asset registry yet and nothing is wired into the game.

| File (raw/) | Visual read of prop margin to side edges (px of 1024, by eye) | Lane read by eye | Verdict (not a critic verdict) |
|---|---|---|---|
| ch7_entrance_try1.png | left about 30 (pallet), right about 32 (conveyor) | x about 350-675 (brief: 318-705) | FAIL margin (target 80, floor 61), worse than the old 46/37. Needs try 2. |
| ch7_gate_try1.png | left about 75 (crates), right about 85 | x about 340-685 | Margin OK (floor 61). Lane about 20 px narrower than 318-705, so check the join with the ch7 entrance. Only usable panel. |
| ch8_entrance_try1.png | left about 25 (dome base), right about 55 (orrery base) | x about 405-620 (brief: 385-640), one medallion near the middle, no medallion at top or bottom | FAIL: dome still near the left edge, lane narrower than the ch8 gate. Needs try 2. |

Numbers are read from the pictures, not measured by script. Run the CRITIQUE_71 measurements (column margins, join against the neighbouring panel) before any KEEP.

Try 2 prompt changes: say "props occupy only the inner 60 percent of each side area; shrink every prop by 25 percent"; give the lane as a percentage of the width (ch7 31-69 percent, ch8 37.6-62.5 percent); attach the old ch8 gate panel as reference (needs the owner's upload; file_upload only takes user-shared files).

Browser: tab froze for about 60 s on the first typed prompt and recovered. Tab closed, BROWSER_SESSION released. No image-limit message was shown.

## Try 2 (t-52e32914), 2026-10-15

Same chat flow: condensed primer, READY, one prompt per panel. Prompt changes: lane as percent of width, props only in the inner 60 percent of each side area, outer 12 percent empty, every prop shrunk 25 percent, ch8 exactly one medallion and constant lane width. No reference attached. No image-limit message. Tab closed.

| File (raw/) | Prop margin by eye (px of 1024) | Lane by eye | Verdict (not a critic verdict) |
|---|---|---|---|
| ch7_entrance_try2.png | left about 118 (pallet), right about 90 (fork tip) | rails x about 320-705 (matches 318-705) | PASS target 80. Props are small. Best candidate for ch7 entrance. |
| ch8_entrance_try2.png | left about 62 to 75 (dome base, flowers), right about 75 (garden stones) | rails x about 408-615, narrower than 385-640 | Margin above floor 61, below target 80. One medallion, constant lane, no dome clipping. Lane about 23 px narrower per side than the ch8 gate: join with the gate unverified. Usable if the join is handled in code or the gate is regenerated. |

Numbers are read by eye, not by script. Run the CRITIQUE_71 measurements before any KEEP. Not keyed, sliced, or in the registry.
