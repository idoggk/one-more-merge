import { afterEach, describe, expect, it } from 'vitest';
import { applyUnits, storedUnits, unitsStoreValue } from '../src/content/experiments';
import { LEVELS } from '../src/content/levels';
import { FAMILY_INFO, unitsCopy } from '../src/content/perks';
import { GUIDE } from '../src/content/sceneCopy';
import { TUNING, unitsB0On } from '../src/content/tuning';
import { mortarOrderMult, resolveCascade, routeCells } from '../src/core/cascade';
import { drop, idxOf, matchmakerPick, newLevel, refillBag, tick, type GameState } from '../src/core/game';
import { inspectMarks, mergePreview, PALETTE } from '../src/core/marks';
import type { Activation, Family, Gadget, Grid } from '../src/core/types';

let id = 9500;
const g = (family: Family, rank = 1, extra: Partial<Gadget> = {}): Gadget => ({ id: id++, family, rank, cd: 99, ...extra });
const board = (cells: [number, Gadget][]) => {
  const grid: Grid = Array(30).fill(null);
  for (const [i, x] of cells) grid[i] = x;
  return grid;
};
const run = (grid: Grid, root: number, hazards?: Set<number>) => resolveCascade(grid, root, { perks: [], overdrive: false, hazards });
/** A saga level with an empty board (no hazards, no boss) for hand-built positions. */
const level = (toys: Family[] = []): GameState => {
  const s = newLevel(LEVELS[24], { toys });
  s.grid.fill(null);
  s.boss = null;
  s.remix = null;
  return s;
};
const on = () => applyUnits('b1');

afterEach(() => applyUnits('off'));

