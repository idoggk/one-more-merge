import { describe, expect, it } from 'vitest';
import { TUNING } from '../src/content/tuning';
import { resolveCascade } from '../src/core/cascade';
import { idxOf } from '../src/core/game';
import type { Family, Gadget, Grid } from '../src/core/types';

let id = 5000;
const g = (family: Family, rank = 1): Gadget => ({ id: id++, family, rank, cd: 3 });
const empty = (): Grid => new Array(30).fill(null);
const opts = { perks: [], overdrive: false };
const woke = (grid: Grid, root: number) => resolveCascade(grid, root, opts).activations.map((a) => a.idx);

describe('clarity ruleset (ChatGPT r14): one fixed shape per family, rank only changes damage', () => {
  it('is the live ruleset', () => expect(TUNING.clarity).toBe(true));

  it('Coil wakes other families in its 2-cell cross at EVERY rank, across gaps', () => {
    for (const rank of [1, 3, 6]) {
      const grid = empty();
      const root = idxOf(3, 2);
      grid[root] = g('bell', 1); // the merged root sparks its 4 neighbours: put the coil 1 away
      grid[idxOf(3, 3)] = g('coil', rank);
      grid[idxOf(1, 3)] = g('cannon'); // 2 up from the coil, gap at (2,3)
      grid[idxOf(3, 1)] = null;
      expect(woke(grid, root)).toContain(idxOf(1, 3));
    }
  });

  it('Bell rings only its row (no column) at every rank, never another Bell', () => {
    for (const rank of [1, 2, 3, 6]) {
      const grid = empty();
      const root = idxOf(2, 0);
      grid[root] = g('coil', 1);
      grid[idxOf(2, 1)] = g('bell', rank); // sparked by the root
      grid[idxOf(2, 4)] = g('cannon'); // same row: rung
      grid[idxOf(2, 3)] = g('bell'); // same row but a Bell: skipped
      grid[idxOf(0, 1)] = g('cannon'); // same column: NOT rung
      const w = woke(grid, root);
      expect(w).toContain(idxOf(2, 4));
      expect(w).not.toContain(idxOf(2, 3));
      expect(w).not.toContain(idxOf(0, 1));
    }
  });

  it('no hidden coil charge bonus and no MAX mechanics: damage depends on rank only', () => {
    const grid = empty();
    const root = idxOf(2, 2);
    grid[root] = g('coil', 6);
    grid[idxOf(2, 3)] = g('cannon', 6);
    grid[idxOf(2, 4)] = g('bell', 1);
    const r = resolveCascade(grid, root, opts);
    expect(r.activations.every((a) => a.charge === 1)).toBe(true);
    expect(r.edges.some((e) => ['backfire', 'bridge', 'chime'].includes(e.kind))).toBe(false);
  });
});
