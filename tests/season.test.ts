import { describe, expect, it } from 'vitest';
import { dailyTasks, freshSeason, rollSeason, seasonCount, seasonTier, seasonUnit, tierRewards, weeklyTasks } from '../src/core/season';

describe('r41 workshop season', () => {
  it('3 distinct daily and 4 distinct weekly tasks, seeded', () => {
    const d = dailyTasks(20000);
    expect(new Set(d.map((t) => t.ev)).size).toBe(3);
    expect(new Set(weeklyTasks(2857).map((t) => t.text)).size).toBe(4);
    expect(dailyTasks(20000)).toEqual(d);
  });
  it('counting completes tasks once and pays XP once', () => {
    const r = freshSeason(20000);
    const t = dailyTasks(20000)[0];
    let xp = 0;
    for (let k = 0; k < 200; k++) xp += seasonCount(r, t.ev);
    expect(xp).toBeGreaterThanOrEqual(15);
    expect(r.daily[0]).toBe(t.n);
    const again = seasonCount(r, t.ev);
    expect(again).toBe(0);
  });
  it('a new day resets dailies, a new season resets everything', () => {
    const r = freshSeason(20000);
    r.daily = [1, 1, 1];
    r.xp = 500;
    expect(rollSeason(r, 20001).daily).toEqual([0, 0, 0]);
    expect(rollSeason(r, 20001).xp).toBe(500);
    expect(rollSeason(r, 20000 + 28).xp).toBe(0);
    expect(seasonTier({ ...r, xp: 3500 })).toBe(30);
  });
  it('tier 30 is a gold crate on both lanes; the premium lane carries unit cards', () => {
    expect(tierRewards(30)[0].crate).toBe('gold');
    expect(tierRewards(30)[1].unitCards).toBeGreaterThan(0);
    const cards = Array.from({ length: 30 }, (_, i) => tierRewards(i + 1)[1].unitCards ?? 0).reduce((a, b) => a + b, 0);
    expect(cards).toBeGreaterThanOrEqual(6);
    expect(seasonUnit(5)).toBe(seasonUnit(5));
  });
});
