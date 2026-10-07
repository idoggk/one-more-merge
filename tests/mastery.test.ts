import { describe, expect, it } from 'vitest';
import { LEVELS } from '../src/content/levels';
import { contractMet, contractsFor } from '../src/core/mastery';
import { newLevel } from '../src/core/game';

describe('r40 saga mastery', () => {
  it('every level has two different contracts; rank caps never block a rank goal', () => {
    for (const d of LEVELS) {
      const [a, b] = contractsFor(d);
      expect(a.kind).not.toBe(b.kind);
      for (const c of [a, b]) if (c.kind === 'rankcap' && d.goal?.kind === 'rank') expect(d.goal.n).toBeLessThanOrEqual(c.n);
      if (d.level < 4) expect([a.kind, b.kind]).not.toContain('noscrap');
    }
  });
  it('checks read the run stats', () => {
    const s = newLevel(LEVELS[30]);
    expect(contractMet({ kind: 'noscrap', n: 0 }, s)).toBe(true);
    s.stats.scraps = 1;
    expect(contractMet({ kind: 'noscrap', n: 0 }, s)).toBe(false);
    s.stats.biggestChain = 9;
    expect(contractMet({ kind: 'chain', n: 8 }, s)).toBe(true);
    s.stats.bestRank = 7;
    expect(contractMet({ kind: 'rankcap', n: 6 }, s)).toBe(false);
  });
});
