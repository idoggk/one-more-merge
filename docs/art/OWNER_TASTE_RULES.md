# OWNER TASTE RULES — will the owner like this art?

A rubric any critic or the Lead applies to a new art asset **before** it goes on the review page. Machine-readable twin: `docs/art/owner_taste_rules.json` (criteria, weights, thresholds, hard fails).

Evidence: the owner's 2026-10-16 review export (917 votes: **744 LIKE, 173 NOT**), his quoted comments, and his statements of 2026-10-15/16. I looked at 25 sheet images in `art-candidates/owner-review-v9/img/` (the images he voted on, 400+ assets: road kits, chapter sheets ch1/4/6/7, resources, badges, tool FX, buttons, offers, nodes, crates, HUD, props and more) and 4 full mocks (road normal, road boss, yard mid, yard win). Per-asset ids map to sheet positions through the `"ids"` list in each `art-candidates/owner-review-v9/<page>.html`.

Only 13 NOT votes came with a reason. Most "why NOT" below is **inference from comparing liked and not-liked pairs**; it is marked *(inferred)*.

## 1. What he wants, in 8 lines

1. **Simpler everywhere.** "As simple as possible", "less busy", "no details on roads". Phone screens are small.
2. **Support is quiet, the main thing is loud.** Plates/nodes beat the road; the merge grid beats FX and backdrop.
3. **One visual language:** glossy chunky toy machine, thick dark-brown outline, brass rim, saturated flat-ish fill. No hyper-real wooden toys.
4. **Keep the machine theme** (cogs, rivets, brass) in UI, units, bosses (decided, Q#110).
5. **Units** = workshop machines at medium detail, readable at 48 px and in greyscale, one colour per family.
6. **FX** must be told apart in peripheral vision by colour, texture and shape while he stares at the grid.
7. **Things must be big enough for a thumb** (side badges, buttons).
8. **Consistent meaning:** shape count = number (rank 7 has 7 spikes), the mascot is always the same mascot, a boss is shown at the end of the route.

## 2. What liked families share versus NOT families

| Family | LIKE | NOT | Visible difference (*inferred*) |
|---|---|---|---|
| Road kits | ch1 (black chevron + brass), ch2 (red/cream checker), ch3 (marquee wood), all `shoulder_edge` | ch4 (thin-plank wood with grain), ch6 (pale planks with cream inlays), ch7 (navy constellations), ch8 (black diamond mosaic) | Liked = **one big flat motif, 2 values**, strong brass edge, a few rivets. NOT = **mottled multi-tone surface texture at tile scale** (grain, inlay, stars, mosaic lines). The road becomes a picture that fights the plates. `shoulder_edge` is a plain line, so it passes everywhere. |
| Resources | coin, gem, bolt, card, star, kit, jumpstart (+ small/pile/spark) | `res_scrap_*`, `res_capsule_*` | Liked = one saturated object, bold silhouette, gold/blue/red palette. Scrap = grey, rusty, broken irregular outline, no silhouette, off-palette. Capsule = blue pill with a tiny clock face (two ideas, meaning unclear) and it is the one object in the set that is not obviously gold/machine. |
| Job icons | none | all 26 | Small abstract metaphors (dots + arrows + blobs) in near-identical blue/gold; hard to tell apart, meaning unclear. Owner: old unit art, goes with the unit redraw. |
| Buttons / bars / panels | `price_*`, `ad_blue`, `socket_*`, round brass buttons, bar frames | `btn_*_v3`, `btn_grey_v1`, `btn_yellow_v04`, `ribbon_*_v2/v3`, thin `bar_fill_*_v02`, `ui_panel_*`, `ui_slider_knob_v2`, `ui_tab_active` | NOT = plain gradient pills / hairline bars with a thin rim and **no machine cue** (no rivets, no cog), thinner than the thick-outline family. |
| Badges (map + v9) | `mapbadge_*`, brass/copper/teal bases, rank badges 1-6, 8 | `badge_burst_discount`, `count_bubble`, `glyph_events`, `glyph_plus`, `glyph_offers_gem__v2`, `lock_broken`, `overflow`, `x2_burst`, `ribbon_lock__v2` | NOT = shine plus small extras (flag, 2nd keyhole, sparkles, tiny strokes). The owner said: remove shine, remove small details, "thumb sized". |
| Tool FX | `bomb_surge_fx_*`, `shot_blowtorch/crane/pipe/rivet_gun`, most impacts | `double_surge_fx_1-4`, `shot_dynamo/jackhammer/mortar/robot_arm/saw_blade/wrecking_ball/nail_gun_alt`, 3 impacts | Liked = one silhouette in one colour (cog burst, crescent, blue flame). NOT = object + trail + orbit lines + sparks in 2-3 hues; several look alike (orange/blue fire). |
| Tab / offer / chest / landmark / crate props | nearly all | `offer_banner_gold`, `offer_bundle_*`, `offer_tile_*`, `crate_confetti*`, `crate_burst_rays`, `crate_bench_open` | Hero-size isolated objects can carry ~6-7 elements and still pass. Confetti rings/piles and burst rays are many tiny pieces with no silhouette; `crate_bench_open` is a messy open drawer at small size. |
| Lock states | `node2_hard/mega/mini_locked`, `badge_lock_closed` | `node2_normal_locked`, `node_locked_ice/padlock`, `vip_padlock`, `road_gate_lock`, `badge_lock_broken`, `badge_ribbon_lock__v2` | Padlock that covers the plate face, plus a grey-blue desaturated plate that "dies" and loses its colour. *(weak evidence, see calibration)* |
| Mascots | `mascot_wave/cheer/wink/worried` (red-gold robot) | `mascot_loading_pose` | Off-model: white-blue robot with a bolt, not the red-gold mascot. |
| Painted mocks | `mock_yard_v2_04_win`; core board v1; road map v3 (approved) | `mock_road_*` (all 4), `mock_yard_v2_01..03` | LIKE = one hero, big objects, calm. NOT = crowded backdrop, tiny items, a dozen focal points (arcade cabinet, clouds, castles, boss, rails, bottle shelf). He kept the boss at route end. |
| Rank badges | 1-6, 8 | 7 | Rank 7 had 8 spikes; shape must carry the number. |

Why ch1-3 pass and ch4/6/7/8 fail, in one rule: **a road tile may have one motif at one scale**. Ch1 chevrons and ch2 checks are one repeated shape; ch3 is stripes + bulbs. Ch4-8 add grain, inlay lines, stars, mosaic, and rivet plates on top of the motif, which is the "details on the roads" he asked to remove.

Why res_scrap and res_capsule fail: the other resources are clean saturated gold/blue/red toys with one outline weight. Scrap is a **grey/rust mess with no clear outline** and capsule is **ambiguous (what is a clock pill?)**; both break C1 and C8.

## 3. Detail budget by role tier

| Tier | Examples | Budget | Send threshold |
|---|---|---|---|
| micro | badges, glyphs, buttons, bars, road pieces, tool chips | 3-4 elements | 72 |
| hero | chests, props, offer frames, resource heroes, rank 8, landmarks | 6-7 elements | 72 |
| fx | tool shots/impacts/surges | 1 silhouette, 1-2 colours; judged at 48 px blurred (fine dust does not count) | 62 |
| screen | painted mocks, results, loading | 1 hero + max 3 focal zones, calm backdrop | 72 |

## 4. The rubric (0-10 per criterion)

`total = sum(score x weight) / 10` → 0-100. Anchors: 0 = bad, 5 = middling, 10 = ideal.

| # | Criterion | Weight | 0 | 5 | 10 |
|---|---|---|---|---|---|
| C1 | **Glance read**: named in 1 s at 48 px, greyscale, blurred; glyph differs from base in hue and value | 18 | blob, needs text | needs a second look | one bold silhouette, one colour |
| C2 | **Detail budget** for its tier (count elements, glints, keyholes, flags; textured fills score 0) | 20 | over 2x budget or textured fill | ~1.5x budget or shine + small details | at/below budget, no shine streaks |
| C3 | **One visual language** (glossy chunky toy, thick dark outline, brass rim) | 14 | hyper-real / hairline / other hand | close but thin, grey, or 2nd light | same as the liked anchors side by side |
| C4 | **Role hierarchy**: quieter than what it supports | 12 | steals the eye | competes | recedes |
| C5 | **Set distinctness**: differs from siblings in 2+ of colour/shape/texture; not a weaker duplicate of a liked asset | 10 | same hue and shape / weaker duplicate | one channel | colour and shape |
| C6 | **Machine-toy cues**: 1-2 of brass, rivets, cogs, gauges | 8 | none or hyper-real wood/rust | generic game UI | clearly a toy workshop part |
| C7 | **Phone/thumb scale** | 10 | tiny, thin lines | readable but small | big, thick, side badges ~48 pt+ |
| C8 | **Consistency/semantics**: count = shape, mascot on-model, meaning obvious | 8 | off-model / wrong count | one oddity | fully consistent |

### Hard fails (any one = never "send")

- **HF1** Photoreal/grunge main fill (grain, rust, stone, fabric) on a small or repeating piece. A single hero-size object is exempt (the yard win mock was liked).
- **HF2** Road/backdrop with more than 2 tones at tile scale, inlays, stars, mosaic, props or glow on the road.
- **HF3** Badge/small icon with shine streaks plus more than 4 elements.
- **HF4** FX with 3+ ideas (object + trail + orbit + sparks) or same hue and shape as a sibling.
- **HF5** Shape count ≠ number, or off-model character.
- **HF6** Unit unreadable at 48 px greyscale, or more than 7 parts.
- **HF7** Screen with more than 3 competing focal zones or a busy top/backdrop.
- **HF8** Wrong language (hairline flat, hyper-real, off palette).
- **HF9** Glyph and base same hue/value (gold check on gold coin).
- **HF10** Tappable side badge/button below ~48 pt.

### Decision

| Result | Rule |
|---|---|
| **SEND to owner** | score ≥ tier threshold (72; fx 62), no hard fail, no criterion ≤ 4, all 8 Lead questions "yes" |
| **FIX first** | any hard fail, or a criterion ≤ 4, or score between 45 and the threshold. A worker redoes it with the failing criteria named. The owner does not see it. |
| **DROP** | score < 45, or 2+ hard fails, or the same family was already NOT for the same reason. Stop iterating; re-brief from scratch or cut it. |

Bands: 85+ very likely LIKE · 72-84 likely LIKE · 62-71 coin flip · 45-61 likely NOT · below 45 almost certainly NOT.

## 5. Calibration test (30 assets, 15 LIKE + 15 NOT)

Method: a seeded script picked 30 ids from the pages I had viewed (max 2 per page, 15 per class) and printed them **shuffled without labels**. I scored each one from the sheet image, computed totals, wrote down the predicted verdict (≥72 = LIKE, else NOT), **then** revealed the votes. Order of columns C1-C8 as in section 4.

**Honesty note:** this is not fully blind. The NOT list was in my brief, so for some ids I could recall the class. I scored from the pictures anyway and did not change a score after the reveal. The first-pass scores below are unchanged.

| Asset | Family | C1-C8 | Total | Predicted | Owner | Hit |
|---|---|---|---|---|---|---|
| mapbadge_glyph_quests | map badge | 8 8 9 8 8 8 8 9 | 82 | LIKE | LIKE | yes |
| mapbadge_base_teal | map badge | 9 8 9 8 8 8 9 9 | 85 | LIKE | LIKE | yes |
| road_ch1_s_curve_a | road | 8 6 9 7 8 8 8 9 | 77 | LIKE | LIKE | yes |
| road_ch2_s_curve_b | road | 8 7 8 7 8 5 8 8 | 74 | LIKE | LIKE | yes |
| booster_tile_jumpstart | level card | 8 8 8 8 7 7 8 8 | 78 | LIKE | LIKE | yes |
| socket_unlit | button/bar | 9 9 9 8 7 8 8 9 | 85 | LIKE | LIKE | yes |
| socket_dim | button/bar | 8 9 8 8 6 7 8 8 | 79 | LIKE | LIKE | yes |
| gift_tag | daily gift | 7 8 8 8 7 5 7 8 | 74 | LIKE | LIKE | yes |
| reveal_frame_rare | crate | 8 8 8 8 7 7 8 8 | 78 | LIKE | LIKE | yes |
| toast_icon_success | settings | 9 9 9 8 8 6 9 9 | 85 | LIKE | LIKE | yes |
| ach_frame_bronze | settings | 8 8 8 8 7 8 8 8 | 79 | LIKE | LIKE | yes |
| icon_key | resource extra | 9 8 8 8 8 7 9 8 | 82 | LIKE | LIKE | yes |
| overdrive_pip_off | HUD | 9 9 8 8 6 8 8 8 | 82 | LIKE | LIKE | yes |
| **bomb_surge_fx_2** | tool FX | 4 3 6 4 3 5 4 6 | 42 | NOT | LIKE | **MISS** |
| **impact_blowtorch** | tool FX | 4 3 5 4 3 4 4 5 | 39 | NOT | LIKE | **MISS** |
| bar_fill_yellow_v02 | ui kit | 7 8 5 7 6 6 6 7 | 66 | NOT | NOT | yes |
| btn_grey_v1 | ui kit | 7 8 6 7 6 4 6 6 | 65 | NOT | NOT | yes |
| milestone_track_empty | daily gift | 6 7 7 6 5 6 5 6 | 61 | NOT | NOT | yes |
| job_blast_plate | job icon | 6 6 7 6 3 5 5 3 | 54 | NOT | NOT | yes |
| job_jackhammer | job icon | 6 6 7 6 4 6 5 3 | 56 | NOT | NOT | yes |
| road_ch8_straight_h | road | 5 4 6 3 6 6 5 7 | 50 | NOT | NOT | yes |
| road_ch6_s_curve_b | road | 5 4 6 5 5 5 5 6 | 50 | NOT | NOT | yes |
| crate_confetti | crate | 3 3 5 4 4 3 3 5 | 37 | NOT | NOT | yes |
| shot_dynamo | tool FX | 5 4 5 4 5 4 4 5 | 45 | NOT | NOT | yes |
| shot_wrecking_ball | tool FX | 5 4 5 4 5 4 4 5 | 45 | NOT | NOT | yes |
| app_icon_1024 | loading | 5 4 6 5 6 6 6 6 | 53 | NOT | NOT | yes |
| badge_ribbon_lock__v2 | v9 badge | 6 5 7 6 5 6 6 6 | 58 | NOT | NOT | yes |
| res_capsule_pile | resource | 6 6 6 6 5 6 6 5 | 58 | NOT | NOT | yes |
| **node2_normal_locked** | node | 8 8 8 8 7 7 8 8 | 78 | LIKE | NOT | **MISS** |
| **stamp_claimed** | daily gift | 8 8 8 8 6 6 8 8 | 76 | LIKE | NOT | **MISS** |

**Agreement: 26/30 = 87%.** By class: LIKE recall 13/15, NOT recall 13/15. The 87% is optimistic (not blind, and the first threshold was chosen before scoring but I knew the NOT families).

### Misses and rubric fixes

| Miss | Why the rubric was wrong | Fix |
|---|---|---|
| `bomb_surge_fx_2` (LIKE, scored 42), `impact_blowtorch` (LIKE, scored 39) | I counted particle dust as detail. At 48 px blurred it vanishes; what remains is one clear silhouette (cog burst, starburst) in one colour, which he likes. | New **fx tier**: judge at 48 px blurred, count silhouettes/colours not dust (budget: 1 silhouette, max 2 colours), threshold 62. Rescored under the fix, both land at ~60-64 (borderline); the NOT shots (dynamo, wrecking ball) stay ~45. HF4 now targets "3+ ideas or same hue/shape as a sibling" instead of "particles". |
| `node2_normal_locked` (NOT, scored 78) | The grey-blue plate loses its family colour and the padlock sits on the plate face; its siblings (`hard/mega/mini_locked`) were liked, so this may be partly noise. | Lock-state rule in C2/C3: one small padlock, never covering the plate's main face, plate keeps its hue. Rescoring: C2 8→6, C3 8→6, C5 7→5 gives about 69 = fix first. Weak evidence, treat as a soft rule. |
| `stamp_claimed` (NOT, scored 76) | Cream/gold check on a gold coin has little value contrast, and a better green check ring is already liked (duplicate). | **HF9** glyph/base contrast; C5 now penalises a weaker duplicate of a liked asset. Rescoring: C1 8→5, C5 6→4 gives about 68 = fix first. |

The fixes were made after seeing the misses and are **not tested on fresh data**. Re-run the calibration whenever the owner sends a new export; add the new votes to the JSON `calibration` block.

## 6. How the Lead uses this

Answer all 8 before an asset goes to the owner or onto the review page. Any "no" → fix by a worker, do not show.

1. **Tier and budget:** which tier is it, and is the element count within the budget in section 3?
2. **Squint test:** at 48 px, greyscale, blurred, can I name it in one second, and is its glyph clearly different from its base?
3. **Quiet support:** is it quieter than what it supports (road under plates, backdrop under board, FX under the grid, badge under its label)?
4. **Same language:** put it next to the liked anchors (road map v3, core board v1, ch1-3 roads, rank badges 1-6, resource icons). Does it look like the same game?
5. **Hard fails:** any of HF1-HF10? (Mocks: more than 3 focal zones? Roads: any texture? Badges: shine or extras?)
6. **Meaning and numbers:** does the shape count match the number, is the mascot/boss on-model, is the locked/ready/done state obvious, is a machine cue (brass, rivet, cog) present?
7. **Owner history:** did he already vote NOT on a sibling or earlier version? Is the exact reason fixed? (Check the export list in this repo's task notes and section 2.)
8. **Score:** total ≥ threshold (72; fx 62) and every criterion ≥ 5? If not, name the failing criteria and send it back. Below 45 or 2+ hard fails: drop and re-brief.

Practical habits that follow from the votes:

- Show him **sets side by side** at phone size; he compares siblings.
- Mocks: one hero, big objects, calm backdrop that follows the chapter theme, boss at route end, side badges thumb sized.
- Never ship "more detailed" as a fix for a NOT. Every NOT reason he gave was "simpler".
- A whole set that is one old style (job icons) fails together; redo the set, not single icons.

## 7. Limits

- Most NOT votes have no comment; section 2 reasons are inferred and may be wrong for single assets (the lock and stamp misses show this).
- 917 votes by one person on one day; taste can move. His later statements (machine theme kept, units medium detail) override older votes.
- Hero-size isolated objects get away with more detail than the rubric's micro tier; use tiers, not one global "less detail".
