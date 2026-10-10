// t-c78bf16f: the chapter unlock plan (docs/ROSTER.md section 6, TUNING.rosterUnlocks): gifts on their levels, crate tiers by chapter,
// the crate pool gated by rarity, and flag OFF = today's rolls.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { LEVELS } from '../src/content/levels';
import { TUNING } from '../src/content/tuning';
import { TIER_OPEN_LEVEL, UNIT_GIFTS } from '../src/content/unlockPlan';
import { applyRoster1, applyRoster2, applyRoster3, applyRoster7, rebuildUnits, RARITY_ORDER, STARTER_UNITS, UNITS, type CrateKind, type Rarity } from '../src/content/units';
import { rollCrate, type PityState } from '../src/core/crates';
import { clampCrate, clearedLevel, firstGoodHere, grantGifts, liftToOpen, openRarities, tierOpen, type PlanSave } from '../src/core/unlockPlan';
import type { Family } from '../src/core/types';

const batches = (on: boolean) => {
  applyRoster1(on);
  applyRoster2(on);
  applyRoster3(on);
  applyRoster7(on);
};
beforeEach(() => batches(true));
afterEach(() => {
  batches(false);
  TUNING.rosterB = false;
  TUNING.rosterUnlocks = false;
  rebuildUnits();
});

const stars = (n: number) => Object.fromEntries(Array.from({ length: n }, (_, i) => [String(i + 1), 2]));
const starters = () => Object.fromEntries(STARTER_UNITS.map((u) => [u, { level: 1, cards: 0 }]));
const save = (cleared: number): PlanSave => ({ levelStars: stars(cleared), units: starters(), toys: {} });
const rarityOf = (f: string) => UNITS.find((u) => u.id === f)!.rarity;
const fresh = (): PityState => ({ epic: 0, dry: 0, leg: 0 });
const seedOf = (i: number) => (i * 2654435761) >>> 0;

describe('plan data vs levels.json', () => {
  it('the flag is off by default', () => {
    expect(TUNING.rosterUnlocks).toBe(false);
  });
  it('8 chapters x 10 levels; every boss gift and tier opens on a boss level, ordinary gifts on an ordinary level', () => {
    expect(LEVELS).toHaveLength(80);
    for (const g of UNIT_GIFTS) {
      expect(g.level).toBeGreaterThanOrEqual(10);
      expect(g.level).toBeLessThanOrEqual(50); // no gifts after chapter 5
      expect(LEVELS[g.level - 1].level).toBe(g.level);
    }
    for (const k of Object.keys(TIER_OPEN_LEVEL) as CrateKind[]) expect(LEVELS[TIER_OPEN_LEVEL[k] - 1].boss_node).toBe(true);
    expect(UNIT_GIFTS.filter((g) => LEVELS[g.level - 1].boss_node).map((g) => g.level)).toEqual([10, 20, 30, 40, 50]);
    expect(UNIT_GIFTS.filter((g) => !LEVELS[g.level - 1].boss_node).map((g) => g.level)).toEqual([13, 25, 35]);
  });
  it('the gifts are exactly the written plan', () => {
    expect(UNIT_GIFTS.map((g) => [g.level, g.unit])).toEqual([[10, 'nail_gun'], [13, 'wrench'], [20, 'jackhammer'], [25, 'gear'], [30, 'saw_blade'], [35, 'blowtorch'], [40, 'blast_plate'], [50, 'signal_beacon']]);
  });
});

