// SAGA level calibration (ChatGPT r15 targets): unboosted novice clears Normal 85-95%, Hard 65-80%, Mega 50-65%;
// idle never wins. Binary-searches each level's HP so the novice bot lands on the band's midpoint, then writes
// src/content/levels.json (hp only) unless --dry. Usage: npx vite-node tools/sim-levels.ts [--dry] [--from N] [--to N]
import { readFileSync, writeFileSync } from 'node:fs';
import { LEVELS, type LevelDef } from '../src/content/levels';
import { applyPace, DEFAULT_PACE } from '../src/content/experiments';
import { TUNING, type Pace } from '../src/content/tuning';
import { choosePerk, drop, legalPairs, newLevel, previewMerge, tick, type GameState } from '../src/core/game';
import { Rng } from '../src/core/rng';
import { a2Tag, a3Tag, applyA2 } from './a2-flags';

const args = process.argv.slice(2);
// experiments and the smart fit never write levels.json
const dry = args.includes('--dry') || args.includes('--optA') || args.includes('--optA2') || args.includes('--optA3') || args.includes('--variant') || args.includes('--smart');
const from = Number(args[args.indexOf('--from') + 1]) || 1;
const to = Number(args[args.indexOf('--to') + 1]) || LEVELS.length;
const N = Number(args[args.indexOf('--n') + 1]) || 40;
// r22: seconds between the calibration bot's random merges (5 = legacy novice; 3 = relaxed human pace)
// chance a chain-goal bot picks the best previewed chain (else random): humans see some chains, not all
const CHAIN_SKILL = Number(args[args.indexOf('--skill') + 1]) || 0.3;
const EVERY = Number(args[args.indexOf('--every') + 1]) || 3;
// t-4cd9e27b: fit under the shipped pace (CALM) unless --pace today|calm|mania
const PACE = (args.includes('--pace') ? args[args.indexOf('--pace') + 1] : DEFAULT_PACE) as Pace;
applyPace(PACE);
// --optA: TUNING.optionA experiment (mid-level chaos Option A); use with --dry
if (args.includes('--optA')) TUNING.optionA = true;
// --optA2 [--a2 a|b|ab]: TUNING.optionA2 experiment (a = chain-weighted damage, b = spam fatigue; default both)
applyA2(args);
// --smart: fit HP so the smart bot (best previewed merge every 3.5 s ±20%) wins SMART_TARGET, then report the random
// bot at 2 s and 1 s on that HP (the win gap). --levels 13,25,... limits the run to a sample.
const SMART = args.includes('--smart');
const SMART_TARGET = 0.9;
// --fit-smart (t-4cd9e27b, level report t-77594cd4): WRITE the HP fitted to the smart bot (best previewed merge every
// --every s ±20%), aiming at the authored ramp + 3 points (cap 97%) so a thinker wins ~90% on average; never raises HP
// (levels the thinker already wins keep their total). The random-bot fit left the thinker at 100% under CALM with HP
// x0.64: the random bot only reads the clock.
const FIT_SMART = args.includes('--fit-smart');
const TRIM = args.includes('--trim') ? Number(args[args.indexOf('--trim') + 1]) : 1;
const ONLY = args.includes('--levels') ? new Set(args[args.indexOf('--levels') + 1].split(',').map(Number)) : null;
type Bot = { kind: 'random' | 'best'; every: number };
const NOVICE: Bot = { kind: 'random', every: EVERY };
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

// r32: --squad applies ChatGPT's expected average unit levels per chapter (shooter / relays / helper midpoints)
const SQUAD = args.includes('--squad');
const EXPECT = [[1.5, 1.5], [2.5, 2.5], [3, 2.5], [3.5, 3], [4, 3.5], [4.5, 4], [5, 4.5], [5.5, 5]];
function play(def: LevelDef, botSeed: number, idle = false, bot: Bot = NOVICE): boolean {
  const s = newLevel(def);
  if (SQUAD) {
    const [sh, rl] = EXPECT[Math.min(7, Math.ceil(def.level / 10) - 1)];
    s.unitMult = { cannon: 1 + 0.04 * (sh - 1), rocket: 1 + 0.04 * (sh - 1), coil: 1 + 0.02 * (rl - 1), bell: 1 + 0.02 * (rl - 1) };
  }
  const rng = new Rng(botSeed);
  let next = bot.every;
  while (s.phase === 'playing' || s.phase === 'choice') {
    if (s.phase === 'choice') {
      choosePerk(s, s.offer[0]);
      continue;
    }
    if (!idle && s.elapsed >= next) {
      // levels use a fixed seed: the smart bot jitters its think time ±20% (same mean) or it replays one game N times
      next += bot.kind === 'best' ? bot.every * (0.8 + 0.4 * rng.next()) : bot.every;
      const m = bot.kind === 'best' ? smart(s) : novice(s, rng);
      if (m) drop(s, m[0], m[1], s.grid[m[0]]!.id);
    }
    tick(s);
  }
  return s.phase === 'won';
}

