# Screw Yard: pressure and pacing options (t-a66f43c4)

Owner: the Screw Yard "needs a lot of thought", time pressure or something else, it is not "Screwdom 3D" yet. Docs only; nothing in `src/` was changed. All rewards are in-game cards and Bolts, no payments.

## What the yard is today (code read)
- Object yard (`src/core/screwObject.ts`, `src/game/ObjectYardScene.ts`): turn a 3D unit (Cannon, Coil, Bell) between 4 views, tap free screws. They go into 2 open colour boxes (3 each, next 2 colours shown) or the holding row (`ROW_SIZE` 5). A full row loses. Helpers: Broom, Hammer, Drill (+1 row slot), start kit 1 each. A box-complete moment (latch, chime) exists.
- Two prototypes already exist, both default OFF, QA rows beside SCREW YARD:
  - `yardPressure` (`src/core/yardPressure.ts`, numbers in `src/content/yardObjects.ts`): clock from the first tap (75 / 100 / 130 s) plus a tap budget (1.5x the solver's minimum). Stars from time left and taps used. Amber at 25% left, red at 10%.
  - `yardBook` (`src/core/yardBook.ts`): "Dismantle and Collect". Stars from taps (screws x 1.3 + 4) and holding-row peak (<= 2 for 3 stars), Cannon > Coil > Bell unlock chain, cards to the crate (3 stars = x2).
- Old weekly 2.0 yard (`ScrewScene`, `yardWeek.ts`): 10-yard ramp, 4-slot dock, swinging plates, stars by dock peak, boosters earned only. DESIGN.md says the Screwdriver ticket was dropped ("too many systems").
- Only pressure today: the row can fill. Nothing makes the player hurry or care about efficiency unless a flag is on. So the yard is a calm sorting toy, and the owner feels no tension.

## What other screw / pin games do (short web look)
- Most hits (Screw Jam family, Pin Out style) use a small buffer of waiting slots as the main pressure. Mismatched screws park there, a full buffer loses.
- Timers are common but optional; some store pages sell "no time limit" as the feature, others add a clock plus a Timer Freeze booster. Hard levels add rusted or stripped screws, locked slots, hidden colours.
- Boosters (extra slot, undo, shuffle, drill) are earned or bought and are the soft way past a hard level.
- Pattern: pressure comes from limited space first, clock second. A clock alone on a pure sort puzzle feels like a chore.
Sources: [Screw Jam Out](https://apps.apple.com/us/app/id6720726422), [Screw Puzzle: Pin Jam](https://apps.apple.com/mo/app/%E8%9E%BA%E4%B8%9D%E6%8B%BC%E5%9B%BE-%E5%8D%A1%E4%BD%8F%E8%9E%BA%E6%A0%93/id6670152828?l=en-GB), [Screw Nuts: Bolts & Pin Puzzle](https://apps.apple.com/lc/app/twist-pin-puzzle-screw-nuts/id6670750004), [Screw Out](https://apps.apple.com/us/app/id6739415389).

## Option 1: Clock + tap budget (finish what exists)
- What: each unit has a countdown from the first tap and a tap budget. Run out of either = the object is lost. Stars for time left and few taps.
- Why it feels good: clear, loud, easy to explain. The ring going amber then red gives a real heartbeat. Retry for 3 stars is a clean goal.
- Fit: already built as `yardPressure`. Works with the merge game's own clock feel. Economy: losing costs only the attempt; crate cards still come from `yardReward`.
- Risks: wasted taps on blocked screws are punished, which feels unfair to new players. Clock on a thinking puzzle (turn, plan) causes panic taps. Red pulse must stay readable under reduced motion.
- Effort: S (tune numbers, first-attempt grace, Timer Freeze helper if wanted).
- Flags / tests: `yardPressure` (exists). Tests: `yardPressure` core tests, add "grace tap doesn't count", "freeze stops the clock", flagsOff test stays green.

## Option 2: Tight tray + efficiency stars (calm mode with stars)
- What: no clock. Pressure is space and planning: the row stays small, and stars reward clearing with a low holding-row peak and few taps. Losing = a full row only. Optional tighter row (4) on later units.
- Why it feels good: matches how the genre's best games create tension (limited slots) and respects the "calm" players. Stars give a reason to replay. Cards double at 3 stars.
- Fit: already built as `yardBook` (stars, chain, crates). Fits the merge economy: cards feed unit ranks, the same sink as merges. Free of timers, so it never fights the merge clock.
- Risks: without a clock, a player can just sit; tension may stay low on the easy Cannon. Star thresholds can feel invisible unless the HUD shows the row peak and tap budget.
- Effort: S to M (tune, HUD clarity, row size 4 on Coil/Bell).
- Flags / tests: `yardBook` (exists), optional `rowSize` choice per unit. Tests: `yardBook.test.ts` (exists), add per-unit row size and star bands.

## Option 3: Box Beat (combo timer, no losing)
- What: finishing a box starts a short "beat" window (say 8 s). Complete the next box inside it and a streak counter goes up (x2, x3...). Streak pays extra cards and Bolts at the end. If the window ends, the streak resets, nothing is lost and no failure screen.
- Why it feels good: speed is a bonus, not a threat. Uses the existing box-complete moment (latch, rising chime per consecutive box). Players choose how risky to play.
- Fit: the chime already steps up per consecutive box. Streak maps to the merge game's cascade excitement. Economy: bounded, e.g. max +2 cards per unit, so it cannot break crate pacing.
- Risks: rewards luck of colour order; fast tapping can clash with a full row (speed vs. safety). One more number on screen next to stars and row, readability needs care. Window must pause while turning the object.
- Effort: M (new core `yardStreak.ts`, HUD ring, tuning, tests).
- Flags / tests: new `yardStreak` (default OFF, QA flag in `qaPanel.ts`). Tests: window starts on box complete, pauses while turning/paused, resets, cap on bonus, same seed + taps gives same result, flag OFF = today.

(Rejected here: a rising hazard such as rust locking screws or slots over time. It is the strongest tension but it hides the screw colours and needs new art and a solver check, so it is L and risky for readability.)

## Recommendation
Option 2 as the base, with a light Option 1 clock only as a bonus star. Concretely: turn `yardBook` on first (space + efficiency, no punishing clock), tune the row to 4 on Coil and Bell, and make the clock a third star condition ("done in time"), never a loss. Then try Option 3 later if it still feels flat. This copies what the genre does (space first, clock second) and reuses two built prototypes, so it is S-M effort and mostly tuning.

## Questions for the owner
1. Should the yard ever be able to fail by time, or only when the row is full?
2. Do you want the yard to feel like a calm puzzle you replay for stars, or a quick rush where speed is the point?
