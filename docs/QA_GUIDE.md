# QA tools guide (plain words)

The QA panel is for testing. It is not part of the real game. Every switch here is saved on **this phone only**, not in your save. A phone-friendly copy of this page is `docs/qa-guide.html`.

Read from `src/game/ui/qaPanel.ts`, `src/content/experiments.ts`, `tests/qaPanel.test.ts` (build of 2026-10-15, commit a157f3d).

## How to open it

Two ways:

1. Tap the round red **QA** button on the **ROAD** tab (right side, under the top bar).
2. Open **Settings** and tap the red **QA TOOLS** button.

Tap **BACK** (top right of the panel) to leave.

## How the panel works

- The panel has **sections**. Tap a section title to open or fold it. Only START HERE is open at first.
- Drag with one finger to scroll.
- A **switch** has an ON/OFF pill. Tap it. A message at the top tells you what changed.
- A **choice row** shows several words in a bar (for example OFF / CALM / MANIA). Tap one word.
- A **button** (GIVE, SHOW, ...) does a thing once.
- Many rows say when they apply: **Next level** means start a new level first. **Open ROAD** means leave and reopen the ROAD tab.
- **RESET ALL** (top of START HERE) puts every switch back to its default. It does not touch SCREEN SHAKE or any GIVE button.
- The line "Which build am I on" shows the build. Put it in every bug report.

## The sections

| Section | What it is |
|---|---|
| START HERE | 8 guided tests. Tap START, do what the card says, then answer YES or NOT RIGHT. Also RESET ALL. |
| QUICK TOOLS | Shortcuts: jump to a level, get units, crates, bolts. |
| MERGE FEEL | Rules that change how merging and level speed feel. |
| UNITS | Turn on the newer units and unit experiments. |
| CRATES | How crates look and open. |
| LEVELS AND TESTS | Mixed bag: level experiments and almost all road-map switches. |
| SCREW YARD | The Screw Yard event experiments. |
| DISPLAY | Looks and motion only. Nothing here changes how a level is won. |

## Every switch

"Default" is what you get after RESET ALL. ON-by-default switches are already part of the game.

### START HERE

| Name on screen | Meaning | Default | What you see | When to use |
|---|---|---|---|---|
| RESET ALL (button) | Puts every switch back to its default. | – | Everything returns to normal. | Before a fresh test, or when something looks odd. |
| Tested N of 8 | Counts your answered guided tests. | – | A counter. | To see what is left. |
| Test 1 NEW CRATE OPENING | Sets the toolbox crates, gives 3 crates, opens UNITS. | – | Toolbox that shakes and bursts. | To check crate opening. |
| Test 2 UNITS SCREEN SCROLLING | Turns on all new units, gives every unit level 5, opens UNITS. | – | A long unit list. | To check scrolling. |
| Test 3 MERGE ASSIST HELP | Turns MERGE ASSIST on, jumps to level 4. | – | A glow shows which part to tap. | To check the helper. |
| Test 4 SANDWICH BONUS MERGE | Sets MERGE RULE to +2 AND BONUS, jumps to level 6. | – | The middle part joins in. | To check the sandwich rule. |
| Test 5 CAPPED MERGE LEVEL | Turns on BUDGET LEVELS, starts the first one. | – | A merge counter, no clock. | To check the last-merges level. |
| Test 6 POWER TOOLS TEST | Turns on POWER TOOLS, jumps to level 12. | – | Row Surge or Gear Bomb appears. | To check the tools. |
| Test 7 SCREW YARD PRESSURE | Sets SCREW YARD to OBJECT and YARD PRESSURE on, opens the yard. | – | A countdown and tap budget. | To check yard pressure. |
| Test 8 VARIED LEVEL OPENINGS | Turns on VARIED OPENINGS, jumps to level 7. | – | Different start layout per try. | To check opening variety. |

Each START first resets every switch, then sets only its own. So a START wipes switches you set by hand.

### QUICK TOOLS

| Name on screen | Meaning | Default | What you see | When to use |
|---|---|---|---|---|
| JUMP TO LEVEL | Pick a number with -10 / -1 / +1 / +10, tap GO. All earlier levels count as cleared (2 stars). | – | The road opens on that level card. | To reach a late level fast. |
| ALL UNITS (LV 5) | Every unit goes to level 5. | button | A message "ALL 13 UNITS AT LEVEL 5". | To test the units screen or strong squads. |
| UNLOCK ALL | Opens every locked feature. | button | A message; tabs and features open. | To reach Team, Puzzles, Workshop and so on. |
| BOLTS AND GEMS | +2000 bolts and +500 gems each tap. | button | Counters grow. | To test shops and upgrades. |
| +3 CRATES | One crate of each tier. | button | A message; crates in the UNITS tab. | To test crate opening. |
| START OVER | Wipes the whole save. Tap twice within 3 seconds. | button | The game reloads like a new install. | Only when you want a brand-new player. |