describe('gifts on their levels', () => {
  it('nothing new in levels 2-6 (or before level 10)', () => {
    for (let n = 0; n < 10; n++) {
      const m = save(n);
      expect(grantGifts(m)).toEqual([]);
      expect(m.gifts).toBeUndefined();
    }
  });

  for (const g of UNIT_GIFTS) {
    it(`level ${g.level} hands over ${g.unit} once, and not a level earlier`, () => {
      TUNING.rosterB = true; // Signal Beacon is Legendary here; the gift works either way
      rebuildUnits();
      const before = save(g.level - 1);
      for (const r of grantGifts(before)) expect(r.gift.level).toBeLessThan(g.level);
      expect(before.units![g.unit]).toBeUndefined();
      const m = save(g.level);
      // every earlier gift was already given (a player who plays in order)
      for (const e of UNIT_GIFTS.filter((x) => x.level < g.level)) m.gifts = { ...(m.gifts ?? {}), [e.unit]: true };
      const got = grantGifts(m);
      expect(got.map((r) => [r.gift.unit, r.isNew])).toEqual([[g.unit, true]]);
      expect(m.units![g.unit]).toEqual({ level: 1, cards: 0 });
      expect(m.gifts![g.unit]).toBe(true);
      expect(grantGifts(m)).toEqual([]); // tracked: never twice
    });
  }

  it('a unit already owned stays owned (level and cards kept), the gift is only marked given', () => {
    const m = save(20);
    m.units!.nail_gun = { level: 4, cards: 7 };
    const got = grantGifts(m);
    expect(got.find((r) => r.gift.unit === 'nail_gun')).toMatchObject({ isNew: false });
    expect(m.units!.nail_gun).toEqual({ level: 4, cards: 7 });
    expect(m.gifts!.nail_gun).toBe(true);
    expect(got.filter((r) => r.isNew).map((r) => r.gift.unit)).toEqual(['wrench', 'jackhammer']);
  });

  it('a helper gift also opens its toy slot', () => {
    const m = save(13);
    m.gifts = { nail_gun: true };
    grantGifts(m);
    expect(m.toys!.wrench).toBe(false);
  });

  it('a unit whose batch is off is not given or tracked; it arrives when the batch comes on', () => {
    applyRoster2(false); // Wrench
    const m = save(13);
    expect(grantGifts(m).map((r) => r.gift.unit)).toEqual(['nail_gun']);
    expect(m.gifts!.wrench).toBeUndefined();
    applyRoster2(true);
    expect(grantGifts(m).map((r) => r.gift.unit)).toEqual(['wrench']);
  });

  it('every gift shows a GOOD HERE line: the first matching level at or after the gift, or its own tip', () => {
    TUNING.rosterB = true;
    rebuildUnits();
    for (const g of UNIT_GIFTS) {
      const f = firstGoodHere(g);
      if (f) {
        expect(f.level).toBeGreaterThanOrEqual(g.level);
        expect(f.text.length).toBeGreaterThan(0);
      } else expect(g.tip.length).toBeGreaterThan(5);
    }
  });
});

describe('crate tiers', () => {
  it('Tool Bag opens at L10, Toolbox L20, Tool Chest L30, Golden Workbench L50', () => {
    expect(TIER_OPEN_LEVEL).toEqual({ wood: 10, iron: 20, gold: 30, bench: 50 });
    expect(tierOpen('wood', 9)).toBe(false);
    expect(tierOpen('wood', 10)).toBe(true);
    expect(tierOpen('iron', 19)).toBe(false);
    expect(tierOpen('iron', 20)).toBe(true);
    expect(tierOpen('gold', 29)).toBe(false);
    expect(tierOpen('bench', 49)).toBe(false);
    expect(tierOpen('bench', 50)).toBe(true);
  });
  it('a reward is clamped to the highest open tier; nothing is given while none is open', () => {
    expect(clampCrate('wood', 9)).toBeNull();
    expect(clampCrate('gold', 9)).toBeNull();
    expect(clampCrate('gold', 10)).toBe('wood'); // the L10 boss gives a Tool Bag
    expect(clampCrate('gold', 20)).toBe('iron'); // the L20 boss: Toolbox opens
    expect(clampCrate('gold', 30)).toBe('gold');
    expect(clampCrate('iron', 10)).toBe('wood');
    expect(clampCrate('bench', 49)).toBe('gold');
    expect(clampCrate('bench', 50)).toBe('bench');
    expect(clearedLevel({ '3': 2, '12': 1, '40': 0 })).toBe(12);
    expect(clearedLevel(undefined)).toBe(0);
  });
});

