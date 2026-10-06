import { describe, expect, it } from 'vitest';
import { LEVELS } from '../src/content/levels';
import { drop, idxOf, newLevel, tick } from '../src/core/game';

const cascadeCount = (ev: { type: string }[]) => (ev.find((e) => e.type === 'cascade') as { result: { count: number } } | undefined)?.result.count;

describe('teaching levels (ChatGPT r18)', () => {
  it('L1: cannon-only start board and cannon-only deliveries; no kickback, no overdrive', () => {
    const s = newLevel(LEVELS[0]);
    expect(s.grid.filter(Boolean).every((g) => g!.family === 'cannon')).toBe(true);
    expect(s.grid.filter(Boolean).length).toBe(8);
    for (let i = 0; i < 400; i++) tick(s); // 20 s of deliveries
    expect(s.grid.filter(Boolean).every((g) => g!.family === 'cannon')).toBe(true);
    expect(s.noKickback && s.noOverdrive).toBe(true);
  });

  it('L2: either coil merge direction fires exactly 3 (coil -> same-row bell -> cannon)', () => {
    for (const [from, to] of [
      [idxOf(4, 1), idxOf(3, 1)],
      [idxOf(3, 1), idxOf(4, 1)],
    ]) {
      const s = newLevel(LEVELS[1]);
      s.mergeCd = 0;
      const res = drop(s, from, to, s.grid[from]!.id);
      expect(res.ok).toBe(true);
      expect(cascadeCount(res.events)).toBe(3);
    }
  });

  it('L3: seven starters incl. one lone cannon rank 2, kickback on', () => {
    const s = newLevel(LEVELS[2]);
    expect(s.grid.filter(Boolean).length).toBe(7);
    expect(s.grid[idxOf(4, 2)]!.rank).toBe(2);
    expect(s.noKickback).toBe(false);
  });
});

describe('locked cells (r19 bug)', () => {
  it('no gadget ever ends up in a CORNERS-masked cell over a full level of play', async () => {
    const { legalPairs } = await import('../src/core/game');
    for (const L of [12, 14, 20]) {
      const s = newLevel(LEVELS[L - 1]);
      let next = 1;
      while (s.phase === 'playing' && s.elapsed < 60) {
        if (s.elapsed >= next) {
          next += 1;
          const p = legalPairs(s);
          if (p.length) drop(s, p[0][0], p[0][1], s.grid[p[0][0]]!.id);
        }
        tick(s);
        for (const c of s.masked ?? []) expect(s.grid[c]).toBeNull();
      }
    }
  });
});
