// Builds docs/qa-guide/index.html: one self-contained page (images embedded as webp data URIs) from the PNGs in
// docs/qa-guide/img (made by tools/qa-guide-shots.mjs). Usage: node tools/build-qa-guide.mjs
// The guide text lives here (CONTENT below); edit it and rerun. Needs Chrome (only to resize / compress the pictures).
import puppeteer from 'puppeteer-core';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const IMG = 'docs/qa-guide/img';
const OUT = 'docs/qa-guide/index.html';
const CHROME = process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const WIDTH = 480; // embedded picture width in px (phone shows them ~360 css px wide)

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
/** Crop presets (fractions of the 780x1688 picture): the crate shots are mostly empty sheet. */
const CROPS = { crate: [0.17, 0.43], top: [0, 0.5] };

// ------------------------------------------------------------------ the guide text
// img entries: [file, caption] or [file, caption, cropName]
const TOUR = [
  {
    n: 1, title: 'JUMP TO LEVEL', why: 'Get anywhere in two taps, so every other test starts where you want.',
    steps: ['Tap the QA button on the road (or Settings, QA TOOLS).', 'Tap +10 until the red number is the level you want. Tap GO.', 'Tap PLAY on the level card.'],
    see: 'The road opens with that level\'s card on top. Every earlier level counts as cleared (2 stars).',
    imgs: [['jump_panel', 'Red box: the JUMP row. +10 was tapped once.'], ['jump_after', 'After GO: the level card, 10 levels further on.']],
  },
  {
    n: 2, title: 'THINK BANK', why: 'The clock stops while you think. The easiest switch to feel.',
    steps: ['Tap THINK BANK until it says THINK BANK: ON.', 'BACK, then start any level.', 'Do not touch the screen for 2 seconds. Then tap a part.'],
    see: 'A small badge top right of the machine: BANK 60s while you play, PAUSED and a number after 2 seconds of no touching. The level clock stops moving while it says PAUSED.',
    imgs: [['think_panel', 'THINK BANK: ON'], ['think_on_a_playing', 'Playing: BANK 60s'], ['think_on_b_paused', '3 seconds without touching: PAUSED, the clock stays at 1:09']],
  },
  {
    n: 3, title: 'PACE', why: 'Calm (the shipped game) against the old fast game against the craze.',
    steps: ['Tap MANIA in the PACE row. BACK and start a level.', 'Then try TODAY. Then go back to CALM (the normal setting).'],
    see: 'MANIA: a pink MANIA tag on the machine picture and only 3 Overdrive boxes (CALM and TODAY have 6). TODAY and CALM look the same in a still picture: CALM breathes more (a pause after each machine, hazards less often).',
    imgs: [['pace_panel', 'MANIA picked'], ['pace_mania', 'MANIA: tag and 3 boxes'], ['pace_calm', 'CALM (normal): 6 boxes, no tag']],
  },
  {
    n: 4, title: 'UNITS: ROSTER B', why: 'Every unit gets one clear job, and helpers become one Support card.',
    steps: ['Tap ROSTER B in the UNITS row.', 'BACK, open the UNITS tab, tap Fan for its page.', 'Start a level (for example 25) with a helper in your team.'],
    see: 'On the Fan page: SUPPORT, a JOB word, a WHEN MERGED line and "SUPPORT CARD (off the board)". In a level the helper is not on the board any more: a card with a charge bar sits at the left of the machine picture.',
    imgs: [['units_panel', 'ROSTER B picked'], ['units_rb_detail', 'Fan page: SUPPORT, JOB: PUSH'], ['units_off_board', 'OFF: the Fan is a part on the board'], ['units_rb_board', 'ROSTER B: the Fan is a CLEAR card (left)']],
  },
  {
    n: 5, title: 'ALL NEW UNITS', why: 'Switches on 26 more units, the 4 crate tiers and the odds sheet in one tap.',
    steps: ['Scroll the panel to the bottom. Tap the wide ALL NEW UNITS button until it says [ON].', 'BACK, open UNITS: the heading reads 39 units instead of 13.', 'Tap SHOP, then the small i ODDS button.'],
    see: 'UNITS 4/39 and a wall of locked silhouettes; the shop and odds sheet list Tool Bag, Toolbox, Tool Chest and Golden Workbench.',
    imgs: [['allnew_panel_on', 'Everything ON (green)'], ['allnew_on_units', 'UNITS 4/39'], ['allnew_on_odds', 'The odds sheet: 4 crate tiers']],
  },
  {
    n: 6, title: 'MERGE RULE: +2', why: 'The sandwich: one merge that swallows two neighbours and jumps two ranks.',
    steps: ['Scroll to the bottom and tap +2 in MERGE RULE.', 'BACK and start a level.', 'Merge a part so that it lands touching two more parts of the same family and rank.'],
    see: 'The word SANDWICH! +2 RANK appears and one part with a bigger number is left, in place of three.',
    imgs: [['rule_panel', '+2 picked'], ['rule_before', 'Before: four rank 2 cannons (11, 12, 13 and 17)'], ['rule_sandwich2_after', 'After dragging the lower one up: SANDWICH! one rank 4 cannon']],
  },
];

