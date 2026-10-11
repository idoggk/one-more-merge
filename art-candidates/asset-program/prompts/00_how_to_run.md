# How a sheet goes from prompt to reviewed assets

Two ways to run the prompts. Both end in the same folders and tools.

## Path A: you run it in ChatGPT, I review (works today)

1. Open your ChatGPT image chat. Attach the three files in `anchors/` (and nothing else).
2. Paste the prompt from the unit's file in this folder. Wait for the image.
3. If it is clearly broken (text, no grid, wrong machine), use the follow-up table in the same file. At most 3 rounds.
4. Get me the picture: attach it to your message to me (best), or save the full-size PNG as `inbox/<unit>_sheet_v<N>.png` in the repo and push it.
5. I run the tools, review it harshly and answer with scores, the 5 worst flaws and a verdict (`SHIP`, `REPAIR`, `REDO`).

## Path B: a Claude session on your computer drives ChatGPT in your browser

This needs a session that runs **on your computer** (the cloud session I am in cannot reach it): the Claude Desktop app with its browser tools, or `claude remote-control` started in a terminal in the repo folder. Start it on the branch `cloud/asset-program` and give it this message:

> Read `art-candidates/asset-program/README.md` and `prompts/00_how_to_run.md`. Run the pilot: in my signed-in browser open my ChatGPT image chat, attach the three anchor sheets from `art-candidates/asset-program/anchors/`, paste Prompt A from `prompts/01_pilot_piston.md`, wait for the image, screenshot it, and review it with `RUBRIC.md`. Follow the follow-up table when needed (max 3 rounds). Download the best sheet to `art-candidates/asset-program/inbox/piston_sheet_vN.png`, then run the slicer and review tool from the README and report scores.

Rules for that session (they protect your account):
- Only the ChatGPT image chat. Do not open account, billing, plan or settings pages; do not click anything that upgrades, buys or changes a plan. If ChatGPT shows a limit, a captcha, a login or a payment prompt: stop and ask.
- Never type or read passwords or keys. The browser stays signed in as you.
- One sheet per prompt; wait for it to finish before sending the next message.
- Download full-size PNGs; do not rely on screenshots for files that go into the pipeline (screenshots are fine for judging).

## After a sheet exists (both paths)

```
node art-candidates/asset-program/tools/slice-sheet.mjs art-candidates/asset-program/inbox/piston_sheet_v1.png art-candidates/asset-program/inbox/piston_v1 --cols 4 --rows 2 --prefix piston
node art-candidates/asset-program/tools/review-sheet.mjs --dir art-candidates/asset-program/inbox/piston_v1 --id piston --color '#d05a3a' --anchor cannon
```

The first command cuts the 8 machines out of the white sheet in reading order (transparent PNG 512 px and WebP 256 px each, plus `slice_report.json`). The second writes `review_piston.png` (board size on the real slot, tray size, silhouette, greyscale, the shipped Cannon at the same ranks) and `review_piston.json` with automatic flags. Then the harsh review in `RUBRIC.md`, logged in `scores/scores.csv`.

Nothing here touches `src/`. Approved sets are imported into the game in a separate step, with the owner's OK: `node tools/import-art.mjs <folder> '^<unit>_'` after adding the `keyFor` rule, as for earlier batches.
