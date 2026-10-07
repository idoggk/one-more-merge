import { describe, expect, it } from 'vitest';
import raw from '../src/content/puzzles.json';
import { drillsPending, drop, newPuzzle, type PuzzleDef } from '../src/core/game';
import { allLines, DAILY_PLATEAU, dailyIndex, nextWinningMove, notePuzzleAttempt, playMove, puzzleDifficulty, puzzleHelp, puzzleReward, type PuzzleRec } from '../src/core/puzzle';

const data = raw as unknown as { daily: PuzzleDef[]; drills: Record<string, PuzzleDef[]> };
const all = [...data.daily, ...Object.values(data.drills).flat()];

describe('r42 workshop puzzles', () => {
  it('every stored solution wins in exactly its moves', () => {
    expect(all.length).toBeGreaterThan(60);
    for (const p of all) {
      const s = newPuzzle(p);
      for (const [f, t] of p.solution) expect(drop(s, f, t, s.grid[f]!.id).ok, p.id).toBe(true);
      expect(s.phase, p.id).toBe('won');
    }
  });
  it('restricted puzzles refuse other families; running out of moves loses', () => {
    const p = all.find((x) => x.only)!;
    const s = newPuzzle(p);
    const bad = s.grid.findIndex((g, i) => g && !p.only!.includes(g.family) && s.grid.some((h, j) => j !== i && h && h.family === g.family && h.rank === g.rank));
    if (bad >= 0) {
      const j = s.grid.findIndex((h, k) => k !== bad && h && h.family === s.grid[bad]!.family && h.rank === s.grid[bad]!.rank);
      expect(drop(s, bad, j, s.grid[bad]!.id).ok).toBe(false);
    }
    const q = newPuzzle({ ...data.daily[0], hp: 1e9 });
    for (const [f, t] of data.daily[0].solution) drop(q, f, t, q.grid[f]!.id);
    expect(q.phase).toBe('lost');
  });
  it('r43: UNITS dot iff an owned unit has an unsolved drill', () => {
    const [unit, list] = Object.entries(data.drills).find(([, l]) => l.length > 0)!;
    const only = (f: string) => f === unit;
    expect(drillsPending(only, data.drills, [])).toBe(true);
    expect(drillsPending(only, data.drills, list.slice(1).map((p) => p.id))).toBe(true);
    expect(drillsPending(only, data.drills, list.map((p) => p.id))).toBe(false);
    expect(drillsPending(() => false, data.drills, [])).toBe(false);
    const allSolved = Object.values(data.drills).flat().map((p) => p.id);
    expect(drillsPending(() => true, data.drills, allSolved)).toBe(false);
    expect(drillsPending(() => true, data.drills, allSolved.slice(1))).toBe(true);
  });
});

