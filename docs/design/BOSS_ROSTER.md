# Boss roster: bosses that fit their chapter (names, looks, placement)

Docs only. Game rules are frozen for the Unity port, so every boss below **keeps its id, attack, copy and level slot**. Only the display name, art and presentation change. No code, `levels.json` or `puzzles.json` is touched. Nothing is bought.

Sources: `src/core/boss.ts` (BOSSES, CHAPTER_BOSS), `src/game/road/roadArt.ts` (CHAPTER_LOOKS), `src/content/levels.json` (read only), `docs/ROUND27_MINIBOSS_RULES.md`, `docs/ROUND28_CAST_AND_STAGES.md`, `docs/art/LEVEL_INTRO_V3.md`, `docs/art/UI_JUICE.md`, `docs/art/GPT_ART_DIRECTION.md`, and the 16 boss pictures in `src/assets/art/boss_*_intact.webp` (all opened and looked at).
`docs/art/ROAD_KIT_*.md` and `ROADMAP_LAYOUT.md` do not exist on this branch; chapter looks come from `roadArt.ts` and `docs/art/mocks/road-map/SPEC.md`.

## 1. Inventory today

### Chapters (8 chapters x 10 levels; mini-boss on level x8, chapter boss on level x0)

| Ch | Name | Look (top / bottom colour, props) | Mini-boss attack | Boss attack (+ second in last phase) |
|---|---|---|---|---|
| 1 | KITCHEN | cream to orange `#F8E6C4`/`#E9B676`, pots | BOMB | CLAMP (+BOMB) |
| 2 | LAUNDRY | pale aqua to teal `#D5ECE6`/`#8CC3BD`, bubbles | ROW SLIDES | FROST ROW (+ROW SLIDES) |
| 3 | GARAGE | sand to brown `#E8CFA8`/`#B98A55`, gears | MIRROR SWAP | SUCTION (+MIRROR) |
| 4 | ARCADE | violet to deep purple `#8E6CC4`/`#3E2A70`, pixels | JUNK BLOCKS | HOT COLUMN (+JUNK) |
| 5 | MUSIC ATTIC | wheat to amber `#F3D8A8`/`#B98846`, notes | PULL UP | REST ROW (+PULL) |
| 6 | SCRAPYARD | grey-blue `#D4DCE2`/`#6C8794`, crates | BOUNCE | SPLIT (+BOUNCE) |
| 7 | PACKING DEPOT | cardboard tan `#E3CF9F`/`#A8844E`, boxes | SLICK (+ROW SLIDES) | TOW BAR (+SLICK) |
| 8 | OBSERVATORY | indigo night `#5D6CB0`/`#1D2352`, stars | PORTALS (+MIRROR) | TIME RANSOM (+PORTALS) |

Boss levels: mini on L8/18/28/38/48/58/68/78, boss on L10/20/.../80. Each boss level has 2 to 4 minion waves first (`waves`, `make-boss-stages.mjs`), then the boss. The `monster` field in `levels.json` is the old mechanical monster; the boss art is picked by chapter slot (`CHAPTER_BOSS`). Bosses: 90 s clock, 3 armor looks (intact, cracked, critical) at 66% / 33% HP, a telegraphed attack every 12 s from 8 s (2.5 s warning). Minis: 60 s, no phases.

### Bosses today (16 pictures, 3 states each: `_intact`, `_cracked`, `_critical`)

