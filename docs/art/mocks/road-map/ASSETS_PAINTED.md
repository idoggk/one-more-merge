# ASSETS_PAINTED: painted road map v2 broken into assets

Task t-d4d4c5e1 (Asset Breaker), 2026-10-15. Source images: `art-candidates/mockups/road-map-painted-v2/` (normal_try1, boss_try2, chapter_try1, locked_try1; style master ref_normal_try1). Critic: `docs/art/mocks/road-map/PAINTED_CRITIQUE_V2.md` (CRITIQUE_85, on branch `orch/t-229c0154-critic-painted-road-map-mocks-v2`). Base list: `docs/art/mocks/road-map/ASSETS.md` and `art-candidates/mockups/road-map/manifest.json` (t-791f2b99). Machine-readable: `art-candidates/mockups/road-map-painted-v2/manifest.json`.

63 painted assets: NEEDS-ART 22, EXISTS 18, CODE-DRAWN 13, NEEDS-SLICE 10. Versus the base: CHANGED 25, UNCHANGED 16, NEW 22; 66 base assets are kept in the manifest as SUPERSEDED (fallback) or NOT-SHOWN.

## How to read
- Sizes are CSS px at 390x844, 1x / 2x. The painted images are about 2.18x of 390 wide, so a NEEDS-SLICE cut is about 2x quality. Crop coordinates are in painted-image pixels (`crop.px`), the matching layout box is `placementCss390x844`. Fit images by height to 844 and centre-crop the width (boss_try2 is 910x1729, scale 0.488).
- Visible in: N normal, B boss, C chapter, L locked.
- Status: EXISTS (approved file), NEEDS-SLICE (cut from the painted page), NEEDS-ART (ChatGPT brief in the manifest, `brief`), CODE-DRAWN. Change vs base: UNCHANGED, CHANGED, NEW.
- Painted pages are art targets. Wallet, nav, plate, PLAY, badges chips, numbers and stars are live pieces placed by safe-area inset (CRITIQUE_85 section 3). Never slice text, numbers or stars from a paint.
- Painted node numbers and star counts are wrong in places (see Known paint defects); the live data wins.

## Screen map (390x844)
Top to bottom: sky (L0) > scenery (L5-15) > road (L20) > nodes (L40) > hero platform, cannon, YOU tag, Bolt (L55-58) > rail badges (L70) > wallet row, chapter plate (L75) > PLAY pill, chest ring, nav (L80). Chapter state adds dim (L90), popup (L95-97), Bolt cheer (L96), confetti (L99).

| Slot | Box (x,y,w,h) | Notes |
|---|---|---|
| Wallet nut / gem / gear | 18,66,133,37 / 169,66,137,37 / 330,59,50,50 | y = max(inset-top+8, 56) in the build |
| Chapter plate | 77,112,236,78 | centred between the rails |
| Left rail (DAILY, QUESTS, COLLECT) | x 4, y 136 / 220 / 309, 64 wide | keep 8 px from the edge in the build |
| Right rail (EVENT, OFFERS, SEASON) | x 320, y 136 / 227 / 311 | |
| Road + nodes | S-curve, x 100-290 | node spacing about 50-60 px up the path |
| PLAY pill + chest ring | 94,698,276,76 / 10,698,78,76 | bottom = nav top - 10 |
| Nav | 11,784,368,54 | bottom = inset-bottom + 8 (paint has 10, needs 34) |
| Chapter popup | 56,334,280,293 | centred, y centre about 52% |

## Road nodes

| id | role | 1x / 2x | states | z | vis | status | change |
|---|---|---|---|---|---|---|---|
| node_done_disc | Level node disc: done / next (also the far, scaled-down nodes in the chapter view) | 89x49 / 178x98 | done (green, 1-3 stars); next (same disc, no stars, number only); pressed; glow (just unlocked) | 40 | NBCL | NEEDS-ART | CHANGED |
| star_pip | Star pip, earned/unearned (3 under every done node); unearned = grey code tint | 16x16 / 32x32 | earned; unearned | 50 | NBCL | EXISTS | UNCHANGED |
| node_locked_padlock | Locked level node (ahead of YOU) | 62x57 / 124x114 | locked (steel); locked on ice (cool blue-grey, locked state); tap shake | 40 | NL | NEEDS-ART | CHANGED |
| node_boss_platform | Boss level platform (level 40; 50 in the chapter view, far and small) | 120x51 / 240x102 | normal; locked (dark tint); glow | 40 | BC | NEEDS-ART | CHANGED |

## Current-level hero

| id | role | 1x / 2x | states | z | vis | status | change |
|---|---|---|---|---|---|---|---|
| node_you_platform | Gold platform the cannon (YOU) stands on | 110x46 / 220x92 | normal; glow; ember (boss approach) | 55 | NBL | NEEDS-ART | CHANGED |
| boss_junkzilla_intact | Boss standing on the boss platform | 144x144 / 288x288 | intact; cracked; critical (art exists) | 45 | B | EXISTS | UNCHANGED |
| fx_flame_cluster | Two small flame clusters left and right of the boss | 40x44 / 80x88 | loop | 46 | B | CODE-DRAWN | NEW |
| hero_cannon_4 | Cannon (the YOU unit) on the platform | 96x96 / 192x192 | idle; happy hop (level start) | 56 | NBL | EXISTS | UNCHANGED |
| you_tag | Yellow YOU speech tag above the hero | 60x34 / 120x68 | normal | 58 | NBL | CODE-DRAWN | NEW |
| hero_glow_ring_you | Soft gold glow and sparkles around the hero | 64x32 / 128x64 | loop | 54 | NBL | CODE-DRAWN | UNCHANGED |

## Road surface kit

| id | role | 1x / 2x | states | z | vis | status | change |
|---|---|---|---|---|---|---|---|
| road_coin_trail | Small gold coins lying on the road toward the boss | 10x6 / 20x12 | normal; collect (fly to wallet) | 25 | B | CODE-DRAWN | NEW |
| road_kit_ch4 | Road path pieces (straight, curves, T, cross, end caps), arcade chapter | 70x70 / 140x140 | normal; done (gold line lit); ahead (line dim) | 20 | NBCL | NEEDS-ART | CHANGED |
| road_kit_ch4_ice | Frosty ice variant of the ch4 road above a locked gate | 70x70 / 140x140 | normal | 20 | L | NEEDS-ART | NEW |
| road_glow_done | Brighter gold line and glow on the completed part of the road | 160x73 / 320x146 | normal | 25 | NBL | CODE-DRAWN | NEW |

## Mascot Bolt

| id | role | 1x / 2x | states | z | vis | status | change |
|---|---|---|---|---|---|---|---|
| bolt_idle | Bolt waving next to the hero (normal) | 64x72 / 128x144 | idle; wave | 58 | N | EXISTS | CHANGED |
| bolt_worried | Bolt worried (boss approach): sweat drop, hands up | 64x72 / 128x144 | worried | 58 | B | EXISTS | UNCHANGED |
| bolt_point | Bolt pointing up at the gate (locked state) | 64x72 / 128x144 | point | 58 | L | EXISTS | UNCHANGED |
| bolt_happy | Bolt cheering at the chapter popup | 64x72 / 128x144 | happy; cheer hop | 96 | C | EXISTS | UNCHANGED |

## Gate, banners, chests

| id | role | 1x / 2x | states | z | vis | status | change |
|---|---|---|---|---|---|---|---|
| prop_chest_shoulder | Reward chest on the road shoulder (tap to open) | 56x48 / 112x96 | closed; ready (glow + bounce); open | 30 | N | EXISTS | CHANGED |
| road_gate_closed_frost | Closed gate across the road, frosty (locked chapter) | 170x108 / 340x216 | closed; shake (tap); open (unlock) | 30 | L | NEEDS-ART | CHANGED |
| road_gate_lock | Gold padlock on the gate | 32x34 / 64x68 | locked; opening | 31 | L | EXISTS | UNCHANGED |
| gate_need_sign | Wooden sign NEED 20 STARS (text live) | 90x27 / 180x54 | normal | 32 | L | NEEDS-ART | CHANGED |

## HUD, buttons, panels

