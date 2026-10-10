import { afterEach, describe, expect, it } from 'vitest';
import { applyUnits, storedRoster4 } from '../src/content/experiments';
import { LEVELS } from '../src/content/levels';
import { FAMILY_INFO } from '../src/content/perks';
import { goodHereAll4, goodHereText4, ROSTER_4_INFO } from '../src/content/roster4';
import { unitJob } from '../src/content/unitJobs';
import { TUNING } from '../src/content/tuning';
import { applyRoster1, applyRoster2, applyRoster3, applyRoster4, UNIT_PERKS, unitDef, UNITS } from '../src/content/units';
import raw from '../src/content/puzzles.json';
import { allLines, unitFreeBreaks } from '../src/core/puzzle';
import type { PuzzleDef } from '../src/core/game';
import { newBountyFight } from '../src/core/bounty';
import { resolveCascade, type CascadeOpts } from '../src/core/cascade';
import { rollCrate } from '../src/core/crates';
import { deserialize, drop, legalPairs, newGame, newLevel, newPuzzle, peekDeliveries, peekNext, previewMerge, serialize, tick, type GameState } from '../src/core/game';
import { Rng } from '../src/core/rng';
import { bpRank, capTargets, rwHold, rwNeed, rewindModeOk, stairWalk, stateHash } from '../src/core/roster4';
import { newRushFight } from '../src/core/rush';
import { canUseSupport, supportNeed, supportReady, useSupport } from '../src/core/support';
import { ROSTER_4, type Family, type Gadget, type Grid } from '../src/core/types';

let id = 9500;
const g = (family: Family, rank = 1): Gadget => ({ id: id++, family, rank, cd: 99 });
const board = (cells: [number, Gadget][]) => {
  const grid: Grid = Array(30).fill(null);
  for (const [i, x] of cells) grid[i] = x;
  return grid;
};
const run = (grid: Grid, root: number, o: Partial<CascadeOpts> = {}) => resolveCascade(grid, root, { perks: [], overdrive: false, ...o });
const woke = (r: ReturnType<typeof run>) => r.activations.map((a) => a.idx).sort((a, b) => a - b);
const hit = (r: ReturnType<typeof run>, idx: number) => r.activations.find((a) => a.idx === idx)!.contribution;
const depthOf = (r: ReturnType<typeof run>, idx: number) => r.activations.find((a) => a.idx === idx)!.depth;
const NEW = ROSTER_4 as string[];

afterEach(() => {
  applyUnits('off');
  applyRoster1(false);
  applyRoster2(false);
  applyRoster3(false);
  applyRoster4(false);
});

