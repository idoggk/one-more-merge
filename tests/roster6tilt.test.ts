import { afterEach, describe, expect, it } from 'vitest';
import { applyUnits } from '../src/content/experiments';
import { LEVELS } from '../src/content/levels';
import { TUNING } from '../src/content/tuning';
import { applyRoster6 } from '../src/content/units';
import raw from '../src/content/puzzles.json';
import { drop, legalPairs, newGame, newLevel, newPuzzle, serialize, tick, type GameState, type PuzzleDef } from '../src/core/game';
import { newRunLog, recordCommand, recordTick, replayRun } from '../src/core/replay';
import { tiltNeed } from '../src/core/roster6';
import { rewindRestore, rewindSnapshot, stateHash } from '../src/core/roster4';
import { Rng } from '../src/core/rng';
import { autoSupport, canUseSupport, runTilt, supportReady, tiltPlanAt, useSupport } from '../src/core/support';
import type { Family, Gadget } from '../src/core/types';

let id = 8800;
const g = (family: Family, rank = 1): Gadget => ({ id: id++, family, rank, cd: 99 });
const cell = (r: number, c: number) => r * 5 + c;

afterEach(() => {
  applyUnits('off');
  applyRoster6(false);
  TUNING.rosterB = false;
});

const tiltGame = (level = 24, unitLvl = 1): GameState => {
  TUNING.roster6 = true;
  const s = newLevel(LEVELS[level], { toys: ['tilt_lever'], relays: ['coil', 'bell'] });
  s.unitLevel = { tilt_lever: unitLvl };
  s.noKickback = true;
  s.support!.charge = tiltNeed(unitLvl);
  return s;
};
const place = (s: GameState, cells: [number, Gadget][]) => {
  s.grid.fill(null);
  for (const [i, x] of cells) s.grid[i] = x;
  s.pending = [];
  s.owed = 0;
};
const tilts = (ev: ReturnType<typeof useSupport>['events']) => ev.filter((e) => e.type === 'support' && e.family === 'tilt_lever').length;

