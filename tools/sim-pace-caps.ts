// PACE CAPS proof (t-157b3f78): thinker bot (best previewed merge every 3 s +-20%, as sim-levels.ts --fit-smart) on sample levels,
// flag OFF vs ON, at the current HP. Never writes levels.json / puzzles.json.
// Usage: npx vite-node tools/sim-pace-caps.ts [--n 20] [--levels 15,30,...] [--every 3]
import { LEVELS } from '../src/content/levels';
import { applyPace, DEFAULT_PACE } from '../src/content/experiments';
import { TUNING } from '../src/content/tuning';
import { choosePerk, drop, legalPairs, newLevel, previewMerge, tick, type GameState } from '../src/core/game';
import { Rng } from '../src/core/rng';

const args = process.argv.slice(2);
const arg = (k: string) => (args.includes(k) ? args[args.indexOf(k) + 1] : undefined);
const N = Number(arg('--n')) || 20;
const EVERY = Number(arg('--every')) || 3;
const LV = (arg('--levels') ?? '15,30,40,45,55,65,75').split(',').map(Number);
applyPace(DEFAULT_PACE);

const capOf = (s: GameState) => (s.goal ? Infinity : Math.ceil(s.maxHp * TUNING.cascadeCap));
function smart(s: GameState): [number, number] | null {
  let best: [number, number] | null = null, bd = -1;
  for (const [a, b] of legalPairs(s))
    for (const [f, t] of [[a, b], [b, a]] as [number, number][]) {
      const r = previewMerge(s, f, t)!;
      const d = s.goal?.kind === 'rank' ? s.grid[f]!.rank * 1e9 + r.total : s.goal?.kind === 'chain' ? r.count * 1e9 + r.total : Math.min(r.total, capOf(s));
      if (d > bd) [bd, best] = [d, [f, t]];
    }
  return best;
}

type Run = { won: boolean; t: number; r6: number | null; r8: boolean };
function play(level: number, botSeed: number): Run {
  const def = LEVELS.find((d) => d.level === level)!;
  const s = newLevel(def);
  const rng = new Rng(botSeed);
  let next = EVERY, r6: number | null = null, r8 = false;
  while (s.phase === 'playing' || s.phase === 'choice') {
    if (s.phase === 'choice') {
      choosePerk(s, s.offer[0]);
      continue;
    }
    if (s.elapsed >= next) {
      next += EVERY * (0.8 + 0.4 * rng.next());
      const m = smart(s);
      if (m) drop(s, m[0], m[1], s.grid[m[0]]!.id);
    }
    tick(s);
    if (r6 === null && s.stats.bestRank >= 6) r6 = s.elapsed;
    if (s.stats.bestRank >= 8) r8 = true;
  }
  return { won: s.phase === 'won', t: s.elapsed, r6, r8 };
}

const avg = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : NaN);
const f = (x: number) => (Number.isNaN(x) ? '-' : x.toFixed(0));
console.log('| Level | Flag | Win rate | Win time (s) | First rank 6 (s) | Reached rank 6 | Reached rank 8 |');
console.log('|---|---|---|---|---|---|---|');
for (const level of LV) {
  const def = LEVELS.find((d) => d.level === level)!;
  for (const on of [false, true]) {
    TUNING.paceCaps = on;
    const runs: Run[] = [];
    for (let k = 1; k <= N; k++) runs.push(play(level, def.seed * 31 + k));
    const wins = runs.filter((r) => r.won);
    const r6 = runs.filter((r) => r.r6 !== null).map((r) => r.r6!);
    console.log(`| L${level} | ${on ? 'ON' : 'OFF'} | ${Math.round((wins.length / N) * 100)}% | ${f(avg(wins.map((r) => r.t)))} | ${f(avg(r6))} | ${r6.length}/${N} | ${runs.filter((r) => r.r8).length}/${N} |`);
  }
}
