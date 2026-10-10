import { afterEach, describe, expect, it } from 'vitest';
import raw from '../src/content/puzzles.json';
import { applyUnits, storedRoster3 } from '../src/content/experiments';
import { LEVELS } from '../src/content/levels';
import { FAMILY_INFO } from '../src/content/perks';
import { goodHereAll3, goodHereText3, ROSTER_3_INFO } from '../src/content/roster3';
import { unitJob } from '../src/content/unitJobs';
import { TUNING } from '../src/content/tuning';
import { applyRoster1, applyRoster2, applyRoster3, UNIT_PERKS, unitDef, UNITS } from '../src/content/units';
import { BOSSES, bossTick, type BossState } from '../src/core/boss';
import { resolveCascade, type CascadeOpts } from '../src/core/cascade';
import { rollCrate } from '../src/core/crates';
import { drop, newLevel, newPuzzle, previewMerge, torchOpt, type GameState, type PuzzleDef } from '../src/core/game';
import { allLines, unitFreeBreaks } from '../src/core/puzzle';
import { pipeFlow, teslaCharges, wardCells, type TorchHazard, type WardState } from '../src/core/roster3';
import { autoSupport, canUseSupport, supportNeed, supportReady, useSupport } from '../src/core/support';
import { ROSTER_3, type Family, type Gadget, type Grid } from '../src/core/types';

let id = 9100;
const g = (family: Family, rank = 1): Gadget => ({ id: id++, family, rank, cd: 99 });
const board = (cells: [number, Gadget][]) => {
  const grid: Grid = Array(30).fill(null);
  for (const [i, x] of cells) grid[i] = x;
  return grid;
};
const run = (grid: Grid, root: number, o: Partial<CascadeOpts> = {}) => resolveCascade(grid, root, { perks: [], overdrive: false, ...o });
const woke = (r: ReturnType<typeof run>) => r.activations.map((a) => a.idx).sort((a, b) => a - b);
const hit = (r: ReturnType<typeof run>, idx: number) => r.activations.find((a) => a.idx === idx)!.contribution;
const NEW = ROSTER_3 as string[];
const ratio = (r: ReturnType<typeof run>, idx: number, fam: Family, rank = 1) => hit(r, idx) / (TUNING.base[fam] * Math.pow(TUNING.rankMult, rank - 1));

afterEach(() => {
  applyUnits('off');
  applyRoster1(false);
  applyRoster2(false);
  applyRoster3(false);
});

