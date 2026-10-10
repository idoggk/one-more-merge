import { afterEach, describe, expect, it } from 'vitest';
import raw from '../src/content/puzzles.json';
import { storedRosterB } from '../src/content/experiments';
import { LEVELS } from '../src/content/levels';
import { FAMILY_INFO } from '../src/content/perks';
import { goodHereText, ROSTER_1_INFO } from '../src/content/roster1';
import { TUNING } from '../src/content/tuning';
import { applyRoster1, UNIT_PERKS, unitDef, UNITS } from '../src/content/units';
import { resolveCascade, type CascadeOpts } from '../src/core/cascade';
import { rollCrate } from '../src/core/crates';
import { armorOf, drop, newLevel, newPuzzle, type PuzzleDef } from '../src/core/game';
import { ROSTER_1, type Family, type Gadget, type Grid } from '../src/core/types';

let id = 9800;
const g = (family: Family, rank = 1): Gadget => ({ id: id++, family, rank, cd: 99 });
const board = (cells: [number, Gadget][]) => {
  const grid: Grid = Array(30).fill(null);
  for (const [i, x] of cells) grid[i] = x;
  return grid;
};
const run = (grid: Grid, root: number, o: Partial<CascadeOpts> = {}) => resolveCascade(grid, root, { perks: [], overdrive: false, ...o });
const hit = (r: ReturnType<typeof run>, f: Family) => r.activations.find((a) => a.family === f)!.contribution;
const NEW = ROSTER_1 as string[];

afterEach(() => applyRoster1(false));

describe('t-9b28a794 roster B batch 1: flag', () => {
  it('OFF by default: no new unit in the collection, crates or squad pickers; GOOD HERE silent', () => {
    expect(TUNING.roster1).toBe(false);
    expect(UNITS).toHaveLength(13);
    expect(UNITS.some((u) => NEW.includes(u.id))).toBe(false);
    for (const f of ROSTER_1) expect(unitDef(f)).toBeUndefined();
    const owned = new Set<Family>(['cannon', 'coil', 'bell', 'fan']);
    for (let seed = 1; seed < 300; seed++) for (const c of rollCrate('gold', owned, seed)) expect(NEW).not.toContain(c.unit);
    const shieldLevel = LEVELS.find((d) => d.behaviour === 'shield')!;
    expect(goodHereText(shieldLevel, () => true)).toBe('');
    expect([storedRosterB(() => null), storedRosterB(() => 'on'), storedRosterB(() => { throw new Error('x'); })]).toEqual([false, true, false]);
  });

  it('ON: the 4 join UNITS sorted by rarity, drop from crates, and OFF restores the exact old list', () => {
    const before = UNITS.map((u) => u.id);
    applyRoster1(true);
    expect(TUNING.roster1).toBe(true);
    expect(UNITS).toHaveLength(17);
    expect(Object.fromEntries(ROSTER_1.map((f) => [f, unitDef(f)!.rarity]))).toEqual({ nail_gun: 'common', drill: 'rare', gear: 'rare', saw_blade: 'epic' });
    expect(unitDef('gear')!.slot).toBe('relay');
    const order = ['common', 'rare', 'epic'];
    expect(UNITS.map((u) => order.indexOf(u.rarity))).toEqual([...UNITS.map((u) => order.indexOf(u.rarity))].sort());
    const owned = new Set(before as Family[]);
    const got = new Set<string>();
    for (let seed = 1; seed < 200; seed++) for (const c of rollCrate('gold', owned, seed)) got.add(c.unit);
    for (const f of ROSTER_1) expect(got.has(f), f).toBe(true);
    applyRoster1(false);
    expect(UNITS.map((u) => u.id)).toEqual(before);
  });

  it('copy: role, job word, WHEN MERGED line, L3 / L6 / L9 job upgrades for each', () => {
    const jobs = { nail_gun: 'ROW', drill: 'ARMOR', gear: 'LINK', saw_blade: 'EDGE' };
    for (const f of ROSTER_1) {
      expect(ROSTER_1_INFO[f].job).toBe(jobs[f]);
      expect(FAMILY_INFO[f].text.startsWith(`${jobs[f]}:`)).toBe(true);
      expect(ROSTER_1_INFO[f].whenMerged).toMatch(/^WHEN MERGED: /);
      expect(UNIT_PERKS[f]).toHaveLength(3);
    }
    expect(FAMILY_INFO.gear.role).toBe('RELAY');
  });

  it('GOOD HERE names an owned unit that suits the level (only with the flag)', () => {
    applyRoster1(true);
    const shield = LEVELS.find((d) => d.behaviour === 'shield')!;
    expect(goodHereText(shield, (u) => u === 'drill')).toMatch(/^GOOD HERE: DRILL \(it ignores the shield\)/);
    expect(goodHereText(shield, () => false)).toBe('');
    const boss = LEVELS.find((d) => d.level === 30)!;
    expect(goodHereText(boss, (u) => u === 'drill')).toContain('x2 on the boss');
    const split = LEVELS.find((d) => d.behaviour === 'split');
    if (split) expect(goodHereText(split, (u) => u === 'gear')).toContain('GEAR');
  });
});

