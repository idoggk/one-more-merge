import Phaser from 'phaser';
import { applyTools, storedTools, TOOLS_KEY, allNewState, applyPace, applyRosterUnlocks, applySpamVariant, applyThinkBank, applyUnits, ROSTER_UNLOCKS_KEY, storedRosterUnlocks, DEFAULT_PACE, PACE_KEY, PACES, ROSTER1_KEY, ROSTER2_KEY, ROSTER3_KEY, ROSTER4_KEY, ROSTER5_KEY, ROSTER6_KEY, ROSTER7_KEY, storedPace, storedRoster1, storedRoster2, storedRoster3, storedRoster4, storedRoster5, storedRoster6, storedRoster7, storedThinkBank, storedUnits, THINK_BANK_KEY, UNITS_B0_KEY, UNITS_VARIANTS, unitsStoreValue, SPAM_VARIANTS, type SpamVariant } from '../../content/experiments';
import { TUNING } from '../../content/tuning';
import { applyMergeRule, MERGE_RULE_KEY, MERGE_RULES, storedMergeRule } from '../../core/sandwich';
import { TOOLBOX_KEY, toolboxOn } from '../fx/toolboxCrates';
import { ASSIST_MODES, MERGE_ASSIST_KEY, storedAssistMode, type AssistMode } from '../mergeAssist';
import { LEVELS } from '../../content/levels';
import { sfx } from '../audio';
import * as tlog from '../../platform/telemetry';
import { lockSaves, META_KEY, SAVE_KEY } from '../../platform/backup';
import { applyRoster1, applyRoster2, applyRoster3, applyRoster4, applyRoster5, applyRoster6, applyRoster7, UNITS, type CrateKind } from '../../content/units';
import { store } from '../meta';
import { unlockAll } from '../unlocks';
import type { GameScene } from '../GameScene';
import { W, H } from '../sceneKit';
import { qaGeometry } from './qaLayout';

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
// t-1effe0bf QA-only: MERGE RULE prototype (TODAY / +2 / +1 BONUS sandwich), this device only; applied when a level starts
export const qaMergeRule = () => storedMergeRule(() => localStorage.getItem(MERGE_RULE_KEY));
applyMergeRule(qaMergeRule());
// t-4208f149 QA-only: THINK BANK prototype (a still board pauses the level clock after a grace), applied when a level starts
export const qaThinkBank = () => storedThinkBank(() => localStorage.getItem(THINK_BANK_KEY));
applyThinkBank(qaThinkBank());

// t-e2a48327 QA-only: POWER TOOLS (Row Surge / Gear Bomb), default OFF, this device only; ON also sets MERGE RULE to +1 BONUS (the MERGE RULE row can still change it)
export const qaTools = () => storedTools(() => localStorage.getItem(TOOLS_KEY));
applyTools(qaTools());

/** What a QA row draws into: the open sheet, plus the level picked in JUMP TO LEVEL (kept when the panel reopens). */
interface QaCtx {
  scene: GameScene;
  c: Phaser.GameObjects.Container;
  jump: number;
  save: () => void;
  /** Redraw the panel (after a switch changes), keeping the picked level. */
  reopen: () => void;
}
/** One QA panel row, anchored at `y`; `h` is the gap down to the next row's anchor. */
interface QaRow {
  h: number;
  draw: (q: QaCtx, y: number) => void;
}
/** A this-device-only experiment switch: a title over one button per option ([brackets] = the stored one).
 *  `dx` = button spacing, `w` = button width, `gap` = title to buttons, `h` = row height. */
