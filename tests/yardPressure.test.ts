import { describe, expect, it } from 'vitest';
import { newObject, objectRules, greedyPick, solveObject, tapScrew, viewFor, type ObjectDef, type View } from '../src/core/screwObject';
import { BELL, CANNON, COIL, minTaps, pressureCfg, TAP_MULT, YARD_OBJECTS, YARD_TIME, YARD_UNITS } from '../src/content/yardObjects';
import { TUNING } from '../src/content/tuning';
import { countTap, dangerOf, newPressure, pressureStars, secondsLeft, tapsFrac, tickClock, timeFrac } from '../src/core/yardPressure';

/** A reasonable player: greedy picks, and every 8th tap is wasted on a blocked / turned-away screw (still counts). */
function greedyTaps(o: ObjectDef, wasteEvery = 8) {
  const st = newObject(o, objectRules());
  let taps = 0, n = 0;
  while (!st.won && !st.lost) {
    if (++n % wasteEvery === 0) {
      taps++;
      continue;
    }
    const sid = greedyPick(st);
    if (sid === null) break;
    taps++;
    tapScrew(st, sid, viewFor(st, sid) as View);
  }
  return { won: st.won, taps };
}

describe('Yard pressure numbers (solver-checked)', () => {
  it('the flag is OFF by default', () => {
    expect(TUNING.yardPressure).toBe(false);
  });

  it('timers are data: Cannon 75 s, Coil 100 s, Bell 130 s', () => {
    expect(YARD_TIME).toEqual({ cannon: 75, coil: 100, bell: 130 });
  });

  it('minTaps is the exact solver path length, and the budget / star lines are multiples of it', () => {
    for (const o of [CANNON, COIL, BELL]) {
      const sol = solveObject(o);
      expect(sol, o.id).not.toBeNull();
      expect(minTaps(o)).toBe(sol!.length);
      const c = pressureCfg(o)!;
      expect(c.budget).toBe(Math.ceil(sol!.length * TAP_MULT.budget));
      expect(c.threeTaps).toBe(Math.ceil(sol!.length * TAP_MULT.three));
      expect(c.threeTaps).toBeLessThan(c.twoTaps);
      expect(c.twoTaps).toBeLessThan(c.budget);
    }
    expect(pressureCfg({ ...CANNON, id: 'crate' })).toBeNull();
  });

  it('every object is winnable inside its budget by the optimal player, with 3 stars of taps to spare', () => {
    for (const u of YARD_UNITS) {
      const o = YARD_OBJECTS[u], c = pressureCfg(o)!;
      const taps = solveObject(o)!.length;
      expect(taps).toBeLessThanOrEqual(c.threeTaps);
      expect(taps).toBeLessThanOrEqual(c.budget);
    }
  });

  it('a reasonable greedy player (wasting every 8th tap) wins within the budget', () => {
    for (const u of YARD_UNITS) {
      const o = YARD_OBJECTS[u], c = pressureCfg(o)!;
      const clean = greedyTaps(o, 1e9);
      expect(clean.won, u).toBe(true);
      expect(clean.taps, u).toBeLessThanOrEqual(c.budget);
      const sloppy = greedyTaps(o);
      expect(sloppy.won, u).toBe(true);
      expect(sloppy.taps, u).toBeLessThanOrEqual(c.budget);
    }
  });
});

describe('Yard pressure model', () => {
  const cfg = pressureCfg(CANNON)!;

  it('the clock only runs after the first tap, and not while paused', () => {
    const p = newPressure(cfg);
    expect(tickClock(p, 5000)).toBe(false);
    expect(secondsLeft(p)).toBe(75);
    countTap(p);
    tickClock(p, 5000);
    expect(secondsLeft(p)).toBe(70);
    p.paused = true;
    tickClock(p, 30000);
    expect(secondsLeft(p)).toBe(70);
    p.paused = false;
    expect(tickClock(p, 70000)).toBe(true);
    expect(p.msLeft).toBe(0);
  });

  it('every tap counts, and the budget reports when it is spent', () => {
    const p = newPressure(cfg);
    for (let i = 1; i < cfg.budget; i++) expect(countTap(p)).toBe(false);
    expect(countTap(p)).toBe(true);
    expect(p.taps).toBe(cfg.budget);
    expect(tapsFrac(p)).toBe(0);
  });

  it('danger: amber at 25% left, red at 10%', () => {
    expect(dangerOf(0.3)).toBe('calm');
    expect(dangerOf(0.25)).toBe('amber');
    expect(dangerOf(0.11)).toBe('amber');
    expect(dangerOf(0.1)).toBe('red');
    expect(dangerOf(0)).toBe('red');
  });

  it('stars: 3 with >= 40% time and the 3-star taps, 2 with >= 15%, else 1', () => {
    const at = (timeLeft: number, taps: number) => {
      const p = newPressure(cfg);
      p.msLeft = timeLeft * cfg.time * 1000;
      p.taps = taps;
      return pressureStars(p);
    };
    expect(at(0.4, cfg.threeTaps)).toBe(3);
    expect(at(0.39, cfg.threeTaps)).toBe(2);
    expect(at(0.9, cfg.threeTaps + 1)).toBe(2);
    expect(at(0.15, cfg.twoTaps)).toBe(2);
    expect(at(0.14, 1)).toBe(1);
    expect(at(0.9, cfg.twoTaps + 1)).toBe(1);
    expect(timeFrac(newPressure(cfg))).toBe(1);
  });
});
