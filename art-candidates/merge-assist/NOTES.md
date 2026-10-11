# MERGE ASSIST (t-8426336a): findings and what was built

Owner: new players have a hard time with the first merges (dragging one part onto a matching part); suggests a bigger landing box.

## How a merge is input today (before the assist)
- Pointer wiring: `src/game/GameScene.ts:261` (`pointerdown/move/up/upoutside` -> `onDown`, `onMove`, `onUp`).
- Press: `onDown` (`GameScene.ts:1036`) picks the part under the finger with `cellAt` (`:964`, exact cell box, 124 design px = 67.2 css px on 390 wide).
- Drag start: `onMove` (`:1099`) ignores movement under 12 design px (6.5 css px); then the part lifts `DRAG_LIFT_TOUCH` = 85 design px (46 css px) ABOVE the finger (`sceneKit.ts:13-14`, `placeDrag` `:1259`). It is drawn above the finger, straight up, not left.
- Target: the cell nearest the PART (not the finger) within 0.8 cell, with hysteresis (`targetCell` `:975`). Because the part floats 0.69 cell above the finger, a finger put ON the target puts the part on the cell above.
- Highlight while dragging: `drawHeld` (`:1593`): non-matching parts dim to 45%, every matching part gets a static double ring, the hovered target gets the cascade preview.
- Release: `onUp` (`:1268`). A tap (no drag) opens the part card (or "DRAG it onto its match!" in the tutorial, `:1302`). A drop: matching = merge; empty cell = move; non-matching = bounce back with "Rank 2 != Rank 3" (`commitDrop` `:1440`, swap is opt-in); off board / own cell = `rejectDrop` (`:1338`, `dropFeedback.ts`) with a rate-limited hint.
- Near miss before the assist: the drop goes to whatever cell is nearest, never to a farther matching one. So a near miss is a silent MOVE or a bounce.
- Tutorial / first levels: `GameScene.runTutorial` (`:1909-1950`) with the coach hand drawing the drag (`coach.drag`), `x_chain` tip, hint pair after 8 s idle (`update`, "hintPair"). No arrow or ring on a normal level 1-3 drag.

## Measured (tools/merge-assist-probe.mjs, headless Chrome 390x844, touch emulation, 25 drags per cell, finger error 10-12 css px in a random direction)
Hit area of a cell: 67 x 67 css px (the cell box). With the assist a valid partner is picked when the part is within 0.7 cell of its box: 161 x 161 px (5.8x the area), valid partners only.

| aim | assist | L1 miss | L2 miss | L3 miss |
|---|---|---|---|---|
| lifted PART aimed at the target | OFF | 0% | 0% | 0% |
| lifted PART aimed at the target | ON | 0% | 0% | 0% |
| FINGER put on the target (forgets the part floats above) | OFF | 84% | 56% | 100% |
| FINGER put on the target (forgets the part floats above) | ON | 0% | 0% | 0% |

Reading: a player who understands the lift never misses at 10-12 px. A new player aims the finger at the target, and then 56-100% of drags miss, because the part lands on the cell above (a silent move or a bounce). That, not the box size, is the first-merge problem; the assist fixes it by snapping to the valid partner.

## Built (flag TUNING.mergeAssist, default 'off'; Settings > MERGE ASSIST: OFF / ON / AUTO; QA row MERGE ASSIST)
- `src/game/mergeAssist.ts` (pure): `assistActive` (AUTO = saga level 1-10 AND under 30 lifetime merges, `meta.merges`), `snapTarget` (nearest valid partner from `legalPairs` within 0.7 cell of its box), `soleMergePair`, `toastAllowed` (levels 1-5, max 2 per level).
- (a) forgiving drop: `GameScene.assistCell` used by `onMove` hover and `onUp` drop. Never a non-matching part: candidates come only from the game's own legal pairs.
- (b) `drawAssist` (per frame): soft pulsing ring on every valid target, thin snap line from the held part to the nearest valid target; the held part floats up-left of the finger by 0.6 cell (`liftX`, `lift`); invalid parts are already dimmed by `drawHeld`.
- (c) tap shortcut: when the board has exactly ONE legal pair and the player is idle 1.2 s, a "MERGE" label and pulse mark it; a tap on either part merges (never automatic). Otherwise a tap still opens the part card.
- (d) failed drop (off board / own cell): spring back + small shake of the part (not with reduced motion or SCREEN SHAKE OFF) + "DROP ON A MATCHING PART" toast, levels 1-5, max twice per level. A bounce on a non-matching part keeps its own message and only shakes.
- (e) reduced motion: steady rings, no label scale, no shake. No change to rules, supply or clock (the core never reads the flag; tested by state hashes).

## Screenshots (390x844, assist ON, finger shown as a faint dot)
1-highlight-and-offset, 2-snap-line-near-miss, 3-snapped-ready-to-drop, 4-tap-hint-merge-pair, 5-failed-drop-toast, 6-tap-merged. Regenerate: `node tools/merge-assist-shots.mjs`.
