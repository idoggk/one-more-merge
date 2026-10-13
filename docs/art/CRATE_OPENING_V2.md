# Crate opening V2

Owner (build #6): "the way the crates are opened is not good and doesn't look right." Flag `TUNING.crateOpenV2` (QA > CRATES > CRATE OPENING V2, needs CRATE LOOK = TOOLBOX), default OFF.
Frames: `art-candidates/crate-open-v2/before/` (old, 49 frames, 100 ms apart of scene time, 390x844, TOOLBOX, 8 cards) and `.../after/` (48 frames). Contact sheets: `contact_sheet_before_16.png`, `contact_sheet_after_16.png`. Capture: `node tools/crate-frames.mjs <dir> old|v2`.

## 1. What was wrong (read from the 49 before-frames + `crateScreen.ts`)

| Area | Finding | Evidence |
|---|---|---|
| Scale | The crate is a 400 px picture inside a 1000 px cream panel; the reveal never gets bigger than a 176 x 220 card. No object is ever the star. | f0-f11 |
| Timing | Whole opening is 1.2 s: 3 shakes of 180 ms (0.54 s) then the lid pops at ~0.6 s. Brief asks 0.4 anticipation + 0.8 shake. There is no anticipation beat (no squash/wind-up). | f0-f6 |
| Shake | Rotation +-7 to +-10 deg but each swing is 90 ms, only 3 of them, and the crate sits in front of a glow that does not charge. Rising intensity is barely readable in frames. | f2-f5 |
| Flash / burst | A 380 ms soft cream flash and a blue ring over a cream panel: low contrast, the burst reads as a smudge. No white flash beat. | f6-f9 |
| Reveal placement | Cards launch from the crate at 120 ms intervals, 8 cards in 1 s, and land in the grid while the next ones are still flying. Nothing is "the" reward; the Legendary lands 7th in a row of equal cards and gets only a small glow. | f9-f20 |
| Card layout | Final grid is 3 columns but small (about 175 px cards on a 720 px screen), tight under a header, with the crate vanished. | f24-f48 |
| Glow / rays | Rarity colour exists (blue rays) but is the same blue for the whole opening and sits under a cream panel (normal blend), so it never gets bright. | f0-f12 |
| Background | Cream modal over the dimmed game: every rarity effect competes with a light surface. Leading games go dark so light effects pop. | all |
| Buttons | The end state has UNITS / NEXT / CONTINUE depending on context, not one clear COLLECT. | f21-f48 |
| Sound cues | 3 chestShake knocks (pitch +0.22 each) -> chestOpen at lid pop -> one rarityHit per card at landing. Cue points exist but the best card gets the same one-shot as a common (no pause before it). | code |
| Tap | Tap during opening skips straight to the end: the best card is never seen on its own. | `skip()` |

Versus TEARDOWN/ART_BIBLE 6.7 (anticipation beat, rising shake 600-900 ms, flash, burst, one hero reveal with rarity rays, settled summary, one collect button): we had a shake and a burst and nothing else.

## 2. The new sequence (`src/game/ui/crateOpenV2.ts`, timings in `OPEN_V2` in `src/content/crateOpenV2.ts`, pinned by `tests/crateOpenV2.test.ts`)

Dark full-screen stage (rarity glow and rays use additive blending so they glow), then, in ms after the tap:

1. anticipation 400: crate squashes and winds up, header fades, latch glow wakes.
2. shake 800: angle 2 -> 10 deg with rising frequency, glow and rays charge, 6 knocks with climbing pitch, camera shake from the 4th.
3. flash 150: white flash (held ~60 ms), 44 additive sparks + two rings, crate gone, `chestOpen` cue.
4. hero 600: the single best card (rarity, then NEW, then copies) pops in at 2.3x, centred, back-out, with rarity-tinted rotating rays, rarity word and NEW tag; `rarityHit(tier)` cue.
5. heroHold 700: rests so it can be read.
6. gather: hero shrinks into slot 1 and the others (best first) fly in 110 ms apart into a 3-column grid, last row centred; landing glow + cue per rarity.
7. settle 250: one green COLLECT button (goes back to the level flow, the next crate, or the units tab).

Tap anywhere speeds the current beat 3x (anticipation, shake, hold, gather); the flash and hero pop are not speedable (`OPEN_V2.speedable`), so the hero is always seen. Verified with extra taps in `tools/crate-frames.mjs` (`TAPS=200,1500,...`). Simulation is untouched; it is presentation only, the crate result is decided before the screen is built.

## 3. Self-critique against the ART_BIBLE section 11 / 20-point bar

Scored honestly 0-1 per point (0.5 = partly):

1. Reads in under a second what is happening: 1. 2. One hero per moment: 1. 3. Anticipation beat: 1. 4. Rising shake intensity: 1. 5. Flash + burst: 0.5 (the burst is code sparks; no lid/debris art). 6. Rarity colour in rays: 1. 7. Hero big and centred: 1. 8. Slow card flip or pop: 0.5 (pop only; no flip). 9. Rarer = longer pause: 0.5 (same 600 + 700 for every tier; only ray strength and sound scale). 10. Summary grid neat: 1. 11. One clear primary button: 1. 12. Buttons last: 1. 13. Skippable without losing the reward: 1. 14. Timing within +-20% of the brief: 1. 15. Light top-left / one style: 0.5 (rays are radial, no directional light). 16. Corner/outline family kept: 1 (cards reuse `buildCard`). 17. Sound cue points: 0.5 (existing cues only, no dedicated hero sting). 18. Duplicates fly to a pill: 0 (not built; counts stay as x2). 19. Reduced-motion path: 0.5 (implemented, not frame-checked). 20. Phone-ready: 0.5 (390x844 checked, 360x640 not).

Total about 14.5 / 20. Known weaknesses: the crate never visibly opens (the flash covers it, no lid art), the summary cards are width-limited to about 1.1x so the grid sits small with air above the button, NEW tags overlap neighbours slightly, hero hold is the same for a Common hero as a Legendary one, and the old ODDS pill is only on the closed screen. Next steps would be a rarity-scaled hold, a card back and flip using code art, and the duplicate-to-currency fly.