describe('t-4a966cee units B1 (experiment flag)', () => {
  it('is off by default; the QA UNITS row stores OFF / B0 / B1 in the B0 key', () => {
    expect(TUNING.unitsB1).toBe(false);
    expect(TUNING.unitsB0).toBe(false);
    expect(storedUnits(() => null)).toBe('off');
    expect(storedUnits(() => 'on')).toBe('b0'); // old B0 saves keep working
    expect(storedUnits(() => 'b1')).toBe('b1');
    expect(storedUnits(() => { throw new Error('no storage'); })).toBe('off');
    expect([unitsStoreValue('off'), unitsStoreValue('b0'), unitsStoreValue('b1')]).toEqual([null, 'on', 'b1']);
    on();
    expect(TUNING.unitsB1 && !TUNING.unitsB0 && unitsB0On()).toBe(true); // B1 implies the B0 rules
  });

  it('Battery: BOOSTED x2 on the strongest touching shooter (no Battery charge any more)', () => {
    // battery root at 12; a rank-1 cannon above (7) and a rank-2 rocket to the right (13); a rank-3 cannon 2 cells away (2)
    const grid = () => board([[12, g('battery', 2)], [7, g('cannon')], [13, g('rocket', 2)], [2, g('cannon', 3)]]);
    const off = run(grid(), 12);
    expect(off.primes).toHaveLength(1);
    expect(off.amps ?? []).toHaveLength(0);
    on();
    const r = run(grid(), 12);
    expect(r.primes).toHaveLength(0);
    // passed on to its neighbours, the rocket fires in this chain and uses the boost at once
    const rocket = grid()[13]!;
    const b = run(board([[12, g('battery', 2)], [13, rocket]]), 12);
    expect(b.amps).toEqual([{ id: rocket.id, mult: 2, spent: true }]);
    expect(b.ampsUsed).toEqual([rocket.id]);
    const plain = run(board([[12, g('fan', 2)], [13, { ...rocket, id: id++ }]]), 12);
    const hit = (res: typeof b, f: Family) => res.activations.find((a) => a.family === f)!.contribution;
    expect(hit(b, 'rocket') / hit(plain, 'rocket')).toBeCloseTo(2);
    // the strongest touching shooter wins; a rank-3 cannon two cells away is out of reach
    expect(r.amps?.map((m) => m.mult)).toEqual([2]);
    expect(r.edges.find((e) => e.kind === 'amp')).toMatchObject({ from: 12, to: 13 });
  });

  it('Amplifier: x1.6 on a shooter up to 2 cells away; Beacon: x1.3 on the strongest shooter anywhere', () => {
    on();
    const near = g('cannon', 3);
    const amp = run(board([[12, g('amplifier')], [2, near], [29, g('cannon', 4)]]), 12);
    expect(amp.amps).toEqual([{ id: near.id, mult: 1.6 }]); // the rank-4 cannon at 29 is 3 cells away
    const far = board([[0, g('signal_beacon')], [29, g('cannon', 4)], [10, g('cannon', 1)]]);
    const bea = run(far, 0);
    expect(bea.amps?.map((m) => m.mult)).toEqual([1.3]);
    expect(bea.edges.find((e) => e.kind === 'amp')?.to).toBe(29);
  });

  it('boosts never stack: a stronger mark stays and the helper boosts the next shooter instead', () => {
    on();
    const big = g('cannon', 4, { amp: 2 });
    const next = g('cannon', 2);
    const r = run(board([[0, g('signal_beacon')], [29, big], [24, next]]), 0);
    expect(r.amps).toEqual([{ id: next.id, mult: 1.3 }]);
  });

  it('helpers pass the chain on to their U/R/D/L neighbours (B0 helpers were dead ends)', () => {
    // amplifier root at 12; a cannon at 13 only reachable through the amplifier
    const grid = () => board([[12, g('amplifier')], [7, g('coil')], [13, g('magnet')], [14, g('cannon')]]);
    const fams = (r: ReturnType<typeof run>) => r.activations.map((a) => a.family).sort();
    expect(fams(run(grid(), 12))).toEqual(['amplifier', 'coil', 'magnet']);
    on();
    expect(fams(run(grid(), 12))).toEqual(['amplifier', 'cannon', 'coil', 'magnet']);
  });

  it('Fan clears one touching junk block (cascade reports it; the game ends the hazard)', () => {
    on();
    const r = run(board([[12, g('fan')]]), 12, new Set([18, 3]));
    expect(r.clears).toEqual([18]); // one per Fan, first touching hazard in row-major order (3 is not touching)
    const s = level(['fan']);
    s.boss = { def: 0, next: 0, phaseShown: 0, pending: null, active: null, blocks: [{ cell: idxOf(4, 4), until: 99 }, { cell: idxOf(0, 0), until: 99 }] };
    s.grid[idxOf(3, 3)] = g('fan');
    s.grid[idxOf(5, 0)] = g('fan');
    const res = drop(s, idxOf(5, 0), idxOf(3, 3), s.grid[idxOf(5, 0)]!.id);
    expect(res.ok).toBe(true);
    expect(s.boss.blocks?.map((b) => b.cell)).toEqual([idxOf(0, 0)]);
    expect(res.events.some((e) => e.type === 'bossDefuse' && e.cells[0] === idxOf(4, 4))).toBe(true);
  });

  it('Fan clears a frozen row, a remix lock and an incoming attack aimed at a touching cell', () => {
    on();
    const merge = (s: GameState) => {
      s.grid[idxOf(3, 2)] = g('fan');
      s.grid[idxOf(5, 4)] = g('fan');
      return drop(s, idxOf(5, 4), idxOf(3, 2), s.grid[idxOf(5, 4)]!.id);
    };
    const frost = level();
    frost.boss = { def: 1, next: 0, phaseShown: 0, pending: null, active: { row: 2, until: frost.elapsed + 3 } };
    expect(merge(frost).events.some((e) => e.type === 'bossEnd')).toBe(true);
    expect(frost.boss.active).toBeNull();
    const lock = level();
    lock.remix = { kind: 'piano', next: 0, pending: null, lock: { cells: [idxOf(4, 0), idxOf(4, 1)], until: lock.elapsed + 4 } };
    merge(lock);
    expect(lock.remix.lock).toBeNull();
    const warn = level();
    warn.boss = { def: 0, next: 0, phaseShown: 0, pending: { cells: [idxOf(2, 3)], deadline: warn.elapsed + 2, phase: 0 }, active: null };
    merge(warn);
    expect(warn.boss.pending).toBeNull();
    // off: the same merge pushes as today and the frost stays
    applyUnits('off');
    const today = level();
    today.boss = { def: 1, next: 0, phaseShown: 0, pending: null, active: { row: 2, until: today.elapsed + 3 } };
    merge(today);
    expect(today.boss.active).not.toBeNull();
  });

  it('Magnet calls in a matching part that lands next to a lonely twin (a ready pair)', () => {
    on();
    const s = level(['magnet']);
    s.grid[idxOf(0, 0)] = g('cannon', 3); // the only lonely part with room around it
    s.grid[idxOf(5, 3)] = g('magnet');
    s.grid[idxOf(5, 4)] = g('magnet');
    const res = drop(s, idxOf(5, 4), idxOf(5, 3), s.grid[idxOf(5, 4)]!.id);
    const cas = res.events.find((e) => e.type === 'cascade');
    expect(cas && cas.type === 'cascade' && cas.result.fetch).toBe(1);
    expect(s.drops).toHaveLength(1);
    expect(s.drops[0].fuse).toBe(false);
    const { land, idx: twin } = s.drops[0].plan!;
    expect(Math.abs((land % 5) - (twin % 5)) + Math.abs(Math.floor(land / 5) - Math.floor(twin / 5))).toBe(1); // touching
    const want = { family: s.grid[twin]!.family, rank: s.grid[twin]!.rank };
    for (let t = 0; t < 20 && s.drops.length; t++) tick(s);
    expect(s.grid[land]).toMatchObject(want); // a ready pair
    // the merge preview counts the fetched part on top of the parts the merge earns
    const parts = () => {
      const p = level(['magnet']);
      p.grid[idxOf(0, 0)] = g('cannon', 3);
      p.grid[idxOf(5, 3)] = g('magnet');
      p.grid[idxOf(5, 4)] = g('magnet');
      return Number(mergePreview(p, idxOf(5, 4), idxOf(5, 3))!.chips.find((c) => c.meaning === 'parts')?.text ?? 0);
    };
    const withFetch = parts();
    applyUnits('off');
    expect(withFetch).toBe(parts() + 1);
  });

  it('Fuse Box reaches 2 cells along its diagonals; Horn also wakes its left and right', () => {
    const at = idxOf(2, 2);
    const fuseOff = routeCells(at, 'fuse_box', 1, []);
    const hornOff = routeCells(at, 'horn', 1, []);
    on();
    expect(fuseOff.sort((a, b) => a - b)).toEqual([idxOf(1, 1), idxOf(1, 3), idxOf(3, 1), idxOf(3, 3)]);
    expect(routeCells(at, 'fuse_box', 1, []).sort((a, b) => a - b)).toEqual([idxOf(0, 0), idxOf(0, 4), idxOf(1, 1), idxOf(1, 3), idxOf(3, 1), idxOf(3, 3), idxOf(4, 0), idxOf(4, 4)]);
    expect(routeCells(at, 'horn', 1, []).filter((c) => !hornOff.includes(c)).sort((a, b) => a - b)).toEqual([idxOf(2, 1), idxOf(2, 3)]);
  });

  it('Mortar hits x(0.85 + 0.12 per machine fired before it), cap x2.0', () => {
    const a = (rank: number) => ({ id: 1, idx: 0, family: 'mortar', rank, depth: 1, parent: -1, charge: 1, contribution: 0 }) as Activation;
    on();
    expect(mortarOrderMult(a(2), 1, 1, 0)).toBeCloseTo(0.85);
    expect(mortarOrderMult(a(2), 1, 1, 5)).toBeCloseTo(1.45);
    expect(mortarOrderMult(a(2), 1, 1, 20)).toBeCloseTo(2.0);
    applyUnits('b0');
    expect(mortarOrderMult(a(2), 1, 1, 5)).toBeCloseTo(1.3); // B0 keeps its own numbers
  });

  it('helper bag share 1 with matchmaker copies kept', () => {
    const count = () => {
      const s = newLevel(LEVELS[24], { toys: ['amplifier'] });
      refillBag(s);
      return s.bag.filter((f) => f === 'amplifier').length;
    };
    on();
    expect(count()).toBe(1);
    applyUnits('b0');
    expect(count()).toBe(2);
    on();
    const s = level(['amplifier']);
    s.grid[12] = g('amplifier', 2);
    expect(matchmakerPick(s, 1)).toEqual({ family: 'amplifier', rank: 2, n: 1 });
  });

  it('readability: one BOOSTED mark explains all three helpers; unit copy follows the flag, and OFF is today', () => {
    const todayBoost = PALETTE.boost.text;
    const todayBattery = FAMILY_INFO.battery.text;
    const guideFan = GUIDE.find((x) => x.key === 'fan')!.text;
    expect(unitsCopy('battery')).toBeNull();
    expect(todayBoost).toContain('x1.3');
    on();
    expect(PALETTE.boost.text).toMatch(/Battery x2.*Amplifier x1\.6.*Beacon x1\.3/);
    expect(FAMILY_INFO.battery.text).toContain('x2');
    expect(GUIDE.find((x) => x.key === 'fan')!.text).toMatch(/clears/);
    expect(FAMILY_INFO.mortar.text).toContain('x0.85');
    const s = level();
    s.grid[3] = g('cannon', 2, { amp: 2 });
    expect(inspectMarks(s, 3).marks[0]).toMatchObject({ key: 'amp', label: 'BOOSTED x2' });
    applyUnits('off');
    expect([PALETTE.boost.text, FAMILY_INFO.battery.text, GUIDE.find((x) => x.key === 'fan')!.text]).toEqual([todayBoost, todayBattery, guideFan]);
    expect(inspectMarks(s, 3).marks[0].label).toBe('BOOSTED');
  });
});
