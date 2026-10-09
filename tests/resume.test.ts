import { describe, expect, it } from 'vitest';
import raw from '../src/content/puzzles.json';
import { LEVELS } from '../src/content/levels';
import { endlessDef } from '../src/core/endless';
import { deserialize, drop, legalPairs, newLevel, newPuzzle, resumable, serialize, tick, type GameState, type PuzzleDef } from '../src/core/game';
import { Rng } from '../src/core/rng';

/** r33: boss mechanics are tested on the boss alone (stages put minions first). */
const solo = (d: (typeof LEVELS)[number]) => ({ ...d, waves: undefined, wave_visuals: undefined, minion_hp: undefined });
const load = (s: GameState) => resumable(deserialize(serialize(s)), LEVELS.length)!;

type Action = { k: number; from: number; to: number };
type Seen = { pending: boolean; active: boolean; blocks: boolean; stageBoss: boolean };

/** A seeded bot: every 2 s a random legal merge, sometimes a plain move to an empty cell. Records what it did. */
function play(s: GameState, seed: number): Action[] {
  const rng = new Rng(seed);
  const acts: Action[] = [];
  for (let k = 0; s.phase === 'playing' && k < 20000; k++) {
    if (k % 40 === 20) {
      const p = legalPairs(s);
      let a: [number, number] | null = p.length ? p[rng.int(p.length)] : null;
      if (rng.int(4) === 0) {
        const full = s.grid.flatMap((g, i) => (g ? [i] : [])), empty = s.grid.flatMap((g, i) => (g ? [] : [i]));
        if (full.length && empty.length) a = [full[rng.int(full.length)], empty[rng.int(empty.length)]];
      }
      if (a && drop(s, a[0], a[1], s.grid[a[0]]!.id).ok) acts.push({ k, from: a[0], to: a[1] });
    }
    tick(s);
  }
  return acts;
}

/** Replays the recorded actions; at every tick in `saveAt` the run goes through save -> load -> resumable. */
function replay(start: GameState, acts: Action[], saveAt: (s: GameState, k: number) => boolean, seen: Seen): GameState {
  let s = start;
  let next = 0;
  for (let k = 0; s.phase === 'playing' && k < 20000; k++) {
    if (saveAt(s, k)) {
      seen.pending ||= !!s.boss?.pending;
      seen.active ||= !!s.boss?.active;
      seen.blocks ||= !!s.boss?.blocks?.length;
      seen.stageBoss ||= !!s.stage?.boss;
      s = load(s);
    }
    while (next < acts.length && acts[next].k === k) {
      const a = acts[next++];
      const id = s.grid[a.from]!.id;
      expect(drop(s, a.from, a.to, id).ok).toBe(true);
    }
    tick(s);
  }
  expect(next).toBe(acts.length);
  return s;
}

/** Uninterrupted run vs the same run saved and resumed: once mid-hazard, and every 0.5 s throughout. */
function check(make: () => GameState, seed: number): Seen {
  const a = make();
  const acts = play(a, seed);
  const want = serialize(a);
  expect(['won', 'lost']).toContain(a.phase);
  const seen: Seen = { pending: false, active: false, blocks: false, stageBoss: false };
  // one save in the middle of a hazard (a pending warning, else the half-way tick)
  let once = false;
  const half = Math.floor(a.elapsed / 0.05 / 2);
  const mid = replay(make(), acts, (s, k) => {
    if (once || (!s.boss?.pending && !s.boss?.active && k < half)) return false;
    return (once = true);
  }, seen);
  expect(once).toBe(true);
  expect(serialize(mid)).toBe(want);
  const often = replay(make(), acts, (_, k) => k > 0 && k % 10 === 0, seen);
  expect(serialize(often)).toBe(want);
  return seen;
}

describe('save / resume replays exactly (seeded bot)', () => {
  it('chapter boss L10 as authored (minion stage, then the boss wakes)', () => {
    const seen = check(() => newLevel(LEVELS[9]), 10);
    expect(seen.stageBoss).toBe(true);
  });

  it('chapter bosses mid-fight: L40 junk blocks, L70 tow bar, L80 time ransom', () => {
    const blocks = check(() => newLevel(solo(LEVELS[39])), 40);
    expect(blocks.pending && blocks.active).toBe(true);
    const tow = check(() => newLevel(solo(LEVELS[69])), 70);
    expect(tow.pending && tow.active).toBe(true);
    const ransom = check(() => newLevel(solo(LEVELS[79])), 80);
    expect(ransom.pending).toBe(true);
  });

  it('a mini-boss level (L38 Brick Printer: junk blocks on the board)', () => {
    expect(LEVELS[37].mini_boss).toBe('brick_printer');
    const seen = check(() => newLevel(solo(LEVELS[37])), 38);
    expect(seen.pending && seen.blocks).toBe(true);
  });

  it('an Endless Road floor', () => {
    check(() => {
      const s = newLevel(endlessDef(3));
      s.endless = 3;
      return s;
    }, 3);
  });

  it('a workshop puzzle resumed between moves', () => {
    const p = (raw as unknown as { daily: PuzzleDef[] }).daily.find((x) => x.solution.length >= 3)!;
    const run = (cut: number) => {
      let s = newPuzzle(p);
      p.solution.forEach(([f, t], i) => {
        if (i === cut) s = load(s);
        expect(drop(s, f, t, s.grid[f]!.id).ok).toBe(true);
      });
      return s;
    };
    const want = serialize(run(-1));
    expect(JSON.parse(want).phase).toBe('won');
    for (let cut = 1; cut < p.solution.length; cut++) expect(serialize(run(cut))).toBe(want);
  });
});
