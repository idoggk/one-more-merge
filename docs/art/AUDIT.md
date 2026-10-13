# Asset and effects audit: everything our game shows today, rated honestly

Task t-a70a80c9, committed 2026-10-11 (mission m-b6e8ac1d). Input to `ART_BIBLE.md`.

## Summary

1. Pictures exist for the 13 original units, the 4 batch-1 units, bosses, monsters, stages, 3 button colours, HUD plates and crates (463 WebP, 15 MB). The other **22 of the 39 units are code-drawn** shapes (`roster2Art..roster7Art.ts`) sitting next to painted ones.
2. **Every unit shoots the same tinted dot on a Bezier arc** (`GameScene.shoot`). Only Cannon (muzzle + impact pictures, bigger dot) and Bell (wave ring) have their own FX; Coil has an arc picture; Crane / Robot Arm / Tilt Lever have a text/board effect. **33 of 39 units are fully generic.**
3. **Trigger FX is one shared recipe** (pop 1.3x, 5 sparks, a line + travelling star). Roster B relay links (gear, hop, belt, pipe, cap, stair, vice, router, lift, swing) have no colour entry, so they draw WHITE.
4. UI is mostly flat code: panels/popups (`panel()`), non-green/blue/red buttons, settings, pause, Screw Yard plates/boxes, toolbox crates and rings are rounded rects with ink outline. No 9-slice kit, no gloss/lip, no HP lag trail, no count-up/fly-to-pill found in code.
5. Most lift is code-only (per-unit shots, hit reaction, merge layers, bars, button/popup easing, baked UI kit). Real art asks: 22 units x 6 ranks, 9-slice UI kit, Screw Yard set, home showcase, tool art.

**How to read this.** No screenshots were taken (node_modules was absent, install out of scope); every look is inferred from code + WebP header dimensions. Absence claims come from targeted greps of `hud.ts`, `results.ts`, `GameScene.playCascade`; a missed code path is possible. Re-rate after a `tools/shots.mjs` pass. The GPU memory figure is an estimate.

Unit count: **39 total = 13 original + 26 roster B**; 17 pictured, 22 code-drawn.

Scale: 1 placeholder/hurts, 2 weak, 3 acceptable-generic, 4 good, 5 top-tier. **P** = picture (`src/assets/art/*.webp`), **C** = drawn in code, **P+C** = picture with code fallback/overlay. Sizes are design px (canvas 720 wide, RS up to 2).

## 1. Inventory by category

### 1.1 Board and cells
| Asset | P/C | Source | Size | Rating | Note |
|---|---|---|---|---|---|
| Workbench backdrop | P+C | `bg.webp` 720x1205 (fallback 4 rects in `gen('bg')`) | full screen | 3 | painted bench, static, no depth/vignette |
| Cell slot | P+C | `slot.webp` 256 (fallback translucent rounded square) | 118x118 | 3 | quiet, readable, flat |
| Header plate | P | `hud_header` 720x75 | 712x88 | 3 | text on it has no outline |
| Stage window (monster backdrop) | P+C | `stage_ch1..8` 1024x450, `stage_0..2`, `stagebg_*`, `bg_corner`, `bg_practice`; rounded mask | 580 x 284-450 | 3 | per-chapter paint, static |
| Tray NEXT + scrap | P+C | `tray_plate` 256x70, `scrap_plate` 256x140 | 262x72, 150x82 | 3 | |
| Event ribbon | P+C | `ui_ribbon` 720x123 | 640x56 | 3 | |
| Overdrive flames | P+C | `vfx_flame`, `vfx_flame_corner` + odGlow Graphics | | 3 | |
| Cell marks (helper/charge/boost/boss telegraph) | C | `sceneKit.ts` drawPrimeMark / drawAmpMark / drawBossCell | 30 px badges | 3 | clear colour language, flat shapes |
| Rank badge | P+C | `dice_1..8` 160x69 + text | ~36 px | 3 | same plate for all units |
| Crown | P | `crown.webp` | 36 px | 3 | |
| Merge-assist cues | C | `mergeAssist.ts`, `dropFeedback.ts` | | 3 | |

### 1.2 Units (39)
Textures keyed `<family>_<rank>`, ~118 px in cell (62 tray, up to 220 cards). `ensureTextures()` draws 128x128 procedural stand-ins for every non-shipped key, ranks 1..MAX_RANK+2.

