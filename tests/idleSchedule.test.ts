import { describe, it, expect } from 'vitest';
import { IdleScheduler, IDLE_CONFIG, IDLE_DURATION } from '../src/game/fx/idleSchedule';

const seeded = (seed = 7) => () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
};
const ids = Array.from({ length: 12 }, (_, i) => `u${i}`);

function run(s: IdleScheduler, ms: number, list = ids) {
  const picks: { t: number; id: string; end: number }[] = [];
  let maxActive = 0;
  for (let t = 0; t <= ms; t += 250) {
    const p = s.tick(t, list);
    if (p) picks.push({ t, id: p.id, end: t + p.duration });
    maxActive = Math.max(maxActive, s.activeCount);
  }
  return { picks, maxActive };
}

describe('IdleScheduler', () => {
  it('waits for the random gap before the first idle', () => {
    const s = new IdleScheduler(IDLE_CONFIG, seeded());
    expect(s.tick(0, ids)).toBeNull();
    expect(s.tick(2500, ids)).toBeNull(); // minGap is 3000
  });

  it('never has more than maxActive animating, and picks one per tick', () => {
    for (const max of [1, 2]) {
      const s = new IdleScheduler({ ...IDLE_CONFIG, maxActive: max, minGap: 0, maxGap: 500 }, seeded(3));
      const { picks, maxActive } = run(s, 120000);
      expect(picks.length).toBeGreaterThan(5);
      expect(maxActive).toBeLessThanOrEqual(max);
      // overlap check independent of the scheduler's own counter
      for (const p of picks) expect(picks.filter((q) => q.t <= p.t && q.end > p.t).length).toBeLessThanOrEqual(max);
    }
  });

  it('a unit does not repeat within the cooldown', () => {
    const s = new IdleScheduler({ ...IDLE_CONFIG, minGap: 0, maxGap: 300 }, seeded(5));
    const { picks } = run(s, 200000, ['a', 'b']);
    const last = new Map<string, number>();
    for (const p of picks) {
      if (last.has(p.id)) expect(p.t - last.get(p.id)!).toBeGreaterThanOrEqual(IDLE_CONFIG.cooldown);
      last.set(p.id, p.t);
    }
    expect(picks.length).toBeGreaterThan(4);
  });

  it('reduced motion picks nothing, ever', () => {
    const s = new IdleScheduler({ ...IDLE_CONFIG, reduced: true, minGap: 0, maxGap: 1 }, seeded());
    expect(run(s, 60000).picks).toHaveLength(0);
  });

  it('skips neighbours of an active unit', () => {
    const near = (a: string, b: string) => a !== b; // everyone is adjacent
    const s = new IdleScheduler({ ...IDLE_CONFIG, maxActive: 3, minGap: 0, maxGap: 100 }, seeded(9), near);
    const { picks } = run(s, 60000, ['a', 'b', 'c']);
    for (const p of picks) expect(picks.filter((q) => q.id !== p.id && q.t <= p.t && q.end > p.t)).toHaveLength(0);
    expect(picks.length).toBeGreaterThan(2);
  });

  it('drops units that left the list (no pick for an absent unit)', () => {
    const s = new IdleScheduler({ ...IDLE_CONFIG, minGap: 0, maxGap: 1 }, seeded());
    s.tick(0, ['a']);
    expect(s.tick(1000, ['b'])?.id ?? null).not.toBe('a');
    expect(s.activeCount).toBeLessThanOrEqual(1);
  });

  it('is deterministic for a given visual rand', () => {
    const a = run(new IdleScheduler(IDLE_CONFIG, seeded(11)), 90000).picks;
    const b = run(new IdleScheduler(IDLE_CONFIG, seeded(11)), 90000).picks;
    expect(a).toEqual(b);
    expect(IDLE_DURATION.blink).toBeLessThan(IDLE_DURATION.breathe);
  });
});
