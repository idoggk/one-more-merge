import { describe, expect, it, vi } from 'vitest';

// the panel module pulls in Phaser (needs a browser); only the row registry and a stub scene are used here
vi.mock('phaser', () => ({ default: { GameObjects: { Events: {}, Container: class {} }, Math: { Clamp: (v: number, a: number, b: number) => Math.min(b, Math.max(a, v)) } } }));
vi.mock('../src/game/audio', () => ({ sfx: { click() {}, invalid() {} }, unlockAudio() {}, startMusic() {} }));

const { QA_ROWS, QA_SECTIONS, qaCollapsed } = await import('../src/game/ui/qaPanel');
const { qaFlag, qaChoice, qaAction, qaSectionHeader } = await import('../src/game/ui/qaKit');
const L = await import('../src/game/ui/qaLayout');

/** Every row id the old panel had (one per setting or button), plus the ids that are new. Adding a flag adds one id here and one registry line. */
const EXPECTED_ROWS = [
  'guideTop', 'guide1', 'guide2', 'guide3', 'guide4', 'guide5', 'guide6', 'guide7', 'guide8', // start here (details in qaGuide.test.ts)
  'jump', 'allUnits', 'unlockAll', 'bolts', 'crates3', 'startOver', // quick tools
  'thinkBank', 'mergeRule', 'mergeAssist', 'pace', // merge feel
  'allNew', 'batches', 'unlockPlan', 'batchesAndPlan', 'rosterMode', // units
  'cratesLook', // crates
  'crateOpenV2',
  'spam', 'varied', 'paceCaps', 'effortModel', 'levelPace2', 'levelTimeline', 'roadv2', 'roadPolish', 'roadPerf', 'roadPerf2', 'roadPerf3', 'roadPerf4', 'roadPerfHud', 'roadSurfaceKit', 'roadMapMock1', 'roadKitPreview', 'budget', 'budgetPick', 'tools', 'yardPressure', // levels and tests
  'yardMode', 'yardBook', // screw yard
  'uiKitV3', // display
  'resourceFly', // display
  'unitShots', // display
  'unitIdle', // display
  'mascotMotion', 'mascotDemo', // display
  'uiJuice', // display
  'mapBadges', 'mapBadgesForce', // display
  'shake', // display
  'qaPanelV2', // display
];

describe('QA registry: every old row is still there', () => {
  it('has exactly the expected row ids, once each, in the seven sections in order', () => {
    expect(QA_ROWS.map((r) => r.spec.id).sort()).toEqual([...EXPECTED_ROWS].sort());
    expect(new Set(QA_ROWS.map((r) => r.spec.id)).size).toBe(QA_ROWS.length);
    expect(QA_SECTIONS.map((s) => s.title)).toEqual(['START HERE', 'QUICK TOOLS', 'MERGE FEEL', 'UNITS', 'CRATES', 'LEVELS AND TESTS', 'SCREW YARD', 'DISPLAY']);
  });
  it('puts the rows in the sections the brief names', () => {
    const ids = (s: string) => QA_SECTIONS.find((x) => x.id === s)!.rows.map((r) => r.spec.id);
    expect(ids('quick')).toEqual(['jump', 'allUnits', 'unlockAll', 'bolts', 'crates3', 'startOver']);
    expect(ids('feel')).toEqual(['thinkBank', 'mergeRule', 'mergeAssist', 'pace']);
    expect(ids('units')).toEqual(['allNew', 'batches', 'unlockPlan', 'batchesAndPlan', 'rosterMode']);
    expect(ids('crates')).toEqual(['cratesLook', 'crateOpenV2']);
    expect(ids('tests')).toEqual(['spam', 'varied', 'paceCaps', 'effortModel', 'levelPace2', 'levelTimeline', 'roadv2', 'roadPolish', 'roadPerf', 'roadPerf2', 'roadPerf3', 'roadPerf4', 'roadPerfHud', 'roadSurfaceKit', 'roadMapMock1', 'roadKitPreview', 'budget', 'budgetPick', 'tools', 'yardPressure']);
    expect(ids('yard')).toEqual(['yardMode', 'yardBook']);
    expect(ids('display')).toEqual(['uiKitV3', 'resourceFly', 'unitShots', 'unitIdle', 'mascotMotion', 'mascotDemo', 'mapBadges', 'mapBadgesForce', 'uiJuice', 'shake', 'qaPanelV2']);
  });
  it('visual-only switches ship ON, can be turned off, and RESET ALL puts them back ON', async () => {
    const { TUNING } = await import('../src/content/tuning');
    const { RESOURCE_FLY, UNIT_IDLE, UNIT_SHOTS, ROAD_POLISH, ROAD_PERF2 } = await import('../src/content/experiments');
    expect([TUNING.uiKitV3, TUNING.levelRoadV2, TUNING.crateOpenV2, RESOURCE_FLY.on, UNIT_IDLE.on, UNIT_SHOTS.on, ROAD_PERF2.on]).toEqual(Array(7).fill(true));
    expect(ROAD_POLISH.on, 'ROAD POLISH ships OFF until the owner confirms smoothness').toBe(false);
    // behaviour flags stay OFF
    expect([TUNING.effortModel, TUNING.paceCaps, TUNING.yardBook]).toEqual([false, false, false]);
    const q = { scene: { showToast() {} }, reopen() {} } as never;
    const mem = new Map<string, string>();
    vi.stubGlobal('localStorage', { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k) });
    try {
      for (const id of ['uiKitV3', 'resourceFly', 'unitShots', 'unitIdle', 'roadv2', 'roadPerf', 'roadPerf2', 'roadPerf3', 'roadPerf4', 'crateOpenV2', 'qaPanelV2']) {
        const row = QA_ROWS.find((r) => r.spec.id === id)!;
        row.apply!(false, q);
        expect([...mem.values()].pop(), id).toBe('off');
        row.reset!(q);
      }
      expect([...mem.keys()], 'back on = no stored key').toEqual([]);
    } finally {
      vi.unstubAllGlobals();
    }
    expect([TUNING.uiKitV3, TUNING.levelRoadV2, TUNING.crateOpenV2, RESOURCE_FLY.on, UNIT_IDLE.on, UNIT_SHOTS.on, ROAD_PERF2.on]).toEqual(Array(7).fill(true));
    expect(ROAD_POLISH.on, 'ROAD POLISH ships OFF until the owner confirms smoothness').toBe(false);
  });
  it('on/off settings are switches, multi-choice settings are segmented controls', () => {
    const kind = (id: string) => QA_ROWS.find((r) => r.spec.id === id)!.spec.kind;
    for (const id of ['thinkBank', 'allNew', 'unlockPlan', 'varied', 'effortModel', 'budget', 'tools', 'yardPressure', 'yardBook']) expect(kind(id), id).toBe('switch');
    for (const id of ['mergeRule', 'mergeAssist', 'pace', 'rosterMode', 'cratesLook', 'spam', 'yardMode', 'shake']) expect(kind(id), id).toBe('segment');
    expect(kind('batches')).toBe('grid');
    expect(QA_ROWS.find((r) => r.spec.id === 'batches')!.spec.count).toBe(7);
  });
  it('every row has a title; descriptions are one short line', () => {
    for (const r of QA_ROWS) {
      expect(r.title.length, r.spec.id).toBeGreaterThan(0);
      if (r.spec.hasDesc) {
        const d = typeof r.desc === 'function' ? r.desc() : r.desc;
        expect(d!.length, r.spec.id).toBeGreaterThan(0);
        expect(d, r.spec.id).not.toContain('\n');
      }
    }
  });
});

