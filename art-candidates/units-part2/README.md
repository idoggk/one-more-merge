# Unit art, part 2 (9 units)

ChatGPT art made in the owner's 'Create Tray Asset' chat (same chat as part 1, so the style matches). Not imported into the game (src/ untouched); a later task wires these in.

Files: `unit_<id>.png` (512x512, transparent, fitted to 460 px) and `unit_<id>.webp` (256x256). `contact_sheet.png` = numbered overview on dark grey. `raw/sheet1..2.png` = untouched ChatGPT outputs (white background).

Ids: dynamo, wrecking_ball, robot_arm, tilt_lever, rivet_gun, vice, router, hydraulic_press, lathe.

## Prompts

Sheet 1 (dynamo, wrecking_ball, robot_arm, tilt_lever, rivet_gun, vice; 3x2):
> Create image, same style as the last sheet: 3x2 grid of 6 chunky toy-like 3/4 gadgets, equal cells and wide gaps, thick dark outline, glossy enamel, gold/brass trim and rivets, cream base plate with rounded feet, no text, no shadow, pure white background. 1 copper dynamo with a spinning flywheel and a lightning ring, legendary gold trim. 2 steel wrecking ball on a short crane chain, scuffed. 3 yellow industrial robot arm with a clamp hand and a small screen, legendary gold trim. 4 big red pull lever on a tilted steel plate with arrows, legendary gold trim. 5 brass rivet gun with a trigger and a rivet magazine. 6 steel bench vice, jaws open.

Sheet 2 (router, hydraulic_press, lathe; 3x1):
> Create image, same style as the last sheet: 3x1 row of 3 chunky toy-like 3/4 gadgets, equal cells and wide gaps, thick dark outline, glossy enamel, gold/brass trim and rivets, cream base plate with rounded feet, no text, no shadow, pure white background. 1 angled L-shaped pipe junction in teal. 2 blue hydraulic press with a glowing piston and a heavy plate below. 3 small workshop lathe with a spinning chuck.

## Slicing

White background keyed out by flood fill from the sheet edges, enclosed pure-white pockets (>1200 px) also cleared, small specks dropped, each cell cropped to its bounding box, scaled to 460 px and centred on 512x512. Sheet 2 uses custom column splits (the generated image is 2172x724 with uneven gaps).

## Not redone / status of the other requested units

- nail_gun, jackhammer, gear, saw_blade: not redone. Candidates exist on branch orch/t-49ce458b (art-candidates/roster-b1/); not re-checked for style here.
- signal_beacon, fan, magnet, battery, amplifier: pictures already exist in src/assets/art (`<id>_1..6.webp`), so no new art was made.
- Missing after this task: none of the nine listed new units; every unit in the list has a picture somewhere.

## Known flaws

- A faint white hairline remains inside a few gaps (wrecking ball chain, rivet gun grip).
- Edge pixels keep a faint light fringe on a dark background.
- Lathe comes out red, not the generic style colour; fine for a distinct unit.
