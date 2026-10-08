// PACE probe (t-1bef1042): can a player think between merges? Measures the TODAY / CALM / MANIA pace blocks.
// Usage: npx vite-node tools/pace-probe.ts [--pace today|calm|mania] [--variant off|a2|a3|a3f] [--levels 3,9,13] [--n 12]
//        [--set reactTwo=9,odChain=32] (try values on top of the pace block)
// Bots think every N s ±20% (random = any legal merge, best = the best previewed merge, as in chaos-sim.ts).
//   QUIET2      share of the level clock inside stretches of 2 s+ with no salient event. Salient = anything the player
//               did not just do: deliveries, falling / landing / auto-fusing kickback parts, boss and remix warnings and
//               hits, phase changes, panel breaks, Overdrive ending, item grants, the next machine walking in, and passive
//               shots unless TUNING.quietPassive (CALM: small dot, no number). The player's own merge is not salient.
//   interrupted share of decisions with a foreign board change (delivery, kickback, boss / remix hit) in the 2 s before it
//   foreign/dec foreign board changes between two decisions
//   arr/min     parts arriving per minute (deliveries + kickback), board = parts on the board (sampled every second;
//               '10s+' and the target checks skip the opening fill: fast bots clear many levels before it settles)
//   OD          share of seconds in Overdrive; noPair = decisions with no legal merge; trivial = decisions where a random
//               merge scores >= 85% of the best on average (or <= 1 pair)
import { applyPace, applySpamVariant, type SpamVariant } from '../src/content/experiments';
import { LEVELS } from '../src/content/levels';
import { TUNING, type Pace } from '../src/content/tuning';
import { drop, legalPairs, newLevel, previewMerge, tick, type GameEvent, type GameState } from '../src/core/game';
import { Rng } from '../src/core/rng';

const args = process.argv.slice(2);
const arg = (k: string) => (args.includes(k) ? args[args.indexOf(k) + 1] : undefined);
const PACE = (arg('--pace') ?? 'today') as Pace;
const VARIANT = (arg('--variant') ?? 'off') as SpamVariant;
const LV = (arg('--levels') ?? '3,9,13,22,55,71,10,30').split(',').map(Number);
const N = Number(arg('--n')) || 12;
applySpamVariant(VARIANT);
applyPace(PACE);
// --set reactTwo=9,odChain=32: try pace values on top of the block (numbers / true / false)
const SET = arg('--set');
for (const kv of SET ? SET.split(',') : []) {
  const [k, v] = kv.split('=');
  (TUNING as Record<string, unknown>)[k] = v === 'true' ? true : v === 'false' ? false : Number(v);
}
const BOSS = (L: number) => L % 10 === 0;

const SALIENT = new Set(['delivery', 'kickbackIncoming', 'kickback', 'remixWarn', 'remixHit', 'remixUnlock', 'bossWarn', 'bossHit', 'bossEnd', 'bossPhase', 'bossFinal', 'bossRansom', 'newTarget', 'itemGrant', 'threshold', 'overdriveEnd']);
// passive shots with a damage number are salient; CALM's quiet auto-fire (small dot, no number) is background
const salient = (e: GameEvent) => SALIENT.has(e.type) || (e.type === 'cascade' && e.kickback) || (e.type === 'shot' && !TUNING.quietPassive);
const foreign = (e: GameEvent) =>
  e.type === 'delivery' || e.type === 'kickback' || (e.type === 'bossHit' && e.outcome === 'hit') || (e.type === 'remixHit' && e.outcome !== 'whiff');
const arrival = (e: GameEvent) => e.type === 'delivery' || e.type === 'kickback';

type Bot = { name: string; every: number; kind: 'random' | 'best' };
const BOTS: Bot[] = [
  { name: 'rand 1.0s', every: 1, kind: 'random' },
  { name: 'rand 2.0s', every: 2, kind: 'random' },
  { name: 'best 2.0s', every: 2, kind: 'best' },
  { name: 'best 3.5s', every: 3.5, kind: 'best' },
];
const capOf = (s: GameState) => (s.goal ? Infinity : Math.ceil(s.maxHp * TUNING.cascadeCap));
type Opt = { f: number; t: number; score: number };
function options(s: GameState): Opt[] {
  const out: Opt[] = [];
  for (const [a, b] of legalPairs(s))
    for (const [f, t] of [[a, b], [b, a]] as [number, number][]) {
      const r = previewMerge(s, f, t);
      if (!r) continue;
      const eff = Math.min(r.total, capOf(s));
      out.push({ f, t, score: s.goal?.kind === 'rank' ? (s.grid[f]!.rank + 1) * 1000 + eff / 1e6 : s.goal?.kind === 'chain' ? r.count * 1000 + eff / 1e6 : eff });
    }
  return out;
}

