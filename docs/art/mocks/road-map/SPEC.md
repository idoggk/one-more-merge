# ROAD MAP screen: mock spec (step 1 of the mock chain)

Mock Builder, mission m-f522637e, task t-c0372b20, 2026-10-15. Static mock only: nothing in `src/` was touched, nothing is built into the game.
Next steps in the chain: Pixel Checker (make it exact), Asset Breaker (manifest EXISTS / NEEDS-SLICE / NEEDS-ART), Master Implementer (build behind a flag, OFF).

Files (all in `art-candidates/mockups/road-map/`)
- `index.html`: the mock. Query: `?state=normal|current|boss|locked|chapter|rails&w=390&h=844` plus `&grid=1` (8 px grid, 64 px major lines, safe areas, column) and `&names=1` (layer name + bounding box on every `data-layer` element). Art is read from `src/assets/art/*.webp`.
- `roadmap_<state>_<W>x<H>.png`: clean renders at 2x (390x844, 360x780, 430x932) for the six states.
- `annotated_<state>_390x844.png`: same six states with grid, safe areas and layer names.
- `README.md`: how to re-render.

Sources used: `docs/art/LEVEL_ROAD_V2.md` (layout, node kinds, chapter gate, rails), `docs/art/UI_JUICE.md` (motion presets), the live build frame `art-candidates/level-road-v2/built/ch4_L34_390x844.png`, and the owner's preferences (badges around the road like his reference screens, dynamic feel, Bolt mascot).
**Not found in this checkout:** `ROADMAP_LAYOUT.md`, `ROAD_KIT_B5.md`, `ROAD_KIT_B6.md`, `MOCKUP_GAPS.md` (they are not in `docs/art/`; they may live on another branch). Nothing from them is used; if they hold rules (for example road piece sizes), the Pixel Checker should reconcile.

## 1. States shown

| State | File key | Player level | What it proves |
|---|---|---|---|
| Normal | `normal` | 32 | Typical mid-chapter view: done nodes with stars (31), current hero (32), locked ahead (33), chest on the road shoulder, six badges, Bolt beside the platform |
| Current level glowing | `current` | 35 (HARD) | Hero at its loudest: glow, pulsing ring, YOU tag, sparkles, purple HARD ribbon on the platform |
| Boss level | `boss` | 40 | Boss figure (full colour, not a ghost) on a 224 px arena platform, gear-crown medallion, gate above, button says FIGHT BOSS |
| Locked | `locked` | 36 (view dragged ahead) | Cool blue-grey locked road and boss, closed gate with `NEED 20 ★`, fog and next-chapter banner, locked toast, BACK TO ME pill |
| Chapter entrance panel | `chapter` | 41 | Popup: ribbon CHAPTER 5, title, scene card, boss line, reward row, LET'S GO, Bolt peeking, confetti stars |
| Badge rails | `rails` | 32 | Rails isolated (rest dimmed): left Daily / Quests / Collect, right Event / Offer / Season, ready tooltip, legend |

Chapter content is CH 4 ARCADE (levels 31 to 40, boss at 40); the entrance panel previews CH 5 MUSIC ATTIC (names from `src/game/road/roadArt.ts` `CHAPTER_LOOKS`). The boss shown on level 40 is Junkzilla as a stand-in (`boss_junkzilla_intact`); the real ch4 boss art may differ. All prices, counts and timers are mock numbers.

## 2. Grid, sizes, safe areas

- Base unit **8 px**. Phone sizes: 390x844 (reference), 360x780, 430x932 (CSS px; PNGs are 2x).
- **Content column** `C = floor(W / 8) * 8` centred: 384 / 352 / 424 px, left offset `X0` = 3 / 4 / 3. All x positions are `X0 + a multiple of 8` (390 is not a multiple of 8, so the 3 px slack is split left and right). Full-bleed layers (scenery, scrim, fog, dim) ignore the column.
- **Safe areas:** top **48** (status bar and notch), bottom **32** (home indicator). Nothing interactive in them. The only thing drawn there in the mock is the MISSING sticker row.
- Side margin 16 for HUD, plate, bottom row; rail badges sit at margin 8 (they are decoration-weight, 64 wide).
- Text line boxes are font size + 4 px (the only non-8 values besides strokes and 4 px borders).

