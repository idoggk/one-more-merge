import { describe, expect, it } from 'vitest';
import { LEVELS } from '../src/content/levels';
import { canMerge, capOf, drop, idxOf, newGame, newLevel } from '../src/core/game';
import type { Family, Gadget } from '../src/core/types';

let id = 7000;
const g = (family: Family, rank: number): Gadget => ({ id: id++, family, rank, cd: 99 });

describe('ranks 7-8 (ChatGPT r16)', () => {
  it('Saga L1-20, events and the classic run stay capped at 6', () => {
    expect(capOf(newLevel(LEVELS[19]), 'cannon')).toBe(6);
    expect(capOf(newGame(1), 'cannon')).toBe(6);
    expect(canMerge(g('cannon', 6), g('cannon', 6), newGame(1))).toBe(false); // classic: no compaction
  });

  it('L21+: damaging core families reach 8, helpers stay at 6', () => {
    const s = newLevel(LEVELS[20]);
    expect(capOf(s, 'cannon')).toBe(8);
    expect(capOf(s, 'bell')).toBe(8);
    expect(capOf(s, 'magnet')).toBe(6);
  });

  it('L21 opens with a rank-6 shooter pair that merges into rank 7', () => {
    const s = newLevel(LEVELS[20]);
    const a = s.grid[idxOf(4, 1)]!, b = s.grid[idxOf(4, 2)]!;
    expect([a.rank, b.rank]).toEqual([6, 6]);
    s.mergeCd = 0;
    expect(drop(s, idxOf(4, 1), idxOf(4, 2), a.id).ok).toBe(true);
    expect(s.grid[idxOf(4, 2)]!.rank).toBe(7);
  });

  it('at the cap two pieces compact into ONE cap piece (frees a cell, rank stays 8)', () => {
    const s = newLevel(LEVELS[30]);
    s.grid.fill(null);
    s.grid[0] = g('coil', 8);
    s.grid[1] = g('coil', 8);
    expect(drop(s, 0, 1, s.grid[0]!.id).ok).toBe(true);
    expect(s.grid[0]).toBeNull();
    expect(s.grid[1]!.rank).toBe(8);
  });
});
