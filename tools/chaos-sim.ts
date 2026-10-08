// Chaos / decision-quality probe: random vs best bots, board load, decision flatness over the level clock.
// Usage: npx vite-node tools/chaos-sim.ts [--levels 3,9,22] [--n 24] [--optA] [--optA2 [--a2 a|b|ab]]
// (--optA = TUNING.optionA experiment, --optA2 = TUNING.optionA2: a chain-weighted damage, b spam fatigue)
// Columns are fifths of the level clock. trivial = a random merge scores >= 85% of the best on average (or <= 1 pair);
// capReach = some option hits the 35% cascade cap; capped = the chosen merge did. Bots think every N s ±20%.
import { LEVELS } from '../src/content/levels';
import { TUNING } from '../src/content/tuning';
import { drop, legalPairs, newLevel, previewMerge, tick, type GameState } from '../src/core/game';
import { Rng } from '../src/core/rng';
import { a2Tag, applyA2 } from './a2-flags';

const args = process.argv.slice(2);
const arg = (k: string) => (args.includes(k) ? args[args.indexOf(k) + 1] : undefined);
const LV = (arg('--levels') ?? '3,5,9,13,17,22,25,31,45,55,61,66,71,76,30,40,50,60,70,80').split(',').map(Number);
const N = Number(arg('--n')) || 24;
if (args.includes('--optA')) TUNING.optionA = true;
applyA2(args); // --optA2 [--a2 a|b|ab] [--a2beat S]
console.log(`chaos-sim | optionA ${TUNING.optionA ? 'ON' : 'OFF'} | optionA2 ${a2Tag()} | n ${N}`);
const SUM: { gap: number; arr1: number; triv: number; trivR: number; noPair2: number }[] = [];

type Opt = { f: number; t: number; raw: number; eff: number; count: number; rank: number };
const capOf = (s: GameState) => (s.goal ? Infinity : Math.ceil(s.maxHp * TUNING.cascadeCap));
function options(s: GameState): Opt[] {
  const out: Opt[] = [];
  const cap = capOf(s);
  for (const [a, b] of legalPairs(s))
    for (const [f, t] of [[a, b], [b, a]] as [number, number][]) {
      const r = previewMerge(s, f, t);
      if (r) out.push({ f, t, raw: r.total, eff: Math.min(r.total, cap), count: r.count, rank: s.grid[f]!.rank + 1 });
    }
  return out;
}
const score = (s: GameState, o: Opt) => (s.goal?.kind === 'rank' ? o.rank * 1000 + o.eff / 1e6 : s.goal?.kind === 'chain' ? o.count * 1000 + o.eff / 1e6 : o.eff);

type Bot = { name: string; every: number; kind: 'random' | 'best' };
const BOTS: Bot[] = [
  { name: 'rand 1.0s', every: 1, kind: 'random' },
  { name: 'rand 2.0s', every: 2, kind: 'random' },
  { name: 'rand 3.5s', every: 3.5, kind: 'random' },
  { name: 'best 2.0s', every: 2, kind: 'best' },
  { name: 'best 3.5s', every: 3.5, kind: 'best' },
];
const B = 5; // fifths of the level clock
const bk = () => Array.from({ length: B }, () => [] as number[]);
const mk = () => ({ wins: 0, times: [] as number[], dmg: {} as Record<string, number>, merges: 0, occ: bk(), pairs: bk(), arrivals: bk(), od: bk(), noPair: bk(), trivial: bk(), ratio: bk(), capReach: bk(), capped: bk(), hpLeft: bk(), mach: new Map<number, { triv: number; n: number; ratio: number }>() });
type Agg = ReturnType<typeof mk>;
const mean = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : NaN);
const median = (a: number[]) => (a.length ? [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)] : NaN);

