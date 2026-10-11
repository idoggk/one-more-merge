import { afterEach, describe, expect, it } from 'vitest';
import { COLS } from '../src/content/tuning';
import { LEVELS } from '../src/content/levels';
import { TUNING } from '../src/content/tuning';
import { canMerge, drop, legalPairs, newLevel, serialize, tick, type GameState } from '../src/core/game';
import type { Family, Gadget } from '../src/core/types';
import { Rng } from '../src/core/rng';
import { assistActive, AUTO_MERGES, boxDist, nextAssistMode, partnersOf, snapTarget, SNAP_REACH, soleMergePair, storedAssistMode, toastAllowed } from '../src/game/mergeAssist';

const CELL = 124;
const centre = (i: number) => ({ x: 50 + (i % COLS) * CELL + CELL / 2, y: 400 + Math.floor(i / COLS) * CELL + CELL / 2 });
let nid = 100;
const g = (family: Family, rank = 1): Gadget => ({ id: nid++, family, rank, cd: 99 });
function board(cells: [number, Gadget][]): GameState {
  const s = newLevel(LEVELS[24]);
  s.grid.fill(null);
  s.pending = [];
  for (const [i, x] of cells) s.grid[i] = x;
  return s;
}

afterEach(() => {
  TUNING.mergeAssist = 'off';
});

describe('MERGE ASSIST setting', () => {
  it('is OFF by default; stored values OFF / ON / AUTO, anything else or unreadable = OFF', () => {
    expect(TUNING.mergeAssist).toBe('off');
    expect(storedAssistMode(() => 'on')).toBe('on');
    expect(storedAssistMode(() => 'auto')).toBe('auto');
    expect(storedAssistMode(() => 'nope')).toBe('off');
    expect(storedAssistMode(() => null)).toBe('off');
    expect(storedAssistMode(() => { throw new Error('no storage'); })).toBe('off');
    expect(nextAssistMode('off')).toBe('on');
    expect(nextAssistMode('on')).toBe('auto');
    expect(nextAssistMode('auto')).toBe('off');
  });
  it('OFF never helps, ON always helps', () => {
    expect(assistActive('off', 1, 0)).toBe(false);
    expect(assistActive('on', 99, 9999)).toBe(true);
  });
  it('AUTO: levels 1-10 and fewer than 30 lifetime merges, then OFF', () => {
    expect(assistActive('auto', 1, 0)).toBe(true);
    expect(assistActive('auto', 10, AUTO_MERGES - 1)).toBe(true);
    expect(assistActive('auto', undefined, 5)).toBe(true); // puzzles / bounties: no level number
    expect(assistActive('auto', 3, AUTO_MERGES)).toBe(false); // the 30th merge switches it off
    expect(assistActive('auto', 11, 0)).toBe(false);
  });
  it('the failed-drop toast: levels 1-5 only, twice per level', () => {
    expect(toastAllowed(1, 0)).toBe(true);
    expect(toastAllowed(5, 1)).toBe(true);
    expect(toastAllowed(5, 2)).toBe(false);
    expect(toastAllowed(6, 0)).toBe(false);
    expect(toastAllowed(undefined, 0)).toBe(false);
  });
});

describe('snapTarget', () => {
  const s = board([[0, g('cannon')], [2, g('cannon')], [5, g('coil')], [6, g('cannon', 2)], [14, g('cannon')]]);
  it('a point just outside a matching part snaps to it; far away does not', () => {
    const c = centre(2);
    expect(snapTarget(s, 0, c.x + CELL / 2 + CELL * 0.6, c.y, centre, CELL)).toBe(2);
    expect(snapTarget(s, 0, c.x + CELL / 2 + CELL * (SNAP_REACH + 0.1), c.y, centre, CELL)).toBe(-1);
  });
  it('never picks a non-matching part (other family, other rank, empty cell)', () => {
    expect(snapTarget(s, 0, centre(5).x, centre(5).y, centre, CELL, 0.05)).toBe(-1);
    expect(snapTarget(s, 0, centre(6).x, centre(6).y, centre, CELL, 0.05)).toBe(-1);
    expect(snapTarget(s, 0, centre(1).x, centre(1).y, centre, CELL, 0.05)).toBe(-1);
    expect(snapTarget(s, 0, centre(0).x, centre(0).y, centre, CELL)).toBe(-1); // never itself, and the twin is 2 cells away
  });
  it('two valid targets in range: the nearest to the point wins', () => {
    const s2 = board([[0, g('cannon')], [2, g('cannon')], [4, g('cannon')]]);
    expect(snapTarget(s2, 0, centre(2).x + 20, centre(2).y, centre, CELL)).toBe(2);
    expect(snapTarget(s2, 0, centre(4).x - 20, centre(4).y, centre, CELL)).toBe(4);
  });
  it('boxDist is 0 inside a cell and grows outside it', () => {
    const c = centre(7);
    expect(boxDist(c.x + 10, c.y - 10, c, CELL)).toBe(0);
    expect(boxDist(c.x + CELL / 2 + 30, c.y, c, CELL)).toBeCloseTo(30);
  });
});

