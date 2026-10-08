// Screw Yard 2.0 (t-11ac42f6) WEEKLY RAMP generator. For each of the 10 yards of a week: generate layouts with that
// yard's knobs (plates, colours, colour mixing, stacking), solve every one exactly (src/core/yardSolver.ts) and keep the
// solvable one whose difficulty score sits nearest the yard's slot on a smooth 10 -> 68 climb. Yard 1 must score easy;
// past yard 3 a random tapper must not win more than RANDOM_MAX of its games. Writes src/content/yards.json.
// Usage: npx vite-node tools/gen-yards.ts [week]   (week = seed offset, default 1)
import { writeFileSync } from 'node:fs';
import { YARD_RULES_2, type YardLevel } from '../src/core/screw';
import { generateYard2, type YardGenParams } from '../src/core/yardGen';
import { solveYard, yardScore, YardTooBig, type YardSolve } from '../src/core/yardSolver';

const WEEK = +(process.argv[2] ?? 1);
const YARDS = 10;
const RANDOM_MAX = 0.1;
const YARD1_MAX = 15;

export const rampTarget = (n: number) => 10 + ((n - 1) * 58) / (YARDS - 1);
const knobs = (n: number): YardGenParams => ({
  plates: Math.round(4 + n * 1.2),
  colors: n === 1 ? 2 : n <= 3 ? 3 : n <= 6 ? 4 : n <= 8 ? 5 : 6,
  swaps: n - 1,
  window: 3 + Math.floor(n / 2),
  cluster: 0.86 - n * 0.02,
});
const r2 = (v: number, d = 100) => Math.round(v * d) / d;

const yards: (YardLevel & { score: number; stats: YardSolve & { screws: number } })[] = [];
const t0 = performance.now();
let solved = 0, solveMs = 0, worstMs = 0;
for (let n = 1; n <= YARDS; n++) {
  const want = rampTarget(n);
  let best: (typeof yards)[number] | null = null;
  for (let k = 0; k < 300 && !(best && Math.abs(best.score - want) <= 1); k++) {
    const seed = (WEEK * 100003 + n * 1009 + k * 7919) >>> 0;
    const lvl = generateYard2(n, seed, knobs(n));
    if (!lvl) continue;
    // stored geometry is rounded, so solve the rounded yard
    for (const p of lvl.plates) Object.assign(p, { x: r2(p.x), y: r2(p.y), angle: r2(p.angle, 1e6) });
    for (const s of lvl.screws) Object.assign(s, { x: r2(s.x), y: r2(s.y) });
    let r;
    try {
      r = solveYard(lvl);
    } catch (e) {
      if (e instanceof YardTooBig) continue;
      throw e;
    }
    solved++;
    solveMs += r.ms;
    worstMs = Math.max(worstMs, r.ms);
    if (!r.solvable) continue;
    const score = yardScore(r, lvl.screws.length);
    if (n === 1 && score > YARD1_MAX) continue;
    if (n > 3 && r.randomWin > RANDOM_MAX) continue;
    if (n > 1 && score <= yards[n - 2].score) continue;
    if (best && Math.abs(score - want) >= Math.abs(best.score - want)) continue;
    best = { ...lvl, score, stats: { screws: lvl.screws.length, ...r, randomWin: r2(r.randomWin, 1000) } };
  }
  if (!best) throw new Error(`yard ${n}: no layout found`);
  yards.push(best);
  const st = best.stats;
  console.log(`yard ${n}: score ${best.score} (target ${want.toFixed(0)})  screws ${st.screws}  colours ${new Set(best.queue).size}  random ${(st.randomWin * 100).toFixed(1)}%  greedy ${st.greedyWins ? 'wins' : 'loses'}  min dock ${st.minDockPeak}  dead openers ${st.deadFirst}/${st.firstMoves}  tempting ${st.tempting}  solutions ${st.solutions}  ${st.ms} ms`);
}
console.log(`solved ${solved} candidate yards, avg ${(solveMs / solved).toFixed(1)} ms, worst ${worstMs} ms; total ${((performance.now() - t0) / 1000).toFixed(1)} s`);
writeFileSync('src/content/yards.json', JSON.stringify({ week: WEEK, rules: YARD_RULES_2, yards }) + '\n');
