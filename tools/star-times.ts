// Per-level star goals from bot clear times (r22: 0.8T / 0.6T was trivial for skilled players).
// 2 stars = median clear of an ordinary human pace (random legal merge every 2 s);
// 3 stars = median clear of a skilled chain-seeker (best-chain merge every 1.5 s) — real skill, not a formality.
// Usage: npx vite-node tools/star-times.ts [--write] [--n 40]
import { readFileSync, writeFileSync } from 'node:fs';
import { LEVELS } from '../src/content/levels';
import { drop, legalPairs, newLevel, previewMerge, tick, type GameState } from '../src/core/game';
import { Rng } from '../src/core/rng';

const args = process.argv.slice(2);
const N = Number(args[args.indexOf('--n') + 1]) || 40;
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
function clears(L: number, every: number, chain: boolean): { win: number; t: number } {
  const def = LEVELS[L - 1];
  const times: number[] = [];
  let wins = 0;
  for (let k = 1; k <= N; k++) {
    const s = newLevel(def);
    const rng = new Rng(k * 977 + L);
    let next = every;
    while (s.phase === 'playing') {
      if (s.elapsed >= next) {
        next += every;
        const m = pick(s, rng, chain);
        if (m) drop(s, m[0], m[1], s.grid[m[0]]!.id);
      }
      tick(s);
    }
    if (s.phase === 'won') (wins++, times.push(s.elapsed));
  }
  return { win: wins / N, t: median(times) };
}
const out: Record<number, [number, number]> = {};
for (const def of LEVELS) {
  const L = def.level;
  const T = L % 10 === 0 ? 90 : def.time_seconds;
  const steady = clears(L, 2, false), fast = clears(L, 1.5, true);
  // never stricter than the bots managed; never looser than the old fractions
  const s2 = Math.min(Math.floor(T * 0.8), Math.ceil(steady.t || T * 0.8));
  const s3 = Math.min(s2 - 2, Math.floor(T * 0.6), Math.ceil(fast.t || T * 0.6));
  out[L] = [s2, s3];
  console.log(`L${String(L).padStart(2)} T=${T}s  human2s win ${Math.round(steady.win * 100)}% ${steady.t.toFixed(1)}s  chain1.5 win ${Math.round(fast.win * 100)}% ${fast.t.toFixed(1)}s  -> stars ${s2}s / ${s3}s (old ${Math.floor(T * 0.8)} / ${Math.floor(T * 0.6)})`);
}
if (args.includes('--write')) {
  const path = 'src/content/levels.json';
  const raw = JSON.parse(readFileSync(path, 'utf8'));
  for (const lv of raw.levels) lv.star_times = out[lv.level];
  writeFileSync(path, JSON.stringify(raw, null, 2) + '\n');
  console.log('wrote star_times');
}
