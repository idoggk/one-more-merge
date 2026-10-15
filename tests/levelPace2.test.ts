// LEVEL PACE 2 (t-a177b529): the floor curve, the HP search, and the flag that swaps the refitted numbers in LEVELS.
import { afterEach, describe, expect, it } from 'vitest';
import { LEVELS } from '../src/content/levels';
import { applyLevelPace2, LEVEL_PACE2, PACE2_DATA, type PaceEntry } from '../src/content/levelPace2';
import { baseFloor, clockFor, fitK, floorFor, isMania, largestK, MANIA_LEVELS, smallestK } from '../tools/pace-lib';

afterEach(() => applyLevelPace2(false));

describe('floor curve', () => {
  it('follows the owner decision: 45 tutorial, 60 early, ~90 at L30, ~120 from L50', () => {
    expect([1, 2, 3].map(baseFloor)).toEqual([45, 45, 45]);
    expect([4, 10, 15].map(baseFloor)).toEqual([60, 60, 60]);
    expect(baseFloor(30)).toBe(90);
    expect(baseFloor(50)).toBe(120);
    expect(baseFloor(80)).toBe(120);
  });
  it('bosses and mini-bosses +30%, MANIA levels shorter, one MANIA per chapter', () => {
    expect(floorFor(10)).toBe(78);
    expect(floorFor(60)).toBe(156);
    expect(floorFor(5)).toBeLessThan(floorFor(4));
    expect(floorFor(5)).toBeGreaterThanOrEqual(30);
    expect(MANIA_LEVELS.map((L) => Math.ceil(L / 10)).sort()).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(MANIA_LEVELS.every((L) => !(L % 10 === 0) && !isMania(L + 1))).toBe(true);
  });
  it('the curve never falls as levels go on (outside boss / mania slots)', () => {
    const plain = Array.from({ length: 80 }, (_, i) => i + 1).filter((L) => L % 10 !== 0 && L % 10 !== 8 && !isMania(L));
    for (let i = 1; i < plain.length; i++) expect(floorFor(plain[i])).toBeGreaterThanOrEqual(floorFor(plain[i - 1]));
  });
  it('clock is at least 1.8x the floor and never below the current clock', () => {
    expect(clockFor(60, 70)).toBe(110);
    expect(clockFor(30, 165)).toBe(165);
  });
});

describe('search', () => {
  it('smallestK / largestK find the threshold of a monotone function', () => {
    expect(smallestK((k) => k >= 3, 1, 32, 12)).toBeCloseTo(3, 1);
    expect(largestK((k) => k <= 5, 1, 32, 12)).toBeCloseTo(5, 1);
    expect(smallestK((k) => k >= 0.5, 1, 32)).toBe(1);
  });
  it('fitK reaches the thinker floor, raises k for the fast bot only while the thinker stays under the ceiling', () => {
    const thinker = (k: number) => 20 * k; // 60 s floor -> k >= 3.09
    const fastSlow = (k: number) => 5 * k; // would need k = 12.4 -> thinker 248 s: past 1.15 x floor
    const r = fitK(60, thinker, fastSlow);
    expect(thinker(r.k)).toBeGreaterThanOrEqual(60);
    expect(thinker(r.k)).toBeLessThanOrEqual(60 * 1.15 + 1);
    expect(r.fastMet).toBe(false);
    const pushed = fitK(60, thinker, (k) => 19 * k); // needs k = 3.25: inside the 1.15 x ceiling (k <= 3.45)
    expect(pushed.fastMet).toBe(true);
    expect(pushed.k).toBeGreaterThan(fitK(60, thinker, () => 1000).k);
    const fastOk = fitK(60, thinker, (k) => 25 * k);
    expect(fastOk.fastMet).toBe(true);
    expect(fitK(60, thinker, fastSlow, false).k).toBeCloseTo(fitK(60, thinker, () => 1000, true).k, 5);
  });
  it('never lowers HP: a level already above its floor keeps k = 1', () => {
    expect(fitK(30, () => 80, () => 40).k).toBe(1);
  });
});

describe('flag', () => {
  const snap = () => JSON.stringify(LEVELS);
  const fake: Record<string, PaceEntry> = { '1': { hp: 4000, time_seconds: 99, star_times: [70, 60] }, '10': { hp: 9000, minion_hp: 7000, time_seconds: 200 }, '4': { hp: 5000, time_seconds: 120, goal_n: 5 } };
  it('defaults OFF', () => expect(LEVEL_PACE2.on).toBe(false));
  it('OFF leaves LEVELS byte-identical; ON swaps the listed numbers; OFF again restores them', () => {
    const before = snap();
    applyLevelPace2(false, fake);
    expect(snap()).toBe(before);
    applyLevelPace2(true, fake);
    expect(LEVELS[0]).toMatchObject({ hp: 4000, time_seconds: 99, star_times: [70, 60] });
    expect(LEVELS[9]).toMatchObject({ hp: 9000, minion_hp: 7000, time_seconds: 200 });
    expect(LEVELS[3].goal!.n).toBe(5);
    expect(LEVELS[1].hp).toBe(JSON.parse(before)[1].hp); // unlisted level untouched
    applyLevelPace2(false, fake);
    expect(snap()).toBe(before);
  });
  it("the shipped data covers levels 1-80, raises HP and clock on normal levels, lowers them on MANIA levels", () => {
    expect(Object.keys(PACE2_DATA).length).toBe(80);
    expect(Object.entries(PACE2_DATA).filter(([, e]) => e.mania).map(([k]) => Number(k))).toEqual(MANIA_LEVELS);
    const keys = Object.keys(PACE2_DATA);
    for (const k of keys) {
      expect(Number(k)).toBeGreaterThanOrEqual(1);
      expect(Number(k)).toBeLessThanOrEqual(LEVELS.length);
      if (PACE2_DATA[k].mania) continue; // MANIA levels are shorter on purpose (lower HP and clock)
      expect(PACE2_DATA[k].hp).toBeGreaterThanOrEqual(LEVELS[Number(k) - 1].hp);
      expect(PACE2_DATA[k].time_seconds).toBeGreaterThanOrEqual(LEVELS[Number(k) - 1].time_seconds);
    }
    const before = snap();
    applyLevelPace2(true);
    applyLevelPace2(false);
    expect(snap()).toBe(before);
  });
});
