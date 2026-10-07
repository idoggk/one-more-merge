// r29 item acceptance check (ChatGPT r26): same seeds, random-3s player that IGNORES the tray item vs one that applies it
// to its highest-rank fitting machine right away. Reports win rate and median clear time per defeat level from L13.
// Usage: npx vite-node tools/item-check.ts [--n 60]
import { LEVELS } from '../src/content/levels';
import { applyItem, drop, legalPairs, newLevel, tick, type GameState } from '../src/core/game';
import { Rng } from '../src/core/rng';
import { itemFits } from '../src/core/types';

const args = process.argv.slice(2);
const N = Number(args[args.indexOf('--n') + 1]) || 60;
const median = (a: number[]) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)] ?? 0;
function play(lv: number, seed: number, useItem: boolean) {
  const s: GameState = newLevel(LEVELS[lv - 1]);
  const rng = new Rng(seed);
  let next = 3, used = 0;
  while (s.phase === 'playing') {
    if (s.elapsed >= next) {
      next += 3;
      if (useItem && s.itemTray) {
        let best = -1;
        s.grid.forEach((g, i) => {
          if (g && !g.item && itemFits(s.itemTray!, g.family) && (best < 0 || g.rank > s.grid[best]!.rank)) best = i;
        });
        if (best >= 0 && applyItem(s, best, s.grid[best]!.id).ok) used++;
      }
      const p = legalPairs(s);
      if (p.length) {
        const [a, b] = p[rng.int(p.length)];
        drop(s, a, b, s.grid[a]!.id);
      }
    }
    tick(s);
  }
  return { won: s.phase === 'won', t: s.elapsed, used };
}
let sumA = 0, sumB = 0, levels = 0;
for (const def of LEVELS) {
  if (def.level < 13 || def.goal) continue;
  const a = [], b = [];
  for (let k = 1; k <= N; k++) {
    a.push(play(def.level, def.seed * 7 + k, false));
    b.push(play(def.level, def.seed * 7 + k, true));
  }
  const wa = a.filter((x) => x.won).length / N, wb = b.filter((x) => x.won).length / N;
  sumA += wa;
  sumB += wb;
  levels++;
  console.log(`L${def.level}  ignore ${Math.round(wa * 100)}% ${median(a.filter((x) => x.won).map((x) => x.t)).toFixed(1)}s   use ${Math.round(wb * 100)}% ${median(b.filter((x) => x.won).map((x) => x.t)).toFixed(1)}s  (applied ${b.filter((x) => x.used).length}/${N})`);
}
console.log(`AVERAGE win  ignore ${Math.round((sumA / levels) * 100)}%  use ${Math.round((sumB / levels) * 100)}%`);
