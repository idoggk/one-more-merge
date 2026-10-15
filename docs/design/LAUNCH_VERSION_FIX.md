# Launch version fix: "every launch is a different version / sometimes crashes"

Owner symptom (iPhone 14 Pro Max, Safari, home-screen app): each open shows new, old, or a crash.

## Root cause (evidence)

Measured on the live site (read-only fetch, 2026-10-15):
- `index.html`, `sw.js` and every file are served with `cache-control: max-age=600` (GitHub Pages / Fastly, not configurable).
  Different CDN edges and the phone's own HTTP cache hold different copies for up to 10 minutes after a deploy.
- A service worker is registered (`src/main.ts`, `public/sw.js`). Its navigation handler was `fetch(req)`, which goes
  *through the browser HTTP cache*, so "network-first" still returned a stale `index.html` for up to 10 minutes.
- `tools/deploy.mjs` builds, then force-pushes `dist/` as a brand-new gh-pages history. Hashed files from the previous
  build (`assets/index-XXXX.js`, art, chunks) vanish. A stale `index.html` therefore points at files that now 404
  -> blank page / crash. A fresh `index.html` gives the new version; a stale one gives the old version (SW cache-first
  assets) or the crash. Which one you get depends on which cache answered: hence "different each time".

## Fix

1. **Deploy keeps the last 4 builds' hashed files** (`tools/deploy.mjs`, pure logic `tools/deployKeep.mjs`): the
   previous gh-pages is cloned, `builds.json` (list of builds and their files) is read, and older files are copied back
   into `dist/` before the push. A stale page can still load its own chunks (old version, but never a crash).
2. **Service worker v2** (`public/sw.js`): navigations and non-hashed files use `fetch(url, {cache:'reload'})`, which
   bypasses the HTTP cache; cache name bumped to `omm-v2` so old caches are deleted on activate.
3. **version.json check** (`src/platform/versionGuard.ts`, emitted by `vite.config.ts`): at boot the page fetches
   `version.json` (no-store). If the live build id differs from the running one it clears SW/caches and reloads once with `?v=<time>`.
4. **Chunk-failure handler**: inline script in `index.html` (covers the main bundle failing to load) and
   `vite:preloadError` / failed dynamic import handlers: reload once with a cache-busting parameter. At most one reload
   per 60 s (sessionStorage), so no loops.
5. Settings already shows `Build <date> · <sha>` and RELOAD LATEST (unchanged; it already clears SW + caches).

Nothing was deployed. Tests: `tests/versionGuard.test.ts` (decision logic + `planKeep`).

## Verify on a phone (after the owner approves a deploy)

1. Open Settings, note the build label. Deploy a second build; reopen the app twice within 10 minutes.
2. Expected: the app shows the new label after at most one automatic reload, never the old one, never a blank page.
3. Optional crash check: in the old build's page, the old `assets/index-*.js` still returns 200 on the site (open
   `https://idoggk.github.io/one-more-merge/builds.json` and one listed file).

## One-time owner step

Phones still run the OLD service worker and old caches, which cannot be fixed remotely. Once, after the first deploy
with this fix: Settings > RELOAD LATEST (or delete the home-screen app, Safari > Settings > Advanced > Website Data >
remove idoggk.github.io, then re-add to Home Screen). Save data lives in localStorage, so removing website data or
the home-screen app erases progress: use Settings copy-save first, or prefer RELOAD LATEST which keeps the save.
From then on updates arrive by themselves.
