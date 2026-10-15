# Unity port plan (t-08f9abe0, mission m-14f57005)

Owner (2026-10-15): "start thinking about the process of moving One More Merge into Unity." This is a thinking doc. Nothing is built, nothing is bought, `src/` and level files are untouched. Sizes are measured from the repo on this branch; effort is S (days), M (weeks), L (months).

## Summary (read this first)

- **The game logic is already portable.** `src/core/` is 8,638 lines of pure TypeScript, 40 files, no Phaser, all randomness through one tiny seeded generator (`rng.ts`, mulberry32, state is one uint32). The levels, puzzles, yards and tuning are JSON or plain constants. Only `src/game/` (about 23,000 lines, Phaser) is tied to the web.
- **Recommendation: Option A, port the core to C# with the TS core as the reference, proved by a parity test harness** (same seed + same actions = same state hash as the TS golden file and sims). Data JSON is shared, UI is rebuilt in Unity. Do a 3-4 week spike first; only continue if parity passes.
- **Keep the TS core alive** (as the reference and for the balance tools) until Unity has passed phase 1. Do not rewrite and lose the bots.
- **Money:** Unity Personal, Android builds and a Windows/Mac editor test loop are free. iOS needs a Mac and a paid Apple Developer account. Nothing is spent without the owner: see section 7.
- **Honest limit:** the owner plays on an iPhone 14 Pro Max (Safari). Until there is a Mac, we cannot build or test the iOS app. The web build stays the way to play on the phone during the whole port.

## 1. Goals and what "moving" means

Why move (assumed, please confirm in question 1): a real store app, better touch feel and performance than Safari (the road drag is currently slow-motion on his iPhone), native audio, animation tooling, and one engine shared with the Pulse Patrol project.

Three meanings of "moving":

| Meaning | What it is | Verdict |
|---|---|---|
| Full rewrite | Rebuild rules, content and UI in Unity from the design docs | Rejected. Throws away 8.6k lines of tested rules and the balance fits (levels, HP, star times, 120 daily seeds). Every number would drift. |
| Port with TS core as reference | Translate the pure core to C#, prove it equals TS, rebuild only the presentation | **Recommended** (Option A) |
| Unity hosts the web build | Unity app embeds a WebView or a JS engine running the existing game | Options B and C below. Keeps Phaser or the core, but does not give Unity-native UI, animation or art workflow. |

## 2. What is in the repo today (facts)

