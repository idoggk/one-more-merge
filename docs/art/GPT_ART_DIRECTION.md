# GPT art direction (chat "OMM Art Director")

## Summary: actionable changes (12 lines)

1. GPT scores us 6/10 now, 9/10 potential: the problem is art direction and consistency, not single-asset beauty. Do not commission more units until the foundation is fixed.
2. Lock ONE render spec: unit part1 sheet (bold outline, simple geometry) is the base; the part2 "realistic" sheet (dynamo, wrecking ball, press) is off-style and the hero/background are painterly. Re-make off-style units.
3. Cut ~40% of UI decoration; make 3 levels (hero, primary action, secondary). Gold currently means everything, so reserve it for rewards, legendary and primary actions and add cool charcoal/cream neutrals.
4. Home: one bigger (35-50%) hero machine with personality, clear space around it, PLAY unmistakable; the hero background is too busy at the edges.
5. Buttons/bars: thinner brass rims, more coloured surface, real pressed/disabled/selected states; bars thicker with readable fill. One type family, fewer outlines, big numbers.
6. Units: silhouette must read at 60-80 px; strong silhouette per function; same scale/camera/outline/light. Chests need different silhouettes per tier, not material swaps.
7. Adopt the Q3 master style sentence, OMM_STYLE_LOCK_V2 (30 deg 3/4, light upper-left, 4-5% dark local-colour outline, hex palette, plate <=115% of machine) and the negatives list on every generation.
8. Use the 9 category templates (Q3 D) and the Q5 "visual fingerprint" line; assign reference roles when attaching anchors (2-3 anchors only).
9. Review every image with the 20-item rubric (Q4): 0-2 each, 35-40 pass, 28-34 redo, 0-27 reject, any critical 0 = reject; check at 70 px and 110 px on light and dark backgrounds.
10. Rank sets: define exactly what each rank adds, design ranks 1/4/8 first, repair single cells instead of regenerating sheets; assemble sheets by script (slivers, uneven grids and duplicate ranks come from AI grids).
11. Approve ONE machine, ONE button, ONE chest under V2 before bulk work; then order: UI kit, board, units and monsters, FX, home/backgrounds, crates, secondary UI. Add scripted checks (size, alpha, margins, thumbnails).
12. Missing assets GPT lists: board states and drag visuals, 20-30 FX families, 60-80 icons, monster/boss animation states, onboarding hand/spotlight, event templates. Build one polished vertical slice first (home, battle, monster, merge chain, chest, win).

NOT ANSWERED: Q6 (top 25 assets and 10 improved prompts). It was sent and ChatGPT was streaming the answer (a ranked list of about 25 items was visible: e.g. battle HUD, Coil 8-rank progression, reward chests Wood/Iron/Gold, victory screen, Bell ranks, projectile and shooting FX, monster damage/death FX, gameplay tile states, navigation and currency icons, home background, boss entrance, crate opening, screw-sort board) but the browser lease hit the 20-minute cap before it could be copied. The answer is in the same ChatGPT chat (URL below); a follow-up browser task should copy it into section Q6.

Source: owner's ChatGPT, 2026-10-13, one chat (https://chatgpt.com/c/6ace32b2-2db0-83eb-8c05-394d482fd3a9, auto-titled "Art Direction Critique"). Answers below are copied verbatim from the page text. Attached in Q1: UI screens overview, units part1/part2 contact sheets, reward chests sheet, home hero background, logo, UI buttons sheet, UI bars sheet.

---

## Q1. Brutal art-director critique

One More Merge — Art Director Review

Overall assessment: 6/10 visually. Potential: 9/10.

You have attractive individual assets. You do not yet have a cohesive premium mobile game.

The biggest issue isn't illustration quality. It's art direction, visual hierarchy, and consistency. Some elements look like polished commercial game assets; others look like independently generated AI assets assembled into a prototype.

Here's what I'd fix, ranked by damage to the first impression.

1. The UI is visually exhausting — Critical
Highest priority

The screens have too many competing elements: gold borders, metallic frames, badges, icons, ribbons, glowing buttons, textures, and decorative machinery.

Almost everything demands attention. Consequently, nothing dominates.

Look at your Units, Crates, and Victory screens. Every component tries to look valuable.

What Royal Match does differently: It establishes one obvious focal point, surrounds it with relatively quiet supporting elements, and uses decoration selectively.

Fix: Remove roughly 40% of decorative UI detail. Establish three visual levels: hero content, primary actions, secondary information. Give important elements actual breathing room.

2. Your art styles don't belong to the same game — Critical

Your first unit sheet (belt drive, blowtorch, piston) uses bold illustrative outlines, saturated colors, and simplified geometry.

Your second sheet (dynamo, wrecking ball, hydraulic press) is substantially more realistic, with complex metallic reflections, detailed surfaces, and thinner outlines.

Your workshop background is more painterly and texturally detailed than either.

These look like assets from three different games.

Your UI adds a fourth style: heavily embossed, almost casino-like interfaces.