describe('assisted merges are always legal merges (property)', () => {
  const fams: Family[] = ['cannon', 'coil', 'bell'];
  it('random boards and random release points: a snap target is a partner the real rule merges', () => {
    const r = new Rng(4242);
    let snaps = 0;
    for (let n = 0; n < 300; n++) {
      const cells: [number, Gadget][] = [];
      for (let i = 0; i < 30; i++) if (r.next() < 0.55) cells.push([i, g(fams[Math.floor(r.next() * 3)], 1 + Math.floor(r.next() * 3))]);
      const s = board(cells);
      const from = s.grid.findIndex((x) => x);
      if (from < 0) continue;
      const x = 20 + r.next() * 680, y = 380 + r.next() * 760;
      const t = snapTarget(s, from, x, y, centre, CELL);
      if (t < 0) continue;
      snaps++;
      expect(t).not.toBe(from);
      expect(canMerge(s.grid[from], s.grid[t], s)).toBe(true);
      expect(partnersOf(s, from)).toContain(t);
      expect(boxDist(x, y, centre(t), CELL)).toBeLessThanOrEqual(SNAP_REACH * CELL);
      // the real drop accepts it as a merge: the dragged part's cell is freed
      const res = drop(s, from, t, s.grid[from]!.id);
      expect(res.ok).toBe(true);
      expect(s.grid[from]).toBeNull();
    }
    expect(snaps).toBeGreaterThan(50);
  });
});

describe('tap shortcut', () => {
  it('only a board with exactly one legal pair offers it', () => {
    const one = board([[0, g('cannon')], [8, g('cannon')], [3, g('coil')], [12, g('bell', 2)]]);
    expect(soleMergePair(one)).toEqual([0, 8]);
    const two = board([[0, g('cannon')], [8, g('cannon')], [3, g('coil')], [12, g('coil')]]);
    expect(soleMergePair(two)).toBeNull();
    const three = board([[0, g('cannon')], [8, g('cannon')], [9, g('cannon')]]); // 3 pairs among 3 twins
    expect(soleMergePair(three)).toBeNull();
    expect(soleMergePair(board([[0, g('cannon')], [1, g('coil')]]))).toBeNull();
    for (const p of legalPairs(one)) expect(canMerge(one.grid[p[0]], one.grid[p[1]], one)).toBe(true);
  });
});

describe('flag OFF is unchanged', () => {
  const play = (mode: 'off' | 'on' | 'auto', seed: number) => {
    TUNING.mergeAssist = mode;
    const s = newLevel(LEVELS[seed]);
    const log: string[] = [];
    for (let step = 0; step < 120; step++) {
      for (let k = 0; k < 20; k++) tick(s, new Set());
      const p = legalPairs(s)[0];
      if (p) drop(s, p[0], p[1], s.grid[p[0]]!.id);
      log.push(JSON.stringify(serialize(s)));
    }
    return log.join('|');
  };
  it('seeded levels give the same state hash with the setting OFF, ON or AUTO (the core never reads it)', () => {
    for (const lv of [0, 1, 2]) {
      const off = play('off', lv);
      expect(play('on', lv)).toBe(off);
      expect(play('auto', lv)).toBe(off);
      expect(play('off', lv)).toBe(off); // seed + actions => identical
    }
  });
});
