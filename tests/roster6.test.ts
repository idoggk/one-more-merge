import { afterEach, describe, expect, it } from 'vitest';
import { applyUnits, storedRoster6 } from '../src/content/experiments';
import { LEVELS } from '../src/content/levels';
import { FAMILY_INFO } from '../src/content/perks';
import { goodHereAll6, goodHereText6, ROSTER_6_INFO } from '../src/content/roster6';
import { unitJob } from '../src/content/unitJobs';
import { TUNING } from '../src/content/tuning';
import { applyRoster1, applyRoster2, applyRoster3, applyRoster4, applyRoster5, applyRoster6, ALL_UNIT_IDS, UNIT_PERKS, unitDef, UNITS } from '../src/content/units';
import raw from '../src/content/puzzles.json';
import { allLines, unitFreeBreaks } from '../src/core/puzzle';
import { resolveCascade, type CascadeOpts } from '../src/core/cascade';
import { rollCrate } from '../src/core/crates';
import { drop, legalPairs, newLevel, newPuzzle, previewMerge, serialize, tick, type PuzzleDef } from '../src/core/game';
import { LEGENDARY_RELAYS, canCopy, copyKeep, copyLevel, copyOwnMult, pickCopy, planTilt, rememberCopy, tiltDirOf, tiltMax, tiltNeed } from '../src/core/roster6';
import { Rng } from '../src/core/rng';
import { supportNeed } from '../src/core/support';
import { ROSTER_6, isRelay, type Family, type Gadget, type Grid } from '../src/core/types';

let id = 7700;
const g = (family: Family, rank = 1, extra: Partial<Gadget> = {}): Gadget => ({ id: id++, family, rank, cd: 99, ...extra });
const board = (cells: [number, Gadget][]) => {
  const grid: Grid = Array(30).fill(null);
  for (const [i, x] of cells) grid[i] = x;
  return grid;
};
const cell = (r: number, c: number) => r * 5 + c;
const run = (grid: Grid, root: number, o: Partial<CascadeOpts> = {}) => resolveCascade(grid, root, { perks: [], overdrive: false, ...o });
const woke = (r: ReturnType<typeof run>) => r.activations.map((a) => a.idx).sort((a, b) => a - b);
const hit = (r: ReturnType<typeof run>, idx: number) => r.activations.find((a) => a.idx === idx)!.contribution;
const NEW = ROSTER_6 as string[];
const ARM: Partial<CascadeOpts> = { unitLevel: {} };

afterEach(() => {
  applyUnits('off');
  applyRoster1(false);
  applyRoster2(false);
  applyRoster3(false);
  applyRoster4(false);
  applyRoster5(false);
  applyRoster6(false);
  TUNING.rosterB = false;
});

