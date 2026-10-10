// Per-level star goals from bot clear times (r22: 0.8T / 0.6T was trivial for skilled players).
// t-4cd9e27b (level report t-77594cd4: the old 1.5 s chain-seeker made stars measure tap speed): both bots think like the
// level report's, ±20% think time, under the shipped pace (CALM; --pace today|calm|mania):
// 2 stars = median clear of an ordinary player (any legal merge every 2.5 s);
// 3 stars = median clear of a thinker (the best previewed merge every 3 s, goal-aware) - a thinker 3-stars half the time.
// Usage: npx vite-node tools/star-times.ts [--write] [--n 40] [--only 12,13] [--pace calm]
import { readFileSync, writeFileSync } from 'node:fs';
import { applyPace, DEFAULT_PACE } from '../src/content/experiments';
import { LEVELS } from '../src/content/levels';
import { TUNING, type Pace } from '../src/content/tuning';
import { choosePerk, drop, legalPairs, newLevel, previewMerge, tick, type GameState } from '../src/core/game';
import { Rng } from '../src/core/rng';

const args = process.argv.slice(2);
const N = Number(args[args.indexOf('--n') + 1]) || 40;
const PACE = (args.includes('--pace') ? args[args.indexOf('--pace') + 1] : DEFAULT_PACE) as Pace;
applyPace(PACE);
const capOf = (s: GameState) => (s.goal ? Infinity : Math.ceil(s.maxHp * TUNING.cascadeCap));
const pick = (s: GameState, rng: Rng, smart: boolean): [number, number] | null => {
  const p = legalPairs(s);
  if (!p.length) return null;
  if (!smart) {
    // r23 goal levels: the ordinary player aims at the goal too (rank: highest pair; chain: sees 30% of chains)
    if (s.goal?.kind === 'rank') {
      const top = Math.max(...p.map(([a]) => s.grid[a]!.rank));
      const c = p.filter(([a]) => s.grid[a]!.rank === top);
      return c[rng.int(c.length)];
    }
    if (s.goal?.kind !== 'chain' || rng.next() >= 0.3) {
      // either direction, as level-report's rand25 (always a -> b lost L14 80% of the time vs ~4%)
      const [a, b] = p[rng.int(p.length)];
      return rng.next() < 0.5 ? [a, b] : [b, a];
    }
  }
  // the thinker (level-report smart3): rank goal = the highest new rank, chain goal = the longest chain, else capped damage
  let best = p[0], bd = -1;
  for (const [a, b] of p)
    for (const [f, t] of [[a, b], [b, a]] as [number, number][]) {
      const r = previewMerge(s, f, t)!;
      const d = !smart ? r.count : s.goal?.kind === 'rank' ? s.grid[f]!.rank * 1e9 + r.total : s.goal?.kind === 'chain' ? r.count * 1e9 + r.total : Math.min(r.total, capOf(s));
      if (d > bd) [bd, best] = [d, [f, t]];
    }
  return best;
};
const median = (a: number[]) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)] ?? 0;
function clears(L: number, every: number, smart: boolean): { win: number; t: number } {
  const def = LEVELS[L - 1];
  const times: number[] = [];
  let wins = 0;
  for (let k = 1; k <= N; k++) {
    const s = newLevel(def);
    const rng = new Rng(k * 977 + L);
    // levels use a fixed seed: the think time jitters ±20% (same mean) or the bot replays one game N times
    let next = every * (0.8 + 0.4 * rng.next());
    while (s.phase === 'playing' || s.phase === 'choice') {
      if (s.phase === 'choice') {
        choosePerk(s, s.offer[0]);
        continue;
      }
      if (s.elapsed >= next) {
        next += every * (0.8 + 0.4 * rng.next());
        const m = pick(s, rng, smart);
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
const fr: number[] = [];
for (const def of LEVELS) {
  const L = def.level;
  if (only && !only.includes(L)) continue;
  const T = L % 10 === 0 && !def.waves ? 90 : def.time_seconds;
  const ordinary = clears(L, 2.5, false), thinker = clears(L, 3, true);
  // 3 stars = the thinker's median clear; 2 stars = the ordinary player's median, at least 4 s (and 10% of the clock)
  // looser than 3 stars because the random tapper often clears faster than the thinker; never past 0.8T (r22)
  const s3raw = Math.ceil(thinker.t || T * 0.62);
  let s2 = Math.min(Math.floor(T * 0.8), Math.max(Math.ceil(ordinary.t || T * 0.8), s3raw + Math.max(4, Math.round(T * 0.1))));
  let s3 = Math.min(s2 - 4, s3raw);
  // r24 (Ido: 'should be easier to get 3 stars at the start'): chapter 1 gives 3 stars to the ordinary pace with slack
  if (L <= 10) {
    s2 = Math.floor(T * 0.8);
    s3 = Math.min(s2 - 4, Math.ceil(Math.max(s3raw, ordinary.t || 0) * 1.15));
  }
  out[L] = [s2, s3];
  fr.push(s3 / T);
  console.log(`L${String(L).padStart(2)} T=${T}s  rand2.5 win ${Math.round(ordinary.win * 100)}% ${ordinary.t.toFixed(1)}s  smart3 win ${Math.round(thinker.win * 100)}% ${thinker.t.toFixed(1)}s  -> stars ${s2}s / ${s3}s (3★ ${(s3 / T).toFixed(2)}T)`);
}
console.log(`pace ${PACE} | mean 3★ line ${(fr.reduce((a, b) => a + b, 0) / fr.length).toFixed(2)}T`);
if (args.includes('--write')) {
  const path = 'src/content/levels.json';
  const raw = JSON.parse(readFileSync(path, 'utf8'));
  for (const lv of raw.levels) if (out[lv.level]) lv.star_times = out[lv.level];
  writeFileSync(path, JSON.stringify(raw, null, 2) + '\n');
  console.log('wrote star_times');
}