const mk = () => ({ why: {} as Record<string, number>, wins: 0, quiet: [] as number[], dec: 0, inter: 0, foreign: 0, arr: [] as number[], occ: [] as number[], occ10: [] as number[], od: [] as number[], noPair: 0, triv: 0, opts: 0 });
type Agg = ReturnType<typeof mk>;
const mean = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : NaN);

function run(L: number, bot: Bot, seed: number, a: Agg) {
  const s = newLevel(LEVELS[L - 1]);
  const rng = new Rng(seed);
  let next = bot.every * (0.8 + 0.4 * rng.next()), nextSample = 1, arrivals = 0;
  const marks: number[] = [0]; // salient event times
  const changes: { t: number; why: string }[] = []; // foreign board changes
  let lastDec = 0;
  const seen = (ev: GameEvent[], own: boolean) => {
    for (const e of ev) {
      if (arrival(e)) arrivals++;
      if (own ? e.type === 'newTarget' : salient(e)) marks.push(s.elapsed);
      if (!own && foreign(e)) changes.push({ t: s.elapsed, why: e.type === 'delivery' ? (s.breatherUntil !== undefined && s.elapsed - s.breatherUntil < 0.6 ? 'after breather' : (s.stuckN ?? 0) > 0 ? 'rescue' : 'delivery') : e.type === 'kickback' ? (e.into >= 0 ? 'kickback fuse' : 'kickback drop') : e.type });
    }
  };
  while (s.phase === 'playing') {
    if (s.elapsed >= nextSample) {
      nextSample += 1;
      a.occ.push(s.grid.filter(Boolean).length);
      if (s.elapsed >= 10) a.occ10.push(s.grid.filter(Boolean).length);
      a.od.push(s.odLeft > 0 ? 1 : 0);
    }
    if (s.elapsed >= next) {
      next += bot.every * (0.8 + 0.4 * rng.next());
      a.dec++;
      const hit = changes.filter((c) => c.t > s.elapsed - 2 && c.t <= s.elapsed);
      if (hit.length) {
        a.inter++;
        const w = hit[hit.length - 1].why;
        a.why[w] = (a.why[w] ?? 0) + 1;
      }
      a.foreign += changes.filter((c) => c.t > lastDec && c.t <= s.elapsed).length;
      lastDec = s.elapsed;
      const ops = options(s);
      if (!ops.length) a.noPair++;
      else {
        a.opts++;
        const sc = ops.map((o) => o.score);
        const best = Math.max(...sc);
        if (!s.goal && (ops.length <= 2 || (best > 0 ? mean(sc) / best : 1) >= 0.85)) a.triv++;
        const pick = bot.kind === 'random' ? ops[rng.int(ops.length)] : ops[sc.indexOf(best)];
        seen(drop(s, pick.f, pick.t, s.grid[pick.f]!.id).events, true);
      }
    }
    seen(tick(s), false);
  }
  marks.push(s.elapsed);
  let quiet = 0;
  for (let i = 1; i < marks.length; i++) if (marks[i] - marks[i - 1] >= 2) quiet += marks[i] - marks[i - 1];
  a.quiet.push(quiet / Math.max(1, s.elapsed));
  a.arr.push((arrivals / Math.max(1, s.elapsed)) * 60);
  if (s.phase === 'won') a.wins++;
}

const pct = (x: number) => (Number.isNaN(x) ? '    -' : `${Math.round(x * 100)}%`.padStart(5));
const num = (x: number, d = 0) => (Number.isNaN(x) ? '    -' : x.toFixed(d).padStart(5));
const tag = `pace ${PACE.toUpperCase()}${SET ? ` (${SET})` : ''} | variant ${VARIANT} | A2 ${TUNING.optionA2 ? 'ON' : 'OFF'} A3 ${TUNING.optionA3 ? 'ON' : 'OFF'} | n ${N}`;
console.log(`pace-probe | ${tag}`);
console.log(`${'level'.padEnd(6)}${'bot'.padEnd(11)}  win QUIET2 inter  frgn arr/m board    OD noPair triv`);
const ALL: Record<string, { boss: boolean; a: Agg }[]> = {};
for (const L of LV) {
  for (const bot of BOTS) {
    const a = mk();
    for (let k = 1; k <= N; k++) run(L, bot, L * 1009 + k * 7919, a);
    (ALL[bot.name] ??= []).push({ boss: BOSS(L), a });
    console.log(`${`L${L}${BOSS(L) ? 'B' : ''}`.padEnd(6)}${bot.name.padEnd(11)}${pct(a.wins / N)}${pct(mean(a.quiet))} ${pct(a.inter / a.dec)}${num(a.foreign / a.dec, 2)}${num(mean(a.arr))}${num(mean(a.occ), 1)}${pct(mean(a.od))} ${pct(a.noPair / a.dec)}${pct(a.opts ? a.triv / a.opts : NaN)}`);
  }
}

