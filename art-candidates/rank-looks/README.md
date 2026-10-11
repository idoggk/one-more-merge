# Rank looks: how a unit should look at rank 1 to 8

Standalone preview. **Nothing here is wired into the game.** Open `index.html` (one offline file, 2.3 MB, no network) on a phone, or look at `shots/`.

- `index.html` – three views (Ladder = one unit rank 1-8, Compare = all 4 looks stacked, Board = a mid-game 5x6 board at real phone size), unit chips, look chips, Actual / Zoom / Big size, Motion / Still. URL params: `?unit=cannon&view=board&look=v2&size=M&motion=off`.
- `shots/` – 16 PNGs, 390 px wide (index below).
- `build.mjs` – rebuilds `index.html` from `template.html` + the real pictures in `src/assets/art` (crops them to their visible pixels the way `GameScene.fitSprite` does). `shots.mjs`, `glint-frames.mjs` – regenerate the PNGs (headless Chrome, also checks the page makes 0 network requests).
- `proto/` – a throwaway Phaser 3.90 check that the overlay techniques are possible in the game's own engine (see section 5).

## 1. What I found first (it changes the brief a little)

1. **The game already has a rank treatment** (`unitArt.ts` `rankDecor`: ellipse at 3-4, gold ellipse + tiny stars at 5-6, tiny crown + sparkle at 7-8). But it runs only for the 26 roster-B units; **Cannon, Coil, Bell, Rocket, Magnet and the other 8 originals get nothing**, and on the board it is too faint to read (shot 11). So "Today" is the baseline here, not a blank.
2. **Rank cap is 6 or 8.** `capOf()` lets damaging core units (shooters, relays) reach 8 in Saga L21+; helpers, events and the classic run stop at 6. The Art Bible says "cap is rank 6": that is only half true. So the top look must be **cap-relative**: rank 6 of a helper (Magnet) gets the crown tier, otherwise helpers would never show it.
3. **The 22 roster-B units have ONE picture for every rank** (`unit_<id>.webp`). For them the code overlay is the only rank signal. The 13 originals and Nail Gun / Jackhammer / Gear / Saw Blade have a picture per rank, so their silhouette already changes.
4. **Gold means MAX** in the game's palette (`marks.ts`, `#ffcf33`). The brief asks for gold at 5-6; I used warm amber `#f2a63a` there and keep bright gold + white for the top tier.

## 2. What is shown

5 base families: **Cannon, Coil, Bell, Rocket** (pictures to rank 8) and **Magnet** (pictures to 6, helper cap 6: its ranks 7-8 are dashed "not reachable" tiles). 6 new units: **Nail Gun, Jackhammer, Gear, Saw Blade** (a picture per rank) and **Piston, Tesla Tower** (one picture for all ranks). Chosen so every case appears: picture per rank, one picture, cap 6, a gold-coloured family (Bell, Jackhammer).

Every look has the same base layer: shadow ellipse under the unit (ink 13% + 30%), idle breath 1.2% x / 2% y on a 2.4 s sine with a phase offset per cell, the real rank plate, the real MAX crown badge at the cap rank.

| Look | Idea | 3-4 | 5-6 | 7-8 (or cap) |
|---|---|---|---|---|
| **Today** | what ships | faint ellipse under the plate | gold ellipse, tiny stars | tiny crown, sparkle |
| **V1 Halo** | ornament around a still unit | family-colour floor ring + rim glow | amber double ring + rim, 1-2 stars | crown (rank 8 ruby) + 3-4 stars, white-gold halo pulse, glint, sparkles |
| **V2 Plinth** ★ | the ground changes material | enamel plinth in the family colour, brass rim, rivets | amber two-step plinth, warm cell glow, plum banner with 1-2 stars | platinum plinth, slow light rays, floating crown, glint; rank 8 = ruby + 4 stars |
| **V3 Growth** | the unit itself grows | 94-98% size, family rim + backlight | 102-105%, amber rim + backlight, 1-2 stars | 107-109%, white-gold rim, rotating rays, crown, glint |

Rank 1 is plain; rank 2 adds one small thing (steel ring / steel pad / faint glow) so no two ranks are identical; stars = rank minus 4.

Palette: ink `#2b1d2e`, cream `#fbe7c6`, brass `#e0a040` / `#a06020`, **amber `#f2a63a` (5-6)**, **gold `#ffc83a` + white-gold `#fff6c8` (7+)**, steel `#aab6c4`, rank plate plum `#3a2030` + brass `#c99a3a` + cream `#fdf3dc`, ice-blue accent `#8fd8ff`, family colours from `FAMILY_INFO` (Art Bible 2.5).