| Area | What | Port relevance |
|---|---|---|
| `src/core/` | 40 modules, 8,638 lines. Largest: `game.ts` 1,649 (state, `drop`, `scrap`, `choosePerk`, fixed 50 ms `tick`), `cascade.ts` 975 (bounded BFS resolver), `screwObject.ts` 573, `boss.ts` 468, `screw.ts` 463, `yardSolver.ts` 351, `marks.ts` 277, `support.ts` 276, `puzzle.ts` 207. Rosters 1-7 are about 100-150 lines each. | Pure, deterministic. This is the port target. |
| Pure-ness check | `grep -i phaser src/core` only hits comments saying "no Phaser". No `Math.random`. Two clock uses: `rush.ts` `weekId(now = Date.now())` (a default argument, caller can pass the time) and `yardSolver.ts` `performance.now()` (timing only, not in results). | Easy to keep deterministic. |
| Randomness | One `Rng` class, saved streams (supply / perk / kickback). Seed + actions = identical state (invariant in `tests/core.test.ts`). | Mulberry32 is 5 lines; trivial in C# with `uint`. |
| `src/content/` | 3,103 lines of TS (units, rosters 1-7, perks, tuning, flags, openings, yard objects, art registry) plus JSON: `levels.json` (53 KB, 80 levels), `puzzles.json` (148 KB; 40 dailies + drills), `yards.json` (32 KB), `budgetLevels.json`, `levelPace2.json`, `levelEconomy.json`, `effortOverlay.json`, `rush.json`. | JSON is shared as-is. The TS constant files (`tuning.ts`, `units.ts`, rosters) need to become JSON (generated from TS) so both sides read one source. |
| `src/game/` | About 23,000 lines Phaser: `GameScene`, `ObjectYardScene`, `ScrewScene`, `ui/` (HUD, results, settings, pause, QA panel, road/machine/events/units tabs, crate screens), `road/` (road map, badges, kit, perf, scroll), `fx/` (Bolt animator, juice, shots, crate moments, resource fly, idle director), `textures.ts` (procedural fallbacks), `audio.ts` | Rebuilt in Unity. Not portable. The pure helpers inside it (`scrollMath`, `juiceMath`, `*Model.ts`, `*Layout.ts`) are small and already tested; they are good port candidates because they carry the tuned feel numbers. |
| Audio | `audio.ts` uses WebAudio (`AudioContext`) with synthesised noise and tones; no sound files in the repo. | Nothing to import. Sounds must be re-created as clips or re-synthesised in Unity. A real gap. |
| Art | `src/assets/art/` 493 files, 16 MB (keys `cannon_1..6`, `coil_*`, `bell_*`, `target_*`, `icon_*`, rosters, road kit, badges). Missing keys fall back to procedural textures. `assets_src/` 8.8 MB (icon, store shots). `art-candidates/` 314 MB (working batches, mocks, contact sheets, `screw-yard-3d`). | PNGs reusable. `art-candidates` is a source archive, not shipped. |
| Art pipeline | ChatGPT paints sheets and full-page mocks, `tools/slice-sheet.mjs` (+ gates, `docs/art/SLICING.md`), `import-art.*`, `gen-asset-registry.mjs` + `build-asset-hub.mjs` (asset hub), `docs/art/ART_BIBLE.md`. Screw Yard 3D sprites: `tools/render-yard-3d.mjs` (three.js 0.170 primitives, one fixed light rig, headless Chrome, transparent PNG). | All of it outputs PNG; it keeps working unchanged and feeds Unity. |
| Save | `localStorage` (`game/meta.ts`, settings, `main.ts`). JSON blob; `tests/saveCompat.test.ts`, `backup.test.ts`. | Replace with a file save (JSON). Keep the same JSON shape so web saves could import. |
| Analytics | None found as a service. `experiments.ts` is local flag assignment; `buildInfo.ts` shows the build sha. | Nothing to port. A service would be a new, owner-approved decision. |
| QA panel / flags | `TUNING` flags, `ui/qaPanel.ts` (39 `qaFlag`/`qaChoice` entries), `qaKit`, `qaLayout`, QA guide docs. `tests/flagsOff.test.ts` + `tests/golden/flagsOff.json` prove flags OFF = old behaviour (12 level hashes + tuning digest). | Flags move to C# config + an in-game QA panel (uGUI). The golden file is the parity oracle. |
| Tests | About 108 Vitest files. Core ones: `core.test.ts` invariants, `golden/flagsOff.json`, per-roster, boss, cascade, puzzle, yard, replay, resume, saveCompat, levelReport, endless. | Core tests are the parity spec. UI tests (`road*`, `*Layout`, `mapBadges*`) test pure geometry only. |
| Tools | `tools/sim.ts` (balance bots), `sim-levels.ts` (HP fit), `level-report.ts` (4 bots per level), `level-duration.ts`, `fit-goals.ts`, `star-times.ts`, `daily-seeds.ts`, `gen-puzzles.ts`, `gen-yards.ts`, `rank-difficulty.ts`, many more. Run with `vite-node`. | Heavy users of the core. See section 4. |
| Build/deploy | `npm run build` (tsc + vite), `npm run deploy` (`tools/deploy.mjs`) force-pushes `dist/` to gh-pages: https://idoggk.github.io/one-more-merge/. PWA (`public/sw.js`, manifest). Artifact channel: `npm run artifact`. | Stays as the web channel. |

