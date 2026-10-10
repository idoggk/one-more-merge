# Roster B1 art candidates

These are candidate art files only. Nothing here is wired into the game (`src/` is untouched).

- Source: ChatGPT image generation in the owner's "Create Tray Asset" chat, 2026-10-10.
- Format: PNG, RGBA, transparent background, 1254x1254.
- Before using them, downscale to 256x256 and convert to `.webp` to match `src/assets/art/*.webp`.

## Style match

I looked at the existing unit art on origin/master first (`cannon_3`, `coil_3`, `arc_welder_4`, `battery_2`, `bell_3`; all 256x256 RGBA webp). That art is:

- chunky, toy-like cartoon gadgets, drawn in a 3/4 isometric view from slightly above;
- one object, centred, filling most of the canvas;
- thick dark outlines;
- a glossy enamel body in one strong colour, with soft highlights from the top left;
- polished gold/brass trim, round rivets and knobs;
- a cream/ivory base plate with small rounded feet;
- no text, no ground shadow, transparent background.

Each family has its own colour: cannon red, coil cyan, arc welder navy, battery lime.

I sent this style brief to ChatGPT with item 1:

> STYLE BRIEF (match the existing unit art exactly): chunky, toy-like cartoon gadget, 3/4 isometric view from slightly above, single object centred and filling ~85% of a square canvas. Thick dark brown/navy outline around every shape, glossy enamel paint body in one strong main colour with bright soft top-left highlights, polished gold/brass trim, round brass rivets and knobs, and a cream/ivory chunky base plate with little rounded feet. Soft cel shading, no gradients into the background, no text, no ground shadow, TRANSPARENT background, 1024x1024.

Items 2-4 used the line "same style brief". The crates used the same brief without the base plate: "chunky toy cartoon, 3/4 view from above, thick dark outline, glossy highlights, brass rivets, transparent background, no text, no shadow, no base plate needed. They are rarity tiers, so each should look clearly more valuable than the last."

## Files

| File | Item | Prompt (item part) |
|---|---|---|
| `nail_gun.png` | Nail Gun, Common shooter (packs its row) | a stubby glossy orange-red enamel nail gun on a cream base plate, gold nail magazine strip on top with a few silver nails, brass trigger guard and rivets, a short burst of 3 nails lined up in a row coming out of the nose. |
| `jackhammer.png` | Jackhammer, Rare shooter (ignores armour) | an upright chunky jackhammer in glossy steel-blue enamel with a cream base plate and rounded feet, gold handlebar grips and brass rivets, thick gold piston collar, a heavy silver chisel bit pointing down-forward with a small jagged crack/spark burst at the tip and a cracked armour plate fragment flying off. |
| `gear.png` | Gear, Rare relay (links to another Gear) | a big chunky upright cog wheel in glossy teal/turquoise enamel standing on a cream base plate with rounded feet, a polished gold hub with brass rivets, thick rounded teeth, and a small gold chain-link / connector arm sticking out to one side with a glowing teal spark at its end (showing it links to a partner gear). |
| `saw_blade.png` | Saw Blade, Epic shooter (strong on the board edge) | a chunky circular-saw launcher in glossy royal purple enamel on a cream base plate with rounded feet, gold housing guard and brass rivets, a big shiny silver saw blade with bold rounded teeth half-exposed at the front edge, little white speed swooshes around the blade, one small gold corner-bracket detail on the base (hinting at the board edge). Make it feel a bit more premium/epic than the others. |
| `crate_tool_bag.png` | Tool Bag, Common crate (canvas) | a soft chunky canvas tool bag in warm tan/khaki canvas with stitched seams, brown leather trim and two leather carry handles, a brass zip pull and brass corner studs, closed, with the tips of a screwdriver and wrench handle peeking out of a side pocket. |
| `crate_toolbox.png` | Toolbox, Rare crate (red steel, latch) | a classic chunky metal toolbox in glossy red enamel steel with a cantilever lid, a big shiny gold front latch/clasp as the hero detail, chrome-silver carry handle on top, rounded corners with brass corner caps and rivets, closed. |
| `crate_tool_chest.png` | Tool Chest, Epic crate (rolling cabinet) | a tall chunky rolling tool cabinet in glossy royal purple enamel with 4 stacked drawers, each with a polished gold pull handle, a gold-trimmed hinged lid on top, gold side push-bar handle, brass corner caps and rivets, and 4 small chunky black caster wheels with gold hubs. A faint sparkle glint on the lid. |
| `crate_golden_workbench.png` | Golden Workbench, Legendary crate (gold) | a chunky compact workbench made almost entirely of polished shiny gold, thick gold tabletop with a small gold vise clamped on one end, a cream/ivory pegboard back panel holding a few tiny gold tools, a closed gold drawer with a glowing gem-set latch in the front, sturdy gold legs with rounded feet, warm golden glow and a few star sparkles around it. |

## Notes

- Nail Gun is orange-red, close to the cannon red. If the two look too alike on the board, ask for a re-tint (for example yellow-orange).
- Saw Blade and Tool Chest are both purple, to show Epic rarity. Their colours follow rarity rather than family.