### MERGE FEEL

| Name on screen | Meaning | Default | What you see | When to use |
|---|---|---|---|---|
| THINK BANK | If the board stands still for a few seconds, the level clock stops. | OFF | Clock pauses while you think. Next level. | To test slower, thinking play. |
| MERGE RULE | Choose the sandwich merge rule: TODAY, a +2 version, or +2 AND BONUS. | TODAY | Merging two parts with one between them also takes the middle part. Next level. | To test the sandwich idea. |
| MERGE ASSIST | OFF, ON, or AUTO. A glow points to the next tap. AUTO = levels 1-10 and your first 30 merges. Same as the Settings option. | OFF | A glow on the parts. | To check help for new players. |
| PACE | How fast a level runs: TODAY, CALM, MANIA. | CALM | Slower or faster spawns. Next level. | To compare level speed. |

### UNITS

| Name on screen | Meaning | Default | What you see | When to use |
|---|---|---|---|---|
| ALL NEW UNITS | Turns on crates B and unit batches 1 to 7 together. Shows MIXED if only some are on. | OFF | More units in collection, crates and squads. Row text shows how many units are in play. | To see the full roster. |
| UNIT BATCHES (BATCH 1..7) | Seven cards; each turns one group of new units on or off. Batch 1: Nail Gun, Jackhammer, Gear, Saw Blade. 2: Wrench, Piston, Spring, Belt Drive. 3: Blowtorch, Pipe, Blast Plate, Tesla Tower. 4: Capacitor, Blueprint, Ladder, Rewind Crank. 5: Crane, Dynamo, Wrecking Ball. 6: Robot Arm, Tilt Lever. 7: Rivet Gun, Vice, Router, Hydraulic Press, Lathe. | all OFF | Lit card = on. Those units appear. | To test one group alone. |
| UNLOCK PLAN | New units arrive by chapter: gifts on levels 10, 13, 20, 25, 30, 35, 40, 50, crate tiers, rarer units later. | OFF | Gifts at those levels. | To test how units are handed out. |
| BATCHES + PLAN (ALL ON) | Turns batches 1-7 and the unlock plan on. Only turns on, never off. | button | A message. | A quick way to get everything. Use RESET ALL to undo. |
| ROSTER MODE | Unit job experiments: OFF, B0, B1, ROSTER B. | OFF | Units behave differently in levels. Next level. | For unit-job testing only. |

### CRATES

| Name on screen | Meaning | Default | What you see | When to use |
|---|---|---|---|---|
| CRATE LOOK | OLD crates or the TOOLBOX set (Tool Bag, Toolbox, Tool Chest). | OLD | The crate pictures change. | To see the new crate art. |
| CRATE OPENING V2 | The new opening: buildup, shake, flash, one big reveal, summary, COLLECT. Needs CRATE LOOK = TOOLBOX. | ON | A longer, nicer opening. | To compare with the old opening (turn it OFF). |

### LEVELS AND TESTS