### Screen anchors (y from top unless marked; B = from bottom)

| Element | x | y | w x h |
|---|---|---|---|
| Wallet: bolts pill | X0+16 | 56 | 128x40 |
| Wallet: gems pill | X0+152 | 56 | 128x40 |
| Wallet: settings gear | X0+C-56 | 56 | 40x40 |
| Chapter plate | X0+16 | 104 | (C-32)x48 |
| Rail left badge i (0..2) | X0+8 | 168 + 88 i | 64x80 |
| Rail right badge i (0..2) | X0+C-72 | 168 + 88 i | 64x80 |
| Chapter chip (ring + chest) | X0+16 | H-184 | 64x64 |
| PLAY / FIGHT button | X0+96 | H-184 | (C-112)x64 |
| BACK TO ME pill (only when scrolled away) | centred | H-232 | 144x32 |
| Nav bar | X0+8 | H-104 | (C-16)x72 |
| Bottom scrim | 0 | B 0 | W x 240 |

Road viewport = y 152 to H-184 (about 4 to 5 nodes). The current node sits at 50 to 52 percent of H (56 percent for the boss, 55 for the locked look-ahead). The path stays inside `centre ± min(C/2-136, 56)` so the hero platform (176 wide) never touches the rails (x ≤ 72 and ≥ C-72).

### Road geometry (world space, y grows downward)

- Path: smooth Catmull-Rom through node centres, drawn as three strokes: outline **56** (`#2b1d2e`), surface **40** (done `#f3e3c1`, ahead `#b9c3dc`), travelled centre **16** gold `#ffcf33` with a 4 px `#fff0a0` dash (2 on, 14 off). Ahead of the player: 4 px dashed centre `#8190b0` (16 on, 16 off).
- Node pitch **160**. Extra gap: +48 at the chapter entrance (L30), 224 between L39 and the boss, **352** between the boss and the next node (gate lives there; 200 above the boss when it is not current, 304 when it is).
- Node x pattern repeats every 8 levels: offsets `[0, 48, 72, 40, -40, -72, -48, 0]` scaled to the swing limit and snapped to 8.
- Chest milestones after L33 and L36: 64x64 sprite on the road shoulder, 88 px left or right of the path midpoint, label pill 64x16 (`L34` or `CLAIMED`).

### Node boxes (sprite drawn `object-fit: contain` in the box, centred on the path point)

| Node | Box | Art | Notes |
|---|---|---|---|
| Done | 80x96 | `node_completed` | number 28 px at y-14; three 16 px stars at x -28/-8/+12, y +22; unearned = grayscale 50% |
| Locked | 88x88 | `node_locked` | recoloured cool blue (CSS hue-rotate, see MISSING); number 28 px `#6d7a9b` |
| Locked boss | 96x104 | `node_boss` | desaturated and blue-shifted; number 28 px |
| Hard (not current) | ribbon 80x40 under node | `kit3_ribbon_purple` | label HARD 14 px white with ink outline |
| Mega hard (not current) | ribbon 80x40 | `kit3_ribbon_red` | label MEGA |
| Current normal | platform 176x56, ring 224x88, glow 272x272 | `cannon_4` 96x96 + code platform | YOU tag 64x32 at y-92; number plate 64x40 at y+56 |
| Current hard | same + ribbon 96x32 on platform front-right, rotated 6 degrees | `kit3_ribbon_purple` | |
| Current boss | platform 224x72, ring 272x104, glow 320x320 | `boss_junkzilla_intact` 144x144 at y-136, `node_boss` 96x104 at y+24 | YOU tag at y-176 |
| Gate | 224x128 arch, plate 144x32 below | placeholder | lock `node_locked` 48x48 |
| Chapter banner | 240x112 | `kit3_ribbon_purple` (entry), `kit3_ribbon_blue` (next) | label 20-24 px white outlined |

