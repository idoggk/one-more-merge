// THINK BANK probe (t-4208f149): why does random tapping beat thinking, and does TUNING.thinkBank fix it?
// Bots act on REAL time (ticks x 50 ms), so a frozen level clock doesn't stall them; think time ±20% as in level-report.
//   rand1 / rand25 / rand3 = any legal merge every 1 / 2.5 / 3 s; smart3 = the best previewed merge (goal-aware, cascade
//   cap counted) every 3 s. Stars = the level's star_times against the win's s.elapsed (as the game scores them).
// Per bot: win, 3★ and 2★+ share, median clear (level s), merges per run, damage split (player merges / auto-shots /
// kickback fuses / carry-over), Overdrive share of level time, damage per merge, player chain avg.
// Usage: npx vite-node tools/think-bank.ts [--from 1] [--to 80] [--n 12] [--pace calm] [--bots rand25,smart3,...]
//          [--think on] [--variant off|a2|a3|a3f] [--hp 1.5] [--set tb.grace=1,tb.bank=60,passiveMult=0,...] [--levels]  (--levels prints every level)
import { applyPace, applySpamVariant, DEFAULT_PACE, type SpamVariant } from '../src/content/experiments';
import { LEVELS, starGoals, type LevelDef } from '../src/content/levels';
import { TICK, TUNING, type Pace } from '../src/content/tuning';
import { choosePerk, drop, legalPairs, newLevel, previewMerge, tick, type GameEvent, type GameState } from '../src/core/game';
import { Rng } from '../src/core/rng';

const args = process.argv.slice(2);
const arg = (k: string) => (args.includes(k) ? args[args.indexOf(k) + 1] : undefined);
const FROM = Number(arg('--from')) || 1;
const TO = Number(arg('--to')) || LEVELS.length;
const N = Number(arg('--n')) || 12;
applySpamVariant((arg('--variant') ?? 'off') as SpamVariant);
applyPace((arg('--pace') ?? DEFAULT_PACE) as Pace);
// --hp k: sim-only HP scale (levels.json untouched) to compare bots at a matched thinker win rate
const HP = Number(arg('--hp')) || 1;
TUNING.thinkBank = arg('--think') === 'on';
const SET = arg('--set');
for (const kv of SET ? SET.split(',') : []) {
  const [k, v] = kv.split('=');
  const path = k.split('.');
  const obj = path.slice(0, -1).reduce<Record<string, unknown>>((o, p) => o[p] as Record<string, unknown>, TUNING as unknown as Record<string, unknown>);
  obj[path[path.length - 1]] = v === 'true' ? true : v === 'false' ? false : Number(v);
}

type Opt = { f: number; t: number; score: number };
const capOf = (s: GameState) => (s.goal ? Infinity : Math.ceil(s.maxHp * TUNING.cascadeCap));
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
type Bot = { every: number; smart: boolean };
const ALL_BOTS: Record<string, Bot> = { rand1: { every: 1, smart: false }, rand25: { every: 2.5, smart: false }, rand3: { every: 3, smart: false }, smart1: { every: 1, smart: true }, smart25: { every: 2.5, smart: true }, smart3: { every: 3, smart: true } };
const BOTS = (arg('--bots') ?? 'rand25,smart3').split(',');

interface Run { capped: number; won: boolean; t: number; stars: number; merges: number; dmg: Record<string, number>; od: number; chains: number[]; banked: number }
function play(def: LevelDef, bot: Bot, seed: number): Run {
  const s = newLevel(HP === 1 ? def : { ...def, hp: Math.round(def.hp * HP), ...(def.minion_hp ? { minion_hp: Math.round(def.minion_hp * HP) } : {}) });
  const rng = new Rng(seed);
  const chains: number[] = [];
  let real = 0, odT = 0, capped = 0;
  let next = bot.every * (0.8 + 0.4 * rng.next());
  const see = (ev: GameEvent[]) => {
    for (const e of ev) if (e.type === 'cascade' && !e.kickback) {
      chains.push(e.result.count);
      if (!s.goal && e.result.total >= capOf(s)) capped++;
    }
  };
  // real-time guard: a frozen clock can't run a level forever (bank caps it; this only stops a broken setting)
  while ((s.phase === 'playing' || s.phase === 'choice') && real < 1200) {
    if (s.phase === 'choice') {
      choosePerk(s, s.offer[0]);
      continue;
    }
    if (real >= next) {
      next += bot.every * (0.8 + 0.4 * rng.next());
      const ops = options(s);
      const o = !ops.length ? undefined : bot.smart ? ops.reduce((m, x) => (x.score > m.score ? x : m)) : ops[rng.int(ops.length)];
      if (o) see(drop(s, o.f, o.t, s.grid[o.f]!.id).events);
    }
    const e0 = s.elapsed, od = s.odLeft > 0;
    tick(s);
    if (od) odT += s.elapsed - e0;
    real += TICK;
  }
  const [two, three] = starGoals(def);
  const won = s.phase === 'won';
  return { capped: capped / Math.max(1, s.stats.merges), won, t: won ? s.elapsed : NaN, stars: !won ? 0 : s.elapsed <= three ? 3 : s.elapsed <= two ? 2 : 1, merges: s.stats.merges, dmg: { ...s.stats.dmgBy } as Record<string, number>, od: odT / Math.max(1, s.elapsed), chains, banked: s.banked ?? 0 };
}

