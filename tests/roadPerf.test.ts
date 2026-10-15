import { describe, expect, it } from 'vitest';
import { applyRoadPerf, applyRoadPerfHud, ROAD_PERF, ROAD_PERF_HUD, storedRoadPerf, storedRoadPerfHud } from '../src/content/experiments';
import { createCuller, spanVisible } from '../src/game/road/roadPerf';

describe('road perf: culling maths', () => {
  it('a span is visible when any part of it is inside the view plus margin', () => {
    expect(spanVisible(0, 100, 0, 1000, 0)).toBe(true);
    expect(spanVisible(-500, -400, 0, 1000, 0)).toBe(false);
    expect(spanVisible(-500, -400, 500, 1000, 0)).toBe(true); // scrolled down 500 brings it to 0..100
    expect(spanVisible(1200, 1300, 0, 1000, 0)).toBe(false);
    expect(spanVisible(1200, 1300, 0, 1000, 250)).toBe(true); // margin
    expect(spanVisible(-1500, -1000, 0, 1000, 250)).toBe(false);
  });
  it('the culler flips only pieces whose state changed and hides far pieces', () => {
    const calls: string[] = [];
    const obj = (n: string) => ({ setVisible: (v: boolean) => void calls.push(`${n}:${v}`) });
    const c = createCuller(1000, 0);
    c.add([obj('a'), obj('a2')], 0, 100);
    c.add([obj('b')], -3000, -2900);
    c.update(0);
    expect(calls).toEqual(['b:false']);
    expect(c.hidden()).toBe(1);
    c.update(0);
    expect(calls).toEqual(['b:false']); // no change, no calls
    c.update(2950); // scrolled so b is on screen and a is far below
    expect(calls.slice(1).sort()).toEqual(['a2:false', 'a:false', 'b:true'].sort());
  });
});

describe('road perf: flags', () => {
  it('ROAD PERF ships ON (stored off disables), the readout ships OFF', () => {
    expect(ROAD_PERF.on).toBe(true);
    expect(ROAD_PERF_HUD.on).toBe(false);
    expect(storedRoadPerf(() => null)).toBe(true);
    expect(storedRoadPerf(() => 'off')).toBe(false);
    expect(storedRoadPerfHud(() => null)).toBe(false);
    expect(storedRoadPerfHud(() => 'on')).toBe(true);
    applyRoadPerf(false);
    applyRoadPerfHud(true);
    expect([ROAD_PERF.on, ROAD_PERF_HUD.on]).toEqual([false, true]);
    applyRoadPerf(true);
    applyRoadPerfHud(false);
  });
});
