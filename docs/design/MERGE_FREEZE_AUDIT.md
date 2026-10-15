# Merge freeze audit (t-edbacde4)

Owner: "we got times when merging is frozen, we need to think about things." Docs + one read-only measuring tool; `src/` is untouched.

## Summary (plain)

1. Merging is blocked or ignored in 31 situations (tables below): 17 scene-level (a card, an animation, a flag) and 14 board rules.
2. The core never freezes the whole board by itself: in 640 simulated plays (levels 1-80, CALM) every merge pair was blocked at once for 0.0 s. Board hazards (clamp, frost, junk, remix locks) block *some* cells for 0.61 s per level on average (0.7%), up to 14 s on L43.
3. The felt freezes come from the scene: the 1.5 s run intro, the win show (3.6 s), tap-to-inspect cards that eat the next tap, and first-time teaching cards.
4. **Real deadlocks found (code reading, not measured):** D1 pausing during a teaching card and then RESTART/HOME leaves `explaining` set, so the next level never takes input (and after HOME the clock runs: a timed loss). D2 same for an open guided clamp dodge, D3 for the power-up lesson (`itemLesson`). Reload is the only way out.
5. Top 5 by time per typical level (84 s median): intro 1.5 s (1.8%), win show 3.6 s (post level), hazard-blocked cells 0.61 s (0.7%), dry board 0.30 s (0.4%), inspect/cards (unmeasured, unbounded).
6. Best fixes: reset all input flags in `startState` (S, kills the deadlocks); never let a tap on a machine pause the game (M); queue the first drag after a card/intro instead of dropping it (S/M).
7. Measured with the bot (3 s think time), so it under-counts what a human feels: it never taps machines, so it never meets the inspect card.

## Question, number, method

Question: how much of a level is merging blocked, and by what? Numbers: seconds per level and % of level time (level time = median clear time, CALM, bot smart3), for levels 1-80. Hazard-blocked = any cell is locked / clamped / frost-row (`locked()`, `bossBlocked()`); frozen = at least one same-rank pair exists but every pair is blocked; no-pair = no same-rank pair on the board. Scene-level freezes are constants read from code (they cannot be simulated headless).

## 1. Every situation where merge input is blocked or ignored

Columns: how long | told why? | can it stick? | code. "Gate" = `GameScene.canAct()` (`GameScene.ts:1066`: not `modal`, not `paused`, phase playing/tutorial) plus the early returns in `onDown` (`GameScene.ts:1070-1132`).

### Scene level (input is swallowed)

| id | trigger | how long | told why? | stuck forever? | code |
|---|---|---|---|---|---|
| S1 | Run intro (slots flip, parts drop, MERGE!) | 1.5 s fixed; tap skips; skipped with reduced motion | yes (animation, name card) | no (timer + tap) | `GameScene.ts:647-686`, gate `:1080`, `paused` `:650` |
| S2 | Level intro popup before play (road -> PLAY) | until the player taps PLAY/close | yes | no | `ui/levelIntro.ts:124-285`, `GameScene.ts:4053` |
| S3 | Inspect card: a tap (<12 px) on a machine opens it and pauses the clock | until the next tap; that tap only closes the card and is NOT a drag | card says what it is; the lost drag is silent | no, but `closeInspect` only unpauses if not explaining/intro | `GameScene.ts:484-492, 601-608, 1084, 1324-1346` |
| S4 | Cell card: a tap on an empty marked cell (junk, corner, boss target) | same as S3 | yes (card) | no | `GameScene.ts:569-575, 1109` |
| S5 | Explainer cards (first-time tips, boss lessons, chain lesson, teach lesson) | until GOT IT/NEXT, unbounded; first time only, tip budget per level | yes | **yes, see D1** | `GameScene.ts:2117-2160, 1088`; budget `tips.ts` |
| S6 | Boss wake card (clock stopped, dimmed board) | until GOT IT; first time per boss | yes | no (button) | `GameScene.ts:3248-3280` |
| S7 | Guided clamp dodge: clock frozen, only the one marked move is accepted | until that exact drag is made; first clamp only | yes (arrow + text) | **yes, see D2** | `GameScene.ts:2653-2690, 1486, 1852` |
| S8 | Power-up lesson (`itemLesson`): clock frozen, only the item may be used | until the item is applied | yes (coach + hand) | **yes, see D3** | `GameScene.ts:2595-2620, 1106, 1852` |
| S9 | Tutorial GOT IT steps (`tutorialWaiting`, `coach.waitingTap`) | until the button | yes | no (new-player only) | `GameScene.ts:1088-1093, 2061-2073` |
| S10 | Win/loss: phase leaves `playing` | win: show 3.6 s, tap skips after 0.6 s; loss: 0.4 s | yes (DOWN! banner, result) | no | `GameScene.ts:2635-2641, 1074`, `canAct` |
| S11 | Best-chain replay modal before the level result | length of the replay (only chains >= 3) | yes | no | `ui/results.ts:127-150` |
| S12 | Any modal (pause, settings, results, crate, QA panel) sets `modal` | until closed | yes | no | `GameScene.ts:3355-3365, 3333`; `ui/pause.ts:11` |
| S13 | Support card in AIM mode: next tap anywhere is the aim, not a drag; tap off-board cancels | until fire/cancel | text hint "Tap a cell..." | no | `supportCard.ts:111-141`, `GameScene.ts:1095` |
| S14 | Item selected (tapped power-up): next tap applies, not a drag | until the next tap | partly | no | `GameScene.ts:1101-1105` |
| S15 | Tool cell press: 250 ms hold shows a preview, release then does nothing | 250 ms | yes (preview) | no | `toolFx.ts:28, 88-112`, `GameScene.ts:1332` |
| S16 | Merged part is invisible for 110 ms ("arrive" beat); a grab in that window drags an invisible sprite until it moves | 110 ms | no | no | `sceneKit.ts:16`, `GameScene.ts:1543-1547` |
| S17 | A clock tick loop never runs during pause/modal/guided/item lesson (clock, not input, but the player reads it as "frozen") | same as the owner flag | partly | see D1-D3 | `GameScene.ts:1852` |