## 3. Fonts

`Lilita One` (the game font, loaded in `src/main.ts`), fallback `Arial Black`, `Impact`. All caps, +0.5 px tracking. The mock rendered with the fallback where Lilita One is not installed, so widths in the real game will be slightly narrower.

| Use | Size / line |
|---|---|
| Entrance panel title | 36 / 40 |
| Node number (done, locked) | 28-32 / 32 |
| Panel ribbon CHAPTER 5 | 28 / 32 |
| PLAY, LET'S GO, button labels | 26 / 32 (LET'S GO 26) |
| YOU tag, banner CH 4, NEED 20 | 24 / 28 |
| Wallet numbers | 22 / 26 |
| Chapter plate title and count, reward values | 18 / 24 |
| Nav tabs | 16 / 20 (14 when C < 368) |
| Locked toast title, back pill, ribbons on nodes | 14 / 16-24 |
| Badge labels, chips, small captions | **12** / 16 (minimum anywhere) |

Colour of text: ink `#2b1d2e` on cream, white with 2 px ink outline on green/purple/red plates.

## 4. Colours

| Token | Hex | Use |
|---|---|---|
| ink | `#2b1d2e` | outlines, text, road edge |
| cream | `#fbe7c6` / `#ecc98e` | plate fill (top / bottom) |
| brass | `#c8963a` | plate and pill borders |
| gold | `#ffcf33` | travelled road, current platform, YOU tag, active tab |
| green | `#3fbf5f` | progress fill, CLAIMED, PLAY (via `btn_green`) |
| red | `#e8452c` | notification dots, -50% tag |
| purple | `#7a4fd0` | HARD ribbon |
| cool / cool-d | `#9fb0d0` / `#5d6d92` | locked state (road `#b9c3dc`, chips `#5d6d92`) |
| CH4 sky | `#8e6cc4` to `#3e2a70` | scenery gradient |
| CH5 teaser | `#e9c88f` to `#b98846` | tinted (grayscale 70%) above the gate, full colour in the entrance panel |
| fog | `rgba(233,225,244, .35 to .82)` | above the gate |

Rules kept from the art direction: chroma lives on interactables and rewards (nodes, badges, PLAY); scenery is lower saturation (alpha 16 to 55 percent skyline and props); locked is cool, never warm grey.

## 5. Layers and z-order

Named layers (`data-layer` on each element; the annotated PNGs print them). World layers scroll with the road; screen layers are fixed.

| z | Layer name(s) | Scroll |
|---|---|---|
| 0 | `L00_scenery_ch4`, `L00_scenery_ch5_teaser`, `L00_skyline` | world |
| 10 | `L10_prop_pixels`, `L10_prop_cabinet`, `L10_cloud` (drift 38 s) | world |
| 20 | `L20_road_surface` (outline, surface, shine, travelled, dashes) | world |
| 40 | `L40_gate_arch`, `L40_gate_plate`, `L40_banner_entry`, `L40_banner_next` | world |
| 50 | `L50_node_<n>`, `L50_ribbon_<n>` | world |
| 55 | `L55_chest_<n>` | world |
| 60 | `L60_glow`, `L60_ring`, `L60_platform`, `L60_avatar_cannon` / `L60_boss_figure`, `L60_node_boss`, `L60_number_plate`, `L60_difficulty_ribbon`, `L60_you_tag`, `L60_sparkle` | world (current hero) |
| 62 | `L62_locked_toast` | screen |
| 65 | `L65_bolt_mascot` | screen, anchored beside the hero |
| 70 | `L70_fog`, `L70_fog_puffs`, `L70_bottom_scrim` | fog world, scrim screen |
| 80 | `L80_chapter_plate` | screen |
| 82 | `L82_wallet_hud` | screen |
| 84 | `L84_badge_daily/quests/collect/event/offer/season` | screen |
| 86 | `L86_chapter_chip`, `L86_play_button` | screen |
| 87 | `L87_back_to_me` | screen |
| 88 | `L88_nav_bar` | screen |
| 90 | `L90_dim` (55 to 62 percent ink), `L90_rail_outline_L/R` (rails state raises badges to 90) | screen |
| 92 | `L92_badge_tooltip`, `L92_rail_legend_panel` | screen |
| 95-96 | `L95_chapter_panel` (+ `_panel_ribbon`, `_panel_scene`, `_reward_row`, `_go_button`), `L96_bolt_peek`, `L96_confetti` | screen |
| 99 | grid, safe-area bands, name labels (debug only) | screen |

