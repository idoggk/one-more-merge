import { describe, expect, it } from 'vitest';
import { resolveCascade } from '../src/core/cascade';
import type { Gadget, Grid } from '../src/core/types';

let id = 20000;
const g = (family: Gadget['family'], rank = 1): Gadget => ({ id: id++, family, rank, cd: 99 });
const board = (cells: [number, Gadget][]) => {
  const grid: Grid = Array(30).fill(null);
  for (const [i, x] of cells) grid[i] = x;
  return grid;
};
const woke = (grid: Grid, root: number, lv: Record<string, number>, base: Record<string, number> = {}) =>
  resolveCascade(grid, root, { perks: [], overdrive: false, unitLevel: lv, fireBase: base });

describe('r32 milestone perks', () => {
  it('Coil L3 Long Coil: rank 5+ reaches 3 cells (L1 does not)', () => {
    const grid = () => board([[10, g('coil', 5)], [13, g('cannon')]]); // row 2: col 0 -> col 3
    expect(woke(grid(), 10, { coil: 1 }).activations.some((a) => a.idx === 13)).toBe(false);
    expect(woke(grid(), 10, { coil: 3 }).activations.some((a) => a.idx === 13)).toBe(true);
  });
  it('Bell L3 Side Chime wakes above + below; Horn L9 Grand Horn wakes its row', () => {
    const b = woke(board([[12, g('bell', 4)], [7, g('cannon')], [17, g('cannon')]]), 12, { bell: 3 });
    expect(b.activations.map((a) => a.idx)).toEqual(expect.arrayContaining([7, 17]));
    const h = woke(board([[12, g('horn', 7)], [10, g('cannon')], [14, g('cannon')]]), 12, { horn: 9 });
    expect(h.activations.map((a) => a.idx)).toEqual(expect.arrayContaining([10, 14]));
  });
  it('Cannon L6 Lucky Eight: the 8th chain-fired cannon hits x2; counters are reported', () => {
    const one = (base: number) => woke(board([[12, g('cannon', 2)]]), 12, { cannon: 6 }, { cannon: base });
    const normal = one(0), eighth = one(7);
    expect(eighth.total).toBeCloseTo(normal.total * 2);
    expect(normal.fires?.cannon).toBe(1);
  });
  it('perks are off at level 1 (calibration baseline unchanged)', () => {
    const a = woke(board([[12, g('cannon', 5)]]), 12, {}), b = woke(board([[12, g('cannon', 5)]]), 12, { cannon: 1 });
    expect(a.total).toBe(b.total);
  });
});
