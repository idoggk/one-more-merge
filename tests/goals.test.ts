import { describe, expect, it } from 'vitest';
import { LEVELS } from '../src/content/levels';
import { drop, legalPairs, newLevel, tick, type GameState } from '../src/core/game';
import { Rng } from '../src/core/rng';

const play = (s: GameState, every: number, pick: (s: GameState, rng: Rng) => [number, number] | null, seed = 7) => {
  const rng = new Rng(seed);
  let next = every;
  const evs: string[] = [];
  while (s.phase === 'playing') {
    if (s.elapsed >= next) {
      next += every;
      const m = pick(s, rng);
      if (m) for (const e of drop(s, m[0], m[1], s.grid[m[0]]!.id).events) evs.push(e.type);
    }
    tick(s);
  }
  return evs;
};
const highest = (s: GameState, rng: Rng): [number, number] | null => {
  const p = legalPairs(s);
  if (!p.length) return null;
  const top = Math.max(...p.map(([a]) => s.grid[a]!.rank));
  const c = p.filter(([a]) => s.grid[a]!.rank === top);
  return c[rng.int(c.length)];
};
const random = (s: GameState, rng: Rng): [number, number] | null => {
  const p = legalPairs(s);
  return p.length ? p[rng.int(p.length)] : null;
};

describe('r23 goal levels', () => {
  it('MAKE RANK: a player merge reaching the rank wins; HP never decides', () => {
    const def = LEVELS[3];
    expect(def.goal).toEqual({ kind: 'rank', n: 4 });
    const s = newLevel(def);
    expect(s.maxHp).toBeGreaterThan(1e8);
    const evs = play(s, 2, highest);
    expect(s.phase).toBe('won');
    expect(evs).toContain('goal');
    expect(s.goal!.best).toBeGreaterThanOrEqual(4);
    expect(evs).not.toContain('threshold'); // no HP-panel kickback on goal levels
  });
  it('CHAIN: one player-rooted cascade of N wins', () => {
    const def = LEVELS[4];
    expect(def.goal?.kind).toBe('chain');
    const s = newLevel(def);
    play(s, 3, random);
    expect(s.phase).toBe('won');
    expect(s.goal!.best).toBeGreaterThanOrEqual(def.goal!.n);
  });
  it('a goal level is deterministic', () => {
    const a = newLevel(LEVELS[3]), b = newLevel(LEVELS[3]);
    play(a, 2, highest);
    play(b, 2, highest);
    expect(a.elapsed).toBe(b.elapsed);
  });
});

describe('r23 behaviours and twists', () => {
  it('chain shield: closed = x0.75, a 4+ cascade opens it for 6 s', () => {
    const s = newLevel(LEVELS[7]);
    expect(s.shieldUntil).toBe(-1);
    const evs = play(s, 2, random);
    expect(evs).toContain('shield');
  });
  it('light suction uses the boss system without armor phases', () => {
    const s = newLevel(LEVELS[8]);
    expect(s.boss?.light).toBe(true);
    const evs = play(s, 3, random);
    expect(evs.length).toBeGreaterThan(0);
    expect(s.boss!.phaseShown).toBe(0);
  });
  it('GAPS masks (2,1) and (2,3) and nothing ever lands there', () => {
    const s = newLevel(LEVELS[14]);
    expect(s.masked).toEqual([11, 13]);
    const rng = new Rng(3);
    for (let t = 0; t < 1200 && s.phase === 'playing'; t++) {
      if (t % 40 === 0) {
        const m = random(s, rng);
        if (m) drop(s, m[0], m[1], s.grid[m[0]]!.id);
      }
      tick(s);
      expect(s.grid[11]).toBeNull();
      expect(s.grid[13]).toBeNull();
    }
  });
  it('L6 swaps the shooter to Rocket; L12 starts with a Magnet', () => {
    expect(newLevel(LEVELS[5]).grid.some((g) => g?.family === 'rocket')).toBe(true);
    expect(newLevel(LEVELS[11]).grid.some((g) => g?.family === 'magnet')).toBe(true);
  });
});
