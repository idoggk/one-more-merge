# Top-games teardown: how the best games in our field look

Task t-e7e907b8, committed 2026-10-11 (mission m-b6e8ac1d). Input to `ART_BIBLE.md`.

## Summary

1. We have about 460 art files but no shared visual system: buttons, bars, panels and popups don't follow one kit, and the feel layer (feedback on every action) is thin.
2. Every top game studied wins on the same four things: one rigid style, a chunky button/panel kit, layered feedback on every action, choreographed rewards.
3. Home screen should be a showcase (our machine/board) + one huge Play button + crate row with timers + thin daily strip + bottom nav of 4-5 tabs.
4. The biggest wins per effort need no new art: button squish, hit flash + squash, count-up and fly-to-pill currency, popup easing, escalating chain counter, polished bars.
5. The asset taxonomy (16 top categories A-P, Part 4) gives the Asset Hub, ChatGPT briefs and wiring tasks shared names.

## Honesty and caveats

- Web search was thin and no screenshots were seen. Five pages were actually read (Clash Royale UX breakdown, Royal Match design article, Brawl Stars critique, Merge Mansion art pipeline, Travel Town deconstruction). The rest is general knowledge.
- Confidence labels: **READ** = fetched and read this task; **KNOWN** = general knowledge, not verified now; **INFER** = reasoned from the above.
- ms/px numbers are starting values to tune by eye on a phone.
- The gap list (Part 3) comes from file names only; the game was not run. Confirm by eye (see AUDIT.md, which did read code).

## Part 0 - Sources (READ)

- **Clash Royale**: bottom nav of 5 icons (Social, Battle, Shop, Cards, Events); key elements in the lower 50% of the screen; yellow = primary, green = secondary (buy/upgrade), red = notification, blue = calm background; popups are not full-screen and tap-outside closes; max one UI level deep; shop max 6 items; chests have slow/fast open modes and a predefined order; damaged units brighten; full elixir bar glows; cards have radial progress; screen edges blink red in overtime.
- **Royal Match**: home has two actions (decorate/upgrade, or play); UI auto-moves new players to the right page; currencies fly from source to container; stars fly to tasks; completed tasks animate away; the King mascot gets nervous when you are close to losing.
- **Brawl Stars**: big bold yellow Play; selected brawler shown; event-themed art and UI; too many buttons can overwhelm new users.
- **Merge Mansion**: items modelled in Blender with minimal 2D paint; must fill the grid square and stay identifiable.
- **Travel Town**: 4 orders at once (3 coin, 1 toolbox); chests, gift boxes, milestones, album cards; event boards with their own chains and energy; UI judged behind Merge Mansion.

## Part 1 - Per game (home / style / UI kit / juice / categories / lesson)

### Rush Royale and merge tower defence (KNOWN / INFER)
- Home: bottom tabs, big battle button, deck preview, chest slots.
- Style: bright 2D cartoon, thick dark outline, saturated.
- UI kit: gradient pill buttons with lip, rarity-bordered cards, cost badge.
- Juice: merge flash + pop, rank pips, damage numbers, tracers, boss warning, pitch rising with level.
- Categories: ~60-100 unit sprites, ~20 enemies/bosses, ~40 VFX, 5-6 rarity frames, 5-6 chest tiers, 5-8 currency icons, ~60 UI pieces.
- Lesson: show the deck as well as the board; rank pips + rarity frame so tier reads without text.

### Merge Mansion, Merge Dragons, Travel Town (READ for Mansion/Town art and board, KNOWN for the rest)
- Home: the board IS the home; orders above, currency top, bottom bar.
- Style: soft pseudo-3D, warm top-left light, rich materials (Merge Dragons is painterly 2D).
- UI kit: warm glossy panels, green primary, ribbon headers, energy bar with timer.
- Juice: bounce + sparkle on merge, glow-ring pop, chests open with sparkles and items fly to the board.
- Categories: hundreds of items, generators, chests, characters, ~100 UI pieces.
- Lesson: one render language, same light and same cell fill for all items.

