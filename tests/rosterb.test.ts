import { afterEach, describe, expect, it } from 'vitest';
import { applyUnits, storedUnits, unitsStoreValue } from '../src/content/experiments';
import { LEVELS } from '../src/content/levels';
import { FAMILY_INFO } from '../src/content/perks';
import { TUNING } from '../src/content/tuning';
import { ROSTER_PERKS, UNIT_PERKS } from '../src/content/units';
import { rbRouteCells, resolveCascade, routeCells } from '../src/core/cascade';
import { drop, idxOf, newLevel, previewMerge, refillBag, serialize, tick, type GameState } from '../src/core/game';
import { hitFormula } from '../src/core/hitFormula';
import { newRunLog, recordCommand, replayRun } from '../src/core/replay';
import { autoSupport, canUseSupport, goLine, supportCharge, supportNeed, supportReady, useSupport } from '../src/core/support';
import { SUPPORT_FAMILIES, type Family, type Gadget, type Grid, type PerkId } from '../src/core/types';

let id = 9800;
const g = (family: Family, rank = 1, extra: Partial<Gadget> = {}): Gadget => ({ id: id++, family, rank, cd: 99, ...extra });
const board = (cells: [number, Gadget][]) => {
  const grid: Grid = Array(30).fill(null);
  for (const [i, x] of cells) grid[i] = x;
  return grid;
};
const lv = (unitLevel: Partial<Record<Family, number>> = {}) => ({ perks: [] as PerkId[], overdrive: false, unitLevel });
const run = (grid: Grid, root: number, unitLevel: Partial<Record<Family, number>> = {}) => resolveCascade(grid, root, lv(unitLevel));
const act = (r: ReturnType<typeof run>, f: Family) => r.activations.find((a) => a.family === f)!;
const sorted = (a: number[]) => [...a].sort((x, y) => x - y);
/** A saga level with an empty board (no boss / remix) for hand-built positions. */
const level = (toys: Family[] = [], unitLevel: Partial<Record<Family, number>> = {}): GameState => {
  const s = newLevel(LEVELS[24], { toys });
  s.grid.fill(null);
  s.boss = null;
  s.remix = null;
  s.unitLevel = unitLevel;
  return s;
};
const on = () => applyUnits('rb');

afterEach(() => applyUnits('off'));

describe('t-e91097cd roster B flag', () => {
  it('is off by default; the QA UNITS row stores ROSTER B as rb', () => {
    expect(TUNING.rosterB).toBe(false);
    expect(storedUnits(() => 'rb')).toBe('rb');
    expect(unitsStoreValue('rb')).toBe('rb');
    on();
    expect([TUNING.rosterB, TUNING.unitsB0, TUNING.unitsB1]).toEqual([true, false, false]);
    applyUnits('b1');
    expect(TUNING.rosterB).toBe(false);
  });

  it('OFF: no jobs on activations, helpers stay on the board and in the bag, no Support card', () => {
    const r = run(board([[12, g('mortar', 2)], [13, g('rocket')], [7, g('horn')]]), 13);
    expect(r.activations.every((a) => a.jobs === undefined)).toBe(true);
    const s = newLevel(LEVELS[24], { toys: ['battery'] });
    expect(s.support).toBeUndefined();
    refillBag(s);
    expect(s.bag).toContain('battery');
    expect(UNIT_PERKS.cannon[0][0]).toBe('Heavy Barrel');
  });
});

