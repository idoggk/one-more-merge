// Fit Boss Rush HP (ChatGPT r29): random-3s, no item use; fight 1 (mini) 85%, fight 2 / 3 (bosses) 80% / 75%.
// Writes src/content/rush.json as { bossId: [hpSlot0, hpSlot1, hpSlot2] }. Usage: npx vite-node tools/rush-fit.ts [--n 60]
import { writeFileSync } from 'node:fs';
import { BOSSES } from '../src/core/boss';
import { drop, legalPairs, tick } from '../src/core/game';
import { Rng } from '../src/core/rng';
import { bossLevel, newRushFight, rushDef, RUSH_TARGETS } from '../src/core/rush';

const args = process.argv.slice(2);
const N = Number(args[args.indexOf('--n') + 1]) || 60;
const win = (id: string, slot: number, hp: number) => {
  let w = 0;
  for (let k = 1; k <= N; k++) {
    const s = newRushFight(id, slot, 1000 + k, hp);
    const rng = new Rng(k * 7 + slot);
    let next = 3;
    while (s.phase === 'playing') {
      if (s.elapsed >= next) {
        next += 3;
        const p = legalPairs(s);
        if (p.length) {
          const [a, b] = p[rng.int(p.length)];
          rng.next() < 0.5 ? drop(s, a, b, s.grid[a]!.id) : drop(s, b, a, s.grid[b]!.id);
        }
      }
      tick(s);
    }
    if (s.phase === 'won') w++;
  }
  return w / N;
};
const out: Record<string, number[]> = {};
for (const b of BOSSES) {
  if (bossLevel(b.id) < 0) continue;
  const slots = b.mini ? [0] : [1, 2];
  out[b.id] = [0, 0, 0];
  for (const slot of slots) {
    const base = rushDef(b.id, slot).hp;
    let lo = 0.1, hi = 4;
    for (let it = 0; it < 9; it++) {
      const mid = (lo + hi) / 2;
      if (win(b.id, slot, Math.round(base * mid)) > RUSH_TARGETS[slot]) lo = mid;
      else hi = mid;
    }
    const hp = Math.max(500, Math.round((base * lo) / 50) * 50);
    out[b.id][slot] = hp;
    console.log(`${b.id} slot ${slot}: hp ${hp}  win ${Math.round(win(b.id, slot, hp) * 100)}% (target ${RUSH_TARGETS[slot] * 100}%)`);
  }
}
writeFileSync('src/content/rush.json', JSON.stringify(out, null, 2) + '\n');
console.log('wrote rush.json');
