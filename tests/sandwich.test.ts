import { afterEach, describe, expect, it } from 'vitest';
import { LEVELS } from '../src/content/levels';
import { TUNING } from '../src/content/tuning';
import { drop, legalPairs, newLevel, odNeeded, previewMerge, tick, type GameEvent, type GameState } from '../src/core/game';
import { mergePreview } from '../src/core/marks';
import { Rng } from '../src/core/rng';
import { applyMergeRule, pickPair, planSandwich, storedMergeRule, type MergeRule } from '../src/core/sandwich';
import type { Family, Gadget } from '../src/core/types';

// board: COLS 5. The landing cell is 12 (row 2, col 2): up 7, right 13, down 17, left 11. The held part starts at 0.
let id = 7000;
const g = (family: Family, rank = 1): Gadget => ({ id: id++, family, rank, cd: 99 });
function state(cells: [number, Gadget][], rule: MergeRule = 'today'): GameState {
  applyMergeRule(rule);
  const s = newLevel(LEVELS[24]);
  s.grid.fill(null);
  s.pending = [];
  for (const [i, x] of cells) s.grid[i] = x;
  return s;
}
const pair = (rank = 1): [number, Gadget][] => [[0, g('cannon', rank)], [12, g('cannon', rank)]];
const play = (s: GameState) => drop(s, 0, 12, s.grid[0]!.id);
const sandwichEv = (ev: GameEvent[]) => ev.find((e): e is Extract<GameEvent, { type: 'sandwich' }> => e.type === 'sandwich');
const mass = (s: GameState, f: Family) => s.grid.reduce((m, x) => m + (x?.family === f ? 2 ** (x.rank - 1) : 0), 0);

afterEach(() => applyMergeRule('today'));