Determinism hazards when translating (known, checkable by the parity harness):
- JS numbers are doubles, C# `double` matches. Avoid `float`.
- `Math.round` rounds .5 up; C# `Math.Round` rounds to even. Use `Math.Floor(x + 0.5)`.
- `Array.sort` is stable; C# `List.Sort` is not. Use a stable sort or an index tie-break.
- Integer maths via `|0`, `>>>0`, `Math.imul` must be mirrored with `int`/`uint` and `unchecked`.
- Object key iteration order, `Map`/`Set` insertion order: use ordered structures.
- Hashing used for the golden file (e.g. `eda80bae`) must be reimplemented identically, or compare a canonical JSON string instead.

## 3. Three approaches

### A) Port core to C# with a parity harness (recommended)

Translate `src/core` file by file to a Unity assembly (`OneMoreMerge.Core`, plain C#, no UnityEngine, so it also runs in `dotnet test`). Content JSON is shared (one copy, generated or copied by script). UI rebuilt in Unity. TS stays as the reference.

Parity harness: a TS script exports "cases" (seed, level, action list, expected per-step state hash and final result) from the existing golden/sim code to JSON. The C# EditMode test replays each case and compares. Start from `tests/golden/flagsOff.json`, then add cases from `tools/sim.ts` bots (they already produce action lists) and from `replay.ts`.

- Pros: one codebase going forward (C#), native speed, real unit tests, the bots can be ported once and run fast; no JS engine at runtime; free.
- Cons: two copies while both exist, so every rules change needs doing twice (mitigate: freeze rules during the port or change TS first and re-export cases); translation bugs are subtle (section 2 hazards).
- Effort: **L** overall. Core port + parity **M** (about 8.6k lines; the biggest risk is cascade/boss/support). Presentation rebuild is the larger part.

### B) Keep the TS core, run it inside Unity through an embedded JS engine

Bundle `src/core` to one JS file, run it in a JS interpreter inside Unity (free options exist, e.g. Jint, a pure C# JS interpreter, or ClearScript/Puerts-style V8 bindings; licences and iOS fit must be checked, and iOS forbids JIT so only interpreters are safe there).

- Pros: zero divergence, no translation bugs; the sim tools and rules stay single-sourced.
- Cons: interpreter speed (bots and big sims would be slow, level generation at scale too); marshalling state across the boundary every tick; debugging two worlds; extra dependency risk, especially on iOS; Unity code only becomes a viewer, and the owner's long-term goal (C# project like Pulse Patrol) is not reached.
- Effort: **M** to get a first screen, but it keeps a permanent tax. Good as a spike or fallback, not as the end state.

### C) Stay on web/Phaser and wrap in a native shell

Capacitor or similar wraps the existing build as an iOS/Android app. (Not Unity at all.)

- Pros: smallest effort (**S** to **M**), reuses everything, same code for web and store. The road-drag perf problem is a WebView issue that would remain.
- Cons: does not answer "Unity"; WebView performance and audio limits remain; iOS still needs a Mac and Apple account for the store; no Unity animation or art tooling.
- Effort: **S-M**.

### Recommendation

**A**, with B kept only as an emergency fallback for the spike if the translation of one module (e.g. `cascade.ts`) will not reach parity. C is the answer only if the real goal is "be in the App Store soon" rather than "be in Unity"; question 1 settles this.

## 4. Reusable, rebuilt, and tools

| Reusable as is | Rebuilt | Lost unless handled |
|---|---|---|
| `levels.json`, `puzzles.json`, `yards.json`, `budgetLevels.json`, `levelPace2.json`, `levelEconomy.json`, `effortOverlay.json`, `rush.json` | All Phaser scenes and UI (`src/game`, about 23k lines) | `tools/*.ts` bots and reports (they import `src/core`) |
| PNG art in `src/assets/art/`, sliced sheets, icons, store shots | Procedural fallback textures (`textures.ts`): replace with real art or drop | QA panel (web DOM/Phaser based) |
| Timelines/pace data (`levelTimeline`, `levelPace2`) | WebAudio sounds: no files exist, must be authored | `npm run shots` Puppeteer screenshot tools |
| Design docs, golden hashes, balance docs | Save (localStorage to file) | The asset hub / QA guide HTML (still work: they read PNG/JSON) |
| Pure-geometry helpers (as C# ports, tested against TS numbers) | Bolt animator state machine (`boltMachine.ts` is pure, port it; draw side is new) | |

Keeping the tools:
1. **Short term (phase 0-1): leave them on the TS core.** Balance, HP fits, level reports, `gen-puzzles`, `gen-yards`, `daily-seeds` keep producing JSON that Unity reads. Because the parity harness proves the C# core equals TS, TS-fitted levels are valid in Unity. This is the main reason to freeze rules in TS first.
2. **Phase 1 end:** port `sim.ts` bots (random 5 s novice, cascade bot) and `level-report` to a C# editor/`dotnet` tool, so Unity can validate its own content. The bots only use `drop`/`scrap`/`choosePerk`/`tick`, so the port is small once the core exists.
3. **Phase 3:** the level generator for 10k+ levels (see `docs/design/LEVELS_AT_SCALE.md`, Option B hybrid) ideally runs in C# so one engine does generate + validate. Until then the TS pipeline is fine since levels are data.
4. Rule: once Unity is the product, TS core becomes "frozen reference"; delete only after both sides have been identical for a full release cycle.

## 5. Art pipeline in Unity

What the owner's Unity project does today (investigator report on Pulse Patrol, Unity 6000.6.2f1, URP 17.6 2D renderer, uGUI 2.6, Input System 1.20): PNGs under `Resources/Art`, sprite mode Multiple, 100 PPU, bilinear, max 2048, compressed, no mipmaps, no atlases, UI built in code at startup, no prefabs, no tests, no CI, no batch-mode scripts. Import settings were sampled from one file only.

Proposed conventions for this game (a separate project or folder, not mixed into Pulse Patrol; see question 2):

- **Sprites:** keep the art keys as file names (`cannon_3.png`, `bell_5.png`, `target_1_dmg.png`) so the TS asset registry maps 1:1. Import via an `AssetPostprocessor` (editor script) that sets the settings from folder: Sprite (2D and UI), Multiple only for sheets, 100 PPU or a chosen units-per-art-pixel, bilinear, no mipmaps, max 2048, compression on for backgrounds and off (or high quality) for small UI/unit icons to avoid banding.
- **Atlases:** use Sprite Atlas (V2) per screen group (units, road kit, HUD, crates). 493 files at 16 MB is small; atlas is for draw calls, not memory. Add after phase 1, not before.
- **9-slice:** panels, buttons and bars (road kit, `uiKitV3`) get borders set in the sprite editor; the Asset Breaker manifest should record the border numbers per piece.
- **Animations:** pops, sparkles, bling, jump-in/out and Bolt idle become **Animation Clips + Animator** (or a tiny code tween library mirroring `uiJuice`/`juiceMath` curves). Simple scale/alpha/offset pops: use code tweens driven by the ported `juiceMath` constants (cheap, flag-able). Bolt (blink, breathe, hop, point, peek, think, worried): Animator controller whose states mirror `boltMachine.ts`; pose pieces (AT batch) as sprite swaps or 2D Animation bones. Sparkle bursts: Particle System with a sprite sheet. Keep reduced-motion and caps from the Phaser kit.
- **3D sprites (Screw Yard):** keep `tools/render-yard-3d.mjs` (three.js, headless Chrome) as the generator; its output is transparent PNG, so Unity just imports it. Unity-side 3D rendering is not needed, and keeps look identical to web. Only revisit if live 3D (lighting, rotation) is wanted.
- **Painted mock to prefab:** the new chain (Mock Builder, Pixel Checker, Asset Breaker, Master Implementer) maps directly: the Asset Breaker manifest (EXISTS / NEEDS-SLICE / NEEDS-ART) lists pieces with positions and 9-slice borders; the Master Implementer builds a **prefab** per screen (uGUI Canvas, anchors from the mock, reference resolution 1290x2796 or 1170x2532 with Canvas Scaler "match height/width" tuned for iPhone), using the pieces from the asset folders. The painted mock is the screenshot target for the visual check. Quality gate stays: mock vs Unity screenshot overlay.
- **Road scenery:** per the 2026-10 decision, no tiling scenery; large background panels per chapter + props, gates, badges. In Unity: one large sprite per chapter (watch max texture size; slice vertically if >4096) and the road as a spline/prefab chain or the Tilemap-free sprite strip. Road perf in a native app should be much better than the current Safari drag problem, but measure it.
- **Fonts:** the game uses Lilita One (`@fontsource/lilita-one`). Unity needs TextMeshPro (or legacy Text); TMP is not installed in Pulse Patrol. Adding the TMP package is free; font licence (OFL) permits embedding.

## 6. Phased path with exit criteria

**Phase 0: spike (about 3-4 weeks, M).** Goal: prove the port is sound and the feel is reachable.
- A new empty Unity project (or a folder in a fresh repo) with `OneMoreMerge.Core` asmdef (no UnityEngine).
- Port: `rng`, `types`, `game` core loop, `cascade`, the minimum rosters for levels 1-10, `levels.json` loader.
- Parity harness: export cases from TS, replay in an EditMode test and in plain `dotnet test`.
- Screens: the merge board (drop, merge, cascade animation from `GameEvent`s, HUD), and one meta screen: the **road map** (pilot screen of the new chain, painted mock exists as task t-59b06c4a).
- Exit criteria: (1) 12 golden level hashes + `teach-L1..3` equal TS exactly; (2) 1,000 seeded bot games on levels 1-10 give identical win/loss and final state hash as TS; (3) board plays at 60 fps on a mid Android phone or the Editor with a profiler screenshot; (4) road map drag is smooth; (5) the owner can play L1-L10 in a build (Android/Windows) and says "feels like the web game or better". If (1)/(2) cannot be reached, fall back to B for the core and rethink.

**Phase 1: core + first 80 levels (M-L).**
- Port the rest of `core` (bosses, mini-bosses, support, marks, perks, tools, endless, replay, rosters 2-7), all TS flags into a config, save system.
- Rebuild all in-level UI and results, level intro, perk choice, pause, settings, QA panel (flags).
- Port `sim.ts` bots and `level-report` as C# tools.
- Exit: all 80 levels play start to finish; full parity suite green (all `tests/*.test.ts` that cover core have a C# twin or a shared case file); C# bot reproduces TS win rates within noise on all 80 levels; save round-trips; flags OFF = golden.

**Phase 2: meta (M).**
- Road with chapters and badges, machine/units/events tabs, crates and crate opening, daily, Screw Yard if wanted.
- Offers: **MOCK only** (no real store billing, no real money, no ad SDK).
- Exit: a full first-session path (install, tutorial L1-3, road, first crate, daily) playable on device; a screenshot checklist per screen against painted mocks passes.

**Phase 3: content scale (L, partly data work).**
- 10,000+ levels per `docs/design/LEVELS_AT_SCALE.md`: generator + solver/bot gates, JSON loader with lazy loading by chapter.
- Exit: 1,000 validated levels, then 10,000; every level passes minimum-duration and win-rate gates (levelPace2 / timeline); load time and memory budget stated.

Do not start the next phase until the exit criteria of the previous one are signed off by the owner.

## 7. How Claude workers build and verify Unity work

What can be done headlessly (needs the Unity editor installed on this PC, free with Unity Personal; the exact install path and licence activation must be checked first):
- **Batch mode:** `Unity.exe -batchmode -nographics -quit -projectPath <path> -logFile <log> -executeMethod <Class.Method>` for builds, import and scripted setup. Needs the project closed in the Editor (one editor per project).
- **Tests:** `Unity.exe -batchmode -runTests -testPlatform EditMode -testResults <xml>` and the same for PlayMode. Pure core tests can also run with `dotnet test` (no Unity needed), which is the fastest loop and works for parity.
- **Screenshots:** PlayMode test or editor script that renders a scene to PNG (`ScreenCapture`, or camera to RenderTexture), compared with the painted mock. `-nographics` cannot render; screenshots need a graphics-capable batch run (no `-nographics`) on a PC with a GPU session.
- **Build script + log reading:** a `BuildScript.cs` (Windows/Android) so builds are one command.

Must be set up first (currently missing in the owner's Unity project, per the investigator):
1. Confirm Unity Hub/editor installed, version 6000.6.2f1 or newer, licence activated (free Personal).
2. `OneMoreMerge.Core` and `.Editor`/`.Tests` asmdefs; Test Framework package (already in Pulse Patrol).
3. Parity case export script (TS) and C# replay test.
4. `BuildScript.cs` and a screenshot test.
5. A decision on the repo: a new repo or folder (recommended, not inside Pulse Patrol; the investigator found no namespacing for save/config and Resources is monolithic).
6. A worker rule: only one worker may use the Unity editor at a time (use `request_resource`), since batch runs lock the project and are heavy.

What we can NOT verify yet:
- Anything on iOS or an iPhone (no Mac; see costs). Safari-specific behaviour (his current device) is not Unity at all.
- Touch feel, haptics and real-device performance (workers have no phone; only the owner can judge).
- Real store flows, purchases, ads, notifications.
- Sound quality (workers cannot listen).
- Whether Pulse Patrol's project even compiles in the current editor (the README says its Chain Pulse part never did).

## 8. Costs and blockers (OWNER DECISIONS, we spend nothing)

| Item | Cost | Notes |
|---|---|---|
| Unity Editor, Personal plan | Free (while revenue/funding stays under Unity's published limit; check the current terms before launch) | Check Unity's current Personal terms (revenue limit, splash screen) before launch; not verified here |
| Windows/Android builds, Editor testing, `dotnet test`, batch mode, all packages named here (URP, uGUI, Input System, Test Framework, TMP) | Free | |
| Android on-device testing | Free (USB debugging). A device is needed (owner's own, if any) | |
| Google Play publishing | **OWNER DECISION:** one-time developer fee (paid) | Not needed until a store release |
| iOS builds | **OWNER DECISION:** needs a Mac (hardware, paid or a cloud Mac rental, paid) and Xcode (free on Mac) | Unity can export the Xcode project from Windows, but cannot compile/sign the iOS app without a Mac |
| Apple Developer Program | **OWNER DECISION:** yearly fee (paid), needed for TestFlight and App Store, and to install on his own iPhone beyond short free provisioning | |
| Store fees | **OWNER DECISION:** platform commission on sales when the game earns | Offers stay MOCK until then |
| Unity Cloud Build / paid CI / Unity Pro | **OWNER DECISION:** paid, not required | Not planned |
| Analytics/ads/IAP services | **OWNER DECISION:** some are free tier but add privacy and policy work | Not planned in any phase |
| Art generation (ChatGPT) | Existing subscription | No new spending |
| Worker time (tokens) | Existing | Phase 0 is the biggest single chunk before a go/no-go |

Blockers, plainly: (1) no Mac means no iOS app, his phone stays on the web build; (2) the Unity project for Pulse Patrol has no tests, no build script, no CI, so those need creating; (3) all sounds are synthesised in code and must be recreated; (4) the translation risk lives in `cascade.ts`, `game.ts`, `boss.ts`, `support.ts`, which hold most of the rules; (5) during the port the rules must be frozen or changed in both places.

## 9. Recommended first spike

"Board + road in Unity with parity": phase 0 above, in a new Unity project, with the plain-C# core asmdef first. First worker task (small, no Unity editor needed): port `rng.ts`, `types.ts`, and the loader for `levels.json`, create the TS case-export script from `tests/golden/flagsOff.json`, and get one C# test green with `dotnet test`. Only then open the Unity editor for the board screen. This proves parity cheaply before any UI money or time is spent.

## 10. Questions for the owner

1. **What is the goal: "in Unity" itself, or "in the App Store as soon as possible"?** If it is the store soon, option C (native shell, small effort) gets there first, and Unity can follow. If it is Unity (shared engine with Pulse Patrol, better feel), take option A.
2. **New Unity project for this game, or inside the Pulse Patrol project?** Recommended: a new project, since that project has no tests, no namespacing and one monolithic Resources folder.
3. **May we freeze game-rule changes in TS during phase 0-1** (art, UI and level data can continue), so the two cores stay comparable?
