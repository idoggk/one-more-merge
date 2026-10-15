# ROAD PERF, measured (build #8 vs master vs ROAD PERF 4)

Task t-b7b6e6d7. Everything below is measured in **headless Chrome 155 on a Windows PC**, not on the owner's iPhone. Read "What is NOT measured" before trusting any number as "what the phone does".

## Question and the numbers reported
Why does scrolling the ROAD tab feel slow / get stuck, and what fixes it? Reported per configuration (median of 3 runs of 10 s each): frame time p50 / p95 / max, frames over 33 ms and over 100 ms, fps, long tasks, script ms, draw calls per frame, texture MB, and the slow-motion ratio (road px/s over finger px/s).

## Setup (how it was measured)
- Build: `npm run build`, served by `vite preview` (production bundle, minified).
- Phone emulation: viewport 390x844, deviceScaleFactor 3, touch, CDP CPU throttling 4x and 6x. Canvas ends up 1170x2532 (render scale 1.625).
- Save: `omm.meta.v1` seeded with levelStars 1..59 (late save, current level 60 = boss) or none (level 1); tutorial and road lesson marked done.
- Gesture: synthetic touch drag (15 moves over 400 css px) released as a fling, 900 ms coast, alternate direction every 3 swipes, for 10 s.
- Configurations (QA keys in localStorage): `build8` = roadV2 + ROAD PERF 1+2 ON, PERF 3 OFF, polish OFF; `master` = same + ROAD PERF 3 ON (= master before this task, `omm_qa_road_perf4=off`); `perf4` = this task (default ON).
- Frame times: `requestAnimationFrame` deltas in page. Draw calls: patched `drawElements/drawArrays`. Long tasks: PerformanceObserver. Textures: sum of all Phaser texture sources x4 bytes.
- Profile: CDP Profiler (0.5 ms sampling) at 4x throttle.

Reproduce (about 25 min, close other programs; CPU load changes the numbers):
```
npm install
npm run build
node tools/road-perf-matrix.mjs scratch/final 3     # the whole table below
node tools/road-perf.mjs --cfg perf4 --level 60 --cpu 4 --secs 10 --trace   # one run + top functions
node tools/road-perf.mjs --cfg master --level 60 --cpu 4 --shot a.png       # screenshot
```
Raw per-run JSON is written to `--out` (the matrix keeps it in `scratch/final`, git-ignored).

## Result (median of 3 runs, 10 s each; fps = frames per second delivered while scrolling)
| config | runs | p50 ms | p95 ms (range) | max ms | >33 ms | >100 ms | fps | long tasks | draws/frame | tex MB | speed ratio | lag px p50 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| L60 cpu4  build8 | 3 | 66.7 | 150 (149.9-150.1) | 433 | 104 | 66 | 18.6 | 107 | 11 | 256.9 | 1 | 1.85 |
| L60 cpu4  master | 3 | 66.6 | 149.9 (133.5-150) | 417 | 106 | 56 | 19.2 | 105 | 11 | 256.9 | 1 | 8.71 |
| **L60 cpu4  perf4** | 3 | **16.7** | **49.9 (33.5-49.9)** | 450 | 49 | **1** | **46.1** | 24 | 11 | 352.2 | 1 | 1.85 |
| L60 cpu6  build8 | 3 | 16.9 | 216.7 (216.6-283.3) | 433 | 81 | 68 | 17.8 | 81 | 0* | 256.9 | 1 | 1.85 |
| L60 cpu6  master | 3 | 16.8 | 266.6 (233.4-266.7) | 450 | 54 | 49 | 12.1 | 54 | 0* | 256.9 | 1 | 8.9 |
| **L60 cpu6  perf4** | 3 | 16.8 | **100.1 (99.9-166.5)** | 550 | 93 | **13** | **22.9** | 89 | 11 | 350.0 | 0.99 | 1.85 |
| L1 cpu4  build8 | 3 | 16.7 | 983 (367-1050) | 1233 | 46 | 37 | 12.3 | 61 | 0* | 178.1 | 1 | 0 |
| L1 cpu4  master | 3 | 16.7 | 967 (683-1017) | 1133 | 56 | 30 | 17.4 | 64 | 0* | 178.1 | 1 | 6.57 |
| **L1 cpu4  perf4** | 3 | 16.8 | **66.6 (50.2-67.2)** | 533 | 84 | **3** | **33.9** | 41 | 10 | 306.5 | 1 | 1.85 |
| L1 cpu6  build8 | 3 | 16.8 | 583 (533-683) | 1167 | 49 | 32 | 12.2 | 52 | 0* | 144.2 | 1 | 0 |
| L1 cpu6  master | 3 | 16.8 | 700 (467-1167) | 1483 | 47 | 31 | 9.2 | 49 | 0* | 178.1 | 1 | 1.85 |
| **L1 cpu6  perf4** | 3 | 16.9 | **116.6 (100-116.7)** | 650 | 105 | **15** | **23.1** | 85 | 10 | 306.5 | 0.98 | 5.02 |