Fix: Lock a single rendering specification. I'd choose the first unit sheet as the foundation, but improve its materials and lighting. Every unit needs matching outlines, light direction, roughness, proportions, and level of detail.

3. The home screen lacks a memorable hero — Critical

Your cannon looks good, but a cannon sitting on a pedestal isn't a particularly compelling home-screen identity.

The original home mock with the board is especially weak: dozens of tiny icons compete with the logo and PLAY button.

The separate hero background has a strong workshop atmosphere, but it's extremely busy around the edges and lacks enough visual separation for the hero.

What Clash Royale does differently: Characters, expressions, silhouettes, and dramatic composition create instant emotional recognition.

Fix: Make the central machine 35–50% larger. Add a recognizable personality through expressive mechanical design, movement, and dramatic lighting. Keep the PLAY button unmistakable.

4. Your buttons and progress bars look generic — High

The button shapes are usable, but the thick brass frames, strong bevels, and identical glossy treatment give them a dated browser-game aesthetic.

Your progress bars are particularly weak. They're extremely thin, visually plain, and don't feel integrated with the more dimensional UI.

Fix: Reduce metallic borders, increase the visible colored surfaces, improve pressed/disabled states, and distinguish primary from secondary buttons by more than color.

Progress bars need a clear fill, stronger proportions, and readable overlays.

5. The unit designs lack a unified silhouette language — High

Several units are excellent: the blowtorch, blueprint, capacitor, and dynamo.

Others are less successful.

The blast plate reads as an upright slab. The pipe looks like plumbing. The spring is generic. The wrench appears to be an ordinary tool attached to a base.

Meanwhile, the dynamo has significantly more visual complexity than the simpler machines.

What top games do differently: Units remain recognizable at tiny sizes, and their silhouettes communicate their function before players notice surface details.

Fix: Test every unit at actual 60–80 px gameplay size. Simplify internal detail, strengthen silhouettes, and establish consistent scale.

6. The palette is oversaturated and gold-heavy — High

Gold currently means everything: decoration, rarity, buttons, currency, machinery, frames, rewards.

When everything is gold, gold stops feeling special.

Your warm workshop background also reduces contrast with your orange, red, and brass units.

Fix: Introduce more controlled cool neutrals, charcoal blues, and cream surfaces. Reserve intense gold for rewards, legendary content, and important actions.

7. The reward chests don't feel sufficiently differentiated — Medium

The chests are nicely illustrated. But they're basically identical shapes with material swaps.

Wood, Iron, and Gold should suggest progressively greater value through silhouette and construction, not just color.

Fix: Give higher-tier chests larger locks, distinct proportions, stronger ornamentation, and increasingly dramatic opening effects.

8. The typography and branding need restraint — Medium

The logo is one of your strongest assets, but it's extremely wide and visually dense.

Several screens also mix small condensed text, outlined headings, ribbons, and tiny counters. At phone size, readability suffers.

Fix: Use one cohesive type family with controlled weights, reduce unnecessary text outlines, and prioritize large readable numbers.

What I'd do first

Priority / Action / Expected impact

1. Redesign UI hierarchy and simplify frames — Very high
2. Standardize all unit art against one master style — Very high
3. Rebuild the home screen around one memorable machine — Very high
4. Establish a disciplined color/material system — High
5. Redesign buttons, bars, and typography — High
6. Polish crates, rewards, and animations — Medium

The most important distinction: Your problem isn't that you need more beautiful individual assets. You already have some.

You need fewer competing details, clearer visual priorities, and one consistent artistic identity.

Right now, One More Merge looks like an ambitious indie game with expensive-looking assets.

The target is a game where every screen feels intentionally designed by the same world-class art team.

I would not commission another 50 unit illustrations until that foundation is fixed.

---

## Q2. Asset taxonomy leading merge and defence games ship

One More Merge — Premium Asset Taxonomy

Leading games like Royal Match, Rush Royale, and Merge Mansion don't just ship beautiful illustrations. They ship complete visual systems: every interaction, transition, reward, and failure has a deliberately designed visual response.

Below is the asset inventory I'd target for OMM. ★ TOP 10 marks the assets with the greatest first-impression impact.

1. UI System

Minimum polished launch:

★ #1 — Complete UI design system: Consistent panels, popup frames, tabs, cards, ribbons, counters, and dividers.

★ #2 — Premium button system: Primary, secondary, destructive, disabled, selected, pressed, and loading states.

Typography: Display headings, numbers, labels, countdowns, outlined text styles.

Progress bars: HP, XP, collection, timed events, resource meters.

Navigation: Selected/unselected tabs, notification badges, locks.

Feedback: Tooltips, toast messages, confirmation dialogs, error states.

Likely gap: You're creating individual UI components without a strict shared design system.

2. Characters & Machines

★ #3 — Unified machine art: All 22 units must share scale, lighting, camera, material treatment, and outline thickness.

★ #4 — Hero machine presentation: Large hero art, idle animation, activation, attack, upgrade, and victory poses.

