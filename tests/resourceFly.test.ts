import { describe, expect, it } from 'vitest';
import { bezier, controlPoint, FLY, flyCount, splitAmount, staggerDelay } from '../src/game/fx/resourceFlyGeom';
import { RESOURCE_FLY, applyResourceFly, storedResourceFly } from '../src/content/experiments';

const A = { x: 100, y: 500 };
const B = { x: 600, y: 40 };

describe('resource fly geometry', () => {
  it('arc starts at from and ends at to; overshoot passes the target', () => {
    const c = controlPoint(A, B);
    expect(bezier(A, c, B, 0)).toEqual(A);
    const end = bezier(A, c, B, 1);
    expect(end.x).toBeCloseTo(B.x);
    expect(end.y).toBeCloseTo(B.y);
    const past = bezier(A, c, B, FLY.overshoot);
    expect(Math.hypot(past.x - A.x, past.y - A.y)).toBeGreaterThan(Math.hypot(B.x - A.x, B.y - A.y) * 0.99);
  });
  it('arc bows upward of the straight line', () => {
    const mid = bezier(A, controlPoint(A, B), B, 0.5);
    expect(mid.y).toBeLessThan((A.y + B.y) / 2);
  });
  it('stagger is strictly increasing from 0', () => {
    expect(staggerDelay(0)).toBe(0);
    expect(staggerDelay(5)).toBeGreaterThan(staggerDelay(4));
  });
  it('icon count: 0 for nothing, 6..12 scaled, never above the live budget', () => {
    expect(flyCount(0)).toBe(0);
    expect(flyCount(-5)).toBe(0);
    expect(flyCount(1)).toBe(6);
    expect(flyCount(40)).toBe(10);
    expect(flyCount(100000)).toBe(12);
    expect(flyCount(100000, 35)).toBe(5);
    expect(flyCount(100000, 40)).toBe(0);
  });
  it('split sums exactly to the amount', () => {
    for (const [a, n] of [[3, 6], [97, 12], [40, 10]]) expect(splitAmount(a, n).reduce((s, v) => s + v, 0)).toBe(a);
    expect(splitAmount(5, 0)).toEqual([]);
  });
});

describe('resource fly flag', () => {
  it('defaults OFF and follows the stored value', () => {
    expect(RESOURCE_FLY.on).toBe(false);
    expect(storedResourceFly(() => 'on')).toBe(true);
    expect(storedResourceFly(() => null)).toBe(false);
    expect(storedResourceFly(() => { throw new Error('x'); })).toBe(false);
    applyResourceFly(true);
    expect(RESOURCE_FLY.on).toBe(true);
    applyResourceFly(false);
  });
});