| id | role | 1x / 2x | states | z | vis | status | change |
|---|---|---|---|---|---|---|---|
| wallet_pill_cream | Wallet pill background (nut and gem), stretchable | 133x37 / 266x74 | normal; pressed (plus button); glow (value changed) | 75 | NBCL | NEEDS-ART | CHANGED |
| icon_nut_coin | Currency icon in the wallet (hex nut coin) | 30x30 / 60x60 | normal; fly-to-wallet | 76 | NBCL | NEEDS-SLICE | NEW |
| icon_gem | Gem currency icon (wallet, OFFERS badge, reward card) | 30x30 / 60x60 | normal | 76 | NBCL | EXISTS | NEW |
| settings_button | Settings round button (gear on cream disc, brass rim) | 50x50 / 100x100 | normal; pressed | 75 | NBCL | NEEDS-SLICE | CHANGED |
| chapter_plate | Chapter plate (title, progress bar, chest) | 236x78 / 472x156 | in progress (green fill); complete (full green, chest ready glow); new chapter (empty dark track) | 75 | NBCL | NEEDS-ART | CHANGED |
| chest_ring_frame | Round chapter-reward chest button (ring = progress) | 78x76 / 156x152 | filling; ready (glow + bounce); pressed | 80 | NBL | NEEDS-ART | CHANGED |
| play_button_green | Main PLAY LEVEL / LET'S GO button, stretchable | 276x76 / 552x152 | normal; pressed; disabled (grey); glow | 80 | NLC | NEEDS-ART | CHANGED |
| play_button_red | FIGHT BOSS button | 276x76 / 552x152 | normal; pressed; glow | 80 | B | NEEDS-ART | CHANGED |
| nav_bar_frame | Bottom nav bar frame and gold active tab | 368x54 / 736x108 | normal; tab active (gold) / inactive (dark); tab pressed | 80 | NBCL | CODE-DRAWN | UNCHANGED |
| nav_icon_road | Nav icon ROAD: map pin, dark on the gold active tab | 34x36 / 68x72 | inactive; active | 81 | NBCL | NEEDS-SLICE | NEW |
| nav_icon_units | Nav icon UNITS: Bolt head (blue robot face) | 34x36 / 68x72 | inactive; active | 81 | NBCL | NEEDS-SLICE | NEW |
| nav_icon_machine | Nav icon MACHINE: silver wrench | 34x36 / 68x72 | inactive; active | 81 | NBCL | NEEDS-SLICE | NEW |
| nav_icon_events | Nav icon EVENTS: calendar with a star | 34x36 / 68x72 | inactive; active | 81 | NBCL | NEEDS-SLICE | NEW |
| chapter_popup_panel | Chapter entrance popup panel (cream, gold frame, corner screws), nine-slice | 280x293 / 560x586 | open | 95 | C | EXISTS | UNCHANGED |
| chapter_ribbon_purple | Purple ribbon CHAPTER 5 on the popup top | 220x52 / 440x104 | normal | 96 | C | EXISTS | UNCHANGED |
| plaque_title_pill | Cream title plate MUSIC ATTIC under the scene (text live) | 236x28 / 472x56 | normal | 96 | C | NEEDS-ART | NEW |
| reward_card_slot | Reward card slot (icon + xN text) | 65x65 / 130x130 | normal; claimed (check) | 96 | C | CODE-DRAWN | NEW |
| icon_coin_bolt | Round gold coin with a lightning bolt (reward x200) | 44x44 / 88x88 | normal | 97 | C | NEEDS-SLICE | NEW |
| fx_confetti | Confetti and sparkles around the chapter popup | 366x275 / 732x550 | burst | 99 | C | CODE-DRAWN | NEW |
| fx_dim_overlay | Dim layer over the map behind the popup | 390x844 / 780x1688 | normal | 90 | C | CODE-DRAWN | NEW |

## Rail badges (6)

| id | role | 1x / 2x | states | z | vis | status | change |
|---|---|---|---|---|---|---|---|
| badge_base_brass | Round badge base, shared by all six rail badges | 64x64 / 128x128 | normal; ready (glow); locked (grey); pressed | 70 | NBCL | EXISTS | CHANGED |
| badge_glyph_daily | DAILY gift box (blue/red, bow) | 32x32 / 64x64 | closed; open | 71 | NBCL | EXISTS | UNCHANGED |
| badge_glyph_quests | QUESTS medal with a star | 32x32 / 64x64 | normal | 71 | NBCL | EXISTS | UNCHANGED |
| badge_glyph_collect | COLLECT red cannon glyph | 32x32 / 64x64 | normal; new unit (red dot) | 71 | NBCL | NEEDS-SLICE | CHANGED |
| badge_glyph_events | EVENT stopwatch glyph | 32x32 / 64x64 | normal; urgent (red tint) | 71 | NBCL | NEEDS-SLICE | CHANGED |
| badge_glyph_offers | OFFERS gem glyph | 32x32 / 64x64 | normal | 71 | NBCL | EXISTS | CHANGED |
| badge_glyph_season | SEASON gold crown | 32x32 / 64x64 | normal | 71 | NBCL | EXISTS | UNCHANGED |
| badge_label_pill | Dark label pill under each badge (DAILY, QUESTS, ...) | 58x20 / 116x40 | normal | 72 | NBCL | CODE-DRAWN | UNCHANGED |
| badge_count_chip | Progress chip 2/5 and 7/30 | 40x18 / 80x36 | normal | 72 | NBL | CODE-DRAWN | CHANGED |
| badge_dot | Red notification dot (DAILY, COLLECT) | 16x16 / 32x32 | red; green | 73 | NBCL | EXISTS | UNCHANGED |
| badge_tag_percent | Red discount tag on OFFERS | 34x22 / 68x44 | normal | 73 | NBCL | CODE-DRAWN | CHANGED |
| badge_timer_ribbon | EVENT two-line label with countdown | 58x30 / 116x60 | normal; urgent (red text) | 72 | NBL | CODE-DRAWN | CHANGED |

## Scenery

| id | role | 1x / 2x | states | z | vis | status | change |
|---|---|---|---|---|---|---|---|
| bg_sky_purple | Full-screen sky behind the whole map (no tiling) | 390x844 / 780x1688 | normal | 0 | NBCL | NEEDS-ART | CHANGED |
| scenery_ch4_body | Chapter 4 scrolling scenery panel (islands, trees, props, no road) | 390x1200 / 780x2400 | normal; frost (locked state overlay) | 5 | NBCL | NEEDS-ART | CHANGED |
| scenery_ch5_card | Chapter 5 MUSIC ATTIC scene card picture | 247x108 / 494x216 | normal | 96 | C | NEEDS-SLICE | CHANGED |

## Props (ch4)

| id | role | 1x / 2x | states | z | vis | status | change |
|---|---|---|---|---|---|---|---|
| prop_arcade_cabinet | Big arcade cabinet with a pink space-invader screen, lower left | 118x176 / 236x352 | normal | 10 | NL | NEEDS-ART | NEW |
| prop_neon_arch | Neon arch with an invader icon (far right of the road) | 80x112 / 160x224 | normal | 8 | NCL | NEEDS-ART | NEW |
| prop_star_tower | Small purple pavilion with a gold star on top (right, behind Bolt) | 57x87 / 114x174 | normal | 10 | NL | NEEDS-ART | NEW |
| prop_tree_set | Voxel trees: round, pine, and snow-capped versions (locked state) | 50x64 / 100x128 | green; snow (locked state) | 10 | NBCL | NEEDS-ART | NEW |
| prop_island_blocks | Floating grass-top brick plateaus and neon cubes | 80x60 / 160x120 | normal | 8 | NBCL | NEEDS-ART | NEW |
| prop_cloud_puffs | Foreground cloud puffs (lower left and right) | 165x105 / 330x210 | normal | 15 | NBCL | NEEDS-ART | NEW |

## Sources, crops and notes per asset