\* the draw-call counter reads 0 in some runs (the patched GL call was not hit while the page was starved); ignore those cells.
p50 alone is misleading under heavy load (the browser alternates a few fast frames with long ones, so the median can be 16.7 ms while fps is 12): read fps, p95 and ">100 ms" together.

Render scale (flag off, level 60, cpu 4x): `?rs=1` 12.3 fps, `?rs=1.25` 13.2 fps, default (1.625) 19.2 fps. Cutting the resolution did **not** help here (software GL in headless Chrome is not GPU fill-bound; a real GPU may differ). No render-scale cap was added.
Synthetic art stand-in (`--fakeart`: 8 scenery pictures 1024x1536 + 15 node frames 512x512, level 60, cpu 4x): master 12.8 fps (p95 233 ms), perf4 32.1 fps (p95 66.7 ms): the baked road still wins with large pictures present, but see the memory note.

## Top 5 costs by function (master, level 60, cpu 4x, CDP profile, 10 s)
All inside Phaser's `Graphics` drawing. A Phaser Graphics is re-triangulated and re-batched **every frame it is visible**:
1. `GraphicsWebGLRenderer` (phaser chunk, minified `i`): 1.75 s
2. earcut triangulation (`f`, `r`, `S`, `c` in the same chunk): 1.40 + 1.53 + 0.57 + 0.42 = 3.9 s
3. `batchFillPath`: 0.77 s
4. `(program)` (native: GL/uploads/idle): 0.96 s
5. `AudioContext` creation (page start): 0.41 s, plus `bufferData`, `batchLine`, `batchQuad` below 0.13 s each.
Graphics drawing is about 6.5 of ~9 s sampled. Which Graphics: road path ground and surface (per segment), verge props per chapter, gates (arch with ~100 points), far scenery bands (chapter 1 "tiles" style = 12,575 command words, which alone cost level 1 about 6 fps), node ribbons and plates, the navigation bar.

## The fix: ROAD PERF 4 (QA switch `roadPerf4`, default ON, OFF = master behaviour)
1. `src/game/road/roadBake.ts`: static Graphics (path pieces, props, gates, far bands, node ribbons/plates/shields, chest plates, nav bar, scrim) are replayed once into a canvas texture chunk (512 design px high, at render scale capped to 1.25) and drawn as an image. Chunks are made when they come within 450 px of the view (at most one ahead per update, the visible ones at once) and destroyed beyond 900 px, so memory stays bounded. The Graphics keep their commands out of the renderer (empty buffer), same draw order. Lazily baked: no big hitch at open.
2. `src/game/road/roadScroll.ts` + `roadPerf4.ts` (slow-motion causes, see below).
Screenshots of flag ON and OFF at level 60 and level 1 look the same (edges are about 1.3x softer on baked pieces because textures are made at render scale 1.25, the phone canvas is 1.625).

## Slow motion (iPhone 14 Pro Max report), checked item by item
1. **Drag-follow smoothing / lerp**: none. The drag sets `scroll = startScroll + (finger - down)` directly (roadScroll.ts); the measured speed ratio (road px/s over finger px/s, middle 60% of each drag) is 1.00 (0.96-1.06) in every config. Rubber band only past the ends. So slow motion is not a damped drag.
2. **dt clamping**: yes, found. The coast used Phaser's smoothed frame delta **capped at 50 ms** (`Math.min(dt, 50)`), so a frame that really takes 100 ms advanced the coast by 50 ms of motion: the fling ran at about half speed. Also the finger samples used the frame clock (`scene.time.now`), so several touch events in one slow frame got the same stamp and the release velocity was misread (often 0). Harness evidence: after release the old code coasted 0 px in 300 ms at 4x and 6x throttle in every run of build8 and master (fling gain 0), perf4 coasted 17-43 px with the same gesture. (The harness gesture is not a real finger; absolute fling numbers are a comparison, not a feel measure.)
   Fix (ROAD PERF 4): coast uses real elapsed time (`performance.now`, capped at 100 ms for stalls) and finger samples use the browser's event time.