| Units | P/C | Source | Rating | Note |
|---|---|---|---|---|
| Cannon, Coil, Bell | P | `*_1..8` 256x256 (~22 KB) | 4 | best art, consistent ChatGPT style |
| Magnet, Battery, Fan, Amplifier, Signal Beacon | P | `*_1..6` | 4 | |
| Rocket (8), Mortar, Arc Welder, Horn, Fuse Box (6) | P | | 4 | code stand-ins in `textures.ts` ~149-263 are only fallbacks |
| Batch 1: Nail Gun, Jackhammer, Gear, Saw Blade | P | `*_1..8` | 4 | |
| **Batches 2-7 (22 units)**: Wrench, Piston, Spring, Belt Drive; Blowtorch, Pipe, Blast Plate, Tesla Tower; Capacitor, Blueprint, Ladder, Rewind Crank; Crane, Dynamo, Wrecking Ball; Robot Arm, Tilt Lever; Rivet Gun, Vice, Router, Hydraulic Press, Lathe | C | `roster2Art..roster7Art.ts` (59-95 lines each) via `drawGadget()` + one 64x64 `job_<family>` glyph; rank only grows a dimension/count; 3-4 flat colours, 6 px ink outline | **2** | self-described placeholders, visibly cruder than the 17 painted units; mixed board looks unfinished |
| Support-card units (Wrench, Blast Plate, Blueprint, Rewind Crank, Tilt Lever) | C | no board part; `supportCard.ts` (145 lines), `wrenchBadge.ts`; glyph on rarity tile in crates/units tab | 2 | |
| Crate/units portraits | C | `addPortrait()` (`ui/crateScreen.ts`): picture if shipped else rarity tile + job glyph | 2 | the owner's "placeholder unit pictures" complaint |
| Rank-up cue | C | `pulseRank` + ring 110 px / 420 ms + "MAX!" | 3 | same for every unit |

### 1.3 Monsters and bosses
| Asset | P/C | Source | Size | Rating | Note |
|---|---|---|---|---|---|
| Classic machines (Tin Can, Mad Fridge, Junkzilla, Vacuum Viper, Toaster Twins, Piano-saurus) | P+C | `target_0..5` 512x512, `target_N_dmg`, `face_N_hit/angry/dizzy`; code fallback | ~280 px | 3 | |
| Cast monsters x16 | P | `mon_<name>` 512x472 + `_dmg` | | 3-4 | one damage frame, no idle animation |
| Chapter bosses + mini-bosses x16 | P | `boss_<id>_intact/cracked/critical` ~500x512 (3.7 MB) | ~300 px | 4 | strong phases; phase swap is the only animation |
| Boss attack telegraph icons | P | `btg_*` x16 (+`tg_*`) | ~42 px | 3 | |
| Boss armor/crack overlays | P | `bfx_armor`, `bfx_crack` | | 3 | |
| Trophies | P | `trophy_<boss>` 228x214 x16 | | 3 | |
| Boss wake card | C | `bossWakeCard` (GameScene ~3160) cream panel 590x470 on dim | | 2 | no slow-mo / vignette / entrance |

### 1.4 Projectiles
| Asset | P/C | Source | Size | Rating | Note |
|---|---|---|---|---|---|
| Unit shot | C | `GameScene.shoot()`: 16x16 `dot` tinted FAMILY_INFO colour, scale 0.8 (1.7 Cannon), quad Bezier 200-230 ms, lands +-50 px | 13-27 px | **1** | one dot for 15+ shooters; no rotation/trail (Cannon gets one white follow dot) |
| Passive cannon shot | C | `playPassiveShot` 0.45-0.8 scale | | 2 | intentionally quiet |
| Chain link pulse | C | `spark` 32x32 star ADD, A to B | 35 px | 2 | same for all links |
| Arc/bridge bolt | P | `vfx_arc` stretched, only Coil + Arc Bridge | | 3 | |
| MAX signature streaks | P | `max_backfire/bridge/chime/twin/split/gust` 256 | | 3 | rank 6 only, 6 units |