### Board rules (core, `drop()` returns `ok:false`; the part snaps home)

| id | trigger | how long | told why? | stuck? | code |
|---|---|---|---|---|---|
| B1 | Clamp (boss): clamped machine cannot be dragged or dropped on | `DURATION[phase]` = 2 / 3 / 4 s; warning `bossWarn` first (3.5 s CALM) | yes: "STUCK 2.1s" on touch | no | `boss.ts:67, 118-126`, `game.ts:759`, `GameScene.ts:1111-1122` |
| B2 | Frost row (Fridge Overlord): no merge *into* the row | 2-4 s | lane text; the refusal itself is silent | no | `boss.ts:124`, `game.ts:759` |
| B3 | Junk blocks (boss): cell locked | 8 s each | card on tap | no | `boss.ts:409`, `game.ts:230` |
| B4 | Remix jam / row gaps / piano row lock | jam 5 s, gaps 4 s, piano 4 s | lane "BLOCKED 3.2s" | no | `remix.ts:15, 32, 146`, `GameScene.ts:5712-5726` |
| B5 | Corner modifiers (`masked`): permanent closed cells | whole level | card on tap | no (by design) | `game.ts:230`, `GameScene.ts:5521` |
| B6 | Tow bar: swapping/merge splits the pair, refused all-or-nothing | 4 s | text only on the pair | no | `game.ts:794-812`, `boss.ts:420` |
| B7 | Mismatch drop (same family, different rank): bounce, not a swap | instant | yes ("Merge the SAME number") | no | `GameScene.ts:1495-1505` |
| B8 | Puzzle: only merges, move budget | whole puzzle | yes | no | `game.ts:761-777` |
| B9 | Phase gate: `drop` refused unless playing/tutorial (won, lost, choice) | n/a | n/a | `choice` has no UI path for level play (levels end `won`) | `game.ts:752, 1143-1145` |
| B10 | Board with no same-rank pair: nothing to merge until a part arrives (rescue after 2.5 s, then every 3 s) | 2.5 s + 3 s steps | no ("why can't I merge?") | no | `game.ts:17-18, 1373-1378` |
| B11 | CALM breather after a machine breaks: no supply for 2.5 s while the next walks in | 2.5 s per kill | no | no | `tuning.ts:44`, `game.ts:1226, 1335, 1352` |
| B12 | Tool cells: locked for machines, never woken/pulled | while the tool is on the board | tool art | no | `tools.ts:135`, `cascade.ts:354` |
| B13 | Wards / Blast Plate stun: boss delayed, not a block | n/a | n/a | no | `game.ts` support |
| B14 | Held cell is reserved: a delivery/boss pick avoids the dragged cell | while dragging | n/a | no | `GameScene.ts:1857` |

