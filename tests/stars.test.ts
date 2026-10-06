import { describe, expect, it } from 'vitest';
import { LEVELS, starGoals, starsFor } from '../src/content/levels';

describe('star goals (r22)', () => {
  it('every level has 3-star < 2-star <= 80% of its clock', () => {
    for (const def of LEVELS) {
      const T = def.level % 10 === 0 ? 90 : def.time_seconds;
      const [two, three] = starGoals(def);
      expect(def.star_times, `L${def.level}`).toBeDefined();
      expect(three).toBeLessThan(two);
      expect(two).toBeLessThanOrEqual(Math.floor(T * 0.8));
      expect(three).toBeGreaterThan(5);
    }
  });
  it('starsFor uses the goals', () => {
    const def = LEVELS[9];
    const [two, three] = starGoals(def);
    expect(starsFor(def, three)).toBe(3);
    expect(starsFor(def, two)).toBe(2);
    expect(starsFor(def, two + 1)).toBe(1);
  });
});