| Name on screen | Meaning | Default | What you see | When to use |
|---|---|---|---|---|
| SPAM TEST | Fast tapping pays less: OFF, A2, A3, A3+TIRE. | OFF | Rewards shrink if you tap fast. Next level. | To test anti-spam rules. |
| VARIED OPENINGS | Ordinary levels start from one of 4 layouts. | OFF | A different start on retries. Next level. | To check variety. Boss levels, puzzles and daily stay the same. |
| PACE CAPS | Free copies stop above rank 4, so top ranks take longer. | OFF | Fewer free high-rank parts. Next level. | To test how hard top ranks are. |
| EFFORT MODEL | Bosses get more health and minions less. | OFF | A bigger boss with tiny minions on boss and mini-boss levels. Next level. | To test boss fights. Stars are not rebalanced. |
| LEVEL ROAD V2 | The new ROAD tab: winding world, chapter scenery, gates, chests, momentum scroll. | ON | The new road. Reopen ROAD. | To compare with the old road (turn OFF). |
| ROAD POLISH | Extra life on the road: parallax, moving road belt, little animals, hero hop, chest rattle. Needs LEVEL ROAD V2. | OFF | A livelier road. Reopen ROAD. | To check road motion and smoothness. |
| ROAD PERF | Hides road pieces that are off screen while you scroll. | ON | Same look, smoother. Reopen ROAD. | Turn OFF to compare speed. |
| ROAD PERF 2 | Second speed pass: no mask, cached sky, paused off-screen motion. | ON | Same look, smoother. Reopen ROAD. | Turn OFF to compare speed. |
| ROAD PERF 3 | Third speed pass: fewer updates while scrolling, resting belt. Needs ROAD PERF 2. | ON | Same look, smoother. Reopen ROAD. | Turn OFF to compare speed. |
| ROAD PERF READOUT | Shows a small number box on the ROAD tab: objects, running motions, FPS. | OFF | Numbers in the corner. Reopen ROAD. | To measure speed and to put numbers in bug reports. |
| ROAD SURFACE KIT | Draws road pieces from the art kit along the path where art exists. | OFF | A different road surface. Reopen ROAD. | To check the road art. |
| ROAD MAP MOCK 1 | Follows the road map mock: side rails (Daily, Quests, Collect, Event, Offer, Season), glow and sparkles at the hero, Bolt next to the hero. | OFF | Badges on the sides. Reopen ROAD. | To see the new road map design. |
| ROAD KIT PREVIEW (SHOW) | Opens a test road made of code placeholders. Needs ROAD SURFACE KIT on. | button | A preview screen. | To look at kit pieces alone. |
| BUDGET LEVELS | Turns on the LAST MERGES levels: no clock, a fixed merge count, stars by merges left. | OFF | Lets you pick a budget level below. | To test that mode. |
| BUDGET LEVEL PICK | Chips with the level names; tap one to play it. Greyed out until BUDGET LEVELS is on. | button | The level starts. | After turning BUDGET LEVELS on. |
| POWER TOOLS | Chain of 5+ makes a Row Surge; a sandwich makes a Gear Bomb. Also sets MERGE RULE to +2 AND BONUS. | OFF | Tool pieces on the board. From level 10. | To test the tools. |
| YARD PRESSURE | Screw Yard gets a countdown and a tap budget. Only in the OBJECT yard. | OFF | A timer from your first tap. | To test yard pressure. |

### SCREW YARD

| Name on screen | Meaning | Default | What you see | When to use |
|---|---|---|---|---|
| SCREW YARD (OLD / OBJECT) | OLD = today's plates. OBJECT = a turnable object. | OLD | A different yard. Open EVENTS, then SCREW YARD. | To test the new yard. |
| YARD BOOK | Stars by tap budget, a unit crate with a cards counter, a Collection Book. OBJECT yard only. | OFF | Book button in the yard. | To test the yard rewards. |

### DISPLAY

| Name on screen | Meaning | Default | What you see | When to use |
|---|---|---|---|---|
| UI KIT V3 | The rebuilt level intro popup. | ON | A new-looking level card on open. Next level. | To compare with the old card (turn OFF). |
| RESOURCE FLY | Reward icons fly to a counter on results, puzzle payout and collection claim. | ON | Icons arc across the screen. | To check reward animation. |
| UNIT SHOTS | Each shooter family has its own shot; chains take the unit's colour. | ON | Coloured shots and chains. Next chain. | To check combat looks. |
| UNIT IDLE | Units breathe, blink, hop and wobble. | ON | Little movement on board, tray and units tab. | To check life, or to turn off if it feels busy. |
| MASCOT MOTION | The mascot Bolt animates: peeks in, hops, points. | OFF | Bolt moves on the level intro. | To check Bolt. |
| MASCOT DEMO (SHOW) | Shows Bolt in each state. Needs MASCOT MOTION on. | button | A demo screen. | To see every Bolt pose. |
| MAP BADGES | Feature badge rails on the road. | OFF | Badges at the road edges. Reopen ROAD. | To test the badges. |
| BADGE STATES | Forces every badge into one state: AUTO, IDLE, READY, TIMER, LOCKED. | AUTO | All badges look the same. Reopen ROAD. | To inspect each badge look. |
| UI JUICE | Popups pop in, buttons squash, glints and sparkles on rewards and badges. | OFF | More bounce and shine. Reopen a popup. | To check the extra shine. |
| SCREEN SHAKE | Camera shake on merges and bosses (same as Settings). | your setting | A shake preview when you tap. | If shake is too strong or too weak. RESET ALL does not change it. |

If you leave motion off (reduced motion on your phone), the motion switches show nothing.

## Recipes

