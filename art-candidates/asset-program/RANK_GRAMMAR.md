# Rank grammar: one ladder for all 39 units

Goal: every unit has **8 ranks that read as one machine growing up**, where the silhouette changes at every step and you can tell the rank from across the room. Today the 22 roster-B units have one picture for all ranks, 9 originals stop at rank 6, and even the best ladders (Coil) break: Coil rank 5 is a different object.

Scope assumed: art for ranks 1-8 for all 39 units (the engine already shows 7-8 for shooters and relays in Saga L21+; helpers stop at 6, their 7-8 art is only for completeness). Raising the rank cap above 8 is a gameplay change and is **not** part of this program.

## The ladder (same for every unit)

Rule 1: **rank N = rank N-1 plus one clearly visible change.** Prompts say it in those words; it keeps the machine the same machine.
Rule 2: the change is a **new part that alters the outline**, never only a detail inside it. Every step must pass IoU < 0.93 against the previous rank on the review sheet.
Rule 3: **material upgrades at 3, 5 and 7**; geometry grows at every rank; the camera, the base plate shape and the family colour never change.
Rule 4: art stays **clean outside the object**: no aura, glow halo, crown, rank text or free particles. The game adds glow, crown and plinth in code (see `art-candidates/rank-looks`). Glowing cores, gems, flames and lightning that are part of the machine are fine.

| Rank | Name | Geometry (silhouette) | Material and colour | Size on plate |
|---|---|---|---|---|
| 1 | Prototype | One simple main part, the unit's idea in its plainest form | Painted steel and enamel, no brass | smallest |
| 2 | Tuned | + one functional part (second tube, gauge, nozzle, blade) | same, brighter paint | +4% |
| 3 | Brass | + one attachment; plate gets brass corners | **Brass trim and rivets appear** | +8% |
| 4 | Reinforced | + a major module that widens or doubles the body | brass everywhere it should be | +12% |
| 5 | Gilded | + a feature part (window, dial, second tier) | **Gold replaces brass on key parts; a glowing core** | +16% |
| 6 | Master | the biggest silhouette change: a second tier, housing or twin | gold plate edge, gem or lit core | +20% |
| 7 | Mythic | + solid floating parts attached by arcs, pipes or rings | **Crystal / plasma material on the core**, white-gold trim | +24% |
| 8 | Apex | everything at once, ornate, symmetrical, the most impressive thing on the board | gold-and-white, brightest core | +28% |

Size growth is guidance for the prompt ("a little bigger at each step"); the game fits every sprite into the same box, so the **outline change is what the player reads**.

## Plans per unit

Format: what each rank adds. Write plans for a unit only when its sheet is about to be generated, so a plan can still change after the pilot.

### Piston (pilot) · shooter, Common · rust red `#d05a3a`
Job: pneumatic punch that hits harder with open space around it (steam vents toward empty cells).

1. One stubby red cylinder with a flat piston head on a plain cream plate, one small nozzle.
2. + a small silver pressure gauge on the side and a second short rod.
3. + brass rings on the cylinder, brass rivets and brass corners on the plate.
4. + four short pistons in a cross around the cylinder, with a steam vent pipe on each side.
5. Gold rings and piston heads; a round glass window showing a glowing orange pressure core; gold plate edge.
6. + a tall central hydraulic cylinder rising behind, with a big gold flywheel on the back; clearly bigger body.
7. The core becomes a blue-white crystal pressure chamber; a ring of gold mini-pistons attached by short pipes floats around the top.
8. Eight pistons in a star around a crowned gold manifold, glowing crystal core, small solid gears riding on the pipes; gold-and-white ornate plate.

### Blowtorch (next) · shooter, Rare · orange `#ff7a1a`
Job: a flame cone up the column.

1. Small brass torch with a short blue flame, a little fuel canister, plain plate.
2. + larger canister with a pressure gauge; longer flame.
3. + brass rings, a red valve wheel, rivets.
4. + a second nozzle fed by a copper manifold and a side fuel tank.
5. Gold nozzle, glowing blue-white flame core, gold plate edge.
6. Three-nozzle burner head on a tall tank with a gauge cluster; clearly bigger.
7. Crystal fuel tank glowing orange and blue; plasma flames; solid brass rings floating around the head.
8. Five-nozzle flame crown in gold and white, large glass tank, symmetrical.

### Tesla Tower (next) · shooter, Legendary · ice cyan `#6ad0ff`
Job: forked lightning that grows with charges.

1. Short single brass coil with a small orb on top, one tiny spark.
2. Taller coil + two small side insulators.
3. + brass rings, rivets, a bigger orb, two short side arcs.
4. + a small tower on each side joined to the main one by copper arcs.
5. Gold orb with a lit core, a crackle ring, gold plate edge.
6. Three-tier coil, a large orb with lightning visible inside, four insulator fins.
7. Crystal orb (blue-white), a ring of three small orbs floating around it, joined by arcs.
8. Five-tower array around a giant crystal orb on an ornate gold-and-white plate.

## Order of work (after the pilot is approved)

Priority follows `docs/art/ART_BIBLE.md` 5.2: Common and Rare first.

| Batch | Units | Sheets |
|---|---|---|
| P0 pilot | Piston | 1 |
| P1 | Blowtorch, Tesla Tower, Wrench, Spring | 4 |
| P2 | Rivet Gun, Vice, Pipe, Router, Blast Plate | 5 |
| P3 (Epic) | Belt Drive, Capacitor, Blueprint, Ladder, Rewind Crank, Hydraulic Press, Lathe, Wrecking Ball | 8 |
| P4 (Legendary) | Crane, Dynamo, Robot Arm, Tilt Lever | 4 |
| P5 | Ranks 7-8 only for Magnet, Battery, Fan, Amplifier, Signal Beacon, Mortar, Arc Welder, Horn, Fuse Box (2-cell sheets, matching their rank-6 picture) | 9 |

Total: 22 sheets of 8 + 9 small sheets = 194 pictures. Budget per sheet: up to 3 prompt rounds (see `RUBRIC.md`).

## Support-card units (Wrench, Blast Plate, Blueprint, Rewind Crank, Tilt Lever)

They are off-board cards, but the card still shows a rank. They follow the same ladder as machines (a tool that grows), not a different style.
