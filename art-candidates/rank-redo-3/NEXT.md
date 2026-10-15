# NEXT (rank redo 3, t-e60c1758)
Stopped by the 20-minute BROWSER_SESSION cap (re-request DENIED). 15 pieces done (see SCORES.md).

State of the ChatGPT chat: https://chatgpt.com/c/6ad032c1-d4bc-83eb-90b7-c58fddb14429 (primer inside, many sheets). The composer still holds an attached `ref_router_4.jpg` and no prompt was sent; remove the attachment or reuse it for the router sheet.

Flow (about 3 min per sheet):
1. `scripts/tools.mjs ref <unit> <rank>` builds a flat-on-white 512 px jpg of the lower rank (needs a `_tmp/` folder at `art-candidates/rank-redo-3/_tmp`; the script writes there; it reads pieces in order clarity < redo-1 < redo-2 < redo-3).
2. Attach via `find` "file input elements" then `file_upload` on the "Attach photos" input (ref changed between pages; it was `ref_204`).
3. Prompt template (JS `execCommand('insertText')` into `.ProseMirror`, then Return): 3x2 magenta sheet, "wide equal magenta gaps, NO black lines", six takes of the described design, state what must differ (silhouette/scale/accent colour), "8 percent bigger".
4. Download last image with the `__dl` blob helper (batch W NEXT.md). The count of big imgs caps at 5 in the DOM, so detect completion by the last image `src` changing, not by count. Keep each JS call under 40 s (45 s CDP timeout).
5. `import_download`, then `node scripts/slice.mjs raw/<sheet>.png 3 2 magenta _tmp/x c1,c2,c3,c4,c5,c6 512`, `tools.mjs fit`, `tools.mjs try <unit> <rank> cand...` prints the two neighbouring pair scores per take. Install: `npm install` for sharp.

Remaining weak pairs (all in 28-37; everything below 28 is done):
- router 4-5 (28.3): prompt ready: redraw rank 5 as wide router table, two bits, dust-chute pipe, teal/silver, yellow handle.
- hydraulic_press 1-2 (29.3), wrecking_ball 1-2 (29.6), hydraulic_press 5-6 (29.7), pipe 5-6 (30.0), dynamo 6-7 (30.1), capacitor 1-2 (31.1), rivet_gun 4-5 (31.3), piston 3-4 (31.4), tesla 3-4 (31.7), lathe 1-2 (32.2), lathe 3-4 (32.9), wrench 5-6 (33.0), blowtorch 6-7 (33.3), hydraulic_press 6-7 (34.1), blueprint 2-3 (34.8), router 3-4 (35.4), wrecking_ball 5-6 (35.9).
- Weak after redo 3: vice 4-5 (36.3, one channel), hydraulic_press 2-3 (46.5, colour only: redraw with a different silhouette, e.g. two side pistons and a tall narrow frame).
- Vice rank 8 and pipe rank 8 have no piece at all.
- Critic pass on the 15 new pieces (most were picked by score only).