describe('t-e728a5a6 roster 3: flag', () => {
  it('OFF by default: no new unit in the collection, crates or squad pickers; GOOD HERE silent', () => {
    expect(TUNING.roster3).toBe(false);
    expect(UNITS).toHaveLength(13);
    for (const f of ROSTER_3) expect(unitDef(f)).toBeUndefined();
    const owned = new Set<Family>(['cannon', 'coil', 'bell', 'fan']);
    for (let seed = 1; seed < 300; seed++) for (const c of rollCrate('gold', owned, seed)) expect(NEW).not.toContain(c.unit);
    const boss = LEVELS.find((d) => d.boss_node)!;
    expect(goodHereText3(boss, () => true)).toBe('');
    expect([storedRoster3(() => null), storedRoster3(() => 'on'), storedRoster3(() => { throw new Error('x'); })]).toEqual([false, true, false]);
  });

  it('ON: Blowtorch, Pipe and Blast Plate (Rare) join; Tesla Tower (Legendary) only while crates B is on; OFF restores the old list', () => {
    const before = UNITS.map((u) => u.id);
    applyRoster3(true);
    expect(UNITS).toHaveLength(16);
    expect(unitDef('tesla_tower')).toBeUndefined();
    expect(Object.fromEntries(['blowtorch', 'pipe', 'blast_plate'].map((f) => [f, [unitDef(f)!.rarity, unitDef(f)!.slot, unitDef(f)!.role]]))).toEqual({ blowtorch: ['rare', 'shooter', 'SHOOTER'], pipe: ['rare', 'relay', 'RELAY'], blast_plate: ['rare', 'helper', 'SUPPORT'] });
    applyUnits('rb'); // crates B on: Tesla shows up, sorted by rarity (last)
    expect(UNITS).toHaveLength(17); // 13 + 4
    expect(unitDef('tesla_tower')).toMatchObject({ rarity: 'legendary', slot: 'shooter', role: 'SHOOTER' });
    const order = ['common', 'rare', 'epic', 'legendary'];
    expect(UNITS.map((u) => order.indexOf(u.rarity))).toEqual([...UNITS.map((u) => order.indexOf(u.rarity))].sort());
    applyUnits('off');
    expect(unitDef('tesla_tower')).toBeUndefined();
    applyRoster3(false);
    expect(UNITS.map((u) => u.id)).toEqual(before);
  });

  it('copy: role, job word, WHEN MERGED line, L3 / L6 / L9 job upgrades for each', () => {
    const jobs = { blowtorch: 'HAZARDS', pipe: 'SAME FAMILY', blast_plate: 'DEFENCE', tesla_tower: 'STORM' };
    for (const f of ROSTER_3) {
      expect(ROSTER_3_INFO[f].job).toBe(jobs[f]);
      expect(FAMILY_INFO[f].text.startsWith(`${jobs[f]}:`)).toBe(true);
      expect(ROSTER_3_INFO[f].whenMerged).toMatch(/^WHEN MERGED: /);
      expect(unitJob(f)).toEqual({ job: jobs[f], merged: ROSTER_3_INFO[f].whenMerged });
      expect(UNIT_PERKS[f]).toHaveLength(3);
    }
    expect([FAMILY_INFO.blowtorch.role, FAMILY_INFO.pipe.role, FAMILY_INFO.blast_plate.role, FAMILY_INFO.tesla_tower.role]).toEqual(['SHOOTER', 'RELAY', 'SUPPORT', 'SHOOTER']);
  });

  it('GOOD HERE names an owned unit that suits the level (only with the flag), on one line with the other batches', () => {
    expect(goodHereText3(LEVELS.find((d) => d.boss_node)!, () => true)).toBe('');
    applyRoster3(true);
    const boss = LEVELS.find((d) => d.boss_node)!;
    expect(goodHereText3(boss, (u) => u === 'blast_plate')).toMatch(/^GOOD HERE: BLAST PLATE \(/);
    expect(goodHereText3(boss, () => false)).toBe('');
    const frost = LEVELS.find((d) => d.behaviour === 'frost')!;
    expect(goodHereText3(frost, (u) => u === 'blowtorch')).toContain('BLOWTORCH');
    const chain = LEVELS.find((d) => d.goal?.kind === 'chain')!;
    expect(goodHereText3(chain, (u) => u === 'tesla_tower')).toContain('TESLA TOWER');
    expect(goodHereText3(LEVELS.find((d) => !d.behaviour && !d.goal && !d.boss_node && !d.mini_boss && d.modifier === 'NONE' && d.level % 2 === 0)!, (u) => u === 'pipe')).toContain('PIPE');
    applyRoster1(true);
    applyRoster2(true);
    const shield = LEVELS.find((d) => d.behaviour === 'shield' && d.boss_node);
    if (shield) expect(goodHereAll3(shield, () => true).match(/GOOD HERE/g)).toHaveLength(1);
  });
});

describe('t-e728a5a6 roster 3: Blowtorch HAZARDS', () => {
  // a Cannon you merge at 0 sparks the Blowtorch at 1 (column 1: cells 1, 6, 11, 16, 21, 26)
  const cells = () => [[0, g('cannon', 2)], [1, g('blowtorch')]] as [number, Gadget][];
  const J = (c: number): TorchHazard => ({ kind: 'junk', cells: [c] });
  const torch = (hz: TorchHazard[], level = 1) => run(board(cells()), 0, { unitLevel: { blowtorch: level }, torch: hz });
  it('x1.5 per hazard burned; two count, max x2.25 however many are in the column', () => {
    expect(ratio(torch([]), 1, 'blowtorch')).toBeCloseTo(1);
    expect(ratio(torch([J(26)]), 1, 'blowtorch')).toBeCloseTo(1.5);
    expect(ratio(torch([J(26), J(21)]), 1, 'blowtorch')).toBeCloseTo(2.25);
    expect(ratio(torch([J(26), J(21), J(16), J(11)]), 1, 'blowtorch')).toBeCloseTo(2.25);
    expect(torch([J(26), J(21), J(16)]).burned).toHaveLength(3); // all three still burn (they are gone), only two count for damage
    expect(TUNING.r3.torchPer ** TUNING.r3.torchMax).toBeCloseTo(2.25);
  });
  it('only its own column at L1-L5; a hazard in another column is not burned', () => {
    const r = torch([J(27), J(22)]);
    expect(ratio(r, 1, 'blowtorch')).toBeCloseTo(1);
    expect(r.burned).toBeUndefined();
  });
  it('a frost row is ONE hazard (x1.5, not x1.5 per cell); the burn cell is the one in its column', () => {
    const frost: TorchHazard = { kind: 'frost', cells: [15, 16, 17, 18, 19] };
    const r = torch([frost]);
    expect(ratio(r, 1, 'blowtorch')).toBeCloseTo(1.5);
    expect(r.burned).toEqual([16]);
  });
  it('burns junk, clamp and frost at L1; a bomb mark and an oil slick only from L3', () => {
    for (const kind of ['junk', 'clamp', 'frost'] as const) expect(ratio(torch([{ kind, cells: [21] }]), 1, 'blowtorch'), kind).toBeCloseTo(1.5);
    for (const kind of ['bomb', 'slick'] as const) {
      expect(ratio(torch([{ kind, cells: [21] }], 1), 1, 'blowtorch'), kind).toBeCloseTo(1);
      expect(ratio(torch([{ kind, cells: [21] }], 3), 1, 'blowtorch'), kind).toBeCloseTo(1.5);
    }
  });
  it('L6: also burns the column to its right (not the left)', () => {
    expect(ratio(torch([J(22)], 3), 1, 'blowtorch')).toBeCloseTo(1);
    expect(ratio(torch([J(22)], 6), 1, 'blowtorch')).toBeCloseTo(1.5);
    expect(ratio(torch([J(20)], 6), 1, 'blowtorch')).toBeCloseTo(1);
    expect(ratio(torch([J(21), J(22)], 6), 1, 'blowtorch')).toBeCloseTo(2.25);
  });
  it('L9: with no hazard to burn its shot still hits x1.2; burning replaces it (never x1.2 x1.5)', () => {
    expect(ratio(torch([], 6), 1, 'blowtorch')).toBeCloseTo(1);
    expect(ratio(torch([], 9), 1, 'blowtorch')).toBeCloseTo(1.2);
    expect(ratio(torch([J(21)], 9), 1, 'blowtorch')).toBeCloseTo(1.5);
  });
  it('each hazard burns once per cascade: two Blowtorches in one column share it', () => {
    const two = board([[11, g('cannon', 2)], [6, g('blowtorch')], [16, g('blowtorch')]]);
    const r = run(two, 11, { torch: [J(26)] });
    expect([ratio(r, 6, 'blowtorch'), ratio(r, 16, 'blowtorch')].sort()).toEqual([1, 1.5]);
    expect(r.burned).toEqual([26]);
    expect(new Set(r.activations.map((a) => a.idx)).size).toBe(r.activations.length); // fires once each
  });
  it('without a Blowtorch on the board the hazard feed is never built, and a board is untouched', () => {
    const s = newLevel(LEVELS[24], { toys: [] });
    expect(torchOpt(s)).toEqual({});
  });
  it('in a real boss fight: the shot burns the junk block in its column, ends it, and a preview changes nothing', () => {
    applyRoster3(true);
    const s = newLevel(LEVELS[19], { toys: [] });
    s.grid.fill(null);
    s.pending = [];
    s.hp = s.maxHp = 1e6;
    s.unitLevel = {};
    s.boss = { def: BOSSES.findIndex((b) => b.id === 'tin_can_king'), next: 99, pending: null, active: null, phaseShown: 0, blocks: [{ cell: 22, until: 1e9 }] };
    s.grid[0] = g('cannon');
    s.grid[1] = g('cannon');
    s.grid[2] = g('blowtorch');
    expect(torchOpt(s).torch).toEqual([{ kind: 'junk', cells: [22] }]);
    const prev = previewMerge(s, 0, 1)!;
    expect(prev.activations.some((a) => a.family === 'blowtorch')).toBe(true);
    expect(s.boss.blocks).toHaveLength(1);
    const res = drop(s, 0, 1, s.grid[0]!.id);
    expect(res.ok).toBe(true);
    expect(s.boss!.blocks).toHaveLength(0);
    const c = res.events.find((e) => e.type === 'cascade') as { result: { burned?: number[]; total: number } };
    expect(c.result.burned).toEqual([22]);
    expect(res.events.some((e) => e.type === 'bossDefuse' && e.attack === 'blocks')).toBe(true);
  });
  it('is a shooter: never wakes anything itself', () => {
    const r = run(board([[0, g('cannon', 2)], [1, g('blowtorch')], [2, g('cannon')]]), 0);
    expect(woke(r)).toEqual([0, 1]);
  });
});

describe('t-e728a5a6 roster 3: Pipe SAME FAMILY', () => {
  // coil root at 10 wakes the Pipe at 11 (2,1); cannons fill rows 0 and 1 (cols 1-4): a joined group of 8 touching the Pipe at 6
  const group = () => [[10, g('coil', 2)], [11, g('pipe')], ...[1, 2, 3, 4, 6, 7, 8, 9].map((i): [number, Gadget] => [i, g('cannon')])] as [number, Gadget][];
  const flowed = (r: ReturnType<typeof run>) => r.activations.filter((a) => a.family === 'cannon').length;
  it('wakes the same-family parts joined to a part touching it: max 4 (6 from L3)', () => {
    expect(flowed(run(board(group()), 10))).toBe(4);
    expect(flowed(run(board(group()), 10, { unitLevel: { pipe: 3 } }))).toBe(6);
    expect(flowed(run(board(group()), 10, { unitLevel: { pipe: 6 } }))).toBe(6);
    expect(TUNING.r3.pipeCap).toBe(4);
    expect(TUNING.r3.pipeCapL3).toBe(6);
  });
  it('a small group wakes whole; a different family joined is not woken; a part not joined is not woken', () => {
    const r = run(board([[10, g('coil', 2)], [11, g('pipe')], [6, g('cannon')], [7, g('cannon')], [8, g('bell')], [9, g('cannon')]]), 10);
    expect(woke(r)).toEqual([6, 7, 10, 11]);
  });
  it('joins four ways at L1, diagonally too from L6', () => {
    // 6 touches the Pipe; 2 is diagonal to 6... 6 (1,1), 2 (0,2): only a diagonal join
    const cells = () => [[10, g('coil', 2)], [11, g('pipe')], [6, g('cannon')], [2, g('cannon')]] as [number, Gadget][];
    expect(woke(run(board(cells()), 10, { unitLevel: { pipe: 3 } }))).toEqual([6, 10, 11]);
    expect(woke(run(board(cells()), 10, { unitLevel: { pipe: 6 } }))).toEqual([2, 6, 10, 11]);
  });
  it('never wakes another Pipe, a locked part, or across the divider; a resting row wakes nobody', () => {
    const cells = () => [[10, g('coil', 2)], [11, g('pipe')], [6, g('cannon')], [7, g('cannon')]] as [number, Gadget][];
    expect(woke(run(board([...cells(), [16, g('pipe')]]), 10))).toEqual([6, 7, 10, 11]);
    expect(woke(run(board(cells()), 10, { locked: new Set([6]) }))).toEqual([10, 11]);
    expect(woke(run(board(cells()), 10, { restRow: 2 }))).toEqual([10, 11]);
    expect(woke(run(board(cells()), 10, { splitB: 1 }))).toEqual([6, 10, 11]); // 7 is across the divider
  });
  it('L9: the LAST part in the flow hits x1.3, only that one', () => {
    const grid = () => board(group());
    const order = pipeFlow(grid(), 11, 9, () => false, new Set()).slice(0, 6);
    const r = run(grid(), 10, { unitLevel: { pipe: 9 } });
    const base = TUNING.base.cannon;
    const last = order[order.length - 1];
    for (const i of order) expect(hit(r, i) / base, String(i)).toBeCloseTo(i === last ? 1.3 : 1);
    const r6 = run(grid(), 10, { unitLevel: { pipe: 6 } });
    expect(hit(r6, last) / base).toBeCloseTo(1);
  });
  it('counts toward the x3 chain cap: a full board never goes past it, and every part fires once', () => {
    const full = board(Array.from({ length: 30 }, (_, i): [number, Gadget] => [i, g(i === 12 ? 'pipe' : 'cannon')]));
    const r = run(full, 12, { unitLevel: { pipe: 9 } });
    expect(r.comboMult).toBeLessThanOrEqual(TUNING.comboCap + 1e-9);
    expect(new Set(r.activations.map((a) => a.idx)).size).toBe(r.activations.length);
    const p = run(board(group()), 10, { unitLevel: { pipe: 3 } });
    expect(p.comboMult).toBeCloseTo(Math.min(TUNING.comboCap, 1 + TUNING.comboSlope * (p.count - 1)));
  });
});

describe('t-e728a5a6 roster 3: Tesla Tower STORM', () => {
  // a Bell you merge at 12 (2,2) rings its row and sparks 7, 17, 11, 13; coils there wake the Tower at 8 (1,3)
  const ring = (relays: number[], tower = 8, root = 12) => board([[root, g('bell', 2)], ...relays.map((i): [number, Gadget] => [i, g('coil')]), [tower, g('tesla_tower')]]);
  const mult = (relays: number[], level = 1, tower = 8) => ratio(run(ring(relays, tower), 12, { unitLevel: { tesla_tower: level } }), tower, 'tesla_tower');
  it('+12% per relay that fired within 3 cells; the merged relay counts too', () => {
    expect(mult([13])).toBeCloseTo(1 + 0.12 * 2); // the Bell root + 1 coil
    expect(mult([13, 7, 11])).toBeCloseTo(1 + 0.12 * 4);
  });
  it('relays beyond 3 cells give nothing (L1), 4 cells at L3, 5 cells at L9', () => {
    // Tower at 14 (2,4); the Bell at 10 (2,0) is 4 away
    const far = (level: number) => ratio(run(board([[10, g('bell', 2)], [11, g('coil')], [12, g('coil')], [14, g('tesla_tower')]]), 10, { unitLevel: { tesla_tower: level } }), 14, 'tesla_tower');
    expect(far(1)).toBeCloseTo(1 + 0.12 * 2); // coils at 3 and 2 cells; the Bell root (4 cells) is out
    expect(far(3)).toBeCloseTo(1 + 0.12 * 3);
  });
  it('teslaCharges: range 3 / 4 / 5 and the touching double, never above 6', () => {
    expect(teslaCharges([0], 24, 1)).toBe(0); // (0,0) -> (4,4): 4 cells away
    expect(teslaCharges([0], 24, 3)).toBe(1);
    expect(teslaCharges([25], 4, 3)).toBe(0); // (5,0) -> (0,4): 5 cells away
    expect(teslaCharges([25], 4, 9)).toBe(1);
    expect(teslaCharges([1], 0, 6)).toBe(2); // touching, from L6
    expect(teslaCharges([1], 0, 3)).toBe(1);
  });
  it('charge cap: 6 charges = x1.72, however many relays fire', () => {
    const all = [7, 17, 11, 13, 10, 14];
    expect(mult(all)).toBeCloseTo(1.72);
    expect(mult([7, 17, 11, 13, 10, 14], 6)).toBeCloseTo(1.72);
    expect(teslaCharges(Array.from({ length: 29 }, (_, i) => i + 1), 0, 9)).toBe(6);
  });
  it('L6: a relay touching the Tower gives 2 charges (still max 6)', () => {
    // touching = 7 (above 8's left? 8 is (1,3); 13 is below it, 7 left of it)
    expect(mult([13], 3)).toBeCloseTo(1 + 0.12 * 2); // Bell root + coil, L3: no touch bonus
    expect(mult([13], 6)).toBeCloseTo(1 + 0.12 * 3); // coil at 13 touches: 2, plus the Bell: 1
    expect(mult([13, 7, 11], 6)).toBeCloseTo(1.72); // 2 + 2 + 1 + 1 = 6
    expect(mult([13, 7, 11, 17], 6)).toBeCloseTo(1.72);
  });
  it('a lone Tower with no relay hits plain; it is a shooter that fires once and wakes nothing', () => {
    const r = run(board([[0, g('cannon', 2)], [1, g('tesla_tower')], [2, g('cannon')]]), 0);
    expect(ratio(r, 1, 'tesla_tower')).toBeCloseTo(1);
    expect(woke(r)).toEqual([0, 1]);
  });
});

describe('t-e728a5a6 roster 3: every roster 3 unit together fires at most once per cascade', () => {
  it('a crowded board with all of them', () => {
    const fams: Family[] = ['blowtorch', 'pipe', 'tesla_tower', 'cannon', 'coil', 'bell', 'pipe', 'cannon'];
    const full = board(Array.from({ length: 30 }, (_, i): [number, Gadget] => [i, g(fams[i % fams.length])]));
    for (const level of [1, 3, 6, 9]) {
      const r = run(full, 13, { unitLevel: { pipe: level, blowtorch: level, tesla_tower: level }, torch: [{ kind: 'junk', cells: [21] }] });
      expect(new Set(r.activations.map((a) => a.idx)).size).toBe(r.activations.length);
      expect(r.comboMult).toBeLessThanOrEqual(TUNING.comboCap + 1e-9);
    }
  });
});

describe('t-e728a5a6 roster 3: Blast Plate DEFENCE (boss-level tests; a drill has no boss to block)', () => {
  const bossAt = (attack: string, extra: object, deadline = 5): BossState => ({ def: BOSSES.findIndex((b) => b.id === 'tin_can_king'), next: 99, pending: { attack: attack as never, deadline, phase: 0, ...extra }, active: null, phaseShown: 0 });
  const ward = (cells: number[], hits = 1, stun = 0): WardState => ({ list: [{ cells, hits }], stun, blocks: 0 });
  const grid = () => board([[12, g('cannon', 3)], [13, g('coil')]]);
  const hits = (ev: ReturnType<typeof bossTick>) => ev.filter((e) => e.type === 'bossHit');

  it('without a ward the attack lands; with a ward on a cell it would hit, it is blocked and nothing happens', () => {
    const open = bossAt('clamp', { cells: [12] });
    expect(hits(bossTick(open, grid(), 5, 1e6, 1e6, new Set())).map((e) => e.type === 'bossHit' && e.outcome)).toEqual(['hit']);
    expect(open.active).not.toBeNull(); // clamp is active
    const blocked = bossAt('clamp', { cells: [12] });
    const w = ward([12]);
    const ev = bossTick(blocked, grid(), 5, 1e6, 1e6, new Set(), false, w);
    expect(hits(ev)).toHaveLength(0);
    expect(ev.some((e) => e.type === 'bossDefuse')).toBe(true);
    expect(blocked.active).toBeNull();
    expect(blocked.pending).toBeNull();
    expect(w.list).toHaveLength(0); // the ward is spent
    expect(w.blocks).toBe(1);
  });
  it('a ward on a different cell blocks nothing and is kept for a later attack', () => {
    const w = ward([20]);
    const ev = bossTick(bossAt('clamp', { cells: [12] }), grid(), 5, 1e6, 1e6, new Set(), false, w);
    expect(hits(ev)).toHaveLength(1);
    expect(w.list).toHaveLength(1);
  });
  it('blocks row, column and cell attacks that would hit the warded cell: frost row, hot column, suction, bomb neighbours', () => {
    const cases: [string, object, number][] = [['frost', { row: 2 }, 12], ['hot', { col: 2 }, 12], ['suction', { cells: [12, 13] }, 13], ['bomb', { cells: [7] }, 12], ['conveyor', { row: 2 }, 14]];
    for (const [atk, extra, cell] of cases) {
      const b = bossAt(atk, extra);
      const w = ward([cell]);
      expect(hits(bossTick(b, grid(), 5, 1e6, 1e6, new Set(), false, w)), atk).toHaveLength(0);
      expect(w.blocks, atk).toBe(1);
    }
  });
  it('the unit tap: wards the cell, L3 a 1x2 (right neighbour, left on the right edge), L6 two hits, L9 stun', () => {
    expect(wardCells(12, 1)).toEqual([12]);
    expect(wardCells(12, 3)).toEqual([12, 13]);
    expect(wardCells(14, 3)).toEqual([14, 13]);
    applyRoster3(true);
    const mk = (level: number): GameState => {
      const s = newLevel(LEVELS[19], { toys: ['blast_plate'] });
      s.grid.fill(null);
      s.pending = [];
      s.unitLevel = { blast_plate: level };
      s.boss = { def: BOSSES.findIndex((b) => b.id === 'tin_can_king'), next: 99, pending: null, active: null, phaseShown: 0, t0: 0 };
      return s;
    };
    const s = mk(1);
    expect(s.support?.family).toBe('blast_plate');
    expect(supportNeed(s)).toBe(10);
    expect(supportReady(s)).toBe(false);
    expect(useSupport(s, 12).ok).toBe(false); // not charged
    s.support!.charge = 99;
    expect(canUseSupport(s, 12)).toBe(true);
    expect(useSupport(s, 12).ok).toBe(true);
    expect(s.wards!.list).toEqual([{ cells: [12], hits: 1 }]);
    expect(s.support!.charge).toBe(0);
    expect(s.wards!.stun).toBe(0);
    const s3 = mk(3);
    s3.support!.charge = 99;
    useSupport(s3, 13);
    expect(s3.wards!.list[0].cells).toEqual([13, 14]);
    const s6 = mk(6);
    s6.support!.charge = 99;
    useSupport(s6, 12);
    expect(s6.wards!.list[0]).toEqual({ cells: [12, 13], hits: 2 });
    const s9 = mk(9);
    s9.support!.charge = 99;
    useSupport(s9, 12);
    expect(s9.wards!.stun).toBe(2);
  });
  it('L6: the ward absorbs two attacks, the third lands', () => {
    const w = ward([12], 2);
    const out = [1, 2, 3].map(() => hits(bossTick(bossAt('clamp', { cells: [12] }), grid(), 5, 1e6, 1e6, new Set(), false, w)).length);
    expect(out).toEqual([0, 0, 1]);
  });
  it('L9: a block stuns the boss 2 s (its next attack comes 2 s later); below L9 it does not', () => {
    const b = bossAt('clamp', { cells: [12] });
    b.t0 = 0;
    bossTick(b, grid(), 5, 1e6, 1e6, new Set(), false, ward([12], 1, 2));
    expect(b.t0).toBe(2);
    const plain = bossAt('clamp', { cells: [12] });
    plain.t0 = 0;
    bossTick(plain, grid(), 5, 1e6, 1e6, new Set(), false, ward([12], 1, 0));
    expect(plain.t0).toBe(0);
  });
  it('a tap with no boss on the level does nothing and costs no charge; the bot aims at the marked cell', () => {
    applyRoster3(true);
    const s = newLevel(LEVELS[24], { toys: ['blast_plate'] });
    s.boss = null;
    s.support!.charge = 99;
    expect(useSupport(s, 12).ok).toBe(false);
    expect(s.support!.charge).toBe(99);
    s.boss = bossAt('clamp', { cells: [7] }, 99);
    s.boss.pending = { attack: 'clamp', cells: [7], deadline: 99, phase: 0 };
    expect(autoSupport(s)).toEqual({ cell: 7, axis: 'row' });
    s.boss.pending = null;
    expect(autoSupport(s)).toBeNull();
  });
  it('end to end: a ward placed through the card blocks the attack the boss casts next', () => {
    applyRoster3(true);
    const s = newLevel(LEVELS[19], { toys: ['blast_plate'] });
    s.grid.fill(null);
    s.pending = [];
    s.hp = s.maxHp = 1e6;
    s.boss = bossAt('clamp', { cells: [12] });
    s.grid[12] = g('cannon', 3);
    s.support!.charge = 99;
    expect(useSupport(s, 12).ok).toBe(true);
    const ev = bossTick(s.boss, s.grid, 5, s.hp, s.maxHp, new Set(), false, s.wards);
    expect(hits(ev)).toHaveLength(0);
    expect(s.boss.active).toBeNull();
  });
  it('only Blast Plate blocks boss attacks: no other roster 3 unit touches a pending attack', () => {
    const b = bossAt('clamp', { cells: [12] });
    const before = JSON.stringify(b.pending);
    run(board([[0, g('cannon', 2)], [1, g('blowtorch')], [2, g('pipe')], [3, g('tesla_tower')], [12, g('cannon')]]), 0, { unitLevel: { blowtorch: 9, pipe: 9, tesla_tower: 9 } });
    expect(JSON.stringify(b.pending)).toBe(before);
    const ev = bossTick(b, grid(), 5, 1e6, 1e6, new Set());
    expect(hits(ev)).toHaveLength(1);
  });
});

describe('t-e728a5a6 roster 3: drills', () => {
  const data = raw as unknown as { drills: Record<string, PuzzleDef[]> };
  it('3 drills each for Blowtorch, Pipe and Tesla Tower (Blast Plate has no drill: it needs a boss, see the boss-level tests); each needs its unit', () => {
    expect(data.drills.blast_plate).toBeUndefined();
    for (const f of ['blowtorch', 'pipe', 'tesla_tower']) {
      expect(data.drills[f], f).toHaveLength(3);
      for (const p of data.drills[f]) {
        expect(p.unit).toBe(f);
        expect(p.board.some(([fam]) => fam === f), p.id).toBe(true);
        const lines = allLines(p);
        expect(unitFreeBreaks(lines, p.hp).map((l) => l.path), p.id).toEqual([]);
        const s = newPuzzle(p);
        for (const [a, b] of p.solution) drop(s, a, b, s.grid[a]!.id);
        expect(s.puzzle!.unitUsed, p.id).toBe(true);
        expect(s.phase, p.id).toBe('won');
      }
    }
  }, 120000);
});