// ---------- a stub host: records every text and control the rows draw, with absolute boxes ----------

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}
class Obj {
  x = 0;
  y = 0;
  scaleX = 1;
  scaleY = 1;
  parent: Obj | null = null;
  list: Obj[] = [];
  size: { w: number; h: number } | null = null;
  interactive = false;
  isText = false;
  text = '';
  fs = 0;
  ox = 0;
  oy = 0.5;
  wrap = 0;
  lines = 1;
  active = true;
  handlers: Record<string, () => void> = {};
  constructor(public type: string, x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }
  add(o: Obj | Obj[]) {
    for (const x of Array.isArray(o) ? o : [o]) {
      x.parent?.list.splice(x.parent.list.indexOf(x), 1);
      x.parent = this;
      this.list.push(x);
    }
    return this;
  }
  setSize(w: number, h: number) {
    this.size = { w, h };
    return this;
  }
  setInteractive() {
    this.interactive = true;
    return this;
  }
  on(ev: string, fn: () => void) {
    this.handlers[ev] = fn;
    return this;
  }
  setScale(s: number) {
    this.scaleX = this.scaleY = s;
    return this;
  }
  setAlpha() {
    return this;
  }
  setOrigin(x: number, y = x) {
    this.ox = x;
    this.oy = y;
    return this;
  }
  setText(t: string) {
    this.text = t;
    return this;
  }
  get width() {
    return this.text.length * this.fs * 0.55; // conservative: wider than the real glyph average
  }
  get height() {
    const lines = this.wrap ? Math.max(1, Math.ceil(this.width / this.wrap)) : 1;
    return lines * this.fs * 1.25;
  }
  abs(): { x: number; y: number; s: number } {
    const p = this.parent ? this.parent.abs() : { x: 0, y: 0, s: 1 };
    return { x: p.x + this.x * p.s, y: p.y + this.y * p.s, s: p.s * this.scaleX };
  }
  box(): Box {
    const a = this.abs();
    if (this.isText) {
      const w = (this.wrap ? Math.min(this.width, this.wrap) : this.width) * a.s, h = this.height * a.s;
      return { x: a.x - this.ox * w, y: a.y - this.oy * h, w, h };
    }
    const sz = this.size!;
    return { x: a.x - (sz.w * a.s) / 2, y: a.y - (sz.h * a.s) / 2, w: sz.w * a.s, h: sz.h * a.s };
  }
}
const graphics = () => {
  const o = new Obj('graphics');
  const p: Obj = new Proxy(o, { get: (t, k, r) => (k in t ? Reflect.get(t, k, r) : () => r) });
  return p;
};
function stubScene() {
  const all: Obj[] = [];
  const reg = <T extends Obj>(o: T) => (all.push(o), o);
  const toasts: string[] = [];
  const scene = {
    add: {
      text: (x: number, y: number, t: string, st: { fontSize?: string; wordWrap?: { width: number } }) => {
        const o = reg(new Obj('text', x, y));
        o.isText = true;
        o.text = t;
        o.fs = parseInt(st.fontSize ?? '16', 10);
        o.wrap = st.wordWrap?.width ?? 0;
        return o;
      },
      graphics: () => graphics(),
      container: (x: number, y: number) => reg(new Obj('container', x, y)),
    },
    meta: {} as Record<string, unknown>,
    time: { now: 0, delayedCall() {} },
    showToast: (t: string) => toasts.push(t),
  };
  return { scene, all, toasts };
}

