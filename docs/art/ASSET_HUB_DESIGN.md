# Asset Hub design: one place for every game asset by category

Task t-1483e2e1, committed 2026-10-11 (mission m-b6e8ac1d). Design only, nothing built. Slice S6 of `ART_BIBLE.md`.

## Summary

1. The game has 463 art files (15 MB, `.webp` in `src/assets/art`), 72 pictures drawn in code (`textures.ts`), about 54 synth sounds (`audio.ts`, no sound files) and effects that exist only as Phaser code. Nothing says which are final and which are placeholder.
2. **Option 1** = an "Assets" tab in the Orchestrator dashboard. **Option 2** = a separate offline Asset Hub page generated from the game repo by `tools/build-asset-hub.mjs`.
3. Both need the same core: an asset registry (id, category, status, source, notes) plus a test that fails when a file is not registered. The only real difference is where pages are shown and where Approve / Redo / Comment are stored.
4. **Recommendation: build Option 2 first** (size M). Later add a thin dashboard link plus a daemon table `asset_reviews` (size S) so verdicts land in the Orchestrator database.
5. First slice (1-2 days): registry + sync test + build tool + phone page with categories, big previews, status badges, search, "needs art" list, "x of y final" meter. Code-drawn capture is in the slice; effect strips, sound capture, zips, Artifact publish and DB review buttons are slice 2.

## What exists today (facts from the repo)