interface QaSwitch<T> {
  title: string;
  options: readonly { id: T; label: string }[];
  current: () => T;
  pick: (id: T) => void;
  toast: (id: T, label: string) => string;
  w: number;
  dx: number;
  gap?: number;
  h?: number;
  /** Title font size / button scale when the row is squeezed (MERGE RULE). */
  font?: number;
  scale?: number;
}
const qaSwitch = <T>(sw: QaSwitch<T>): QaRow => ({
  h: sw.h ?? 120,
  draw: ({ scene, c, reopen }, y) => {
    c.add(scene.add.text(W / 2, y, sw.title, { fontFamily: 'Lilita One, Arial Black', fontSize: `${sw.font ?? 26}px`, color: '#3b2533' }).setOrigin(0.5));
    const cur = sw.current();
    sw.options.forEach(({ id, label }, i) => {
      const on = id === cur;
      scene.button(c, W / 2 + (i - (sw.options.length - 1) / 2) * sw.dx, y + (sw.gap ?? 55), sw.w, on ? `[${label}]` : label, on ? 0x5fbf4a : 0x8a6a4a, () => {
        sw.pick(id);
        scene.showToast(sw.toast(id, label));
        reopen();
      }, sw.scale ?? 0.62);
    });
  },
});

/** Roster B batches shown in the NEW UNITS group (each is its own this-device-only switch, same keys as before). */
const ROSTER_BATCHES = [
  { n: 1, key: ROSTER1_KEY, on: qaRoster1, apply: applyRoster1, units: 'Nail Jackhammer Gear Saw', toastOn: 'NEW 4 UNITS ON  ·  CRATES, TEAM, UNITS' },
  { n: 2, key: ROSTER2_KEY, on: qaRoster2, apply: applyRoster2, units: 'Wrench Piston Spring Belt', toastOn: 'ROSTER 2 ON  ·  CRATES, TEAM, UNITS' },
  { n: 3, key: ROSTER3_KEY, on: qaRoster3, apply: applyRoster3, units: 'Torch Pipe Plate Tesla', toastOn: 'ROSTER 3 ON  ·  TESLA NEEDS CRATES B' },
  { n: 4, key: ROSTER4_KEY, on: qaRoster4, apply: applyRoster4, units: 'Cap Plan Ladder Rewind', toastOn: 'ROSTER 4 ON  ·  REWIND IS OFF IN PUZZLES, DAILY, BOUNTIES' },
  { n: 5, key: ROSTER5_KEY, on: qaRoster5, apply: applyRoster5, units: 'Crane Dynamo Wrecking', toastOn: 'ROSTER 5 ON  ·  CRANE AND DYNAMO DROP ONLY WITH CRATES B' },
  { n: 6, key: ROSTER6_KEY, on: qaRoster6, apply: applyRoster6, units: 'Robot Arm, Tilt Lever', toastOn: 'ROSTER 6 ON  ·  BOTH ARE LEGENDARY: THEY DROP ONLY WITH CRATES B' },
  { n: 7, key: ROSTER7_KEY, on: qaRoster7, apply: applyRoster7, units: 'Rivet Vice Router Press Lathe', toastOn: 'ROSTER 7 ON  ·  CRATES, TEAM, UNITS' },
] as const;
const ROSTER_GROUP_H = 262;
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