Rank progression: Eight visually distinct ranks per relevant unit.

Unit portraits: Board-sized sprites, collection cards, enlarged inspect views.

Rarity treatments: Common, Rare, Epic, Legendary frames and highlights.

Machine states: Idle, charging, firing, damaged, boosted, disabled.

Likely gap: Machines look attractive but don't yet feel animated or alive.

3. Monsters & Bosses

★ #5 — Memorable monster roster: Distinct silhouettes, consistent rendering, identifiable personalities.

Minimum animation states: Spawn, idle/move, anticipation, hit, attack, death.

Bosses: Unique entrance, signature attack, enraged state, defeat sequence.

Status overlays: Shield, stun, burn, electric, vulnerability.

Portraits: Boss cards, chapter previews, Monster Book thumbnails.

Minimum: Every shipped enemy animated; each boss has a distinctive introduction and death.

4. FX Sprite Library

★ #6 — Signature merge effects: Merge absorption, rank-up flash, neighbor wake-up pulse, chain propagation, MAX-rank celebration.

★ #7 — Combat impact effects: Cannon blast, projectile trails, electric arcs, explosions, critical hits, boss damage.

Economy FX: Currency fly-to-counter, chest opening, collectible reveal.

Feedback FX: Button press, star burst, confetti, unlocking, screen transition.

Atmosphere: Sparks, steam, dust motes, subtle workshop lighting.

Minimum: Approximately 20–30 reusable effect families, with timing and size variants.

Likely gap: Effects may not yet deliver the excitement promised by the illustrations.

5. Icons & Symbols

★ #8 — Cohesive icon library: Currency, energy, stars, cards, upgrades, settings, navigation, achievements, boosters.

Status icons: Poison, stun, shield, overheat, damage bonuses.

Gameplay symbols: Merge arrows, chain counter, rank indicators, targets.

Empty states: No crates, locked content, missing resources.

Minimum: Around 60–80 consistent icons with common stroke, palette, and lighting rules.

6. Backgrounds & Environments

★ #9 — Premium home composition: Dedicated hero stage, clear focal point, controlled negative space.

Gameplay arenas: Workshop board, chapter-specific environments.

Boss backgrounds: Distinct lighting and environmental drama.

Secondary screens: Collection, Machine, Crates, Events.

Modals: Dimmed backdrop, spotlight treatment, contextual background blur.

Minimum: One exceptional home scene, 3–4 chapter environment treatments, and coherent secondary-screen backgrounds.

7. Gameplay Board

★ #10 — Premium board system: Legible tile materials, cell shadows, selection states, drag feedback, and clear merge destinations.

Tile states: Normal, occupied, locked, blocked, highlighted, affected.

Drag visuals: Lift shadow, ghost placement, snapping, invalid drop.

Special mechanics: Oil slick, tow bar, portals, row lock, time ransom.

Combat HUD: Boss HP, countdown, chain multiplier, progress indicators.

Minimum: Every gameplay state visually identifiable at a glance, even without text.

8. Rewards & Progression

Crates: Closed, opening, opened, glowing, and reward-reveal states.

Currency: Coins, Gems, Bolts, energy, Spare Parts.

Reward presentations: Card reveal, rarity reveal, duplicate conversion.

Celebrations: Victory, three stars, chapter completion, unit unlock.

Progression: Map nodes, milestones, trophy shelf, chapter medals.

Minimum: Three distinctive crate-opening sequences, four rarity reveals, and polished victory/defeat flows.

9. Onboarding & Guidance

Animated hand pointer and drag trail.

Highlight masks, spotlight rings, instructional arrows.

Merge preview and chain-path indicators.

Contextual speech bubbles and hint cards.

Tutorial success animations.

Minimum: Guided first merge, first chain, first combat victory, and first upgrade.

10. Events & Live Operations

Reusable event banners and backgrounds.

Timers, calendars, milestone tracks, leaderboard modules.

Daily Bench, Boss Rush, Bounties visual identities.

Seasonal theme overlays, collectible tokens, limited-time rewards.

Special offers and shop presentations.

Minimum: One shared event UI template with three recognizable event identities, reusable rewards, and seasonal recoloring support.

Production recommendation

Visual production priority / Relative importance

- Gameplay board + merge/combat FX — 100
- UI design system — 95
- Home hero + machine art consistency — 90
- Monster identity + animations — 80
- Rewards + crate reveals — 68
- Icons + progression — 55
- Events + seasonal content — 35

My production rule: Build one polished, fully animated vertical slice before scaling the asset library.

That means one home screen, one battle, one monster, one merge chain, one chest opening, and one victory sequence at near-final quality.

If those six experiences feel like a top-tier game, scaling the rest becomes a production problem rather than an art-direction problem.

---

## Q3. Master style sentence, style lock, negatives, per-category templates

ONE MORE MERGE — ART PROMPT SYSTEM V2

The goal is to make 100+ separately generated assets look like they came from one premium mobile-game art studio, not 100 independent AI generations.

