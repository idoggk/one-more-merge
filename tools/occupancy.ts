// Board-occupancy + chain-size by play speed (round 19 "drained board" check). Usage: npx vite-node tools/occupancy.ts
import { LEVELS } from '../src/content/levels';
import { drop, legalPairs, newLevel, previewMerge, tick, type GameState } from '../src/core/game';
import { Rng } from '../src/core/rng';

type Pol = { name: string; every: number; chain: boolean };
const pols: Pol[] = [
  { name: 'novice 5s', every: 5, chain: false },
  { name: 'greedy 2s', every: 2, chain: false },
  { name: 'fast greedy 1s', every: 1, chain: false },
  { name: 'fast chain 1s', every: 1, chain: true },
];
const pick = (s: GameState, rng: Rng, chain: boolean): [number, number] | null => {
  const p = legalPairs(s);
  if (!p.length) return null;
  if (!chain) return p[rng.int(p.length)];
  let best = p[0], bd = -1;
  for (const [a, b] of p) for (const [f, t] of [[a, b], [b, a]] as [number, number][]) {
    const d = previewMerge(s, f, t)!.count;
    if (d > bd) [bd, best] = [d, [f, t]];
  }
  return best;
};
const median = (a: number[]) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)] ?? 0;
for (const L of [8, 12, 15, 21, 33]) {
  const def = LEVELS[L - 1];
  for (const pol of pols) {
    const occ: number[] = [], chains: number[] = [];
    let wins = 0;
    for (let k = 1; k <= 40; k++) {
      const s = newLevel(def);
      const rng = new Rng(k * 977);
      let next = pol.every;
      while (s.phase === 'playing') {
        if (s.elapsed >= next) {
          next += pol.every;
          const m = pick(s, rng, pol.chain);
          if (m) {
            const res = drop(s, m[0], m[1], s.grid[m[0]]!.id);
            const c = res.events.find((e) => e.type === 'cascade') as { result: { count: number } } | undefined;
            if (c) chains.push(c.result.count);
          }
          occ.push(s.grid.filter(Boolean).length);
        }
        tick(s);
      }
      if (s.phase === 'won') wins++;
    }
    console.log(`L${L} ${pol.name.padEnd(15)} win ${String(Math.round((wins / 40) * 100)).padStart(3)}%  median occupancy ${median(occ)}/30  median chain ${median(chains)}  p90 chain ${[...chains].sort((a, b) => a - b)[Math.floor(chains.length * 0.9)] ?? 0}`);
  }
}
