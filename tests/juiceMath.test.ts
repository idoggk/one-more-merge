import { describe, expect, it } from 'vitest';
import { burstCount, countUpValue, easeOutBack, easeOutCubic, glintGap, JUICE_CAPS, ParticleBudget, popInScale, releaseScale, staggerDelay, wiggleAngle } from '../src/game/fx/juiceMath';

describe('easing', () => {
  it('starts at 0, ends at 1, clamps outside', () => {
    for (const f of [easeOutCubic, easeOutBack]) {
      expect(f(0)).toBeCloseTo(0, 6);
      expect(f(1)).toBeCloseTo(1, 6);
      expect(f(-3)).toBeCloseTo(0, 6);
      expect(f(9)).toBeCloseTo(1, 6);
    }
  });
  it('ease-out-back overshoots 1 on the way', () => {
    expect(Math.max(...Array.from({ length: 101 }, (_, i) => easeOutBack(i / 100)))).toBeGreaterThan(1.05);
  });
  it('popIn goes 0 -> 1.12 -> 1', () => {
    expect(popInScale(0)).toBe(0);
    expect(popInScale(0.7)).toBeCloseTo(1.12, 6);
    expect(popInScale(1)).toBeCloseTo(1, 6);
  });
  it('release overshoot returns to exactly 1', () => {
    expect(releaseScale(0)).toBe(1);
    expect(releaseScale(1)).toBeCloseTo(1, 9);
    expect(releaseScale(0.3)).toBeGreaterThan(1);
  });
  it('wiggle is 0 outside its window and bounded inside', () => {
    expect(wiggleAngle(0)).toBe(0);
    expect(wiggleAngle(600)).toBe(0);
    for (let ms = 1; ms < 600; ms += 7) expect(Math.abs(wiggleAngle(ms))).toBeLessThanOrEqual(8);
  });
});

describe('caps', () => {
  it('never grants more than 30 live particles', () => {
    const b = new ParticleBudget();
    let got = 0;
    for (let i = 0; i < 10; i++) got += burstCount(12, b);
    expect(got).toBe(JUICE_CAPS.particles);
    expect(b.used).toBe(30);
    expect(burstCount(8, b)).toBe(0);
  });
  it('a burst is 6..12 and the slots come back on release', () => {
    const b = new ParticleBudget();
    expect(burstCount(1, b)).toBe(6);
    expect(burstCount(99, b)).toBe(12);
    b.release(18);
    expect(b.used).toBe(0);
    b.release(5);
    expect(b.used).toBe(0);
  });
  it('take rejects negatives and fractions safely', () => {
    const b = new ParticleBudget(10);
    expect(b.take(-4)).toBe(0);
    expect(b.take(2.9)).toBe(2);
  });
});

describe('countUp, stagger, glint', () => {
  it('counts monotonically up and lands exactly', () => {
    let prev = -1;
    for (let i = 0; i <= 20; i++) {
      const v = countUpValue(0, 137, i / 20);
      expect(v).toBeGreaterThanOrEqual(prev);
      prev = v;
    }
    expect(countUpValue(0, 137, 1)).toBe(137);
    expect(countUpValue(50, 10, 1)).toBe(10);
  });
  it('stagger grows by the step and is capped', () => {
    expect(staggerDelay(0, 70)).toBe(0);
    expect(staggerDelay(3, 70)).toBe(210);
    expect(staggerDelay(100, 70, 600)).toBe(600);
  });
  it('glint gap stays within 2.5..6 s', () => {
    expect(glintGap(0)).toBe(2500);
    expect(glintGap(1)).toBe(6000);
    expect(glintGap(7)).toBe(6000);
  });
});
