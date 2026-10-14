// PACE CAPS (t-157b3f78): with TUNING.paceCaps ON, plain kickback twins and matchmaker copies never pick a part above rank 4.
// Flag OFF identity is covered by tests/flagsOff.test.ts (golden hashes).
import { afterEach, describe, expect, it } from 'vitest';
import { LEVELS } from '../src/content/levels';
import { TUNING } from '../src/content/tuning';
import { choosePerk, drop, legalPairs, matchmakerPick, newLevel, planDrop, tick, type GameState } from '../src/core/game';

afterEach(() => {
  TUNING.paceCaps = false;
  TUNING.kickbackTwinMaxRank = 8;
  TUNING.matchCopyMax = 8;
});

const lvl = (n: number) => LEVELS.find((d) => d.level === n)!;

/** Plays a level with a first-legal-pair bot and reports the highest rank a twin plan / matchmaker pick could choose and the best rank seen. */
function probe(s: GameState) {
  let twin = 0, match = 0, best = 0;
  for (let i = 0; i < 300 && (s.phase === 'playing' || s.phase === 'choice'); i++) {
    for (let k = 0; k < 40; k++) tick(s, new Set());
    if (s.phase === 'choice') choosePerk(s, s.offer[0]);
    const p = legalPairs(s);
    if (p.length) drop(s, p[p.length - 1][0], p[p.length - 1][1], s.grid[p[p.length - 1][0]]!.id);
    const plan = planDrop({ ...s }, new Set(), false); // spread copy: the kick RNG of the real state is not consumed
    if (plan) twin = Math.max(twin, s.grid[plan.idx]!.rank);
    for (let o = 1; o <= 6; o++) match = Math.max(match, matchmakerPick(s, s.shipments + o)?.rank ?? 0);
    for (const g of s.grid) if (g) best = Math.max(best, g.rank);
  }
  return { twin, match, best };
}

describe('pace caps', () => {
  it('flag ON: no twin or matchmaker copy above rank 4 over 3 sample levels', () => {
    TUNING.paceCaps = true;
    for (const n of [30, 45, 65]) {
      const r = probe(newLevel(lvl(n)));
      expect(r.twin, `L${n} twin`).toBeLessThanOrEqual(4);
      expect(r.match, `L${n} matchmaker`).toBeLessThanOrEqual(4);
    }
  });

  it('the probe can see high ranks when the caps are off (so the ON test can fail)', () => {
    const r = [30, 45, 65].map((n) => probe(newLevel(lvl(n))));
    expect(Math.max(...r.map((x) => Math.max(x.twin, x.match)))).toBeGreaterThan(4);
  });

  it('the two TUNING keys alone cap their mechanic; defaults are 8 and the flag is off', () => {
    expect(TUNING.kickbackTwinMaxRank).toBe(8);
    expect(TUNING.matchCopyMax).toBe(8);
    expect(TUNING.paceCaps).toBe(false);
    TUNING.kickbackTwinMaxRank = 2;
    TUNING.matchCopyMax = 3;
    const r = [30, 45, 65].map((n) => probe(newLevel(lvl(n))));
    for (const x of r) {
      expect(x.twin).toBeLessThanOrEqual(2);
      expect(x.match).toBeLessThanOrEqual(3);
    }
  });
});