### 1. See the new road map
1. Open QA TOOLS (red QA button on the ROAD tab).
2. Tap **LEVELS AND TESTS** to open it, then scroll.
3. Make sure **LEVEL ROAD V2** is ON.
4. Turn **ROAD MAP MOCK 1** ON. A message says to open the road.
5. Tap **BACK**, then tap the **ROAD** tab (leave and come back if you are already there).
6. You see rails on the sides and Bolt near the hero. For Bolt to move, also turn **MASCOT MOTION** ON (DISPLAY).
7. Want the other badge style? Turn it OFF and use **MAP BADGES** in DISPLAY instead.

### 2. Compare road speed ON and OFF with the ROAD PERF READOUT
1. Open QA TOOLS, then LEVELS AND TESTS.
2. Turn **ROAD PERF READOUT** ON. Tap BACK and open ROAD.
3. Scroll the road for 10 seconds. Write down the three numbers in the corner (objects, motions, FPS).
4. Go back to QA TOOLS. Turn **ROAD PERF**, **ROAD PERF 2** and **ROAD PERF 3** OFF (3 first).
5. Reopen ROAD, scroll the same way for 10 seconds, write the numbers again.
6. Turn all three back ON (or tap RESET ALL, which also turns the READOUT off).
7. Better = fewer objects and a higher FPS.

### 3. Jump to a level
1. Open QA TOOLS, then QUICK TOOLS.
2. On **JUMP TO LEVEL**, tap -10, -1, +1 or +10 until the big number is the level you want.
3. Tap **GO**. The level card opens.
4. Tap play. Earlier levels now count as cleared.

### 4. Try the level intro popup (boss levels too)
1. In DISPLAY, make sure **UI KIT V3** is ON.
2. Jump to a boss level with recipe 3. Boss levels have a boss on the card; I could not find a fixed list in the QA code, so use the road and look for the boss icon.
3. Read the new-style card that opens.
4. Want to compare? Turn UI KIT V3 OFF, jump again, and look at the old card.
5. For Bolt in the popup, also turn **MASCOT MOTION** ON.
6. For bigger bosses, turn **EFFORT MODEL** ON before you start the level.

### 5. Reset a switch
- One switch: tap it again (ON goes to OFF), or tap the default word on a choice row.
- Everything: open **START HERE** and tap **RESET ALL**. Switches go back to their defaults. SCREEN SHAKE and GIVE buttons are not undone.
- A START on a guided test also resets everything first.
- To clear the whole save: QUICK TOOLS, **START OVER**, tap twice. This cannot be undone.

### 6. Report a problem
1. Open QA TOOLS. Read the line **Which build am I on** and write it down.
2. Write which switches you changed. If unsure, say "I tapped RESET ALL, then turned X ON".
3. Write the steps: which level (use JUMP TO LEVEL numbers), what you tapped.
4. Write what you expected, and what happened.
5. For slow or choppy: turn ROAD PERF READOUT on and write the three numbers.
6. Take a screenshot. Send everything together.

## Confusing things in the panel, and a fix for each

1. **The road switches are scattered.** Nine ROAD rows and ROAD MAP MOCK 1 sit inside LEVELS AND TESTS, while MAP BADGES, BADGE STATES and MASCOT sit in DISPLAY. *Fix:* a new ROAD section holding all road, badge and Bolt switches.
2. **Names and "needs" are hidden.** ROAD PERF, PERF 2, PERF 3, ROAD POLISH and CRATE OPENING V2 depend on other switches, but nothing shows it when the other one is OFF. *Fix:* grey out a switch with a short "needs X" line when its parent is OFF, and rename the three to "ROAD SPEED 1/2/3 (hide off-screen / cached sky / fewer updates)".
3. **Short codes mean nothing.** A2, A3, A3+TIRE, B0, B1, ROSTER B, "Sandwich merge", "rank 4". *Fix:* a one-line plain meaning under each choice when selected, or put the words in the label.
4. **You cannot see what you changed.** Defaults are mixed (some ON, some OFF) and no row shows "changed from default". *Fix:* a dot or tint on any row that is not at its default, plus a count in the header ("3 changed").
5. **Overlapping and dangerous rows.** ALL NEW UNITS, UNIT BATCHES, BATCHES + PLAN and ROSTER MODE all change the unit roster; SCREW YARD is both a section and a row; START OVER (wipes save) sits beside harmless GIVE buttons; POWER TOOLS silently changes MERGE RULE; a guided START silently resets your own switches. *Fix:* merge the unit rows into one group with one intro line, move START OVER to the bottom in its own red "DANGER" block, and warn on the card when a START will reset.
