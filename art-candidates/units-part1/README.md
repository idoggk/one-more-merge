# Unit art, part 1 (13 units)

ChatGPT art made in the owner's 'Create Tray Asset' chat (same chat as the existing unit art, so the style matches).
Not imported into the game (src/ untouched); a later task wires these in.

Files: `unit_<id>.png` (512x512, transparent, gadget centred, fitted to 460 px) and `unit_<id>.webp` (256x256).
`contact_sheet.png` = numbered overview on a dark grey background. `raw/sheet1..3.png` = untouched ChatGPT outputs (white background).

Ids: wrench, piston, spring, belt_drive, blowtorch, pipe, blast_plate, tesla_tower, capacitor, blueprint, ladder, rewind_crank, crane.

## Prompts

Sheet 1 (wrench, piston, spring, belt_drive, blowtorch, pipe; 3x2):
> Create image, same style as my gadget art: sheet of 6 chunky toy-like 3/4 gadgets in a 3x2 grid, equal cells and wide gaps, thick dark outline, glossy enamel body, gold/brass trim and rivets, cream base plate with rounded feet, no text, no shadow, pure white background. 1 big brass spanner standing on a plate. 2 red pneumatic piston punch with 4 short pistons poking out. 3 yellow compressed coil spring with an arrow cap. 4 orange conveyor belt segment with two rollers. 5 brass blowtorch with blue flame jet. 6 copper T-junction pipe with a valve wheel and glowing water.

Sheet 2 (blast_plate, tesla_tower, capacitor, blueprint, ladder, rewind_crank; 3x2):
> Create image, same style as the last sheet: 3x2 grid of 6 chunky toy-like 3/4 gadgets, equal cells and wide gaps, thick dark outline, glossy enamel, gold/brass trim and rivets, cream base plate with rounded feet, no text, no shadow, pure white background. 1 thick riveted steel plate with a dent. 2 Tesla tower coil with blue lightning, legendary gold trim. 3 cylindrical capacitor with a glowing charge ring. 4 rolled blueprint with a glowing grid and a pencil. 5 short step ladder with glowing numbered rungs 1-4. 6 hand crank with a clock face and a curved back arrow.

Sheet 3 (crane, single):
> Create image, same style as the last sheet: one chunky toy-like 3/4 small tower crane with a hook, legendary gold trim, glossy enamel, thick dark outline, brass rivets, cream base plate with rounded feet, no text, no shadow, pure white background, centered with wide margins.

## Slicing

ChatGPT cannot output a transparent background, so the white background was keyed out by flood fill from the sheet corners (interior whites are kept), each cell cropped to its bounding box, scaled to fit 460 px, centred on 512x512. Sheet 1 row 2 uses custom column splits because the blowtorch flame reaches toward the pipe.

## Known flaws

- Blowtorch / pipe / belt_drive have a few stray 1-2 px specks from the keying (a speck near the flame tip, one top-left of the pipe). Fix when wiring in by removing small connected components.
- Edge pixels keep a faint light fringe on a dark background.
- Support-card style: wrench and blast_plate come out in the same full-gadget format as the others (no separate card frame).