One important rule: style consistency comes from fixed visual specifications AND reference images. Text alone cannot guarantee identical results across separate chats.

### A. MASTER STYLE SENTENCE (51 words)

Premium AAA mobile puzzle-game illustration: chunky, charming toy-like 3/4 forms, strong simplified silhouettes, smooth glossy enamel, controlled brass accents, warm cream mounting plates, and bold dark-colored outlines. Clean sculpted geometry, restrained highlights, soft dimensional shadows, warm studio lighting, vivid but disciplined colors, instantly readable at thumbnail size, handcrafted polish, never photorealistic.

### B. UNIVERSAL STYLE LOCK

Paste this at the beginning of every asset-generation chat. The category templates below go immediately afterward.

OMM_STYLE_LOCK_V2

Create artwork for ONE MORE MERGE, a premium stylized mobile puzzle game. Match the attached approved anchor images, never reinterpret their visual language. Use orthographic-like 3/4 perspective: camera 30° above the subject, viewing its front and right sides, no wide-angle distortion. Light comes from upper-left, with one broad soft highlight and one restrained specular streak per major surface; soft contact shadows fall lower-right. Use chunky rounded geometric forms, exaggerated readable proportions, and dark chocolate or dark local-color outlines, approximately 4–5% of the object's visible width, consistent throughout. Never pure-black outlines.

Primary palette: vermilion red #E9422B, warm gold #F3B62F, cobalt blue #168DE0, cream #F2E6C9, dark charcoal #303139, brass #C99532. Use emerald #27B957, cyan #35CDEB, and violet #9343CB only as controlled secondary accents. Surfaces resemble smooth painted toy enamel, satin brass, softly brushed steel, and clean ceramic. Keep highlights broad and simple, reflections controlled, shadows warm, and micro-details minimal. Brass must be accent material, not the dominant surface.

Machines always sit on compact cream-colored beveled mounting plates with four simplified brass corner feet, plate width no more than 115% of the machine body. Maintain consistent component scale and viewing direction. All isolated assets must be fully visible, centered, with 10% safe margins, on a true transparent background. Default asset canvas: 1024×1024 PNG, unless a sheet or special aspect ratio is explicitly requested. No environmental lighting baked into transparent assets beyond subtle contact shading. Backgrounds and full-screen interfaces instead use explicitly requested dimensions. Favor silhouette, readability, restrained material contrast, and cohesive handcrafted illustration over extra detail.

### C. UNIVERSAL NEGATIVE LIST

Append to every prompt:

NO photorealism, realistic PBR rendering, thin outlines, black outlines, sketch lines, painterly brush strokes, gritty textures, rust, scratches, dirt, excessive rivets, excessive gears, microscopic mechanical detail, complex reflections, chrome everywhere, hard reflections, blown highlights, heavy bloom, harsh shadows, flat vector art, pixel art, anime styling, watercolor, excessive gradients, neon overload, random colors, mismatched camera angles, perspective distortion, oversized bases, clutter, text, watermarks, borders, cropped objects, inconsistent proportions, cheap plastic appearance, generic AI-detail noise.

Exception: Backgrounds may have atmospheric textures; FX may use additive glow; UI frames are typically front-facing, not 3/4; characters need skin and fabric materials. Category-specific instructions override the universal style lock where necessary.

### D. CATEGORY PROMPT TEMPLATES

Each template below is under 60 words. Copy it after the style lock and replace the bracketed values.

1. Units — Machines

Create [UNIT NAME], a [ROLE] machine with [PRIMARY MECHANISM]. Silhouette: [DISTINCTIVE SHAPE]. Main body [COLOR], accents [COLOR]. Clearly show [FUNCTIONAL FEATURE]. Rank [1–8], with [EXACT ADDITIONS]. Same 3/4 camera, cream plate, bold outline. Machine fills 80% of canvas. Readable at 64 pixels. Isolated transparent PNG.

2. Monsters & Bosses

Create [MONSTER NAME], a [TYPE] enemy with [PERSONALITY]. Primary silhouette [SHAPE]; exaggerated [FEATURE]. Palette [COLORS]. Expression [EMOTION]. Pose [ACTION], facing screen-left toward the player's machines. Clearly readable face, limbs, and attack weapon. Bosses: oversized upper-body mass and one iconic [SIGNATURE FEATURE]. Full-body isolated transparent PNG, no mounting plate.

3. UI Frames & Buttons

Create a [UI COMPONENT] in ONE MORE MERGE's premium toy-enamel UI style. Front-facing, symmetrical, [SHAPE], [WIDTH:HEIGHT]. Main surface [COLOR], restrained brass rim, cream inner panel, broad upper-left highlight. State [NORMAL/PRESSED/SELECTED/DISABLED]. Keep center completely clear for dynamic text or icons. High contrast, generous internal padding. Transparent PNG, no lettering.

4. Icons

