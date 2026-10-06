# One More Merge — notes for Claude

Phone app: `npm run deploy` builds and publishes to https://idoggk.github.io/one-more-merge/ (gh-pages branch; Safari > Share > Add to Home Screen). The claude.ai artifact is a second channel (`npm run artifact`).

Commands: `npm run dev` (Vite, port 5173) · `npm test` (Vitest) · `npm run typecheck` · `npm run build` · `npx vite-node tools/sim.ts [filter]` (balance bots).

Architecture
- `src/core/` — pure, deterministic model (no Phaser). `game.ts` = state + commands (`drop`, `scrap`, `choosePerk`) + fixed 50 ms `tick`. `cascade.ts` = bounded BFS resolver. All randomness via saved seeded `Rng` streams (supply / perk / kickback).
- `src/content/` — tuning constants (`tuning.ts`, change balance here first) and perk/family text.
- `src/game/` — Phaser presentation. `GameScene` turns model `GameEvent`s into animation; sprites never hold game state; `reconcile()` syncs sprites to the grid.
- Art: drop PNGs into `src/assets/art/<key>.png` (keys: `cannon_1..6`, `coil_1..6`, `bell_1..6`, `target_0..2`, `target_N_dmg`, `demo_can`, `bg`, `slot`, `icon_bolt`, `icon_scrap`). Missing keys fall back to procedural textures in `textures.ts`.

Invariants (tested in `tests/core.test.ts`)
- Merge frees one cell, preserves rank mass, keeps family. Move/swap never deal damage.
- Each gadget activates at most once per cascade; strongest coil charge wins, never stacks.
- Seed + actions ⇒ identical state. Preview never mutates state.
- Animations never pause the simulation.

See DESIGN.md for rules and the decisions log.