### 1.5 Hit and kill
| Asset | P/C | Source | Rating | Note |
|---|---|---|---|---|
| Shot impact | P+C | 3-8 `spark` particles in unit colour; Cannon only `vfx_impact` 110 px / 140 ms or ring | 2 | |
| Monster hit reaction | C | `hitTarget`: squash 1.5-2.5% (7% at chain 10+), knockback 2-9 px, warm silhouette flash 18-30%, face swap | 2 | far under the 1.15x0.85 / 3-6 px recipe; barely visible at 280 px |
| Damage numbers | C | `floatText` Lilita 34-60 px, 6 px stroke, rise 70 px / 700 ms; banners `banner_chain/destroyed/overdrive` 720x165 | 3 | no jitter, no crit ramp |
| Kill | C+P | `playKill`: tint-fill, rattle, 70 debris (`debris_0..5` canvas atlas), 50 sparks, 2 rings, banner, tween away | 3 | same for every monster |
| Boss defeat | C | `playBossDefeat`: hit-stop flash, 7 random explosions, collapse, parts rain | 3 | no slow-mo, no per-boss variation |

### 1.6 Merge / chain / cascade / sandwich / overdrive
| Asset | P/C | Source | Rating | Note |
|---|---|---|---|---|
| Merge snap | P+C | `commitDrop`: starburst 150 px grow+spin 450 ms; new part pop 0.9, 1.16, 1.0 after 110 ms; `sfx.merge(rank)` | 3 | identical for all units/ranks, no particles |
| Merge streak banner | C | text in event lane | 2 | |
| Chain link lines | C | `playCascade`: 8 px line per edge; colours for coil cyan / bell gold / magnet pink / battery green / fan pale / horn / fuse / arc / amp / item; fades 250 ms | 2 | roster B kinds (gear, hop, belt, pipe, cap, stair, vice, router, lift, swing) fall to WHITE |
| Chain counter | C | `fx/chainLadder.ts` xN text, gold at 8+, rising pitch per link (`sfx.ladder`), hold 250 ms, shake `chainBig` | 3 | colour ladder only white to gold |
| Formula ribbon | C | `formulaStrip.ts` | 3 | text-heavy |
| Chain-end banner | C | `showEvent` "xN CHAIN . total" | 2 | |
| Sandwich | C | `sandwichFx.ts`: preview outline + arrow, gold plate, hit-stop 160 ms, ring pool, 10 sparks, rank pop | 3 | baked Graphics, no picture |
| Overdrive | P+C | `vfx_flame` edges, softFlash orange 22%, banner, odGauge Graphics | 3 | |
| Camera shake | C | `fx/shake.ts` off / soft / full | 4 | |
| Idle hints | C | `fx/partReact.ts` lean + blink after 6 s | 3 | |

### 1.7 (reserved: numbering follows the audit source; no section 1.7)

### 1.8 UI
| Asset | P/C | Source | Rating | Note |
|---|---|---|---|---|
| Primary buttons green/blue/red | P | `btn_green/blue/red` 512x157 + `_pressed`; `GameScene.button()` | 3 | press = scale 0.95 instant + texture swap; no overshoot, breathing, shine, disabled look |
| Other button colours | C | same fn, flat ink + colour inset 86 px | 2 | no gradient/gloss/lip; `btn_wide`, `btn_workshop`, `btn_brass(2)` shipped but used on few screens |
| Panels/popups/modals | C | `GameScene.panel(h)`: ink 12 px outer + `#fbe7c6` inset, radius 36, dim 60%, slide 40 px + fade 220 ms Quad.Out | 2 | same rectangle everywhere; no header ribbon, no scale-back-out, no 9-slice |
| Cards (level sheet, perk row, boss card, gift) | P+C | `ui_card` 720x227, `ui_perk_row`, `boss_card`, `card_*`, `ui_coach*`, `ui_howto` | 3 | |
| HP bar | P+C | `hp_frame` 720x65 + `hp_fill` 720x52 at 476x50; Graphics fallback; boss armor ticks; star-time ticks | 3 | lerped fill; no lag trail / gloss / low-HP colour or pulse found in `hud.ts` |
| Clock ring, merges-left ring, overdrive gauge | C | `clockBase` baked disc, Graphics arcs | 2 | |
| Star rows | P | `star` 96x92; results pop Back.Out 260 ms, 220 ms stagger, rising `sfx.star` | 4 | already near the recipe |
| Currency pills | P | `res_bar` 640x114 + `icon_bolt/gem/scrap/timer` | 3 | no count-up / fly-to-pill found |
| Tabs | C+P | `roadTab/machineTab/unitsTab/eventsTab` with `node_*`, `hm_*`, `card_*`; tab bar Graphics | 2-3 | |
| Toggles/sliders | C | `ui/settings.ts` text rows, 0 art refs, no slider | 2 | |
| Toasts | C | `showEvent` ribbon | 2 | |
| Coach marks | P+C | `ui_coach`, `ui_coach_compact`, `ui_hand` glove | 3 | |
| Odds panel, job pill, cap/wrench/copy badges, support card widget, pause | C | | 2 | |
| QA panel | C | `ui/qaPanel.ts` 490 lines | 3 | hidden tool |

