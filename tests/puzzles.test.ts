import { describe, expect, it } from 'vitest';
import raw from '../src/content/puzzles.json';
import { drop, newPuzzle, type PuzzleDef } from '../src/core/game';

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
});
