# PROMPT PACK V2: the production plan for every One More Merge asset

Date 2026-10-13, task t-54e20204, mission m-fa5143f0. Docs only: nothing under `src/` is touched. Machine-readable mirror: `art-candidates/prompt-pack/asset-list-v2.json`. The paste-once primer: `art-candidates/prompt-pack/primer.txt`. This replaces `docs/art/PROMPT_PACK.md` (v1) and absorbs the critic's `redo-list.json`.

Owner order (2026-10-13): art is the top priority; use GPT, be very critical of what it gives us; learn from leading games; agree on all assets first, wire in later.

## 0. At a glance

- **230 prompts** in **39 batches of 6** (the last batch of each queue may be shorter): 77 REDO prompts in 13 batches (R01-R13), then 153 NEW prompts in 26 batches (N01-N26). They yield about 771 output assets (sheets are sliced into single files). Average 62 words per prompt; the style text lives in the primer, so prompts only carry content. The unit rank-ladder prompts run 100-115 words because they carry six rank steps.
- Registry check: 175 placeholder or code-drawn entries (excluding sounds and fonts) need real art; all are covered except fx_shake (no art needed). 290 of 351 existing draft entries are also re-made under V2 (see section 9).
- Critic input: 192 assets judged, 113 pass, 72 redo, 7 reject (59%), average 6.6. All 79 REDO and REJECT items are queued first, except two dropped on the critic's advice (section 7).
- GPT input: 6/10 now, 9/10 potential; the problem is art direction and consistency, not single-asset beauty. The first gate (Gate A) therefore approves the board, the hero, the UI kit and the monster anchors together at phone size before bulk work.

## 1. Master style, style lock, negatives, primer

Source: GPT art-director chat Q3 (docs/art/GPT_ART_DIRECTION.md), adapted in the places listed under "Deviations". The exact text pasted into every new chat is `art-candidates/prompt-pack/primer.txt` (never retype it). The three blocks below are quoted from it.

### 1.1 Master style sentence

```
Premium AAA mobile puzzle-game illustration: chunky, charming toy-like 3/4 forms, strong simplified silhouettes, smooth glossy enamel, controlled brass accents, warm cream mounting plates, and bold dark-colored outlines. Clean sculpted geometry, restrained highlights, soft dimensional shadows, warm studio lighting, vivid but disciplined colors, instantly readable at thumbnail size, handcrafted polish, never photorealistic.
```

### 1.2 Style lock (OMM_STYLE_LOCK_V2)

```
OMM_STYLE_LOCK_V2
Camera: orthographic-like 3/4 view, 30 degrees above the subject, seeing its front and right sides, no wide-angle distortion. Light: from the upper-left, one broad soft highlight and one restrained specular streak per major surface; soft contact shadow falls lower-right. Shapes: chunky rounded geometric forms, exaggerated readable proportions. Outline: dark chocolate or dark local-color, about 4-5 percent of the object's visible width, the same weight everywhere, NEVER pure black.
Palette: vermilion red #E9422B, warm gold #F3B62F, cobalt blue #168DE0, cream #F2E6C9, dark charcoal #303139, brass #C99532. Controlled secondary accents only: emerald #27B957, cyan #35CDEB, violet #9343CB. Surfaces: smooth painted toy enamel, satin brass, warm painted metal, clean ceramic. Brass is an accent material under 20 percent of the surface, never the main body.
Machines always sit on a compact cream beveled mounting plate with four simplified brass corner feet, plate no wider than 115 percent of the machine body. Monsters, icons, UI parts and effects have no plate. Everything is fully visible, centered, with a 10 percent empty margin on every side. Favor silhouette, readability and cohesive handcrafted shapes over extra detail. The smallest detail must survive at 64 pixels.
Exceptions that the asset prompt may state: UI frames are front-facing, not 3/4; backgrounds may have soft atmosphere; effects have no outline and use white or soft color on black.
```

### 1.3 Negatives

```
NO photorealism, realistic PBR rendering, thin outlines, black outlines, sketch lines, painterly brush strokes, gritty textures, rust, scratches, dirt, excessive rivets, excessive gears, microscopic mechanical detail, complex reflections, chrome, raw grey steel, hard reflections, blown highlights, heavy bloom, harsh shadows, flat vector art, stock-vector gradients, pixel art, anime styling, watercolor, neon overload, random colors, mismatched camera angles, perspective distortion, oversized bases, clutter, text, letters, numbers, watermarks, borders, cropped objects, inconsistent proportions, cheap plastic look, generic AI detail noise, real brand or product trade dress.
```

### 1.4 Key colour rule and format rules (critic additions)

```
You cannot make real transparency, so I key the background out myself. Unless the prompt says otherwise, put every object on ONE perfectly flat, uniform, pure magenta background #FF00FF. No gradient, no shadow on the background, no glow outside the outline, no floor, no checkerboard, no white. Any hole inside an object (a shackle, a gear center, a handle loop) must also show flat magenta, never white. Do not use magenta or hot pink inside the object. If a subject needs magenta or pink, use flat pure green #00FF00 as the key instead and I will tell you in the prompt. Effects meant for additive blending are white or soft color on a pure black #000000 background. Full-screen backgrounds and screen mockups have no key.
```

The primer also carries the FORMAT RULES (one object per cell, exact canvas, strips fill 95% width, tiers change silhouette, no raw grey steel, face separates from rim, one idea per icon, no text, the visual fingerprint) and the READY handshake. These come from CRITIQUE_1 "what to add to every prompt" (13 repeating problems) and GPT Q5.

### 1.5 Deviations from GPT's text (on purpose)

- Transparent background is replaced by a flat magenta (or green, or black for additive FX) key, because the critic pass showed white backgrounds leave fringes and white holes (CRITIQUE_1, patterns 2 and 3) and ChatGPT cannot be trusted to deliver alpha. GPT itself recommends scripted alpha verification (Q5 section 7).
- Ranks are 1-6, not 1-8: the Art Bible (section 5.1) fixes the playable cap at rank 6 and the registry holds ranks 1-6. GPT's 8-rank ladders for Cannon, Coil and Bell are not generated; those machines are approved finals and GPT itself warns its ladders must not replace approved identities (Q6 corrections).
- The "20-30 FX families" are delivered as 18 six-sprite sheets (108 sprites) built from the effects lab (docs/art/ART_BIBLE.md section 7, art-candidates/fx-lab-v2 README): 12 shoot families, 6 triggers, soft sprites, merge and kill moments.
- GPT's generic monster sheet (goblin, slime, beetle, rhino) is adapted to our household-object roster (Toolbox Terrier, Kettle Grump, Traffic Cone Goblin, Rivet Rhino).
- The yard is restyled into the toy style (critic recommendation); the photoreal sy2 set is retired once yard_parts is approved.
- Offers and popups are MOCK ONLY: art for templates, never wired to real payments.

### 1.6 Anchors (attach 2-3 per chat, assign roles)

| Id | Controls | File | Why |
|---|---|---|---|
| A1-style | ART STYLE | crate_toolbox (and crate_tool_bag) from art-candidates/roster-b1 | Critic benchmark, score 9: thick navy outline, red-cream-brass, top-left light. |
| A2-unit-camera | CAMERA and MATERIALS | unit_piston (art-candidates/units-part1) and cannon_4 (src/assets/art/cannon_4.webp) | Same plinth, same outline, reads at 70 px. |
| A3-button | UI SURFACE | btn_green and btn_blue (src/assets/art); replace with the V2 buttons once ui_kit_core is approved | Style A (toy enamel) is the owner-chosen UI direction. |
| A4-icon | ICON FAMILY | icon_coin, icon_check, icon_star_full (art-candidates/pack-out B04/B13) | Bold brass portholes with colour-coded centres, one family. |
| A5-chest | CHEST and REWARD OBJECT | chest_iron_closed (B06) | Best contrast of body and bands among the six B06 chests. |
| A6-fx | EFFECT LOOK | sy2_fx_sparkle (B24), vfx_combo_flash (B18) | Clean bright centres, soft falloff. |
| A7-board | BOARD CELL | tray_plate.webp and slot.webp (src/assets/art); replace with the V2 board once approved | Current in-game cell look. |
| A8-monster | MONSTER LOOK | the existing mon_* drafts until monster_anchor_sheet is approved, then the approved anchor sheet | Keeps identity while the style is locked. |
| A9-background | BACKGROUND MOOD | bg.webp (src/assets/art); replace with the approved gameplay backdrop | Calm centre, detail at the edges. |
| A10-ui | UI PANEL | ui_kit_core approved cells (modal panel, buttons) | Once approved it is the only UI reference. |

Every prompt lists the anchors it needs. Wording to send with the attachments: "Image 1 controls ART STYLE. Image 2 controls CAMERA and MATERIALS. Do not copy their objects." Never attach more than three, and never use a photoreal or off-style sheet as a reference.

## 2. Rejection rubric (checklist for the critic)

Judge against the approved anchors, not the image alone. 20 criteria x 2 points = 40. A star is an auto-reject when it scores 0 and the criterion is relevant (no outline needed on additive FX, no 3/4 view on flat UI, no plate on monsters).

| # | Criterion | 0 = fail | 1 = acceptable | 2 = great |
|---|---|---|---|---|
| 1 ★ | Outline weight | Missing, broken, black or wildly inconsistent | Dark local-colour outline, minor variation | Consistent bold 4-5% outline, clean joins |
| 2 | Light direction | Conflicting or bottom/right primary light | Mostly upper-left | Upper-left, controlled highlights, lower-right shadow |
| 3 | Palette discipline | Random hues, neon, clashes | Mostly OMM palette | Cohesive, restrained, intentional accents |
| 4 ★ | Silhouette at 70 px | Cannot identify object or function | Recognisable with effort | Recognisable instantly without inner detail |
| 5 | Readability at 110 px | Important features merge or vanish | Core features distinguishable | Strong hierarchy |
| 6 ★ | Edge halos and fringes | White or dark fringes, cut-out artefacts | Minor fringe invisible at game scale | Clean on light and dark |
| 7 ★ | Baked text | Unrequested text, numbers, lettering | Small intentional non-functional symbols | No text, text areas empty |
| 8 ★ | Symmetry and structure artefacts | Duplicated or fused parts | Minor asymmetry | Believable, clean geometry |
| 9 ★ | Cell-edge slivers | Neighbour fragments at crop edges | Clean borders, uneven padding | Fully isolated, 10% safe margin |
| 10 ★ | Perspective consistency | Wrong view, inverted, distorted | Close to the approved 3/4 camera | Matches camera and visible faces |
| 11 | Material consistency | Photoreal, chrome or painterly | Mostly enamel and brass | Every material matches the toy-world finish |
| 12 | Visual complexity | Cluttered, noisy | Some unneeded decoration | Bold forms, every detail has a purpose |
| 13 ★ | Aspect ratio and dimensions | Wrong canvas, layout or cell count | Right format, slightly uneven | Exact format and spacing |
| 14 ★ | Background and key colour | Opaque or white background, checkerboard, white holes | Correct key, minor edge issues | Flat key, clean holes, no shadow |
| 15 ★ | Anatomy and mechanical logic | Impossible joints, disconnected mechanism | Plausible, minor shortcuts | Clear construction |
| 16 | Gold and brass overuse | Gold dominates, rarity meaningless | Slightly excessive trim | Gold only as intentional accent |
| 17 | Shape and scale consistency | Too small, oversized base | Close to approved scale | Consistent framing, plate at most 115% of body |
| 18 | Surface finish | Dirty, scratched, plastic or overexposed | Clean, minor highlight issues | Smooth sculpted enamel, broad highlights |
| 19 ★ | Identity and rank correctness | Wrong object, missing parts, duplicate rank | Right identity, minor deviation | Exact identity, features and rank steps |
| 20 | Overall premium appeal | Generic AI asset, cheap mobile look | Professional, not distinctive | Native to a top-tier mobile game |

Extra OMM checks (pass or fail, from CRITIQUE_1; any failure = REJECT or REDO per severity):

- [ ] **X1 No white leftover**: Every hole (shackle, gear centre, handle loop) is flat key colour, never white or grey. Critic zooms into each hole.
- [ ] **X2 Canvas fill and stretchability**: Strips, panels, ribbons and bars fill 95% of the stated width, have uniform borders and an empty centre, and survive a 9-slice or crop test.
- [ ] **X3 Not a duplicate**: Does not resemble anything in the prompt's "must not resemble" list or another asset in the same batch (nail gun vs rivet gun, key vs key, spring vs tesla).
- [ ] **X4 Style family**: Placed next to two approved anchors at phone size it looks like the same studio. Toy outline, not photoreal, not stock vector.
- [ ] **X5 Role and tier carried by silhouette**: Rank and rarity differences show in shape, not only colour. Role icons differ in colour AND glyph.
- [ ] **X6 No real-brand look**: No recognisable trade dress (yellow-and-black cordless drill, logos).

Thresholds: PASS 35-40; REDO 28-34, no critical zero; REJECT 0-27 or any critical (star) zero or any X1-X6 failure. Maximum 2 redos per asset.

Mandatory visual test for every asset: 70x70 and 110x110 on a light and on a dark background, plus side by side with two anchors and the in-game neighbours. For a sheet: every cell on its own, then the sheet. A contaminated grid boundary or wrong layout rejects the whole sheet.

Critic output per asset (invalid without all of it): 20 scores, total, critical failures, X1-X6, verdict, the three lowest criteria each with one fix sentence. "If in doubt: REDO."

Critic checklist, tick every box before writing the verdict:

- [ ] 1. Outline weight ★: ____ / 2
- [ ] 2. Light direction: ____ / 2
- [ ] 3. Palette discipline: ____ / 2
- [ ] 4. Silhouette at 70 px ★: ____ / 2
- [ ] 5. Readability at 110 px: ____ / 2
- [ ] 6. Edge halos and fringes ★: ____ / 2
- [ ] 7. Baked text ★: ____ / 2
- [ ] 8. Symmetry and structure artefacts ★: ____ / 2
- [ ] 9. Cell-edge slivers ★: ____ / 2
- [ ] 10. Perspective consistency ★: ____ / 2
- [ ] 11. Material consistency: ____ / 2
- [ ] 12. Visual complexity: ____ / 2
- [ ] 13. Aspect ratio and dimensions ★: ____ / 2
- [ ] 14. Background and key colour ★: ____ / 2
- [ ] 15. Anatomy and mechanical logic ★: ____ / 2
- [ ] 16. Gold and brass overuse: ____ / 2
- [ ] 17. Shape and scale consistency: ____ / 2
- [ ] 18. Surface finish: ____ / 2
- [ ] 19. Identity and rank correctness ★: ____ / 2
- [ ] 20. Overall premium appeal: ____ / 2
- [ ] X1. No white leftover: pass / fail
- [ ] X2. Canvas fill and stretchability: pass / fail
- [ ] X3. Not a duplicate: pass / fail
- [ ] X4. Style family: pass / fail
- [ ] X5. Role and tier carried by silhouette: pass / fail
- [ ] X6. No real-brand look: pass / fail
- [ ] Total ____ / 40, verdict ____, top three fixes written.

## 3. Per-category templates

GPT Q3 section D, with ranks 1-6 and the key background. Prompts in sections 7 and 8 are these templates filled in.

**T1 Units / machines**

```
Create [UNIT NAME], a [ROLE] machine with [PRIMARY MECHANISM]. Silhouette: [DISTINCTIVE SHAPE]. Main body [COLOR], accents [COLOR]. Clearly show [FUNCTIONAL FEATURE]. Rank [1-6], with [EXACT ADDITIONS]. Same 3/4 camera, cream plate, bold outline. Machine fills 80% of canvas. Readable at 64 pixels. Isolated on flat key background.
```

**T2 Monsters and bosses**

```
Create [MONSTER NAME], a [TYPE] enemy with [PERSONALITY]. Primary silhouette [SHAPE]; exaggerated [FEATURE]. Palette [COLORS]. Expression [EMOTION]. Pose [ACTION], facing screen-left toward the player's machines. Clearly readable face, limbs and attack weapon. Bosses: oversized upper-body mass and one iconic [SIGNATURE FEATURE]. Full-body, isolated, no mounting plate.
```

**T3 UI frames and buttons**

```
Create a [UI COMPONENT] in ONE MORE MERGE's toy-enamel UI style. Front-facing, symmetrical, [SHAPE], [WIDTH:HEIGHT]. Main surface [COLOR], restrained brass rim, cream inner panel, broad upper-left highlight. State [NORMAL/PRESSED/SELECTED/DISABLED]. Keep the center completely clear for code-drawn text or icons. Uniform border width. No lettering.
```

**T4 Icons**

```
Create [ICON NAME] representing [FUNCTION]. One bold instantly recognisable silhouette, chunky proportions, enamel surface, dark local-colour outline. Primary [COLOR], one secondary [COLOR], brass only when appropriate. Front or slight 3/4 view matching [APPROVED ICON REFERENCE]. No tiny details, no base plate, no text. Readable at 24-48 pixels.
```

**T5 Backgrounds**

```
Create a vertical [LOCATION] workshop environment for [SCREEN], 9:16 composition. Warm handcrafted toy-world, simplified materials, restrained brass. Light from the upper left. Detailed decoration around [EDGE AREAS], spacious low-contrast negative space at [UI PLACEMENT]. Main emphasis at [FOCAL LOCATION]. Clear foreground, midground and background separation. No text, characters or UI.
```

**T6 Board and cell tiles**

```
Create [BOARD ELEMENT], fixed 3/4 top-down angle matching [APPROVED BOARD REFERENCE]. Material [MATERIAL], palette [COLORS], state [NORMAL/SELECTED/LOCKED/BLOCKED]. Clean rectangular geometry, simple beveled edges, consistent grid proportions, readable boundaries, subtle upper-left light. Tileable where applicable. No decorative noise. Exact alignment with the existing 6x5 grid.
```

**T7 Chests and rewards**

```
Create [REWARD OBJECT], rarity [TIER]. Strong [SILHOUETTE] shape, main material [MATERIAL], accent [COLOR]. Distinctive lock or emblem [FEATURE]. Show [CLOSED/OPEN/REVEAL] state. Raise perceived value through shape and controlled lighting, not extra tiny decoration. Same 3/4 camera and outline. Centered, 10% safe margin. No labels.
```

**T8 FX sprites**

```
Create a clean VFX sprite for [EVENT]: [EFFECT DESCRIPTION]. Shape [SILHOUETTE], core [COLOR], outer glow [COLOR]. Strong bright center, smooth falloff, sparse particles. For [ADDITIVE/ALPHA] blending and [DURATION] animation. One isolated frame, centered, generous margins. White or soft colour on pure black. No machines, text, backgrounds or borders.
```

**T9 Mascot and characters**

```
Create [CHARACTER NAME], a charming [ROLE/SPECIES] with [PERSONALITY]. Oversized expressive head, compact readable body, distinctive [SILHOUETTE FEATURE]. Palette [COLORS], outfit [DETAILS], expression [EMOTION], pose [ACTION]. Same toy-like enamel illustration style, simplified fabric and skin shading. Full-body 3/4 front view, upper-left light, thick local-colour outline. No base plate.
```

**Sheet wrapper** (put before the template for any sheet): `C columns by R rows sheet, canvas 1536x1024, equal cells, wide gutters, reading order left to right then top to bottom. One object per cell.` Use sheets for related variations only, never for unrelated complex objects (GPT Q5). Rank ladders: sheet 3x2, ranks 1-6, each rank states exactly what it adds; design ranks 1, 4 and 6 first when a unit fails twice, then repair single cells.

**FIX / EDIT template** (used in the redo loop):

```
EDIT THE ATTACHED IMAGE, NOT A NEW DESIGN. Preserve the exact composition, camera, palette, outline style, lighting, object identity, canvas size, cell positions and all approved geometry. Change ONLY [FIX SENTENCE]. Do not modify [LOCKED ELEMENTS]. All other elements must remain visually unchanged. Keep the flat key background.
```

## 4. The loop for every batch

- **0. Open.** Open a NEW ChatGPT image chat. Paste art-candidates/prompt-pack/primer.txt exactly (copy the file, never retype). Wait for the single word READY. Attach the 2-3 anchors named in the batch, saying which controls what ("Image 1 controls ART STYLE, Image 2 controls CAMERA and MATERIALS. Do not copy their objects.").
- **1. Generate.** Send the batch prompts one at a time, in order, in that chat. Save each raw image untouched as art-candidates/pack-v2/<batch>/raw/<rawFile>. Set status "generated". Never edit a raw file.
- **2. Slice and gate.** Run the slicing pipeline (section 6). Mechanical gates fail fast: wrong size, key not flat, white in holes, cell-edge pixels, duplicate ranks, dull metal, halo. Deterministic failures (stray pixel, key tint) are repaired by script; anything else goes to step 4 as a recorded failure. Status "sliced".
- **3. Contact sheet.** The pipeline writes one review sheet per batch: every cell at 70 px and 110 px on cream #F2E6C9 and charcoal #303139, next to the anchors and the in-game neighbours.
- **4. Harsh critic.** A different reviewer from the generator (a separate agent or the owner) scores every asset with the 20-item rubric plus X1-X6 and returns, per asset: 20 scores, total, critical failures, verdict, and the three lowest criteria with one fix sentence each. A generic "looks good" is invalid. If in doubt: REDO.
- **5. Redo, max 2.** REDO and REJECT assets get the FIX template: attach the failed image, send "EDIT THE ATTACHED IMAGE..." with the critic's fix sentences. Two redos at most per asset. After two failed redos stop regenerating the whole sheet: isolate the failing cell, repair it alone, composite by script. A third failure goes to the owner as REJECT with the three attempts attached.
- **6. Owner approval.** Passed assets are put in the Asset Hub as "draft" with the critic sheet. The owner approves per asset or per batch; only then status "approved" and the file moves to the approved set. Gate A: board + hero + UI kit + monster anchors are judged together at phone size before any other batch starts. Gate B: after units and FX, one home screen and one battle screen are assembled from approved art.
- **7. Wire later.** Wiring into src/ is a separate task, started only after the owner has agreed a whole screen or family ("agree on all assets first, wire in later"). Registry status goes placeholder -> draft -> final by hand.

Per-asset states: planned -> generated -> sliced -> critic-pass -> approved -> wired (redo and rejected are side states). The status is kept in the batch manifest and in the Asset Hub, never in the file name.

File naming: raw `omm_<theme>_<id>_v01.png` (v02, v03 for redos); sliced outputs use the output ids in this pack (lowercase ASCII, digits, underscores). Only the critic-passed, owner-approved file is copied to `src/assets/art/` by the later wiring task.

## 5. Order of work

1. **Gate A**: N01 (board, hero, UI kit core, merge chain FX, monster anchors, battle HUD) generated together, judged together at phone size next to each other. If outline, light, colour balance or material do not feel like one game, fix the primer (v3) before anything else.
2. REDO queue R01-R13 (UI kit first: panels, ribbons, bars, slider, tabs, buttons), because the UI is the weakest and most visible area (0% of panels, ribbons and bars were usable).
3. N02 onward in the listed order. Units and FX run before monsters and offers because the owner complaints are placeholder units, crates and weak effects.
4. **Gate B**: one home screen and one battle screen assembled from approved art (GPT: build one vertical slice before scaling).

## 6. Slicing pipeline specification

Tool: tools/slice-art.mjs (to be built; Node, with sharp or an equivalent image library; no image library is installed in this repo today, the harsh critic pass used Python/Pillow)

