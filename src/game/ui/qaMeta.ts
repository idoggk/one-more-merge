/** QA PANEL V2: plain-words data for every QA row (pure, no Phaser). The grouped list, the "?" help and docs/design/QA_CLEANUP.md all read this.
 *  A new QA row needs one entry here (tests/qaPanel.test.ts fails if a row has none, or is missing from the cleanup table). */

export const QA_GROUPS = ['road', 'levels', 'units', 'yard', 'ui', 'debug'] as const;
export type QaGroup = (typeof QA_GROUPS)[number];
export const QA_GROUP_TITLE: Record<QaGroup, string> = { road: 'ROAD', levels: 'LEVELS', units: 'UNITS', yard: 'SCREW YARD', ui: 'UI', debug: 'DEBUG' };

export type QaState = 'shipped' | 'finished-off' | 'prototype' | 'obsolete' | 'tool';
export type QaAction = 'keep' | 'merge into preset' | 'retire after owner confirms';

export interface QaMeta {
  group: QaGroup;
  /** Max 4 words. */
  label: string;
  /** One sentence. */
  help: string;
  state: QaState;
  /** What the switch is after RESET ALL, in words. */
  def: string;
  action: QaAction;
  /** What retiring (removing) the switch would change. */
  retire: string;
  /** Marked "old" in the panel and sorted last in its group. */
  old?: boolean;
}

const M = (group: QaGroup, label: string, help: string, state: QaState, def: string, action: QaAction, retire: string, old = false): QaMeta => ({ group, label, help, state, def, action, retire, old: old || undefined });

