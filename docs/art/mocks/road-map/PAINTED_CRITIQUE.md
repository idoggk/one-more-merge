# CRITIQUE_84: painted ROAD MAP mocks (art director pass)

Task t-cae2a03e, mission m-5c5b88c4, 2026-10-15. Read-only on images. Nothing in `src/` touched.
Subject: `art-candidates/mockups/road-map-painted/{normal,boss,chapter,locked}_try1.png` (branch `orch/t-4bdebf89-painted-full-page-mocks-road-map`, 852x1846 each).
Compared with: assembled mock `art-candidates/mockups/road-map/roadmap_*_390x844.png` and `SPEC.md` in this folder.
Method: every image opened at full size and judged for readability, safe areas, touch size, spelling and consistency against state 1. Measurements are read off the PNGs by eye (about +-6 px at 852 wide). I could not open the owner's reference screens A, B, C1, C2 (project memory is not readable from this worktree), so "rails like the references" is judged only against SPEC section 6 and the owner's words (badges on both side rails).

Scale used: the paint is 852 px wide. At a 390 px phone that is 2.185 painted px per CSS px; at 430 px it is 1.98. The aspect ratio 852x1846 = 0.4616 matches 390x844 (0.4621) and 430x932 (0.4614), so one paint can be fitted to both phones by scaling, but the safe-area numbers differ (see section 3).

## 1. Verdicts

| State | Verdict | One line |
|---|---|---|
| 1 normal | **KEEP** (style anchor) | Strong. Needs a layout shift for safe areas and empty (text-free) versions of its parts. |
| 2 boss ahead | **FIX** | Same family as 1, best bottom margin. Simplify the boss and arena, enlarge Bolt's worry, keep chains off the rails. |
| 3 chapter entrance | **REDO** | The popup is great, everything around it is a different game: icons, wallet, nav, road, Bolt, numbers. |
| 4 locked | **FIX** (regenerate with state 1 attached as a reference if a fix by edit is not enough) | Best composition for "locked", but wallet and PLAY are shrunk, road rim and Bolt differ, and the sign has a spelling error. |

Set consistency: **fails**. States 1 and 2 are one family; 3 and 4 are each a separate family. Same HUD, four different drawings of it.

## 2. Per image

### 1. normal (KEEP, style anchor)
Passes at 110 px and 70 px: PLAY button, YOU tag, hero cannon on the gold platform, the six badges and the nav all read in a thumbnail. One clear light, top-left, thick plum outlines, brass trim, glossy enamel, chroma on the interactables (nodes, badges, PLAY) and a calmer purple backdrop. Spelling correct (DAILY, QUESTS, COLLECT, EVENT, OFFERS, SEASON, PLAY LEVEL 32, ROAD, UNITS, MACHINE, EVENTS). Wallet, plate, rails, chest ring, button and nav share one material (cream plate, brass rim).
Fix list (small):
- Top safe area: wallet pills start at about y 38 painted = 17 CSS (390) or 19 CSS (430). The Dynamic Island and status bar need about 54 to 59 CSS. Move the whole top block down by about 40 CSS.
- Bottom safe area: nav ends at about y 1815 painted = 830 CSS of 844 (14 CSS margin; the home indicator needs 32 to 34). Lift the nav and PLAY by about 20 CSS.
- No level numbers on any node. Done nodes show 3 stars only, the next node is a chest on a pedestal, the locked node is a padlock. The player cannot tell which number a node is except the PLAY button. The node discs need a number slot (live text), see section 5.
- The next node (33) is drawn as a chest on a pedestal directly under the YOU tag. It reads as a chest pickup, not as "level 33" (the SPEC chest sits on the road shoulder, not on a node). Put the chest back on the shoulder.
- The faint ghost discs near the top of the road are too low contrast to read as "levels ahead".
- Wallet "+" circles are about 45 px painted = 21 CSS. Fine as art, but the hit area must be the whole pill or a 44 px pad.
- The hero is at about 54 percent of the screen height (SPEC says 50 to 52). Acceptable.
- Bolt is only about 70 CSS tall and touches the node edge. OK, but see consistency.

