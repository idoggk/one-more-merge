import { afterEach, describe, expect, it } from 'vitest';
import raw from '../src/content/puzzles.json';
import { storedRoster2 } from '../src/content/experiments';
import { LEVELS } from '../src/content/levels';
import { FAMILY_INFO } from '../src/content/perks';
import { goodHereAll, goodHereText2, ROSTER_2_INFO } from '../src/content/roster2';
import { unitJob } from '../src/content/unitJobs';
import { TUNING } from '../src/content/tuning';
import { applyRoster1, applyRoster2, UNIT_PERKS, unitDef, UNITS } from '../src/content/units';
import { resolveCascade, type CascadeOpts } from '../src/core/cascade';
import { rollCrate } from '../src/core/crates';
import { drop, merge as rawMerge, newLevel, newPuzzle, previewMerge, type GameState, type PuzzleDef } from '../src/core/game';
import { allLines, unitFreeBreaks } from '../src/core/puzzle';
import { ROSTER_2, type Family, type Gadget, type Grid } from '../src/core/types';

let id = 7700;
const g = (family: Family, rank = 1): Gadget => ({ id: id++, family, rank, cd: 99 });
const board = (cells: [number, Gadget][]) => {
  const grid: Grid = Array(30).fill(null);
  for (const [i, x] of cells) grid[i] = x;
  return grid;
};
const run = (grid: Grid, root: number, o: Partial<CascadeOpts> = {}) => resolveCascade(grid, root, { perks: [], overdrive: false, ...o });
const woke = (r: ReturnType<typeof run>) => r.activations.map((a) => a.idx).sort((a, b) => a - b);
const hit = (r: ReturnType<typeof run>, idx: number) => r.activations.find((a) => a.idx === idx)!.contribution;
const NEW = ROSTER_2 as string[];

afterEach(() => {
  applyRoster1(false);
  applyRoster2(false);
});

