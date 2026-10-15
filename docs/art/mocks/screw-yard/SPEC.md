# SCREW YARD screen: mock spec (step 1 of the mock chain)

Mock Builder, task t-34ffe92c, 2026-10-15. Static mock only: nothing in `src/` was touched, nothing is built into the game.
Next steps in the chain: Pixel Checker, Asset Breaker (manifest EXISTS / NEEDS-SLICE / NEEDS-ART), Master Implementer (behind a flag, OFF).

Files (all in `art-candidates/mockups/screw-yard/`)
- `index.html`: the mock. Query: `?state=start|mid|danger|win|fail|screws&w=390&h=844`, `&grid=1` (8 px grid, 64 px major lines, safe areas, column), `&names=1` (layer name + box on every `data-layer`), `&audit=1` (measured checks). Art comes from `src/assets/art/*.webp` (read only).
- `screwyard_<state>_<W>x<H>.png`: clean 2x renders, 6 states x 3 sizes. `annotated_<state>_390x844.png`: grid, safe areas, layer names.
- `render.mjs` / `README.md`: re-render and audit.

## 1. What it is based on

Current build, object yard (`ObjectYardScene`, flags `yardBook` and `yardPressure`): a 3D block object (Cannon, Coil, Bell), screws in four colours, a 3-screw toolbox that fills, a holding row of 5 wells (the 5th is red, full row = lost), tools broom / hammer / drill, rotate arrows. Numbers used: 3 stars = taps within budget AND row peak <= 2 (`BOOK_PEAK`), 2 stars = either, 1 = a win; budget = screws x 1.3 + 4 (`yardBook.ts`); reward cards x2 at 3 stars (`TAKEN_APART_CARDS`); clock 75 / 100 / 130 s with amber at 25 percent and red at 10 percent (`yardPressure.ts`).
Direction (from the owner's notes and the options recommendation): **calm puzzle, tight holding row, efficiency stars, the clock only a bonus.** So: the clock is a small BONUS pill (running out only removes the bonus, never ends the yard); the stars and the holding row carry the tension; a loss is the full row.
**Not found in this checkout:** `docs/design/SCREW_YARD_OPTIONS.md`, `docs/art/MOCKUP_GAPS.md`, and the "screw-yard 2.0" art candidate pieces and review groups (only `art-candidates/yard-*` screenshots exist). Nothing from them is used; the Pixel Checker should reconcile if they live on another branch.
Art reused (EXISTS): `sy_background`, `sy_tray`, `sy_toolbox_open`, `star`, `icon_pause`, `icon_timer`, `kit3_panel_popup`, `kit3_ribbon_red/blue`, `starburst`, `cannon_5`, `ui_hand`.

## 2. States

| State | Key | What it proves |
|---|---|---|
| Start | `start` | Full object, empty row 0/5, TAPS 0/36, 3 stars lit, clock idle (grey, not started), coach "TAP A SCREW", pointing hand |
| Mid puzzle | `mid` | Row 2/5 (blue, gold), TAPS 14/36, box 1/3 full, a flying screw with trail, sparkles, "+1 SCREW" pop, some holes where screws left |
| Nearly full | `danger` | Row 4/5, "1 SLOT LEFT!" chip in red, red glow on the row, pulsing ring on the last well, red edge vignette, screen shake, clock red (bonus only), stars down to 1, warning bubble |
| Win | `win` | Panel TAKEN APART!, object on rays, 3 stars popping, chips TAPS 24/36 and ROW PEAK 2/5 (efficiency), TIME BONUS, reward row +6 CANNON CARDS (x2 at 3 stars), PLAY AGAIN, NEXT: COIL |
| Fail | `fail` | Row 5/5 full, panel ROW FULL! (ribbon in grey-blue), grey object, empty stars, chips in red, hint DRILL / BROOM, TRY AGAIN, BACK TO EVENT |
| Different screws | `screws` | The Bell with all four screw heads and a legend strip: ROUND red (Cannon), DIAMOND blue (Coil), TRIANGLE gold (Bell), PLUS green (Support). Shape + colour so colour-blind players can read it |

The object is drawn in code (isometric blocks, light top-left, glossy top sheen, bright rim on the lit edges, contact shadow, warm spotlight behind it). It is a proxy: CODE-DRAWN in the game today too.

## 3. Grid, sizes, safe areas

- Base unit **8 px**. Phone sizes 390x844 (reference), 360x780, 430x932 (CSS px; PNGs are 2x).
- **Content column** `C = floor(W / 8) * 8` centred (384 / 360 / 424), left offset `X0` = 3 / 0 / 3. Full-bleed layers (background, light, dim, vignette) ignore the column.
- **Safe areas:** top 48, bottom 32. Interactive things only below y 48 and above H-32, except back and pause which sit at y 56. The only thing in the bottom band is the MISSING sticker rows.
- `HB = floor(H / 8) * 8` (840 / 776 / 928) anchors the bottom rows. Margin 16, tap targets >= 48 (measured: 18 audits, all CLEAN).

### Anchors (y from top; HB as above)

| Element | x | y | w x h |
|---|---|---|---|
| Back (X) | X0+16 | 56 | 48x48 |
| Title plate (SCREW YARD / object name) | X0+72 | 56 | (C-144)x48 |
| Pause | X0+C-64 | 56 | 48x48 |
| TAPS plate | X0+16 | 112 | 120x48 |
| BONUS clock pill | next, flex | 112 | (C-32-240-16)x48 (72 at 360) |
| Star meter (3 stars) | X0+C-128 | 112 | 112x48 |
| Active toolbox (3 wells) | X0+16 | 168 | 152x88 |
| NEXT boxes (2 small + label) | X0+C-168 | 168 | 152x88 (boxes 72x40 at y 192) |
| "N BOXES TO GO" chip | X0+16 | 248 | 152x24 |
| Holding row (`sy_tray`, 5 wells) | centred | 280 | 320x80 (wells at 11 / 30 / 49 / 68 / 87 percent) |
| Row chip (HOLDING ROW n/5, 1 SLOT LEFT!) | centred | 352 | 176x24 |
| Object stage | X0 | 384 | C x (HB-176-384) (280 at 844, 216 at 780, 368 at 932) |
| Turn arrows | X0+16 / X0+C-72 | HB-168 | 56x56 |
| Turn label (FRONT 1/4 + hint) | centred | HB-168 | 208x56 (chip 160x32 + 12 px hint) |
| Tool tiles (BROOM, HAMMER, DRILL) | centred row | HB-96 | tw x 64, tw = floor((C-48)/3/8)*8 (112 / 104 / 120), gap 8 or 16 |
| Result panel (win, fail) | X0+24 | 144 | (C-48)x528 |

Panel inner rows (y inside the panel): ribbon -32 (272x80), hero object 56 (96x96), stars 160 (3 x 64), chips 232 (32), bonus chip 272 (32), reward row 312 (64), primary button 392 (208x64), secondary 472 (208x48).

## 4. Fonts and colours

Font `Lilita One` (fallback Arial Black), caps, +0.5 px tracking. Minimum text size 12.

| Use | Size |
|---|---|
| Panel ribbon title | 20 |
| Object name in title plate | 22 |
| TAPS value | 22 |
| Button labels | 26 (primary), 20 (secondary), 14 (tools) |
| Clock value | 20 |
| Chip text, reward title | 14 to 18 |
| Plate captions, hints, BONUS, NEXT, TAPS label | 12 |

Colours: ink `#2b1d2e` (outline, text), cream `#fbe7c6` / `#ecc98e` (panels), gold `#ffcf33` (stars, bonus chip), brass `#c8963a` (arrows, secondary button), green `#3fbf5f` (primary, tiles), red `#e8452c` / `#9c2414` (danger), dark plum plate `#5a4a66 to #2b1d2e` (HUD plates). Screws: red `#e8452c`, blue `#3a8bf0`, gold `#ffc933`, green `#3fbf5f` with a radial highlight top-left, dark ink ring.
Rules kept from the art direction: one light, top-left; chroma on screws, stars, buttons and rewards; the wood bench stays warm and lower in contrast.

## 5. Layers and z-order

Every element has a `data-layer` (printed in the annotated PNGs).

| z | Layer names | Notes |
|---|---|---|
| 0 | `L00_bench_background` (`sy_background`), `L02_key_light_and_vignette` | full bleed |
| 40 | `L40_object_spotlight` | warm bloom behind the object |
| 50 | `L50_object_stage` | the 3D object (SVG here) |
| 60 | `L60_active_toolbox`, `L60_next_boxes`, `L60_holding_row` (+ `L61_danger_glow`, `L61_last_well_ring`) | |
| 62 | `L62_boxes_to_go_chip`, `L62_holding_row_chip` | |
| 64 | `L64_coach_bubble` (start), `L64_warning_bubble` (danger) | never blocks a tap |
| 65 to 66 | `L65_tutorial_hand`, `L66_flying_screw`, `L66_sparkle`, `L66_popup_plus_one` | effects |
| 70 | `L70_danger_vignette`, `L70_screw_legend` | |
| 80 | `L80_back_button`, `L80_title_plate`, `L80_pause_button`, `L80_stats_row`, `L80_taps_plate`, `L80_bonus_clock`, `L80_star_meter`, `L80_turn_left/right/label`, `L80_tool_broom/hammer/drill` | HUD |
| 90 | `L90_dim` (58 percent ink) | win, fail |
| 92 to 93 | `L92_result_panel`, `L93_ribbon_title`, `L93_object_hero`, `L93_stars`, `L93_sparkle`, `L93_efficiency_chips`, `L93_bonus_chip`, `L93_reward_row`, `L93_primary_button`, `L93_secondary_button` | |
| 98 to 99 | MISSING stickers, grid, safe bands, name labels | debug only |

## 6. Animation notes (frozen at t = 1400 ms in the PNGs)

| Preset | What | Timing |
|---|---|---|
| Screw spin-out | Tapped screw spins 2 turns, lifts 10 px and scales 1.25, then flies on an arc to the next free well (or the box well when it fits); trail dots behind | 320 ms spin, 380 ms flight |
| Land pop | Screw lands in the well: scale 1.2 -> 0.92 -> 1, `+1 SCREW` chip rises and fades | 240 ms |
| Box full | 3rd screw: lid slam, latch flash, ring, 8 sparks (`boxMoment`, 620 ms), next box slides in from the right | existing |
| Star pop | Stars scale 0 -> 1.4 -> 0.9 -> 1 with a 8 degree wobble, 250 ms apart starting 300 ms, gold sparkles twinkle at their corners | 600 ms each |
| Glint | White sweep across PLAY AGAIN | every 2.6 s |
| Rays | `starburst` behind the hero object | 14 s per turn |
| Danger (row 4/5) | Row, stage and chip shake 4 px, glow and last-well ring pulse 0.6 s, red vignette pulses; stops under reduced motion (steady glow) | 400 ms shake loop |
| Clock red | Pill pulses at 10 percent left (amber at 25 percent); it is only a bonus, so no shake on timeout | 0.6 s |
| Tap hint | Hand taps 6 px toward a screw | 1.2 s loop |
| Fail | Object greys and tilts -6 degrees, stars stay grey, panel pops in | 400 ms |

All animations are visual only; none pauses the simulation.

## 7. MISSING art (magenta in the mock)

| Name | Where | Size |
|---|---|---|
| `tool_icon_broom`, `tool_icon_hammer`, `tool_icon_drill` | tool tiles (and the fail hint row) | 32x32 (draw 64) |
| `tool_tile_green` | glossy rounded tile behind each tool (code gradient used here) | 112x64 |
| `screw_head_R`, `_U`, `_Y`, `_G` | glossy 3D screw heads: round, diamond, triangle, plus (code-drawn here) | 96x96 |
| `star_empty` | an unlit star (the mock greys `star.webp`) | 64x64 |

Code-drawn here and expected to stay code: object blocks, HUD plates, chips, round arrows, danger glow, vignette.

## 8. Open points for the next steps

- The mock shows a 5-well row like the build. "Tight" could mean 4; `STAR_PEAK` and `BOOK_PEAK` would need to follow.
- Bell is tall: at 360x780 the stage is 216 px and the legend state shrinks it further (legend strip 72 px).
- The flying screw, sparkles and "+1 SCREW" chip are static poses of an animation.
- Sticker rows sit in the bottom safe band only for the mock; they are not UI.