describe('t-9b28a794 roster B batch 1: jobs', () => {
  it('Nail Gun ROW: +20% per other filled cell in its row', () => {
    const base = TUNING.base.nail_gun;
    expect(hit(run(board([[12, g('nail_gun')]]), 12), 'nail_gun')).toBeCloseTo(base);
    expect(hit(run(board([[12, g('nail_gun')], [10, g('bell')], [11, g('cannon')], [13, g('coil')]]), 12), 'nail_gun')).toBeCloseTo(base * 1.6);
    const full = run(board([[12, g('nail_gun')], [10, g('bell')], [11, g('cannon')], [13, g('coil')], [14, g('cannon')]]), 12);
    expect(hit(full, 'nail_gun')).toBeCloseTo(base * 1.8);
    // L6 Side Feed: the parts right above and below count too
    const side = board([[12, g('nail_gun')], [7, g('coil')], [17, g('bell')]]);
    expect(hit(run(side, 12, { unitLevel: { nail_gun: 6 } }), 'nail_gun') / hit(run(side, 12), 'nail_gun')).toBeCloseTo(1.4);
  });

  it('Drill ARMOR: x2 vs a boss; Pilot Hole (L6) counts special-move monsters; the game knows which is which', () => {
    const b = () => board([[12, g('drill')]]);
    const d = TUNING.base.drill;
    expect(hit(run(b(), 12), 'drill')).toBeCloseTo(d);
    expect(hit(run(b(), 12, { armor: 2 }), 'drill')).toBeCloseTo(d * 2);
    expect(hit(run(b(), 12, { armor: 1 }), 'drill')).toBeCloseTo(d);
    expect(hit(run(b(), 12, { armor: 1, unitLevel: { drill: 6 } }), 'drill')).toBeCloseTo(d * 2);
    expect(hit(run(board([[12, g('cannon')]]), 12, { armor: 2 }), 'cannon')).toBeCloseTo(TUNING.base.cannon); // only the Drill
    const plain = newLevel(LEVELS.find((x) => !x.behaviour && x.level % 10 && !x.mini_boss && !x.teach)!);
    expect(armorOf(plain)).toBe(0);
    expect(armorOf(newLevel(LEVELS.find((x) => x.behaviour === 'shield')!))).toBe(1);
    // a boss stage's minions are not armored; the boss is, once it walks in
    const l30 = newLevel(LEVELS.find((x) => x.level === 30)!);
    expect(armorOf(l30)).toBe(l30.boss ? 2 : 0);
    plain.boss = { def: 0, next: 0, pending: null, active: null, phaseShown: 0 };
    expect(armorOf(plain)).toBe(2);
    plain.boss.light = true;
    expect(armorOf(plain)).toBe(1);
  });

  it('Drill ignores a closed shield; other shooters still lose a quarter', () => {
    const dmg = (fam: Family, shield: boolean) => {
      const p: PuzzleDef = { id: 't', moves: 1, hp: 1e6, board: [[fam, 1, 0, 0], [fam, 1, 0, 1]], solution: [], ...(shield ? { shield: true } : {}) };
      const s = newPuzzle(p);
      const r = drop(s, 0, 1, s.grid[0]!.id);
      expect(r.ok).toBe(true);
      return 1e6 - s.hp;
    };
    expect(dmg('drill', true)).toBe(dmg('drill', false));
    expect(dmg('rocket', true)).toBeLessThan(dmg('rocket', false) * 0.8);
  });

  it('Saw Blade EDGE: x1.5 on the outer ring, x0.7 inside; L9 corners x2.2 at rank 7', () => {
    const s = TUNING.base.saw_blade;
    expect(hit(run(board([[0, g('saw_blade')]]), 0), 'saw_blade')).toBeCloseTo(s * 1.5);
    expect(hit(run(board([[9, g('saw_blade')]]), 9), 'saw_blade')).toBeCloseTo(s * 1.5);
    expect(hit(run(board([[12, g('saw_blade')]]), 12), 'saw_blade')).toBeCloseTo(s * 0.7);
    const top = run(board([[0, g('saw_blade', 7)]]), 0, { unitLevel: { saw_blade: 9 } });
    expect(top.activations[0].contribution / (s * Math.pow(TUNING.rankMult, 6))).toBeCloseTo(2.2);
  });

  it('Gear LINK: only a MERGED Gear jumps the chain (a woken one just wakes its neighbours), to the 2 farthest Gears', () => {
    // the merge lands on a cannon at 0; the Gear at 1 is only woken: no jump to the Gear at 29
    const woken = run(board([[0, g('cannon', 2)], [1, g('gear')], [29, g('gear')], [28, g('cannon')]]), 0);
    expect(woken.activations.map((x) => x.idx).sort((x, y) => x - y)).toEqual([0, 1]);
    // four Gears: the merged one jumps to the two farthest (29: 9 cells, 25: 5 cells); 4 (4 cells) stays asleep,
    // and the linked Gears were only woken, so they jump no further
    const four = run(board([[0, g('gear', 2)], [29, g('gear')], [25, g('gear')], [4, g('gear')]]), 0);
    expect(four.edges.filter((e) => e.kind === 'gear').map((e) => [e.from, e.to])).toEqual([[0, 29], [0, 25]]);
    expect(four.count).toBe(3);
  });

  it('Gear LINK: any two Gears pass the chain anywhere (even across the divider); each machine still fires once', () => {
    const a = g('gear', 2), b = g('gear'), near = g('cannon'), far = g('cannon');
    const r = run(board([[0, a], [29, b], [1, near], [28, far]]), 0);
    expect(r.activations.map((x) => x.id).sort()).toEqual([a.id, b.id, near.id, far.id].sort());
    expect(r.edges).toContainEqual({ from: 0, to: 29, kind: 'gear' });
    // a Coil in the far corner instead: no link, the far cannon sleeps
    expect(run(board([[0, g('gear', 2)], [29, g('coil')], [1, g('cannon')], [28, g('cannon')]]), 0).count).toBe(2);
    // Junkzilla's divider blocks touching wakes across it, never a Gear link
    const split = run(board([[0, g('gear')], [4, g('gear')], [3, g('cannon')]]), 0, { splitB: 1 });
    expect(split.activations.map((x) => x.idx).sort((x, y) => x - y)).toEqual([0, 3, 4]);
    // three Gears, all linked to each other: each activates exactly once
    const tri = run(board([[0, g('gear')], [14, g('gear')], [27, g('gear')], [19, g('cannon')]]), 0);
    expect(tri.count).toBe(4);
    expect(new Set(tri.activations.map((x) => x.id)).size).toBe(4);
  });

  it('Gear L3 Big Teeth: rank 4+ also wakes its diagonals', () => {
    const grid = () => board([[12, g('gear', 4)], [6, g('cannon')]]);
    expect(run(grid(), 12).count).toBe(1);
    expect(run(grid(), 12, { unitLevel: { gear: 3 } }).count).toBe(2);
  });
});

describe('t-9b28a794 roster B batch 1: drills', () => {
  const data = raw as unknown as { drills: Record<string, PuzzleDef[]> };
  it('3 drills per new unit, built around it; Drill drills put a shield on the machine', () => {
    for (const f of ROSTER_1) {
      expect(data.drills[f], f).toHaveLength(3);
      for (const p of data.drills[f]) {
        expect(p.unit).toBe(f);
        expect(p.board.some(([fam]) => fam === f)).toBe(true);
        expect(!!p.shield, p.id).toBe(f === 'drill');
      }
    }
  });
});