### 1.9 Screens
| Screen | P/C | Source | Rating | Note |
|---|---|---|---|---|
| Home/road | P+C | `road_bg` 405x720 (upscaled 1.8x, soft), `hero_bg` 720x1279, `hero_chassis` 900x364, `node_*` 200x164, `res_bar`; chapter strip/season badge Graphics | 3 | static; no machine showcase or crate row with timers |
| Machine tab | P+C | `hm_<family>_N` 300x280 (only 6 families have a hero picture) + `hero_chassis_*` finishes | 3 | |
| Units tab | P+C | `card_common/rare/epic` 256x320 + `addPortrait`; 22 portraits are glyph tiles | 2-3 | |
| Events tab | C | text rows | 2 | |
| Crates (new) | P+C | `crate_bag/toolbox/chest/gold/workbench` 640x640 (+iron/wood/gold open); procedural alternatives in `fx/toolboxCrates.ts` (24 draw calls, baked 240x224) behind a QA switch; `crateScreen.ts` 529 lines | 2 | owner: "The art in the crates is bad"; `art-candidates/crate-screen` has the fixed flow |
| Results | P+C | victory/defeat banners, stars, medals, trophies | 3 | text-heavy |
| Settings | C | | 2 | |
| Level cards | P | `ui_card` + `node_normal/hard/mega_hard/boss/completed/locked` | 3 | |
| Tutorial | P+C | | 3 | |
| Title/logo | P | `title` 720x1279 (172 KB, biggest file), `logo` | 3-4 | legacy |

### 1.10 Backgrounds
`bg`, `stage_ch1..8` (1024x450), `stage_0..2`, `stagebg_mint/night_shift/showroom`, `hero_bg`, `road_bg`, `sy_background` (720x1279), `bg_corner`, `bg_practice`. All static single images. Rating 3.

### 1.11 Fonts and text styles
Lilita One (bundled @fontsource) ~210 uses with ink stroke 4-8 px: good identity. Arial / Arial bold 68 uses (27 px card text, 14-20 px captions); Arial Black 8 uses at 12-20 px; one Georgia. No hard drop shadow, no tabular digits, outline always dark ink. Rating 3. 12 px captions on a 720-wide canvas are ~6.5 pt on a phone.

### 1.12 Icons
`icon_bolt/gem/scrap/pause/timer` (256 painted), `perk_*` x5, `role_*` x4, `badge_*`, `item_*`, `booster_*`, `btg_*`. Code: `job_*` glyphs x39 (64x64, `drawJobIcon*`), mark badges. Mixed painted/glyph styles: 3 painted, 2 glyph.

### 1.13 Screw Yard
| Asset | P/C | Source | Rating | Note |
|---|---|---|---|---|
| Background | P | `sy_background` | 3 | |
| Tray | P | `sy_tray` 560x138 | 3 | |
| Open toolbox | P | `sy_toolbox_open(+_brass)` | 3 | |
| Screw | P+C | `sy_screw` 96x94 tinted per colour; Object Yard bakes `oy_screw_N` | 2 | owner: "screw looks weird"; tint on grey shifts shading |
| Plates/boxes | C | `ScrewScene.ts` (24 shape calls, 575 lines): rounded rects with ink shadow + white gloss strip; `sy_plate_square/short/long` exist but plates are code-drawn; boxes `fillRoundedRect` 240x104 | **1-2** | owner: "looks like a child made them" |
| Objects (Taken Apart: Cannon, Coil, Bell) | C | `ObjectYardScene.ts` 816 lines + `yardObjects.ts` coloured blocks | 2 | |
| Boosters | P+C | `booster_jumpstart`, `booster_time_capsule`; drill/armed buttons code | 3 | |
| Box finished / sparks / dust | C | `oy_spark`, `oy_dust` baked | 2 | owner: finished box "just disappears" (fix in progress) |

