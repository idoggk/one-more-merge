import { afterEach, describe, expect, it } from 'vitest';
import { applyUnitsB0, storedUnitsB0 } from '../src/content/experiments';
import { LEVELS } from '../src/content/levels';
import { TUNING } from '../src/content/tuning';
import { mortarOrderMult, resolveCascade } from '../src/core/cascade';
import { matchmakerPick, newLevel, refillBag } from '../src/core/game';
import type { Activation, Gadget, Grid } from '../src/core/types';

let id = 9000;
const g = (family: Gadget['family'], rank = 1): Gadget => ({ id: id++, family, rank, cd: 99 });
const board = (cells: [number, Gadget][]) => {
  const grid: Grid = Array(30).fill(null);
  for (const [i, x] of cells) grid[i] = x;
  return grid;
};
const run = (grid: Grid, root: number) => resolveCascade(grid, root, { perks: [], overdrive: false });
const mortarOf = (grid: Grid, root: number) => run(grid, root).activations.find((a) => a.family === 'mortar')!;

afterEach(() => applyUnitsB0(false));

describe('t-a8c886ad units B0 (experiment flag)', () => {
  it('is off by default; the QA key reads on / anything else = off', () => {
    expect(TUNING.unitsB0).toBe(false);
    expect(storedUnitsB0(() => 'on')).toBe(true);
    expect(storedUnitsB0(() => null)).toBe(false);
    expect(storedUnitsB0(() => { throw new Error('no storage'); })).toBe(false);
  });

  it('the matchmaker copies a lonely helper only with the flag on', () => {
    const s = newLevel(LEVELS[24], { toys: ['magnet'] });
    s.grid.fill(null);
    s.grid[12] = g('magnet', 2);
    expect(matchmakerPick(s, 1)).toBeNull();
    applyUnitsB0(true);
    expect(matchmakerPick(s, 1)).toEqual({ family: 'magnet', rank: 2, n: 1 });
  });

  it('a helper puts 2 tokens in the bag with the flag on (1 off): shooter 6, relay A 4, relay B 2, helper 2', () => {
    const count = () => {
      const s = newLevel(LEVELS[24], { toys: ['battery'] });
      refillBag(s);
      const n: Record<string, number> = {};
      for (const f of s.bag) n[f] = (n[f] ?? 0) + 1;
      return n;
    };
    expect(count()).toEqual({ cannon: 6, coil: 4, bell: 2, battery: 1 });
    applyUnitsB0(true);
    expect(count()).toEqual({ cannon: 6, coil: 4, bell: 2, battery: 2 });
  });

  it('Mortar hits x(0.8 + 0.1 per machine fired before it in the chain)', () => {
    // horn root at 12: sparks the cannon at 7 (fires 2nd), its column wakes the mortar at 27 (fires 3rd, depth 1)
    const chain = () => board([[12, g('horn')], [7, g('cannon')], [27, g('mortar', 2)]]);
    const alone = () => board([[12, g('mortar', 2)]]);
    const offRatio = mortarOf(chain(), 12).contribution / mortarOf(alone(), 12).contribution;
    expect(offRatio).toBeCloseTo(0.9 / 0.9); // today: depth 1 and the root both count as x0.9
    applyUnitsB0(true);
    const root = mortarOf(alone(), 12).contribution;
    const third = mortarOf(chain(), 12).contribution;
    expect(third / root).toBeCloseTo(1.0 / 0.8);
  });

  it('the Mortar order multiplier caps at x2.0, x2.15 with L3 Bigger Shell (rank 4+)', () => {
    const a = (rank: number) => ({ id: 1, idx: 0, family: 'mortar', rank, depth: 1, parent: -1, charge: 1, contribution: 0 }) as Activation;
    expect(mortarOrderMult(a(2), 1, 1, 0)).toBeCloseTo(0.8);
    expect(mortarOrderMult(a(2), 1, 1, 5)).toBeCloseTo(1.3);
    expect(mortarOrderMult(a(2), 1, 1, 12)).toBeCloseTo(2.0);
    expect(mortarOrderMult(a(2), 1, 1, 25)).toBeCloseTo(2.0);
    expect(mortarOrderMult(a(4), 3, 1, 25)).toBeCloseTo(2.15);
    expect(mortarOrderMult(a(3), 3, 1, 25)).toBeCloseTo(2.0); // the perk needs rank 4+
  });

  it('Arc Welder arcs skip other Arc Welders (next valid target, or fizzle)', () => {
    // diagonal neighbours of 12: a rank-3 welder at 6 (strongest) and a rank-1 cannon at 8
    const mixed = () => board([[12, g('arc_welder')], [6, g('arc_welder', 3)], [8, g('cannon')]]);
    const arcs = (grid: Grid) => run(grid, 12).edges.filter((e) => e.kind === 'arc').map((e) => e.to);
    expect(arcs(mixed())).toEqual([6]); // today
    applyUnitsB0(true);
    expect(arcs(mixed())).toEqual([8]);
    expect(arcs(board([[12, g('arc_welder')], [6, g('arc_welder', 3)]]))).toEqual([]);
  });
});
