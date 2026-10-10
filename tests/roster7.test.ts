import { afterEach, describe, expect, it } from 'vitest';
import { applyUnits, storedRoster7 } from '../src/content/experiments';
import { LEVELS } from '../src/content/levels';
import { FAMILY_INFO } from '../src/content/perks';
import { goodHereAll7, goodHereText7, ROSTER_7_INFO } from '../src/content/roster7';
import { unitJob } from '../src/content/unitJobs';
import { TUNING } from '../src/content/tuning';
import { applyRoster7, UNIT_PERKS, unitDef, UNITS } from '../src/content/units';
import raw from '../src/content/puzzles.json';
import { allLines, unitFreeBreaks } from '../src/core/puzzle';
import type { PuzzleDef } from '../src/core/game';
import { resolveCascade, type CascadeOpts } from '../src/core/cascade';
import { rollCrate } from '../src/core/crates';
import { drop, legalPairs, newLevel, newPuzzle, serialize, tick } from '../src/core/game';
import { inwardDirs, latheMult, latheSteps, pressMult, rivetMult, routerCells, routerShapes, viceCells } from '../src/core/roster7';
import { ROSTER_7, type Family, type Gadget, type Grid } from '../src/core/types';

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
const NEW = ROSTER_7 as string[];
const cell = (r: number, c: number) => r * 5 + c;
const EDGE = Array.from({ length: 30 }, (_, i) => i).filter((i) => Math.floor(i / 5) % 5 === 0 || i % 5 === 0 || i % 5 === 4);

afterEach(() => {
  applyUnits('off');
  applyRoster7(false);
});