| Id | Name | Level | Ch | What it looks like | Behaviour | Fits its chapter? |
|---|---|---|---|---|---|---|
| pressure_popper | PRESSURE POPPER | 8 | 1 | angry red pressure cooker, steam gauge | drops a bomb beside machines | yes |
| tin_can_king | TIN CAN KING | 10 | 1 | silver tin can in gold armor and crown | clamps a machine (no drop/drag) | yes |
| carousel_crab | CAROUSEL CRAB | 18 | 2 | blue tank-tread crab with a luggage-belt belly | slides one row right | no (luggage, not laundry) |
| fridge_overlord | FRIDGE OVERLORD | 20 | 2 | teal fridge golem, crystal crown | freezes a row (no drops) | no (kitchen object in the laundry) |
| vanity_moth | VANITY MOTH | 28 | 3 | oval hand-mirror moth, mirror wings | swaps two marked cells | weak (bedroom, not garage) |
| viper_queen | VIPER QUEEN | 30 | 3 | red vacuum cleaner, blue hose-cobra, crown | marked machines vanish | partly (vacuum is household) |
| brick_printer | BRICK PRINTER | 38 | 4 | lime-green boar printer with a stack of bricks | drops junk blocks | no (office, not arcade) |
| twin_toasters | TWIN TOASTERS | 40 | 4 | red and cyan toasters with crowns | hot column halves shots | no (kitchen, not arcade) |
| scrap_kraken | SCRAP KRAKEN | 48 | 5 | teal robot octopus, magnet arm | pulls a machine up one cell | no (scrapyard item in the attic) |
| piano_saurus_rex | PIANO-SAURUS REX | 50 | 5 | dark purple grand-piano dinosaur, key teeth | resting row, relays wake nobody | yes |
| spring_jack | SPRING JACK | 58 | 6 | purple jack-in-the-box kangaroo, blue spring tail | bounces a machine to a circle | partly (a toy; fits the attic better) |
| junkzilla | JUNKZILLA | 60 | 6 | red/teal junk dinosaur, crown, bell spikes | split divider blocks links | yes |
| oil_otter | OIL OTTER | 68 | 7 | orange oil-can otter, brass spout nose | oil slicks slide drops | ok |
| rivet_rhino | RIVET RHINO | 70 | 7 | teal armored rhino, steel horn | tow bar links two machines | ok (a forklift would be better) |
| portal_possum | PORTAL POSSUM | 78 | 8 | purple film-projector possum, reels | portals across the board | ok (projector = planetarium) |
| chrono_chimera | CHRONO CHIMERA | 80 | 8 | navy/gold clockwork winged lion-scorpion | time ransom, wake both in one chain | yes (clock, gold stars) |

### What the pictures tell us (the problems to fix)
1. **Wrong place, 6 of 16.** Fridge in the laundry, toasters in the arcade, printer in the arcade, crab in the laundry, moth in the garage, kraken in the attic.
2. **Everyone wears cream plates and gold bolts.** All 16 share the same armor kit, so at 70 px they read as one family, not 16 threats.
3. **Crowns on 5** (King, Viper, Toasters, Piano, Junkzilla). A crown no longer means "chapter boss".
4. **Colour clashes:** Spring Jack and Portal Possum are both purple; Fridge, Kraken and Rhino are all teal; King (silver) vs Printer (green) is fine.
5. **Silhouette clashes:** Piano-Saurus, Junkzilla and Rivet Rhino are all horizontal four-legged or dino shapes.
6. Cast monsters already take other names (Kettle Grump, Pixel Pug, Parcel Pup, Pallet Pal, Telescope Toad, Radar Rascal ...). Boss names must not repeat them.

## 2. Proposed roster

Rules for every boss (new rank clarity rule, same spirit as the unit rule):
- **Name:** 1 or 2 words, at most 16 letters including spaces and hyphens (the intro name chip and the lane clamp the copy; PIANO-SAURUS REX is the longest today).
- **Crown only on TIN CAN KING.** Other chapter bosses get a theme-specific "headgear" (drum door, antenna, joystick tops...). Minis never wear gold.
- **Gold is trim only,** under 10% of the surface. The body colour comes from the chapter.
- **Size class:** MINI is compact (about 70% of the stage width, one big feature). BOSS fills the 78% x 80% stage box and has one part that breaks the outline (horn, tail, hose, antenna).
- **Neighbours differ in at least 2 of:** silhouette class, size, part count, main colour. Readable at 70 px in grayscale.
- **Weakness hint (art only):** the attack's "tell" is built into the body as a glowing panel or part, and it is the part that cracks first in `_cracked` and goes dark in `_critical`. No new mechanic, no new target.

Slot summary (KEEP = art stays; RENAME = same art, new name; RESKIN = new art, same id and attack; the id in code stays, so no rule changes):