describe('the crate pool follows the open tiers', () => {
  const rarities = (cleared: number) => [...openRarities(cleared)].sort((a, b) => RARITY_ORDER.indexOf(a) - RARITY_ORDER.indexOf(b));

  it('without crates B no tier drops Legendary; with crates B a Legendary needs a Toolbox or better', () => {
    expect(rarities(0)).toEqual(['common']);
    expect(rarities(10)).toEqual(['common', 'rare', 'epic']);
    expect(rarities(50)).toEqual(['common', 'rare', 'epic']);
    TUNING.rosterB = true;
    rebuildUnits();
    expect(rarities(10)).toEqual(['common', 'rare', 'epic']); // Tool Bag: 0% Legendary
    expect(rarities(20)).toEqual(RARITY_ORDER);
  });

  it('closed rarities roll down to the best open one', () => {
    expect(liftToOpen('legendary', new Set<Rarity>(['common', 'rare']))).toBe('rare');
    expect(liftToOpen('epic', new Set<Rarity>(['common']))).toBe('common');
    expect(liftToOpen('rare', new Set<Rarity>(['common', 'rare', 'epic']))).toBe('rare');
  });

  for (const rb of [false, true]) {
    it(`over thousands of crates no unit of a closed rarity drops (crates B ${rb ? 'on' : 'off'})`, () => {
      TUNING.rosterB = rb;
      rebuildUnits();
      const owned = new Set<Family>(STARTER_UNITS);
      const kinds: CrateKind[] = rb ? ['wood', 'iron', 'gold', 'bench'] : ['wood', 'iron', 'gold'];
      for (const cleared of [0, 10, 20, 30, 50]) {
        const open = openRarities(cleared);
        const pity = fresh();
        for (let i = 0; i < 400; i++) {
          const kind = kinds[i % kinds.length];
          if (kind === 'bench' && !tierOpen('bench', cleared)) continue; // a closed tier gives no crate (giveCrate clamps), but a rolled one still obeys the pool
          for (const c of rollCrate(kind, owned, seedOf(i + 1), pity, open)) expect(open.has(rarityOf(c.unit))).toBe(true);
        }
      }
    });
  }

  it('a unit drops only when its batch is on AND its rarity is open', () => {
    const owned = new Set<Family>(STARTER_UNITS);
    const seen = new Set<string>();
    const open = openRarities(10); // common / rare / epic
    for (let i = 0; i < 600; i++) for (const c of rollCrate('gold', owned, seedOf(i + 7), fresh(), open)) seen.add(c.unit);
    expect(seen.has('nail_gun')).toBe(true); // Common, batch 1 on
    expect(seen.has('jackhammer')).toBe(true); // Rare
    expect(seen.has('saw_blade')).toBe(true); // Epic
    applyRoster1(false);
    const seen2 = new Set<string>();
    for (let i = 0; i < 600; i++) for (const c of rollCrate('gold', owned, seedOf(i + 7), fresh(), open)) seen2.add(c.unit);
    expect(seen2.has('nail_gun') || seen2.has('jackhammer') || seen2.has('saw_blade')).toBe(false);
    TUNING.rosterB = true;
    rebuildUnits();
    const legend = new Set<string>();
    for (let i = 0; i < 600; i++) for (const c of rollCrate('gold', owned, seedOf(i + 7), fresh(), openRarities(10))) legend.add(c.unit);
    expect([...legend].some((u) => rarityOf(u) === 'legendary')).toBe(false); // Tool Chest is not open at L10
    const legend30: string[] = [];
    for (let i = 0; i < 600; i++) for (const c of rollCrate('gold', owned, seedOf(i + 7), fresh(), openRarities(30))) legend30.push(c.unit);
    expect(legend30.some((u) => rarityOf(u) === 'legendary')).toBe(true);
  });

  it('a crate with every rarity open rolls exactly like today (flag OFF = same cards)', () => {
    for (const rb of [false, true]) {
      TUNING.rosterB = rb;
      rebuildUnits();
      const owned = new Set<Family>(STARTER_UNITS);
      const all = new Set<Rarity>(RARITY_ORDER);
      for (const kind of ['wood', 'iron', 'gold'] as CrateKind[]) {
        for (let i = 0; i < 60; i++) {
          const p1 = { epic: i % 7, dry: i % 4, leg: i % 30 }, p2 = { ...p1 };
          expect(rollCrate(kind, owned, seedOf(i + 3), p1, all)).toEqual(rollCrate(kind, owned, seedOf(i + 3), p2));
          expect(p1).toEqual(p2);
        }
      }
    }
  });

  it('a rarity that cannot drop yet never moves its pity counter', () => {
    TUNING.rosterB = true;
    rebuildUnits();
    const owned = new Set<Family>(STARTER_UNITS);
    const pity = fresh();
    for (let i = 0; i < 30; i++) rollCrate('wood', owned, seedOf(i + 1), pity, new Set<Rarity>(['common']));
    expect([pity.epic, pity.leg]).toEqual([0, 0]);
  });
});