- **node_done_disc** (NEEDS-ART, base was EXISTS): crop normal_try1.png x235 y1420 w195 h108 -> css 108,649,89,49. Anchor: centre on the path point, disc centre at y; stars 22 px below centre. Painted node is a flat green oval disc with gold rim, number on top and 3 star pips under it. The live node_completed is a tall pedestal medallion with a white face and dark stars: different silhouette. Fallback: src/assets/art/node_completed.webp (differs in silhouette; use only until art lands). 
- **star_pip** (EXISTS): file src/assets/art/star.webp (review: live game asset). crop normal_try1.png x272 y1470 w118 h46 -> css 125,672,54,21. Anchor: x -24/0/+24, y +22 from disc centre; middle star 3 px higher. Painted star is slightly larger than 16 px (about 14 px wide at 1x per star but touching). Keep 16.
- **node_you_platform** (NEEDS-ART): crop normal_try1.png x305 y1065 w240 h100 -> css 140,487,110,46. Anchor: centre on path point; cannon base sits on its top face 8 px above centre. Painted platform is a round gold plate with a bright rim, the number below the cannon on it. Boss state: same plate in darker ember tone with the number on a dark inner disc. 
- **node_locked_padlock** (NEEDS-ART, base was EXISTS): crop normal_try1.png x455 y618 w135 h125 -> css 208,283,62,57. Anchor: centre on path point; padlock rises 18 px above centre. Painted locked node: dark steel disc with a silver padlock standing on it, number on the disc under the padlock (white numeral). Live node_locked is a mauve ring with a small gold padlock hanging at the bottom. Fallback: src/assets/art/node_locked.webp + code tint (node_locked_cool). Replaces base node_locked_cool NEEDS-ART (cool variant now part of this brief).
- **node_boss_platform** (NEEDS-ART, base was EXISTS): crop boss_try2.png x333 y570 w245 h105 -> css 135,278,120,51. Anchor: centre on path point; boss feet 10 px above centre. Painted boss node is a wide red-gold arena platform with a dark inner disc holding the number; the boss stands on it. Live node_boss is a round medallion. Fallback: src/assets/art/node_boss.webp. 
- **boss_junkzilla_intact** (EXISTS): file src/assets/art/boss_junkzilla_intact.webp (review: live game boss art). crop boss_try2.png x360 y425 w260 h200 -> css 149,207,127,98. Anchor: bottom centre on platform centre y-10. Painted boss (skull crest, red-black, orange eyes) is a look target; ship the real sprite. Painted size is about 111x86 css, shipped sprite 144 box: scale to about 0.8.
- **fx_flame_cluster** (CODE-DRAWN): crop boss_try2.png x300 y520 w90 h100 -> css 119,254,44,49. Anchor: bottom centre, 36 px left/right of boss centre. Particle emitter with code-drawn teardrops (orange to yellow). No art.
- **road_coin_trail** (CODE-DRAWN): crop boss_try2.png x470 y695 w70 h70 -> css 202,339,34,34. Anchor: on the path centre line. Flat gold ellipses; optional, skip if cluttered.
- **hero_cannon_4** (EXISTS): file src/assets/art/cannon_4.webp (and cannon_1..6) (review: live unit art). crop normal_try1.png x338 y935 w185 h170 -> css 155,427,85,78. Anchor: bottom centre on platform top face. Painted red toy cannon with a gold muzzle and a star wheel is the look target. The hero is the best owned cannon (cannon_1..6). 
- **you_tag** (CODE-DRAWN): crop normal_try1.png x362 y878 w132 h74 -> css 166,401,60,34. Anchor: bottom pointer tip 6 px above the cannon barrel; ALWAYS above the node (critic: boss paint put it below). Yellow rounded rect + tail + dark outline + cream word YOU; use ui_bubble as a nine-slice only if it matches.
- **hero_glow_ring_you** (CODE-DRAWN): crop normal_try1.png x260 y940 w330 h260 -> css 119,430,151,119. Anchor: centre on platform. 
- **bolt_idle** (EXISTS): file art-candidates/batch-at/at1/bolt_idle.png (+ .webp) (review: batch-at/at1/contact-dark.png (UNREVIEWED)). crop normal_try1.png x525 y940 w155 h190 -> css 240,430,71,87. Anchor: bottom centre on the road shoulder, 80 px right of the platform. Normal state paints Bolt waving with one raised hand. Painted wave pose is not in the AT batch; optional NEEDS-ART bolt_wave later.
- **bolt_worried** (EXISTS): file art-candidates/batch-at/at1/bolt_worried.png (+ .webp) (review: batch-at/at1/contact-dark.png (UNREVIEWED)). crop boss_try2.png x545 y760 w175 h185 -> css 239,371,85,90. Anchor: bottom centre, right shoulder. 
- **bolt_point** (EXISTS): file art-candidates/batch-at/at1/bolt_point.png (+ .webp) (review: batch-at/at1/contact-dark.png (UNREVIEWED)). crop locked_try1.png x530 y870 w150 h175 -> css 242,398,69,80. Anchor: bottom centre, right shoulder. 
- **bolt_happy** (EXISTS): file art-candidates/batch-at/at1/bolt_happy.png (+ .webp) (review: batch-at/at1/contact-dark.png (UNREVIEWED)). crop chapter_try1.png x636 y1150 w180 h205 -> css 291,526,82,94. Anchor: bottom centre on popup right edge. Chapter state paints Bolt jumping with both arms up (cheer) over the popup edge. 
- **prop_chest_shoulder** (EXISTS): file src/assets/art/chest_closed.webp, chest_open.webp (ready = code glow) (review: live game asset). crop normal_try1.png x625 y1112 w128 h108 -> css 286,508,59,49. Anchor: bottom centre on the shoulder, right of Bolt. Painted shoulder chest is the red/gold star chest (same as the plate and ring chest), not the wood/iron/gold road chests. Other chest tiers (wood/iron/gold, CRITIQUE_38) not shown in v2.
- **wallet_pill_cream** (NEEDS-ART, base was EXISTS): crop normal_try1.png x40 y145 w290 h80 -> css 19,66,133,37. Anchor: top-left x=18 (nut) and x=169 (gem), y = safe-area-top + 8 (min 56). Nine-slice 1x l20 t8 r20 b8. Painted wallet pills are cream with a thick brass rim and a round brass plus button; live wallet uses the dark kit3 well. Fallback: src/assets/art/kit3_panel_well.webp. 
- **icon_nut_coin** (NEEDS-SLICE): crop normal_try1.png x50 y155 w68 h68 -> css 23,71,31,31. Anchor: left end of the nut pill, 6 px inset. Painted wallet coin is a gold hex-nut coin; the live icon_bolt is a lightning bolt. The chapter reward coin x200 is a round coin with a lightning bolt. Owner decision needed: one currency icon. Fallback: src/assets/art/icon_bolt.webp. Slice with tools/slice-sheet.mjs or any cropper; remove the background by hand (the painted page has no key), then run the art critic. If the cut is unclean, fall back to NEEDS-ART.
- **icon_gem** (EXISTS): file src/assets/art/icon_gem.webp (review: live game asset). crop normal_try1.png x372 y160 w70 h66 -> css 170,73,32,30. Anchor: left end of the gem pill. 
- **settings_button** (NEEDS-SLICE, base was NEEDS-ART): crop normal_try1.png x718 y126 w114 h114 -> css 329,58,52,52. Anchor: top-right, x=330 y = wallet y - 7. Base NEEDS-ART icon only; the painted page gives the finished round button, so it can be sliced. Slice with tools/slice-sheet.mjs or any cropper; remove the background by hand (the painted page has no key), then run the art critic. If the cut is unclean, fall back to NEEDS-ART.
- **chapter_plate** (NEEDS-ART, base was EXISTS): crop normal_try1.png x168 y245 w516 h172 -> css 77,112,236,79. Anchor: top centre x=77, y = wallet bottom + 9. Nine-slice 1x l28 t16 r28 b16. Painted plate is a cream plaque with brass rim and two corner screws, 236x78: taller and narrower than the base 358x56. Chapter title is live text. Fallback: kit3_panel_card.webp + hp_frame.webp + hp_fill.webp + chest_closed.webp (48 px). 
- **chest_ring_frame** (NEEDS-ART, base was EXISTS): crop normal_try1.png x22 y1525 w170 h165 -> css 10,697,78,75. Anchor: bottom-left x=10, bottom = nav top - 10. Painted: a dark round socket with a 4-segment green ring (segments fill with progress) around the red chest, beside the PLAY pill. Fallback: chest_closed.webp + code ring. 
- **play_button_green** (NEEDS-ART, base was EXISTS): crop normal_try1.png x205 y1525 w603 h165 -> css 94,697,276,75. Anchor: bottom centre, bottom = nav top - 10; width = screen - 2*94 (chest ring left). Nine-slice 1x l40 t20 r40 b24. Painted PLAY pill is a glossy green pill with a thick gold rim and sparkles; live btn_green is a flat green pill with a cream rim and rivets. Fallback: src/assets/art/btn_green.webp, btn_green_pressed.webp. 
- **play_button_red** (NEEDS-ART, base was EXISTS): crop boss_try2.png x232 y1335 w595 h170 -> css 86,652,290,83. Anchor: same as play_button_green. Nine-slice 1x l40 t20 r40 b24. Boss state: FIGHT BOSS red-orange pill, same gold rim. Fallback: src/assets/art/btn_red.webp, btn_red_pressed.webp. 
- **nav_bar_frame** (CODE-DRAWN): crop normal_try1.png x25 y1712 w803 h118 -> css 12,783,367,54. Anchor: bottom centre, bottom = safe-area-bottom + 8 (needs 34 px: normal paint has 10). Painted nav is a floating dark navy plate with a violet border and a gold active tab. Chapter paint draws it wider (critic): build live. 
- **nav_icon_road** (NEEDS-SLICE): crop normal_try1.png x100 y1718 w76 h82 -> css 46,785,35,37. Anchor: tab centre, 8 px above the label. Slice with tools/slice-sheet.mjs or any cropper; remove the background by hand (the painted page has no key), then run the art critic. If the cut is unclean, fall back to NEEDS-ART.
- **nav_icon_units** (NEEDS-SLICE): crop normal_try1.png x284 y1714 w100 h88 -> css 130,784,46,40. Anchor: tab centre, 8 px above the label. Slice with tools/slice-sheet.mjs or any cropper; remove the background by hand (the painted page has no key), then run the art critic. If the cut is unclean, fall back to NEEDS-ART.
- **nav_icon_machine** (NEEDS-SLICE): crop normal_try1.png x485 y1714 w92 h88 -> css 222,784,42,40. Anchor: tab centre, 8 px above the label. Slice with tools/slice-sheet.mjs or any cropper; remove the background by hand (the painted page has no key), then run the art critic. If the cut is unclean, fall back to NEEDS-ART.
- **nav_icon_events** (NEEDS-SLICE): crop normal_try1.png x678 y1714 w84 h88 -> css 310,784,38,40. Anchor: tab centre, 8 px above the label. Slice with tools/slice-sheet.mjs or any cropper; remove the background by hand (the painted page has no key), then run the art critic. If the cut is unclean, fall back to NEEDS-ART.
- **badge_base_brass** (EXISTS): file art-candidates/map-badge-1/bases/badge_base_brass.png + badge_base_brass_locked.png (review: CRITIQUE_69 keep-list (review page group: map badge batch 1)). crop normal_try1.png x8 y297 w148 h155 -> css 4,136,68,71. Anchor: left rail x=4 / right rail x=322 (min 8 from the edge), centre y per slot. All six painted badges use ONE brass ring with a warm cream-brown face; copper and teal bases are not visible in v2 (still approved, unused). Compare against the painted rim: painted is a thicker glossier brass with dark inner rim.
- **badge_glyph_daily** (EXISTS): file art-candidates/map-badge-1/glyphs/badge_glyph_daily.png + badge_glyph_daily_open.png (review: CRITIQUE_69 keep-list). crop normal_try1.png x38 y315 w90 h90 -> css 18,144,41,41. Anchor: badge centre, 4 px up. 
- **badge_glyph_quests** (EXISTS): file art-candidates/map-badge-1/glyphs/badge_glyph_quests.png (review: CRITIQUE_69 keep-list). crop normal_try1.png x40 y495 w90 h85 -> css 19,226,41,39. Anchor: badge centre, 8 px up (count chip below). 
- **badge_glyph_collect** (NEEDS-SLICE, base was EXISTS): crop normal_try1.png x30 y690 w105 h95 -> css 14,315,48,43. Anchor: badge centre. Painted third left badge is COLLECT with a red toy cannon, not the album glyph. Fallback: badge_glyph_album.png (approved, different meaning). Slice with tools/slice-sheet.mjs or any cropper; remove the background by hand (the painted page has no key), then run the art critic. If the cut is unclean, fall back to NEEDS-ART.
- **badge_glyph_events** (NEEDS-SLICE, base was NEEDS-ART): crop normal_try1.png x722 y308 w108 h112 -> css 330,141,49,51. Anchor: badge centre, 8 px up. Painted EVENT glyph is a silver stopwatch; base glyph was NEEDS-ART FIX. Fallback: badge_glyph_events.png (FIX). Slice with tools/slice-sheet.mjs or any cropper; remove the background by hand (the painted page has no key), then run the art critic. If the cut is unclean, fall back to NEEDS-ART.
- **badge_glyph_offers** (EXISTS): file src/assets/art/icon_gem.webp (same gem as the wallet) (review: live game asset). crop normal_try1.png x725 y512 w104 h100 -> css 332,234,48,46. Anchor: badge centre, 8 px up. Painted OFFERS glyph is a blue gem (critic CRITIQUE_69 asked for coin or price tag instead of a crate). Fallback: badge_glyph_offers.png (approved crate, weak). 
- **badge_glyph_season** (EXISTS): file art-candidates/map-badge-1/glyphs/badge_glyph_season.png (review: CRITIQUE_69 keep-list). crop normal_try1.png x725 y685 w110 h90 -> css 332,313,50,41. Anchor: badge centre, 8 px up. 
- **badge_label_pill** (CODE-DRAWN): crop normal_try1.png x18 y408 w128 h44 -> css 8,187,59,20. Anchor: badge bottom centre, overlapping 6 px. Dark navy rounded pill, thin brass edge, cream bold text 11 px.
- **badge_count_chip** (CODE-DRAWN, base was EXISTS): crop normal_try1.png x45 y565 w85 h40 -> css 21,258,39,18. Anchor: badge centre x, 14 px above the label top. Painted count (2/5, 7/30) is a small dark chip inside the lower face of the badge, not a ribbon. Fallback: badge_ribbon_count.png. Chapter paint broke these chips; always live.
- **badge_dot** (EXISTS): file art-candidates/map-badge-1/parts/badge_dot.png, badge_dot_green.png (review: CRITIQUE_69 keep-list). crop normal_try1.png x106 y298 w44 h44 -> css 49,136,20,20. Anchor: badge top-right, overlapping the ring. 
- **badge_tag_percent** (CODE-DRAWN, base was NEEDS-ART): crop normal_try1.png x778 y503 w66 h44 -> css 356,230,30,20. Anchor: badge top-right. Base NEEDS-ART; painted is a plain red rounded tag with white text -50%. Red rounded rect, thin white-cream outline, white bold text.
- **badge_timer_ribbon** (CODE-DRAWN, base was EXISTS): crop normal_try1.png x706 y408 w138 h70 -> css 323,187,63,32. Anchor: badge bottom centre. Painted EVENT timer is the second line of a taller dark label (EVENT / 2D 4H), not a ribbon. Fallback: badge_ribbon_timer.png. 
- **road_kit_ch4** (NEEDS-ART): crop normal_try1.png x120 y430 w600 h1090 -> css 55,197,274,498. Anchor: pieces snap to the 70 px path grid. Painted road is a cream path with a thick plum cliff-brick rim, gold dashed centre line and a soft shadow on the clouds (not brass). Redo the ch4 kit in this look; earlier FIX verdicts (CRITIQUE_70) stay. Fallback: art-candidates/road-surface-kit-b2/ch4/road_ch4_<piece>.webp (FIX). 
- **road_kit_ch4_ice** (NEEDS-ART): crop locked_try1.png x270 y560 w400 h640 -> css 123,256,183,293. Anchor: same grid. 
- **road_glow_done** (CODE-DRAWN): crop normal_try1.png x235 y1380 w350 h160 -> css 108,631,160,73. Anchor: follows the path. Line + additive glow along the saved path points.
- **bg_sky_purple** (NEEDS-ART, base was CODE-DRAWN): crop normal_try1.png x0 y0 w852 h1846 -> css 0,0,390,844. Anchor: top-left, screen size. Painted sky is a deep purple night with soft violet clouds and small four-point sparkles; replaces the fog band. Boss state wants calmer clouds behind the rails (critic).
- **scenery_ch4_body** (NEEDS-ART): crop normal_try1.png x0 y420 w852 h1100 -> css 0,192,390,503. Anchor: scrolls with the map. Painted look: floating voxel islands with round and pine trees, neon cubes, plum brick plateaus. 
- **prop_arcade_cabinet** (NEEDS-ART): crop normal_try1.png x0 y880 w258 h385 -> css 0,402,118,176. Anchor: bottom-left of a floating island, cropped by the left screen edge. Check road_landmark_ch4_* first; none was confirmed to be this cabinet (landmark files not in this worktree). Fallback: art-candidates/road-art-4c/road_landmark_ch4_*.png (EXISTS, KEEP CRITIQUE_65). 
- **prop_neon_arch** (NEEDS-ART): crop normal_try1.png x520 y455 w175 h245 -> css 238,208,80,112. Anchor: bottom centre on a far island. Fallback: road_landmark_ch4_* (EXISTS). 
- **prop_star_tower** (NEEDS-ART): crop normal_try1.png x680 y872 w125 h190 -> css 311,399,57,87. Anchor: bottom centre on an island. 
- **prop_tree_set** (NEEDS-ART): crop normal_try1.png x265 y700 w120 h150 -> css 121,320,55,69. Anchor: bottom centre. 
- **prop_island_blocks** (NEEDS-ART): crop normal_try1.png x160 y540 w130 h100 -> css 73,247,59,46. Anchor: centre. 
- **prop_cloud_puffs** (NEEDS-ART): crop normal_try1.png x0 y1210 w360 h230 -> css 0,553,165,105. Anchor: centre. 
- **road_gate_closed_frost** (NEEDS-ART, base was EXISTS): crop locked_try1.png x255 y325 w370 h235 -> css 117,149,169,108. Anchor: bottom centre on the path centre line. Painted locked gate: dark iron double gate with snow caps and icicles, chains, golden padlock. Approved gate is warmer. Fallback: art-candidates/road-art-1/s1/road_gate_closed.webp + road_gate_open.webp (EXISTS KEEP CRITIQUE_36). 
- **road_gate_lock** (EXISTS): file art-candidates/road-art-1/s1/road_gate_lock.webp (review: CRITIQUE_36 keep-list). crop locked_try1.png x412 y410 w66 h72 -> css 188,188,30,33. Anchor: gate centre. 
- **gate_need_sign** (NEEDS-ART, base was EXISTS): crop locked_try1.png x352 y488 w195 h58 -> css 161,223,89,27. Anchor: below the padlock, centred. Nine-slice 1x l10 t8 r10 b8. Painted sign is a wooden plank with brass nails; base was the cream card. Fallback: kit3_panel_card.webp. 
- **chapter_popup_panel** (EXISTS): file src/assets/art/kit3_panel_popup.webp (+ kit3_panel_card, kit3_panel_well) (review: live game asset (level intro v3 popup)). crop chapter_try1.png x120 y730 w612 h640 -> css 55,334,280,293. Anchor: screen centre, y centre 52% (below the wallet). Nine-slice 1x l36 t36 r36 b36. 
- **chapter_ribbon_purple** (EXISTS): file src/assets/art/kit3_ribbon_purple.webp (review: ui kit v3 ribbon). crop chapter_try1.png x190 y668 w482 h112 -> css 87,306,221,51. Anchor: top centre, overlapping the panel top by 18 px. 
- **scenery_ch5_card** (NEEDS-SLICE, base was NEEDS-ART): crop chapter_try1.png x158 y792 w540 h236 -> css 72,362,247,108. Anchor: inside the popup frame, top. Base NEEDS-ART; the painted Music Attic scene is finished (piano, bell, violin, notes, window) with no baked text. Crop is inside the frame; stay 6 px inside the frame edge. Slice with tools/slice-sheet.mjs or any cropper; remove the background by hand (the painted page has no key), then run the art critic. If the cut is unclean, fall back to NEEDS-ART.
- **plaque_title_pill** (NEEDS-ART): crop chapter_try1.png x168 y1025 w516 h62 -> css 77,469,236,28. Anchor: popup centre, 6 px under the scene. Nine-slice 1x l20 t8 r20 b8. 
- **reward_card_slot** (CODE-DRAWN): crop chapter_try1.png x195 y1105 w142 h142 -> css 89,506,65,65. Anchor: centre. Nine-slice 1x l12 t12 r12 b12. Pale cream rounded rect with a thin tan border. Numbers live.
- **icon_coin_bolt** (NEEDS-SLICE): crop chapter_try1.png x218 y1118 w96 h96 -> css 100,512,44,44. Anchor: slot centre, 8 px up. Fallback: src/assets/art/icon_bolt.webp. Conflicts with the wallet hex-nut coin: one currency, one icon (owner decision). Slice with tools/slice-sheet.mjs or any cropper; remove the background by hand (the painted page has no key), then run the art critic. If the cut is unclean, fall back to NEEDS-ART.
- **fx_confetti** (CODE-DRAWN): crop chapter_try1.png x30 y800 w800 h600 -> css 14,366,366,275. Anchor: popup edges. 
- **fx_dim_overlay** (CODE-DRAWN): crop chapter_try1.png x0 y0 w853 h1844 -> css 0,0,390,844. Anchor: full screen. Dark violet rgba(20,10,50,0.55).