function run(L: number, bot: Bot, seed: number, agg: Agg) {
  const def = LEVELS[L - 1];
  const s = newLevel(def);
  const T = s.levelTime ?? def.time_seconds;
  const rng = new Rng(seed);
  let next = bot.every, nextSample = 1;
  const arr = new Array(B).fill(0), secs = new Array(B).fill(0);
  const bOf = () => Math.min(B - 1, Math.floor((s.elapsed / T) * B));
  while (s.phase === 'playing') {
    const b = bOf();
    if (s.elapsed >= nextSample) {
      nextSample += 1;
      secs[b]++;
      agg.occ[b].push(s.grid.filter(Boolean).length);
      agg.od[b].push(s.odLeft > 0 ? 1 : 0);
      const st = s.stage;
      if (!s.goal) agg.hpLeft[b].push(st ? (st.total - st.done - (s.maxHp - Math.max(0, s.hp))) / st.total : Math.max(0, s.hp) / s.maxHp);
    }
    if (s.elapsed >= next) {
      // levels use a fixed seed, so jitter think time ±20% (same mean) or the best bot replays one game N times
      next += bot.every * (0.8 + 0.4 * rng.next());
      const ops = options(s);
      agg.pairs[b].push(ops.length / 2);
      agg.noPair[b].push(ops.length ? 0 : 1);
      if (ops.length) {
        const sc = ops.map((o) => score(s, o));
        const best = Math.max(...sc);
        const ratio = best > 0 ? mean(sc) / best : 1;
        const triv = ops.length <= 2 || ratio >= 0.85 ? 1 : 0;
        if (!s.goal) {
          agg.trivial[b].push(triv);
          agg.ratio[b].push(ratio);
          agg.capReach[b].push(ops.some((o) => o.raw >= capOf(s)) ? 1 : 0);
          const mi = s.stage ? s.stage.i : 0;
          const m = agg.mach.get(mi) ?? { triv: 0, n: 0, ratio: 0 };
          m.triv += triv; m.n++; m.ratio += ratio;
          agg.mach.set(mi, m);
        }
        const pick = bot.kind === 'random' ? ops[rng.int(ops.length)] : ops[sc.indexOf(best)];
        if (!s.goal) agg.capped[b].push(pick.raw >= capOf(s) ? 1 : 0);
        const r = drop(s, pick.f, pick.t, s.grid[pick.f]!.id);
        for (const e of r.events) if (e.type === 'delivery' || e.type === 'kickback') arr[b]++;
      }
    }
    for (const e of tick(s)) if (e.type === 'delivery' || e.type === 'kickback') arr[bOf()]++;
  }
  for (let i = 0; i < B; i++) if (secs[i] >= 3) agg.arrivals[i].push((arr[i] / secs[i]) * 60);
  if (s.phase === 'won') { agg.wins++; agg.times.push(s.elapsed); }
  for (const [k, v] of Object.entries(s.stats.dmgBy)) agg.dmg[k] = (agg.dmg[k] ?? 0) + v / Math.max(1, s.elapsed);
  agg.merges += s.stats.merges / Math.max(1, s.elapsed);
}

const f = (x: number, d = 0) => (Number.isNaN(x) ? '   -' : x.toFixed(d).padStart(5));
const pct = (x: number) => (Number.isNaN(x) ? '   -' : `${Math.round(x * 100)}%`.padStart(5));
const row = (a: number[][], fn: (x: number) => string) => a.map((x) => fn(mean(x))).join('');
for (const L of LV) {
  const def = LEVELS[L - 1];
  const tag = `${def.waves ?? 1} machines${def.minion_hp ? ' (boss stage)' : ''}${def.goal ? ` goal ${def.goal.kind} ${def.goal.n}` : ''}${def.behaviour ? ' ' + def.behaviour : ''}${def.mini_boss ? ' mini-boss' : ''}`;
  console.log(`\n=== L${L} ${tag} | clock ${def.time_seconds}s | stars ${def.star_times} | columns = fifths of the clock`);
  const res: Record<string, Agg> = {};
  for (const bot of BOTS) {
    const agg = mk();
    for (let k = 1; k <= N; k++) run(L, bot, L * 1009 + k * 7919, agg);
    res[bot.name] = agg;
    const dps = Object.entries(agg.dmg).map(([k, v]) => `${k} ${f(v / N)}`).join(' ');
    console.log(`${bot.name.padEnd(10)} win ${pct(agg.wins / N)} clear ${f(median(agg.times))}s | merges/min ${f((agg.merges / N) * 60)} | dmg/s ${dps} |`);
    console.log(`${''.padEnd(10)} parts ${row(agg.occ, (x) => f(x))} | pairs ${row(agg.pairs, (x) => f(x, 1))} | arrive/min ${row(agg.arrivals, (x) => f(x))} | OD ${row(agg.od, pct)} | noPair ${row(agg.noPair, pct)}`);
  }
  for (const name of ['best 2.0s', 'rand 1.0s']) {
    const a = res[name];
    console.log(`  [${name}] trivial ${row(a.trivial, pct)} | E[rand]/best ${row(a.ratio, pct)} | capReach ${row(a.capReach, pct)} | capped ${row(a.capped, pct)} | stageHPleft ${row(a.hpLeft, pct)}`);
    if (a.mach.size > 1) console.log(`    by machine: ${[...a.mach.entries()].sort((x, y) => x[0] - y[0]).map(([i, m]) => `m${i + 1} trivial ${pct(m.triv / m.n)} ratio ${pct(m.ratio / m.n)} n${m.n}`).join(' | ')}`);
  }
  // mid-level = fifths 2-4 of the clock
  const mid = (a: number[][]) => mean(a.slice(1, 4).flat());
  SUM.push({
    gap: (res['best 3.5s'].wins - res['rand 2.0s'].wins) / N,
    arr1: mean(res['rand 1.0s'].arrivals.flat()),
    triv: mid(res['best 2.0s'].trivial),
    trivR: mid(res['rand 1.0s'].trivial),
    noPair2: mean(res['best 2.0s'].noPair.flat()),
  });
}
const avg = (k: keyof (typeof SUM)[number]) => mean(SUM.map((x) => x[k]).filter((x) => !Number.isNaN(x)));
console.log(`\nSUMMARY (${SUM.length} levels, optionA ${TUNING.optionA ? 'ON' : 'OFF'}, optionA2 ${a2Tag()}): win gap best3.5-rand2 ${pct(avg('gap'))} | arrive/min @rand1.0s ${f(avg('arr1'), 1)} | mid-level trivial [best 2.0s] ${pct(avg('triv'))} [rand 1.0s] ${pct(avg('trivR'))} | noPair [best 2.0s] ${pct(avg('noPair2'))}`);
