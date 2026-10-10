import { afterEach, describe, expect, it } from 'vitest';
import { allNewState, applyUnits } from '../src/content/experiments';
import { LEVELS } from '../src/content/levels';
import { FAMILY_INFO } from '../src/content/perks';
import { unitJob } from '../src/content/unitJobs';
import { TUNING } from '../src/content/tuning';
import { applyRoster1, applyRoster2, applyRoster3, applyRoster4, applyRoster5, applyRoster6, applyRoster7, STARTER_UNITS, UNITS, type CrateKind } from '../src/content/units';
import { crateOddsLines, KINDS_B, pityLines, pityView } from '../src/core/crateOdds';
import { openCrateB } from '../src/core/crates';
import { drop, legalPairs, newLevel, serialize, tick } from '../src/core/game';
import type { Family } from '../src/core/types';

const APPLY = [applyRoster1, applyRoster2, applyRoster3, applyRoster4, applyRoster5, applyRoster6, applyRoster7];
const allOn = (on: boolean) => {
  applyUnits(on ? 'rb' : 'off');
  APPLY.forEach((a) => a(on));
};
const FLAGS = () => [TUNING.roster1, TUNING.roster2, TUNING.roster3, TUNING.roster4, TUNING.roster5, TUNING.roster6, TUNING.roster7];

afterEach(() => allOn(false));

describe('QA ALL NEW UNITS row', () => {
  it('state is ON only when crates B and all 7 batches are on, OFF when none, MIXED otherwise', () => {
    expect(allNewState(false, [false, false, false, false, false, false, false])).toBe('off');
    expect(allNewState(true, [true, true, true, true, true, true, true])).toBe('on');
    expect(allNewState(true, [false, false, false, false, false, false, false])).toBe('mixed');
    expect(allNewState(false, [true, true, true, true, true, true, true])).toBe('mixed');
    expect(allNewState(true, [true, true, true, true, true, true, false])).toBe('mixed');
  });

  it('ALL ON then one batch off leaves the others on; ALL OFF clears all 8 flags', () => {
    allOn(true);
    expect(TUNING.rosterB).toBe(true);
    expect(FLAGS().every(Boolean)).toBe(true);
    const full = UNITS.length;
    applyRoster7(false);
    expect(allNewState(TUNING.rosterB, FLAGS())).toBe('mixed');
    expect(UNITS.length).toBe(full - 5);
    allOn(false);
    expect(TUNING.rosterB).toBe(false);
    expect(FLAGS().some(Boolean)).toBe(false);
    expect(UNITS).toHaveLength(13);
  });
});

describe('every new-unit flag on', () => {
  it('has 39 units, every unit has copy and a non-throwing job line for the Units tab / guide', () => {
    allOn(true);
    expect(UNITS).toHaveLength(39);
    for (const u of UNITS) {
      expect(FAMILY_INFO[u.id as keyof typeof FAMILY_INFO], u.id).toBeTruthy();
      expect(() => unitJob(u.id, 1), u.id).not.toThrow(); // batch 1 has no job line (pre-existing)
    }
  });

  it('all 4 crate tiers open without errors, show odds, and legendary units drop', () => {
    allOn(true);
    const seen = new Set<string>();
    const legend = new Set(UNITS.filter((u) => u.rarity === 'legendary').map((u) => u.id));
    expect(legend.size).toBeGreaterThan(0);
    for (const k of KINDS_B) {
      const odds = crateOddsLines(k as CrateKind, pityView({}));
      expect(odds.rows.length).toBeGreaterThan(0);
      expect(pityLines(pityView({})).length).toBeGreaterThan(0);
      for (let seed = 1; seed < 4000; seed++) {
        const owned = new Set<Family>(STARTER_UNITS);
        const r = openCrateB(k as CrateKind, owned, seed * 2654435761 >>> 0, { epic: 0, dry: 0, leg: 0 });
        expect(r.cards.length).toBeGreaterThan(0);
        for (const c of r.cards) seen.add(c.unit);
      }
    }
    expect([...legend].filter((id) => seen.has(id)).length).toBeGreaterThan(0);
  });

  it('seeded levels play to completion-ish without errors, deterministically', () => {
    allOn(true);
    const shooters = UNITS.filter((u) => u.slot === 'shooter').map((u) => u.id as Family);
    const relays = UNITS.filter((u) => u.slot === 'relay').map((u) => u.id as Family);
    const play = (seed: number) => {
      const s = newLevel(LEVELS[seed], { toys: [], relays: [relays[seed % relays.length], relays[(seed + 3) % relays.length]], shooter: shooters[seed % shooters.length] });
      s.hp = s.maxHp = 1e9;
      for (let i = 0; i < 40 && s.phase === 'playing'; i++) {
        for (let k = 0; k < 20; k++) tick(s);
        const pairs = legalPairs(s);
        if (!pairs.length) continue;
        const [a, b] = pairs[(i * 7 + seed) % pairs.length];
        drop(s, a, b, s.grid[a]!.id);
      }
      return serialize(s);
    };
    for (const seed of [0, 5, 12, 33]) expect(play(seed)).toBe(play(seed));
  }, 120000);
});