Not a block (checked): merges are never refused because a cascade is still animating. The core resolves a merge instantly and the animation never gates input (`CLAUDE.md` invariant; `update()` ticks continue). `playKill` / stage `introTarget` banners are visual only.

## 2. Deadlocks

| id | how to reach it | why it sticks | evidence |
|---|---|---|---|
| D1 | Teaching card open (`explaining = true`, `paused = true`) -> pause gear -> RESTART or HOME | `startState` calls `coach.clear()` (hides GOT IT) and keeps `explaining` on purpose (`if (!this.explaining) explainQueue=[]`); nothing else clears it; `onDown` returns on `explaining` (`:1088`). After RESTART `paused` stays true (frozen board). After HOME `quitHome` sets `paused=false`, so the **clock runs while input is dead = timed loss** | `GameScene.ts:449-478, 1088, 2139-2160, 3500-3512`; assignments of `explaining` only at 2145/2152 |
| D2 | Guided clamp dodge active -> pause -> RESTART/HOME | `guided` is never cleared except by the exact drag (`:1488`); `update()` skips ticks while `guided`; `commitDrop` refuses every other drop (`:1487`), and the new level's cells differ | `GameScene.ts:1486-1488, 1852, 2653-2690` |
| D3 | Power-up lesson active -> pause -> RESTART/HOME (or the only fitting machine merged away in the 480 ms+ before the lesson shows) | `itemLesson` cleared only in `itemApply` (`:2616`); `onDown` returns at `:1106`; clock gated at `:1852` | `GameScene.ts:2595-2620` |
| D4 (minor) | Boss wake card opened, then an inspect card is closed by tap | `closeInspect` sets `paused=false` while the wake card is still up: the clock runs under the card | `GameScene.ts:607, 3258` |
| D5 (minor) | Explainer waits for finger-up (`afterHold`); a stuck touch (lost touchend) keeps `holding()` true, the card never opens and nothing else fires | mitigated by `freeStalePointers` and the `update()` pointer check | `GameScene.ts:1478-1483, 1868, 1447` |

These are from reading the code; I did not drive the real scene (no browser run, no device). Treat D1-D3 as "high confidence by code path, not reproduced".

## 3. Measurement (CALM, levels 1-80)

Command: `npx vite-node tools/freeze-measure.ts --from 1 --to 80 --n 8 --pace calm --out <file>` (ran as four 20-level chunks). Bot: `smart3` of `tools/level-report.ts` (best previewed merge every 3 s +-20%), seeds `level*1009 + i*7919`, i = 1..8, 640 plays, ~7 s of CPU per level. Raw per-level CSV: `docs/design/merge-freeze-data/hazard-by-level.csv`. Pilot (levels 1-12, n = 3) gave the same numbers where hazards exist, so the spread is small; no CI is computed on 8 seeds, treat the fractional values as +-0.3 s.

Level time = median clear time. Hazard-blocked = seconds when at least one cell is locked/clamped/frozen; "all-pairs-blocked" never occurred (0.00 s in every level). No-pair = no same-rank pair on the board.

| levels | median clear s | hazard-blocked s (mean) | % level | worst level s | no-pair s | % level | win rate |
|---|---|---|---|---|---|---|---|
| 1-10 | 43 | 0.30 | 0.7% | 3.0 | 0.00 | 0.0% | 100% |
| 11-20 | 61 | 0.90 | 1.5% | 6.0 | 0.00 | 0.0% | 100% |
| 21-30 | 81 | 0.91 | 1.1% | 9.1 | 0.18 | 0.2% | 96% |
| 31-40 | 85 | 0.24 | 0.3% | 2.1 | 0.45 | 0.5% | 100% |
| 41-50 | 102 | 1.40 | 1.4% | 14.0 (L43) | 0.80 | 0.8% | 92% |
| 51-60 | 98 | 0.00 | 0.0% | 0.0 | 0.74 | 0.8% | 99% |
| 61-70 | 98 | 0.00 | 0.0% | 0.0 | 0.05 | 0.1% | 100% |
| 71-80 | 108 | 1.12 | 1.0% | 11.2 (L77) | 0.21 | 0.2% | 96% |
| all 80 | 84 mean of medians | 0.61 | 0.7% | | 0.30 | 0.4% | |