## Animation notes (per asset, durations in the manifest)

| asset | animation | ms | easing | detail |
|---|---|---|---|---|
| node_done_disc | popIn (pop) | 350 | Back.easeOut | scale 0 to 1.12 to 1, alpha 0 to 1 |
| node_done_disc | pressSquash (press) | 120 | Quad.easeOut | scale 0.94, then 1.06 overshoot, then 1 |
| node_done_disc | unlockPop (pop) | 350 | Back.easeOut | when it becomes done: pop, gold line draws to the next node; stars fly in 80 ms apart (starFlyIn 450 ms Cubic.easeOut) |
| star_pip | starFlyIn (pop) | 450 | Cubic.easeOut | staggered 80 ms |
| star_pip | twinkle (sparkle) | 1400 | Sine.easeInOut | scale 0.2 to 1 with 45 degree turn, alpha 0-1-0, staggered; cap 6 live |
| node_you_platform | popIn (pop) | 350 | Back.easeOut | scale 0 to 1.12 to 1, alpha 0 to 1 |
| node_you_platform | platformGlow (loop) | 1600 | Sine.easeInOut | rim glow pulse alpha 0.6 to 1; sparkles twinkle around it |
| node_locked_padlock | popIn (pop) | 350 | Back.easeOut | scale 0 to 1.12 to 1, alpha 0 to 1 |
| node_locked_padlock | lockedShake (wiggle) | 300 | Sine.easeInOut | x +-4 px, 3 swings on tap, toast pops in |
| node_boss_platform | popIn (pop) | 350 | Back.easeOut | scale 0 to 1.12 to 1, alpha 0 to 1 |
| node_boss_platform | bossGlow (loop) | 1400 | Sine.easeInOut | ember glow alpha 0.6 to 1 |
| node_boss_platform | pressSquash (press) | 120 | Quad.easeOut | scale 0.94, then 1.06 overshoot, then 1 |
| boss_junkzilla_intact | idleBreathe (loop) | 2200 | Sine.easeInOut | scaleY 1 to 1.03 yoyo |
| boss_junkzilla_intact | angryShake (wiggle) | 400 | Sine.easeInOut | x +-2 px every 5 s |
| fx_flame_cluster | flameLoop (loop) | 700 | Sine.easeInOut | scale 0.9-1.1, alpha flicker, 4-6 particles per cluster, cap 12 total |
| road_coin_trail | coinSpin (loop) | 900 | Linear | scaleX 1 to 0.2 to 1 |
| hero_cannon_4 | idleBob (loop) | 1800 | Sine.easeInOut | y +-2 px yoyo |
| hero_cannon_4 | arrivePop (pop) | 420 | Back.easeOut | drops 24 px onto the platform with squash 0.9 on landing |
| hero_cannon_4 | twinkle (sparkle) | 1400 | Sine.easeInOut | scale 0.2 to 1 with 45 degree turn, alpha 0-1-0, staggered; cap 6 live |
| you_tag | tagBob (loop) | 1500 | Sine.easeInOut | y -3 px yoyo |
| you_tag | popIn (pop) | 350 | Back.easeOut | scale 0 to 1.12 to 1, alpha 0 to 1 |
| hero_glow_ring_you | glowPulse (loop) | 1600 | Sine.easeInOut | alpha 0.5 to 1, scale 1 to 1.06 |
| hero_glow_ring_you | twinkle (sparkle) | 1400 | Sine.easeInOut | scale 0.2 to 1 with 45 degree turn, alpha 0-1-0, staggered; cap 6 live |
| bolt_idle | idleBreathe (loop) | 2400 | Sine.easeInOut | scaleY 1 to 1.03 |
| bolt_idle | blink (loop) | 160 | Linear | eyes closed 160 ms every 3-5 s |
| bolt_idle | waveHand (wiggle) | 800 | Sine.easeInOut | hand arc, every 5 s; if no wave frame, wiggle the whole sprite +-4 degrees |
| bolt_worried | idleBreathe (loop) | 2400 | Sine.easeInOut | scaleY 1 to 1.03 |
| bolt_worried | blink (loop) | 160 | Linear | eyes closed 160 ms every 3-5 s |
| bolt_worried | sweatDrop (loop) | 1200 | Quad.easeIn | drop slides 10 px and fades |
| bolt_point | idleBreathe (loop) | 2400 | Sine.easeInOut | scaleY 1 to 1.03 |
| bolt_point | blink (loop) | 160 | Linear | eyes closed 160 ms every 3-5 s |
| bolt_point | pointNudge (loop) | 1000 | Sine.easeInOut | x +3 px yoyo toward the gate |
| bolt_happy | idleBreathe (loop) | 2400 | Sine.easeInOut | scaleY 1 to 1.03 |
| bolt_happy | blink (loop) | 160 | Linear | eyes closed 160 ms every 3-5 s |
| bolt_happy | cheerHop (pop) | 520 | Sine.easeOut | up 14 px, land with Bounce.easeOut 260 ms; repeat 2x when the popup opens |
| prop_chest_shoulder | readyBounce (loop) | 900 | Sine.easeInOut | y -4 px yoyo + glow pulse; attentionWiggle every 6 s |
| prop_chest_shoulder | openPop (pop) | 420 | Back.easeOut | lid flips, starburst, coins burst out |
| wallet_pill_cream | countUp (loop) | 600 | Cubic.easeOut | number counts to the new value |
| wallet_pill_cream | pulse (pop) | 250 | Back.easeOut | scale 1.08 then 1 when it changes |
| icon_nut_coin | coinSpin (loop) | 900 | Linear | scaleX 1 to 0.2 to 1 on reward arrival |
| icon_nut_coin | twinkle (sparkle) | 1400 | Sine.easeInOut | scale 0.2 to 1 with 45 degree turn, alpha 0-1-0, staggered; cap 6 live |
| icon_gem | twinkle (sparkle) | 1400 | Sine.easeInOut | scale 0.2 to 1 with 45 degree turn, alpha 0-1-0, staggered; cap 6 live |
| settings_button | pressSquash (press) | 120 | Quad.easeOut | scale 0.94, then 1.06 overshoot, then 1 |
| settings_button | gearTurn (press) | 400 | Quad.easeOut | gear turns 60 degrees on tap |
| chapter_plate | popIn (pop) | 350 | Back.easeOut | scale 0 to 1.12 to 1, alpha 0 to 1 |
| chapter_plate | fillGrow (loop) | 600 | Cubic.easeOut | bar fill animates to the new value, glint at the tip |
| chapter_plate | chestReady (loop) | 900 | Sine.easeInOut | chest bounce 3 px + glow when 10/10 |
| chest_ring_frame | pressSquash (press) | 120 | Quad.easeOut | scale 0.94, then 1.06 overshoot, then 1 |
| chest_ring_frame | ringFill (loop) | 500 | Cubic.easeOut | segment arc fills |
| chest_ring_frame | readyBounce (loop) | 900 | Sine.easeInOut | chest bounce + glow |
| chest_ring_frame | attentionWiggle (wiggle) | 600 | Sine.easeInOut | rotation +-6 degrees x3, every 6 s while a reward is ready |
| play_button_green | pressSquash (press) | 120 | Quad.easeOut | scale 0.94, then 1.06 overshoot, then 1 |
| play_button_green | glintSweep (sparkle) | 700 | Quad.easeInOut | white diagonal band sweeps left to right, every 4 s |
| play_button_green | idleBreath (loop) | 2000 | Sine.easeInOut | scale 1 to 1.03 |
| play_button_green | popIn (pop) | 350 | Back.easeOut | scale 0 to 1.12 to 1, alpha 0 to 1 |
| play_button_red | pressSquash (press) | 120 | Quad.easeOut | scale 0.94, then 1.06 overshoot, then 1 |
| play_button_red | glintSweep (sparkle) | 700 | Quad.easeInOut | white diagonal band sweeps left to right, every 4 s |
| play_button_red | urgentPulse (loop) | 900 | Sine.easeInOut | scale 1 to 1.05, glow alpha pulse |
| nav_bar_frame | pressSquash (press) | 120 | Quad.easeOut | scale 0.94, then 1.06 overshoot, then 1 |
| nav_bar_frame | tabSwitch (pop) | 220 | Back.easeOut | gold tab slides to the new tab; icon pops 1.15 to 1 |
| nav_icon_road | selectPop (pop) | 220 | Back.easeOut | scale 1.15 to 1 when selected |
| nav_icon_road | pressSquash (press) | 120 | Quad.easeOut | scale 0.94, then 1.06 overshoot, then 1 |
| nav_icon_units | selectPop (pop) | 220 | Back.easeOut | scale 1.15 to 1 when selected |
| nav_icon_units | pressSquash (press) | 120 | Quad.easeOut | scale 0.94, then 1.06 overshoot, then 1 |
| nav_icon_machine | selectPop (pop) | 220 | Back.easeOut | scale 1.15 to 1 when selected |
| nav_icon_machine | pressSquash (press) | 120 | Quad.easeOut | scale 0.94, then 1.06 overshoot, then 1 |
| nav_icon_events | selectPop (pop) | 220 | Back.easeOut | scale 1.15 to 1 when selected |
| nav_icon_events | pressSquash (press) | 120 | Quad.easeOut | scale 0.94, then 1.06 overshoot, then 1 |
| badge_base_brass | popIn (pop) | 350 | Back.easeOut | scale 0 to 1.12 to 1, alpha 0 to 1 |
| badge_base_brass | floatBob (loop) | 2400 | Sine.easeInOut | y +-3 px yoyo, per-badge phase offset 0.4 s; paused when reduced-motion |
| badge_base_brass | attentionWiggle (wiggle) | 600 | Sine.easeInOut | rotation +-6 degrees x3, every 6 s while a reward is ready |
| badge_base_brass | glintSweep (sparkle) | 700 | Quad.easeInOut | white diagonal band sweeps left to right, every 4 s |
| badge_base_brass | pressSquash (press) | 120 | Quad.easeOut | scale 0.94, then 1.06 overshoot, then 1 |
| badge_glyph_daily | giftWobble (wiggle) | 600 | Sine.easeInOut | rotation +-8 degrees, every 6 s while ready |
| badge_glyph_collect | cannonKick (pop) | 300 | Back.easeOut | recoil 3 px, every 6 s while something is new |
| badge_glyph_events | tickShake (wiggle) | 500 | Sine.easeInOut | rotation +-5 degrees, every 6 s; every second when under 1 h |
| badge_glyph_offers | glintSweep (sparkle) | 700 | Quad.easeInOut | white diagonal band sweeps left to right, every 4 s |
| badge_glyph_offers | twinkle (sparkle) | 1400 | Sine.easeInOut | scale 0.2 to 1 with 45 degree turn, alpha 0-1-0, staggered; cap 6 live |
| badge_glyph_season | glintSweep (sparkle) | 700 | Quad.easeInOut | white diagonal band sweeps left to right, every 4 s |
| badge_count_chip | countUp (loop) | 600 | Cubic.easeOut | number counts up |
| badge_dot | dotPulse (loop) | 1000 | Sine.easeInOut | scale 1 to 1.2 yoyo |
| badge_tag_percent | tagPop (pop) | 300 | Back.easeOut | on appear |
| badge_tag_percent | attentionWiggle (wiggle) | 600 | Sine.easeInOut | rotation +-6 degrees x3, every 6 s while a reward is ready |
| badge_timer_ribbon | urgentPulse (loop) | 900 | Sine.easeInOut | text alpha when under 1 h |
| road_kit_ch4 | goldLineDraw (loop) | 600 | Cubic.easeOut | gold centre line lights up toward the next node after a win |
| road_kit_ch4_ice | iceGlint (sparkle) | 1800 | Sine.easeInOut | tiny glints travel along the surface, cap 4 live |
| road_glow_done | goldLineDraw (loop) | 600 | Cubic.easeOut | draws toward the next node after a win |
| bg_sky_purple | skyTwinkle (loop) | 1400 | Sine.easeInOut | sparkle stars, cap 8 live |
| bg_sky_purple | cloudDrift (loop) | 40000 | Linear | foreground cloud puffs drift 20 px; far layer 0.3x scroll |
| scenery_ch4_body | parallax (loop) | 0 | Linear | scroll 0.6x of the road |
| prop_arcade_cabinet | screenFlicker (loop) | 1800 | Sine.easeInOut | screen alpha 0.85-1 |
| prop_neon_arch | neonPulse (loop) | 1600 | Sine.easeInOut | dotted arch lights alpha 0.6-1 chase |
| prop_star_tower | starGlint (sparkle) | 1400 | Sine.easeInOut | star scale 1 to 1.15 with glint |
| prop_tree_set | treeSway (loop) | 3000 | Sine.easeInOut | rotation +-1.5 degrees from the base, per-tree phase |
| prop_island_blocks | islandFloat (loop) | 4000 | Sine.easeInOut | y +-3 px, per-piece phase |
| prop_cloud_puffs | cloudDrift (loop) | 40000 | Linear | x drift 20 px |
| road_gate_closed_frost | lockedShake (wiggle) | 300 | Sine.easeInOut | x +-4 px on tap |
| road_gate_closed_frost | gateOpen (pop) | 700 | Back.easeOut | doors swing 70 degrees, padlock falls and fades, sparkle burst |
| road_gate_lock | lockWiggle (wiggle) | 500 | Sine.easeInOut | rotation +-8 degrees every 5 s |
| road_gate_lock | lockFall (pop) | 500 | Quad.easeIn | falls 40 px, rotates 40 degrees, fades |
| gate_need_sign | popIn (pop) | 350 | Back.easeOut | scale 0 to 1.12 to 1, alpha 0 to 1 |
| gate_need_sign | signSwing (loop) | 2400 | Sine.easeInOut | rotation +-2 degrees from the top |
| chapter_popup_panel | popupIn (pop) | 350 | Back.easeOut | scale 0.8 to 1.04 to 1, backdrop dims 0 to 0.55 in 250 ms |
| chapter_popup_panel | popupOut (pop) | 200 | Quad.easeIn | scale 1 to 0.9, alpha to 0 |
| chapter_ribbon_purple | ribbonDrop (pop) | 400 | Back.easeOut | drops 16 px, 80 ms after the panel |
| scenery_ch5_card | sceneSparkle (sparkle) | 1400 | Sine.easeInOut | gold notes float up 12 px and fade |
| scenery_ch5_card | kenBurns (loop) | 8000 | Sine.easeInOut | slow zoom 1 to 1.04 |
| plaque_title_pill | popIn (pop) | 350 | Back.easeOut | scale 0 to 1.12 to 1, alpha 0 to 1 |
| reward_card_slot | rewardPop (pop) | 350 | Back.easeOut | popIn staggered 100 ms |
| reward_card_slot | twinkle (sparkle) | 1400 | Sine.easeInOut | scale 0.2 to 1 with 45 degree turn, alpha 0-1-0, staggered; cap 6 live |
| icon_coin_bolt | coinSpin (loop) | 900 | Linear | scaleX 1 to 0.2 to 1 on claim |
| icon_coin_bolt | twinkle (sparkle) | 1400 | Sine.easeInOut | scale 0.2 to 1 with 45 degree turn, alpha 0-1-0, staggered; cap 6 live |
| fx_confetti | confettiBurst (sparkle) | 1800 | Quad.easeOut | 24 paper strips (pink, yellow, blue) fall with rotation, then fade; cap 24 |
| fx_dim_overlay | dimIn (loop) | 250 | Quad.easeOut | alpha 0 to 0.55 |

