import { describe, expect, it } from 'vitest';
import { snapDev } from '../src/game/road/roadStable';

describe('ROAD STABLE snapDev', () => {
  it('lands on whole device pixels', () => {
    for (const v of [0, 0.3, 1.234, -57.77, 1000.49]) {
      const d = snapDev(v, 1.625) * 1.625;
      expect(Math.abs(d - Math.round(d))).toBeLessThan(1e-9);
    }
  });
  it('moves a value by at most half a device pixel', () => {
    for (let v = -5; v < 5; v += 0.037) expect(Math.abs(snapDev(v, 1.625) - v)).toBeLessThanOrEqual(0.5 / 1.625 + 1e-9);
  });
  it('is monotonic (no reversals when the input rises) and idempotent', () => {
    let prev = -Infinity;
    for (let v = -3; v < 3; v += 0.01) {
      const s = snapDev(v, 1.625);
      expect(s).toBeGreaterThanOrEqual(prev);
      expect(snapDev(s, 1.625)).toBeCloseTo(s, 9);
      prev = s;
    }
  });
  it('leaves the value alone for a bad scale', () => {
    expect(snapDev(1.234, 0)).toBe(1.234);
    expect(snapDev(1.234, NaN)).toBe(1.234);
  });
});