- **Art**: `src/assets/art/<key>.webp`, 463 files, 15 MB. Prefix-coded keys: `cannon_1..8`, `coil_*`, `bell_*`, `boss_<name>_{intact,cracked,critical}` (~49), `mon_*` and `mon_*_dmg` (32), `btn_*`, `crate_*`, `hero_*`, `sy_*` (Screw Yard), `btg_*`, `trophy_*`, `ui_*`, `vfx_*`, `stage_*`, `icon_*`, `badge_*`, `banner_*`, `hm_*` (home machine). (CLAUDE.md and README still say PNG; see the follow-up in `ART_BIBLE.md`.)
- **Import**: `tools/import-art.mjs <folder>` walks ChatGPT PNGs, maps filenames to game keys with ordered regex rules (`keyFor`), trims and resizes with sharp; writes non-bundled files to `assets_src/`. It already knows source file to key, but discards the source name.
- **Load plan**: `src/game/artPlan.ts` classifies keys by regex into eager / heldBack / lazy (BOARD, HOME, NEAR, RARE). A second regex "registry"; the hub can reuse it for a "loaded when" badge.
- **Code-drawn**: `src/game/textures.ts` `ensureTextures()` draws gadgets (FAMILIES x ranks), job icons for 7 rosters (`job_<id>`, 64 px), `dot`, `hand`, `spark`, `chunk`, `slot`, `bg`, `target_N`, `demo_can`, each only when no art key exists. These are the placeholder pictures players see (the owner's crate complaint).
- **Candidates**: `art-candidates/<topic>/` holds PNG review shots and before/after strips (box-fx, crate-screen, sandwich-fx, yard-a, ...). Not shipped; raw material for before/after.
- **Sound**: `src/game/audio.ts` is a WebAudio synth, ~54 `sfx.*` functions plus procedural music; no audio files. `unitSounds.ts` maps units to sounds.
- **Fonts**: no font files in the repo for text styles apart from the bundled Lilita One package (system fonts otherwise via Phaser text styles).
- **Effects**: `src/game/fx/*`, `sandwichFx.ts`, `rosterFx.ts`, `partReact.ts`, per-unit shoot / impact / trigger in `roster1Art..roster7Art.ts`; pure code driven by model `GameEvent`s.
- **Units**: `src/content/units.ts` + `roster1..7.ts` + `unitJobs.ts`.
- **Capture rig**: `tools/shots.mjs` starts Vite, launches Chrome via puppeteer-core, exposes `window.__omm = { Phaser, game }`. This enables headless capture of code-drawn textures and effects.
- **Publish paths**: `npm run deploy` (gh-pages, public); `tools/make-artifact.mjs` (claude.ai Artifact body-only HTML + files map).
- **Orchestrator** (separate repo, `apps/dashboard` + `apps/daemon`): the dashboard is one small React file (`App.tsx`, 285 lines, tables, no router/tabs) built by Vite to `apps/dashboard/dist`. The daemon (`server.ts`) serves that folder statically with an owner token and a JSON API (`/api/state`, approvals, missions, tasks, questions). No image/file route, no notion of "asset". (Read from one sibling worktree, not necessarily current master.)

## Shared core (both options)

### Registry: `src/content/assetRegistry.ts` (typed TS, not JSON)
TS gives type checks and is importable by vite-node (already used by `tools/*.ts`). Repeating families use a generator helper.

```ts
export type AssetStatus = 'placeholder' | 'draft' | 'final';
export type AssetSource =
  | { kind: 'chatgpt'; prompt?: string; chat?: string }  // e.g. 'Create Tray Asset'
  | { kind: 'hand'; by?: string }
  | { kind: 'code'; fn: string };                         // e.g. 'textures.drawGadget'
export interface AssetDef {
  id: string;            // stable = Phaser texture key ('cannon_3'); 'sfx.merge' for sounds
  category: 'units'|'bosses'|'enemies'|'ui'|'buttons'|'bars'|'menus'|'icons'|'backgrounds'|'crates'|'effects'|'sounds'|'fonts';
  sub: string;           // 'cannon','rank','shoot',...
  name: string;
  file?: string;         // 'src/assets/art/cannon_3.webp'; absent => code-drawn
  codeDrawn?: boolean;
  status: AssetStatus;   // placeholder = code/stand-in; draft = real art not yet approved; final = owner approved
  source: AssetSource;
  size?: [number, number];  // filled by the tool from the file, never typed
  group?: string;        // unit id, so the unit page collects shoot/impact/trigger/ranks
  ranks?: number[];
  replaces?: string;     // id of the placeholder it supersedes (before/after)
  notes?: string;
}
```

`fam('cannon', 1..8, {...})` expands entries; an overrides map flips single ids to final. **`final` is set only from an owner Approve, never guessed.** (The Art Bible's category keys A-P map onto these `category` values; the registry may add the A-P letter as `sub` prefix.)

### Sync test: `tests/assetRegistry.test.ts` (runs in `npm test`)
Fails when:
1. a file in `src/assets/art/*.webp` has no registry entry (message names the file and says add it to `assetRegistry.ts`);
2. a registry file does not exist, or an id is duplicated;
3. a key drawn in `textures.ts` (`gen('<key>')` plus roster loops) is neither registered `codeDrawn` nor shadowed by a file (slice 1: regex over `textures.ts`; slice 2: small exported `CODE_TEXTURE_KEYS`);
4. an `sfx.*` name in `audio.ts` is not registered under sounds (`Object.keys(sfx)` if import is side-effect free, else regex);
5. a unit id in `UNITS` + `ROSTER_*_UNITS` has no group entry.

Also `tools/import-art.mjs` prints "new keys not in registry: ..." at import time. Bootstrap: `build-asset-hub.mjs --init` writes a first registry from files on disk (file => draft, code => placeholder), then hand-tuned once.

### Capturing code-drawn assets: `tools/capture-code-assets.mjs`
Reuse the `shots.mjs` pattern: start Vite, open the game in Chrome (puppeteer-core, `CHROME` env), wait for `window.__omm.game`, call `ensureTextures(scene)`, then in page for every texture key with no file: `scene.textures.get(key).getSourceImage()` to canvas to `toDataURL('image/png')`; node writes `captures/<key>.png`. Exact pixels, 72 files in seconds. Output goes to git-ignored `dist-hub/`. Risk: lazy/RARE textures exist only after `loadLazyArt`; capture calls `ensureTextures` directly.

### Previewing effects (shoot / impact / trigger), three tiers
1. **Slice 1**: no animation; show key frames (`vfx_*` art, art-candidates strips, `tools/box-fx-frames.mjs` output) plus a text description.
2. **Slice 2**: sprite-sheet capture. A QA hook (new module in `src/game/ui/`, not `GameScene.ts`) builds a clean stage with one unit + dummy target and fires the effect; the model ticks at a fixed 50 ms so frames are repeatable; the tool grabs N frames (`page.screenshot` clip or `canvas.toDataURL`), tiles them into a horizontal PNG strip; the hub plays it with CSS `steps()` (tiny, offline, crisp, pausable, scrubbable). About half a day for the hook; ~120 units x 3 effects then run in minutes.
3. Optional: animated GIF/WebP via sharp for chat sharing.

### Sounds
Slice 2: render each sfx once via `OfflineAudioContext`/`MediaStreamDestination` in the headless page, save small `.ogg`/`.wav` (~54 files, few hundred KB), play with `<audio>`. Until then cards show name, code location, "play in game QA panel".

### Fonts
One card per text style actually used (family, size, stroke, colour from `sceneKit.ts`) rendered live with the same CSS stack, plus status. A new chunky display font would land here first.

### Phone review: Approve / Redo / Comment
Append-only records `{assetId, verdict approved|redo|comment, text, at, fileHash}`; `fileHash` ties a verdict to the exact picture, so changed art shows "re-review needed".
- **Stored in the Orchestrator database**: new table `asset_reviews` + `POST/GET /api/asset-reviews` behind the owner token. The Lead reads redo items as the next art to-do; Approve sets status final via a small Lead write-back commit to `assetRegistry.ts` overrides (the hub never edits the registry itself).
- **Fallback with no daemon work** (slices 1/2, offline, Artifact): buttons produce a prefilled message ("Redo: cannon_3 - too flat, keep the outline") to copy into Lead chat/owner notes, and keep ticks in localStorage.

### Zip per category
`build-asset-hub.mjs` writes `zips/<category>.zip` (fflate or archiver dev dep) so the owner can feed a category back to ChatGPT as style reference. Left out of the Artifact build (size).

### Hub pages
Plain HTML + `hub.js` (~300 lines) + `registry.json` + images, no framework, service worker copied from `public/sw.js`.
- **Home**: "x of y final" meter overall and per category, category tiles.
- **Category**: filters (status, subcategory, source, loaded-when), search, big previews on a checkerboard, status badge, lightbox.
- **"Needs art" list**: all placeholders sorted by how early the player sees them (artPlan eager first).
- **Unit page**: job, rank states, shoot/impact/trigger strips, sounds, before/after slider, review buttons. Before/after from `replaces` or art-candidates `before_*`/`after_*` pairs.

## Option 1: "Assets" tab in the Orchestrator dashboard

**How**: serve `registry.json` + capture images from the project repo's `dist-hub/` through new daemon routes (`GET /api/projects/:id/assets/...`); add an Assets tab in `apps/dashboard/src/App.tsx` (needs a tab/router first).

- **Pros**: review buttons write straight into the Orchestrator DB and the Lead sees verdicts instantly; already on the phone via Tailscale; one app; can later cover other projects (Heroes Somehow, Pulse Patrol).
- **Cons**: only while the PC/daemon is reachable; not offline; cannot be a private Artifact; the dashboard is tiny with no image serving/routing and lives in another repo with its own review gate; mixes game art into an ops tool; large previews/GIFs over Tailscale are slow; it is Option 2's shared core PLUS daemon and dashboard work.
- **Size**: L (core M + daemon routes/table S + dashboard refactor S-M + cross-repo coordination).
- **Risks**: cross-repo contract drift (registry schema vs daemon reader); daemon serving large images; the dashboard gets heavier for every non-art task.

## Option 2: standalone static Asset Hub generated from the game repo

**How**: `node tools/build-asset-hub.mjs` (`npm run hub`) reads `assetRegistry.ts`, the art folder, captures, optional effect strips; writes `dist-hub/` (`index.html`, `hub.js`, `registry.json`, thumbs, strips, optional zips, `sw.js`).

**Publishing**: (a) local/Tailscale: `npm run hub:serve` on the PC; (b) gh-pages `/hub/` (public; art is already public in the bundle but notes/status are not; needs owner OK); (c) private claude.ai Artifact like `tools/make-artifact.mjs`: body-only page + files map using small WebP thumbs (~160-256 px, ~2-3 MB), registry JSON and strips; full-size and zips stay local. Artifact size limits are **unverified**: probe with a ~2 MB test before relying on it.

- **Pros**: works offline on the phone, independent of the Orchestrator, shareable as a link into ChatGPT/Claude chats; lives beside the code that defines assets, so registry/test/tool change in one commit (no cross-repo contract); static and fast with crisp previews; its output feeds Option 1 later; no Orchestrator change for slice 1.
- **Cons**: verdicts are not stored in the DB automatically until the optional dashboard hook exists (fallback = copy to Lead chat/localStorage); must be regenerated to see new art; one more thing to publish and keep private.
- **Size**: M (S for slice 1).
- **Risks**: stale hub (mitigate: run `npm run hub` in import and deploy scripts + the sync test); headless capture flakiness (Chrome path, timing); Artifact size limits; registry upkeep becoming a chore (mitigate: generators, `--init`, a test that names exactly what to add).

## Comparison

| | Option 1 (dashboard tab) | Option 2 (standalone hub) |
|---|---|---|
| Size | L | M (slice 1: S) |
| Offline / shareable | no | yes |
| Review in Orchestrator DB | direct | via copy now, direct after the embed hook |
| Cross-repo work | yes | none for slice 1 |
| Multi-project | yes | per repo (tool can be copied) |
| Delay risk | high | low |

## Recommendation

**Option 2 first, then a thin bridge.** The hard parts (registry, sync test, capture, effect strips) are identical and live in the game repo; Option 2 delivers "see everything on my phone" in 1-2 days without touching the Orchestrator, offline and as a private Artifact. Afterwards add an "Assets" link in the dashboard that opens the hub (iframe/new tab with `?daemon=<url>&token=...`) and a daemon table `asset_reviews` (size S) so Approve / Redo / Comment land in the database. Content order by what the owner sees first: menu UI (buttons, bars, panels), unit art and ranks, crates, then backgrounds, effects, sounds, fonts.

## First slice (1-2 days): "Hub v0"

**Scope**
1. `src/content/assetRegistry.ts` (types, `fam()` helpers) bootstrapped by `tools/build-asset-hub.mjs --init` from the 463 files + 72 code textures (file => draft, code => placeholder; final only for what the owner already approved).
2. `tests/assetRegistry.test.ts`: checks 1, 2, 3, 5 above.
3. `tools/build-asset-hub.mjs` writes `dist-hub/` (`index.html`, `hub.js`, `registry.json`, sharp thumbs); `package.json` scripts `hub` and `hub:serve`; `dist-hub/` in `.gitignore`.
4. `tools/capture-code-assets.mjs`: headless Chrome export of code-drawn textures to PNG, included in the build.
5. Hub UI: category home with "x of y final" meter, grid with filters (status/subcategory) and search, lightbox, status badges, "needs art" list, 390 px phone layout, offline via `sw.js`, localStorage Approve/Redo/Comment with a "Copy for Lead" button.

**Out of slice**: effect strips, sound capture, zips, daemon table, Artifact publish, shoot/impact/trigger on the unit page (the unit page ships with rank states and static art only).

**Acceptance criteria**
- `npm test` passes; deleting a registry line or adding a stray `src/assets/art/zz_test.webp` makes `tests/assetRegistry.test.ts` fail naming the file.
- `npm run hub` produces `dist-hub/` in under 60 s; `registry.json` has an entry for every art file (463+) and every code texture (72+); every image on the pages loads (link check in the tool, no 404).
- At 390x844 via `npm run hub:serve`: categories visible; search "cannon" shows its ranks; filter "placeholder" lists exactly the code-drawn items; "needs art" count equals the registry placeholder count; the meter "x of y final" matches the registry.
- Works offline after first load (puppeteer `setOfflineMode` or devtools offline).
- Approve/Redo/Comment persist after reload; "Copy for Lead" copies a message naming the asset id.
- No game runtime code changed; `npm run typecheck` and `npm run build` still pass.

**Verify commands**: `npm test`; `npm run typecheck`; `npm run build`; `npm run hub`; `npm run hub:serve` (open on phone / 390x844); `node tools/build-asset-hub.mjs --check` (link check + registry/file count, non-zero exit on mismatch).

**Slice 2** (~2 days after): effect strips + unit page, sound capture, zips, Artifact build, daemon `asset_reviews` + dashboard link.

## Open questions for the owner

- Private only (Artifact/Tailscale), or is gh-pages `/hub/` acceptable? (default: private)
- Who sets `final`: the owner's Approve tap only (recommended), or may the Lead flip entries?
- Which categories first? (default: menus/buttons/bars, units, crates)