Rules: pop 350 ms Back.easeOut; press 120 ms; badge float-bob 2.4 s with 0.4 s phase offsets; attention wiggle every 6 s; glint every 4 s; at most 6 twinkles, 24 confetti, 12 flame particles live; all gated by the uiJuice flag and reduced-motion; animations never pause the simulation.

## NEEDS-ART briefs

Each manifest entry with status NEEDS-ART carries a ready `brief`. Shape (the style reference is one of the painted images, always uploaded first in the SAME chat, then say "same artist and style as the first image"):

> STYLE REFERENCE: upload `art-candidates/mockups/road-map-painted-v2/normal_try1.png` first ... ASSET: <description> KEY: flat #FF00FF magenta background (or #00FF00 green if the art has pink or magenta: clouds, neon, red-purple), one sprite per cell, 6-10% padding, nothing within 3 px of the cell edge. NO baked text or numbers. STYLE LOCK: warm dark-brown outline (not black) 3-4% of sprite height, light from top-left, thin rim light bottom-right, soft contact shadow, 3-4 value steps, glossy toy-metal look like the accepted medallion/popup kit. KEY: one sprite per grid cell on flat #FF00FF magenta; if the art contains pink, magenta, red-purple or a pink glow use flat #00FF00 green instead; never a gradient or shadow on the key; no baked text or numbers; 6-10% padding inside the cell; nothing within 3 px of the cell edge. RANK CLARITY: states/tiers in one family must differ in at least two of silhouette, size, part count, accent colour, pips, and still read apart at 70 px in grayscale.

