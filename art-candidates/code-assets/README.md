# Code-drawn assets: what they look like, rated honestly

Every texture the game draws **in code** (no painted art loaded), rendered by the game's own drawing code to PNG sheets you can read on a phone. Nothing in `src/` was changed to make this.

## The short version (read this)

- **The 22 code-drawn units are not what a normal player sees.** All roster B units sit behind QA switches that default OFF (`TUNING.roster1..7 = false`, `rosterB = false`). With a switch on, the painted `unit_<id>.webp` lazy-loads and replaces the drawing. The code drawing still shows: (a) in the **home Machine tab** for roster B units (`machine.ts:66` skips `unitTex`), (b) for the first seconds of a cold start, (c) as the `job_*` glyph on each unit's detail page.
- Average rating of the 22 code units: **2.5 / 5** (generic flat icons; none above 3). The painted pictures next to them are a **4**: see [painted vs code](#painted-vs-code).
- **Rank growth is nearly invisible** in many code drawings: Belt Drive changes 0.7% of its pixels from rank 1 to 6, Tesla Tower 1.5%, Blast Plate 2.3%, Arc Welder 3.9%. Cannon changes 67.5%. (Numbers: `rank-spread.json`.)
- The code art that **every player sees** (default flags) is mostly UI and effects: the `dot` shot, cell marks, panels, buttons, the clock ring, the overdrive gauge. Those are the weakest-list priorities below.
- Calibration: I also took shipped-look screenshots (painted art on) of the board, Units tab and Screw Yard. The board and the Screw Yard are almost entirely painted; the code that stays visible is UI chrome: the clock ring, count chips, small labels, flat pills (SHOP, booster buttons, tab bar), panels, the `dot` shot and the cell marks.
- With **no painted art at all** the real game still boots and plays; the board looks cleaner than expected (see [real screens](#real-screens-with-no-painted-art)). Several screens lean on unguarded painted keys (neon-green missing-texture boxes on the Units tab, black squares for the result stars).
- `docs/art/AUDIT.md` is stale in three places: the 22 units now all have pictures (`unit_<id>.webp`); `ensureTextures()` bakes **353** textures, not 72 (39 families x 8 ranks = 312, 26 job glyphs, 2 tools, 13 small ones); only the 26 roster B units have a `job_*` glyph, not 39.

## Run it

```
npm ci
node tools/render-code-assets.mjs            # about 2-3 min, output: art-candidates/code-assets/
node tools/render-code-assets.mjs --only=screens   # one step only (dev aid; steps: textures crates marks support cards decor fx yards screens painted-vs-code; the last needs textures too)
```

Needs Chrome: it looks for `--chrome=PATH`, `$CHROME`, `/opt/pw-browsers/chromium`, then the usual Windows / Linux / Mac paths. It starts a temporary Vite server, opens `tools/render-code-assets.harness.html` headless, boots Phaser, imports the real modules and reads the textures back. Output is byte-identical run to run on one machine (checked: two full runs, 0 differing files; the clock is virtual, `Math.random` is seeded, the build stamp is pinned; text drawn in Arial uses the machine's fallback font, so another OS may differ).

Files: one PNG per texture at `<category>/<id>.png` (2x: the game's 1x textures are smooth-upscaled; live drawings are rendered at 2x), `index.json` (488 entries: id, category, file, width, height, rank, family, source, live, upscaled), `sheets.json`, `rank-spread.json`, `sheets/*.png`. Every sheet is 1160 px wide, so each one is already its own phone preview (no separate `previews/` needed). Sheets are 256-colour PNGs to keep the repo small; the single-texture PNGs are lossless.

## Counts

fallback-painted-units 136 · units-roster2 32 · units-roster3 32 · units-roster4 32 · units-roster5 24 · units-roster6 16 · units-roster7 40 · jobs-glyphs 26 · misc 3 · fx-textures 19 · backgrounds-ui 3 · targets 7 · crates 12 · cell-marks 22 · support-cards 26 · portraits-cards 22 · rank-decor 8 · screw-yard 14 · screens-code-only 14 = **488** PNGs (index.json has 488 entries). Units are every family x rank 1-8: the game bakes 8 ranks per family although the cap is 6 (8 for shooters / relays from saga level 21).

## Sheets

Start with these four.

<img src="sheets/units-overview.png" alt="all 39 at rank 3" width="380"> <img src="sheets/painted-vs-code-1.png" alt="painted vs code" width="380">

<img src="sheets/screens-code-only-3.png" alt="board with no art" width="380"> <img src="sheets/support-cards-1.png" alt="support cards" width="380">

<a id="painted-vs-code"></a>
### Painted vs code (the gap)

Painted `unit_<id>` | code rank 1 | code rank 6 | job glyph. Parts 1-3 are the 22 roster B units; "older" 1-3 are the 17 original units (painted rank 1 and 6 vs the fallback).

<img src="sheets/painted-vs-code-1.png" alt="painted-vs-code-1" width="380"> <img src="sheets/painted-vs-code-2.png" alt="painted-vs-code-2" width="380"> <img src="sheets/painted-vs-code-3.png" alt="painted-vs-code-3" width="380">

<img src="sheets/painted-vs-code-older-1.png" alt="painted-vs-code-older-1" width="380"> <img src="sheets/painted-vs-code-older-2.png" alt="painted-vs-code-older-2" width="380"> <img src="sheets/painted-vs-code-older-3.png" alt="painted-vs-code-older-3" width="380">

### The 22 code-drawn units (ranks 1-8, rows of 4)

<img src="sheets/units-roster2.png" alt="units-roster2" width="380"> <img src="sheets/units-roster3.png" alt="units-roster3" width="380"> <img src="sheets/units-roster4.png" alt="units-roster4" width="380">

<img src="sheets/units-roster5.png" alt="units-roster5" width="380"> <img src="sheets/units-roster6.png" alt="units-roster6" width="380"> <img src="sheets/units-roster7-1.png" alt="units-roster7-1" width="380"> <img src="sheets/units-roster7-2.png" alt="units-roster7-2" width="380">

### The 17 fallbacks for painted units

<img src="sheets/fallback-painted-units-1.png" alt="fallback-painted-units-1" width="380"> <img src="sheets/fallback-painted-units-2.png" alt="fallback-painted-units-2" width="380"> <img src="sheets/fallback-painted-units-3.png" alt="fallback-painted-units-3" width="380">

<img src="sheets/fallback-painted-units-4.png" alt="fallback-painted-units-4" width="380"> <img src="sheets/fallback-painted-units-5.png" alt="fallback-painted-units-5" width="380">

### Glyphs, cards, marks, widgets

<img src="sheets/jobs-glyphs.png" alt="jobs-glyphs" width="380"> <img src="sheets/portraits-cards.png" alt="portraits-cards" width="380"> <img src="sheets/cell-marks.png" alt="cell-marks" width="380">

<img src="sheets/support-cards-1.png" alt="support-cards-1" width="380"> <img src="sheets/support-cards-2.png" alt="support-cards-2" width="380"> <img src="sheets/rank-decor.png" alt="rank-decor" width="380">

### Crates, FX, backgrounds, misc

<img src="sheets/crates.png" alt="crates" width="380"> <img src="sheets/fx-textures.png" alt="fx-textures" width="380"> <img src="sheets/backgrounds-ui.png" alt="backgrounds-ui" width="380">

<img src="sheets/targets.png" alt="targets" width="380"> <img src="sheets/misc.png" alt="misc" width="380"> <img src="sheets/screw-yard-baked.png" alt="screw-yard-baked" width="380">

### Screw Yard scenes (real scenes, no painted art)

<img src="sheets/screw-yard-screens-1.png" alt="screw-yard-screens-1" width="380"> <img src="sheets/screw-yard-screens-2.png" alt="screw-yard-screens-2" width="380">

<a id="real-screens-with-no-painted-art"></a>
### Real screens with no painted art

The real `GameScene` booted headless. Home tabs (road / machine / events) need painted art to exist at all, so without it the game shows its legacy title.

<img src="sheets/screens-code-only-1.png" alt="screens-code-only-1" width="380"> <img src="sheets/screens-code-only-2.png" alt="screens-code-only-2" width="380">

<img src="sheets/screens-code-only-3.png" alt="screens-code-only-3" width="380"> <img src="sheets/screens-code-only-4.png" alt="screens-code-only-4" width="380">

## Ratings

1 placeholder / hurts · 2 weak · 3 acceptable-generic · 4 good · 5 top-tier. My judgement from these renders at 2x, one still frame each, no motion and no player test. Reference: the painted units in `src/assets/art` (I rate them 4: 3/4-view, brass trim, strong rank growth).

### Category averages

| category | items | avg |
|---|---|---|
| units (22 code-drawn, roster B) | 22 | **2.5** |
| fallback stand-ins (17 painted units) | 17 | **2.6** |
| job glyphs (26) | 26 | **2.9** |
| crates (procedural toolboxes) | 4 | **3.8** |
| cell marks / boss telegraphs | 5 | **2.8** |
| support cards + badges | 4 | **3.3** |
| crate-reveal cards (glyph tiles) | 1 | **3.0** |
| rank decor | 1 | **3.0** |
| fx textures | 17 | **2.9** |
| backgrounds / UI bakes | 3 | **2.7** |
| classic machine stand-ins (target_N) | 7 | **2.9** |
| misc (tools, hand) | 3 | **2.7** |
| Screw Yard baked bits | 8 | **2.9** |
| Screw Yard / Object Yard scenes (code only) | 6 | **2.5** |
| real screens with no art | 14 | **2.6** |

### The 22 code-drawn units

"Rank change" = % of pixels that differ between rank 1 and rank 6. Visible today: only with a QA roster switch on, and mostly for the first seconds (see top), plus the Machine tab.

| unit | role | rating | rank change | note |
|---|---|---|---|---|
| `wrench` | support, common | **2** | 36% | spanner reads as a Pac-Man on a stick; rank = bigger jaw + a few dots |
| `piston` | shooter, common | **2** | 43.3% | looks like a TNT plunger |
| `spring` | relay, common | **3** | 52.7% | clear spring; more coils with rank |
| `belt_drive` | relay, epic | **2** | 0.7% | dark pill with two wheels; ranks 1-8 look the same |
| `blowtorch` | shooter, rare | **3** | 14.1% | readable torch; flame grows a little |
| `pipe` | relay, rare | **2** | 4.3% | muddy L pipe, left end clipped by the tile edge |
| `blast_plate` | support, rare | **3** | 2.3% | shield with an X; rank = tiny pips |
| `tesla_tower` | shooter, legendary | **3** | 1.5% | clear tower and bolt; all 8 ranks identical |
| `capacitor` | relay, epic | **3** | 9.7% | battery cell lookalike of Battery; fill bars show rank |
| `blueprint` | support, epic | **2** | 6.7% | reads as a chart monitor, not a blueprint |
| `ladder` | relay, epic | **2** | 26% | rungs smear into a dark block at rank 3-4 |
| `rewind_crank` | support, epic | **3** | 6.6% | dial + lever, reads as a clock |
| `crane` | relay, legendary | **3** | 51.6% | gantry crane; the jib rises with rank |
| `dynamo` | relay, legendary | **2** | 11.7% | reads as a poker chip |
| `wrecking_ball` | shooter, epic | **3** | 18.6% | best silhouette of the set; chain clipped at top |
| `robot_arm` | shooter, legendary | **3** | 6.5% | clear arm + claw, rank lights; claw touches the tile edge |
| `tilt_lever` | support, legendary | **3** | 31.7% | seesaw + lever; tilts more with rank |
| `rivet_gun` | shooter, common | **2** | 16.3% | reads as a hair dryer; rivet dots |
| `vice` | relay, common | **2** | 31.8% | two grey cylinders; clamp pokes past the tile edge |
| `router` | relay, rare | **2** | 4.3% | a UI icon in a green square, not a machine |
| `hydraulic_press` | shooter, epic | **3** | 12.2% | reads as a press; plate lowers with rank |
| `lathe` | shooter, epic | **3** | 5.8% | reads as a lathe; thread marks grow |

### The 17 fallbacks for painted units

Drawn only if the painted `<family>_<rank>` picture is missing (load error, offline with a half-filled cache). The shipped pictures are a 4.

| unit | rating | rank change | note |
|---|---|---|---|
| `cannon` | **3** | 67.5% | red drum on wheels; best rank growth (more barrels) |
| `coil` | **3** | 71.4% | zigzag spring, flattens oddly at rank 5+ |
| `bell` | **3** | 45.8% | clean bell |
| `magnet` | **3** | 49.8% | horseshoe, field lines with rank |
| `battery` | **3** | 50% | clean cell; bars with rank |
| `fan` | **3** | 59% | fan in a ring |
| `rocket` | **1** | 45.7% | a recoloured BELL (drawGadget else-branch): wrong object |
| `mortar` | **2** | 32% | a green cup |
| `arc_welder` | **2** | 3.9% | reads as a padlock |
| `horn` | **2** | 28.5% | reads as a cocktail glass |
| `fuse_box` | **3** | 6.1% | pink card + bolt + sparks |
| `amplifier` | **3** | 7.3% | speaker cabinet |
| `signal_beacon` | **3** | 10.1% | cone + signal arcs |
| `nail_gun` | **2** | 19.8% | blocky grey gun, ranks = dark smear |
| `jackhammer` | **3** | 21.1% | drill bit on a yellow block |
| `gear` | **3** | 76.6% | cog + small cog from rank 3 |
| `saw_blade` | **3** | 44% | saw disc, reads well |

### Job glyphs (26, 64 px, `job_<unit>`)

Average **2.9**. 4: blowtorch, ladder, blast_plate, rewind_crank. 2: nail_gun, saw_blade, blueprint, piston, crane, router. Everything else 3. Problems for all of them: abstract diagrams (not the machine), mixed line weights, 64 px baked and shown up to ~98 px (blurry), and the unit-detail page shows one even when the picture loaded (`unitsTab.ts:176`).

### Everything else, per item where cheap

| item | rating | note |
|---|---|---|
| Tool Bag (`tbx_wood`) | 4 | stitched canvas, handles; best code art here |
| Toolbox (`tbx_iron`) | 4 | red steel, latch, open lid |
| Tool Chest (`tbx_gold`) | 4 | drawers + casters |
| Golden Workbench (`tbx_bench`) | 3 | pegboard reads, legs thin |
| plain gold crate (screen "crate screen") | 1 | a flat yellow box: the fallback when no crate picture and the QA toolbox switch is off |
| mark CHARGED / BOOSTED / both | 3 | ring + badge, clear colour language, flat |
| boss cell: ATTACK SOON (dashed) | 3 | readable, thin |
| boss cell: attack ON, 16 tints | 2 | a flat tinted block with a coral frame; most tints look alike on an empty cell, no icon |
| SupportCard x9 | 4 | the best code UI: consistent colours, bar, READY state |
| WrenchBadge / CapBadge / CopyBadges | 3 | clear text, tiny bubbles for copies |
| crate-reveal glyph cards | 3 | clean frame; glyph is a blurry 64 px stretched |
| rank decor (ring, pips, crown) | 3 | ring + 3 tiny pips; crown 26x20 px is lost |
| `dot` (shot) | 2 | 16 px circle, shown up to ~54 device px: soft; one for all shooters |
| `spark`, `chunk` | 3 / 2 | 4-point star ok; chunk is a bare triangle |
| `omm_glow` | 4 | smooth radial gradient |
| `bm_*`, `sw_*`, `omm_rays`, `rk_*` | 3 | functional white shapes |
| `slot` / `bg` / `clock_base` | 3 / 2 / 3 | bg is 4 flat rects |
| `target_0..5` + `demo_can` | 3 / 2 | clear cartoon faces; flat |
| `row_surge` / `gear_bomb` / `hand` | 2 / 3 / 3 | surge = clipboard with arrows |
| `oy_screw_0..5` | 3 | glossy heads; stamps tiny and smeared |
| `oy_spark` / `oy_dust` | 3 / 2 | dust is a hat-shaped blob |
| Screw Yard plates, boxes, screws (code only) | 2 | flat tinted slabs, X screws, plain boxes: the owner's "child made". The shipped build paints plates, screws, boxes and tray over them (`sy_*`), so this is the fallback and the shadow layer |
| Object Yard blocks | 3 | decent iso blocks; the NEXT boxes become black dots without `sy_toolbox_open` |
| screens: tutorial / level card / settings / pause / boss wake / board | 3 | clean cream panels, flat buttons |
| screens: Units tab / result stars | 2 | missing-texture boxes without art (art-less artefact) |
| screens: unit detail | 2 | text overlaps (Blueprint page) |

## The 15 weakest (what the player sees first)

Ordered by "does a default player still see it". Fix type: **code** = change a function, **art** = needs painted art.

| # | what | rating | fix |
|---|---|---|---|
| 1 | `dot` projectile, every shooter | 2 | **code**: `textures.ts` `gen('dot')`: bake a 64 px orb (gradient, rim, highlight) and a short trail; per-family shapes later in `GameScene.shoot` |
| 2 | boss attack cells | 2 | **code**: `sceneKit.ts` `drawBossCell`: hazard stripes + the attack icon + a pulse instead of a flat tint block |
| 3 | panels, the purple SHOP pill, progress bars, the bottom tab bar, lock tiles (flat code even with art loaded) | 2-3 | **code**: `GameScene.panel` / `button`: bake a gradient + lip + gloss 9-slice via `bakeTexture`; later a painted kit |
| 4 | `job_*` glyphs (QA, but on every unit page) | 2.9 | **code**: `roster1Art..roster7Art` `drawJobIcon*`: draw at 128 px with one line weight; or **art** |
| 5 | roster B units in the Machine tab show code stand-ins | 2.5 | **code**: `machine.ts:66` wrap the key in `unitTex(scene, key)` (one line) |
| 6 | Screw Yard chrome that stays code in the shipped build: header bar, label chips ("NEXT", "DOCK"), the three booster buttons | 2-3 | **code**: `ScrewScene.drawUi` / `drawBar`: swap the flat `fillRoundedRect` slabs for one baked gradient + lip pill (`bakeTexture`); the plates, screws, boxes and tray are already painted (`sy_*`) |
| 7 | Object Yard NEXT boxes are black dots without the picture (QA scene) | 1 | **code**: `ObjectYardScene.boxArt` (~line 573) has no drawn fallback: copy the rounded-box fallback from `ScrewScene.drawBox` |
| 8 | screw-head stamps `oy_screw_N` | 3 | **code**: `ObjectYardScene.bakeFx`: bake at `RS` and drop the offset ghost on the stamps |
| 9 | rank decor (ring, 26 px crown) | 3 | **code**: `unitArt.ts` `rankDecor`: bigger tiered glow, 3x crown, sparkle emitter at rank 7-8 |
| 10 | flat gold crate fallback | 1 | **code**: `unitsTab.presentCrate` (~line 319): when no crate picture, `ck` is empty and a flat box is drawn; use `toolboxCrateKey()` (toolboxCrates.ts) instead |
| 11 | board chips and labels: 12 px "OVERDRIVE" (Arial Black, not bundled) over the gauge; "MERGE -> +2" tray line (20 px Arial Black on a flat chip) | 2 | **code**: `GameScene` line ~322 (`odLabel`) and ~372 (`pendingText`): use Lilita One at 22 px+ with an ink stroke; gauge in `ui/hud.ts` ~166 (`odGauge`): rounded fill + flame at full |
| 12 | text overlaps: Blueprint unit page; Settings (5th toggle MERGE ASSIST sits on the SAVE BACKUP line) | 2 | **code**: `ui/settings.ts` (rows at top+180+i*110, text at top+660) and `unitsTab.openUnitDetail`: place rows from measured heights |
| 13 | Rocket stand-in is a recoloured Bell; Arc Welder is a padlock; Horn a cocktail glass | 1-2 | **code**: `textures.ts` `drawGadget`: give Rocket its own branch (missile on a pad); only seen if the picture fails |
| 14 | no visible rank change: Belt Drive, Tesla Tower, Blast Plate, Arc Welder, Pipe, Router (under 5%) | 2-3 | **code**: `roster2Art/3Art/7Art`: scale or add one part per tier; or **art** per rank (the pictures are one image for all ranks too) |
| 15 | Dynamo (poker chip), Router (UI icon), Blueprint (chart), Ladder (rung mush), Vice and Pipe (edge clipping) | 2 | **art** (the pictures exist): code only if the fallback matters; clipping = keep 6 px margin in `roster3Art/4Art/7Art` |

## Honest limits

- **Not rendered**: the debris atlas (`debris_atlas` is built from painted `debris_N`; the code fallback is the `chunk` triangle), `rank_plate`, `formula_plate`, `stage_frame_*` (baked only when painted dice / HUD art exists; with no art the board draws a coloured circle badge instead, visible in the board screens), the home road / machine / events tabs (need painted art to exist), all motion (hit flashes, damage numbers, chain lines, merge starburst, kill debris, boss defeat, HP bar states). Each live drawing is one frame at a fixed time.
- **Without painted art** some screens show Phaser's green missing-texture box (Units tab backdrop, result stars): that is an artefact of this run, not what ships. To see the shipped look use `tools/shots.mjs`.
- The Screw Yard plates ship painted overlays (`sy_plate_*`, `sy_screw`, `sy_toolbox_open`, `sy_tray`) that this run blanks on purpose.
- Roster B screens (units tab, cards, support card on the board) needed the QA roster switches; the harness turns them on in the page only (it calls `applyRoster1..7(true)` and sets `TUNING.rosterB`). The default game does not.
- Text in `Arial` / `Arial Black` (the game does not bundle them) shows in this Linux box's fallback font (a serif in the screens); on a phone it is whatever the device has. Lilita One is bundled and renders as in the game.
- Rendering is Chrome's software WebGL; a phone GPU antialiases a little differently. Single textures are 1x canvases upscaled 2x with browser smoothing, which is what a 2x phone does with them.
- Ratings are mine, from stills, with no player test; treat 2 vs 3 as a coin flip, 1 and 4 as firm.
- Two small in-memory Vite patches live in `tools/render-code-assets.mjs` (art glob -> `{}`; extra exports for `bakeFx`/`buildCard`/`bakeAll`). If those functions move, the tool says so and stops.