const mean = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : NaN);
const med = (a: number[]) => (a.length ? [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)] : NaN);
const pc = (x: number) => (Number.isFinite(x) ? `${Math.round(x * 100)}%` : '-').padStart(4);
const f0 = (x: number) => (Number.isFinite(x) ? x.toFixed(0) : '-').padStart(4);

interface Agg { win: number; p3: number; p2: number; clearFrac: number; merges: number; player: number; passive: number; kick: number; carry: number; od: number; perMerge: number; capped: number; chain: number; banked: number }
function stat(def: LevelDef, runs: Run[]): Agg {
  const won = runs.filter((r) => r.won);
  const tot = (k: string) => mean(runs.map((r) => r.dmg[k] ?? 0));
  const all = tot('player') + tot('passive') + tot('kick') + tot('carry');
  const clock = newLevel(def).levelTime ?? def.time_seconds;
  return {
    win: won.length / runs.length,
    p3: runs.filter((r) => r.stars === 3).length / runs.length,
    p2: runs.filter((r) => r.stars >= 2).length / runs.length,
    clearFrac: med(won.map((r) => r.t)) / clock,
    merges: mean(runs.map((r) => r.merges)),
    player: tot('player') / all,
    passive: tot('passive') / all,
    kick: tot('kick') / all,
    carry: tot('carry') / all,
    od: mean(runs.map((r) => r.od)),
    perMerge: mean(runs.map((r) => (r.dmg.player ?? 0) / Math.max(1, r.merges))),
    capped: mean(runs.map((r) => r.capped)),
    chain: mean(runs.flatMap((r) => r.chains)),
    banked: mean(runs.map((r) => r.banked)),
  };
}

const rows: { level: number; goal: boolean; by: Record<string, Agg> }[] = [];
console.log(`think-bank | pace ${TUNING.pace} | thinkBank ${TUNING.thinkBank ? `ON ${JSON.stringify(TUNING.tb)}` : 'OFF'}${SET ? ` | set ${SET}` : ''}${HP !== 1 ? ` | HP x${HP}` : ''}${TUNING.optionA2 || TUNING.optionA3 ? ` | ${TUNING.optionA3 ? 'A3' : 'A2'}${TUNING.optA3.fatigue ? '+TIRE' : ''}` : ''} | L${FROM}-${TO} | n ${N}`);
for (const def of LEVELS) {
  if (def.level < FROM || def.level > TO) continue;
  const by: Record<string, Agg> = {};
  for (const b of BOTS) by[b] = stat(def, Array.from({ length: N }, (_, i) => play(def, ALL_BOTS[b], def.level * 1009 + i * 7919)));
  rows.push({ level: def.level, goal: !!def.goal, by });
  if (args.includes('--levels')) console.log(`L${String(def.level).padStart(2)} ${BOTS.map((b) => `${b} ${pc(by[b].win)} 3★${pc(by[b].p3)} clr${pc(by[b].clearFrac)}`).join(' | ')}`);
}

const line = (label: string, rs: typeof rows) => {
  const m = (b: string, k: keyof Agg) => mean(rs.map((r) => r.by[b][k]).filter(Number.isFinite));
  const cols = BOTS.map((b) => `${b.padEnd(6)} win${pc(m(b, 'win'))} 3★${pc(m(b, 'p3'))} 2★${pc(m(b, 'p2'))} clr${pc(m(b, 'clearFrac'))}`).join(' | ');
  const gap = BOTS.includes('smart3') && BOTS.includes('rand25') ? `  GAP s3-r2.5 win ${pc(m('smart3', 'win') - m('rand25', 'win'))} 3★ ${pc(m('smart3', 'p3') - m('rand25', 'p3'))}` : '';
  console.log(`${label.padEnd(6)} ${cols}${gap}`);
};
console.log('\nper chapter (mean of levels)');
for (let ch = Math.ceil(FROM / 10); ch <= Math.ceil(TO / 10); ch++) line(`ch${ch}`, rows.filter((r) => Math.ceil(r.level / 10) === ch));
line('ALL', rows);
// smart beaten: levels where random 2.5 s clears faster (median) than smart 3 s
if (BOTS.includes('smart3') && BOTS.includes('rand25')) {
  const faster = rows.filter((r) => r.by.rand25.clearFrac < r.by.smart3.clearFrac);
  const moreStars = rows.filter((r) => r.by.rand25.p3 > r.by.smart3.p3);
  console.log(`rand2.5 clears faster than smart3 on ${faster.length}/${rows.length} levels; gets more 3★ on ${moreStars.length}`);
}
console.log('\nwhere the damage comes from (mean of levels, HP levels only)');
const hp = rows.filter((r) => !r.goal);
for (const b of BOTS) {
  const m = (k: keyof Agg) => mean(hp.map((r) => r.by[b][k]).filter(Number.isFinite));
  console.log(`  ${b.padEnd(6)} merges ${f0(m('merges'))} | dmg/merge ${f0(m('perMerge'))} | player ${pc(m('player'))} auto-shots ${pc(m('passive'))} kickback ${pc(m('kick'))} carry ${pc(m('carry'))} | Overdrive ${pc(m('od'))} of level time | hits at cap ${pc(m('capped'))} | chain avg ${m('chain').toFixed(2)}${TUNING.thinkBank ? ` | banked ${m('banked').toFixed(1)} s` : ''}`);
}
