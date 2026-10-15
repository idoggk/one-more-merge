# Critique #86: painted Screw Yard mocks v2 (art-director-critic, task t-3b48fdc5)

Judged: `art-candidates/mockups/screw-yard-painted-v2/v2_01_start, v2_02_mid, v2_03_danger, v2_04_win` (each 852x1846, branch `orch/t-640f9aa7-painted-screw-yard-mocks-fix-01`), against critique #83 (`PAINTED_CRITIQUE.md`). All four images were opened and viewed. Read-only on the art; no images generated; src/ untouched. Scale: 852 px = 390 css, so 1 css px = 2.185 image px. Safe zones used: top 0-59 css (Dynamic Island, 14 Pro / Pro Max), 0-47 on 390x844 notch phones; bottom 34 css (home bar).

## Verdicts

| Image | Verdict | One line |
|---|---|---|
| 01 start | **KEEP** (as master, with live-layer rules below) | Clean, readable, best screw read; HUD still sits partly in the island zone |
| 02 mid | **KEEP** | Same layout as 01, clear state story (empty holes, flying screw, 2/5 row) |
| 03 danger | **FIX** | Now the same game, but the layout is offset from 01/02, small labels shrank again, red-on-red screw remains, glow baked in |
| 04 win | **KEEP** | Hero cannon now matches, NEXT: COIL passes 44 px, spelling clean; ghost UI behind is the only nit |

Set consistency: **passes.** Cannon (wood, red and blue bands, brass rings), toolbox (red case, cream wells, grey NEXT wells), HUD (cream TAPS plate, plum title, brass buttons), blue/red drill, full-width row beam, undo/redo buttons and bench all match across all four. Only 03 drifts (layout offset, smaller labels, red clock pill, which is a deliberate state change).

## Check of each critique #83 FIX

| #83 fix | Result |
|---|---|
| 03 redo against 01 (cannon, toolbox, beam, cream plate, drill) | **Done.** All five now match. |
| 04 hero pile from the 01 cannon | **Done.** Barrel, blue brackets, wood blocks, red plate, wheels, loose screws all the 01 cannon. |
| NEXT: COIL at least 48 css | **Done.** About 117 px = 54 css tall, about 650 px wide. |
| Tool tiles under the win panel removed | **Mostly.** Only faint blurred tile outlines remain at the bottom (y about 1790). Harmless, hidden by the live scrim. |
| Live BONUS clock face | **Done** in 01/02 (grey pill, stopwatch, BONUS 0:52 / 0:31); 03 uses a red 0:06 pill (good danger state, but the word BONUS is gone, decide). |
| Top block 40 css lower | **Not met.** Back button top edge: 01/02 y 62 px = 28 css, 03 y 82 px = 37 css. Title plate 27-71 css (01/02), 35-79 css (03). All still overlap the 59 css island band for the first 30 css. 03 is closer. |
| Red-on-red / blue-on-blue / gold-on-brass screws | **Partly.** 01/02: fixed (red screw sits on wood, blue on wood or red). 03: red screw at left of barrel (x 310, y 845) sits on the red band and plate, almost invisible edge. Gold screws on tan wood (01 centre barrel, top barrel) have weak contrast. NEW clash: green screw on the red plate (01, x 425 y 1235) is a red/green pair, bad for deuteranopes. |
| Bigger NEXT / HOLDING ROW / tool labels | **Done in 01/02** (cap height about 24-26 px = 11-12 css, font about 15 css). **Regressed in 03** (NEXT cap about 18 px = 8 css, HOLDING ROW and tool labels about 15 percent smaller). |
| Undo/redo vs turn arrows | Still open (owner). Kept undo/redo in all four. |
| One canvas size | 852x1846 in all four (9:19.5). Consistent. Not 1170x2532, but the ratio is right. |

## Per image

### 01 start: KEEP, about 17/20
- Screws read as real screws: round domed heads, slot and Phillips cross, visible threaded shanks on lifted screws, shadows under heads. Four colours (red, blue, gold, green) are clearly separate at 110 px and at 70 px. In grayscale red, green and blue collapse to similar mid-dark values, and gold-on-wood almost disappears: colour alone carries the code.
- Touch targets (css): back 48, pause 48, undo/redo 63, tool tiles about 103x113 (well above 44). Cannon screws are about 28-34 css: **fail on their own**, hit areas must be padded to 44+ in code (gaps are wide enough).
- Holding row: five round wells, large, empty and readable; label plaque readable. Tools: BROOM, HAMMER, DRILL icons read at 70 px; drill is blue/red, same as 02-04.
- Safe area: 390x844: top row 28-77 css overlaps notch band (0-47) by about 19 css. 430x932 (island 59): overlaps by about 31 css. Bottom: tiles end y 1785 = 817 css of 845, leaving 28 css, under the 34 css home bar by 6 css. As in #83 the HUD must be live layers anchored to the safe area; the painting only supplies the backdrop.
- Rubric flags: 15 (baked text) is expected for a mock, all text to be live. Hand and TAP A SCREW bubble: tutorial only, build as a layer.
- Note: keep this as master for the Asset Breaker.

