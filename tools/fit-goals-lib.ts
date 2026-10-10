// Pure helpers for tools/fit-goals.ts (no game state, no I/O): the HP reference of a staged chain-goal level, the goal
// n search and the HP bisection. Tested in tests/fitGoals.test.ts.

export interface LevelLike {
  level: number;
  hp: number;
  time_seconds: number;
  waves?: number;
  minion_hp?: number;
  mini_boss?: unknown;
  goal?: { kind: 'rank' | 'chain'; n: number };
}

/** Staged chain-goal levels: HP machines in a row, then a FIRE A CHAIN OF n machine. */
export const isStagedChain = (d: LevelLike) => d.goal?.kind === 'chain' && !!d.waves;

/** A plain level of the same chapter with the same clock and machine count, other than `d` (bosses/minis excluded). */
const peer = (d: LevelLike, o: LevelLike) =>
  o.level !== d.level && Math.ceil(o.level / 10) === Math.ceil(d.level / 10) && o.time_seconds === d.time_seconds && o.waves === d.waves && !o.minion_hp && !o.mini_boss && o.level % 10 !== 0;

/** Reference HP: the median HP of the level's chapter peers, goal levels included (NaN when it has none). A chain-goal
 *  level's own HP is no reference: it was slashed to pay for a too-hard goal (L65 at 0.20x). */
export function refHp(d: LevelLike, all: LevelLike[]): number {
  const hs = all.filter((o) => peer(d, o)).map((o) => o.hp).sort((a, b) => a - b);
  if (!hs.length) return NaN;
  const m = hs.length >> 1;
  return hs.length % 2 ? hs[m] : (hs[m - 1] + hs[m]) / 2;
}

/** The largest n in [lo, hi] whose win rate (at the HP floor) reaches `target`; win must fall as n grows. Scans down
 *  from hi, so the cost is one `winAt` per rejected n. Returns lo when nothing passes. */
export function pickGoalN(winAt: (n: number) => number, lo: number, hi: number, target: number): { n: number; win: number; tried: [number, number][] } {
  const tried: [number, number][] = [];
  for (let n = hi; n >= lo; n--) {
    const w = winAt(n);
    tried.push([n, w]);
    if (w >= target) return { n, win: w, tried };
  }
  return { n: lo, win: tried[tried.length - 1]?.[1] ?? NaN, tried };
}

/** HP multiplier in [lo, hi] where the win rate (falling as k grows) crosses `target`: the largest k found that still
 *  wins above target. If hi already wins, hi; if even lo misses, lo. */
export function fitHp(winAt: (k: number) => number, lo: number, hi: number, target: number, iters = 10): number {
  if (winAt(hi) >= target) return hi;
  let best = lo;
  for (let it = 0; it < iters; it++) {
    const mid = (lo + hi) / 2;
    if (winAt(mid) >= target) (best = mid), (lo = mid);
    else hi = mid;
  }
  return best;
}

/** Level HP is written in steps of 50 (as sim-levels.ts). */
export const r50 = (x: number) => Math.max(100, Math.round(x / 50) * 50);