describe('t-ee4e93d7 roster 2: flag', () => {
  it('OFF by default: no new unit in the collection, crates or squad pickers; GOOD HERE silent', () => {
    expect(TUNING.roster2).toBe(false);
    expect(UNITS).toHaveLength(13);
    expect(UNITS.some((u) => NEW.includes(u.id))).toBe(false);
    for (const f of ROSTER_2) expect(unitDef(f)).toBeUndefined();
    const owned = new Set<Family>(['cannon', 'coil', 'bell', 'fan']);
    for (let seed = 1; seed < 300; seed++) for (const c of rollCrate('gold', owned, seed)) expect(NEW).not.toContain(c.unit);
    const boss = LEVELS.find((d) => d.boss_node)!;
    expect(goodHereText2(boss, () => true)).toBe('');
    expect([storedRoster2(() => null), storedRoster2(() => 'on'), storedRoster2(() => { throw new Error('x'); })]).toEqual([false, true, false]);
  });

  it('ON: the 4 join UNITS sorted by rarity, drop from crates, and OFF restores the exact old list; flags are independent', () => {
    const before = UNITS.map((u) => u.id);
    applyRoster2(true);
    expect(UNITS).toHaveLength(17);
    expect(Object.fromEntries(ROSTER_2.map((f) => [f, unitDef(f)!.rarity]))).toEqual({ wrench: 'common', piston: 'common', spring: 'common', belt_drive: 'epic' });
    expect(Object.fromEntries(ROSTER_2.map((f) => [f, unitDef(f)!.slot]))).toEqual({ wrench: 'helper', piston: 'shooter', spring: 'relay', belt_drive: 'relay' });
    const order = ['common', 'rare', 'epic'];
    expect(UNITS.map((u) => order.indexOf(u.rarity))).toEqual([...UNITS.map((u) => order.indexOf(u.rarity))].sort());
    const owned = new Set(before as Family[]);
    const got = new Set<string>();
    for (let seed = 1; seed < 300; seed++) for (const c of rollCrate('gold', owned, seed)) got.add(c.unit);
    for (const f of ROSTER_2) expect(got.has(f), f).toBe(true);
    applyRoster1(true); // all flags on together: 13 + 4 + 4
    expect(UNITS).toHaveLength(21);
    applyRoster2(false);
    expect(UNITS).toHaveLength(17);
    applyRoster1(false);
    expect(UNITS.map((u) => u.id)).toEqual(before);
  });

  it('copy: role, job word, WHEN MERGED line, L3 / L6 / L9 job upgrades for each', () => {
    const jobs = { wrench: 'UPGRADE', piston: 'OPEN SPACE', spring: 'HOP', belt_drive: 'BRIDGE' };
    for (const f of ROSTER_2) {
      expect(ROSTER_2_INFO[f].job).toBe(jobs[f]);
      expect(FAMILY_INFO[f].text.startsWith(`${jobs[f]}:`)).toBe(true);
      expect(ROSTER_2_INFO[f].whenMerged).toMatch(/^WHEN MERGED: /);
      expect(unitJob(f)).toEqual({ job: jobs[f], merged: ROSTER_2_INFO[f].whenMerged });
      expect(UNIT_PERKS[f]).toHaveLength(3);
    }
    expect([FAMILY_INFO.wrench.role, FAMILY_INFO.piston.role, FAMILY_INFO.spring.role, FAMILY_INFO.belt_drive.role]).toEqual(['SUPPORT', 'SHOOTER', 'RELAY', 'RELAY']);
  });

  it('GOOD HERE names an owned unit that suits the level (only with the flag), on one line with batch 1', () => {
    applyRoster2(true);
    const boss = LEVELS.find((d) => d.boss_node)!;
    expect(goodHereText2(boss, (u) => u === 'wrench')).toMatch(/^GOOD HERE: WRENCH \(/);
    expect(goodHereText2(boss, () => false)).toBe('');
    const gaps = LEVELS.find((d) => d.modifier === 'GAPS')!;
    expect(goodHereText2(gaps, (u) => u === 'piston')).toContain('PISTON');
    const frost = LEVELS.find((d) => d.behaviour === 'frost')!;
    expect(goodHereText2(frost, (u) => u === 'spring')).toContain('SPRING');
    const chain = LEVELS.find((d) => d.goal?.kind === 'chain')!;
    expect(goodHereText2(chain, (u) => u === 'belt_drive')).toContain('BELT DRIVE');
    applyRoster1(true);
    const shield = LEVELS.find((d) => d.behaviour === 'shield' && d.boss_node);
    if (shield) expect(goodHereAll(shield, (u) => u === 'jackhammer' || u === 'wrench').match(/GOOD HERE/g)).toHaveLength(1);
  });
});

describe('t-ee4e93d7 roster 2: Piston OPEN SPACE', () => {
  const base = () => TUNING.base.piston;
  const ratio = (cells: [number, Gadget][], idx: number, level = 1, blocked?: Set<number>) => {
    const p = cells.find(([i]) => i === idx)![1];
    return hit(run(board(cells), idx, { unitLevel: { piston: level }, ...(blocked ? { locked: blocked } : {}) }), idx) / (base() * Math.pow(TUNING.rankMult, p.rank - 1));
  };
  it('+25% per EMPTY touching cell, max x2; the board edge and occupied cells do not count', () => {
    const at = (i: number, extra: [number, Gadget][] = []) => ratio([[i, g('piston')], ...extra], i);
    expect(at(12)).toBeCloseTo(2); // middle, all 4 empty: x2
    expect(at(0)).toBeCloseTo(1.5); // corner: 2 empty cells, the edge is not empty
    expect(at(2)).toBeCloseTo(1.75); // top edge: 3 empty
    expect(at(12, [[7, g('coil')]])).toBeCloseTo(1.75);
    expect(at(12, [[7, g('coil')], [17, g('coil')], [11, g('coil')]])).toBeCloseTo(1.25);
    expect(at(12, [[7, g('coil')], [17, g('coil')], [11, g('coil')], [13, g('coil')]])).toBeCloseTo(1);
    // diagonal parts are not "touching" at L1
    expect(at(12, [[6, g('coil')], [8, g('coil')]])).toBeCloseTo(2);
  });
  it('a locked or reserved neighbour is not empty', () => {
    expect(ratio([[12, g('piston')]], 12, 1, new Set([7, 11]))).toBeCloseTo(1.5);
  });
  it('L3: empty diagonals count +10% each, still max x2 (cap L1-L6)', () => {
    const lone = [[12, g('piston')]] as [number, Gadget][];
    expect(ratio(lone, 12, 3)).toBeCloseTo(2); // 1 + 1.0 + 0.4 = 2.4, cut to the cap
    const sides = [[12, g('piston')], [7, g('coil')], [17, g('coil')], [11, g('coil')]] as [number, Gadget][];
    expect(ratio(sides, 12, 1)).toBeCloseTo(1.25);
    expect(ratio(sides, 12, 3)).toBeCloseTo(1.25 + 0.4); // 1 empty side + 4 empty diagonals
    for (const level of [1, 3, 6]) expect(ratio(lone, 12, level)).toBeLessThanOrEqual(2 + 1e-9);
  });
  it('L9: cap x2.2 only while the board holds 8 or fewer parts', () => {
    const few = [[12, g('piston')], [0, g('coil')], [4, g('coil')]] as [number, Gadget][];
    expect(ratio(few, 12, 9)).toBeCloseTo(2.2);
    expect(ratio(few, 12, 6)).toBeCloseTo(2);
    const parts = [[12, g('piston')], ...[0, 4, 25, 29, 2, 27, 15, 20].map((i): [number, Gadget] => [i, g('coil')])] as [number, Gadget][]; // 9 parts
    expect(ratio(parts, 12, 9)).toBeCloseTo(2);
    const eight = parts.slice(0, 8);
    expect(ratio(eight, 12, 9)).toBeCloseTo(2.2);
  });
  it('L6 Recoil: it shoves the nearest touching part 1 cell away, no damage, and its own hit counts the room it had', () => {
    // the cannon you merge at 2 wakes the Piston at 7; its touching coils at 6 and 8 are not in the chain
    const cells = () => [[2, g('cannon', 2)], [7, g('piston')], [6, g('coil')], [8, g('coil')]] as [number, Gadget][];
    const plain = run(board(cells()), 2, { unitLevel: { piston: 3 } });
    expect(plain.moves).toEqual([]);
    const r = run(board(cells()), 2, { unitLevel: { piston: 6 } });
    expect(r.moves).toHaveLength(1);
    expect(r.moves[0]).toMatchObject({ from: 6, to: 5 }); // row-major nearest; the coil slides away from the Piston
    expect(r.total).toBeCloseTo(plain.total);
    expect(hit(r, 7)).toBeCloseTo(hit(plain, 7));
    // a part with no room behind it (the board edge or another part) is not pushed
    const stuck = run(board([[2, g('cannon', 2)], [7, g('piston')], [6, g('coil')], [5, g('coil')], [8, g('coil')], [9, g('coil')]]), 2, { unitLevel: { piston: 6 } });
    expect(stuck.moves).toEqual([]);
    // a part already in the chain (the one that woke it) is never pushed
    expect(run(board([[7, g('piston', 2)], [12, g('coil')]]), 7, { unitLevel: { piston: 6 } }).moves).toEqual([]);
  });
  it('is a shooter: never wakes anything itself and fires once per cascade', () => {
    const r = run(board([[12, g('piston', 2)], [11, g('piston')], [13, g('cannon')]]), 12);
    expect(new Set(r.activations.map((a) => a.id)).size).toBe(r.activations.length);
  });
});

describe('t-ee4e93d7 roster 2: Spring HOP', () => {
  // the merge lands on a rank-2 cannon whose 4 neighbours wake, so a Spring next to it is woken from that side
  it('skips exactly the next part in line and wakes the one after it (within 3 cells)', () => {
    const r = run(board([[10, g('cannon', 2)], [11, g('spring')], [12, g('cannon')], [13, g('cannon')], [14, g('cannon')]]), 10);
    expect(woke(r)).toEqual([10, 11, 13]);
    expect(r.edges).toContainEqual({ from: 11, to: 13, kind: 'hop' });
    // a gap between parts is fine as long as both are within 3 cells
    expect(woke(run(board([[2, g('cannon', 2)], [7, g('spring')], [17, g('cannon')], [22, g('cannon')]]), 2))).toEqual([2, 7, 22]);
    // the second part is 4 cells away (out of reach): only one part in reach, so there is nothing to skip and it wakes
    expect(woke(run(board([[2, g('cannon', 2)], [7, g('spring')], [12, g('cannon')], [27, g('cannon')]]), 2))).toEqual([2, 7, 12]);
    expect(woke(run(board([[10, g('cannon', 2)], [11, g('spring')], [12, g('cannon')]]), 10))).toEqual([10, 11, 12]);
    // nothing in line: nothing wakes
    expect(woke(run(board([[10, g('cannon', 2)], [11, g('spring')]]), 10))).toEqual([10, 11]);
  });
  it('merged directly (no entry side) it hops every way; a Gear link or diagonal waker gives no entry side either', () => {
    const cells = () => [[12, g('spring', 2)], [11, g('cannon')], [10, g('cannon')], [13, g('cannon')], [14, g('cannon')], [7, g('bell')], [2, g('bell')]] as [number, Gadget][];
    const r = run(board(cells()), 12);
    // spark wakes 11, 13, 7; hops land on 10 (over 11), 14 (over 13), 2 (over 7)
    expect(woke(r)).toEqual([2, 7, 10, 11, 12, 13, 14]);
  });
  it('L3: it also hops back along the line the chain came in on', () => {
    const cells = () => [[12, g('cannon', 2)], [7, g('spring')], [17, g('coil')], [22, g('coil')]] as [number, Gadget][];
    expect(woke(run(board(cells()), 12))).not.toContain(22); // root also sparks 17 (a coil, not a spring): 22 is only woken by the hop back
    const l3 = run(board(cells()), 12, { unitLevel: { spring: 3 } });
    expect(l3.edges.some((e) => e.kind === 'hop' && e.from === 7)).toBe(true);
  });
  it('L6: a Spring can wake a Spring (each once); below L6 it cannot', () => {
    const cells = () => [[2, g('cannon', 2)], [7, g('spring')], [12, g('cannon')], [17, g('spring')], [22, g('cannon')], [27, g('cannon')]] as [number, Gadget][];
    expect(woke(run(board(cells()), 2))).toEqual([2, 7]);
    const r = run(board(cells()), 2, { unitLevel: { spring: 6 } });
    expect(woke(r)).toEqual([2, 7, 17, 27]); // 12 and 22 were skipped
    expect(new Set(r.activations.map((a) => a.id)).size).toBe(r.activations.length);
  });
  it('L9: a hop that would leave the board hops 90 degrees along the wall instead', () => {
    const cells = () => [[17, g('cannon', 2)], [22, g('spring')], [27, g('cannon')], [21, g('cannon')], [20, g('cannon')], [23, g('cannon')], [24, g('cannon')]] as [number, Gadget][];
    const l6 = woke(run(board(cells()), 17, { unitLevel: { spring: 6 } }));
    expect(l6).not.toContain(20);
    const l9 = run(board(cells()), 17, { unitLevel: { spring: 9 } });
    expect(woke(l9)).toContain(20); // clockwise side first: left, over 21
    expect(woke(l9)).not.toContain(24);
  });
  it('never crosses the divider, never wakes a locked part, and a resting row wakes nobody', () => {
    const cells = () => [[10, g('cannon', 2)], [11, g('spring')], [12, g('cannon')], [13, g('cannon')]] as [number, Gadget][];
    expect(woke(run(board(cells()), 10, { splitB: 1 }))).toEqual([10, 11]);
    expect(woke(run(board(cells()), 10, { locked: new Set([13]) }))).toEqual([10, 11]);
    expect(woke(run(board(cells()), 10, { restRow: 2 }))).toEqual([10, 11]);
  });
});

describe('t-ee4e93d7 roster 2: Belt Drive BRIDGE', () => {
  const row = () => [[10, g('cannon', 2)], [11, g('belt_drive')], [12, g('cannon')], [13, g('cannon')], [14, g('cannon')]] as [number, Gadget][];
  it('exits at the far end of its line; the parts in between stay asleep', () => {
    const r = run(board(row()), 10);
    expect(woke(r)).toEqual([10, 11, 14]);
    expect(r.edges).toContainEqual({ from: 11, to: 14, kind: 'belt' });
    // the only part in line is the exit
    expect(woke(run(board([[10, g('cannon', 2)], [11, g('belt_drive')], [12, g('cannon')]]), 10))).toEqual([10, 11, 12]);
    // a column works the same way (entered from above)
    expect(woke(run(board([[2, g('cannon', 2)], [7, g('belt_drive')], [12, g('cannon')], [22, g('cannon')], [27, g('cannon')]]), 2))).toEqual([2, 7, 27]);
  });
  it('it reaches farther than a Spring and skips more: not a twin', () => {
    const spring = woke(run(board(row().map(([i, x]): [number, Gadget] => [i, x.family === 'belt_drive' ? g('spring') : x])), 10));
    expect(spring).toEqual([10, 11, 13]);
    expect(woke(run(board(row()), 10))).toEqual([10, 11, 14]);
  });
  it('merged directly (no entry side) it bridges both far ends of its row', () => {
    const r = run(board([[12, g('belt_drive', 2)], [10, g('cannon')], [14, g('cannon')], [2, g('cannon')]]), 12);
    expect(woke(r)).toEqual([10, 12, 14]);
  });
  it('L3: the part before the far end wakes too', () => {
    expect(woke(run(board(row()), 10, { unitLevel: { belt_drive: 3 } }))).toEqual([10, 11, 13, 14]);
  });
  it('L6: a Belt Drive can wake a Belt Drive, and wakes one it passes over; below L6 it cannot', () => {
    const cells = () => [[0, g('cannon', 2)], [5, g('belt_drive')], [10, g('cannon')], [15, g('belt_drive')], [20, g('cannon')], [25, g('cannon')]] as [number, Gadget][];
    expect(woke(run(board(cells()), 0))).toEqual([0, 5, 25]);
    const r = run(board(cells()), 0, { unitLevel: { belt_drive: 6 } });
    expect(woke(r)).toEqual([0, 5, 15, 20, 25]); // L6 includes the L3 two-deep exit (20 and 25)
    expect(new Set(r.activations.map((a) => a.id)).size).toBe(r.activations.length);
    // the far end itself can be a Belt Drive
    expect(woke(run(board([[10, g('cannon', 2)], [11, g('belt_drive')], [12, g('cannon')], [14, g('belt_drive')]]), 10, { unitLevel: { belt_drive: 6 } }))).toContain(14);
    expect(woke(run(board([[10, g('cannon', 2)], [11, g('belt_drive')], [12, g('cannon')], [14, g('belt_drive')]]), 10))).not.toContain(14);
  });
  it('L9: the exit part hits x1.25 (only the exit)', () => {
    const l6 = run(board(row()), 10, { unitLevel: { belt_drive: 6 } });
    const l9 = run(board(row()), 10, { unitLevel: { belt_drive: 9 } });
    expect(hit(l9, 14) / hit(l6, 14)).toBeCloseTo(TUNING.r2.beltL9);
    expect(hit(l9, 10)).toBeCloseTo(hit(l6, 10));
  });
  it('never crosses the divider, never wakes a locked part, and a resting row wakes nobody', () => {
    expect(woke(run(board(row()), 10, { splitB: 1 }))).toEqual([10, 11]);
    expect(woke(run(board(row()), 10, { locked: new Set([14]) }))).toEqual([10, 11]);
    expect(woke(run(board(row()), 10, { restRow: 2 }))).toEqual([10, 11]);
  });
  it('every machine still fires at most once on a crowded board with all four Springs and Belts', () => {
    const fams: Family[] = ['spring', 'belt_drive', 'piston', 'cannon', 'coil', 'bell', 'horn', 'spring', 'belt_drive'];
    for (let k = 0; k < 40; k++) {
      const grid: Grid = Array(30).fill(null);
      for (let i = 0; i < 30; i++) if ((i * 7 + k * 3) % 5 !== 0) grid[i] = g(fams[(i + k) % fams.length], 1 + ((i + k) % 3));
      const root = grid.findIndex((x) => !!x);
      const r = run(grid, root, { unitLevel: { spring: 9, belt_drive: 9, piston: 9 } });
      expect(new Set(r.activations.map((a) => a.id)).size).toBe(r.activations.length);
    }
  });
});

describe('t-ee4e93d7 roster 2: Wrench UPGRADE', () => {
  const start = (level = 1) => {
    applyRoster2(true);
    const s = newLevel(LEVELS.find((d) => d.level === 21)!, { toys: ['wrench'] });
    s.grid.fill(null);
    s.bag = [];
    s.pending = [];
    s.supplyTimer = 1e9;
    s.hp = s.maxHp = 1e12;
    s.unitLevel = { wrench: level };
    return s;
  };
  const put = (s: GameState, i: number, f: Family, rank: number) => {
    s.grid[i] = { id: 100 + i, family: f, rank, cd: 99 };
  };
  const merge = (s: GameState, from: number, to: number) => {
    const r = drop(s, from, to, s.grid[from]!.id);
    expect(r.ok).toBe(true);
    return r;
  };
  const cascadeOf = (r: ReturnType<typeof drop>) => r.events.find((e) => e.type === 'cascade') as Extract<(typeof r.events)[number], { type: 'cascade' }>;

  it('only exists with the flag and Wrench in the squad, and never as a board part', () => {
    expect(newLevel(LEVELS[20], { toys: ['wrench'] }).wrench).toBeUndefined(); // flag OFF
    const s = start();
    expect(s.wrench).toEqual({ armed: [], uses: 0 });
    for (let i = 0; i < 200; i++) expect(s.bag.includes('wrench' as Family)).toBe(false);
    expect(newLevel(LEVELS[20], { toys: ['magnet'] }).wrench).toBeUndefined();
  });

  it('after a rank-3+ merge the NEXT merge counts +1 rank for effects; real ranks never change; the boost is spent once', () => {
    const s = start();
    put(s, 0, 'cannon', 2); put(s, 1, 'cannon', 2); // merge -> rank 3: arms
    put(s, 28, 'cannon', 1); put(s, 29, 'cannon', 1); // far from everything
    const first = merge(s, 0, 1);
    expect(s.grid[1]!.rank).toBe(3);
    expect(cascadeOf(first).result.wrenchBoost).toBeUndefined();
    expect(s.wrench!.armed).toEqual([1]);
    const withBoost = previewMerge(s, 28, 29)!.total;
    expect(s.wrench!.armed).toEqual([1]); // a preview never spends it
    const plain = structuredClone(s);
    plain.wrench!.armed = [];
    const noBoost = previewMerge(plain, 28, 29)!.total;
    expect(withBoost / noBoost).toBeCloseTo(Math.pow(TUNING.rankMult, TUNING.r2.wrenchDmg)); // the rank counts in full for perks, a fifth of it for the hit
    const second = merge(s, 28, 29);
    expect(cascadeOf(second).result.wrenchBoost).toBe(1);
    expect(cascadeOf(second).result.total).toBeCloseTo(withBoost);
    expect(s.grid[29]!.rank).toBe(2); // the part keeps its real rank
    expect(s.grid[1]!.rank).toBe(3);
    expect(s.wrench).toEqual({ armed: [], uses: 1 }); // a rank-2 merge does not re-arm at L1
  });

  it('rank-gated perks use the boosted rank', () => {
    const grid = () => board([[12, g('cannon', 3)]]);
    const a = run(grid(), 12, { unitLevel: { cannon: 3 } });
    const b = run(grid(), 12, { unitLevel: { cannon: 3 }, rankBonus: 1 });
    expect(hit(b, 12) / hit(a, 12)).toBeCloseTo(Math.pow(TUNING.rankMult, TUNING.r2.wrenchDmg) * 1.2); // rank 3 -> 4 also turns on Heavy Barrel (x1.2)
    expect(run(grid(), 12, { rankBonus: 1 }).activations[0].rank).toBe(4);
  });

  it('L1 arms on rank 3+, L3 on rank 2+', () => {
    const s1 = start(1);
    put(s1, 0, 'cannon', 1); put(s1, 1, 'cannon', 1);
    merge(s1, 0, 1); // result rank 2
    expect(s1.wrench!.armed).toEqual([]);
    const s3 = start(3);
    put(s3, 0, 'cannon', 1); put(s3, 1, 'cannon', 1);
    merge(s3, 0, 1);
    expect(s3.wrench!.armed).toEqual([1]);
  });

  it('holds 1 armed merge (a streak never stacks); L6 holds 2', () => {
    const s = start(1);
    for (const [a, b] of [[0, 1], [5, 6], [10, 11]]) { put(s, a, 'cannon', 2); put(s, b, 'cannon', 2); }
    merge(s, 0, 1);
    merge(s, 5, 6);
    expect(s.wrench!.armed).toEqual([1]);
    const s6 = start(6);
    put(s6, 0, 'cannon', 2); put(s6, 1, 'cannon', 2); put(s6, 5, 'cannon', 2); put(s6, 6, 'cannon', 2); put(s6, 10, 'cannon', 2); put(s6, 11, 'cannon', 2);
    merge(s6, 0, 1);
    expect(s6.wrench!.armed).toEqual([1, 1]); // one rank-3 merge arms the next two
    const r = merge(s6, 5, 6); // spends one and arms again, never past 2
    expect(cascadeOf(r).result.wrenchBoost).toBe(1);
    expect(s6.wrench!.armed).toEqual([1, 1]);
    merge(s6, 10, 11);
    expect(s6.wrench!.armed).toHaveLength(2);
    expect(s6.wrench!.uses).toBe(2);
  });

  it('L9: after a rank-6+ merge the next merges count +2 ranks (a rank-4 merge only arms +1)', () => {
    const s = start(9);
    put(s, 0, 'cannon', 5); put(s, 1, 'cannon', 5);
    put(s, 28, 'cannon', 1); put(s, 29, 'cannon', 1);
    merge(s, 0, 1);
    expect(s.wrench!.armed).toEqual([2, 2]); // L6 holds two; L9 makes each worth +2
    const r = merge(s, 28, 29);
    expect(cascadeOf(r).result.wrenchBoost).toBe(2);
    const four = start(9);
    put(four, 0, 'cannon', 3); put(four, 1, 'cannon', 3);
    merge(four, 0, 1);
    expect(four.wrench!.armed).toEqual([1, 1]);
    // the effective rank is capped at the board's rank ceiling (8)
    expect(run(board([[12, g('cannon', 8)]]), 12, { rankBonus: 2 }).activations[0].rank).toBe(8);
    expect(run(board([[12, g('cannon', 7)]]), 12, { rankBonus: 2 }).activations[0].rank).toBe(8);
  });

  it('merges that are not yours (Kickback fuse, Magnet SNAP IN: merge() without byPlayer) never arm or spend it', () => {
    const s = start(1);
    s.wrench!.armed = [1];
    put(s, 3, 'cannon', 4); put(s, 4, 'cannon', 4);
    const r = rawMerge(s, 3, 4);
    expect(s.grid[4]!.rank).toBe(5);
    expect(cascadeOf(r).result.wrenchBoost).toBeUndefined();
    expect(s.wrench).toEqual({ armed: [1], uses: 0 });
    put(s, 8, 'cannon', 2); put(s, 9, 'cannon', 2);
    s.wrench!.armed = [];
    rawMerge(s, 8, 9); // a rank-3 merge that is not yours arms nothing
    expect(s.wrench!.armed).toEqual([]);
  });
});

describe('t-ee4e93d7 roster 2: drills', () => {
  const data = raw as unknown as { drills: Record<string, PuzzleDef[]> };
  it('3 drills per new unit, built around it; each needs its unit (no line breaks the machine without it)', () => {
    for (const f of ROSTER_2) {
      expect(data.drills[f], f).toHaveLength(3);
      for (const p of data.drills[f]) {
        expect(p.unit).toBe(f);
        if (f === 'wrench') expect(p.wrench, p.id).toBeGreaterThanOrEqual(0);
        else expect(p.board.some(([fam]) => fam === f), p.id).toBe(true);
        const lines = allLines(p);
        expect(unitFreeBreaks(lines, p.hp).map((l) => l.path), p.id).toEqual([]);
        const s = newPuzzle(p);
        for (const [a, b] of p.solution) drop(s, a, b, s.grid[a]!.id);
        expect(s.puzzle!.unitUsed, p.id).toBe(true);
        expect(s.phase, p.id).toBe('won');
      }
    }
  }, 120000);
  it('Wrench drills: the unit acts only when an armed merge is spent (a breaking merge without it does not solve)', () => {
    const def: PuzzleDef = { id: 'w', moves: 1, hp: 1, board: [['cannon', 1, 0, 0], ['cannon', 1, 0, 1]], solution: [], unit: 'wrench', wrench: 0 };
    const s = newPuzzle(def);
    drop(s, 0, 1, s.grid[0]!.id);
    expect(s.phase).toBe('lost');
    expect(s.puzzle!.missedUnit).toBe(true);
    const armed = newPuzzle({ ...def, wrench: 1 });
    drop(armed, 0, 1, armed.grid[0]!.id);
    expect(armed.phase).toBe('won');
    expect(armed.puzzle!.unitUsed).toBe(true);
  });
});