/** Each group = a section of the panel, top to bottom. Each control = one collapsible card. */
const GROUPS = [
  {
    id: 'g-start', title: 'Start over and jump (top of the panel)', where: 'panel_top',
    controls: [
      {
        label: 'START OVER (WIPE ALL)', def: 'Button (nothing to switch)', when: 'Right away. Needs two taps within 3 seconds.',
        does: 'Erases the whole save on this phone (levels, units, bolts, gems) and restarts the game as a brand-new player. The QA switches below stay as they are.',
        see: 'First tap: the red button says TAP AGAIN TO WIPE for 3 seconds (then goes back, nothing happens). Second tap: the game reloads into the first-time tutorial.',
        tryit: ['Tap START OVER once and wait 4 seconds: nothing is lost.', 'Tap it twice quickly: the game restarts at the tutorial.', 'Before doing this for real, copy your save code (Settings, COPY SAVE CODE).'],
        imgs: [['startover_armed', 'After the first tap'], ['startover_after', 'After the second tap: the tutorial']],
      },
      {
        label: 'JUMP TO LEVEL  (-10  -1  +1  +10  GO)', def: 'Starts on the level you are on', when: 'Right away.',
        does: 'Marks every earlier level as cleared (at least 2 stars, your 3-star records are kept), then opens the card of the level you picked.',
        see: 'The road screen with the picked level\'s card on top (machines, time, star lines, PLAY). Going one past the last level opens the road with no card.',
        tryit: ['Tap +10 (or -10, +1, -1) until the red number is right.', 'Tap GO.', 'Tap PLAY on the card.'],
        imgs: [['jump_before', 'Before: the road at the level you were on'], ['jump_panel', 'Red box: the whole JUMP row'], ['jump_after', 'After GO: the card of level 23']],
        note: 'In these pictures the number started at 13 and +10 gave 23.',
      },
    ],
  },
  {
    id: 'g-give', title: 'Give stuff', where: 'panel_top',
    controls: [
      {
        label: 'ALL UNITS (LV 5)', def: 'Button', when: 'Right away.',
        does: 'Gives every unit that exists right now (switched-on new ones too) level 5, and puts the helpers on your team list.',
        see: 'The UNITS tab goes from a few cards (and locked silhouettes) to every unit owned at LV 5. A toast says "ALL 13 UNITS AT LEVEL 5".',
        tryit: ['Tap ALL UNITS (LV 5).', 'BACK, open the UNITS tab.', 'Tap a card to read its page.'],
        imgs: [['allunits_before', 'Before: 4 of 13 units, LV 1-2'], ['allunits_panel', 'Red box: the button'], ['allunits_after', 'After: 13 of 13 at LV 5']],
        note: 'The toast always says 13, even when ALL NEW UNITS is on and there are 39 units. The units are all raised either way.',
      },
      {
        label: 'UNLOCK ALL', def: 'Button', when: 'Right away.',
        does: 'Opens every feature that normally unlocks over time: Team, Challenge, Workshop, Puzzles, Remix and the Gems counter.',
        see: 'On the MACHINE tab: the counters bar grows (kits, capsules, gems appear), TEAM shows, WORKSHOP is no longer greyed out ("level 10" gone) and a red dot shows on EVENTS.',
        tryit: ['Tap UNLOCK ALL.', 'BACK, open MACHINE, then EVENTS.'],
        imgs: [['unlockall_before', 'Before (3 levels cleared)'], ['unlockall_panel', 'Red box: the button'], ['unlockall_after', 'After']],
      },
      {
        label: '+2000 BOLTS +500 GEMS', def: 'Button', when: 'Right away.',
        does: 'Adds 2000 Bolts and 500 Gems to your wallet, every time you tap.',
        see: 'The counters at the top of the road go up (0 to 2000 and 500). A toast confirms it.',
        tryit: ['Tap it.', 'BACK: look at the top counters.', 'Open UNITS, SHOP and buy a crate.'],
        imgs: [['bolts_before', 'Before: 0 and 0'], ['bolts_panel', 'Red box: the button'], ['bolts_after', 'After']],
      },
      {
        label: '+3 CRATES', def: 'Button', when: 'Right away.',
        does: 'Adds one Tool Bag, one Toolbox and one Tool Chest (the old wood, iron and gold crates). With UNITS: ROSTER B on it also adds a Golden Workbench.',
        see: 'On the UNITS tab the button changes from NO CRATES to OPEN CRATE (3). A toast says "3 CRATES ADDED".',
        tryit: ['Tap +3 CRATES.', 'BACK, open UNITS.', 'Tap OPEN CRATE and tap through the cards.'],
        imgs: [['crates_before', 'Before: no crates'], ['crates_panel', 'Red box: the button'], ['crates_after', 'After: OPEN CRATE (3)']],
        note: 'The label says 3 but gives 4 with ROSTER B.',
      },
    ],
  },
  {
    id: 'g-switch', title: 'Switches (middle of the panel)', where: 'panel_top',
    intro: 'A switch with "(next level)" in its name changes the next level you start, not the one you are playing. The green [bracketed] button is the one that is on. Switches are saved on this phone only and are not part of the save code.',
    controls: [
      {
        label: 'THINK BANK: OFF / ON', def: 'OFF', when: 'Next level started.',
        does: 'After 2 seconds without touching the screen, the level clock (and supply, auto-shots, Overdrive, boss timers) freezes until a 60-second bank is used up. Touching again resumes it.',
        see: 'ON: a brown BANK 60s badge while you play, a turquoise PAUSED badge with the seconds left after 2 idle seconds; the level clock number stays put. OFF: no badge and the clock keeps running.',
        tryit: ['Tap THINK BANK: ON, BACK, start a level.', 'Hold still for 3 seconds: PAUSED.', 'Make a merge: the clock moves again.'],
        imgs: [['think_panel', 'ON'], ['think_off_idle', 'OFF, 4 s idle: no badge'], ['think_on_a_playing', 'ON, playing: BANK 60s'], ['think_on_b_paused', 'ON, 3 s idle: PAUSED, clock held']],
        note: 'It makes levels much easier (the clock stops while you think). It is meant to be tried, not shipped as is.',
      },
      {
        label: 'CRATES: OLD / CRATES: TOOLBOX', def: 'OLD', when: 'Right away: the next crate you open or see.',
        does: 'Changes the crate pictures: the old wood / iron / gold crates against Tool Bag, Toolbox and Tool Chest. Only the look changes.',
        see: 'Open a crate: the old look shows a chest ("IRON CRATE"); TOOLBOX shows a bag, a red toolbox and a chest with the new names.',
        tryit: ['Tap +3 CRATES, then tap CRATES: OLD so it says TOOLBOX.', 'BACK, UNITS, OPEN CRATE.', 'Compare the three crates.'],
        imgs: [['cratelook_panel', 'TOOLBOX picked', 'row'], ['cratelook_old_wood', 'OLD: wood crate', 'crate'], ['cratelook_old_iron', 'OLD: iron crate', 'crate'], ['cratelook_old_gold', 'OLD: gold crate', 'crate'], ['cratelook_toolbox_wood', 'TOOLBOX: Tool Bag', 'crate'], ['cratelook_toolbox_iron', 'TOOLBOX: Toolbox', 'crate'], ['cratelook_toolbox_gold', 'TOOLBOX: Tool Chest', 'crate']],
        isNew: true,
      },
      {
        label: 'SPAM TEST: [OFF]  A2  A3  A3+TIRE', def: 'OFF', when: 'Next level started.',
        does: 'Makes very fast tapping pay less. A2: a merge made soon after the last one deals less damage, and long chains count a little more. A3: a full board stops handing out new parts to small chains. A3+TIRE: A3 plus a STEADY HAND bar.',
        see: 'A2 and A3+TIRE: a thin STEADY bar under the Overdrive row (top right) that empties after a merge and refills, and damage numbers get smaller when you merge too fast. OFF and A3: no bar.',
        tryit: ['Tap A3+TIRE, BACK, start a level.', 'Merge two pairs as fast as you can: the bar empties.', 'Wait 3 seconds: it refills.'],
        imgs: [['opt_spam_a2', 'A2'], ['opt_spam_a3', 'A3'], ['spam_panel', 'A3+TIRE'], ['spam_off_after', 'OFF, two quick merges: no bar'], ['spam_a2_after', 'A2, two quick merges: STEADY bar'], ['spam_a3f_after', 'A3+TIRE, two quick merges: STEADY bar']],
        honest: 'Plain A3 changes how many new parts you get, which a still picture cannot show (no bar appears). I show its row only.',
      },
      {
        label: 'PACE: TODAY  [CALM]  MANIA', def: 'CALM', when: 'Next level started.',
        does: 'Picks the speed of a level. CALM (the shipped game): a smaller board, a pause after each machine, hazards less often. TODAY: the old, faster game. MANIA: a big fast board with many matches, no boss attacks, anti-spam off.',
        see: 'MANIA shows a pink MANIA tag on the machine and only 3 Overdrive boxes. TODAY and CALM look the same in a still: after 25 seconds of steady merging in one scripted run of level 13, TODAY held 13 parts, CALM 12 and MANIA 19.',
        tryit: ['Tap MANIA, BACK, start level 13.', 'Play 20 seconds: a crowded board.', 'Repeat with TODAY, then back to CALM.'],
        imgs: [['opt_pace_today', 'TODAY'], ['opt_pace_calm', 'CALM (default)'], ['pace_panel', 'MANIA'], ['pace_today', 'TODAY, start of level 13'], ['pace_calm', 'CALM, start of level 13'], ['pace_mania', 'MANIA, start of level 13'], ['pace_today_late', 'TODAY, 25 s later'], ['pace_calm_late', 'CALM, 25 s later'], ['pace_mania_late', 'MANIA, 25 s later']],
        honest: 'TODAY against CALM is a feeling of rhythm. The pictures cannot prove it. Play both for a minute.',
      },
      {
        label: 'UNITS: [OFF]  B0  B1  ROSTER B', def: 'OFF', when: 'Next level started.',
        does: 'OFF: the live game. B0 and B1: older unit experiments (helpers copy too; helpers get a direct job and pass the chain on). ROSTER B: every unit has one clear job that grows at level 3, 6 and 9, and helpers leave the board and become one Support card.',
        see: 'ROSTER B: on a unit page there are SUPPORT, JOB and WHEN MERGED lines; in a level the helper is a charge card left of the machine picture instead of a part on the board. It also adds Legendary units and the 4th crate tier. B0 and B1 change how chains behave, so the pictures look the same as OFF.',
        tryit: ['Tap ROSTER B, BACK.', 'UNITS tab: tap Fan (read the page).', 'Start level 25 with a helper in your team: find the card at the left.'],
        imgs: [['opt_units_b0', 'B0'], ['opt_units_b1', 'B1'], ['units_panel', 'ROSTER B'], ['units_off_tab', 'OFF: the Units tab'], ['units_rb_tab', 'ROSTER B: the Units tab (Beacon is Legendary)'], ['units_rb_detail', 'ROSTER B: Fan page'], ['units_off_board', 'OFF: Fan on the board'], ['units_rb_board', 'ROSTER B: Support card']],
        honest: 'The job words (FIRE, REACH, ROW...) on the cards are there with the switch OFF too. B0 and B1 effects only show while a chain fires.',
      },
      {
        label: 'SCREW YARD: [OLD]  OBJECT', def: 'OLD', when: 'Right away: the next yard you start.',
        does: 'OLD: the flat plates with screws. OBJECT: a turnable 3D block (a Cannon, Coil or Bell) with screws on every side; swipe or use the arrows to turn it.',
        see: 'Events, Screw Yard: with OBJECT there are CANNON / COIL / BELL buttons and PLAY CANNON; the yard shows a 3D block with FRONT 1/4 and the buttons BROOM, HAMMER, DRILL.',
        tryit: ['Tap OBJECT, BACK.', 'EVENTS tab, SCREW YARD, tap COIL then PLAY.', 'Swipe to turn the block, tap the free screws.'],
        imgs: [['opt_yard_old', 'OLD picked'], ['yard_panel', 'OBJECT picked'], ['yard_old_event', 'OLD: the event card'], ['yard_object_event', 'OBJECT: CANNON / COIL / BELL chips'], ['yard_old_play', 'OLD: flat plates'], ['yard_object_play', 'OBJECT: turnable block']],
        isNew: true,
      },
    ],
  },
  {
    id: 'g-new', title: 'New units (lower panel)', where: 'panel_bottom',
    intro: 'Seven batches of new units (26 in all) plus the unlock plan. They are off by default: today\'s game has 13 units. "LEGENDARY" ones (Tesla Tower, Crane, Dynamo, Robot Arm, Tilt Lever) only join when UNITS: ROSTER B is on too. All of these apply right away, and the Units tab, crates, squad pickers and shop show them.',
    controls: [
      {
        label: 'ALL NEW UNITS: [OFF]  (wide button)', def: 'OFF', when: 'Right away.',
        does: 'One tap turns ON ROSTER B (crates B) and batches 1 to 7 together. Tap again to turn them all off. It shows [MIXED] (amber) when only some are on, and the line under it counts the units: 13 off, 39 on.',
        see: 'UNITS tab: "UNITS 4/39" with 35 locked silhouettes instead of 4/13 with 9. The crate shop shows 4 tiers and the odds sheet (the i ODDS button) lists Tool Bag, Toolbox, Tool Chest and Golden Workbench.',
        tryit: ['Tap the wide button until [ON].', 'BACK, UNITS tab: count the silhouettes.', 'SHOP, then the i ODDS button.'],
        imgs: [['allnew_panel_off', 'OFF'], ['allnew_panel_on', 'ON: everything green, 39 UNITS'], ['allnew_panel_mixed', 'MIXED (batches 1 and 4)'], ['allnew_off_units', 'OFF: UNITS 4/13'], ['allnew_on_units', 'ON: UNITS 4/39'], ['allnew_off_shop', 'OFF: the shop'], ['allnew_on_shop', 'ON: the shop'], ['allnew_off_odds', 'OFF: the odds sheet'], ['allnew_on_odds', 'ON: odds sheet with 4 tiers']],
        isNew: true,
      },
      {
        label: 'ALL NEW UNITS  (small purple button)', def: 'Button', when: 'Right away.',
        does: 'Turns on batches 1 to 7 AND the UNLOCK PLAN in one tap. It only ever turns things on (tap each BATCH to turn it off). The wide button\'s OFF turns off ROSTER B and the batches but NOT UNLOCK PLAN, so switch UNLOCK PLAN off separately. This small button does not touch ROSTER B.',
        see: 'Every BATCH button and UNLOCK PLAN turn green; the small button\'s label gets brackets [ALL NEW UNITS].',
        tryit: ['Scroll to the bottom, tap the small purple button.', 'Look at the BATCH buttons.'],
        imgs: [['allnew_small_panel', 'After one tap (all batches and UNLOCK PLAN green)']],
        isNew: true,
      },
      ...[
        [1, 'Nail Gun, Jackhammer, Gear, Saw Blade', 'nail_gun', 'Nail Gun (shooter, job ROW)'],
        [2, 'Wrench, Piston, Spring, Belt Drive', 'piston', 'Piston (shooter, job OPEN SPACE)'],
        [3, 'Blowtorch, Pipe, Blast Plate, Tesla Tower', 'blowtorch', 'Blowtorch (shooter)'],
        [4, 'Capacitor, Blueprint, Ladder, Rewind Crank', 'ladder', 'Ladder (relay)'],
        [5, 'Crane, Dynamo, Wrecking Ball', 'wrecking_ball', 'Wrecking Ball (shooter)'],
        [6, 'Robot Arm, Tilt Lever', 'robot_arm', 'Robot Arm (shooter)'],
        [7, 'Rivet Gun, Vice, Router, Hydraulic Press, Lathe', 'rivet_gun', 'Rivet Gun (shooter)'],
      ].map(([n, units, id, ex]) => ({
        label: `BATCH ${n}`, def: 'OFF', when: 'Right away.',
        does: `Adds ${units} to your collection, the crates and the squad pickers.${n === 6 ? ' Both are Legendary, so they only appear when UNITS: ROSTER B is also on (it was on for these pictures).' : ''}${n === 3 ? ' Its Legendary unit (Tesla Tower) needs UNITS: ROSTER B too.' : ''}${n === 5 ? ' Its Legendary units (Crane and Dynamo) need UNITS: ROSTER B too.' : ''}`,
        see: `The unit's page shows its job word and a purple WHEN MERGED line. Put ${ex} in the squad and it is the part on the board (placeholder art is used for most new units).`,
        tryit: [`Tap BATCH ${n} (it turns green).`, 'BACK, UNITS tab: tap a new card to read WHEN MERGED.', 'Use TEAM to put it in the squad and start a level.'],
        imgs: [[`batch_${n}_panel`, `BATCH ${n} on`], [`batch_${n}_detail`, `${ex}: unit page with WHEN MERGED`], [`batch_${n}_board`, 'In a level (squad set to it)']],
        isNew: true,
      })),
      {
        label: 'UNLOCK PLAN', def: 'OFF', when: 'Right away; gifts arrive when a level is won.',
        does: 'Turns on the chapter unlock plan: boss and level gifts of a unit (level 10 Nail Gun, 13 Wrench, 20 Jackhammer, 25 Gear, 30 Saw Blade, 35 Blowtorch, 40 Blast Plate, 50 Signal Beacon), crate tiers that open by chapter (Tool Bag at level 10, Toolbox 20, Tool Chest 30, Golden Workbench 50), and a crate pool limited by what is open.',
        see: 'Win level 10: the result shows a "NEW UNIT" line, then after NEXT LEVEL a NEW UNIT card for Nail Gun with a GOOD HERE line. With the plan off the same win shows no reveal.',
        tryit: ['Tap BATCH 1 and UNLOCK PLAN (both green).', 'JUMP TO LEVEL 10, GO, PLAY, win it.', 'Tap NEXT LEVEL: the NEW UNIT card.'],
        imgs: [['plan_panel', 'UNLOCK PLAN on (with BATCH 1)'], ['plan_result', 'Level 10 won: result'], ['plan_reveal', 'NEXT LEVEL: the NEW UNIT reveal'], ['plan_off_after', 'Plan OFF: no reveal']],
        honest: 'A gift only appears if the unit\'s batch is on. UNLOCK PLAN alone gives the level-50 Signal Beacon, which is already in the game, and nothing new.',
        isNew: true,
      },
    ],
  },
  {
    id: 'g-rule', title: 'Merge rule and BACK (bottom of the panel)', where: 'panel_bottom',
    controls: [
      {
        label: 'MERGE RULE: [TODAY]  +2  +2 AND BONUS', def: 'TODAY', when: 'Next level started.',
        does: 'The sandwich: if your merge lands touching two more parts of the same rank and family, it absorbs both. +2: the result gains 2 ranks. +2 AND BONUS: 2 ranks plus a third of the Overdrive meter. Puzzles and kickback never sandwich.',
        see: 'A SANDWICH! +2 RANK caption and a single, bigger part where three used to be. TODAY only merges the two you dragged.',
        tryit: ['Tap +2, BACK, start a level.', 'Find three same parts in a row (for example two next to a third).', 'Drag the outer one onto the middle: three become one.'],
        imgs: [['rule_panel', '+2 picked'], ['opt_rule_bonus', '+2 AND BONUS picked'], ['rule_before', 'Before: 11, 12, 13 and 17 are rank 2 cannons'], ['rule_today_after', 'TODAY: 17 onto 12 = a rank 3 in the middle; the two rank 2 beside it stay'], ['rule_sandwich2_after', '+2: SANDWICH, one rank 4'], ['rule_sandwichBonus_after', '+2 AND BONUS: SANDWICH! +2 · +3 OVERDRIVE: one rank 4 cannon and two Overdrive boxes lit']],
      },
      {
        label: 'BACK', def: 'Button', when: 'Right away.',
        does: 'Closes the QA panel and returns to the road.',
        see: 'The road screen, with the QA button (red, top right) to open the panel again.',
        tryit: ['Tap BACK.', 'Tap the red QA button (or Settings, QA TOOLS) to reopen.'],
        imgs: [['panel_back', 'BACK is pinned top right']],
      },
    ],
  },
  {
    id: 'g-settings', title: 'In Settings (not in the QA panel)', where: 'settings',
    intro: 'The whole Settings screen, top to bottom: SOUND, MUSIC, SCREEN SHAKE, SWAP ON DROP, the save-code line and buttons, the two links, QA TOOLS, BACK and the build label.',
    controls: [
      {
        label: 'SOUND: ON / OFF', def: 'ON', when: 'Right away.',
        does: 'Turns sound effects (taps, merges, shots) on or off. It is saved on this phone.',
        see: 'The label flips between SOUND: ON and SOUND: OFF. With OFF the game is silent apart from music.',
        tryit: ['Open Settings (the cog at the top right of the road).', 'Tap SOUND: it flips.', 'Start a level and merge: you hear nothing at OFF.'],
        imgs: [['settings', 'Settings: SOUND is the first button']],
        honest: 'Sound cannot be shown in a picture. Only the label changes.',
      },
      {
        label: 'MUSIC: ON / OFF', def: 'ON', when: 'Right away.',
        does: 'Turns the background music on or off. Sound effects are separate.',
        see: 'The label flips between MUSIC: ON and MUSIC: OFF.',
        tryit: ['Open Settings.', 'Tap MUSIC and listen: the tune stops or starts.'],
        imgs: [['settings', 'Settings: MUSIC is the second button']],
        honest: 'Music cannot be shown in a picture. Only the label changes.',
      },
      {
        label: 'SWAP ON DROP: OFF / ON', def: 'OFF', when: 'Right away.',
        does: 'OFF: dropping a part on a part that does not match bounces it back. ON: the two parts swap places instead.',
        see: 'The label flips. In a level, drag a part onto a non-matching one: OFF it bounces back, ON the two trade places (no damage either way).',
        tryit: ['Tap SWAP ON DROP until it says ON.', 'Start a level and drag a part onto a different one: they swap.', 'Switch it back to OFF and repeat: it bounces.'],
        imgs: [['settings', 'Settings: SWAP ON DROP is the fourth toggle']],
        honest: 'I did not take before and after pictures of a swap; only the Settings label is shown.',
      },
      {
        label: 'COPY SAVE CODE', def: 'Button', when: 'Right away.',
        does: 'Copies your whole save (progress, units, bolts) as a code to the clipboard, so you can keep it in Notes or move it to another phone.',
        see: 'A toast: SAVE CODE COPIED! Paste it in Notes to keep it safe. If the phone refuses the clipboard, a box with the code appears: tap and hold the code, then tap Copy, then DONE.',
        tryit: ['Open Settings.', 'Tap COPY SAVE CODE.', 'Open Notes and paste to check the code is there.'],
        imgs: [['settings', 'Settings: green COPY SAVE CODE (left)']],
        honest: 'I did not take a picture of the toast or code box.',
      },
      {
        label: 'PASTE SAVE CODE', def: 'Button', when: 'Right away.',
        does: 'Loads a save code you copied earlier. It replaces your current progress, after you confirm.',
        see: 'A box to paste the code in, then a LOAD THIS SAVE? sheet that compares the code with what is on this phone. REPLACE loads it. You can undo it once (see the undo line below).',
        tryit: ['Copy a save code first.', 'Tap PASTE SAVE CODE and paste it.', 'Check the comparison, then tap REPLACE (or go back to keep what you have).'],
        imgs: [['settings', 'Settings: blue PASTE SAVE CODE (right)']],
        honest: 'I did not take pictures of the paste box or the confirm sheet.',
      },
      {
        label: 'Loaded the wrong code? Tap to undo', def: 'Only shown after a save code was loaded', when: 'Right away.',
        does: 'After you load a code, this orange line replaces the grey "SAVE BACKUP" line under the toggles. Tapping it puts back the save you had before the load. It works once.',
        see: 'Tap it: an UNDO LAST LOAD? sheet shows BEFORE THE LOAD against NOW ON THIS PHONE with an UNDO button.',
        tryit: ['Load a save code with PASTE SAVE CODE.', 'Open Settings: find the orange line.', 'Tap it, then UNDO.'],
        imgs: [['settings', 'Settings: with no load yet this spot reads SAVE BACKUP (the undo line replaces it)']],
        honest: 'The picture shows the line before any load, so the undo wording itself is not in a picture.',
      },
      {
        label: 'Playtest stats', def: 'Link', when: 'Right away.',
        does: 'Opens a page of numbers the game recorded about your play on this phone.',
        see: 'A sheet of stats with a BACK button that returns to Settings.',
        tryit: ['Open Settings.', 'Tap Playtest stats (orange text, left).', 'Tap BACK.'],
        imgs: [['settings', 'Settings: the orange links Playtest stats (left) and Replay tutorial (right)']],
        honest: 'I did not open this page for a picture.',
      },
      {
        label: 'Replay tutorial', def: 'Link', when: 'Right away.',
        does: 'Starts the first-time tutorial again, without erasing your save.',
        see: 'The tutorial level begins.',
        tryit: ['Open Settings.', 'Tap Replay tutorial (orange text, right).'],
        imgs: [['settings', 'Settings: Replay tutorial (right link)']],
        honest: 'I did not take a picture of the tutorial from this link. START OVER shows the same tutorial.',
      },
      {
        label: 'QA TOOLS and BACK', def: 'Buttons', when: 'Right away.',
        does: 'QA TOOLS (red) opens the QA panel described above. BACK (brown) returns to the title screen.',
        see: 'QA TOOLS: the panel. BACK: the road/title screen.',
        tryit: ['Open Settings.', 'Tap QA TOOLS to open the panel.', 'Tap BACK to leave Settings.'],
        imgs: [['settings', 'Settings: red QA TOOLS, brown BACK, build label']],
      },
      {
        label: 'SCREEN SHAKE: OFF / SOFT / FULL', def: 'SOFT (OFF if your phone asks for reduced motion)', when: 'Right away.',
        does: 'Cycles how hard the screen shakes on big chains, boss hits and yard failures. FULL is the original shake; SOFT is about a third of it and skips small kicks; OFF is none. It is a phone setting and not part of the save code.',
        see: 'The label changes with each tap and the screen gives a tiny test shake.',
        tryit: ['Open Settings (the cog at the top right of the road).', 'Tap SCREEN SHAKE: it cycles.', 'Win a big chain at FULL and at OFF to compare.'],
        imgs: [['settings_shake_hl', 'SCREEN SHAKE: SOFT (default)'], ['settings_shake_2', 'After one tap'], ['settings_shake_3', 'After two taps']],
        honest: 'The shake itself is movement, so a still picture cannot show it. Only the label changes in the pictures.',
        isNew: true,
      },
      {
        label: 'Build ... · abc1234 (and RELOAD LATEST)', def: 'Always shown', when: 'Always.',
        does: 'The line under BACK shows the build date and the short code of the version on your phone. Use it to check you have the newest version. RELOAD LATEST below it fetches the freshest copy (your save is not touched).',
        see: 'A small grey line such as "Build 2026-10-11 02:40 · 53862b6".',
        tryit: ['Open Settings.', 'Read the build line.', 'Tap RELOAD LATEST if it is not the one you were told.'],
        imgs: [['settings_build_hl', 'The build label'], ['settings', 'The whole Settings screen: QA TOOLS button, BACK, build']],
        isNew: true,
      },
    ],
  },
];