| Ch | Mini-boss | Boss | Plan |
|---|---|---|---|
| 1 KITCHEN | PRESSURE POPPER | TIN CAN KING | KEEP both |
| 2 LAUNDRY | TUMBLE CRAB (was Carousel Crab) | SUDSQUATCH (was Fridge Overlord) | RESKIN both |
| 3 GARAGE | HEADLIGHT MOTH (was Vanity Moth) | SHOP-VAC VIPER (was Viper Queen) | RESKIN mini, RENAME boss (recolour later) |
| 4 ARCADE | BLOCKHEAD (was Brick Printer) | CO-OP TWINS (was Twin Toasters) | RESKIN both |
| 5 MUSIC ATTIC | TAPE KRAKEN (was Scrap Kraken) | PIANO-SAURUS REX | RESKIN mini, KEEP boss |
| 6 SCRAPYARD | SPRING JACK | JUNKZILLA | KEEP both (Jack: optional rust recolour) |
| 7 PACKING DEPOT | OIL OTTER | FORKLIFT RHINO (was Rivet Rhino) | KEEP mini, RENAME boss (redraw later, see note) |
| 8 OBSERVATORY | PORTAL POSSUM | CHRONO CHIMERA | KEEP both |

That is 16 slots, 6 new paintings (Tumble Crab, SudSquatch, Headlight Moth, Blockhead, Co-Op Twins, Tape Kraken), 2 renames, 8 keeps. The retired art is not wasted: see the elites below.

### 2a. Chapter by chapter

Format: personality · silhouette and size · palette (3 colours) · signature visual · weakness hint · rank clarity.

**Ch1 KITCHEN**
- PRESSURE POPPER (mini, KEEP): short-fused. Squat round pot, size S. Red `#D8231E`, cream `#F2E6C9`, brass trim. The steam gauge and the pop button on the lid are the threat tell. Weakness: the gauge needle goes into the red; the lid pops off in `_critical`. Clarity: only red round body with a lid in the whole roster.
- TIN CAN KING (boss, KEEP): proud and stiff. Upright cylinder with a crown, size L. Silver `#B9C2C8`, cream `#F2E6C9`, gold `#F3B62F`. Armored shoulders, glaring face. Weakness: the can label strip cracks first and the crown tips over. Clarity: the only crowned boss and the only tall round cylinder.

**Ch2 LAUNDRY** (pale aqua)
- TUMBLE CRAB (mini, RESKIN of Carousel Crab, same row-slide attack): spins in circles, dizzy but smug. A hermit crab living in a front-loading washing-machine door, claws are rubber gloves, size S, wide and low. Steel `#B8C4CC`, safety orange `#FF9A2E`, porthole aqua `#7FD6E8`. Signature: a spinning drum door with socks tumbling inside; a belt of clothes moves under its feet. Weakness: the porthole glass cracks first. Clarity: wide low crab with 2 big claws, orange. Not blue like the old crab.
- SUDSQUATCH (boss, RESKIN of Fridge Overlord, same frost attack): a gentle giant who is quietly furious when anyone leaves the lid up. A yeti made of soap suds with a washing-machine drum for a belly and a laundry-basket for a hat, size L, very wide and tall with a big fluffy head. Suds white `#F6F8FF`, ice blue `#6EC8F0`, detergent coral `#FF6A5C`. Signature: frost crystals on the foam, icicle teeth, a frozen blue row of clothes pegs on its arm. Weakness: the drum window frosts over and cracks. Clarity: tall fluffy white mass, no armor plates; the only soft-edged boss.

**Ch3 GARAGE**
- HEADLIGHT MOTH (mini, RESKIN of Vanity Moth, same swap attack): can't resist a bright light. A moth with two car headlights for eyes and side-mirror wings, size S, wide-winged and flat. Charcoal `#3A3A44`, headlight yellow `#FFE45C`, hazard orange `#FF7A1A`. Signature: wings are two wing mirrors that flash a mirror line between each other. Weakness: one headlight flickers and goes dark. Clarity: a flat winged shape, black and yellow. The old Moth was an oval mirror in pink.
- SHOP-VAC VIPER (boss, RENAME of Viper Queen, same suction attack; art stays for now, recolour later): hisses and sucks up everything. The hose-cobra on a wet/dry shop vac. Later recolour to safety orange `#F26B1D`, charcoal `#3A3A44`, silver `#C8D0D6`; drop the crown. Weakness: the hose mouth. Clarity: the only serpent S-curve.