describe('t-1e3c8bb6 roster 4: flag', () => {
  it('OFF by default: no new unit in the collection, crates or squad pickers; GOOD HERE silent', () => {
    expect(TUNING.roster4).toBe(false);
    expect(UNITS).toHaveLength(13);
    for (const f of ROSTER_4) expect(unitDef(f)).toBeUndefined();
    const owned = new Set<Family>(['cannon', 'coil', 'bell', 'fan']);
    for (let seed = 1; seed < 300; seed++) for (const c of rollCrate('gold', owned, seed)) expect(NEW).not.toContain(c.unit);
    expect(goodHereText4(LEVELS.find((d) => d.boss_node)!, () => true)).toBe('');
    expect([storedRoster4(() => null), storedRoster4(() => 'on'), storedRoster4(() => { throw new Error('x'); })]).toEqual([false, true, false]);
  });

  it('ON: all four are Epic and join; Capacitor and Ladder are relays, Blueprint and Rewind Crank helpers; OFF restores the old list', () => {
    const before = UNITS.map((u) => u.id);
    applyRoster4(true);
    expect(UNITS).toHaveLength(17);
    expect(Object.fromEntries(ROSTER_4.map((f) => [f, [unitDef(f)!.rarity, unitDef(f)!.slot, unitDef(f)!.role]]))).toEqual({
      capacitor: ['epic', 'relay', 'RELAY'], blueprint: ['epic', 'helper', 'SUPPORT'], ladder: ['epic', 'relay', 'RELAY'], rewind_crank: ['epic', 'helper', 'SUPPORT'],
    });
    const order = ['common', 'rare', 'epic', 'legendary'];
    expect(UNITS.map((u) => order.indexOf(u.rarity))).toEqual([...UNITS.map((u) => order.indexOf(u.rarity))].sort());
    applyRoster4(false);
    expect(UNITS.map((u) => u.id)).toEqual(before);
  });

  it('crates can drop them while ON (Epic), never while OFF', () => {
    applyRoster4(true);
    const owned = new Set<Family>(['cannon', 'coil', 'bell', 'fan']);
    const seen = new Set<string>();
    for (let seed = 1; seed < 4000; seed++) for (const c of rollCrate('gold', owned, seed)) if (NEW.includes(c.unit)) seen.add(c.unit);
    expect([...seen].sort()).toEqual([...NEW].sort());
  });

  it('copy: role, job word, WHEN MERGED line, L3 / L6 / L9 job upgrades for each', () => {
    const jobs = { capacitor: 'HOLD', blueprint: 'PLAN', ladder: 'STAIRCASE', rewind_crank: 'UNDO' };
    for (const f of ROSTER_4) {
      expect(ROSTER_4_INFO[f].job).toBe(jobs[f]);
      expect(FAMILY_INFO[f].text.startsWith(`${jobs[f]}:`)).toBe(true);
      expect(ROSTER_4_INFO[f].whenMerged).toMatch(/^WHEN MERGED: /);
      expect(unitJob(f)).toEqual({ job: jobs[f], merged: ROSTER_4_INFO[f].whenMerged });
      expect(UNIT_PERKS[f]).toHaveLength(3);
    }
    expect([FAMILY_INFO.capacitor.role, FAMILY_INFO.blueprint.role, FAMILY_INFO.ladder.role, FAMILY_INFO.rewind_crank.role]).toEqual(['RELAY', 'SUPPORT', 'RELAY', 'SUPPORT']);
  });

  it('GOOD HERE names an owned unit that suits the level (only with the flag), on one line with the other batches', () => {
    const chain = LEVELS.find((d) => d.goal?.kind === 'chain')!;
    const rank = LEVELS.find((d) => d.goal?.kind === 'rank')!;
    const boss = LEVELS.find((d) => d.boss_node)!;
    expect(goodHereText4(chain, () => true)).toBe('');
    applyRoster4(true);
    expect(goodHereText4(chain, (u) => u === 'capacitor')).toMatch(/^GOOD HERE: CAPACITOR \(/);
    expect(goodHereText4(rank, (u) => u === 'ladder')).toContain('LADDER');
    expect(goodHereText4(boss, (u) => u === 'rewind_crank')).toContain('REWIND CRANK');
    expect(goodHereText4(boss, () => false)).toBe('');
    applyRoster3(true);
    for (const d of LEVELS) expect(goodHereAll4(d, () => true).match(/GOOD HERE/g)?.length ?? 1).toBe(1);
  });

  it('the job lines show: the flag-OFF cascade of a board holding the new families is the same as ever (no new unit acts)', () => {
    // with no roster 4 unit on the board nothing changes: a plain chain gives the same numbers with and without the new options
    const grid = () => board([[10, g('coil', 2)], [11, g('cannon')], [12, g('bell')], [13, g('cannon')]]);
    const a = run(grid(), 10), b = run(grid(), 10, { capBank: true });
    expect([b.total, woke(b)]).toEqual([a.total, woke(a)]);
    expect(b.capBanked).toBeUndefined();
  });
});

describe('t-1e3c8bb6 roster 4: Capacitor HOLD', () => {
  // a Coil you merge at 10 (2,0) reaches 11 and 12; the Capacitor sits at 12 (2,2), a Cannon touches it at 13
  const cap = () => g('capacitor');
  const bank = (level = 1) => {
    const c = cap();
    const r = run(board([[10, g('coil', 2)], [12, c], [13, g('cannon')]]), 10, { capBank: true, unitLevel: { capacitor: level } });
    return { r, c };
  };
  it('does not pass the chain on: woken, it banks the chain and the part touching it stays asleep', () => {
    const { r, c } = bank();
    expect(woke(r)).toEqual([10, 12]);
    expect(r.capBanked).toEqual([c.id]);
    const noBank = run(board([[10, g('coil', 2)], [12, cap()], [13, g('cannon')]]), 10); // not a player merge: it passes nothing and banks nothing
    expect(woke(noBank)).toEqual([10, 12]);
    expect(noBank.capBanked).toBeUndefined();
  });
  // the next merge: a Cannon you merge at 0 (nothing near it); the Capacitor at 12 releases at the start
  const next = (cells: [number, Gadget][], c: Gadget, level = 1, o: Partial<CascadeOpts> = {}) => run(board([[0, g('cannon', 2)], ...cells]), 0, { capRelease: { id: c.id }, unitLevel: { capacitor: level }, ...o });
  it('the release wakes 1 touching part (the strongest, then row-major) and is a link in the NEXT merge\'s chain', () => {
    const c = cap();
    const r = next([[12, c], [7, g('cannon', 3)], [13, g('cannon')], [17, g('cannon')]], c);
    expect(woke(r)).toEqual([0, 7, 12]);
    expect(r.capReleased).toBe(c.id);
    expect(depthOf(r, 12)).toBe(0);
    expect(depthOf(r, 7)).toBe(1);
    expect(r.edges.some((e) => e.kind === 'cap' && e.from === 12 && e.to === 7)).toBe(true);
    const tie = cap();
    expect(woke(next([[12, tie], [13, g('cannon')], [17, g('cannon')]], tie))).toEqual([0, 12, 13]); // same rank: row-major (13 before 17)
  });
  it('the woken part carries the chain on as any part would', () => {
    const c = cap();
    const r = next([[12, c], [13, g('coil')], [14, g('cannon')]], c); // the Coil it woke wakes the Cannon beyond
    expect(woke(r)).toEqual([0, 12, 13, 14]);
  });
  it('L6: the release adds 1 link of depth; L9: it wakes 2 touching parts', () => {
    const c = cap();
    const cells = (): [number, Gadget][] => [[12, c], [7, g('cannon', 3)], [13, g('cannon', 2)], [17, g('cannon')]];
    expect(depthOf(next(cells(), c, 3), 7)).toBe(1);
    expect(depthOf(next(cells(), c, 6), 7)).toBe(2);
    expect(woke(next(cells(), c, 6))).toEqual([0, 7, 12]);
    expect(woke(next(cells(), c, 9))).toEqual([0, 7, 12, 13]);
    expect(capTargets(board([[12, c], [7, g('cannon')], [13, g('cannon')], [11, g('cannon')]]), 12, 9, () => false, new Set())).toHaveLength(2);
  });
  it('a locked part, a part already in the chain and the board edge are never targets', () => {
    const c = cap();
    expect(woke(next([[12, c], [7, g('cannon', 3)], [13, g('cannon')]], c, 1, { locked: new Set([7]) }))).toEqual([0, 12, 13]);
    expect(woke(next([[12, c], [7, g('cannon', 3)]], c, 1, { reserved: new Set([7]) }))).toEqual([0, 12]);
    expect(woke(next([[12, c]], c))).toEqual([0, 12]); // nothing touching: it still released (once)
  });

  describe('anti-loop rule', () => {
    it('releases ONCE: a banked part is released in one cascade and that cascade stores nothing', () => {
      const c = cap();
      const r = next([[12, c], [13, g('cannon')]], c);
      expect(r.capReleased).toBe(c.id);
      expect(r.capBanked).toBeUndefined();
      expect(r.activations.filter((a) => a.id === c.id)).toHaveLength(1);
    });
    it('a release never stores another release: a second Capacitor woken inside a releasing cascade banks nothing', () => {
      const a = cap(), b = cap();
      const r = next([[12, a], [13, g('coil')], [14, b], [8, g('cannon')]], a, 1, { capBank: true });
      expect(woke(r)).toContain(14); // the second one was woken (it is a part like any other)
      expect(r.capBanked).toBeUndefined();
      expect(r.capReleased).toBe(a.id);
    });
    it('never re-triggers itself: a chain that comes back to the releasing Capacitor cannot wake it a second time', () => {
      const c = cap();
      const r = next([[12, c], [13, g('coil')], [11, g('cannon')]], c); // the Coil at 13 reaches back over 12
      expect(r.activations.filter((a) => a.idx === 12)).toHaveLength(1);
      expect(r.activations.every((a, i, all) => all.findIndex((x) => x.idx === a.idx) === i)).toBe(true);
    });
    it('one bank at a time: two Capacitors woken in one merge, only the first banks', () => {
      const a = cap(), b = cap();
      const r = run(board([[10, g('coil', 2)], [11, a], [12, b]]), 10, { capBank: true });
      expect(r.capBanked).toHaveLength(1);
      expect(woke(r)).toEqual([10, 11, 12]);
    });
    it('L9 still stores one chain and releases it once (2 parts woken, one release)', () => {
      const c = cap();
      const r = next([[12, c], [7, g('cannon')], [13, g('cannon')], [17, g('cannon')]], c, 9);
      expect(r.activations.filter((a) => a.idx === 12)).toHaveLength(1);
      expect(r.capBanked).toBeUndefined();
      expect(r.edges.filter((e) => e.kind === 'cap')).toHaveLength(2);
    });
    it('in a real run: bank on one merge, release on the next, and only your own merges count', () => {
      applyRoster4(true);
      const s = newLevel(LEVELS[24], { toys: [], relays: ['capacitor', 'bell'] });
      s.grid.fill(null);
      s.pending = [];
      s.hp = s.maxHp = 1e9;
      s.unitLevel = {};
      s.grid[10] = g('coil', 1);
      s.grid[11] = g('coil', 1);
      const cp = g('capacitor');
      s.grid[12] = cp;
      s.grid[13] = g('cannon', 1);
      s.grid[25] = g('cannon', 1);
      s.grid[26] = g('cannon', 1);
      s.grid[27] = g('cannon', 2);
      const json = serialize(s);
      expect(previewMerge(s, 11, 10)!.activations.some((a) => a.idx === 12)).toBe(true); // the preview sees the capacitor wake
      expect(serialize(s)).toBe(json); // a preview mutates nothing (the bank included)
      const r1 = drop(s, 11, 10, s.grid[11]!.id);
      expect(r1.ok).toBe(true);
      expect(s.cap).toMatchObject({ id: cp.id });
      expect(s.grid[13]!.family).toBe('cannon');
      const c1 = r1.events.find((e) => e.type === 'cascade') as { result: { activations: { idx: number }[] } };
      expect(c1.result.activations.map((a) => a.idx)).not.toContain(13); // it did not pass the chain on
      const pv = previewMerge(s, 25, 26)!;
      expect(pv.capReleased).toBe(cp.id); // the next merge's preview shows the release
      const r2 = drop(s, 25, 26, s.grid[25]!.id);
      const c2 = r2.events.find((e) => e.type === 'cascade') as { result: { capReleased?: number; capBanked?: number[]; activations: { idx: number }[] } };
      expect(c2.result.capReleased).toBe(cp.id);
      expect(c2.result.capBanked).toBeUndefined();
      expect(s.cap).toBeUndefined(); // spent
      expect(c2.result.activations.map((a) => a.idx)).toContain(13);
      const r3 = drop(s, 27, 26, s.grid[27]!.id); // a third merge releases nothing
      const c3 = r3.events.find((e) => e.type === 'cascade') as { result: { capReleased?: number } };
      expect(c3.result.capReleased).toBeUndefined();
    });
    it('a Capacitor you merge hands its bank to the merged part; a bank whose Capacitor is gone is lost, not carried', () => {
      applyRoster4(true);
      const s = newLevel(LEVELS[24], { toys: [] });
      s.grid.fill(null);
      s.pending = [];
      s.hp = s.maxHp = 1e9;
      s.unitLevel = {};
      const a = g('capacitor'), b = g('capacitor');
      s.grid[3] = a;
      s.grid[4] = b;
      s.grid[20] = g('cannon', 1);
      s.grid[21] = g('cannon', 1);
      s.cap = { id: a.id, held: 4 };
      const r = drop(s, 3, 4, a.id); // merging the holder: the merged Capacitor is the root and releases
      const c = r.events.find((e) => e.type === 'cascade') as { result: { capReleased?: number } };
      expect(c.result.capReleased).toBe(s.grid[4]!.id);
      expect(s.cap).toBeUndefined();
      s.cap = { id: 123456, held: 2 }; // its part was scrapped / merged away long ago
      drop(s, 20, 21, s.grid[20]!.id);
      expect(s.cap).toBeUndefined();
    });
  });
});

describe('t-1e3c8bb6 roster 4: Ladder STAIRCASE', () => {
  // a Coil you merge at 10 (2,0) reaches 12; the Ladder (rank 2) sits at 12 (2,2); the stairs climb to the right
  const stairs = (cells: [number, Gadget][], level = 1, lr = 2) => run(board([[10, g('coil', 2)], [12, g('ladder', lr)], ...cells]), 10, { unitLevel: { ladder: level } });
  it('wakes the touching part exactly 1 rank above it, then from that part the one 1 higher, each step touching', () => {
    const r = stairs([[13, g('cannon', 3)], [14, g('cannon', 4)], [7, g('cannon', 2)], [11, g('cannon', 1)]]);
    expect(woke(r)).toEqual([10, 11, 12, 13, 14]); // the Coil you merged also reaches the rank 1 at 11 (it is not part of the staircase)
    expect(woke(r)).not.toContain(7); // a rank 2 beside a rank 2 Ladder is not 1 above it
    expect(r.edges.filter((e) => e.kind === 'stair').map((e) => [e.from, e.to])).toEqual([[12, 13], [13, 14]]);
    expect(depthOf(r, 13)).toBe(2);
    expect(depthOf(r, 14)).toBe(3);
  });
  it('each step must touch the one before it: a rank 4 anywhere else does not continue it', () => {
    const r = stairs([[13, g('cannon', 3)], [29, g('cannon', 4)], [24, g('cannon', 4)]]);
    expect(woke(r)).toEqual([10, 12, 13]);
  });
  it('a wrong rank at a step stops it; the Ladder needs a part exactly one above', () => {
    expect(woke(stairs([[13, g('cannon', 4)]]))).toEqual([10, 12]);
    expect(woke(stairs([[13, g('cannon', 3)], [14, g('cannon', 3)]]))).toEqual([10, 12, 13]);
  });
  it('L3: with no part one rank up, it may step DOWN (and keeps going down)', () => {
    const cells = (): [number, Gadget][] => [[13, g('cannon', 2)]];
    expect(woke(stairs(cells(), 1, 3))).toEqual([10, 12]);
    expect(woke(stairs(cells(), 3, 3))).toEqual([10, 12, 13]);
    expect(woke(stairs([[13, g('cannon', 2)], [14, g('cannon', 1)]], 3, 3))).toEqual([10, 12, 13, 14]);
    expect(woke(stairs([[13, g('cannon', 2)], [14, g('cannon', 3)]], 3, 3))).toEqual([10, 12, 13]); // once going down it does not climb again
  });
  it('L6: it may skip ONE rank, once', () => {
    expect(woke(stairs([[13, g('cannon', 4)]], 3))).toEqual([10, 12]);
    expect(woke(stairs([[13, g('cannon', 4)]], 6))).toEqual([10, 12, 13]);
    expect(woke(stairs([[13, g('cannon', 4)], [14, g('cannon', 6)]], 6))).toEqual([10, 12, 13]); // a second skip is not allowed
    expect(woke(stairs([[13, g('cannon', 4)], [14, g('cannon', 5)]], 6))).toEqual([10, 12, 13, 14]);
  });
  it('L9: the top step hits x1.5, only that one', () => {
    const cells = (): [number, Gadget][] => [[13, g('cannon', 3)], [14, g('cannon', 4)]];
    const base = TUNING.base.cannon;
    const r9 = stairs(cells(), 9), r6 = stairs(cells(), 6);
    expect(hit(r9, 14) / (base * Math.pow(TUNING.rankMult, 3))).toBeCloseTo(1.5);
    expect(hit(r9, 13) / (base * Math.pow(TUNING.rankMult, 2))).toBeCloseTo(1);
    expect(hit(r6, 14) / (base * Math.pow(TUNING.rankMult, 3))).toBeCloseTo(1);
    expect(TUNING.r4.stairTop).toBe(1.5);
  });
  it('at most r4.stairMax steps, every part fires once, never another Ladder, a locked part or across the divider; a resting row wakes nobody', () => {
    const climb = Array.from({ length: 7 }, (_, i): [number, Gadget] => [[13, 14, 19, 24, 23, 22, 21][i], g('cannon', 3 + i)]);
    expect(stairWalk(board([[12, g('ladder', 2)], ...climb]), 12, 2, 1, () => false, () => true).length).toBeLessThanOrEqual(TUNING.r4.stairMax);
    expect(woke(stairs([[13, g('ladder', 3)]]))).toEqual([10, 12]);
    expect(woke(stairs([[13, g('cannon', 3)]], 1)).includes(13)).toBe(true);
    expect(woke(run(board([[10, g('coil', 2)], [12, g('ladder', 2)], [13, g('cannon', 3)]]), 10, { locked: new Set([13]) }))).toEqual([10, 12]);
    expect(woke(run(board([[2, g('coil', 2)], [12, g('ladder', 2)], [13, g('cannon', 3)]]), 2, { restRow: 2 }))).toEqual([2, 12]); // row 2 rests: the Ladder in it wakes nobody
    expect(woke(run(board([[10, g('coil', 2)], [12, g('ladder', 2)], [13, g('cannon', 3)]]), 10, { splitB: 2 }))).toEqual([10, 12]); // 13 is across the divider from the Ladder
    const full = board(Array.from({ length: 30 }, (_, i): [number, Gadget] => [i, g(i === 12 ? 'ladder' : 'cannon', 1 + (i % 8))]));
    const r = run(full, 12, { unitLevel: { ladder: 9 } });
    expect(new Set(r.activations.map((a) => a.idx)).size).toBe(r.activations.length);
    expect(r.comboMult).toBeLessThanOrEqual(TUNING.comboCap + 1e-9);
  });
  it('prefers a shooter at a step, then row-major', () => {
    const grid = board([[12, g('ladder', 2)], [7, g('coil', 3)], [13, g('cannon', 3)], [17, g('cannon', 3)]]);
    expect(stairWalk(grid, 12, 2, 1, () => false, (i) => grid[i]!.family === 'cannon')).toEqual([13]);
  });
});

describe('t-1e3c8bb6 roster 4: Blueprint PLAN', () => {
  const level = () => {
    applyRoster4(true);
    const s = newLevel(LEVELS[24], { toys: ['blueprint'] });
    s.unitLevel = { blueprint: 1 };
    s.reactive = false; // timed deliveries: the tests wait for them
    s.calmCap = undefined;
    return s;
  };
  it('is an off-board Support card: it never sits on the board, never joins the bag, and charges like the other cards', () => {
    const s = level();
    expect(s.support?.family).toBe('blueprint');
    expect(s.grid.some((x) => x?.family === 'blueprint')).toBe(false);
    for (let i = 0; i < 200; i++) tick(s);
    expect([...s.bag, ...s.pending].some((x) => (typeof x === 'string' ? x : x.family) === 'blueprint')).toBe(false);
    expect(supportReady(s)).toBe(false);
    s.support!.charge = supportNeed(s);
    expect(supportReady(s)).toBe(true);
  });
  it('shows the next 3 deliveries (4 from L3) and peeking changes nothing (RNG included)', () => {
    const s = level();
    const json = serialize(s);
    const three = peekDeliveries(s, 3);
    expect(three).toHaveLength(3);
    expect(serialize(s)).toBe(json);
    expect(peekDeliveries(s, 4)).toHaveLength(4);
    expect(three[0]).toMatchObject({ family: peekNext(s).family, rank: peekNext(s).rank });
    expect(peekDeliveries(s, 4).slice(0, 3)).toEqual(three);
    s.pending = [g('cannon'), g('coil')];
    const mixed = peekDeliveries(s, 4);
    expect(mixed.slice(0, 2).map((u) => u.pend)).toEqual([0, 1]);
    expect(mixed.slice(2).every((u) => u.ord !== undefined)).toBe(true);
  });
  it('the peek matches what really arrives (same RNG, board unchanged)', () => {
    const s = level();
    s.bagOverride = { cannon: 3, coil: 2, bell: 2 };
    s.bag = [];
    s.grid.fill(null); // nothing for the matchmaker or a rescue to react to
    s.copyCap = 1;
    const want = peekDeliveries(s, 3).map((u) => u.family);
    const got: string[] = [];
    for (let i = 0; i < 600 && got.length < 3; i++)
      for (const e of tick(s)) if (e.type === 'delivery') {
        got.push(e.gadget.family);
        s.grid[e.idx] = null; // keep the board empty
      }
    expect(got).toHaveLength(3);
    expect(got).toEqual(want);
  });
  it('swap: tap a part and the next delivery that is not that kind becomes a copy of it at number 1 (RNG order untouched)', () => {
    const s = level();
    s.grid.fill(null);
    s.pending = [];
    s.grid[7] = g('bell', 1);
    s.grid[8] = g('bell', 1); // pairs only, so the matchmaker has nothing lonely to copy
    s.grid[12] = g('cannon', 1);
    s.grid[13] = g('cannon', 1);
    s.support!.charge = supportNeed(s);
    const before = peekDeliveries(s, 3);
    const first = before.find((u) => u.family !== 'bell')!;
    expect(canUseSupport(s, 7)).toBe(true);
    expect(canUseSupport(s, 9)).toBe(false); // an empty cell
    const rngBefore = [s.supplyRng, s.bag.slice(), s.shipments];
    const r = useSupport(s, 7);
    expect(r.ok).toBe(true);
    expect(s.support!.charge).toBe(0);
    const after = peekDeliveries(s, 3);
    expect(after.filter((u, i) => u.family !== before[i].family)).toHaveLength(first.ord !== undefined || first.pend !== undefined ? 1 : 0);
    expect(after.find((u) => u.family === 'bell' && u.rank === 1)).toBeTruthy();
    expect([s.supplyRng, s.bag.slice(), s.shipments]).toEqual(rngBefore); // swapping consumes no random numbers
    // really delivered as rank 1 bell
    const came: Gadget[] = [];
    for (let i = 0; i < 800 && came.length < 3; i++) for (const e of tick(s)) if (e.type === 'delivery') { came.push(e.gadget); s.grid[e.idx] = null; }
    expect(came.some((x) => x.family === 'bell' && x.rank === 1)).toBe(true);
  });
  it('copies always arrive at rank 1 (never the target\'s rank); L9: the first copy of a use arrives at rank 2; L6 swaps 2', () => {
    expect([bpRank(1, true), bpRank(6, true), bpRank(9, true), bpRank(9, false)]).toEqual([1, 1, 2, 1]);
    const s = level();
    s.grid.fill(null);
    s.pending = [];
    s.grid[7] = g('cannon', 5); // a rank 5 target
    s.grid[8] = g('cannon', 5);
    s.unitLevel = { blueprint: 6 };
    s.support!.charge = supportNeed(s);
    useSupport(s, 7);
    const swapped = peekDeliveries(s, 3).filter((u) => u.family === 'cannon');
    expect(swapped.length).toBeGreaterThanOrEqual(2);
    expect(swapped.every((u) => u.rank === 1)).toBe(true);
    const s9 = level();
    s9.grid.fill(null);
    s9.pending = [];
    s9.grid[7] = g('cannon', 5);
    s9.grid[8] = g('cannon', 5);
    s9.unitLevel = { blueprint: 9 };
    s9.support!.charge = supportNeed(s9);
    useSupport(s9, 7);
    expect(peekDeliveries(s9, 4).filter((u) => u.family === 'cannon' && u.rank === 2)).toHaveLength(1); // exactly the first copy
  });
  it('a swap in the tray queue replaces that part; a locked part, a part already of every shown kind, and an uncharged card refuse', () => {
    const s = level();
    s.grid.fill(null);
    s.pending = [g('coil'), g('coil'), g('coil')];
    s.grid[7] = g('bell');
    s.grid[8] = g('bell');
    s.support!.charge = supportNeed(s) - 1;
    expect(canUseSupport(s, 7)).toBe(false);
    s.support!.charge = supportNeed(s);
    useSupport(s, 7);
    expect(s.pending.map((x) => x.family)).toEqual(['bell', 'coil', 'coil']);
    expect(s.pending[0].rank).toBe(1);
    s.pending = [g('bell'), g('bell'), g('bell')];
    s.support!.charge = supportNeed(s);
    expect(canUseSupport(s, 7)).toBe(false); // every shown delivery is already a bell
  });
});

describe('t-1e3c8bb6 roster 4: Rewind Crank UNDO', () => {
  const card = (levelNo = 1, def = LEVELS[24]) => {
    applyRoster4(true);
    const s = newLevel(def, { toys: ['rewind_crank'] });
    s.unitLevel = { rewind_crank: levelNo };
    return s;
  };
  const merges = (s: GameState, rng: Rng) => {
    const p = legalPairs(s);
    if (!p.length) return null;
    const [a, b] = p[rng.int(p.length)];
    return { a, b, id: s.grid[a]!.id };
  };

  it('is an off-board Support card; charges +1 per merge you make: 10 merges (8 from L3), holds 1 charge (2 from L6)', () => {
    expect([rwNeed(1), rwNeed(3), rwNeed(6), rwHold(1), rwHold(6)]).toEqual([10, 8, 8, 1, 2]);
    const s = card();
    expect(s.support?.family).toBe('rewind_crank');
    expect(s.grid.some((x) => x?.family === 'rewind_crank')).toBe(false);
    expect(supportNeed(s)).toBe(10);
    const rng = new Rng(7);
    let made = 0;
    for (let guard = 0; made < 12 && guard < 4000; guard++) {
      tick(s);
      const m = guard % 6 === 0 ? merges(s, rng) : null;
      if (m && drop(s, m.a, m.b, m.id).ok) {
        made++;
        if (s.phase !== 'playing') break;
        expect(s.support!.charge).toBe(Math.min(made, 10));
      }
    }
    expect(supportReady(s)).toBe(s.phase === 'playing' && made >= 10);
    expect(card(3).support!.charge).toBe(0);
    expect(supportNeed({ ...card(3), unitLevel: { rewind_crank: 3 } } as GameState)).toBe(8);
  });

  it('HASH PROOF: after a rewind the state hash equals the hash before the undone merge, RNG included, over many random games', () => {
    let rewinds = 0, games = 0;
    const defs = [LEVELS[20], LEVELS[24], LEVELS[29], LEVELS[39], LEVELS[49], LEVELS[59], LEVELS[69], LEVELS[79]];
    for (let seed = 1; seed <= 90; seed++) {
      const rng = new Rng(seed * 7919);
      const lv = [1, 3, 6, 9][seed % 4];
      applyRoster4(true);
      const s = newLevel({ ...defs[seed % defs.length], seed }, { toys: ['rewind_crank'], relays: seed % 3 === 0 ? ['capacitor', 'ladder'] : seed % 3 === 1 ? ['coil', 'capacitor'] : ['ladder', 'bell'] });
      s.unitLevel = { rewind_crank: lv, capacitor: lv, ladder: lv, blueprint: lv };
      s.hp = s.maxHp = 1e9; // the hash must hold on every board, not only until someone wins
      s.timeLeft = 1e6;
      games++;
      for (let step = 0; step < 90 && s.phase === 'playing'; step++) {
        for (let k = rng.int(25) + 5; k > 0; k--) tick(s);
        const m = merges(s, rng);
        if (!m) continue;
        const h0 = stateHash(s);
        const rngs = [s.supplyRng, s.perkRng, s.kickRng, s.itemRng, s.nextId, s.shipments, s.bag.join(), s.hp, s.elapsed];
        s.support!.charge = 99; // always loaded: the hash must not care what the crank's meter says
        if (!drop(s, m.a, m.b, m.id).ok) continue;
        if (s.phase !== 'playing') break;
        for (let k = rng.int(40); k > 0; k--) tick(s); // up to 2 s of play between the merge and the tap
        if (rng.int(10) < 4) {
          expect(canUseSupport(s, -1)).toBe(true);
          expect(useSupport(s, -1).ok).toBe(true);
          rewinds++;
          expect(stateHash(s)).toBe(h0);
          expect([s.supplyRng, s.perkRng, s.kickRng, s.itemRng, s.nextId, s.shipments, s.bag.join(), s.hp, s.elapsed]).toEqual(rngs);
          expect(useSupport(s, -1).ok).toBe(false); // one undo point only: no second undo in a row
        }
      }
    }
    expect(games).toBe(90);
    expect(rewinds).toBeGreaterThan(500);
  }, 180000);

  it('after a rewind the same merge replays to the identical result (the dice came back too)', () => {
    const s = card();
    const rng = new Rng(3);
    for (let i = 0; i < 60; i++) tick(s);
    const m = merges(s, rng)!;
    s.support!.charge = 99;
    drop(s, m.a, m.b, m.id);
    const afterFirst = stateHash(s);
    useSupport(s, -1);
    drop(s, m.a, m.b, m.id);
    expect(stateHash(s)).toBe(afterFirst);
  });

  it('the crank pays one charge; the undone merge does not count toward the next one; the board object stays the same one', () => {
    const s = card();
    const rng = new Rng(11);
    const ref = s;
    for (let i = 0; i < 60; i++) tick(s);
    const m = merges(s, rng)!;
    s.support!.charge = 9; // one short
    drop(s, m.a, m.b, m.id);
    expect(s.support!.charge).toBe(10);
    expect(supportReady(s)).toBe(true);
    useSupport(s, -1);
    expect(s.support!.charge).toBe(0);
    expect(s).toBe(ref);
    expect(s.support!.uses).toBe(1);
    expect(s.support!.snap).toBeUndefined();
  });

  it('L6 holds 2 charges (one use costs one); L1 holds only 1', () => {
    const s = card(6);
    const rng = new Rng(5);
    for (let i = 0; i < 60; i++) tick(s);
    s.support!.charge = 19;
    const m = merges(s, rng)!;
    drop(s, m.a, m.b, m.id);
    expect(s.support!.charge).toBe(16); // capped at 2 x 8
    useSupport(s, -1);
    expect(s.support!.charge).toBeGreaterThanOrEqual(7);
    const one = card(1);
    for (let i = 0; i < 60; i++) tick(one);
    one.support!.charge = 10;
    const m2 = merges(one, rng)!;
    drop(one, m2.a, m2.b, m2.id);
    expect(one.support!.charge).toBe(10);
  });

  it('not ready (uncharged) or with no merge to undo it refuses and costs nothing', () => {
    const s = card();
    expect(canUseSupport(s, -1)).toBe(false);
    s.support!.charge = 10;
    expect(canUseSupport(s, -1)).toBe(false); // no merge made yet: no undo point
    expect(useSupport(s, -1)).toEqual({ ok: false, events: [] });
    expect(s.support!.charge).toBe(10);
  });

  it('an undo point older than r4.rwWindow seconds of level time is gone (no taking back time)', () => {
    const s = card();
    const rng = new Rng(2);
    for (let i = 0; i < 60; i++) tick(s);
    const m = merges(s, rng)!;
    s.support!.charge = 10;
    drop(s, m.a, m.b, m.id);
    expect(canUseSupport(s, -1)).toBe(true);
    s.support!.snapAt = s.elapsed - TUNING.r4.rwWindow - 0.1;
    expect(canUseSupport(s, -1)).toBe(false);
  });

  it('L9: the rewind event shows the delivery it rewound; lower levels do not', () => {
    for (const [lv, shows] of [[1, false], [9, true]] as const) {
      const s = card(lv);
      const rng = new Rng(4);
      for (let i = 0; i < 60; i++) tick(s);
      const m = merges(s, rng)!;
      s.support!.charge = 99;
      drop(s, m.a, m.b, m.id);
      const ev = useSupport(s, -1).events.find((e) => e.type === 'rewind') as { peek?: { family: Family } };
      expect(ev).toBeTruthy();
      expect(!!ev.peek).toBe(shows);
      if (shows) expect(ev.peek).toEqual(peekNext(s));
    }
  });

  it('survives a save: the undo point is part of the saved run', () => {
    const s = card();
    const rng = new Rng(9);
    for (let i = 0; i < 60; i++) tick(s);
    const m = merges(s, rng)!;
    const h0 = stateHash(s);
    s.support!.charge = 10;
    drop(s, m.a, m.b, m.id);
    const loaded = deserialize(serialize(s))!;
    expect(useSupport(loaded, -1).ok).toBe(true);
    expect(stateHash(loaded)).toBe(h0);
  });

  describe('OFF in Workshop Puzzles / drills, the Daily Puzzle, the Daily Bench, Monster Bounties and Boss Rush', () => {
    const loaded = (s: GameState) => {
      s.support = { family: 'rewind_crank', charge: 99, uses: 0 };
      s.unitLevel = { rewind_crank: 9 };
      return s;
    };
    const tryUse = (s: GameState) => {
      const pairs = legalPairs(s);
      expect(pairs.length).toBeGreaterThan(0);
      const [a, b] = pairs[0];
      drop(s, a, b, s.grid[a]!.id);
      return { snap: s.support!.snap, can: canUseSupport(s, -1), used: useSupport(s, -1).ok, ready: supportReady(s) };
    };
    const simple = { id: 'x', moves: 3, hp: 1e9, board: [['cannon', 1, 0, 0], ['cannon', 1, 0, 1], ['coil', 1, 2, 2], ['coil', 1, 2, 3]] as [string, number, number, number][], solution: [[0, 1]] as [number, number][] };
    it('a drill / puzzle / the Daily Puzzle', () => {
      applyRoster4(true);
      const s = loaded(newPuzzle({ ...simple, unit: 'cannon' }));
      expect(rewindModeOk(s)).toBe(false);
      expect(tryUse(s)).toEqual({ snap: undefined, can: false, used: false, ready: false });
      const daily = loaded(newPuzzle({ ...simple, id: 'daily-2026-10-10' }));
      expect(tryUse(daily)).toMatchObject({ snap: undefined, can: false, used: false });
    });
    it('the Daily Bench', () => {
      applyRoster4(true);
      const s = loaded(newGame(5, false, false, [], -1));
      s.daily = '2026-10-10';
      for (let i = 0; i < 100; i++) tick(s);
      expect(rewindModeOk(s)).toBe(false);
      expect(tryUse(s)).toMatchObject({ snap: undefined, can: false, used: false, ready: false });
    });
    it('Monster Bounties and Boss Rush', () => {
      applyRoster4(true);
      const bossId = 'tin_can_king';
      const bounty = loaded(newBountyFight(bossId, 'gaps', '2026-10-10', 0));
      for (let i = 0; i < 100; i++) tick(bounty);
      expect(rewindModeOk(bounty)).toBe(false);
      expect(tryUse(bounty)).toMatchObject({ snap: undefined, can: false, used: false, ready: false });
      const rush = loaded(newRushFight(bossId, 1, 3));
      for (let i = 0; i < 100; i++) tick(rush);
      expect(rewindModeOk(rush)).toBe(false);
      expect(tryUse(rush)).toMatchObject({ snap: undefined, can: false, used: false, ready: false });
    });
    it('and ON in a normal saga level, with the flag off nothing is ever a card', () => {
      applyRoster4(true);
      const s = card();
      expect(rewindModeOk(s)).toBe(true);
      applyRoster4(false);
      expect(newLevel(LEVELS[24], { toys: ['rewind_crank'] }).support).toBeUndefined();
      expect(newLevel(LEVELS[24], { toys: ['blueprint'] }).support).toBeUndefined();
    });
  });
});

describe('t-1e3c8bb6 roster 4: all four together with the other roster flags', () => {
  it('a crowded board with every roster flag on resolves with each part firing once, and the chain cap holds', () => {
    applyRoster1(true);
    applyRoster2(true);
    applyRoster3(true);
    applyRoster4(true);
    const fams: Family[] = ['capacitor', 'ladder', 'pipe', 'tesla_tower', 'cannon', 'coil', 'gear', 'spring', 'bell', 'nail_gun'];
    const full = board(Array.from({ length: 30 }, (_, i): [number, Gadget] => [i, g(fams[i % fams.length], 1 + (i % 4))]));
    for (const level of [1, 3, 6, 9]) {
      for (const root of [0, 7, 12, 22]) {
        const r = run(full, root, { unitLevel: { capacitor: level, ladder: level, pipe: level, tesla_tower: level }, capBank: true });
        expect(new Set(r.activations.map((a) => a.idx)).size).toBe(r.activations.length);
        expect(r.comboMult).toBeLessThanOrEqual(TUNING.comboCap + 1e-9);
        expect(r.capBanked?.length ?? 0).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe('t-1e3c8bb6 roster 4: drills', () => {
  const data = raw as unknown as { drills: Record<string, PuzzleDef[]> };
  it('3 drills each for Capacitor and Ladder; Blueprint and Rewind Crank have none (a drill has no delivery queue to plan and the crank is OFF there); each needs its unit', () => {
    expect(data.drills.blueprint).toBeUndefined();
    expect(data.drills.rewind_crank).toBeUndefined();
    applyRoster4(true);
    for (const f of ['capacitor', 'ladder']) {
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
