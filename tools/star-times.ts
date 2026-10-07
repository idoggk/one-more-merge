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
  // r23 goal levels: everyone aims at the goal (rank: highest pair; chain: the ordinary player sees 30% of chains)
  if (s.goal?.kind === 'rank') {
    const top = Math.max(...p.map(([a]) => s.grid[a]!.rank));
    const c = p.filter(([a]) => s.grid[a]!.rank === top);
    return c[rng.int(c.length)];
  }
  if (s.goal?.kind === 'chain' && !chain && rng.next() < 0.3) chain = true;
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
const only = args.includes('--only') ? args[args.indexOf('--only') + 1].split(',').map(Number) : null;
for (const def of LEVELS) {
  const L = def.level;
  if (only && !only.includes(L)) continue;
  const T = L % 10 === 0 && !def.waves ? 90 : def.time_seconds;
  const steady = clears(L, 2, false), fast = clears(L, 1.5, true);
  // never stricter than the bots managed; never looser than the old fractions
  const s2 = Math.min(Math.floor(T * 0.8), Math.ceil(steady.t || T * 0.8));
  // chain goals: fast merging drains the board, so the chain-seeker bot is no 3-star model there; use 75% of the 2-star time
  const s3 = def.goal?.kind === 'chain' ? Math.min(s2 - 2, Math.round(s2 * 0.75)) : Math.min(s2 - 2, Math.floor(T * 0.6), Math.ceil(fast.t || T * 0.6));
  // r24 (Ido: 'should be easier to get 3 stars at the start'): chapter 1 gives 3 stars to an ordinary pace with slack
  if (L <= 10) {
    const e3 = Math.min(Math.floor(T * 0.6), Math.ceil((steady.t || T * 0.6) * 1.3));
    out[L] = [Math.max(e3 + 4, Math.floor(T * 0.8)), e3];
  } else {
    // r38: the expert chain-seeker bot made 3 stars unreachable for ordinary players (L13: 0:26 on a 1:35 clock);
    // floors at 65% / 45% of the clock (ChatGPT review suggested 75% / 60% as a starting point)
    const f2 = Math.min(Math.floor(T * 0.8), Math.max(s2, Math.floor(T * 0.65)));
    out[L] = [f2, Math.min(f2 - 2, Math.max(s3, Math.floor(T * 0.45)))];
  }
  console.log(`L${String(L).padStart(2)} T=${T}s  human2s win ${Math.round(steady.win * 100)}% ${steady.t.toFixed(1)}s  chain1.5 win ${Math.round(fast.win * 100)}% ${fast.t.toFixed(1)}s  -> stars ${out[L][0]}s / ${out[L][1]}s (old ${Math.floor(T * 0.8)} / ${Math.floor(T * 0.6)})`);
}
if (args.includes('--write')) {
  const path = 'src/content/levels.json';
  const raw = JSON.parse(readFileSync(path, 'utf8'));
  for (const lv of raw.levels) if (out[lv.level]) lv.star_times = out[lv.level];
  writeFileSync(path, JSON.stringify(raw, null, 2) + '\n');
  console.log('wrote star_times');
}
