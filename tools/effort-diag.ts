// EFFORT DIAGNOSTIC (docs/EFFORT_MODEL.md "S1 results"): is a boss's clear time limited by the per-hit cap (0.35 of its max HP) or by board growth?
// For one level it plays the smart@3 bot against the boss stage with the boss HP multiplied by each --mults value (minions unchanged) and with each
// --caps fraction, and reports the boss stage time, the number of player hits, the share of hits the cap cut, the mean raw hit and the cap, and the
// damage per second of the boss stage against the minion stages. Deterministic (seeds as tools/effort-audit.ts).
//   npx vite-node tools/effort-diag.ts --levels 10,20 --mults 1,1.5,2,3 --caps 0.35,0.2 --n 12
import { LEVELS } from '../src/content/levels';
import { EFFORT_OVERLAY } from '../src/content/effort';
import { applyPace, DEFAULT_PACE } from '../src/content/experiments';
import { TUNING } from '../src/content/tuning';
import { choosePerk, drop, hitCap, legalPairs, newLevel, previewMerge, tick, type GameState } from '../src/core/game';
import { Rng } from '../src/core/rng';

const args = process.argv.slice(2);
const arg = (k: string, d: string) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const LV = arg('--levels', '10').split(',').map(Number);
const MULTS = arg('--mults', '1,1.5,2,3').split(',').map(Number);
const CAPS = arg('--caps', '0.35,0.2').split(',').map(Number);
const N = Number(arg('--n', '12'));
applyPace(DEFAULT_PACE);
TUNING.effortModel = true;

function pick(s: GameState): { f: number; t: number; raw: number } | undefined {
  let best: { f: number; t: number; raw: number; score: number } | undefined;
  for (const [a, b] of legalPairs(s))
    for (const [f, t] of [[a, b], [b, a]] as [number, number][]) {
      const r = previewMerge(s, f, t);
      if (!r) continue;
      const score = Math.min(r.total, hitCap(s));
      if (!best || score > best.score) best = { f, t, raw: r.total, score };
    }
  return best;
}

interface Out { tb: number; hits: number; capped: number; raw: number; cap: number; dpsBoss: number; dpsMin: number; win: boolean }
function run(level: number, seed: number): Out {
  const def = LEVELS.find((d) => d.level === level)!;
  const s = newLevel(def);
  const rng = new Rng(seed);
  let next = 3 * (0.8 + 0.4 * rng.next());
  const last = s.stage!.hps.length - 1;
  let tBoss = -1, dBoss0 = 0, hits = 0, capped = 0, raw = 0, cap = 0;
  while (s.phase === 'playing' || s.phase === 'choice') {
    if (s.phase === 'choice') { choosePerk(s, s.offer[0]); continue; }
    if (tBoss < 0 && s.stage && s.stage.i === last) { tBoss = s.elapsed; dBoss0 = s.stats.totalDamage; }
    if (s.elapsed >= next) {
      next += 3 * (0.8 + 0.4 * rng.next());
      const o = pick(s);
      if (o) {
        if (s.stage && s.stage.i === last) { hits++; raw += o.raw; cap += hitCap(s); if (o.raw > hitCap(s)) capped++; }
        drop(s, o.f, o.t, s.grid[o.f]!.id);
      }
    }
    tick(s);
  }
  const win = s.phase === 'won';
  const tb = tBoss < 0 ? NaN : s.elapsed - tBoss;
  return { tb, hits, capped, raw: hits ? raw / hits : 0, cap: hits ? cap / hits : 0, dpsBoss: (s.stats.totalDamage - dBoss0) / Math.max(1, tb), dpsMin: dBoss0 / Math.max(1, tBoss), win };
}

const mean = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : NaN);
console.log('| L | boss HP x | cap | boss time s | player hits | hits cut by cap | mean raw hit | mean cap | boss dps | minion dps | win |');
console.log('|---|---|---|---|---|---|---|---|---|---|---|');
for (const L of LV) {
  for (const cap of CAPS) {
    for (const m of MULTS) {
      EFFORT_OVERLAY[String(L)] = { bossHpMult: m, minionHpMult: 1, ...(cap !== TUNING.cascadeCap ? { bossCap: cap } : {}) };
      const rs = Array.from({ length: N }, (_, i) => run(L, L * 1009 + (i + 1) * 7919)).filter((r) => r.win && Number.isFinite(r.tb));
      const f = (x: number[], d = 1) => mean(x).toFixed(d);
      console.log(`| ${L} | ${m} | ${cap} | ${f(rs.map((r) => r.tb))} | ${f(rs.map((r) => r.hits))} | ${f(rs.map((r) => (r.hits ? r.capped / r.hits : 0) * 100), 0)}% | ${f(rs.map((r) => r.raw), 0)} | ${f(rs.map((r) => r.cap), 0)} | ${f(rs.map((r) => r.dpsBoss), 0)} | ${f(rs.map((r) => r.dpsMin), 0)} | ${rs.length}/${N} |`);
    }
  }
}
