# ROAD STABLE (owner: "the picture vibrates a bit while dragging")

Task t-72625fb0. Measured in headless Chrome (SwiftShader) at 390x844, DPR 3, touch, canvas 1170x2532 (render scale 1.625, 1 canvas px = 1 device px). **Not measured on the iPhone**; whether it feels steadier on a 120 Hz ProMotion screen is for the owner to judge. QA switch `roadStable` (default ON; OFF = previous placement). Presentation only; `src/core`, levels, GameScene.ts untouched.

## Root cause (measured, then fixed)
The scroll value is a fractional design px and the canvas is 1.625 device px per design px, so almost every layer lands between device pixels and is filtered. Worse, the layers round differently: clouds to whole design px (1.625 device px steps), far scenery not at all (`scroll*0.8`, fractional), sky/road fractional. Result: layers sit at different sub-pixel phases and shimmer against each other (and every baked texture is linearly blended) while the road moves.
Ruled out by reading + measurement: drag smoothing (none, drag is direct), lerp overshoot (none; 0 direction reversals on every scroll layer, before and after), pointermove timing (already once per frame in ROAD PERF 4), `roundPixels` (not used), zoom (RS) is the source of the fractions, not a bug.

## Fix
`src/game/road/roadStable.ts` `snapDev(v, RS)` rounds to whole device pixels. In `roadV2.ts` the scroll that feeds every layer is snapped once per frame (`onScroll`), and the far-scenery layers, sky and clouds are snapped from that same value. Internal scroll/fling state stays exact, so coasting speed and feel are unchanged. Drag-delta reading, dt and smoothing needed no change (nothing oscillates). Cost: the 0.8 parallax layers now step in whole device pixels (<= 0.5 px relative error) instead of blending.

## Numbers (level 60, no CPU throttle, 3 runs each, slow drag 300 events at 0.7 css px/8 ms, then fling; one run = 1000-1300 frames)
Layers measured: sky, clouds, far-scenery containers (11 moving layers). `fracShare` = share of frames where the layer's drawn offset is not a whole device pixel.

| phase | ROAD STABLE | mean fracShare (3 runs) | mean residual rms vs road (device px) | worst residual rms | direction reversals |
|---|---|---|---|---|---|
| slow drag | OFF | 0.960 | 0.075 | 0.809 | 0 |
| slow drag | ON | **0.000** | 0.538 | 0.698 | 0 |
| fling | OFF | 0.945 | 0.062 | 0.672 | 0 |
| fling | ON | **0.000** | 0.681 | 1.040 | 0 |

Reading it honestly: sub-pixel drawing went from ~95 % of frames to 0 and all layers now move in the same whole-pixel grid. The "residual rms" (motion a layer has that the road does not explain) goes **up** with ON because parallax layers now move in whole-pixel steps instead of a smooth fractional glide: that is the price of snapping, bounded by 0.5 px (rms 0.5-0.7). I could not measure which of the two the eye finds calmer; if the iPhone still shows shimmer in the far scenery, the next step is to drop the 0.8 parallax (farK 1) so everything moves in lockstep. Not tested: real GPU, Safari, finger noise (synthetic touch, same for both).

## Performance (ROAD PERF 1-4 must not regress), level 60, CPU 4x, 10 s x 3 runs, `road-perf.mjs`
Format fps / p50 ms / p95 ms / frames over 100 ms, per run:
- ROAD STABLE OFF (`--cfg stableoff`): 35.5/16.7/66.6/4, 33.2/16.8/83.5/10, 31.5/16.7/116.7/21
- ROAD STABLE ON (`--cfg perf4`): 34.8/16.8/67/10, 46.7/16.7/50/1, 40.8/16.8/66.6/7
Medians: OFF fps 33.2, p95 83.5; ON fps 40.8, p95 66.6. Run-to-run spread is large (3 runs, shared PC), so the honest statement is "no regression seen", not "faster". (ROAD_PERF_MEASURED.md perf4 row: 46.1 fps / p95 49.9 on an earlier, quieter machine state.)

## Reproduce
```
npm install && npm run build
node tools/road-stable.mjs --cfg off    --runs 3 --out scratch-off.json      # old placement
node tools/road-stable.mjs --cfg stable --runs 3 --out scratch-stable.json   # ROAD STABLE (default)
node tools/road-perf.mjs --cfg stableoff --level 60 --cpu 4 --secs 10 --runs 3
node tools/road-perf.mjs --cfg perf4     --level 60 --cpu 4 --secs 10 --runs 3
```
Tests: `tests/roadStable.test.ts` (snap lands on device pixels, <= half a pixel error, monotonic, idempotent), `tests/qaPanel.test.ts` (registry row).