### 1.14 Power tools
Roster B power tools are the units (1.2). Drill in Screw Yard = code button + `YARD_MARKS`. Planned Row Surge / Gear Bomb have **no assets yet**.

### 1.15 Sounds (list only)
No audio files; everything is WebAudio synth in `src/game/audio.ts` (627 lines): click, pickup, snap, drop, invalid/nope, merge(rank), rankUp, sandwichPromise/sandwich, cascadeStep, ladder(link), chord, bigFinish, hit, panelBreak, kill, kickback, delivery, scrap, overdrive, win, lose, star, medal, boltRoll, chestShake/rarityHit/chestOpen, cardOpen, nodeTap, boxThud/boxClack/boxChime, kit, capsule, lessonPop. Per-unit voices (cannon, zap, bell(rank), battery, fan, magnet, rocket, mortar, arc, horn, fuse, amp, beacon, roster1..7 by family) via `unitSounds.ts`. Generative music loop with 4 modes (normal/mini/boss/final). Haptics.

## 2. Top 15 weakest visuals (first-impression order)

| # | Weakness | Fix | Code / art |
|---|---|---|---|
| 1 | Unit shots = one tinted dot for all | per-family projectile shapes + trails (bolt, shell lob, nail/rivet tracer, spinning saw disc, shockwave) from existing spark/dot with a 6-10 segment trail + shooter recoil | Code first |
| 2 | 22 code-drawn units beside 17 painted | commission the 22 x 6 rank set in the ChatGPT style, Common/Rare first | Art |
| 3 | Crate / tool-bag open screen (owner: bad) | ChatGPT crates, big crate + rarity glow + anticipation shake + staggered card reveal, clean glyph tiles | Code + art (in progress) |
| 4 | Screw Yard plates, boxes, screw (owner: child-made) | paint plates, boxes, neutral grey screw with colour heads; keep old look default until done | Art |
| 5 | Flat popups/panels (`panel()`) | 9-slice painted panel with header ribbon + back-out scale-in | Art + code |
| 6 | Buttons beyond the 3 painted colours | painted yellow/purple/grey pills or baked gradient + lip + gloss; release overshoot, primary breathe, shine sweep | Code first |
| 7 | Monster hit reaction (2.5% squash, 4 px knock) | 1.15x0.85, 3-6 px, 60-90 ms white flash, jittered numbers | Code |
| 8 | Merge effect (starburst only) | pull-in, flash, ring, 12-20 sparkles in family colour scaled by rank, pitch climbs per chain step | Code |
| 9 | Roster B link lines all white | colour + motif per edge kind (hop arc, belt dashes, pipe tube, stair steps, vice grip) | Code |
| 10 | HP bar | rounded caps, gloss, lag trail (fast fill, pale trail +400 ms), green-yellow-red below 30%, pulse below 20% | Code |
| 11 | Home/road screen static | machine showcase + big breathing Play + crate row with timers; specks/vignette | Code + art |
| 12 | Mixed fonts / 12-20 px Arial captions | one display face with coloured outline, captions >= 22 px, one rounded body face | Code (+ font) |
| 13 | Kill / boss defeat one recipe | boss hit-stop 100 ms + 0.3x slow-mo 700 ms + 3-5 timed explosions, skippable | Code |
| 14 | Settings/pause/events text rows | painted/baked toggle + slider component, section headers | Code |
| 15 | Currency pill and rewards | count-up 400-600 ms, fly-to-pill with pill bounce, rising pitch | Code |

## 3. Unit x {shoot, impact, trigger}

