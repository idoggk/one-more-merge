import { describe, expect, it } from 'vitest';
import { CRATES, cardsFor, levelMult, UNITS } from '../src/content/units';
import { rollCrate } from '../src/core/crates';
import type { Family } from '../src/core/types';

describe('r32 unit collection', () => {
  it('crates hold their card count, honour rare minimums and are reproducible', () => {
    const owned = new Set<Family>(['cannon', 'coil', 'bell']);
    for (const kind of ['wood', 'iron', 'gold'] as const) {
      const a = rollCrate(kind, owned, 1234), b = rollCrate(kind, owned, 1234);
      expect(a).toEqual(b);
      expect(a.reduce((n, c) => n + c.count, 0)).toBe(CRATES[kind].cards);
      const rares = a.filter((c) => UNITS.find((u) => u.id === c.unit)!.rarity !== 'common').reduce((n, c) => n + c.count, 0);
      expect(rares).toBeGreaterThanOrEqual(CRATES[kind].rareMin);
    }
  });
  it('a crate with a rare slot brings a missing rare unit first (early guarantee)', () => {
    const owned = new Set<Family>(['cannon', 'coil', 'bell']);
    const r = rollCrate('iron', owned, 77);
    expect(r.some((c) => c.isNew)).toBe(true);
  });
  it('rarer units need fewer duplicates; levels raise damage', () => {
    const cannon = UNITS.find((u) => u.id === 'cannon')!, rocket = UNITS.find((u) => u.id === 'rocket')!;
    expect(cardsFor(rocket, 3)).toBeLessThan(cardsFor(cannon, 3));
    expect(levelMult(cannon, 1)).toBe(1);
    expect(levelMult(cannon, 10)).toBeCloseTo(1.36);
    expect(levelMult(UNITS.find((u) => u.id === 'coil')!, 10)).toBeCloseTo(1.18);
  });
});

import { featuredGemUnit, rollFeatured } from '../src/core/crates';
import { FEATURED_CRATE, STARTER_UNITS } from '../src/content/units';
describe('r40 featured crate', () => {
  it('rotates every 48 h among non-starters and guarantees a copy within the pity', () => {
    expect(featuredGemUnit(100)).toBe(featuredGemUnit(101));
    expect(STARTER_UNITS.includes(featuredGemUnit(100))).toBe(false);
    const owned = new Set(STARTER_UNITS);
    for (let seed = 1; seed < 40; seed++) {
      const pity = { epic: 0, dry: 0, featured: 0 };
      let got = -1;
      for (let k = 0; k < FEATURED_CRATE.pity && got < 0; k++) if (rollFeatured(owned, seed * 97 + k, 'arc_welder', pity).some((c) => c.unit === 'arc_welder')) got = k;
      expect(got).toBeGreaterThanOrEqual(0);
    }
  });
});
