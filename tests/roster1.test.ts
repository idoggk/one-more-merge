import { afterEach, describe, expect, it } from 'vitest';
import raw from '../src/content/puzzles.json';
import { storedRoster1 } from '../src/content/experiments';
import { LEVELS } from '../src/content/levels';
import { FAMILY_INFO } from '../src/content/perks';
import { goodHereText, ROSTER_1_INFO } from '../src/content/roster1';
import { TUNING } from '../src/content/tuning';
import { applyRoster1, UNIT_PERKS, unitDef, UNITS } from '../src/content/units';
import { resolveCascade, type CascadeOpts } from '../src/core/cascade';
import { rollCrate } from '../src/core/crates';
import { drop, newPuzzle, type PuzzleDef } from '../src/core/game';
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

describe('t-9b28a794 roster 1: flag', () => {
  it('OFF by default: no new unit in the collection, crates or squad pickers; GOOD HERE silent', () => {
    expect(TUNING.roster1).toBe(false);
    expect(UNITS).toHaveLength(13);
    expect(UNITS.some((u) => NEW.includes(u.id))).toBe(false);
    for (const f of ROSTER_1) expect(unitDef(f)).toBeUndefined();
    const owned = new Set<Family>(['cannon', 'coil', 'bell', 'fan']);
    for (let seed = 1; seed < 300; seed++) for (const c of rollCrate('gold', owned, seed)) expect(NEW).not.toContain(c.unit);
    const shieldLevel = LEVELS.find((d) => d.behaviour === 'shield')!;
    expect(goodHereText(shieldLevel, () => true)).toBe('');
    expect([storedRoster1(() => null), storedRoster1(() => 'on'), storedRoster1(() => { throw new Error('x'); })]).toEqual([false, true, false]);
  });

  it('ON: the 4 join UNITS sorted by rarity, drop from crates, and OFF restores the exact old list', () => {
    const before = UNITS.map((u) => u.id);
    applyRoster1(true);
    expect(TUNING.roster1).toBe(true);
    expect(UNITS).toHaveLength(17);
    expect(Object.fromEntries(ROSTER_1.map((f) => [f, unitDef(f)!.rarity]))).toEqual({ nail_gun: 'common', jackhammer: 'rare', gear: 'rare', saw_blade: 'epic' });
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
    const jobs = { nail_gun: 'ROW', jackhammer: 'BYPASS', gear: 'LINK', saw_blade: 'EDGE' };
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
    expect(goodHereText(shield, (u) => u === 'jackhammer')).toMatch(/^GOOD HERE: JACKHAMMER \(it ignores the shield\)/);
    expect(goodHereText(shield, () => false)).toBe('');
    const split = LEVELS.find((d) => d.behaviour === 'split');
    if (split) expect(goodHereText(split, (u) => u === 'gear')).toContain('GEAR');
  });
});