Generic definitions (GameScene.ts):
- **G-SHOT** = tinted `dot` 0.8 scale on a Bezier arc, 200 ms, only when activation contribution > 0.
- **G-IMPACT** = 3 spark particles in unit colour, no picture/ring.
- **G-TRIGGER** = pop 1.3 to 1.0 (Back.Out 240 ms), 5 sparks (10 if charged), straight link line (8 px, per-kind colour, white for roster B), travelling `spark` star ADD, family sound, rank 5+ ring, rank 6 white ring + haptic, job tag text ("DEPTH x1.48") when a job multiplier applies.
- "none" = deals no damage by itself, never fires a shot. `*` = unit-specific effect. Rating S/I/T 1-5.

| Unit (role, P/C) | Shoot | Impact | Trigger | S/I/T | Verdict |
|---|---|---|---|---|---|
| Cannon (Shooter, P) | *big dot 1.7 + white follow dot + `vfx_muzzle` + flash; passive auto-shot own sound | *`vfx_impact` 110 px + 8 sparks | G-TRIGGER with y-offset pop | 3/3/3 | partly generic (best) |
| Coil (Relay, P) | none | none | *`vfx_arc` picture bolt, cyan link | -/-/3 | |
| Bell (Relay, P) | none | none | *`vfx_wave` 170 px ripple, gold link, sound by rank | -/-/3 | |
| Horn (Relay, P) | none | none | G-TRIGGER + tan link | -/-/2 | generic |
| Fuse Box (Relay, P) | none | none | G-TRIGGER + pink link | -/-/2 | generic |
| Fan (Mover, P) | none | none | pale-blue link; MAX `max_gust` streak | -/-/2 | |
| Magnet (Mover, P) | none | none | pink link; MAX `max_twin` | -/-/2 | |
| Battery (Support, P) | none | none | green link + charged ring/badge; MAX `max_split` | -/-/2 | |
| Amplifier (Support, P) | none | none | lavender link + BOOST badge | -/-/2 | |
| Signal Beacon (Support, P) | none | none | G-TRIGGER, no own link colour | -/-/2 | |
| Rocket (Shooter, P) | G-SHOT, "BURST x2" tag | G-IMPACT | G-TRIGGER | 1/1/2 | generic |
| Mortar (P) | G-SHOT flat arc (not a lob), "DEPTH x1.48" tag | G-IMPACT | G-TRIGGER | 1/1/2 | generic |
| Arc Welder (P) | G-SHOT (no arc picture), "SPREAD" tag | G-IMPACT | blue-violet link | 1/1/2 | generic |
| Nail Gun (P) | G-SHOT, "ROW x" tag | G-IMPACT | G-TRIGGER | 1/1/2 | generic |
| Jackhammer (P) | G-SHOT, "BYPASS" tag | G-IMPACT | G-TRIGGER | 1/1/2 | generic |
| Saw Blade (P) | G-SHOT, "EDGE" tag | G-IMPACT | G-TRIGGER | 1/1/2 | generic |
| Gear (Relay, P) | none | none | white link (jump to far Gear is just a line) | -/-/1 | generic |
| Wrench (Support off-board, C) | none | none | WrenchBadge charge badge only | -/-/1 | |
| Piston (Shooter, C) | G-SHOT, "OPEN SPACE" tag | G-IMPACT | G-TRIGGER | 1/1/2 | generic |
| Spring (Relay, C) | none | none | white link, HOP is just a line past a part | -/-/1 | generic |
| Belt Drive (Relay, C) | none | none | white link, BRIDGE to far end is a line | -/-/1 | generic |
| Blowtorch (Shooter, C) | G-SHOT (burning hazards in its column have no visual) | G-IMPACT | G-TRIGGER | 1/1/2 | generic |
| Pipe (Relay, C) | none | none | white link (pipe kind) | -/-/1 | generic |
| Blast Plate (Support card, C) | none | none | *`playSupportFx` cell highlight + "BLOCK" word | -/-/2 | shared support FX |
| Tesla Tower (Shooter, C) | G-SHOT (no big bolt despite STORM) | G-IMPACT | G-TRIGGER | 1/1/2 | generic |
| Capacitor (Relay, C) | none | none | white link; CapBadge shows what it holds | -/-/2 | generic |
| Blueprint (Support card, C) | none | none | `playSupportFx` "SWAPPED!" | -/-/2 | shared |
| Ladder (Relay, C) | none | none | white link (stair) | -/-/1 | generic |
| Rewind Crank (Support card, C) | none | none | `playSupportFx` "UNDO" | -/-/2 | shared |
| Crane (Relay, C) | none | none | *ring + "LIFT!" text + sound mid-chain (real merge happens) | -/-/3 | partly |
| Dynamo (Relay, C) | none | none | white link (ring wake = many lines) | -/-/1 | generic |
| Wrecking Ball (Shooter, C) | G-SHOT (no swing; "swing" edge white) | G-IMPACT | white link | 1/1/1 | generic |
| Robot Arm (Shooter, C) | G-SHOT | G-IMPACT | *"COPY <relay>" text + CopyBadges icon on the arm | 1/1/3 | partly |
| Tilt Lever (Support card, C) | none | none | *board slide (reconcile) + `playSupportFx` "TILT!" | -/-/3 | partly |
| Rivet Gun (Shooter, C) | G-SHOT, "THIRD" tag | G-IMPACT | G-TRIGGER | 1/1/2 | generic |
| Vice (Relay, C) | none | none | white link (vice kind) | -/-/1 | generic |
| Router (Relay, C) | none | none | white link; the L-turn is not drawn | -/-/1 | generic |
| Hydraulic Press (Shooter, C) | G-SHOT, "SQUEEZE" tag | G-IMPACT | G-TRIGGER | 1/1/2 | generic |
| Lathe (Shooter, C) | G-SHOT, "SPAN" tag | G-IMPACT | G-TRIGGER | 1/1/2 | generic |

