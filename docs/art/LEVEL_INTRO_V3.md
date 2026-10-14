# Level intro popup, UI kit v3 (flag `uiKitV3`, default OFF)

QA panel > DISPLAY > UI KIT V3 turns it on (this device only). OFF = the old level card, byte for byte (the flag is read in one line at the top of `openLevelSheet`).

Code: `src/game/ui/levelIntroLayout.ts` (pure geometry, config table `INTRO_CFG`, copy helpers), `src/game/ui/levelIntro.ts` (drawing), tests in `tests/levelIntroLayout.test.ts` (rectangles at 360x640, 390x844, 430x932 for normal / mini-boss / boss / showcase cases; copy clamps checked against every boss line and hint text in the game).
Kit pieces copied from the v3 slices into `src/assets/art/kit3_*.webp` (popup frame, well, 3 ribbons, 2 toggles) with registry entries; PLAY uses the existing `btn_green`.

## What changed against the build #6 card
- Board dimmed to 97% so no HUD shows through; framed cream panel; ribbon title (blue normal, purple mini-boss, red boss) with a MINI-BOSS / BOSS / NEW! / HARD tag pill.
- ONE hero picture (about 45% of the panel), star goals as a strip on its bottom edge, boss name chip and the clock chip (2:45).
- Minions as 4 chips of 100 design px (50 pt) with rank numbers.
- Text: first sentence of the level's own hint data, at most 2 lines; GOOD HERE becomes up to 5 tool chips with a 1-word label, tap a chip for the full line (4 s, then back).
- PLAY 112 design px (56 pt) in the kit's green; Jumpstart Kit is its own card under the panel with a 96 px (48 pt) toggle. The dashed attack diagram is dropped (no mechanic needs it on the intro). Showcase (L21 / L41) and the daily trial pill live inside the hero's top edge.

## Self-critique against the 20-point rubric (harsh)
Scored by me from the 6 phone screenshots in `art-candidates/intro-v3/` (390x844, 360x640, plus 430x932).
1. One clear hero object: 1/1. 2. Hero at least 40% of the panel: 1/1 (test enforced). 3. Max 2 lines of text: 1/1. 4. Single primary button, 56 pt, kit green: 1/1. 5. Nothing overlaps (test + eyes): 1/1.
6. Jumpstart card separate and below: 1/1. 7. Toggle at least 44 pt: 1/1. 8. Chips at least 48 pt: 1/1. 9. Fits 640 to 900 without page scroll: 1/1. 10. Board dimmed, no HUD: 0.5 (dimmed to 97%, but a faint ghost of the home tabs and PLAY LEVEL still shows under the Jumpstart card; no real blur, the camera has no per-layer blur).
11. Consistent kit style (frames, ribbon, toggle, PLAY): 1/1. 12. Ribbon title + tag: 1/1. 13. Readable hierarchy name / clock / minions / text: 1/1. 14. Tool chips with 1-word labels: 0.5 (labels are 19 px, about 9.5 pt, small; the icons carry it). 15. Config-driven sizes and text: 1/1.
16. Flag OFF identical, golden digest only: 1/1. 17. Boss readable on dark well: 1/1. 18. Stars readable: 0.5 (earned stars not screenshotted; unearned grey stars are fine). 19. Thumb reach: 1/1 (PLAY in the lower half). 20. Polish (no animation on open beyond the panel slide, no hero idle motion, flat star strip): 0.5.
Total: 17.5 / 20. Known gaps: the mastery contract lines and the first-card "Clear = star" lesson are not on the new card; the chip tap tooltip is code-tested only by geometry; no mini board preview (the brief said drop it unless a mechanic needs it).