/** Draw the whole panel (all sections open or as `collapsed`) into a stub scene; returns the objects and the layout. */
function render(collapsed: ReadonlySet<string>, screenH: number) {
  const { scene, all, toasts } = stubScene();
  const geo = L.layoutPanel(QA_SECTIONS.map((s) => ({ id: s.id, rows: s.rows.map((r) => r.spec) })), collapsed, screenH);
  const list = new Obj('container');
  const q = { scene, c: list, oy: 0, jump: 5, save() {}, reopen() {} } as never;
  geo.sections.forEach((sl, si) => {
    const def = QA_SECTIONS[si];
    qaSectionHeader(q, sl, def.title, !collapsed.has(def.id), () => {});
    sl.rows.forEach((rl, ri) => def.rows[ri].draw(q, rl));
  });
  return { geo, list, all, toasts, scene };
}

const SCREENS: [string, number][] = [['390x844', 1558], ['360x640', 1280]];
const EPS = 0.5;
const overlap = (a: Box, b: Box) => a.x + EPS < b.x + b.w && b.x + EPS < a.x + a.w && a.y + EPS < b.y + b.h && b.y + EPS < a.y + a.h;
const inside = (a: Box, o: Box) => a.x >= o.x - EPS && a.y >= o.y - EPS && a.x + a.w <= o.x + o.w + EPS && a.y + a.h <= o.y + o.h + EPS;

describe('QA panel layout: no overlap, nothing clipped, finger-sized controls', () => {
  for (const [name, H] of SCREENS) {
    const open = render(new Set(), H);
    it(`${name}: no two rows overlap and every row sits inside the panel`, () => {
      const g = open.geo;
      expect(g.panelH).toBeLessThanOrEqual(H);
      const rects = g.sections.flatMap((s) => [s.header, ...s.rows.map((r) => r.rect)]);
      rects.forEach((r, i) => {
        expect(r.x, `${i}`).toBeGreaterThanOrEqual(46);
        expect(r.x + r.w, `${i}`).toBeLessThanOrEqual(720 - 46);
        if (i) expect(r.y, `${i}`).toBeGreaterThanOrEqual(rects[i - 1].y + rects[i - 1].h);
      });
    });
    it(`${name}: the layout parts of a row never overlap and stay inside the row`, () => {
      for (const s of open.geo.sections) {
        for (const row of s.rows) {
          const solid = row.parts.filter((p) => p.role !== 'hit');
          solid.forEach((p, i) => {
            expect(rectsInside(p.rect, row.rect), `${row.id} ${p.role}`).toBe(true);
            solid.slice(i + 1).forEach((o) => expect(rectsOverlapEps(p.rect, o.rect), `${row.id} ${p.role}/${o.role}`).toBe(false));
          });
          row.parts.filter((p) => p.role === 'hit').forEach((h) => solid.filter((p) => p.i === h.i).forEach((p) => expect(rectsInside(p.rect, h.rect), `${row.id} cell ${h.i}`).toBe(true)));
        }
      }
    });
    it(`${name}: every control is a 44 pt tap target, every one-line row is 48 pt`, () => {
      const pt = (design: number) => design * (Number(name.split('x')[0]) / 720);
      for (const s of open.geo.sections) {
        expect(pt(s.header.h), `${s.id} header`).toBeGreaterThanOrEqual(44);
        for (const row of s.rows) {
          if (row.kind !== 'grid' && row.kind !== 'stepper' && !(row.kind === 'segment' && row.parts.some((p) => p.role === 'control' && p.i !== undefined))) expect(pt(row.rect.h), row.id).toBeGreaterThanOrEqual(44.9);
          for (const p of row.parts.filter((x) => x.role === 'control' || x.role === 'hit')) expect(pt(p.rect.h), `${row.id} ${p.role}`).toBeGreaterThanOrEqual(43.9);
        }
      }
      // one-line rows are all the same height
      const oneLine = open.geo.sections.flatMap((s) => s.rows).filter((r) => ['action', 'switch', 'chips'].includes(r.kind));
      expect(new Set(oneLine.map((r) => r.rect.h)).size).toBe(1);
    });
    it(`${name}: every row can be scrolled fully into the window`, () => {
      for (const s of open.geo.sections) {
        expect(L.qaReachable(open.geo, s.header), s.id).toBe(true);
        for (const r of s.rows) expect(L.qaReachable(open.geo, r.rect), r.id).toBe(true);
      }
      expect(open.geo.minScroll).toBeLessThan(0); // all sections open: the panel scrolls
    });
    it(`${name}: drawn texts do not overlap each other or the controls, and fit their row`, () => {
      const texts = open.all.filter((o) => o.isText);
      const ctls = open.all.filter((o) => o.interactive);
      expect(texts.length).toBeGreaterThan(60);
      const rowRects = open.geo.sections.flatMap((s) => s.rows.map((r) => ({ id: r.id, r: r.rect })));
      const free = texts.filter((t) => !(t.parent && t.parent.interactive) && !hasInteractiveAncestor(t));
      const inCtl = texts.filter((t) => !free.includes(t));
      // free texts (titles, descriptions, batch names): clear of each other and of every control
      free.forEach((t, i) => {
        const b = t.box();
        expect(b.x, t.text).toBeGreaterThanOrEqual(46);
        expect(b.x + b.w, t.text).toBeLessThanOrEqual(720 - 46 + EPS);
        free.slice(i + 1).forEach((o) => expect(overlap(b, o.box()), `${t.text} / ${o.text}`).toBe(false));
        ctls.forEach((c) => expect(overlap(b, c.box()), `${t.text} / control`).toBe(false));
        expect(rowRects.some((rr) => inside(b, { x: rr.r.x, y: rr.r.y, w: rr.r.w, h: rr.r.h })) || open.geo.sections.some((s) => inside(b, s.header)), `${t.text} fits a row`).toBe(true);
      });
      // texts inside a control (labels, ON / OFF words) fit inside that control
      inCtl.forEach((t) => {
        const owner = ownerCtl(t)!;
        expect(inside(t.box(), owner.box()), `${t.text} inside its control`).toBe(true);
      });
      // controls never overlap each other (a batch card holds its own small pill)
      const top = ctls.filter((c) => !hasInteractiveAncestor(c));
      top.forEach((c, i) => top.slice(i + 1).forEach((o) => expect(overlap(c.box(), o.box()), `control ${i}`).toBe(false)));
    });
  }
  it('long labels shrink inside their box instead of overflowing', () => {
    const { scene, all } = stubScene();
    const q = { scene, c: new Obj('container'), oy: 0, jump: 1, save() {}, reopen() {} } as never;
    const row = qaFlag({ id: 'long', title: 'A VERY LONG SETTING TITLE THAT WOULD NEVER FIT ON ONE LINE', desc: 'and an equally long one-line description that keeps going and going and going', get: () => true, set() {}, toast: () => '' });
    const l = L.layoutRow(row.spec, 100);
    row.draw(q, l);
    for (const t of all.filter((o) => o.isText && !hasInteractiveAncestor(o))) {
      const b = t.box();
      const p = l.parts.find((x) => x.role === (t.fs >= 28 ? 'title' : 'desc'))!.rect;
      expect(b.w, t.text).toBeLessThanOrEqual(p.w + EPS);
      expect(t.scaleX).toBeLessThan(1);
    }
  });
});

