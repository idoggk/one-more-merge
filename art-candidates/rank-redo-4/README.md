# Rank redo 4 (t-1f5ed098)

Continues rank redo 3 (merged in; its scripts are reused). Score = `tools/rank-clarity.mjs` (threshold 30), pieces overlaid in order rank-clarity < redo-1 < redo-2 < redo-3. New pieces are in `pieces/<unit>_<rank>.webp` (256 px); raw ChatGPT sheets in `raw/`. Each sheet is 3x2 on magenta, six takes; the best take by score was kept and each kept piece was opened and looked at.

| Piece | Design | Pairs before | Pairs after |
|---|---|---|---|
| router_5 | wide low teal/silver manifold, yellow lever | 4-5 28.3 | 4-5 46.1, 5-6 55.2 |
| hydraulic_press_2 | tall green single-piston tower, dial, side tank | 1-2 29.3, 2-3 46.5 | 1-2 63.2, 2-3 54.7 |
| hydraulic_press_6 | tall crimson gantry, single ram, anvil | 5-6 29.7 | 5-6 48.4, 6-7 60.1 |
| wrecking_ball_2 | blue/gold twin-post gantry, two balls | 1-2 29.6 | 1-2 66.2, 2-3 52.7 |
| pipe_6 | tall copper-orange boiler tower, gauge | 5-6 30.0 | 5-6 64.2, 6-7 77.0 |
| capacitor_2 | short wide green battery block, two terminals | 1-2 31.1 | 1-2 54.4, 2-3 59.5 |

All four required pairs now score above 45, plus pipe 5-6 and capacitor 1-2 from the 30-36 band.

## Not done (browser lease ended; no image-limit message was hit)
- 30-36 band: dynamo 6-7 (30.1), rivet_gun 4-5 (31.3), piston 3-4 (31.4), tesla 3-4 (31.7), lathe 1-2 (32.2), lathe 3-4 (32.9), wrench 5-6 (33.0), blowtorch 6-7 (33.3), hydraulic_press 6-7 (34.1), blueprint 2-3 (34.8), router 3-4 (35.4), wrecking_ball 5-6 (35.9).
- redo-3 weak: vice 4-5 (36.3). The 3 redo-1 FIX pieces (vice_4, vice_5, piston_5) were already handled in redo 3.
- Vice rank 8 and pipe rank 8 have no piece.
- Critic pass on all new pieces (picked by score plus a visual look only).

## Flow that worked
Reuse chat https://chatgpt.com/c/6ad032c1-d4bc-83eb-90b7-c58fddb14429 (primer inside). `node art-candidates/rank-redo-3/scripts/tools.mjs ref <unit> <rank>` (needs `art-candidates/rank-redo-3/_tmp/`), attach with `file_upload` on the "Attach photos" input, insert prompt via `execCommand('insertText')` in `.ProseMirror`, Return, poll the last `img` with naturalWidth>1000 until its src changes (~60-70 s), download with an anchor on that blob src, `import_download`, then `slice.mjs raw/x.png 3 2 magenta out c1..c6 512`, `tools.mjs fit`, `tools.mjs try <unit> <rank> <cands>`. Each prompt asked for a new silhouette, part count and accent colour, "8 percent bigger".