const SOON = {
  title: 'Coming soon (not on master yet)',
  body: [
    '<p><b>BUDGET LEVELS</b> is built on branch <code>orch/t-4c676288-budget-levels-bench-3-capped-mer</code> (commit bc5e5f4) but is <b>not merged into master</b>, so it is not in the build you test today and I could not run it here. What the branch says it adds: a wide button <b>BUDGET LEVELS: [OFF]</b> (default OFF) and three bench-level buttons (LAST 6, LAST 8, LAST 10) under it. Turn it on, tap one, and you play a level with <b>no clock and a limited number of merges</b>; a ring shows MERGES LEFT, and stars depend on how many merges you have left after the win. The two pictures below come from that branch\'s own screenshots.</p>',
  ],
  imgs: [['soon_budget_1_start', 'Branch screenshot: a budget level at the start'], ['soon_budget_2_midplay', 'Branch screenshot: MERGES LEFT ring, "win in 2 merges"']],
  more: '<p>When it merges, the panel gets one more row between the new-units group and MERGE RULE. This guide will need one more card then.</p>',
};

const NOTES = [
  'The panel has two screens. The first (top) holds START OVER down to UNITS and SCREW YARD; scroll up the panel with your finger to reach the lower half (ALL NEW UNITS, BATCH 1 to 7, UNLOCK PLAN, MERGE RULE).',
  'Pictures: the red box is the control being explained. Pictures were taken on a 390 x 844 phone screen with tools/qa-guide-shots.mjs; the board in them is whatever the level dealt, so yours will differ.',
  'TODAY against CALM, SPAM TEST A3, and UNITS B0 / B1 change the feel and the numbers behind a chain, not what a still picture shows. They are listed honestly above.',
  'On the unit pages of ROSTER B (Fan, Piston) the small green LV lines overlap the WHEN MERGED text in a few places. That is a layout glitch in the game, seen while taking the pictures; it is not part of this guide.',
  'New since the last guide (t-7699245c): CRATES: TOOLBOX, SCREW YARD, ALL NEW UNITS (both buttons), BATCH 1 to 7, UNLOCK PLAN, and in Settings SCREEN SHAKE and the build label. They carry a NEW tag below. The last guide said "NEW4"; that name no longer exists, BATCH 1 is the same four units.',
];