function ownerCtl(t: Obj): Obj | null {
  for (let p = t.parent; p; p = p.parent) if (p.interactive) return p;
  return null;
}
const hasInteractiveAncestor = (t: Obj) => !!ownerCtl(t);
type R4 = { x: number; y: number; w: number; h: number };
const rectsInside = (a: R4, o: R4) => L.rectInside(a, o);
const rectsOverlapEps = (a: R4, b: R4) => a.x + 0.01 < b.x + b.w && b.x + 0.01 < a.x + a.w && a.y + 0.01 < b.y + b.h && b.y + 0.01 < a.y + a.h;

describe('QA sections collapse', () => {
  it('a collapsed section keeps only its header; rows of open sections stay', () => {
    const all = new Set(QA_SECTIONS.map((s) => s.id));
    const g = L.layoutPanel(QA_SECTIONS.map((s) => ({ id: s.id, rows: s.rows.map((r) => r.spec) })), all, 1558);
    expect(g.sections.every((s) => s.rows.length === 0)).toBe(true);
    expect(g.minScroll).toBe(0); // seven bare headers fit a phone
    const some = L.layoutPanel(QA_SECTIONS.map((s) => ({ id: s.id, rows: s.rows.map((r) => r.spec) })), new Set(['units']), 1558);
    expect(some.sections.find((s) => s.id === 'units')!.rows).toHaveLength(0);
    expect(some.sections.find((s) => s.id === 'quick')!.rows).toHaveLength(6);
    expect(some.contentBottom).toBeLessThan(L.layoutPanel(QA_SECTIONS.map((s) => ({ id: s.id, rows: s.rows.map((r) => r.spec) })), new Set(), 1558).contentBottom);
  });
  it('drawing a collapsed panel makes no rows, only headers', () => {
    const all = new Set(QA_SECTIONS.map((s) => s.id));
    const r = render(all, 1558);
    const texts = r.all.filter((o) => o.isText).map((o) => o.text);
    expect(texts).toEqual(QA_SECTIONS.map((s) => s.title));
  });
  it('tapping a header toggles the section (remembered in memory) and redraws', () => {
    const { scene, all } = stubScene();
    let reopened = 0;
    const q = { scene, c: new Obj('container'), oy: 0, jump: 1, save() {}, reopen: () => reopened++ } as never;
    const geo = L.layoutPanel(QA_SECTIONS.map((s) => ({ id: s.id, rows: s.rows.map((r) => r.spec) })), qaCollapsed, 1558);
    const sec = QA_SECTIONS[1];
    const before = qaCollapsed.has(sec.id);
    qaSectionHeader(q, geo.sections[1], sec.title, !before, () => {
      if (qaCollapsed.has(sec.id)) qaCollapsed.delete(sec.id);
      else qaCollapsed.add(sec.id);
      (q as { reopen: () => void }).reopen();
    });
    all.find((o) => o.interactive)!.handlers.pointerup();
    expect(qaCollapsed.has(sec.id)).toBe(!before);
    expect(reopened).toBe(1);
    if (qaCollapsed.has(sec.id) !== before) (before ? qaCollapsed.add(sec.id) : qaCollapsed.delete(sec.id));
  });
});

