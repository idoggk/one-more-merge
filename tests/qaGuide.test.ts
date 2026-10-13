import { describe, expect, it, vi } from 'vitest';

// the panel module pulls in Phaser (needs a browser); only the registry, the guide module and stub objects are used here
vi.mock('phaser', () => ({ default: { GameObjects: { Events: {}, Container: class {} }, Math: { Clamp: (v: number, a: number, b: number) => Math.min(b, Math.max(a, v)) } } }));
vi.mock('../src/game/audio', () => ({ sfx: { click() {}, invalid() {} }, unlockAudio() {}, startMusic() {} }));

// a phone's local storage, in memory
const mem = new Map<string, string>();
(globalThis as { localStorage?: unknown }).localStorage = {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => void mem.set(k, String(v)),
  removeItem: (k: string) => void mem.delete(k),
};

const P = await import('../src/game/ui/qaPanel');
const G = await import('../src/game/ui/qaGuide');
const L = await import('../src/game/ui/qaLayout');
const { TUNING } = await import('../src/content/tuning');
const { toolboxOn } = await import('../src/game/fx/toolboxCrates');
const { BUDGET_LEVELS } = await import('../src/core/budget');

const calls: string[] = [];
const q = {
  scene: {
    meta: { toys: {} } as Record<string, unknown>,
    giveCrate: (k: string) => calls.push(`crate:${k}`),
    openTitle: (t: string) => calls.push(`title:${t}`),
    openLevelSheet: (n: number) => calls.push(`sheet:${n}`),
    startBudget: (b: { id: string }) => calls.push(`budget:${b.id}`),
    openYardEvent: () => calls.push('yard'),
    showToast: () => {},
    shake: () => {},
  },
  c: null,
  oy: 0,
  jump: 1,
  save() {},
  reopen() {},
} as never;

/** Every flag a START can touch, read the way the game reads it. */
const flagsNow = () => ({
  crates: toolboxOn() ? 'toolbox' : 'old',
  allNew: P.qaUnits() === 'rb' && P.qaRoster1() && P.qaRoster7(),
  assist: P.qaAssistMode(),
  rule: P.qaMergeRule(),
  budget: !!P.qaMergeBudget(),
  tools: !!P.qaTools(),
  yard: P.qaYardObject() ? 'object' : 'old',
  pressure: !!P.qaYardPressure(),
  varied: !!P.qaVariedOpenings(),
  pace: P.qaPace(),
  think: !!P.qaThinkBank(),
});
const DEFAULTS = { crates: 'old', allNew: false, assist: 'off', rule: 'today', budget: false, tools: false, yard: 'old', pressure: false, varied: false, pace: 'calm', think: false };
const test = (n: number) => G.GUIDE_TESTS.find((t) => t.n === n)!;
const start = (n: number) => G.startTest(test(n), P.QA_ROWS, q, nav);
const nav: import('../src/game/ui/qaGuide').GuideNav = {
  units: ({ crates, allUnits }) => calls.push(`units:${crates ? 'crates' : ''}${allUnits ? 'all' : ''}`),
  level: (n) => calls.push(`level:${n}`),
  budget: (i) => calls.push(`budgetIndex:${i}`),
  yard: () => calls.push('yard'),
};