### 02 mid: KEEP, about 17/20
- Identical layout to 01, so the pair is a clean before/after. Brass-ringed empty holes are the best reference for the blank cannon. Row 2/5 (gold, green) plus one blue screw in toolbox well 1: states readable at 70 px. Flying red screw with sparkle trail and +1 SCREW chip read well.
- Colour check: red flying screw crosses the red band, transient so fine. Hub gold screw on gold ring (wheel centre) is gold-on-gold, minor.
- Stars: 2 lit, third dark brown: reads. Clock 0:31 reads.
- Same safe-area numbers as 01.
- The +1 SCREW chip is about 11 css cap, build live at 12+.

### 03 danger: FIX, about 15/20
- Fix 1 (layout drift): whole block is about 25 px (11 css) lower than in 01/02, toolbox taller; the stage is smaller. Re-render with the same y positions as 01/02, or accept that the live HUD makes this irrelevant and ignore.
- Fix 2 (small labels, item 11): NEXT, HOLDING ROW and tool labels are back to about 8-10 css cap height. Bring to the 01 size.
- Fix 3 (colour clash): the red screw on the red band, top-left of the barrel (x 310, y 845), melts into its surroundings. Move it to wood or make that one a different colour.
- Danger glow is much weaker than v1 and now reads as a warm vignette plus red outlines on the tool tiles; fine, but it is baked in. Build the glow as a code overlay and strip it from the backdrop, otherwise the tool tiles carry a permanent red edge.
- Holding row: four distinct screws (red, blue, gold, green), a red ring on the fifth well, "1 SLOT LEFT!" chip: this is the most readable row of the set. The chip overlaps the beam top edge and sits 8 css from the right edge, which is fine.
- Warning bubble (white, red "!") sits hanging off the right end of the row, x 740-835 = 8 css from the screen edge and overlapping the beam. It is readable but tight; anchor it to the Bolt mascot in the build.
- Red clock pill 0:06 reads: it drops the word BONUS. Fine as a state; keep the same size as the grey pill (it is).
- Touch targets and tiles same as 01. Bottom: tiles end at 1810 px = 828 css of 845: only 16 css clear of the edge, **inside the home bar zone by 18 css**. Worst of the set.

### 04 win: KEEP, about 18/20
- Spelling clean: TAKEN APART!, TAPS 24/36, ROW PEAK 2/5, +6 CANNON CARDS, PLAY AGAIN, NEXT: COIL. Stars 3/3, sunburst, confetti, ribbon, glossy green PLAY AGAIN with glint.
- Hero pile is the 01 cannon in parts, with loose screws in all four colours and clear gaps between parts: slice-friendly.
- Touch targets: PLAY AGAIN about 160 px = 73 css tall, NEXT: COIL about 117 px = 54 css, both pass.
- Safe area: ribbon starts y 185 px = 85 css, clear of the island. Panel bottom y 1740 px = 796 css, 49 css above the bottom: clear of the home bar on both phones. Panel side margin about 16 css (wing tips 11 css): tight on 360 wide but OK on 390 and 430.
- Behind the panel: faint ghost of title and tool tiles (blurred). In the game the live scrim does this, so ignore; the ghost "SCREW YARD" is not a spelling issue.
- Confetti and sparkles are painted in; build as a particle layer. The panel with its ribbon has no baked state conflict now (the old 24/36 vs 3 stars contradiction is gone).

## Cross-checks
- Spelling: no typos in any of the four. HOLDING ROW, SCREW YARD, BROOM, HAMMER, DRILL, 1 SLOT LEFT!, TAP A SCREW, +1 SCREW all correct.
- Colour distinguishability: red / blue / gold / green are separable by hue on the bench. Weak spots: gold on tan wood (01, 02, 03), green on the red plate (01), red on red (03). There is no shape coding (all heads are round with a cross; only a few have a slot), so colour-blind players cannot tell red from green in the row. Recommend a small inner glyph or a different slot style per colour in the asset set (decide with the owner; #83 flagged it too).
- Holding row and tools: readable at 70 px in all four; wells are big (about 110 px = 50 css).
- Contact shadows and warm outlines are consistent. One light source top-left everywhere; the 03 window at top-left has a pink tint, minor.

## Required before the Pixel Checker / Asset Breaker
1. 03: fix 11 (labels back to the 01 size) and fix the red-on-red screw; same y positions as 01/02 if redoing (one more try at most).
2. Recolour or move the gold-on-wood screws and the green-on-red-plate screw in the blank cannon asset (Asset Breaker: put screws on neutral collars or darker wood).
3. All HUD live and anchored below 59 css top, above 34 css bottom; do not slice the painted HUD.
4. Danger glow, tutorial hand, bubbles, chips, stars, confetti as separate layers.
5. Pad screw hit areas to 44 css.
6. Owner decisions still open: undo/redo vs turn arrows; shape coding for colour-blind players.

## Redo/Fix notes (one sentence each)
- 01 Keep: use as master; 9 move the gold screw off the tan wood or add a dark collar.
- 02 Keep: use for the blank-cannon reference.
- 03 Fix: 11 raise NEXT / HOLDING ROW / tool labels to the 01 size, 9 move the red barrel screw off the red band, keep the glow as a code overlay, match 01's y positions and 28 css bottom margin.
- 04 Keep: no change; build the confetti and ghost as layers.
