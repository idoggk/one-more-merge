# Screen mockups, style A (toy enamel)

Candidates only. **Nothing here is wired into the game** (`src/` is untouched). Project rule: the owner agrees the look first, then the screens are built in Phaser.

Open `index.html` (one offline file, 1.9 MB, no network, Lilita One and all pictures embedded). It lists every screen in a 390x844 phone frame with light CSS animation.

- `index.html?screen=<id>` shows one screen alone at exactly 390x844.
- `index.html?screen=win&t=1500` freezes every animation at 1.5 s (this is how the frames below were captured, so they are repeatable).
- The animated screens (win, lose, crate opening, reward) have a **replay** button and restart when scrolled into view. Tapping a nav tab in the review page jumps to that screen.

## What is in it

| id | Screen | Notes |
|---|---|---|
| `home-a1` | Home, variant A1 | your live board tilted on a workbench (real units standing up on a 3D-tilted plane), a mid-chain link animation, merge ring, best rank and best chain plaques |
| `home-a2` | Home, variant A2 | your layered hero machine (real `hm_*` + `hero_chassis` art) on the workshop pedestal, squad row (deck preview) beneath |
| `road` | Level road | cream road with gold travelled stretch, done nodes with earned stars, pulsing current node with YOU marker, locked nodes, HARD tag, chapter medal bar, sticky play card |
| `units` | Units tab | rarity-framed cards (common, rare, epic, legendary with glint), rank pips, copies bar, NEW tag, upgrade arrow, locked silhouettes, role badges |
| `machine` | Machine tab | machine showcase, finish picker (locks, gem prices), shooter and helper mounts, Play |
| `crates` | Crates | the four tiers: Tool Bag, Toolbox, Tool Chest, Golden Workbench, with owned count or timer, odds line, one action each; free-crate timer and pity bar |
| `prelevel` | Pre-level card | machines in the level with the goal machine flagged, the goal in plain words, three star goals, GOOD HERE tip, Jumpstart Kit toggle, reward hints, big Play |
| `hud` | In-level HUD | pause, level plate, clock, stage with monster, star chase chip, chain counter, damage numbers, HP bar with lag trail, 5x6 board, merge ring, charged mark, links, dragged part with merge preview, Next / capsule / Scrap tray |
| `win` | Level win | panel pops, ribbon drops, 3 stars pop 220 ms apart with sparkle rings, confetti (36 pieces), time and rewards count up, bolts fly to the pill (the pill counts up and bumps), buttons last |
| `lose` | Level lose | calm: board drains to 40% colour, no shake, no red flash, "SO CLOSE!", how close you were, one tip, small consolation reward, ONE MORE! primary |
| `crate-open` | Crate opening | anticipation shake with growing glow, white flash and light burst, 12 part tiles revealed 280 ms apart (rarer = later and bigger), summary chips, buttons last |
| `reward` | Reward popup | new-unit reveal with rotating shine, 0 to 1.3 to 1.0 pop, rarity chip, job line, Claim last |
| `settings` | Settings | ribbon section headers, toggles, slider, segmented off/soft/full, role-coloured icon tiles |
| `kit-1`, `kit-2`, `kit-3` | UI kit specimen | buttons (6 roles, 4 sizes, pressed, disabled with reason, round icon buttons), pills, 4 bar variants, stars, rarity chips, badges, chain ladder, damage numbers, panel anatomy, ribbons, list rows, nav tab states, type |

Previews are in `shots/` (390 px wide): one PNG per screen, `_contact-sheet.png` with all 16, and animation frames `win@700 / 1500 / 2600 / 3600`, `lose@500 / 2000 / 3200`, `crate-open@400 / 1100 / 1300 / 2600 / 5400`, `reward@300 / 1800`, plus `_strip-<id>.png` with the frames side by side.

## What is real art and what is code

Real pictures from `src/assets/art` (converted and embedded): all unit art (`cannon_*`, `coil_*`, `bell_*`, `battery_*`, `fan_*`, `rocket_*`, `mortar_*`, `arc_welder_*`, `horn_*`, `magnet_*`, `saw_blade_*`, `unit_tesla_tower`, `unit_wrench`, `unit_crane`...), the four crates (`crate_bag`, `crate_toolbox`, `crate_chest`, `crate_workbench`), the layered home machine (`hm_*`, `hero_chassis_*`), monsters (`mon_*`), `victory` and `defeat` mascots, map nodes, workshop and stage backgrounds, `slot`, rank dice, currency icons, pause and timer, crown, medal, `booster_*`, `role_*`. Everything else (buttons, panels, ribbons, bars, pills, stars, toggles, nav, chips) is CSS/SVG built to the Art Bible UI kit, so the owner is approving a **kit spec**, not final art. When approved, the kit becomes the S1 baked textures.

## Palette used (hex)

Neutrals: ink `#2b1d2e` (outlines, dark plates; the only near-black), ink hi `#4a3552`, ink lo `#1b1220`, cream `#fbe7c6`, cream hi `#fff6e0`, cream well `#e0c0a0`, text on cream `#5a3a2a` / `#8a6a52`, brass `#ffe7a0 / #e0a040 / #c08020 / #a06020`, brass ink `#5e3512`, bench wood `#c08040 / #a06020 / #804020`.