export const QA_META: Record<string, QaMeta> = {
  // ---- road ----
  roadv2: M('road', 'Winding road map', 'The new ROAD tab with chapter scenery, gates and chests; OFF shows the first-generation road.', 'shipped', 'ON', 'retire after owner confirms', 'The first-generation road code and its OFF path go away; players see no change.', true),
  roadPolish: M('road', 'Road polish', 'Parallax, belt road, ambient life and hop animations on the new road (needs Winding road map).', 'finished-off', 'OFF', 'merge into preset', 'Becomes always-on for players once the owner confirms the drag is smooth, or the code is deleted.'),
  roadPerf: M('road', 'Road perf 1', 'Hides off-screen road pieces while scrolling; superseded by the later passes.', 'obsolete', 'ON', 'retire after owner confirms', 'The old unculled road path goes away; players see no change.', true),
  roadPerf2: M('road', 'Road perf 2', 'No mask, cached sky, paused off-screen tweens; superseded by pass 4.', 'obsolete', 'ON', 'retire after owner confirms', 'The pass-1 road path goes away; players see no change.', true),
  roadPerf3: M('road', 'Road perf 3', 'Fewer per-scroll writes and a resting belt; superseded by pass 4.', 'obsolete', 'ON', 'retire after owner confirms', 'The pass-2 road path goes away; players see no change.', true),
  roadPerf4: M('road', 'Road perf 4', 'Bakes the path, props and gates into pictures near the view for a smooth drag.', 'shipped', 'ON', 'retire after owner confirms', 'The pass-3 road path goes away; players see no change.', true),
  roadPerfHud: M('road', 'Perf readout', 'Shows objects, tweens and FPS in the ROAD corner so bug reports have numbers.', 'tool', 'OFF', 'merge into preset', 'QA loses the on-screen FPS readout; the game is unchanged.'),
  roadSurfaceKit: M('road', 'Road surface kit', 'Stamps the new road pieces along the path where pictures exist.', 'finished-off', 'OFF', 'merge into preset', 'Becomes always-on (after art approval) or the stamping code is deleted.'),
  roadMapMock1: M('road', 'Road map mock', 'The road map mock: rails, hero glow, sparkles and Bolt.', 'finished-off', 'OFF', 'merge into preset', 'Becomes the real road map screen after the owner approves it, or is deleted.'),
  roadKitPreview: M('road', 'Road kit preview', 'Button: shows a test road made of the kit pieces (needs Road surface kit).', 'tool', 'button', 'keep', 'QA loses the art check page for the road kit.'),
  mapBadges: M('road', 'Map badges', 'Feature badge rails (daily, quests, season, events) on the ROAD tab.', 'finished-off', 'OFF', 'merge into preset', 'Becomes always-on after the owner approves it, or the badge code is deleted.'),
  mapBadgesForce: M('road', 'Badge states', 'Forces every badge into one state (idle, ready, timer, locked) to check each look.', 'tool', 'AUTO', 'keep', 'QA can no longer force a badge state; the game is unchanged.'),
  // ---- levels ----
  thinkBank: M('levels', 'Think bank', 'A still board stops the level clock after a short grace.', 'prototype', 'OFF', 'keep', 'The think-bank prototype code is removed; no player change.'),
  mergeRule: M('levels', 'Merge rule', 'Today, +2 sandwich, or +2 and bonus sandwich merge rule (next level).', 'prototype', 'TODAY', 'keep', 'The sandwich variants are removed; the rule stays as today.'),
  mergeAssist: M('levels', 'Merge assist', 'Glows the next merge to tap: OFF, ON, or AUTO for early levels (also in Settings).', 'shipped', 'OFF', 'keep', 'Would remove the assist setting players can pick in Settings.'),
  pace: M('levels', 'Level pace', 'Level speed: TODAY, CALM (shipped) or MANIA (next level).', 'shipped', 'CALM', 'keep', 'TODAY and MANIA are removed; CALM stays.'),
  spam: M('levels', 'Spam test', 'Fast tapping pays less (experiments A2, A3, A3+tire; next level).', 'prototype', 'OFF', 'retire after owner confirms', 'The anti-spam experiment code is removed; MANIA pace loses its A2/A3 link.'),
  varied: M('levels', 'Varied openings', 'Ordinary levels start on one of 4 seeded layouts (next level).', 'prototype', 'OFF', 'keep', 'The 4 opening layouts are removed.'),
  paceCaps: M('levels', 'Pace caps', 'Free copies stop above rank 4, so top ranks take longer.', 'prototype', 'OFF', 'keep', 'The rank-4 cap prototype is removed.'),
  effortModel: M('levels', 'Effort model', 'Boss and mini-boss HP from the generated effort overlay.', 'prototype', 'OFF', 'keep', 'The overlay stops being used; boss HP stays as today.'),
  levelPace2: M('levels', 'Longer levels', 'Levels 1-80 refitted to about 1 minute early and 2 minutes later (next level).', 'finished-off', 'OFF', 'merge into preset', 'The refit becomes the real level data once approved, or is deleted.'),
  levelTimeline: M('levels', 'Armor timeline', 'Armor opens on a clock so nobody clears in seconds (needs Longer levels).', 'finished-off', 'OFF', 'merge into preset', 'Becomes always-on with Longer levels once approved, or is deleted.'),
  budget: M('levels', 'Budget levels', 'LAST MERGES bench levels: no clock, a merge budget.', 'prototype', 'OFF', 'keep', 'The last-merges levels are removed.'),
  budgetPick: M('levels', 'Pick budget level', 'Buttons that start one of the budget levels (needs Budget levels).', 'tool', 'buttons', 'keep', 'QA loses the shortcut to the budget levels.'),
  tools: M('levels', 'Power tools', 'Chain 5+ makes a Row Surge, a sandwich makes a Gear Bomb; also sets the merge rule.', 'prototype', 'OFF', 'keep', 'Row Surge and Gear Bomb are removed.'),
  // ---- units ----
  allNew: M('units', 'All new units', 'Turns on crates B and all 7 new unit batches at once.', 'prototype', 'OFF', 'keep', 'The roster-B shortcut is removed; the single batch switches remain.'),
  batches: M('units', 'Unit batches', 'Seven cards, each adds a few new units to crates and squads.', 'prototype', 'OFF', 'keep', 'Roster B batches can no longer be tried on a phone.'),
  unlockPlan: M('units', 'Unlock plan', 'Chapter gifts, crate tiers and a rarity-gated crate pool.', 'prototype', 'OFF', 'keep', 'The chapter unlock plan prototype is removed.'),
  batchesAndPlan: M('units', 'Batches + plan', 'Button: batches 1-7 and the unlock plan on together (only turns on).', 'obsolete', 'button', 'retire after owner confirms', 'One redundant button goes; All new units plus Unlock plan do the same.', true),
  rosterMode: M('units', 'Roster mode', 'Unit job experiments: OFF, B0, B1, ROSTER B (next level).', 'prototype', 'OFF', 'keep', 'The unit job experiments are removed; the roster stays as today.'),
  cratesLook: M('units', 'Crate look', 'Old crates or the Tool Bag / Toolbox / Tool Chest set.', 'finished-off', 'OLD', 'merge into preset', 'The toolbox look becomes the only look once approved, or is deleted.'),
  crateOpenV2: M('units', 'New crate opening', 'The new opening: shake, flash, one hero reveal, summary (needs Toolbox look).', 'shipped', 'ON', 'retire after owner confirms', 'The old opening code goes away; players see no change.', true),
  unitShots: M('units', 'Unit shots', 'Each shooter family fires its own shot and chains take the unit colour.', 'shipped', 'ON', 'retire after owner confirms', 'The plain shot path goes away; players see no change.', true),
  unitIdle: M('units', 'Unit idle motion', 'Units breathe, blink, hop and wobble.', 'shipped', 'ON', 'retire after owner confirms', 'The still-picture path goes away; players see no change.', true),
  // ---- screw yard ----
  yardMode: M('yard', 'Yard type', 'Old plates or the turnable object Screw Yard.', 'prototype', 'OLD', 'keep', 'One yard variant is removed; owner picks which.'),
  yardBook: M('yard', 'Yard book', 'Tap-budget stars, unit crate, cards counter and Collection Book (object yard).', 'prototype', 'OFF', 'keep', 'The yard book prototype is removed.'),
  yardPressure: M('yard', 'Yard pressure', 'Countdown from the first tap plus a tap budget (object yard).', 'prototype', 'OFF', 'keep', 'The yard time pressure is removed (owner wants it, so keep).'),
  // ---- ui ----
  uiKitV3: M('ui', 'New level popup', 'The rebuilt level intro popup; OFF shows the old level card.', 'shipped', 'ON', 'retire after owner confirms', 'The old level card goes away; players see no change.', true),
  resourceFly: M('ui', 'Flying rewards', 'Reward icons arc to a counter on results, puzzles and collection.', 'shipped', 'ON', 'retire after owner confirms', 'The no-fly path goes away; players see no change.', true),
  mascotMotion: M('ui', 'Mascot motion', 'Bolt peeks, hops and points in the level intro and demo.', 'finished-off', 'OFF', 'merge into preset', 'Becomes always-on after approval, or the animation code is deleted.'),
  mascotDemo: M('ui', 'Mascot demo', 'Button: shows Bolt in each state (needs Mascot motion).', 'tool', 'button', 'keep', 'QA loses the Bolt demo page.'),
  uiJuice: M('ui', 'UI juice', 'Pop-ins, button squash, glints and sparkles on popups and rewards.', 'finished-off', 'OFF', 'merge into preset', 'Becomes always-on after approval, or the code is deleted.'),
  shake: M('ui', 'Screen shake', 'Camera shake on merges and bosses (same as the Settings choice).', 'shipped', 'player choice', 'keep', 'Would remove a player setting.'),
  // ---- debug ----
  jump: M('debug', 'Jump to level', 'Counts earlier levels as cleared and opens the level card you pick.', 'tool', 'tool', 'keep', 'QA loses the fastest way to reach a level.'),
  allUnits: M('debug', 'All units level 5', 'Button: every unit to level 5.', 'tool', 'button', 'keep', 'QA loses the unit shortcut.'),
  unlockAll: M('debug', 'Unlock all', 'Button: opens every locked feature.', 'tool', 'button', 'keep', 'QA loses the unlock shortcut.'),
  bolts: M('debug', 'Bolts and gems', 'Button: +2000 bolts and +500 gems per tap.', 'tool', 'button', 'keep', 'QA loses the currency shortcut.'),
  crates3: M('debug', 'Three crates', 'Button: one crate of each tier.', 'tool', 'button', 'keep', 'QA loses the crate shortcut.'),
  startOver: M('debug', 'Start over', 'Wipes the save on this phone. Tap twice.', 'tool', 'button', 'keep', 'QA loses the one-tap save wipe.'),
  qaPanelV2: M('debug', 'New QA panel', 'This panel (presets and groups); OFF brings back the old section list.', 'shipped', 'ON', 'retire after owner confirms', 'The old section panel is removed once V2 is trusted.'),
  guideTop: M('debug', 'Guided test progress', 'Counts guided tests answered and holds the RESET ALL button and the build line.', 'tool', 'tool', 'keep', 'QA loses the guided-test counter.'),
  guide1: M('debug', 'Guided test 1', 'New crate opening: sets toolbox crates, gives crates, opens UNITS.', 'tool', 'tool', 'merge into preset', 'Replaced by phone recipes in the guide if the owner prefers.'),
  guide2: M('debug', 'Guided test 2', 'Units screen scrolling: all new units, every unit level 5.', 'tool', 'tool', 'merge into preset', 'Replaced by phone recipes in the guide if the owner prefers.'),
  guide3: M('debug', 'Guided test 3', 'Merge assist help: assist ON, level 4.', 'tool', 'tool', 'merge into preset', 'Replaced by phone recipes in the guide if the owner prefers.'),
  guide4: M('debug', 'Guided test 4', 'Sandwich bonus merge: rule +2 and bonus, level 6.', 'tool', 'tool', 'merge into preset', 'Replaced by phone recipes in the guide if the owner prefers.'),
  guide5: M('debug', 'Guided test 5', 'Capped merge level: budget levels on, first budget level.', 'tool', 'tool', 'merge into preset', 'Replaced by phone recipes in the guide if the owner prefers.'),
  guide6: M('debug', 'Guided test 6', 'Power tools test: tools on, level 12.', 'tool', 'tool', 'merge into preset', 'Replaced by phone recipes in the guide if the owner prefers.'),
  guide7: M('debug', 'Guided test 7', 'Screw Yard pressure: object yard and pressure on.', 'tool', 'tool', 'merge into preset', 'Replaced by phone recipes in the guide if the owner prefers.'),
  guide8: M('debug', 'Guided test 8', 'Varied level openings: varied openings on, level 7.', 'tool', 'tool', 'merge into preset', 'Replaced by phone recipes in the guide if the owner prefers.'),
};

/** The label shown in the panel: old switches carry an "old" tag. */
export const qaLabel = (m: QaMeta) => (m.old ? `${m.label} (old)` : m.label);

/** Stable sort: old switches last, otherwise keep registry order. */
export function sortOldLast<T>(items: readonly T[], isOld: (t: T) => boolean): T[] {
  return [...items.filter((t) => !isOld(t)), ...items.filter(isOld)];
}

/** Does a switch match a search query? Case-insensitive; every word must appear in the label, help, group or id. */
export function matchesQuery(id: string, m: QaMeta, query: string): boolean {
  const hay = `${id} ${m.label} ${m.help} ${QA_GROUP_TITLE[m.group]} ${m.old ? 'old' : ''} ${m.state}`.toLowerCase();
  return query.toLowerCase().split(/\s+/).filter(Boolean).every((w) => hay.includes(w));
}
