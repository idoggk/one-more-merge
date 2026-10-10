import { describe, expect, it } from 'vitest';
import { Rng } from '../src/core/rng';
import { BOX_SIZE } from '../src/core/screw';
import { newObject, objectRules, reachableAny, solveObject, tapScrew, viewFor, type ObjectDef, type View } from '../src/core/screwObject';
import { addCards } from '../src/core/spareParts';
import { BELL, CANNON, COIL, dayUnit, pickedUnit, STAR_PEAK, TAKEN_APART_CARDS, THREE_STAR_MULT, YARD_OBJECTS, YARD_UNITS, yardReward, yardStars } from '../src/content/yardObjects';
import { UNITS, unitDef } from '../src/content/units';

const randomWinRate = (lvl: ObjectDef, runs = 200) => {
  let won = 0;
  for (let seed = 1; seed <= runs; seed++) {
    const r = new Rng(seed), st = newObject(lvl, objectRules());
    while (!st.won && !st.lost) {
      const free = lvl.screws.filter((s) => reachableAny(st, s.id));
      if (!free.length) break;
      const s = free[r.int(free.length)];
      tapScrew(st, s.id, viewFor(st, s.id) as View);
    }
    if (st.won) won++;
  }
  return won / runs;
};

describe('Screw Yard: unit objects (Cannon, Coil, Bell)', () => {
  it('every object is solvable with the exact solver and has whole boxes of screws', () => {
    for (const o of [CANNON, COIL, BELL]) {
      const sol = solveObject(o);
      expect(sol, o.id).not.toBeNull();
      expect(new Set(sol).size).toBe(o.screws.length);
      const per = [0, 0, 0, 0];
      for (const s of o.screws) per[s.color]++;
      for (const n of per) expect(n % BOX_SIZE).toBe(0);
      expect(o.queue.length * BOX_SIZE).toBe(o.screws.length);
      for (const b of o.blocks) expect(b.screws.length).toBeGreaterThan(0);
    }
  });

  it('screws wear their family colour: each unit object leads with its own colour', () => {
    const count = (o: ObjectDef, c: number) => o.screws.filter((s) => s.color === c).length;
    expect(count(CANNON, 0)).toBeGreaterThanOrEqual(count(CANNON, 3));
    expect(count(COIL, 1)).toBe(Math.max(...[0, 1, 2, 3].map((c) => count(COIL, c))));
    expect(count(BELL, 2)).toBe(Math.max(...[0, 1, 2, 3].map((c) => count(BELL, c))));
  });

  it('difficulty ramps Cannon < Coil < Bell (more screws, fewer random wins)', () => {
    expect(CANNON.screws.length).toBeLessThan(COIL.screws.length);
    expect(COIL.screws.length).toBeLessThan(BELL.screws.length);
    const [a, b, c] = [CANNON, COIL, BELL].map((o) => randomWinRate(o));
    expect(a).toBeGreaterThan(b);
    expect(b).toBeGreaterThanOrEqual(c);
  });

  it('the solver order plays out to a win', () => {
    for (const o of [CANNON, COIL, BELL]) {
      const st = newObject(o, objectRules());
      for (const sid of solveObject(o)!) expect(tapScrew(st, sid, viewFor(st, sid) as View).ok).toBe(true);
      expect(st.won).toBe(true);
      expect(st.fallen.every(Boolean)).toBe(true);
    }
  });

  it('the picker defaults to a rotation by day and covers all three', () => {
    expect(new Set([0, 1, 2].map((d) => dayUnit(d * 86400000))).size).toBe(3);
    expect(YARD_UNITS).toContain(pickedUnit(0));
    expect(YARD_UNITS.every((u) => YARD_OBJECTS[u].id === u)).toBe(true);
  });
});

describe('Screw Yard: TAKEN APART reward', () => {
  it('pays the matching unit, more for the harder object, doubled on 3 stars', () => {
    expect(TAKEN_APART_CARDS.cannon).toBe(3);
    expect(YARD_UNITS.every((u) => unitDef(u))).toBe(true);
    expect(yardReward('cannon', 1)).toBe(3);
    expect(yardReward('cannon', 3)).toBe(3 * THREE_STAR_MULT);
    expect(TAKEN_APART_CARDS.coil).toBeGreaterThan(TAKEN_APART_CARDS.cannon);
    expect(TAKEN_APART_CARDS.bell).toBeGreaterThan(TAKEN_APART_CARDS.coil);
  });

  it('stars come from the most screws that waited in the row', () => {
    expect(yardStars(0)).toBe(3);
    expect(yardStars(STAR_PEAK.three)).toBe(3);
    expect(yardStars(STAR_PEAK.three + 1)).toBe(2);
    expect(yardStars(STAR_PEAK.two + 1)).toBe(1);
  });

  it('a Cannon clear grants Cannon cards through the collection and touches no other unit', () => {
    const m = { units: { cannon: { level: 2, cards: 1 }, coil: { level: 1, cards: 0 } }, toys: {} as Record<string, boolean> };
    addCards(m, [{ unit: 'cannon', count: yardReward('cannon', 1) }]);
    expect(m.units.cannon.cards).toBe(4);
    expect(m.units.coil).toEqual({ level: 1, cards: 0 });
    addCards(m, [{ unit: 'cannon', count: yardReward('cannon', 3) }]);
    expect(m.units.cannon.cards).toBe(10);
  });

  it('an old save with no collection yet loads and gets the unit unlocked with the rest as cards', () => {
    const old: Record<string, unknown> = { bolts: 5 }; // pre-collection shape: no units, no spare, no toys
    addCards(old as never, [{ unit: 'bell', count: 5 }]);
    expect((old.units as Record<string, { level: number; cards: number }>).bell).toEqual({ level: 1, cards: 4 });
    expect(old.bolts).toBe(5);
    expect(Object.keys(old).sort()).toEqual(['bolts', 'units']);
  });

  it('every pickable unit exists in the roster', () => {
    for (const u of YARD_UNITS) expect(UNITS.some((d) => d.id === u)).toBe(true);
  });
});
