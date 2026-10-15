# UI juice kit (flag `uiJuice`)

Timing-based motion presets for popups, buttons, badges and rewards. Visual only: no game state, no game Rng, no saves, no layout changes (a preset only touches its target's own scale / alpha / angle / y and always restores the base values).

- **Flag:** `UI_JUICE` in `src/content/experiments.ts`, default **OFF** in code. QA panel > DISPLAY > UI JUICE. Stored key `omm_qa_ui_juice` = `'on'` (anything else = off). To ship it ON: change `UI_JUICE = { on: true }`, make `storedUiJuice` use `storedDefaultOn`, add `defOn: true` to the QA row, and flip the expectations in `tests/qaPanel.test.ts`.
- **Reduced motion:** every preset is a no-op under `prefers-reduced-motion` (the existing `REDUCED_MOTION` in `sceneKit.ts`). Callers that wait on an animation (`jumpOut`) get their callback at once.
- **Caps:** at most 30 live sparkle particles per scene (`ParticleBudget`), bursts of 6 to 12, at most 4 glints per scene. Pure math and caps: `src/game/fx/juiceMath.ts` (tests: `tests/juiceMath.test.ts`).

Files: `fx/juiceMath.ts` (pure), `fx/juice.ts` (Phaser presets), `fx/juiceHooks.ts` (one call per creation point).

## Presets (`fx/juice.ts`)

| Preset | What it does |
| --- | --- |
| `popIn(scene, t, delay)` | Scale 0 to 1.12 (ease-out-back) then settles to the target's own scale. |
| `bounceIn(scene, t, delay, rise)` | Rises from `rise` px below with a bounce while fading in. |
| `jumpOut(scene, t, done)` | Anticipation squash, hop up, fade; `done` always runs. |
| `pressSquash(scene, t, base)` | Down to 0.94, release overshoot to 1.06 then base. Only after a real press. |
| `glintSweep(scene, host, w, h)` | Diagonal white bar crossing a button or badge every 2.5-6 s (random, `Math.random`, never the game Rng). Stops when the host is destroyed. |
| `sparkleBurst(scene, parent, x, y, n)` | 6-12 code-drawn stars (`juice_star` texture) fly out and fade. |
| `attentionWiggle(scene, t)` | Small damped rotate shake every ~3 s (badge with a reward ready). |
| `floatBob(scene, t)` | Slow 3 px bob for idle badges. |
| `glowPulse(scene, t)` | Soft alpha + scale pulse for a glow image. |
| `countUp(scene, text, from, to, fmt)` | Number rolls up (eased) and lands exactly on `to`. |
| `stagger(items, fn)` | Per-item delay (70 ms step, whole list capped at 600 ms). |

## Hooks (`fx/juiceHooks.ts`)

- `GameScene.panel()`: popups rise with a bounce (`juicePanelIn`); `GameScene.button()`: press squash on all buttons, glint on wide ones (`juiceButton`).
- Level intro popup: PLAY pops in and glints.
- Result screen: reward row items pop in staggered, bolts count up with a sparkle burst, extra reward lines rise in.
- Level road: the current node wiggles and throws a burst once; the chapter chest sparkles and, when the chapter is done, wiggles. The road scene's own polish (`roadPolish`) is untouched.
- Not hooked yet: `floatBob`, `glowPulse`, `jumpOut` (ready for map badges and dismissals).
