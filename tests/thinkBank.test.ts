import { afterEach, describe, expect, it } from 'vitest';
import { applyThinkBank, storedThinkBank } from '../src/content/experiments';
import { LEVELS } from '../src/content/levels';
import { TICK, TUNING } from '../src/content/tuning';
import { drop, legalPairs, newLevel, serialize, thinking, tick, type GameState } from '../src/core/game';
import { newRunLog, recordCommand, recordTick, replayRun } from '../src/core/replay';

const TB = structuredClone(TUNING.tb);
afterEach(() => {
  applyThinkBank(false);
  Object.assign(TUNING.tb, structuredClone(TB));
});
const level = () => newLevel(LEVELS[10]);
const ticks = (s: GameState, secs: number, held: ReadonlySet<number> = new Set()) => {
  for (let i = 0; i < Math.round(secs / TICK); i++) tick(s, held);
};
const mergeAny = (s: GameState) => {
  const [a, b] = legalPairs(s)[0];
  expect(drop(s, a, b, s.grid[a]!.id).ok).toBe(true);
};

describe('Think Bank prototype (TUNING.thinkBank)', () => {
  it('is OFF by default and leaves the live tick untouched', () => {
    expect(TUNING.thinkBank).toBe(false);
    const s = level();
    ticks(s, 10);
    expect(s.elapsed).toBeCloseTo(10, 5);
    expect(s.idleFor).toBeUndefined();
    expect(s.banked).toBeUndefined();
  });

  it('a still board stops the level clock after the grace, a merge restarts it', () => {
    applyThinkBank(true);
    const s = level();
    ticks(s, 10);
    // only the grace ran on the level clock; the other 8 s went into the bank
    expect(s.elapsed).toBeCloseTo(TUNING.tb.grace, 5);
    expect(s.timeLeft).toBeCloseTo(s.levelTime! - TUNING.tb.grace, 5);
    expect(s.banked).toBeCloseTo(10 - TUNING.tb.grace, 5);
    expect(thinking(s)).toBe(true);
    mergeAny(s);
    expect(thinking(s)).toBe(false);
    const e0 = s.elapsed;
    ticks(s, 1);
    expect(s.elapsed - e0).toBeCloseTo(1, 5);
  });

  it('a finger on the board counts as touching (no pause while dragging)', () => {
    applyThinkBank(true);
    const s = level();
    ticks(s, 6, new Set([0]));
    expect(s.elapsed).toBeCloseTo(6, 5);
    expect(s.banked ?? 0).toBe(0);
  });

  it('the bank caps the free time; rate slows instead of freezing', () => {
    applyThinkBank(true);
    Object.assign(TUNING.tb, { grace: 1, rate: 0, bank: 3 });
    const s = level();
    ticks(s, 10);
    expect(s.banked).toBeCloseTo(3, 5);
    expect(s.elapsed).toBeCloseTo(7, 5);
    expect(thinking(s)).toBe(false);
    Object.assign(TUNING.tb, { grace: 1, rate: 0.5, bank: 60 });
    const t = level();
    ticks(t, 5);
    expect(t.elapsed).toBeCloseTo(1 + 4 * 0.5, 5);
  });

  it('replays identically (holds are in the run log)', () => {
    applyThinkBank(true);
    const s = level();
    const log = newRunLog();
    for (let i = 0; i < 300; i++) {
      recordTick(log, s, new Set(i % 97 < 10 ? [3] : []));
      if (i % 70 === 69) {
        const [a, b] = legalPairs(s)[0];
        recordCommand(log, s, { k: 'drop', from: a, to: b, id: s.grid[a]!.id });
      }
    }
    expect(serialize(replayRun(log)!)).toBe(serialize(s));
  });

  it('QA switch: only "on" turns it on', () => {
    expect(storedThinkBank(() => 'on')).toBe(true);
    expect(storedThinkBank(() => null)).toBe(false);
    expect(storedThinkBank(() => 'x')).toBe(false);
    expect(
      storedThinkBank(() => {
        throw new Error('blocked');
      }),
    ).toBe(false);
  });
});