// ------------------------------------------------------------------ build
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
const page = await browser.newPage();
await page.setContent('<canvas id=c></canvas>');
const cache = new Map();
async function embed(name, cropName) {
  const key = `${name}|${cropName ?? ''}`;
  if (cache.has(key)) return cache.get(key);
  const file = `${IMG}/${name}.png`;
  if (!existsSync(file)) throw new Error('missing picture ' + file);
  const b64 = readFileSync(file).toString('base64');
  const crop = CROPS[cropName] ?? [0, 1];
  const url = await page.evaluate(async (b64, crop, W) => {
    const img = new Image();
    img.src = 'data:image/png;base64,' + b64;
    await img.decode();
    const sy = Math.round(img.height * crop[0]), sh = Math.round(img.height * (crop[1] - crop[0]));
    const c = document.getElementById('c');
    c.width = W;
    c.height = Math.round((sh * W) / img.width);
    c.getContext('2d').drawImage(img, 0, sy, img.width, sh, 0, 0, c.width, c.height);
    return c.toDataURL('image/webp', 0.72);
  }, b64, crop, WIDTH);
  cache.set(key, url);
  return url;
}

async function figs(imgs, cls = '') {
  let h = `<div class="strip ${cls}">`;
  for (const [f, cap, crop] of imgs) {
    const isRow = crop === 'row';
    h += `<figure><img loading="lazy" alt="${esc(cap)}" src="${await embed(f, isRow ? undefined : crop)}"><figcaption>${esc(cap)}</figcaption></figure>`;
  }
  return h + '</div>';
}
const list = (a) => '<ol>' + a.map((x) => `<li>${esc(x)}</li>`).join('') + '</ol>';

