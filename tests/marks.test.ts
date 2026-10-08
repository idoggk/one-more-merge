import { describe, expect, it } from 'vitest';
import { COLS } from '../src/content/tuning';
import { BOSSES, type BossTarget } from '../src/core/boss';
import { idxOf, newGame, type GameState } from '../src/core/game';
import { inspectMarks, markTip } from '../src/core/marks';
import type { Family, Gadget } from '../src/core/types';

let id = 5000;
const g = (family: Family, rank = 1, extra: Partial<Gadget> = {}): Gadget => ({ id: id++, family, rank, cd: 3, ...extra });
const board = (): GameState => {
  const s = newGame(7);
  s.grid.fill(null);
  return s;
};
const bossOf = (attack: string) => BOSSES.findIndex((b) => b.attack === attack);

describe('board marks: first-time NEW tips', () => {
  it('fires once per mark kind, pointing at the marked cell', () => {
    const s = board();
    const at = idxOf(3, 2);
    s.grid[at] = g('cannon', 2, { amp: 1.3 });
    const seen: Record<string, boolean> = {};
    const t = markTip(s.grid, seen);
    expect(t?.id).toBe('mark_amp');
    expect(t?.idx).toBe(at);
    expect(t?.text).toContain('BOOSTED');
    expect(t?.text).toContain('x1.3');
    seen[t!.id] = true;
    expect(markTip(s.grid, seen)).toBeNull(); // never again
  });

  it('prime and item get their own tips', () => {
    const s = board();
    s.grid[idxOf(1, 1)] = g('cannon', 1, { primed: true });
    s.grid[idxOf(2, 1)] = g('rocket', 1, { item: { kind: 'overcharge', charges: 2 } });
    const seen: Record<string, boolean> = {};
    const a = markTip(s.grid, seen)!;
    expect(a.id).toBe('mark_prime');
    expect(a.text).toContain('CHARGED');
    expect(a.text).toContain('x1.5');
    seen[a.id] = true;
    const b = markTip(s.grid, seen)!;
    expect(b.id).toBe('mark_item');
    expect(b.idx).toBe(idxOf(2, 1));
    expect(b.text).toContain('OVERCHARGE');
    seen[b.id] = true;
    expect(markTip(s.grid, seen)).toBeNull();
  });

  it('a board without marks shows no tip', () => {
    const s = board();
    s.grid[0] = g('cannon');
    expect(markTip(s.grid, {})).toBeNull();
  });
});

describe('board marks: inspect card lines', () => {
  it('a plain part has no MARKS row', () => {
    const s = board();
    s.grid[0] = g('coil');
    expect(inspectMarks(s, 0)).toEqual({ marks: [], mergeNow: null });
  });

  it('amp: boost line + used on merge', () => {
    const s = board();
    s.grid[0] = g('cannon', 2, { amp: 1.3 });
    const r = inspectMarks(s, 0);
    expect(r.marks.map((m) => m.label)).toEqual(['BOOSTED']);
    expect(r.mergeNow).toBe('If you merge now: x1.3 boost used on this merge.');
  });

  it('prime: charge line + used on merge', () => {
    const s = board();
    s.grid[0] = g('cannon', 2, { primed: true });
    const r = inspectMarks(s, 0);
    expect(r.marks[0].key).toBe('prime');
    expect(r.marks[0].text).toContain('x1.5');
    expect(r.mergeNow).toContain('x1.5 charge used on this merge');
  });

  it('item: power-up with uses left + one use on merge', () => {
    const s = board();
    s.grid[0] = g('bell', 2, { item: { kind: 'corner', charges: 2 } });
    const r = inspectMarks(s, 0);
    expect(r.marks[0]).toMatchObject({ key: 'item', label: 'CORNER KIT', item: 'corner' });
    expect(r.marks[0].text).toContain('next 2 times');
    expect(r.mergeNow).toContain('uses 1 of 2');
  });

  it('several marks list in order and the merge line names each', () => {
    const s = board();
    s.grid[0] = g('cannon', 2, { amp: 1.15, primed: true });
    const r = inspectMarks(s, 0);
    expect(r.marks.map((m) => m.key)).toEqual(['amp', 'prime']);
    expect(r.mergeNow).toBe('If you merge now: x1.15 boost used on this merge; x1.5 charge used on this merge.');
  });

  it('cap crown: top rank line', () => {
    const s = board();
    s.level = undefined;
    s.grid[0] = g('cannon', 6);
    const r = inspectMarks(s, 0);
    expect(r.marks.map((m) => m.key)).toEqual(['cap']);
    expect(r.marks[0].text).toContain('top');
    expect(r.mergeNow).toContain("can't merge");
  });

  it.each([
    ['clamp', { cells: [idxOf(2, 2)] }, false],
    ['frost', { row: 2 }, false],
    ['hot', { col: 2 }, false],
    ['rest', { row: 2 }, false],
    ['suction', { cells: [idxOf(2, 2)] }, true],
  ] as [string, BossTarget, boolean][])('boss %s marks the part with its attack', (atk, tgt, warn) => {
    const s = board();
    const at = idxOf(2, 2);
    s.grid[at] = g('cannon', 2);
    s.grid[idxOf(0, 0)] = g('coil', 1);
    s.boss = { def: bossOf(atk), next: 0, phaseShown: 0, pending: warn ? { ...tgt, deadline: s.elapsed + 2, phase: 0 } : null, active: warn ? null : { ...tgt, until: s.elapsed + 3 } };
    const r = inspectMarks(s, at);
    expect(r.marks).toHaveLength(1);
    expect(r.marks[0]).toMatchObject({ key: 'boss', attack: atk });
    expect(r.marks[0].text).toMatch(warn ? /^In 2\.0s/ : /3\.0s left/);
    expect(inspectMarks(s, idxOf(0, 0)).marks).toHaveLength(0); // outside the target: nothing
  });

  it('boss ransom follows the marked ids and explains the merge', () => {
    const s = board();
    const a = g('cannon', 2), b = g('coil', 1);
    s.grid[idxOf(4, 0)] = a;
    s.grid[idxOf(4, COLS - 1)] = b;
    s.boss = { def: bossOf('ransom'), next: 0, phaseShown: 0, active: null, pending: { ids: [a.id, b.id], deadline: s.elapsed + 4, phase: 0 } };
    const r = inspectMarks(s, idxOf(4, 0));
    expect(r.marks[0]).toMatchObject({ key: 'boss', attack: 'ransom', label: 'TIME RANSOM' });
    expect(r.mergeNow).toContain('ransom mark moves');
  });
});