describe('t-9b28a794 roster 1: jobs', () => {
  it('Nail Gun ROW: +20% per other filled cell in its row, max x1.8 (x2.2 at L9 with its column)', () => {
    const base = TUNING.base.nail_gun;
    expect(hit(run(board([[12, g('nail_gun')]]), 12), 'nail_gun')).toBeCloseTo(base);
    expect(hit(run(board([[12, g('nail_gun')], [10, g('bell')], [11, g('cannon')], [13, g('coil')]]), 12), 'nail_gun')).toBeCloseTo(base * 1.6);
    const row = [[12, g('nail_gun')], [10, g('bell')], [11, g('cannon')], [13, g('coil')], [14, g('cannon')]] as [number, Gadget][];
    expect(hit(run(board(row), 12), 'nail_gun')).toBeCloseTo(base * 1.8);
    // L3 / L6 only strip armor pips (no pip model yet): no damage past the cap
    for (const level of [3, 6]) expect(hit(run(board(row), 12, { unitLevel: { nail_gun: level } }), 'nail_gun')).toBeCloseTo(base * 1.8);
    // a full row plus column cells: x1.8 until L9, where columns count and the cap is x2.2
    const plus = board([...row, [7, g('coil')], [17, g('bell')], [2, g('coil')], [22, g('bell')]]);
    expect(hit(run(plus, 12), 'nail_gun')).toBeCloseTo(base * 1.8);
    expect(hit(run(plus, 12, { unitLevel: { nail_gun: 9 } }), 'nail_gun')).toBeCloseTo(base * 2.2);
    const col = board([[12, g('nail_gun')], [7, g('coil')], [17, g('bell')]]);
    expect(hit(run(col, 12, { unitLevel: { nail_gun: 9 } }), 'nail_gun')).toBeCloseTo(base * 1.4);
    expect(hit(run(col, 12, { unitLevel: { nail_gun: 6 } }), 'nail_gun')).toBeCloseTo(base);
  });

  it('Jackhammer BYPASS: no hit multiplier of its own; every 4th hit x1.5 from L6 (every 3rd at rank 7-8, L9)', () => {
    const d = TUNING.base.jackhammer;
    const swing = (level: number, rank: number, fireBase: number) =>
      hit(run(board([[12, g('jackhammer', rank)]]), 12, { unitLevel: { jackhammer: level }, fireBase: { jackhammer: fireBase } }), 'jackhammer') / (d * Math.pow(TUNING.rankMult, rank - 1));
    expect(swing(1, 1, 3)).toBeCloseTo(1);
    expect(swing(5, 1, 3)).toBeCloseTo(1);
    expect(swing(6, 1, 2)).toBeCloseTo(1);
    expect(swing(6, 1, 3)).toBeCloseTo(1.5); // this is its 4th hit
    expect(swing(6, 1, 5)).toBeCloseTo(1);
    expect(swing(9, 7, 2)).toBeCloseTo(1.5); // its 3rd hit at rank 7
    expect(swing(9, 1, 2)).toBeCloseTo(1);
  });

  it('Jackhammer ignores a closed shield (L3: and hits x1.3 while it is closed); other shooters still lose a quarter', () => {
    const dmg = (fam: Family, shield: boolean, level = 1) => {
      const p: PuzzleDef = { id: 't', moves: 1, hp: 1e6, board: [[fam, 1, 0, 0], [fam, 1, 0, 1]], solution: [], ...(shield ? { shield: true } : {}) };
      const s = newPuzzle(p);
      s.unitLevel = { [fam]: level };
      const r = drop(s, 0, 1, s.grid[0]!.id);
      expect(r.ok).toBe(true);
      return 1e6 - s.hp;
    };
    expect(dmg('jackhammer', true)).toBe(dmg('jackhammer', false));
    expect(dmg('jackhammer', true, 3) / dmg('jackhammer', false, 3)).toBeCloseTo(1.3, 1);
    expect(dmg('rocket', true)).toBeLessThan(dmg('rocket', false) * 0.8);
  });

  it('Saw Blade EDGE: x1.5 on the outer ring, x0.7 inside; L3 x1.6; L6 corners x1.25 more inside the +72% cap; L9 inside x0.85', () => {
    const s = TUNING.base.saw_blade;
    const at = (idx: number, level: number) => hit(run(board([[idx, g('saw_blade')]]), idx, { unitLevel: { saw_blade: level } }), 'saw_blade') / s;
    expect(at(0, 1)).toBeCloseTo(1.5);
    expect(at(9, 1)).toBeCloseTo(1.5);
    expect(at(12, 1)).toBeCloseTo(0.7);
    expect(at(9, 3)).toBeCloseTo(1.6);
    expect(at(12, 3)).toBeCloseTo(0.7);
    expect(at(0, 6)).toBeCloseTo(1.72); // 1.6 x 1.25 = 2.0, cut to the cap
    expect(at(9, 6)).toBeCloseTo(1.6); // an edge cell that is not a corner
    expect(at(12, 9)).toBeCloseTo(0.85);
    for (const idx of [0, 4, 9, 12, 25, 29]) for (const level of [1, 3, 6, 9]) expect(at(idx, level)).toBeLessThanOrEqual(1.72 + 1e-9);
  });

  it('Gear LINK: only a MERGED Gear jumps the chain, to the farthest other Gear (2 from L6)', () => {
    // the merge lands on a cannon at 0; the Gear at 1 is only woken: no jump to the Gear at 29
    const woken = run(board([[0, g('cannon', 2)], [1, g('gear')], [29, g('gear')], [28, g('cannon')]]), 0);
    expect(woken.activations.map((x) => x.idx).sort((x, y) => x - y)).toEqual([0, 1]);
    // four Gears: the merged one jumps to the farthest (29: 9 cells); L6 adds the next (25: 5 cells); 4 stays asleep and the
    // linked Gears were only woken, so they jump no further
    const four = () => board([[0, g('gear', 2)], [29, g('gear')], [25, g('gear')], [4, g('gear')]]);
    expect(run(four(), 0).edges.filter((e) => e.kind === 'gear').map((e) => [e.from, e.to])).toEqual([[0, 29]]);
    const l6 = run(four(), 0, { unitLevel: { gear: 6 } });
    expect(l6.edges.filter((e) => e.kind === 'gear').map((e) => [e.from, e.to])).toEqual([[0, 29], [0, 25]]);
    expect(l6.count).toBe(3);
  });

  it('Gear LINK: Gears pass the chain anywhere (even across the divider); each machine still fires once', () => {
    const a = g('gear', 2), b = g('gear'), near = g('cannon'), far = g('cannon');
    const r = run(board([[0, a], [29, b], [1, near], [28, far]]), 0, { unitLevel: { gear: 3 } });
    expect(r.activations.map((x) => x.id).sort()).toEqual([a.id, b.id, near.id, far.id].sort());
    expect(r.edges).toContainEqual({ from: 0, to: 29, kind: 'gear' });
    // a Coil in the far corner instead: no link, the far cannon sleeps
    expect(run(board([[0, g('gear', 2)], [29, g('coil')], [1, g('cannon')], [28, g('cannon')]]), 0, { unitLevel: { gear: 3 } }).count).toBe(2);
    // Junkzilla's divider blocks touching wakes across it, never a Gear link
    const split = run(board([[0, g('gear')], [4, g('gear')], [3, g('cannon')]]), 0, { splitB: 1, unitLevel: { gear: 3 } });
    expect(split.activations.map((x) => x.idx).sort((x, y) => x - y)).toEqual([0, 3, 4]);
    // three Gears, all linked to each other: each activates exactly once
    const tri = run(board([[0, g('gear')], [14, g('gear')], [27, g('gear')], [19, g('cannon')]]), 0, { unitLevel: { gear: 6 } });
    expect(tri.count).toBe(4);
    expect(new Set(tri.activations.map((x) => x.id)).size).toBe(4);
  });

  it('Gear L3 Big Teeth: it wakes its 4 touching cells; L9 shooters it wakes hit x1.2', () => {
    const grid = () => board([[13, g('cannon', 2)], [12, g('gear', 4)], [7, g('cannon')], [6, g('cannon')]]);
    expect(run(grid(), 13).activations.map((x) => x.idx)).not.toContain(7);
    const l3 = run(grid(), 13, { unitLevel: { gear: 3 } });
    expect(l3.activations.map((x) => x.idx)).toContain(7);
    expect(l3.activations.map((x) => x.idx)).not.toContain(6); // diagonal
    const kick = (level: number) => run(grid(), 13, { unitLevel: { gear: level } }).activations.find((x) => x.idx === 7)!.contribution;
    expect(kick(9) / kick(3)).toBeCloseTo(1.2);
  });
});

describe('t-9b28a794 roster 1: drills', () => {
  const data = raw as unknown as { drills: Record<string, PuzzleDef[]> };
  it('3 drills per new unit, built around it; Jackhammer drills put a shield on the machine', () => {
    for (const f of ROSTER_1) {
      expect(data.drills[f], f).toHaveLength(3);
      for (const p of data.drills[f]) {
        expect(p.unit).toBe(f);
        expect(p.board.some(([fam]) => fam === f)).toBe(true);
        expect(!!p.shield, p.id).toBe(f === 'jackhammer');
      }
    }
  });
});