### Shots
| # | File | Shows |
|---|---|---|
| 01-04 | `01..04_ladder_cannon_*` | Cannon 1-8 in Today, V1, V2, V3 |
| 05-07 | `05..07_ladder_tesla_*` | Tesla Tower (one picture for all ranks) in Today, V2, V3 |
| 08 | `08_ladder_magnet_v2_cap6` | Magnet: rank 6 = MAX gets the crown tier, 7-8 unreachable |
| 09 | `09_ladder_bell_v2_goldfamily` | gold-coloured family: low tier uses the ice-blue accent |
| 10 | `10_compare_piston` | all four looks stacked, Piston |
| 11-14 | `11..14_board_*` | a mid-game board at real phone size, Today / V1 / V2 / V3 |
| 15 | `15_glint_rank7_frames` | the glint sweep, 4 moments |
| 18 | `18_engine_proto_glint` | the same glint done in Phaser itself (prototype), rows = 4 moments |

## 3. Recommendation: **V2 Plinth**

Why:
- **It reads at real size.** Compare shot 11 (Today) with 13 (V2): on the board at 64 px the gold plinths and crowns separate the tiers at a glance. V1's thin rings and V3's size steps are fine on the ladder and weak on the board.
- **It carries the 22 single-picture units.** The ground, banner and crown change even when the picture cannot.
- **Same language as the Art Bible**: brass trim at 3, gold trim and glow at 5, crown at the cap (rule 7, section 5.1).
- **Cost is the same as V1**: one baked plinth per tier, nothing animated per piece except through one shared ticker (section 4).

Change before building (all cheap): (a) show the banner stars bigger; (b) cap simultaneous glints at 4 per board; (c) keep V3's size growth out (units already shrink 4-7% on a plinth); (d) decide the gold-family accent (below).

If you want the cheapest possible step instead: V1 (no unit shift, fewer textures), accepting that it reads weakly at 64 px.

## 4. What the in-game wiring would change (exactly)

All behind a default-OFF flag; OFF must be byte-identical to today. New code goes in new files; `GameScene.ts` gets one small flagged block.

1. `src/content/tuning.ts` (next to `mergeAssist`, ~line 169): `rankLooks: 'off' as 'off' | 'v1' | 'v2' | 'v3'` (drop the losers when the owner picks).
2. `src/content/experiments.ts` + a QA key like the other switches (`omm_qa_rank_looks`), applied at boot.
3. `src/game/ui/qaPanel.ts` `QA_ROWS` (~line 338): one `qaSwitch({ title: 'RANK LOOKS', options: OFF/V1/V2/V3, ... })`, pattern of the MERGE ASSIST row.
4. `src/game/unitArt.ts`:
   - `DECOR_UNITS` gate (line 13): with the flag on, every family gets decor (today only 26).
   - `rankTier(rank)` (line 48) becomes `rankTier(rank, cap)`: top tier when `rank >= 7 || rank === cap`.
   - `rankDecor(scene, family, rank, color, base)` (line 89) gets `cap` and also returns `{ scale, lift }` for the unit; new baked textures next to `ringTex / pipsTex / crownTex` (lines 51-85): plinth per tier and colour, banner per star count, rays, crown (sapphire / ruby), sparkle cluster, and a white silhouette per picture key (for the glint).
   - The two endless tweens per top-tier piece (lines ~99-110) are removed in favour of the ticker below.
