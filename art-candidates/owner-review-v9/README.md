# Owner art review v9

Open `index.html` (phone friendly, 390 px wide, dark and light mode, no external requests). Built by `node tools/build-owner-review-v9.mjs` (reads HEAD and the batch branches with git, needs `npm ci` for sharp).

- v9 groups first: painted mocks (8 full-page images, CRITIQUE_85 and 86), then 7 piece groups with 230 pieces, each with the latest critic verdict chip (KEEP / FIX / REDO, grey = none found).
- Earlier groups are the v8 pages, unchanged (copied from branch `orch/t-aad78cee-owner-review-page-v8-everything`).
- LIKE / NOT per piece as in v8, plus a free comment box on every group page. Export JSON now has a `comments` object next to `votes` and `reasons`.
- Verdict chips for the new pieces: KEEP 140, FIX 67, REDO 31.

Files: 242 in this folder (limit: 255 per publish call, 511 per artifact). Total size 27.0 MB.

## Not included yet
- Road map v4: no branch holds it yet (only v1, v2, v3).
- CRITIQUE_87 as a separate doc is the first 3D render critique (HEAD docs/art/mocks/screw-yard/RENDER_CRITIQUE.md); later verdicts (91) win.
- Screw Yard backdrop and the win hero pieces from v2 are still open in CRITIQUE_98 (backdrop REDO), no new picture exists.
- Chapter 7/8 panel tries have verdicts only for the two try2 pictures (REDO); other tries show "no verdict".
- Pieces whose critic doc line could not be matched show UNJUDGED (list below).
- Map badge v2 contact sheets, raw sheets and @2x files are left out on purpose (pieces only).

## No verdict found (0)
- none
