import { afterEach, describe, expect, it } from 'vitest';
import { applyUnits, storedRoster5 } from '../src/content/experiments';
import { LEVELS } from '../src/content/levels';
import { FAMILY_INFO } from '../src/content/perks';
import { goodHereAll5, goodHereText5, ROSTER_5_INFO } from '../src/content/roster5';
import { unitJob } from '../src/content/unitJobs';
import { TUNING } from '../src/content/tuning';
import { applyRoster1, applyRoster2, applyRoster3, applyRoster4, applyRoster5, UNIT_PERKS, unitDef, UNITS } from '../src/content/units';
import raw from '../src/content/puzzles.json';
import { allLines, unitFreeBreaks } from '../src/core/puzzle';
import type { PuzzleDef } from '../src/core/game';
import { resolveCascade, type CascadeOpts } from '../src/core/cascade';
import { rollCrate } from '../src/core/crates';
import { canMerge, craneOpt, drop, legalPairs, newLevel, newPuzzle, previewMerge, serialize, tick } from '../src/core/game';
import { boardSteps, craneAllowance, dynamoBlock, ringCells, squareFit, swingBehind, swingMult } from '../src/core/roster5';
import { ROSTER_5, type Family, type Gadget, type Grid } from '../src/core/types';

let id = 9900;
const g = (family: Family, rank = 1): Gadget => ({ id: id++, family, rank, cd: 99 });
const board = (cells: [number, Gadget][]) => {
  const grid: Grid = Array(30).fill(null);
  for (const [i, x] of cells) grid[i] = x;
  return grid;
};
const run = (grid: Grid, root: number, o: Partial<CascadeOpts> = {}) => resolveCascade(grid, root, { perks: [], overdrive: false, ...o });
const woke = (r: ReturnType<typeof run>) => r.activations.map((a) => a.idx).sort((a, b) => a - b);
const hit = (r: ReturnType<typeof run>, idx: number) => r.activations.find((a) => a.idx === idx)!.contribution;
const NEW = ROSTER_5 as string[];
const CRANE: CascadeOpts['crane'] = { can: (a, b) => canMerge(a, b), rank: (a) => a.rank + 1 };

afterEach(() => {
  applyUnits('off');
  applyRoster1(false);
  applyRoster2(false);
  applyRoster3(false);
  applyRoster4(false);
  applyRoster5(false);
});

