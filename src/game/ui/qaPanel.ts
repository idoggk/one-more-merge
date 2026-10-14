import Phaser from 'phaser';
import { applyUiKitV3, storedUiKitV3, UI_KIT_V3_KEY, applyResourceFly, storedResourceFly, RESOURCE_FLY_KEY, applyUnitIdle, storedUnitIdle, UNIT_IDLE_KEY } from '../../content/experiments';
import { applyPaceCaps, storedPaceCaps, PACE_CAPS_KEY, applyEffortModel, storedEffortModel, EFFORT_MODEL_KEY } from '../../content/experiments';
import { applyCrateOpenV2, storedCrateOpenV2, CRATE_OPEN_V2_KEY, applyVariedOpenings, storedVariedOpenings, VARIED_OPENINGS_KEY, applyYardPressure, storedYardPressure, YARD_PRESSURE_KEY, applyYardBook, storedYardBook, YARD_BOOK_KEY, applyTools, storedTools, TOOLS_KEY, allNewState, applyMergeBudget, MERGE_BUDGET_KEY, storedMergeBudget, applyPace, applyRosterUnlocks, applySpamVariant, applyThinkBank, applyUnits, ROSTER_UNLOCKS_KEY, storedRosterUnlocks, DEFAULT_PACE, PACE_KEY, PACES, ROSTER1_KEY, ROSTER2_KEY, ROSTER3_KEY, ROSTER4_KEY, ROSTER5_KEY, ROSTER6_KEY, ROSTER7_KEY, storedPace, storedRoster1, storedRoster2, storedRoster3, storedRoster4, storedRoster5, storedRoster6, storedRoster7, storedThinkBank, storedUnits, THINK_BANK_KEY, UNITS_B0_KEY, UNITS_VARIANTS, unitsStoreValue, SPAM_VARIANTS, type SpamVariant } from '../../content/experiments';
import { applyUnitShots, storedUnitShots, UNIT_SHOTS_KEY } from '../../content/experiments';
import { applyRoadPolish, storedRoadPolish, ROAD_POLISH_KEY, applyLevelRoadV2, storedLevelRoadV2, LEVEL_ROAD_V2_KEY } from '../../content/experiments';
import { TUNING } from '../../content/tuning';
import { applyMergeRule, MERGE_RULE_KEY, MERGE_RULES, storedMergeRule } from '../../core/sandwich';
import { TOOLBOX_KEY, toolboxOn } from '../fx/toolboxCrates';
import { ASSIST_MODES, MERGE_ASSIST_KEY, storedAssistMode, type AssistMode } from '../mergeAssist';
import { LEVELS } from '../../content/levels';
import { BUDGET_LEVELS } from '../../core/budget';
import { sfx } from '../audio';
import * as tlog from '../../platform/telemetry';
import { lockSaves, META_KEY, SAVE_KEY } from '../../platform/backup';
import { applyRoster1, applyRoster2, applyRoster3, applyRoster4, applyRoster5, applyRoster6, applyRoster7, UNITS, type CrateKind } from '../../content/units';
import { store } from '../meta';
import { unlockAll } from '../unlocks';
import type { GameScene } from '../GameScene';
import { W, H } from '../sceneKit';
import { getShakeLevel, SHAKE_LEVELS, setShakeLevel, type ShakeLevel } from '../fx/shake';
import { layoutPanel } from './qaLayout';
import { qaAction, qaChips, qaChoice, qaFlag, qaGrid, qaGuideCard, qaGuideTop, qaSectionHeader, qaStepper, setFitText, type QaCtx, type QaRow, type QaSection } from './qaKit';
import { GUIDE_KEY, GUIDE_TESTS, guideProgress, readGuide, resetAll, startTest, withAnswer, type GuideAnswer, type GuideNav } from './qaGuide';
import { currentBuildLabel } from './buildInfo';