| id | style reference | key | what to paint |
|---|---|---|---|
| node_done_disc | normal_try1.png | #FF00FF magenta | one EMPTY flat oval level-node disc seen from slightly above: glossy emerald green top face, gold rim, dark-brown outline, small darker thickness band below, soft contact shadow. Face left plain for a live number. Also supply a "next" version with the face in warm cream-gold instead of green (same shape). No stars, no numbers. |
| node_you_platform | normal_try1.png | #FF00FF magenta | one EMPTY round gold hero platform, seen from slightly above: thick polished gold rim, warm cream-gold inner face, small darker thickness band, soft contact shadow, extra soft warm glow halo (halo may be separate PNG). Plus an ember variant: same shape, rim orange-red, face dark brown-red. |
| node_locked_padlock | normal_try1.png | #FF00FF magenta | one EMPTY locked level-node: a dark gunmetal oval disc with silver rim, a big chunky silver padlock (keyhole, shackle closed) standing on its back edge. Front of disc left plain for a live white numeral. Add a second variant with a cool icy blue-grey disc and a thin frost edge. Padlock must read at 70 px grayscale as a lock. |
| node_boss_platform | boss_try2.png | #FF00FF magenta | one EMPTY boss arena platform: wide oval, red-and-gold glossy rim with studs, dark inner disc for a live number, glowing orange-red ember edge, no boss on it. Add a small crowned/winged mini version (about 56 px) for the far chapter-end node. |
| wallet_pill_cream | normal_try1.png | #FF00FF magenta | one EMPTY wide wallet pill, cream glossy face, thick polished brass rim, dark-brown outline, round brass plus button socket on the right end (empty, no plus), soft contact shadow. Also a separate round brass plus button (28 px) with a cream plus. |
| chapter_plate | normal_try1.png | #FF00FF magenta | one EMPTY wide chapter plaque: cream glossy face, polished brass rim, two small brass screws at the top corners, soft contact shadow. Leave the middle bar area plain (progress bar is drawn live). Also a matching dark empty bar track with a glossy rim. |
| chest_ring_frame | normal_try1.png | #FF00FF magenta | one EMPTY round button frame: dark navy socket disc with a thin polished brass outer rim and a hollow centre (chest and the 4 green ring segments are placed live). Also one green ring-segment sprite (quarter arc) in lit and unlit versions. |
| play_button_green | normal_try1.png | #FF00FF magenta | one EMPTY wide PLAY pill, glossy emerald green face with a bright top highlight, thick polished gold rim, dark-brown outline, soft contact shadow. No text. Provide pressed (darker, 4 px lower) and disabled (desaturated grey-green) versions in the same cell layout. |
| play_button_red | boss_try2.png | #FF00FF magenta | same pill as the green one but glossy red-orange face; pressed and glow versions. |
| road_kit_ch4 | normal_try1.png | #FF00FF magenta | 12 road tile pieces (straight V, straight H, 4 curves, T x4, cross) for a top-down-tilted path: warm cream surface with a subtle paving texture, dashed gold centre line, thick plum-purple brick cliff rim on both sides with a darker inner edge and a soft drop shadow. Edge must meet at identical widths so pieces join seamlessly. |
| road_kit_ch4_ice | locked_try1.png | #FF00FF magenta | same 12 road pieces as the ch4 kit but frozen: blue-white ice surface with sparkle flecks, snow caps and a few small icicles on the plum rim. Must join the warm cream pieces at a straight cut (provide one transition piece cream-to-ice). |
| bg_sky_purple | normal_try1.png | #FF00FF magenta | one empty full-screen vertical sky plate 390x844: deep purple to violet gradient, big soft volumetric clouds mostly at the edges, a calm middle (the road crosses it), tiny glowing sparkle stars. No UI, no road, no text. |
| scenery_ch4_body | normal_try1.png | #FF00FF magenta | one tall scenery panel 390x1200, NO road in it (an empty winding gap in the middle): floating voxel islands with grass tops and plum brick sides, round and pine trees, neon pink and blue cubes, soft clouds between. Edges calm so the rails stay readable. |
| prop_arcade_cabinet | normal_try1.png | #FF00FF magenta | one tall retro arcade cabinet, 3/4 view, blue and red body, pink pixel space-invader on the upper screen, joystick and buttons, soft contact shadow. Whole cabinet, nothing cropped. |
| prop_neon_arch | normal_try1.png | #FF00FF magenta | one neon arcade arch gate: purple stone frame, pink dotted neon lights, pixel space-invader glowing inside, far-away softer look. |
| prop_star_tower | normal_try1.png | #FF00FF magenta | one small cosy purple stone pavilion with an arched doorway, gold trim, a big gold star on the roof. |
| prop_tree_set | normal_try1.png | #FF00FF magenta | a sheet of 6 trees in chunky voxel-toy style: 2 round bushy, 2 tall pines, 2 small round; plus the same 3 with white snow caps. |
| prop_island_blocks | normal_try1.png | #FF00FF magenta | six floating island pieces: green grass top, plum-brown brick sides, moss and tiny cube lights; plus 3 glowing neon cubes in pink and blue. |
| prop_cloud_puffs | normal_try1.png | #00FF00 green (clouds are pink-white) | five soft fluffy violet-white cloud puffs of different sizes with a lilac shadow side. |
| road_gate_closed_frost | locked_try1.png | #FF00FF magenta | one closed iron double gate with spiked top, snow caps on the posts, small icicles, a chain, golden padlock in the middle. Gate only, no sign, no road. Also an open version. |
| gate_need_sign | locked_try1.png | #FF00FF magenta | one EMPTY wooden plank sign: warm brown wood grain, four brass nails in the corners, dark outline, soft shadow. No text. |
| plaque_title_pill | chapter_try1.png | #FF00FF magenta | one EMPTY wide flat cream pill plaque with a brass rim and a screw at each end, soft shadow. No text. (May share the chapter_plate cell sheet.) |