### Royal Match, Candy Crush, Homescapes (READ for Royal Match, KNOWN for the rest)
- Home: tab bar of 5, lives/coins/stars on top, huge Play with level number, side event buttons.
- Style: glossy 3D-render look, fat rounded shapes, saturated, thick coloured text outlines.
- UI kit: chunky gradient buttons with lip + gloss (green go, blue secondary, red close); layered panels with inset well and ribbon header; segmented bars with star milestones; bouncing popups with a shine behind the reward.
- Juice: each booster (propeller, bomb, disco ball, rocket) has its own full-screen choreography with slow-down and shake; counters count up; win sequence staged with buttons last.
- Categories: ~100-200 UI, ~40 piece sprites x 15 states, ~300 VFX frames, ~100 sounds.
- Lesson: our tools (Row Surge, Gear Bomb) need dedicated choreography.

### Plants vs Zombies 2, Bloons TD 6, Kingdom Rush (KNOWN / INFER)
- Home: the map is the home (low value for us).
- Style: PvZ2 vector cartoon with thick outlines; BTD6 glossy 3D look; Kingdom Rush hand-painted with strong outlines.
- UI kit: Kingdom Rush wood-and-metal panels; BTD6 bold yellow-orange buttons.
- Juice: towers recoil with an attack animation matched to the projectile; short coloured impact + sound; coin pickups; upgrade flash; PvZ2 idle sway; wave banner + horn.
- Lesson: every unit needs idle + attack + hit states; every projectile needs launch, travel, impact.

### Archero, Brawl Stars, Clash Royale (READ for BS/CR, KNOWN for Archero)
- Style: thick bold outlines, blue for calm UI, gold for primary, heavy rounded white lettering with dark outline + drop shadow.
- Juice: chests shake, flash, then cards fly out one by one by rarity with rising sound; level-up ribbon + particle rain.
- Categories: ~150-250 UI pieces, chest tiers x 3 states, rarity card frames, emotes.
- Lesson: fixed colour roles, thumb-reachable nav, non-fullscreen popups.

### Vampire Survivors-style feedback (KNOWN)
- Flash, damage numbers (coloured by type, crit larger), knockback, death burst, coin magnet, pooling. References: "Juice it or lose it" (2012) and Vlambeer's "art of screenshake".
- Clones struggle with shake overload: add an **effect budget** (cap numbers per frame) and keep shake optional.

### Screw Jam, Pin Pull (READ store listings, low detail; rest KNOWN)
- Style: wooden themes, colourful screws/pins/animals, some 3D, hundreds of levels; chunky glossy 3D look, slotted screw heads, wood grain, washers, soft shadows, warm light background.
- Juice: limited tray slots as pressure, boxes fill then leave with a pop, boosters (extra slot, hammer, shuffle). Screw spirals out with a click, snaps into the box with a bounce; a full box shakes + flashes + flies away or becomes a gift; combo counter; freed plates clatter.
- Categories: ~10 screw colours x 3 states, ~20 plate shapes, textures, boxes, boosters.
- Lesson: glossy, consistently lit materials beat flat shapes; a finished box needs a clear completion moment.

## Part 2 - The 12 premium patterns (ranked by impact per effort; C = code only, A = needs art)

1. **Tactile buttons (C)**: squash 0.95 in ~70 ms, lip drops, release overshoot, primary breathes + shine sweep.
2. **Layered hit feedback (C)**: white flash 60-90 ms, squash, knockback, number rises 40-60 px with jitter, 4-8 sparks.
3. **Currency choreography (C)**: icon overlaps pill, count-up 400-600 ms, coins fly staggered, pill bounces.
4. **Strict colour roles (C)**: yellow primary, green secondary, red danger/notification, calm blue background.
5. **Popups with easing (C)**: dim 60%, scale 0.8 to 1 back-out 220-280 ms, 150 ms exit, non-fullscreen, tap-outside closes.
6. **Escalating chain / merge effect (C)**: pull-in, flash, 0-1.3-1.0 pop, ring + sparkles, pitch up per step, counter white to yellow to orange to red, banners at x5 / x10.
7. **One chunky display font (C+A)** with coloured outline + hard shadow + tabular digits.
8. **Real 9-slice UI kit (A)**: gradient + lip + gloss + inset well + ribbon header, one corner radius.
9. **Premium bars (C)**: rounded caps, gloss, shine sweep, lag bar, colour shift below 30%, pulse below 20%, ticks and star milestones.
10. **Choreographed rewards (C+A)**: crate shake 600-900 ms, flash, items 250-400 ms apart in rarity colour, skippable, win buttons LAST.
11. **Unit readability and life (A+C)**: dark outline, rim light, shadow ellipse, idle breath 1-2%, tier changes silhouette + colour, attack/hit poses.
12. **Background depth and ambience (A+C)**: vignette, floating specks, parallax, light shafts, reactive mascot, event-themed skins.

