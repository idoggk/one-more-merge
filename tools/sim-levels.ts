// SAGA level calibration (ChatGPT r15 targets): unboosted novice clears Normal 85-95%, Hard 65-80%, Mega 50-65%;
// idle never wins. Binary-searches each level's HP so the novice bot lands on the band's midpoint, then writes
// src/content/levels.json (hp only) unless --dry. Usage: npx vite-node tools/sim-levels.ts [--dry] [--from N] [--to N]
import { readFileSync, writeFileSync } from 'node:fs';
import { LEVELS, type LevelDef } from '../src/content/levels';
import { choosePerk, drop, legalPairs, newLevel, previewMerge, tick, type GameState } from '../src/core/game';
import { Rng } from '../src/core/rng';

const args = process.argv.slice(2);
const dry = args.includes('--dry');
const from = Number(args[args.indexOf('--from') + 1]) || 1;
const to = Number(args[args.indexOf('--to') + 1]) || LEVELS.length;
const N = Number(args[args.indexOf('--n') + 1]) || 40;
// r22: seconds between the calibration bot's random merges (5 = legacy novice; 3 = relaxed human pace)
// chance a chain-goal bot picks the best previewed chain (else random): humans see some chains, not all
const CHAIN_SKILL = Number(args[args.indexOf('--skill') + 1]) || 0.3;
const EVERY = Number(args[args.indexOf('--every') + 1]) || 3;
// chapter rhythm (ChatGPT r16): ramp inside each chapter, relief right after the Hard (p5) and Mega (p10)
const RHYTHM = [0.95, 0.93, 0.91, 0.88, 0.72, 0.95, 0.91, 0.88, 0.85, 0.57];

function novice(s: GameState, rng: Rng): [number, number] | null {
  const p = legalPairs(s);
  if (!p.length) return null;
  // r23 goal levels: a goal-aware player (rank: build the highest pair; chain: the merge with the biggest preview chain)
  if (s.goal?.kind === 'rank') {
    const top = Math.max(...p.map(([a]) => s.grid[a]!.rank));
    const c = p.filter(([a]) => s.grid[a]!.rank === top);
    return c[rng.int(c.length)];
  }
  if (s.goal?.kind === 'chain' && rng.next() < CHAIN_SKILL) {
    let best = p[0], bd = -1;
    for (const [a, b] of p) for (const [f, t] of [[a, b], [b, a]] as [number, number][]) {
      const d = previewMerge(s, f, t)!.count;
      if (d > bd) [bd, best] = [d, [f, t]];
    }
    return best;
  }
  const [a, b] = p[rng.int(p.length)];
  return rng.next() < 0.5 ? [a, b] : [b, a];
}

function play(def: LevelDef, botSeed: number, idle = false): boolean {
  const s = newLevel(def);
  const rng = new Rng(botSeed);
  let next = EVERY;
  while (s.phase === 'playing' || s.phase === 'choice') {
    if (s.phase === 'choice') {
      choosePerk(s, s.offer[0]);
      continue;
    }
    if (!idle && s.elapsed >= next) {
      next += EVERY;
      const m = novice(s, rng);
      if (m) drop(s, m[0], m[1], s.grid[m[0]]!.id);
    }
    tick(s);
  }
  return s.phase === 'won';
}

const winRate = (def: LevelDef, offset = 0) => {
  let w = 0;
  for (let k = 1; k <= N; k++) if (play(def, def.seed * 31 + k + offset)) w++;
  return w / N;
};

const out = JSON.parse(readFileSync('src/content/levels.json', 'utf8'));
for (const def of LEVELS) {
  if (def.level < from || def.level > to) continue;
  if (args.includes('--bosses') && def.level % 10 !== 0) continue;
  // levels 1-3 are onboarding: near-certain wins
  // r20 bosses: L10 80%, L20-60 72%
  // r23 (ChatGPT): chapter 1 near-sure, ramp after L10
  const R23: Record<number, number> = { 10: 0.95, 11: 0.95, 16: 0.95, 14: 0.8, 19: 0.8, 20: 0.85 };
  const target = def.level <= 3 ? 0.97 : def.level <= 9 ? 0.97 : def.level <= 20 ? R23[def.level] ?? 0.9 : def.level % 10 === 0 ? 0.72 : RHYTHM[(def.level - 1) % 10];
  if (def.goal) {
    // goal levels have no HP to fit: report the goal-aware win rate (tune n / clock by hand)
    console.log(`L${String(def.level).padStart(2)} GOAL ${def.goal.kind} ${def.goal.n}  win ${(winRate(def) * 100).toFixed(0)}% / held-out ${(winRate(def, 100000) * 100).toFixed(0)}% (target ${Math.round(target * 100)}%)`);
    continue;
  }
  const before = winRate(def);
  // HP scales damage-needed linearly; search a multiplier in [0.2, 8]
  let lo = 0.2, hi = 8, best = 1;
  for (let it = 0; it < 11; it++) {
    const mid = (lo + hi) / 2;
    const r = winRate({ ...def, hp: Math.round(def.hp * mid) });
    best = mid;
    if (r > target) lo = mid;
    else hi = mid;
  }
  const hp = Math.max(100, Math.round((def.hp * best) / 50) * 50);
  const after = winRate({ ...def, hp }, 100000); // held-out bot seeds
  const idleWins = play({ ...def, hp }, 1, true);
  console.log(`L${String(def.level).padStart(2)} ${def.difficulty.padEnd(9)} ${def.modifier.padEnd(9)} hp ${def.hp} -> ${hp}  novice ${(before * 100).toFixed(0)}% -> held-out ${(after * 100).toFixed(0)}% (target ${Math.round(target * 100)}%)${idleWins ? '  IDLE WINS!' : ''}`);
  out.levels[def.level - 1].hp = hp;
}
out.balance_status = `CALIBRATED_RANDOM_BOT_${EVERY}S (tools/sim-levels.ts)`;
if (!dry) writeFileSync('src/content/levels.json', JSON.stringify(out, null, 2) + '\n');