describe('t-f2cd50e4 roster 6: Tilt Lever in a game', () => {
  it('a tap slides every part toward that edge, twins merge, each merge fires its own cascade, in order', () => {
    const s = tiltGame();
    place(s, [[cell(1, 0), g('cannon', 1)], [cell(4, 0), g('cannon', 1)], [cell(2, 3), g('coil', 2)], [cell(5, 3), g('coil', 2)], [cell(3, 1), g('bell', 1)]]);
    const mass = (st: GameState) => st.grid.reduce((m, x) => m + (x ? 2 ** x.rank : 0), 0);
    const before = mass(s), hp0 = s.hp, merges0 = s.stats.merges;
    expect(supportReady(s)).toBe(true);
    expect(canUseSupport(s, cell(0, 2))).toBe(true);
    const r = useSupport(s, cell(0, 2)); // top edge
    expect(r.ok).toBe(true);
    expect(tilts(r.events)).toBe(1);
    const cas = r.events.filter((e) => e.type === 'cascade');
    expect(cas).toHaveLength(2); // the cannons in column 0, the coils in column 3
    expect(s.stats.merges - merges0).toBe(2);
    expect(s.grid[cell(0, 0)]).toMatchObject({ family: 'cannon', rank: 2 });
    expect(s.grid[cell(0, 3)]).toMatchObject({ family: 'coil', rank: 3 });
    expect(s.grid[cell(0, 1)]).toMatchObject({ family: 'bell', rank: 1 });
    expect(mass(s)).toBe(before); // merging keeps the rank mass
    expect(s.hp).toBeLessThan(hp0);
    expect(s.support!.charge).toBe(0);
    expect(s.support!.uses).toBe(1);
    // lanes in index order: the column-0 merge fires before the column-3 merge
    expect(cas[0].type === 'cascade' && cas[0].result.rootIdx).toBe(cell(0, 0));
    expect(cas[1].type === 'cascade' && cas[1].result.rootIdx).toBe(cell(0, 3));
  });

  it('a tilt never starts another tilt, never charges the card; max 3 merges; only your own drag merges charge it (+1)', () => {
    const s = tiltGame();
    const cells: [number, Gadget][] = [];
    for (let c = 0; c < 4; c++) cells.push([cell(1, c), g('cannon')], [cell(4, c), g('cannon')]);
    place(s, cells);
    const r = useSupport(s, cell(0, 2));
    expect(tilts(r.events)).toBe(1);
    expect(r.events.filter((e) => e.type === 'cascade')).toHaveLength(3);
    expect(s.support!.charge).toBe(0);
    expect(s.support!.uses).toBe(1);
    expect(supportReady(s)).toBe(false);
    expect(useSupport(s, cell(0, 2)).ok).toBe(false);
    place(s, [[cell(0, 0), g('cannon')], [cell(0, 1), g('cannon')], [cell(3, 3), g('coil')]]);
    drop(s, cell(0, 0), cell(0, 1), s.grid[cell(0, 0)]!.id);
    expect(s.support!.charge).toBe(1);
  });

  it('max 4 merges at L6; L9 slides only the tapped lane', () => {
    const s = tiltGame(24, 6);
    const cells: [number, Gadget][] = [];
    for (let c = 0; c < 5; c++) cells.push([cell(1, c), g('cannon')], [cell(4, c), g('cannon')]);
    place(s, cells);
    expect(useSupport(s, cell(0, 2)).events.filter((e) => e.type === 'cascade')).toHaveLength(4);
    const t = tiltGame(24, 9);
    place(t, [[cell(1, 0), g('cannon')], [cell(4, 0), g('cannon')], [cell(1, 2), g('coil')], [cell(4, 2), g('coil')]]);
    useSupport(t, cell(0, 0)); // the tap is in the top triangle: column 0 only
    expect(t.grid[cell(0, 0)]).toMatchObject({ family: 'cannon', rank: 2 });
    expect(t.grid[cell(1, 2)]?.family).toBe('coil');
    expect(t.grid[cell(4, 2)]?.family).toBe('coil'); // untouched
  });

  it('is OFF in Workshop Puzzles / drills, the Daily Puzzle and Bounties (the card never becomes ready)', () => {
    const data = raw as unknown as { daily: PuzzleDef[]; drills: Record<string, PuzzleDef[]> };
    for (const p of [data.daily[0], data.drills.robot_arm[0]]) {
      TUNING.roster6 = true;
      const s = newPuzzle(p);
      s.support = { family: 'tilt_lever', charge: 99, uses: 0 };
      expect(supportReady(s)).toBe(false);
      expect(canUseSupport(s, cell(0, 2))).toBe(false);
      expect(useSupport(s, cell(0, 2)).ok).toBe(false);
    }
    const b = tiltGame();
    b.bounty = { id: 'x', twist: '', date: '2026-10-10', slot: 0 };
    place(b, [[cell(3, 1), g('cannon')]]);
    expect(supportReady(b)).toBe(false);
    expect(useSupport(b, cell(0, 2)).ok).toBe(false);
    delete b.bounty;
    expect(supportReady(b)).toBe(true);
  });

  it('a tap that would move nothing is refused and costs no charge', () => {
    const s = tiltGame();
    place(s, [[cell(0, 0), g('cannon')], [cell(0, 1), g('coil')]]);
    expect(canUseSupport(s, cell(0, 2))).toBe(false);
    expect(useSupport(s, cell(0, 2)).ok).toBe(false);
    expect(s.support!.charge).toBe(15);
    expect(canUseSupport(s, cell(5, 2))).toBe(true);
  });

  it('locked cells stop a slide; the plan matches what happens', () => {
    const s = tiltGame();
    place(s, [[cell(4, 1), g('cannon')]]);
    s.masked = [cell(2, 1)];
    const plan = tiltPlanAt(s, cell(0, 2));
    expect(plan.slides).toEqual([{ from: cell(4, 1), to: cell(3, 1), id: s.grid[cell(4, 1)]!.id }]);
    useSupport(s, cell(0, 2));
    expect(s.grid[cell(3, 1)]?.family).toBe('cannon');
    expect(s.grid[cell(2, 1)]).toBeNull();
  });

  it('keeps the board consistent with the delivery queue and the dice: a slide-only tilt changes nothing else', () => {
    const s = tiltGame();
    place(s, [[cell(4, 1), g('cannon')], [cell(5, 3), g('coil', 2)]]);
    s.pending = [{ id: 9999, family: 'bell', rank: 1, cd: 0 }];
    const rest = (st: GameState) => JSON.stringify({ ...st, grid: null, support: null, stats: null });
    const before = rest(s);
    useSupport(s, cell(0, 2));
    expect(s.grid[cell(0, 1)]?.family).toBe('cannon');
    expect(s.grid[cell(0, 3)]?.family).toBe('coil');
    expect(rest(s)).toBe(before);
  });

  it('DETERMINISTIC for a seed: same level + same taps = the same state, and the run log replays it exactly', () => {
    const play = () => {
      TUNING.roster6 = true;
      const log = newRunLog();
      const s = newLevel(LEVELS[27], { toys: ['tilt_lever'], relays: ['coil', 'bell'] });
      s.unitLevel = { tilt_lever: 3, coil: 3, bell: 3 };
      s.support!.charge = 12;
      const rng = new Rng(11);
      let tilted = 0;
      const hashes: string[] = [];
      for (let k = 0; k < 90 && s.phase === 'playing'; k++) {
        for (let i = 0; i < 60; i++) recordTick(log, s, new Set());
        const sup = autoSupport(s);
        if (sup) {
          const res = recordCommand(log, s, { k: 'support', cell: sup.cell, axis: 0 });
          if (res.ok && res.events.some((e) => e.type === 'support')) tilted++;
        }
        const p = legalPairs(s);
        if (p.length && s.phase === 'playing') {
          const [a, b] = p[rng.int(p.length)];
          recordCommand(log, s, { k: 'drop', from: a, to: b, id: s.grid[a]!.id });
        }
        hashes.push(stateHash(s));
      }
      return { text: serialize(s), tilted, hashes, log };
    };
    const a = play(), b = play();
    expect(a.tilted).toBeGreaterThan(0);
    expect(b.text).toBe(a.text);
    expect(b.hashes).toEqual(a.hashes);
    const back = replayRun(a.log);
    expect(back && serialize(back)).toBe(a.text);
  });

  it('REWIND CRANK can undo a tilt: the whole state (board, queue, HP, every dice stream) is back, hash for hash', () => {
    for (let seed = 0; seed < 25; seed++) {
      const s = tiltGame(24 + (seed % 6) * 3);
      const rng = new Rng(seed + 1);
      for (let k = 0; k < 12; k++) {
        for (let i = 0; i < 40; i++) tick(s);
        const p = legalPairs(s);
        if (p.length) {
          const [a, b] = p[rng.int(p.length)];
          drop(s, a, b, s.grid[a]!.id);
        }
      }
      if (s.phase !== 'playing') continue;
      const tiltCard = s.support!;
      s.support = { family: 'rewind_crank', charge: 99, uses: 0 }; // the crank takes its undo point right before the tilt
      const snap = rewindSnapshot(s), hash = stateHash(s);
      s.support = tiltCard;
      const cellTap = [cell(0, 2), cell(5, 2), cell(3, 0), cell(3, 4)][seed % 4];
      runTilt(s, tiltPlanAt(s, cellTap));
      for (let i = 0; i < 60; i++) tick(s);
      s.support = { family: 'rewind_crank', charge: 99, uses: 0 };
      rewindRestore(s, snap);
      expect(stateHash(s), `seed ${seed}`).toBe(hash);
    }
  });

  it('autoSupport (the sim bot) picks the edge with the most merges and holds the charge when no tilt would merge', () => {
    const s = tiltGame();
    place(s, [[cell(1, 0), g('cannon')], [cell(4, 0), g('cannon')], [cell(2, 3), g('coil', 2)]]);
    const pick = autoSupport(s)!;
    expect(tiltPlanAt(s, pick.cell).pairs).toHaveLength(1);
    place(s, [[cell(1, 0), g('cannon')], [cell(4, 3), g('coil')]]);
    expect(autoSupport(s)).toBeNull();
    TUNING.roster6 = false;
    expect(newGame(5, false, false, ['tilt_lever']).support).toBeUndefined();
  });
});