5. **New file** `src/game/fx/rankLook.ts`: one `scene.events.on('update')` ticker for breath, crown bob, ray spin, twinkle and the glint strip; pieces register on creation and unregister on `destroy` (no per-piece tweens; the repo already fixed endless-tween leaks, see `tests/crateLeak.test.ts`); honours `REDUCED_MOTION`; glint delay from a hash of the gadget id (the current code uses `Math.random`, presentation-only).
6. `src/game/GameScene.ts` `makeView` (lines 825-868), about 6 lines, flagged: pass `capOf(this.s, g.family)` into `rankDecor` (line 832); after `fitSprite(img)` (line 831) apply `decor.scale` and `decor.lift`; register the unit image with the ticker. The `c.add([...decor.under, parts[0], ...decor.mid, ...parts.slice(1), ...decor.over])` line (866) stays as is. `swapUnitPictures`' refit callback (line 815) must re-apply scale and lift when the picture swaps in.
7. **Not touched**: `src/core/*` (model, seeds, cascade), the NEXT tray and card portraits (lines 517, 5157, 5319 keep plain pictures: 62 px is too small), `artPlan.ts` and `tests/artPlan.test.ts` (no new image files: every `rk_*` texture is baked at runtime with `bakeTexture`), levels / puzzles JSON.
8. Tests: new `tests/rankLook.test.ts`: `rankTier` monotone and cap-relative (cap 6 rank 6 = top, cap 8 rank 7 = top); flag OFF gives the same decor object counts as today for every family and rank; ticker registers and unregisters (no leak). `tests/ranks.test.ts` is unchanged.
9. Docs: a DESIGN.md decision line; Art Bible 1 rule 7 / 5.1 corrected to "cap 6 or 8, tier by cap".
10. Before turning the default on: a `tools/shots.mjs` pass on a phone-size board with ranks 1-8 (like `art-candidates/unit-art-wired/board_ranks.png`), then a real-phone check.

Extra display objects per piece on the board (counted from this plan, not measured), excluding the unit, the rank plate and the MAX badge that exist today:

| Tier | Today | V1 | V2 | V3 |
|---|---|---|---|---|
| 1-2 | 0 | 0-1 | 0-1 | 0-1 |
| 3-4 | 1 | 2 | 1 | 2 |
| 5-6 | 2 | 3 | 2 | 3 |
| top | 4 + 2 tweens | 6 | 6 | 7 |

Runtime-baked textures for V2: one plinth per family colour at tier 3-4 (about 32 KB each, a few per board), 2 shared (amber, platinum), rays 256 px, crown x2, banner x2, sparkles, and one 128 px white silhouette per picture that reaches the top tier (about 64 KB each). Estimates only.

## 5. What I verified, and what I did not

Verified (headless Chrome 390x844 at 2x, here):
- The page is fully offline: the capture run reports 0 network requests. It renders all 11 units x 8 ranks x 4 looks without errors.
- A throwaway Phaser 3.90 WebGL prototype (`proto/`, software GL) shows inside a Container, like `makeView`: a tint-filled copy behind the picture gives a clean gold halo; `preFX.addGlow` works; **`preFX.addShine` is too faint to use** (not a real glint); a white silhouette canvas texture with an animated `setCrop` strip gives a glint clipped to the silhouette (shot 18). The preview's glint is therefore drawn as a vertical strip, as the engine would draw it.

Not verified:
- Nothing ran on a real phone: frame time, fill-rate and the texture-memory numbers above are estimates.
- The page was only checked in Chromium (it uses CSS `mask-image` and `conic-gradient`; Safari should be fine but is untested).
- The overlays in the page are CSS/SVG stand-ins. The Phaser versions will differ in detail (glow softness, ray falloff).

## 6. What is still weak

1. **Within a tier the steps are small** (rank 3 vs 4, 5 vs 6). At 64 px they differ by one ring / one star / two rivets.
2. **V2 puts a plinth under a picture that already has its own cream base plate.** On Tesla Tower it reads as two bases; where the family colour equals the unit colour (Cannon, Piston, Rocket) the plinth blends into the unit. Units shrink 4-7% on a plinth.
3. **Gold-coloured families** (Bell, Jackhammer, Crane, Ladder, Lathe, Horn, Rivet Gun) lose the crown against their own art and would read tier 3-4 as tier 5-6. I fixed only the low tier, with an ice-blue accent (`accent()` in the page). That makes rank rings a different colour from the family's shot colour: a decision for you.
4. **Gold still sits close to the MAX language** (`#ffcf33`). Amber at 5-6 helps but a player may still read "gold = max".
5. **Top-tier noise**: up to 10 crowns / glints on one board is busy. Needs the cap of 4 animated glints and a reduced-motion path.
6. The glint is barely visible at real size (the board shots show crowns and plinths, not the sweep).

## 7. Decisions for you
1. **Which look?** (a) V2 Plinth, recommended; (b) V1 Halo, cheaper but weak at phone size.
2. **Give the 13 original units the same treatment?** (a) Yes, all 39, recommended (today 13 get nothing and look unfinished next to the rest); (b) keep them plain because their pictures already change per rank.
3. **Ice-blue accent for gold-coloured families at rank 3-4?** (a) Yes, recommended; (b) no, keep strict family colour and accept the tier 3-4 / 5-6 confusion on those units.
