# Chapter 6 road strip (cardboard), new GPT strip + derived kit

Brief: `docs/art/ROAD_KIT_B6.md` on `orch/t-b8ba6c65-road-kit-script-fix-2-chapter-1` ("Exact GPT brief for the ch6 strip"). Prompt sent as is (plus a one-line style header), pure magenta key, 1 try, 1 image.

- `raw/b6_ch6_strip.png`: ChatGPT output, 2804x561 (strip crop 0,81,2804,467). Varied tape (about 6 pieces at different angles/lengths, 2 flat patches, cracks, a staple), no stamp or mark repeated.
- `ch6/road_ch6_*.webp`: 12 pieces, 512 cell, road 205 px (40 %), open edges on border midpoints. Derived with `tools/kit.mjs` (v6 from the road-kit branch, copied to `tools/kit.mjs`): `CHEVRON=0 GRIDP=0 INLAY=0 node tools/kit.mjs raw/b6_ch6_strip.png magenta 0,81,2804,467 ch6 ch6 205` (crop from `tools/autocrop.mjs`).
- `contact_ch6_dark.png`, `contact_ch6_light.png`, `tile3_ch6.png` (straight x3 repeat check), `tools/contact.mjs`.

## Checks (by eye)
- The loop uses the first 512 output px (about 960 source px): 3 tape pieces, a patch and a crack in each 512 px window, nothing identical twice inside it. Repeat across tiles is every 512 px (as for every chapter).
- Colour: warm brown cardboard, darker than the b5 tan.

## Known issue (for the critic)
- kit.mjs `SYM` (default on) mirrors the tread across the road so curve ends match the straight; with slanted tape this turns each tape piece into a bow-tie / chevron shape (see `tile3_ch6.png`). Tape looks symmetric, not hand-laid. `SYM=0` would remove it but breaks curve end matching; not tried. A second GPT strip with tape square to the road (no tilt) would suit the mirror better. Not done (not wired, no src changes).
- Not critic-checked; joins/ring metrics not measured.