Roles (face top-left, face bottom-right, lip, outline):
- primary `#ffe36a #ffc61f #e0a020 #7a4a10`
- go `#62e083 #36b95f #20a060 #14553a`
- info `#70c3ff #3a94f0 #2080e0 #144a8a`
- danger `#ff7e58 #f23a1c #c0301a #6a1810`
- neutral `#c3cbd2 #98a3ad #7a848e #4a525a`
- premium `#b890ff #8a54f2 #7a43e0 #3e2380`
- cream icon button `#fff6da #f1d398 #d3aa66 #8a5a22` (added, not in the Bible)

Rarity: common `#8a9aa8`, rare `#3a8adf`, epic `#9a63ff`, legendary `#f0b020`. Marks: charged `#9be05a`, boss `#ff684a`, power `#ff4fd8`, MAX `#ffcf33`. Chain ladder `#ffffff / #ffe14a / #ff9a1a / #ff4020`. Damage numbers `#ffffff / #ffd84a / #ff8a1a / #9be05a`. HP bar `#3cc65f / #ffbf1f / #f23a1c`. Chapter strip teal (Laundry) `#5fc8bd #2f9a90 #14504a` (more saturated than the game's current `#458f87`).

One light direction everywhere (top-left), one radius family (9 / 13 / 19 CSS px, pills half height), every outline is a darker tint of its own colour.

## Recommendation

**Home: choose A2 (hero machine on a pedestal).**
1. One focal point. A1 puts a busy 16-unit board right above the huge Play button, so two things compete; A2 has one hero object, one Play, one crate row.
2. The machine is the player's identity and progress (tier, finish, mounts), so it gives a reason to open the Machine tab and a place to sell finishes. A1 repeats what the HUD already shows.
3. The squad row is the Bible's deck preview and reads rarity and rank without text.
4. A2 is cheaper: it reuses the existing layered machine art and has no 3D board. A1 needs 3D CSS now and a custom tilted-plane render in Phaser later.
A1's honest strength: it shows "this is a merge game" to a first-time viewer. If the owner wants that, take A2 and move the live-chain loop into the Play card or the title screen.

**Nav: 5 tabs, Home in the middle** (Machine, Units, Home, Crates, Events). The Level road is a sub-page opened from the chapter strip (Bible 8), so it has a back arrow and a sticky play card instead of the nav. This differs from today's 4 tabs (road, units, machine, events) and needs an owner decision.

## Decisions I made that you may want to change

- Bible sizes are on a 720-px canvas; this page is 390 CSS px wide. I scaled by 0.54. Main buttons, tabs and cards are 44 px or more. Small buttons (38 px) and the settings controls (toggle 32, segmented 34, small buttons 34) are below the 44 px phone guideline, so their hit area must be padded when built (Bible 11 allows this). Nothing is under 12 CSS px (22 design px).
- Body font: Nunito is **not** bundled in the repo and I did not add dependencies, so all text is Lilita One. Long copy (tips, job lines) at 12.5-15 px reads heavy; the Bible's body font would help.
- Play is yellow everywhere (Bible role "primary / play / claim"), including the pre-level card. Today's game uses green for Play.
- Home and tab backgrounds use the real `hero_bg` plus CSS light shafts, motes and vignette. Other tab backgrounds are CSS (brown pegboard), not painted.

## What is still weak

1. All text is one face, so hierarchy comes only from size and outline; no body font.
2. Backgrounds other than the home workshop are CSS gradients (road parchment is the up-scaled `road_bg`); no painted per-chapter road scenery, no painted tab scenes.
3. Nav and settings icons: the nav reuses unit and crate art (wrench, coil, cannon, toolbox, medal plus a star) and the settings glyphs are vector. The Bible's single painted icon set (S5 batch 4) does not exist yet, so this mixes painted and vector.
4. A1 is busy and brown-on-brown; the 3D tilt is untested on Safari and on a low-end phone.
5. Not shown: boss Play variant (red with skull), disabled Play with a reason, empty crate slots, the Events tab, pause menu, tutorial and coach marks, Screw Yard screens.

## Not verified

- No real phone: fps, blur cost (the win/lose/pre-level backdrops use `filter: blur`) and the 3D tilt were not measured. Only headless Chromium 141 was used.
- Safari/WebKit rendering (`@property` count-ups, `paint-order` text outlines, `color-mix`) was not tested.

## Rebuild

```
node art-candidates/screens/tools/build.mjs                        # src/*.css, *.mjs -> index.html (pictures read from src/assets/art)
node art-candidates/screens/tools/shoot.mjs <dir>                  # headless Chromium, 2x PNGs, animations pinned (frames.json)
node art-candidates/screens/tools/finish.mjs <dir>                 # shots/, contact sheet, strips
node art-candidates/screens/tools/review-shot.mjs <dir>            # review page check: no external requests, no overflow, no errors
```
`sheet.mjs` and `webp2png.mjs` are review helpers (contact sheet from any PNG folder, webp to PNG so pictures can be looked at).