## 6. Badge rails

Two vertical rails, three badges a side (owner references: daily gift, events, offers, quests, collection, season pass around the map). More than three a side crowds the road, so a fourth goes in a "more" badge (not drawn).

- Badge **64x80**: coin 56x56 at (4, 0) on a `badge_bell` gold coin, icon 32x32 at (12, 10), label pill 64x16 ink with 12 px white text at y 56, optional chip 48x16 cream at (16, 36) (timer or count), optional red dot 16x16 at the coin's top-right, optional `-50%` tag 40x24 red rotated 8 degrees.
- Pitch **88**; rails start at y 168 (below the chapter plate), end at y 432.
- Left rail: DAILY (`chest_closed`, red dot, wiggles when ready), QUESTS (`medal`, chip 2/5), COLLECT (`cannon_4`, red dot). Right rail: EVENT (`icon_timer`, chip 2D 4H), OFFER (`icon_gem`, -50% tag, timer chip 05:12), SEASON (`crown`, chip 7/30).
- Behind the rails, scenery shows through; the road never enters x ≤ 72 / ≥ C-72 above y 432.
- Tapping a badge opens its popup (existing screens); this mock does not define them.

## 7. Animation notes (all visual only; follow `docs/art/UI_JUICE.md`, honour reduced motion, never pause the simulation)

| Element | Motion | Preset / timing |
|---|---|---|
| Current glow | scale 0.92 to 1.08, alpha 0.55 to 1 | `glowPulse` 1.6 s loop |
| Ring | scale 1 to 1.14, alpha 0.9 to 0.25 | 1.6 s loop |
| YOU tag | bobs 8 px | 1.2 s loop |
| Hero (cannon / boss) | bobs 4 px | 1.2 s loop |
| Sparkles (6, `star`) | twinkle: scale 0.2 to 1 with 45 degree turn, alpha 0 to 1 to 0, staggered | 1.4 s loop; cap 6 live around the hero, within the 30-particle scene cap |
| PLAY button | white glint sweeps across | `glintSweep` 3.4 s |
| Press (all buttons, badges) | squash 0.94, overshoot 1.06 | `pressSquash` |
| Badge idle | float 3 px | `floatBob` 2.4 s, per-badge delay -0.5 s |
| Badge ready (DAILY) | damped wiggle every 3 s | `attentionWiggle` |
| Badge appear | pop in, scale 0 to 1.12 to 1, staggered 70 ms | `popIn` |
| Chest on road | rattle every 3 s when claimable | |
| Boss state | chapter-plate chest wiggles when the chapter is cleared | |
| Clouds | drift 80 px over 38 s | |
| Node unlock | pop in, road draws gold toward it, stars fly in (600 ms auto-scroll first) | from `LEVEL_ROAD_V2` |
| Entrance panel | pops in (scale 0 to 1.12 to 1, 0.55 s); reward cards pop in staggered 0.1 s from 0.35 s; LET'S GO glints; confetti stars twinkle; Bolt hops | |
| Bolt (mascot) | hop loop (squash 8 percent, rise 16 px) every 2.2 s; peeks in on the entrance panel; later: blink, point at the next node, worried at locked | hop 2.2 s |
| Locked toast | pops in on tap of a locked node, auto-hides | |
| Scroll | momentum, snap to current, BACK TO ME pill appears after half a screen away | |

