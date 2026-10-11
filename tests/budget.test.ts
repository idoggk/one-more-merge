// t-4c676288 LAST MERGES (TUNING.mergeBudget): merge-budget levels on the Workshop Puzzle engine.
import { afterEach, describe, expect, it } from 'vitest';
import { LEVELS } from '../src/content/levels';
import { TUNING } from '../src/content/tuning';
import { BUDGET_LEVELS, budgetChase, budgetPuzzleDef, budgetStars, DEFAULT_STAR_SPARE, levelBudget, mergesLeft, newBudgetState, type BudgetLevel } from '../src/core/budget';
import { deserialize, drop, newGame, newPuzzle, serialize } from '../src/core/game';
import { playMove, puzzleMoves } from '../src/core/puzzle';

afterEach(() => {
  TUNING.mergeBudget = false;
});

/** Two cannon pairs and a coil pair: three different merges to spend a budget on. */
const fixture = (merge_budget: number, hp: number): BudgetLevel => ({
  id: 'fx', name: 'FX', level: 6, monster: 'toaster_twins', visual: 'colander_clatter', merge_budget, hp, star_spare: [1, 3], solution: [], note: '',
  planner: { best_damage: 0, min_merges: 0, greedy_damage: 0, hp_share: 0 },
  board: [['cannon', 1, 1, 0], ['cannon', 1, 1, 1], ['cannon', 2, 3, 3], ['cannon', 2, 3, 4], ['coil', 1, 5, 0], ['coil', 1, 5, 1], ['bell', 1, 0, 3]],
});
const cell = (r: number, c: number) => r * 5 + c;
const mergeAt = (s: NonNullable<ReturnType<typeof newBudgetState>>, from: number, to: number) => drop(s, from, to, s.grid[from]!.id);