// t-2c7cbae7 QA-only: mid-level chaos experiment preset, kept on this device only (not in the save / backup code)
const SPAM_KEY = 'omm_qa_spam_variant';
const spamVariant = (): SpamVariant => {
  try {
    const v = localStorage.getItem(SPAM_KEY);
    return SPAM_VARIANTS.some((x) => x.id === v) ? (v as SpamVariant) : 'off';
  } catch {
    return 'off';
  }
};
applySpamVariant(spamVariant());
// t-1bef1042 QA-only: PACE prototype (TODAY / CALM / MANIA), this device only; applied when a level starts
export const qaPace = () => storedPace(() => localStorage.getItem(PACE_KEY));
applyPace(qaPace());
// t-8426336a MERGE ASSIST (OFF / ON / AUTO), a phone setting also shown in Settings; applied at boot, default OFF
export const applyAssistMode = (m: AssistMode) => {
  TUNING.mergeAssist = m;
};
export const qaAssistMode = () => storedAssistMode(() => localStorage.getItem(MERGE_ASSIST_KEY));
applyAssistMode(qaAssistMode());
// t-9adea8b8 QA-only: SCREW YARD OLD (today's plates) / OBJECT (the turnable object), this device only
const YARD_MODE_KEY = 'omm_qa_screw_yard';
export const qaYardObject = () => {
  try {
    return localStorage.getItem(YARD_MODE_KEY) === 'object';
  } catch {
    return false;
  }
};
// QA-only: YARD PRESSURE (a countdown + tap budget in the turnable-object yard), default OFF, this device only
export const qaYardPressure = () => storedYardPressure(() => localStorage.getItem(YARD_PRESSURE_KEY));
applyYardPressure(qaYardPressure());
// QA-only: YARD BOOK (tap-budget stars, unit crate, Collection Book), default OFF, this device only
export const qaYardBook = () => storedYardBook(() => localStorage.getItem(YARD_BOOK_KEY));
applyYardBook(qaYardBook());
// t-a8c886ad / t-4a966cee QA-only: units option B, OFF / B0 (helpers copy, Mortar chain order, welders skip welders) /
// B1 (B0 + one direct job per helper, shared BOOSTED mark, Fuse Box reach)
export const qaUnits = () => storedUnits(() => localStorage.getItem(UNITS_B0_KEY));
applyUnits(qaUnits());
// t-9b28a794 QA-only: roster B batch 1 (Nail Gun / Jackhammer / Gear / Saw Blade in collection, crates and squads)
export const qaRoster1 = () => storedRoster1(() => localStorage.getItem(ROSTER1_KEY));
applyRoster1(qaRoster1());
// t-ee4e93d7 QA-only: roster B batch 2 (Wrench / Piston / Spring / Belt Drive in collection, crates and squads)
export const qaRoster2 = () => storedRoster2(() => localStorage.getItem(ROSTER2_KEY));
applyRoster2(qaRoster2());
// t-e728a5a6 QA-only: roster B batch 3 (Blowtorch / Pipe / Blast Plate / Tesla Tower in collection, crates and squads)
export const qaRoster3 = () => storedRoster3(() => localStorage.getItem(ROSTER3_KEY));
applyRoster3(qaRoster3());
// t-1e3c8bb6 QA-only: roster B batch 4 (Capacitor / Blueprint / Ladder / Rewind Crank in collection, crates and squads)
export const qaRoster4 = () => storedRoster4(() => localStorage.getItem(ROSTER4_KEY));
applyRoster4(qaRoster4());
// t-af818b65 QA-only: roster B batch 5 (Crane / Dynamo / Wrecking Ball in collection, crates and squads; Crane and Dynamo need crates B to drop)
export const qaRoster5 = () => storedRoster5(() => localStorage.getItem(ROSTER5_KEY));
applyRoster5(qaRoster5());
// t-f2cd50e4 QA-only: roster B batch 6 (Robot Arm / Tilt Lever in collection, crates and squads; both are Legendary: they drop only with crates B)
export const qaRoster6 = () => storedRoster6(() => localStorage.getItem(ROSTER6_KEY));
applyRoster6(qaRoster6());
// t-67cd7c5b QA-only: roster B batch 7 (Rivet Gun / Vice / Router / Hydraulic Press / Lathe in collection, crates and squads; none is Legendary)
export const qaRoster7 = () => storedRoster7(() => localStorage.getItem(ROSTER7_KEY));
applyRoster7(qaRoster7());
// t-c78bf16f QA-only: the chapter unlock plan (gifts, crate tiers, rarity-gated crate pool), default OFF
export const qaRosterUnlocks = () => storedRosterUnlocks(() => localStorage.getItem(ROSTER_UNLOCKS_KEY));
applyRosterUnlocks(qaRosterUnlocks());
// t-4c676288 QA-only: LAST MERGES merge-budget bench levels (TUNING.mergeBudget), default OFF, this device only
export const qaMergeBudget = () => storedMergeBudget(() => localStorage.getItem(MERGE_BUDGET_KEY));
applyMergeBudget(qaMergeBudget());
// t-1effe0bf QA-only: MERGE RULE prototype (TODAY / +2 / +1 BONUS sandwich), this device only; applied when a level starts
export const qaMergeRule = () => storedMergeRule(() => localStorage.getItem(MERGE_RULE_KEY));
applyMergeRule(qaMergeRule());
// t-4208f149 QA-only: THINK BANK prototype (a still board pauses the level clock after a grace), applied when a level starts
export const qaThinkBank = () => storedThinkBank(() => localStorage.getItem(THINK_BANK_KEY));
applyThinkBank(qaThinkBank());

// t-e2a48327 QA-only: POWER TOOLS (Row Surge / Gear Bomb), default OFF, this device only; ON also sets MERGE RULE to +1 BONUS (the MERGE RULE row can still change it)
export const qaTools = () => storedTools(() => localStorage.getItem(TOOLS_KEY));
applyTools(qaTools());
// QA-only: VARIED OPENINGS (4 seeded start layouts on ordinary levels), default OFF, this device only; applied when a level starts
export const qaVariedOpenings = () => storedVariedOpenings(() => localStorage.getItem(VARIED_OPENINGS_KEY));
applyVariedOpenings(qaVariedOpenings());
applyCrateOpenV2(storedCrateOpenV2(() => localStorage.getItem(CRATE_OPEN_V2_KEY)));
applyPaceCaps(storedPaceCaps(() => localStorage.getItem(PACE_CAPS_KEY)));
// QA-only: EFFORT MODEL (boss / mini-boss HP from the generated overlay), default OFF, this device only; applied when a level starts
export const qaEffortModel = () => storedEffortModel(() => localStorage.getItem(EFFORT_MODEL_KEY));
applyEffortModel(qaEffortModel());
// QA-only: UI KIT V3 (rebuilt level intro popup), default OFF, this device only
export const qaUiKitV3 = () => storedUiKitV3(() => localStorage.getItem(UI_KIT_V3_KEY));
applyUiKitV3(qaUiKitV3());
export const qaResourceFly = () => storedResourceFly(() => localStorage.getItem(RESOURCE_FLY_KEY));
applyResourceFly(qaResourceFly());
// QA-only: UNIT SHOTS (per-family projectiles and chain colours), default OFF, this device only
export const qaUnitShots = () => storedUnitShots(() => localStorage.getItem(UNIT_SHOTS_KEY));
applyUnitShots(qaUnitShots());
export const qaUnitIdle = () => storedUnitIdle(() => localStorage.getItem(UNIT_IDLE_KEY));
applyUnitIdle(qaUnitIdle());
// QA-only: LEVEL ROAD V2 (the new ROAD tab), default OFF, this device only; read when the ROAD tab opens
export const qaRoadPolish = () => storedRoadPolish(() => localStorage.getItem(ROAD_POLISH_KEY));
applyRoadPolish(qaRoadPolish());
export const qaLevelRoadV2 =() => storedLevelRoadV2(() => localStorage.getItem(LEVEL_ROAD_V2_KEY));
applyLevelRoadV2(qaLevelRoadV2());


