# Critique #83: painted Screw Yard mocks (art-director-critic, task t-3caf8dd1)

Judged: `art-candidates/mockups/screw-yard-painted/painted_01..04` (branch `orch/t-02c29032-painted-full-page-mocks-screw-ya`), against the assembled mock and `SPEC.md` (git commit 6e224f9). All four images were opened and viewed. Read-only on the art; no images generated. Scale used for css px: 01 = 2.185 px per css px, 02 = 2.41, 03/04 = 2.19 (width 390 css).

## Verdicts

| Image | Verdict | One line |
|---|---|---|
| 01 start | **FIX** (use as the master) | Best-looking, best-drawn cannon; HUD sits in the notch, small text, red-on-red screws |
| 02 mid | **FIX** | Same cannon as 01 (good), but 9:16 canvas, top and bottom rows in the unsafe zones |
| 03 danger | **REDO** | Different cannon, different toolbox, different HUD style, different drill: reads as another game |
| 04 win | **FIX** | Panel and stars are strong; hero pile is the 03 cannon, the NEXT button is too small, HUD behind it contradicts the stars |

Set consistency: **fails.** 01+02 are one game, 03+04 are another. Do not ship any 03/04 object art until it is redone against 01.

## Per image

### 01 start (852x1846): FIX, about 15/20
- Strong: real slotted and cross-head screws with threaded shanks, readable at 110 px; cannon silhouette is chunky; one top-left light; warm outlines; gold/brass UI frame family is consistent.
- 3 (light): wheel and shadow are fine, but the whole bench glows from several sides; keep. 
- Colour: red screw on the red band (top left, and centre right), blue screw on the blue bracket and in the blue wheel, gold screws on gold/wood: adjacent items do NOT differ. These are the screws the player taps. Fix: sit each screw on a neutral wood or dark-metal collar so the band colour never matches the head, or recolour the band next to the screw.
- HUD: back, title, pause, TAPS, clock, 3 stars, NEXT x2, holding row, undo/redo, tools are all present and readable. The clock pill is an empty grey bar with a tiny stopwatch; at 70 px it reads as a blank slot. Give it a "BONUS 0:52" face.
- Tiny text: NEXT is about 9 css px, HOLDING ROW about 10, tool labels about 11. SPEC minimum is 12. Text must be live game text, not painted.
- Safe area 390x844 (notch about 0-48 css, home bar bottom 34): back and pause span y 25-135 px = 11-62 css, the title plate 11-55 css: the whole top row is under the Dynamic Island / status bar. Bottom: tool tiles end at 1750 px = 801 css, so they clear the home bar (810 css). Needs the top row pushed down about 40 css (the toolbox and row need to be lower, or the background art extended upward).
- Touch targets (css): back 49, pause 46, undo/redo 62, tools about 105x75, all pass. Screws are 65-80 px = 30-37 css: **fail**, so hit areas must be padded to 44+ in code (there is room, gaps between screws are over 50 px).
- Lost from the spec: screw SHAPE coding. Spec had round/diamond/triangle/plus per colour for colour-blind players; painted screws vary only by slot/cross, not by colour. Painted heads here are colour only. Accept colour+slot as a new rule, or paint 4 distinct head styles.
- Not in the image: object name (CANNON), "N BOXES TO GO" chip, turn label FRONT 1/4, tool count badges, ROW chip n/5. All must be added as live layers.

### 02 mid (941x1672): FIX, about 14/20
- Same cannon, same toolbox, same row as 01: this is the consistent pair. Holes show where screws left (brass-ringed), a flying red screw with sparkle trail, "+1 SCREW" bubble, one empty star: the state story reads at 70 px.
- Canvas is 9:16 (0.563), not 9:19.5 (0.462). On a 390x844 screen it would stretch 8 percent or crop. Everything is vertically tighter than 01, so measurements differ: top row 20-125 px = 8-52 css (worse than 01); tool tiles bottom at 1640 of 1672 px = 13 css from the edge: **inside the home bar zone**.
- Same colour clashes as 01 (red screw flying into a red-banded cannon; blue screw on blue band).
- The two filled row wells (gold, green) sit next to each other fine; the 3-well toolbox shows one blue screw: fine.
- Redo note: "Redo at 9:19.5: attach 01 as reference, same cannon and HUD, row 2/5, flying screw, 120 px more top margin."

