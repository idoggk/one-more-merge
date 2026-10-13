import type { QaCtx, QaRow } from './qaKit';

/** START HERE: eight guided QA tests. Pure data + storage, no Phaser: the card drawing is qaKit.qaGuideCard, the screen jumps are
 *  the GuideNav the panel passes in. A START sets its flags through the registry rows (by row id), so it can never drift from the switches. */

/** Where a test sends the player after its flags are set (every one reuses an existing QA action). */
export type GuideGo =
  | { to: 'units'; crates?: boolean; allUnits?: boolean }
  | { to: 'level'; level: number }
  | { to: 'budget'; index: number }
  | { to: 'yard' };

export interface GuideTest {
  n: number;
  /** Three words. */
  title: string;
  /** One sentence, max 14 words. */
  what: string;
  /** One sentence, max 14 words. */
  look: string;
  /** Flags this START sets, by QA row id. Every other flag is put back to its default first. */
  flags: readonly [rowId: string, value: boolean | string][];
  go: GuideGo;
}

export const GUIDE_TESTS: readonly GuideTest[] = [
  {
    n: 1, title: 'New crate opening', what: 'Tap START, then tap a crate to open it.', look: 'A toolbox that shakes, bursts, and shows your new cards.',
    flags: [['cratesLook', 'toolbox']], go: { to: 'units', crates: true },
  },
  {
    n: 2, title: 'Units screen scrolling', what: 'Drag the unit list up and down with one finger.', look: 'It scrolls smoothly, and a tap on a unit still opens it.',
    flags: [['allNew', true]], go: { to: 'units', allUnits: true },
  },
  {
    n: 3, title: 'Merge assist help', what: 'Play the level and tap a part, then tap its twin.', look: 'A glow shows which part to tap next, and merging feels easy.',
    flags: [['mergeAssist', 'on']], go: { to: 'level', level: 4 },
  },
  {
    n: 4, title: 'Sandwich bonus merge', what: 'Merge two equal parts with one part between them.', look: 'The middle part joins in and the hit is bigger.',
    flags: [['mergeRule', 'sandwichBonus']], go: { to: 'level', level: 6 },
  },
  {
    n: 5, title: 'Capped merge level', what: 'Win the LAST 6 level using six merges or fewer.', look: 'A merge counter goes down, and there is no clock.',
    flags: [['budget', true]], go: { to: 'budget', index: 0 },
  },
  {
    n: 6, title: 'Power tools test', what: 'Make a chain of five merges, or a sandwich.', look: 'A Row Surge or Gear Bomb appears on the board for you to tap.',
    flags: [['tools', true]], go: { to: 'level', level: 12 },
  },
  {
    n: 7, title: 'Screw Yard pressure', what: 'Start the yard and unscrew the object.', look: 'A countdown starts at your first tap, with a tap budget.',
    flags: [['yardMode', 'object'], ['yardPressure', true]], go: { to: 'yard' },
  },
  {
    n: 8, title: 'Varied level openings', what: 'Start the level, then restart it a few times.', look: 'The parts start in a different layout on different tries.',
    flags: [['varied', true]], go: { to: 'level', level: 7 },
  },
];

export type GuideAnswer = 'yes' | 'no';
export type GuideAnswers = Record<string, GuideAnswer>;

/** Local storage key for the answers (this device only; not in the save or the backup code). */
export const GUIDE_KEY = 'qaGuide';

export function readGuide(read: () => string | null): GuideAnswers {
  try {
    const raw = JSON.parse(read() ?? '{}') as Record<string, unknown>;
    const out: GuideAnswers = {};
    for (const t of GUIDE_TESTS) {
      const v = raw?.[String(t.n)];
      if (v === 'yes' || v === 'no') out[String(t.n)] = v;
    }
    return out;
  } catch {
    return {};
  }
}

/** Tapping the answer that is already stored clears it (a mis-tap can be undone). */
export function withAnswer(a: GuideAnswers, n: number, v: GuideAnswer): GuideAnswers {
  const out = { ...a };
  if (out[String(n)] === v) delete out[String(n)];
  else out[String(n)] = v;
  return out;
}

export const guideProgress = (a: GuideAnswers) => `Tested ${GUIDE_TESTS.filter((t) => a[String(t.n)]).length} of ${GUIDE_TESTS.length}`;

/** The rows that have a default (flags and multi-choice settings). */
const resettable = (rows: readonly QaRow[]) => rows.filter((r) => r.reset);

/** Every switch back to its default, through the registry. Settings without a `reset` (SCREEN SHAKE, buttons) are left alone. */
export function resetAll(rows: readonly QaRow[], q: QaCtx) {
  for (const r of resettable(rows)) r.reset!(q);
}

/** START: defaults first, then exactly this test's flags, then the screen jump. */
export function startTest(t: GuideTest, rows: readonly QaRow[], q: QaCtx, nav: GuideNav) {
  resetAll(rows, q);
  for (const [id, v] of t.flags) {
    const row = rows.find((r) => r.spec.id === id);
    if (!row?.apply) throw new Error(`QA guide test ${t.n}: no switch "${id}"`);
    row.apply(v, q);
  }
  const g = t.go;
  if (g.to === 'units') nav.units({ crates: !!g.crates, allUnits: !!g.allUnits });
  else if (g.to === 'level') nav.level(g.level);
  else if (g.to === 'budget') nav.budget(g.index);
  else nav.yard();
}

/** What the panel hands in: the existing QA actions (give crates / give units / jump to level / budget level / yard event). */
export interface GuideNav {
  units: (o: { crates: boolean; allUnits: boolean }) => void;
  level: (n: number) => void;
  budget: (i: number) => void;
  yard: () => void;
}