/** Roster B batches shown in the NEW UNITS group (each is its own this-device-only switch, same keys as before). */
const ROSTER_BATCHES = [
  { n: 1, key: ROSTER1_KEY, on: qaRoster1, apply: applyRoster1, units: 'Nail Gun, Jackhammer, Gear, Saw Blade', toastOn: 'NEW 4 UNITS ON  ·  CRATES, TEAM, UNITS' },
  { n: 2, key: ROSTER2_KEY, on: qaRoster2, apply: applyRoster2, units: 'Wrench, Piston, Spring, Belt Drive', toastOn: 'ROSTER 2 ON  ·  CRATES, TEAM, UNITS' },
  { n: 3, key: ROSTER3_KEY, on: qaRoster3, apply: applyRoster3, units: 'Blowtorch, Pipe, Blast Plate, Tesla Tower', toastOn: 'ROSTER 3 ON  ·  TESLA NEEDS CRATES B' },
  { n: 4, key: ROSTER4_KEY, on: qaRoster4, apply: applyRoster4, units: 'Capacitor, Blueprint, Ladder, Rewind Crank', toastOn: 'ROSTER 4 ON  ·  REWIND IS OFF IN PUZZLES, DAILY, BOUNTIES' },
  { n: 5, key: ROSTER5_KEY, on: qaRoster5, apply: applyRoster5, units: 'Crane, Dynamo, Wrecking Ball', toastOn: 'ROSTER 5 ON  ·  CRANE AND DYNAMO DROP ONLY WITH CRATES B' },
  { n: 6, key: ROSTER6_KEY, on: qaRoster6, apply: applyRoster6, units: 'Robot Arm, Tilt Lever', toastOn: 'ROSTER 6 ON  ·  BOTH ARE LEGENDARY: THEY DROP ONLY WITH CRATES B' },
  { n: 7, key: ROSTER7_KEY, on: qaRoster7, apply: applyRoster7, units: 'Rivet Gun, Vice, Router, Hydraulic Press, Lathe', toastOn: 'ROSTER 7 ON  ·  CRATES, TEAM, UNITS' },
] as const;
/** Every batch flag plus crates B ('rb' in the UNITS switch), read live. */
const allNewNow = () => allNewState(qaUnits() === 'rb', ROSTER_BATCHES.map((r) => r.on()));
/** ALL NEW UNITS: ON sets crates B + batches 1..7, OFF clears them (individual switches keep working afterwards). Persisted like the others. */
const setAllNew = (on: boolean) => {
  for (const r of ROSTER_BATCHES) {
    store(r.key, on ? 'on' : null);
    r.apply(on);
  }
  if (on) {
    store(UNITS_B0_KEY, unitsStoreValue('rb'));
    applyUnits('rb');
  } else if (qaUnits() === 'rb') {
    store(UNITS_B0_KEY, null);
    applyUnits('off');
  }
  tlog.log('qa_all_new_units', { on });
};
/** t-c78bf16f: the chapter unlock plan (gifts + crate tiers + rarity-gated crate pool). */
const setPlan = (on: boolean) => {
  store(ROSTER_UNLOCKS_KEY, on ? 'on' : null);
  applyRosterUnlocks(on);
  tlog.log('qa_roster_unlocks', { on });
};

/** JUMP TO LEVEL / START HERE: every earlier level counts as cleared (2 stars), then the level card opens. */
function jumpToLevel(scene: GameScene, save: () => void, jump: number) {
  const m = scene.meta;
  const st: Record<string, number> = {};
  for (let n = 1; n < jump; n++) st[String(n)] = Math.max(2, m.levelStars?.[String(n)] ?? 0);
  m.levelStars = st;
  m.tutorialDone = true;
  m.onboarded = true;
  save();
  tlog.log('qa_jump', { level: jump });
  scene.openTitle('road');
  if (jump <= LEVELS.length) scene.openLevelSheet(jump);
}

/** START HERE answers (this device only, key qaGuide). */
const guideAnswers = () => readGuide(() => localStorage.getItem(GUIDE_KEY));
const saveAnswer = (n: number, v: GuideAnswer) => store(GUIDE_KEY, JSON.stringify(withAnswer(guideAnswers(), n, v)));
/** The existing QA actions a START uses: GIVE crates, ALL UNITS (LV 5), JUMP TO LEVEL, a budget level, the yard event. */
const guideNav = (q: QaCtx): GuideNav => ({
  units: ({ crates, allUnits }) => {
    const { scene } = q;
    if (crates) for (const k of (TUNING.rosterB ? ['wood', 'iron', 'gold', 'bench'] : ['wood', 'iron', 'gold']) as CrateKind[]) scene.giveCrate(k);
    if (allUnits) {
      const m = scene.meta;
      m.units = m.units ?? {};
      for (const u of UNITS) {
        m.units[u.id] = { level: Math.max(5, m.units[u.id]?.level ?? 0), cards: m.units[u.id]?.cards ?? 0 };
        if (u.slot === 'helper') m.toys[u.id] = m.toys[u.id] ?? false;
      }
    }
    scene.meta.tutorialDone = true;
    scene.meta.onboarded = true;
    q.save();
    tlog.log('qa_guide_units', { crates, allUnits });
    scene.openTitle('units');
  },
  level: (n) => jumpToLevel(q.scene, q.save, n),
  budget: (i) => q.scene.startBudget(BUDGET_LEVELS[i]),
  yard: () => {
    q.scene.meta.tutorialDone = true;
    q.save();
    q.scene.openYardEvent();
  },
});

/** The QA panel, section by section (collapsible), row by row. A new experiment is ONE qaFlag / qaChoice line in the right section;
 *  the layout, the switch / segmented look, the scrolling and the layout tests all follow from the entry. */
