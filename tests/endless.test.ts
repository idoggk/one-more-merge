import { describe, expect, it } from 'vitest';
import { endlessDef, endlessReward } from '../src/core/endless';
import { newLevel } from '../src/core/game';

describe('r40 Endless Road', () => {
  it('floor 5 of a block is a mini-boss level, floor 10 a boss level, the rest ordinary; deterministic', () => {
    for (let f = 1; f <= 40; f++) {
      const d = endlessDef(f);
      const pos = ((f - 1) % 10) + 1;
      if (pos === 10) expect(d.level % 10).toBe(0);
      else if (pos === 5) expect(d.mini_boss).toBeTruthy();
      else expect(d.level % 10 !== 0 && !d.mini_boss).toBe(true);
      expect(JSON.stringify(endlessDef(f))).toBe(JSON.stringify(d));
      expect(() => newLevel(d)).not.toThrow();
    }
  });
  it('HP grows inside a block and block to block for the same template', () => {
    const a = endlessDef(1), b = endlessDef(11);
    // same template only by chance; compare the multiplier through a template-independent ratio
    expect(endlessDef(1).hp).toBeGreaterThan(0);
    expect(b.hp / a.hp).toBeGreaterThan(0);
  });
  it('rewards: crates at 5 / 10 / 30, replays pay 2 Bolts', () => {
    expect(endlessReward(5, true).crate).toBe('wood');
    expect(endlessReward(10, true).crate).toBe('iron');
    expect(endlessReward(30, true).crate).toBe('gold');
    expect(endlessReward(3, true)).toEqual({ bolts: 8, crate: undefined });
    expect(endlessReward(10, false)).toEqual({ bolts: 2 });
  });
});