const winRate = (def: LevelDef, offset = 0, bot: Bot = SMART ? { kind: 'best', every: 3.5 } : FIT_SMART ? { kind: 'best', every: EVERY } : NOVICE) => {
  let w = 0;
  for (let k = 1; k <= N; k++) if (play(def, def.seed * 31 + k + offset, false, bot)) w++;
  return w / N;
};
const KS: number[] = [];
const GAPS: { best: number; r2: number; r1: number; b2: number }[] = [];

const out = JSON.parse(readFileSync('src/content/levels.json', 'utf8'));
for (const def of LEVELS) {
  if (def.level < from || def.level > to) continue;
  if (ONLY && !ONLY.has(def.level)) continue;
  if (args.includes('--bosses') && def.level % 10 !== 0) continue;
  if (args.includes('--staged') && !def.waves) continue;
  // levels 1-3 are onboarding: near-certain wins
  // r20 bosses: L10 80%, L20-60 72%
  // r23 (ChatGPT): chapter 1 near-sure, ramp after L10
  const R23: Record<number, number> = { 8: 0.95, 10: 0.95, 11: 0.95, 16: 0.95, 14: 0.9, 18: 0.92, 19: 0.8, 20: 0.85 };
  // r26 (ChatGPT): chapters 3-6 by chapter position (relief at 1 and 6, Hard at 4 and 9, teaching at 7 in ch.4/5)
  const R26 = [
    [0.95, 0.94, 0.95, 0.8, 0.9, 0.95, 0.9, 0.9, 0.78, 0.85], // position 8 = mini-boss (r27: 90/88/86/85)
    [0.94, 0.91, 0.89, 0.78, 0.89, 0.94, 0.95, 0.88, 0.76, 0.83],
    [0.93, 0.9, 0.88, 0.76, 0.88, 0.93, 0.95, 0.86, 0.74, 0.81],
    [0.92, 0.89, 0.87, 0.74, 0.87, 0.92, 0.88, 0.85, 0.72, 0.8],
    // r29 chapters 7-8 (ChatGPT table)
    [0.95, 0.92, 0.9, 0.88, 0.78, 0.95, 0.88, 0.85, 0.94, 0.75],
    [0.95, 0.92, 0.9, 0.88, 0.78, 0.95, 0.88, 0.85, 0.94, 0.75],
  ];
  const ramp = def.level <= 9 && def.level !== 8 ? 0.97 : def.level <= 9 ? 0.95 : def.level <= 20 ? R23[def.level] ?? 0.9 : R26[Math.ceil(def.level / 10) - 3][(def.level - 1) % 10];
  let target = SMART ? SMART_TARGET : FIT_SMART ? Math.min(0.97, ramp + 0.03) : ramp;
  // r33 staged goal levels fit the HP of their machines (the goal machine's n stays as authored)
  if (def.goal && !def.waves) {
    // goal levels have no HP to fit: report the goal-aware win rate (tune n / clock by hand)
    console.log(`L${String(def.level).padStart(2)} GOAL ${def.goal.kind} ${def.goal.n}  win ${(winRate(def) * 100).toFixed(0)}% / held-out ${(winRate(def, 100000) * 100).toFixed(0)}% (target ${Math.round(target * 100)}%)`);
    continue;
  }
  // r38 boss stages (ChatGPT review): the boss is BOSS_SHARE of the stage's total HP; minions + boss scale together
  // t-4cd9e27b (level report t-77594cd4): 0.35 left every boss at 0.54x its minions' HP -> 0.5
  const BOSS_SHARE = 0.5;
  const base = def.minion_hp ? { hp: (def.hp + def.minion_hp) * BOSS_SHARE, minion_hp: (def.hp + def.minion_hp) * (1 - BOSS_SHARE) } : { hp: def.hp, minion_hp: undefined };
  const scaled = (k: number) => ({ ...def, hp: Math.round(base.hp * k), ...(base.minion_hp ? { minion_hp: Math.round(base.minion_hp * k) } : {}) });
  const before = winRate(def);
  // HP scales damage-needed linearly; search a multiplier in [0.2, 32] (t-0c31a7ab: 8 clamped the 1 s fits)
  // --fit-smart only lowers HP: the thinker's damage snowballs late in a level, so its win rate barely moves with HP
  // and an upward search ran ch2 to x2-x4 (L14 x3.85), far past what a casual player clears
  // staged goal levels: the thinker's losses there are mostly the goal machine (chain n), which HP cannot fix; aim at
  // most 5 points under its win rate at the 0.2x floor instead of slashing HP to the floor (L54 went x0.20, still 70%)
  if (FIT_SMART && def.goal) target = Math.min(target, winRate(scaled(0.2)) - 0.05);
  // --trim k (level report: CALM HP x0.85 in chapters 3-8): the fit's ceiling there, so the thinker clears near 0.62T
  const top = FIT_SMART ? (def.level > 20 ? TRIM : 1) : 32;
  const keep = FIT_SMART && winRate(scaled(top)) >= target;
  let lo = 0.2, hi = top, best = top;
  for (let it = 0; it < (keep ? 0 : 13); it++) {
    const mid = (lo + hi) / 2;
    const r = winRate(scaled(mid));
    best = mid;
    if (r > target) lo = mid;
    else hi = mid;
  }
  const r50 = (x: number) => Math.max(100, Math.round(x / 50) * 50);
  const hp = r50(base.hp * best);
  const mhp = base.minion_hp ? r50(base.minion_hp * best) : undefined;
  const fitted = { ...def, hp, ...(mhp ? { minion_hp: mhp } : {}) };
  const after = winRate(fitted, 100000); // held-out bot seeds
  const idleWins = play(fitted, 1, true);
  KS.push(best);
  const gap = SMART
    ? { r2: winRate(fitted, 100000, { kind: 'random', every: 2 }), r1: winRate(fitted, 100000, { kind: 'random', every: 1 }), b2: winRate(fitted, 100000, { kind: 'best', every: 2 }) }
    : null;
  if (gap) GAPS.push({ best: after, ...gap });
  const pc = (x: number) => `${(x * 100).toFixed(0)}%`;
  console.log(`L${String(def.level).padStart(2)} ${def.difficulty.padEnd(9)} ${def.modifier.padEnd(9)} hp ${def.hp} -> ${hp}${mhp ? ` minions ${mhp}` : ''} (x${best.toFixed(2)})  ${SMART ? 'best@3.5' : FIT_SMART ? `best@${EVERY}` : 'novice'} ${pc(before)} -> held-out ${pc(after)} (target ${Math.round(target * 100)}%)${gap ? `  best@2 ${pc(gap.b2)} rand@2 ${pc(gap.r2)} rand@1 ${pc(gap.r1)} gap ${pc(after - gap.r2)}` : ''}${idleWins ? '  IDLE WINS!' : ''}`);
  out.levels[def.level - 1].hp = hp;
  if (mhp) out.levels[def.level - 1].minion_hp = mhp;
}
const geo = (a: number[]) => Math.exp(a.reduce((x, y) => x + Math.log(y), 0) / a.length);
const avg = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;
const pct = (a: number[]) => `${(avg(a) * 100).toFixed(0)}%`;
if (KS.length)
  console.log(
    `\nSUMMARY pace ${PACE} | ${SMART ? 'smart best@3.5' : FIT_SMART ? `smart fit best@${EVERY}s` : `random @${EVERY}s`} | optionA ${TUNING.optionA ? 'ON' : 'OFF'} | optionA2 ${a2Tag()} | optionA3 ${a3Tag()} | ${KS.length} levels | HP multiplier geomean x${geo(KS).toFixed(3)}` +
      (GAPS.length ? ` | best@3.5 ${pct(GAPS.map((g) => g.best))} best@2 ${pct(GAPS.map((g) => g.b2))} rand@2 ${pct(GAPS.map((g) => g.r2))} rand@1 ${pct(GAPS.map((g) => g.r1))} gap ${pct(GAPS.map((g) => g.best - g.r2))}` : ''),
  );
out.balance_status = `CALIBRATED_${FIT_SMART ? 'SMART' : 'RANDOM'}_BOT_${EVERY}S_${PACE.toUpperCase()} (tools/sim-levels.ts)`;
if (!dry) writeFileSync('src/content/levels.json', JSON.stringify(out, null, 2) + '\n');