// summary over the levels (bosses = L10 / L20 / ... reported separately for QUIET2)
const S = (bot: string, f: (a: Agg) => number, which: 'all' | 'boss' | 'normal' = 'normal') =>
  mean((ALL[bot] ?? []).filter((x) => which === 'all' || (which === 'boss') === x.boss).map((x) => f(x.a)));
const q = (a: Agg) => mean(a.quiet);
const check = (label: string, v: number, ok: boolean, fmt: (x: number) => string) => console.log(`  ${ok ? 'PASS' : 'MISS'}  ${label.padEnd(32)} ${fmt(v).trim()}`);
console.log(`\nSUMMARY ${tag} (normal levels unless noted)`);
for (const bot of BOTS.map((b) => b.name))
  console.log(`  ${bot.padEnd(10)} QUIET2 ${pct(S(bot, q))} (bosses ${pct(S(bot, q, 'boss')).trim()}) | inter ${pct(S(bot, (a) => a.inter / a.dec))} | frgn/dec ${num(S(bot, (a) => a.foreign / a.dec), 2)} | arr/min ${num(S(bot, (a) => mean(a.arr)))} | board ${num(S(bot, (a) => mean(a.occ)), 1)} (10s+ ${num(S(bot, (a) => mean(a.occ10)), 1).trim()}) | OD ${pct(S(bot, (a) => mean(a.od)))} | noPair ${pct(S(bot, (a) => a.noPair / a.dec))} | trivial ${pct(S(bot, (a) => (a.opts ? a.triv / a.opts : NaN)))} | win ${pct(S(bot, (a) => a.wins / N, 'all'))}`);
const whyOf = (bot: string) => {
  const w: Record<string, number> = {};
  for (const x of ALL[bot] ?? []) for (const [k, v] of Object.entries(x.a.why)) w[k] = (w[k] ?? 0) + v;
  const dec = (ALL[bot] ?? []).reduce((n, x) => n + x.a.dec, 0);
  return Object.entries(w).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${pct(v / dec).trim()}`).join(', ');
};
console.log(`  interrupted by (best 3.5s, all levels, last change in the window): ${whyOf('best 3.5s') || 'nothing'}`);
if (PACE === 'calm') {
  const b35 = 'best 3.5s';
  check('QUIET2 @best3.5 >= 75%', S(b35, q), S(b35, q) >= 0.75, pct);
  check('QUIET2 @rand2 >= 40%', S('rand 2.0s', q), S('rand 2.0s', q) >= 0.4, pct);
  check('interrupted @3.5 <= 5%', S(b35, (a) => a.inter / a.dec), S(b35, (a) => a.inter / a.dec) <= 0.05, pct);
  const arr = S(b35, (a) => mean(a.arr));
  check('arrivals @3.5 15-22/min', arr, arr >= 15 && arr <= 22, (x) => num(x, 1));
  const occ = S(b35, (a) => mean(a.occ10));
  check('board @3.5 11-14 (after 10 s)', occ, occ >= 11 && occ <= 14, (x) => num(x, 1));
  const np = Math.max(...BOTS.map((b) => S(b.name, (a) => a.noPair / a.dec)));
  check('noPair <= 2% (worst bot)', np, np <= 0.02, pct);
  check('Overdrive @3.5 <= 25%', S(b35, (a) => mean(a.od)), S(b35, (a) => mean(a.od)) <= 0.25, pct);
  check('bosses QUIET2 @best3.5 >= 60%', S(b35, q, 'boss'), S(b35, q, 'boss') >= 0.6, pct);
}
if (PACE === 'mania') {
  const arr = S('rand 1.0s', (a) => mean(a.arr), 'all');
  check('arrivals @rand1 >= 90/min', arr, arr >= 90, (x) => num(x, 1));
  const occ = S('rand 1.0s', (a) => mean(a.occ10), 'all');
  check('board @rand1 18-22 (after 10 s)', occ, occ >= 18 && occ <= 22, (x) => num(x, 1));
  const od = S('best 2.0s', (a) => mean(a.od), 'all');
  check('Overdrive @best2 >= 60%', od, od >= 0.6, pct);
}