**Count: 33 of 39 units rely entirely on generic FX** (all except Cannon, Coil, Bell, Crane, Robot Arm, Tilt Lever have nothing of their own beyond colour/text/sound). 15 shooters share one projectile. All 39 do have their own synthesised sound (`unitSounds.ts`): the one real per-unit channel today.

## 4. Code-only vs needs new art

**Code only (no new art)**
- Per-unit shots: shape / size / trail / recoil per family (bolt streak Arc/Tesla, shell lob with shadow Mortar, tracer + muzzle Nail Gun/Rivet Gun, spinning disc Saw, shockwave + crack Jackhammer/Press, swing arc Wrecking Ball, flame cone Blowtorch). Hook: `GameScene.shoot(color, big)` + a per-family ShotSpec table next to `UNIT_SOUND` (`unitSounds.ts`) or a new `fx/shots.ts`.
- Impact: hit flash, bigger squash/knockback, per-family spark colour/shape/ring, number jitter, crit ramp (`hitTarget`, `silhouetteFlash`, `floatText`).
- Trigger: per-edge-kind link visuals and a colour for every roster B kind, wake charge-up, chain counter ladder white to yellow to orange to red, rank-based merge sparkles (`playCascade` link-colour map, `edges.kind`).
- Shaders: Phaser 3.90 postFX glow / shine / vignette / colour-matrix on single sprites (MAX units, vfx, stage vignette, lose desaturate); each is an extra render pass, so budget fill-rate on phones. Only masks and the debris atlas use special pipelines today.
- Particles: only 2 emitters exist (sparks, chunks). Add pooled emitters for ambient motes, coin arcs, confetti, per-unit emitters via a table.
- Tweens/easing: button release overshoot 1.04 to 1.0 in 140 ms, primary breathe 1.0-1.05, popup scale 0.8 to 1 Back.Out 250 ms + 150 ms exit, count-up, fly-to-pill (`button()`, `panel()`, `results.ts`).
- Bars: rounded caps, gloss, shine sweep, lag trail, HP colours, low-HP pulse (`hud.ts`; bake gradient with `bakeTexture`).
- Procedural UI kit stopgap: baked gradient + lip + gloss 9-slice panels/pills/tabs/toggles via `bakeTexture`/DynamicTexture behind one helper in `sceneKit.ts`.
- Backgrounds: vignette, light shafts, floating specks. Boss moments: `time.timeScale` slow-mo, hit-stop, zoom, timed explosions (`playBossDefeat`). Glyph tiles: make them look intentional (gradient, rarity frame, rim light) in `addPortrait`.

