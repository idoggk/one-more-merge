import { describe, expect, it } from 'vitest';
import { COLS, ROWS, TUNING } from '../src/content/tuning';
import { rawDamage, resolveCascade } from '../src/core/cascade';
import { choosePerk, drop, idxOf, newGame, previewMerge, serialize, tick, type GameState } from '../src/core/game';
import type { Family, Gadget, Grid } from '../src/core/types';

let id = 1000;
const g = (family: Family, rank = 1): Gadget => ({ id: id++, family, rank, cd: 3 });
const empty = (): Grid => new Array(ROWS * COLS).fill(null);
const opts = { perks: [], overdrive: false };

describe('cascade', () => {
  it('isolated cannon merge activates only itself', () => {
    const grid = empty();
    grid[idxOf(5, 4)] = g('cannon', 2);
    const r = resolveCascade(grid, idxOf(5, 4), opts);
    expect(r.count).toBe(1);
    expect(r.total).toBeCloseTo(22.5);
  });

  it('Coil -> Bell -> cannons branching chain, each fires once', () => {
    const grid = empty();
    grid[idxOf(4, 1)] = g('cannon', 2); // root
    grid[idxOf(3, 1)] = g('coil'); // spark neighbour
    grid[idxOf(2, 1)] = g('bell'); // coil reach 1
    grid[idxOf(2, 4)] = g('cannon'); // bell row, across gap
    grid[idxOf(0, 0)] = g('cannon'); // unreachable
    const r = resolveCascade(grid, idxOf(4, 1), opts);
    expect(r.activations.map((a) => a.idx)).toEqual([idxOf(4, 1), idxOf(3, 1), idxOf(2, 1), idxOf(2, 4)]);
    expect(new Set(r.activations.map((a) => a.id)).size).toBe(r.count);
  });

  it('empty gap stops a rank-1 coil, rank-2 coil spans it', () => {
    const grid = empty();
    grid[idxOf(5, 0)] = g('cannon', 2);
    grid[idxOf(4, 0)] = g('coil');
    grid[idxOf(2, 0)] = g('cannon');
    expect(resolveCascade(grid, idxOf(5, 0), opts).count).toBe(2);
    grid[idxOf(4, 0)] = g('coil', 2);
    expect(resolveCascade(grid, idxOf(5, 0), opts).count).toBe(3);
  });

  it('bell ranks: row, +vertical at 2, +column at 3', () => {
    const grid = empty();
    const b = idxOf(3, 2);
    const root = idxOf(3, 3);
    grid[root] = g('cannon', 2);
    grid[idxOf(3, 0)] = g('cannon');
    grid[idxOf(2, 2)] = g('cannon');
    grid[idxOf(0, 2)] = g('cannon');
    for (const [rank, n] of [[1, 3], [2, 4], [3, 5]] as const) {
      grid[b] = g('bell', rank);
      expect(resolveCascade(grid, root, opts).count).toBe(n);
    }
  });

  it('strongest coil charge wins and does not stack', () => {
    const grid = empty();
    grid[idxOf(2, 2)] = g('cannon'); // root (pretend fresh)
    grid[idxOf(2, 1)] = g('coil', 1);
    grid[idxOf(2, 3)] = g('coil', 3);
    const r = resolveCascade(grid, idxOf(2, 2), opts);
    const root = r.activations[0];
    expect(root.charge).toBeCloseTo(1 + 0.35 * 3);
  });

  it('fully connected board stays bounded', () => {
    const grid = empty();
    for (let i = 0; i < grid.length; i++) grid[i] = g(i % 2 ? 'coil' : 'bell', 3);
    const r = resolveCascade(grid, 0, opts);
    expect(r.count).toBe(30);
    expect(r.comboMult).toBeLessThanOrEqual(TUNING.comboCap);
  });

  it('twin burst adds damage, not activations', () => {
    const grid = empty();
    grid[0] = g('cannon', 2);
    const a = resolveCascade(grid, 0, opts);
    const b = resolveCascade(grid, 0, { perks: ['twin'], overdrive: false });
    expect(b.count).toBe(a.count);
    expect(b.total).toBeCloseTo(a.total * 1.4);
  });

  it('merging cannons increases sustained output', () => {
    expect(rawDamage('cannon', 3)).toBeGreaterThan(2 * rawDamage('cannon', 2));
  });
});