Screenshots freeze every animation at `t = 1400 ms` (`?t=`), so the PNGs are the same each run.

## 8. Asset status

EXISTS (in `src/assets/art`): `node_completed`, `node_locked`, `node_boss`, `node_hard`, `node_mega_hard`, `node_normal` (not used here; the live game also uses it), `star`, `chest_closed`, `chest_open`, `cannon_4`, `boss_junkzilla_intact`, `boss_piano_saurus_rex_intact`, `stage_ch5`, `kit3_panel_popup`, `kit3_ribbon_purple/red/blue`, `btn_green`, `badge_bell`, `icon_bolt`, `bolt` (the nut currency), `icon_gem`, `icon_timer`, `medal`, `crown`.

MISSING (drawn as a marked placeholder in the mock; magenta hatched outline and/or `MISSING <name>` sticker):

| Name | Used for | Stand-in in the mock |
|---|---|---|
| `bolt_pose_*` (mascot Bolt: idle, happy hop, point, peek, worried) | Beside hero, entrance panel | Blue rounded-square robot head with antenna |
| `rail_badge_frame` (round medallion frame with label ribbon, dot, chip, % tag) | Six rail badges | Gold `badge_bell` coin plus CSS label, chip, dot, tag |
| `road_surface_kit` (path material, endcaps, junctions, edge trim) | The road itself | Code-drawn three-stroke path |
| `gate_arch` (closed with lock, open) | Gate above the boss | Grey dome with dark door, magenta dashed |
| `scenery_ch4_panel`, `scenery_ch5_panel` (one large painted background per chapter, no tiling; see CRITIQUE_17) | World background | CSS gradient plus translucent blocks |
| `prop_sheet_ch4` (arcade cabinets, pixel blocks) | Side props | Violet CSS boxes and pink/cyan squares |
| `fog_banks` | Above the gate | Translucent gradient |
| `avatar_platform` (normal, boss; code-drawn in the live game) | Current hero platform | CSS gold ellipse (hatched) |
| `scenery_ch5_card` | Entrance panel picture | `stage_ch5` (an existing interior, used as a stand-in) |
| Locked-state art in cool blue (`node_locked`, `node_boss` locked) | Locked nodes | CSS hue-rotate on the existing art |
| Rail icons: quests, collection, daily, event, offer, season | Badge faces | `medal`, `cannon_4`, `chest_closed`, `icon_timer`, `icon_gem`, `crown`: reuse, but dedicated icons would read better |
| Settings gear icon | Wallet row | Unicode glyph |

## 9. Known deviations from the 8 px grid (for the Pixel Checker)

- Nav tab width `(C-32)/4` = 88 / 80 but 98 at C=424: needs a snapped width plus remainder.
- Text boxes are font size + 4 px; strokes (4 px borders, 56/40/16 road, 2 to 4 px outlines) are intentional.
- The glow, ring and platform positions are on 8 but their sprite inner details (YOU tag arrow rotated 45 degrees, tag rotation 6 to 8 degrees) are not.
- `node()` x positions are snapped to 8 after scaling; the hero platform y offsets (16 / 24) are on 8; the number plate overlaps the platform by design.
- Entrance panel y = round-to-8(H/2 - 232), so it is 8-aligned but not centred to the pixel at 360x780.
- The Chapter plate content uses 2 and 4 px inner nudges so that the 16 px bar sits inside the 4 px border.

## 10. Open questions for the owner

1. Three badges a side: is that the right density, or do the reference screens show four?
2. Should the chapter chip (ring + chest, bottom left) replace or sit with the top plate chest? The mock keeps both (plate for orientation, chip for the thumb).
3. Is the entrance panel one tap (LET'S GO) or does it auto-dismiss into a camera pan?