Create [ICON NAME] representing [FUNCTION]. One bold instantly recognizable silhouette, chunky proportions, enamel surface, dark local-color outline. Primary [COLOR], one secondary [COLOR], brass only when appropriate. Front or slight 3/4 view matching [APPROVED ICON REFERENCE]. No tiny details, no base plate, no text. Centered transparent square PNG; readable at 24–48 pixels.

5. Backgrounds

Create a vertical [LOCATION] workshop environment for [SCREEN], 9:16 composition. Warm handcrafted toy-world architecture, simplified materials and restrained brass. Lighting from upper-left. Detailed decorative elements around [EDGE AREAS], spacious low-contrast negative space at [UI PLACEMENT]. Main visual emphasis at [FOCAL LOCATION]. Strong foreground/midground/background separation, controlled atmospheric depth. No text, characters, UI or interface elements.

6. Board & Cell Tiles

Create [BOARD ELEMENT], viewed from a fixed 3/4 top-down angle matching [APPROVED BOARD REFERENCE]. Material [MATERIAL], palette [COLORS], state [NORMAL/SELECTED/LOCKED/BLOCKED]. Clean rectangular geometry, simple beveled edges, consistent grid proportions, readable boundaries, subtle upper-left lighting. Tileable where applicable. No decorative noise. Transparent PNG, [DIMENSIONS], exact alignment with the existing 6×5 gameplay grid.

7. Chests & Rewards

Create [REWARD OBJECT], rarity [TIER]. Strong [SILHOUETTE] shape, main material [MATERIAL], accent [COLOR]. Distinctive lock or emblem [FEATURE]. Show [CLOSED/OPEN/REVEAL] state. Increase perceived value through shape and controlled lighting, not extra tiny decorations. Same 3/4 camera and outline. Centered transparent PNG, 10% safe margin. No labels.

8. FX Sprites

Create a clean VFX sprite for [EVENT]: [EFFECT DESCRIPTION]. Shape [SILHOUETTE], core [COLOR], outer glow [COLOR]. Strong bright center, smooth controlled falloff, sparse particles. Designed for [ADDITIVE/ALPHA] blending and [DURATION] animation. One isolated frame, centered, generous margins. Transparent PNG unless explicitly specified otherwise. No machines, text, backgrounds, or borders.

9. Mascot & Characters

Create [CHARACTER NAME], a charming [ROLE/SPECIES] with [PERSONALITY]. Oversized expressive head, compact readable body, distinctive [SILHOUETTE FEATURE]. Palette [COLORS], outfit [DETAILS], expression [EMOTION], pose [ACTION]. Same toy-like enamel illustration style with simplified fabric and skin shading. Full-body 3/4 front view, upper-left lighting, thick local-color outline. Transparent PNG, no base plate.

### E. THREE RULES THAT WILL ACTUALLY KEEP THIS CONSISTENT

1. Build a canonical anchor set. Select three approved unit images, one icon, one UI component, and one chest. Attach the relevant anchors to every new generation chat. Do not use the mixed-style contact sheets as references without clearly identifying which examples are approved.

2. Never ask AI to invent rank progression. Specify exactly what is added at each rank. Parts inherited from earlier ranks must retain their size and placement. This prevents the inconsistent silhouettes already appearing in your upgrade sheets.

3. Lock assets through a visual approval gate. Before accepting each sheet, evaluate silhouette readability at actual gameplay size, camera angle, color palette, outline consistency, highlight direction, base proportions, and visual complexity. Reject any sheet failing a critical check.

One production detail: For perfect transparency, consistent spritesheet grids, and exactly aligned frames, use post-processing scripts. Image generation alone will not reliably guarantee pixel-perfect production assets.

My strongest recommendation is to approve one definitive machine asset, one definitive button, and one definitive chest under V2 before bulk-generating anything else. Those three will define the quality bar for the entire game.

---

## Q4. 20-item rejection rubric

