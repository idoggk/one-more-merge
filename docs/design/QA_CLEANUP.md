# QA cleanup: every switch, what it is, what to do with it

Owner: "we got too many qa options. I can't remember how to QA everything."

This page lists **every** row of the QA panel. **Nothing is deleted by this task.** The new QA PANEL V2 (switch `qaPanelV2`, default ON) hides the clutter behind five presets and a grouped, searchable list; this table is the plan for shrinking the list for real, one owner decision at a time.

How to read it
- **Default**: what the switch is after RESET ALL (= what a player gets).
- **State**: `shipped` (live in the game), `finished-off` (finished, waiting for the owner to approve it), `prototype` (an experiment, rules or content not decided), `obsolete` (superseded, only kept to see the old version), `tool` (a QA helper, not a game feature).
- **Action**: `keep`, `merge into preset` (the preset turns it on, the single switch can later be hidden), or `retire after owner confirms` (remove the switch and its OFF code path once the owner says the ON version is right).
- **Retiring changes**: what players or QA lose if the switch is removed. For `shipped` switches players see no change, because the ON version already is the game.
- Rows marked **old** are shown last in each group, with "(old)" in the name.

## Presets (what each one sets)

| Preset | Sets | Look at |
|---|---|---|
| PLAYER VIEW | Every switch at its default. | Play normally; odd things are real bugs. |
| NEW FEATURES | `levelPace2`, `levelTimeline`, `roadMapMock1`, `mascotMotion`, `mapBadges`, `roadSurfaceKit`, `roadPolish`, `uiJuice`, `cratesLook`=toolbox | ROAD tab, a level intro, a popup, a level. |
| ROAD TEST | `roadPolish`, `roadSurfaceKit`, `roadMapMock1`, `mapBadges`, `roadPerfHud` | Drag ROAD; read FPS. |
| LEVEL LENGTH TEST | `levelPace2`, `levelTimeline` (+ JUMP TO LEVEL below the presets) | Time a clear. |
| RESET ALL | Every switch back to default; forgets the last preset. | Same as PLAYER VIEW. |

Prototype switches (roster batches, merge rules, think bank, yard pressure...) are not in any preset on purpose: they change rules or content and each needs its own decision.

## ROAD

| Switch (row id) | Name in panel | Default | State | Action | What retiring would change |
|---|---|---|---|---|---|
| `roadv2` | Winding road map (old) | ON | shipped | retire after owner confirms | The first-generation road code and its OFF path go away; players see no change. |
| `roadPolish` | Road polish | OFF | finished-off | merge into preset | Becomes always-on for players once the owner confirms the drag is smooth, or the code is deleted. |
| `roadPerf` | Road perf 1 (old) | ON | obsolete | retire after owner confirms | The old unculled road path goes away; players see no change. |
| `roadPerf2` | Road perf 2 (old) | ON | obsolete | retire after owner confirms | The pass-1 road path goes away; players see no change. |
| `roadPerf3` | Road perf 3 (old) | ON | obsolete | retire after owner confirms | The pass-2 road path goes away; players see no change. |
| `roadPerf4` | Road perf 4 (old) | ON | shipped | retire after owner confirms | The pass-3 road path goes away; players see no change. |
| `roadPerfHud` | Perf readout | OFF | tool | merge into preset | QA loses the on-screen FPS readout; the game is unchanged. |
| `roadSurfaceKit` | Road surface kit | OFF | finished-off | merge into preset | Becomes always-on (after art approval) or the stamping code is deleted. |
| `roadMapMock1` | Road map mock | OFF | finished-off | merge into preset | Becomes the real road map screen after the owner approves it, or is deleted. |
| `roadKitPreview` | Road kit preview | button | tool | keep | QA loses the art check page for the road kit. |
| `mapBadges` | Map badges | OFF | finished-off | merge into preset | Becomes always-on after the owner approves it, or the badge code is deleted. |
| `mapBadgesForce` | Badge states | AUTO | tool | keep | QA can no longer force a badge state; the game is unchanged. |

## LEVELS

| Switch (row id) | Name in panel | Default | State | Action | What retiring would change |
|---|---|---|---|---|---|
| `thinkBank` | Think bank | OFF | prototype | keep | The think-bank prototype code is removed; no player change. |
| `mergeRule` | Merge rule | TODAY | prototype | keep | The sandwich variants are removed; the rule stays as today. |
| `mergeAssist` | Merge assist | OFF | shipped | keep | Would remove the assist setting players can pick in Settings. |
| `pace` | Level pace | CALM | shipped | keep | TODAY and MANIA are removed; CALM stays. |
| `spam` | Spam test | OFF | prototype | retire after owner confirms | The anti-spam experiment code is removed; MANIA pace loses its A2/A3 link. |
| `varied` | Varied openings | OFF | prototype | keep | The 4 opening layouts are removed. |
| `paceCaps` | Pace caps | OFF | prototype | keep | The rank-4 cap prototype is removed. |
| `effortModel` | Effort model | OFF | prototype | keep | The overlay stops being used; boss HP stays as today. |
| `levelPace2` | Longer levels | OFF | finished-off | merge into preset | The refit becomes the real level data once approved, or is deleted. |
| `levelTimeline` | Armor timeline | OFF | finished-off | merge into preset | Becomes always-on with Longer levels once approved, or is deleted. |
| `budget` | Budget levels | OFF | prototype | keep | The last-merges levels are removed. |
| `budgetPick` | Pick budget level | buttons | tool | keep | QA loses the shortcut to the budget levels. |
| `tools` | Power tools | OFF | prototype | keep | Row Surge and Gear Bomb are removed. |

## UNITS

