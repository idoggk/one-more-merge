import { describe, expect, it } from 'vitest';
import { applyRoadPerf2, ROAD_PERF2, storedRoadPerf2 } from '../src/content/experiments';
import { createCuller } from '../src/game/road/roadPerf';
import { createTweenGate, shouldCull, skyRowCount, skyRows } from '../src/game/road/roadPerf2';

describe('road perf 2: flag', () => {
  it('ships ON; only a stored "off" turns it off', () => {
    expect(ROAD_PERF2.on).toBe(true);
    expect(storedRoadPerf2(() => null)).toBe(true);
    expect(storedRoadPerf2(() => 'off')).toBe(false);
    applyRoadPerf2(false);
    expect(ROAD_PERF2.on).toBe(false);
    applyRoadPerf2(true);
  });
});

describe('road perf 2: sky gradient rows', () => {
  it('samples the colour function top to bottom at row centres', () => {
    expect(skyRows(0, 100, 4, (y) => y)).toEqual([12.5, 37.5, 62.5, 87.5]);
  });
  it('row count follows the step but stays within [2, max]', () => {
    expect(skyRowCount(800, 8, 2048)).toBe(100);
    expect(skyRowCount(100000, 8, 2048)).toBe(2048);
    expect(skyRowCount(1, 8, 2048)).toBe(2);
  });
});

describe('road perf 2: scroll culling throttle', () => {
  it('runs on the first call, then every 2nd call, but never lets the road drift 40 px unculled', () => {
    expect(shouldCull(1, 0, null)).toBe(true);
    expect(shouldCull(2, 10, 0)).toBe(true);
    expect(shouldCull(3, 10, 0)).toBe(false);
    expect(shouldCull(3, 40, 0)).toBe(true);
    expect(shouldCull(3, -40, 0)).toBe(true);
  });
});

describe('road perf 2: tween gate', () => {
  it('only visible tweens run, at most `cap` at once, and a hidden one frees its slot', () => {
    const g = createTweenGate(2);
    expect(g.want(1, true)).toBe(true);
    expect(g.want(2, true)).toBe(true);
    expect(g.want(3, true)).toBe(false); // over the cap
    expect(g.want(1, true)).toBe(true); // already running stays running
    expect(g.want(2, false)).toBe(false); // off screen: paused, slot freed
    expect(g.running()).toBe(1);
    expect(g.want(3, true)).toBe(true);
  });
});

describe('road perf 2: culler tells pieces their state (pause / resume hooks)', () => {
  it('calls onChange on the first update and on each flip, not otherwise; plain pieces are unchanged', () => {
    const seen: boolean[] = [];
    const c = createCuller(1000, 0);
    c.add([], 0, 100, (v) => seen.push(v));
    c.update(0);
    expect(seen).toEqual([true]);
    c.update(0);
    expect(seen).toEqual([true]);
    c.update(-5000); // far above the view: hidden
    expect(seen).toEqual([true, false]);
    const late: boolean[] = [];
    c.add([], -3000, -2900, (v) => late.push(v));
    c.update(-5000);
    expect(late).toEqual([false]); // first update reports a hidden piece once
  });
});