export const QA_SECTIONS: QaSection[] = [
  {
    id: 'guide',
    title: 'START HERE',
    rows: [
      qaGuideTop({
        progress: () => guideProgress(guideAnswers()),
        build: () => `Which build am I on: ${currentBuildLabel()}`,
        reset: (q) => {
          resetAll(QA_ROWS, q);
          tlog.log('qa_reset_all');
        },
      }),
      ...GUIDE_TESTS.map((test) =>
        qaGuideCard({
          test,
          answer: () => guideAnswers()[String(test.n)],
          start: (q) => {
            startTest(test, QA_ROWS, q, guideNav(q));
            tlog.log('qa_guide_start', { n: test.n });
          },
          save: saveAnswer,
        }),
      ),
    ],
  },
  {
    id: 'quick',
    title: 'QUICK TOOLS',
    rows: [
      // jump to level: every earlier level counts as cleared (2 stars), then the level card opens
      qaStepper({
        id: 'jump',
        title: 'JUMP TO LEVEL',
        desc: 'Earlier levels count as cleared',
        min: 1,
        max: LEVELS.length + 1,
        go: ({ scene, save }, jump) => jumpToLevel(scene, save, jump),
      }),
      qaAction({
        id: 'allUnits',
        title: 'ALL UNITS (LV 5)',
        desc: 'Every unit to level 5',
        label: 'GIVE',
        color: 0x8e58c9,
        tap: ({ scene, save }) => {
          const m = scene.meta;
          m.units = m.units ?? {};
          for (const u of UNITS) {
            m.units[u.id] = { level: Math.max(5, m.units[u.id]?.level ?? 0), cards: m.units[u.id]?.cards ?? 0 };
            if (u.slot === 'helper') m.toys[u.id] = m.toys[u.id] ?? false;
          }
          save();
          scene.showToast('ALL 13 UNITS AT LEVEL 5');
        },
      }),
      // t-2fd7bb86: every staggered feature (Team, Challenge, Workshop, Puzzles, Remix, Gems) open at once
      qaAction({
        id: 'unlockAll',
        title: 'UNLOCK ALL',
        desc: 'Opens every locked feature',
        label: 'UNLOCK',
        color: 0x27a4c0,
        tap: ({ scene, save }) => {
          unlockAll(scene.meta);
          scene.meta.hardUnlocked = true;
          save();
          tlog.log('qa_unlock_all');
          scene.showToast('ALL FEATURES UNLOCKED');
        },
      }),
      qaAction({
        id: 'bolts',
        title: 'BOLTS AND GEMS',
        desc: '+2000 bolts, +500 gems per tap',
        label: 'GIVE',
        color: 0xe0a020,
        tap: ({ scene, save }) => {
          const m = scene.meta;
          m.bolts = (m.bolts ?? 0) + 2000;
          m.gems = (m.gems ?? 0) + 500;
          save();
          scene.showToast('+2000 BOLTS  +500 GEMS');
        },
      }),
      qaAction({
        id: 'crates3',
        title: '+3 CRATES',
        desc: 'One of each crate tier',
        label: 'GIVE',
        color: 0xb06a1a,
        tap: ({ scene, save }) => {
          for (const k of (TUNING.rosterB ? ['wood', 'iron', 'gold', 'bench'] : ['wood', 'iron', 'gold']) as CrateKind[]) scene.giveCrate(k);
          save();
          scene.showToast('3 CRATES ADDED  ·  UNITS TAB');
        },
      }),
      // start over (second tap within 3 s confirms)
      (() => {
        let armed = 0;
        const W_CTRL = 260;
        return qaAction({
          id: 'startOver',
          title: 'START OVER',
          desc: 'Wipes the save. Tap twice.',
          label: 'WIPE ALL',
          color: 0xd8261a,
          ctrlW: W_CTRL,
          tap: ({ scene }, label) => {
            if (scene.time.now - armed > 3000) {
              armed = scene.time.now;
              sfx.invalid();
              setFitText(label, 'TAP AGAIN TO WIPE', W_CTRL - 36);
              scene.time.delayedCall(3000, () => label.active && scene.time.now - armed >= 2900 && setFitText(label, 'WIPE ALL', W_CTRL - 36));
              return;
            }
            tlog.log('start_over');
            store(SAVE_KEY, null);
            store(META_KEY, null);
            lockSaves(); // the reload's visibilitychange -> save() must not write the old game back
            location.reload();
          },
        });
      })(),
    ],
  },
  {
    id: 'feel',
    title: 'MERGE FEEL',
    rows: [
      // t-4208f149 THINK BANK prototype OFF / ON (this device only; applies when the next level starts)
      qaFlag({
        id: 'thinkBank',
        title: 'THINK BANK',
        desc: 'Still board stops the clock. Next level',
        get: () => !!qaThinkBank(),
        set: (on) => {
          store(THINK_BANK_KEY, on ? 'on' : null);
          tlog.log('qa_think_bank', { on });
        },
        toast: (on) => (on ? `THINK BANK ON  ·  ${TUNING.tb.grace} s still = clock stops  ·  START A LEVEL` : 'THINK BANK OFF (live game)  ·  NEXT LEVEL'),
      }),
      // t-1effe0bf MERGE RULE prototype: TODAY / +2 sandwich / +1 BONUS sandwich (this device only; next level)
      qaChoice({
        id: 'mergeRule',
        title: 'MERGE RULE',
        desc: 'Sandwich merge. Applies next level',
        options: MERGE_RULES,
        def: 'today',
        current: qaMergeRule,
        pick: (id) => {
          store(MERGE_RULE_KEY, id === 'today' ? null : id);
          tlog.log('qa_merge_rule', { rule: id });
        },
        toast: (id, label) => (id === 'today' ? 'MERGE RULE TODAY (live game)  ·  NEXT LEVEL' : `MERGE RULE ${label}  ·  START A LEVEL`),
      }),
      // t-8426336a MERGE ASSIST: OFF (today) / ON / AUTO (levels 1-10 and under 30 lifetime merges), same setting as Settings
      qaChoice<AssistMode>({
        id: 'mergeAssist',
        title: 'MERGE ASSIST',
        desc: 'AUTO = levels 1-10, first 30 merges',
        options: ASSIST_MODES.map((id) => ({ id, label: id.toUpperCase() })),
        def: 'off',
        current: () => TUNING.mergeAssist,
        pick: (id) => {
          store(MERGE_ASSIST_KEY, id === 'off' ? null : id);
          applyAssistMode(id);
          tlog.log('qa_merge_assist', { mode: id });
        },
        toast: (id) => (id === 'off' ? 'MERGE ASSIST OFF (live game)' : id === 'on' ? 'MERGE ASSIST ON' : 'MERGE ASSIST AUTO  ·  LEVELS 1-10, FIRST 30 MERGES'),
      }),
      // t-1bef1042 PACE prototype (this device only; the stored pace applies when the next level starts)
      qaChoice({
        id: 'pace',
        title: 'PACE',
        desc: 'Level speed. Applies next level',
        options: PACES,
        def: DEFAULT_PACE,
        current: qaPace,
        pick: (id) => {
          store(PACE_KEY, id === DEFAULT_PACE ? null : id);
          tlog.log('qa_pace', { pace: id });
        },
        toast: (id, label) => (id === DEFAULT_PACE ? `PACE ${label} (live game)  ·  NEXT LEVEL` : `PACE ${label}  ·  START A LEVEL`),
      }),
    ],
  },
  {
    id: 'units',
    title: 'UNITS',
    rows: [
      // 7b) NEW UNITS: roster B batches 1..7 join the collection, crates and squads (this device only, live)
      qaFlag({
        id: 'allNew',
        title: 'ALL NEW UNITS',
        desc: () => `${UNITS.length} units in play`,
        get: () => {
          const s = allNewNow();
          return s === 'mixed' ? 'mixed' : s === 'on';
        },
        set: setAllNew,
        toast: (on) => (on ? 'ALL NEW UNITS ON  ·  CRATES B + BATCH 1..7' : 'ALL NEW UNITS OFF (live game)'),
      }),
      qaGrid({
        id: 'batches',
        title: 'UNIT BATCHES',
        cells: ROSTER_BATCHES.map((r) => ({
          title: `BATCH ${r.n}`,
          names: r.units,
          on: () => r.on(),
          tap: ({ scene, reopen }) => {
            const on = r.on();
            store(r.key, on ? null : 'on');
            r.apply(!on);
            tlog.log(`qa_roster_${r.n}`, { on: !on });
            scene.showToast(on ? `NEW UNITS BATCH ${r.n} OFF (live game)` : r.toastOn);
            reopen();
          },
        })),
      }),
      // t-c78bf16f: the chapter unlock plan, and the old second ALL NEW UNITS button = batches 1..7 + the plan together (only ever turns on)
      qaFlag({
        id: 'unlockPlan',
        title: 'UNLOCK PLAN',
        desc: 'Gifts, crate tiers, rarity-gated pool',
        get: () => !!qaRosterUnlocks(),
        set: setPlan,
        toast: (on) => (on ? 'UNLOCK PLAN ON  ·  GIFTS ON LEVEL 10, 13, 20, 25, 30, 35, 40, 50' : 'UNLOCK PLAN OFF (live game)'),
      }),
      qaAction({
        id: 'batchesAndPlan',
        title: 'BATCHES + PLAN',
        desc: 'Turns batches 1-7 and the plan on',
        label: 'ALL ON',
        color: 0x8e58c9,
        tap: ({ scene, reopen }) => {
          for (const r of ROSTER_BATCHES) {
            store(r.key, 'on');
            r.apply(true);
          }
          setPlan(true);
          scene.showToast('ALL NEW UNITS ON  ·  BATCHES 1..7 + UNLOCK PLAN');
          reopen();
        },
      }),
      // t-a8c886ad / t-4a966cee units OFF / B0 / B1 / ROSTER B (this device only; applies when the next level starts)
      qaChoice({
        id: 'rosterMode',
        title: 'ROSTER MODE',
        desc: 'Unit job experiments. Next level',
        options: UNITS_VARIANTS,
        def: 'off' as const,
        current: qaUnits,
        pick: (id) => {
          store(UNITS_B0_KEY, unitsStoreValue(id));
          tlog.log('qa_units', { units: id });
        },
        toast: (id, label) => (id === 'off' ? 'UNITS OFF (live game)  ·  NEXT LEVEL' : `UNITS ${label}  ·  START A LEVEL`),
      }),
    ],
  },
  {
    id: 'crates',
    title: 'CRATES',
    rows: [
      // t-33f4fe2e crate look: OLD crates (live) / TOOLBOX (Tool Bag, Toolbox, Tool Chest), this device only
      qaChoice({
        id: 'cratesLook',
        title: 'CRATE LOOK',
        desc: 'Old crates or Tool Bag set',
        options: [{ id: 'old', label: 'OLD' }, { id: 'toolbox', label: 'TOOLBOX' }],
        def: 'old',
        current: () => (toolboxOn() ? 'toolbox' : 'old'),
        pick: (id) => {
          store(TOOLBOX_KEY, id === 'toolbox' ? 'toolbox' : null);
          tlog.log('qa_crates', { look: id });
        },
        toast: (id) => `CRATES: ${id === 'toolbox' ? 'TOOLBOX' : 'OLD (live game)'}`,
      }),
      // crate opening redo: needs CRATE LOOK = TOOLBOX; ON = anticipation, shake, flash, one hero reveal, 3-column summary, COLLECT
      qaFlag({
        id: 'crateOpenV2',
        defOn: true,
        title: 'CRATE OPENING V2',
        desc: 'New opening. Needs TOOLBOX look',
        get: () => storedCrateOpenV2(() => localStorage.getItem(CRATE_OPEN_V2_KEY)),
        set: (on) => {
          store(CRATE_OPEN_V2_KEY, on ? null : 'off');
          applyCrateOpenV2(on);
          tlog.log('qa_crate_open_v2', { on });
        },
        toast: (on) => (on ? 'CRATE OPENING V2 ON  ·  OPEN A CRATE (TOOLBOX LOOK)' : 'CRATE OPENING V2 OFF (live game)'),
      }),
    ],
  },
  {
    id: 'tests',
    title: 'LEVELS AND TESTS',
    rows: [
      // t-2c7cbae7 mid-level spam experiment (this device only; applies from the next level started)
      qaChoice<SpamVariant>({
        id: 'spam',
        title: 'SPAM TEST',
        desc: 'Fast tapping pays less. Next level',
        options: SPAM_VARIANTS,
        def: 'off',
        current: spamVariant,
        pick: (id) => {
          store(SPAM_KEY, id === 'off' ? null : id);
          applySpamVariant(id);
          tlog.log('qa_spam_variant', { variant: id });
        },
        toast: (id, label) => (id === 'off' ? 'SPAM TEST OFF (live game)' : `SPAM TEST ${label}  ·  START A LEVEL`),
      }),
      // VARIED OPENINGS: ON = ordinary levels start on one of 4 layouts; teach, boss, mini-boss, puzzles, daily, bounties unchanged
      qaFlag({
        id: 'varied',
        title: 'VARIED OPENINGS',
        desc: '4 start layouts. Next level',
        get: () => !!qaVariedOpenings(),
        set: (on) => {
          store(VARIED_OPENINGS_KEY, on ? 'on' : null);
          applyVariedOpenings(on);
          tlog.log('qa_varied_openings', { on });
        },
        toast: (on) => (on ? 'VARIED OPENINGS ON  ·  START A LEVEL  ·  HP/STARS NOT REFITTED' : 'VARIED OPENINGS OFF (live game)'),
      }),
      // PACE CAPS (t-157b3f78): plain kickback twins and matchmaker copies stop above rank 4
      qaFlag({
        id: 'paceCaps',
        title: 'PACE CAPS',
        desc: 'Free copies stop above rank 4, so top ranks take longer',
        get: () => storedPaceCaps(() => localStorage.getItem(PACE_CAPS_KEY)),
        set: (on) => {
          store(PACE_CAPS_KEY, on ? 'on' : null);
          applyPaceCaps(on);
          tlog.log('qa_pace_caps', { on });
        },
        toast: (on) => (on ? 'PACE CAPS ON  ·  START A LEVEL  ·  HP NOT REFITTED' : 'PACE CAPS OFF (live game)'),
      }),
      // EFFORT MODEL S1: ON = the 16 boss / mini-boss levels use the effort overlay (bigger boss, smaller minions); stars and other levels unchanged
      qaFlag({
        id: 'effortModel',
        title: 'EFFORT MODEL',
        desc: 'Bigger boss, tiny minions. Next level',
        get: () => !!qaEffortModel(),
        set: (on) => {
          store(EFFORT_MODEL_KEY, on ? 'on' : null);
          applyEffortModel(on);
          tlog.log('qa_effort_model', { on });
        },
        toast: (on) => (on ? 'EFFORT MODEL ON  ·  BOSS + MINI-BOSS LEVELS  ·  STARS NOT REFITTED' : 'EFFORT MODEL OFF (live game)'),
      }),
      // LEVEL ROAD V2: ON = the ROAD tab is a winding world with chapter scenery, gates, chests and momentum scroll; presentation only
      qaFlag({
        id: 'roadv2',
        defOn: true,
        title: 'LEVEL ROAD V2',
        desc: 'New ROAD tab. Open ROAD',
        get: () => !!qaLevelRoadV2(),
        set: (on) => {
          store(LEVEL_ROAD_V2_KEY, on ? null : 'off');
          applyLevelRoadV2(on);
          tlog.log('qa_level_road_v2', { on });
        },
        toast: (on) => (on ? 'LEVEL ROAD V2 ON  ·  OPEN THE ROAD TAB' : 'LEVEL ROAD V2 OFF (live game)'),
      }),
      // ROAD POLISH: on top of LEVEL ROAD V2: parallax, belt road, ambient life, avatar hop, chest rattle, unlock sequence (visual only)
      qaFlag({
        id: 'roadPolish',
        defOn: true,
        title: 'ROAD POLISH',
        desc: 'Needs LEVEL ROAD V2. Open ROAD',
        get: () => !!qaRoadPolish(),
        set: (on) => {
          store(ROAD_POLISH_KEY, on ? null : 'off');
          applyRoadPolish(on);
          tlog.log('qa_road_polish', { on });
        },
        toast: (on) => (on ? 'ROAD POLISH ON  ·  OPEN THE ROAD TAB' : 'ROAD POLISH OFF'),
      }),
      // t-4c676288 BUDGET LEVELS: the LAST MERGES bench levels (no clock, a merge budget, stars by merges left)
      qaFlag({
        id: 'budget',
        title: 'BUDGET LEVELS',
        desc: 'Last-merges levels, no clock',
        get: () => !!qaMergeBudget(),
        set: (on) => {
          store(MERGE_BUDGET_KEY, on ? 'on' : null);
          applyMergeBudget(on);
          tlog.log('qa_merge_budget', { on });
        },
        toast: (on) => (on ? 'BUDGET LEVELS ON  ·  PICK ONE BELOW' : 'BUDGET LEVELS OFF (live game)'),
      }),
      qaChips({
        id: 'budgetPick',
        title: 'BUDGET LEVEL PICK',
        labels: () => BUDGET_LEVELS.map((b) => b.name),
        color: () => (qaMergeBudget() ? 0x8e58c9 : 0x8a6a4a),
        dim: () => !qaMergeBudget(),
        tap: ({ scene }, i) => (qaMergeBudget() ? scene.startBudget(BUDGET_LEVELS[i]) : scene.showToast('TURN BUDGET LEVELS ON FIRST')),
      }),
      // t-e2a48327 POWER TOOLS: ON = chain 5+ makes a Row Surge, a sandwich makes a Gear Bomb; also sets MERGE RULE +1 BONUS
      qaFlag({
        id: 'tools',
        title: 'POWER TOOLS',
        desc: 'Row Surge + Gear Bomb. Rule +1 BONUS',
        get: () => !!qaTools(),
        set: (on) => {
          store(TOOLS_KEY, on ? 'on' : null);
          applyTools(on);
          if (on) {
            store(MERGE_RULE_KEY, 'sandwichBonus');
            applyMergeRule('sandwichBonus');
          }
          tlog.log('qa_tools', { on });
        },
        toast: (on) => (on ? 'POWER TOOLS ON  ·  MERGE RULE +1 BONUS  ·  LEVEL 10+' : 'POWER TOOLS OFF (live game)'),
      }),
      // YARD PRESSURE: ON = countdown from the first tap + tap budget + stars, OBJECT yard only
      qaFlag({
        id: 'yardPressure',
        title: 'YARD PRESSURE',
        desc: 'Timer + tap budget. OBJECT yard only',
        get: () => !!qaYardPressure(),
        set: (on) => {
          store(YARD_PRESSURE_KEY, on ? 'on' : null);
          applyYardPressure(on);
          tlog.log('qa_yard_pressure', { on });
        },
        toast: (on) => (on ? 'YARD PRESSURE ON  ·  SCREW YARD: OBJECT  ·  TIMER + TAP BUDGET' : 'YARD PRESSURE OFF (live game)'),
      }),
    ],
  },
  {
    id: 'yard',
    title: 'SCREW YARD',
    rows: [
      // t-9adea8b8 SCREW YARD: OLD (today's yard) / OBJECT (the turnable crate), this device only
      qaChoice({
        id: 'yardMode',
        title: 'SCREW YARD',
        desc: 'Old plates or turnable object',
        options: [{ id: 'old', label: 'OLD' }, { id: 'object', label: 'OBJECT' }],
        def: 'old',
        current: () => (qaYardObject() ? 'object' : 'old'),
        pick: (id) => {
          store(YARD_MODE_KEY, id === 'old' ? null : id);
          tlog.log('qa_screw_yard', { mode: id });
        },
        toast: (id) => (id === 'old' ? 'SCREW YARD: OLD (live game)' : 'SCREW YARD: OBJECT  ·  EVENTS > SCREW YARD'),
      }),
      // YARD BOOK: ON = tap-budget stars, unit crate + cards counter, Collection Book, OBJECT yard only
      qaFlag({
        id: 'yardBook',
        title: 'YARD BOOK',
        desc: 'Unit crate, cards, Collection Book. OBJECT yard only',
        get: () => !!qaYardBook(),
        set: (on) => {
          store(YARD_BOOK_KEY, on ? 'on' : null);
          applyYardBook(on);
          tlog.log('qa_yard_book', { on });
        },
        toast: (on) => (on ? 'YARD BOOK ON  ·  SCREW YARD: OBJECT  ·  EVENTS > SCREW YARD > BOOK' : 'YARD BOOK OFF (live game)'),
      }),
    ],
  },
  {
    id: 'display',
    title: 'DISPLAY',
    rows: [
      // UI KIT V3: the rebuilt level intro popup (presentation only)
      qaFlag({
        id: 'uiKitV3',
        defOn: true,
        title: 'UI KIT V3',
        desc: 'New level intro popup. Next level',
        get: () => !!qaUiKitV3(),
        set: (on) => {
          store(UI_KIT_V3_KEY, on ? null : 'off');
          applyUiKitV3(on);
          tlog.log('qa_ui_kit_v3', { on });
        },
        toast: (on) => (on ? 'UI KIT V3 ON  ·  OPEN ANY LEVEL' : 'UI KIT V3 OFF (old level card)'),
      }),
      // RESOURCE FLY: reward icons arc to a counter on results, puzzle payout and collection claim (visual only)
      qaFlag({
        id: 'resourceFly',
        defOn: true,
        title: 'RESOURCE FLY',
        desc: 'Rewards fly to a counter. Next result',
        get: () => !!qaResourceFly(),
        set: (on) => {
          store(RESOURCE_FLY_KEY, on ? null : 'off');
          applyResourceFly(on);
          tlog.log('qa_resource_fly', { on });
        },
        toast: (on) => (on ? 'RESOURCE FLY ON  ·  FINISH A LEVEL OR SOLVE A PUZZLE' : 'RESOURCE FLY OFF'),
      }),
      // UNIT SHOTS: each shooter family fires its own projectile, chains take the source unit's colour (visual only)
      qaFlag({
        id: 'unitShots',
        defOn: true,
        title: 'UNIT SHOTS',
        desc: 'Per-family shots + chain colours. Next chain',
        get: () => !!qaUnitShots(),
        set: (on) => {
          store(UNIT_SHOTS_KEY, on ? null : 'off');
          applyUnitShots(on);
          tlog.log('qa_unit_shots', { on });
        },
        toast: (on) => (on ? 'UNIT SHOTS ON  ·  FIRE A CHAIN' : 'UNIT SHOTS OFF'),
      }),
      // UNIT IDLE: board, tray and units-tab pictures breathe / blink / hop / wobble (visual only, reduced motion = none)
      qaFlag({
        id: 'unitIdle',
        defOn: true,
        title: 'UNIT IDLE',
        desc: 'Units breathe, blink, hop, wobble',
        get: () => !!qaUnitIdle(),
        set: (on) => {
          store(UNIT_IDLE_KEY, on ? null : 'off');
          applyUnitIdle(on);
          tlog.log('qa_unit_idle', { on });
        },
        toast: (on) => (on ? 'UNIT IDLE ON  ·  WATCH THE BOARD' : 'UNIT IDLE OFF'),
      }),
      // the same phone setting as Settings, SCREEN SHAKE (kept in its own key, not in the save code)
      qaChoice<ShakeLevel>({
        id: 'shake',
        title: 'SCREEN SHAKE',
        desc: 'Camera shake on merges and bosses',
        options: SHAKE_LEVELS.map((id) => ({ id, label: id.toUpperCase() })),
        current: ({ scene }) => getShakeLevel(scene.meta.shake === false),
        pick: (id, { scene }) => {
          setShakeLevel(id);
          scene.shake('preview');
        },
        toast: (id) => `SCREEN SHAKE ${id.toUpperCase()}`,
      }),
    ],
  },
];
/** Every row, flat (the tests walk this). */
export const QA_ROWS: QaRow[] = QA_SECTIONS.flatMap((s) => s.rows);

