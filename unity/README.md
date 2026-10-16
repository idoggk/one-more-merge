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

## Step 2: board slice

`Content.cs` (family / role / unit tables, rank caps) and `Board.cs` (start boards, drop = merge / move / swap, sandwich rule). `BoardParityTests.cs` replays `parity/cases2.json` (written by `tools/export-parity-board.ts`, which `export-parity-cases.ts` calls). Boundary and the remaining port order: `PORT_ORDER.md`. `dotnet test` now runs 8 tests.

## What is covered / not yet (step 1)

Covered: Rng outputs, int, shuffle, final state; for the 40 "plain" levels (no modifier, boss, mini-boss, extra pieces, shooter override) the init scalars and the 30-cell start grid as a hash (HP is the level file value; stage and goal HP rules are not ported yet).

Not yet: the game state, `drop`, `tick`, `cascade`, and replaying `tests/golden/flagsOff.json`. The golden trails are copied into `cases.json` (`goldenFlagsOff`) as the source for the next step.

## Unity project (`OneMoreMergeUnity/`)

Unity 6 (`6000.6.2f1`, URP). `OneMoreMerge.Core/` is referenced as the local package `com.omm.core`, so the same C# is built by `dotnet` and by Unity. Needs an active Unity licence (the free Personal one is enough).

- Open: Unity Hub > Add > `unity/OneMoreMergeUnity`, with editor 6000.6.2f1. The first import creates `Library/` (git-ignored, never commit it).
- Tests (EditMode), from the repo root, with no editor open on the project:
  `Unity.exe -batchmode -nographics -projectPath unity/OneMoreMergeUnity -runTests -testPlatform EditMode -testResults results.xml -logFile unity.log`
  (a relative `-testResults` path lands inside the project folder; `*.log` and `results.xml` are ignored). Or Window > General > Test Runner > EditMode. The pure core tests stay `dotnet test unity/OneMoreMerge.Core.Tests`.
- Build (Windows player): `Unity.exe -batchmode -nographics -quit -projectPath unity/OneMoreMergeUnity -executeMethod OneMoreMerge.EditorTools.BuildScript.BuildWindows -buildOutput Builds/Windows/OneMoreMerge.exe -logFile build.log`. Only one Unity editor process can use the project at a time.

## Save system

`SaveData` (`SaveData.cs`) holds progress, settings and flag state only. No rules and no run in progress. It mirrors the progress part of the web Meta (`src/game/meta.ts`).

- `SaveFile.Save(path, data)` writes JSON atomically (temp file, then replace) and keeps the previous file as `<path>.bak`.
- `SaveFile.Load(path)` returns the saved data. A missing file gives a fresh `SaveData`. A damaged file falls back to `.bak`, then to fresh.
- `SaveSerializer.ToJson` / `FromJson` do the JSON. Every save carries `Version` (`SaveData.CurrentVersion`). Older files go through `SaveSerializer.Migrations` (version -> step) up to the current version. A newer file than the build understands is rejected with `FormatException`.

### Web import

`WebSaveImport.Import(string)` turns a web-game save into `SaveData`. It accepts:

1. the backup code from the web game (`OMM1j.<base64>.<crc32>`; `j` = plain JSON, `z` = deflate-raw), with the checksum verified;
2. the backup bundle JSON `{"v":1,"at":..,"meta":{..},"run":..}`;
3. the bare meta JSON stored in localStorage under `omm.meta.v1`.

Only progress, settings and flags are taken. The web run in progress (`omm.save.v1`) is dropped, and unknown keys are ignored. Empty, foreign, newer, damaged or non-save input throws `FormatException`, so show the message and keep the existing save.

Typical use: the player pastes the code from the web game's backup screen, the app calls `WebSaveImport.Import(text)`, then `SaveFile.Save(path, data)`.

Tests: `SaveTests.cs`, with synthetic (no personal data) fixtures in `OneMoreMerge.Core.Tests/fixtures/`.
