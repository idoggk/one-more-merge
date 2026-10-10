import { describe, expect, it } from 'vitest';
import { FULL_SHAKE, nextShakeLevel, resolveShakeLevel, shakeSpec, SOFT_AMP, SOFT_TIME, type ShakeKind } from '../src/game/fx/shake';

const kinds = Object.keys(FULL_SHAKE) as ShakeKind[];

describe('screen shake setting', () => {
  it('defaults to SOFT, and to OFF under reduced motion or the old Shake-off switch', () => {
    expect(resolveShakeLevel(null, false)).toBe('soft');
    expect(resolveShakeLevel(undefined, true)).toBe('off');
    expect(resolveShakeLevel(null, false, true)).toBe('off');
    expect(resolveShakeLevel('garbage', false)).toBe('soft');
  });
  it('a saved choice beats reduced motion', () => {
    expect(resolveShakeLevel('full', true)).toBe('full');
    expect(resolveShakeLevel('soft', true)).toBe('soft');
    expect(resolveShakeLevel('off', false)).toBe('off');
  });
  it('FULL equals the original values', () => {
    expect(shakeSpec('chainBig', 'full')).toEqual({ ms: 180, amp: 0.006 });
    expect(shakeSpec('maxKick', 'full')).toEqual({ ms: 80, amp: 0.002 });
    expect(shakeSpec('bossFinal', 'full')).toEqual({ ms: 120, amp: 0.004 });
    expect(shakeSpec('bossRansom', 'full')).toEqual({ ms: 140, amp: 0.004 });
    expect(shakeSpec('bomb', 'full')).toEqual({ ms: 140, amp: 0.005 });
    expect(shakeSpec('chainMid', 'full')).toBeNull();
  });
  it('OFF produces no shake at all', () => {
    for (const k of kinds) expect(shakeSpec(k, 'off')).toBeNull();
  });
  it('SOFT is about 35% of FULL, shorter, and skips small kicks', () => {
    expect(SOFT_AMP).toBe(0.35);
    for (const k of kinds) {
      const f = FULL_SHAKE[k];
      const s = shakeSpec(k, 'soft');
      if (!f || !s) continue;
      expect(s.amp).toBeCloseTo(f.amp * SOFT_AMP, 6);
      expect(s.ms).toBeLessThan(f.ms);
      expect(s.ms).toBe(Math.round(f.ms * SOFT_TIME));
    }
    expect(shakeSpec('maxKick', 'soft')).toBeNull();
    const mid = shakeSpec('chainMid', 'soft')!;
    expect(mid.amp).toBeLessThan(shakeSpec('chainBig', 'soft')!.amp);
  });
  it('cycles OFF > SOFT > FULL > OFF', () => {
    expect(nextShakeLevel('off')).toBe('soft');
    expect(nextShakeLevel('soft')).toBe('full');
    expect(nextShakeLevel('full')).toBe('off');
  });
});