/** Which sections are folded away: remembered while the game runs (not saved). START HERE starts open, the rest folded. */
const collapsed = new Set<string>(QA_SECTIONS.slice(1).map((s) => s.id));
export const qaCollapsed = collapsed;
const panelSpec = () => QA_SECTIONS.map((s) => ({ id: s.id, rows: s.rows.map((r) => r.spec) }));

/** Drag farther than this (design px) and the gesture is a scroll, not a tap. */
const DRAG_SLOP = 12;

/** r33 QA panel: collapsible sections of rows (see QA_SECTIONS). The header (title, BACK) is pinned; the sections scroll under it
 *  (touch drag, mouse wheel), clamped to the content. */
let lastScroll = 0;
export function openQaTools(scene: GameScene, jump = scene.currentLevel(), keepScroll = false) {
  if (!keepScroll) lastScroll = 0;
  scene.loadUnitPictures(); // a batch switch may just have put units in play: fetch their pictures now
  if (!keepScroll) scene.closeModal(); // a redraw of this sheet replaces it at once (no fade, no double dim)
  const geo = layoutPanel(panelSpec(), collapsed, H);
  const PH = geo.panelH;
  const c = scene.sheet(PH);
  if (keepScroll) {
    scene.tweens.killTweensOf(c);
    c.setAlpha(1).setY(0);
  }
  const top = H / 2 - PH / 2;
  scene.sheetTitle(c, top, 'QA TOOLS', 'For testing. Not in the real game.');
  const m = scene.meta;
  // rows draw in absolute coordinates into `list`, which is moved to scroll
  const list = scene.add.container(0, 0);
  c.add(list);
  const q: QaCtx = { scene, c: list, oy: top, jump, save: () => store(META_KEY, JSON.stringify(m)), reopen: () => scene.openQaTools(q.jump, true) };
  geo.sections.forEach((sl, si) => {
    const def = QA_SECTIONS[si];
    qaSectionHeader(q, sl, def.title, !collapsed.has(def.id), () => {
      if (collapsed.has(def.id)) collapsed.delete(def.id);
      else collapsed.add(def.id);
      q.reopen();
    });
    sl.rows.forEach((rl, ri) => def.rows[ri].draw(q, rl));
  });
  const winTop = top + geo.bodyTop, winBottom = top + geo.bodyBottom;
  const mask = scene.add.graphics().setVisible(false).fillRect(0, winTop, W, winBottom - winTop);
  list.setMask(mask.createGeometryMask());
  // header + footer strips swallow taps so rows scrolled out of the window can't be hit through them
  c.add(scene.add.zone(W / 2, (top + winTop) / 2, W, winTop - top).setInteractive());
  c.add(scene.add.zone(W / 2, (winBottom + top + PH) / 2, W, top + PH - winBottom).setInteractive());
  if (geo.minScroll < 0) {
    let scroll = 0, startY = 0, startScroll = 0, dragging = false;
    const setScroll = (v: number) => {
      scroll = Phaser.Math.Clamp(v, geo.minScroll, 0);
      list.setY(scroll);
      lastScroll = scroll;
    };
    setScroll(lastScroll);
    // a scroll drag must not also press the button it ends on: switch the rows' hit areas off until the finger lifts
    const setHits = (on: boolean) => {
      const walk = (o: Phaser.GameObjects.GameObject) => {
        if (o.input) o.input.enabled = on;
        if (o instanceof Phaser.GameObjects.Container) o.list.forEach(walk);
      };
      list.list.forEach(walk);
    };
    const inWindow = (p: Phaser.Input.Pointer) => p.worldY >= winTop && p.worldY <= winBottom;
    const onDown = (p: Phaser.Input.Pointer) => {
      if (scene.modal !== c || !c.active) return;
      startY = p.worldY;
      startScroll = scroll;
      dragging = false;
    };
    const onMove = (p: Phaser.Input.Pointer) => {
      if (!p.isDown || scene.modal !== c || !c.active || (!dragging && !(startY >= winTop && startY <= winBottom))) return;
      if (!dragging && Math.abs(p.worldY - startY) < DRAG_SLOP) return;
      if (!dragging) {
        dragging = true;
        setHits(false);
      }
      setScroll(startScroll + (p.worldY - startY));
    };
    const onUp = () => {
      if (!dragging) return;
      dragging = false;
      scene.time.delayedCall(80, () => c.active && setHits(true));
    };
    const onWheel = (p: Phaser.Input.Pointer, _o: unknown, _dx: number, dy: number) => {
      if (scene.modal === c && c.active && inWindow(p)) setScroll(scroll - dy);
    };
    scene.input.on('pointerdown', onDown);
    scene.input.on('pointermove', onMove);
    scene.input.on('pointerup', onUp);
    scene.input.on('pointerupoutside', onUp);
    scene.input.on('wheel', onWheel);
    c.once(Phaser.GameObjects.Events.DESTROY, () => {
      scene.input.off('pointerdown', onDown);
      scene.input.off('pointermove', onMove);
      scene.input.off('pointerup', onUp);
      scene.input.off('pointerupoutside', onUp);
      scene.input.off('wheel', onWheel);
      mask.destroy();
    });
  } else c.once(Phaser.GameObjects.Events.DESTROY, () => mask.destroy());
  scene.button(c, W - 140, top + 64, 220, 'BACK', 0x8a6a4a, () => scene.openTitle(), 0.7);
}
