import { describe, expect, it } from 'vitest';
import { resolveCascade } from '../src/core/cascade';
import { drop, newLevel } from '../src/core/game';
import type { Gadget, Grid } from '../src/core/types';
import { LEVELS } from '../src/content/levels';

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
  it('helper L9 perks trigger at rank 6 (the helper max), not before L9', () => {
    const ids = (r: ReturnType<typeof woke>) => r.activations.map((a) => a.id);
    // Magnet Snap In: rank 6 magnet pulls the cannon at 2 into 7 and wakes it
    const mag = (lv: number) => { const c = g('cannon'); return { c, r: woke(board([[12, g('magnet', 6)], [2, c]]), 12, { magnet: lv }) }; };
    const m9 = mag(9), m8 = mag(8);
    expect(m9.r.moves[0]?.id).toBe(m9.c.id);
    expect(ids(m9.r)).toContain(m9.c.id);
    expect(ids(m8.r)).not.toContain(m8.c.id);
    // Fan Launch: a bell rings the rank 6 fan, which pushes the cannon at 9 up into 4 and wakes it
    const fan = (lv: number) => { const c = g('cannon'); return { c, r: woke(board([[10, g('bell')], [14, g('fan', 6)], [9, c]]), 10, { fan: lv }) }; };
    const f9 = fan(9), f8 = fan(8);
    expect(f9.r.moves[0]).toMatchObject({ id: f9.c.id, from: 9, to: 4 });
    expect(ids(f9.r)).toContain(f9.c.id);
    expect(ids(f8.r)).not.toContain(f8.c.id);
    // Amplifier Long Range: rank 6 marks a cannon 2 cells away
    const amp = (lv: number) => { const c = g('cannon'); return { c, r: woke(board([[12, g('amplifier', 6)], [2, c]]), 12, { amplifier: lv }) }; };
    const a9 = amp(9), a8 = amp(8);
    expect(a9.r.amps?.map((x) => x.id)).toContain(a9.c.id);
    expect(a8.r.amps?.map((x) => x.id) ?? []).not.toContain(a8.c.id);
    // Beacon GO!: rank 6 marks AND wakes the far cannon
    const bea = (lv: number) => { const c = g('cannon'); return { c, r: woke(board([[12, g('signal_beacon', 6)], [0, c]]), 12, { signal_beacon: lv }) }; };
    const b9 = bea(9), b8 = bea(8);
    expect(b9.r.amps?.map((x) => x.id)).toContain(b9.c.id);
    expect(ids(b9.r)).toContain(b9.c.id);
    expect(b8.r.amps?.map((x) => x.id)).toContain(b8.c.id);
    expect(ids(b8.r)).not.toContain(b8.c.id);
  });
  it('a mark placed and used in the same cascade is not written back to the board', () => {
    const play = (root: Gadget['family'], rank: number, lv: Record<string, number>, target: number) => {
      const s = newLevel(LEVELS[0]);
      s.phase = 'playing';
      s.unitLevel = lv;
      s.grid = Array(s.grid.length).fill(null);
      const a = g(root, rank), b = g(root, rank), c = g('cannon');
      s.grid[11] = a;
      s.grid[12] = b;
      s.grid[target] = c;
      expect(drop(s, 11, 12, a.id).ok).toBe(true);
      return s.grid.find((x) => x?.id === c.id)!;
    };
    // Beacon GO!: the rank 6 beacon marks AND wakes the far cannon, which spends the mark at once
    expect(play('signal_beacon', 5, { signal_beacon: 9 }, 0).amp).toBeUndefined();
    // Amplifier marks a touching cannon that the merge spark has already queued
    expect(play('amplifier', 1, {}, 7).amp).toBeUndefined();
  });
  it('Battery primes any shooter; L9 Universal Socket primes 2 touching shooters', () => {
    const run = (lv: number) => {
      const c = g('cannon'), r = g('rocket');
      return { c, r, res: woke(board([[12, g('battery')], [7, r], [17, c]]), 12, { battery: lv }) };
    };
    const l1 = run(1), l9 = run(9);
    expect(l1.res.primes).toEqual([l1.r.id]); // first in up/right/down/left order: the Rocket above
    expect(l9.res.primes).toEqual([l9.r.id, l9.c.id]);
    expect(l9.res.edges.filter((e) => e.kind === 'battery')).toHaveLength(2);
  });
  it('perks are off at level 1 (calibration baseline unchanged)', () => {
    const a = woke(board([[12, g('cannon', 5)]]), 12, {}), b = woke(board([[12, g('cannon', 5)]]), 12, { cannon: 1 });
    expect(a.total).toBe(b.total);
  });
});