// ---------- QA PANEL V2: presets, groups, search, "?" help, old switches last, 44 px targets ----------

const { buildV2Sections, v2InitialCollapsed, applyPreset, rowSnapshot, v2Rows } = await import('../src/game/ui/qaPanelV2');
const META = await import('../src/game/ui/qaMeta');
const PRE = await import('../src/game/ui/qaPresets');
const { QA_PANEL_V2 } = await import('../src/content/experiments');
const nodeFs = await import('node:fs');

const V2_SCREENS: [string, number][] = [['390x844', 1558], ['360x640', 1280]];
const v2q = (extra: object = {}) => ({ scene: { showToast() {}, add: stubScene().scene.add }, c: new Obj('container'), oy: 0, jump: 5, save() {}, reopen() {}, ...extra }) as never;
const memStorage = () => {
  const mem = new Map<string, string>();
  vi.stubGlobal('localStorage', { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k) });
  return mem;
};
const v2env = (last: string | null = null, search = '') => {
  const st = { helpOpen: new Set<string>(), search };
  const env = { rows: QA_ROWS, lastPreset: () => last, setLastPreset: (id: string | null) => void (last = id), askSearch: (_cur: string): string | null => null, build: () => 'Build: test' };
  return { st, env, sections: () => buildV2Sections(env, st) };
};

describe('QA panel V2: the switch is on by default and the old registry is untouched', () => {
  it('QA PANEL V2 ships ON and the old section list is still there (OFF restores it)', () => {
    expect(QA_PANEL_V2.on).toBe(true);
    expect(QA_SECTIONS.map((s) => s.id)).toEqual(['guide', 'quick', 'feel', 'units', 'crates', 'tests', 'yard', 'display']);
    expect(QA_ROWS.find((r) => r.spec.id === 'qaPanelV2')!.def).toBe('true');
  });
});

describe('QA panel V2: every switch has plain words, and is in the cleanup table', () => {
  it('every row has an entry, labels are at most 4 words, help is one sentence', () => {
    for (const r of QA_ROWS) expect(META.QA_META[r.spec.id], `${r.spec.id} needs a QA_META entry`).toBeTruthy();
    for (const id of Object.keys(META.QA_META)) expect(QA_ROWS.some((r) => r.spec.id === id), `${id} is not a row`).toBe(true);
    for (const [id, m] of Object.entries(META.QA_META)) {
      expect(m.label.split(/\s+/).length, id).toBeLessThanOrEqual(4);
      expect(m.help, id).not.toContain('\n');
      expect(m.help.length, id).toBeGreaterThan(10);
      expect(m.help.length, id).toBeLessThanOrEqual(110);
      expect(m.retire.length, id).toBeGreaterThan(5);
    }
  });
  it('docs/design/QA_CLEANUP.md lists every switch with its default, state, action and what retiring changes', () => {
    const md = nodeFs.readFileSync('docs/design/QA_CLEANUP.md', 'utf8');
    for (const [id, m] of Object.entries(META.QA_META)) {
      const line = md.split('\n').find((l) => l.startsWith(`| \`${id}\` |`));
      expect(line, `${id} missing from QA_CLEANUP.md`).toBeTruthy();
      expect(line, id).toContain(m.state);
      expect(line, id).toContain(m.action);
    }
  });
  it('obsolete switches are marked old', () => {
    for (const [id, m] of Object.entries(META.QA_META)) if (m.state === 'obsolete') expect(m.old, id).toBe(true);
    expect(META.qaLabel(META.QA_META.roadPerf2)).toContain('(old)');
    expect(META.qaLabel(META.QA_META.roadPolish)).not.toContain('(old)');
  });
});