Worst individual levels: L43 14.0 s (9.9%), L77 11.3 s (9.8%), L25 9.1 s (9.7%), L19 6.0 s (9.2%). Longest dry board: L35 4.5 s (4.0%).

Scene-level, per level (constants, not simulated): run intro 1.5 s every level = 1.8% of an 84 s level (clock stopped too, tap skips); win show 3.6 s (post level; 0.6 s unskippable); loss 0.4 s.

### Top 5 freeze sources by time per typical level

| rank | source | typical seconds | share of an 84 s level | note |
|---|---|---|---|---|
| 1 | win show (S10) | 3.6 (0.6 hard) | after the level | only wins; skippable after 0.6 s |
| 2 | run intro (S1) | 1.5 | 1.8% | every level, clock also stopped |
| 3 | hazard-blocked cells (B1-B4) | 0.61 (up to 14) | 0.7% | partial block; bot dodges around it |
| 4 | dry board + breather (B10, B11) | 0.30 (up to 4.5) + 2.5 per kill | 0.4% + | the breather share is not separated; no explanation shown |
| 5 | inspect/cell cards + teaching cards (S3-S9) | not measurable headless | unknown | unbounded; the one that eats a drag |

What I could not measure: how often a human taps a machine (S3), how long players leave a card open, first-time cards (depend on the save), real device frame stalls, real human blocked-time under hazards (the bot only chooses unblocked merges, so hazard time is a lower bound). Suggest reading `tlog` `inspect`, `inspect_cell`, `explain`, `drop_reject` events from the real playtest log export (pause menu "export playtest log") to count S3/S5 and rejects per level.

## 4. Fixes, ranked by value

| # | fix | fixes | effort | notes |
|---|---|---|---|---|
| 1 | In `startState` (and `quitHome`) reset `explaining`, `explainQueue`, `guided` (destroy objs), `itemLesson`, `itemSelected`, `introActive`, `tutorialWaiting`, `inspectC`, `paused=false` | D1-D3, D4 partly | S | removes every permanent freeze; add one unit test per flag |
| 2 | Tap on a machine no longer pauses: show the inspect card as a non-pausing tooltip (or pause only on long press), and let a tap outside it start a drag at once | S3, S4 | M | biggest felt freeze; the next tap is currently eaten |
| 3 | Queue the input: a drag started during the 1.5 s intro (S1) or a card closing is kept and committed when input opens; make the intro non-blocking (play in the first 300 ms while the board is live) | S1, S16, S10 | S/M | intro cost 1.5 s x every level |
| 4 | Show why: when a drop is refused by a block (frost row, jam, tow) show a one-line hint + the remaining seconds, as clamp already does; when no pair exists say "no pair: part coming in 2 s" | B2-B4, B6, B10, B11 | S | text only; no rule change |
| 5 | Make teaching cards interruptible: a tap outside the card on the board closes it, GOT IT is also reachable by pause/HOME without leaving state; guided dodge: allow any legal dodge, add a timeout escape | S5, S7, S8 | M | tunes first-time experience |
| 6 | Shorten the win show: allow tap to skip at 0 ms for repeat wins, keep 3.6 s only for boss/first clear | S10 | S | cosmetic |
| 7 | Shorten hazard durations or let a merge clear a clamp/jam early (rule change: frozen for Unity port, ask the owner first) | B1-B4 | M | measured value small (0.7%); do last |
| 8 | Fix D4: `closeInspect` must not unpause while a wake card/explainer is open (use a counter of pause reasons instead of the `paused` boolean) | D4, and root cause of D1-D3 | M | a pause-reason set makes fixes 1 and 8 one change |

Recommendation: do 1 now (smallest, kills the real stuck states), then 2 and 4 (what the owner most likely felt), then 3.

## Reproduce

```
git rev-parse HEAD   # base 0a3d2f6 + this commit
npm ci
npx vite-node tools/freeze-measure.ts --from 1 --to 80 --n 8 --pace calm --out freeze-out.csv
```
Seeds are fixed in the script; tools: node v24.19.0, vite-node from `package.json`. Output: `docs/design/merge-freeze-data/hazard-by-level.csv` (the run in this doc; columns in the script header). Determinism checked: levels 8-10, n = 2, run twice, output files identical (`cmp`).