(The page's interactive score calculator widget is omitted; the table below is its content.)

ONE MORE MERGE — Asset Rejection Rubric V1

Purpose: Evaluate every AI-generated asset before it enters the game. Judge against approved OMM reference assets, not against the image in isolation.

Scoring: 20 criteria × 2 points = 40 maximum.

0 = Fail: Clearly violates the art specification or production requirements.
1 = Acceptable: Usable, but has a visible weakness.
2 = Great: Matches the approved premium quality standard.

★ = AUTO-REJECT: A score of 0 immediately rejects the asset, regardless of total score.

| # | Criterion | 0 — Fail | 1 — Acceptable | 2 — Great |
|---|---|---|---|---|
| 1 ★ | Outline weight | Missing, broken, black, or wildly inconsistent | Dark local-color outlines; minor variation | Consistent bold 4–5% outline; clean joins |
| 2 | Light direction | Conflicting or bottom/right primary lighting | Mostly upper-left | Consistent upper-left with controlled highlights and lower-right shadows |
| 3 | Palette discipline | Random hues, neon overload, clashes | Mostly follows OMM palette | Cohesive restrained colors; intentional accents |
| 4 ★ | Silhouette at 70 px | Cannot identify object or function | Recognizable with some effort | Immediately recognizable without internal detail |
| 5 | Readability at 110 px | Important features merge or disappear | Core features distinguishable | Strong hierarchy; essential features instantly clear |
| 6 ★ | Edge halos / fringes | Visible white/dark fringes or cutout artifacts | Minor fringe invisible at gameplay scale | Clean antialiased edges on light and dark backgrounds |
| 7 ★ | Baked text | Unrequested text, gibberish, numbers or lettering | Small intentional nonfunctional symbols | No text; designated text areas remain empty |
| 8 ★ | Symmetry artifacts | Duplicated limbs, impossible mirror parts, fused shapes | Minor asymmetry without functional issues | Intentional, believable, structurally clean geometry |
| 9 ★ | Cell-edge slivers | Neighbouring object/grid fragments at crop edges | Clean borders but slightly uneven padding | Fully isolated asset; clean 10% safe margin |
| 10 ★ | Perspective consistency | Wrong view, inverted orientation, severe distortion | Close to approved 3/4 camera | Matches approved camera and visible faces |
| 11 | Material consistency | Photorealistic/chrome/painterly mismatch | Mostly enamel, brass and simplified steel | Every material matches approved toy-world finish |
| 12 | Visual complexity | Cluttered, noisy, excessive micro-details | Some unnecessary decoration | Bold simplified forms; every detail has purpose |
| 13 ★ | Aspect ratio / dimensions | Wrong canvas, sheet layout or number of cells | Correct format, slightly uneven positioning | Exact requested format, grid and consistent spacing |
| 14 ★ | Transparency / background | Opaque background, checkerboard baked in, holes | Correct alpha, minor edge imperfections | True transparency; clean alpha and no unwanted shadows |
| 15 ★ | Anatomy / mechanical logic | Impossible joints, extra limbs, disconnected mechanism | Plausible with minor stylized shortcuts | Clear construction, believable function, deliberate exaggeration |
| 16 | Gold / brass overuse | Gold dominates everything, rarity loses meaning | Slightly excessive trim | Gold restrained to intentional accents and hierarchy |
| 17 | Shape / scale consistency | Machine too small, oversized base, inconsistent proportions | Close to approved scale | Consistent framing, compact base ≤115% of machine width |
| 18 | Surface finish | Dirty, scratched, noisy, plastic-looking or overexposed | Clean finish with minor highlight problems | Smooth sculpted enamel; broad highlights, restrained speculars |
| 19 ★ | Identity / rank correctness | Wrong object, missing required parts, duplicate rank appearance | Correct identity, minor nonessential deviation | Exact requested identity, features and rank progression |
| 20 | Overall premium appeal | Generic AI asset, cheap mobile aesthetic | Professional-looking, not distinctive | Appears native to a cohesive top-tier mobile game |

★ Critical failures only apply where the criterion is relevant: e.g., no mandatory outline for additive FX, no 3/4 perspective for flat UI, and no mounting plate for monsters.

Acceptance thresholds

- PASS: 35–40 — Ship it
- REDO: 28–34 — Revise / rerender
- REJECT: 0–27 — Regenerate

Mandatory visual test

Every generated asset must be inspected in four conditions:

- 70 × 70 px: Silhouette and object recognition without zooming.
- 110 × 110 px: Functional features, rank distinction and proportions.
- Light background: White halos, pale fringes and missing outlines.
- Dark background: Black halos, lost shadows and alpha artifacts.

For a multi-cell sheet, review each cell individually and the sheet as a whole. One critical failure in a cell rejects that cell; a contaminated grid boundary or wrong layout rejects the full sheet.

Reviewer operating rules

PASS (35–40): No critical failures. Ready for integration after export validation.

REDO (28–34): No critical failures. Give the generator the three lowest-scoring criteria and explicit corrections.

REJECT (0–27 or any critical zero): Do not integrate. Regenerate or repair, then run the full rubric again.

Important distinction: A zero score for a critical production-format error can sometimes be repaired deterministically (for example, cleaning a stray pixel). A zero for wrong perspective, anatomy, identity, or silhouette usually needs regeneration.

For AI-assisted review, require the reviewer to output the 20 scores, total, critical failures, final verdict, and top three actionable corrections. Never accept a generic judgment such as "looks good."

Final standard: An asset scoring 40/40 in isolation can still be wrong for One More Merge. Always compare it side-by-side with the approved anchors and its actual in-game neighbors.

---

## Q5. Generation workflow tips

OMM — Image Generation Workflow V1

Production rules for ChatGPT image generation, optimized for consistency, quality, and minimal wasted generations.

### 1. Sheets vs. single images

| Asset type | Recommended batch | Format |
|---|---|---|
| Machine ranks 1–8 | 4×2 sheet | Landscape 3:2 |
| New machine concepts | 2×2 sheet | Square |
| Small UI icons | 3×3 or 4×3 | Square / landscape |
| Buttons and variants | 3×2 sheet | Landscape |
| Progress bars | 3×2 sheet | Landscape |
| Reward chest states | 3×2 sheet | Landscape |
| Monsters | 2×2 concepts | Square |
| Bosses / hero characters | Single image | Square / portrait |
| Backgrounds | Single image | Portrait 9:16 |
| UI screen mockups | Single image | Portrait 9:16 |
| FX sprites | 3×2 sheet | Landscape |
| Final approved hero assets | Single image | 1024×1024 or larger |

Rule: Use sheets for related variations, not unrelated complex objects.

The 4×2 rank sheets are useful because the model can compare the evolution visually. However, producing eight detailed machines simultaneously increases the likelihood of malformed geometry and duplicate ranks.

For difficult machines, generate ranks individually after approving a progression sheet.

### 2. Reference anchoring — the most important technique

Attach 2–3 approved references, ideally:

- Primary style anchor: Your best approved machine in the desired rendering style.
- Secondary consistency anchor: Another approved machine demonstrating matching proportions, outlines, brass and lighting.
- Format anchor: An approved 4×2 sheet or equivalent category-specific layout.

Do not attach ten reference images. Too many competing examples can blur the intended style.

For UI generation, use approved UI components instead of machine sheets. For monsters, use monster references.

Always explicitly assign reference roles. Example:

Image 1 controls ART STYLE. Image 2 controls CAMERA and MATERIALS. Image 3 controls SHEET FORMAT. Do not copy their objects.

Never use your photorealistic dynamo sheet and cartoon piston sheet as equally authoritative style references.

### 3. Create a repeatable visual fingerprint

Use the same exact anchor wording in every prompt:

OMM VISUAL FINGERPRINT V2: 30-degree elevated front-right orthographic 3/4 view; chunky toy geometry; dark local-color 4–5% silhouette outlines; broad upper-left enamel highlights; one restrained specular streak; warm lower-right shadows; controlled red, cobalt, cream and brass palette; compact cream four-foot mounting plate; no micro-details; readable at 70 pixels.

This acts like a verbal seed. It improves consistency but does not reproduce an actual random seed or guarantee identical styling. Reusing the same approved image anchors is more reliable than wording alone.

### 4. Generate concepts first, production assets second

Use three passes:

- Pass A — Design: Generate 2–4 silhouette concepts. Choose the strongest identity.
- Pass B — Style: Render the selected concept against approved anchors. Fix proportions and materials.
- Pass C — Production: Produce the exact sheet, canvas and isolated assets. Run the 20-point rejection rubric.

Do not ask for concept exploration, eight upgrade ranks, pixel-perfect alignment, and flawless transparency in one generation.

### 5. Rank 1–8 progression: use an additive blueprint

Before generating the sheet, define exactly what changes.

| Rank | Visual instruction |
|---|---|
| 1 | Core mechanism; minimal functional structure |
| 2 | Add one visible component |
| 3 | Enlarge or extend a signature component |
| 4 | Add a second functional module |
| 5 | Add a recognizable accent or secondary mechanism |
| 6 | Add a substantial silhouette-changing upgrade |
| 7 | Add a larger/taller distinctive mechanism |
| 8 | Final signature form; unmistakable silhouette |

The table is a planning pattern, not a fixed rule for every machine.

Lock all inherited geometry. Rank 7 must preserve components inherited from ranks 1–6 unless a replacement is explicitly specified.

For OMM, I recommend:

1. Design ranks 1, 4 and 8 first.
2. Confirm clear silhouette differences.
3. Fill ranks 2–3, 5–7.
4. Generate the 4×2 comparison sheet.
5. Fix problematic ranks independently.
6. Assemble the final sheet programmatically.

The final step is important: AI-generated grids rarely provide perfectly equal cell boundaries.

### 6. Iterating without style drift

Avoid: "Make this better, more premium, more detailed." That invites the model to redesign everything.

Instead, use:

EDIT THE ATTACHED IMAGE, NOT A NEW DESIGN. Preserve the exact composition, camera, palette, outline style, lighting, object identity, sheet dimensions, cell positions and all approved geometry. Change ONLY [SPECIFIC CHANGE]. Do not modify [LOCKED ELEMENTS]. Maintain pixel-scale readability and the original visual language. All other elements must remain visually unchanged.

Even explicit preservation instructions cannot guarantee pixel-identical edits.

Production rule: After two unsuccessful correction attempts, stop regenerating the entire sheet. Isolate the problem cell, repair it separately, and composite the result.

### 7. Upscaling and transparency

Generate at the highest practical native resolution. Do not assume upscaling will recover missing shape information.

For 4×2 sheets, a 1536×1024 image provides only about 384×512 pixels per cell before margins.

Recommended workflow:

1. Generate with transparent background requested.
2. Verify the exported file actually contains an alpha channel.
3. Remove residual opaque backgrounds using segmentation/masking when necessary.
4. Inspect edges over both cream and charcoal.
5. Remove halos, stray pixels, and neighboring-cell contamination.
6. Crop to the visible object using consistent padding.
7. Upscale only when the output resolution is insufficient, preferably before final edge cleanup.
8. Export optimized PNG/WebP and inspect at actual phone size.

Critical: A checkerboard-looking background is not proof of transparency. A black preview is not proof of opacity, either. Verify the alpha channel itself.

Upscalers can introduce fake screws, sharpen outlines excessively, or create white fringes. Never upscale approved assets without rechecking them.

### 8. Batch the whole game in dependency order

| Phase | Assets | Why |
|---|---|---|
| 1 | Three master machines, button, chest | Lock quality standard |
| 2 | Core UI panels, bars, typography system | Establish visual hierarchy |
| 3 | Gameplay board, cells, drag/merge states | Most-seen gameplay surface |
| 4 | Machine ranks and core monsters | Main content |
| 5 | Merge, shoot, hit and victory FX | Game feel |
| 6 | Home hero, chapter environments | Presentation |
| 7 | Crate reveals, rewards, progression | Retention feedback |
| 8 | Collection, shop, events, secondary UI | Supporting systems |
| 9 | Additional units, seasonal variations | Scalable content |

Do not generate all 22 units before approving a single final in-game board. You need to know how the artwork looks at real gameplay scale.

### 9. Separate chats: build a portable reference package

Each new chat should receive the same miniature art bible:

- OMM_STYLE_LOCK_V2.txt — Master style specification.
- OMM_NEGATIVES_V2.txt — Universal exclusions.
- OMM_ANCHORS_V2.png — Approved visual references, clearly labeled.
- OMM_CATEGORY_TEMPLATE.txt — Instructions for that asset type.
- OMM_RUBRIC_V1.txt — Rejection criteria.

Use consistent naming: omm_[category]_[asset]_[rank-or-state]_v[number].png

Examples: omm_unit_piston_r06_v03.png, omm_ui_button_primary_pressed_v02.png

Maintain one approved asset manifest identifying the canonical version of each asset. Otherwise, separate chats will gradually diverge.

### 10. Common failure modes and exact fixes

| Failure | Best correction |
|---|---|
| Too realistic | Reference approved cartoon anchor; simplify materials |
| Excessive micro-detail | Specify maximum 3–5 major visual components |
| Ranks look identical | Require distinct silhouettes and additions |
| Earlier parts shrink | Explicit inherited-part size locks |
| Wrong camera | Use one approved angle reference |
| Brass dominates | Specify material area limits, e.g. brass under 20% |
| Outline thickness varies | Compare against one canonical outline anchor |
| Machine too small | Set object bounding-box target |
| Base plate oversized | Enforce ≤115% machine width |
| Grid contains extra objects | Separate cells and composite programmatically |
| Slivers along sheet edges | Re-crop each individual cell and reassemble |
| Same object appears twice | Generate difficult cells individually |
| Sheet elements overlap | Increase gutters or reduce cell count |
| Text artifacts | Generate blank UI and add text in code |
| White/black edge fringes | Alpha-mask cleanup and edge-color decontamination |
| Edit changes unrelated parts | Reattach original, lock geometry, reduce edit scope |
| Colors drift across chats | Explicit hex palette + approved anchor |
| Too many light sources | Specify one dominant upper-left light |
| Image looks good but unreadable | Test at 70 px and simplify silhouette |
| Premium detail harms gameplay clarity | Remove secondary details, not enlarge everything |

### 11. Add automated production validation

Image generation should produce source artwork, not be responsible for every final export requirement.

Use scripts to validate:

- Exact image dimensions and aspect ratio.
- Actual alpha-channel presence.
- Cell count, grid alignment, and boundaries.
- Nontransparent pixels touching forbidden margins.
- Unexpected stray components.
- Asset bounding-box occupancy.
- Thumbnail previews at 70 and 110 pixels.
- Duplicate or near-identical rank images (flag for human review).

Mechanical checks should be automated. Style, silhouette, and premium appeal still need visual review.

### 12. The golden rule: one approved source of truth

OMM production approval pipeline: Approved anchors + locked specification → Concept → selected design → final generation → Automated format + transparency checks → 20-point art review + 70/110 px tests → Approved master asset → integrate into game.

My strongest recommendation for OMM: Stop treating 4×2 generated sheets as the final production file. Treat them as design and consistency references. For especially important machines, generate or repair the eight ranks individually using the approved sheet as a visual guide, then assemble a pixel-perfect spritesheet with code.

That single workflow change will prevent many of your current problems: inconsistent spacing, contaminated cell edges, duplicate ranks, awkward crops, and wasted full-sheet regeneration.

---

## Q6. Top 25 assets to (re)make first, with 10 improved prompts

NOT COPIED (browser lease expired at the 20-minute cap). The question was sent and answered in the chat https://chatgpt.com/c/6ace32b2-2db0-83eb-8c05-394d482fd3a9 (last message). Follow-up: copy that answer here verbatim.