describe('roster B unit jobs', () => {
  it('Cannon FIRE: auto-shots; L3 quicker (2.4 s), L6 hotter (x0.25), L9 two shots', () => {
    on();
    const shots = (L: number, secs: number) => {
      const s = level([], { cannon: L });
      s.grid[0] = { ...g('cannon', 2), cd: 0.01 };
      const out: number[] = [];
      for (let t = 0; t < secs / 0.05; t++) for (const e of tick(s)) if (e.type === 'shot' && e.idx === 0) out.push(e.damage); // (a rescue delivery may add more cannons)
      return out;
    };
    const base = shots(1, 6.1);
    expect(base).toHaveLength(3); // t = 0, 3, 6
    expect(base[0]).toBeCloseTo(22.5 * 0.15);
    expect(shots(3, 5)).toHaveLength(3); // t = 0, 2.4, 4.8
    expect(shots(6, 0.1)[0]).toBeCloseTo(22.5 * 0.25);
    expect(shots(9, 0.1)).toHaveLength(2);
  });

  it('Coil REACH: a tall 6-cell cross; L3 8 cells, L6 + diagonals, L9 3 every way', () => {
    on();
    const at = idxOf(2, 2);
    expect(sorted(routeCells(at, 'coil', 1, []))).toEqual(sorted([idxOf(0, 2), idxOf(1, 2), idxOf(3, 2), idxOf(4, 2), idxOf(2, 1), idxOf(2, 3)]));
    expect(rbRouteCells(at, 'coil', 3, 1)).toHaveLength(8);
    expect(rbRouteCells(at, 'coil', 6, 1)).toHaveLength(12);
    expect(rbRouteCells(at, 'coil', 9, 1)).toContain(idxOf(5, 2));
  });

  it('Bell ROW vs Horn COLUMN: different axes AND different upgrades', () => {
    on();
    const at = idxOf(2, 2);
    expect(sorted(routeCells(at, 'bell', 1, []))).toEqual([10, 11, 13, 14]);
    expect(sorted(routeCells(at, 'horn', 1, []))).toEqual([2, 7, 17, 22, 27]); // no side cells at level 1 any more
    expect(rbRouteCells(at, 'bell', 3, 1)).toEqual(expect.arrayContaining([idxOf(1, 2), idxOf(3, 2)]));
    expect(rbRouteCells(at, 'bell', 6, 3)).toHaveLength(4 + 10); // every 3rd ring: rows above + below
    expect(rbRouteCells(at, 'bell', 6, 2)).toHaveLength(6);
    expect(rbRouteCells(at, 'horn', 6, 1)).toEqual(expect.arrayContaining([idxOf(2, 1), idxOf(2, 3)]));
    expect(rbRouteCells(at, 'horn', 9, 1)).toHaveLength(5 + 12);
    // Horn L3 Brass Kick: the shooter it wakes hits x1.25; a Bell waking the same shooter does not kick
    const horn = (L: number) => act(run(board([[12, g('horn')], [2, g('cannon', 2)]]), 12, { horn: L }), 'cannon');
    expect(horn(1).jobs).toBeUndefined();
    expect(horn(3).jobs).toEqual({ kick: 1.25 });
    expect(horn(3).contribution / horn(1).contribution).toBeCloseTo(1.25);
    expect(act(run(board([[12, g('bell')], [10, g('cannon', 2)]]), 12, { bell: 9 }), 'cannon').jobs).toBeUndefined();
  });

  it('Rocket BURST: x2 when YOU merge it, x0.5 when a chain wakes it', () => {
    on();
    const merged = act(run(board([[12, g('rocket', 2)]]), 12), 'rocket');
    const woken = act(run(board([[12, g('coil')], [13, g('rocket', 2)]]), 12), 'rocket');
    expect(merged.jobs).toEqual({ burst: 2 });
    expect(merged.contribution).toBeCloseTo(13 * 2.25 * 2);
    expect(woken.contribution).toBeCloseTo(13 * 2.25 * 0.5);
    expect(act(run(board([[12, g('rocket', 2)]]), 12, { rocket: 3 }), 'rocket').jobs).toEqual({ burst: 2.5 });
    // L6 Cluster: the merged Rocket also wakes its diagonal neighbours
    expect(run(board([[12, g('rocket')], [6, g('coil')]]), 12, { rocket: 6 }).count).toBe(2);
    expect(run(board([[12, g('rocket')], [6, g('coil')]]), 12).count).toBe(1);
  });

  it('Mortar DEPTH: x(1 + 0.12 per machine already fired), max x2; L6 always fires last', () => {
    on();
    // bell root at 10 wakes its row: cannons 11, 12, 13 then the mortar at 14 (4 fired before it)
    const row = () => board([[10, g('bell')], [11, g('cannon')], [12, g('rocket')], [13, g('cannon')], [14, g('mortar')]]);
    expect(act(run(row(), 10), 'mortar').jobs?.mortar).toBeCloseTo(1.48);
    expect(act(run(board([[12, g('mortar')]]), 12), 'mortar').jobs?.mortar).toBe(1);
    const big = board([[0, g('bell')], ...[1, 2, 3, 4].map((c) => [c, g('cannon')] as [number, Gadget]), [5, g('coil')], [10, g('rocket')], [15, g('cannon')], [6, g('mortar')]]);
    // root bell(0) -> spark coil(5) + row ... the mortar caps at x2
    const many = board([[0, g('bell')], [1, g('cannon')], [2, g('rocket')], [3, g('arc_welder')], [4, g('mortar')], [5, g('horn')], [10, g('cannon')], [15, g('cannon')], [20, g('rocket')], [25, g('cannon')], [9, g('coil')], [14, g('cannon')]]);
    expect(act(run(many, 0), 'mortar').jobs!.mortar).toBeLessThanOrEqual(2);
    const r0 = run(big, 0, { mortar: 6 });
    // (activations list in discovery order; firing last = every other machine fired before it: x(1 + 0.12 (n-1)), capped)
    expect(act(r0, 'mortar').jobs!.mortar).toBeCloseTo(Math.min(2, 1 + 0.12 * (r0.count - 1)));
    expect(new Set(r0.activations.map((a) => a.id)).size).toBe(r0.activations.length);
    // L6 Last Word: the merged Mortar (normally first, x1) waits until its 4 neighbours have fired: x1.48
    const root = () => board([[12, g('mortar')], [7, g('cannon')], [13, g('cannon')], [17, g('coil')], [11, g('bell')]]);
    expect(act(run(root(), 12), 'mortar').jobs!.mortar).toBe(1);
    const last = run(root(), 12, { mortar: 6 });
    expect(act(last, 'mortar').jobs!.mortar).toBeCloseTo(1.48);
  });

  it('Fuse Box DIAGONAL: 2 cells along each diagonal; L3 full diagonals', () => {
    on();
    const at = idxOf(2, 2);
    expect(sorted(routeCells(at, 'fuse_box', 1, []))).toEqual(sorted([idxOf(0, 0), idxOf(1, 1), idxOf(3, 3), idxOf(4, 4), idxOf(0, 4), idxOf(1, 3), idxOf(3, 1), idxOf(4, 0)]));
    expect(rbRouteCells(idxOf(0, 0), 'fuse_box', 3, 1)).toEqual([idxOf(1, 1), idxOf(2, 2), idxOf(3, 3), idxOf(4, 4)]);
  });

  it('Arc Welder SPREAD: jumps to the nearest other shooter anywhere, never another welder', () => {
    on();
    const r = run(board([[0, g('arc_welder')], [1, g('arc_welder')], [5, g('coil')], [3, g('rocket')], [29, g('cannon', 5)]]), 0);
    const arcs = r.edges.filter((e) => e.kind === 'arc');
    expect(arcs.find((e) => e.from === 0)?.to).toBe(3); // the rocket 3 cells away, not the touching welder or coil
    expect(arcs.every((e) => r.activations.find((a) => a.idx === e.to)?.family !== 'arc_welder')).toBe(true);
    const two = run(board([[0, g('arc_welder')], [3, g('rocket')], [29, g('cannon')]]), 0, { arc_welder: 6 });
    expect(two.edges.filter((e) => e.kind === 'arc').map((e) => e.to)).toEqual([3, 29]);
    expect(act(two, 'rocket').jobs?.spread).toBe(1.3);
  });

  it('each machine fires at most once in a crowded roster B chain', () => {
    on();
    const fams: Family[] = ['cannon', 'coil', 'bell', 'horn', 'rocket', 'mortar', 'fuse_box', 'arc_welder'];
    const grid = board(Array.from({ length: 30 }, (_, i) => [i, g(fams[(i * 7) % fams.length], 1 + (i % 3))] as [number, Gadget]));
    for (const L of [1, 3, 6, 9]) {
      const r = run(grid, 12, Object.fromEntries(fams.map((f) => [f, L])));
      expect(new Set(r.activations.map((a) => a.id)).size).toBe(r.activations.length);
    }
  });

  it('job upgrade words follow the flag', () => {
    on();
    expect(UNIT_PERKS.cannon[0][0]).toBe('Quick Loader');
    expect(Object.keys(ROSTER_PERKS).sort()).toEqual(Object.keys(FAMILY_INFO).sort());
    expect(FAMILY_INFO.rocket.text).toMatch(/BURST/);
    expect(FAMILY_INFO.fan.text).toMatch(/SUPPORT CARD/);
  });
});