describe('QA panel V2: presets', () => {
  it('there are 5 presets and every flag they set is a real switch that can be applied', () => {
    expect(PRE.QA_PRESETS.map((p) => p.title)).toEqual(['PLAYER VIEW', 'NEW FEATURES', 'ROAD TEST', 'LEVEL LENGTH TEST', 'RESET ALL']);
    for (const p of PRE.QA_PRESETS) {
      for (const [id] of p.flags) expect(QA_ROWS.find((r) => r.spec.id === id)?.apply, `${p.id}: ${id}`).toBeTypeOf('function');
      // one plain description, short enough for 4 lines on a phone
      const lines = Math.ceil(p.what.length / 48) + Math.ceil((p.look.length + 9) / 48);
      expect(lines, p.id).toBeLessThanOrEqual(4);
    }
    const flagIds = (id: string) => PRE.QA_PRESETS.find((p) => p.id === id)!.flags.map(([k]) => k);
    expect(flagIds('length')).toEqual(['levelPace2', 'levelTimeline']);
    expect(flagIds('road')).toContain('roadPerfHud');
    for (const id of ['levelPace2', 'levelTimeline', 'roadMapMock1', 'mascotMotion', 'mapBadges', 'roadSurfaceKit', 'uiJuice']) expect(flagIds('features'), id).toContain(id);
  });
  it('tapping a preset sets exactly its switches; the active one is highlighted; a stray switch shows CUSTOM', () => {
    memStorage();
    try {
      const q = v2q();
      const snap = (pick: 'read' | 'def') => rowSnapshot(QA_ROWS, q, pick);
      const want = (id: string) => PRE.QA_PRESETS.find((p) => p.id === id)!;
      applyPreset(want('player'), QA_ROWS, q);
      expect(PRE.activePreset(snap('read'), snap('def'))?.id).toBe('player');
      applyPreset(want('length'), QA_ROWS, q);
      expect(snap('read').levelPace2).toBe('true');
      expect(snap('read').levelTimeline).toBe('true');
      expect(snap('read').roadMapMock1).toBe('false');
      expect(PRE.activePreset(snap('read'), snap('def'))?.id).toBe('length');
      // one switch changed by hand: no preset matches any more
      QA_ROWS.find((r) => r.spec.id === 'uiJuice')!.apply!(true, q);
      expect(PRE.activePreset(snap('read'), snap('def'))).toBeNull();
      expect(PRE.statusLines(snap('read'), snap('def'), 'length', (id) => META.QA_META[id].label)).toEqual(['NOW: CUSTOM (3 differ from PLAYER VIEW)', 'Since LEVEL LENGTH TEST: UI juice']);
      // NEW FEATURES then RESET ALL
      applyPreset(want('features'), QA_ROWS, q);
      expect(PRE.activePreset(snap('read'), snap('def'))?.id).toBe('features');
      expect(snap('read').uiJuice).toBe('true');
      applyPreset(want('reset'), QA_ROWS, q);
      expect(PRE.activePreset(snap('read'), snap('def'))?.id).toBe('player');
    } finally {
      vi.unstubAllGlobals();
    }
  });
  it('"what changed since last visit": names the switches that differ, or says it is the same', () => {
    const d = { a: 'false', b: 'false' };
    expect(PRE.statusLines(d, d, null, (x) => x)[1]).toBe('No preset set yet on this phone.');
    expect(PRE.statusLines(d, d, 'player', (x) => x)[1]).toBe('Same as the last preset you set: PLAYER VIEW.');
    expect(PRE.statusLines({ a: 'true', b: 'true' }, d, 'player', (x) => x.toUpperCase())[1]).toBe('Since PLAYER VIEW: A, B');
    expect(PRE.listNames(['one two three', 'four five six', 'seven eight nine'], 20)).toBe('one two three +2 more');
  });
  it('a preset card sets the switches, remembers the preset, toasts and redraws', () => {
    memStorage();
    try {
      const v = v2env();
      const { scene, all, toasts } = stubScene();
      let redraws = 0;
      const q = { scene, c: new Obj('container'), oy: 0, jump: 5, save() {}, reopen: () => redraws++ } as never;
      const sec = v.sections()[0];
      const row = sec.rows.find((r) => r.spec.id === 'preset_length')!;
      row.draw(q, L.layoutRow(row.spec, 0));
      all.find((o) => o.interactive)!.handlers.pointerup();
      expect(QA_ROWS.find((r) => r.spec.id === 'levelPace2')!.read!(q)).toBe('true');
      expect(toasts[0]).toContain('LEVEL LENGTH TEST');
      expect(redraws).toBe(1);
      applyPreset(PRE.QA_PRESETS[0], QA_ROWS, q);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe('QA panel V2: list, groups, search, help', () => {
  it('shows PRESETS, FIND A SWITCH, then the six groups folded; a jump-to-level control sits under the presets', () => {
    const v = v2env();
    const s = v.sections();
    expect(s.map((x) => x.id)).toEqual(['presets', 'find', 'g_road', 'g_levels', 'g_units', 'g_yard', 'g_ui', 'g_debug']);
    expect(s[0].rows.map((r) => r.spec.id)).toEqual(['presetStatus', 'preset_player', 'preset_features', 'preset_road', 'preset_length', 'preset_reset', 'jump']);
    expect([...v2InitialCollapsed()]).toEqual(['g_road', 'g_levels', 'g_units', 'g_yard', 'g_ui', 'g_debug']);
    expect(s.map((x) => x.title).slice(2)).toEqual(['ROAD (12)', 'LEVELS (13)', 'UNITS (9)', 'SCREW YARD (3)', 'UI (6)', expect.stringMatching(/^DEBUG/)]);
  });
  it('every registry row is reachable somewhere in V2 (nothing lost), once', () => {
    const ids = buildV2Sections(v2env().env, v2env().st).flatMap((s) => s.rows.map((r) => r.spec.id)).filter((id) => !id.startsWith('preset') && id !== 'search');
    expect([...ids].sort()).toEqual(QA_ROWS.map((r) => r.spec.id).sort());
  });
  it('old switches are labelled and sorted last inside their group', () => {
    const s = v2env().sections();
    for (const g of s.filter((x) => x.id.startsWith('g_'))) {
      const flags = g.rows.map((r) => !!META.QA_META[r.spec.id]?.old);
      const first = flags.indexOf(true);
      if (first >= 0) expect(flags.slice(first).every(Boolean), g.id).toBe(true);
    }
    const road = s.find((x) => x.id === 'g_road')!.rows.map((r) => r.spec.id);
    expect(road.indexOf('roadPolish')).toBeLessThan(road.indexOf('roadPerf'));
    expect(road.at(-1)).toBe('roadPerf4');
    expect(s.find((x) => x.id === 'g_road')!.rows.find((r) => r.spec.id === 'roadPerf')!.title).toBe('Road perf 1 (old)');
  });
  it('search keeps only matching switches and hides the groups; no match says so', () => {
    const hit = v2env(null, 'perf').sections();
    expect(hit.map((x) => x.id)).toEqual(['presets', 'find']);
    expect(hit[1].rows.map((r) => r.spec.id)).toEqual(['search', 'roadPerfHud', 'roadPerf', 'roadPerf2', 'roadPerf3', 'roadPerf4']);
    expect(META.matchesQuery('mascotMotion', META.QA_META.mascotMotion, 'BOLT')).toBe(true);
    expect(META.matchesQuery('mascotMotion', META.QA_META.mascotMotion, 'bolt road')).toBe(false);
    expect(v2env(null, 'zzzz').sections()[1].rows.map((r) => r.spec.id)).toEqual(['search', 'noHits']);
    // an old switch can be found by typing "old"
    expect(v2env(null, 'old').sections()[1].rows.some((r) => r.spec.id === 'roadPerf')).toBe(true);
  });
  it('the search button asks for a word, stores it and redraws; cancel keeps the old one', () => {
    const v = v2env();
    const asked: string[] = [];
    let answer: string | null = '  road  ';
    v.env.askSearch = (cur: string) => (asked.push(cur), answer);
    const { scene, all } = stubScene();
    let redraws = 0;
    const q = { scene, c: new Obj('container'), oy: 0, jump: 1, save() {}, reopen: () => redraws++ } as never;
    const row = v.sections()[1].rows[0];
    row.draw(q, L.layoutRow(row.spec, 0));
    all.find((o) => o.interactive)!.handlers.pointerup();
    expect(v.st.search).toBe('road');
    expect(redraws).toBe(1);
    answer = null;
    all.find((o) => o.interactive)!.handlers.pointerup();
    expect(v.st.search).toBe('road');
  });
  it('the "?" button opens one plain sentence under the row, and closes it again', () => {
    const v = v2env();
    const row = QA_ROWS.find((r) => r.spec.id === 'levelPace2')!;
    expect(v2Rows(row, META.QA_META.levelPace2, v.st)).toHaveLength(1);
    const { scene, all } = stubScene();
    let redraws = 0;
    const q = { scene, c: new Obj('container'), oy: 0, jump: 1, save() {}, reopen: () => redraws++ } as never;
    const [wrapped] = v2Rows(row, META.QA_META.levelPace2, v.st);
    wrapped.draw(q, L.layoutRow(wrapped.spec, 0));
    const texts = all.filter((o) => o.isText).map((o) => o.text);
    expect(texts).toContain('Longer levels'); // the short label, not the old 'LEVEL PACE 2'
    expect(texts).not.toContain('LEVEL PACE 2');
    const help = all.filter((o) => o.interactive).find((o) => o.box().x < 100)!;
    help.handlers.pointerup();
    expect(v.st.helpOpen.has('levelPace2')).toBe(true);
    expect(redraws).toBe(1);
    const open = v2Rows(row, META.QA_META.levelPace2, v.st);
    expect(open.map((r) => r.spec.id)).toEqual(['levelPace2', 'levelPace2_help']);
  });
  it('a switch in V2 still flips its own setting (same row, new label)', () => {
    memStorage();
    try {
      const v = v2env();
      const row = QA_ROWS.find((r) => r.spec.id === 'uiJuice')!;
      const { scene, all, toasts } = stubScene();
      const q = { scene, c: new Obj('container'), oy: 0, jump: 1, save() {}, reopen() {} } as never;
      const [wrapped] = v2Rows(row, META.QA_META.uiJuice, v.st);
      wrapped.draw(q, L.layoutRow(wrapped.spec, 0));
      all.filter((o) => o.interactive).find((o) => o.box().x > 400)!.handlers.pointerup();
      expect(row.read!(q)).toBe('true');
      expect(toasts.at(-1)).toContain('UI JUICE ON');
      row.reset!(q);
      expect(row.read!(q)).toBe('false');
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe('QA panel V2 layout: nothing overlaps, 44 pt targets, everything reachable', () => {
  for (const [name, H] of V2_SCREENS) {
    for (const [mode, collapsedSet, help, search] of [['groups open', new Set<string>(), false, ''], ['help open', new Set<string>(), true, ''], ['search', new Set<string>(), false, 'perf'], ['folded', v2InitialCollapsed(), false, '']] as const) {
      it(`${name} ${mode}`, () => {
        const v = v2env(null, search);
        if (help) for (const id of Object.keys(META.QA_META)) v.st.helpOpen.add(id);
        const sections = v.sections();
        const geo = L.layoutPanel(sections.map((s) => ({ id: s.id, rows: s.rows.map((r) => r.spec) })), collapsedSet, H);
        const w = Number(name.split('x')[0]) / 720;
        const pt = (d: number) => d * w;
        const rects = geo.sections.flatMap((s) => [s.header, ...s.rows.map((r) => r.rect)]);
        rects.forEach((r, i) => i && expect(r.y).toBeGreaterThanOrEqual(rects[i - 1].y + rects[i - 1].h));
        for (const s of geo.sections) {
          expect(pt(s.header.h)).toBeGreaterThanOrEqual(44);
          expect(L.qaReachable(geo, s.header), s.id).toBe(true);
          for (const row of s.rows) {
            expect(L.qaReachable(geo, row.rect), row.id).toBe(true);
            const solid = row.parts.filter((p) => p.role !== 'hit');
            solid.forEach((p, i) => {
              expect(L.rectInside(p.rect, row.rect), `${row.id} ${p.role}`).toBe(true);
              solid.slice(i + 1).forEach((o) => expect(rectsOverlapEps(p.rect, o.rect), `${row.id} ${p.role}/${o.role}`).toBe(false));
            });
            for (const p of row.parts.filter((x) => x.role === 'control' || x.role === 'help' || x.role === 'hit')) expect(pt(p.rect.h), `${row.id} ${p.role}`).toBeGreaterThanOrEqual(43.9);
            if (row.parts.some((p) => p.role === 'help')) expect(pt(row.parts.find((p) => p.role === 'help')!.rect.w), `${row.id} help`).toBeGreaterThanOrEqual(39);
          }
        }
        // draw everything for real into the stub: nothing throws, every text sits inside its row
        const { scene, all } = stubScene();
        const list = new Obj('container');
        const q = { scene, c: list, oy: 0, jump: 5, save() {}, reopen() {} } as never;
        geo.sections.forEach((sl, si) => {
          qaSectionHeader(q, sl, sections[si].title, !collapsedSet.has(sections[si].id), () => {});
          sl.rows.forEach((rl, ri) => sections[si].rows[ri].draw(q, rl));
        });
        const rowRects = geo.sections.flatMap((s) => s.rows.map((r) => r.rect));
        for (const t of all.filter((o) => o.isText && !hasInteractiveAncestor(o))) {
          const b = t.box();
          expect(rowRects.some((rr) => inside(b, rr)) || geo.sections.some((s) => inside(b, s.header)), `${t.text} fits a row`).toBe(true);
        }
      });
    }
  }
  it('a QA row without help keeps the exact old geometry (the old panel is unchanged)', () => {
    const spec = { id: 'x', kind: 'switch' as const, hasDesc: true };
    const plain = L.layoutRow(spec, 100);
    expect(plain.parts.some((p) => p.role === 'help')).toBe(false);
    const withHelp = L.layoutRow({ ...spec, help: true }, 100);
    expect(withHelp.parts.find((p) => p.role === 'title')!.rect.x).toBe(plain.parts.find((p) => p.role === 'title')!.rect.x + L.QA_HELP_W);
  });
});

describe('QA rows still do what they did (state-changing rows bound to the same settings)', () => {
  const press = (idx: number, all: Obj[]) => all.filter((o) => o.interactive && !hasInteractiveAncestor(o))[idx].handlers.pointerup();
  it('a switch flips its flag, toasts, and redraws; a segment picks its option', () => {
    const { scene, all, toasts } = stubScene();
    let on = false, picked = '', redraws = 0;
    const q = { scene, c: new Obj('container'), oy: 0, jump: 1, save() {}, reopen: () => redraws++ } as never;
    const flag = qaFlag({ id: 'f', title: 'F', get: () => on, set: (v) => (on = v), toast: (v) => (v ? 'F ON' : 'F OFF') });
    flag.draw(q, L.layoutRow(flag.spec, 0));
    press(0, all);
    expect(on).toBe(true);
    expect(toasts).toEqual(['F ON']);
    expect(redraws).toBe(1);
    const ch = qaChoice({ id: 'c', title: 'C', options: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }, { id: 'c', label: 'C' }], current: () => 'a', pick: (id) => (picked = id), toast: (id, label) => `${id}:${label}` });
    const n0 = all.length;
    ch.draw(q, L.layoutRow(ch.spec, 200));
    const segs = all.slice(n0).filter((o) => o.interactive);
    expect(segs).toHaveLength(3);
    segs[2].handlers.pointerup();
    expect(picked).toBe('c');
    expect(toasts.at(-1)).toBe('c:C');
  });
  it('an action runs its handler', () => {
    const { scene, all } = stubScene();
    let ran = 0;
    const q = { scene, c: new Obj('container'), oy: 0, jump: 1, save() {}, reopen() {} } as never;
    const a = qaAction({ id: 'a', title: 'A', label: 'GO', color: 1, tap: () => ran++ });
    a.draw(q, L.layoutRow(a.spec, 0));
    press(0, all);
    expect(ran).toBe(1);
  });
  it('the registry makes a new flag a one-line addition (it lays out with no other change)', () => {
    const extra = qaFlag({ id: 'newFlag', title: 'NEW FLAG', desc: 'One line', get: () => false, set() {}, toast: () => '' });
    const sections = QA_SECTIONS.map((s) => (s.id === 'tests' ? { id: s.id, rows: [...s.rows.map((r) => r.spec), extra.spec] } : { id: s.id, rows: s.rows.map((r) => r.spec) }));
    const g = L.layoutPanel(sections, new Set(), 1558);
    expect(g.sections.find((s) => s.id === 'tests')!.rows.at(-1)!.id).toBe('newFlag');
    expect(g.contentBottom).toBe(L.layoutPanel(QA_SECTIONS.map((s) => ({ id: s.id, rows: s.rows.map((r) => r.spec) })), new Set(), 1558).contentBottom + L.QA_ROW_H + L.QA_ROW_GAP);
  });
});