### 03 danger (853x1844): REDO, about 11/20 for family resemblance
- Critical failure 19 (family resemblance): a black-barrel brass cannon with grey-brass plates, no red/blue bands, no wooden bench glow, no blue wheels. Toolbox is a tighter red case with dark interior and silhouette NEXT cards. Holding row is a narrow inset plank instead of the full-width beam. HUD plates are dark plum with gold numerals instead of the cream TAPS plate. The drill is yellow/black DeWalt style instead of blue/red toy. Nothing matches 01.
- Individually it is the most polished HUD: TAPS plate with big 27/36, a real timer bar, 3 stars with 2 dim, red ring on the 5th well, 1 SLOT LEFT chip. The row of four different screws (red, blue, gold, green) is the clearest colour demonstration of all four images.
- Danger treatment is heavy: red vignette is baked over the whole UI, which kills the brass and tints the tools. Must be a separate overlay layer so it can pulse and stop.
- The "!" bubble at left is an orphan with no text: spec asked for a worried warning bubble, this is a floating red mark that can hit the back-button area. Remove or attach to the bolt mascot.
- Safe area: top row 16-62 css (better than 01, still touches the notch band), bottom: tools end 1730 px = 790 css, fine.
- Redo note: "Redo: attach painted_01 as reference, keep its wooden cannon and bands, full-width row, cream TAPS plate and blue/red drill; keep the row 4/5, red ring and the clock bar; keep the red edge glow weaker (20 percent)." Alternative: keep this HUD and redo 01/02 in the 03 style (see decision below).

### 04 win (853x1844): FIX, about 15/20
- Strong: red ribbon TAKEN APART! spelled correctly, 3 big gold stars, sunburst, confetti, TAPS and ROW PEAK chips, reward row "+6 CANNON CARDS", glossy green PLAY AGAIN. Reads as an industry-ready result panel at 70 px.
- Hero pile is the 03 cannon (black barrel, brass plates), so it contradicts 01/02 the player just played. Redo the hero pile only (or paint it as a separate transparent asset).
- NEXT: COIL is 66 px tall = 30 css and about 340 px wide: **fails 44 px** touch target. Make it 48-52 css tall, or a full secondary button.
- Panel is nearly full width (edge gap 25 px = 11 css, ribbon wings 40 px). SPEC panel is C-48 wide; here it is C-22. Fine on 390, tight on a notch-free 360.
- The dimmed HUD behind shows TAPS 24/36 with 1 star and a red clock while the panel awards 3 stars: contradiction. Behind the panel, draw nothing, or the real dimmed game state (3 stars). In the game this is automatic (live HUD), so ignore the painted HUD.
- Tool tiles show under the panel, cut by the panel's bottom edge: remove.
- Confetti is painted-in: fine as a still, but build as a particle layer.

