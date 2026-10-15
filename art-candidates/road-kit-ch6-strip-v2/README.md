# Chapter 6 road strip v2 (cardboard), mirror-safe strip + derived kit

Answers CRITIQUE_89 (ch6 kit REDO: SYM mirror made slanted tape into bow-ties). Fallback path of the critic: a new strip whose marks are square to the road.

- `raw/b6v2_ch6_strip.png`: ChatGPT output, 2172x724 (1 try, 1 image, pure magenta key). Prompt: horizontal cardboard strip, every mark symmetric top-to-bottom (tape exactly square across the road, centred patches, staples), 5-7 pieces of different width/length/tone, no mark twice within 512 px, no X/logo/arrow. Strip crop `19,207,2153,509` (from `tools/autocrop.mjs`).
- `ch6/road_ch6_*.webp`: 12 pieces, 512 cell, road 205 px (40 %), open edges on border midpoints. Command (repo root, `npm ci` first):
  `CHEVRON=0 GRIDP=0 INLAY=0 node art-candidates/road-kit-ch6-strip-v2/tools/kit.mjs art-candidates/road-kit-ch6-strip-v2/raw/b6v2_ch6_strip.png magenta 19,207,2153,509 ch6 art-candidates/road-kit-ch6-strip-v2/ch6 205`
  (`tools/kit.mjs` = v6 from branch `orch/t-b8ba6c65-road-kit-script-fix-2-chapter-1`, unchanged; SYM stays on.)
- `contact_ch6_dark.png`, `contact_ch6_light.png`, `tile3_ch6.png` (straight x3), `tools/contact.mjs`, `tools/tile3.mjs`.

## Checks (by eye, on the contact sheets and tile3)
- Bow-ties: none. Marks are rectangles, so the mirror leaves them intact (cream tape, dark-orange tape, flat patch, staple pair); curves and S curves keep them readable.
- Repeats: inside one 512 px loop there are 4 different marks (cream tape, orange tape, staple pair, flat patch), none alike. The kit loops every 512 px like every chapter, so tile3 shows that sequence 3 times (unavoidable for any chapter).
- Joins: curve ends match the straights (SYM kept); ring/seam metrics NOT script-measured.

## Notes for the critic
- Only 4 marks per loop and they are quite regular (rectangles on an even rhythm); reads tidy, a little sparse. The strip also has a grey tape piece that the loop crop does not use.
- Corrugation ridges run across the road in the straights; in curves they fan out as expected.
- Not wired, no src changes. Not critic-checked.