describe('START HERE: registry', () => {
  it('is the first section, with the progress row and the eight tests in the owner order', () => {
    expect(P.QA_SECTIONS[0].id).toBe('guide');
    expect(P.QA_SECTIONS[0].title).toBe('START HERE');
    expect(P.QA_SECTIONS[0].rows.map((r) => r.spec.id)).toEqual(['guideTop', 'guide1', 'guide2', 'guide3', 'guide4', 'guide5', 'guide6', 'guide7', 'guide8']);
    expect(G.GUIDE_TESTS.map((t) => t.n)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(G.GUIDE_TESTS.map((t) => t.title)).toEqual([
      'New crate opening', 'Units screen scrolling', 'Merge assist help', 'Sandwich bonus merge', 'Capped merge level', 'Power tools test', 'Screw Yard pressure', 'Varied level openings',
    ]);
    expect(P.QA_SECTIONS[0].rows.slice(1).map((r) => r.title)).toEqual(G.GUIDE_TESTS.map((t) => t.title));
  });
  it('the panel opens START HERE and folds the other sections', () => {
    expect(P.qaCollapsed.has('guide')).toBe(false);
    expect(P.qaCollapsed.has('quick')).toBe(true);
  });
  it('plain words: three-word titles, one short sentence each for WHAT TO DO and LOOK FOR', () => {
    for (const t of G.GUIDE_TESTS) {
      expect(t.title.split(' ').length, t.title).toBe(3);
      for (const s of [t.what, t.look]) {
        expect(s.split(/\s+/).length, s).toBeLessThanOrEqual(14);
        expect(s.length, s).toBeLessThanOrEqual(72);
        expect(s.match(/[.!?]/g)?.length, s).toBe(1); // one sentence
        expect(s.endsWith('.'), s).toBe(true);
      }
    }
  });
  it('every flag a test names is a real, settable switch in the registry', () => {
    for (const t of G.GUIDE_TESTS) for (const [id] of t.flags) expect(P.QA_ROWS.find((r) => r.spec.id === id)?.apply, `${t.n} ${id}`).toBeTypeOf('function');
  });
  it('the guide row sizes fit the panel at 390x844 and 360x640 (see qaPanel.test.ts for the full overlap checks)', () => {
    for (const H of [1558, 1280]) {
      const g = L.layoutPanel(P.QA_SECTIONS.map((s) => ({ id: s.id, rows: s.rows.map((r) => r.spec) })), new Set(), H);
      const cards = g.sections[0].rows;
      expect(cards).toHaveLength(9);
      for (const c of cards.slice(1)) {
        expect(c.parts.filter((p) => p.role === 'control')).toHaveLength(3); // START, YES, NOT RIGHT
        expect(L.qaReachable(g, c.rect), c.id).toBe(true);
      }
    }
  });
});

describe('START HERE: what each START sets', () => {
  const EXPECT: Record<number, Partial<typeof DEFAULTS>> = {
    1: { crates: 'toolbox' },
    2: { allNew: true },
    3: { assist: 'on' },
    4: { rule: 'sandwichBonus' },
    5: { budget: true },
    6: { tools: true, rule: 'sandwichBonus' }, // POWER TOOLS also sets the +1 BONUS rule
    7: { yard: 'object', pressure: true },
    8: { varied: true },
  };
  for (const n of [1, 2, 3, 4, 5, 6, 7, 8]) {
    it(`test ${n} sets exactly its flags, from any earlier state, and goes to the right screen`, () => {
      // dirty start: every other test's flags on, a changed pace and think bank
      for (const o of G.GUIDE_TESTS) if (o.n !== n) calls.length = 0, G.startTest(o, P.QA_ROWS, q, nav);
      calls.length = 0;
      start(n);
      expect(flagsNow()).toEqual({ ...DEFAULTS, ...EXPECT[n] });
      expect(calls).toHaveLength(1);
    });
  }
  it('the screens: units tab (with crates / all units), the road level card, the LAST 6 level, the yard', () => {
    const dest = (n: number) => (calls.length = 0, start(n), calls[0]);
    expect(dest(1)).toBe('units:crates');
    expect(dest(2)).toBe('units:all');
    expect(dest(3)).toBe('level:4');
    expect(dest(4)).toBe('level:6');
    expect(dest(5)).toBe('budgetIndex:0');
    expect(BUDGET_LEVELS[0].name).toBe('LAST 6');
    expect(dest(6)).toBe('level:12');
    expect(dest(7)).toBe('yard');
    expect(dest(8)).toBe('level:7');
  });
  it('the panel START opens the screen through the existing QA actions', () => {
    calls.length = 0;
    const card = P.QA_SECTIONS[0].rows[5]; // test 5: the capped-merge level
    // draw the card on a stub and press START (the first control)
    const objs: { handlers: Record<string, () => void>; interactive: boolean; parent: unknown }[] = [];
    const mk = (): never => {
      const o: Record<string, unknown> = { handlers: {}, interactive: false, parent: null, list: [] };
      const p: unknown = new Proxy(o, {
        get: (t, k) => (k in t ? t[k as string] : (...a: unknown[]) => (k === 'on' ? ((t.handlers as Record<string, unknown>)[a[0] as string] = a[1], p) : k === 'setInteractive' ? ((t.interactive = true), p) : p)),
      });
      objs.push(o as never);
      return p as never;
    };
    const scene = { ...(q as unknown as { scene: object }).scene, add: { text: mk, graphics: mk, container: mk } };
    const qq = { scene, c: { add() {} }, oy: 0, jump: 1, save() {}, reopen() {} } as never;
    card.draw(qq, L.layoutRow(card.spec, 0));
    objs.filter((o) => o.interactive)[0].handlers.pointerup();
    expect(calls).toContain(`budget:${BUDGET_LEVELS[0].id}`);
    expect(P.qaMergeBudget()).toBeTruthy();
  });
  it('a START with an unknown switch fails loudly instead of doing nothing', () => {
    expect(() => G.startTest({ ...test(3), flags: [['nope', true]] }, P.QA_ROWS, q, nav)).toThrow(/no switch "nope"/);
  });
});

describe('START HERE: RESET ALL', () => {
  it('puts every switch back to its default through the registry', () => {
    for (const t of G.GUIDE_TESTS) G.startTest(t, P.QA_ROWS, q, nav);
    P.QA_ROWS.find((r) => r.spec.id === 'pace')!.apply!('mania', q);
    P.QA_ROWS.find((r) => r.spec.id === 'thinkBank')!.apply!(true, q);
    P.QA_ROWS.find((r) => r.spec.id === 'spam')!.apply!('a3', q);
    expect(flagsNow()).not.toEqual(DEFAULTS);
    G.resetAll(P.QA_ROWS, q);
    expect(flagsNow()).toEqual(DEFAULTS);
    expect(TUNING.tools).toBeFalsy();
    expect(TUNING.mergeBudget).toBeFalsy();
    // the local storage holds none of the QA switch keys any more
    expect([...mem.keys()].filter((k) => k.startsWith('omm_qa'))).toEqual([]);
  });
  it('the RESET ALL button runs it', () => {
    P.QA_ROWS.find((r) => r.spec.id === 'varied')!.apply!(true, q);
    expect(flagsNow().varied).toBe(true);
    G.resetAll(P.QA_ROWS, q);
    expect(flagsNow().varied).toBe(false);
  });
  it('keeps the guide answers (they are not switches)', () => {
    mem.set(G.GUIDE_KEY, JSON.stringify({ 1: 'yes' }));
    G.resetAll(P.QA_ROWS, q);
    expect(G.readGuide(() => mem.get(G.GUIDE_KEY) ?? null)).toEqual({ 1: 'yes' });
    mem.delete(G.GUIDE_KEY);
  });
});

describe('START HERE: YES / NOT RIGHT and the progress line', () => {
  it('stores answers under qaGuide, counts them, and tapping the same answer again clears it', () => {
    let a = G.readGuide(() => mem.get(G.GUIDE_KEY) ?? null);
    expect(G.guideProgress(a)).toBe('Tested 0 of 8');
    a = G.withAnswer(a, 1, 'yes');
    a = G.withAnswer(a, 4, 'no');
    a = G.withAnswer(a, 8, 'yes');
    expect(G.guideProgress(a)).toBe('Tested 3 of 8');
    a = G.withAnswer(a, 4, 'yes'); // changed her mind: the new answer replaces it
    expect(a['4']).toBe('yes');
    a = G.withAnswer(a, 4, 'yes');
    expect(a['4']).toBeUndefined();
    expect(G.guideProgress(a)).toBe('Tested 2 of 8');
  });
  it('the card buttons write to local storage and read back', () => {
    mem.delete(G.GUIDE_KEY);
    const card = P.QA_SECTIONS[0].rows[3]; // test 3
    const objs: { handlers: Record<string, () => void>; interactive: boolean }[] = [];
    const mk = (): never => {
      const o: Record<string, unknown> = { handlers: {}, interactive: false };
      const p: unknown = new Proxy(o, {
        get: (t, k) => (k in t ? t[k as string] : (...a: unknown[]) => (k === 'on' ? ((t.handlers as Record<string, unknown>)[a[0] as string] = a[1], p) : k === 'setInteractive' ? ((t.interactive = true), p) : p)),
      });
      objs.push(o as never);
      return p as never;
    };
    let reopened = 0;
    const qq = { scene: { add: { text: mk, graphics: mk, container: mk }, showToast() {} }, c: { add() {} }, oy: 0, jump: 1, save() {}, reopen: () => reopened++ } as never;
    card.draw(qq, L.layoutRow(card.spec, 0));
    const ctl = objs.filter((o) => o.interactive); // START, YES, NOT RIGHT
    expect(ctl).toHaveLength(3);
    ctl[1].handlers.pointerup();
    expect(JSON.parse(mem.get(G.GUIDE_KEY)!)).toEqual({ 3: 'yes' });
    ctl[2].handlers.pointerup();
    expect(JSON.parse(mem.get(G.GUIDE_KEY)!)).toEqual({ 3: 'no' });
    expect(reopened).toBe(2);
    expect(G.guideProgress(G.readGuide(() => mem.get(G.GUIDE_KEY) ?? null))).toBe('Tested 1 of 8');
  });
  it('a broken stored value reads as no answers', () => {
    expect(G.readGuide(() => '{not json')).toEqual({});
    expect(G.readGuide(() => JSON.stringify({ 1: 'maybe', 9: 'yes' }))).toEqual({});
    expect(G.readGuide(() => null)).toEqual({});
  });
});