## Cross-image drift list
- Cannon: 01/02 wooden toy with red/blue bands; 03/04 brass/black. Pick one. **Pick 01/02**: it is the owner-style toy look and matches blue/red palette of the app kit.
- Drill tile: blue+red (01/02) vs yellow+black (03/04): pick the blue+red.
- Toolbox: wide red open case with cream wells (01/02) vs deep dark red case with grey wells (03): pick 01/02 but give it a darker interior for screw contrast.
- Holding row: full-width beam (01/02) vs inset plank (03): pick 01/02 width, add 03's red ring.
- HUD style: cream TAPS plate + grey pill (01/02) vs dark plates (03/04): pick the dark plates for HUD (better contrast for white and gold numerals, matches the spec's plum plate) OR the cream plate, but not both. Recommendation: dark plates (03 style) for HUD, cream only for result panel.
- Back/pause: the back icon is an arrow in 01/02 and a plain triangle in 03/04: pick the arrow.
- Undo/redo curved arrows replace the spec's rotate arrows (see below).
- Title plate: 01/02 plum-brown with cream text, 03/04 navy-plum: use the 03 navy plate with the cannon name in a second line.
- Canvas: 852x1846, 941x1672, 853x1844, 853x1844. Normalise to 1170x2532 or 9:19.5.

## Safe areas (390x844 and 430x932)
Rule used: top notch/island zone 0-59 css (47 on iPhone 14, 59 on 14 Pro/Max Dynamic Island) and bottom home bar 34 css.
- 390x844: back/pause/title at 11-62 css (01), 8-52 (02), 16-62 (03). All three overlap the notch band. Tools tiles clear in 01/03, fail in 02.
- 430x932 (owner device 14 Pro Max, safe top 59, bottom 34): 01/03/04 are about 2.16:1, the same as the screen (2.17:1), so they fit with a 1.10x scale; the HUD row lands at about 12-68 css, still half under the island. 02 (1.78:1) would stretch. The painted HUD cannot be baked into the background art: the HUD row has to be built from layers and anchored to the safe area, with the background art painted under it.

## What can stay painted vs must be separate

Keep painted (static art, slice as backgrounds/props): wooden bench and shelf background with props and the round turntable, the cannon body (and its brass-ringed holes), toolbox shell (open case, 3 wells without screws), holding-row beam, panel frame and ribbon art (without text), sunburst, tool icons (broom, hammer, drill), glossy buttons shells, stars (lit and empty), lantern, blueprint and scatter props.

Must be live / separate layers:
- All text: SCREW YARD, object name, TAPS n/36, clock value, NEXT, HOLDING ROW, tool names and counts, 1 SLOT LEFT!, TAKEN APART!, chips, PLAY AGAIN, NEXT: COIL. (Spec text minimum is 12 css px; painted text is 9-11.)
- Every screw (the four colours), and one blank cannon with hole rings only. The mock paints screws into the object: the game needs the object with empty holes (02 shows these) plus a loose screw set at 4 colours x (in hole / out / flying / in well).
- Holding row wells (need empty and filled states), the 5th-well red ring, the danger glow and vignette (code overlays), clock fill, star meter (3 lit/empty), the pointing hand, bubbles, the +1 SCREW chip, sparkles, trail, confetti, pop and glint.
- The cannon in the win state: needs parts (barrel, plates, wheels, wood blocks) as separate transparent pieces for the burst, or a single hero image of the whole cannon.

## What the painted version implies for the layout (vs SPEC.md / assembled mock)

1. **Rotate arrows become undo/redo.** The painted bottom pair are curved undo/redo arrows over a fixed turntable; the spec has left/right turn arrows plus a FRONT 1/4 label. The mock also drops the "swipe or tap the arrows" hint. Decision for the owner: undo/redo (requires undo state in the game: is there one?) or turn arrows. Check against `src/`: nothing in this review (src is out of scope).
2. **The stage keeps its share.** The assembled mock's 3D blocks are replaced by a toy prop (the cannon) on a turntable. Stage height in 01 is about 630 px of 1846 = 34 percent, vs 280 of 844 = 33 percent in the spec: same.
3. **Toolbox + NEXT merged into one case.** Painted: one wide red case holds the 3-well active box and the 2 NEXT mini wells inside it (about 190 css tall). Spec: separate toolbox 152x88 and NEXT 152x88 at y 168. Painted version occupies y 100-215 css (about 115 css) and pushes the holding row up to 230 css. The NEXT boxes are now one-screw wells, not mini toolboxes with a coloured screw shown.
4. **Holding row is a full-width beam (about 360 css wide, 90 tall)** vs spec's 320x80, and the "HOLDING ROW" label is a small brass plaque, not an n/5 chip. The n/5 counter is gone: put it on the plaque as live text.
5. **Top block moves down about 40 css** to clear the island; the stage can lose that height (stage 280 css leaves about 240) or the title plate can be dropped on 14-class phones.
6. **Bonus clock moves between TAPS and stars at about 66x28 css**: spec 48 tall is now 28; below the 44 target but not tappable so fine. In 03 it grows to a 120x30 bar: pick the bar.
7. **Tool tiles are cream tiles with icon and name**, 105x75 css, 3 across: bigger than spec (112x64). Count badges ("1") of the spec are missing: add them as a layer.
8. **Win panel is 90 percent screen width with the hero pile**: spec panel (C-48) x 528 is replaced by a taller panel (about 680 css tall, 5 rows). With the island at 59, the ribbon (y 255 px = 117 css) is fine.
9. Colour-blind shape coding (round/diamond/triangle/plus) is dropped; replaced by slot vs cross on the same round head. Decide: keep painted style, add small inner glyphs on screws, or accept colour only.

## Rebuild feasibility
- Feasible, medium effort. Slicing is hard in 01/02/03 because every UI part sits on a busy bench photo: no layers exist. Use the paintings as a **reference to repaint or redraw each part on transparent** (toolbox, row beam, button plates, tiles, cannon) instead of cutting from the flat image. Expect 15-20 new assets.
- The cannon with painted-in screws can only be used as a hero; for play you need a blank object. 02 shows the blank holes best: use it as the reference for the blank cannon, and ask for a transparent-background "blank cannon, empty brass-ringed holes" image.
- Art language is far closer to the existing kit (brass frames) than the assembled mock: good basis for a uiKit.

## Recommended next steps (in order)
1. Owner decision: undo/redo vs turn arrows (item 1 above).
2. Lock 01/02 as the master look. Redo 03 against 01 (reference attached). Redo the 04 hero pile in the 01 cannon.
3. Re-render 01/02/03/04 at one size (9:19.5), top block 40 css lower.
4. Then Pixel Checker and Asset Breaker. Asset list should include blank cannon (transparent), 4 screws x 4 states, toolbox shell, row beam, tile frames, stars lit/empty, ribbon, panel frame, sunburst, lantern, props.
5. Fix screw/band colour clashes (red-on-red, blue-on-blue, gold-on-brass) in the blank cannon paint.

## Redo/Fix notes (one sentence each)
- 01 Fix: 9 change red/blue bands next to red/blue screws to neutral wood, 12 add live bonus clock face, 10 push top row 40 css down.
- 02 Fix: re-render at 9:19.5 with 01 attached; bottom margin 34 css; same clash fix as 01.
- 03 Redo: 19 repaint with 01's cannon, row beam, cream plate, blue/red drill; 9 make the red vignette 20 percent.
- 04 Fix: 19 repaint the hero pile from the 01 cannon, enlarge NEXT: COIL to 48 css, remove the tool tiles under the panel.
