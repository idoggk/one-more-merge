// r23: for chain/rank goal levels, how often a random-3s player reaches each N within the clock (to pick goal sizes).
// Usage: npx vite-node tools/goal-probe.ts [--every 3] [--n 100]
import { LEVELS } from '../src/content/levels';
import { drop, legalPairs, newLevel, tick } from '../src/core/game';
import { Rng } from '../src/core/rng';

const args = process.argv.slice(2);
const EVERY = Number(args[args.indexOf('--every') + 1]) || 3;
const N = Number(args[args.indexOf('--n') + 1]) || 100;
for (const def of LEVELS.filter((d) => d.goal)) {
  const reach: number[] = []; // best value within the clock per seed
  for (let k = 1; k <= N; k++) {
    const s = newLevel({ ...def, goal: { kind: def.goal!.kind, n: 999 } });
    const rng = new Rng(def.seed * 31 + k);
    let next = EVERY;
    while (s.phase === 'playing') {
      if (s.elapsed >= next) {
        next += EVERY;
        const p = legalPairs(s);
        if (p.length) {
          const [a, b] = p[rng.int(p.length)];
          drop(s, a, b, s.grid[a]!.id);
        }
      }
      tick(s);
    }
    reach.push(s.goal!.best);
  }
  const pct = (v: number) => Math.round((reach.filter((x) => x >= v).length / N) * 100);
  const vals = def.goal!.kind === 'chain' ? [8, 12, 16, 20, 24, 28, 32] : [3, 4, 5, 6, 7];
  console.log(`L${def.level} ${def.goal!.kind} (now ${def.goal!.n}, ${def.time_seconds}s): ` + vals.map((v) => `${v}:${pct(v)}%`).join('  '));
}