describe('LAST MERGES merge budget', () => {
  it('flag OFF: nothing has a budget and no budget state can start', () => {
    expect(TUNING.mergeBudget).toBe(false);
    expect(levelBudget({ merge_budget: 6 })).toBeUndefined();
    expect(newBudgetState(fixture(6, 100))).toBeNull();
    expect(LEVELS.some((l) => l.merge_budget !== undefined)).toBe(false);
    TUNING.mergeBudget = true;
    expect(levelBudget({ merge_budget: 6 })).toBe(6);
    expect(levelBudget({})).toBeUndefined();
  });

  it('flag OFF: an ordinary level and a Workshop Puzzle play as before (no budget field, clock still runs)', () => {
    const lv = newGame(7, false, false, [], -1, 'cannon');
    expect(lv.puzzle).toBeUndefined();
    const pz = newPuzzle({ id: 'p', moves: 2, hp: 50, board: fixture(2, 50).board, solution: [] });
    expect(pz.puzzle!.budget).toBeUndefined();
    expect(budgetChase(pz)).toBeNull();
  });

  it('one committed merge costs one merge: cascades and wakes are free, moves and bounced drops cost nothing', () => {
    TUNING.mergeBudget = true;
    const s = newBudgetState(fixture(5, 1e6))!;
    expect(mergesLeft(s)).toBe(5);
    const r = mergeAt(s, cell(1, 0), cell(1, 1));
    expect(r.ok).toBe(true);
    expect(mergesLeft(s)).toBe(4);
    // a drop that is not a merge (different ranks / empty cell) is refused in this mode and spends nothing
    expect(mergeAt(s, cell(3, 3), cell(5, 0)).ok).toBe(false);
    expect(mergeAt(s, cell(5, 0), cell(2, 2)).ok).toBe(false);
    expect(mergesLeft(s)).toBe(4);
    expect(s.puzzle!.used).toBe(1);
    expect(s.timeLeft).toBe(9999); // no clock
    mergeAt(s, cell(3, 3), cell(3, 4));
    expect(mergesLeft(s)).toBe(3);
  });

  it('out of merges with HP left is a loss; breaking it on the last merge is a win', () => {
    TUNING.mergeBudget = true;
    const lost = newBudgetState(fixture(1, 1e6))!;
    mergeAt(lost, cell(1, 0), cell(1, 1));
    expect(lost.phase).toBe('lost');
    expect(lost.hp).toBeGreaterThan(0);
    expect(mergesLeft(lost)).toBe(0);
    // refuses more merges once over
    expect(mergeAt(lost, cell(3, 3), cell(3, 4)).ok).toBe(false);
    const probe = newBudgetState(fixture(1, 1e6))!;
    const hit = probe.hp - playMove(probe, [cell(3, 3), cell(3, 4)]).hp;
    expect(hit).toBeGreaterThan(0);
    const won = newBudgetState(fixture(1, Math.floor(hit)))!;
    mergeAt(won, cell(3, 3), cell(3, 4));
    expect(won.phase).toBe('won');
    expect(mergesLeft(won)).toBe(0); // won on the last merge: 1 star
    expect(budgetStars(mergesLeft(won))).toBe(1);
  });

  it('stars by merges left: 3+ spare = 3, 1-2 = 2, win on the last merge = 1; a level can slide its own lines', () => {
    expect(DEFAULT_STAR_SPARE).toEqual([1, 3]);
    expect([0, 1, 2, 3, 4, 9].map((n) => budgetStars(n))).toEqual([1, 2, 2, 3, 3, 3]);
    expect([0, 1, 2].map((n) => budgetStars(n, [1, 2]))).toEqual([1, 2, 3]);
    TUNING.mergeBudget = true;
    const s = newBudgetState(fixture(6, 1e6))!;
    expect(budgetChase(s)).toEqual({ stars: 3, within: 3 }); // 3 stars: win within 3 merges (3 spare of 6)
    mergeAt(s, cell(1, 0), cell(1, 1));
    mergeAt(s, cell(3, 3), cell(3, 4));
    mergeAt(s, cell(5, 0), cell(5, 1));
    expect(budgetChase(s)).toEqual({ stars: 2, within: 2 }); // 3 merges left: the 3-star line is gone, 2 stars need a win in 2 more
  });

  it('a budget state is a puzzle state with the saga look, and serialises round trip', () => {
    TUNING.mergeBudget = true;
    const s = newBudgetState(fixture(6, 123))!;
    expect(s.puzzle!.id).toBe('budget:fx');
    expect(s.puzzle!.budget!.look).toEqual({ level: 6, visual: 'colander_clatter', monster: 'toaster_twins' });
    expect(s.maxHp).toBe(123);
    expect(s.noKickback).toBe(true);
    const back = deserialize(serialize(s))!;
    expect(back.puzzle!.budget).toEqual(s.puzzle!.budget);
    expect(puzzleMoves(back).length).toBe(puzzleMoves(s).length);
  });

  it('old saves load: a puzzle or level save without the budget field still plays', () => {
    const old = JSON.parse(serialize(newPuzzle({ id: 'p', moves: 3, hp: 80, board: fixture(3, 80).board, solution: [] })));
    delete old.puzzle.budget;
    const s = deserialize(JSON.stringify(old))!;
    expect(s.puzzle!.budget).toBeUndefined();
    expect(drop(s, cell(1, 0), cell(1, 1), s.grid[cell(1, 0)]!.id).ok).toBe(true);
    expect(s.puzzle!.used).toBe(1);
    const lv = deserialize(serialize(newGame(3)))!;
    expect(lv.puzzle).toBeUndefined();
  });
});

describe('the generated bench levels (src/content/budgetLevels.json, tools/make-budget-levels.ts)', () => {
  it('there are exactly three, with budgets 6, 8 and 10 on existing saga machines', () => {
    expect(BUDGET_LEVELS.map((b) => b.merge_budget)).toEqual([6, 8, 10]);
    for (const b of BUDGET_LEVELS) {
      const lv = LEVELS[b.level - 1];
      expect(lv, b.id).toBeTruthy();
      expect(b.monster).toBe(lv.monster);
      expect(b.visual).toBe(lv.visual);
    }
  });

  it('each is solvable: its stored best line breaks the machine within the budget and banks the spare the stars promise', () => {
    TUNING.mergeBudget = true;
    for (const b of BUDGET_LEVELS) {
      const s = newBudgetState(b)!;
      expect(s.maxHp).toBe(b.hp);
      for (const [from, to] of b.solution) {
        expect(mergeAt(s, from, to).ok, `${b.id} ${from}>${to}`).toBe(true);
      }
      expect(s.phase, b.id).toBe('won');
      expect(mergesLeft(s), b.id).toBe(b.merge_budget - b.planner.min_merges);
      expect(budgetStars(mergesLeft(s), b.star_spare), b.id).toBe(3);
      expect(budgetPuzzleDef(b).moves).toBe(b.merge_budget);
    }
  });

  it('HP is about 75% of the best line, and a greedy line misses it', () => {
    for (const b of BUDGET_LEVELS) {
      expect(b.planner.hp_share, b.id).toBeGreaterThan(0.55);
      expect(b.planner.hp_share, b.id).toBeLessThanOrEqual(0.75);
      expect(b.planner.greedy_damage, b.id).toBeLessThan(b.hp);
    }
  });
});
