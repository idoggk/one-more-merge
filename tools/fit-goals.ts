// CHAIN-GOAL FIT (t-c459303c): staged chain-goal levels (HP machines, then FIRE A CHAIN OF n) lost to the goal, not
// the HP: L54 (chain 11) stayed HARD_FOR_THINKER even at 0.2x HP and L65 had its HP cut to 0.20x to pay for its goal.
// Per level, with the CALM thinker (level-report smart3: best previewed merge every 3 s ±20%, goal-aware):
//   1. n = the largest chain in [--min, authored + 2] the thinker wins >= --target with the HP machines at --floor x the
//      chapter reference HP (median of plain peers with the same clock and machine count: fit-goals-lib refHp);
//   2. HP = the multiplier on that reference in [--floor, max(1, current/ref)] where the thinker wins ~--target.
// Writes goal.n + hp of those levels only to src/content/levels.json unless --dry; then re-run star-times for them:
//   npx vite-node tools/star-times.ts --only 29,44,54,65 --write
// Usage: npx vite-node tools/fit-goals.ts [--dry] [--levels 29,44,54,65] [--n 40] [--target 0.9] [--floor 0.5] [--min 6]
import { readFileSync, writeFileSync } from 'node:fs';
import { applyPace, DEFAULT_PACE } from '../src/content/experiments';
import { LEVELS, type LevelDef } from '../src/content/levels';
import { TUNING, type Pace } from '../src/content/tuning';
import { choosePerk, drop, legalPairs, newLevel, previewMerge, tick, type GameState } from '../src/core/game';
import { Rng } from '../src/core/rng';
import { fitHp, isStagedChain, pickGoalN, r50, refHp } from './fit-goals-lib';

const args = process.argv.slice(2);
const arg = (k: string) => (args.includes(k) ? args[args.indexOf(k) + 1] : undefined);
const DRY = args.includes('--dry');
const N = Number(arg('--n')) || 40;
const TARGET = Number(arg('--target')) || 0.9;
const FLOOR = Number(arg('--floor')) || 0.5;
const MIN_N = Number(arg('--min')) || 6;
const PACE = (arg('--pace') ?? DEFAULT_PACE) as Pace;
applyPace(PACE);
const ONLY = arg('--levels') ? new Set(arg('--levels')!.split(',').map(Number)) : null;

const capOf = (s: GameState) => (s.goal ? Infinity : Math.ceil(s.maxHp * TUNING.cascadeCap));
// level-report smart3: chain goal = the longest previewed chain, else capped damage
function thinker(s: GameState): [number, number] | null {
  let best: [number, number] | null = null, bd = -1;
  for (const [a, b] of legalPairs(s))
    for (const [f, t] of [[a, b], [b, a]] as [number, number][]) {
      const r = previewMerge(s, f, t);
      if (!r) continue;
      const d = s.goal?.kind === 'chain' ? r.count * 1e9 + r.total : Math.min(r.total, capOf(s));
      if (d > bd) [bd, best] = [d, [f, t]];
    }
  return best;
}
function play(def: LevelDef, seed: number): boolean {
  const s = newLevel(def);
  const rng = new Rng(seed);
  let next = 3 * (0.8 + 0.4 * rng.next());
  while (s.phase === 'playing' || s.phase === 'choice') {
    if (s.phase === 'choice') {
      choosePerk(s, s.offer[0]);
      continue;
    }
    if (s.elapsed >= next) {
      next += 3 * (0.8 + 0.4 * rng.next());
      const m = thinker(s);
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
const pc = (x: number) => `${Math.round(x * 100)}%`;

const out = JSON.parse(readFileSync('src/content/levels.json', 'utf8'));
for (const def of LEVELS) {
  if (!isStagedChain(def) || (ONLY && !ONLY.has(def.level))) continue;
  const ref = refHp(def, LEVELS);
  if (!Number.isFinite(ref)) {
    console.log(`L${def.level} no chapter peers: skipped`);
    continue;
  }
  const at = (n: number, hp: number): LevelDef => ({ ...def, goal: { kind: 'chain', n }, hp: r50(hp) });
  const before = winRate(def, 100000);
  const g = pickGoalN((n) => winRate(at(n, ref * FLOOR)), MIN_N, def.goal!.n + 2, TARGET);
  const k = fitHp((x) => winRate(at(g.n, ref * x)), FLOOR, Math.max(1, def.hp / ref), TARGET);
  const fitted = at(g.n, ref * k);
  const after = winRate(fitted, 100000); // held-out bot seeds
  console.log(
    `L${String(def.level).padStart(2)} ${def.difficulty.padEnd(9)} chain ${def.goal!.n} -> ${g.n} (at ${FLOOR}x ref: ${g.tried.map(([n, w]) => `${n}:${pc(w)}`).join(' ')})` +
      `  hp ${def.hp} (${(def.hp / ref).toFixed(2)}x ref ${Math.round(ref)}) -> ${fitted.hp} (${k.toFixed(2)}x)  thinker ${pc(before)} -> held-out ${pc(after)} (target ${pc(TARGET)})`,
  );
  const lv = out.levels[def.level - 1];
  lv.goal = { ...lv.goal, n: g.n };
  lv.hp = fitted.hp;
}
if (!DRY) writeFileSync('src/content/levels.json', JSON.stringify(out, null, 2) + '\n');
