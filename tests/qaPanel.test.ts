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
  'spam', 'varied', 'budget', 'budgetPick', 'tools', 'yardPressure', // levels and tests
  'yardMode', // screw yard
  'shake', // display
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
    expect(ids('tests')).toEqual(['spam', 'varied', 'budget', 'budgetPick', 'tools', 'yardPressure']);
    expect(ids('yard')).toEqual(['yardMode']);
    expect(ids('display')).toEqual(['shake']);
  });
  it('on/off settings are switches, multi-choice settings are segmented controls', () => {
    const kind = (id: string) => QA_ROWS.find((r) => r.spec.id === id)!.spec.kind;
    for (const id of ['thinkBank', 'allNew', 'unlockPlan', 'varied', 'budget', 'tools', 'yardPressure']) expect(kind(id), id).toBe('switch');
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