**Ch4 ARCADE** (violet)
- BLOCKHEAD (mini, RESKIN of Brick Printer, same junk-block attack): takes losing badly, throws tantrum blocks. A little arcade cabinet head on stubby legs with falling-block stacks for hair, size S, a tall small rectangle. Screen black `#1B1530`, neon cyan `#35E0F0`, hot pink `#FF3FA4`. Signature: the screen shows an angry pixel face and a next-piece preview that drops bricks. Weakness: the screen glitches stripes when hit. Clarity: tiny tall box, only boss with a flat screen face.
- CO-OP TWINS (boss, RESKIN of Twin Toasters, same hot-column attack): two players, one angry mind. Two tall arcade cabinets joined by a shared coin cable, P1 and P2 joystick-ball arms, size L, two tall columns. P1 red `#E9422B`, P2 blue `#2F7BFF`, cream `#F2E6C9`. Signature: heat shimmer and an "overheat" glow in one cabinet's screen (the hot column). Weakness: the two screens crack in turn. Clarity: two upright rectangles vs the old wide, low toasters; red/blue not red/cyan.

**Ch5 MUSIC ATTIC** (wheat)
- TAPE KRAKEN (mini, RESKIN of Scrap Kraken, same pull attack): drags everything toward itself. An old cassette-tape octopus: cassette body with two reel eyes, tentacles of unspooled tape, size S, round with many curly arms. Cobalt `#2F6FD0`, tape brown `#4A2F22`, label cream `#F5E8C8`. Signature: one long tape ribbon points up (the pull arrow). Weakness: the two reel eyes jam. Clarity: spaghetti curves, blue. Piano is angular and dark purple.
- PIANO-SAURUS REX (boss, KEEP): rests and demands silence. Dark purple, cream key teeth, gold trim. Remove the crown later (tier 2). Weakness: the sheet-music lid and the key teeth go loose. Clarity: long low shape with an open lid. This is the best theme match in the roster.

**Ch6 SCRAPYARD**
- SPRING JACK (mini, KEEP): can't stop bouncing. Purple kangaroo on a box. Optional recolour to rust orange `#C4622D`, scrap grey `#8FA1AC`, spring yellow `#F2C94C` so it reads as junk, not a toy and not Portal Possum. Weakness: the spring coil stretches and snaps. Clarity: tall, with a spring tail.
- JUNKZILLA (boss, KEEP): the final boss of the early game; it already says "scrap pile". Remove the crown later (tier 2). Weakness: the chest panel and bell spikes. Clarity: the only upright dinosaur.

**Ch7 PACKING DEPOT** (cardboard)
- OIL OTTER (mini, KEEP): slippery and smug. Oil-can otter. Orange/green/black. Weakness: the spout nose clogs. Clarity: smooth round body, no plates.
- FORKLIFT RHINO (boss, RENAME of Rivet Rhino; same tow attack): shoves boxes and ties them together. Keep the art for now. Later redraw: the horn becomes a pair of forks pointing up on a vertical mast (so it is tall, not another low four-legged shape like Piano and Junkzilla), safety yellow `#F5C400`, cardboard tan `#C9A26B`, charcoal `#3A3A44`. A tow chain between two crates is the signature. Weakness: the chain link glows. Clarity: the only boss with a tall vertical mast.

**Ch8 OBSERVATORY** (indigo night)
- PORTAL POSSUM (mini, KEEP): curious, appears out of nowhere. A planetarium-projector possum. Later tweak: film reels become star discs. Weakness: the lens. Clarity: round belly lens, purple (Spring Jack moves to rust, so the purple clash is gone).
- CHRONO CHIMERA (boss, KEEP): the final boss; sells you your own time back. Navy `#1D2352`, gold `#F3B62F`, cream. Weakness: the clock face on the chest. Clarity: the only winged boss.

### 2b. Optional elites: "more bosses" (phase 2, needs the owner's yes)
One extra named monster per chapter on the ordinary level x5 slot (a boss-look monster, no new attack; the slot today holds an old-cast monster, see ROUND28). It only reuses an existing behaviour, so it needs only a level-data change via tools and a name/art swap. Not in the first 6 drawings.