**Avoid**: flat rectangles, mixed corner radii, pure-black outlines, instant popups, mixed icon styles, shake on everything, identical sounds, jumping numbers, blurry scaled sprites, long unskippable celebrations, too many equal-weight home buttons.

## Part 3 - Our gaps (from file names only; confirm by eye, AUDIT.md has the code-based view)

| Area | Gap |
|---|---|
| UI kit | Only ~12 `ui_*` pieces; no shared button/bar/toggle/slider set (norm is 60-250). |
| Buttons | No state art; press feel is code only. |
| Bars | Procedural; no gloss/shine/lag/ticks standard. |
| Currency | Few icons (bolt, icon_scrap); no coin/gem/ticket set; no fly-to-pill. |
| Popups/menus | Built per module; no shared frame + ribbon. |
| Home | Tab-based; no showcase hero, single huge Play, crate row with timers, or daily strip. |
| Units | 39 units; the 22 newer ones are placeholder glyph tiles; rank shown mostly by number; need silhouette/colour per tier + idle/attack frames. |
| Shooting | One muzzle/impact/spark/arc sprite; no per-family projectile sets or recoil standard. |
| Merge/cascade | `banner_chain` + flash only; sandwich merge "just happens" (owner). |
| Crates | Owner says art is bad: tiny bag in a big empty panel. |
| Screw Yard | "Looks like a child made it"; finished box vanishes. |
| Tools | New (Row Surge, Gear Bomb); need choreography. |
| Backgrounds | `bg`, `bg_corner`, `bg_practice`, stage x3; no depth layers / vignette / ambience. |
| Audio | `audio.ts` + `unitSounds.ts` exist; pitch ladder / variants unverified. |
| Fonts | One display font (Lilita One); strokes not uniform. |
| Tutorial/notifications | Coach + `ui_coach`; no badge/toast kit. |

## Part 4 - Asset taxonomy (16 categories A-P)

