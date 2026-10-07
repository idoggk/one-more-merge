import { describe, expect, it } from 'vitest';
import { LEVELS } from '../src/content/levels';
import { bossTick, BOSSES, type BossState } from '../src/core/boss';
import { drop, legalPairs, newLevel, tick } from '../src/core/game';
import { Rng } from '../src/core/rng';
import type { Gadget, Grid } from '../src/core/types';

/** r33: boss mechanics are tested on the boss alone (stages put minions first). */
const solo = (d: (typeof LEVELS)[number]) => ({ ...d, waves: undefined, wave_visuals: undefined, minion_hp: undefined });


let id = 1;
const g = (family: Gadget['family'], rank = 1): Gadget => ({ id: id++, family, rank, cd: 99 });
const state = (bossId: string): BossState => ({ def: BOSSES.findIndex((b) => b.id === bossId), next: 0, pending: null, active: null, phaseShown: 0, mini: true });
const run = (b: BossState, grid: Grid, until: number) => {
  const ev = [];
  for (let t = 0; t <= until + 1e-9; t += 0.05) ev.push(...bossTick(b, grid, t, 100, 100, new Set()));
  return ev;
};

describe('r27 mini-boss attacks', () => {
  it('BOMB: undefused it removes one rank-1/2 neighbour', () => {
    const grid: Grid = Array(30).fill(null);
    grid[6] = g('cannon', 1);
    grid[8] = g('coil', 3);
    const b = state('pressure_popper');
    const ev = run(b, grid, 10.6);
    const warn = ev.find((e) => e.type === 'bossWarn')!;
    expect(warn.type === 'bossWarn' && warn.target.cells![0]).toBe(7); // empty, two occupied neighbours
    expect(grid[6]).toBeNull(); // the rank-1 neighbour popped
    expect(grid[8]?.rank).toBe(3); // higher ranks are safe
  });

  it('CONVEYOR rotates the fullest row one cell right with wrap', () => {
    const grid: Grid = Array(30).fill(null);
    const a = g('cannon'), c = g('bell'), d = g('coil');
    grid[10] = a;
    grid[12] = c;
    grid[14] = d;
    run(state('carousel_crab'), grid, 10.6);
    expect(grid[11]).toBe(a);
    expect(grid[13]).toBe(c);
    expect(grid[10]).toBe(d);
  });

  it('MIRROR swaps the highest with a different lowest machine', () => {
    const grid: Grid = Array(30).fill(null);
    const hi = g('cannon', 4), lo = g('bell', 1);
    grid[0] = hi;
    grid[29] = lo;
    grid[5] = g('cannon', 4);
    run(state('vanity_moth'), grid, 10.6);
    expect(grid[29]).toBe(hi);
    expect(grid[0]).toBe(lo);
  });

  it('JUNK BLOCKS appear, cap at 2 and expire after 8 s', () => {
    const grid: Grid = Array(30).fill(null);
    grid[12] = g('cannon');
    const b = state('brick_printer');
    run(b, grid, 10.6);
    expect(b.blocks?.length).toBe(2);
    run(b, grid, 0); // no-op
    const ev2: unknown[] = [];
    for (let t = 10.6; t < 19; t += 0.05) ev2.push(...bossTick(b, grid, t, 100, 100, new Set()));
    expect(b.blocks?.length ?? 0).toBe(0);
  });

  it('PULL moves the highest machine up one, BOUNCE throws to the farthest empty cell', () => {
    const grid: Grid = Array(30).fill(null);
    const top = g('cannon', 3);
    grid[12] = top;
    run(state('scrap_kraken'), grid, 10.6);
    expect(grid[7]).toBe(top);
    const grid2: Grid = Array(30).fill(null);
    const m = g('coil');
    grid2[0] = m;
    run(state('spring_jack'), grid2, 10.6);
    expect(grid2[29]).toBe(m);
  });

  it('a mini-boss level is a full deterministic fight; moving onto the bomb defuses it', () => {
    for (const lv of [8, 18, 28, 38, 48, 58]) {
      const def = LEVELS[lv - 1];
      expect(def.mini_boss).toBeTruthy();
      const s = newLevel(solo(def));
      expect(s.boss?.mini).toBe(true);
      const rng = new Rng(lv);
      let next = 3;
      while (s.phase === 'playing') {
        if (s.elapsed >= next) {
          next += 3;
          const p = legalPairs(s);
          if (p.length) {
            const [a, b] = p[rng.int(p.length)];
            drop(s, a, b, s.grid[a]!.id);
          }
        }
        tick(s);
        // pieces never overlap a junk block
        for (const bl of s.boss?.blocks ?? []) expect(s.grid[bl.cell]).toBeNull();
      }
    }
    const s = newLevel(solo(LEVELS[7]));
    while (!s.boss!.pending) tick(s);
    const cell = s.boss!.pending!.cells![0];
    const from = s.grid.findIndex((x, i) => !!x && i !== cell);
    const r = drop(s, from, cell, s.grid[from]!.id);
    expect(r.events.some((e) => e.type === 'bossDefuse')).toBe(true);
    expect(s.boss!.pending).toBeNull();
  });

  it('chapter bosses alternate their second attack in the final phase (second first)', () => {
    const grid: Grid = Array(30).fill(null);
    for (let i = 0; i < 30; i += 2) grid[i] = g(i % 4 === 0 ? 'cannon' : 'coil', 1);
    const b: BossState = { def: 0, next: 0, pending: null, active: null, phaseShown: 0 };
    const atks: string[] = [];
    for (let t = 0; t < 60; t += 0.05) for (const e of bossTick(b, grid, t, 10, 100, new Set())) if (e.type === 'bossWarn') atks.push(e.attack);
    expect(atks[0]).toBe('bomb');
    expect(atks.slice(0, 4)).toEqual(['bomb', 'clamp', 'bomb', 'clamp']);
  });
});