/** QA panel rows, top to bottom. A new experiment adds one qaSwitch entry here (the sheet grows to fit). */
export const QA_ROWS: QaRow[] = [
  // 1) start over (second tap within 3 s confirms)
  {
    h: 95,
    draw: ({ scene, c }, y) => {
      let armed = 0;
      const wipe = scene.button(c, W / 2, y, 520, 'START OVER (WIPE ALL)', 0xd8261a, () => {
        if (scene.time.now - armed > 3000) {
          armed = scene.time.now;
          sfx.invalid();
          (wipe.list[1] as Phaser.GameObjects.Text).setText('TAP AGAIN TO WIPE');
          scene.time.delayedCall(3000, () => wipe.active && scene.time.now - armed >= 2900 && (wipe.list[1] as Phaser.GameObjects.Text).setText('START OVER (WIPE ALL)'));
          return;
        }
        tlog.log('start_over');
        store(SAVE_KEY, null);
        store(META_KEY, null);
        lockSaves(); // the reload's visibilitychange -> save() must not write the old game back
        location.reload();
      }, 0.85);
    },
  },
  // 2) jump to level: every earlier level counts as cleared (2 stars), then the level card opens
  {
    h: 250,
    draw: (q, y) => {
      const { scene, c } = q;
      const m = scene.meta;
      c.add(scene.add.text(W / 2, y, 'JUMP TO LEVEL', { fontFamily: 'Lilita One, Arial Black', fontSize: '34px', color: '#3b2533' }).setOrigin(0.5));
      const lvT = scene.add.text(W / 2, y + 70, `${q.jump}`, { fontFamily: 'Lilita One, Arial Black', fontSize: '64px', color: '#e8452c' }).setOrigin(0.5);
      c.add(lvT);
      const set = (d: number) => {
        q.jump = Math.max(1, Math.min(LEVELS.length + 1, q.jump + d));
        lvT.setText(`${q.jump}`);
      };
      ([[-10, 110], [-1, 240], [1, W - 240], [10, W - 110]] as const).forEach(([d, x]) => scene.button(c, x, y + 70, 110, d > 0 ? `+${d}` : `${d}`, 0x8a6a4a, () => set(d), 0.7));
      scene.button(c, W / 2, y + 150, 420, 'GO', 0x5fbf4a, () => {
        const jump = q.jump;
        const st: Record<string, number> = {};
        for (let n = 1; n < jump; n++) st[String(n)] = Math.max(2, m.levelStars?.[String(n)] ?? 0);
        m.levelStars = st;
        m.tutorialDone = true;
        m.onboarded = true;
        q.save();
        tlog.log('qa_jump', { level: jump });
        scene.openTitle('road');
        if (jump <= LEVELS.length) scene.openLevelSheet(jump);
      }, 0.85);
    },
  },
  // 3) give stuff
  {
    h: 90,
    draw: ({ scene, c, save }, y) => {
      const m = scene.meta;
      scene.button(c, W / 2 - 150, y, 360, 'ALL UNITS (LV 5)', 0x8e58c9, () => {
        m.units = m.units ?? {};
        for (const u of UNITS) {
          m.units[u.id] = { level: Math.max(5, m.units[u.id]?.level ?? 0), cards: m.units[u.id]?.cards ?? 0 };
          if (u.slot === 'helper') m.toys[u.id] = m.toys[u.id] ?? false;
        }
        save();
        scene.showToast('ALL 13 UNITS AT LEVEL 5');
      }, 0.75);
      // t-2fd7bb86: every staggered feature (Team, Challenge, Workshop, Puzzles, Remix, Gems) open at once
      scene.button(c, W / 2 + 150, y, 360, 'UNLOCK ALL', 0x27a4c0, () => {
        unlockAll(m);
        m.hardUnlocked = true;
        save();
        tlog.log('qa_unlock_all');
        scene.showToast('ALL FEATURES UNLOCKED');
      }, 0.75);
    },
  },
  {
    h: 90,
    draw: ({ scene, c, save, reopen }, y) => {
      scene.button(c, W / 2 - 150, y, 360, '+2000 BOLTS +500 GEMS', 0xe0a020, () => {
        const m = scene.meta;
        m.bolts = (m.bolts ?? 0) + 2000;
        m.gems = (m.gems ?? 0) + 500;
        save();
        scene.showToast('+2000 BOLTS  +500 GEMS');
      }, 0.68);
      // t-4208f149 THINK BANK prototype OFF / ON (this device only; applies when the next level starts)
      scene.button(c, W / 2 + 150, y, 360, qaThinkBank() ? 'THINK BANK: ON' : 'THINK BANK: OFF', qaThinkBank() ? 0x5fbf4a : 0x8a6a4a, () => {
        store(THINK_BANK_KEY, qaThinkBank() ? null : 'on');
        tlog.log('qa_think_bank', { on: qaThinkBank() });
        scene.showToast(qaThinkBank() ? `THINK BANK ON  ·  ${TUNING.tb.grace} s still = clock stops  ·  START A LEVEL` : 'THINK BANK OFF (live game)  ·  NEXT LEVEL');
        reopen();
      }, 0.68);
    },
  },
  {
    h: 65,
    draw: ({ scene, c, save, reopen }, y) => {
      scene.button(c, W / 2 - 150, y, 360, '+3 CRATES', 0xb06a1a, () => {
        for (const k of (TUNING.rosterB ? ['wood', 'iron', 'gold', 'bench'] : ['wood', 'iron', 'gold']) as CrateKind[]) scene.giveCrate(k);
        save();
        scene.showToast('3 CRATES ADDED  ·  UNITS TAB');
      }, 0.75);
      // t-33f4fe2e crate look: OLD crates (live) / TOOLBOX (Tool Bag, Toolbox, Tool Chest), this device only
      scene.button(c, W / 2 + 150, y, 360, toolboxOn() ? 'CRATES: TOOLBOX' : 'CRATES: OLD', toolboxOn() ? 0x5fbf4a : 0x8a6a4a, () => {
        store(TOOLBOX_KEY, toolboxOn() ? null : 'toolbox');
        tlog.log('qa_crates', { look: toolboxOn() ? 'toolbox' : 'old' });
        reopen();
      }, 0.75);
    },
  },
  // 4) t-2c7cbae7 mid-level spam experiment (this device only; applies from the next level started)
  qaSwitch<SpamVariant>({
    title: 'SPAM TEST (next level)',
    options: SPAM_VARIANTS,
    current: spamVariant,
    pick: (id) => {
      store(SPAM_KEY, id === 'off' ? null : id);
      applySpamVariant(id);
      tlog.log('qa_spam_variant', { variant: id });
    },
    toast: (id, label) => (id === 'off' ? 'SPAM TEST OFF (live game)' : `SPAM TEST ${label}  ·  START A LEVEL`),
    w: 240,
    dx: 162,
  }),
  // 5) t-1bef1042 PACE prototype (this device only; the stored pace applies when the next level starts)
  qaSwitch({
    title: 'PACE (next level)',
    options: PACES,
    current: qaPace,
    pick: (id) => {
      store(PACE_KEY, id === DEFAULT_PACE ? null : id);
      tlog.log('qa_pace', { pace: id });
    },
    toast: (id, label) => (id === DEFAULT_PACE ? `PACE ${label} (live game)  ·  NEXT LEVEL` : `PACE ${label}  ·  START A LEVEL`),
    w: 300,
    dx: 210,
  }),
  // 6) t-a8c886ad / t-4a966cee units OFF / B0 / B1 (this device only; applies when the next level starts)
  {
    h: 105,
    draw: ({ scene, c, reopen }, y) => {
      c.add(scene.add.text(W / 2, y, 'UNITS (next level)', { fontFamily: 'Lilita One, Arial Black', fontSize: '26px', color: '#3b2533' }).setOrigin(0.5));
      const curUnits = qaUnits();
      UNITS_VARIANTS.forEach((v, i) => {
        const sel = v.id === curUnits;
        scene.button(c, W / 2 + (i - (UNITS_VARIANTS.length - 1) / 2) * 162, y + 55, 240, sel ? `[${v.label}]` : v.label, sel ? 0x5fbf4a : 0x8a6a4a, () => {
          store(UNITS_B0_KEY, unitsStoreValue(v.id));
          tlog.log('qa_units', { units: v.id });
          scene.showToast(v.id === 'off' ? 'UNITS OFF (live game)  ·  NEXT LEVEL' : `UNITS ${v.label}  ·  START A LEVEL`);
          reopen();
        }, 0.62);
      });
    },
  },
  // 6b) t-8426336a MERGE ASSIST: OFF (today) / ON / AUTO (levels 1-10 and under 30 lifetime merges), same setting as Settings
  qaSwitch<AssistMode>({
    title: 'MERGE ASSIST',
    options: ASSIST_MODES.map((id) => ({ id, label: id.toUpperCase() })),
    current: () => TUNING.mergeAssist,
    pick: (id) => {
      store(MERGE_ASSIST_KEY, id === 'off' ? null : id);
      applyAssistMode(id);
      tlog.log('qa_merge_assist', { mode: id });
    },
    toast: (id) => (id === 'off' ? 'MERGE ASSIST OFF (live game)' : id === 'on' ? 'MERGE ASSIST ON' : 'MERGE ASSIST AUTO  ·  LEVELS 1-10, FIRST 30 MERGES'),
    w: 200,
    dx: 220,
    gap: 48,
    h: 91,
  }),
  // 7) t-9adea8b8 SCREW YARD: OLD (today's yard) / OBJECT (the turnable crate), this device only
  qaSwitch({
    title: 'SCREW YARD',
    options: [{ id: 'old', label: 'OLD' }, { id: 'object', label: 'OBJECT' }],
    current: () => (qaYardObject() ? 'object' : 'old'),
    pick: (id) => {
      store(YARD_MODE_KEY, id === 'old' ? null : id);
      tlog.log('qa_screw_yard', { mode: id });
    },
    toast: (id) => (id === 'old' ? 'SCREW YARD: OLD (live game)' : 'SCREW YARD: OBJECT  ·  EVENTS > SCREW YARD'),
    w: 340,
    dx: 260,
    gap: 48,
    h: 91,
  }),
  // 7b) NEW UNITS: roster B batches 1..7 join the collection, crates and squads (this device only, live). One grouped section.
  {
    h: ROSTER_GROUP_H,
    draw: ({ scene, c, reopen }, y) => {
      const all = allNewNow();
      scene.button(c, W / 2, y + 30, 560, `ALL NEW UNITS: ${all === 'on' ? '[ON]' : all === 'mixed' ? '[MIXED]' : '[OFF]'}`, all === 'on' ? 0x5fbf4a : all === 'mixed' ? 0xd9a441 : 0x8a6a4a, () => {
        setAllNew(all !== 'on');
        scene.showToast(all !== 'on' ? 'ALL NEW UNITS ON  ·  CRATES B + BATCH 1..7' : 'ALL NEW UNITS OFF (live game)');
        reopen();
      }, 0.9);
      c.add(scene.add.text(W / 2, y + 72, `${UNITS.length} UNITS`, { fontFamily: 'Arial', fontStyle: 'bold', fontSize: '18px', color: '#7a5a4a' }).setOrigin(0.5));
      ROSTER_BATCHES.forEach((r, i) => {
        const x = W / 2 + ((i % 4) - 1.5) * 170;
        const by = y + 124 + Math.floor(i / 4) * 96;
        const on = r.on();
        scene.button(c, x, by, 230, on ? `[BATCH ${r.n}]` : `BATCH ${r.n}`, on ? 0x5fbf4a : 0x8a6a4a, () => {
          store(r.key, on ? null : 'on');
          r.apply(!on);
          tlog.log(`qa_roster_${r.n}`, { on: !on });
          scene.showToast(on ? `NEW UNITS BATCH ${r.n} OFF (live game)` : r.toastOn);
          reopen();
        }, 0.62);
        c.add(scene.add.text(x, by + 36, r.units, { fontFamily: 'Arial', fontStyle: 'bold', fontSize: '13px', color: '#7a5a4a', align: 'center', wordWrap: { width: 160 } }).setOrigin(0.5));
      });
      // t-c78bf16f: the chapter unlock plan (gifts + crate tiers + rarity-gated crate pool), and ALL NEW UNITS = batches 1..7 + the plan, together
      const planOn = qaRosterUnlocks();
      const plan = (on: boolean) => {
        store(ROSTER_UNLOCKS_KEY, on ? 'on' : null);
        applyRosterUnlocks(on);
        tlog.log('qa_roster_unlocks', { on });
      };
      scene.button(c, W / 2 + 1.5 * 170, y + 162, 230, planOn ? '[UNLOCK PLAN]' : 'UNLOCK PLAN', planOn ? 0x5fbf4a : 0x8a6a4a, () => { // the free 8th slot of the grid
        plan(!planOn);
        scene.showToast(planOn ? 'UNLOCK PLAN OFF (live game)' : 'UNLOCK PLAN ON  ·  GIFTS ON LEVEL 10, 13, 20, 25, 30, 35, 40, 50');
        reopen();
      }, 0.62);
      const allOn = ROSTER_BATCHES.every((r) => r.on()) && planOn;
      scene.button(c, W - 110, y + 12, 330, allOn ? '[ALL NEW UNITS]' : 'ALL NEW UNITS', allOn ? 0x5fbf4a : 0x8e58c9, () => { // beside the heading
        for (const r of ROSTER_BATCHES) {
          store(r.key, 'on');
          r.apply(true);
        }
        plan(true);
        scene.showToast('ALL NEW UNITS ON  ·  BATCHES 1..7 + UNLOCK PLAN');
        reopen();
      }, 0.5);
    },
  },
  // 7c) t-e2a48327 POWER TOOLS: OFF / ON (ON = chain 5+ makes a Row Surge, a sandwich makes a Gear Bomb; also sets MERGE RULE +1 BONUS)
  qaSwitch({
    title: 'POWER TOOLS',
    options: [{ id: 'off', label: 'OFF' }, { id: 'on', label: 'ON' }],
    current: () => (qaTools() ? 'on' : 'off'),
    pick: (id) => {
      store(TOOLS_KEY, id === 'on' ? 'on' : null);
      applyTools(id === 'on');
      if (id === 'on') {
        store(MERGE_RULE_KEY, 'sandwichBonus');
        applyMergeRule('sandwichBonus');
      }
      tlog.log('qa_tools', { on: id === 'on' });
    },
    toast: (id) => (id === 'on' ? 'POWER TOOLS ON  ·  MERGE RULE +1 BONUS  ·  LEVEL 10+' : 'POWER TOOLS OFF (live game)'),
    w: 240,
    dx: 200,
    gap: 38,
    h: 70,
  }),
  // 8) t-1effe0bf MERGE RULE prototype: TODAY / +2 sandwich / +1 BONUS sandwich (this device only; next level)
  // (the 1280-tall small-phone screen has no room left below: BACK moved up beside the title for this row)
  qaSwitch({
    title: 'MERGE RULE (next level)',
    options: MERGE_RULES,
    current: qaMergeRule,
    pick: (id) => {
      store(MERGE_RULE_KEY, id === 'today' ? null : id);
      tlog.log('qa_merge_rule', { rule: id });
    },
    toast: (id, label) => (id === 'today' ? 'MERGE RULE TODAY (live game)  ·  NEXT LEVEL' : `MERGE RULE ${label}  ·  START A LEVEL`),
    w: 320,
    dx: 200,
    gap: 33,
    h: 21,
    font: 24,
    scale: 0.55,
  }),
];
/** Drag farther than this (design px) and the gesture is a scroll, not a tap. */
const DRAG_SLOP = 12;

/** r33 QA panel: start over, jump to any level, give units / currency, experiment switches.
 *  The header (title, BACK) is pinned; the rows scroll under it (touch drag, mouse wheel), clamped to the content. */
let lastScroll = 0;
export function openQaTools(scene: GameScene, jump = scene.currentLevel(), keepScroll = false) {
  if (!keepScroll) lastScroll = 0;
  scene.closeModal();
  const geo = qaGeometry(QA_ROWS.map((r) => r.h), H);
  const PH = geo.panelH;
  const c = scene.sheet(PH);
  const top = H / 2 - PH / 2;
  scene.sheetTitle(c, top, 'QA TOOLS', 'For testing. Not in the real game.');
  const m = scene.meta;
  // rows draw in absolute coordinates into `list`, which is moved to scroll
  const list = scene.add.container(0, 0);
  c.add(list);
  const q: QaCtx = { scene, c: list, jump, save: () => store(META_KEY, JSON.stringify(m)), reopen: () => scene.openQaTools(q.jump, true) };
  geo.anchors.forEach((ay, i) => QA_ROWS[i].draw(q, top + ay));
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
  scene.button(c, W - 150, top + 64, 220, 'BACK', 0x8a6a4a, () => scene.openTitle(), 0.6);
}