### 2. boss ahead (FIX)
Same family as 1 (same chat): wallet, plate (9/10), rails, chest ring, nav identical in style. The red FIGHT BOSS pill is the clearest "this one is different" signal in the set and reads at 70 px. Bottom margin is the best of the four (nav ends about y 1780, 815 CSS).
Problems:
- Boss figure plus arena plus flames, chains, banners, towers, dark clouds, castle skyline: far more than 3 detail clusters (rubric 18). At 70 px it is orange noise and the boss silhouette is lost in the flames. The existing `boss_*_intact` sprites must stay the boss; a painted boss that differs from the shipped boss art cannot be used as a layer.
- Chains on the left reach the COLLECT badge and on the right touch the SEASON/OFFERS badge column. Rails must sit over calm backdrop (rubric 19, SPEC "road never enters the rails").
- Boss and arena are painted into the background. The game needs a separate boss sprite and a platform piece.
- Bolt is worried (sweat drop) but small and low contrast against the busy sparks.
- Top safe area fails like state 1 (wallet from y 17 CSS).
Redo note: "Fix: 18 reduce the arena to a boss on a platform, two flame clusters, no wall chains; 19 keep rails over calm sky; 12 darken the boss's value against the glow."

### 3. chapter entrance (REDO)
The popup is the strongest single piece in the set: purple ribbon CHAPTER 5, scene card, FACTORY plate, three reward cards, green LET'S GO, cheering Bolt, all readable and correctly spelled. Keep the popup as an asset reference. Everything else fails:
- Rail icons differ from state 1: DAILY is a calendar, QUESTS a clipboard, COLLECT a red gift, EVENT a circus tent, OFFERS a megaphone, SEASON a purple crown. The same gift now means COLLECT instead of DAILY. No red dots, no sub-chips (2/5, 2D 4H, -50%, 7/30), and label pills are slimmer.
- Wallet is a different widget: nut sticking out of a dark pill, green "+" buttons, smaller digits. The gear is a dark disc (about 39 CSS, under 44).
- Nav is full-bleed edge to edge with a different ROAD icon (folded map), a different UNITS robot and a different MACHINE icon; state 1 has a floating nav with a pin icon. It also runs to the bottom edge of the image (home indicator zone).
- Chapter plate and PLAY button are hidden by the gate and popup, so those two cannot be compared.
- Road is cobblestone grey-blue with blue node plates; state 1 is a cream road with green nodes. A new chapter may look different, but the HUD must not.
- Level numbers are wrong: 50, 49, 49, 48 above and 46, 45, 44 below (47 missing, 49 twice). SPEC says this entrance previews CH 5 starting at level 41, so 44 to 50 on screen is also inconsistent. Numbers 44 to 46 are about 37 CSS wide nodes (under 44).
- Title says FACTORY; `CHAPTER_LOOKS` and SPEC use MUSIC ATTIC for CH 5. Content must be taken from the game, not the painter.
- Background is the busiest in the set (factory clutter, pipes, crates, confetti): fails rubric 18.
- Reward cards show no amounts, so they cannot be read as rewards.
- Bolt is a third design: big white head with a black visor, star on the chest.
Redo note: "Redo with normal_try1 attached: 8 use state 1's wallet, nav and badge icons; 18 calm the backdrop behind the popup; 15 correct text (title from game data, numbers 41 to 50 with no repeat)."