| Switch (row id) | Name in panel | Default | State | Action | What retiring would change |
|---|---|---|---|---|---|
| `allNew` | All new units | OFF | prototype | keep | The roster-B shortcut is removed; the single batch switches remain. |
| `batches` | Unit batches | OFF | prototype | keep | Roster B batches can no longer be tried on a phone. |
| `unlockPlan` | Unlock plan | OFF | prototype | keep | The chapter unlock plan prototype is removed. |
| `batchesAndPlan` | Batches + plan (old) | button | obsolete | retire after owner confirms | One redundant button goes; All new units plus Unlock plan do the same. |
| `rosterMode` | Roster mode | OFF | prototype | keep | The unit job experiments are removed; the roster stays as today. |
| `cratesLook` | Crate look | OLD | finished-off | merge into preset | The toolbox look becomes the only look once approved, or is deleted. |
| `crateOpenV2` | New crate opening (old) | ON | shipped | retire after owner confirms | The old opening code goes away; players see no change. |
| `unitShots` | Unit shots (old) | ON | shipped | retire after owner confirms | The plain shot path goes away; players see no change. |
| `unitIdle` | Unit idle motion (old) | ON | shipped | retire after owner confirms | The still-picture path goes away; players see no change. |

## SCREW YARD

| Switch (row id) | Name in panel | Default | State | Action | What retiring would change |
|---|---|---|---|---|---|
| `yardMode` | Yard type | OLD | prototype | keep | One yard variant is removed; owner picks which. |
| `yardBook` | Yard book | OFF | prototype | keep | The yard book prototype is removed. |
| `yardPressure` | Yard pressure | OFF | prototype | keep | The yard time pressure is removed (owner wants it, so keep). |

## UI

| Switch (row id) | Name in panel | Default | State | Action | What retiring would change |
|---|---|---|---|---|---|
| `uiKitV3` | New level popup (old) | ON | shipped | retire after owner confirms | The old level card goes away; players see no change. |
| `resourceFly` | Flying rewards (old) | ON | shipped | retire after owner confirms | The no-fly path goes away; players see no change. |
| `mascotMotion` | Mascot motion | OFF | finished-off | merge into preset | Becomes always-on after approval, or the animation code is deleted. |
| `mascotDemo` | Mascot demo | button | tool | keep | QA loses the Bolt demo page. |
| `uiJuice` | UI juice | OFF | finished-off | merge into preset | Becomes always-on after approval, or the code is deleted. |
| `shake` | Screen shake | player choice | shipped | keep | Would remove a player setting. |

## DEBUG

| Switch (row id) | Name in panel | Default | State | Action | What retiring would change |
|---|---|---|---|---|---|
| `jump` | Jump to level | tool | tool | keep | QA loses the fastest way to reach a level. |
| `allUnits` | All units level 5 | button | tool | keep | QA loses the unit shortcut. |
| `unlockAll` | Unlock all | button | tool | keep | QA loses the unlock shortcut. |
| `bolts` | Bolts and gems | button | tool | keep | QA loses the currency shortcut. |
| `crates3` | Three crates | button | tool | keep | QA loses the crate shortcut. |
| `startOver` | Start over | button | tool | keep | QA loses the one-tap save wipe. |
| `qaPanelV2` | New QA panel | ON | shipped | retire after owner confirms | The old section panel is removed once V2 is trusted. |
| `guideTop` | Guided test progress (guided test card) | tool | tool | keep | QA loses the guided-test counter. |
| `guide1` | Guided test 1 (guided test card) | tool | tool | merge into preset | Replaced by phone recipes in the guide if the owner prefers. |
| `guide2` | Guided test 2 (guided test card) | tool | tool | merge into preset | Replaced by phone recipes in the guide if the owner prefers. |
| `guide3` | Guided test 3 (guided test card) | tool | tool | merge into preset | Replaced by phone recipes in the guide if the owner prefers. |
| `guide4` | Guided test 4 (guided test card) | tool | tool | merge into preset | Replaced by phone recipes in the guide if the owner prefers. |
| `guide5` | Guided test 5 (guided test card) | tool | tool | merge into preset | Replaced by phone recipes in the guide if the owner prefers. |
| `guide6` | Guided test 6 (guided test card) | tool | tool | merge into preset | Replaced by phone recipes in the guide if the owner prefers. |
| `guide7` | Guided test 7 (guided test card) | tool | tool | merge into preset | Replaced by phone recipes in the guide if the owner prefers. |
| `guide8` | Guided test 8 (guided test card) | tool | tool | merge into preset | Replaced by phone recipes in the guide if the owner prefers. |

## Totals

59 rows: 13 retire after owner confirms, 18 merge into preset, 28 keep.

## Suggested order for the owner

1. **Retire the road-perf ladder** (`roadPerf`, `roadPerf2`, `roadPerf3`, then `roadPerf4`) once the drag feels smooth on the iPhone: four switches become none.
2. **Retire the "old look" switches** (`roadv2`, `uiKitV3`, `crateOpenV2`, `resourceFly`, `unitShots`, `unitIdle`) after the owner has seen the ON version for a few builds.
3. **Decide the finished-off group** (`levelPace2`, `levelTimeline`, `roadMapMock1`, `mapBadges`, `roadSurfaceKit`, `roadPolish`, `mascotMotion`, `uiJuice`, `cratesLook`): each is either shipped (switch removed, becomes the game) or deleted. The NEW FEATURES preset exists so they can be judged together.
4. **Roster and rules prototypes** wait for the roster simplification and the core redesign; do not touch them now.
5. **Remove the old section panel** (`qaPanelV2`) when V2 is trusted.