Naming: `<category>_<subcategory>_<name>[_<state>|_<rank>]`, lowercase. States: idle, press, disabled, hit, attack, dead, locked, glow. Ranks: `_1` to `_8`. (The Art Bible's naming rules adapt this to existing keys; existing keys are never renamed.)

- **A UNITS (`unit_`)**
  - A1 shooters (cannon, nail gun, rocket, mortar, saw blade): rank sprite, idle, attack frame, silhouette sheet.
  - A2 relays / coils (coil, arc welder, fuse box, magnet): ranks, charge glow, link line.
  - A3 support (bell, battery, amplifier, horn, signal beacon, fan, dice): ranks, aura ring per type.
  - A4 movers / special (gear, jackhammer, wrench tools).
  - A5 common: rank pips, rarity/family frame, shadow ellipse, glyph tile for units without art, worker characters, `unit_card_<family>`.
- **B ENEMIES / BOSSES (`foe_`, `boss_`)**: B1 regular targets (intact/damaged/critical, idle, hit-flash mask, death burst); B2 mini-bosses/bosses (intact/cracked/critical exist; intro portrait, warning banner, weak-point marker, death sequence, trophy); B3 boss UI (HP bar frame, phase pips, armor/shield overlay; `bfx_armor`/`bfx_crack` exist).
- **C BOARD / CELLS (`board_`)**: cell (empty/hover/valid drop/invalid/locked), grid frame, ENLARGED drop-zone halo, board shadow, machine casing, lane/road tiles, spawn gate, goal line.
- **D PROJECTILES / IMPACTS (`proj_`, `hit_`)**: D1 per-family launch flash, travel sprite, trail, impact (~6 families x 4); D2 generic hits (spark, puff, ring, crack, smoke, arc, fire, damage-number glyphs normal/crit/heal); D3 status effects (slow, burn, shock, mark).
- **E MERGE / CASCADE (`fx_merge_`)**: pull-in streaks, merge flash, ring, sparkles by rank tier, chain counter frame per-step colour, chain banners x5/x10/x20, sandwich preview line + impact, cascade link beams, rank-up glow.
- **F POWER TOOLS (`tool_`)**: Row Surge, Gear Bomb (+ future): board token idle/armed, icon, anticipation, full-screen effect, combo-pair effects, aftermath scorch decal, tool tray slot.
- **G UI KIT (`ui_`)**: G1 buttons (primary, secondary, danger, icon, tab, pill, close; idle/press/disabled); G2 panels (standard, popup, card, inset well, header ribbon, tooltip bubble; 9-slice); G3 bars (HP, XP, energy, timer, segmented/milestone, gloss + shine overlay); G4 popups/toasts (dim backdrop, reward popup, confirm, toast, notification badge); G5 tabs/nav (bottom nav bar, 5 tab icons with active state, highlight pill); G6 toggles, sliders, checkbox, scroll bar, stepper; G7 currency (coin/scrap, bolt/energy, gem, star, ticket/key, pill frame, count-up numerals); G8 badges (rarity, NEW, lock, cap, level, rank, family, copy count); G9 icons (~60 in one style and outline weight: settings, sound, music, shake, QA, home, units, road, events, machine, crate, daily, pause, retry, speed, hint, back, close, info, lock, check, star, trophy, flag); G10 fonts (display, body, numeral) + text presets (title, button, number pop, crit pop, chain).
- **H MENUS (`menu_`)**: H1 home (hero showcase frame, big Play, crate row, daily strip, event buttons, nav); H2 road/map (nodes normal/boss/locked/current/stars, path, chapter header); H3 units/roster (grid, card, detail, upgrade, team slots); H4 machine tab; H5 events tab; H6 crates shop; H7 settings; H8 pause; H9 QA panel (functional skin, low priority).
- **I BACKGROUNDS (`bg_`)**: per-chapter backdrop, mid layer, foreground vignette, floating specks, light shafts, menu bg, practice and Screw Yard bgs, seasonal/event skins.
- **J CRATES / REWARDS (`crate_`, `reward_`)**: J1 crates by tier (closed, shaking, lid-open, glow burst, empty); J2 opening stage (rarity beams, item tile frames by rarity, odds row, skip button); J3 rewards (unit card reveal, copy progress bar, duplicate-to-currency, gift box, booster icons, fly-to-pill trail).
- **K SCREW YARD (`yard_`)**: screws (colour x seated/lifting/flying), plates by material (wood/metal/plastic), holes and washers, trays/boxes (empty/filling/full/leaving), completion burst + reward, booster tools, timer/move counter, goal strip, level tiles, backdrop.
- **L LEVEL-UP / RESULTS (`result_`)**: victory/defeat banners, star set (empty/pop/full), stat rows, score count-up, reward row, next/retry buttons, level-up banner, new-unit unlock card, trophy shelf, milestone ribbon.
- **M TUTORIAL (`coach_`)**: hand pointer, coach bubble, spotlight mask, arrows, NEXT preview strip, hint glow on valid merges.
- **N NOTIFICATIONS (`notif_`)**: red dot, count badge, toast, banner strip, "ready" glow for a claimable crate, timer chip.
- **O AUDIO (`sfx_`, `mus_`)**: UI tap/press/back/popup open-close/error; merge pitch ladder x8 + sandwich; fire per family x3 variants; hit/kill; coin pickup; crate shake/open/reveal by rarity; boss warning/defeat; win/lose; music loops menu/battle/boss.
- **P MOTION PRESETS (code)**: press, pop_in, pop_out, shake, breathe, shine_sweep, count_up, fly_to_pill, hit_flash, squash, slowmo, hit_stop in one module.

## Suggested build order (from the teardown)

1. Motion presets + button/bar/popup/currency in code (patterns 1-6 and 9; no art).
2. UI kit art G1-G8 in one ChatGPT batch in the "Create Tray Asset" chat style, plus the font decision.
3. Crates (J) and Screw Yard (K), which the owner called bad.
4. Per-family projectile/impact sets (D) and unit idle/attack frames (A).
5. Home showcase (H1) and backgrounds (I).
6. Audio pitch ladder (O).

Follow-up: a short visual audit of the live build (screenshots of home, crate, Screw Yard, results) before briefing artists; a source pass with working image access (Rush Royale, Royal Match, Clash Royale home screens) would raise confidence on style claims.
