import Phaser from 'phaser';
import { applyPace, applySpamVariant, applyThinkBank, applyUnits, DEFAULT_PACE, PACE_KEY, PACES, ROSTER1_KEY, storedPace, storedRoster1, storedThinkBank, storedUnits, THINK_BANK_KEY, UNITS_B0_KEY, UNITS_VARIANTS, unitsStoreValue, SPAM_VARIANTS, type SpamVariant } from '../../content/experiments';
import { TUNING } from '../../content/tuning';
import { applyMergeRule, MERGE_RULE_KEY, MERGE_RULES, storedMergeRule } from '../../core/sandwich';
import { TOOLBOX_KEY, toolboxOn } from '../fx/toolboxCrates';
import { LEVELS } from '../../content/levels';
import { sfx } from '../audio';
import * as tlog from '../../platform/telemetry';
import { lockSaves, META_KEY, SAVE_KEY } from '../../platform/backup';
import { applyRoster1, UNITS, type CrateKind } from '../../content/units';
import { store } from '../meta';
import { unlockAll } from '../unlocks';
import type { GameScene } from '../GameScene';
import { W, H } from '../sceneKit';

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
// t-9adea8b8 QA-only: SCREW YARD OLD (today's plates) / OBJECT (the turnable Screwdom-style object), this device only
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
// t-1effe0bf QA-only: MERGE RULE prototype (TODAY / +2 / +1 BONUS sandwich), this device only; applied when a level starts
export const qaMergeRule = () => storedMergeRule(() => localStorage.getItem(MERGE_RULE_KEY));
applyMergeRule(qaMergeRule());
// t-4208f149 QA-only: THINK BANK prototype (a still board pauses the level clock after a grace), applied when a level starts
export const qaThinkBank = () => storedThinkBank(() => localStorage.getItem(THINK_BANK_KEY));
applyThinkBank(qaThinkBank());

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

/** QA panel rows, top to bottom. A new experiment adds one qaSwitch entry here (the sheet grows to fit). */
const QA_ROWS: QaRow[] = [
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
      // t-9b28a794: 4th button NEW4 toggles roster B batch 1 (Nail Gun / Jackhammer / Gear / Saw Blade) at once
      const r1On = qaRoster1();
      scene.button(c, W / 2 + 1.5 * 162, y + 55, 240, r1On ? '[NEW4]' : 'NEW4', r1On ? 0x5fbf4a : 0x8a6a4a, () => {
        store(ROSTER1_KEY, r1On ? null : 'on');
        applyRoster1(!r1On);
        tlog.log('qa_roster_1', { on: !r1On });
        scene.showToast(r1On ? 'NEW 4 UNITS OFF (live game)' : 'NEW 4 UNITS ON  ·  CRATES, TEAM, UNITS');
        reopen();
      }, 0.62);
      UNITS_VARIANTS.forEach((v, i) => {
        const sel = v.id === curUnits;
        scene.button(c, W / 2 + (i - 1.5) * 162, y + 55, 240, sel ? `[${v.label}]` : v.label, sel ? 0x5fbf4a : 0x8a6a4a, () => {
          store(UNITS_B0_KEY, unitsStoreValue(v.id));
          tlog.log('qa_units', { units: v.id });
          scene.showToast(v.id === 'off' ? 'UNITS OFF (live game)  ·  NEXT LEVEL' : `UNITS ${v.label}  ·  START A LEVEL`);
          reopen();
        }, 0.62);
      });
    },
  },
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
/** First row anchor and the BACK button's bottom margin, from the sheet top. */
const QA_FIRST_Y = 185;
const QA_BOTTOM = 38;

/** r33 QA panel: start over, jump to any level, give units / currency, experiment switches. */
export function openQaTools(scene: GameScene, jump = scene.currentLevel()) {
  scene.closeModal();
  const backY = QA_FIRST_Y + QA_ROWS.reduce((n, r) => n + r.h, 0);
  const PH = backY + QA_BOTTOM;
  const c = scene.sheet(PH);
  const top = H / 2 - PH / 2;
  scene.sheetTitle(c, top, 'QA TOOLS', 'For testing. Not in the real game.');
  const m = scene.meta;
  const q: QaCtx = { scene, c, jump, save: () => store(META_KEY, JSON.stringify(m)), reopen: () => scene.openQaTools(q.jump) };
  let y = top + QA_FIRST_Y;
  for (const r of QA_ROWS) {
    r.draw(q, y);
    y += r.h;
  }
  scene.button(c, W - 150, top + 64, 220, 'BACK', 0x8a6a4a, () => scene.openTitle(), 0.6);
}