### 4. locked (FIX; regenerate if edit is not enough)
Best expression of "locked": warm bright road below, cool frosted road above, padlock nodes, gate with a gold padlock and a sign, Bolt pointing at it. Reads at 70 px: the bright/cool split is a clear value structure. Rail badges are close to state 1 (gift, clipboard, cannon, gold stopwatch, gem with -50%, crown), but:
- Spelling: sign says **NEED 20 STAR** (should be NEED 20 STARS, or a star glyph as SPEC). Plate says "CH 4  ARCADE" with a double space.
- Wallet pills are about half the height of state 1 (about 23 to 25 CSS tall pill, digits about 13 CSS, gear about 37 CSS). Under 44 touch target and too small. State 1's wallet is the right size.
- PLAY LEVEL 32 is a narrower pill with smaller text (about 18 CSS vs 26+ in state 1) and a thinner rim; chest ring is a different dark style with a thin green arc (this ring actually reads better as progress than state 1's).
- Plate is a thinner frame with a dark bar and no chest inside.
- Label pills put the chip under the label (QUESTS, then 2/5; SEASON, then 7/30), state 1 puts it above. Pick one.
- Road rim is brass/gold curb with studs, state 1 is a plum cliff wall. Frosted locked road is nice but the rim must be one kit.
- Bolt is a different robot (blue body, goggles, backpack, brass trim), standing on a ledge off the road, about 115 CSS tall.
- Padlock nodes are grey on grey-blue stone: low contrast at 70 px, only the dark ring saves them. Nodes show one star each (state 1: three).
- Nav ends at y 1835 painted (840 CSS of 844): inside the home indicator zone. Top wallet at y 11 CSS: inside the status bar.
- Gate has a nice padlock but covers the entire road width; hit target for the locked tap is clear.
Redo note: "Fix: 15 NEED 20 STARS, one space in CH 4 ARCADE; 8 use state 1's wallet size, PLAY pill and plate; 19 use state 1's Bolt and the plum cliff rim."

## 3. Cross-image checks

| Check | normal | boss | chapter | locked |
|---|---|---|---|---|
| Wallet top vs safe area (needs 48 minimum, 59 on iPhone 14 Pro Max) | fail, starts about 17 CSS | fail, about 17 | fail, about 9 | fail, about 11 |
| Nav bottom vs home indicator (needs 32 to 34 margin) | fail, 14 margin | pass, about 29 (marginal) | fail, 0 | fail, 4 |
| Wallet pill height >= 44 CSS | 36, hit area must grow | 36 | 37 | about 24 (fail) |
| Gear >= 44 CSS | 50 pass | 49 pass | 39 fail | 37 fail |
| Rail badge coin >= 44 CSS | 66 pass | 66 pass | 66 pass | 66 pass |
| Nav tab height >= 44 | 66 to 70 pass | pass | pass | pass |
| PLAY / FIGHT pill height | 66 pass | 66 pass | hidden | about 50 pass |
| Node disc >= 44 | 64 to 87 pass | 60 to 80 pass | 37 to 45 fail | 55 to 65 pass |
| Badge icon style same as state 1 | yes | yes | no | mostly |
| Bolt design same as state 1 | yes | yes | no | no |
| Road material same as state 1 | yes | yes | no | no (rim) |
| Spelling | pass | pass | numbers wrong, title differs from game | NEED 20 STAR, double space |

Safe areas: top inset is about 47 on 390x844 phones and about 59 on the 430x932 Pro Max; bottom inset is 34. None of the four mocks respects the top. At 430x932 the paint scales by 1.98, so the wallet would start at about 19 CSS, and the island occupies y 11 to 48 over the left of the wallet pill and centre of the plate. The paint has the badges flush at x about 5 CSS and the plate centred, so left/right insets (0 in portrait) are fine.

Colour script: normal and boss hold the rule (chroma on interactables). Chapter puts as much chroma in the backdrop as in the UI (rubric 9 fails). Locked mixes warm lights in the lower scenery that compete with the gold hero.

Grayscale read: normal and boss keep their value steps (dark nav and sky, bright road, dark-on-gold text). Locked reads well top-to-bottom but its upper nodes flatten. Chapter's popup reads, the backdrop mushes.

## 4. Feasibility as game UI (painted-in vs separate layers)

The game needs every number and state to be live. A flat painted page can only be an art target, never the shipped image.

| Part | Verdict | How to build |
|---|---|---|
| Scenery (sky, clouds, floating islands, cabinets) | painted-in is fine | One background per chapter (SPEC says no tiling), cropped from the calm parts of state 1. State 1's sky is usable as is after removing road, badges, hero. |
| Road | **cannot be painted-in** | The road scrolls and winds with any level count. Needs a road kit: straight, two curve angles, end caps, cliff-wall strip, centre gold line, locked frosted variant. The painted road has a raised cliff wall and a drop shadow, so it cannot be a flat three-stroke path. |
| Nodes | separate | Empty disc plates (done green, current gold platform, next, locked, boss) with live number text and star sprites. Today none of the painted discs has a number slot. |
| Wallet, plate, bar | separate | Empty cream pill frames, "+" button, bar track and fill, chest. Text live, bar fill live (state 1 and 2 show the same fill style, good). |
| Rail badges | separate | One empty medallion frame, one label pill, one chip, one red dot, one -50% tag, and six icon faces (gift, medal, cannon, stopwatch, gem, crown). The icons of state 1 are ready to slice, the icons of state 3 should be thrown away. |
| PLAY / FIGHT pill, chest ring, nav | separate | Empty pills (green and red) with live text; ring with progress arc; nav with 4 tabs, active gold state, red dot and NEW tags. |
| Hero cannon, platform, YOU tag | separate | Cannon exists as game art; platform and tag are new (code or sprite). |
| Boss | separate | Must be the shipped `boss_*_intact`, not the painted boss. Arena as a platform piece. |
| Bolt | separate, poses | One canonical Bolt (pick state 1's) as 4 or 5 poses: wave, worried, point, cheer. States 3 and 4 Bolts are not on-model. |
| Chapter popup | separate | Panel, ribbon, scene card (per chapter image), reward cards, green button, confetti: all slice-ready from state 3. |
| Gate | separate | Iron gate with lock and sign (live "NEED n STARS" text); state 4's gate is the best reference. |
| Fog, frost on locked road | painted or layer | Alpha-masked overlay. |

## 5. Layout changes the painted version implies (vs the assembled mock and SPEC)

Using 390x844, CSS px. Differences between paint and SPEC section 2 numbers:

1. **Top block moves down about 35 to 40.** SPEC wallet y 56 is actually safe, but the paint has it at about 17. Anything built from the paint must start at 56 or more (59 on the 430 phone): the paint cannot be placed 1:1.
2. **Chapter plate is narrower and the rails start beside it.** Painted plate x about 78 to 313 CSS (about 235 wide, 78 tall) instead of SPEC `C-32` = 352 x 56. Left and right rails begin at y about 87 (next to the plate, plate between them), not below the plate at 176. Rails end at about y 336 (SPEC 432). Net: rails are about 90 higher and 100 shorter; this frees the road row below.
3. **Badge 66x71 coin with pitch 87 and x margin 4**, instead of 64x80 with pitch 88 and margin 8. Label pill sits on the coin's bottom rim (overlapping) with the chip above the label (state 1) or below (state 4): pick one. Hit box can stay 64x80.
4. **Road is about twice as wide**: roughly 100 to 110 CSS outer at the hero versus 56 outline in SPEC, with a cliff wall on the lower side, and it narrows toward the top (about 0.7 scale at the top rail row). That implies perspective scaling by screen y for road width, nodes and props, and a different node pitch: painted done nodes are about 70 to 75 CSS apart near the bottom, versus 160 in SPEC. About 6 to 7 levels visible instead of 4 to 5. This is the biggest code change: a variable-width road strip, a y-based scale for node sprites, and a node pitch in screen space.
5. **Nodes are flat ellipses (brass-rimmed green discs) seen from above**, not 80x96 domed buttons: new node set (done, next, locked, boss), ellipse about 80 x 56, number slot above the star row.
6. **Bottom cluster is lower than SPEC (PLAY at about 684 to 750, nav at 760 to 831) and must go back up**: PLAY at about 656 to 720, nav at about 736 to 808 (SPEC) so the bottom margin is 36. Chest chip is 73 versus 64: shrink it. PLAY pill 66 high is fine.
7. **Nav is a floating rounded bar with margin 8** (state 1, 2, 4) and a pin icon for ROAD (state 3 uses a different map icon and a full-bleed bar: reject). Keep SPEC `NEW!` tags and the red dot from the assembled mock; the painted nav has neither.
8. **Boss arena** replaces the SPEC "boss figure at y-136 plus gate 352 px above": painted boss is the end of the road, the arena replaces the gate. Locked state keeps the gate (state 4). Decide whether the gate sits before or after the boss.
9. **Bolt sits beside the hero at about 70 CSS**, locked state has him large on a ledge (115): use one placement, off the road.
10. **YOU tag and chest overlap in state 1**: move the chest to the shoulder (SPEC).

## 6. Recommended next steps

1. Pixel Checker works on `normal_try1.png` only; treat it as the anchor and fix the safe-area shift at the same time.
2. Regenerate 3 (REDO) and 4 (FIX) with `normal_try1.png` attached; ask for state 1's wallet, plate, nav, rail icons, Bolt and road rim unchanged; correct text: NEED 20 STARS, chapter title from game data, node numbers 41 to 50.
3. Boss try 2: boss on a platform only, no wall chains, rails area calm.
4. Ask the owner or the Asset Breaker for the road kit first (road is the owner's top complaint and it cannot come from a painted page).
5. Write the number rule into the style lock: HUD label pills 12 px minimum, wallet pill 44 high.

Rubric note (consistency): the same flaw gets the same item number in all four: 15 text (states 3 and 4), 18 busy-ness (2 and 3), 19 family resemblance (3 and 4), 8 palette/style lock (3), 20 padding/safe areas (all four).
