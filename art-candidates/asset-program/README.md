# Asset program: industry-level art for One More Merge

Goal: art that holds up next to top mobile games, produced with GPT image generation and reviewed **harshly** by Claude. First target: **8 ranks for every unit** (194 pictures: 22 roster-B units from scratch, 9 originals get ranks 7-8), then UI kit, crates, icons, backgrounds.

Nothing here touches `src/`. Approved art is imported into the game in a separate step with the owner's OK.

## The loop

1. **Plan** (Claude): rank plan per unit (`RANK_GRAMMAR.md`), exact GPT prompt (`prompts/`).
2. **Generate** (you, or a Claude session on your computer driving your browser, see `prompts/00_how_to_run.md`): ChatGPT with the anchor sheets attached makes one 4x2 sheet per unit.
3. **Slice** (`tools/slice-sheet.mjs`): cuts the 8 machines out of the white background, in order, with the white fringe removed.
4. **Review** (`tools/review-sheet.mjs` + `RUBRIC.md`): shows every rank at the size the player sees, silhouette, greyscale, next to a shipped unit, with automatic flags. Then a harsh score per dimension, hard caps, the 5 worst flaws and a verdict: `SHIP` / `REPAIR` / `REDO`. Logged in `scores/scores.csv`.
5. **Iterate** at most 3 rounds per sheet, then change the concept.
6. **Import** approved sets (separate step).

Ship bar: **8** for units, crates and primary buttons; **7** for everything else. Our best art today scores 7 to 7.5 (calibration table in `RUBRIC.md`), so this is a real step up, not a refill.

## What is in here

| File | What |
|---|---|
| `RUBRIC.md` | Harsh scale, weights, hard caps, review protocol, calibration of our current art |
| `BENCHMARK.md` | What top games do, evidence level per line, what we copy and what we never copy |
| `RANK_GRAMMAR.md` | The 8-rank ladder, plans for Piston, Blowtorch, Tesla Tower, order of the other 190 pictures |
| `prompts/` | Ready-to-paste GPT prompts (pilot: Piston), follow-up fixes, how to run |
| `anchors/` | Cannon, Coil, Bell rank 1-8 on white: style and format reference to attach in ChatGPT |
| `tools/` | `slice-sheet.mjs`, `review-sheet.mjs`, `make-anchors.mjs` (all use only `sharp`, already a dev dependency) |
| `inbox/` | Where GPT sheets go (`<unit>_sheet_vN.png`) |
| `refs/` | Reference screenshots of other games, kept out of git, analysis only |
| `scores/scores.csv` | Review log (one row per review) |
| `reviews/` | The written harsh reviews, one per sheet round |

## Status

| Item | State |
|---|---|
| Pilot Piston, round 1 | **Reviewed: 6.5 / 10, REDO** (`reviews/piston_v1.md`). Wrong machine (a hydraulic press) and a non-additive ladder; format, slicing and materials worked |
| Pilot Piston, round 2 | **Prompt ready** (`prompts/02_piston_v2.md`), waiting for the sheet |
| Slicer and review tool | Built and tested on the shipped Coil ladder (cuts cleanly, fringe 0.1-0.4%, finds that Coil rank 5 breaks the ladder) |
| Benchmark of top games | **Partial**: text sources only. Needs store screenshots (network allowlist or your upload) |
| Browser-driven generation | Needs a session on your computer (Desktop app or `claude remote-control`); this cloud session cannot reach it |

## Decisions for you

1. **Art stays clean outside the object** (no aura, glow, crown, particles in the pictures; the game adds them in code). Recommended: yes, it keeps rank looks adjustable. Alternative: bake glow into ranks 7-8.
2. **Scope**: ranks 1-8 for all 39 units, rank cap unchanged (a cap above 8 is a gameplay change). Recommended: yes. Tell me if "more ranks" meant something else.
3. **Pilot**: Piston first (Common shooter, simple mechanics, easy to judge). Recommended: yes.
4. **How to generate**: Path A (you paste prompts, I review) or Path B (a Claude session on your computer drives your browser). Recommended: A for the pilot, B once the prompts are proven.
5. **Reference screenshots**: allow `itunes.apple.com` and `*.mzstatic.com` in the environment network settings, or upload 20-30 screenshots. Recommended: allow the hosts.

## Honest limits

- I cannot generate images with GPT myself and I do not use API keys or paid services; the image generation runs in your ChatGPT.
- Scores are my judgement from pictures at phone size. The tool flags are objective, the scores are not. Calibration against real top-game screenshots is still pending.
- The slicer and review tool ran on one real GPT sheet (Piston v1): clean cut, 0 flags. One sheet is not a lot of evidence, so expect fixes as more come in.