Priority order for the build: (1) node_done_disc, node_you_platform, node_locked_padlock, node_boss_platform (the road cannot read without them), (2) play_button_green/red, chapter_plate, wallet_pill_cream, chest_ring_frame, (3) road_kit_ch4 + road_kit_ch4_ice, (4) scenery and props, (5) gate frost, sign. Everything marked NEEDS-SLICE and EXISTS needs no ChatGPT time.

## What changed against the base manifest

| base id | change | painted id | why |
|---|---|---|---|
| node_completed | CHANGED | node_done_disc | Painted node is a flat green oval disc with gold rim, number on top and 3 star pips under it. The live node_completed is a tall pedestal medallion with a white face and dark stars: different silhouette. |
| avatar_platform_normal | CHANGED | node_you_platform | Painted platform is a round gold plate with a bright rim, the number below the cannon on it. Boss state: same plate in darker ember tone with the number on a dark inner disc. |
| node_locked | CHANGED | node_locked_padlock | Painted locked node: dark steel disc with a silver padlock standing on it, number on the disc under the padlock (white numeral). Live node_locked is a mauve ring with a small gold padlock hanging at the bottom. |
| node_boss | CHANGED | node_boss_platform | Painted boss node is a wide red-gold arena platform with a dark inner disc holding the number; the boss stands on it. Live node_boss is a round medallion. |
| bolt_idle | CHANGED | bolt_idle | Normal state paints Bolt waving with one raised hand. |
| road_chest_gold | CHANGED | prop_chest_shoulder | Painted shoulder chest is the red/gold star chest (same as the plate and ring chest), not the wood/iron/gold road chests. |
| wallet_pill | CHANGED | wallet_pill_cream | Painted wallet pills are cream with a thick brass rim and a round brass plus button; live wallet uses the dark kit3 well. |
| icon_settings_gear | CHANGED | settings_button | Base NEEDS-ART icon only; the painted page gives the finished round button, so it can be sliced. |
| chapter_plate | CHANGED | chapter_plate | Painted plate is a cream plaque with brass rim and two corner screws, 236x78: taller and narrower than the base 358x56. Chapter title is live text. |
| chapter_chip | CHANGED | chest_ring_frame | Painted: a dark round socket with a 4-segment green ring (segments fill with progress) around the red chest, beside the PLAY pill. |
| play_button | CHANGED | play_button_green | Painted PLAY pill is a glossy green pill with a thick gold rim and sparkles; live btn_green is a flat green pill with a cream rim and rivets. |
| play_button | CHANGED | play_button_red | Boss state: FIGHT BOSS red-orange pill, same gold rim. |
| badge_base_brass | CHANGED | badge_base_brass | All six painted badges use ONE brass ring with a warm cream-brown face; copper and teal bases are not visible in v2 (still approved, unused). |
| badge_glyph_album | CHANGED | badge_glyph_collect | Painted third left badge is COLLECT with a red toy cannon, not the album glyph. |
| badge_glyph_events | CHANGED | badge_glyph_events | Painted EVENT glyph is a silver stopwatch; base glyph was NEEDS-ART FIX. |
| badge_glyph_offers | CHANGED | badge_glyph_offers | Painted OFFERS glyph is a blue gem (critic CRITIQUE_69 asked for coin or price tag instead of a crate). |
| badge_ribbon_count | CHANGED | badge_count_chip | Painted count (2/5, 7/30) is a small dark chip inside the lower face of the badge, not a ribbon. |
| badge_tag_percent | CHANGED | badge_tag_percent | Base NEEDS-ART; painted is a plain red rounded tag with white text -50%. |
| badge_ribbon_timer | CHANGED | badge_timer_ribbon | Painted EVENT timer is the second line of a taller dark label (EVENT / 2D 4H), not a ribbon. |
| road_kit_ch4 | CHANGED | road_kit_ch4 | Painted road is a cream path with a thick plum cliff-brick rim, gold dashed centre line and a soft shadow on the clouds (not brass). Redo the ch4 kit in this look; earlier FIX verdicts (CRITIQUE_70) stay. |
| skyline_clouds_fog | CHANGED | bg_sky_purple | Painted sky is a deep purple night with soft violet clouds and small four-point sparkles; replaces the fog band. |
| scenery_ch4_body | CHANGED | scenery_ch4_body | Painted look: floating voxel islands with round and pine trees, neon cubes, plum brick plateaus. |
| road_gate_closed | CHANGED | road_gate_closed_frost | Painted locked gate: dark iron double gate with snow caps and icicles, chains, golden padlock. Approved gate is warmer. |
| gate_need_plate | CHANGED | gate_need_sign | Painted sign is a wooden plank with brass nails; base was the cream card. |
| scenery_ch5_card | CHANGED | scenery_ch5_card | Base NEEDS-ART; the painted Music Attic scene is finished (piano, bell, violin, notes, window) with no baked text. |