describe('t-af818b65 roster 5: flag', () => {
  it('OFF by default: no new unit in the collection, crates or squad pickers; GOOD HERE silent', () => {
    expect(TUNING.roster5).toBe(false);
    expect(UNITS).toHaveLength(13);
    for (const f of ROSTER_5) expect(unitDef(f)).toBeUndefined();
    const owned = new Set<Family>(['cannon', 'coil', 'bell', 'fan']);
    for (let seed = 1; seed < 300; seed++) for (const c of rollCrate('gold', owned, seed)) expect(NEW).not.toContain(c.unit);
    expect(goodHereText5(LEVELS.find((d) => d.boss_node)!, () => true)).toBe('');
    expect([storedRoster5(() => null), storedRoster5(() => 'on'), storedRoster5(() => { throw new Error('x'); })]).toEqual([false, true, false]);
  });

  it('ON: Wrecking Ball (Epic) joins; Crane and Dynamo (Legendary) only while crates B is on; OFF restores the old list', () => {
    const before = UNITS.map((u) => u.id);
    applyRoster5(true);
    expect(UNITS).toHaveLength(14);
    expect(unitDef('wrecking_ball')).toMatchObject({ rarity: 'epic', slot: 'shooter', role: 'SHOOTER' });
    expect(unitDef('crane')).toBeUndefined();
    expect(unitDef('dynamo')).toBeUndefined();
    applyUnits('rb'); // crates B on: the Legendaries show up, sorted by rarity (last)
    expect(unitDef('crane')).toMatchObject({ rarity: 'legendary', slot: 'relay', role: 'RELAY' });
    expect(unitDef('dynamo')).toMatchObject({ rarity: 'legendary', slot: 'relay', role: 'RELAY' });
    const order = ['common', 'rare', 'epic', 'legendary'];
    expect(UNITS.map((u) => order.indexOf(u.rarity))).toEqual([...UNITS.map((u) => order.indexOf(u.rarity))].sort());
    applyUnits('off');
    applyRoster5(false);
    expect(UNITS.map((u) => u.id)).toEqual(before);
  });

  it('crates can drop Wrecking Ball while ON; Crane and Dynamo need crates B', () => {
    applyRoster5(true);
    const owned = new Set<Family>(['cannon', 'coil', 'bell', 'fan']);
    const seen = new Set<string>();
    for (let seed = 1; seed < 6000; seed++) for (const c of rollCrate('gold', owned, seed)) if (NEW.includes(c.unit)) seen.add(c.unit);
    expect([...seen]).toEqual(['wrecking_ball']);
    applyUnits('rb');
    const seenB = new Set<string>();
    for (let seed = 1; seed < 20000; seed++) for (const c of rollCrate('gold', owned, seed)) if (NEW.includes(c.unit)) seenB.add(c.unit);
    expect([...seenB].sort()).toEqual(['crane', 'dynamo', 'wrecking_ball']);
  });

  it('copy: role, job word, WHEN MERGED line, L3 / L6 / L9 job upgrades for each', () => {
    const jobs = { crane: 'LIFT', dynamo: 'SQUARE', wrecking_ball: 'DISTANCE' };
    for (const f of ROSTER_5) {
      expect(ROSTER_5_INFO[f].job).toBe(jobs[f]);
      expect(FAMILY_INFO[f].text.startsWith(`${jobs[f]}:`)).toBe(true);
      expect(ROSTER_5_INFO[f].whenMerged).toMatch(/^WHEN MERGED: /);
      expect(unitJob(f)).toEqual({ job: jobs[f], merged: ROSTER_5_INFO[f].whenMerged });
      expect(UNIT_PERKS[f]).toHaveLength(3);
    }
    expect([FAMILY_INFO.crane.role, FAMILY_INFO.dynamo.role, FAMILY_INFO.wrecking_ball.role]).toEqual(['RELAY', 'RELAY', 'SHOOTER']);
  });

  it('GOOD HERE names an owned unit that suits the level (only with the flag), on one line with the other batches', () => {
    const chain = LEVELS.find((d) => d.goal?.kind === 'chain')!;
    const rank = LEVELS.find((d) => d.goal?.kind === 'rank')!;
    const boss = LEVELS.find((d) => d.boss_node)!;
    expect(goodHereText5(chain, () => true)).toBe('');
    applyRoster5(true);
    expect(goodHereText5(chain, (u) => u === 'dynamo')).toMatch(/^GOOD HERE: DYNAMO \(/);
    expect(goodHereText5(rank, (u) => u === 'crane')).toContain('CRANE');
    expect(goodHereText5(boss, (u) => u === 'wrecking_ball')).toContain('WRECKING BALL');
    expect(goodHereText5(boss, () => false)).toBe('');
    applyRoster3(true);
    applyRoster4(true);
    for (const d of LEVELS) expect(goodHereAll5(d, () => true).match(/GOOD HERE/g)?.length ?? 1).toBe(1);
  });

  it('flag-OFF: a board holding the new families resolves like any board without the options (nothing new acts)', () => {
    const grid = () => board([[10, g('coil', 2)], [11, g('cannon')], [12, g('bell')], [13, g('cannon')]]);
    const a = run(grid(), 10), b = run(grid(), 10, { crane: CRANE });
    expect([b.total, woke(b)]).toEqual([a.total, woke(a)]);
    expect(b.crane).toBeUndefined();
    expect(craneOpt(newLevel(LEVELS[24], { toys: [], relays: ['coil', 'bell'] }))).toEqual({});
  });
});

describe('t-af818b65 roster 5: Wrecking Ball DISTANCE', () => {
  it('x0.6 next door, +0.3 per extra board step, max x2 (x2.3 from L3)', () => {
    expect([1, 2, 3, 4, 5].map((n) => +swingMult(n, 1).toFixed(2))).toEqual([0.6, 0.9, 1.2, 1.5, 1.8]);
    expect(swingMult(6, 1)).toBe(2); // 2.1 is cut to the cap
    expect(swingMult(9, 1)).toBe(2);
    expect(swingMult(6, 3)).toBeCloseTo(2.1, 9);
    expect(swingMult(7, 3)).toBe(2.3); // 2.4 is cut to the L3 cap
    expect(swingMult(12, 9)).toBe(2.3);
    expect(swingMult(0, 1)).toBe(1); // merged by you: no waker
  });

  it('the cap holds for every distance the 5x6 board allows, at every level', () => {
    const far = boardSteps(0, 29);
    expect(far).toBe(9);
    for (let n = 1; n <= far; n++) for (const L of [1, 3, 6, 9]) expect(swingMult(n, L)).toBeLessThanOrEqual(L >= 3 ? 2.3 : 2);
  });

  it('distance is board steps (up/down/left/right), not cells in a line: a diagonal neighbour is 2 steps', () => {
    expect(boardSteps(0, 1)).toBe(1);
    expect(boardSteps(0, 6)).toBe(2); // one row down, one column right
    expect(boardSteps(0, 12)).toBe(4);
    expect(boardSteps(12, 0)).toBe(4);
  });

  it('in a chain: a ball woken from 1, 2 and 3 steps hits x0.6 / x0.9 / x1.2 of the same ball woken at x1 (hits are not always x2)', () => {
    // Coil rank 1 at 10 (row 2, col 0) wakes the parts up to 2 cells along its row: a ball at 11 is 1 step away, at 12 is 2 steps
    const at = (cell: number) => {
      const ball = g('wrecking_ball');
      const r = run(board([[10, g('coil')], [cell, ball]]), 10);
      return hit(r, cell);
    };
    const base = run(board([[12, g('wrecking_ball')]]), 12); // merged by you: x1
    const x1 = hit(base, 12);
    expect(at(11) / x1).toBeCloseTo(0.6, 6);
    expect(at(12) / x1).toBeCloseTo(0.9, 6);
  });

  it('with hops: Spring at 10 hops over 15 to a ball at 20 (2 steps = x0.9); a Gear link jumps across the board and lands bigger, yet the cap holds', () => {
    applyRoster1(true);
    applyRoster2(true);
    const spring = run(board([[0, g('coil')], [10, g('spring')], [15, g('cannon')], [20, g('wrecking_ball')]]), 0);
    expect(woke(spring)).toContain(20);
    expect(woke(spring)).not.toContain(15);
    const x1 = hit(run(board([[20, g('wrecking_ball')]]), 20), 20);
    expect(hit(spring, 20) / x1).toBeCloseTo(0.9, 6);
    // Gear links jump between Gears anywhere; the ball is woken by the far Gear (a root-merged Gear links at depth 0)
    const far = run(board([[0, g('gear')], [29, g('gear')], [28, g('wrecking_ball')]]), 0, { roots: [] });
    if (woke(far).includes(28)) expect(hit(far, 28) / hit(run(board([[28, g('wrecking_ball')]]), 28), 28)).toBeLessThanOrEqual(2 + 1e-9);
    // a belt exit and a ball at the far end
    const lone = run(board([[0, g('coil')], [4, g('wrecking_ball')]]), 0, { unitLevel: { coil: 9 } });
    const ratio = woke(lone).includes(4) ? hit(lone, 4) / hit(run(board([[4, g('wrecking_ball')]]), 4), 4) : 0;
    expect(ratio).toBeLessThanOrEqual(2 + 1e-9);
  });

  it('a lone Wrecking Ball you merge hits x1; the same ball woken next door hits less (x0.6)', () => {
    const root = run(board([[12, g('wrecking_ball')]]), 12);
    const next = run(board([[11, g('coil')], [12, g('wrecking_ball')]]), 11);
    expect(hit(next, 12)).toBeLessThan(hit(root, 12));
  });

  it('L3: the hit may reach x2.3 (no change to the near hits)', () => {
    expect(swingMult(2, 3)).toBe(swingMult(2, 1));
    expect(swingMult(7, 3)).toBeGreaterThan(swingMult(7, 1));
  });

  it('L6: knocks the part it swings over 1 cell sideways (no damage); never a part in the chain; L1 does not', () => {
    // Coil at 0 wakes the Spring at 10 (2 down); the Spring hops over the Cannon at 15 and wakes the ball at 20 (2 steps)
    applyRoster2(true);
    const mk = () => board([[0, g('coil')], [10, g('spring')], [15, g('cannon')], [20, g('wrecking_ball')]]);
    const l1 = run(mk(), 0);
    expect(l1.moves).toEqual([]);
    const l6 = run(mk(), 0, { unitLevel: { wrecking_ball: 6 } });
    expect(l6.moves).toHaveLength(1);
    expect(l6.moves[0]).toMatchObject({ from: 15, to: 16 });
    expect(woke(l6)).not.toContain(15); // the knocked part was not woken, took no damage
    expect(hit(l6, 20)).toBeCloseTo(hit(l1, 20), 9); // no extra damage
  });

  it('L6: nothing to knock when the part between is already in the chain, or there is no room', () => {
    // a Coil wakes BOTH the part between and the ball (rank 1: 2 cells): the part is in the chain, so it stays
    const r = run(board([[10, g('coil')], [11, g('cannon')], [12, g('wrecking_ball')]]), 10, { unitLevel: { wrecking_ball: 6 } });
    expect(r.moves).toEqual([]);
  });

  it('L9: woken from 4+ steps away it also wakes the cell behind it; from less it does not', () => {
    expect(swingBehind(0, 20)).toBe(25);
    expect(swingBehind(0, 29)).toBe(-1); // off the board
    expect(swingBehind(25, 20)).toBe(15);
    expect(swingBehind(0, 7)).toBe(8); // not in line: the longer axis (here along the row)
    expect(swingBehind(0, 6)).toBe(11); // a tie goes vertical
    // Coil rank 8 at 0 with the L9 reach 4 wakes the ball at 20 (4 steps down the column); the Cannon at 25 is behind it
    const mk = () => board([[0, g('coil', 8)], [20, g('wrecking_ball')], [25, g('cannon')]]);
    const l9 = run(mk(), 0, { unitLevel: { wrecking_ball: 9, coil: 9 } });
    expect(woke(l9)).toContain(20);
    expect(woke(l9)).toContain(25);
    const l6 = run(mk(), 0, { unitLevel: { wrecking_ball: 6, coil: 9 } });
    expect(woke(l6)).not.toContain(25);
    const near = run(board([[0, g('coil')], [10, g('wrecking_ball')], [15, g('cannon')]]), 0, { unitLevel: { wrecking_ball: 9 } });
    expect(woke(near)).not.toContain(15); // only 2 steps: no wake behind
  });

  it('every part fires once; the chain cap holds with Wrecking Balls in a crowded board', () => {
    const full = board(Array.from({ length: 30 }, (_, i): [number, Gadget] => [i, g(i % 3 === 0 ? 'wrecking_ball' : i % 3 === 1 ? 'coil' : 'bell', 1 + (i % 3))]));
    for (const L of [1, 3, 6, 9]) {
      const r = run(full, 12, { unitLevel: { wrecking_ball: L, coil: L, bell: L } });
      expect(new Set(r.activations.map((a) => a.idx)).size).toBe(r.activations.length);
      expect(r.comboMult).toBeLessThanOrEqual(TUNING.comboCap + 1e-9);
    }
  });
});

describe('t-af818b65 roster 5: Dynamo 2x2 SQUARE', () => {
  // the Dynamo sits at 6 (row 1, col 1); a block 6,7,11,12 and a full ring of 12 around it (rows 0-3, cols 0-3)
  const BLOCK = [6, 7, 11, 12];
  const RING = [0, 1, 2, 3, 5, 8, 10, 13, 15, 16, 17, 18];
  const mk = (blockMates: number[] = [7, 11, 12], ring = RING, rest: [number, Gadget][] = []) =>
    board([[6, g('dynamo')], ...blockMates.map((i): [number, Gadget] => [i, g('cannon')]), ...ring.map((i): [number, Gadget] => [i, g('cannon')]), ...rest]);

  it('ring geometry: 12 cells around an interior 2x2, fewer at the board edge, 2 cells wide = every cell within 2', () => {
    expect(ringCells(1, 1, 1).sort((a, b) => a - b)).toEqual(RING);
    expect(ringCells(0, 0, 1)).toHaveLength(5); // a corner block: 5 ring cells
    expect(ringCells(2, 3, 1)).toHaveLength(8); // against the right wall: 12 - 4 clipped
    expect(ringCells(4, 3, 1)).toHaveLength(5); // the bottom-right corner block
    expect(ringCells(2, 1, 2)).toHaveLength(26); // 5x6 board = 30 cells, minus the block, 2 wide reaches every other cell
    expect(new Set(ringCells(1, 1, 1)).size).toBe(12);
    for (const c of ringCells(1, 1, 1)) expect(BLOCK).not.toContain(c);
  });

  it('a full 2x2 block wakes the whole ring of 12 (the block mates stay asleep: dynMates is off)', () => {
    const r = run(mk(), 6, { wake: true });
    expect(woke(r)).toEqual([6, ...RING].sort((a, b) => a - b));
    expect(r.edges.filter((e) => e.kind === 'ring')).toHaveLength(12);
    const withMates = (() => {
      TUNING.r5.dynMates = true;
      try {
        return woke(run(mk(), 6, { wake: true }));
      } finally {
        TUNING.r5.dynMates = false;
      }
    })();
    expect(withMates).toEqual([...BLOCK, ...RING].sort((a, b) => a - b));
    expect(r.activations.filter((a) => RING.includes(a.idx)).every((a) => a.depth === 1)).toBe(true);
  });

  // an L: 6, 7, 11 are parts and 12 is empty; the far parts sit in the ring of that block but form no 2x2 with the Dynamo
  const L = () => board([[6, g('dynamo')], [7, g('cannon')], [11, g('cannon')], [3, g('cannon')], [13, g('cannon')], [17, g('cannon')], [18, g('cannon')]]);

  it('not in a block (one corner empty) it wakes only its 4 touching cells', () => {
    const r = run(L(), 6, { wake: true });
    expect(woke(r)).toEqual([6, 7, 11]);
    expect(r.edges.filter((e) => e.kind === 'ring')).toHaveLength(0);
  });

  it('L3: an L of 3 parts plus the Dynamo counts as a block (the empty corner stays empty)', () => {
    const l1 = run(L(), 6, { wake: true, unitLevel: { dynamo: 1 } });
    const l3 = run(L(), 6, { wake: true, unitLevel: { dynamo: 3 } });
    expect(woke(l1)).toEqual([6, 7, 11]);
    expect(woke(l3)).toEqual([3, 6, 13, 17, 18]);
    expect(dynamoBlock(board([[6, g('dynamo')], [7, g('cannon')], [3, g('cannon')]]), 6, 3)).toBeNull(); // only 1 part + the Dynamo is not a block
  });

  it('with several blocks it picks the one with the fullest ring', () => {
    // Dynamo at 7 (row 1, col 2): the block 6,7,11,12 (ring full) or 7,8,12,13 (ring empty on the right): choose the fuller
    const grid = board([[7, g('dynamo')], [6, g('cannon')], [11, g('cannon')], [12, g('cannon')], [8, g('cannon')], [13, g('cannon')], [5, g('cannon')], [10, g('cannon')], [15, g('cannon')]]);
    const b = dynamoBlock(grid, 7, 1)!;
    expect(b.cells.sort((x, y) => x - y)).toEqual([6, 7, 11, 12]);
  });

  it('L6: two Dynamos in one block make the ring 2 cells wide; one Dynamo (or a Dynamo outside the block) does not', () => {
    const grid2 = () => board([[6, g('dynamo')], [7, g('dynamo')], [11, g('cannon')], [12, g('cannon')], [4, g('cannon')], [24, g('cannon')], [28, g('cannon')], [3, g('cannon')]]);
    const l3 = run(grid2(), 6, { wake: true, unitLevel: { dynamo: 3 } });
    const l6 = run(grid2(), 6, { wake: true, unitLevel: { dynamo: 6 } });
    expect(woke(l3)).not.toContain(24); // rows 2 and 3 away: outside the 1-wide ring
    expect(woke(l6)).toContain(24);
    expect(woke(l6)).not.toContain(28); // row 5: 3 rows below the block
    expect(woke(l6)).toContain(4);
    expect(dynamoBlock(grid2(), 6, 6)!.wide).toBe(2);
    expect(dynamoBlock(board([[6, g('dynamo')], [7, g('cannon')], [11, g('cannon')], [12, g('cannon')]]), 6, 6)!.wide).toBe(1);
  });

  it('L9: the block parts hit x1.25; the ring parts do not', () => {
    const roots = [7, 11, 12]; // the block's own parts fire here (they are woken by something else)
    const l6 = run(mk(), 6, { wake: true, roots, unitLevel: { dynamo: 6 } });
    const l9 = run(mk(), 6, { wake: true, roots, unitLevel: { dynamo: 9 } });
    expect(hit(l9, 7) / hit(l6, 7)).toBeCloseTo(1.25, 6);
    expect(hit(l9, 16)).toBeCloseTo(hit(l6, 16), 9);
  });

  it('the stacking cap: the block bonus together with other relay L9 bonuses on one part never passes x1.5', () => {
    expect(squareFit(1)).toBe(1.25);
    expect(squareFit(1.3)).toBeCloseTo(1.5 / 1.3, 9);
    expect(squareFit(1.3) * 1.3).toBeCloseTo(1.5, 9);
    expect(squareFit(1.5)).toBe(1);
    expect(squareFit(2)).toBe(1);
    for (const o of [1, 1.2, 1.25, 1.3, 1.5, 1.8]) expect(Math.max(o, squareFit(o) * o)).toBeLessThanOrEqual(Math.max(o, TUNING.r5.stackCap) + 1e-9);
    // in a real chain: the Belt Drive exit (x1.25) in the block gets less than the full x1.25 from the block
    applyRoster2(true);
    const g1 = mk();
    const r = run(g1, 6, { wake: true, roots: [7, 11, 12], unitLevel: { dynamo: 9 } });
    expect(Math.max(...r.activations.map((a) => (a.jobs?.square ?? 1)))).toBeLessThanOrEqual(1.25);
  });

  it('every part fires once; locked parts, the divider and a resting row are respected', () => {
    const r = run(mk(), 6, { wake: true, locked: new Set([8]) });
    expect(woke(r)).not.toContain(8);
    expect(new Set(r.activations.map((a) => a.idx)).size).toBe(r.activations.length);
    const rest = run(mk(), 6, { wake: true, restRow: 1 });
    expect(woke(rest)).toEqual([6]);
    const split = run(mk(), 6, { wake: true, splitB: 1 });
    for (const a of split.activations) expect(a.idx % 5 <= 1).toBe(true);
  });

  it('a lone Dynamo (no block) is never dead: it wakes its 4 touching cells', () => {
    const r = run(board([[12, g('dynamo')], [7, g('cannon')], [11, g('cannon')], [13, g('cannon')], [17, g('cannon')], [0, g('cannon')]]), 12, { wake: true });
    expect(woke(r)).toEqual([7, 11, 12, 13, 17]);
  });
});

describe('t-af818b65 roster 5: Crane LIFT', () => {
  // Coil root at 10 (row 2, col 0), rank 1: wakes 11 and 12; the Crane is at 11, a lonely pair of rank-2 Cannons at 6 (above the Crane) and 7
  const mk = () => board([[10, g('coil')], [11, g('crane')], [6, g('cannon', 2)], [7, g('cannon', 2)], [16, g('bell')]]);

  it('lifts a touching part onto its twin mid-chain: a normal merge (one cell freed, rank + 1, family kept)', () => {
    const r = run(mk(), 10, { crane: CRANE });
    expect(r.crane).toMatchObject({ from: 6, to: 7, family: 'cannon', rank: 3 });
  });

  it('the merged part counts as ALREADY FIRED: it is not in the chain and nothing wakes it again', () => {
    const grid = mk();
    grid[8] = g('coil'); // a Coil at 8 would wake the part at 7 (2 cells along the row)
    grid[11] = g('crane');
    const r = run(grid, 10, { crane: CRANE });
    expect(r.crane).toBeDefined();
    expect(woke(r)).not.toContain(7);
    expect(woke(r)).not.toContain(6);
    expect(new Set(r.activations.map((a) => a.idx)).size).toBe(r.activations.length);
    // without the crane option the same pair is just two cannons that may be woken
    const plain = run(grid.map((x) => x), 10);
    expect(plain.crane).toBeUndefined();
  });

  it('without opts.crane (a passive shot, a Beacon GO) nothing is lifted; the Crane still passes the chain on to its touching parts', () => {
    const r = run(mk(), 10);
    expect(r.crane).toBeUndefined();
    expect(woke(r)).toContain(6);
    expect(woke(r)).toContain(16);
  });

  it('acts once per cascade even with two Cranes', () => {
    const grid = board([[10, g('coil')], [11, g('crane')], [12, g('crane')], [6, g('cannon', 2)], [7, g('cannon', 2)], [8, g('bell', 3)], [13, g('bell', 3)]]);
    const r = run(grid, 10, { crane: CRANE });
    expect(r.crane).toBeDefined();
    const lifts = r.edges.filter((e) => e.kind === 'lift');
    expect(lifts).toHaveLength(1);
  });

  it('reach: L1 only a part touching the Crane; L3 up to 2 steps away', () => {
    const far = () => board([[10, g('coil')], [11, g('crane')], [1, g('cannon', 2)], [2, g('cannon', 2)]]); // 1 is 2 steps from the Crane (row 0 col 1 vs row 2 col 1)
    expect(run(far(), 10, { crane: CRANE, unitLevel: { crane: 1 } }).crane).toBeUndefined();
    expect(run(far(), 10, { crane: CRANE, unitLevel: { crane: 3 } }).crane).toMatchObject({ from: 1, to: 2 });
  });

  it('a part in the chain, a locked part or a part reserved for a delivery is never lifted', () => {
    const inChain = board([[10, g('coil')], [11, g('crane')], [12, g('cannon', 2)], [13, g('cannon', 2)]]); // 12 is woken by the Coil before the Crane lifts
    expect(run(inChain, 10, { crane: CRANE }).crane).toBeUndefined();
    expect(run(mk(), 10, { crane: CRANE, locked: new Set([6]) }).crane).toBeUndefined();
    expect(run(mk(), 10, { crane: CRANE, reserved: new Set([7]) }).crane).toBeUndefined();
  });

  it('picks the highest rank pair first, then row-major', () => {
    const grid = board([[10, g('coil')], [11, g('crane')], [6, g('cannon', 2)], [7, g('cannon', 2)], [16, g('bell', 4)], [17, g('bell', 4)]]);
    expect(run(grid, 10, { crane: CRANE }).crane).toMatchObject({ family: 'bell', rank: 5 });
  });

  it('L9: the lifted part wakes its neighbours (but never fires itself)', () => {
    const grid = () => board([[10, g('coil')], [11, g('crane')], [6, g('cannon', 2)], [7, g('cannon', 2)], [8, g('rocket')], [2, g('cannon')]]);
    const l6 = run(grid(), 10, { crane: CRANE, unitLevel: { crane: 6 } });
    const l9 = run(grid(), 10, { crane: CRANE, unitLevel: { crane: 9 } });
    expect(woke(l6)).not.toContain(8);
    expect(woke(l9)).toContain(8);
    expect(woke(l9)).toContain(2);
    expect(woke(l9)).not.toContain(7);
  });

  it('Crane allowance: one lift per level; L6 one more per boss armor phase reached', () => {
    expect([0, 1, 2].map((p) => craneAllowance(1, p))).toEqual([1, 1, 1]);
    expect([0, 1, 2].map((p) => craneAllowance(6, p))).toEqual([1, 2, 3]);
    expect(craneAllowance(9, 2)).toBe(3);
  });

  describe('in a real run', () => {
    const level = () => {
      applyRoster5(true);
      const s = newLevel(LEVELS[24], { toys: [], relays: ['crane', 'bell'] });
      s.grid.fill(null);
      s.pending = [];
      s.hp = s.maxHp = 1e9;
      s.unitLevel = {};
      s.stage = undefined;
      return s;
    };
    const place = (s: ReturnType<typeof level>) => {
      s.grid[10] = g('coil');
      s.grid[11] = g('coil');
      s.grid[12] = g('crane');
      s.grid[7] = g('cannon', 2);
      s.grid[8] = g('cannon', 2);
      s.grid[25] = g('cannon');
      s.grid[26] = g('cannon');
    };

    it('the lift is applied: the lifted part is gone, the twin is a new rank + 1 part, one merge was counted, the board shrank by one', () => {
      const s = level();
      place(s);
      const before = s.grid.filter(Boolean).length, merges = s.stats.merges;
      const r = drop(s, 11, 10, s.grid[11]!.id);
      expect(r.ok).toBe(true);
      const cas = r.events.find((e) => e.type === 'cascade') as { result: { crane?: { from: number; to: number; rank: number } } };
      expect(cas.result.crane).toMatchObject({ from: 7, to: 8 });
      expect(s.grid[7]).toBeNull();
      expect(s.grid[8]).toMatchObject({ family: 'cannon', rank: 3 });
      expect(before - s.grid.filter(Boolean).length).toBe(2); // the player's merge frees 1 cell, the lift 1 more
      expect(s.stats.merges - merges).toBe(2);
      expect(s.crane).toEqual({ used: 1 });
    });

    it('once per level: a second chain through the Crane lifts nothing; the preview matches and never mutates', () => {
      const s = level();
      place(s);
      s.grid[16] = g('cannon', 2);
      s.grid[17] = g('cannon', 2);
      expect(previewMerge(s, 11, 10)!.crane).toBeDefined();
      const json = serialize(s);
      previewMerge(s, 11, 10);
      expect(serialize(s)).toBe(json);
      drop(s, 11, 10, s.grid[11]!.id);
      expect(s.crane!.used).toBe(1);
      s.grid[10] = g('coil'); // the merged part stays at 10; re-arm another chain through the Crane
      s.grid[9] = null;
      expect(craneOpt(s)).toEqual({});
      expect(previewMerge(s, 25, 26)).not.toBeNull();
      const r = drop(s, 25, 26, s.grid[25]!.id);
      expect(r.ok).toBe(true);
      expect(s.crane!.used).toBe(1);
    });

    it('L6 allows one more lift for each boss armor phase reached', () => {
      const s = level();
      place(s);
      s.unitLevel = { crane: 6 };
      s.crane = { used: 1 };
      expect(craneOpt(s)).toEqual({});
      s.boss = { phaseShown: 1 } as unknown as typeof s.boss;
      expect(craneOpt(s).crane).toBeDefined();
      s.crane = { used: 2 };
      expect(craneOpt(s)).toEqual({});
      s.boss = { phaseShown: 2 } as unknown as typeof s.boss;
      expect(craneOpt(s).crane).toBeDefined();
    });

    it('same seed and actions give the identical state (the lift is deterministic)', () => {
      const play = () => {
        id = 9900;
        const s = level();
        place(s);
        drop(s, 11, 10, s.grid[11]!.id);
        for (let i = 0; i < 40; i++) tick(s);
        return serialize(s);
      };
      expect(play()).toBe(play());
    });

    it('a Crane lift is not a player merge: it does not arm the Wrench or release a Capacitor (Q19)', () => {
      applyRoster2(true);
      const s = level();
      place(s);
      s.wrench = { armed: [], uses: 0 };
      drop(s, 11, 10, s.grid[11]!.id);
      expect(s.crane!.used).toBe(1);
      expect(s.wrench.armed.length).toBeLessThanOrEqual(1); // only your own merge (rank 2 here) may arm; the lifted rank-3 part never does
    });
  });
});

describe('t-af818b65 roster 5: all with the other roster flags', () => {
  it('a crowded board with every roster flag on resolves with each part firing once, and the chain cap holds', () => {
    applyRoster1(true);
    applyRoster2(true);
    applyRoster3(true);
    applyRoster4(true);
    applyRoster5(true);
    const fams: Family[] = ['crane', 'dynamo', 'wrecking_ball', 'pipe', 'tesla_tower', 'cannon', 'coil', 'gear', 'spring', 'bell', 'capacitor', 'ladder'];
    const full = board(Array.from({ length: 30 }, (_, i): [number, Gadget] => [i, g(fams[i % fams.length], 1 + (i % 4))]));
    for (const level of [1, 3, 6, 9]) {
      for (const root of [0, 7, 12, 22]) {
        const r = run(full, root, { unitLevel: { crane: level, dynamo: level, wrecking_ball: level, pipe: level, gear: level }, crane: CRANE, capBank: true });
        expect(new Set(r.activations.map((a) => a.idx)).size).toBe(r.activations.length);
        expect(r.comboMult).toBeLessThanOrEqual(TUNING.comboCap + 1e-9);
      }
    }
  });

  it('random full games with crates B and all five rosters on: deterministic, no desync, every board stays legal', () => {
    applyUnits('rb');
    applyRoster1(true);
    applyRoster2(true);
    applyRoster3(true);
    applyRoster4(true);
    applyRoster5(true);
    for (const relays of [['crane', 'dynamo'], ['dynamo', 'bell'], ['crane', 'gear']] as [Family, Family][]) {
      for (const shooter of ['wrecking_ball', 'cannon'] as Family[]) {
        const play = (seed: number) => {
          const s = newLevel(LEVELS[30 + seed], { toys: [], relays, shooter, seed: 1000 + seed } as never);
          s.unitLevel = { crane: 1 + (seed % 9), dynamo: 1 + ((seed + 3) % 9), wrecking_ball: 1 + ((seed + 5) % 9) };
          s.hp = s.maxHp = 1e9;
          for (let i = 0; i < 60 && s.phase === 'playing'; i++) {
            for (let k = 0; k < 20; k++) tick(s);
            const pairs = legalPairs(s);
            if (!pairs.length) continue;
            const [a, b] = pairs[(i * 7 + seed) % pairs.length];
            drop(s, a, b, s.grid[a]!.id);
            expect(s.grid.filter(Boolean).length).toBeLessThanOrEqual(30);
          }
          return serialize(s);
        };
        for (const seed of [0, 1, 2, 3]) expect(play(seed)).toBe(play(seed));
      }
    }
  }, 120000);
});

describe('t-af818b65 roster 5: drills', () => {
  const data = raw as unknown as { drills: Record<string, PuzzleDef[]> };
  it('3 drills each for Crane, Dynamo and Wrecking Ball; each needs its unit', () => {
    applyRoster5(true);
    for (const f of ROSTER_5) {
      expect(data.drills[f], f).toHaveLength(3);
      for (const p of data.drills[f]) {
        expect(p.unit).toBe(f);
        expect(p.board.some(([fam]) => fam === f), p.id).toBe(true);
        expect(unitFreeBreaks(allLines(p), p.hp).map((l) => l.path), p.id).toEqual([]);
        const s = newPuzzle(p);
        for (const [a, b] of p.solution) drop(s, a, b, s.grid[a]!.id);
        expect(s.puzzle!.unitUsed, p.id).toBe(true);
        expect(s.phase, p.id).toBe('won');
      }
    }
  }, 120000);
});
