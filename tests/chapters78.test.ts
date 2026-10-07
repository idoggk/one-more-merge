import { describe, expect, it } from 'vitest';
import { LEVELS } from '../src/content/levels';
import { BOSSES, bossTick, chapterBossIdx, type BossState } from '../src/core/boss';
import { drop, legalPairs, newLevel, tick, type GameState } from '../src/core/game';
import { Rng } from '../src/core/rng';
import type { Gadget } from '../src/core/types';

let id = 5000;
const g = (family: Gadget['family'], rank = 1): Gadget => ({ id: id++, family, rank, cd: 99 });
const blank = (bossId: string): GameState => {
  const s = newLevel(LEVELS[67]);
  s.grid.fill(null);
  s.pending = [];
  s.boss = { def: BOSSES.findIndex((b) => b.id === bossId), next: 99, pending: null, active: null, phaseShown: 0, mini: true } as BossState;
  return s;
};

describe('r29 chapter 7-8 attacks', () => {
  it('SLICK: a manual drop on the oil slides one cell along the arrow', () => {
    const s = blank('oil_otter');
    s.boss!.active = { attack: 'slick', cells: [12, 13], until: 99 };
    s.grid[0] = g('cannon');
    drop(s, 0, 12, s.grid[0]!.id);
    expect(s.grid[13]?.family).toBe('cannon');
    expect(s.grid[12]).toBeNull();
  });

  it('PORTALS: a manual drop on one portal exits at the other (either way)', () => {
    const s = blank('portal_possum');
    s.boss!.active = { attack: 'portals', cells: [0, 29], until: 99 };
    s.grid[5] = g('bell');
    drop(s, 5, 29, s.grid[5]!.id);
    expect(s.grid[0]?.family).toBe('bell');
  });

  it('TOW BAR: linked machines move together; blocked partner bounces; merging releases', () => {
    const s = blank('rivet_rhino');
    const a = g('cannon', 2), b = g('coil', 2);
    s.grid[10] = a;
    s.grid[11] = b;
    s.boss!.active = { attack: 'tow', cells: [10, 11], ids: [a.id, b.id], until: 99 };
    expect(drop(s, 10, 15, a.id).ok).toBe(true); // one row down: partner 11 -> 16
    expect(s.grid[15]).toBe(a);
    expect(s.grid[16]).toBe(b);
    s.grid[21] = g('bell');
    expect(drop(s, 15, 20, a.id).ok).toBe(false); // partner 16 -> 21 is occupied: all-or-nothing
    s.grid[0] = g('cannon', 2);
    drop(s, 0, 15, s.grid[0]!.id); // merge with the towed cannon
    expect(s.boss!.active).toBeNull();
  });

  it('TIME RANSOM: unsaved takes 2 s; one player chain waking both saves it', () => {
    const s = newLevel(LEVELS[79]);
    expect(BOSSES[s.boss!.def].id).toBe('chrono_chimera');
    while (!s.boss!.pending && s.phase === 'playing') tick(s);
    const left = s.timeLeft;
    while (s.boss!.pending && s.phase === 'playing') tick(s);
    expect(left - s.timeLeft).toBeGreaterThan(2.4); // 2.5 s of warning ticks + the 2 s ransom (minus nothing)
    // saved: a cascade that activates both marked ids
    const b: BossState = { def: chapterBossIdx(80), next: 0, pending: null, active: null, phaseShown: 0 };
    const grid = Array(30).fill(null) as (Gadget | null)[];
    grid[0] = g('cannon', 3);
    grid[1] = g('coil', 3);
    const ev = [];
    for (let t = 0; t < 9; t += 0.05) ev.push(...bossTick(b, grid, t, 100, 100, new Set()));
    expect(b.pending?.ids?.length).toBe(2);
  });

  it('L61-80 exist with chapter bosses Rivet Rhino / Chrono Chimera and play without errors', () => {
    expect(LEVELS.length).toBe(80);
    expect(BOSSES[chapterBossIdx(70)].id).toBe('rivet_rhino');
    for (const lv of [61, 65, 68, 70, 74, 78, 80]) {
      const s = newLevel(LEVELS[lv - 1]);
      const rng = new Rng(lv);
      let next = 2;
      while (s.phase === 'playing') {
        if (s.elapsed >= next) {
          next += 2;
          const p = legalPairs(s);
          if (p.length) {
            const [a, b] = p[rng.int(p.length)];
            drop(s, a, b, s.grid[a]!.id);
          }
        }
        tick(s);
      }
      expect(['won', 'lost']).toContain(s.phase);
    }
  });
});