NEW (not in the base): fx_flame_cluster, road_coin_trail, you_tag, icon_nut_coin, icon_gem, nav_icon_road, nav_icon_units, nav_icon_machine, nav_icon_events, road_kit_ch4_ice, road_glow_done, prop_arcade_cabinet, prop_neon_arch, prop_star_tower, prop_tree_set, prop_island_blocks, prop_cloud_puffs, plaque_title_pill, reward_card_slot, icon_coin_bolt, fx_confetti, fx_dim_overlay.

NOT-SHOWN in the paint (kept unchanged in the manifest): node_locked_cool, node_boss_locked_cool, ribbon_hard, ribbon_mega, avatar_platform_boss, road_kit_ch5_teaser, road_kit_ch1, road_kit_ch2, road_kit_ch3, road_kit_ch6, road_kit_ch7, road_kit_ch8, scenery_ch4_gate, scenery_ch4_entrance, scenery_ch5_gate, scenery_ch5_entrance, road_landmark_ch4_a_1, road_landmark_ch4_a_2, road_landmark_ch4_a_3, road_landmark_ch4_a_4, road_landmark_ch4_a_5, road_landmark_ch4_a_6, road_landmark_ch4_b_1, road_landmark_ch4_b_3, road_landmark_ch4_b_5, road_landmark_ch4_c_1, road_landmark_ch4_c_2, road_landmark_ch4_c_3, road_landmark_ch4_c_4, road_landmark_ch4_c_5, road_landmark_ch4_b_2, road_landmark_ch4_b_4, road_landmark_ch4_b_6, road_landmark_ch4_c_6, road_gate_open, banner_next, road_chest_wood, road_chest_iron, back_to_me_pill, locked_toast_and_tooltip, badge_base_brass_ready, badge_base_copper, badge_base_copper_ready, badge_base_teal, badge_base_teal_ready, badge_new_lock, badge_count_bubble, bolt_peek_side.

SUPERSEDED (kept as fallback): node_completed, node_locked, node_boss, avatar_platform_normal, skyline_clouds_fog, road_gate_closed, gate_need_plate, banner_entry, road_chest_gold, wallet_pill, icon_settings_gear, play_button, chapter_chip, nav_bar, chapter_panel, badge_glyph_album, badge_ribbon_timer, badge_ribbon_count.

## Known paint defects and decisions for the Implementer

- Normal: node 33 has 3 stars painted; it is the next level, show none. Done count (3 done nodes) disagrees with the plate 2/10: live data wins.
- Boss: YOU tag painted below the node; always put it above (states 1 and 4). Node 39 numeral is dark on dark; live numeral is cream. boss_try2 has another aspect (0.526).
- Chapter: QUESTS, EVENT, SEASON chips are broken in the paint; draw them live as in the normal state. Nodes 41-44 show 3 stars at 0/10: draw none. The nav is wider in the paint than in the other states: use the same live nav.
- Locked: wallet at 17 px and nav at 8 px from the edge: use safe-area insets. Plate text: CH 4 in the paint for level 41; chapter mock puts level 41 in CH 5, set the live plate to CH 5 (open owner/critic decision).
- Safe areas (CRITIQUE_85): wallet top needs 47-59 px, nav bottom 34 px.
- Currency icon conflict: wallet hex nut vs reward coin with a lightning bolt vs live icon_bolt. Needs one owner decision before slicing icon_nut_coin / icon_coin_bolt.
- Pixel positions are eyeball measurements from the paint at about +-6 px; crop boxes are rounded to clean the art, re-check each crop before cutting.
- Not verified: the base EXISTS files under art-candidates/ (road-art-*, map-badge-1, batch-at) are on sibling branches and are not in this worktree; their paths come from the base manifest. src/assets/art files were opened; the candidate files were not.