const run = (s: GameState, seconds: number) => {
  for (let i = 0; i < seconds / 0.05; i++) tick(s);
};

describe('game', () => {
  it('merge frees one cell, preserves rank mass and family', () => {
    const s = newGame(1);
    const count = () => s.grid.filter(Boolean).length;
    const mass = () => s.grid.reduce((m, x) => m + (x ? 2 ** (x.rank - 1) : 0), 0);
    const [c0, m0] = [count(), mass()];
    const res = drop(s, idxOf(4, 1), idxOf(4, 2), s.grid[idxOf(4, 1)]!.id);
    expect(res.ok).toBe(true);
    expect(count()).toBe(c0 - 1);
    expect(mass()).toBe(m0);
    expect(s.grid[idxOf(4, 2)]!.rank).toBe(2);
    expect(s.grid[idxOf(4, 2)]!.family).toBe('cannon');
  });

  it('move/swap deal no damage', () => {
    const s = newGame(1);
    const hp = s.hp;
    drop(s, idxOf(4, 1), idxOf(0, 0), s.grid[idxOf(4, 1)]!.id);
    drop(s, idxOf(3, 1), idxOf(3, 2), s.grid[idxOf(3, 1)]!.id);
    expect(s.hp).toBe(hp);
  });

  it('preview matches the real cascade and does not mutate', () => {
    const s = newGame(7);
    const before = serialize(s);
    const p = previewMerge(s, idxOf(4, 1), idxOf(4, 2))!;
    expect(serialize(s)).toBe(before);
    const res = drop(s, idxOf(4, 1), idxOf(4, 2), s.grid[idxOf(4, 1)]!.id);
    const ev = res.events.find((e) => e.type === 'cascade')!;
    expect(ev.type === 'cascade' && ev.result.count).toBe(p.count);
  });

  it('is deterministic for a seed', () => {
    const a = newGame(42);
    const b = newGame(42);
    run(a, 30);
    run(b, 30);
    expect(serialize(a)).toBe(serialize(b));
  });

  it('idle play loses at the deadline', () => {
    const s = newGame(3);
    for (let i = 0; i < (TUNING.runTime + 1) / 0.05; i++) {
      if (s.phase === 'choice') choosePerk(s, s.offer[0]);
      tick(s);
    }
    expect(s.phase).toBe('lost');
    expect(s.timeLeft).toBe(0);
  });

  it('full board pauses supply without losing parts', () => {
    const s = newGame(5);
    run(s, 120 * 0.05 * 20); // plenty
    expect(s.pending.length).toBeLessThanOrEqual(TUNING.maxPending);
  });

  it('kill opens a choice, overkill carries after choice', () => {
    const s = newGame(9);
    s.hp = 5;
    const res = drop(s, idxOf(4, 1), idxOf(4, 2), s.grid[idxOf(4, 1)]!.id);
    expect(res.events.some((e) => e.type === 'kill')).toBe(true);
    expect(s.phase).toBe('choice');
    expect(s.offer.length).toBe(3);
    const pending = s.pendingDamage;
    expect(pending).toBeGreaterThan(0);
    choosePerk(s, s.offer[0]);
    expect(s.phase).toBe('playing');
    expect(s.hp).toBeCloseTo(TUNING.targetHp[1] - pending);
  });

  it('tutorial: two merges start the real run', () => {
    const s = newGame(11, true);
    drop(s, idxOf(4, 1), idxOf(4, 2), s.grid[idxOf(4, 1)]!.id);
    expect(s.phase).toBe('tutorial');
    tick(s);
    tick(s);
    drop(s, idxOf(1, 1), idxOf(3, 1), s.grid[idxOf(1, 1)]!.id);
    expect(s.phase).toBe('playing');
    expect(s.target).toBe(0);
    expect(s.hp).toBe(TUNING.targetHp[0]);
    expect(s.practice).toBe(true);
  });
});