describe('roster B Support cards', () => {
  it('the squad helper leaves the board and the bag and becomes a card', () => {
    on();
    for (const f of SUPPORT_FAMILIES) {
      const s = newLevel(LEVELS[24], { toys: [f] });
      expect(s.support).toEqual({ family: f, charge: 0, uses: 0 });
      refillBag(s);
      expect(s.bag).not.toContain(f);
      expect(s.grid.some((x) => x && SUPPORT_FAMILIES.includes(x.family))).toBe(false);
    }
  });

  it('charges +1 per machine in YOUR merge chains and shows charge / need', () => {
    on();
    const s = level(['battery']);
    s.grid[12] = g('cannon');
    s.grid[13] = g('cannon');
    s.grid[7] = g('coil');
    s.grid[17] = g('bell');
    drop(s, 13, 12, s.grid[13]!.id);
    expect(s.support!.charge).toBe(3); // cannon + the coil and bell it sparked
    expect(supportNeed(s)).toBe(14);
    expect(supportCharge(s)).toBe(3);
    expect(supportReady(s)).toBe(false);
    expect(useSupport(s, -1).ok).toBe(false);
    s.support!.charge = 99;
    expect(supportCharge(s)).toBe(14);
  });

  it('Battery PRIME: the next shooter merge hits x2 (whole chain), then it is spent', () => {
    on();
    const s = level(['battery']);
    s.support!.charge = 99;
    for (const [i, f] of [[0, 'cannon'], [1, 'cannon'], [5, 'coil'], [20, 'coil'], [21, 'coil']] as [number, Family][]) s.grid[i] = g(f);
    expect(useSupport(s, -1).ok).toBe(true);
    expect(s.support!.prime).toEqual({ mult: 2, left: 1, any: false });
    expect(supportReady(s)).toBe(false);
    // a relay merge does not use it
    const plainCoil = previewMerge(s, 21, 20)!.total;
    drop(s, 21, 20, s.grid[21]!.id);
    expect(s.support!.prime).toBeDefined();
    const pre = previewMerge(s, 1, 0)!;
    expect(pre.activations.every((a) => a.contribution === 0 || a.jobs?.prime === 2)).toBe(true);
    const f = hitFormula(s, 1, 0)!;
    expect(f.terms.find((t) => t.key === 'prime')?.mult).toBeCloseTo(2);
    drop(s, 1, 0, s.grid[1]!.id);
    expect(s.support!.prime).toBeUndefined();
    expect(plainCoil).toBeGreaterThan(0);
  });

  it('Fan CLEAR: junk in the 3x3 around the tapped cell; a tap with nothing to clear is refused', () => {
    on();
    const s = level(['fan']);
    s.boss = { def: 0, next: 0, phaseShown: 0, pending: null, active: null, blocks: [{ cell: idxOf(1, 1), until: 99 }, { cell: idxOf(2, 2), until: 99 }, { cell: idxOf(5, 4), until: 99 }] };
    s.support!.charge = 99;
    expect(canUseSupport(s, idxOf(4, 0))).toBe(false);
    const r = useSupport(s, idxOf(1, 2));
    expect(r.ok).toBe(true);
    expect(s.boss.blocks!.map((b) => b.cell)).toEqual([idxOf(5, 4)]);
    expect(s.support!.charge).toBe(0);
  });

  it('Magnet PAIR: a twin lands next to the tapped part; L6 Snap In merges it at once', () => {
    on();
    const s = level(['magnet']);
    s.grid[12] = g('rocket', 3);
    s.support!.charge = 99;
    expect(useSupport(s, 12).ok).toBe(true);
    const twin = s.grid.findIndex((x, i) => i !== 12 && x?.family === 'rocket');
    expect(s.grid[twin]).toMatchObject({ family: 'rocket', rank: 3 });
    expect([7, 11, 13, 17]).toContain(twin);
    const snap = level(['magnet'], { magnet: 6 });
    snap.grid[12] = g('rocket', 3);
    snap.support!.charge = 99;
    const ev = useSupport(snap, 12).events;
    expect(snap.grid[12]).toMatchObject({ family: 'rocket', rank: 4 });
    expect(ev.some((e) => e.type === 'cascade')).toBe(true);
  });

  it('Amplifier MARK: the tapped shooter gets x1.6 (L3 x2); non-shooters are refused', () => {
    on();
    const s = level(['amplifier']);
    s.grid[3] = g('cannon', 2);
    s.grid[4] = g('coil');
    s.support!.charge = 99;
    expect(canUseSupport(s, 4)).toBe(false);
    useSupport(s, 3);
    expect(s.grid[3]!.amp).toBe(1.6);
  });

  it('Signal Beacon GO: every machine on the picked line fires now (no merge, no Rocket BURST)', () => {
    on();
    const s = level(['signal_beacon']);
    for (const c of [0, 1, 2, 3, 4]) s.grid[idxOf(5, c)] = g(c === 2 ? 'rocket' : 'cannon');
    s.grid[idxOf(0, 0)] = g('cannon');
    s.support!.charge = 99;
    const hp = s.hp;
    const ev = useSupport(s, idxOf(5, 3), 'row').events;
    const cas = ev.find((e) => e.type === 'cascade');
    expect(cas && cas.type === 'cascade' && cas.result.count).toBe(5);
    expect(cas && cas.type === 'cascade' && cas.result.activations.find((a) => a.family === 'rocket')!.jobs).toBeUndefined();
    expect(s.hp).toBeLessThan(hp);
    expect(goLine(idxOf(5, 3), 'col', 6)).toHaveLength(10); // L6 Crossroads: row + column
  });

  it('a support tap is a recorded command: replay rebuilds the same state', () => {
    on();
    const s = newLevel(LEVELS[30], { toys: ['signal_beacon'] });
    const log = newRunLog();
    s.support!.charge = 99;
    for (let t = 0; t < 40; t++) tick(s);
    const pick = autoSupport(s)!;
    expect(pick).not.toBeNull();
    expect(recordCommand(log, s, { k: 'support', cell: pick.cell, axis: pick.axis === 'col' ? 1 : 0 }).ok).toBe(true);
    for (let t = 0; t < 40; t++) tick(s);
    log.ticks += 40;
    expect(serialize(replayRun(log)!)).toBe(serialize(s));
  });

  it('the formula strip names Mortar DEPTH and each machine number', () => {
    on();
    const s = level();
    for (const [i, f] of [[10, 'bell'], [11, 'cannon'], [12, 'cannon'], [14, 'mortar'], [15, 'bell']] as [number, Family][]) s.grid[i] = g(f);
    const f = hitFormula(s, 15, 10)!;
    const mortar = f.terms.find((t) => t.key === 'mortar')!;
    expect(mortar.label).toBe('MORTAR');
    expect(mortar.mult).toBeGreaterThan(1);
    expect(f.linkFam).toContain('mortar');
    expect(f.linkHit![f.linkFam!.indexOf('mortar')]).toBeGreaterThan(f.links[f.linkFam!.indexOf('mortar')]);
    const before = serialize(s);
    const real = drop(s, 15, 10, s.grid[15]!.id).events.find((e) => e.type === 'cascade');
    expect(real && real.type === 'cascade' && Math.round(real.damage)).toBe(Math.round(f.damage));
    expect(before).not.toBe(serialize(s));
  });
});
