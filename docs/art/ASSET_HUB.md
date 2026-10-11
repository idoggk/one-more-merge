# Asset Hub

One page with every game asset by category: units (every rank), monsters and bosses, board, effects, UI, crates,
backgrounds, screw yard, power tools, fonts and sounds. Each asset has a status badge: `placeholder`, `draft`, `final`.

## Rebuild

```
npm run hub
```

This runs `tools/gen-asset-registry.mjs` (re-scans `src/assets/art`, adds new files as `draft`, keeps your edits) and then
`tools/build-asset-hub.mjs`, which writes `dist-hub/index.html` plus `dist-hub/thumbs/` (about 8 MB, git-ignored).
Open `dist-hub/index.html` directly in a browser (it works offline) or serve the folder locally. The page has a
category chip bar, search, a "Needs art" list (all placeholders), overall and per-category "x of y final" meters, and
per-unit pages (tap a unit in Units) that show every rank. Code-drawn assets (no picture file) show a labelled tile.

## Change a status

Edit `src/content/assetRegistry.ts`: find the entry by `id` and change `"status"` to `placeholder`, `draft` or `final`
(notes and source are editable too). Then `npm run hub`. Re-running the generator never overwrites these fields.

## When art files change

- Added or removed a file in `src/assets/art`: run `npm run hub` (or `node tools/gen-asset-registry.mjs`). The test
  `tests/assetRegistry.test.ts` fails if a file is unregistered, a registered path is missing, or ids collide.
- A code-drawn unit that gets a real `src/assets/art/<family>_<rank>.webp`: re-run the generator: the entry switches to the
  file and keeps its old status, so set it to `draft` or `final` by hand.

## Rules the generator uses

New entries default to `draft`. `final` only for the original 13 unit families (`<family>_<rank>`) and boss phase
art (`boss_*_intact|cracked|critical`). Every code-drawn unit rank is `placeholder`. Sounds and code-only effects are
listed as entries with file `code-drawn` (source `synth` / `code`); no live render of them in this slice.
