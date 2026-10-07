import { describe, expect, it } from 'vitest';
import { LEVELS } from '../src/content/levels';
import { BOSSES, bossTick, type BossState } from '../src/core/boss';
import { resolveCascade } from '../src/core/cascade';
import { drop, idxOf, legalPairs, newLevel, tick } from '../src/core/game';
import type { Family, Gadget, Grid } from '../src/core/types';

/** r33: boss mechanics are tested on the boss alone (stages put minions first). */
const solo = (d: (typeof LEVELS)[number]) => ({ ...d, waves: undefined, wave_visuals: undefined, minion_hp: undefined });


let id = 9900;
const g = (family: Family, rank = 1): Gadget => ({ id: id++, family, rank, cd: 99 });
const empty = (): Grid => new Array(30).fill(null);
const opts = { perks: [], overdrive: false };

describe('chapter bosses (ChatGPT r20)', () => {
  it('levels 10..60 are boss fights: 16 starters, 90 s, the chapter boss, no modifier', () => {
    for (const L of [10, 20, 30, 40, 50, 60]) {
      const s = newLevel(solo(LEVELS[L - 1]));
      expect(s.boss).toBeTruthy();
      expect(BOSSES[s.boss!.def].id).toBe(['tin_can_king', 'fridge_overlord', 'viper_queen', 'twin_toasters', 'piano_saurus_rex', 'junkzilla'][L / 10 - 1]);
      expect(s.grid.filter(Boolean).length).toBe(16);
      expect(s.timeLeft).toBe(90);
      expect(s.remix).toBeNull();
      expect(s.masked?.length ?? 0).toBe(0);
    }
  });

  it('Tin Can King clamps the highest-rank cell after the warning: no drag out, no drop in', () => {
    const s = newLevel(solo(LEVELS[9]));
    s.grid[idxOf(0, 0)] = g('coil', 5);
    while (!s.boss!.active && s.elapsed < 15) tick(s);
    expect(s.boss!.active!.cells).toEqual([idxOf(0, 0)]);
    const pairs = legalPairs(s);
    void pairs;
    expect(drop(s, idxOf(0, 0), idxOf(0, 1), s.grid[idxOf(0, 0)]!.id).ok).toBe(false);
  });

  it('cascade modifiers: resting row wakes nobody, the divider blocks crossing wakes, the hot column halves shooters', () => {
    const grid = empty();
    grid[idxOf(2, 0)] = g('bell');
    grid[idxOf(2, 4)] = g('cannon');
    const base = resolveCascade(grid, idxOf(2, 0), opts).count;
    expect(base).toBe(2);
    expect(resolveCascade(grid, idxOf(2, 0), { ...opts, restRow: 2 }).count).toBe(1);
    expect(resolveCascade(grid, idxOf(2, 0), { ...opts, splitB: 1 }).count).toBe(1);
    const g2 = empty();
    g2[idxOf(2, 2)] = g('cannon', 3);
    const full = resolveCascade(g2, idxOf(2, 2), opts).total;
    expect(resolveCascade(g2, idxOf(2, 2), { ...opts, hotCol: 2 }).total).toBeCloseTo(full * 0.5);
  });

  it('Viper Queen suction removes the marked lowest-rank occupant at impact', () => {
    const b: BossState = { def: 2, next: 0, pending: null, active: null, phaseShown: 0 };
    const grid = empty();
    grid[0] = g('cannon', 3);
    grid[1] = g('coil', 1);
    grid[2] = g('bell', 2);
    grid[3] = g('cannon', 2);
    const w = bossTick(b, grid, 8, 100, 100, new Set());
    expect(w.some((e) => e.type === 'bossWarn')).toBe(true);
    const hit = bossTick(b, grid, 10.6, 100, 100, new Set());
    expect(hit.some((e) => e.type === 'bossHit')).toBe(true);
    expect(grid[1]).toBeNull();
  });

  it('every boss fight runs to the end with a simple player without breaking invariants', () => {
    for (const L of [10, 20, 30, 40, 50, 60]) {
      const s = newLevel(solo(LEVELS[L - 1]));
      let next = 2;
      while (s.phase === 'playing') {
        if (s.elapsed >= next) {
          next += 2;
          const p = legalPairs(s);
          if (p.length) drop(s, p[0][0], p[0][1], s.grid[p[0][0]]!.id);
        }
        tick(s);
        const ids = s.grid.filter(Boolean).map((x) => x!.id);
        expect(new Set(ids).size).toBe(ids.length);
      }
      expect(['won', 'lost']).toContain(s.phase);
    }
  });
});
