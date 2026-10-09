import { describe, expect, it } from 'vitest';
import { rawDamage, resolveCascade } from '../src/core/cascade';
import { primeMult } from '../src/core/marks';
import { UNIT_JOB, unitJob } from '../src/content/unitJobs';
import { helperMult, levelPerkText, UNITS } from '../src/content/units';
import { TUNING } from '../src/content/tuning';
import type { Gadget, Grid } from '../src/core/types';

let id = 7000;
const g = (family: Gadget['family'], rank = 1): Gadget => ({ id: id++, family, rank, cd: 99 });
const board = (cells: [number, Gadget][]) => {
  const grid: Grid = Array(30).fill(null);
  for (const [i, x] of cells) grid[i] = x;
  return grid;
};
const run = (grid: Grid, root: number, unitLevel?: Record<string, number>) => resolveCascade(grid, root, { perks: [], overdrive: false, unitLevel });
// cell 12 = row 2, col 2: touching 7 / 11 / 13 / 17, corners 6 / 8 / 16 / 18
const TOUCH = [7, 11, 13, 17];

describe('unit cards: job word + WHEN MERGED (today, units B0/B1 off)', () => {
  it('every unit has one distinct job word and a WHEN MERGED line', () => {
    expect(TUNING.unitsB0 || TUNING.unitsB1).toBe(false);
    const jobs = UNITS.map((u) => unitJob(u.id)!.job);
    expect(new Set(jobs).size).toBe(UNITS.length);
    for (const u of UNITS) expect(unitJob(u.id)!.merged).toMatch(/^WHEN MERGED: /);
    expect(Object.keys(UNIT_JOB).sort()).toEqual(UNITS.map((u) => u.id).sort());
  });

  it('every merged unit wakes the 4 parts touching it; helpers say "No hit" and deal 0', () => {
    for (const u of UNITS) {
      const other = u.id === 'cannon' ? 'coil' : 'cannon';
      const r = run(board([[12, g(u.id)], ...TOUCH.map((i) => [i, g(other)] as [number, Gadget])]), 12);
      expect(r.activations.map((a) => a.idx)).toEqual(expect.arrayContaining(TOUCH));
      expect(unitJob(u.id)!.merged).toMatch(/wakes the 4/i);
      const own = r.activations.find((a) => a.idx === 12)!.contribution;
      if (u.slot === 'helper') expect([own, unitJob(u.id)!.merged!.includes('No hit')]).toEqual([0, true]);
      else expect(own).toBeGreaterThan(0);
    }
  });

  it('Rocket x1.3 and Mortar x0.9 and Arc Welder x0.75 of their own shot when merged', () => {
    const own = (f: Gadget['family']) => run(board([[12, g(f, 2)]]), 12).activations[0].contribution;
    expect(own('rocket') / own('cannon')).toBeCloseTo(1.3);
    expect(own('mortar') / rawDamage('mortar', 2)).toBeCloseTo(0.9);
    expect(own('arc_welder') / rawDamage('arc_welder', 2)).toBeCloseTo(0.75);
  });

  it('Arc Welder merged arcs to one corner part', () => {
    const r = run(board([[12, g('arc_welder')], [13, g('cannon')], [6, g('bell', 2)], [18, g('coil')]]), 12);
    expect(r.edges.filter((e) => e.kind === 'arc').map((e) => e.to)).toEqual([6]);
  });

  it('relays: Coil 2 cells out, Bell row, Horn column, Fuse Box corners (other kinds)', () => {
    const woke = (f: Gadget['family'], cell: number) => run(board([[12, g(f)], [cell, g('cannon')]]), 12).activations.some((a) => a.idx === cell);
    expect(woke('coil', 2)).toBe(true);
    expect(woke('coil', 0)).toBe(false);
    expect(woke('bell', 10)).toBe(true);
    expect(woke('bell', 2)).toBe(false);
    expect(woke('horn', 27)).toBe(true);
    expect(woke('horn', 10)).toBe(false);
    expect(woke('fuse_box', 18)).toBe(true);
    expect(woke('fuse_box', 2)).toBe(false);
  });

  it('Battery merged: a touching shooter hits at the printed multiplier in this chain', () => {
    for (const lv of [1, 3, 10]) {
      const c = g('cannon', 2);
      const r = run(board([[12, g('battery')], [13, c]]), 12, { battery: lv });
      expect(r.discharged).toContain(c.id);
      const hit = r.activations.find((a) => a.id === c.id)!.contribution;
      expect(hit / rawDamage('cannon', 2)).toBeCloseTo(helperMult.battery(lv));
      expect(unitJob('battery', lv)!.merged).toContain(`x${+helperMult.battery(lv).toFixed(2)}`);
    }
  });

  it('Battery level line includes the +0.20 at L3 (matches the real charge)', () => {
    const bat = UNITS.find((u) => u.id === 'battery')!;
    expect(levelPerkText(bat, 2)).toBe('Prime x1.53');
    expect(levelPerkText(bat, 3)).toBe('Prime x1.76');
    for (const lv of [1, 3, 6, 10]) expect(levelPerkText(bat, lv)).toBe(`Prime x${primeMult({ unitLevel: { battery: lv } }).toFixed(2)}`);
  });

  it('Amplifier merged marks the best touching machine and it uses the mark in this chain', () => {
    const big = g('cannon', 3);
    const r = run(board([[12, g('amplifier')], [13, g('cannon', 1)], [7, big]]), 12);
    expect(r.ampsUsed).toEqual([big.id]);
  });

  it('Signal Beacon merged marks the nearest shooter and relay', () => {
    const s = g('rocket'), rl = g('bell');
    const r = run(board([[12, g('signal_beacon')], [0, s], [29, rl]]), 12);
    expect(r.amps!.map((a) => a.id).sort()).toEqual([s.id, rl.id].sort());
  });

  it('Magnet merged pulls a part from 2-3 cells away in beside it (it does not fire)', () => {
    const far = g('cannon');
    const r = run(board([[12, g('magnet')], [14, far]]), 12);
    expect(r.moves).toEqual([{ from: 14, to: 13, id: far.id }]);
    expect(r.activations.some((a) => a.id === far.id)).toBe(false);
  });

  it('Fan merged pushes nothing; woken by a chain it pushes', () => {
    const merged = run(board([[12, g('fan')], [13, g('cannon')]]), 12);
    expect(merged.moves).toEqual([]);
    // a Bell two cells left wakes the Fan; the Fan then pushes its other neighbour away
    const woken = run(board([[10, g('bell')], [12, g('fan')], [7, g('cannon')]]), 10);
    expect(woken.moves.length).toBe(1);
  });
});