- **S0 Validate input.** Check the PNG decodes, size equals the prompt canvas (±2%), and the border pixels are flat key colour: median border colour within ΔE 10 of the declared key (#FF00FF, #00FF00 or #000000) and border standard deviation under 6. Otherwise fail "key not flat" (critic repeated this on white backgrounds).
- **S1 Key to alpha.** Magenta/green key: alpha from the colour distance to the key in Lab, alpha = clamp((ΔE - 14) / (40 - 14)). Black key (additive FX): alpha = max(R,G,B); keep colour unpremultiplied. Backgrounds: no keying.
- **S2 Despill and edge decontamination.** For every pixel with alpha under 0.98 and within 3 px of the silhouette: estimate the foreground colour as C = (I - (1 - a) * K) / a, then replace the colour of the edge ring by the colour of the nearest interior pixel at least 2 px inside (dilate interior colours outward). Despill only the edge ring: spill = max(0, min(R,B) - G) * 0.9 subtracted from R and B for magenta, the mirror rule for green. Never despill the interior (red, violet and purple parts are legitimate).
- **S3 1 px erode and feather.** Erode alpha by 1 px (3x3 cross min filter), then feather alpha only with a Gaussian of sigma 0.6. This kills the pale fringe the critic found on knob, tabs and many UI pieces.
- **S4 Holes.** Flood-fill the transparent region from the border; any enclosed key-coloured region is also keyed out (shackles, gear centres, handles). Enclosed near-white regions are NOT keyed: they fail gate G3.
- **S5 Sheet segmentation.** Never crop on fixed grid lines. Dilate the alpha by 12 px, label connected components, expect exactly layout cell-count components (plus the declared empty cells), assign them to cells by centroid, row-major. Count mismatch fails the sheet "layout" (slivers, merged cells and duplicate ranks come from AI grids). Each component is cropped from the undilated alpha.
- **S6 Trim to bbox.** Crop each object to its alpha bbox (alpha above 8). Single objects, icons, units: pad 8% of the long side, centre on a square canvas. Units: pad 10%. Strips, panels, ribbons, bars: no padding, keep the bbox aspect, and write the 9-slice insets (measured from the uniform border band). FX sprites: pad 10%, centre of brightness at the canvas centre.
- **S7 Export.** PNG for review, WebP (quality 90, alpha) for shipping. Units and icons 256 px (units 256x256 source, 2x of the 118 px cell), crates 512, FX 256 (rings and glows 512), UI strips at native width up to 1024. Backgrounds: resize cover to 1080x1920, WebP quality 85. Write art-candidates/pack-v2/<batch>/manifest.json with the sha1 of the raw, sizes, gate results and the 9-slice insets.
- **S8 Light and dark checks.** Composite every cell on cream #F2E6C9, charcoal #303139 and mid blue #3B5BA5 at 70 px and 110 px and write the review sheet. Automatic halo metric: among boundary pixels (alpha 0.05-0.95) the share whose colour differs by more than 25 luminance levels from the nearest interior colour must be at most 2% on both light and dark backgrounds.

### Metric gates (script, before the critic sees anything)

| Gate | Name | Rule | Severity |
|---|---|---|---|
| G1 | Dimensions | Raw size equals the canvas in the prompt (±2%); each exported cell is square (single, icon, unit) or within 3% of the requested ratio (strip, panel). | critical |
| G2 | Key purity | After S1, key-coloured pixels (within ΔE 20 of the key) inside alpha above 0.5 are at most 0.1% of object pixels, and no pixel with min(R,B) - G above 90 survives on non-magenta objects. | critical |
| G3 | White in holes | No enclosed region of near-white (all channels at least 235) with area at least 0.2% of the bbox area. Fails shackles and gear centres filled with white. | critical |
| G4 | Cell-edge pixels | No pixel with alpha above 16 within 2 px of the raw cell border; every extra component smaller than 2% of the main object, or touching within 6 px of the cell edge, is a sliver and fails. | critical |
| G5 | Occupancy | Single objects: bbox long side 70-90% of the cell (and at least 8% margin each side). Strips and panels: bbox width at least 95% of the stated width. FX: bright mass inside the middle 80%. | critical |
| G6 | Stretch uniformity | Panels and strips: border band mean colour per side within 8% of each other; the middle 40% of a strip has a horizontal luminance standard deviation under 4% (so the middle can be stretched); end caps mirror within 10%. | critical for nine/strip |
| G7 | Duplicate and monotonic ranks | dHash distance between any two ranks of one unit must be at least 8 (of 64 bits); opaque area must not shrink by more than 3% from one rank to the next. Failures are flagged for the critic, not auto-rejected. | flag |
| G8 | Dull metal | Mean saturation of opaque pixels at least 0.30 (the critic measured grey steel at 5-30%); under 0.25 fails. Not applied to FX or cream UI plates. | critical for units, icons, props |
| G9 | Outline present | At least 80% of the boundary ring (6 px inside the silhouette) has luminance under 0.35 and is not pure black (max channel above 20). Not applied to FX or backgrounds. | critical |
| G10 | Additive FX | The four corners of an FX cell are at most 8/255 on every channel; white-only sprites have mean saturation at most 0.15 (tintable); coloured FX are declared in the prompt. | critical for fx |
| G11 | Tileable background | For vertical tiles the top and bottom rows match within 6 levels; centre calm: edge density in the middle 40% below the border average. | critical for tiles |
| G12 | Halo | Boundary halo share at most 2% on cream and charcoal (S8). | critical |

Deterministic repairs the script may do without regeneration: remove a stray component (G4 sliver), re-key a slightly tinted background, replace white holes by transparency when the hole is clearly enclosed and the owner agrees, re-pad. Wrong shape, perspective, anatomy, identity or silhouette always needs regeneration.

Why each gate exists: G2/G3 (white left in holes, key tint) and S2/S3 (pale fringe) come from CRITIQUE_1 patterns 2 and 3; G4 from pattern 8 (slivers in key, fuse spark, gear blast, closed blue box); G5/G6 from pattern 1 and the stretch rule (bars, ribbons, planks came back at 20-45% of the canvas); G8 from pattern 5 (dull steel); G7 and S5 from GPT Q5 (duplicate ranks and uneven grids come from AI sheets); G10 from pattern 7 (baked colour in effects).

## 7. REDO queue (run first)

All 77 items below were judged REDO or REJECT by the harsh critic (CRITIQUE_1). Each prompt restates the subject, adds the critic's fix, quotes the exact aspect and uses the key colour (magenta unless noted; black for additive FX). Items marked EDIT FIRST have a small local defect: try the EDIT template on the original, regenerate fresh only if that fails. REJECT items (7): ui_ribbon_event, bar_xp_frame, ui_slider_track, ui_event_card, vfx_row_surge, sy2_plank_long, sy2_plate_long.

Dropped on the critic's advice (no prompt): `sy2_screw_34` (Critic: delete, near-duplicate of the coloured B21 screws. Covered by sy2_screw_head and sy2_screw_side.); `nail_gun` (Critic: near-duplicate of the in-game nail_gun art. Keep the shipped art.)

Aspect-ratio rule used below: ChatGPT canvases are 1024x1024, 1536x1024 or 1024x1536. A long strip is requested as ONE strip of the exact ratio on a 1536x1024 canvas, centered, spanning 95% of the width, with the computed pixel height stated, magenta above and below; the pipeline trims to the bbox. Never ask for a 12:1 canvas.

### R01 UI kit (6 prompts)

**R01.1 `ui_panel_std`** (REDO, critic score 5) - single | canvas 1024x1024 | key magenta | slice `nine` | 48 words
- Raw file: `omm_ui_ui_panel_std_v01.png`  Outputs: `ui_panel_std_v2`
- Attach: A3-button; A10-ui; the failed original attached as "what went wrong" only
- Critic said: Black bezel and no brass, so it does not match the popup beside it.
- Slicing: Stretchable panel: key only the corner gaps, no padding, keep aspect, measure and store 9-slice insets, gate G6.

```
Standard menu panel, cream enamel with a thin brass border and tiny rivets. Canvas 1024x1024 square. Front-facing flat panel fills 96 percent of the canvas, identical border width on all four sides, no corner-only highlights, magenta only in the four rounded-corner gaps, empty center. Flat magenta #FF00FF background.
```

**R01.2 `ui_panel_popup`** (REDO, critic score 6) - single | canvas 1024x1024 | key magenta | slice `nine` | 48 words
- Raw file: `omm_ui_ui_panel_popup_v01.png`  Outputs: `ui_panel_popup_v2`
- Attach: A3-button; A10-ui; the failed original attached as "what went wrong" only
- Critic said: Half the canvas is empty and the glossy rim cannot be stretched.
- Slicing: Stretchable panel: key only the corner gaps, no padding, keep aspect, measure and store 9-slice insets, gate G6.

```
Popup panel, cream enamel with a slightly thicker brass border and four rivets. Canvas 1024x1024 square. Front-facing flat panel fills 96 percent of the canvas, identical border width on all four sides, no corner-only highlights, magenta only in the four rounded-corner gaps, empty center. Flat magenta #FF00FF background.
```

**R01.3 `ui_panel_card`** (REDO, critic score 6) - single | canvas 1024x1280 | key magenta | slice `nine` | 28 words
- Raw file: `omm_ui_ui_panel_card_v01.png`  Outputs: `ui_panel_card_v2`
- Attach: A3-button; A10-ui; the failed original attached as "what went wrong" only
- Critic said: Glossy plastic bevel with a black shell; specular highlights in corners prevent 9-slice stretching.
- Slicing: Stretchable panel: key only the corner gaps, no padding, keep aspect, measure and store 9-slice insets, gate G6.

```
Card panel, flat cream enamel, 4:5 portrait. Canvas 1024x1280 (4:5). Panel fills 96 percent of the canvas, identical border on all sides, empty center. Flat magenta #FF00FF background.
```

**R01.4 `ui_panel_well`** (REDO, critic score 6) - single | canvas 1536x1024 | key magenta | slice `nine` | 33 words
- Raw file: `omm_ui_ui_panel_well_v01.png`  Outputs: `ui_panel_well_v2`
- Attach: A3-button; A10-ui; the failed original attached as "what went wrong" only
- Critic said: Dark recess is fine but the brass rim is a different weight from the other panels.
- Slicing: Stretchable panel: key only the corner gaps, no padding, keep aspect, measure and store 9-slice insets, gate G6.

```
Inset well panel for lists, dark charcoal-blue recess inside a brass rim. Canvas 1536x1024. Panel 2:1, fills 96 percent of the canvas, identical rim on all sides, empty center. Flat magenta #FF00FF background.
```

**R01.5 `ui_toast`** (REDO, critic score 6) - single | canvas 1536x1024 | key magenta | slice `strip` | 56 words
- Raw file: `omm_ui_ui_toast_v01.png`  Outputs: `ui_toast_v2`
- Attach: A3-button; A10-ui; the failed original attached as "what went wrong" only
- Critic said: Small pill with bulging end caps; text area is tiny.
- Slicing: Stretchable strip: no padding, keep ratio, store end-cap widths for 3-slice (bars: fill is cropped by code), gate G6.

```
Toast message plate, cream enamel, brass end caps, soft drop shadow only inside the outline. Canvas 1536x1024 (3:2). ONE strip of ratio 5:1, centered, exactly 95 percent of the canvas width (about 1460 px) so it is about 292 px tall, touching both ends of that width, flat magenta above and below. Flat magenta #FF00FF background.
```

**R01.6 `ui_tooltip`** (REDO, critic score 6) - single | canvas 1536x1024 | key magenta | slice `nine` | 34 words
- Raw file: `omm_ui_ui_tooltip_v01.png`  Outputs: `ui_tooltip_v2`
- Attach: A3-button; A10-ui; the failed original attached as "what went wrong" only
- Critic said: Speech bubble tail and bevel cannot be sliced; thin black shell.
- Slicing: Stretchable panel: key only the corner gaps, no padding, keep aspect, measure and store 9-slice insets, gate G6.

```
Tooltip plate, rounded cream rectangle. Canvas 1536x1024. Plate 4:3 fills 90 percent of the canvas; the pointer tail is a separate small brass wedge below it with a visible gap. Flat magenta #FF00FF background.
```

### R02 UI kit (6 prompts)

**R02.1 `ui_ribbon_blue`** (REDO, critic score 5) - single | canvas 1536x1024 | key magenta | slice `strip` | 59 words
- Raw file: `omm_ui_ui_ribbon_blue_v01.png`  Outputs: `ui_ribbon_blue_v2`
- Attach: A3-button; A10-ui; the failed original attached as "what went wrong" only
- Critic said: Ribbon is only 44% of its canvas, arched so text will not fit, glossy stock-vector look.
- Covers registry: ui_ribbon
- Slicing: Stretchable strip: no padding, keep ratio, store end-cap widths for 3-slice (bars: fill is cropped by code), gate G6.

```
Banner ribbon in cobalt blue #168DE0, for a code-drawn title. Canvas 1536x1024 (3:2). ONE strip of ratio 3:1, centered, exactly 95 percent of the canvas width (about 1460 px) so it is about 487 px tall, touching both ends of that width, flat magenta above and below. Ribbon is symmetric with a straight flat centre. Flat magenta #FF00FF background.
```

**R02.2 `ui_ribbon_gold`** (REDO, critic score 5) - single | canvas 1536x1024 | key magenta | slice `strip` | 64 words
- Raw file: `omm_ui_ui_ribbon_gold_v01.png`  Outputs: `ui_ribbon_gold_v2`
- Attach: A3-button; A10-ui; the failed original attached as "what went wrong" only
- Critic said: Same defect as the blue one: small, arched, stock-vector gloss.
- Slicing: Stretchable strip: no padding, keep ratio, store end-cap widths for 3-slice (bars: fill is cropped by code), gate G6.

```
Banner ribbon in warm gold #F3B62F with a darker brown rim, for a code-drawn title. Canvas 1536x1024 (3:2). ONE strip of ratio 3:1, centered, exactly 95 percent of the canvas width (about 1460 px) so it is about 487 px tall, touching both ends of that width, flat magenta above and below. Ribbon is symmetric with a straight flat centre. Flat magenta #FF00FF background.
```

**R02.3 `ui_ribbon_green`** (REDO, critic score 5) - single | canvas 1536x1024 | key magenta | slice `strip` | 58 words
- Raw file: `omm_ui_ui_ribbon_green_v01.png`  Outputs: `ui_ribbon_green_v2`
- Attach: A3-button; A10-ui; the failed original attached as "what went wrong" only
- Critic said: Same defect: small, arched.
- Slicing: Stretchable strip: no padding, keep ratio, store end-cap widths for 3-slice (bars: fill is cropped by code), gate G6.

```
Banner ribbon in emerald #27B957, for a code-drawn title. Canvas 1536x1024 (3:2). ONE strip of ratio 3:1, centered, exactly 95 percent of the canvas width (about 1460 px) so it is about 487 px tall, touching both ends of that width, flat magenta above and below. Ribbon is symmetric with a straight flat centre. Flat magenta #FF00FF background.
```

**R02.4 `ui_ribbon_purple`** (REDO, critic score 5) - single | canvas 1536x1024 | key magenta | slice `strip` | 58 words
- Raw file: `omm_ui_ui_ribbon_purple_v01.png`  Outputs: `ui_ribbon_purple_v2`
- Attach: A3-button; A10-ui; the failed original attached as "what went wrong" only
- Critic said: Same defect: small, arched.
- Slicing: Stretchable strip: no padding, keep ratio, store end-cap widths for 3-slice (bars: fill is cropped by code), gate G6.

```
Banner ribbon in violet #9343CB, for a code-drawn title. Canvas 1536x1024 (3:2). ONE strip of ratio 3:1, centered, exactly 95 percent of the canvas width (about 1460 px) so it is about 487 px tall, touching both ends of that width, flat magenta above and below. Ribbon is symmetric with a straight flat centre. Flat magenta #FF00FF background.
```

**R02.5 `ui_ribbon_red`** (REDO, critic score 5) - single | canvas 1536x1024 | key magenta | slice `strip` | 58 words
- Raw file: `omm_ui_ui_ribbon_red_v01.png`  Outputs: `ui_ribbon_red_v2`
- Attach: A3-button; A10-ui; the failed original attached as "what went wrong" only
- Critic said: Same defect: small, arched.
- Slicing: Stretchable strip: no padding, keep ratio, store end-cap widths for 3-slice (bars: fill is cropped by code), gate G6.

```
Banner ribbon in vermilion #E9422B, for a code-drawn title. Canvas 1536x1024 (3:2). ONE strip of ratio 3:1, centered, exactly 95 percent of the canvas width (about 1460 px) so it is about 487 px tall, touching both ends of that width, flat magenta above and below. Ribbon is symmetric with a straight flat centre. Flat magenta #FF00FF background.
```

**R02.6 `ui_ribbon_event`** (REJECT, critic score 3) - single | canvas 1536x1024 | key magenta | slice `strip` | 58 words
- Raw file: `omm_ui_ui_ribbon_event_v01.png`  Outputs: `ui_ribbon_event_v2`
- Attach: A3-button; A10-ui; the failed original attached as "what went wrong" only
- Critic said: Tiny thin cream scroll, 30% of canvas, near-white on a light UI, no room for text.
- Slicing: Stretchable strip: no padding, keep ratio, store end-cap widths for 3-slice (bars: fill is cropped by code), gate G6.

```
Event banner ribbon, warm orange-red with a cream inner strip, no near-white. Canvas 1536x1024 (3:2). ONE strip of ratio 4:1, centered, exactly 95 percent of the canvas width (about 1460 px) so it is about 365 px tall, touching both ends of that width, flat magenta above and below. Straight flat centre, folded tails. Flat magenta #FF00FF background.
```

### R03 UI kit (6 prompts)

**R03.1 `bar_hp_frame`** (REDO, critic score 5) - single | canvas 1536x1024 | key magenta | slice `strip` | 72 words
- Raw file: `omm_ui_bar_hp_frame_v01.png`  Outputs: `bar_hp_frame_v2`
- Attach: A3-button; A10-ui; the failed original attached as "what went wrong" only
- Critic said: Cream tube with brass caps, a different material from the other two frames.
- Slicing: Stretchable strip: no padding, keep ratio, store end-cap widths for 3-slice (bars: fill is cropped by code), gate G6.

```
HP bar frame, red-brown enamel tube with a brass cap each end and a dark empty inner channel. Canvas 1536x1024 (3:2). ONE strip of ratio 11:1, centered, exactly 95 percent of the canvas width (about 1460 px) so it is about 133 px tall, touching both ends of that width, flat magenta above and below. Same tube material, rivets and cap size as the XP and loading frames. Flat magenta #FF00FF background.
```

**R03.2 `bar_xp_frame`** (REJECT, critic score 3) - single | canvas 1536x1024 | key magenta | slice `strip` | 70 words
- Raw file: `omm_ui_bar_xp_frame_v01.png`  Outputs: `bar_xp_frame_v2`
- Attach: A3-button; A10-ui; the failed original attached as "what went wrong" only
- Critic said: Cold chrome tube, off palette, 5% saturation, completely unlike the brass set.
- Slicing: Stretchable strip: no padding, keep ratio, store end-cap widths for 3-slice (bars: fill is cropped by code), gate G6.

```
XP bar frame, same brass-and-enamel tube as the HP frame (no chrome), thinner, empty dark channel. Canvas 1536x1024 (3:2). ONE strip of ratio 10:1, centered, exactly 95 percent of the canvas width (about 1460 px) so it is about 146 px tall, touching both ends of that width, flat magenta above and below. Same tube material, rivets and cap size as the HP and loading frames. Flat magenta #FF00FF background.
```

**R03.3 `bar_loading_frame`** (REDO, critic score 5) - single | canvas 1536x1024 | key magenta | slice `strip` | 57 words
- Raw file: `omm_ui_bar_loading_frame_v01.png`  Outputs: `bar_loading_frame_v2`
- Attach: A3-button; A10-ui; the failed original attached as "what went wrong" only
- Critic said: Riveted brass box, a third frame material; inner window is blank white.
- Slicing: Stretchable strip: no padding, keep ratio, store end-cap widths for 3-slice (bars: fill is cropped by code), gate G6.

```
Loading bar frame, same brass tube material and rivets, empty dark channel (flat charcoal, not white). Canvas 1536x1024 (3:2). ONE strip of ratio 8:1, centered, exactly 95 percent of the canvas width (about 1460 px) so it is about 182 px tall, touching both ends of that width, flat magenta above and below. Flat magenta #FF00FF background.
```

**R03.4 `bar_fill_green`** (REDO, critic score 4) - single | canvas 1536x1024 | key magenta | slice `strip` | 74 words
- Raw file: `omm_ui_bar_fill_green_v01.png`  Outputs: `bar_fill_green_v2`
- Attach: A3-button; A10-ui; the failed original attached as "what went wrong" only
- Critic said: Fill has brass end caps and is 30% of its canvas, so it cannot be cropped to a percentage.
- Slicing: Stretchable strip: no padding, keep ratio, store end-cap widths for 3-slice (bars: fill is cropped by code), gate G6.

```
Bar fill strip in emerald #27B957 with a pale gloss line on top. Canvas 1536x1024 (3:2). ONE strip of ratio 14:1, centered, exactly 95 percent of the canvas width (about 1460 px) so it is about 104 px tall, touching both ends of that width, flat magenta above and below. Plain rectangle with a rounded left end only; the right end is square and uncapped so code can crop it. Flat magenta #FF00FF background.
```

**R03.5 `bar_fill_yellow`** (REDO, critic score 4) - single | canvas 1536x1024 | key magenta | slice `strip` | 66 words
- Raw file: `omm_ui_bar_fill_yellow_v01.png`  Outputs: `bar_fill_yellow_v2`
- Attach: A3-button; A10-ui; the failed original attached as "what went wrong" only
- Critic said: Same: end caps, tiny.
- Slicing: Stretchable strip: no padding, keep ratio, store end-cap widths for 3-slice (bars: fill is cropped by code), gate G6.

```
Bar fill strip in warm gold #F3B62F with a pale gloss line on top. Canvas 1536x1024 (3:2). ONE strip of ratio 14:1, centered, exactly 95 percent of the canvas width (about 1460 px) so it is about 104 px tall, touching both ends of that width, flat magenta above and below. Rounded left end only; the right end is square and uncapped. Flat magenta #FF00FF background.
```

**R03.6 `bar_fill_red`** (REDO, critic score 4) - single | canvas 1536x1024 | key magenta | slice `strip` | 65 words
- Raw file: `omm_ui_bar_fill_red_v01.png`  Outputs: `bar_fill_red_v2`
- Attach: A3-button; A10-ui; the failed original attached as "what went wrong" only
- Critic said: Same: end caps, tiny, heavy dark outline.
- Slicing: Stretchable strip: no padding, keep ratio, store end-cap widths for 3-slice (bars: fill is cropped by code), gate G6.

```
Bar fill strip in vermilion #E9422B, thin outline only on top and bottom. Canvas 1536x1024 (3:2). ONE strip of ratio 14:1, centered, exactly 95 percent of the canvas width (about 1460 px) so it is about 104 px tall, touching both ends of that width, flat magenta above and below. Rounded left end only; the right end is square and uncapped. Flat magenta #FF00FF background.
```

### R04 UI kit (6 prompts)

**R04.1 `ui_slider_track`** (REJECT, critic score 3) - single | canvas 1536x1024 | key magenta | slice `strip` | 55 words
- Raw file: `omm_ui_ui_slider_track_v01.png`  Outputs: `ui_slider_track_v2`
- Attach: A3-button; A10-ui; the failed original attached as "what went wrong" only
- Critic said: An 80 px sliver, 22% of the canvas, too thin to see at 70 px.
- Slicing: Stretchable strip: no padding, keep ratio, store end-cap widths for 3-slice (bars: fill is cropped by code), gate G6.

```
Slider track, brass groove. Canvas 1536x1024 (3:2). ONE strip of ratio 12:1, centered, exactly 95 percent of the canvas width (about 1460 px) so it is about 122 px tall, touching both ends of that width, flat magenta above and below. Dark inset channel, brass lip, same end caps both sides. Flat magenta #FF00FF background.
```

**R04.2 `ui_slider_knob`** (REDO, critic score 6) - single | canvas 1024x1024 | key magenta | slice `icon` | 28 words
- Raw file: `omm_ui_ui_slider_knob_v01.png`  Outputs: `ui_slider_knob_v2`
- Attach: A3-button; A10-ui; the failed original attached as "what went wrong" only
- Critic said: Faint white fringe around the black outline on transparent edges.
- Slicing: Icon or object: key, despill, 1 px erode, trim to bbox, pad 8%, square export 256 px. Try the EDIT template on the original first (small local defect); regenerate fresh if the edit fails. Try the EDIT template first.

```
Round slider knob, brass with a cream face, chunky. Clean outline, no outer glow. Canvas 1024x1024 square. Knob fills 80 percent of the canvas. Flat magenta #FF00FF background.
```

**R04.3 `ui_tab_active`** (REDO, critic score 6) - single | canvas 1536x1024 | key magenta | slice `icon` | 25 words
- Raw file: `omm_ui_ui_tab_active_v01.png`  Outputs: `ui_tab_active_v2`
- Attach: A3-button; A10-ui; the failed original attached as "what went wrong" only
- Critic said: Yellow on gold again and a white edge fringe.
- Slicing: Icon or object: key, despill, 1 px erode, trim to bbox, pad 8%, square export 256 px.

```
Active tab, front-facing rounded tab shape. Canvas 1536x1024. Tab 3:2 fills 90 percent of the canvas, empty centre for an icon. Flat magenta #FF00FF background.
```

**R04.4 `ui_tab_inactive`** (REDO, critic score 6) - single | canvas 1536x1024 | key magenta | slice `icon` | 31 words
- Raw file: `omm_ui_ui_tab_inactive_v01.png`  Outputs: `ui_tab_inactive_v2`
- Attach: A3-button; A10-ui; the failed original attached as "what went wrong" only
- Critic said: Flat dead brown with low contrast to any wood background; white edge fringe.
- Slicing: Icon or object: key, despill, 1 px erode, trim to bbox, pad 8%, square export 256 px.

```
Inactive tab, front-facing rounded tab shape, lighter than the dark UI, readable on dark wood. Canvas 1536x1024. Tab 3:2, same size as the active tab, empty centre. Flat magenta #FF00FF background.
```

**R04.5 `btn_grey`** (REDO, critic score 5) - single | canvas 1536x1024 | key magenta | slice `icon` | 20 words
- Raw file: `omm_ui_btn_grey_v01.png`  Outputs: `btn_grey_v2`
- Attach: A3-button; A10-ui; the failed original attached as "what went wrong" only
- Critic said: Dull flat grey, reads as disabled but is lifeless, and its rim is darker than the others.
- Slicing: Icon or object: key, despill, 1 px erode, trim to bbox, pad 8%, square export 256 px.

```
Disabled pill button, empty center. Canvas 1536x1024. Pill 3.2:1 fills 90 percent of the canvas width. Flat magenta #FF00FF background.
```

**R04.6 `btn_yellow`** (REDO, critic score 6) - single | canvas 1536x1024 | key magenta | slice `icon` | 21 words
- Raw file: `omm_ui_btn_yellow_v01.png`  Outputs: `btn_yellow_v2`
- Attach: A3-button; A10-ui; the failed original attached as "what went wrong" only
- Critic said: Yellow face on a gold rim: no separation, the button melts into its border.
- Slicing: Icon or object: key, despill, 1 px erode, trim to bbox, pad 8%, square export 256 px.

```
Primary yellow pill button, empty center. Canvas 1536x1024. Pill 3.2:1 fills 90 percent of the canvas width. Flat magenta #FF00FF background.
```

### R05 UI kit (6 prompts)

**R05.1 `ui_nav_bar`** (REDO, critic score 5) - single | canvas 1536x1024 | key magenta | slice `strip` | 46 words
- Raw file: `omm_ui_ui_nav_bar_v01.png`  Outputs: `ui_nav_bar_v2`
- Attach: A3-button; A10-ui; the failed original attached as "what went wrong" only
- Critic said: A short wooden plank, not a full-width bar; cannot hold five tabs.
- Slicing: Stretchable strip: no padding, keep ratio, store end-cap widths for 3-slice (bars: fill is cropped by code), gate G6.

```
Bottom navigation bar, wooden bar. Canvas 1536x1024 (3:2). ONE strip of ratio 7:1, centered, exactly 95 percent of the canvas width (about 1460 px) so it is about 209 px tall, touching both ends of that width, flat magenta above and below. Flat magenta #FF00FF background.
```

**R05.2 `ui_daily_strip`** (REDO, critic score 6) - single | canvas 1536x1024 | key magenta | slice `strip` | 46 words
- Raw file: `omm_ui_ui_daily_strip_v01.png`  Outputs: `ui_daily_strip_v2`
- Attach: A3-button; A10-ui; the failed original attached as "what went wrong" only
- Critic said: Blank flat brass plaque with no depth or inset, far plainer than its siblings.
- Slicing: Stretchable strip: no padding, keep ratio, store end-cap widths for 3-slice (bars: fill is cropped by code), gate G6.

```
Daily reward strip plaque, cream. Canvas 1536x1024 (3:2). ONE strip of ratio 5.6:1, centered, exactly 95 percent of the canvas width (about 1460 px) so it is about 261 px tall, touching both ends of that width, flat magenta above and below. Flat magenta #FF00FF background.
```

**R05.3 `ui_event_card`** (REJECT, critic score 3) - single | canvas 1536x1024 | key magenta | slice `nine` | 32 words
- Raw file: `omm_ui_ui_event_card_v01.png`  Outputs: `ui_event_card_v2`
- Attach: A3-button; A10-ui; the failed original attached as "what went wrong" only
- Critic said: Came back as a tiny portrait frame in a 1280x400 canvas (21% fill); wrong aspect.
- Slicing: Stretchable panel: key only the corner gaps, no padding, keep aspect, measure and store 9-slice insets, gate G6.

```
Event card, wide landscape. Canvas 1536x1024. Card ratio 3.2:1 fills 95 percent of the canvas width (about 1460 x 456 px), flat cream enamel centre, thick brass border. Flat magenta #FF00FF background.
```

**R05.4 `ui_pips`** (REDO, critic score 6) - sheet 5x2 | canvas 1536x1024 | key magenta | slice `sheet` | 37 words
- Raw file: `omm_ui_ui_pips_v01.png`  Outputs: `ui_pips_v2`
- Attach: A3-button; A10-ui; the failed original attached as "what went wrong" only
- Critic said: Five identical empty rings with no filled state.
- Slicing: Sheet 5x2: segment by connected components (never fixed lines), expect 1 objects (9 empty cells), row-major, key, despill, trim, pad 8%, square export.

```
Progress pip pair. Canvas 1536x1024. Two rows on one canvas, each row has five pips of equal size and even spacing; row 1 empty, row 2 filled. Grid 5x2, equal cells, wide gutters. Flat magenta #FF00FF background.
```

**R05.5 `logo_main`** (REDO, critic score 6) - single | canvas 1536x1024 | key magenta | slice `icon` | 37 words
- Raw file: `omm_ui_logo_main_v01.png`  Outputs: `logo_main_v2`
- Attach: A3-button; A10-ui; the failed original attached as "what went wrong" only
- Critic said: Words run together with no gaps and MORE is gold on a gold gear, so it blurs at small sizes.
- Covers registry: logo
- Slicing: Icon or object: key, despill, 1 px erode, trim to bbox, pad 8%, square export 256 px. The logo is the only asset allowed to carry letters.

```
Game logo of three separate words in a stack: ONE, MORE, MERGE, with a gear disc behind MORE. Canvas 1536x1024. Fat 3D enamel letters; this is the only asset allowed to contain letters. Flat magenta #FF00FF background.
```

**R05.6 `home_hero_bg`** (REDO, critic score 6) - single | canvas 1024x1536 | key none | slice `bg` | 40 words
- Raw file: `omm_ui_home_hero_bg_v01.png`  Outputs: `home_hero_bg_v2`
- Attach: A3-button; A10-ui; the failed original attached as "what went wrong" only
- Critic said: Board plate is the same warm gold as the brass units, so units will not pop; edges are busy.
- Covers registry: hero_bg
- Slicing: Background: no key, resize cover to 1080x1920, WebP q85, tile check G11 where tileable.

```
Portrait home backdrop: dark slate-navy workbench plate in the centre with a soft warm spotlight; shelves and tools at the borders. Canvas 1024x1536 (2:3), full-bleed, no key. Centre 40 percent calm, no characters, no UI. Full-bleed image, no key color.
```

### R06 FX sprites + Icons + Screw yard (6 prompts)

**R06.1 `vfx_row_surge`** (REJECT, critic score 3) - single | canvas 1536x1024 | key black | slice `fx` | 32 words
- Raw file: `omm_fx_vfx_row_surge_v01.png`  Outputs: `vfx_row_surge_v2`
- Attach: A6-fx; the failed original attached as "what went wrong" only
- Critic said: A small bullet-shaped streak, nowhere near a row-wide beam.
- Slicing: Additive FX: luminance to alpha, no pad beyond 10%, corners must be black (G10), export 256 px (512 for rings and glows).

```
Row-wide energy beam sprite, white-hot core with orange edge. Canvas 1536x1024. Beam ratio 6:1 spanning 95 percent of the width, soft round ends, white shapes on pure black. Pure black #000000 background.
```

**R06.2 `vfx_fuse_spark`** (REDO, critic score 5) - single | canvas 1024x1024 | key black | slice `fx` | 35 words
- Raw file: `omm_fx_vfx_fuse_spark_v01.png`  Outputs: `vfx_fuse_spark_v2`
- Attach: A6-fx; the failed original attached as "what went wrong" only
- Critic said: Sliver from the neighbouring cell at the left edge.
- Slicing: Additive FX: luminance to alpha, no pad beyond 10%, corners must be black (G10), export 256 px (512 for rings and glows). Try the EDIT template on the original first (small local defect); regenerate fresh if the edit fails. Try the EDIT template first.

```
Single fuse spark burst, six-point star. One effect only, centred, with 10% empty margin on every side. Canvas 1024x1024 square. Centered, 10 percent empty margin, white and yellow on pure black. Pure black #000000 background.
```

**R06.3 `vfx_shock_ring`** (REDO, critic score 5) - single | canvas 1024x1024 | key black | slice `fx` | 40 words
- Raw file: `omm_fx_vfx_shock_ring_v01.png`  Outputs: `vfx_shock_ring_v2`
- Attach: A6-fx; the failed original attached as "what went wrong" only
- Critic said: Ring is clipped by the cell edge on the right and has a perspective tilt.
- Slicing: Additive FX: luminance to alpha, no pad beyond 10%, corners must be black (G10), export 256 px (512 for rings and glows). Try the EDIT template on the original first (small local defect); regenerate fresh if the edit fails. Try the EDIT template first.

```
Flat shock ring seen front-on. A flat top-down shock ring fully inside the cell with 10% margin. Canvas 1024x1024 square. Ring fits entirely inside with a 10 percent margin; white on pure black; no perspective tilt. Pure black #000000 background.
```

**R06.4 `tool_row_surge_icon`** (REDO, critic score 5) - single | canvas 1024x1024 | key magenta | slice `icon` | 33 words
- Raw file: `omm_icons_tool_row_surge_icon_v01.png`  Outputs: `tool_row_surge_icon_v2`
- Attach: A4-icon; the failed original attached as "what went wrong" only
- Critic said: Red and blue circular arrows read as refresh or sync, not a row blast.
- Slicing: Icon or object: key, despill, 1 px erode, trim to bbox, pad 8%, square export 256 px.

```
Power-up icon on a red porthole base. Canvas 1024x1024 square. Five cells in a row with one bold arrow through them and an orange glow; at most three shapes. Flat magenta #FF00FF background.
```

**R06.5 `tool_combo_icon`** (REDO, critic score 6) - single | canvas 1024x1024 | key magenta | slice `icon` | 27 words
- Raw file: `omm_icons_tool_combo_icon_v01.png`  Outputs: `tool_combo_icon_v2`
- Attach: A4-icon; the failed original attached as "what went wrong" only
- Critic said: Bomb, two arrows and a spark: too busy, unreadable at 70 px.
- Slicing: Icon or object: key, despill, 1 px erode, trim to bbox, pad 8%, square export 256 px.

```
Combo power-up icon on a brass porthole base. Canvas 1024x1024 square. Two meshing gears and one bold lightning bolt; at most three shapes. Flat magenta #FF00FF background.
```

**R06.6 `sy2_plank_long`** (REJECT, critic score 3) - single | canvas 1536x1024 | key magenta | slice `strip` | 66 words
- Raw file: `omm_yard_sy2_plank_long_v01.png`  Outputs: `sy2_plank_long_v2`
- Attach: A1-style; A4-icon; the failed original attached as "what went wrong" only
- Critic said: Short, diagonal and tiny, not a long 4:1 plank.
- Slicing: Stretchable strip: no padding, keep ratio, store end-cap widths for 3-slice (bars: fill is cropped by code), gate G6.

```
Toy-style wooden plank for the screw yard, warm oak, rounded corners, two brass screw holes. Canvas 1536x1024 (3:2). ONE strip of ratio 4:1, centered, exactly 95 percent of the canvas width (about 1460 px) so it is about 365 px tall, touching both ends of that width, flat magenta above and below. Lies flat, seen slightly from above, thick dark brown outline. Flat magenta #FF00FF background.
```

### R07 Screw yard + Icons (6 prompts)

**R07.1 `sy2_plate_long`** (REJECT, critic score 3) - single | canvas 1536x1024 | key magenta | slice `strip` | 60 words
- Raw file: `omm_yard_sy2_plate_long_v01.png`  Outputs: `sy2_plate_long_v2`
- Attach: A1-style; A4-icon; the failed original attached as "what went wrong" only
- Critic said: Short diagonal metal sliver, nowhere near 4:1.
- Covers registry: sy_plate_long
- Slicing: Stretchable strip: no padding, keep ratio, store end-cap widths for 3-slice (bars: fill is cropped by code), gate G6.

```
Toy-style brass-and-cream metal plate for the screw yard, four rivets, rounded corners. Canvas 1536x1024 (3:2). ONE strip of ratio 4:1, centered, exactly 95 percent of the canvas width (about 1460 px) so it is about 365 px tall, touching both ends of that width, flat magenta above and below. Lies flat, thick outline, no raw grey. Flat magenta #FF00FF background.
```

**R07.2 `icon_bolt`** (REDO, critic score 5) - single | canvas 1024x1024 | key magenta | slice `icon` | 20 words
- Raw file: `omm_icons_icon_bolt_v01.png`  Outputs: `icon_bolt_v2`
- Attach: A4-icon; the failed original attached as "what went wrong" only
- Critic said: Hardware bolt and nut, not the lightning bolt the game uses for this currency; outline is thinner pure black.
- Covers registry: icon_bolt
- Slicing: Icon or object: key, despill, 1 px erode, trim to bbox, pad 8%, square export 256 px.

```
Currency icon: lightning bolt. Canvas 1024x1024 square. Bolt fills 80 percent, same outline weight as icon_coin. Flat magenta #FF00FF background.
```

**R07.3 `icon_key`** (REDO, critic score 6) - single | canvas 1024x1024 | key magenta | slice `icon` | 39 words
- Raw file: `omm_icons_icon_key_v01.png`  Outputs: `icon_key_v2`
- Attach: A4-icon; the failed original attached as "what went wrong" only
- Critic said: Stray brass speck floats to the right of the key.
- Slicing: Icon or object: key, despill, 1 px erode, trim to bbox, pad 8%, square export 256 px. Try the EDIT template on the original first (small local defect); regenerate fresh if the edit fails. Try the EDIT template first.

```
Currency icon: single toy key, brass bow with a cream rim. Single object only, nothing else in the cell; remove any detached fragments. Canvas 1024x1024 square. Key at a 45 degree angle, fills 80 percent. Flat magenta #FF00FF background.
```

**R07.4 `icon_cap`** (REDO, critic score 6) - single | canvas 1024x1024 | key magenta | slice `icon` | 22 words
- Raw file: `omm_icons_icon_cap_v01.png`  Outputs: `icon_cap_v2`
- Attach: A4-icon; the failed original attached as "what went wrong" only
- Critic said: Hourglass on a gear inside a porthole: three ideas in one icon, hourglass lost at 70 px.
- Slicing: Icon or object: key, despill, 1 px erode, trim to bbox, pad 8%, square export 256 px.

```
Status icon: a cap marker, bold brass cap with a downward arrow. Canvas 1024x1024 square. Fills 80 percent. Flat magenta #FF00FF background.
```

**R07.5 `icon_lock`** (REDO, critic score 6) - single | canvas 1024x1024 | key magenta | slice `icon` | 40 words
- Raw file: `omm_icons_icon_lock_v01.png`  Outputs: `icon_lock_v2`
- Attach: A4-icon; the failed original attached as "what went wrong" only
- Critic said: Solid white left inside the shackle: leftover white background.
- Slicing: Icon or object: key, despill, 1 px erode, trim to bbox, pad 8%, square export 256 px. Try the EDIT template on the original first (small local defect); regenerate fresh if the edit fails. Try the EDIT template first.

```
Status icon: padlock, brass body, red enamel shackle. Any hole inside the object (shackle, gear centre) must stay flat magenta, never white. Canvas 1024x1024 square. Fills 80 percent; the gap inside the shackle is flat magenta. Flat magenta #FF00FF background.
```

**R07.6 `icon_loading_gear`** (REDO, critic score 6) - single | canvas 1024x1024 | key magenta | slice `icon` | 40 words
- Raw file: `omm_icons_icon_loading_gear_v01.png`  Outputs: `icon_loading_gear_v2`
- Attach: A4-icon; the failed original attached as "what went wrong" only
- Critic said: Centre hole is solid white (leftover background).
- Slicing: Icon or object: key, despill, 1 px erode, trim to bbox, pad 8%, square export 256 px. Try the EDIT template on the original first (small local defect); regenerate fresh if the edit fails. Try the EDIT template first.

```
System icon: single brass gear with a round center hole. Any hole inside the object (shackle, gear centre) must stay flat magenta, never white. Canvas 1024x1024 square. Fills 85 percent; the center hole is flat magenta. Flat magenta #FF00FF background.
```

### R08 Icons (6 prompts)

**R08.1 `icon_restart`** (REDO, critic score 6) - single | canvas 1024x1024 | key magenta | slice `icon` | 21 words
- Raw file: `omm_icons_icon_restart_v01.png`  Outputs: `icon_restart_v2`
- Attach: A4-icon; the failed original attached as "what went wrong" only
- Critic said: Arrow head is clumsy and the fat tail reads as a letter C.
- Slicing: Icon or object: key, despill, 1 px erode, trim to bbox, pad 8%, square export 256 px.

```
System icon: circular restart arrow, green enamel on a brass porthole. Canvas 1024x1024 square. Fills 80 percent. Flat magenta #FF00FF background.
```

**R08.2 `icon_nav_machine`** (REDO, critic score 5) - single | canvas 1024x1024 | key magenta | slice `icon` | 20 words
- Raw file: `omm_icons_icon_nav_machine_v01.png`  Outputs: `icon_nav_machine_v2`
- Attach: A4-icon; the failed original attached as "what went wrong" only
- Critic said: Navy cannon on a wooden carriage is off-palette against the game red-cream-brass cannons.
- Slicing: Icon or object: key, despill, 1 px erode, trim to bbox, pad 8%, square export 256 px.

```
Navigation icon: toy cannon. Canvas 1024x1024 square. Fills 80 percent, 3/4 view like the in-game cannon_1. Flat magenta #FF00FF background.
```

**R08.3 `icon_nav_road`** (REDO, critic score 6) - single | canvas 1024x1024 | key magenta | slice `icon` | 27 words
- Raw file: `omm_icons_icon_nav_road_v01.png`  Outputs: `icon_nav_road_v2`
- Attach: A4-icon; the failed original attached as "what went wrong" only
- Critic said: Dull grey road, low saturation, thin flag; weak at 70 px.
- Slicing: Icon or object: key, despill, 1 px erode, trim to bbox, pad 8%, square export 256 px.

```
Navigation icon: winding road. Canvas 1024x1024 square. Fills 80 percent; road is warm cream, bright red-orange center stripe, red flag at the end. Flat magenta #FF00FF background.
```

**R08.4 `role_shooter`** (REDO, critic score 6) - single | canvas 1024x1024 | key magenta | slice `icon` | 27 words
- Raw file: `omm_icons_role_shooter_v01.png`  Outputs: `role_shooter_v2`
- Attach: A4-icon; the failed original attached as "what went wrong" only
- Critic said: A crosshair, monochrome; says target not shooter.
- Covers registry: role_shooter
- Slicing: Icon or object: key, despill, 1 px erode, trim to bbox, pad 8%, square export 256 px.

```
Role icon SHOOTER on a brass porthole base, warm orange-red #E9422B, glyph: bold bullet and muzzle flash. Canvas 1024x1024 square. Fills 80 percent. Flat magenta #FF00FF background.
```

**R08.5 `role_relay`** (REDO, critic score 6) - single | canvas 1024x1024 | key magenta | slice `icon` | 27 words
- Raw file: `omm_icons_role_relay_v01.png`  Outputs: `role_relay_v2`
- Attach: A4-icon; the failed original attached as "what went wrong" only
- Critic said: Two beads on a bar, monochrome, reads as a dumbbell.
- Covers registry: role_relay
- Slicing: Icon or object: key, despill, 1 px erode, trim to bbox, pad 8%, square export 256 px.

```
Role icon RELAY on a brass porthole base, cyan #35CDEB, glyph: three linked nodes in a line. Canvas 1024x1024 square. Fills 80 percent. Flat magenta #FF00FF background.
```

**R08.6 `role_support`** (REDO, critic score 6) - single | canvas 1024x1024 | key magenta | slice `icon` | 30 words
- Raw file: `omm_icons_role_support_v01.png`  Outputs: `role_support_v2`
- Attach: A4-icon; the failed original attached as "what went wrong" only
- Critic said: A plus sign, monochrome, reads as health.
- Covers registry: role_support
- Slicing: Icon or object: key, despill, 1 px erode, trim to bbox, pad 8%, square export 256 px.

```
Role icon SUPPORT on a brass porthole base, emerald #27B957, glyph: ring with an up chevron (not a plus sign). Canvas 1024x1024 square. Fills 80 percent. Flat magenta #FF00FF background.
```

### R09 Icons + FX sprites (6 prompts)

**R09.1 `role_mover`** (REDO, critic score 6) - single | canvas 1024x1024 | key magenta | slice `icon` | 25 words
- Raw file: `omm_icons_role_mover_v01.png`  Outputs: `role_mover_v2`
- Attach: A4-icon; the failed original attached as "what went wrong" only
- Critic said: Monochrome cream and brass; role is not colour coded, unlike the game role icons.
- Covers registry: role_mover
- Slicing: Icon or object: key, despill, 1 px erode, trim to bbox, pad 8%, square export 256 px.

```
Role icon MOVER on a brass porthole base, violet #9343CB, glyph: two bold arrows swapping. Canvas 1024x1024 square. Fills 80 percent. Flat magenta #FF00FF background.
```

**R09.2 `crate_glow_common`** (REDO, critic score 5) - single | canvas 1024x1024 | key black | slice `fx` | 23 words
- Raw file: `omm_fx_crate_glow_common_v01.png`  Outputs: `crate_glow_common_v2`
- Attach: A6-fx; the failed original attached as "what went wrong" only
- Critic said: Murky grey-blue ring with a dirty halo; looks like smudge, not a glow.
- Slicing: Additive FX: luminance to alpha, no pad beyond 10%, corners must be black (G10), export 256 px (512 for rings and glows).

```
Common crate glow ring. Canvas 1024x1024 square. White-silver ring and soft halo on pure black, centered, no grey fog. Pure black #000000 background.
```

**R09.3 `fx_confetti`** (REDO, critic score 5) - sheet 3x3 | canvas 1536x1024 | key black | slice `fx` | 29 words
- Raw file: `omm_fx_fx_confetti_v01.png`  Outputs: `fx_confetti_v2`
- Attach: A6-fx; the failed original attached as "what went wrong" only
- Critic said: Baked multi-colour confetti cannot be tinted and looks like stock vector.
- Slicing: Additive FX: luminance to alpha, no pad beyond 10%, corners must be black (G10), export 256 px (512 for rings and glows).

```
Confetti set: nine shapes (ribbons, stars, squares). Canvas 1536x1024. 3x3 grid, wide gutters, white shapes only on pure black. Grid 3x3, equal cells, wide gutters. Pure black #000000 background.
```

**R09.4 `fx_rays`** (REDO, critic score 5) - single | canvas 1024x1024 | key black | slice `fx` | 27 words
- Raw file: `omm_fx_fx_rays_v01.png`  Outputs: `fx_rays_v2`
- Attach: A6-fx; the failed original attached as "what went wrong" only
- Critic said: Sparse beige spikes, weak and dull.
- Slicing: Additive FX: luminance to alpha, no pad beyond 10%, corners must be black (G10), export 256 px (512 for rings and glows).

```
Sunburst of 24 rays. Canvas 1024x1024 square. Pure white rays with soft falloff from a bright center on pure black, fills 95 percent. Pure black #000000 background.
```

**R09.5 `sy2_fx_confetti`** (REDO, critic score 5) - sheet 3x3 | canvas 1536x1024 | key black | slice `fx` | 27 words
- Raw file: `omm_fx_sy2_fx_confetti_v01.png`  Outputs: `sy2_fx_confetti_v2`
- Attach: A6-fx; the failed original attached as "what went wrong" only
- Critic said: Baked colours, cannot be tinted.
- Slicing: Additive FX: luminance to alpha, no pad beyond 10%, corners must be black (G10), export 256 px (512 for rings and glows).

```
Screw-yard confetti set, nine shapes. Canvas 1536x1024. 3x3 grid, wide gutters, white shapes only on pure black. Grid 3x3, equal cells, wide gutters. Pure black #000000 background.
```

**R09.6 `sy2_fx_dust`** (REDO, critic score 5) - sheet 3x1 | canvas 1536x1024 | key black | slice `fx` | 28 words
- Raw file: `omm_fx_sy2_fx_dust_v01.png`  Outputs: `sy2_fx_dust_v2`
- Attach: A6-fx; the failed original attached as "what went wrong" only
- Critic said: Cream and tan, not white, so it tints dirty.
- Slicing: Additive FX: luminance to alpha, no pad beyond 10%, corners must be black (G10), export 256 px (512 for rings and glows).

```
Dust puff set, three puffs in one row. Canvas 1536x1024. Three soft puffs, pure white, on pure black. Grid 3x1, equal cells, wide gutters. Pure black #000000 background.
```

### R10 Units (6 prompts)

**R10.1 `unit_blast_plate`** (REDO, critic score 6) - single | canvas 1024x1024 | key magenta | slice `unit` | 39 words
- Raw file: `omm_units_unit_blast_plate_v01.png`  Outputs: `unit_blast_plate_v2`
- Attach: A2-unit-camera; identity: the failed original; the failed original attached as "what went wrong" only
- Critic said: Grey plate, only 30% saturation, nothing to read at 70 px.
- Slicing: Machine: key, despill, trim, pad 10%, square 256 px, plate at most 115% of body, dull-metal gate G8.

```
Blast Plate machine, support unit, on a cream plate. Brass-framed red-orange plate with a bold blast mark and glow; add one strong colour. Canvas 1024x1024 square. Fills 80 percent; match unit_piston for outline and camera. Flat magenta #FF00FF background.
```

**R10.2 `unit_ladder`** (REDO, critic score 6) - single | canvas 1024x1024 | key magenta | slice `unit` | 31 words
- Raw file: `omm_units_unit_ladder_v01.png`  Outputs: `unit_ladder_v2`
- Attach: A2-unit-camera; identity: the failed original; the failed original attached as "what went wrong" only
- Critic said: Baked numbers 1-4 on the steps; text artefacts and invisible at 70 px.
- Slicing: Machine: key, despill, trim, pad 10%, square 256 px, plate at most 115% of body, dull-metal gate G8.

```
Ladder machine, relay, on a cream plate, brown-gold ladder. Draw the ladder with plain blank steps and no text or numbers. Canvas 1024x1024 square. Fills 80 percent. Flat magenta #FF00FF background.
```

**R10.3 `unit_tesla_tower`** (REDO, critic score 6) - single | canvas 1024x1024 | key magenta | slice `unit` | 42 words
- Raw file: `omm_units_unit_tesla_tower_v01.png`  Outputs: `unit_tesla_tower_v2`
- Attach: A2-unit-camera; identity: the failed original; the failed original attached as "what went wrong" only
- Critic said: Near-duplicate of the spring plus lightning wings; wings have a white edge fringe.
- Slicing: Machine: key, despill, trim, pad 10%, square 256 px, plate at most 115% of body, dull-metal gate G8.

```
Tesla Tower machine, legendary shooter, on a cream plate. A tall red tower with a brass sphere top and three cyan arcs, clearly not a spring; clean outline. Canvas 1024x1024 square. Fills 80 percent; must not resemble unit_spring. Flat magenta #FF00FF background.
```

**R10.4 `unit_dynamo`** (REDO, critic score 6) - single | canvas 1024x1024 | key green | slice `unit` | 58 words
- Raw file: `omm_units_unit_dynamo_v01.png`  Outputs: `unit_dynamo_v2`
- Attach: A2-unit-camera; identity: the failed original; the failed original attached as "what went wrong" only
- Critic said: Glowing copper wheel is busy and rendered, not cartoon; thin outlines.
- Slicing: Machine: key, despill, trim, pad 10%, square 256 px, plate at most 115% of body, dull-metal gate G8.

```
Dynamo machine, legendary relay, on a cream plate; use the green key because the accent is magenta. Match the attached part-1 art: same chunky red-and-orange feet on a cream plinth, thick navy outline, cartoon enamel shading, no photoreal rendering. Reduce the wheel to a big bold orange disc. Canvas 1024x1024 square. Fills 80 percent. Flat green #00FF00 background.
```

**R10.5 `unit_lathe`** (REDO, critic score 5) - single | canvas 1024x1024 | key magenta | slice `unit` | 54 words
- Raw file: `omm_units_unit_lathe_v01.png`  Outputs: `unit_lathe_v2`
- Attach: A2-unit-camera; identity: the failed original; the failed original attached as "what went wrong" only
- Critic said: Low and wide with tiny details; mush at 70 px and a thinner plinth.
- Slicing: Machine: key, despill, trim, pad 10%, square 256 px, plate at most 115% of body, dull-metal gate G8.

```
Lathe machine, epic shooter, on a cream plate. Match the attached part-1 art: same chunky red-and-orange feet on a cream plinth, thick navy outline, cartoon enamel shading, no photoreal rendering. Make it tall with a big bold chuck and one handwheel. Canvas 1024x1024 square. Fills 80 percent, taller than wide. Flat magenta #FF00FF background.
```

**R10.6 `unit_rivet_gun`** (REDO, critic score 6) - single | canvas 1024x1024 | key magenta | slice `unit` | 59 words
- Raw file: `omm_units_unit_rivet_gun_v01.png`  Outputs: `unit_rivet_gun_v2`
- Attach: A2-unit-camera; identity: the failed original; the failed original attached as "what went wrong" only
- Critic said: Reads as a real cordless drill in yellow and black, plus near-duplicate of the nail gun and the yard drill.
- Slicing: Machine: key, despill, trim, pad 10%, square 256 px, plate at most 115% of body, dull-metal gate G8.

```
Rivet Gun machine, common shooter, on a cream plate. Match the attached part-1 art: same chunky red-and-orange feet on a cream plinth, thick navy outline, cartoon enamel shading, no photoreal rendering. Make it a chunky toy gun in red and brass. Canvas 1024x1024 square. Fills 80 percent; must not resemble nail_gun or any cordless drill. Flat magenta #FF00FF background.
```

### R11 Units + Crates + Screw yard (6 prompts)

**R11.1 `unit_vice`** (REDO, critic score 6) - single | canvas 1024x1024 | key magenta | slice `unit` | 48 words
- Raw file: `omm_units_unit_vice_v01.png`  Outputs: `unit_vice_v2`
- Attach: A2-unit-camera; identity: the failed original; the failed original attached as "what went wrong" only
- Critic said: Grey-blue steel at 32% saturation and photoreal; the dullest unit in the set.
- Slicing: Machine: key, despill, trim, pad 10%, square 256 px, plate at most 115% of body, dull-metal gate G8.

```
Vice machine, common relay, on a cream plate. Match the attached part-1 art: same chunky red-and-orange feet on a cream plinth, thick navy outline, cartoon enamel shading, no photoreal rendering. Paint it in bold red and brass enamel. Canvas 1024x1024 square. Fills 80 percent. Flat magenta #FF00FF background.
```

**R11.2 `unit_wrecking_ball`** (REDO, critic score 6) - single | canvas 1024x1024 | key magenta | slice `unit` | 53 words
- Raw file: `omm_units_unit_wrecking_ball_v01.png`  Outputs: `unit_wrecking_ball_v2`
- Attach: A2-unit-camera; identity: the failed original; the failed original attached as "what went wrong" only
- Critic said: Dull grey ball and a base that does not match the others.
- Slicing: Machine: key, despill, trim, pad 10%, square 256 px, plate at most 115% of body, dull-metal gate G8.

```
Wrecking Ball machine, epic shooter, on a cream plate. Match the attached part-1 art: same chunky red-and-orange feet on a cream plinth, thick navy outline, cartoon enamel shading, no photoreal rendering. Make the ball glossy dark navy with a bold orange rust highlight. Canvas 1024x1024 square. Fills 80 percent. Flat magenta #FF00FF background.
```

**R11.3 `crate_golden_workbench`** (REDO, critic score 6) - single | canvas 1024x1024 | key magenta | slice `icon` | 43 words
- Raw file: `omm_crates_crate_golden_workbench_v01.png`  Outputs: `crate_golden_workbench_v2`
- Attach: A1-style; A4-icon; the failed original attached as "what went wrong" only
- Critic said: Sparkles touch and are clipped by the cell edge.
- Slicing: Icon or object: key, despill, 1 px erode, trim to bbox, pad 8%, square export 256 px. Try the EDIT template on the original first (small local defect); regenerate fresh if the edit fails. Try the EDIT template first.

```
Golden workbench crate, legendary tier, gold and cream (not gold on gold), with three small sparkles. Keep sparkles inside the canvas with a 6% margin. Canvas 1024x1024 square. Fills 70 percent; sparkles stay 6 percent inside the canvas edge. Flat magenta #FF00FF background.
```

**R11.4 `sy2_box_closed_blue`** (REDO, critic score 6) - single | canvas 1024x1024 | key magenta | slice `icon` | 32 words
- Raw file: `omm_yard_sy2_box_closed_blue_v01.png`  Outputs: `sy2_box_closed_blue_v2`
- Attach: A1-style; A4-icon; the failed original attached as "what went wrong" only
- Critic said: A small red-brown mark at the left edge.
- Slicing: Icon or object: key, despill, 1 px erode, trim to bbox, pad 8%, square export 256 px. Try the EDIT template on the original first (small local defect); regenerate fresh if the edit fails. Try the EDIT template first.

```
Cream capsule box with a blue band, closed. Single object only, no marks; keep a 10% empty margin. Canvas 1024x1024 square. Single object, 10 percent margin, no marks. Flat magenta #FF00FF background.
```

**R11.5 `sy2_box_green`** (REDO, critic score 6) - single | canvas 1024x1024 | key magenta | slice `icon` | 23 words
- Raw file: `omm_yard_sy2_box_green_v01.png`  Outputs: `sy2_box_green_v2`
- Attach: A1-style; A4-icon; the failed original attached as "what went wrong" only
- Critic said: Murky dark interior and a dull body next to the others.
- Slicing: Icon or object: key, despill, 1 px erode, trim to bbox, pad 8%, square export 256 px.

```
Toy box in bright leaf green with a visible dark inside, open top. Canvas 1024x1024 square. Fills 80 percent. Flat magenta #FF00FF background.
```

**R11.6 `sy2_box_latched_glow`** (REDO, critic score 6) - single | canvas 1024x1024 | key magenta | slice `icon` | 32 words
- Raw file: `omm_yard_sy2_box_latched_glow_v01.png`  Outputs: `sy2_box_latched_glow_v2`
- Attach: A1-style; A4-icon; the failed original attached as "what went wrong" only
- Critic said: The glow on the latch is barely different from the closed box.
- Slicing: Icon or object: key, despill, 1 px erode, trim to bbox, pad 8%, square export 256 px.

```
Closed toy box, the latch glows bright orange. Canvas 1024x1024 square. The orange halo is part of the object and extends beyond the box silhouette inside the canvas. Flat magenta #FF00FF background.
```

### R12 Screw yard (6 prompts)

**R12.1 `sy2_box_slot`** (REDO, critic score 5) - single | canvas 1024x1024 | key magenta | slice `icon` | 23 words
- Raw file: `omm_yard_sy2_box_slot_v01.png`  Outputs: `sy2_box_slot_v2`
- Attach: A1-style; A4-icon; the failed original attached as "what went wrong" only
- Critic said: Thin gold wireframe, invisible at 70 px.
- Slicing: Icon or object: key, despill, 1 px erode, trim to bbox, pad 8%, square export 256 px.

```
Empty box slot: a dark inset silhouette of a box. Canvas 1024x1024 square. Solid fill with a brass edge. Flat magenta #FF00FF background.
```

**R12.2 `sy2_drill`** (REDO, critic score 5) - single | canvas 1024x1024 | key magenta | slice `icon` | 20 words
- Raw file: `omm_yard_sy2_drill_v01.png`  Outputs: `sy2_drill_v2`
- Attach: A1-style; A4-icon; the failed original attached as "what went wrong" only
- Critic said: A photoreal yellow-and-black cordless drill that copies a real brand look.
- Slicing: Icon or object: key, despill, 1 px erode, trim to bbox, pad 8%, square export 256 px.

```
Toy power drill, brass and cream, no yellow and black. Canvas 1024x1024 square. Fills 80 percent. Flat magenta #FF00FF background.
```

**R12.3 `sy2_drill_bit`** (REDO, critic score 6) - single | canvas 1024x1024 | key magenta | slice `icon` | 20 words
- Raw file: `omm_yard_sy2_drill_bit_v01.png`  Outputs: `sy2_drill_bit_v2`
- Attach: A1-style; A4-icon; the failed original attached as "what went wrong" only
- Critic said: Grey, thin and diagonal; low saturation.
- Slicing: Icon or object: key, despill, 1 px erode, trim to bbox, pad 8%, square export 256 px.

```
Drill bit, brass handle, fat and short. Canvas 1024x1024 square. Fills 80 percent, at 45 degrees. Flat magenta #FF00FF background.
```

**R12.4 `sy2_key`** (REDO, critic score 6) - single | canvas 1024x1024 | key magenta | slice `icon` | 18 words
- Raw file: `omm_yard_sy2_key_v01.png`  Outputs: `sy2_key_v2`
- Attach: A1-style; A4-icon; the failed original attached as "what went wrong" only
- Critic said: Photoreal key, but B04 already has a toy key; the two do not match.
- Slicing: Icon or object: key, despill, 1 px erode, trim to bbox, pad 8%, square export 256 px.

```
Screw-yard key, the same toy key as icon_key. Canvas 1024x1024 square. Fills 80 percent. Flat magenta #FF00FF background.
```

**R12.5 `sy2_screwdriver`** (REDO, critic score 5) - single | canvas 1024x1024 | key magenta | slice `icon` | 21 words
- Raw file: `omm_yard_sy2_screwdriver_v01.png`  Outputs: `sy2_screwdriver_v2`
- Attach: A1-style; A4-icon; the failed original attached as "what went wrong" only
- Critic said: Thin diagonal tool, unreadable at 70 px.
- Slicing: Icon or object: key, despill, 1 px erode, trim to bbox, pad 8%, square export 256 px.

```
Chunky toy screwdriver, red enamel handle, brass shaft. Canvas 1024x1024 square. At 45 degrees, fills 80 percent. Flat magenta #FF00FF background.
```

**R12.6 `sy2_obj_base`** (REDO, critic score 6) - single | canvas 1024x1024 | key magenta | slice `icon` | 20 words
- Raw file: `omm_yard_sy2_obj_base_v01.png`  Outputs: `sy2_obj_base_v2`
- Attach: A1-style; A4-icon; the failed original attached as "what went wrong" only
- Critic said: Flat grey metal, 15% saturation, disappears on dark backgrounds.
- Slicing: Icon or object: key, despill, 1 px erode, trim to bbox, pad 8%, square export 256 px.

```
Cannon base part for the object yard, brass and cream. Canvas 1024x1024 square. Fills 80 percent. Flat magenta #FF00FF background.
```

### R13 Screw yard (5 prompts)

**R13.1 `sy2_obj_bracket`** (REDO, critic score 6) - single | canvas 1024x1024 | key magenta | slice `icon` | 16 words
- Raw file: `omm_yard_sy2_obj_bracket_v01.png`  Outputs: `sy2_obj_bracket_v2`
- Attach: A1-style; A4-icon; the failed original attached as "what went wrong" only
- Critic said: Grey steel again, dull and dark.
- Slicing: Icon or object: key, despill, 1 px erode, trim to bbox, pad 8%, square export 256 px.

```
Bracket part, brass with red enamel. Canvas 1024x1024 square. Fills 80 percent. Flat magenta #FF00FF background.
```

**R13.2 `sy2_block_metal`** (REDO, critic score 6) - single | canvas 1024x1024 | key magenta | slice `icon` | 14 words
- Raw file: `omm_yard_sy2_block_metal_v01.png`  Outputs: `sy2_block_metal_v2`
- Attach: A1-style; A4-icon; the failed original attached as "what went wrong" only
- Critic said: Flat grey steel, 7% saturation, boring next to the candy blocks.
- Slicing: Icon or object: key, despill, 1 px erode, trim to bbox, pad 8%, square export 256 px.

```
Plate block, warm brass. Canvas 1024x1024 square. Fills 80 percent. Flat magenta #FF00FF background.
```

**R13.3 `sy2_block_rusty`** (REDO, critic score 6) - single | canvas 1024x1024 | key magenta | slice `icon` | 14 words
- Raw file: `omm_yard_sy2_block_rusty_v01.png`  Outputs: `sy2_block_rusty_v2`
- Attach: A1-style; A4-icon; the failed original attached as "what went wrong" only
- Critic said: Grey and rust noise, dirty, looks like a texture not a game piece.
- Slicing: Icon or object: key, despill, 1 px erode, trim to bbox, pad 8%, square export 256 px.

```
Rusted brass plate block. Canvas 1024x1024 square. Fills 80 percent. Flat magenta #FF00FF background.
```

**R13.4 `sy2_screw_head`** (REDO, critic score 6) - single | canvas 1024x1024 | key magenta | slice `icon` | 23 words
- Raw file: `omm_yard_sy2_screw_head_v01.png`  Outputs: `sy2_screw_head_v2`
- Attach: A1-style; A4-icon; the failed original attached as "what went wrong" only
- Critic said: Colourless chrome, no outline, needs a tint.
- Slicing: Icon or object: key, despill, 1 px erode, trim to bbox, pad 8%, square export 256 px.

```
Screw head from above, enamel color. Canvas 1024x1024 square. Fills 80 percent; blue enamel head with a brass slot. Flat magenta #FF00FF background.
```

**R13.5 `sy2_screw_side`** (REDO, critic score 6) - single | canvas 1024x1024 | key magenta | slice `icon` | 27 words
- Raw file: `omm_yard_sy2_screw_side_v01.png`  Outputs: `sy2_screw_side_v2`
- Attach: A1-style; A4-icon; the failed original attached as "what went wrong" only
- Critic said: Thin 1:2 sliver, small at 70 px.
- Slicing: Icon or object: key, despill, 1 px erode, trim to bbox, pad 8%, square export 256 px.

```
Screw seen from the side, fat and short. Canvas 1024x1024. Subject is 3:4 portrait, fills 85 percent of the height; blue enamel head. Flat magenta #FF00FF background.
```

## 8. NEW assets

Order: GPT top-25 first (N01 foundation, N02 chests, victory, tile states, props, map nodes), then UI kit pieces, FX sprite sheets, the 22 code-drawn units (Common and Rare first, then Epic, then Legendary, per Art Bible section 5.2), monsters, bosses, trophies, board, icons, rewards, onboarding and mascot, offers and popups (mock only), chapter art, backgrounds, yard. Units whose first-rank single art is in the redo queue (rivet gun, vice, blast plate, ladder, wrecking ball, lathe, tesla tower, dynamo) wait for that redo to be approved: their rank sheet then uses the approved single as the identity reference.

### N01 Foundation (6 prompts)

**N01.1 `board_6x5_empty`** - single | canvas 1536x1024 | key magenta | slice `single` | 64 words
- Raw file: `omm_foundation_board_6x5_empty_v01.png`  Outputs: `board_6x5_v2`
- Attach: A1-style; A7-board
- Covers registry: slot, slot_old, tray_plate, shelf_plate, plate_remix, scrap_plate
- Slicing: Single image: key, despill, 1 px erode, trim to bbox, pad 8%, keep the aspect (square canvas only for objects and icons). GPT top-25 #1. Approve together with the hero and the UI kit at phone size before anything else.

```
Single image, canvas 1536x1024. Premium EMPTY gameplay board, exactly 6 columns by 5 rows, 30 equal cells, perfectly straight grid, fixed elevated 3/4 top-down view. Warm cream enamel tiles, slate-blue recessed seams, soft upper-left highlights, restrained brass outer corners, shallow bevel per cell. No machines, screws, text, icons or decoration inside cells. Board fills 90 percent of the canvas width. Flat magenta #FF00FF background.
```

**N01.2 `hero_cannon_home`** - single | canvas 1024x1536 | key magenta | slice `single` | 61 words
- Raw file: `omm_foundation_hero_cannon_home_v01.png`  Outputs: `hero_cannon_v2`
- Attach: A1-style; A2-unit-camera; identity: cannon_4
- Covers registry: hero_chassis, hero_socket
- Slicing: Single image: key, despill, 1 px erode, trim to bbox, pad 8%, keep the aspect (square canvas only for objects and icons). GPT top-25 #2. Keeps our approved cannon identity (GPT warns its ladders must not replace approved machines).

```
Single image, canvas 1024x1536. Spectacular HERO CANNON for the home screen, same identity as the attached cannon_4 but heroic. Oversized vermilion barrel angled up-right, chunky cobalt housing, two big warm-brass wheels, compact cream platform. Strong asymmetric silhouette, big friendly muzzle, personality. One broad upper-left highlight. No UI, text or environment; leave room below for a PLAY button. Flat magenta #FF00FF background.
```

**N01.3 `ui_kit_core`** - sheet 3x2 | canvas 1536x1024 | key magenta | slice `sheet` | 80 words
- Raw file: `omm_foundation_ui_kit_core_v01.png`  Outputs: `ui_modal_blank_v2`, `btn_primary_v2`, `btn_secondary_v2`, `btn_disabled_v2`, `ui_tab_v2`, `ui_badge_red_v2`
- Attach: A3-button; A10-ui
- Covers registry: ui_card, btn_green, btn_blue
- Slicing: Sheet 3x2: segment by connected components (never fixed lines), expect 6 objects, row-major, key, despill, trim, pad 8%, square export. GPT top-25 #3. Buttons need pressed and selected states in the next batch after this is approved.

```
3 columns by 2 rows sheet, canvas 1536x1024, equal cells, wide gutters, reading order left to right then top to bottom. UI foundation, front-facing, empty centers. In order: large blank cream modal panel; emerald primary pill button; cobalt secondary pill button; muted warm-grey disabled pill button; compact cream navigation tab; small red notification dot badge. Thin brass rims, big colored surfaces, darker lower lip on every button, face color clearly different from rim, consistent bevel depth. Flat magenta #FF00FF background.
```

**N01.4 `merge_chain_fx`** - sheet 3x2 | canvas 1536x1024 | key black | slice `fx` | 77 words
- Raw file: `omm_foundation_merge_chain_fx_v01.png`  Outputs: `fx_merge_swirl`, `fx_rankup_flash`, `fx_wake_ring`, `fx_chain_arc`, `fx_chain_burst`, `fx_max_celebration`
- Attach: A6-fx
- Covers registry: starburst, vfx_wave, fx_chainLadder
- Slicing: Additive FX: luminance to alpha, no pad beyond 10%, corners must be black (G10), export 256 px (512 for rings and glows). GPT top-25 #5.

```
3 columns by 2 rows sheet, canvas 1536x1024, equal cells, wide gutters, reading order left to right then top to bottom. Six effects for the signature MERGE CHAIN, one per cell: merge suction swirl; bright rank-up flash; expanding neighbor wake-up ring; directional teal energy arc; powerful cascading chain burst; MAX-rank gold-and-cyan celebration. Bright cores, controlled falloff, very few particles, equal effect scale, each centered and isolated, white and soft color, for additive blending. Pure black #000000 background.
```

**N01.5 `monster_anchor_sheet`** - sheet 2x2 | canvas 1536x1024 | key magenta | slice `sheet` | 93 words
- Raw file: `omm_foundation_monster_anchor_sheet_v01.png`  Outputs: `mon_toolbox_terrier_v2`, `mon_kettle_grump_v2`, `mon_traffic_cone_goblin_v2`, `boss_rivet_rhino_v2`
- Attach: A1-style; identity: existing mon_* drafts
- Covers registry: boss_card
- Slicing: Sheet 2x2: segment by connected components (never fixed lines), expect 4 objects, row-major, key, despill, trim, pad 8%, square export. GPT top-25 #6, adapted from generic goblin/slime/beetle to our monster roster. Approved cells are the final normal-pose art and the anchor for every monster batch.

```
2 columns by 2 rows sheet, canvas 1536x1024, equal cells, wide gutters, reading order left to right then top to bottom. Enemy anchor sheet with our household-object monsters. Top-left small TOOLBOX TERRIER, a red toolbox dog with a wagging brass handle tail; top-right round KETTLE GRUMP, a grumpy teal kettle with steam from the spout; bottom-left tall TRAFFIC CONE GOBLIN, orange cone with sly eyes; bottom-right huge RIVET RHINO boss, red-and-charcoal plated rhino with brass horn. All face screen-left in the same 3/4 view, readable expressive faces, no plate. Flat magenta #FF00FF background.
```

**N01.6 `battle_hud_parts`** - sheet 3x2 | canvas 1536x1024 | key magenta | slice `sheet` | 76 words
- Raw file: `omm_foundation_battle_hud_parts_v01.png`  Outputs: `hud_boss_hp_frame`, `hud_timer_frame`, `hud_chain_badge`, `hud_progress_meter`, `hud_wave_capsule`, `hud_pause_button`
- Attach: A3-button; A10-ui
- Covers registry: hp_frame, hp_fill, res_bar, hud_header, gauge_on, gauge_off, gauge_lit
- Slicing: Sheet 3x2: segment by connected components (never fixed lines), expect 6 objects, row-major, key, despill, trim, pad 8%, square export. GPT top-25 #7. Fills and caps for the bars are redone in R3 (strip rules).

```
3 columns by 2 rows sheet, canvas 1536x1024, equal cells, wide gutters, reading order left to right then top to bottom. Six battle HUD parts, front-facing, empty centers for code-drawn numbers. In order: wide red boss HP bar frame with an empty nameplate; round cobalt countdown clock frame; compact gold chain-multiplier badge; thin stage progress meter frame; small wave counter capsule; dark charcoal pause button. Strong fill-versus-background contrast, no digits, no icons. Flat magenta #FF00FF background.
```

### N02 Crates + Rewards + Board + Icons (6 prompts)

**N02.1 `chests_closed_tiers`** - sheet 3x1 | canvas 1536x1024 | key magenta | slice `sheet` | 80 words
- Raw file: `omm_crates_chests_closed_tiers_v01.png`  Outputs: `chest_wood_closed_v2`, `chest_iron_closed_v2`, `chest_gold_closed_v2`
- Attach: A5-chest; A1-style
- Covers registry: crate_wood, crate_iron, crate_gold, chest_closed
- Slicing: Sheet 3x1: segment by connected components (never fixed lines), expect 3 objects, row-major, key, despill, trim, pad 8%, square export. GPT top-25 #9. B06 chests passed; this batch fixes silhouettes (GPT: material swaps are not enough).

```
3 columns by 1 rows sheet, canvas 1536x1024, equal cells, wide gutters, reading order left to right then top to bottom. Three reward chests, tier readable from silhouette alone. WOOD: compact rounded oak chest with an iron latch. IRON: wider cobalt-enamel chest with heavy corner plates and a big lock. GOLD: taller cream-and-gold chest with a crown-shaped lid and one large red gem. Closed. Gold only on the gold chest, no gold-on-gold: cream body, gold bands. Flat magenta #FF00FF background.
```

**N02.2 `chests_open_tiers`** - sheet 3x1 | canvas 1536x1024 | key magenta | slice `sheet` | 74 words
- Raw file: `omm_crates_chests_open_tiers_v01.png`  Outputs: `chest_wood_open_v2`, `chest_iron_open_v2`, `chest_gold_open_v2`
- Attach: A5-chest; chests_closed_tiers approved  | Depends on: chests_closed_tiers
- Covers registry: crate_wood_open, crate_iron_open, crate_gold_open, chest_open
- Slicing: Sheet 3x1: segment by connected components (never fixed lines), expect 3 objects, row-major, key, despill, trim, pad 8%, square export.

```
3 columns by 1 rows sheet, canvas 1536x1024, equal cells, wide gutters, reading order left to right then top to bottom. The same three chests from the approved closed sheet, now open, lids tilted back, glowing light inside: orange for wood, blue for iron, white-gold for gold. Same sizes, outlines and silhouettes as the closed versions. The glow stays inside the chest and its rim, no rays outside the outline. Flat magenta #FF00FF background.
```

**N02.3 `victory_kit`** - sheet 3x2 | canvas 1536x1024 | key magenta | slice `sheet` | 72 words
- Raw file: `omm_rewards_victory_kit_v01.png`  Outputs: `victory_plaque`, `star_gold_big`, `trophy_three_stars`, `reward_pedestal`, `achievement_ribbon`, `gear_confetti_wreath`
- Attach: A1-style; A4-icon
- Covers registry: victory, star, medal, crown
- Slicing: Sheet 3x2: segment by connected components (never fixed lines), expect 6 objects, row-major, key, despill, trim, pad 8%, square export. GPT top-25 #10.

```
3 columns by 2 rows sheet, canvas 1536x1024, equal cells, wide gutters, reading order left to right then top to bottom. Victory art kit, each isolated: large blank gold-rimmed plaque; single brilliant enamel gold star; three-star trophy cluster; compact cream reward pedestal; red-and-gold achievement ribbon with no lettering; mechanical gear-and-confetti wreath. Chunky forms, gold only as accent on cream and red, strong silhouettes, empty space for code-drawn text. Flat magenta #FF00FF background.
```

**N02.4 `tile_states`** - sheet 3x2 | canvas 1536x1024 | key magenta | slice `sheet` | 90 words
- Raw file: `omm_board_tile_states_v01.png`  Outputs: `tile_normal`, `tile_selected`, `tile_merge_target`, `tile_invalid`, `tile_locked`, `tile_affected`
- Attach: A7-board; board_6x5_empty approved  | Depends on: board_6x5_empty
- Covers registry: fx_dropFeedback
- Slicing: Sheet 3x2: segment by connected components (never fixed lines), expect 6 objects, row-major, key, despill, trim, pad 8%, square export. GPT top-25 #14.

```
3 columns by 2 rows sheet, canvas 1536x1024, equal cells, wide gutters, reading order left to right then top to bottom. One board cell in six states, same size and camera as the approved board cells, cream enamel. In order: normal; selected with a bright cobalt rim; valid merge target with a green glow rim; invalid drop with a red rim and shallow dent; locked with a brass padlock plate; affected with an orange warning tint. State shown by rim, tint or one small plate only. Flat magenta #FF00FF background.
```

**N02.5 `board_props`** - sheet 3x2 | canvas 1536x1024 | key magenta | slice `sheet` | 82 words
- Raw file: `omm_board_board_props_v01.png`  Outputs: `prop_oil_v2`, `prop_portal_cyan_v2`, `prop_portal_violet_v2`, `prop_junk_block_v2`, `prop_bomb_v2`, `prop_tow_bar_v2`
- Attach: A7-board
- Covers registry: prop_oil, prop_portal_cyan, prop_portal_violet, prop_junk_block, prop_bomb
- Slicing: Sheet 3x2: segment by connected components (never fixed lines), expect 6 objects, row-major, key, despill, trim, pad 8%, square export.

```
3 columns by 2 rows sheet, canvas 1536x1024, equal cells, wide gutters, reading order left to right then top to bottom. Six cell-sized board props on the same cell footprint, 3/4 view. In order: glossy oil slick puddle with an arrow-shaped gleam; cyan swirl portal ring; violet swirl portal ring; dull desaturated junk block of crushed cardboard and a bent can; round bomb with a short lit fuse; red-and-cream tow bar hook. Readable at 64 px, no text. Flat magenta #FF00FF background.
```

**N02.6 `icon_kit_map_nodes`** - sheet 3x2 | canvas 1536x1024 | key magenta | slice `sheet` | 88 words
- Raw file: `omm_icons_icon_kit_map_nodes_v01.png`  Outputs: `node_boss`, `node_completed`, `node_hard`, `node_locked`, `node_mega_hard`, `node_normal`
- Attach: A4-icon
- Covers registry: node_boss, node_completed, node_hard, node_locked, node_mega_hard, node_normal
- Slicing: Sheet 3x2: segment by connected components (never fixed lines), expect 6 objects, row-major, key, despill, trim, pad 8%, square export.

```
3 columns by 2 rows sheet, canvas 1536x1024, equal cells, wide gutters, reading order left to right then top to bottom. Six round level-map nodes, same size, brass porthole rim. In order: boss node with a horned skull-less monster face silhouette in red; completed node, green with a bold check; hard node, orange with one flame; locked node, grey-blue with a padlock; mega-hard node, violet with a double flame; normal node, cobalt with a plain gear. Face colors clearly different from the brass rim. Flat magenta #FF00FF background.
```

### N03 UI kit + FX sprites (6 prompts)

**N03.1 `buttons_states`** - sheet 3x2 | canvas 1536x1024 | key magenta | slice `sheet` | 69 words
- Raw file: `omm_ui_buttons_states_v01.png`  Outputs: `btn_green`, `btn_blue`, `btn_red`, `btn_green_pressed`, `btn_blue_pressed`, `btn_red_pressed`
- Attach: A3-button; ui_kit_core approved  | Depends on: ui_kit_core
- Covers registry: btn_green, btn_green_pressed, btn_blue, btn_blue_pressed, btn_red, btn_red_pressed
- Slicing: Sheet 3x2: segment by connected components (never fixed lines), expect 6 objects, row-major, key, despill, trim, pad 8%, square export.

```
3 columns by 2 rows sheet, canvas 1536x1024, equal cells, wide gutters, reading order left to right then top to bottom. Six pill buttons, front-facing, empty center, 3.2:1. Top row normal in emerald, cobalt, vermilion. Bottom row the pressed state of each: surface darker, lip squashed to a thin line, button 3 percent smaller, highlight dimmed. Thin brass rim, face color clearly different from rim. Flat magenta #FF00FF background.
```

**N03.2 `buttons_special`** - sheet 3x2 | canvas 1536x1024 | key magenta | slice `sheet` | 86 words
- Raw file: `omm_ui_buttons_special_v01.png`  Outputs: `btn_brass`, `btn_brass2`, `btn_wide`, `btn_workshop`, `btn_icon_round`, `btn_icon_square`
- Attach: A3-button; ui_kit_core approved  | Depends on: ui_kit_core
- Covers registry: btn_brass, btn_brass2, btn_wide, btn_workshop
- Slicing: Sheet 3x2: segment by connected components (never fixed lines), expect 6 objects, row-major, key, despill, trim, pad 8%, square export.

```
3 columns by 2 rows sheet, canvas 1536x1024, equal cells, wide gutters, reading order left to right then top to bottom. Six buttons, front-facing, empty centers. In order: brass pill with a cream face; second brass pill with a red face; wide 5:1 banner button in warm gold with a brown rim; workshop button shaped like a small wooden plank with brass corners; round icon button in cobalt; square icon button in cream. Face always separates from rim, no gold on gold. Flat magenta #FF00FF background.
```

**N03.3 `panels_coach`** - sheet 3x2 | canvas 1536x1024 | key magenta | slice `sheet` | 76 words
- Raw file: `omm_ui_panels_coach_v01.png`  Outputs: `ui_bubble`, `ui_coach`, `ui_coach_compact`, `ui_howto`, `ui_console`, `ui_hand`
- Attach: A3-button; ui_kit_core approved  | Depends on: ui_kit_core
- Covers registry: ui_bubble, ui_coach, ui_coach_compact, ui_howto, ui_console, ui_hand
- Slicing: Sheet 3x2: segment by connected components (never fixed lines), expect 6 objects, row-major, key, despill, trim, pad 8%, square export.

```
3 columns by 2 rows sheet, canvas 1536x1024, equal cells, wide gutters, reading order left to right then top to bottom. Six empty plates, front-facing, uniform border width, empty centers. In order: speech bubble with a small separate tail; large coach panel with a mascot notch top-left; compact coach strip 4:1; how-to card with a pin; dark charcoal console panel with brass corner brackets; hand-rest plate for the tutorial finger. No text. Flat magenta #FF00FF background.
```

**N03.4 `panels_team`** - sheet 3x2 | canvas 1536x1024 | key magenta | slice `sheet` | 80 words
- Raw file: `omm_ui_panels_team_v01.png`  Outputs: `ui_consumable`, `ui_perk_row`, `ui_team_panel`, `ui_team_slot`, `ui_team_slot_sel`, `hud_header`
- Attach: A3-button; ui_kit_core approved  | Depends on: ui_kit_core
- Covers registry: ui_consumable, ui_perk_row, ui_team_panel, ui_team_slot, ui_team_slot_sel, hud_header
- Slicing: Sheet 3x2: segment by connected components (never fixed lines), expect 6 objects, row-major, key, despill, trim, pad 8%, square export.

```
3 columns by 2 rows sheet, canvas 1536x1024, equal cells, wide gutters, reading order left to right then top to bottom. Six empty UI plates, front-facing, uniform border, empty centers. In order: consumable slot square with a brass ring; perk row strip 6:1; team panel 3:2 with a darker inset; empty team slot square; selected team slot with a bright cobalt rim; HUD header strip 8:1 in cream with brass end caps. No text, no icons. Flat magenta #FF00FF background.
```

**N03.5 `result_banners`** - sheet 3x2 | canvas 1536x1024 | key magenta | slice `sheet` | 76 words
- Raw file: `omm_ui_result_banners_v01.png`  Outputs: `banner_chain`, `banner_destroyed`, `banner_overdrive`, `defeat`, `victory`, `banner_streamer`
- Attach: A3-button; A10-ui
- Covers registry: banner_chain, banner_destroyed, banner_overdrive, defeat, victory
- Slicing: Sheet 3x2: segment by connected components (never fixed lines), expect 6 objects, row-major, key, despill, trim, pad 8%, square export.

```
3 columns by 2 rows sheet, canvas 1536x1024, equal cells, wide gutters, reading order left to right then top to bottom. Six empty banners, front-facing, empty centers. In order: chain banner, orange-red with spark corners; destroyed banner, cream with a cracked red burst; overdrive banner, electric cyan with lightning ends; defeat plaque, calm desaturated blue-grey, no skull; victory banner, gold-and-cream with a crown notch; level-complete streamer, a long ribbon with triangle ends. Flat magenta #FF00FF background.
```

**N03.6 `fx_flame`** - sheet 3x2 | canvas 1536x1024 | key black | slice `fx` | 64 words
- Raw file: `omm_fx_fx_flame_v01.png`  Outputs: `fx_flame_1`, `fx_flame_2`, `fx_flame_3`, `fx_flame_4`, `fx_flame_corner`, `fx_flame_lick`
- Attach: A6-fx
- Covers registry: vfx_flame, vfx_flame_corner
- Slicing: Additive FX: luminance to alpha, no pad beyond 10%, corners must be black (G10), export 256 px (512 for rings and glows).

```
3 columns by 2 rows sheet, canvas 1536x1024, equal cells, wide gutters, reading order left to right then top to bottom. Six flame sprites for tinting: four frames of a 40-degree flame cone flickering (pale yellow-white core, soft taper), one square-corner flame burst, one small flame lick. White and pale yellow only, soft edges, each centered with 10 percent margin. Pure black #000000 background.
```

### N04 FX sprites (6 prompts)

**N04.1 `fx_smoke`** - sheet 3x2 | canvas 1536x1024 | key black | slice `fx` | 66 words
- Raw file: `omm_fx_fx_smoke_v01.png`  Outputs: `fx_smoke_1`, `fx_smoke_2`, `fx_smoke_3`, `fx_smoke_4`, `fx_smoke_5`, `fx_smoke_6`
- Attach: A6-fx
- Slicing: Additive FX: luminance to alpha, no pad beyond 10%, corners must be black (G10), export 256 px (512 for rings and glows).

```
3 columns by 2 rows sheet, canvas 1536x1024, equal cells, wide gutters, reading order left to right then top to bottom. Six soft cartoon smoke puffs in three sizes, two shapes each: lumpy rounded clouds with soft edges and a light inner highlight, white-grey on pure black, designed to be tinted and used with multiply. No outline, no spark, no detail noise. Pure black #000000 background.
```

**N04.2 `fx_sparks`** - sheet 3x2 | canvas 1536x1024 | key black | slice `fx` | 68 words
- Raw file: `omm_fx_fx_sparks_v01.png`  Outputs: `fx_dot`, `fx_spark_star`, `fx_spark_streak`, `fx_ember`, `fx_flare_cross`, `fx_glint_diamond`
- Attach: A6-fx
- Covers registry: dot, spark, vfx_spark
- Slicing: Additive FX: luminance to alpha, no pad beyond 10%, corners must be black (G10), export 256 px (512 for rings and glows).

```
3 columns by 2 rows sheet, canvas 1536x1024, equal cells, wide gutters, reading order left to right then top to bottom. Six spark sprites: round soft dot; four-point star glint; thin streak spark with a tail; small ember with a glowing core; cross flare; tiny diamond glint. White with a faint warm edge, crisp bright centers, soft falloff, each centered and distinct in silhouette. Pure black #000000 background.
```

**N04.3 `fx_rings`** - sheet 3x2 | canvas 1536x1024 | key black | slice `fx` | 66 words
- Raw file: `omm_fx_fx_rings_v01.png`  Outputs: `fx_ring_thin`, `fx_ring_thick`, `fx_ring_double`, `fx_ring_dashed`, `fx_ring_hex`, `fx_ring_flat`
- Attach: A6-fx
- Slicing: Additive FX: luminance to alpha, no pad beyond 10%, corners must be black (G10), export 256 px (512 for rings and glows).

```
3 columns by 2 rows sheet, canvas 1536x1024, equal cells, wide gutters, reading order left to right then top to bottom. Six ring sprites, front-on: thin ring; thick soft ring; double concentric ring; dashed ring; hexagon ring; flat ellipse shock ring seen at a shallow angle. White, soft inner glow, each ring fills 90 percent of its cell, uniform thickness, no spokes. Pure black #000000 background.
```

**N04.4 `fx_debris`** - sheet 3x2 | canvas 1536x1024 | key magenta | slice `sheet` | 74 words
- Raw file: `omm_fx_fx_debris_v01.png`  Outputs: `debris_0`, `debris_1`, `debris_2`, `debris_3`, `debris_4`, `debris_5`, `chunk`
- Attach: A6-fx; A1-style
- Covers registry: debris_0, debris_1, debris_2, debris_3, debris_4, debris_5, chunk
- Slicing: Sheet 3x2: segment by connected components (never fixed lines), expect 7 objects, row-major, key, despill, trim, pad 8%, square export. Colored: magenta key, not black.

```
3 columns by 2 rows sheet, canvas 1536x1024, equal cells, wide gutters, reading order left to right then top to bottom. Six chunky debris pieces with dark outlines on magenta: brass chip; red enamel shard; wood splinter; cog tooth; rubble stone; rubber scuff. Each a different silhouette, 2-3 flat shades, readable at 24 px. The seventh asset, the generic chunk, is made by the pipeline by cropping the brass chip. Flat magenta #FF00FF background.
```

**N04.5 `fx_coins`** - sheet 3x2 | canvas 1536x1024 | key black | slice `fx` | 67 words
- Raw file: `omm_fx_fx_coins_v01.png`  Outputs: `fx_coin_face`, `fx_coin_turn_1`, `fx_coin_turn_2`, `fx_coin_edge`, `fx_coin_fountain`, `fx_gem_sparkle`
- Attach: A6-fx
- Slicing: Additive FX: luminance to alpha, no pad beyond 10%, corners must be black (G10), export 256 px (512 for rings and glows).

```
3 columns by 2 rows sheet, canvas 1536x1024, equal cells, wide gutters, reading order left to right then top to bottom. Six coin sprites, white and gold only on pure black for tint: coin face-on; coin turning at 45 degrees; at 70 degrees; edge-on; a fountain burst of five flying coins as one shape; a gem sparkle star. Simple gear stamp, no numerals. Pure black #000000 background.
```

**N04.6 `fx_lightning`** - sheet 3x2 | canvas 1536x1024 | key black | slice `fx` | 69 words
- Raw file: `omm_fx_fx_lightning_v01.png`  Outputs: `fx_bolt_fork`, `fx_bolt_jag`, `fx_arc_seg`, `fx_ground_crackle`, `fx_orb_glow`, `fx_branch`
- Attach: A6-fx
- Covers registry: vfx_arc
- Slicing: Additive FX: luminance to alpha, no pad beyond 10%, corners must be black (G10), export 256 px (512 for rings and glows).

```
3 columns by 2 rows sheet, canvas 1536x1024, equal cells, wide gutters, reading order left to right then top to bottom. Six lightning sprites, white-hot core with a pale cyan edge: forked bolt with three branches; single jagged bolt; short arc segment, one bend; ground crackle web spreading from a point; charging orb with tiny orbiting sparks; thin branch twig. Sharp bright shapes, no smoke. Pure black #000000 background.
```

### N05 FX sprites (6 prompts)

**N05.1 `fx_muzzle`** - sheet 3x2 | canvas 1536x1024 | key black | slice `fx` | 64 words
- Raw file: `omm_fx_fx_muzzle_v01.png`  Outputs: `fx_muzzle_round`, `fx_muzzle_cone`, `fx_muzzle_star`, `fx_muzzle_side`, `fx_muzzle_ring`, `fx_exhaust`
- Attach: A6-fx
- Covers registry: vfx_muzzle
- Slicing: Additive FX: luminance to alpha, no pad beyond 10%, corners must be black (G10), export 256 px (512 for rings and glows).

```
3 columns by 2 rows sheet, canvas 1536x1024, equal cells, wide gutters, reading order left to right then top to bottom. Six muzzle flash sprites facing right: round pop; cone blast; six-point star flash; side jet with a stub; ring burst with a bright center; rocket exhaust plume. Pale yellow-white, bright core, soft taper, sized to fit one board cell. Pure black #000000 background.
```

**N05.2 `fx_projectiles`** - sheet 3x2 | canvas 1536x1024 | key magenta | slice `sheet` | 73 words
- Raw file: `omm_fx_fx_projectiles_v01.png`  Outputs: `proj_slug`, `proj_rocket`, `proj_rivet`, `proj_nails`, `proj_saw_disc`, `proj_cog`
- Attach: A6-fx; A1-style
- Covers registry: fx_rosterFx
- Slicing: Sheet 3x2: segment by connected components (never fixed lines), expect 6 objects, row-major, key, despill, trim, pad 8%, square export. Colored: magenta key, not black.

```
3 columns by 2 rows sheet, canvas 1536x1024, equal cells, wide gutters, reading order left to right then top to bottom. Six projectile sprites flying right, enamel with dark outline, on magenta: round cannon slug with a white-hot core; rocket with a flame cone; amber rivet; three small nails in a fan; spinning saw disc with teeth; small bronze cog. Each fits 120 px long, readable at 32 px. Flat magenta #FF00FF background.
```

**N05.3 `fx_hit_kill`** - sheet 3x2 | canvas 1536x1024 | key black | slice `fx` | 67 words
- Raw file: `omm_fx_fx_hit_kill_v01.png`  Outputs: `fx_hit_flash`, `fx_slash_arc`, `fx_kill_ring`, `fx_ko_burst`, `fx_crit_star`, `fx_hit_splash`
- Attach: A6-fx
- Covers registry: vfx_impact, fx_partReact
- Slicing: Additive FX: luminance to alpha, no pad beyond 10%, corners must be black (G10), export 256 px (512 for rings and glows).

```
3 columns by 2 rows sheet, canvas 1536x1024, equal cells, wide gutters, reading order left to right then top to bottom. Six combat impact sprites: white hit flash disc; crescent slash arc; kill shock ring with a bright rim; KO star burst with ten rays; critical-hit eight-point star; radial splash of eight droplets. White with a warm edge, bright centers, strongly different silhouettes. Pure black #000000 background.
```

**N05.4 `fx_triggers`** - sheet 3x2 | canvas 1536x1024 | key black | slice `fx` | 81 words
- Raw file: `omm_fx_fx_triggers_v01.png`  Outputs: `fx_trig_wake_ring`, `fx_trig_wire_spark`, `fx_trig_gear_spin`, `fx_trig_chain_link`, `fx_trig_aura_ring`, `fx_trig_rewind_swirl`
- Attach: A6-fx
- Covers registry: fx_rosterFx
- Slicing: Additive FX: luminance to alpha, no pad beyond 10%, corners must be black (G10), export 256 px (512 for rings and glows).

```
3 columns by 2 rows sheet, canvas 1536x1024, equal cells, wide gutters, reading order left to right then top to bottom. Six trigger effects: wake pulse ring with soft inner glow; wiring spark, a short zig-zag line with bright nodes; gear spin-up, a toothed ring with motion arcs; chain-link glow, a rounded capsule with bright ends; support aura ring, a wide gentle ring with small up-chevrons; undo rewind swirl, a counter-clockwise spiral with ghost trails. White-pale blue. Pure black #000000 background.
```

**N05.5 `fx_max_rank`** - sheet 3x2 | canvas 1536x1024 | key black | slice `fx` | 77 words
- Raw file: `omm_fx_fx_max_rank_v01.png`  Outputs: `max_backfire`, `max_bridge`, `max_chime`, `max_gust`, `max_split`, `max_twin`
- Attach: A6-fx
- Covers registry: max_backfire, max_bridge, max_chime, max_gust, max_split, max_twin
- Slicing: Additive FX: luminance to alpha, no pad beyond 10%, corners must be black (G10), export 256 px (512 for rings and glows).

```
3 columns by 2 rows sheet, canvas 1536x1024, equal cells, wide gutters, reading order left to right then top to bottom. Six MAX-rank link effects: backfire, an orange-red recoil jolt with a puff; bridge, marching dashes jumping an arc; chime, a bell-note ripple with two glints; gust, three curved wind streaks; split, a fork of two beams from one point; twin, two overlapping soft discs. Warm white with one accent each, bright centers. Pure black #000000 background.
```

**N05.6 `fx_boss`** - sheet 3x2 | canvas 1536x1024 | key black | slice `fx` | 78 words
- Raw file: `omm_fx_fx_boss_v01.png`  Outputs: `bfx_armor`, `bfx_crack`, `bfx_shield_dome`, `bfx_enrage_aura`, `bfx_telegraph_ring`, `bfx_entrance_streaks`
- Attach: A6-fx
- Covers registry: bfx_armor, bfx_crack
- Slicing: Additive FX: luminance to alpha, no pad beyond 10%, corners must be black (G10), export 256 px (512 for rings and glows).

```
3 columns by 2 rows sheet, canvas 1536x1024, equal cells, wide gutters, reading order left to right then top to bottom. Six boss effects: armor plate flash, a hexagon-plate shape with a white rim; crack decal, a jagged branching crack; shield dome, a translucent half-sphere outline with a highlight; enrage aura, a flame-like red halo; telegraph ring, a wide ring of chevrons pointing inward; entrance streaks, ten radial speed lines. White and soft red. Pure black #000000 background.
```

### N06 FX sprites + Units (6 prompts)

**N06.1 `fx_soft`** - sheet 3x2 | canvas 1536x1024 | key black | slice `fx` | 68 words
- Raw file: `omm_fx_fx_soft_v01.png`  Outputs: `fx_glow`, `fx_flare`, `fx_comet`, `fx_halo`, `fx_shaft`, `fx_vignette_corner`
- Attach: A6-fx
- Slicing: Additive FX: luminance to alpha, no pad beyond 10%, corners must be black (G10), export 256 px (512 for rings and glows).

```
3 columns by 2 rows sheet, canvas 1536x1024, equal cells, wide gutters, reading order left to right then top to bottom. Six soft light sprites: round glow with smooth falloff; lens flare with a horizontal streak; comet with a tapered trail; soft halo ring; vertical light shaft; dark vignette corner quarter-circle (black fading to nothing). White except the vignette. No noise, perfectly smooth gradients. Pure black #000000 background.
```

**N06.2 `fx_tools_new`** - sheet 3x2 | canvas 1536x1024 | key black | slice `fx` | 74 words
- Raw file: `omm_fx_fx_tools_new_v01.png`  Outputs: `fx_sandwich_squeeze`, `fx_fuse_trail`, `fx_bomb_blast_ring`, `fx_reticle_lock`, `fx_pickup_sparkle`, `fx_overcharge_glow`
- Attach: A6-fx
- Covers registry: fx_sandwichFx
- Slicing: Additive FX: luminance to alpha, no pad beyond 10%, corners must be black (G10), export 256 px (512 for rings and glows).

```
3 columns by 2 rows sheet, canvas 1536x1024, equal cells, wide gutters, reading order left to right then top to bottom. Six power-up effects: sandwich squeeze, two chevron wedges closing on a bright spot; fuse trail, a short spark line with embers; clean bomb blast ring with radial rays; reticle lock, a target ring with four ticks; power-up pickup sparkle burst; overcharge glow, a pulsing rounded halo. White and orange-yellow. Pure black #000000 background.
```

**N06.3 `fx_crate_open`** - sheet 3x2 | canvas 1536x1024 | key black | slice `fx` | 78 words
- Raw file: `omm_fx_fx_crate_open_v01.png`  Outputs: `fx_lid_flash`, `fx_light_beam`, `fx_rarity_ring`, `fx_item_pop`, `fx_chest_rays`, `fx_reveal_sparkle`
- Attach: A6-fx
- Covers registry: fx_boxMoment, fx_boxMomentFx, fx_toolboxCrates
- Slicing: Additive FX: luminance to alpha, no pad beyond 10%, corners must be black (G10), export 256 px (512 for rings and glows).

```
3 columns by 2 rows sheet, canvas 1536x1024, equal cells, wide gutters, reading order left to right then top to bottom. Six crate-opening effects: lid flash, a bright horizontal slit of light; vertical light beam rising; rarity reveal ring, a double ring with gem dots; item pop, a small radial burst; chest rays, twelve soft rays from one point; reveal sparkle cluster of five stars. White and warm gold, bright, clean, fill the cell. Pure black #000000 background.
```

**N06.4 `fx_feedback`** - sheet 3x2 | canvas 1536x1024 | key black | slice `fx` | 74 words
- Raw file: `omm_fx_fx_feedback_v01.png`  Outputs: `fx_press_ripple`, `fx_fly_trail`, `fx_star_burst`, `fx_unlock_flash`, `fx_iris_gear_mask`, `fx_notify_pulse`
- Attach: A6-fx
- Slicing: Additive FX: luminance to alpha, no pad beyond 10%, corners must be black (G10), export 256 px (512 for rings and glows).

```
3 columns by 2 rows sheet, canvas 1536x1024, equal cells, wide gutters, reading order left to right then top to bottom. Six UI feedback effects: button press ripple, a thin expanding ring; currency fly-trail, a tapered comet of stars; star burst of six stars; unlock flash, a vertical diamond flare; screen-transition iris mask, a large gear-shaped hole outline (white shape, solid); notification pulse, a soft double ring. White, simple, bright. Pure black #000000 background.
```

**N06.5 `unit_wrench_ranks`** - sheet 3x2 | canvas 1536x1024 | key magenta | slice `sheet` | 114 words
- Raw file: `omm_units_unit_wrench_ranks_v01.png`  Outputs: `wrench_1`, `wrench_2`, `wrench_3`, `wrench_4`, `wrench_5`, `wrench_6`
- Attach: A2-unit-camera; identity: existing unit_wrench picture
- Covers registry: unit_wrench, wrench_1, wrench_2, wrench_3, wrench_4, wrench_5, wrench_6
- Slicing: Sheet 3x2: segment by connected components (never fixed lines), expect 6 objects, row-major, key, despill, trim, pad 8%, square export.

```
3 columns by 2 rows sheet, canvas 1536x1024, equal cells, wide gutters, reading order left to right then top to bottom. Wrench, a big adjustable open-end wrench standing upright in a cream plate. Ranks 1 to 6, each rank adds to the last: 1 plain open-jaw wrench; 2 brass jaw collar; 3 longer handle with a red grip band; 4 second small wrench crossed behind it; 5 cobalt grip and gold bolt head; 6 oversized wrench in front of a brass gear halo. Earlier parts keep size and place. Same camera, cream plate and outline as the unit_wrench reference. Palette red, brass, cream. Must not resemble: a stock hardware-store wrench. Flat magenta #FF00FF background.
```

**N06.6 `unit_piston_ranks`** - sheet 3x2 | canvas 1536x1024 | key magenta | slice `sheet` | 108 words
- Raw file: `omm_units_unit_piston_ranks_v01.png`  Outputs: `piston_1`, `piston_2`, `piston_3`, `piston_4`, `piston_5`, `piston_6`
- Attach: A2-unit-camera; identity: existing unit_piston picture
- Covers registry: unit_piston, piston_1, piston_2, piston_3, piston_4, piston_5, piston_6
- Slicing: Sheet 3x2: segment by connected components (never fixed lines), expect 6 objects, row-major, key, despill, trim, pad 8%, square export.

```
3 columns by 2 rows sheet, canvas 1536x1024, equal cells, wide gutters, reading order left to right then top to bottom. Piston, a red cylinder with a rod and pressure pipe. Ranks 1 to 6, each rank adds to the last: 1 short red cylinder, short rod; 2 brass collar ring; 3 taller cylinder, longer rod; 4 twin side pressure tubes; 5 cobalt top cap and gold pressure gauge; 6 double-height cylinder with crown-shaped steam vent. Earlier parts keep size and place. Same camera, cream plate and outline as the unit_piston reference. Palette red, brass, cobalt, cream. Silhouette: tall and narrow, unlike Hydraulic Press. Flat magenta #FF00FF background.
```

### N07 Units (6 prompts)

**N07.1 `unit_spring_ranks`** - sheet 3x2 | canvas 1536x1024 | key magenta | slice `sheet` | 116 words
- Raw file: `omm_units_unit_spring_ranks_v01.png`  Outputs: `spring_1`, `spring_2`, `spring_3`, `spring_4`, `spring_5`, `spring_6`
- Attach: A2-unit-camera; identity: existing unit_spring picture
- Covers registry: unit_spring, spring_1, spring_2, spring_3, spring_4, spring_5, spring_6
- Slicing: Sheet 3x2: segment by connected components (never fixed lines), expect 6 objects, row-major, key, despill, trim, pad 8%, square export.

```
3 columns by 2 rows sheet, canvas 1536x1024, equal cells, wide gutters, reading order left to right then top to bottom. Spring, a fat gold coil spring with a bold arrow cap. Ranks 1 to 6, each rank adds to the last: 1 short gold coil, flat top disc; 2 brass top disc; 3 taller coil, four turns; 4 second small coil beside it; 5 cobalt cap with a white arrow shape; 6 giant coil crowned by a gold disc with two small side coils. Earlier parts keep size and place. Same camera, cream plate and outline as the unit_spring reference. Palette gold, cobalt, cream. Must not resemble: Tesla Tower or Coil. Flat magenta #FF00FF background.
```

**N07.2 `unit_rivet_gun_ranks`** - sheet 3x2 | canvas 1536x1024 | key magenta | slice `sheet` | 115 words
- Raw file: `omm_units_unit_rivet_gun_ranks_v01.png`  Outputs: `rivet_gun_1`, `rivet_gun_2`, `rivet_gun_3`, `rivet_gun_4`, `rivet_gun_5`, `rivet_gun_6`
- Attach: A2-unit-camera; identity: existing unit_rivet_gun picture  | Depends on: redo unit_rivet_gun
- Covers registry: unit_rivet_gun, rivet_gun_1, rivet_gun_2, rivet_gun_3, rivet_gun_4, rivet_gun_5, rivet_gun_6
- Slicing: Sheet 3x2: segment by connected components (never fixed lines), expect 6 objects, row-major, key, despill, trim, pad 8%, square export.

```
3 columns by 2 rows sheet, canvas 1536x1024, equal cells, wide gutters, reading order left to right then top to bottom. Rivet Gun, a chunky toy rivet gun with a round brass nose and pistol grip. Ranks 1 to 6, each rank adds to the last: 1 short red body, brass nose; 2 brass magazine drum; 3 longer barrel; 4 side rivet feed tube; 5 cobalt grip and a gold three-dot counter; 6 oversized double-drum gun with brass crown cap. Earlier parts keep size and place. Same camera, cream plate and outline as the unit_rivet_gun reference. Palette red, brass, cobalt. Must not resemble: nail_gun, a cordless drill, or any real brand. Flat magenta #FF00FF background.
```

**N07.3 `unit_vice_ranks`** - sheet 3x2 | canvas 1536x1024 | key magenta | slice `sheet` | 111 words
- Raw file: `omm_units_unit_vice_ranks_v01.png`  Outputs: `vice_1`, `vice_2`, `vice_3`, `vice_4`, `vice_5`, `vice_6`
- Attach: A2-unit-camera; identity: existing unit_vice picture  | Depends on: redo unit_vice
- Covers registry: unit_vice, vice_1, vice_2, vice_3, vice_4, vice_5, vice_6
- Slicing: Sheet 3x2: segment by connected components (never fixed lines), expect 6 objects, row-major, key, despill, trim, pad 8%, square export.

```
3 columns by 2 rows sheet, canvas 1536x1024, equal cells, wide gutters, reading order left to right then top to bottom. Vice, a bench vice with a red enamel body and a brass screw handle. Ranks 1 to 6, each rank adds to the last: 1 small red vice, short handle; 2 brass jaw faces; 3 longer screw handle with ball ends; 4 second wide anvil jaw; 5 cobalt base block and gold handle; 6 oversized vice with twin handles and a crown. Earlier parts keep size and place. Same camera, cream plate and outline as the unit_vice reference. Palette red, brass, cobalt. No raw grey steel. Flat magenta #FF00FF background.
```

**N07.4 `unit_blowtorch_ranks`** - sheet 3x2 | canvas 1536x1024 | key magenta | slice `sheet` | 111 words
- Raw file: `omm_units_unit_blowtorch_ranks_v01.png`  Outputs: `blowtorch_1`, `blowtorch_2`, `blowtorch_3`, `blowtorch_4`, `blowtorch_5`, `blowtorch_6`
- Attach: A2-unit-camera; identity: existing unit_blowtorch picture
- Covers registry: unit_blowtorch, blowtorch_1, blowtorch_2, blowtorch_3, blowtorch_4, blowtorch_5, blowtorch_6
- Slicing: Sheet 3x2: segment by connected components (never fixed lines), expect 6 objects, row-major, key, despill, trim, pad 8%, square export.

```
3 columns by 2 rows sheet, canvas 1536x1024, equal cells, wide gutters, reading order left to right then top to bottom. Blowtorch, a brass blowtorch with a blue-and-orange flame. Ranks 1 to 6, each rank adds to the last: 1 small brass torch, tiny flame; 2 red fuel tank; 3 longer nozzle, bigger flame; 4 twin nozzles; 5 cobalt tank with gold bands; 6 giant torch with a triple flame and brass crown. Earlier parts keep size and place. Same camera, cream plate and outline as the unit_blowtorch reference. Palette brass, red, orange, blue flame. Flame is a solid enamel shape with an outline, not a glow. Flat magenta #FF00FF background.
```

**N07.5 `unit_pipe_ranks`** - sheet 3x2 | canvas 1536x1024 | key magenta | slice `sheet` | 100 words
- Raw file: `omm_units_unit_pipe_ranks_v01.png`  Outputs: `pipe_1`, `pipe_2`, `pipe_3`, `pipe_4`, `pipe_5`, `pipe_6`
- Attach: A2-unit-camera; identity: existing unit_pipe picture
- Covers registry: unit_pipe, pipe_1, pipe_2, pipe_3, pipe_4, pipe_5, pipe_6
- Slicing: Sheet 3x2: segment by connected components (never fixed lines), expect 6 objects, row-major, key, despill, trim, pad 8%, square export.

```
3 columns by 2 rows sheet, canvas 1536x1024, equal cells, wide gutters, reading order left to right then top to bottom. Pipe, a teal elbow pipe with a valve wheel. Ranks 1 to 6, each rank adds to the last: 1 short straight pipe; 2 brass flange; 3 elbow bend; 4 red valve wheel; 5 second branch pipe with a gold gauge; 6 large manifold of three pipes with a crown valve. Earlier parts keep size and place. Same camera, cream plate and outline as the unit_pipe reference. Palette teal, brass, red. Must not resemble: Router. Flat magenta #FF00FF background.
```

**N07.6 `unit_router_ranks`** - sheet 3x2 | canvas 1536x1024 | key magenta | slice `sheet` | 103 words
- Raw file: `omm_units_unit_router_ranks_v01.png`  Outputs: `router_1`, `router_2`, `router_3`, `router_4`, `router_5`, `router_6`
- Attach: A2-unit-camera; identity: existing unit_router picture
- Covers registry: unit_router, router_1, router_2, router_3, router_4, router_5, router_6
- Slicing: Sheet 3x2: segment by connected components (never fixed lines), expect 6 objects, row-major, key, despill, trim, pad 8%, square export.

```
3 columns by 2 rows sheet, canvas 1536x1024, equal cells, wide gutters, reading order left to right then top to bottom. Router, a teal L-shaped track with chevron plates, a signal junction. Ranks 1 to 6, each rank adds to the last: 1 L-shaped track with one chevron; 2 brass corner joint; 3 two chevrons; 4 junction box at the corner; 5 cobalt cover with a gold arrow; 6 triple-lane crossroad with a crown junction. Earlier parts keep size and place. Same camera, cream plate and outline as the unit_router reference. Palette teal, cobalt, brass. Must not resemble: Pipe. Flat magenta #FF00FF background.
```

### N08 Units (6 prompts)

**N08.1 `unit_blast_plate_ranks`** - sheet 3x2 | canvas 1536x1024 | key magenta | slice `sheet` | 104 words
- Raw file: `omm_units_unit_blast_plate_ranks_v01.png`  Outputs: `blast_plate_1`, `blast_plate_2`, `blast_plate_3`, `blast_plate_4`, `blast_plate_5`, `blast_plate_6`
- Attach: A2-unit-camera; identity: existing unit_blast_plate picture  | Depends on: redo unit_blast_plate
- Covers registry: unit_blast_plate, blast_plate_1, blast_plate_2, blast_plate_3, blast_plate_4, blast_plate_5, blast_plate_6
- Slicing: Sheet 3x2: segment by connected components (never fixed lines), expect 6 objects, row-major, key, despill, trim, pad 8%, square export.

```
3 columns by 2 rows sheet, canvas 1536x1024, equal cells, wide gutters, reading order left to right then top to bottom. Blast Plate, a hexagonal shield plate on a stand, brass-framed, red-orange. Ranks 1 to 6, each rank adds to the last: 1 small red-orange hex plate on a stand; 2 brass frame; 3 bigger plate with a blast mark; 4 second layered plate; 5 cobalt rim and gold studs; 6 giant crowned hexagon dome shield. Earlier parts keep size and place. Same camera, cream plate and outline as the unit_blast_plate reference. Palette red-orange, brass, cobalt. No raw grey steel. Flat magenta #FF00FF background.
```

**N08.2 `unit_belt_drive_ranks`** - sheet 3x2 | canvas 1536x1024 | key magenta | slice `sheet` | 108 words
- Raw file: `omm_units_unit_belt_drive_ranks_v01.png`  Outputs: `belt_drive_1`, `belt_drive_2`, `belt_drive_3`, `belt_drive_4`, `belt_drive_5`, `belt_drive_6`
- Attach: A2-unit-camera; identity: existing unit_belt_drive picture
- Covers registry: unit_belt_drive, belt_drive_1, belt_drive_2, belt_drive_3, belt_drive_4, belt_drive_5, belt_drive_6
- Slicing: Sheet 3x2: segment by connected components (never fixed lines), expect 6 objects, row-major, key, despill, trim, pad 8%, square export.

```
3 columns by 2 rows sheet, canvas 1536x1024, equal cells, wide gutters, reading order left to right then top to bottom. Belt Drive, two rollers joined by a conveyor belt. Ranks 1 to 6, each rank adds to the last: 1 two small rollers, short belt; 2 brass roller caps; 3 longer belt with orange chevrons; 4 third middle roller; 5 cobalt frame with a gold axle; 6 long double-belt drive with a crown roller. Earlier parts keep size and place. Same camera, cream plate and outline as the unit_belt_drive reference. Palette slate-blue, orange, brass. Silhouette: long and low, clearly readable at 70 px. Flat magenta #FF00FF background.
```

**N08.3 `unit_capacitor_ranks`** - sheet 3x2 | canvas 1536x1024 | key magenta | slice `sheet` | 105 words
- Raw file: `omm_units_unit_capacitor_ranks_v01.png`  Outputs: `capacitor_1`, `capacitor_2`, `capacitor_3`, `capacitor_4`, `capacitor_5`, `capacitor_6`
- Attach: A2-unit-camera; identity: existing unit_capacitor picture
- Covers registry: unit_capacitor, capacitor_1, capacitor_2, capacitor_3, capacitor_4, capacitor_5, capacitor_6
- Slicing: Sheet 3x2: segment by connected components (never fixed lines), expect 6 objects, row-major, key, despill, trim, pad 8%, square export.

```
3 columns by 2 rows sheet, canvas 1536x1024, equal cells, wide gutters, reading order left to right then top to bottom. Capacitor, a glowing blue cylinder with brass terminals. Ranks 1 to 6, each rank adds to the last: 1 small blue cylinder, cyan glow dot; 2 brass terminals; 3 taller cylinder; 4 twin cylinders; 5 cyan window with a fill glow; 6 crowned bank of three tubes with a small arc. Earlier parts keep size and place. Same camera, cream plate and outline as the unit_capacitor reference. Palette teal-blue, cyan, brass. The glow is an enamel shape with an outline. Flat magenta #FF00FF background.
```

**N08.4 `unit_ladder_ranks`** - sheet 3x2 | canvas 1536x1024 | key magenta | slice `sheet` | 99 words
- Raw file: `omm_units_unit_ladder_ranks_v01.png`  Outputs: `ladder_1`, `ladder_2`, `ladder_3`, `ladder_4`, `ladder_5`, `ladder_6`
- Attach: A2-unit-camera; identity: existing unit_ladder picture  | Depends on: redo unit_ladder
- Covers registry: unit_ladder, ladder_1, ladder_2, ladder_3, ladder_4, ladder_5, ladder_6
- Slicing: Sheet 3x2: segment by connected components (never fixed lines), expect 6 objects, row-major, key, despill, trim, pad 8%, square export.

```
3 columns by 2 rows sheet, canvas 1536x1024, equal cells, wide gutters, reading order left to right then top to bottom. Ladder, a toy ladder, brown-gold with brass caps. Ranks 1 to 6, each rank adds to the last: 1 two-step ladder; 2 brass rail caps; 3 three-step ladder; 4 platform on top; 5 red rails and gold rungs; 6 tall six-step ladder with a flag and crown. Earlier parts keep size and place. Same camera, cream plate and outline as the unit_ladder reference. Palette brown-gold, red, brass. No numbers or text on the steps. Flat magenta #FF00FF background.
```

**N08.5 `unit_blueprint_ranks`** - sheet 3x2 | canvas 1536x1024 | key magenta | slice `sheet` | 108 words
- Raw file: `omm_units_unit_blueprint_ranks_v01.png`  Outputs: `blueprint_1`, `blueprint_2`, `blueprint_3`, `blueprint_4`, `blueprint_5`, `blueprint_6`
- Attach: A2-unit-camera; identity: existing unit_blueprint picture
- Covers registry: unit_blueprint, blueprint_1, blueprint_2, blueprint_3, blueprint_4, blueprint_5, blueprint_6
- Slicing: Sheet 3x2: segment by connected components (never fixed lines), expect 6 objects, row-major, key, despill, trim, pad 8%, square export.

```
3 columns by 2 rows sheet, canvas 1536x1024, equal cells, wide gutters, reading order left to right then top to bottom. Blueprint, a blueprint scroll with a pencil. Ranks 1 to 6, each rank adds to the last: 1 rolled blue scroll; 2 brass end caps; 3 half-unrolled sheet with white grid lines; 4 pencil and compass beside it; 5 cobalt tube with gold bands; 6 large unrolled sheet on an easel with a crown stamp. Earlier parts keep size and place. Same camera, cream plate and outline as the unit_blueprint reference. Palette cobalt, cream, brass. No writing on the sheet: grid lines only. Flat magenta #FF00FF background.
```

**N08.6 `unit_rewind_crank_ranks`** - sheet 3x2 | canvas 1536x1024 | key magenta | slice `sheet` | 111 words
- Raw file: `omm_units_unit_rewind_crank_ranks_v01.png`  Outputs: `rewind_crank_1`, `rewind_crank_2`, `rewind_crank_3`, `rewind_crank_4`, `rewind_crank_5`, `rewind_crank_6`
- Attach: A2-unit-camera; identity: existing unit_rewind_crank picture
- Covers registry: unit_rewind_crank, rewind_crank_1, rewind_crank_2, rewind_crank_3, rewind_crank_4, rewind_crank_5, rewind_crank_6
- Slicing: Sheet 3x2: segment by connected components (never fixed lines), expect 6 objects, row-major, key, despill, trim, pad 8%, square export.

```
3 columns by 2 rows sheet, canvas 1536x1024, equal cells, wide gutters, reading order left to right then top to bottom. Rewind Crank, a hand crank on a box with a dial. Ranks 1 to 6, each rank adds to the last: 1 small crank on a box; 2 brass dial ring; 3 bigger handle; 4 violet reverse-arrow ring; 5 cobalt box with a gold clock face, no numbers; 6 large crank machine with a double dial and crown. Earlier parts keep size and place. Same camera, cream plate and outline as the unit_rewind_crank reference. Palette violet, cobalt, brass. Clock face has tick marks only, no numerals. Flat magenta #FF00FF background.
```

### N09 Units (6 prompts)

**N09.1 `unit_wrecking_ball_ranks`** - sheet 3x2 | canvas 1536x1024 | key magenta | slice `sheet` | 113 words
- Raw file: `omm_units_unit_wrecking_ball_ranks_v01.png`  Outputs: `wrecking_ball_1`, `wrecking_ball_2`, `wrecking_ball_3`, `wrecking_ball_4`, `wrecking_ball_5`, `wrecking_ball_6`
- Attach: A2-unit-camera; identity: existing unit_wrecking_ball picture  | Depends on: redo unit_wrecking_ball
- Covers registry: unit_wrecking_ball, wrecking_ball_1, wrecking_ball_2, wrecking_ball_3, wrecking_ball_4, wrecking_ball_5, wrecking_ball_6
- Slicing: Sheet 3x2: segment by connected components (never fixed lines), expect 6 objects, row-major, key, despill, trim, pad 8%, square export.

```
3 columns by 2 rows sheet, canvas 1536x1024, equal cells, wide gutters, reading order left to right then top to bottom. Wrecking Ball, a navy enamel ball on a chain hanging from a short arm. Ranks 1 to 6, each rank adds to the last: 1 small ball on a short chain; 2 brass bracket; 3 bigger ball; 4 longer chain, two arms; 5 orange stripe on the ball, cobalt arm; 6 giant ball with a crown of studs. Earlier parts keep size and place. Same camera, cream plate and outline as the unit_wrecking_ball reference. Palette navy, orange, brass. No raw grey steel: the ball is glossy navy enamel. Flat magenta #FF00FF background.
```

**N09.2 `unit_hydraulic_press_ranks`** - sheet 3x2 | canvas 1536x1024 | key magenta | slice `sheet` | 107 words
- Raw file: `omm_units_unit_hydraulic_press_ranks_v01.png`  Outputs: `hydraulic_press_1`, `hydraulic_press_2`, `hydraulic_press_3`, `hydraulic_press_4`, `hydraulic_press_5`, `hydraulic_press_6`
- Attach: A2-unit-camera; identity: existing unit_hydraulic_press picture
- Covers registry: unit_hydraulic_press, hydraulic_press_1, hydraulic_press_2, hydraulic_press_3, hydraulic_press_4, hydraulic_press_5, hydraulic_press_6
- Slicing: Sheet 3x2: segment by connected components (never fixed lines), expect 6 objects, row-major, key, despill, trim, pad 8%, square export.

```
3 columns by 2 rows sheet, canvas 1536x1024, equal cells, wide gutters, reading order left to right then top to bottom. Hydraulic Press, a blue press frame with a flat plate head. Ranks 1 to 6, each rank adds to the last: 1 small blue frame, short piston; 2 brass piston ring; 3 taller frame; 4 pressure gauge on the side; 5 red plate head and gold bolts; 6 giant press with twin pistons and a crown. Earlier parts keep size and place. Same camera, cream plate and outline as the unit_hydraulic_press reference. Palette blue, red, brass. Silhouette: wide and square, unlike Piston. Flat magenta #FF00FF background.
```

**N09.3 `unit_lathe_ranks`** - sheet 3x2 | canvas 1536x1024 | key magenta | slice `sheet` | 103 words
- Raw file: `omm_units_unit_lathe_ranks_v01.png`  Outputs: `lathe_1`, `lathe_2`, `lathe_3`, `lathe_4`, `lathe_5`, `lathe_6`
- Attach: A2-unit-camera; identity: existing unit_lathe picture  | Depends on: redo unit_lathe
- Covers registry: unit_lathe, lathe_1, lathe_2, lathe_3, lathe_4, lathe_5, lathe_6
- Slicing: Sheet 3x2: segment by connected components (never fixed lines), expect 6 objects, row-major, key, despill, trim, pad 8%, square export.

```
3 columns by 2 rows sheet, canvas 1536x1024, equal cells, wide gutters, reading order left to right then top to bottom. Lathe, a toy lathe with a big chuck and handwheel. Ranks 1 to 6, each rank adds to the last: 1 small chuck on a bed; 2 brass chuck jaws; 3 handwheel; 4 tailstock; 5 cobalt bed, gold tool rest, golden wood curl; 6 large lathe with a crowned chuck. Earlier parts keep size and place. Same camera, cream plate and outline as the unit_lathe reference. Palette olive-gold, cobalt, brass. Taller than wide, bold chuck, large parts only. Flat magenta #FF00FF background.
```

**N09.4 `unit_tesla_tower_ranks`** - sheet 3x2 | canvas 1536x1024 | key magenta | slice `sheet` | 103 words
- Raw file: `omm_units_unit_tesla_tower_ranks_v01.png`  Outputs: `tesla_tower_1`, `tesla_tower_2`, `tesla_tower_3`, `tesla_tower_4`, `tesla_tower_5`, `tesla_tower_6`
- Attach: A2-unit-camera; identity: existing unit_tesla_tower picture  | Depends on: redo unit_tesla_tower
- Covers registry: unit_tesla_tower, tesla_tower_1, tesla_tower_2, tesla_tower_3, tesla_tower_4, tesla_tower_5, tesla_tower_6
- Slicing: Sheet 3x2: segment by connected components (never fixed lines), expect 6 objects, row-major, key, despill, trim, pad 8%, square export.

```
3 columns by 2 rows sheet, canvas 1536x1024, equal cells, wide gutters, reading order left to right then top to bottom. Tesla Tower, a tall red tower with a brass sphere top. Ranks 1 to 6, each rank adds to the last: 1 short red tower, small brass sphere; 2 brass ring; 3 taller tower; 4 two side coils; 5 cyan arcs around the sphere; 6 giant crowned tower with three arcs. Earlier parts keep size and place. Same camera, cream plate and outline as the unit_tesla_tower reference. Palette red, brass, cyan arcs. Must not resemble: Spring or Coil. Flat magenta #FF00FF background.
```

**N09.5 `unit_robot_arm_ranks`** - sheet 3x2 | canvas 1536x1024 | key magenta | slice `sheet` | 99 words
- Raw file: `omm_units_unit_robot_arm_ranks_v01.png`  Outputs: `robot_arm_1`, `robot_arm_2`, `robot_arm_3`, `robot_arm_4`, `robot_arm_5`, `robot_arm_6`
- Attach: A2-unit-camera; identity: existing unit_robot_arm picture
- Covers registry: unit_robot_arm, robot_arm_1, robot_arm_2, robot_arm_3, robot_arm_4, robot_arm_5, robot_arm_6
- Slicing: Sheet 3x2: segment by connected components (never fixed lines), expect 6 objects, row-major, key, despill, trim, pad 8%, square export.

```
3 columns by 2 rows sheet, canvas 1536x1024, equal cells, wide gutters, reading order left to right then top to bottom. Robot Arm, a jointed yellow robot arm with a claw. Ranks 1 to 6, each rank adds to the last: 1 short one-joint arm; 2 brass claw tips; 3 two-joint arm; 4 rotating base disc; 5 cobalt body with gold bolts; 6 giant three-joint arm with a crown claw. Earlier parts keep size and place. Same camera, cream plate and outline as the unit_robot_arm reference. Palette yellow, cobalt, brass. Claw fingers fat and separated. Flat magenta #FF00FF background.
```

**N09.6 `unit_crane_ranks`** - sheet 3x2 | canvas 1536x1024 | key magenta | slice `sheet` | 104 words
- Raw file: `omm_units_unit_crane_ranks_v01.png`  Outputs: `crane_1`, `crane_2`, `crane_3`, `crane_4`, `crane_5`, `crane_6`
- Attach: A2-unit-camera; identity: existing unit_crane picture
- Covers registry: unit_crane, crane_1, crane_2, crane_3, crane_4, crane_5, crane_6
- Slicing: Sheet 3x2: segment by connected components (never fixed lines), expect 6 objects, row-major, key, despill, trim, pad 8%, square export.

```
3 columns by 2 rows sheet, canvas 1536x1024, equal cells, wide gutters, reading order left to right then top to bottom. Crane, a yellow crane with a hook. Ranks 1 to 6, each rank adds to the last: 1 short mast with a hook; 2 brass pulley; 3 taller lattice mast; 4 counterweight; 5 red cab and a gold hook; 6 tall crowned crane with a double hook. Earlier parts keep size and place. Same camera, cream plate and outline as the unit_crane reference. Palette yellow, red, brass. Lattice reduced to three fat cross-braces so it reads at 70 px. Flat magenta #FF00FF background.
```

### N10 Units + Power-ups + Monsters (6 prompts)

**N10.1 `unit_dynamo_ranks`** - sheet 3x2 | canvas 1536x1024 | key green | slice `sheet` | 105 words
- Raw file: `omm_units_unit_dynamo_ranks_v01.png`  Outputs: `dynamo_1`, `dynamo_2`, `dynamo_3`, `dynamo_4`, `dynamo_5`, `dynamo_6`
- Attach: A2-unit-camera; identity: existing unit_dynamo picture  | Depends on: redo unit_dynamo
- Covers registry: unit_dynamo, dynamo_1, dynamo_2, dynamo_3, dynamo_4, dynamo_5, dynamo_6
- Slicing: Sheet 3x2: segment by connected components (never fixed lines), expect 6 objects, row-major, key, despill, trim, pad 8%, square export.

```
3 columns by 2 rows sheet, canvas 1536x1024, equal cells, wide gutters, reading order left to right then top to bottom. Dynamo, a round dynamo on chunky feet with a big orange disc. Ranks 1 to 6, each rank adds to the last: 1 small dynamo on feet; 2 brass bearing caps; 3 bigger orange disc; 4 side coil windings; 5 cobalt housing with a gold ring; 6 twin giant dynamo with a crown halo. Earlier parts keep size and place. Same camera, cream plate and outline as the unit_dynamo reference. Palette orange, magenta accents, cobalt, brass. Cartoon enamel, not photoreal. Flat green #00FF00 background.
```

**N10.2 `unit_tilt_lever_ranks`** - sheet 3x2 | canvas 1536x1024 | key magenta | slice `sheet` | 109 words
- Raw file: `omm_units_unit_tilt_lever_ranks_v01.png`  Outputs: `tilt_lever_1`, `tilt_lever_2`, `tilt_lever_3`, `tilt_lever_4`, `tilt_lever_5`, `tilt_lever_6`
- Attach: A2-unit-camera; identity: existing unit_tilt_lever picture
- Covers registry: unit_tilt_lever, tilt_lever_1, tilt_lever_2, tilt_lever_3, tilt_lever_4, tilt_lever_5, tilt_lever_6
- Slicing: Sheet 3x2: segment by connected components (never fixed lines), expect 6 objects, row-major, key, despill, trim, pad 8%, square export.

```
3 columns by 2 rows sheet, canvas 1536x1024, equal cells, wide gutters, reading order left to right then top to bottom. Tilt Lever, a red lever on a plate. Ranks 1 to 6, each rank adds to the last: 1 short red lever on the plate; 2 brass pivot; 3 longer handle with a ball top; 4 tilt gauge arc on the base; 5 cobalt base and a gold ball; 6 giant lever with a crown and a double arc gauge. Earlier parts keep size and place. Same camera, cream plate and outline as the unit_tilt_lever reference. Palette red, cobalt, brass. Silhouette: single tall handle. Flat magenta #FF00FF background.
```

**N10.3 `workers_trio`** - sheet 3x1 | canvas 1536x1024 | key magenta | slice `sheet` | 70 words
- Raw file: `omm_units_workers_trio_v01.png`  Outputs: `worker_bell`, `worker_cannon`, `worker_coil`
- Attach: A1-style; identity: existing worker_* drafts
- Covers registry: worker_bell, worker_cannon, worker_coil
- Slicing: Sheet 3x1: segment by connected components (never fixed lines), expect 3 objects, row-major, key, despill, trim, pad 8%, square export.

```
3 columns by 1 rows sheet, canvas 1536x1024, equal cells, wide gutters, reading order left to right then top to bottom. Three tiny worker helpers, full body, 3/4 view, no plate: a brass-bell-headed worker in a gold apron; a cannon-barrel-headed worker with a red helmet; a coil-headed worker with cyan sparks. Chunky toy bodies, big hands, friendly dot eyes, hard hats. Equal height, same outline weight. Flat magenta #FF00FF background.
```

**N10.4 `tool_pieces`** - sheet 2x1 | canvas 1536x1024 | key magenta | slice `sheet` | 83 words
- Raw file: `omm_tools_tool_pieces_v01.png`  Outputs: `power_row_surge`, `power_gear_bomb`
- Attach: A2-unit-camera; identity: tool_gear_bomb_piece, tool_row_surge_piece
- Covers registry: power_row_surge, power_gear_bomb
- Slicing: Sheet 2x1: segment by connected components (never fixed lines), expect 2 objects, row-major, key, despill, trim, pad 8%, square export.

```
2 columns by 1 rows sheet, canvas 1536x1024, equal cells, wide gutters, reading order left to right then top to bottom. Two power-up board pieces on cream plates, same camera as the units. Left: ROW SURGE, a chevron roller with a bold orange arrow across it and five small glowing dots. Right: GEAR BOMB, a round red bomb with a brass gear cap and a short lit fuse. Each fills 75 percent of its cell, readable at 64 px. Flat magenta #FF00FF background.
```

**N10.5 `tool_icons_v2`** - sheet 3x1 | canvas 1536x1024 | key magenta | slice `sheet` | 74 words
- Raw file: `omm_tools_tool_icons_v2_v01.png`  Outputs: `tool_row_surge_icon_v3`, `tool_gear_bomb_icon_v3`, `tool_tray_slot_v3`
- Attach: A4-icon
- Slicing: Sheet 3x1: segment by connected components (never fixed lines), expect 3 objects, row-major, key, despill, trim, pad 8%, square export. Companion to redo tool_row_surge_icon; run after that redo is approved to keep the pair consistent.

```
3 columns by 1 rows sheet, canvas 1536x1024, equal cells, wide gutters, reading order left to right then top to bottom. Power-up UI, each on its own. Left: ROW SURGE icon, red porthole with five cells and one bold arrow. Middle: GEAR BOMB icon, red porthole with a gear-capped bomb. Right: empty brass tool tray slot, shallow rounded tray with a dark inset. Bold single ideas, readable at 48 px. Flat magenta #FF00FF background.
```

**N10.6 `monsters_anchor_damaged`** - sheet 3x1 | canvas 1536x1024 | key magenta | slice `sheet` | 72 words
- Raw file: `omm_monsters_monsters_anchor_damaged_v01.png`  Outputs: `mon_toolbox_terrier_dmg`, `mon_kettle_grump_dmg`, `mon_traffic_cone_goblin_dmg`
- Attach: A8-monster; monster_anchor_sheet approved  | Depends on: monster_anchor_sheet
- Covers registry: mon_toolbox_terrier, mon_toolbox_terrier_dmg, mon_kettle_grump, mon_kettle_grump_dmg, mon_traffic_cone_goblin, mon_traffic_cone_goblin_dmg
- Slicing: Sheet 3x1: segment by connected components (never fixed lines), expect 3 objects, row-major, key, despill, trim, pad 8%, square export.

```
3 columns by 1 rows sheet, canvas 1536x1024, equal cells, wide gutters, reading order left to right then top to bottom. The three approved anchor monsters (Toolbox Terrier, Kettle Grump, Traffic Cone Goblin) in their DAMAGED state: dented body, one eye cracked or dizzy, a bandage, drooping. Same size, outline, pose and placement as the approved healthy cells, so the two states can swap in code without shifting. Flat magenta #FF00FF background.
```

### N11 Monsters (6 prompts)

**N11.1 `monsters_accordion_imp_colander_clatter_gramophone_goose`** - sheet 3x2 | canvas 1536x1024 | key magenta | slice `sheet` | 101 words
- Raw file: `omm_monsters_monsters_accordion_imp_colander_clatter_gramophone_goose_v01.png`  Outputs: `mon_accordion_imp`, `mon_accordion_imp_dmg`, `mon_colander_clatter`, `mon_colander_clatter_dmg`, `mon_gramophone_goose`, `mon_gramophone_goose_dmg`
- Attach: A8-monster; identity: existing mon_* drafts  | Depends on: monster_anchor_sheet
- Covers registry: mon_accordion_imp, mon_accordion_imp_dmg, mon_colander_clatter, mon_colander_clatter_dmg, mon_gramophone_goose, mon_gramophone_goose_dmg
- Slicing: Sheet 3x2: segment by connected components (never fixed lines), expect 6 objects, row-major, key, despill, trim, pad 8%, square export.

```
3 columns by 2 rows sheet, canvas 1536x1024, equal cells, wide gutters, reading order left to right then top to bottom. 3 enemy monsters, three columns. Top row healthy, bottom row the same monster damaged (dented, one eye cracked, a bandage, same size and pose). Accordion Imp: a small imp whose belly is a red accordion with brass buttons. Colander Clatter: a walking steel colander helmet with spoon arms and loose bolts. Gramophone Goose: a goose with a brass gramophone horn for a beak. Same 3/4 view, all facing screen-left, readable expressive faces, distinct silhouettes, no plate. Flat magenta #FF00FF background.
```

**N11.2 `monsters_iron_duchess_joystick_jester_pixel_pug`** - sheet 3x2 | canvas 1536x1024 | key magenta | slice `sheet` | 95 words
- Raw file: `omm_monsters_monsters_iron_duchess_joystick_jester_pixel_pug_v01.png`  Outputs: `mon_iron_duchess`, `mon_iron_duchess_dmg`, `mon_joystick_jester`, `mon_joystick_jester_dmg`, `mon_pixel_pug`, `mon_pixel_pug_dmg`
- Attach: A8-monster; identity: existing mon_* drafts  | Depends on: monster_anchor_sheet
- Covers registry: mon_iron_duchess, mon_iron_duchess_dmg, mon_joystick_jester, mon_joystick_jester_dmg, mon_pixel_pug, mon_pixel_pug_dmg
- Slicing: Sheet 3x2: segment by connected components (never fixed lines), expect 6 objects, row-major, key, despill, trim, pad 8%, square export.

```
3 columns by 2 rows sheet, canvas 1536x1024, equal cells, wide gutters, reading order left to right then top to bottom. 3 enemy monsters, three columns. Top row healthy, bottom row the same monster damaged (dented, one eye cracked, a bandage, same size and pose). Iron Duchess: a haughty cast-iron stove duchess with a tiny crown. Joystick Jester: a jester with a bell hat and a joystick scepter. Pixel Pug: a pug built from chunky colored pixel cubes. Same 3/4 view, all facing screen-left, readable expressive faces, distinct silhouettes, no plate. Flat magenta #FF00FF background.
```

**N11.3 `monsters_pallet_pal_parcel_pup_sock_cyclops`** - sheet 3x2 | canvas 1536x1024 | key magenta | slice `sheet` | 91 words
- Raw file: `omm_monsters_monsters_pallet_pal_parcel_pup_sock_cyclops_v01.png`  Outputs: `mon_pallet_pal`, `mon_pallet_pal_dmg`, `mon_parcel_pup`, `mon_parcel_pup_dmg`, `mon_sock_cyclops`, `mon_sock_cyclops_dmg`
- Attach: A8-monster; identity: existing mon_* drafts  | Depends on: monster_anchor_sheet
- Covers registry: mon_pallet_pal, mon_pallet_pal_dmg, mon_parcel_pup, mon_parcel_pup_dmg, mon_sock_cyclops, mon_sock_cyclops_dmg
- Slicing: Sheet 3x2: segment by connected components (never fixed lines), expect 6 objects, row-major, key, despill, trim, pad 8%, square export.

```
3 columns by 2 rows sheet, canvas 1536x1024, equal cells, wide gutters, reading order left to right then top to bottom. 3 enemy monsters, three columns. Top row healthy, bottom row the same monster damaged (dented, one eye cracked, a bandage, same size and pose). Pallet Pal: a friendly wooden pallet with stubby legs and nail eyes. Parcel Pup: a cardboard parcel puppy with a tape collar. Sock Cyclops: a one-eyed striped sock monster. Same 3/4 view, all facing screen-left, readable expressive faces, distinct silhouettes, no plate. Flat magenta #FF00FF background.
```

**N11.4 `monsters_radar_rascal_satellite_scuttler`** - sheet 2x2 | canvas 1536x1024 | key magenta | slice `sheet` | 85 words
- Raw file: `omm_monsters_monsters_radar_rascal_satellite_scuttler_v01.png`  Outputs: `mon_radar_rascal`, `mon_radar_rascal_dmg`, `mon_satellite_scuttler`, `mon_satellite_scuttler_dmg`
- Attach: A8-monster; identity: existing mon_* drafts  | Depends on: monster_anchor_sheet
- Covers registry: mon_radar_rascal, mon_radar_rascal_dmg, mon_satellite_scuttler, mon_satellite_scuttler_dmg
- Slicing: Sheet 2x2: segment by connected components (never fixed lines), expect 4 objects, row-major, key, despill, trim, pad 8%, square export.

```
2 columns by 2 rows sheet, canvas 1536x1024, equal cells, wide gutters, reading order left to right then top to bottom. 2 enemy monsters, left and right columns. Top row healthy, bottom row the same monster damaged (dented, one eye cracked, a bandage, same size and pose). Radar Rascal: a rascal with a radar dish head and antenna ears. Satellite Scuttler: a crab-like satellite with two solar-panel claws. Same 3/4 view, all facing screen-left, readable expressive faces, distinct silhouettes, no plate. Flat magenta #FF00FF background.
```

**N11.5 `monsters_telescope_toad_wheelie_warthog`** - sheet 2x2 | canvas 1536x1024 | key magenta | slice `sheet` | 85 words
- Raw file: `omm_monsters_monsters_telescope_toad_wheelie_warthog_v01.png`  Outputs: `mon_telescope_toad`, `mon_telescope_toad_dmg`, `mon_wheelie_warthog`, `mon_wheelie_warthog_dmg`
- Attach: A8-monster; identity: existing mon_* drafts  | Depends on: monster_anchor_sheet
- Covers registry: mon_telescope_toad, mon_telescope_toad_dmg, mon_wheelie_warthog, mon_wheelie_warthog_dmg
- Slicing: Sheet 2x2: segment by connected components (never fixed lines), expect 4 objects, row-major, key, despill, trim, pad 8%, square export.

```
2 columns by 2 rows sheet, canvas 1536x1024, equal cells, wide gutters, reading order left to right then top to bottom. 2 enemy monsters, left and right columns. Top row healthy, bottom row the same monster damaged (dented, one eye cracked, a bandage, same size and pose). Telescope Toad: a toad with a telescope for one eye. Wheelie Warthog: a warthog on two chunky wheels with brass tusks. Same 3/4 view, all facing screen-left, readable expressive faces, distinct silhouettes, no plate. Flat magenta #FF00FF background.
```

**N11.6 `targets_0_2`** - sheet 3x2 | canvas 1536x1024 | key magenta | slice `sheet` | 66 words
- Raw file: `omm_monsters_targets_0_2_v01.png`  Outputs: `target_0`, `target_1`, `target_2`, `target_0_dmg`, `target_1_dmg`, `target_2_dmg`
- Attach: A8-monster; identity: existing target_0..2 drafts  | Depends on: monster_anchor_sheet
- Covers registry: target_0, target_0_dmg, target_1, target_1_dmg, target_2, target_2_dmg
- Slicing: Sheet 3x2: segment by connected components (never fixed lines), expect 6 objects, row-major, key, despill, trim, pad 8%, square export.

```
3 columns by 2 rows sheet, canvas 1536x1024, equal cells, wide gutters, reading order left to right then top to bottom. Three chapter target monsters from the attached target_0, target_1 and target_2 drafts, keeping each identity but restyled to our current look. Top row healthy, bottom row the same monster damaged (dented, cracked eye, same pose and size). Facing screen-left, no plate. Flat magenta #FF00FF background.
```

### N12 Monsters + Bosses (6 prompts)

**N12.1 `targets_3_5`** - sheet 3x2 | canvas 1536x1024 | key magenta | slice `sheet` | 66 words
- Raw file: `omm_monsters_targets_3_5_v01.png`  Outputs: `target_3`, `target_4`, `target_5`, `target_3_dmg`, `target_4_dmg`, `target_5_dmg`
- Attach: A8-monster; identity: existing target_3..5 drafts  | Depends on: monster_anchor_sheet
- Covers registry: target_3, target_3_dmg, target_4, target_4_dmg, target_5, target_5_dmg
- Slicing: Sheet 3x2: segment by connected components (never fixed lines), expect 6 objects, row-major, key, despill, trim, pad 8%, square export.

```
3 columns by 2 rows sheet, canvas 1536x1024, equal cells, wide gutters, reading order left to right then top to bottom. Three chapter target monsters from the attached target_3, target_4 and target_5 drafts, keeping each identity but restyled to our current look. Top row healthy, bottom row the same monster damaged (dented, cracked eye, same pose and size). Facing screen-left, no plate. Flat magenta #FF00FF background.
```

**N12.2 `remix_targets`** - sheet 3x2 | canvas 1536x1024 | key magenta | slice `sheet` | 76 words
- Raw file: `omm_monsters_remix_targets_v01.png`  Outputs: `tg_cell`, `tg_piano`, `tg_twins`, `tg_vacuum`, `demo_can`, `target_plate_blank`
- Attach: A4-icon; identity: existing tg_* and demo_can drafts
- Covers registry: tg_cell, tg_piano, tg_twins, tg_vacuum, demo_can
- Slicing: Sheet 3x2: segment by connected components (never fixed lines), expect 6 objects, row-major, key, despill, trim, pad 8%, square export.

```
3 columns by 2 rows sheet, canvas 1536x1024, equal cells, wide gutters, reading order left to right then top to bottom. Six pieces. In order: cell marker (a cream cell with a red target ring); upright piano silhouette; twin duplicate machines side by side; vacuum cleaner with a suction cone; plain tin can used as the tutorial dummy target; empty round target plate. Chunky, one bold idea each, readable at 64 px. Flat magenta #FF00FF background.
```

**N12.3 `target_faces`** - sheet 3x3 | canvas 1536x1024 | key magenta | slice `sheet` | 76 words
- Raw file: `omm_monsters_target_faces_v01.png`  Outputs: `face_0_angry`, `face_0_dizzy`, `face_0_hit`, `face_1_angry`, `face_1_dizzy`, `face_1_hit`, `face_2_angry`, `face_2_dizzy`, `face_2_hit`
- Attach: A8-monster; identity: existing face_* drafts
- Covers registry: face_0_angry, face_0_dizzy, face_0_hit, face_1_angry, face_1_dizzy, face_1_hit, face_2_angry, face_2_dizzy, face_2_hit
- Slicing: Sheet 3x3: segment by connected components (never fixed lines), expect 9 objects, row-major, key, despill, trim, pad 8%, square export.

```
3 columns by 3 rows sheet, canvas 1536x1024, equal cells, wide gutters, reading order left to right then top to bottom. Nine monster face overlays, three face sizes by row (small, medium, large) and three expressions by column: angry, dizzy with spiral eyes, hit with squeezed eyes and a wobbly mouth. Just the eyes, brows and mouth on a flat cream oval mask, thick outline, same placement in every cell, no body. Flat magenta #FF00FF background.
```

**N12.4 `boss_brick_printer`** - single | canvas 1024x1024 | key magenta | slice `single` | 65 words
- Raw file: `omm_bosses_boss_brick_printer_v01.png`  Outputs: `boss_brick_printer`, `boss_brick_printer_dmg`
- Attach: A8-monster; identity: trophy_brick_printer draft  | Depends on: monster_anchor_sheet
- Slicing: Single image: key, despill, 1 px erode, trim to bbox, pad 8%, keep the aspect (square canvas only for objects and icons). Needs two Hub rows (boss_<id>, boss_<id>_dmg); damaged state is made with the FIX line from the approved image, not a new generation.

```
Single image, canvas 1024x1024. Brick Printer, a boss: a giant 3D brick printer with a stacking nozzle arm and a half-built wall in its belly. Oversized upper-body mass, one iconic feature, readable angry face, full body, facing screen-left in the same 3/4 view as the approved Rivet Rhino. Fills 85 percent of the canvas. Palette from the trophy draft. No plate. Flat magenta #FF00FF background.
```

**N12.5 `boss_carousel_crab`** - single | canvas 1024x1024 | key magenta | slice `single` | 61 words
- Raw file: `omm_bosses_boss_carousel_crab_v01.png`  Outputs: `boss_carousel_crab`, `boss_carousel_crab_dmg`
- Attach: A8-monster; identity: trophy_carousel_crab draft  | Depends on: monster_anchor_sheet
- Slicing: Single image: key, despill, 1 px erode, trim to bbox, pad 8%, keep the aspect (square canvas only for objects and icons). Needs two Hub rows (boss_<id>, boss_<id>_dmg); damaged state is made with the FIX line from the approved image, not a new generation.

```
Single image, canvas 1024x1024. Carousel Crab, a boss: a crab whose shell is a carousel with tiny horses, brass pole claws. Oversized upper-body mass, one iconic feature, readable angry face, full body, facing screen-left in the same 3/4 view as the approved Rivet Rhino. Fills 85 percent of the canvas. Palette from the trophy draft. No plate. Flat magenta #FF00FF background.
```

**N12.6 `boss_chrono_chimera`** - single | canvas 1024x1024 | key magenta | slice `single` | 61 words
- Raw file: `omm_bosses_boss_chrono_chimera_v01.png`  Outputs: `boss_chrono_chimera`, `boss_chrono_chimera_dmg`
- Attach: A8-monster; identity: trophy_chrono_chimera draft  | Depends on: monster_anchor_sheet
- Slicing: Single image: key, despill, 1 px erode, trim to bbox, pad 8%, keep the aspect (square canvas only for objects and icons). Needs two Hub rows (boss_<id>, boss_<id>_dmg); damaged state is made with the FIX line from the approved image, not a new generation.

```
Single image, canvas 1024x1024. Chrono Chimera, a boss: a lion-goat-snake chimera with a clock face on its chest and gear mane. Oversized upper-body mass, one iconic feature, readable angry face, full body, facing screen-left in the same 3/4 view as the approved Rivet Rhino. Fills 85 percent of the canvas. Palette from the trophy draft. No plate. Flat magenta #FF00FF background.
```

### N13 Bosses (6 prompts)

**N13.1 `boss_fridge_overlord`** - single | canvas 1024x1024 | key magenta | slice `single` | 61 words
- Raw file: `omm_bosses_boss_fridge_overlord_v01.png`  Outputs: `boss_fridge_overlord`, `boss_fridge_overlord_dmg`
- Attach: A8-monster; identity: trophy_fridge_overlord draft  | Depends on: monster_anchor_sheet
- Slicing: Single image: key, despill, 1 px erode, trim to bbox, pad 8%, keep the aspect (square canvas only for objects and icons). Needs two Hub rows (boss_<id>, boss_<id>_dmg); damaged state is made with the FIX line from the approved image, not a new generation.

```
Single image, canvas 1024x1024. Fridge Overlord, a boss: a tyrant fridge with an ice crown, door swung open like a cape. Oversized upper-body mass, one iconic feature, readable angry face, full body, facing screen-left in the same 3/4 view as the approved Rivet Rhino. Fills 85 percent of the canvas. Palette from the trophy draft. No plate. Flat magenta #FF00FF background.
```

**N13.2 `boss_junkzilla`** - single | canvas 1024x1024 | key magenta | slice `single` | 59 words
- Raw file: `omm_bosses_boss_junkzilla_v01.png`  Outputs: `boss_junkzilla`, `boss_junkzilla_dmg`
- Attach: A8-monster; identity: trophy_junkzilla draft  | Depends on: monster_anchor_sheet
- Slicing: Single image: key, despill, 1 px erode, trim to bbox, pad 8%, keep the aspect (square canvas only for objects and icons). Needs two Hub rows (boss_<id>, boss_<id>_dmg); damaged state is made with the FIX line from the approved image, not a new generation.

```
Single image, canvas 1024x1024. Junkzilla, a boss: a lizard built from piled junk, bent pipes and a tire tail. Oversized upper-body mass, one iconic feature, readable angry face, full body, facing screen-left in the same 3/4 view as the approved Rivet Rhino. Fills 85 percent of the canvas. Palette from the trophy draft. No plate. Flat magenta #FF00FF background.
```

**N13.3 `boss_oil_otter`** - single | canvas 1024x1024 | key magenta | slice `single` | 59 words
- Raw file: `omm_bosses_boss_oil_otter_v01.png`  Outputs: `boss_oil_otter`, `boss_oil_otter_dmg`
- Attach: A8-monster; identity: trophy_oil_otter draft  | Depends on: monster_anchor_sheet
- Slicing: Single image: key, despill, 1 px erode, trim to bbox, pad 8%, keep the aspect (square canvas only for objects and icons). Needs two Hub rows (boss_<id>, boss_<id>_dmg); damaged state is made with the FIX line from the approved image, not a new generation.

```
Single image, canvas 1024x1024. Oil Otter, a boss: an otter shaped from an oil can, glossy black-and-amber, slick grin. Oversized upper-body mass, one iconic feature, readable angry face, full body, facing screen-left in the same 3/4 view as the approved Rivet Rhino. Fills 85 percent of the canvas. Palette from the trophy draft. No plate. Flat magenta #FF00FF background.
```

**N13.4 `boss_piano_saurus_rex`** - single | canvas 1024x1024 | key magenta | slice `single` | 58 words
- Raw file: `omm_bosses_boss_piano_saurus_rex_v01.png`  Outputs: `boss_piano_saurus_rex`, `boss_piano_saurus_rex_dmg`
- Attach: A8-monster; identity: trophy_piano_saurus_rex draft  | Depends on: monster_anchor_sheet
- Slicing: Single image: key, despill, 1 px erode, trim to bbox, pad 8%, keep the aspect (square canvas only for objects and icons). Needs two Hub rows (boss_<id>, boss_<id>_dmg); damaged state is made with the FIX line from the approved image, not a new generation.

```
Single image, canvas 1024x1024. Piano-saurus Rex, a boss: a dinosaur with piano-key teeth and a grand-piano lid back. Oversized upper-body mass, one iconic feature, readable angry face, full body, facing screen-left in the same 3/4 view as the approved Rivet Rhino. Fills 85 percent of the canvas. Palette from the trophy draft. No plate. Flat magenta #FF00FF background.
```

**N13.5 `boss_portal_possum`** - single | canvas 1024x1024 | key magenta | slice `single` | 59 words
- Raw file: `omm_bosses_boss_portal_possum_v01.png`  Outputs: `boss_portal_possum`, `boss_portal_possum_dmg`
- Attach: A8-monster; identity: trophy_portal_possum draft  | Depends on: monster_anchor_sheet
- Slicing: Single image: key, despill, 1 px erode, trim to bbox, pad 8%, keep the aspect (square canvas only for objects and icons). Needs two Hub rows (boss_<id>, boss_<id>_dmg); damaged state is made with the FIX line from the approved image, not a new generation.

```
Single image, canvas 1024x1024. Portal Possum, a boss: a possum carrying a swirling violet portal ring on its back. Oversized upper-body mass, one iconic feature, readable angry face, full body, facing screen-left in the same 3/4 view as the approved Rivet Rhino. Fills 85 percent of the canvas. Palette from the trophy draft. No plate. Flat magenta #FF00FF background.
```

**N13.6 `boss_pressure_popper`** - single | canvas 1024x1024 | key magenta | slice `single` | 61 words
- Raw file: `omm_bosses_boss_pressure_popper_v01.png`  Outputs: `boss_pressure_popper`, `boss_pressure_popper_dmg`
- Attach: A8-monster; identity: trophy_pressure_popper draft  | Depends on: monster_anchor_sheet
- Slicing: Single image: key, despill, 1 px erode, trim to bbox, pad 8%, keep the aspect (square canvas only for objects and icons). Needs two Hub rows (boss_<id>, boss_<id>_dmg); damaged state is made with the FIX line from the approved image, not a new generation.

```
Single image, canvas 1024x1024. Pressure Popper, a boss: a round pressure cooker with a rattling valve and a red gauge face. Oversized upper-body mass, one iconic feature, readable angry face, full body, facing screen-left in the same 3/4 view as the approved Rivet Rhino. Fills 85 percent of the canvas. Palette from the trophy draft. No plate. Flat magenta #FF00FF background.
```

### N14 Bosses (6 prompts)

**N14.1 `boss_scrap_kraken`** - single | canvas 1024x1024 | key magenta | slice `single` | 61 words
- Raw file: `omm_bosses_boss_scrap_kraken_v01.png`  Outputs: `boss_scrap_kraken`, `boss_scrap_kraken_dmg`
- Attach: A8-monster; identity: trophy_scrap_kraken draft  | Depends on: monster_anchor_sheet
- Slicing: Single image: key, despill, 1 px erode, trim to bbox, pad 8%, keep the aspect (square canvas only for objects and icons). Needs two Hub rows (boss_<id>, boss_<id>_dmg); damaged state is made with the FIX line from the approved image, not a new generation.

```
Single image, canvas 1024x1024. Scrap Kraken, a boss: a kraken with tentacles of scrap pipe and hose, one big lamp eye. Oversized upper-body mass, one iconic feature, readable angry face, full body, facing screen-left in the same 3/4 view as the approved Rivet Rhino. Fills 85 percent of the canvas. Palette from the trophy draft. No plate. Flat magenta #FF00FF background.
```

**N14.2 `boss_spring_jack`** - single | canvas 1024x1024 | key magenta | slice `single` | 59 words
- Raw file: `omm_bosses_boss_spring_jack_v01.png`  Outputs: `boss_spring_jack`, `boss_spring_jack_dmg`
- Attach: A8-monster; identity: trophy_spring_jack draft  | Depends on: monster_anchor_sheet
- Slicing: Single image: key, despill, 1 px erode, trim to bbox, pad 8%, keep the aspect (square canvas only for objects and icons). Needs two Hub rows (boss_<id>, boss_<id>_dmg); damaged state is made with the FIX line from the approved image, not a new generation.

```
Single image, canvas 1024x1024. Spring Jack, a boss: a jack-in-the-box on a giant coil spring, lid as a hat. Oversized upper-body mass, one iconic feature, readable angry face, full body, facing screen-left in the same 3/4 view as the approved Rivet Rhino. Fills 85 percent of the canvas. Palette from the trophy draft. No plate. Flat magenta #FF00FF background.
```

**N14.3 `boss_tin_can_king`** - single | canvas 1024x1024 | key magenta | slice `single` | 63 words
- Raw file: `omm_bosses_boss_tin_can_king_v01.png`  Outputs: `boss_tin_can_king`, `boss_tin_can_king_dmg`
- Attach: A8-monster; identity: trophy_tin_can_king draft  | Depends on: monster_anchor_sheet
- Slicing: Single image: key, despill, 1 px erode, trim to bbox, pad 8%, keep the aspect (square canvas only for objects and icons). Needs two Hub rows (boss_<id>, boss_<id>_dmg); damaged state is made with the FIX line from the approved image, not a new generation.

```
Single image, canvas 1024x1024. Tin Can King, a boss: a tin can wearing a brass crown with a stern face and label-less body. Oversized upper-body mass, one iconic feature, readable angry face, full body, facing screen-left in the same 3/4 view as the approved Rivet Rhino. Fills 85 percent of the canvas. Palette from the trophy draft. No plate. Flat magenta #FF00FF background.
```

**N14.4 `boss_twin_toasters`** - single | canvas 1024x1024 | key magenta | slice `single` | 59 words
- Raw file: `omm_bosses_boss_twin_toasters_v01.png`  Outputs: `boss_twin_toasters`, `boss_twin_toasters_dmg`
- Attach: A8-monster; identity: trophy_twin_toasters draft  | Depends on: monster_anchor_sheet
- Slicing: Single image: key, despill, 1 px erode, trim to bbox, pad 8%, keep the aspect (square canvas only for objects and icons). Needs two Hub rows (boss_<id>, boss_<id>_dmg); damaged state is made with the FIX line from the approved image, not a new generation.

```
Single image, canvas 1024x1024. Twin Toasters, a boss: two bickering toasters joined at the side, toast popping from each. Oversized upper-body mass, one iconic feature, readable angry face, full body, facing screen-left in the same 3/4 view as the approved Rivet Rhino. Fills 85 percent of the canvas. Palette from the trophy draft. No plate. Flat magenta #FF00FF background.
```

**N14.5 `boss_vanity_moth`** - single | canvas 1024x1024 | key magenta | slice `single` | 57 words
- Raw file: `omm_bosses_boss_vanity_moth_v01.png`  Outputs: `boss_vanity_moth`, `boss_vanity_moth_dmg`
- Attach: A8-monster; identity: trophy_vanity_moth draft  | Depends on: monster_anchor_sheet
- Slicing: Single image: key, despill, 1 px erode, trim to bbox, pad 8%, keep the aspect (square canvas only for objects and icons). Needs two Hub rows (boss_<id>, boss_<id>_dmg); damaged state is made with the FIX line from the approved image, not a new generation.

```
Single image, canvas 1024x1024. Vanity Moth, a boss: a moth whose wings are two ornate hand mirrors. Oversized upper-body mass, one iconic feature, readable angry face, full body, facing screen-left in the same 3/4 view as the approved Rivet Rhino. Fills 85 percent of the canvas. Palette from the trophy draft. No plate. Flat magenta #FF00FF background.
```

**N14.6 `boss_viper_queen`** - single | canvas 1024x1024 | key magenta | slice `single` | 59 words
- Raw file: `omm_bosses_boss_viper_queen_v01.png`  Outputs: `boss_viper_queen`, `boss_viper_queen_dmg`
- Attach: A8-monster; identity: trophy_viper_queen draft  | Depends on: monster_anchor_sheet
- Slicing: Single image: key, despill, 1 px erode, trim to bbox, pad 8%, keep the aspect (square canvas only for objects and icons). Needs two Hub rows (boss_<id>, boss_<id>_dmg); damaged state is made with the FIX line from the approved image, not a new generation.

```
Single image, canvas 1024x1024. Viper Queen, a boss: a cobra of coiled cable with a tiara and a plug-tail. Oversized upper-body mass, one iconic feature, readable angry face, full body, facing screen-left in the same 3/4 view as the approved Rivet Rhino. Fills 85 percent of the canvas. Palette from the trophy draft. No plate. Flat magenta #FF00FF background.
```

### N15 Bosses + Rewards (6 prompts)

**N15.1 `boss_states_rhino`** - sheet 3x2 | canvas 1536x1024 | key magenta | slice `sheet` | 79 words
- Raw file: `omm_bosses_boss_states_rhino_v01.png`  Outputs: `boss_rivet_rhino_idle`, `boss_rivet_rhino_anticipate`, `boss_rivet_rhino_attack`, `boss_rivet_rhino_hit`, `boss_rivet_rhino_enraged`, `boss_rivet_rhino_defeated`
- Attach: A8-monster; boss_rivet_rhino approved  | Depends on: monster_anchor_sheet
- Slicing: Sheet 3x2: segment by connected components (never fixed lines), expect 6 objects, row-major, key, despill, trim, pad 8%, square export. Template for the other 15 bosses: run after the whole boss set is approved.

```
3 columns by 2 rows sheet, canvas 1536x1024, equal cells, wide gutters, reading order left to right then top to bottom. The approved Rivet Rhino boss in six states, same size and feet position in every cell: idle; anticipation crouch with head lowered; attack lunge with the brass horn forward; hit recoil with squinting eyes; enraged with red eyes and steam from the nostrils; defeated, collapsed with a dizzy face. Same parts, colors and outline. Flat magenta #FF00FF background.
```

**N15.2 `trophies_1`** - sheet 3x2 | canvas 1536x1024 | key magenta | slice `sheet` | 66 words
- Raw file: `omm_rewards_trophies_1_v01.png`  Outputs: `trophy_brick_printer`, `trophy_carousel_crab`, `trophy_chrono_chimera`, `trophy_fridge_overlord`, `trophy_junkzilla`, `trophy_oil_otter`
- Attach: A1-style; identity: existing trophy_* drafts
- Covers registry: trophy_brick_printer, trophy_carousel_crab, trophy_chrono_chimera, trophy_fridge_overlord, trophy_junkzilla, trophy_oil_otter
- Slicing: Sheet 3x2: segment by connected components (never fixed lines), expect 6 objects, row-major, key, despill, trim, pad 8%, square export.

```
3 columns by 2 rows sheet, canvas 1536x1024, equal cells, wide gutters, reading order left to right then top to bottom. Six boss trophies, one per cell, each a small statuette on a round cream-and-brass pedestal: Brick Printer, Carousel Crab, Chrono Chimera, Fridge Overlord, Junkzilla, Oil Otter. Each is the boss in miniature, chunky, one color accent each, same pedestal, same size. Flat magenta #FF00FF background.
```

**N15.3 `trophies_2`** - sheet 3x2 | canvas 1536x1024 | key magenta | slice `sheet` | 65 words
- Raw file: `omm_rewards_trophies_2_v01.png`  Outputs: `trophy_piano_saurus_rex`, `trophy_portal_possum`, `trophy_pressure_popper`, `trophy_rivet_rhino`, `trophy_scrap_kraken`, `trophy_spring_jack`
- Attach: A1-style; trophies_1 approved  | Depends on: trophies_1
- Covers registry: trophy_piano_saurus_rex, trophy_portal_possum, trophy_pressure_popper, trophy_rivet_rhino, trophy_scrap_kraken, trophy_spring_jack
- Slicing: Sheet 3x2: segment by connected components (never fixed lines), expect 6 objects, row-major, key, despill, trim, pad 8%, square export.

```
3 columns by 2 rows sheet, canvas 1536x1024, equal cells, wide gutters, reading order left to right then top to bottom. Six boss trophies in the same pedestal style as the approved first sheet: Piano-saurus Rex, Portal Possum, Pressure Popper, Rivet Rhino, Scrap Kraken, Spring Jack. Boss in miniature on a round cream-and-brass pedestal, chunky, one accent color each, equal size. Flat magenta #FF00FF background.
```

**N15.4 `trophies_3`** - sheet 2x2 | canvas 1536x1024 | key magenta | slice `sheet` | 62 words
- Raw file: `omm_rewards_trophies_3_v01.png`  Outputs: `trophy_tin_can_king`, `trophy_twin_toasters`, `trophy_vanity_moth`, `trophy_viper_queen`
- Attach: A1-style; trophies_1 approved  | Depends on: trophies_1
- Covers registry: trophy_tin_can_king, trophy_twin_toasters, trophy_vanity_moth, trophy_viper_queen
- Slicing: Sheet 2x2: segment by connected components (never fixed lines), expect 4 objects, row-major, key, despill, trim, pad 8%, square export.

```
2 columns by 2 rows sheet, canvas 1536x1024, equal cells, wide gutters, reading order left to right then top to bottom. Four boss trophies in the same pedestal style as the approved first sheet: Tin Can King, Twin Toasters, Vanity Moth, Viper Queen. Boss in miniature on a round cream-and-brass pedestal, chunky, one accent color each, equal size. Flat magenta #FF00FF background.
```

**N15.5 `boss_attack_tags_1`** - sheet 4x2 | canvas 1536x1024 | key magenta | slice `sheet` | 91 words
- Raw file: `omm_bosses_boss_attack_tags_1_v01.png`  Outputs: `btg_blocks`, `btg_bomb`, `btg_bounce`, `btg_clamp`, `btg_conveyor`, `btg_frost`, `btg_heat`, `btg_mirror`
- Attach: A4-icon; identity: existing btg_* drafts
- Covers registry: btg_blocks, btg_bomb, btg_bounce, btg_clamp, btg_conveyor, btg_frost, btg_heat, btg_mirror
- Slicing: Sheet 4x2: segment by connected components (never fixed lines), expect 8 objects, row-major, key, despill, trim, pad 8%, square export.

```
4 columns by 2 rows sheet, canvas 1536x1024, equal cells, wide gutters, reading order left to right then top to bottom. Eight round boss-attack tag icons on identical red-brass portholes, one bold glyph each, all different silhouettes. In order: blocks (stacked junk blocks); bomb (round lit bomb); bounce (bouncing ball with motion arc); clamp (two jaws closing); conveyor (belt with chevrons); frost (snowflake crystal); heat (flame over a hot plate); mirror (hand mirror with a reflection streak). Glyph in cream, face color red-orange, readable at 40 px. Flat magenta #FF00FF background.
```

**N15.6 `boss_attack_tags_2`** - sheet 4x2 | canvas 1536x1024 | key magenta | slice `sheet` | 100 words
- Raw file: `omm_bosses_boss_attack_tags_2_v01.png`  Outputs: `btg_portals`, `btg_pull`, `btg_ransom`, `btg_rest`, `btg_slick`, `btg_split`, `btg_suction`, `btg_tow`
- Attach: A4-icon; identity: existing btg_* drafts
- Covers registry: btg_portals, btg_pull, btg_ransom, btg_rest, btg_slick, btg_split, btg_suction, btg_tow
- Slicing: Sheet 4x2: segment by connected components (never fixed lines), expect 8 objects, row-major, key, despill, trim, pad 8%, square export.

```
4 columns by 2 rows sheet, canvas 1536x1024, equal cells, wide gutters, reading order left to right then top to bottom. Eight round boss-attack tag icons on identical red-brass portholes, one bold glyph each, all different silhouettes. In order: portals (two linked swirl rings); pull (hand-hook pulling an arrow inward); ransom (padlock chained to a coin); rest (sleepy moon and a pillow); slick (oil drop with a skid arrow); split (one orb splitting in two); suction (funnel pulling arrows in); tow (tow hook with a rope). Glyph in cream, face color red-orange, readable at 40 px. Flat magenta #FF00FF background.
```

### N16 Board + UI kit + Icons (6 prompts)

**N16.1 `dice_ranks`** - sheet 4x2 | canvas 1536x1024 | key magenta | slice `sheet` | 71 words
- Raw file: `omm_board_dice_ranks_v01.png`  Outputs: `dice_1`, `dice_2`, `dice_3`, `dice_4`, `dice_5`, `dice_6`, `dice_7`, `dice_8`
- Attach: A4-icon; identity: existing dice_* drafts
- Covers registry: dice_1, dice_2, dice_3, dice_4, dice_5, dice_6, dice_7, dice_8
- Slicing: Sheet 4x2: segment by connected components (never fixed lines), expect 8 objects, row-major, key, despill, trim, pad 8%, square export.

```
4 columns by 2 rows sheet, canvas 1536x1024, equal cells, wide gutters, reading order left to right then top to bottom. Eight rank badges as cream dice faces with 1 to 8 round red pips (pips only, no digits), brass corner brackets, rounded square, same size and outline. Pip counts must be exact and evenly laid out. Rank 8 gets a thin gold ring around the face. Flat magenta #FF00FF background.
```

**N16.2 `kickback_a`** - sheet 3x2 | canvas 1536x1024 | key magenta | slice `sheet` | 81 words
- Raw file: `omm_board_kickback_a_v01.png`  Outputs: `kick_0_0`, `kick_1_0`, `kick_2_0`, `kick_0_1`, `kick_1_1`, `kick_2_1`
- Attach: A7-board; identity: existing kick_0..2 drafts
- Covers registry: kick_0_0, kick_0_1, kick_1_0, kick_1_1, kick_2_0, kick_2_1
- Slicing: Sheet 3x2: segment by connected components (never fixed lines), expect 6 objects, row-major, key, despill, trim, pad 8%, square export.

```
3 columns by 2 rows sheet, canvas 1536x1024, equal cells, wide gutters, reading order left to right then top to bottom. Six junk pieces a monster throws onto the board, one per cell, three themes in columns and two variants in rows: monster 0 tin scraps, monster 1 kitchen junk, monster 2 cracked electronics. Dull desaturated junk on a brown cardboard tile (not a cream plate), clearly junk and not a machine, chunky, readable at 64 px. Flat magenta #FF00FF background.
```

**N16.3 `kickback_b`** - sheet 3x2 | canvas 1536x1024 | key magenta | slice `sheet` | 80 words
- Raw file: `omm_board_kickback_b_v01.png`  Outputs: `kick_3_0`, `kick_4_0`, `kick_5_0`, `kick_3_1`, `kick_4_1`, `kick_5_1`
- Attach: A7-board; identity: existing kick_3..5 drafts
- Covers registry: kick_3_0, kick_3_1, kick_4_0, kick_4_1, kick_5_0, kick_5_1
- Slicing: Sheet 3x2: segment by connected components (never fixed lines), expect 6 objects, row-major, key, despill, trim, pad 8%, square export.

```
3 columns by 2 rows sheet, canvas 1536x1024, equal cells, wide gutters, reading order left to right then top to bottom. Six junk pieces a monster throws onto the board, three themes in columns and two variants in rows: monster 3 bent tools and bolts, monster 4 broken toys, monster 5 office clutter. Dull desaturated junk on a brown cardboard tile (not a cream plate), clearly junk and not a machine, chunky, readable at 64 px. Flat magenta #FF00FF background.
```

**N16.4 `kickback_sticker`** - sheet 2x1 | canvas 1536x1024 | key magenta | slice `sheet` | 67 words
- Raw file: `omm_board_kickback_sticker_v01.png`  Outputs: `sticker_kickback`, `sticker_kickback_landed`
- Attach: A4-icon
- Covers registry: sticker_kickback
- Slicing: Sheet 2x1: segment by connected components (never fixed lines), expect 2 objects, row-major, key, despill, trim, pad 8%, square export.

```
2 columns by 1 rows sheet, canvas 1536x1024, equal cells, wide gutters, reading order left to right then top to bottom. Two cell stickers. Left: warning tag for an incoming junk piece, orange diamond with a downward chevron and a drop shadow. Right: the landed stamp, a cracked orange ring with debris. Flat, bold, no text, each fills 70 percent of its cell. Flat magenta #FF00FF background.
```

**N16.5 `card_frames`** - sheet 3x2 | canvas 1536x1024 | key magenta | slice `sheet` | 94 words
- Raw file: `omm_ui_card_frames_v01.png`  Outputs: `card_common`, `card_rare`, `card_epic`, `card_legendary`, `card_locked`, `card_new`
- Attach: A3-button; A10-ui
- Covers registry: card, card_common, card_rare, card_epic
- Slicing: Sheet 3x2: segment by connected components (never fixed lines), expect 6 objects, row-major, key, despill, trim, pad 8%, square export. GPT top-25 #16.

```
3 columns by 2 rows sheet, canvas 1536x1024, equal cells, wide gutters, reading order left to right then top to bottom. Six empty portrait collection card frames, 4:5, front-facing, empty center and a blank name plate at the bottom. In order: common steel-cream; rare blue enamel with a brass rim; epic violet with a brass rim; legendary gold with a crown notch and subtle ray corners; locked charcoal with a padlock plate; NEW cream with a red corner sash (no text). Tier changes the frame silhouette, not only the color. Flat magenta #FF00FF background.
```

**N16.6 `job_icons_1`** - sheet 3x3 | canvas 1536x1024 | key magenta | slice `sheet` | 79 words
- Raw file: `omm_icons_job_icons_1_v01.png`  Outputs: `job_nail_gun`, `job_jackhammer`, `job_gear`, `job_saw_blade`, `job_wrench`, `job_piston`, `job_spring`, `job_belt_drive`, `job_blowtorch`
- Attach: A4-icon; identity: existing job_* and unit pictures
- Covers registry: job_nail_gun, job_jackhammer, job_gear, job_saw_blade, job_wrench, job_piston, job_spring, job_belt_drive, job_blowtorch
- Slicing: Sheet 3x3: segment by connected components (never fixed lines), expect 9 objects, row-major, key, despill, trim, pad 8%, square export.

```
3 columns by 3 rows sheet, canvas 1536x1024, equal cells, wide gutters, reading order left to right then top to bottom. 9 round job icons on identical brass portholes, one bold cream glyph of each machine on its role-colored face. In order: nail gun (orange-red); jackhammer (orange-red); gear (cyan); saw blade (orange-red); wrench (emerald); piston (orange-red); spring (cyan); belt drive (cyan); blowtorch (orange-red). Silhouette glyph only, no base plate, readable at 40 px, thick outline. Flat magenta #FF00FF background.
```

### N17 Icons + Rewards (6 prompts)

**N17.1 `job_icons_2`** - sheet 3x3 | canvas 1536x1024 | key magenta | slice `sheet` | 79 words
- Raw file: `omm_icons_job_icons_2_v01.png`  Outputs: `job_pipe`, `job_blast_plate`, `job_tesla_tower`, `job_capacitor`, `job_blueprint`, `job_ladder`, `job_rewind_crank`, `job_crane`, `job_dynamo`
- Attach: A4-icon; identity: existing job_* and unit pictures
- Covers registry: job_pipe, job_blast_plate, job_tesla_tower, job_capacitor, job_blueprint, job_ladder, job_rewind_crank, job_crane, job_dynamo
- Slicing: Sheet 3x3: segment by connected components (never fixed lines), expect 9 objects, row-major, key, despill, trim, pad 8%, square export.

```
3 columns by 3 rows sheet, canvas 1536x1024, equal cells, wide gutters, reading order left to right then top to bottom. 9 round job icons on identical brass portholes, one bold cream glyph of each machine on its role-colored face. In order: pipe (cyan); blast plate (emerald); tesla tower (orange-red); capacitor (cyan); blueprint (emerald); ladder (cyan); rewind crank (emerald); crane (cyan); dynamo (cyan). Silhouette glyph only, no base plate, readable at 40 px, thick outline. Flat magenta #FF00FF background.
```

**N17.2 `job_icons_3`** - sheet 3x3 | canvas 1536x1024 | key magenta | slice `sheet` | 84 words
- Raw file: `omm_icons_job_icons_3_v01.png`  Outputs: `job_wrecking_ball`, `job_robot_arm`, `job_tilt_lever`, `job_rivet_gun`, `job_vice`, `job_router`, `job_hydraulic_press`, `job_lathe`
- Attach: A4-icon; identity: existing job_* and unit pictures
- Covers registry: job_wrecking_ball, job_robot_arm, job_tilt_lever, job_rivet_gun, job_vice, job_router, job_hydraulic_press, job_lathe
- Slicing: Sheet 3x3: segment by connected components (never fixed lines), expect 8 objects (1 empty cell), row-major, key, despill, trim, pad 8%, square export.

```
3 columns by 3 rows sheet, canvas 1536x1024, equal cells, wide gutters, reading order left to right then top to bottom. 8 round job icons on identical brass portholes, one bold cream glyph of each machine on its role-colored face. In order: wrecking ball (orange-red); robot arm (orange-red); tilt lever (emerald); rivet gun (orange-red); vice (cyan); router (cyan); hydraulic press (orange-red); lathe (orange-red). Silhouette glyph only, no base plate, readable at 40 px, thick outline. Leave the last cell empty. Flat magenta #FF00FF background.
```

**N17.3 `perk_icons`** - sheet 3x2 | canvas 1536x1024 | key magenta | slice `sheet` | 83 words
- Raw file: `omm_icons_perk_icons_v01.png`  Outputs: `perk_encore`, `perk_juice`, `perk_leads`, `perk_quality`, `perk_twin`, `perk_generic`
- Attach: A4-icon
- Covers registry: perk_encore, perk_juice, perk_leads, perk_quality, perk_twin
- Slicing: Sheet 3x2: segment by connected components (never fixed lines), expect 6 objects, row-major, key, despill, trim, pad 8%, square export.

```
3 columns by 2 rows sheet, canvas 1536x1024, equal cells, wide gutters, reading order left to right then top to bottom. Six round perk icons on identical brass portholes. In order: encore (two circular arrows replaying); juice (energy drop with a spark); leads (a pointing arrow along a dotted line); quality (a gear with a star); twin (two identical machines side by side); generic perk (a plain star). One bold idea each, different face colors, readable at 40 px. Flat magenta #FF00FF background.
```

**N17.4 `family_badges`** - sheet 2x2 | canvas 1536x1024 | key magenta | slice `sheet` | 62 words
- Raw file: `omm_icons_family_badges_v01.png`  Outputs: `badge_bell`, `badge_cannon`, `badge_coil`, `badge_remix`
- Attach: A4-icon; identity: existing badge_* drafts
- Covers registry: badge_bell, badge_cannon, badge_coil, badge_remix
- Slicing: Sheet 2x2: segment by connected components (never fixed lines), expect 4 objects, row-major, key, despill, trim, pad 8%, square export.

```
2 columns by 2 rows sheet, canvas 1536x1024, equal cells, wide gutters, reading order left to right then top to bottom. Four family shield badges, same shield shape and brass rim. In order: bell (gold bell), cannon (red cannon), coil (cyan coil), remix (violet two arrows swapping). One bold glyph each, face color matches the family, no text. Flat magenta #FF00FF background.
```

**N17.5 `misc_icons`** - sheet 2x2 | canvas 1536x1024 | key magenta | slice `sheet` | 71 words
- Raw file: `omm_icons_misc_icons_v01.png`  Outputs: `icon_pause`, `icon_scrap`, `icon_timer`, `icon_gem`
- Attach: A4-icon; icon_coin
- Covers registry: icon_pause, icon_scrap, icon_timer, icon_gem
- Slicing: Sheet 2x2: segment by connected components (never fixed lines), expect 4 objects, row-major, key, despill, trim, pad 8%, square export.

```
2 columns by 2 rows sheet, canvas 1536x1024, equal cells, wide gutters, reading order left to right then top to bottom. Four icons in the same family as icon_coin and icon_check. In order: pause button (two bold yellow bars on a brass porthole); scrap (crumpled brass-and-grey scrap pile, chunky); timer (stopwatch with a red hand, no numerals); gem (faceted cobalt-blue gem). Same outline weight, no pure-black outline. Flat magenta #FF00FF background.
```

**N17.6 `rewards_core`** - sheet 3x2 | canvas 1536x1024 | key magenta | slice `sheet` | 82 words
- Raw file: `omm_rewards_rewards_core_v01.png`  Outputs: `bolt`, `crown`, `medal`, `keepsake`, `booster_jumpstart`, `booster_time_capsule`
- Attach: A4-icon; identity: existing drafts
- Covers registry: bolt, crown, medal, keepsake, booster_jumpstart, booster_time_capsule
- Slicing: Sheet 3x2: segment by connected components (never fixed lines), expect 6 objects, row-major, key, despill, trim, pad 8%, square export.

```
3 columns by 2 rows sheet, canvas 1536x1024, equal cells, wide gutters, reading order left to right then top to bottom. Six reward items, each isolated, no plate. In order: lightning bolt currency; brass crown with a red gem; round medal with a ribbon; keepsake, a small wooden music box with a gear key; jumpstart booster, a bottle of orange spark fluid; time-capsule booster, a brass capsule with a clock face (no numerals). Chunky, readable at 64 px. Flat magenta #FF00FF background.
```

### N18 Rewards + Onboarding + Mascot (6 prompts)

**N18.1 `rewards_items`** - sheet 3x2 | canvas 1536x1024 | key magenta | slice `sheet` | 71 words
- Raw file: `omm_rewards_rewards_items_v01.png`  Outputs: `item_capsule`, `item_corner`, `item_overcharge`, `item_spark`, `item_badge_corner`, `item_badge_overcharge`
- Attach: A4-icon; identity: existing item_* drafts
- Covers registry: item_capsule, item_corner, item_overcharge, item_spark, item_badge_corner, item_badge_overcharge
- Slicing: Sheet 3x2: segment by connected components (never fixed lines), expect 6 objects, row-major, key, despill, trim, pad 8%, square export.

```
3 columns by 2 rows sheet, canvas 1536x1024, equal cells, wide gutters, reading order left to right then top to bottom. Six board add-on items. Top row, the items themselves: capsule (brass pill with a green stripe); corner piece (red L bracket); overcharge cell (yellow glowing battery); then spark plug (orange). Bottom row, the small round badge for corner and overcharge. Same size, thick outlines, distinct colors. Flat magenta #FF00FF background.
```

**N18.2 `rewards_ornaments`** - sheet 3x2 | canvas 1536x1024 | key magenta | slice `sheet` | 67 words
- Raw file: `omm_rewards_rewards_ornaments_v01.png`  Outputs: `item_badge_spark`, `orn_brass_whistle`, `orn_clockwork_finial`, `orn_violet_pennant`, `token_gear`, `token_ribbon_bow`
- Attach: A4-icon; identity: existing orn_* drafts
- Covers registry: item_badge_spark, orn_brass_whistle, orn_clockwork_finial, orn_violet_pennant
- Slicing: Sheet 3x2: segment by connected components (never fixed lines), expect 6 objects, row-major, key, despill, trim, pad 8%, square export.

```
3 columns by 2 rows sheet, canvas 1536x1024, equal cells, wide gutters, reading order left to right then top to bottom. Six items. In order: round spark badge, orange; brass whistle ornament; clockwork finial, a small brass spire with a tiny gear; violet pennant on a brass pole; gear token coin; red ribbon bow. Chunky, thick outlines, readable at 64 px, no text. Flat magenta #FF00FF background.
```

**N18.3 `tutorial_hand`** - sheet 3x2 | canvas 1536x1024 | key magenta | slice `sheet` | 67 words
- Raw file: `omm_onboarding_tutorial_hand_v01.png`  Outputs: `hand_point`, `hand_tap`, `hand_grab`, `hand_open`, `hand_thumbs_up`, `hand_swipe`
- Attach: A4-icon
- Covers registry: hand
- Slicing: Sheet 3x2: segment by connected components (never fixed lines), expect 6 objects, row-major, key, despill, trim, pad 8%, square export.

```
3 columns by 2 rows sheet, canvas 1536x1024, equal cells, wide gutters, reading order left to right then top to bottom. Six cartoon toy-glove hands, cream glove with red cuff, thick outline, same size: pointing finger; tapping with a small motion arc; grabbing fist; open palm; thumbs up; swiping with a speed trail. Big readable fingers, no wrist details, readable at 64 px. Flat magenta #FF00FF background.
```

**N18.4 `guide_marks`** - sheet 3x2 | canvas 1536x1024 | key black | slice `fx` | 71 words
- Raw file: `omm_onboarding_guide_marks_v01.png`  Outputs: `guide_spotlight_ring`, `guide_dash_path`, `guide_curved_arrow`, `guide_ghost_outline`, `guide_so_close_ring`, `guide_invalid_x`
- Attach: A6-fx
- Covers registry: fx_mergeAssist, fx_soClose, fx_dropFeedback
- Slicing: Additive FX: luminance to alpha, no pad beyond 10%, corners must be black (G10), export 256 px (512 for rings and glows).

```
3 columns by 2 rows sheet, canvas 1536x1024, equal cells, wide gutters, reading order left to right then top to bottom. Six guidance marks, white shapes for tinting: spotlight ring with a thick soft edge; dashed path with chevrons; curved arrow; ghost outline of a rounded square, thin double line; so-close ring, a pulsing ring with four small ticks; invalid cross, a bold X with rounded ends. Pure black #000000 background.
```

**N18.5 `guide_plates`** - sheet 3x2 | canvas 1536x1024 | key magenta | slice `sheet` | 71 words
- Raw file: `omm_onboarding_guide_plates_v01.png`  Outputs: `guide_bubble_left`, `guide_bubble_right`, `guide_hint_card`, `guide_tip_strip`, `guide_arrow_up`, `guide_arrow_down`
- Attach: A3-button; A10-ui
- Slicing: Sheet 3x2: segment by connected components (never fixed lines), expect 6 objects, row-major, key, despill, trim, pad 8%, square export.

```
3 columns by 2 rows sheet, canvas 1536x1024, equal cells, wide gutters, reading order left to right then top to bottom. Six empty tutorial plates, front-facing, empty centers: speech bubble with a left tail; speech bubble with a right tail; hint card with a brass pin; thin tip strip 6:1; cream arrow plate pointing up; arrow plate pointing down. Thick outline, soft shadow inside the outline only. Flat magenta #FF00FF background.
```

**N18.6 `mascot_anchor`** - single | canvas 1024x1536 | key magenta | slice `single` | 56 words
- Raw file: `omm_mascot_mascot_anchor_v01.png`  Outputs: `mascot_bolt_full`
- Attach: A1-style
- Slicing: Single image: key, despill, 1 px erode, trim to bbox, pad 8%, keep the aspect (square canvas only for objects and icons).

```
Single image, canvas 1024x1536. Mascot BOLT, a small workshop robot helper: oversized round head with one big brass-ringed eye lens and one happy dot eye, antenna with a red bulb, compact cream-and-orange body, wrench in one hand. Charming, expressive, toy-enamel, full body, 3/4 front view, standing, upper-left light, thick outline. No text. Flat magenta #FF00FF background.
```

### N19 Mascot + Offers (6 prompts)

**N19.1 `mascot_expressions`** - sheet 3x2 | canvas 1536x1024 | key magenta | slice `sheet` | 73 words
- Raw file: `omm_mascot_mascot_expressions_v01.png`  Outputs: `mascot_happy`, `mascot_cheer`, `mascot_think`, `mascot_oops`, `mascot_point`, `mascot_sleep`
- Attach: A1-style; mascot_anchor approved  | Depends on: mascot_anchor
- Slicing: Sheet 3x2: segment by connected components (never fixed lines), expect 6 objects, row-major, key, despill, trim, pad 8%, square export.

```
3 columns by 2 rows sheet, canvas 1536x1024, equal cells, wide gutters, reading order left to right then top to bottom. Six bust portraits of the approved mascot Bolt, same size and head position: happy smile; cheering with open mouth; thinking with a raised brow; oops with a sweat drop and a wobbly mouth; pointing excitedly; sleepy with closed eye lens and a small bubble. Same design, outline, palette. Flat magenta #FF00FF background.
```

**N19.2 `mascot_poses`** - sheet 3x2 | canvas 1536x1024 | key magenta | slice `sheet` | 69 words
- Raw file: `omm_mascot_mascot_poses_v01.png`  Outputs: `mascot_wave`, `mascot_point_pose`, `mascot_thumbs`, `mascot_carry_gift`, `mascot_hold_sign`, `mascot_sit`
- Attach: A1-style; mascot_anchor approved  | Depends on: mascot_anchor
- Slicing: Sheet 3x2: segment by connected components (never fixed lines), expect 6 objects, row-major, key, despill, trim, pad 8%, square export.

```
3 columns by 2 rows sheet, canvas 1536x1024, equal cells, wide gutters, reading order left to right then top to bottom. Six full-body poses of the approved mascot Bolt, same size, feet on the same line: waving; pointing right; thumbs up; carrying a gift box; holding a blank cream sign; sitting with legs dangling. Same design and palette, thick outline, no text on the sign. Flat magenta #FF00FF background.
```

**N19.3 `offer_banners`** - sheet 3x2 | canvas 1536x1024 | key magenta | slice `sheet` | 72 words
- Raw file: `omm_offers_offer_banners_v01.png`  Outputs: `offer_ribbon_sale`, `offer_ribbon_best`, `offer_ribbon_limited`, `offer_sash_new`, `offer_sash_hot`, `offer_sash_best`
- Attach: A3-button; A10-ui
- Slicing: Sheet 3x2: segment by connected components (never fixed lines), expect 6 objects, row-major, key, despill, trim, pad 8%, square export.

```
3 columns by 2 rows sheet, canvas 1536x1024, equal cells, wide gutters, reading order left to right then top to bottom. Six empty offer banners, empty centers, flat uniform fill. Top row, wide 3:1 ribbons with folded tails: red sale ribbon; gold best-value ribbon with a crown notch; violet limited-time ribbon. Bottom row, diagonal corner sashes: cream sash with a red edge; orange sash; gold sash. No text. Flat magenta #FF00FF background.
```

**N19.4 `price_badges`** - sheet 3x2 | canvas 1536x1024 | key magenta | slice `sheet` | 82 words
- Raw file: `omm_offers_price_badges_v01.png`  Outputs: `price_tag_hang`, `price_plate`, `sale_burst`, `discount_badge`, `hot_flame_badge`, `countdown_chip`
- Attach: A4-icon; A10-ui
- Slicing: Sheet 3x2: segment by connected components (never fixed lines), expect 6 objects, row-major, key, despill, trim, pad 8%, square export.

```
3 columns by 2 rows sheet, canvas 1536x1024, equal cells, wide gutters, reading order left to right then top to bottom. Six empty sales parts, no digits: hanging price tag with a string and a brass eyelet; wide rounded price plate with brass ends; red sale starburst; round discount badge with a ribbon; hexagon HOT badge with one big flame; countdown chip, a clock face with a rounded capsule beside it. Bold silhouettes, empty areas for code text. Flat magenta #FF00FF background.
```

**N19.5 `gift_boxes`** - sheet 3x2 | canvas 1536x1024 | key magenta | slice `sheet` | 76 words
- Raw file: `omm_offers_gift_boxes_v01.png`  Outputs: `gift_small`, `gift_big`, `gift_open`, `gift_capsule`, `gift_stack`, `gift_mystery`
- Attach: A5-chest; identity: ui_gift_box
- Slicing: Sheet 3x2: segment by connected components (never fixed lines), expect 6 objects, row-major, key, despill, trim, pad 8%, square export.

```
3 columns by 2 rows sheet, canvas 1536x1024, equal cells, wide gutters, reading order left to right then top to bottom. Six gift items, 3/4 view, no plate: small red box with a cream ribbon; big cobalt box with a gold bow; open gift with soft light rising; brass capsule with a ribbon; stack of three gifts; mystery parcel with a keyhole lock. Chunky, one accent color each, readable at 64 px. Flat magenta #FF00FF background.
```

**N19.6 `coin_stacks`** - sheet 3x2 | canvas 1536x1024 | key magenta | slice `sheet` | 65 words
- Raw file: `omm_offers_coin_stacks_v01.png`  Outputs: `coins_single`, `coins_stack3`, `coins_tower8`, `coin_pouch`, `coin_pile`, `piggy_bank`
- Attach: A5-chest; icon_coin
- Slicing: Sheet 3x2: segment by connected components (never fixed lines), expect 6 objects, row-major, key, despill, trim, pad 8%, square export.

```
3 columns by 2 rows sheet, canvas 1536x1024, equal cells, wide gutters, reading order left to right then top to bottom. Six coin items using the icon_coin look (gear-stamped brass coin, no numerals): single coin; stack of three; tall tower of eight; drawstring pouch; heap of coins; toy piggy bank with a gear-shaped coin slot. Chunky, same coin size across cells. Flat magenta #FF00FF background.
```

### N20 Offers + Popups (6 prompts)

**N20.1 `currency_piles`** - sheet 3x2 | canvas 1536x1024 | key magenta | slice `sheet` | 65 words
- Raw file: `omm_offers_currency_piles_v01.png`  Outputs: `gems_cluster`, `gems_pile`, `bolts_stack`, `energy_cells`, `scrap_heap`, `key_ring`
- Attach: A5-chest; icon_gem
- Slicing: Sheet 3x2: segment by connected components (never fixed lines), expect 6 objects, row-major, key, despill, trim, pad 8%, square export.

```
3 columns by 2 rows sheet, canvas 1536x1024, equal cells, wide gutters, reading order left to right then top to bottom. Six currency groupings: cluster of three cobalt gems; large pile of gems; stack of orange lightning bolts; three green energy battery cells; scrap pile of brass bits; ring of three brass keys. Chunky, 3/4, no numerals, one dominant color each. Flat magenta #FF00FF background.
```

**N20.2 `popup_frames`** - sheet 3x2 | canvas 1536x1024 | key magenta | slice `sheet` | 76 words
- Raw file: `omm_popups_popup_frames_v01.png`  Outputs: `popup_reward`, `popup_confirm`, `popup_alert`, `popup_page`, `popup_sheet_bottom`, `popup_tooltip_big`
- Attach: A3-button; A10-ui; ui_kit_core approved  | Depends on: ui_kit_core
- Slicing: Sheet 3x2: segment by connected components (never fixed lines), expect 6 objects, row-major, key, despill, trim, pad 8%, square export.

```
3 columns by 2 rows sheet, canvas 1536x1024, equal cells, wide gutters, reading order left to right then top to bottom. Six empty popup frames, front-facing, uniform borders, empty centers: reward popup with a starburst notch behind its top; confirm dialog 4:3; small alert 2:1; full-page sheet 3:4 with a header notch; bottom sheet with a drag handle notch; large tooltip with a separate tail. Cream enamel, thin brass rim, no text. Flat magenta #FF00FF background.
```

**N20.3 `popup_ornaments`** - sheet 3x2 | canvas 1536x1024 | key magenta | slice `sheet` | 80 words
- Raw file: `omm_popups_popup_ornaments_v01.png`  Outputs: `orn_title_crest`, `orn_laurel`, `orn_divider`, `orn_corner`, `orn_star_row`, `orn_footer_tray`
- Attach: A3-button; A10-ui
- Slicing: Sheet 3x2: segment by connected components (never fixed lines), expect 6 objects, row-major, key, despill, trim, pad 8%, square export.

```
3 columns by 2 rows sheet, canvas 1536x1024, equal cells, wide gutters, reading order left to right then top to bottom. Six popup ornaments, front-facing, no text: large title crest, a brass shield with a gear and two small wings; symmetrical laurel pair; horizontal divider with a small gear in the middle; corner bracket; row of five empty star sockets; footer tray plate that holds buttons. Brass kept under 30 percent, cream and red enamel dominant. Flat magenta #FF00FF background.
```

**N20.4 `offer_cards`** - sheet 3x2 | canvas 1536x1024 | key magenta | slice `sheet` | 83 words
- Raw file: `omm_offers_offer_cards_v01.png`  Outputs: `offer_starter`, `offer_daily`, `offer_event`, `offer_season`, `offer_bundle`, `offer_flash`
- Attach: A3-button; A10-ui; card_frames approved  | Depends on: card_frames
- Slicing: Sheet 3x2: segment by connected components (never fixed lines), expect 6 objects, row-major, key, despill, trim, pad 8%, square export.

```
3 columns by 2 rows sheet, canvas 1536x1024, equal cells, wide gutters, reading order left to right then top to bottom. Six empty offer card frames, front-facing, blank art window and blank title plate: starter pack, portrait cream and emerald; daily deal, square gold rim with a sun notch; limited event, wide violet with ribbon ends; season pass, tall navy with a star border; bundle, cobalt double panel; flash sale, red with spark corners. No text, mock use only. Flat magenta #FF00FF background.
```

**N20.5 `situation_emblems_1`** - sheet 3x2 | canvas 1536x1024 | key magenta | slice `sheet` | 82 words
- Raw file: `omm_popups_situation_emblems_1_v01.png`  Outputs: `emb_level_up`, `emb_new_unit`, `emb_out_energy`, `emb_out_moves`, `emb_revive`, `emb_confirm`
- Attach: A4-icon; A10-ui
- Slicing: Sheet 3x2: segment by connected components (never fixed lines), expect 6 objects, row-major, key, despill, trim, pad 8%, square export.

```
3 columns by 2 rows sheet, canvas 1536x1024, equal cells, wide gutters, reading order left to right then top to bottom. Six large popup emblems, round, no text: level up, a rising gear with an up chevron and stars; new unit, a spotlight beam on an empty pedestal; out of energy, an empty battery with a red slash; out of moves, a hand with a down chevron; revive, a gear-shaped heart; confirm, a shield with a bold check. Flat magenta #FF00FF background.
```

**N20.6 `situation_emblems_2`** - sheet 3x2 | canvas 1536x1024 | key magenta | slice `sheet` | 82 words
- Raw file: `omm_popups_situation_emblems_2_v01.png`  Outputs: `emb_daily_login`, `emb_quest`, `emb_event_start`, `emb_event_end`, `emb_rate_us`, `emb_update`
- Attach: A4-icon; A10-ui
- Slicing: Sheet 3x2: segment by connected components (never fixed lines), expect 6 objects, row-major, key, despill, trim, pad 8%, square export.

```
3 columns by 2 rows sheet, canvas 1536x1024, equal cells, wide gutters, reading order left to right then top to bottom. Six large popup emblems, round, no numerals: daily login, a calendar page with a tear-off corner and a star; quest, a scroll with a brass seal; event start, a waving flag on a gear; event end, an hourglass with the last sand; rate us, a large star with a heart; update, a gear with a down arrow. Flat magenta #FF00FF background.
```

### N21 Popups + Chapter art (6 prompts)

**N21.1 `situation_emblems_3`** - sheet 3x2 | canvas 1536x1024 | key magenta | slice `sheet` | 79 words
- Raw file: `omm_popups_situation_emblems_3_v01.png`  Outputs: `emb_offline`, `emb_error`, `emb_hint`, `emb_trophy`, `emb_gift_claim`, `emb_settings_saved`
- Attach: A4-icon; A10-ui
- Slicing: Sheet 3x2: segment by connected components (never fixed lines), expect 6 objects, row-major, key, despill, trim, pad 8%, square export.

```
3 columns by 2 rows sheet, canvas 1536x1024, equal cells, wide gutters, reading order left to right then top to bottom. Six large popup emblems, round, no text: offline, a cloud with a slash; error, a warning triangle with a bold dot-and-bar glyph; hint, a light bulb with a gear base; trophy, a small gold cup; claim gift, a hand holding a gift; saved, a floppy-disk-shaped shield with a check. Face colors differ per emblem. Flat magenta #FF00FF background.
```

**N21.2 `chapter_banners_1`** - sheet 2x2 | canvas 1536x1024 | key magenta | slice `sheet` | 76 words
- Raw file: `omm_chapters_chapter_banners_1_v01.png`  Outputs: `chapter_banner_1`, `chapter_banner_2`, `chapter_banner_3`, `chapter_banner_4`
- Attach: A3-button; A10-ui
- Slicing: Sheet 2x2: segment by connected components (never fixed lines), expect 4 objects, row-major, key, despill, trim, pad 8%, square export. Chapter themes 1-6 are proposed; confirm against the level data before generating (chapters 7 and 8 are Packing Depot and Observatory Salvage per docs/ROUND29_CHAPTER_7_8_RULES.md).

```
2 columns by 2 rows sheet, canvas 1536x1024, equal cells, wide gutters, reading order left to right then top to bottom. Four chapter banners, wide 3:2, each a cream shield-ribbon with a bold emblem at left and an empty center for a code-drawn title: 1 garage bench, a wrench; 2 kitchen counter, a whisk; 3 toy room, a block; 4 junkyard, a bent can. Each with a different rim color. No text. Flat magenta #FF00FF background.
```

**N21.3 `chapter_banners_2`** - sheet 2x2 | canvas 1536x1024 | key magenta | slice `sheet` | 67 words
- Raw file: `omm_chapters_chapter_banners_2_v01.png`  Outputs: `chapter_banner_5`, `chapter_banner_6`, `chapter_banner_7`, `chapter_banner_8`
- Attach: A3-button; chapter_banners_1 approved  | Depends on: chapter_banners_1
- Slicing: Sheet 2x2: segment by connected components (never fixed lines), expect 4 objects, row-major, key, despill, trim, pad 8%, square export.

```
2 columns by 2 rows sheet, canvas 1536x1024, equal cells, wide gutters, reading order left to right then top to bottom. Four chapter banners, same design as the approved first four, wide 3:2: 5 factory floor, a gear; 6 night rooftop, a moon; 7 packing depot, a parcel; 8 observatory salvage, a telescope. Each with a different rim color, empty center. No text. Flat magenta #FF00FF background.
```

**N21.4 `chapter_medals`** - sheet 4x2 | canvas 1536x1024 | key magenta | slice `sheet` | 67 words
- Raw file: `omm_chapters_chapter_medals_v01.png`  Outputs: `chapter_medal_1`, `chapter_medal_2`, `chapter_medal_3`, `chapter_medal_4`, `chapter_medal_5`, `chapter_medal_6`, `chapter_medal_7`, `chapter_medal_8`
- Attach: A4-icon; chapter_banners_1 approved  | Depends on: chapter_banners_1
- Slicing: Sheet 4x2: segment by connected components (never fixed lines), expect 8 objects, row-major, key, despill, trim, pad 8%, square export.

```
4 columns by 2 rows sheet, canvas 1536x1024, equal cells, wide gutters, reading order left to right then top to bottom. Eight chapter medals, round brass medals with a short ribbon, each with the chapter emblem raised in the center (wrench, whisk, block, can, gear, moon, parcel, telescope) and a different ribbon color. Same size and outline, readable at 64 px, no text. Flat magenta #FF00FF background.
```

**N21.5 `achievements_1`** - sheet 3x2 | canvas 1536x1024 | key magenta | slice `sheet` | 72 words
- Raw file: `omm_chapters_achievements_1_v01.png`  Outputs: `ach_first_merge`, `ach_chain_5`, `ach_boss_down`, `ach_three_stars`, `ach_collector`, `ach_speedy`
- Attach: A4-icon
- Slicing: Sheet 3x2: segment by connected components (never fixed lines), expect 6 objects, row-major, key, despill, trim, pad 8%, square export.

```
3 columns by 2 rows sheet, canvas 1536x1024, equal cells, wide gutters, reading order left to right then top to bottom. Six achievement badges on identical brass hexagons: first merge, two machines meeting with a spark; chain, five linked rings; boss down, a monster silhouette with a cracked crown; three stars; collector, a shelf with three machines; speedy, a stopwatch with wings. One bold idea each, no numerals. Flat magenta #FF00FF background.
```

**N21.6 `achievements_2`** - sheet 3x2 | canvas 1536x1024 | key magenta | slice `sheet` | 82 words
- Raw file: `omm_chapters_achievements_2_v01.png`  Outputs: `ach_max_rank`, `ach_no_loss`, `ach_daily_streak`, `ach_rich`, `ach_tool_master`, `ach_all_chapters`
- Attach: A4-icon; achievements_1 approved  | Depends on: achievements_1
- Slicing: Sheet 3x2: segment by connected components (never fixed lines), expect 6 objects, row-major, key, despill, trim, pad 8%, square export.

```
3 columns by 2 rows sheet, canvas 1536x1024, equal cells, wide gutters, reading order left to right then top to bottom. Six achievement badges on identical brass hexagons: max rank, a crowned machine; no loss, a shield with a check; daily streak, a flame over a calendar; rich, a pile of coins; tool master, a wrench and a gear bomb crossed; all chapters, eight small stars in an arc. Same style as the approved first six, no numerals. Flat magenta #FF00FF background.
```

### N22 Backgrounds (6 prompts)

**N22.1 `bg_bench_gameplay`** - single | canvas 1024x1536 | key none | slice `bg` | 61 words
- Raw file: `omm_backgrounds_bg_bench_gameplay_v01.png`  Outputs: `bg_bench_gameplay`
- Attach: A9-background
- Covers registry: bg, bg_corner
- Slicing: Background: no key, resize cover to 1080x1920, WebP q85, tile check G11 where tileable. Centre 60 percent stays calm; the board sits there.

```
Single image, canvas 1024x1536. Vertical warm workshop bench seen from above-front for the gameplay screen, 9:16. Dark slate-navy bench top so brass and red machines pop, soft warm spotlight at the center, detailed tools and shelves only at the outer edges, low-contrast calm area behind the board and the HUD. No characters, no UI, no text. Full-bleed image, no key color.
```

**N22.2 `bg_practice`** - single | canvas 1024x1536 | key none | slice `bg` | 47 words
- Raw file: `omm_backgrounds_bg_practice_v01.png`  Outputs: `bg_practice`
- Attach: A9-background
- Covers registry: bg_practice
- Slicing: Background: no key, resize cover to 1080x1920, WebP q85, tile check G11 where tileable.

```
Single image, canvas 1024x1536. Vertical bright practice-room workshop, 9:16: pale blue pegboard wall, a plain cream workbench, soft daylight from the upper left, a few friendly props at the edges. Calm low-contrast center for the board, no characters, no UI, no text. Full-bleed image, no key color.
```

**N22.3 `bg_road_map`** - single | canvas 1024x1536 | key none | slice `bg` | 57 words
- Raw file: `omm_backgrounds_bg_road_map_v01.png`  Outputs: `bg_road_map`
- Attach: A9-background
- Covers registry: road_bg, road_seg
- Slicing: Background: no key, resize cover to 1080x1920, WebP q85, tile check G11 where tileable. Seamless vertical tile; slicing checks top and bottom row match.

```
Single image, canvas 1024x1536. Tall vertical map backdrop, 9:16, tileable vertically: a winding cream road across a warm workshop floor with small props beside it (tool, bolt, spring). Road centered in the middle 60 percent, calm edges, top and bottom rows identical so it repeats seamlessly. No characters, no UI, no text. Full-bleed image, no key color.
```

**N22.4 `bg_title`** - single | canvas 1024x1536 | key none | slice `bg` | 54 words
- Raw file: `omm_backgrounds_bg_title_v01.png`  Outputs: `bg_title`
- Attach: A9-background
- Covers registry: title
- Slicing: Background: no key, resize cover to 1080x1920, WebP q85, tile check G11 where tileable.

```
Single image, canvas 1024x1536. Vertical title-screen scene, 9:16: a grand warm workshop with arched window light, a cream platform in the center for the hero machine, dust motes, the upper third calm for the logo. Brass and red accents only, dark vignette edges. No characters, no UI, no text. Full-bleed image, no key color.
```

**N22.5 `bg_loading`** - single | canvas 1024x1536 | key none | slice `bg` | 40 words
- Raw file: `omm_backgrounds_bg_loading_v01.png`  Outputs: `bg_loading`
- Attach: A9-background
- Slicing: Background: no key, resize cover to 1080x1920, WebP q85, tile check G11 where tileable.

```
Single image, canvas 1024x1536. Vertical loading-screen scene, 9:16: a dark navy workshop wall with a large blank brass gear in the center-bottom and soft warm light, calm upper half. No characters, no UI, no text. Full-bleed image, no key color.
```

**N22.6 `stage_0`** - single | canvas 1024x1536 | key none | slice `bg` | 43 words
- Raw file: `omm_backgrounds_stage_0_v01.png`  Outputs: `stage_0`
- Attach: A9-background
- Covers registry: stage_0
- Slicing: Background: no key, resize cover to 1080x1920, WebP q85, tile check G11 where tileable.

```
Single image, canvas 1024x1536. Vertical monster stage backdrop, 9:16: a warm workshop shelf wall with jars and tools, floor strip at the bottom third in cream wood, soft spotlight where a monster stands, left-of-center. No characters, no text. Full-bleed image, no key color.
```

### N23 Backgrounds (6 prompts)

**N23.1 `stage_1`** - single | canvas 1024x1536 | key none | slice `bg` | 44 words
- Raw file: `omm_backgrounds_stage_1_v01.png`  Outputs: `stage_1`
- Attach: A9-background
- Covers registry: stage_1
- Slicing: Background: no key, resize cover to 1080x1920, WebP q85, tile check G11 where tileable.

```
Single image, canvas 1024x1536. Vertical monster stage backdrop, 9:16: a garage wall with a pegboard and a rolled door, concrete-cream floor in the bottom third with a painted stripe, soft spotlight where a monster stands. No characters, no text. Full-bleed image, no key color.
```

**N23.2 `stage_2`** - single | canvas 1024x1536 | key none | slice `bg` | 36 words
- Raw file: `omm_backgrounds_stage_2_v01.png`  Outputs: `stage_2`
- Attach: A9-background
- Covers registry: stage_2
- Slicing: Background: no key, resize cover to 1080x1920, WebP q85, tile check G11 where tileable.

```
Single image, canvas 1024x1536. Vertical monster stage backdrop, 9:16: a toy-sized arena with a round brass-trimmed floor ring and low curved walls, warm spotlight in the middle. No characters, no text. Full-bleed image, no key color.
```

**N23.3 `stage_ch1`** - single | canvas 1024x1536 | key none | slice `bg` | 56 words
- Raw file: `omm_backgrounds_stage_ch1_v01.png`  Outputs: `stage_ch1`
- Attach: A9-background
- Covers registry: stage_ch1
- Slicing: Background: no key, resize cover to 1080x1920, WebP q85, tile check G11 where tileable. Chapter themes 1-6 are proposed; confirm against the level data.

```
Single image, canvas 1024x1536. Vertical monster stage backdrop for chapter 1, 9:16: garage bench: pegboard, jars of bolts, an old radio. Floor strip in the bottom third, soft spotlight where the monster stands, detail kept at the edges, calm center. Same toy-world style and palette across chapters. No characters, no text. Full-bleed image, no key color.
```

**N23.4 `stage_ch2`** - single | canvas 1024x1536 | key none | slice `bg` | 57 words
- Raw file: `omm_backgrounds_stage_ch2_v01.png`  Outputs: `stage_ch2`
- Attach: A9-background
- Covers registry: stage_ch2
- Slicing: Background: no key, resize cover to 1080x1920, WebP q85, tile check G11 where tileable.

```
Single image, canvas 1024x1536. Vertical monster stage backdrop for chapter 2, 9:16: kitchen counter: giant tiles, a whisk and a saucepan rack. Floor strip in the bottom third, soft spotlight where the monster stands, detail kept at the edges, calm center. Same toy-world style and palette across chapters. No characters, no text. Full-bleed image, no key color.
```

**N23.5 `stage_ch3`** - single | canvas 1024x1536 | key none | slice `bg` | 57 words
- Raw file: `omm_backgrounds_stage_ch3_v01.png`  Outputs: `stage_ch3`
- Attach: A9-background
- Covers registry: stage_ch3
- Slicing: Background: no key, resize cover to 1080x1920, WebP q85, tile check G11 where tileable.

```
Single image, canvas 1024x1536. Vertical monster stage backdrop for chapter 3, 9:16: toy room: building blocks, a train track, a stuffed shelf. Floor strip in the bottom third, soft spotlight where the monster stands, detail kept at the edges, calm center. Same toy-world style and palette across chapters. No characters, no text. Full-bleed image, no key color.
```

**N23.6 `stage_ch4`** - single | canvas 1024x1536 | key none | slice `bg` | 55 words
- Raw file: `omm_backgrounds_stage_ch4_v01.png`  Outputs: `stage_ch4`
- Attach: A9-background
- Covers registry: stage_ch4
- Slicing: Background: no key, resize cover to 1080x1920, WebP q85, tile check G11 where tileable.

```
Single image, canvas 1024x1536. Vertical monster stage backdrop for chapter 4, 9:16: junkyard: stacked tires, a bent signpost, scrap mounds. Floor strip in the bottom third, soft spotlight where the monster stands, detail kept at the edges, calm center. Same toy-world style and palette across chapters. No characters, no text. Full-bleed image, no key color.
```

### N24 Backgrounds (6 prompts)

**N24.1 `stage_ch5`** - single | canvas 1024x1536 | key none | slice `bg` | 55 words
- Raw file: `omm_backgrounds_stage_ch5_v01.png`  Outputs: `stage_ch5`
- Attach: A9-background
- Covers registry: stage_ch5
- Slicing: Background: no key, resize cover to 1080x1920, WebP q85, tile check G11 where tileable.

```
Single image, canvas 1024x1536. Vertical monster stage backdrop for chapter 5, 9:16: factory floor: conveyor belts, hanging lamps, gear walls. Floor strip in the bottom third, soft spotlight where the monster stands, detail kept at the edges, calm center. Same toy-world style and palette across chapters. No characters, no text. Full-bleed image, no key color.
```

**N24.2 `stage_ch6`** - single | canvas 1024x1536 | key none | slice `bg` | 57 words
- Raw file: `omm_backgrounds_stage_ch6_v01.png`  Outputs: `stage_ch6`
- Attach: A9-background
- Covers registry: stage_ch6
- Slicing: Background: no key, resize cover to 1080x1920, WebP q85, tile check G11 where tileable.

```
Single image, canvas 1024x1536. Vertical monster stage backdrop for chapter 6, 9:16: night rooftop: antennas, a water tank, city glow and stars. Floor strip in the bottom third, soft spotlight where the monster stands, detail kept at the edges, calm center. Same toy-world style and palette across chapters. No characters, no text. Full-bleed image, no key color.
```

**N24.3 `stage_ch7`** - single | canvas 1024x1536 | key none | slice `bg` | 55 words
- Raw file: `omm_backgrounds_stage_ch7_v01.png`  Outputs: `stage_ch7`
- Attach: A9-background
- Covers registry: stage_ch7
- Slicing: Background: no key, resize cover to 1080x1920, WebP q85, tile check G11 where tileable.

```
Single image, canvas 1024x1536. Vertical monster stage backdrop for chapter 7, 9:16: packing depot: stacked parcels, forklift pallets, tape rolls. Floor strip in the bottom third, soft spotlight where the monster stands, detail kept at the edges, calm center. Same toy-world style and palette across chapters. No characters, no text. Full-bleed image, no key color.
```

**N24.4 `stage_ch8`** - single | canvas 1024x1536 | key none | slice `bg` | 55 words
- Raw file: `omm_backgrounds_stage_ch8_v01.png`  Outputs: `stage_ch8`
- Attach: A9-background
- Covers registry: stage_ch8
- Slicing: Background: no key, resize cover to 1080x1920, WebP q85, tile check G11 where tileable.

```
Single image, canvas 1024x1536. Vertical monster stage backdrop for chapter 8, 9:16: observatory salvage: a broken dome, telescopes, star charts. Floor strip in the bottom third, soft spotlight where the monster stands, detail kept at the edges, calm center. Same toy-world style and palette across chapters. No characters, no text. Full-bleed image, no key color.
```

**N24.5 `stagebg_mint`** - single | canvas 1024x1536 | key none | slice `bg` | 32 words
- Raw file: `omm_backgrounds_stagebg_mint_v01.png`  Outputs: `stagebg_mint`
- Attach: A9-background
- Covers registry: stagebg_mint
- Slicing: Background: no key, resize cover to 1080x1920, WebP q85, tile check G11 where tileable.

```
Single image, canvas 1024x1536. Vertical skin backdrop, 9:16: soft mint-green workshop with white pegboard and pale brass tools, bright and airy, calm center. No characters, no text. Full-bleed image, no key color.
```

**N24.6 `stagebg_night_shift`** - single | canvas 1024x1536 | key none | slice `bg` | 35 words
- Raw file: `omm_backgrounds_stagebg_night_shift_v01.png`  Outputs: `stagebg_night_shift`
- Attach: A9-background
- Covers registry: stagebg_night_shift
- Slicing: Background: no key, resize cover to 1080x1920, WebP q85, tile check G11 where tileable.

```
Single image, canvas 1024x1536. Vertical skin backdrop, 9:16: deep navy workshop under a single warm lamp, long shadows, cyan accent lights at the edges, calm center. No characters, no text. Full-bleed image, no key color.
```

### N25 Backgrounds (6 prompts)

**N25.1 `stagebg_showroom`** - single | canvas 1024x1536 | key none | slice `bg` | 34 words
- Raw file: `omm_backgrounds_stagebg_showroom_v01.png`  Outputs: `stagebg_showroom`
- Attach: A9-background
- Covers registry: stagebg_showroom
- Slicing: Background: no key, resize cover to 1080x1920, WebP q85, tile check G11 where tileable.

```
Single image, canvas 1024x1536. Vertical skin backdrop, 9:16: bright cream showroom with a subtle brass spotlight stand and a soft floor reflection, clean and minimal. No characters, no text. Full-bleed image, no key color.
```

**N25.2 `collection_bg`** - single | canvas 1024x1536 | key none | slice `bg` | 44 words
- Raw file: `omm_backgrounds_collection_bg_v01.png`  Outputs: `collection_bg`
- Attach: A9-background
- Slicing: Background: no key, resize cover to 1080x1920, WebP q85, tile check G11 where tileable.

```
Single image, canvas 1024x1536. Vertical backdrop for the collection screen, 9:16: a warm display wall with empty wooden shelves in rows and soft spotlights, calm and low contrast so cards read on top. No characters, no UI, no text. Full-bleed image, no key color.
```

**N25.3 `events_bg`** - single | canvas 1024x1536 | key none | slice `bg` | 37 words
- Raw file: `omm_backgrounds_events_bg_v01.png`  Outputs: `events_bg`
- Attach: A9-background
- Slicing: Background: no key, resize cover to 1080x1920, WebP q85, tile check G11 where tileable.

```
Single image, canvas 1024x1536. Vertical backdrop for the events screen, 9:16: a cozy workshop notice-board wall with string bunting and a soft warm glow, calm center. No characters, no UI, no text. Full-bleed image, no key color.
```

**N25.4 `crates_bg`** - single | canvas 1024x1536 | key none | slice `bg` | 42 words
- Raw file: `omm_backgrounds_crates_bg_v01.png`  Outputs: `crates_bg`
- Attach: A9-background
- Slicing: Background: no key, resize cover to 1080x1920, WebP q85, tile check G11 where tileable.

```
Single image, canvas 1024x1536. Vertical backdrop for the crates screen, 9:16: a storeroom with wooden racks and a soft spotlight cone on a clear floor circle at the center, dark edges. No characters, no UI, no text. Full-bleed image, no key color.
```

**N25.5 `boss_wake_bg`** - single | canvas 1024x1536 | key none | slice `bg` | 39 words
- Raw file: `omm_backgrounds_boss_wake_bg_v01.png`  Outputs: `boss_wake_bg`
- Attach: A9-background
- Slicing: Background: no key, resize cover to 1080x1920, WebP q85, tile check G11 where tileable.

```
Single image, canvas 1024x1536. Vertical dramatic boss-entrance backdrop, 9:16: a dark red-tinted workshop with radial light rays from behind the center, floor cracks, a tense low-key mood but still toy-world. No characters, no text. Full-bleed image, no key color.
```

**N25.6 `victory_bg`** - single | canvas 1024x1536 | key none | slice `bg` | 37 words
- Raw file: `omm_backgrounds_victory_bg_v01.png`  Outputs: `victory_bg`
- Attach: A9-background
- Slicing: Background: no key, resize cover to 1080x1920, WebP q85, tile check G11 where tileable.

```
Single image, canvas 1024x1536. Vertical victory backdrop, 9:16: warm golden workshop glow with radial rays and floating gear confetti shapes at the edges, calm center for the plaque. No characters, no text. Full-bleed image, no key color.
```

### N26 Backgrounds + Screw yard (3 prompts)

**N26.1 `defeat_bg`** - single | canvas 1024x1536 | key none | slice `bg` | 35 words
- Raw file: `omm_backgrounds_defeat_bg_v01.png`  Outputs: `defeat_bg`
- Attach: A9-background
- Slicing: Background: no key, resize cover to 1080x1920, WebP q85, tile check G11 where tileable.

```
Single image, canvas 1024x1536. Vertical defeat backdrop, 9:16: the same workshop, calm and desaturated blue-grey, soft low light, a tipped-over stool at the edge, calm center. No characters, no text. Full-bleed image, no key color.
```

**N26.2 `yard_parts`** - sheet 3x2 | canvas 1536x1024 | key magenta | slice `sheet` | 80 words
- Raw file: `omm_yard_yard_parts_v01.png`  Outputs: `sy_plate_short`, `sy_plate_square`, `sy_screw`, `sy_toolbox_open`, `sy_toolbox_open_brass`, `sy_tray`
- Attach: A1-style; identity: existing sy_* drafts
- Covers registry: sy_plate_short, sy_plate_square, sy_screw, sy_toolbox_open, sy_toolbox_open_brass, sy_tray
- Slicing: Sheet 3x2: segment by connected components (never fixed lines), expect 6 objects, row-major, key, despill, trim, pad 8%, square export. Resolves the critic decision "restyle the yard into the toy style". The sy2 photoreal sets are retired once these are approved.

```
3 columns by 2 rows sheet, canvas 1536x1024, equal cells, wide gutters, reading order left to right then top to bottom. Six screw-yard pieces in our toy-enamel style, 3/4 view, thick dark outlines, not photoreal: short brass-and-cream plate with rivets; square plate with four screw holes; one fat enamel screw with a brass slot; open red toolbox with a dark inside; open brass toolbox; shallow wooden tray. Cream, red and brass, warm colors, no raw steel. Flat magenta #FF00FF background.
```

**N26.3 `sy_background`** - single | canvas 1024x1536 | key none | slice `bg` | 55 words
- Raw file: `omm_yard_sy_background_v01.png`  Outputs: `sy_background`
- Attach: A9-background
- Covers registry: sy_background
- Slicing: Background: no key, resize cover to 1080x1920, WebP q85, tile check G11 where tileable.

```
Single image, canvas 1024x1536. Vertical screw-yard scene, 9:16: a warm wooden workbench top seen from above-front with a pegboard wall behind, empty open area in the center for plates and screws, tools only at the edges, toy-enamel style, soft light from the upper left. No characters, no UI, no text. Full-bleed image, no key color.
```

## 9. Registry coverage

Registry: 722 entries, 134 final (not touched), 175 placeholder or code-drawn needing real art, 351 drafts with files. Covered placeholder/code entries by group (full id-to-prompt map in the JSON, `coverage.map`):

| Registry group | Entries | Covered by |
|---|---|---|
| units/wrench | 6 | N06.5 |
| units/piston | 6 | N06.6 |
| units/spring | 6 | N07.1 |
| units/belt_drive | 6 | N08.2 |
| units/blowtorch | 6 | N07.4 |
| units/pipe | 6 | N07.5 |
| units/blast_plate | 6 | N08.1 |
| units/tesla_tower | 6 | N09.4 |
| units/capacitor | 6 | N08.3 |
| units/blueprint | 6 | N08.5 |
| units/ladder | 6 | N08.4 |
| units/rewind_crank | 6 | N08.6 |
| units/crane | 6 | N09.6 |
| units/dynamo | 6 | N10.1 |
| units/wrecking_ball | 6 | N09.1 |
| units/robot_arm | 6 | N09.5 |
| units/tilt_lever | 6 | N10.2 |
| units/rivet_gun | 6 | N07.2 |
| units/vice | 6 | N07.3 |
| units/router | 6 | N07.6 |
| units/hydraulic_press | 6 | N09.2 |
| units/lathe | 6 | N09.3 |
| projectiles-impacts/debris | 1 | N04.4 |
| projectiles-impacts/code-effects | 1 | N05.2, N05.4 |
| merge-cascade-fx/particles | 2 | N04.2 |
| merge-cascade-fx/code-effects | 7 | N01.4, N05.3, N18.4, N06.2, N02.4 |
| tabs-icons/job-icons | 26 | N16.6, N17.1, N17.2 |
| tabs-icons/tutorial | 1 | N18.3 |
| crates/code-effects | 3 | N06.3 |
| power-tools/power-ups | 2 | N10.4 |

Entries needing no art: fx_shake (camera shake only, no sprite needed); font_lilita_one (font, not art). Sounds (61) are out of scope for image art. Draft entries with files that no V2 prompt re-makes stay as they are: 61 (they passed the critic or are not in the art-director priorities).

New assets with no Asset Hub row yet (the Lead adds rows): boss bodies and states, offer and popup art, mascot, onboarding plates, guidance marks, achievements, chapter banners and medals, several backgrounds. Their output ids are proposed in each prompt.

## 10. Decisions and open points for the owner

- Yard restyle into the toy style (recommended by the critic, assumed here): the owner can still choose to keep the photoreal sy2 art as a separate sub-mode; then skip YARD batch and redo-queue R12 yard items.
- The chapter themes 1-6 in chapter art and stage backdrops are proposed names (chapter 7 Packing Depot and 8 Observatory Salvage come from docs/ROUND29_CHAPTER_7_8_RULES.md). Confirm against the level data before generating.
- Boss body art, damaged boss states, and a few new ids (boss_*, offer_*, mascot_*, emb_*) have no Asset Hub rows yet; the Lead adds the rows (the out ids in the JSON are the proposed ids).
- Mascot name "Bolt" is a placeholder.
- Batch order is production order; the Lead may reorder batches as long as each batch's `dep` is respected.
- tools/slice-art.mjs does not exist yet and no Node image library is installed: a follow-up task must pick sharp or a Python/Pillow script and implement section 6.

Offer and popup art is mock only: it supplies pictures for the template library and never touches payments.