3. **Phaser fps config**: no `fps` override unless `?timer`; Phaser runs on `requestAnimationFrame`, so a 120 Hz iPhone gets rAF at its refresh rate and there is no 60 Hz cap in our code. `smoothStep` stays at Phaser's default (the delta is averaged over 10 frames, which is why we no longer use it for coasting). Safari's own rAF behaviour on ProMotion (it may throttle to 60 Hz or lower on low power mode) was not measured.
4. **Work in pointermove**: every move event called the full redraw (parallax, culling, chip, clouds). On a 120 Hz touch screen that is 2 per frame. Now the newest drag position is applied once per frame in the update step (same frame, no added latency). Measured cost of a redraw call is small (about 0-1 ms/s in the readout), so this is a minor saving.
Conclusion on cause: the slow motion is mostly the **frame rate collapsing** (CPU-bound Graphics re-triangulation: ~19 fps at 4x CPU, 12 fps at 6x) plus the 50 ms cap that makes the coast run in slow motion exactly when frames are slow. Both are fixed under ROAD PERF 4.

## "New art" (road kit pieces, chapter panels, badges): what could and could not be checked
- **Not measured with the real art.** On this branch (and in all branch history) there are no road-kit images: no `chapterScenery_*`, `nodeFrame_*`, `pathTile`, `road_<chapter>_<piece>` files exist in `src/assets/art` (only `road_bg`, `road_seg`, node_*). If the new art lives in another worktree or only in the ChatGPT downloads, it is not part of this build, so it cannot be what the owner sees. The Lead should confirm which build #7/#8 art the owner means.
- What the code would do with such art (read, plus the `--fakeart` run above): each chapter draws 5 full-width scenery images (3 distinct + flipped copies) = 40 large quads for 8 chapters (culled per chapter, so about 5-10 on screen); art is loaded through `loadLazyArt` batches after the first frame and uploaded to the GPU on load (Phaser uploads at load), so each new picture can cost a decode + upload hitch of a few ms to tens of ms. With fake 1024x1536 pictures perf4 stayed at 32 fps (4x CPU) vs 12.8 for master.
- Texture memory is already large: **257 MB** of RGBA for 914 textures before any road kit (boss 44.6 MB, monsters 28.7, stages 19.3, hero 13.6 ...), all uploaded at load. ROAD PERF 4 adds about **+95 MB** at level 60 (+49 MB at level 1) of baked chunks (they are dropped again when far). On a phone with tight GPU memory that matters: if memory warnings or tab reloads appear on the iPhone, lower `chunkH`/`bakeMargin` in `roadBake.ts` or set the switch OFF.
- Not tested: pixel-ratio 3 rendering on a real GPU (the game already caps render scale at 2, effective 1.625 on this size), atlases (none exist: every image is its own texture; 914 textures), per-frame tint/blend changes (node tints are set once at build).

## What is NOT measured
- A real iPhone / Safari / Metal GPU (all numbers: Chrome 155, Windows, software WebGL via SwiftShader, CPU throttling is an emulation). GPU fill-rate, Safari rAF/ProMotion behaviour, thermal throttling and iOS memory pressure are unknown.
- The real new art (see above).
- GC pauses: Chrome's profile shows `(garbage collector)` at 0.14-0.21 s per 10 s (small); no separate GC trace.
- Hitches when a **new chapter** scrolls in were only seen indirectly: max frame 417-450 ms in every config (also with flag ON), likely the first bake of a chunk plus lazy art upload at 4x throttle; not isolated.
- Real finger speed, palm motion, multi-touch.
- Run-to-run spread is shown (range of p95 over 3 runs); 3 runs is a small sample.

## Flags and safety
`roadPerf4` default ON, OFF restores master's road drawing and scroll maths exactly (flags-off golden `tests/flagsOff.test.ts` unchanged and passing). Presentation only, no game state touched. `GameScene.ts` untouched.