// r44: the owner got stuck on the very first puzzle. Scores come from the solver (src/core/puzzle.ts, 0..100).
const EASY = 18;
describe('r44 puzzle difficulty ramp', () => {
  const score = (p: PuzzleDef) => p.score!;
  it('every puzzle carries its solver score, and the cheap ones re-measure the same', () => {
    for (const p of all) expect(typeof p.score, p.id).toBe('number');
    const cheap = [...data.daily.slice(0, 3), ...Object.values(data.drills).flatMap((l) => l.slice(0, 2))];
    for (const p of cheap) expect(puzzleDifficulty(p).score, p.id).toBe(p.score);
  });
  it('each drill set opens easy (1 merge, many ways) and climbs without sharp drops or big jumps', () => {
    for (const [u, list] of Object.entries(data.drills)) {
      expect(list.length, u).toBe(3);
      expect(score(list[0]), u).toBeLessThanOrEqual(EASY);
      expect(list[0].moves, u).toBe(1);
      expect(puzzleDifficulty(list[0]).solutions, u).toBeGreaterThanOrEqual(2);
      for (let i = 1; i < list.length; i++) {
        const d = score(list[i]) - score(list[i - 1]);
        expect(d, list[i].id).toBeGreaterThanOrEqual(-5);
        expect(d, list[i].id).toBeLessThanOrEqual(32);
      }
    }
  });
  it('the daily list (in the order a new player sees it) opens easy and climbs gently', () => {
    const s = data.daily.map(score);
    for (const x of s.slice(0, 3)) expect(x).toBeLessThanOrEqual(EASY);
    expect(data.daily[0].moves).toBe(1);
    for (let i = 1; i < s.length; i++) {
      expect(s[i] - s[i - 1], data.daily[i].id).toBeLessThanOrEqual(12);
      expect(s[i] - s[i - 1], data.daily[i].id).toBeGreaterThanOrEqual(-10);
    }
    const mean = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;
    expect(mean(s.slice(-10))).toBeGreaterThan(mean(s.slice(0, 10)) + 25);
  });
  it('a player walks the daily list from the warm-up; a day moves on only after a solve; the tail repeats', () => {
    const rec: PuzzleRec = { streak: 0, drills: [] };
    expect(dailyIndex(rec, '2026-10-08', 40)).toBe(0);
    expect(dailyIndex(rec, '2026-10-08', 40)).toBe(0);
    expect(dailyIndex(rec, '2026-10-09', 40)).toBe(0); // unsolved: same puzzle, still easy
    rec.lastSolved = '2026-10-09';
    expect(dailyIndex(rec, '2026-10-10', 40)).toBe(1);
    rec.day = 39;
    rec.lastSolved = rec.date = '2026-11-01';
    expect(dailyIndex(rec, '2026-11-02', 40)).toBe(DAILY_PLATEAU);
  });
});

describe('r44 graduated puzzle help', () => {
  it('restart always; hint after 2 fails; next move after 4; skip only on drills after 6', () => {
    const rec: PuzzleRec = { streak: 0, drills: [] };
    const steps = Array.from({ length: 7 }, () => {
      const h = puzzleHelp(rec.fails?.d1 ?? 0, 'drill');
      notePuzzleAttempt(rec, 'd1', false);
      return [h.restart, h.hint, h.showMove, h.skip];
    });
    expect(steps).toEqual([
      [true, false, false, false],
      [true, false, false, false],
      [true, true, false, false],
      [true, true, false, false],
      [true, true, true, false],
      [true, true, true, false],
      [true, true, true, true],
    ]);
    expect(puzzleHelp(99, 'daily').skip).toBe(false);
    notePuzzleAttempt(rec, 'd1', true);
    expect(rec.fails?.d1).toBeUndefined();
  });
  it('rewards: hint is free, a shown move halves it, a skip pays nothing', () => {
    expect(puzzleReward('daily', 'hint')).toEqual(puzzleReward('daily', 'none'));
    expect(puzzleReward('daily', 'move')).toEqual({ bolts: 20, gems: 1, cards: 0 });
    expect(puzzleReward('drill', 'move')).toEqual({ bolts: 13, gems: 0, cards: 1 });
    expect(puzzleReward('drill', 'skip')).toEqual({ bolts: 0, gems: 0, cards: 0 });
  });
  it('next move: on the stored line it is the stored move; found by search it still wins; after a dead merge it is null', () => {
    const p = Object.values(data.drills).map((l) => l[1]).find((x) => puzzleDifficulty(x).deadFirst > 0)!;
    const s = newPuzzle(p);
    expect(nextWinningMove(s, p, [])).toEqual(p.solution[0]);
    let t = s;
    for (let k = 0; k < p.moves && t.phase === 'playing'; k++) t = playMove(t, nextWinningMove(t)!);
    expect(t.phase).toBe('won');
    const lines = allLines(p);
    const dead = lines.find((l) => !lines.some((w) => w.path[0].join() === l.path[0].join() && w.dmg[w.dmg.length - 1] >= p.hp))!;
    expect(nextWinningMove(playMove(s, dead.path[0]))).toBeNull();
  });
});
