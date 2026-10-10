import { describe, expect, it } from 'vitest';
import { BIG_CHAIN, chainHoldMs, HOLD_MS, ladderPlan } from '../src/game/fx/chainLadder';
import { blinkLevel, IDLE_BLINK, idleBlinkOn } from '../src/game/fx/partReact';
import { mergesAway, soCloseText } from '../src/game/fx/soClose';

describe('idle blink', () => {
  const base = { playing: true, dragIdx: -1, hints: true, puzzle: false, hintPair: null, idleTime: IDLE_BLINK + 1 };
  it('blinks on a quiet board and stops once the hint pair shows', () => {
    expect(idleBlinkOn(base)).toBe(true);
    expect(idleBlinkOn({ ...base, hintPair: [3, 4] })).toBe(false);
  });
  it('treats a missing hints setting as on, and only an explicit off as off', () => {
    expect(idleBlinkOn({ ...base, hints: undefined })).toBe(true);
    expect(idleBlinkOn({ ...base, hints: false })).toBe(false);
  });
  it('never blinks in puzzles, while dragging or before the idle time', () => {
    expect(idleBlinkOn({ ...base, puzzle: true })).toBe(false);
    expect(idleBlinkOn({ ...base, dragIdx: 2 })).toBe(false);
    expect(idleBlinkOn({ ...base, idleTime: IDLE_BLINK - 0.1 })).toBe(false);
  });
});

describe('chain ladder', () => {
  it('gives every link the next note, in depth order, never before its beat', () => {
    const acts = [{ depth: 0 }, { depth: 1 }, { depth: 1 }, { depth: 2 }, { depth: 1 }];
    const plan = ladderPlan(acts, 90, 70);
    expect(plan.map((p) => p.link)).toEqual([1, 2, 3, 4, 5]);
    for (let i = 1; i < plan.length; i++) expect(plan[i].at).toBeGreaterThan(plan[i - 1].at);
    // the three depth-1 links sit inside beat 1, before beat 2
    expect(plan[1].at).toBe(160);
    expect(plan[3].at).toBeLessThan(230);
    expect(plan[4].at).toBe(230);
  });
  it('holds only big chains', () => {
    expect(chainHoldMs(BIG_CHAIN - 1)).toBe(0);
    expect(chainHoldMs(BIG_CHAIN)).toBe(HOLD_MS);
    expect(HOLD_MS).toBe(250);
  });
});

describe('so close', () => {
  it('estimates merges from the HP left over the average damage per merge', () => {
    // 900 dealt over 9 merges = 100 per merge; 8% of 2000 = 160 left -> 2 merges
    expect(mergesAway({ hp: 160, maxHp: 2000, playerDamage: 900, merges: 9 })).toBe(2);
    expect(soCloseText({ hp: 160, maxHp: 2000, stage: { i: 3, hps: [500, 500, 500, 2000] }, playerDamage: 900, merges: 9 }, 'X')).toBe('Machine 4/4 at 8% HP  ·  about 2 merges away');
  });
  it('counts the machines still waiting after this one', () => {
    expect(mergesAway({ hp: 100, maxHp: 500, stage: { i: 1, hps: [500, 500, 400] }, playerDamage: 1000, merges: 10 })).toBe(5);
  });
  it('never says 0 and falls back when there is no average', () => {
    expect(mergesAway({ hp: 1, maxHp: 500, playerDamage: 1000, merges: 2 })).toBe(1);
    expect(mergesAway({ hp: 400, maxHp: 500, playerDamage: 0, merges: 0 })).toBeNull();
    expect(soCloseText({ hp: 400, maxHp: 500, playerDamage: 0, merges: 0 }, 'GRUMBLER')).toBe('GRUMBLER at 80% HP  ·  so close!');
    expect(soCloseText({ hp: 50, maxHp: 500, playerDamage: 100, merges: 2 }, 'G')).toContain('about 1 merge away');
  });
});

describe('idle blink', () => {
  it('waits 6 s and pulses gently, then rests', () => {
    expect(IDLE_BLINK).toBe(6);
    expect(blinkLevel(0)).toBe(0);
    expect(blinkLevel(260)).toBeCloseTo(1, 2);
    expect(blinkLevel(1000)).toBe(0);
    expect(blinkLevel(1600 + 260)).toBeCloseTo(1, 2);
  });
});