describe('t-f2cd50e4 roster 6: flag', () => {
  it('OFF by default: no new unit in the collection, crates or squad pickers; GOOD HERE silent', () => {
    expect(TUNING.roster6).toBe(false);
    expect(UNITS).toHaveLength(13);
    for (const f of ROSTER_6) expect(unitDef(f)).toBeUndefined();
    const owned = new Set<Family>(['cannon', 'coil', 'bell', 'fan']);
    for (let seed = 1; seed < 300; seed++) for (const c of rollCrate('gold', owned, seed)) expect(NEW).not.toContain(c.unit);
    expect(goodHereText6(LEVELS.find((d) => d.boss_node)!, () => true)).toBe('');
    expect([storedRoster6(() => null), storedRoster6(() => 'on'), storedRoster6(() => { throw new Error('x'); })]).toEqual([false, true, false]);
    expect(ALL_UNIT_IDS).toEqual(expect.arrayContaining(NEW)); // saves may hold them either way
  });

  it('ON: both are Legendary, so they join only while crates B is on too; OFF restores the old list', () => {
    const before = UNITS.map((u) => u.id);
    applyRoster6(true);
    expect(UNITS.map((u) => u.id)).toEqual(before); // no crates B: nothing joins
    applyUnits('rb');
    expect(unitDef('robot_arm')).toMatchObject({ rarity: 'legendary', slot: 'shooter', role: 'SHOOTER' });
    expect(unitDef('tilt_lever')).toMatchObject({ rarity: 'legendary', slot: 'helper', role: 'SUPPORT' });
    const order = ['common', 'rare', 'epic', 'legendary'];
    expect(UNITS.map((u) => order.indexOf(u.rarity))).toEqual([...UNITS.map((u) => order.indexOf(u.rarity))].sort());
    applyUnits('off');
    applyRoster6(false);
    expect(UNITS.map((u) => u.id)).toEqual(before);
  });

  it('crates can drop them only with the flag AND crates B (Legendary)', () => {
    const owned = new Set<Family>(['cannon', 'coil', 'bell', 'fan']);
    applyRoster6(true);
    for (let seed = 1; seed < 3000; seed++) for (const c of rollCrate('gold', owned, seed)) expect(NEW).not.toContain(c.unit);
    applyUnits('rb');
    const seen = new Set<string>();
    for (let seed = 1; seed < 30000; seed++) for (const c of rollCrate('gold', owned, seed)) if (NEW.includes(c.unit)) seen.add(c.unit);
    expect([...seen].sort()).toEqual(['robot_arm', 'tilt_lever']);
  });

  it('copy: role, job word, WHEN MERGED line, L3 / L6 / L9 job upgrades for each', () => {
    const jobs = { robot_arm: 'COPY', tilt_lever: 'TILT' };
    for (const f of ROSTER_6) {
      expect(ROSTER_6_INFO[f].job).toBe(jobs[f]);
      expect(FAMILY_INFO[f].text.startsWith(`${jobs[f]}:`)).toBe(true);
      expect(ROSTER_6_INFO[f].whenMerged).toMatch(/^WHEN MERGED: /);
      expect(unitJob(f)).toEqual({ job: jobs[f], merged: ROSTER_6_INFO[f].whenMerged });
      expect(UNIT_PERKS[f]).toHaveLength(3);
    }
    expect([FAMILY_INFO.robot_arm.role, FAMILY_INFO.tilt_lever.role]).toEqual(['SHOOTER', 'SUPPORT']);
    expect(UNIT_PERKS.tilt_lever.map((p) => p[1])).toEqual(['Charges every 12 merges', 'Up to 4 merges in one tilt', 'Slides only the row or column you tap']);
  });

  it('GOOD HERE names an owned unit that suits the level (only with the flag), on one line with the other batches', () => {
    const chain = LEVELS.find((d) => d.goal?.kind === 'chain')!;
    const tight = LEVELS.find((d) => d.modifier !== 'NONE' && !d.boss_node && !d.mini_boss)!;
    expect(goodHereText6(chain, () => true)).toBe('');
    applyRoster6(true);
    expect(goodHereText6(chain, (u) => u === 'robot_arm')).toMatch(/^GOOD HERE: ROBOT ARM \(/);
    expect(goodHereText6(tight, (u) => u === 'tilt_lever')).toContain('TILT LEVER');
    expect(goodHereText6(tight, () => false)).toBe('');
    applyRoster3(true);
    applyRoster4(true);
    applyRoster5(true);
    for (const d of LEVELS) expect(goodHereAll6(d, () => true).match(/GOOD HERE/g)?.length ?? 1).toBe(1);
  });

  it('flag-OFF: a Robot Arm on the board never copies and a Tilt Lever card never appears', () => {
    const grid = () => board([[10, g('coil', 2)], [11, g('robot_arm', 1, { copy: ['bell'] })], [14, g('cannon')]]);
    const r = run(grid(), 10, { unitLevel: {} });
    expect(r.copies).toBeUndefined();
    expect(woke(r)).toEqual([10, 11, 12].filter((i) => woke(r).includes(i)));
    const s = newLevel(LEVELS[24], { toys: ['tilt_lever'], relays: ['coil', 'bell'] });
    expect(s.support).toBeUndefined();
    TUNING.roster6 = true;
    expect(newLevel(LEVELS[24], { toys: ['tilt_lever'], relays: ['coil', 'bell'] }).support).toMatchObject({ family: 'tilt_lever', charge: 0 });
  });
});

describe('t-f2cd50e4 roster 6: Robot Arm COPY rules', () => {
  it('remembers the last relay that woke it (shown as its icon) and does that job from where it stands', () => {
    TUNING.roster6 = true;
    // a Coil you merged wakes the Arm next to it: the Arm remembers COIL and, in the same fire, reaches 2 cells out like a Coil
    const grid = board([[cell(2, 0), g('coil', 2)], [cell(2, 1), g('robot_arm')], [cell(2, 3), g('cannon')], [cell(0, 1), g('cannon')]]);
    const arm = grid[cell(2, 1)]!;
    const r = run(grid, cell(2, 0), ARM);
    expect(r.copies).toEqual([{ id: arm.id, family: 'coil', mem: ['coil'] }]);
    expect(woke(r)).toContain(cell(2, 3)); // 2 cells right of the Arm: only a copied Coil gets there
    expect(woke(r)).toContain(cell(0, 1)); // 2 cells up
    expect(r.activations.find((a) => a.idx === cell(2, 3))!.parent).toBe(cell(2, 1));
  });

  it('with a memory from earlier it copies even when a shooter woke it; with no memory it only shoots', () => {
    TUNING.roster6 = true;
    const mk = (mem?: Family[]) => board([[cell(2, 0), g('cannon', 2)], [cell(2, 1), g('robot_arm', 1, mem ? { copy: mem } : {})], [cell(2, 4), g('cannon')], [cell(3, 1), g('cannon')]]);
    const withMem = run(mk(['bell']), cell(2, 0), ARM);
    expect(withMem.copies?.[0]).toMatchObject({ family: 'bell', mem: ['bell'] });
    expect(woke(withMem)).toContain(cell(2, 4)); // Bell: the whole row
    const none = run(mk(), cell(2, 0), ARM);
    expect(none.copies).toBeUndefined();
    expect(woke(none)).not.toContain(cell(2, 4));
  });

  it('never copies a Legendary (Crane, Dynamo), not even from an old memory; a Support or another Arm is never remembered', () => {
    TUNING.roster6 = true;
    expect(LEGENDARY_RELAYS).toEqual(['crane', 'dynamo']);
    expect(['coil', 'bell', 'horn', 'fuse_box', 'gear', 'spring', 'belt_drive', 'pipe', 'capacitor', 'ladder'].every((f) => canCopy(f as Family))).toBe(true);
    expect([canCopy('crane'), canCopy('dynamo'), canCopy('robot_arm'), canCopy('cannon'), canCopy('fan'), canCopy('tilt_lever')]).toEqual([false, false, false, false, false, false]);
    expect(rememberCopy([], 'crane', 1)).toEqual([]);
    expect(pickCopy(['crane', 'dynamo'], new Set())).toBeNull();
    // a Crane wakes the Arm: nothing is remembered
    const grid = board([[cell(2, 0), g('crane', 2)], [cell(2, 1), g('robot_arm')], [cell(2, 4), g('cannon')]]);
    const r = run(grid, cell(2, 0), ARM);
    expect(woke(r)).toContain(cell(2, 1));
    expect(r.copies).toBeUndefined();
    // a stale memory with a Legendary in it is never used
    const stale = board([[cell(2, 0), g('cannon', 2)], [cell(2, 1), g('robot_arm', 1, { copy: ['dynamo'] })], [cell(2, 4), g('cannon')]]);
    expect(run(stale, cell(2, 0), ARM).copies).toBeUndefined();
    // every Legendary relay of the unit list is on the never-copy list
    applyUnits('rb');
    applyRoster5(true);
    applyRoster6(true);
    for (const u of UNITS) if (u.rarity === 'legendary' && u.slot === 'relay') expect(LEGENDARY_RELAYS, u.id).toContain(u.id);
    for (const u of UNITS) if (u.slot === 'relay' && u.rarity !== 'legendary') expect(isRelay(u.id as Family) && canCopy(u.id as Family), u.id).toBe(true);
  });

  it('does not remember a part another Arm copied from (a copy of a copy never starts)', () => {
    TUNING.roster6 = true;
    const grid = board([[cell(2, 0), g('cannon', 2)], [cell(2, 1), g('robot_arm', 1, { copy: ['bell'] })], [cell(2, 3), g('robot_arm')]]);
    const r = run(grid, cell(2, 0), ARM);
    expect(woke(r)).toContain(cell(2, 3)); // the first Arm's copied Bell woke the second
    expect(r.copies?.map((c) => c.id)).toEqual([grid[cell(2, 1)]!.id]); // the second remembers nothing
  });

  it('cannot copy the same relay twice in one cascade; the other Arm only shoots', () => {
    TUNING.roster6 = true;
    // one Coil wakes two Arms; each remembers COIL, but only the first one fired may do the Coil job
    const grid = board([[cell(2, 2), g('coil', 2)], [cell(2, 1), g('robot_arm')], [cell(2, 3), g('robot_arm')], [cell(0, 3), g('cannon')], [cell(2, 0), g('cannon')]]);
    const r = run(grid, cell(2, 2), ARM);
    const did = (r.copies ?? []).filter((c) => c.family);
    expect(did).toHaveLength(1);
    expect(r.copies).toHaveLength(2);
    expect((r.copies ?? []).every((c) => c.mem.join() === 'coil')).toBe(true);
  });

  it('a relay kind is copied only once even through several Arms in a chain (bounded: each part fires once)', () => {
    TUNING.roster6 = true;
    const cells: [number, Gadget][] = [[cell(0, 0), g('bell', 2)]];
    for (let c = 1; c < 5; c++) cells.push([cell(0, c), g('robot_arm', 1, { copy: ['bell'] })]);
    for (let c = 0; c < 5; c++) cells.push([cell(1, c), g('robot_arm', 1, { copy: ['bell'] })]);
    const r = run(board(cells), cell(0, 0), ARM);
    expect(r.activations.length).toBeLessThanOrEqual(30);
    expect((r.copies ?? []).filter((c) => c.family === 'bell' && r.activations.find((a) => a.id === c.id)!.parent !== cell(0, 0)).length).toBeLessThanOrEqual(1);
  });

  it('anti-loop, Capacitor: a copied Capacitor banks only under the Capacitor rules (one bank, never in a release); it releases once', () => {
    TUNING.roster6 = true;
    TUNING.roster4 = true;
    // woken by a Capacitor the Arm remembers CAPACITOR; in a player merge it banks the chain (no chain passes on from it)
    const mk = () => board([[cell(2, 0), g('capacitor', 2)], [cell(2, 1), g('robot_arm')], [cell(2, 2), g('cannon')]]);
    const grid = mk();
    const arm = grid[cell(2, 1)]!;
    const banked = run(grid, cell(2, 0), { ...ARM, capBank: true });
    expect(banked.capBanked).toHaveLength(1); // the real Capacitor banks first; the Arm's copy cannot bank a second
    // an Arm alone (memory ['capacitor']) banks when no Capacitor did
    const alone = board([[cell(2, 0), g('cannon', 2)], [cell(2, 1), g('robot_arm', 1, { copy: ['capacitor'] })], [cell(2, 2), g('cannon')]]);
    const a2 = run(alone, cell(2, 0), { ...ARM, capBank: true });
    expect(a2.capBanked).toEqual([alone[cell(2, 1)]!.id]);
    expect(woke(a2)).not.toContain(cell(2, 2)); // it holds, it does not pass the chain on
    // the next merge: the bank holder releases once, wakes 1 touching part and banks nothing
    const next = board([[cell(2, 0), g('cannon', 2)], [cell(2, 1), alone[cell(2, 1)]!], [cell(2, 2), g('cannon')], [cell(4, 4), g('cannon', 2)]]);
    const rel = run(next, cell(4, 4), { ...ARM, capRelease: { id: alone[cell(2, 1)]!.id }, capBank: true });
    expect(rel.capReleased).toBe(alone[cell(2, 1)]!.id);
    expect(rel.capBanked).toBeUndefined();
    expect(rel.activations.filter((x) => x.parent === cell(2, 1))).toHaveLength(1);
    void arm;
  });

  it('anti-loop, Belt Drive / Spring: a copied Belt Drive never chains belt to belt (even at L6+) and the copied level never passes the relay\'s own', () => {
    TUNING.roster6 = true;
    const mk = (copyArm: boolean) => {
      const cells: [number, Gadget][] = [[cell(1, 0), g('cannon', 2)], [cell(1, 1), copyArm ? g('robot_arm', 1, { copy: ['belt_drive'] }) : g('belt_drive')], [cell(1, 2), g('belt_drive')], [cell(1, 3), g('cannon')], [cell(1, 4), g('cannon')]];
      return board(cells);
    };
    const real = run(mk(false), cell(1, 0), { unitLevel: { belt_drive: 6 } }); // a real Belt Drive at L6: Belt to Belt keeps going
    const copy = run(mk(true), cell(1, 0), { unitLevel: { belt_drive: 6 } }); // a copy of it does not wake the Belt Drive on the line
    expect(woke(real)).toContain(cell(1, 2));
    expect(woke(copy)).toContain(cell(1, 4)); // it still bridges to the far end
    expect(copy.activations.find((a) => a.idx === cell(1, 2))?.parent).not.toBe(cell(1, 1));
    expect(copyLevel(1, 4)).toBe(4);
    expect(copyLevel(9, 4)).toBe(9);
    expect(copyLevel(9, 9)).toBe(9);
  });

  it('L3: its own shot x1.2 only when it copied a Rare or Epic relay (a Common one gives nothing)', () => {
    TUNING.roster6 = true;
    const mk = (mem: Family) => board([[cell(2, 0), g('cannon', 2)], [cell(2, 1), g('robot_arm', 1, { copy: [mem] })], [cell(4, 1), g('cannon')]]);
    const l = (n: number): Partial<CascadeOpts> => ({ unitLevel: { robot_arm: n } });
    const base = (m: Family) => hit(run(mk(m), cell(2, 0), l(1)), cell(2, 1));
    const l3 = (m: Family) => hit(run(mk(m), cell(2, 0), l(3)), cell(2, 1));
    expect(l3('fuse_box') / base('fuse_box')).toBeCloseTo(TUNING.r6.copyOwnL3, 5);
    expect(l3('ladder') / base('ladder')).toBeCloseTo(1.2, 5);
    expect(l3('bell') / base('bell')).toBeCloseTo(1, 5);
    expect([copyOwnMult(1, 'gear'), copyOwnMult(3, 'gear'), copyOwnMult(3, 'coil'), copyOwnMult(9, 'pipe')]).toEqual([1, 1.2, 1, 1.2]);
  });

  it('L6: holds 2 remembered jobs and uses the better one; below L6 it holds 1', () => {
    expect([copyKeep(1), copyKeep(5), copyKeep(6)]).toEqual([1, 1, 2]);
    expect(rememberCopy(['bell'], 'spring', 1)).toEqual(['spring']);
    expect(rememberCopy(['bell'], 'spring', 6)).toEqual(['bell', 'spring']);
    expect(rememberCopy(['bell', 'spring'], 'coil', 6)).toEqual(['spring', 'coil']); // the oldest drops out
    expect(rememberCopy(['bell', 'spring'], 'bell', 6)).toEqual(['spring', 'bell']); // a repeat moves to the newest
    expect(pickCopy(['bell', 'spring'], new Set())).toBe('bell'); // better = wakes more
    expect(pickCopy(['spring', 'bell'], new Set())).toBe('bell');
    expect(pickCopy(['bell', 'spring'], new Set<Family>(['bell']))).toBe('spring'); // the better one is used up: the other
    expect(pickCopy(['bell', 'spring'], new Set<Family>(['bell', 'spring']))).toBeNull();
    TUNING.roster6 = true;
    const mk = () => board([[cell(2, 0), g('cannon', 2)], [cell(2, 1), g('robot_arm', 1, { copy: ['bell', 'spring'] })], [cell(2, 4), g('cannon')]]);
    expect(run(mk(), cell(2, 0), { unitLevel: { robot_arm: 6 } }).copies?.[0].family).toBe('bell');
  });

  it('L9: copies the relay at that relay\'s L9 upgrade (Coil: 3 cells sideways instead of 1, with crates B)', () => {
    TUNING.roster6 = true;
    TUNING.rosterB = true; // the L1 / L9 Coil geometry (1 sideways -> 3) belongs to the B jobs
    const mk = () => board([[cell(2, 0), g('cannon', 2)], [cell(2, 1), g('robot_arm', 1, { copy: ['coil'] })], [cell(2, 4), g('cannon')]]);
    const l1 = run(mk(), cell(2, 0), { unitLevel: { robot_arm: 1 } });
    const l9 = run(mk(), cell(2, 0), { unitLevel: { robot_arm: 9 } });
    expect(woke(l1)).not.toContain(cell(2, 4)); // 3 cells right of the Arm
    expect(woke(l9)).toContain(cell(2, 4));
  });

  it('it never wakes itself or a part twice: bounded cascades on a full board of Arms and relays', () => {
    TUNING.roster6 = true;
    const rng = new Rng(77);
    const fams: Family[] = ['coil', 'bell', 'horn', 'fuse_box', 'robot_arm', 'cannon', 'rocket'];
    for (let t = 0; t < 200; t++) {
      const cells: [number, Gadget][] = [];
      for (let i = 0; i < 30; i++) if (rng.next() < 0.8) cells.push([i, g(fams[rng.int(fams.length)], 1 + rng.int(3), { copy: [(['coil', 'bell', 'horn', 'spring', 'belt_drive', 'fuse_box', 'gear', 'ladder'] as Family[])[rng.int(8)]] })]);
      const grid = board(cells);
      const root = cells[rng.int(cells.length)]?.[0];
      if (root === undefined) continue;
      const r = run(grid, root, { unitLevel: { robot_arm: 1 + rng.int(9), belt_drive: 6, spring: 6 } });
      expect(new Set(r.activations.map((a) => a.idx)).size).toBe(r.activations.length);
      expect((r.copies ?? []).filter((c) => c.family).length).toBeLessThanOrEqual(8);
    }
  });

  it('a merge keeps the memory (the destination\'s wins) and a real drop writes it on the part; previews change nothing', () => {
    TUNING.roster6 = true;
    const s = newLevel(LEVELS[24], { shooter: 'robot_arm', relays: ['coil', 'bell'], toys: [] });
    s.grid.fill(null);
    s.grid[cell(2, 1)] = { ...g('robot_arm'), copy: ['bell'] };
    s.grid[cell(2, 2)] = { ...g('robot_arm'), copy: ['coil'] };
    s.grid[cell(4, 4)] = g('cannon');
    drop(s, cell(2, 1), cell(2, 2), s.grid[cell(2, 1)]!.id);
    expect(s.grid[cell(2, 2)]).toMatchObject({ family: 'robot_arm', rank: 2, copy: ['coil'] });
    // a Bell woken by your merge wakes the Arm: after the drop the part itself carries COIL -> BELL memory
    const t = newLevel(LEVELS[24], { shooter: 'robot_arm', relays: ['coil', 'bell'], toys: [] });
    t.grid.fill(null);
    t.grid[cell(3, 0)] = g('bell');
    t.grid[cell(3, 1)] = g('bell');
    t.grid[cell(2, 1)] = g('robot_arm');
    const before = JSON.stringify(t.grid);
    expect(previewMerge(t, cell(3, 0), cell(3, 1))).not.toBeNull();
    expect(JSON.stringify(t.grid)).toBe(before); // preview never mutates
    drop(t, cell(3, 0), cell(3, 1), t.grid[cell(3, 0)]!.id);
    expect(t.grid.find((x) => x?.family === 'robot_arm')!.copy).toEqual(['bell']);
    expect(JSON.parse(serialize(t)).grid.find((x: Gadget | null) => x?.family === 'robot_arm').copy).toEqual(['bell']);
  });

  it('the job tag shows COPY on a boosted shot; the formula strip knows the term', () => {
    TUNING.roster6 = true;
    const grid = board([[cell(2, 0), g('cannon', 2)], [cell(2, 1), g('robot_arm', 1, { copy: ['ladder'] })]]);
    TUNING.rosterB = true;
    const r = run(grid, cell(2, 0), { unitLevel: { robot_arm: 3 } });
    expect(r.activations.find((a) => a.idx === cell(2, 1))!.jobs?.copy).toBeCloseTo(1.2, 5);
  });

  it('seed + actions give the same copies: two identical runs end in the same state', () => {
    TUNING.roster6 = true;
    const play = () => {
      const s = newLevel(LEVELS[27], { shooter: 'robot_arm', relays: ['coil', 'bell'], toys: [] });
      s.unitLevel = { robot_arm: 6, coil: 3, bell: 3 };
      const rng = new Rng(5);
      for (let k = 0; k < 40 && s.phase === 'playing'; k++) {
        for (let i = 0; i < 70; i++) tick(s);
        const p = legalPairs(s);
        if (!p.length) continue;
        const [a, b] = p[rng.int(p.length)];
        drop(s, a, b, s.grid[a]!.id);
      }
      return serialize(s);
    };
    expect(play()).toBe(play());
  });
});

describe('t-f2cd50e4 roster 6: Robot Arm drills', () => {
  it('3 drills; each needs the Arm to copy a relay (a line that wins without the copy does not count)', () => {
    TUNING.roster6 = true;
    const data = raw as unknown as { daily: PuzzleDef[]; drills: Record<string, PuzzleDef[]> };
    expect(data.drills.robot_arm).toHaveLength(3);
    expect(data.drills.tilt_lever).toBeUndefined(); // OFF in drills by design
    for (const d of data.drills.robot_arm) {
      expect(d.unit).toBe('robot_arm');
      const lines = allLines(d);
      expect(unitFreeBreaks(lines, d.hp), d.id).toHaveLength(0);
      expect(lines.some((l) => l.dmg.some((x) => x >= d.hp) && l.used?.some(Boolean)), d.id).toBe(true);
      const s = newPuzzle(d);
      expect(s.grid.some((x) => x?.family === 'robot_arm')).toBe(true);
    }
  });
});

describe('t-f2cd50e4 roster 6: Tilt Lever TILT plan', () => {
  const NONE = new Set<number>();
  const can = (a: Gadget, b: Gadget) => a.family === b.family && a.rank === b.rank;
  const plan = (grid: Grid, dir: 'up' | 'right' | 'down' | 'left', level = 1, wall: Set<number> = NONE, fixed: Set<number> = NONE, only?: number) => planTilt(grid, dir, level, wall, fixed, can, only);

  it('every part slides as far as it can toward the edge; nothing leaves the board; the plan never touches the input', () => {
    const grid = board([[cell(3, 1), g('cannon', 1)], [cell(5, 1), g('coil', 2)], [cell(2, 4), g('bell', 3)]]);
    const before = JSON.stringify(grid);
    const p = plan(grid, 'up');
    expect(JSON.stringify(grid)).toBe(before);
    expect(p.slides.map((m) => [m.from, m.to])).toEqual([[cell(3, 1), cell(0, 1)], [cell(5, 1), cell(1, 1)], [cell(2, 4), cell(0, 4)]]);
    expect(p.pairs).toEqual([]);
    const d = plan(grid, 'down');
    expect(d.slides.map((m) => [m.from, m.to])).toEqual([[cell(5, 1), cell(5, 1)]].slice(1).concat([[cell(3, 1), cell(4, 1)], [cell(2, 4), cell(5, 4)]]));
    const l = plan(grid, 'left');
    expect(l.slides.map((m) => m.to % 5)).toEqual([0, 0, 0]);
    const rt = plan(grid, 'right');
    expect(rt.slides.map((m) => m.to % 5)).toEqual([4, 4]); // the part at (2,4) is already at the edge
  });

  it('slides that land next to a twin MERGE it (the part that slid is dropped onto the twin nearer the edge)', () => {
    const a = g('cannon', 1), b = g('cannon', 1);
    const p = plan(board([[cell(1, 2), a], [cell(4, 2), b]]), 'up');
    expect(p.slides).toEqual([{ from: cell(1, 2), to: cell(0, 2), id: a.id }, { from: cell(4, 2), to: cell(1, 2), id: b.id }]);
    expect(p.pairs).toEqual([{ from: cell(1, 2), to: cell(0, 2), fromId: b.id, toId: a.id }]);
    // different rank or family: they only stop side by side
    expect(plan(board([[cell(1, 2), g('cannon', 1)], [cell(4, 2), g('cannon', 2)]]), 'up').pairs).toEqual([]);
    expect(plan(board([[cell(1, 2), g('cannon', 1)], [cell(4, 2), g('coil', 1)]]), 'up').pairs).toEqual([]);
  });

  it('a part merges only once per tilt (1 1 1 1 -> two merges, like 2048)', () => {
    const cells: [number, Gadget][] = [0, 1, 2, 3].map((r) => [cell(r + 1, 0), g('cannon', 1)] as [number, Gadget]);
    const p = plan(board(cells), 'up');
    expect(p.pairs).toHaveLength(2);
    expect(new Set(p.pairs.flatMap((x) => [x.fromId, x.toId])).size).toBe(4);
  });

  it('max 3 merges per tilt (4 from L6); extra twins just stop side by side', () => {
    expect([tiltMax(1), tiltMax(5), tiltMax(6), tiltMax(9)]).toEqual([3, 3, 4, 4]);
    const cells: [number, Gadget][] = [];
    for (let c = 0; c < 5; c++) {
      cells.push([cell(0, c), g('cannon', 1)], [cell(2, c), g('cannon', 1)]); // five columns, each a twin pair
    }
    const grid = board(cells);
    expect(plan(grid, 'up', 1).pairs).toHaveLength(3);
    expect(plan(grid, 'up', 6).pairs).toHaveLength(4);
    expect(plan(grid, 'up', 9).pairs).toHaveLength(4);
    // the slides still all happen
    expect(plan(grid, 'up', 1).slides).toHaveLength(5);
  });

  it('walls (locked, reserved, boss-blocked cells) and fixed parts stop a slide like the edge; a fixed twin never merges', () => {
    const a = g('cannon'), b = g('cannon');
    const grid = board([[cell(4, 1), a], [cell(1, 3), b]]);
    const wall = new Set([cell(2, 1)]);
    expect(plan(grid, 'up', 1, wall).slides.find((m) => m.id === a.id)!.to).toBe(cell(3, 1));
    const fixedGrid = board([[cell(0, 1), g('cannon')], [cell(4, 1), g('cannon')]]);
    const f = plan(fixedGrid, 'up', 1, NONE, new Set([cell(0, 1)]));
    expect(f.pairs).toEqual([]);
    expect(f.slides[0].to).toBe(cell(1, 1)); // stops under the fixed twin
  });

  it('L9: only the row or column through the tapped cell slides', () => {
    const grid = board([[cell(3, 0), g('cannon')], [cell(3, 2), g('coil')], [cell(4, 3), g('bell')]]);
    expect(plan(grid, 'up', 1).slides).toHaveLength(3);
    const one = plan(grid, 'up', 9, NONE, NONE, cell(5, 2));
    expect(one.slides.map((m) => m.from)).toEqual([cell(3, 2)]);
    const row = plan(grid, 'left', 9, NONE, NONE, cell(3, 4));
    expect(row.slides.map((m) => m.from)).toEqual([cell(3, 2)]); // (3,0) is already at the edge
  });

  it('the tap means the nearest edge: top / bottom / left / right; a tie goes up', () => {
    expect([cell(0, 2), cell(1, 2), cell(2, 2)].map(tiltDirOf)).toEqual(['up', 'up', 'up']);
    expect([cell(5, 2), cell(4, 2), cell(3, 2)].map(tiltDirOf)).toEqual(['down', 'down', 'down']);
    expect([cell(3, 0), cell(3, 1)].map(tiltDirOf)).toEqual(['left', 'left']);
    expect([cell(3, 4), cell(3, 3)].map(tiltDirOf)).toEqual(['right', 'right']);
    expect(tiltDirOf(cell(0, 0))).toBe('up'); // a corner: the long side wins by the tie rule
    expect(new Set(Array.from({ length: 30 }, (_, i) => tiltDirOf(i)))).toEqual(new Set(['up', 'down', 'left', 'right']));
  });

  it('charge: every 15 merges (12 at L3); never wasted on a tap that moves nothing', () => {
    expect([tiltNeed(1), tiltNeed(2), tiltNeed(3), tiltNeed(9)]).toEqual([15, 15, 12, 12]);
    TUNING.roster6 = true;
    const s = newLevel(LEVELS[24], { toys: ['tilt_lever'], relays: ['coil', 'bell'] });
    expect(s.support?.family).toBe('tilt_lever');
    expect(supportNeed(s)).toBe(15);
    s.unitLevel = { tilt_lever: 3 };
    expect(supportNeed(s)).toBe(12);
  });
});
