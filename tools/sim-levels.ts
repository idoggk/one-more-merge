// SAGA level calibration (ChatGPT r15 targets): unboosted novice clears Normal 85-95%, Hard 65-80%, Mega 50-65%;
// idle never wins. Binary-searches each level's HP so the novice bot lands on the band's midpoint, then writes
// src/content/levels.json (hp only) unless --dry. Usage: npx vite-node tools/sim-levels.ts [--dry] [--from N] [--to N]
import { readFileSync, writeFileSync } from 'node:fs';
import { LEVELS, type LevelDef } from '../src/content/levels';
import { choosePerk, drop, legalPairs, newLevel, tick, type GameState } from '../src/core/game';
import { Rng } from '../src/core/rng';

const args = process.argv.slice(2);
const dry = args.includes('--dry');
const from = Number(args[args.indexOf('--from') + 1]) || 1;
const to = Number(args[args.indexOf('--to') + 1]) || LEVELS.length;
const N = Number(args[args.indexOf('--n') + 1]) || 40;
// chapter rhythm (ChatGPT r16): ramp inside each chapter, relief right after the Hard (p5) and Mega (p10)
const RHYTHM = [0.95, 0.93, 0.91, 0.88, 0.72, 0.95, 0.91, 0.88, 0.85, 0.57];

function novice(s: GameState, rng: Rng): [number, number] | null {
  const p = legalPairs(s);
  if (!p.length) return null;
  const [a, b] = p[rng.int(p.length)];
  return rng.next() < 0.5 ? [a, b] : [b, a];
}

function play(def: LevelDef, botSeed: number, idle = false): boolean {
  const s = newLevel(def);
  const rng = new Rng(botSeed);
  let next = 5;
  while (s.phase === 'playing' || s.phase === 'choice') {
    if (s.phase === 'choice') {
      choosePerk(s, s.offer[0]);
      continue;
    }
    if (!idle && s.elapsed >= next) {
      next += 5;
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
  const target = def.level <= 3 ? 0.97 : def.level % 10 === 0 ? (def.level === 10 ? 0.8 : 0.72) : RHYTHM[(def.level - 1) % 10];
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
out.balance_status = 'CALIBRATED_NOVICE_BOT (tools/sim-levels.ts)';
if (!dry) writeFileSync('src/content/levels.json', JSON.stringify(out, null, 2) + '\n');
