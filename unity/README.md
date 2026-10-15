# Unity port, spike step 1: C# core + parity test

Plan: `docs/design/UNITY_PORT_PLAN.md` (section 9). The TypeScript core in `src/core/` stays the reference; the C# port must match it exactly.

- `OneMoreMerge.Core/` plain C# library (`netstandard2.1`, C# 9, no UnityEngine, no System.Text.Json). Later this folder becomes an asmdef source in Unity.
  - `Rng.cs` mulberry32 (port of `src/core/rng.ts`)
  - `Types.cs` constants and level types (subset of `types.ts` / `tuning.ts` / `levels.ts`)
  - `Json.cs` tiny JSON reader (so Unity needs no extra package)
  - `LevelLoader.cs` reads `src/content/levels.json` in place (never copied) and builds the "level N after init" state hash
- `OneMoreMerge.Core.Tests/` xUnit tests, read `parity/cases.json` and `src/content/levels.json` at test time.
- `parity/cases.json` generated from the TS core. Do not edit by hand.

## Run

Needs the free .NET SDK (checked with .NET 10; `dotnet --list-sdks`) and Node (for the export).

```
npm install                                   # once
npx vite-node tools/export-parity-cases.ts    # regenerate unity/parity/cases.json from the TS core
cd unity/OneMoreMerge.Core.Tests
dotnet test                                   # 4 tests: rng next, rng int/shuffle, level-init hash, golden presence
```

The first `dotnet test` restores xUnit from nuget.org (free). Re-run the export whenever `src/core/rng.ts` or the level data changes, then `dotnet test`.

## What is covered / not yet

Covered: Rng outputs, int, shuffle, final state; for the 40 "plain" levels (no modifier, boss, mini-boss, extra pieces, shooter override) the init scalars and the 30-cell start grid as a hash (HP is the level file value; stage and goal HP rules are not ported yet).

Not yet: the game state, `drop`, `tick`, `cascade`, and replaying `tests/golden/flagsOff.json`. The golden trails are copied into `cases.json` (`goldenFlagsOff`) as the source for the next step.
