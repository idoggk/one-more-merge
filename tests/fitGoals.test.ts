import { describe, expect, it } from 'vitest';
import { LEVELS } from '../src/content/levels';
import { fitHp, isStagedChain, pickGoalN, r50, refHp, type LevelLike } from '../tools/fit-goals-lib';

const lv = (level: number, hp: number, o: Partial<LevelLike> = {}): LevelLike => ({ level, hp, time_seconds: 165, waves: 4, ...o });

describe('fit-goals helpers', () => {
  it('refHp: median of same-chapter plain peers with the same clock and machine count', () => {
    const all = [
      lv(61, 10000, { time_seconds: 125 }), // other clock
      lv(62, 50000),
      lv(65, 14000, { goal: { kind: 'chain', n: 12 } }), // itself
      lv(67, 60000),
      lv(68, 99999, { minion_hp: 99999, mini_boss: 'x' }), // mini-boss
      lv(70, 99999), // boss slot
      lv(66, 30000, { goal: { kind: 'chain', n: 12 } }),
      lv(72, 70000), // other chapter
    ];
    expect(refHp(all[2], all)).toBe(50000);
    expect(refHp(lv(71, 1, { waves: 2 }), all)).toBeNaN();
  });

  it('pickGoalN takes the largest n that reaches the target, scanning down', () => {
    const win: Record<number, number> = { 13: 0.1, 12: 0.3, 11: 0.65, 10: 0.81, 9: 0.89, 8: 0.96, 7: 1 };
    const g = pickGoalN((n) => win[n], 6, 13, 0.9);
    expect(g.n).toBe(8);
    expect(g.tried.map(([n]) => n)).toEqual([13, 12, 11, 10, 9, 8]);
    expect(pickGoalN(() => 0, 6, 8, 0.9).n).toBe(6);
  });

  it('fitHp finds where a falling win rate crosses the target', () => {
    const win = (k: number) => 1 - 0.5 * k; // 0.9 at k = 0.2
    expect(fitHp(win, 0.1, 1, 0.9, 20)).toBeCloseTo(0.2, 3);
    expect(fitHp(() => 1, 0.5, 1.4, 0.9)).toBe(1.4);
    expect(fitHp(() => 0, 0.5, 1, 0.9)).toBe(0.5);
    expect(r50(36412)).toBe(36400);
  });

  it('live staged chain-goal levels keep fitted HP (t-c459303c: L65 was cut to 0.27x of its peers)', () => {
    const staged = LEVELS.filter((d) => isStagedChain(d));
    expect(staged.map((d) => d.level)).toEqual(expect.arrayContaining([29, 44, 54, 65]));
    for (const L of [29, 44, 54, 65]) {
      const d = LEVELS[L - 1];
      expect(d.hp / refHp(d, LEVELS)).toBeGreaterThanOrEqual(0.5);
    }
  });
});