describe('t-67cd7c5b roster 7: flag', () => {
  it('OFF by default: no new unit in the collection or crates; GOOD HERE silent', () => {
    expect(TUNING.roster7).toBe(false);
    expect(UNITS).toHaveLength(13);
    for (const f of ROSTER_7) expect(unitDef(f)).toBeUndefined();
    const owned = new Set<Family>(['cannon', 'coil', 'bell', 'fan']);
    for (let seed = 1; seed < 300; seed++) for (const c of rollCrate('gold', owned, seed)) expect(NEW).not.toContain(c.unit);
    expect(goodHereText7(LEVELS.find((d) => d.boss_node)!, () => true)).toBe('');
    expect([storedRoster7(() => null), storedRoster7(() => 'on'), storedRoster7(() => { throw new Error('x'); })]).toEqual([false, true, false]);
  });

  it('ON: 5 units with the right rarity and slot, no crates B needed; OFF restores the list; crates can drop all five', () => {
    const before = UNITS.map((u) => u.id);
    applyRoster7(true);
    expect(UNITS).toHaveLength(18);
    expect(unitDef('rivet_gun')).toMatchObject({ rarity: 'common', slot: 'shooter', role: 'SHOOTER' });
    expect(unitDef('vice')).toMatchObject({ rarity: 'common', slot: 'relay', role: 'RELAY' });
    expect(unitDef('router')).toMatchObject({ rarity: 'rare', slot: 'relay', role: 'RELAY' });
    expect(unitDef('hydraulic_press')).toMatchObject({ rarity: 'epic', slot: 'shooter' });
    expect(unitDef('lathe')).toMatchObject({ rarity: 'epic', slot: 'shooter' });
    const owned = new Set<Family>(['cannon', 'coil', 'bell', 'fan']);
    const seen = new Set<string>();
    for (let seed = 1; seed < 8000; seed++) for (const c of rollCrate('gold', owned, seed)) if (NEW.includes(c.unit)) seen.add(c.unit);
    expect([...seen].sort()).toEqual([...NEW].sort());
    applyRoster7(false);
    expect(UNITS.map((u) => u.id)).toEqual(before);
  });

  it('copy: role, job word, WHEN MERGED line, 3 job upgrades; the Vice card says what happens off the edge', () => {
    const jobs = { rivet_gun: 'THIRD', vice: 'GRIP', router: 'TURN', hydraulic_press: 'SQUEEZE', lathe: 'SPAN' };
    for (const f of ROSTER_7) {
      expect(ROSTER_7_INFO[f].job).toBe(jobs[f]);
      expect(FAMILY_INFO[f].text.startsWith(`${jobs[f]}:`)).toBe(true);
      expect(unitJob(f)).toEqual({ job: jobs[f], merged: ROSTER_7_INFO[f].whenMerged });
      expect(UNIT_PERKS[f]).toHaveLength(3);
    }
    expect(ROSTER_7_INFO.vice.whenMerged).toContain('ON THE EDGE');
    expect(ROSTER_7_INFO.vice.whenMerged).toContain('OFF THE EDGE it does nothing special');
    expect(FAMILY_INFO.vice.text).toContain('OFF THE EDGE it does nothing special');
  });

  it('GOOD HERE names an owned unit that suits the level (only with the flag), one line with the other batches', () => {
    const chain = LEVELS.find((d) => d.goal?.kind === 'chain')!;
    const boss = LEVELS.find((d) => d.boss_node)!;
    expect(goodHereText7(chain, () => true)).toBe('');
    applyRoster7(true);
    expect(goodHereText7(chain, (u) => u === 'rivet_gun')).toMatch(/^GOOD HERE: RIVET GUN \(/);
    expect(goodHereText7(boss, (u) => u === 'hydraulic_press')).toContain('HYDRAULIC PRESS');
    expect(goodHereText7(boss, () => false)).toBe('');
    for (const d of LEVELS) expect(goodHereAll7(d, () => true).match(/GOOD HERE/g)?.length ?? 1).toBe(1);
  });
});

describe('t-67cd7c5b roster 7: Rivet Gun THIRD', () => {
  it('x2 as the 3rd part to fire, x1 as the 2nd; the merged part is the 1st', () => {
    const mk = (rivetAt: number, otherAt: number) => board([[12, g('bell')], [otherAt, g('cannon')], [rivetAt, g('rivet_gun')]]);
    const third = run(mk(17, 13), 12), second = run(mk(13, 17), 12);
    expect(hit(third, 17) / hit(second, 13)).toBeCloseTo(2);
    expect(third.activations.find((a) => a.idx === 17)!.contribution).toBeCloseTo(TUNING.base.rivet_gun * 2);
    expect(third.jobHit).toContain(third.activations.find((a) => a.idx === 17)!.id);
    expect(second.jobHit ?? []).toEqual([]);
    expect(hit(run(board([[12, g('rivet_gun')]]), 12), 12)).toBeCloseTo(TUNING.base.rivet_gun); // merged = 1st: x1
  });

  it('levels: L3 the 6th too, L6 the 2nd and 4th x1.25, L9 x2.4; never above x2.4 at any order or level', () => {
    expect([0, 1, 2, 3, 4, 5].map((o) => rivetMult(o, 1))).toEqual([1, 1, 2, 1, 1, 1]);
    expect([0, 1, 2, 3, 4, 5].map((o) => rivetMult(o, 3))).toEqual([1, 1, 2, 1, 1, 2]);
    expect([0, 1, 2, 3, 4, 5].map((o) => rivetMult(o, 6))).toEqual([1, 1.25, 2, 1.25, 1, 2]);
    expect(rivetMult(2, 9)).toBeCloseTo(2.4);
    for (let l = 1; l <= 10; l++) for (let o = 0; o < 30; o++) expect(rivetMult(o, l)).toBeLessThanOrEqual(2.4 + 1e-9);
    for (let o = 0; o < 30; o++) expect(rivetMult(o, 1)).toBeLessThanOrEqual(2);
  });

  it('a full board: each part fires once and the combo cap holds', () => {
    const full = board(Array.from({ length: 30 }, (_, i): [number, Gadget] => [i, g(i % 3 ? 'rivet_gun' : 'cannon', 1 + (i % 4))]));
    const r = run(full, 12, { unitLevel: { rivet_gun: 9 } });
    expect(new Set(r.activations.map((a) => a.idx)).size).toBe(r.activations.length);
    expect(r.comboMult).toBeLessThanOrEqual(TUNING.comboCap + 1e-9);
  });
});

describe('t-67cd7c5b roster 7: Vice GRIP', () => {
  it('geometry on the 5x6 board: top, bottom, left, right edge cells', () => {
    expect(viceCells(cell(0, 2), 1)).toEqual([cell(1, 2), cell(2, 2), cell(3, 2)]);
    expect(viceCells(cell(5, 2), 1)).toEqual([cell(4, 2), cell(3, 2), cell(2, 2)]);
    expect(viceCells(cell(2, 0), 1)).toEqual([cell(2, 1), cell(2, 2), cell(2, 3)]);
    expect(viceCells(cell(2, 4), 1)).toEqual([cell(2, 3), cell(2, 2), cell(2, 1)]);
  });

  it('corners wake 2 cells along each of their two lines (3 each from L3); never more than 6', () => {
    expect(inwardDirs(0)).toHaveLength(2);
    expect(viceCells(0, 1).sort((a, b) => a - b)).toEqual([cell(0, 1), cell(0, 2), cell(1, 0), cell(2, 0)]);
    expect(viceCells(cell(5, 4), 1).sort((a, b) => a - b)).toEqual([cell(3, 4), cell(4, 4), cell(5, 2), cell(5, 3)]);
    expect(viceCells(0, 3)).toHaveLength(6);
  });

  it('off the edge it does nothing special: each of the 12 interior cells wakes only its 4 touching cells, at every level', () => {
    const inner = Array.from({ length: 30 }, (_, i) => i).filter((i) => !EDGE.includes(i));
    expect(inner).toHaveLength(12);
    for (const i of inner) for (const l of [1, 3, 6, 9]) expect(viceCells(i, l).sort((a, b) => a - b)).toEqual([i - 5, i - 1, i + 1, i + 5]);
  });

  it('levels: L3 reaches 4, L6 adds the 2 cells along the edge; the cap of 6 holds for every edge cell at every level', () => {
    expect(viceCells(cell(0, 2), 3)).toHaveLength(4);
    expect(viceCells(cell(0, 2), 6).sort((a, b) => a - b)).toEqual([cell(0, 1), cell(0, 3), cell(1, 2), cell(2, 2), cell(3, 2), cell(4, 2)]);
    for (const i of EDGE) for (let l = 1; l <= 10; l++) expect(viceCells(i, l).length).toBeLessThanOrEqual(TUNING.r7.viceMax);
    for (const i of EDGE) expect(viceCells(i, 1).length).toBeLessThanOrEqual(4);
  });

  it('in a chain: on the edge it wakes 3 cells in (not the 4th); off the edge only the parts touching it', () => {
    const line = (v: number) => board([[v, g('vice')], [cell(2, 1), g('cannon')], [cell(2, 2), g('cannon')], [cell(2, 3), g('cannon')], [cell(2, 4), g('cannon')]]);
    expect(woke(run(line(cell(2, 0)), cell(2, 0)))).toEqual([cell(2, 0), cell(2, 1), cell(2, 2), cell(2, 3)]);
    expect(woke(run(line(cell(2, 1)), cell(2, 1)))).toEqual([cell(2, 1), cell(2, 2)]); // off the edge: the plain spark only
  });

  it('the shooters it wakes hit x1.4 (x1.6 at L9); a Bell wakes the same cannon without it. That is the difference', () => {
    const mk = (fam: Family) => board([[cell(2, 0), g(fam)], [cell(2, 1), g('cannon')], [cell(2, 2), g('cannon')], [cell(2, 4), g('cannon')]]);
    const v = run(mk('vice'), cell(2, 0)), b = run(mk('bell'), cell(2, 0));
    expect(hit(v, cell(2, 2)) / hit(b, cell(2, 2))).toBeCloseTo(1.4);
    expect(hit(v, cell(2, 1)) / hit(b, cell(2, 1))).toBeCloseTo(1); // touching: woken by the spark first
    const v9 = run(mk('vice'), cell(2, 0), { unitLevel: { vice: 9 } });
    expect(hit(v9, cell(2, 2)) / hit(b, cell(2, 2))).toBeCloseTo(1.6);
    expect(woke(b)).toContain(cell(2, 4)); // the Bell reaches the whole row; the Vice does not
    expect(woke(v)).not.toContain(cell(2, 4));
  });

  it('a Vice on the top edge wakes down its column, which a Bell there never does', () => {
    const mk = (fam: Family) => board([[2, g(fam)], [7, g('cannon')], [12, g('cannon')], [17, g('cannon')], [3, g('cannon')]]);
    expect(woke(run(mk('vice'), 2))).toContain(17);
    expect(woke(run(mk('bell'), 2))).not.toContain(17);
  });

  it('every part fires once on a crowded board; a locked cell and a resting row stop it', () => {
    const full = board(Array.from({ length: 30 }, (_, i): [number, Gadget] => [i, g(i % 2 ? 'vice' : 'cannon', 1 + (i % 3))]));
    const r = run(full, 10, { unitLevel: { vice: 6 } });
    expect(new Set(r.activations.map((a) => a.idx)).size).toBe(r.activations.length);
    const line = board([[cell(2, 0), g('vice')], [cell(2, 1), g('cannon')], [cell(2, 2), g('cannon')]]);
    expect(woke(run(line, cell(2, 0), { locked: new Set([cell(2, 2)]) }))).toEqual([cell(2, 0), cell(2, 1)]);
    expect(woke(run(line, cell(2, 0), { restRow: 2 }))).toEqual([cell(2, 0), cell(2, 1)]); // the spark only
  });
});

describe('t-67cd7c5b roster 7: Router TURN', () => {
  it('geometry: base turns clockwise only (4 Ls), L3 both turns (8 Ls); edges and corners have fewer', () => {
    expect(routerShapes(cell(2, 2), 1)).toHaveLength(4);
    expect(routerShapes(cell(2, 2), 3)).toHaveLength(8);
    for (const l of routerShapes(cell(2, 2), 3)) expect(l).toHaveLength(4);
    expect([routerShapes(0, 1).length, routerShapes(cell(5, 4), 1).length, routerShapes(cell(0, 2), 1).length]).toEqual([1, 1, 2]);
    expect([routerShapes(0, 3).length, routerShapes(cell(5, 4), 3).length, routerShapes(cell(0, 2), 3).length]).toEqual([2, 2, 4]);
    // the up-then-right L from (2,2): 2 up, 2 right
    expect(routerShapes(cell(2, 2), 1)[0]).toEqual([cell(1, 2), cell(0, 2), cell(0, 3), cell(0, 4)]);
    for (let i = 0; i < 30; i++) for (const l of [1, 3, 9]) for (const s of routerShapes(i, l)) expect(s.length).toBeLessThanOrEqual(5);
  });

  it('wakes the best L, up to 2 NEW parts (3 from L3), and reaches cells a Coil / Bell / Horn cannot', () => {
    const grid = board([[cell(2, 2), g('router')], [cell(1, 2), g('cannon')], [cell(0, 2), g('cannon')], [cell(0, 3), g('cannon')], [cell(0, 4), g('cannon')], [cell(4, 4), g('cannon')]]);
    expect(woke(run(grid, cell(2, 2)))).toEqual([cell(0, 2), cell(0, 3), cell(1, 2), cell(2, 2)]); // the part the root spark already woke does not count: 2 new parts
    const r3 = run(grid, cell(2, 2), { unitLevel: { router: 3 } });
    expect(woke(r3)).toEqual([cell(0, 2), cell(0, 3), cell(0, 4), cell(1, 2), cell(2, 2)]); // 3 new parts from L3
    expect(woke(r3)).not.toContain(cell(4, 4));
  });

  it('a Router with no parts in any L wakes nothing special (and never loops)', () => {
    expect(routerCells(board([[12, g('router')]]), 12, 1, () => true)).toEqual([]);
  });

  it('levels: L6 second L only when the best has under 3 parts, L9 always; first L capped 2 / 3; at most 6 parts', () => {
    const grid = board([[cell(2, 2), g('router')], [cell(0, 2), g('cannon')], [cell(1, 2), g('cannon')], [cell(2, 4), g('cannon')], [cell(2, 3), g('cannon')]]);
    const ok = () => true;
    const n = (l: number) => routerCells(grid, cell(2, 2), l, ok).length;
    expect(n(1)).toBe(2);
    expect(n(6)).toBe(4); // best L has 2 parts (<3), the second L adds its 2
    const rich = board([[cell(2, 2), g('router')], [cell(1, 2), g('cannon')], [cell(0, 2), g('cannon')], [cell(0, 3), g('cannon')], [cell(2, 3), g('cannon')], [cell(2, 4), g('cannon')], [cell(3, 2), g('cannon')]]);
    expect(routerCells(rich, cell(2, 2), 1, ok)).toHaveLength(2);
    expect(routerCells(rich, cell(2, 2), 6, ok)).toHaveLength(3); // 3 parts: no second L at L6
    expect(routerCells(rich, cell(2, 2), 9, ok).length).toBeGreaterThan(3); // L9: always
    const full = board(Array.from({ length: 30 }, (_, i): [number, Gadget] => [i, g('cannon')]));
    for (let i = 0; i < 30; i++) for (let l = 1; l <= 10; l++) expect(routerCells(full, i, l, ok).length).toBeLessThanOrEqual(TUNING.r7.routerMax);
  });

  it('every part fires once on a crowded board; a locked part is never woken', () => {
    const full = board(Array.from({ length: 30 }, (_, i): [number, Gadget] => [i, g(i % 2 ? 'router' : 'cannon', 1 + (i % 3))]));
    const r = run(full, 12, { unitLevel: { router: 9 } });
    expect(new Set(r.activations.map((a) => a.idx)).size).toBe(r.activations.length);
    const grid = board([[cell(2, 2), g('router')], [cell(0, 2), g('cannon')], [cell(1, 2), g('cannon')]]);
    expect(woke(run(grid, cell(2, 2), { locked: new Set([cell(0, 2)]) }))).not.toContain(cell(0, 2));
  });
});

describe('t-67cd7c5b roster 7: Hydraulic Press SQUEEZE', () => {
  const around = (c: number, n: number) => [c - 5, c + 5, c - 1, c + 1].slice(0, n).map((i): [number, Gadget] => [i, g('cannon')]);
  it('x3 with all 4 sides filled, x0.7 with 3 or fewer', () => {
    expect(pressMult(board([[12, g('hydraulic_press')], ...around(12, 4)]), 12, 1)).toBe(3);
    for (const n of [0, 1, 2, 3]) expect(pressMult(board([[12, g('hydraulic_press')], ...around(12, n)]), 12, 1)).toBe(0.7);
    const full = run(board([[12, g('hydraulic_press')], ...around(12, 4)]), 12);
    expect(hit(full, 12)).toBeCloseTo(TUNING.base.hydraulic_press * 3);
    expect(full.jobHit).toContain(full.activations.find((a) => a.idx === 12)!.id);
    const three = run(board([[12, g('hydraulic_press')], ...around(12, 3)]), 12);
    expect(hit(three, 12)).toBeCloseTo(TUNING.base.hydraulic_press * 0.7);
    expect(three.jobHit ?? []).toEqual([]);
  });

  it('edge and corner geometry: the board edge is never filled, so an edge or corner Press never reaches x3', () => {
    for (const i of EDGE) {
      const all = board(Array.from({ length: 30 }, (_, k): [number, Gadget] => [k, g(k === i ? 'hydraulic_press' : 'cannon')]));
      for (const l of [1, 3, 6, 9]) expect(pressMult(all, i, l), `cell ${i} L${l}`).toBeLessThanOrEqual(1.5);
      expect(pressMult(all, i, 1)).toBe(0.7);
    }
    const all = board(Array.from({ length: 30 }, (_, k): [number, Gadget] => [k, g(k === 12 ? 'hydraulic_press' : 'cannon')]));
    expect(pressMult(all, 12, 1)).toBe(3);
  });

  it('levels: L3 small hit +0.1 per side (max x1.0), L6 3 sides x1.5, L9 full x3.5; cap x3.5', () => {
    expect(pressMult(board([[12, g('hydraulic_press')], ...around(12, 3)]), 12, 3)).toBeCloseTo(1.0);
    expect(pressMult(board([[12, g('hydraulic_press')], ...around(12, 2)]), 12, 3)).toBeCloseTo(0.9);
    expect(pressMult(board([[12, g('hydraulic_press')], ...around(12, 3)]), 12, 6)).toBe(1.5);
    expect(pressMult(board([[12, g('hydraulic_press')], ...around(12, 4)]), 12, 9)).toBe(3.5);
    for (let l = 1; l <= 10; l++) for (let n = 0; n <= 4; n++) expect(pressMult(board([[12, g('hydraulic_press')], ...around(12, n)]), 12, l)).toBeLessThanOrEqual(3.5);
  });

  it('a woken Press counts its sides when it fires (a part the chain moved away no longer counts)', () => {
    const grid = board([[11, g('bell')], [12, g('hydraulic_press')], [7, g('cannon')], [17, g('cannon')], [13, g('cannon')]]);
    expect(hit(run(grid, 11), 12)).toBeCloseTo(TUNING.base.hydraulic_press * 3);
  });
});

describe('t-67cd7c5b roster 7: Lathe SPAN', () => {
  const lone = (i: number) => board([[i, g('lathe')]]);
  it('distance to the opposite edge: side edges 4 steps, top / bottom 5, corners 5, interior none', () => {
    expect([latheSteps(cell(2, 0)), latheSteps(cell(2, 4)), latheSteps(cell(0, 2)), latheSteps(cell(5, 2)), latheSteps(0), latheSteps(29), latheSteps(12)]).toEqual([4, 4, 5, 5, 5, 5, 0]);
    expect(EDGE).toHaveLength(18);
  });

  it('on the edge x(0.7 + 0.25 per step): side x1.7, top/bottom x1.95, never past x2; off the edge x0.5', () => {
    expect(latheMult(lone(cell(2, 0)), cell(2, 0), 1)).toBeCloseTo(1.7);
    expect(latheMult(lone(cell(0, 2)), cell(0, 2), 1)).toBeCloseTo(1.95);
    expect(latheMult(lone(12), 12, 1)).toBe(0.5);
    const r = run(lone(cell(0, 2)), cell(0, 2));
    expect(hit(r, cell(0, 2))).toBeCloseTo(TUNING.base.lathe * 1.95);
    expect(r.jobHit).toHaveLength(1);
    expect(run(lone(12), 12).jobHit).toBeUndefined();
  });

  it('levels: L3 0.3 per step cap x2.3, L6 an empty shaft +0.2, L9 cap x2.4 and off the edge x0.8; no cell at any level passes its cap', () => {
    expect(latheMult(lone(cell(0, 2)), cell(0, 2), 3)).toBeCloseTo(2.2);
    const blocked = board([[cell(0, 2), g('lathe')], [cell(3, 2), g('cannon')]]);
    expect(latheMult(blocked, cell(0, 2), 6)).toBeCloseTo(2.2); // shaft not empty: no bonus
    expect(latheMult(lone(cell(0, 2)), cell(0, 2), 6)).toBeCloseTo(2.3); // 2.4 cut to the L3 cap
    expect(latheMult(lone(cell(2, 0)), cell(2, 0), 6)).toBeCloseTo(0.7 + 1.2 + 0.2);
    expect(latheMult(lone(cell(0, 2)), cell(0, 2), 9)).toBeCloseTo(2.4);
    expect(latheMult(lone(12), 12, 9)).toBeCloseTo(0.8);
    for (let i = 0; i < 30; i++) {
      for (let l = 1; l <= 10; l++) {
        const cap = l >= 9 ? 2.4 : l >= 3 ? 2.3 : 2;
        if (latheSteps(i)) expect(latheMult(lone(i), i, l)).toBeLessThanOrEqual(cap + 1e-9);
        else expect(latheMult(lone(i), i, l)).toBeLessThanOrEqual(0.8);
      }
    }
  });

  it('is not Saw Blade: the Lathe cares about the distance across, so top/bottom beat the sides and the whole ring is not equal', () => {
    expect(latheMult(lone(cell(0, 2)), cell(0, 2), 1)).toBeGreaterThan(latheMult(lone(cell(2, 0)), cell(2, 0), 1));
  });
});

describe('t-67cd7c5b roster 7: jobs show on the hit, and everything works together', () => {
  it('under crates B the job tags carry the new multipliers (RIVET / PRESS / LATHE / GRIP)', () => {
    applyUnits('rb');
    const r = run(board([[12, g('bell')], [13, g('cannon')], [17, g('rivet_gun')]]), 12);
    expect(r.activations.find((a) => a.idx === 17)!.jobs).toMatchObject({ rivet: 2 });
    const p = run(board([[12, g('hydraulic_press')], [7, g('cannon')], [17, g('cannon')], [11, g('cannon')], [13, g('cannon')]]), 12);
    expect(p.activations.find((a) => a.idx === 12)!.jobs).toMatchObject({ press: 3 });
    const l = run(board([[cell(0, 2), g('lathe')]]), cell(0, 2));
    expect(l.activations[0].jobs?.lathe).toBeCloseTo(1.95);
    const v = run(board([[cell(2, 0), g('vice')], [cell(2, 1), g('cannon')], [cell(2, 2), g('cannon')]]), cell(2, 0));
    expect(v.activations.find((a) => a.idx === cell(2, 2))!.jobs).toMatchObject({ grip: 1.4 });
  });

  it('a crowded board with all five new units, at every level: each part fires once, the chain cap holds', () => {
    const fams: Family[] = ['rivet_gun', 'vice', 'router', 'hydraulic_press', 'lathe', 'cannon', 'coil', 'bell'];
    const full = board(Array.from({ length: 30 }, (_, i): [number, Gadget] => [i, g(fams[i % fams.length], 1 + (i % 4))]));
    for (const level of [1, 3, 6, 9]) {
      for (const root of [0, 2, 12, 29]) {
        const r = run(full, root, { unitLevel: { rivet_gun: level, vice: level, router: level, hydraulic_press: level, lathe: level } });
        expect(new Set(r.activations.map((a) => a.idx)).size).toBe(r.activations.length);
        expect(r.comboMult).toBeLessThanOrEqual(TUNING.comboCap + 1e-9);
      }
    }
  });

  it('random full games with every roster flag and crates B on: deterministic, every board stays legal', () => {
    applyUnits('rb');
    applyRoster7(true);
    for (const relays of [['vice', 'router'], ['router', 'bell'], ['vice', 'coil']] as [Family, Family][]) {
      for (const shooter of ['hydraulic_press', 'lathe', 'rivet_gun'] as Family[]) {
        const play = (seed: number) => {
          const s = newLevel(LEVELS[30 + seed], { toys: [], relays, shooter, seed: 1000 + seed } as never);
          s.unitLevel = { vice: 1 + (seed % 9), router: 1 + ((seed + 3) % 9), hydraulic_press: 1 + ((seed + 5) % 9), lathe: 1 + ((seed + 2) % 9), rivet_gun: 1 + ((seed + 7) % 9) };
          s.hp = s.maxHp = 1e9;
          for (let i = 0; i < 50 && s.phase === 'playing'; i++) {
            for (let k = 0; k < 20; k++) tick(s);
            const pairs = legalPairs(s);
            if (!pairs.length) continue;
            const [a, b] = pairs[(i * 7 + seed) % pairs.length];
            drop(s, a, b, s.grid[a]!.id);
            expect(s.grid.filter(Boolean).length).toBeLessThanOrEqual(30);
          }
          return serialize(s);
        };
        for (const seed of [0, 1, 2]) expect(play(seed)).toBe(play(seed));
      }
    }
  }, 120000);

  it('flag OFF: a board without the new units resolves the same whether the flag is on or off', () => {
    const grid = () => board([[10, g('coil', 2)], [11, g('cannon')], [12, g('bell')], [13, g('cannon')]]);
    const a = run(grid(), 10);
    applyRoster7(true);
    const b = run(grid(), 10);
    expect([b.total, woke(b)]).toEqual([a.total, woke(a)]);
  });
});

describe('t-67cd7c5b roster 7: drills', () => {
  const data = raw as unknown as { drills: Record<string, PuzzleDef[]> };
  it('3 drills each; each needs its unit to act with its own job', () => {
    applyRoster7(true);
    for (const f of ROSTER_7) {
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

describe('t-67cd7c5b roster 7: Vice off the edge has no grip', () => {
  it('a Vice woken in the middle of the board wakes its touching parts but gives no x1.4 grip', () => {
    const mk = (fam: Family) => board([[11, g('bell')], [12, g(fam)], [13, g('cannon')], [17, g('cannon')], [14, g('cannon')]]);
    const v = run(mk('vice'), 11);
    expect(woke(v)).toEqual(expect.arrayContaining([13, 17]));
    expect(hit(v, 17)).toBeCloseTo(TUNING.base.cannon); // x1, no grip
    expect(v.jobHit ?? []).toEqual([]);
  });
});