| Ch | Elite | Idea | Colours |
|---|---|---|---|
| 1 | FRIDGE OVERLORD (existing art, moved here) | teal fridge golem fits the kitchen | teal / cream / gold |
| 2 | CLOTHESPIN CROC | a crocodile with clothespin teeth, laundry-line tail | green / wood / white |
| 3 | TIRE TIGER | tyre-tread stripes, a jack for a tail | black / orange / chrome |
| 4 | CLAW-DIA CRANE | claw-machine crane, a prize plush in its claw | pink / cyan / yellow |
| 5 | METRONOME MANTIS | a metronome with swinging pendulum arms | wood / brass / cream |
| 6 | MAGNET MAMMOTH | a horseshoe-magnet trunk, scrap stuck to its tusks | rust / grey / red |
| 7 | BOX-ER | a boxer made of cardboard boxes, tape-roll gloves | tan / red / white |
| 8 | ORRERY OWL | an owl whose body is a brass orrery of rings | navy / gold / violet |

## 3. Art briefs (ChatGPT batch)

Style anchor (from the painted mocks v2 and `GPT_ART_DIRECTION.md`): bright, glossy, toy-like enamel; chunky simple shapes; strong dark warm-brown outline (about 4% of height); one broad soft highlight top-left, thin rim light bottom-right; soft warm shadow under the feet; 3/4 front view; the smallest detail still readable at 70 px; at most 3 detail clusters. Gold only as trim.

**Template** (one image per request, 1024 x 1024, 3 images per boss: hero, hit, defeat):

> One enemy character for a mobile merge game called One More Merge: {SUBJECT}. Bright, glossy, toy-like enamel, chunky simple shapes, strong dark warm-brown outline about 4% of the height, one broad soft highlight top-left, thin rim light bottom-right, soft warm shadow under the feet, 3/4 front view. Palette: {3 COLOURS}. Gold or brass only as small trim. {POSE}. No text, no letters, no logo, no scenery, no base plate. Flat solid #FF00FF magenta background (key), nothing on the character is magenta. Centered with 8% padding, full body visible.

Per boss (SUBJECT + POSE for hero / hit / defeat). Hit = the `_cracked` slot, same stance. Defeat = the `_critical` slot look (almost dead, ready to collapse; the collapse itself is code).

1. **TUMBLE CRAB** · SUBJECT: a cheeky hermit crab living in a front-loading washing machine door, round glass porthole as a shell with colourful socks tumbling inside, big yellow rubber-glove claws, stubby legs, a small conveyor belt of clothes under its feet; steel grey, safety orange, aqua glass. HERO: claws up, wide grin. HIT: porthole cracked, one sock flying out, eyes squeezed shut. DEFEAT: shell tilted, glass shattered, dizzy spiral eyes, claws drooping.
2. **SUDSQUATCH** · SUBJECT: a huge friendly-looking yeti made of soap suds, washing-machine drum for a belly with a frosted window, a laundry basket as a hat, icicle teeth, frost crystals on the foam, clothespins as claws; suds white, ice blue, coral pink. No armor plates. HERO: arms wide, chest out, stern frown. HIT: foam knocked loose, drum window cracked, one eye closed. DEFEAT: slumped, foam melting, window dark and cracked, tongue out.
3. **HEADLIGHT MOTH** · SUBJECT: a moth with two round car headlights as big eyes, the wings are two side-mirror panels that show a bright reflection, hazard-stripe antennae; charcoal, headlight yellow, hazard orange. HERO: wings spread, headlights glowing. HIT: one mirror wing cracked, one headlight flickering. DEFEAT: both lights dark, wings folded down, antennae bent.
4. **BLOCKHEAD** · SUBJECT: a small angry arcade cabinet on stubby legs, a black screen face showing pixel-art eyes and a scowl, stacked falling blocks on top like hair, tiny joystick arms; screen black, neon cyan, hot pink. HERO: fists up, blocks on head. HIT: screen glitching in stripes, blocks tumbling off. DEFEAT: screen shows a "game over" face made of dots (no letters), blocks scattered, sparks.
5. **CO-OP TWINS** · SUBJECT: two tall arcade cabinets standing side by side joined by one cable, each with an angry pixel-face screen, a ball-top joystick arm and coin-slot teeth; the left is red (P1), the right is blue (P2); one screen has a hot orange overheat glow; cream trim. HERO: both facing front, arms raised. HIT: both screens cracked, cable sparking. DEFEAT: leaning on each other, both screens dark and cracked, joysticks bent.
6. **TAPE KRAKEN** · SUBJECT: an octopus made of an old cassette tape, two tape reels as eyes, 6 curling arms of unspooled brown tape, one long ribbon rising up like a pointing arm; cobalt, tape brown, label cream. HERO: arms spread, one ribbon up. HIT: tape tangled, one reel eye jammed crooked. DEFEAT: tape loosely unspooled all around, reels dim, arms limp.

