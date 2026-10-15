// LEVEL TIMELINE (t-141225ee): the armor clock that gives fast tappers a clear-time floor.
import { afterEach, describe, expect, it } from 'vitest';
import { LEVELS } from '../src/content/levels';
import { applyLevelPace2, PACE2_DATA } from '../src/content/levelPace2';
import { applyLevelTimeline, LEVEL_TIMELINE, TIMELINE_SPAN_SHARE, timelineRelease, timelineSpan } from '../src/content/levelTimeline';
import { applyDamage, newLevel, tick, type GameEvent } from '../src/core/game';
import { MANIA_LEVELS, floorFor } from '../tools/pace-lib';

afterEach(() => {
  applyLevelTimeline(false);
  applyLevelPace2(false);
});
const on = () => {
  applyLevelPace2(true);
  applyLevelTimeline(true);
};

describe('data', () => {
  it('floor_s of every level matches the floor curve', () => {
    for (const [k, e] of Object.entries(PACE2_DATA)) expect(e.floor_s).toBe(floorFor(Number(k)));
  });
});

describe('release rule', () => {
  const tl = { span: 40, total: 1000, bank: 5000, applied: 0 };
  it('opens in proportion to time and never above the bank', () => {
    expect(timelineRelease(tl, 0)).toBe(0);
    expect(timelineRelease(tl, 10)).toBe(250);
    expect(timelineRelease({ ...tl, bank: 100 }, 10)).toBe(100);
    expect(timelineRelease({ ...tl, applied: 250 }, 10)).toBe(0);
  });
  it('is fully open (everything in the bank lands) once the span has passed', () => {
    expect(timelineRelease(tl, 40)).toBe(5000);
  });
});

describe('flag gating', () => {
  it('OFF: no timeline on any level; ON needs PACE 2 too; MANIA levels are excluded', () => {
    expect(newLevel(LEVELS[0]).tl).toBeUndefined();
    applyLevelTimeline(true);
    expect(timelineSpan(1)).toBeUndefined(); // PACE 2 off
    applyLevelPace2(true);
    expect(timelineSpan(1)).toBeCloseTo(floorFor(1) * TIMELINE_SPAN_SHARE);
    for (const L of MANIA_LEVELS) expect(timelineSpan(L)).toBeUndefined();
    expect(LEVEL_TIMELINE.on).toBe(true);
    expect(newLevel(LEVELS[0]).tl?.span).toBeCloseTo(floorFor(1) * TIMELINE_SPAN_SHARE);
    expect(newLevel(LEVELS[4]).tl).toBeUndefined(); // L5 MANIA
  });
});

describe('the armor', () => {
  it('banks early blows, releases them on the clock, and loses nothing', () => {
    on();
    const s = newLevel(LEVELS[0]);
    s.phase = 'playing';
    const ev: GameEvent[] = [];
    const hp0 = s.hp;
    applyDamage(s, hp0 * 3, ev, 'player'); // a huge early blow (the hit cap trims it, the rest of the bank stays)
    expect(s.hp).toBe(hp0); // nothing landed at t = 0
    expect(s.tl!.bank).toBeGreaterThan(0);
    const banked = s.tl!.bank;
    for (let i = 0; i < 20 * 4; i++) tick(s); // 4 s
    expect(s.hp).toBeLessThan(hp0);
    expect(s.tl!.bank + s.tl!.applied).toBeGreaterThanOrEqual(banked); // conserved (cannons add more blows)
    expect(s.phase).toBe('playing');
  });
  it('cannot win before the span even with unlimited blows, and wins right after', () => {
    on();
    const def = LEVELS[0];
    const s = newLevel(def);
    s.phase = 'playing';
    const ev: GameEvent[] = [];
    const span = s.tl!.span;
    let t = 0;
    while (s.phase === 'playing' && t < span + 5) {
      applyDamage(s, 1e7, ev, 'passive'); // always more than the whole HP (not capped)
      tick(s);
      t = s.elapsed;
      if (t < span - 0.5) expect(s.phase).toBe('playing');
    }
    expect(s.phase).toBe('won');
    expect(t).toBeGreaterThanOrEqual(span - 0.1);
    expect(t).toBeLessThan(span + 2);
  });
  it('OFF: the same blow kills at once (live behaviour unchanged)', () => {
    const s = newLevel(LEVELS[0]);
    s.phase = 'playing';
    applyDamage(s, 1e9, [], 'passive');
    expect(s.phase).toBe('won');
    expect(s.tl).toBeUndefined();
  });
  it('a multi-machine stage keeps every machine: wave marks end at 1 and all machines break by the span', () => {
    on();
    const def = LEVELS[2]; // L3: 2 waves, no goal
    const s = newLevel(def);
    s.phase = 'playing';
    expect(s.tl!.marks!.length).toBe(s.stage!.hps.length);
    expect(s.tl!.marks![s.tl!.marks!.length - 1]).toBeCloseTo(1);
    const ev: GameEvent[] = [];
    let kills = 0;
    while (s.phase === 'playing' && s.elapsed < s.tl!.span + 5) {
      applyDamage(s, 1e7, ev, 'passive');
      for (const e of tick(s)) if (e.type === 'kill') kills++;
    }
    expect(s.phase).toBe('won');
    expect(s.elapsed).toBeGreaterThanOrEqual(s.tl!.span - 0.1);
    expect(kills).toBeGreaterThanOrEqual(s.stage!.hps.length - 1);
  });
});
