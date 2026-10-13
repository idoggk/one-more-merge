# LEVEL ROAD V2: from a zigzag list to a place you travel through

Task t-a5643e48, 2026-10-14. Design only: no src changes, nothing built into the game. Owner: "The road of the levels looks awful. It looks nothing like other games. Mediocre."
Evidence: `art-candidates/level-road-v2/before/` (15 frames of the live ROAD tab, 390x844, progress L1/8/10/11/20/21/35/52/65/80, with drags past chapter boundaries) and `mock/` (static layout study). Capture script: `tools/before-shots.mjs`. Confidence labels: **SEEN** (our frames), **KNOWN** (general knowledge of the leading games, not re-verified), **OWNER-REF** (owner's seven reference screenshots, described to me by the Lead; I could not open them).

## 1. What is wrong with ours (all SEEN in the before-frames)

1. **It is a list, not a place.** Every chapter is the same parchment wall (`road_bg`) with the same 4-position zigzag (`xs[(n-1)%4]`). Frames 04 (L11) and 06 (L21) look identical to frame 01 (L1): you cannot tell chapter 1 from chapter 8 except by a small coloured strip.
2. **No chapter transition at all.** Between L10 and L11 (frames 03, 04) the road just continues; no gate, banner, scenery change or fog. The only chapter identity is a 60px strip pinned under the HUD, and it shows the chapter of the CURRENT level, not of what is on screen (frame 05: scrolled to ch 1, strip still says CH 2).
3. **The path is a thin straight-line zigzag** (22px cream tube, 12px gold travelled centre), with sharp corners at every node. Reference roads are thick (60-90px), outlined, winding, with width variation and props hugging them.
4. **Nodes are small and only a little different.** Normal, hard and locked are the same grey coin; HARD is a 22px red tag; the node art is 96-116px with 30px stars hidden under it. Unlocked-but-ahead and locked are the same. Bosses (frames 02, 03, 05, 10) get a gear coin and a faint 50%-alpha ghost of the boss that looks like a smudge.
5. **The current level does not feel like "you are here".** A flat coin with a faint pulsing ring (frame 01). No avatar, no platform, no pointer. L1 on a fresh game is the least noticeable thing on screen.
6. **Collisions and clutter.** MINI-BOSS tag runs under the QA button (frame 07, L38); node 80 and its tag are clipped under the HUD (frame 09); SEASON and QA floaters sit on the road; ending a drag over the wallet opened the BOLTS popup (frame 05 drag).
7. **No milestones on the path.** The chest is only an icon in the header strip (r17). No chest nodes, no checkpoints, no reward preview.
8. **No fog or tease of the next chapter**, no progress header with milestones, no life (clouds, birds, steam), and the scroll is a hand-rolled drag with no momentum or snap-to-current. The bottom 40% of the screen is the road under a PLAY button, so the current node is at 28-75% depending on level.

## 2. What the leading games do that we do not (teardown, KNOWN unless marked)

| Topic | Leading games | Us now |
|---|---|---|
| Path shape | Candy Crush, Homescapes: one winding S-curve through landmarks, camera follows the player. Royal Match: full-bleed rendered scene with the level path inside it. | Straight zigzag on wallpaper |
| World per chapter | Candy Crush episodes, Gardenscapes areas: each has its own illustrated scenery (candy sea, forest), layered parallax and foreground props. Merge Mansion: rooms. OWNER-REF veggie battler: THICK outlined path through a full-bleed beach with props. | One wallpaper, one tinted strip |
| Node design | Distinct shapes per kind: round normal, ribbon/horned plates for hard (OWNER-REF: purple ribbon HARD, red horned VERY HARD), big boss medallion; stars under nodes; locked is cooler and duller; gold ring = next. | One coin, grey padlock |
| Current level | Avatar stands on the node (Candy Crush profile picture, Toon Blast character); OWNER-REF: round diorama platform with the boss on it and a water ring; Clash Royale: arena banner. | Faint ring |
| Gates and banners | Candy Crush episode gate ("need N stars / ask friends"), Toon Blast and Homescapes chapter banners with name and number. | Nothing |
| Chests and milestones | Chests on the path (Monopoly Go milestones, Toon Blast chests, Merge Mansion chests), a chapter progress plate with a chest (Royal Match, OWNER-REF bottom-right). | Header icon |
| Next chapter | Fog, locked silhouette or partial reveal beyond the gate (Candy Crush, Monopoly Go next board). | None |
| Header | Chapter title, progress bar with chest and star milestones; event medallions on both sides with timers, percent badges and red dots (OWNER-REF). | Strip + QA and SEASON floaters |
| Motion and sound | Momentum scroll with snap to current, auto-scroll to a newly unlocked node, node pop and path-draw on unlock, drifting clouds, birds, steam, a soft step sound on avatar move, chest rattle. | Drag only |
| Thumb reach | Primary button bottom (Royal Match: bottom-left LEVEL; OWNER-REF: big FIGHT button), nav of 5 with a raised labelled active tab; nodes live in the middle 60% of the screen. | PLAY centred (good), nav of 4 flat tabs |
| Info density | Per node: number, stars, one marker. Details live in a bottom card on tap. | Tags and ghosts on nodes |

**Adopted from the owner's references, and why**
- *Road as a PLACE with props around the path* (OWNER-REF both games): adopted wholesale. It is the single biggest reason ours reads as a list. Cost: 24 scenery tiles + 8 prop sheets (section 6).
- *Thick outlined path*: adopted (58px dark outline + 44px surface, code-drawn). Matches the chunky-outline kit.
- *Big round medallions; gold ring = next; cool blue locked*: adopted. Our locked becomes cool blue-grey (not the warm grey that merges with the parchment); the open node gets a gold rim.
- *Purple ribbon plate HARD, red horned plate for the hardest*: adopted for HARD and MEGA HARD. Mini-boss and boss keep our own shapes (shield and gear-crown) so danger stays three-step: ribbon, horns, crown.
- *Current level = diorama platform with the boss standing on it*: adopted, one hero object per screen. On boss levels the boss stands on the platform; on normal levels our player machine (cannon_4) stands there.
- *Side medallions with timers, % badges, red dots*: adopted as TWO slim rails (left: Season, Daily; right: Event) only; QA moves into Settings. Not adopted: more than 2 per side (clutter).
- *Raised labelled active tab, big primary button*: adopted (mock shows it). A 5th tab is NOT proposed here.
- *Royal Match chapter plate with chest bottom-right*: adopted as the progress chip next to PLAY (ring + chest, easiest thumb target). The mock still shows the top plate; section 7 critiques it.

## 3. The design in plain words

The road is one tall painted world per chapter, scrolled vertically, level 1 at the bottom, the boss gate at the top. A winding thick path crosses the world in a slow S (about 1.5 swings per chapter, node x within 80-310 of 390), with ~150px between nodes. Scenery sits behind (parallax 0.2x) and props in front at the edges; the centre of the scenery is calm so nodes read. The avatar's platform marks the current level; travelled road turns gold; locked ahead is cool and dim. Above the boss gate lies fog and the silhouette of the next chapter's scenery. Chests sit ON the path at levels 3, 6, (boss). A chapter banner marks every entrance and exit.

```
 NORMAL CHAPTER (one phone screen shows ~5 nodes; world height ~2300 logical px)
 +------------------------------+  <- top: fog + next chapter silhouette
 | ~~~ fog ~~~  CH 4 ARCADE ... |
 |        ,-[CH4 GATE 10*]-.    |  gate arch, stars needed
 |    ===[ GARAGE COMPLETE ]=== |  banner ribbon
 |          (30 BOSS)           |  big boss medallion on arena platform
 | prop     /                   |
 |        (29)                  |
 |   (28 MINI)\    prop         |  mini-boss: shield plate + silhouette beside
 |       \                      |
 |   prop (27)                  |
 |          \_                  |
 |       [25 CHEST]--(26 YOU)   |  current: platform + avatar + pulse, "YOU"
 |      /     *** stars         |
 |  (24 HARD)                   |  ribbon plate
 |       \  (23)(22)(21)        |  done: gold road, 1-3 stars under node
 |   cloud~~    ENTRY BANNER    |
 +------------------------------+
 HUD: top = wallet pills only; rails: left Season/Daily, right Event;
 bottom = [chapter chip: ring+chest] [PLAY LEVEL 26 (wide)] ; nav (4 tabs, raised active)
```

**Chapter gate and boss node**: the boss medallion (150px) stands on a wider arena platform (200px) with the boss silhouette (tinted, 100% alpha, rim-lit, not a ghost) behind; above it a stone/themed gate arch with a lock and "NEED 20 STARS". When the chapter is cleared the gate opens (animation), the fog lifts, the camera pans up to the next chapter's entrance banner. Locked chapters show fog + greyscale scenery.

**Node states** (frame art per kind x state): *locked* (cool blue-grey, small padlock, no stars), *open* (gold rim, bobbing "YOU" platform only on the current one; others open-but-ahead are not allowed, progress is linear), *done* (green medallion, 1-3 stars on a brass shelf, gold road leading in), *current* (platform + avatar + pulse + pointer). Kinds: normal 96px, HARD 104px + purple ribbon, MEGA HARD 112px + red horns, mini-boss 116px shield, boss 150px gear-crown, chest 84px (closed/ready/open).

**Data needed** (all derivable today): `LEVELS[n].difficulty/mini_boss/boss_node`, `meta.levelStars`, `currentLevel()`; new, small: per-chapter theme id (exists: CH table), per-chapter star gate (n stars, tuning), chest milestones (levels 3, 6 per chapter; reward from the crate table), side-rail contents (season tier, daily claimable, event timer; all exist in meta).

**Scroll model**: world coordinates = road space. Native-feeling momentum (velocity decay 0.95/frame, rubber-band 40px past ends), snap-to-current on open and via a "back to me" button after the player is more than half a screen away; after a level win, auto-scroll 600ms to the new node, node pops, the path draws gold, stars fly in. Parallax: far layer 0.2x, props 1.0x, foreground clouds 1.2x. Pull-to-top shows the next chapter's fog. Taps ignore drags above 12px; drag releases never reach HUD buttons (fixes the BOLTS popup bug).

**Tiny life**: clouds drift (38s), birds cross every 20-40s, steam from chapter props, node pop-in on unlock, chest rattle when claimable, avatar bob 1.2s, soft step tick when the avatar moves. Motion respects reduced-motion; no animation pauses the simulation.

## 4. 20-point self-score target (2 points each; 0 none, 1 partial, 2 clearly at leading-game level)

1 world per chapter (scenery + props, distinct) · 2 winding thick path · 3 node kinds distinct at a glance · 4 states readable (locked/open/done/current) · 5 current-level hero (platform + avatar) · 6 gate and banners at every chapter edge · 7 chests/milestones on path · 8 fog/tease of next chapter · 9 header/progress/rails with no clutter or overlap at 390x844 and 360x640 · 10 motion, momentum scroll, snap, ambient life, sound.
**Ours today: 4/20** (path 1, node kinds 1, states 1, header 1). **Mock: 9/20** (layout only). **Target after art: 17/20 minimum**, no item at 0.

## 5. Sizes and asset list (author at 2x: logical 390 wide = 780 px; ChatGPT canvases are 1024x1024, 1536x1024 or 1024x1536)

| Asset | Count | Canvas / delivered size | Key |
|---|---|---|---|
| Chapter scenery tiles: entrance, middle (vertically seamless), gate-top, per chapter x8 | 24 | 1024x1536 each, cropped to 780x1152 centre, stacked to ~780x3400 | none (full-bleed) |
| Foreground prop sheets, 6 props per chapter x8 | 8 | 1536x1024 sheet, 3x2 cells, each prop ~300px | magenta (green if violet props: arcade, observatory) |
| Road surface material tiles (stone, plank, metal, carpet) | 1 sheet | 1536x1024, 2x2, each seamless 512x512; road is drawn in code | green (violet carpet) |
| Road pieces: endcap, junction, bridge, step, arrow | 1 sheet | 1536x1024, 3x2 | magenta |
| Node frames, normal + HARD x (locked, open, done) | 6 | 1536x1024 sheet 3x2, each 256x256 (shown 96-104) | green (purple ribbons) |
| Node frames, MEGA HARD + mini-boss x (locked, open, done) | 6 | same sheet format | magenta |
| Boss node x (locked, open, done) + boss arena platform x3 | 6 | 1536x1024 sheet 3x2, boss 320x320, platform 512x256 | magenta |
| Avatar platform (diorama) normal, mini, boss + pointer "YOU" plate | 4 | 1536x1024 sheet 2x2, platform 400x240 | magenta |
| Chest nodes: wood, iron, gold x (closed, ready, open) | 9 | 1 sheet 3x3 in 1536x1024 (cell ~512x341, chest ~300px, shown 84) | magenta |
| Chapter banner ribbon (blank, empty centre) + completed variant | 2 | 1536x1024 sheet 1x2, each 3:1 ~1500x500 | magenta |
| Chapter gate arch x2 (closed with lock, open) | 2 | 1536x1024 sheet 1x2, 700x500 | magenta |
| Fog and cloud puffs (3 fog banks, 3 clouds) | 6 | 1536x1024 sheet 3x2 | white on black (screen blend) |
| Ambient FX: steam puff frames, bird silhouettes, sparkle | 8-12 | 1536x1024 sheet 4x2 | white on black |
| Progress chip (ring + chest socket), side rail medallion frame, star shelf | 3 | 1536x1024 sheet 3x1 | magenta |

Existing assets reused: `star`, `chest_closed/open`, `ui_ribbon`, `btn_green`, `icon_bolt`, `icon_gem`, boss `*_intact` (as silhouettes), `cannon_4` (avatar). The 8 `stage_chN` rooms are battle backdrops, not road scenery; the mock uses them only as stand-ins.

## 6. Prompts

`art-candidates/prompt-pack/level-road-v2.json` (batches LR01-LR11, 43 prompts (generated by `art-candidates/level-road-v2/tools/gen-pack.mjs`), same fields and READY handshake as `asset-list-v2.json`; primer unchanged, taken from `art-candidates/prompt-pack/primer.txt` on branch `orch/t-2d95ddb9-slicer-fix-3-trim-to-the-object`). Order: LR01 anchor test (gate + one middle tile of chapter 3 at phone size), then nodes, then the other chapters. Scenery tile B is generated by editing with tile A attached so edges match.

## 7. Critique of the mock (`mock/mock_*.png`, honest)

Works: the thick outlined S-path reads instantly as "a road"; the current-level platform + avatar is a real hero object; done/locked/HARD/chest states are readable; the banner and gate give the chapter a top; the raised tab and breathing PLAY button feel like the genre. Layout alone moves us from 4 to about 9/20.
Does not work: (1) the scenery is the only weak point. Existing `stage_ch3` is an interior wall photo-strip; mirrored bands show horizontal stripes and no props near the path, so it still reads "wallpaper". That is exactly what the new 24 tiles must fix; the mock can't prove it. (2) The boss silhouette stacks on the gate lock at the top; separate them by 120px or move the boss to the arena platform. (3) At the current position the PLAY button covers the chest and HARD node below; the viewport should put the current node at ~45% and the road under the button must fade (scrim helps, but nodes still collide). (4) Header plate and wallet crowd the top 130px, losing about one node of view; the bottom-right chapter chip would free it. (5) Fog is too faint at this scroll, the next chapter hint needs the dedicated fog art. (6) Locked nodes are still grey-purple; they need the cool blue of the real frames. (7) The mock has no momentum or sound; scroll feel remains unjudged.