**Needs new art**
- 22 units x 6 ranks (132 images) in the ChatGPT style (+ optional `hm_*` hero versions).
- 9-slice UI kit: panel, header ribbon, pill buttons in 5-6 colours + disabled, tab, toggle, slider track/knob, toast, currency pill.
- Screw Yard: plates (3 shapes), boxes, screw, finished-box states, Object Yard blocks.
- Per-unit projectile sprites if procedural ones are not good enough (nail, rivet, shell, disc, bolt) + impact sheet per damage type.
- Home: machine showcase set, crate row icons, daily strip. Power-tool art (Row Surge, Gear Bomb) + combo effects. Icon unification of `job_*` glyphs. Font decision (keep Lilita One for display, add one rounded body face).

## 5. Technical constraints

- **Texture budget**: `src/assets/art` = 463 WebP files, 15 MB (boss 3.7 MB, monsters 2.2 MB, units ~2.3 MB, crates 0.5 MB, stages 0.4 MB, `hm_` 0.5 MB; `title` 172 KB largest). Decoded RGBA GPU memory if all resident is roughly 100-150 MB (estimate, not measured), so `artPlan.ts` keeps the eager set to the first screen (the old 290-image preload took 9-20 s on a 4x-throttled phone CPU; the WebGL upload decodes on the main thread). An 8-rank unit at 256x256 costs ~2 MB GPU; 22 more units x 6 ranks adds ~35 MB GPU and ~3 MB download.
- **Code-drawn textures**: 72 in `textures.ts` (gadgets for every FAMILIES x ranks, job icons, `dot`, `hand`, `spark`, `chunk`, `slot`, `bg`, `target_N`, `demo_can`), each generated only when no art key exists.
- **Atlas**: none for shipped art; every key is its own `load.image`. Only `debris_atlas` (runtime canvas) exists. Packing `<family>_1..8`, HUD plates and VFX into 2048 atlases would cut draw calls / upload stalls / file count, but keyed access (`hasArt(key)`, `${family}_${rank}`) needs an atlas-aware wrapper. Keep bosses/monsters as lazy singles.
- **Load order** (`artPlan.ts`): eager = board + home + tutorial hand; heldBack = other first-screen/near-tap art; lazy batches in `loadLazyArt` (held-back, common + current chapter, rare + other chapters). The RARE regex covers `boss_`, `mon_`, `stage_ch`, `sy_`, `title`, `trophy_`, `btg_`. `ensureTextures()` generates procedural stand-ins for anything not loaded, so new art degrades gracefully. Any new key must be covered by `tests/artPlan.test.ts` so it does not slip into the eager set.
- **Bundle/load**: art is hashed into `/assets/` by Vite, cached forever by `public/sw.js` (cache-first for `/assets/`, network-first page, cache `omm-v1`). Phaser 3.90 is the main JS cost. First launch downloads only the eager set. Adding 3-5 MB of lazy art is safe; adding to the BOARD/HOME regexes is not.
- **Render scale**: canvas 720 x H (1280-1720) at RS = min(2, DPR * cssW / 720); text uses resolution RS. Art authored at 256 px for 118-124 px display is the right 2x ratio; under-resolved backgrounds exist (`road_bg` 405x720 shown at 720 wide).
- **Import**: `node tools/import-art.mjs <folder>` (sharp) trims transparent padding, resizes, maps source file names to game keys with an ordered regex table (`keyFor`), and writes `src/assets/art/<key>.png` (the code globs png + webp; shipped files are webp). Store frames / app icon go to `assets_src/` (not bundled). Variants: `import-art.py`, `import-hero.mjs`, `import-v22.py`, `make-stages.mjs`, `stage-sprites.mjs`. Roster art needs hand-added `keyFor` rules per family name.
- **Asset registry**: none today (keys are implicit file names + `hasArt()` checks). See `ASSET_HUB_DESIGN.md`.

## 6. Suggested order

1. Per-family shot/impact table + roster B link colours.
2. Hit reaction + merge layers + chain colour ladder.
3. Button/panel/bar stopgap kit + popup/count-up easing.
4. Crate opening with the ChatGPT crates.
5. Commission 22 unit sets + Screw Yard set.
6. Registry script + Asset Hub.

## 7. Open items

- Run `npm ci` + `tools/shots.mjs` to screenshot home, road, units tab, crates, results, Screw Yard and validate the ratings.
- The "5 base + 39 new" phrasing used in some briefs is wrong: it is 39 total (13 + 26).
