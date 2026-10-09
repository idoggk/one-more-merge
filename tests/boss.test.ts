import { describe, expect, it } from 'vitest';
import { LEVELS } from '../src/content/levels';
import { COLS } from '../src/content/tuning';
import { BOSSES, bossRansomCheck, bossTick, type BossState } from '../src/core/boss';
import { resolveCascade } from '../src/core/cascade';
import { drop, idxOf, legalPairs, newLevel, tick, type GameState } from '../src/core/game';
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

/** A boss fight on an empty board with nothing scheduled: the test sets the hazard by hand. */
const blank = (bossId: string): GameState => {
  const s = newLevel(solo(LEVELS[19]));
  s.grid.fill(null);
  s.pending = [];
  s.hp = s.maxHp = 1e6;
  s.boss = { def: BOSSES.findIndex((b) => b.id === bossId), next: 99, pending: null, active: null, phaseShown: 0 };
  return s;
};
const rowCells = (r: number) => [0, 1, 2, 3, 4].map((c) => idxOf(r, c));

describe('FROST (Fridge Overlord)', () => {
  it('a drop into the frozen row is refused, as a move and as a merge', () => {
    const s = blank('fridge_overlord');
    s.boss!.active = { attack: 'frost', row: 1, until: 99 };
    s.grid[idxOf(0, 0)] = g('cannon', 2);
    s.grid[idxOf(1, 3)] = g('cannon', 2);
    s.grid[idxOf(3, 3)] = g('cannon', 2);
    const before = JSON.stringify(s.grid);
    expect(drop(s, idxOf(0, 0), idxOf(1, 0), s.grid[idxOf(0, 0)]!.id).ok).toBe(false); // empty frozen cell
    expect(drop(s, idxOf(3, 3), idxOf(1, 3), s.grid[idxOf(3, 3)]!.id).ok).toBe(false); // merge onto a frozen machine
    expect(JSON.stringify(s.grid)).toBe(before);
    // a machine already in the row may still leave it, and the thaw opens the row again
    expect(drop(s, idxOf(1, 3), idxOf(2, 3), s.grid[idxOf(1, 3)]!.id).ok).toBe(true);
    s.boss!.active = null;
    expect(drop(s, idxOf(0, 0), idxOf(1, 0), s.grid[idxOf(0, 0)]!.id).ok).toBe(true);
  });

  it('deliveries and loose parts never land in the frozen row', () => {
    const s = blank('fridge_overlord');
    s.boss!.active = { attack: 'frost', row: 0, until: 1e9 };
    s.reactive = false;
    s.calmCap = undefined;
    // every free cell is in the frozen row: a lonely rank-1 cannon sits just below it
    for (let i = COLS; i < s.grid.length; i++) s.grid[i] = g((['cannon', 'coil', 'bell'] as const)[i % 3], 1 + (i % 4));
    s.grid[idxOf(1, 2)] = g('cannon', 5);
    s.pending = [g('coil'), g('bell')];
    s.drops = [{ t: 0, fuse: false, plan: null }, { t: 0, fuse: false, plan: { idx: idxOf(1, 2), land: idxOf(0, 2), id: s.grid[idxOf(1, 2)]!.id } }];
    for (let k = 0; k < 200 && s.phase === 'playing'; k++) {
      tick(s);
      expect(rowCells(0).every((i) => s.grid[i] === null)).toBe(true);
    }
    // the parts were held, not lost: once the row thaws (and the tray hold lifts) they come in there
    expect(s.pending.length).toBeGreaterThanOrEqual(2);
    s.boss!.active = null;
    for (let i = 2 * COLS; i < s.grid.length; i++) s.grid[i] = null;
    tick(s);
    expect(rowCells(0).some((i) => s.grid[i] !== null)).toBe(true);
  });
});

describe('TIME RANSOM (Chrono Chimera)', () => {
  const ransom = (s: GameState, x: Gadget, y: Gadget) =>
    (s.boss!.pending = { attack: 'ransom', cells: [], ids: [x.id, y.id], deadline: 1e9, phase: 0 });

  it('half: one of the two marked machines woke -> 1/2, the ransom stays armed', () => {
    const b: BossState = { def: BOSSES.findIndex((x) => x.id === 'chrono_chimera'), next: 0, pending: { attack: 'ransom', cells: [], ids: [7, 8], deadline: 99, phase: 0 }, active: null, phaseShown: 0 };
    expect(bossRansomCheck(b, [3, 7])).toEqual([{ type: 'bossRansomHalf', id: 7 }]);
    expect(bossRansomCheck(b, [8])).toEqual([{ type: 'bossRansomHalf', id: 8 }]);
    expect(bossRansomCheck(b, [1, 2])).toEqual([]);
    expect(b.pending).not.toBeNull();
    expect(bossRansomCheck(b, [8, 1, 7])).toEqual([{ type: 'bossRansom', saved: true, cost: 0 }]);
    expect(b.pending).toBeNull();
    expect(bossRansomCheck(b, [7, 8])).toEqual([]); // nothing armed any more
  });

  it('a marked machine merged by hand carries its mark; one chain waking both still saves the clock', () => {
    const s = blank('chrono_chimera');
    const coil = g('coil', 1), cannon = g('cannon', 2);
    s.grid[idxOf(0, 0)] = coil;
    s.grid[idxOf(5, 4)] = cannon; // far away: the first merge wakes only the coil
    s.grid[idxOf(1, 0)] = g('coil', 1);
    ransom(s, coil, cannon);
    const r1 = drop(s, idxOf(1, 0), idxOf(0, 0), s.grid[idxOf(1, 0)]!.id);
    expect(r1.ok).toBe(true);
    const merged = s.grid[idxOf(0, 0)]!;
    expect(merged.id).not.toBe(coil.id);
    expect(s.boss!.pending?.ids).toEqual([merged.id, cannon.id]); // the mark moved onto the new id
    expect(r1.events).toContainEqual({ type: 'bossRansomHalf', id: merged.id });
    // bring the cannon beside the coil, then a bell merge in the row wakes both in one chain
    expect(drop(s, idxOf(5, 4), idxOf(0, 1), cannon.id).ok).toBe(true);
    s.grid[idxOf(0, 3)] = g('bell', 1);
    s.grid[idxOf(2, 3)] = g('bell', 1);
    const r2 = drop(s, idxOf(2, 3), idxOf(0, 3), s.grid[idxOf(2, 3)]!.id);
    expect(r2.events).toContainEqual({ type: 'bossRansom', saved: true, cost: 0 });
    expect(s.boss!.pending).toBeNull();
  });
});