let html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<title>One More Merge: QA buttons, illustrated</title>
<style>
:root{--bg:#fbf5ea;--fg:#2b1d24;--mut:#6b5560;--card:#fff;--line:#e2d3bf;--acc:#d8431f;--ok:#2f8f2f;--chip:#efe2cd}
@media (prefers-color-scheme:dark){:root{--bg:#171216;--fg:#f4ebe6;--mut:#b9a8ad;--card:#241b21;--line:#43343d;--acc:#ff7a55;--ok:#6fd36f;--chip:#33262d}}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--fg);font:18px/1.55 -apple-system,system-ui,"Segoe UI",Roboto,sans-serif;padding:14px 14px 60px;max-width:720px;margin-inline:auto}
h1{font-size:1.7rem;line-height:1.2;margin:.2em 0 .3em}
h2{font-size:1.35rem;margin:1.6em 0 .5em;border-bottom:3px solid var(--acc);padding-bottom:.2em}
h3{font-size:1.1rem;margin:.2em 0}
p{margin:.5em 0}
code{background:var(--chip);padding:.05em .35em;border-radius:5px;font-size:.9em;word-break:break-all}
details{background:var(--card);border:1px solid var(--line);border-radius:14px;margin:.7em 0;overflow:hidden}
details details{margin:.6em .5em;border-radius:12px}
summary{cursor:pointer;padding:.75em .9em .75em 2em;font-weight:700;list-style:none;display:block;position:relative;min-height:48px;line-height:1.35}
summary::-webkit-details-marker{display:none}
summary::before{content:"\\25B8";color:var(--acc);font-size:1.1em;position:absolute;left:.7em;top:.7em}
details[open]>summary::before{content:"\\25BE"}
.body{padding:0 .9em .9em}
.badge{font-size:.72rem;font-weight:700;border-radius:99px;padding:.15em .6em;background:var(--chip);color:var(--mut)}
.badge.new{background:var(--acc);color:#fff}
.badge.def{background:transparent;border:1px solid var(--line)}
dl{margin:.4em 0}
dt{font-weight:700;color:var(--acc);font-size:.8rem;text-transform:uppercase;letter-spacing:.04em;margin-top:.7em}
dd{margin:.1em 0 0}
ol{margin:.2em 0 .2em 1.2em;padding:0}
li{margin:.25em 0}
.honest{background:var(--chip);border-left:5px solid var(--acc);padding:.5em .7em;border-radius:8px;margin:.7em 0;font-size:.95rem}
.strip{display:flex;gap:10px;overflow-x:auto;scroll-snap-type:x mandatory;padding:6px 2px 10px;-webkit-overflow-scrolling:touch}
.strip figure{flex:0 0 74%;max-width:330px;margin:0;scroll-snap-align:start}
.strip.row figure{flex:1 1 0}
.strip img{width:100%;height:auto;border-radius:12px;border:1px solid var(--line);display:block}
figcaption{font-size:.85rem;color:var(--mut);margin-top:.3em;line-height:1.3}
.hint{font-size:.8rem;color:var(--mut)}
.tour{counter-reset:t}
.tour>details>summary b.n{background:var(--acc);color:#fff;border-radius:50%;width:1.8em;height:1.8em;display:inline-flex;align-items:center;justify-content:center;flex:none}
a{color:var(--acc)}
.top{display:flex;gap:.5em;flex-wrap:wrap;margin:.6em 0}
.top a{background:var(--chip);border-radius:99px;padding:.35em .8em;text-decoration:none;color:var(--fg);font-size:.9rem}
</style></head><body>
<h1>One More Merge: the QA buttons, with pictures</h1>
<p>Written for the game build on master (commit <code>53862b6</code>, 2026-10-11). Open the QA panel with the red <b>QA</b> button on the road, or Settings, <b>QA TOOLS</b>. Everything here is for testing only. Tap any heading to open or close it.</p>
<div class="top"><a href="#tour">5-minute tour</a><a href="#map">Panel map</a><a href="#ref">Full list</a><a href="#soon">Coming soon</a><a href="#notes">Notes</a></div>
`;

html += '<h2 id="tour">5-minute tour</h2><p>Six switches, in the order to try them. Each takes under a minute. Panel names are in CAPITALS, exactly as on screen.</p><div class="tour">';
for (const t of TOUR) {
  html += `<details${t.n === 1 ? ' open' : ''}><summary><b class="n">${t.n}</b> ${esc(t.title)}</summary><div class="body"><p><i>${esc(t.why)}</i></p><dl><dt>Try this</dt><dd>${list(t.steps)}</dd><dt>What you should see</dt><dd>${esc(t.see)}</dd></dl>${await figs(t.imgs)}</div></details>`;
}
html += '</div>';

html += `<h2 id="map">Panel map</h2><details open><summary>The panel in two screens</summary><div class="body"><p>The QA panel is taller than the screen. The title and BACK stay put; drag the rows up to see the lower half. Green with [brackets] = on or selected, brown = off.</p>${await figs([['panel_top', 'Screen 1: top of the panel'], ['panel_bottom', 'Screen 2: after dragging up']])}</div></details>`;

html += '<h2 id="ref">Full list, in the order of the panel</h2>';
for (const g of GROUPS) {
  html += `<details id="${g.id}"><summary>${esc(g.title)} <span class="badge">${g.controls.length} control${g.controls.length > 1 ? 's' : ''}</span></summary><div class="body">`;
  if (g.intro) html += `<p>${esc(g.intro)}</p>`;
  for (const c of g.controls) {
    html += `<details><summary>${esc(c.label)} ${c.isNew ? '<span class="badge new">NEW</span>' : ''}</summary><div class="body"><p><span class="badge def">Default: ${esc(c.def)}</span> <span class="badge">${esc(c.when)}</span></p><dl><dt>What it does</dt><dd>${esc(c.does)}</dd><dt>What you should see</dt><dd>${esc(c.see)}</dd><dt>Try this</dt><dd>${list(c.tryit)}</dd></dl>`;
    if (c.honest) html += `<div class="honest"><b>Honest note:</b> ${esc(c.honest)}</div>`;
    if (c.note) html += `<p class="hint">${esc(c.note)}</p>`;
    html += await figs(c.imgs.map(([f, cap, crop]) => [f, cap, crop === 'row' ? undefined : crop]));
    html += '</div></details>';
  }
  html += '</div></details>';
}

html += `<h2 id="soon">${esc(SOON.title)}</h2><details open><summary>BUDGET LEVELS <span class="badge">not on master</span></summary><div class="body">${SOON.body.join('')}${await figs(SOON.imgs)}${SOON.more}</div></details>`;
html += `<h2 id="notes">Notes</h2><details open><summary>Read me last</summary><div class="body"><ul>${NOTES.map((n) => `<li>${esc(n)}</li>`).join('')}</ul></div></details>`;
html += '<p class="hint">Made with tools/qa-guide-shots.mjs and tools/build-qa-guide.mjs. Raw pictures are in docs/qa-guide/img.</p></body></html>';

writeFileSync(OUT, html);
await browser.close();
console.log('wrote', OUT, (html.length / 1048576).toFixed(2), 'MB');