Later (tier 2, same template): HEADLIGHT-style recolour of SHOP-VAC VIPER (safety orange, no crown), FORKLIFT RHINO redraw (upright, forks pointing up on a mast), SPRING JACK rust recolour, PORTAL POSSUM star discs, and no-crown versions of Piano-Saurus and Junkzilla.

### Animation notes (code-side, uses the existing pieces)
All reduced-motion safe; no animation pauses the simulation.

| Beat | Rule | Per boss accent |
|---|---|---|
| Idle | existing whole-sprite sway 0.5 deg (ROUND28); off while the hit plays | Tumble Crab: porthole drum spins slowly. Sudsquatch: foam wobble. Headlight Moth: wing flutter, headlights pulse. Blockhead: one block wobbles. Co-Op Twins: screens flicker alternately. Tape Kraken: ribbon sways. |
| Hit | squash 6% down and back in 100 ms, white flash; the existing 100 ms crossfade to `_cracked` at 66% and `_critical` at 33% | spawn 3 theme sparks: bubbles, glass shards, pixels, tape bits |
| Attack warning | the weakness part glows during the 2.5 s warning | the tell part named above |
| Defeat | existing monster-local collapse and board wave | theme finish: bubbles pop, lights go out, screen "game over", tape unspools |
| Intro pop | `popIn` from `UI_JUICE.md` on the hero in the level intro (scale 0 to 1.12 to 1), name chip `bounceIn` 120 ms later | a roar-bob once (3% vertical) |

## 4. Where bosses appear

**Level intro popup** (`LEVEL_INTRO_V3.md`; ribbon purple for mini, red for boss; hero 45% of the panel; name chip, clock chip):
- Hero = `_intact` art on the chapter's `stage_chN` backdrop (already done for the stage). Name chip uses the chapter accent colour from `CHAPTER_LOOKS`, not one colour for all.
- Add the boss's attack icon next to the name (existing ATTACK_COPY icons; chapter bosses show both icons, the second marked FINAL PHASE).
- Intro pop: hero `popIn`, ribbon first. Today the intro has no hero idle; for bosses allow one slow idle sway only when the `uiJuice` flag is on.
- Keep the tag pill MINI-BOSS / BOSS as it is.

**Road map boss node** (`nodeFrame_boss_*`, `nodeFrame_mini_*`):
- Open: round portrait of the `_intact` head and shoulders on the boss platform, boss about 1.5x a normal node, mini about 1.2x with a purple ring.
- Locked: a flat silhouette in the chapter's dark colour (no face), so the player sees the shape and wonders.
- Done: the `_critical` look, greyed, with a small stamp (existing star/medal).
- Chapter entrance panel: the boss line shows the silhouette teaser; the chest/gate text is unchanged.
- Rank clarity on the road is the same test as on the board: silhouette at 70 px.

## 5. Recommendation: draw these 6 first
The chapters players see first, and the biggest "wrong theme" gaps, in this order.
1. SUDSQUATCH (ch2 boss, L20: the first big mismatch, a fridge in the laundry)
2. TUMBLE CRAB (ch2 mini, L18)
3. HEADLIGHT MOTH (ch3 mini, L28)
4. CO-OP TWINS (ch4 boss, L40, the chapter in the owner's reference screenshots)
5. BLOCKHEAD (ch4 mini, L38)
6. TAPE KRAKEN (ch5 mini, L48)

Run each through the art-director critic (rubric, grayscale and 70 px test, side by side with TIN CAN KING as the benchmark) before approval. Then save in git only; do not wire into the game until the owner approves them on the review page.

## 6. Questions for the owner
1. Is it OK to give each boss a new name and look but the same attack and level (for example: the Fridge freeze attack now belongs to the Sudsquatch)? If not, the other path is to move the attacks, which changes rules and has to wait for after the Unity freeze.
2. Crowns only on TIN CAN KING (everyone else gets chapter-themed headgear)? This means redrawing Piano-Saurus and Junkzilla later.
3. Do you want the 8 optional elites (one per chapter, on level x5)? They add 8 more bosses but need a level-data change; the first 6 drawings do not depend on it.