describe('t-1effe0bf merge rule prototype (sandwich)', () => {
  it("is 'today' by default; the QA key reads the three rules, anything else = today", () => {
    expect(TUNING.mergeRule).toBe('today');
    expect(storedMergeRule(() => 'sandwich2')).toBe('sandwich2');
    expect(storedMergeRule(() => 'sandwichBonus')).toBe('sandwichBonus');
    expect(storedMergeRule(() => 'nope')).toBe('today');
    expect(storedMergeRule(() => null)).toBe('today');
    expect(storedMergeRule(() => { throw new Error('no storage'); })).toBe('today');
  });

  it("'today' is the live merge: +1, one cell freed, the two neighbours stay", () => {
    const s = state([...pair(), [7, g('cannon')], [17, g('cannon')]]);
    const r = play(s);
    expect(sandwichEv(r.events)).toBeUndefined();
    expect(s.grid[12]!.rank).toBe(2);
    expect(s.grid[7]?.rank).toBe(1);
    expect(s.grid[17]?.rank).toBe(1);
    expect(s.grid.filter(Boolean).length).toBe(3);
    expect(s.stats.sandwiches).toBeUndefined();
  });

  it('sandwich2 with 2 neighbours: both absorbed, +2 rank, rank mass kept, 3 cells freed', () => {
    const s = state([...pair(), [7, g('cannon')], [17, g('cannon')]], 'sandwich2');
    const before = mass(s, 'cannon');
    const r = play(s);
    expect(sandwichEv(r.events)).toMatchObject({ idx: 12, cells: [7, 17], rank: 3, plus: 2, od: 0 });
    expect(s.grid[12]!.rank).toBe(3);
    expect(s.grid[7]).toBeNull();
    expect(s.grid[17]).toBeNull();
    expect(s.grid.filter(Boolean).length).toBe(1);
    expect(mass(s, 'cannon')).toBe(before);
    expect(s.stats.sandwiches).toBe(1);
  });

  it('an L-shaped pair (up + right) sandwiches too', () => {
    const s = state([...pair(2), [7, g('cannon', 2)], [13, g('cannon', 2)]], 'sandwich2');
    expect(sandwichEv(play(s).events)?.cells).toEqual([7, 13]);
    expect(s.grid[12]!.rank).toBe(4);
  });

  it('3 neighbours: takes the opposite pair, the third stays as a merge partner', () => {
    const s = state([...pair(), [7, g('cannon')], [13, g('cannon')], [17, g('cannon')]], 'sandwich2');
    expect(sandwichEv(play(s).events)?.cells).toEqual([7, 17]);
    expect(s.grid[13]?.rank).toBe(1);
    expect(s.grid[12]!.rank).toBe(3);
  });

  it('4 neighbours: takes the vertical pair, the horizontal pair stays', () => {
    const s = state([...pair(), [7, g('cannon')], [11, g('cannon')], [13, g('cannon')], [17, g('cannon')]], 'sandwich2');
    expect(sandwichEv(play(s).events)?.cells).toEqual([7, 17]);
    expect([s.grid[11]?.rank, s.grid[13]?.rank]).toEqual([1, 1]);
    expect(pickPair([11, 13], 12)).toEqual([13, 11]);
  });

  it('only same family AND same rank count; the held part itself never counts', () => {
    const s = state([[7, g('cannon', 1)], [12, g('cannon', 1)], [17, g('coil', 1)], [13, g('cannon', 2)], [11, g('cannon', 1)]], 'sandwich2');
    // held part at 7 (a neighbour of 12): the only other match is 11 -> no sandwich
    expect(planSandwich(s.grid, 7, 12, 8)).toBeNull();
    expect(drop(s, 7, 12, s.grid[7]!.id).events.some((e) => e.type === 'sandwich')).toBe(false);
  });

  it('blocked neighbours (locked / boss-held / towed) are never absorbed', () => {
    const s = state([...pair(), [7, g('cannon')], [17, g('cannon')]], 'sandwich2');
    expect(planSandwich(s.grid, 0, 12, 8, new Set([17]))).toBeNull();
    expect(planSandwich(s.grid, 0, 12, 8)?.cells).toEqual([7, 17]);
  });

  it('max rank: +2 is capped at the level cap; a pair already at the cap compacts as today (no sandwich)', () => {
    const s = state([...pair(5), [7, g('cannon', 5)], [17, g('cannon', 5)]], 'sandwich2');
    s.rankCap = 6;
    expect(sandwichEv(play(s).events)).toMatchObject({ rank: 6, plus: 1 });
    expect(s.grid[12]!.rank).toBe(6);
    expect(s.grid[7]).toBeNull();
    const c = state([...pair(6), [7, g('cannon', 6)], [17, g('cannon', 6)]], 'sandwich2');
    c.rankCap = 6;
    expect(sandwichEv(play(c).events)).toBeUndefined();
    expect(c.grid[12]!.rank).toBe(6);
    expect(c.grid[7]?.rank).toBe(6);
  });

  it('the chain continues from the new rank: the cascade root is the +2 part and it sparks its other neighbours', () => {
    const s = state([...pair(), [7, g('cannon')], [17, g('cannon')], [11, g('coil')], [13, g('bell')]], 'sandwich2');
    const cas = play(s).events.find((e): e is Extract<GameEvent, { type: 'cascade' }> => e.type === 'cascade')!;
    const root = cas.result.activations.find((a) => a.idx === 12)!;
    expect(root.rank).toBe(3);
    const fired = cas.result.activations.map((a) => a.idx);
    expect(fired).toEqual(expect.arrayContaining([12, 11, 13]));
    expect(fired).not.toContain(7);
    expect(fired).not.toContain(17);
  });

  it('sandwichBonus: +1 as today, both neighbours absorbed, a third of the Overdrive meter paid', () => {
    const s = state([...pair(), [7, g('cannon')], [17, g('cannon')]], 'sandwichBonus');
    const od0 = s.odCharge;
    const need = odNeeded(s);
    const bonus = Math.ceil(need / 3);
    const r = play(s);
    expect(sandwichEv(r.events)).toMatchObject({ rank: 2, plus: 1, od: bonus });
    expect(s.grid[12]!.rank).toBe(2);
    expect(s.grid[7]).toBeNull();
    expect(s.grid[17]).toBeNull();
    // merge-count Overdrive: the merge's +1 plus the bonus (or Overdrive started and the meter reset)
    expect(s.odLeft > 0 || s.odCharge === od0 + 1 + bonus).toBe(true);
  });

  it('the preview predicts the sandwich (ghost rank, chips) and never mutates the state', () => {
    const s = state([...pair(), [7, g('cannon')], [17, g('cannon')]], 'sandwich2');
    const snap = JSON.stringify(s);
    expect(previewMerge(s, 0, 12)!.activations.find((a) => a.idx === 12)!.rank).toBe(3);
    const pv = mergePreview(s, 0, 12)!;
    expect(pv.chips[0]).toMatchObject({ text: 'SANDWICH!', sub: 'RANK 3' });
    expect(JSON.stringify(s)).toBe(snap);
    applyMergeRule('today');
    expect(mergePreview(s, 0, 12)!.chips.some((c) => c.text === 'SANDWICH!')).toBe(false);
  });

  it("'today' over whole bot games: never a sandwich, and every merge frees exactly one cell", () => {
    for (const lv of [5, 22, 45]) {
      const s = newLevel(LEVELS[lv - 1]);
      const rng = new Rng(lv);
      for (let t = 0; t < 1200 && s.phase === 'playing'; t++) {
        if (t % 40 === 0) {
          const p = legalPairs(s);
          if (p.length) {
            const [a, b] = p[rng.int(p.length)];
            const n0 = s.grid.filter(Boolean).length;
            const r = drop(s, a, b, s.grid[a]!.id);
            expect(sandwichEv(r.events)).toBeUndefined();
            expect(s.grid.filter(Boolean).length).toBe(n0 - 1);
          }
        }
        tick(s);
      }
      expect(s.stats.sandwiches).toBeUndefined();
    }
  });

  it('seed + actions => identical state under sandwich2', () => {
    const run = () => {
      applyMergeRule('sandwich2');
      const s = newLevel(LEVELS[30]);
      const rng = new Rng(3);
      for (let t = 0; t < 1500 && s.phase === 'playing'; t++) {
        if (t % 30 === 0) {
          const p = legalPairs(s);
          if (p.length) {
            const [a, b] = p[rng.int(p.length)];
            drop(s, a, b, s.grid[a]!.id);
          }
        }
        tick(s);
      }
      return JSON.stringify(s);
    };
    expect(run()).toBe(run());
  });
});
