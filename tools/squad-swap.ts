// SQUAD SWAP probe (read-only): plays the same saga levels with different squads (shooter / relay pair / helper) and
// three bots (random / greedy smart / 2-ply planner), then prints per-squad win %, clear time, chain length, damage share by family and helper usage.
// Usage: npx vite-node tools/squad-swap.ts [--roster1] [--from 21] [--to 80] [--step 3] [--n 20] [--lvl 1|9] [--every 3.5] [--only KEY[,KEY]] [--bots random,smart,planner] [--b0|--b1|--rb] [--set b1.toyBag=2,b1.amp=1.6] [--nobase]
//        [--rule today|sandwich2|sandwichBonus]   (t-1effe0bf merge rule prototype; also prints board-full time, sandwiches/run, mean chain)
import { LEVELS, type LevelDef } from '../src/content/levels';
import { TUNING } from '../src/content/tuning';
import { applyRoster1, levelMult, unitDef } from '../src/content/units';
import { choosePerk, drop, legalPairs, locked, newLevel, previewMerge, sandwichFor, tick, type GameEvent, type GameState } from '../src/core/game';
import { Rng } from '../src/core/rng';
import { autoSupport, useSupport } from '../src/core/support';
import { applyMergeRule, storedMergeRule } from '../src/core/sandwich';
import { FAMILIES, isRelay, type CascadeResult, type Family } from '../src/core/types';

const args = process.argv.slice(2);
const opt = (k: string, d: number) => (args.includes(k) ? Number(args[args.indexOf(k) + 1]) : d);
const FROM = opt('--from', 21);
const TO = opt('--to', 80);
const STEP = opt('--step', 3);
const N = opt('--n', 20);
const EVERY = opt('--every', 3.5);
const LVL = args.includes('--lvl') ? opt('--lvl', 1) : 0;
const ONLY = args.includes('--only') ? args[args.indexOf('--only') + 1] : '';
// --b0: units option B stage B0 (TUNING.unitsB0) for every squad, BASE included
TUNING.unitsB0 = args.includes('--b0');
// --b1: units option B stage B1 (TUNING.unitsB1, builds on B0); --set k.sub=v,...: numeric/boolean TUNING overrides for tuning runs
TUNING.unitsB1 = args.includes('--b1');
// --rb: roster B (TUNING.rosterB, t-e91097cd): B jobs + the helper as a Support card (bots tap it via core/support autoSupport)
TUNING.rosterB = args.includes('--rb');
if (args.includes('--set'))
  for (const kv of args[args.indexOf('--set') + 1].split(',')) {
    const [path, v] = kv.split('=');
    const keys = path.split('.');
    const obj = keys.slice(0, -1).reduce((o: any, k) => o[k], TUNING as any);
    obj[keys[keys.length - 1]] = v === 'true' ? true : v === 'false' ? false : Number(v);
  }
applyMergeRule(storedMergeRule(() => (args.includes('--rule') ? args[args.indexOf('--rule') + 1] : null)));
// --roster1: roster B batch 1 on (TUNING.roster1) and its squads added (Nail Gun / Drill / Saw Blade shooters, Gear relays)
const ROSTER = args.includes('--roster1');
applyRoster1(ROSTER);

type Squad = { key: string; shooter: Family; relays: [Family, Family]; helper?: Family };
const SQUADS: Squad[] = [
  { key: 'BASE', shooter: 'cannon', relays: ['coil', 'bell'] },
  ...(['rocket', 'mortar', 'arc_welder'] as Family[]).map((f) => ({ key: f.toUpperCase(), shooter: f, relays: ['coil', 'bell'] as [Family, Family] })),
  // BELL+COIL / BELL+HORN put Coil (or Horn) in relay B: separates the unit from relay A's extra bag tokens and layout
  ...([['coil', 'horn'], ['coil', 'fuse_box'], ['horn', 'bell'], ['fuse_box', 'bell'], ['horn', 'fuse_box'], ['bell', 'coil'], ['bell', 'horn']] as [Family, Family][]).map((r) => ({ key: `${r[0]}+${r[1]}`.toUpperCase(), shooter: 'cannon' as Family, relays: r })),
  ...(['magnet', 'battery', 'fan', 'amplifier', 'signal_beacon'] as Family[]).map((h) => ({ key: `+${h.toUpperCase()}`, shooter: 'cannon' as Family, relays: ['coil', 'bell'] as [Family, Family], helper: h })),
  // --roster1 (t-9b28a794): roster B batch 1 squads (Gear in either relay slot, the three shooters with the base relays)
  ...(ROSTER
    ? [
        ...(['nail_gun', 'jackhammer', 'saw_blade'] as Family[]).map((f) => ({ key: f.toUpperCase(), shooter: f, relays: ['coil', 'bell'] as [Family, Family] })),
        ...([['coil', 'gear'], ['gear', 'bell']] as [Family, Family][]).map((r) => ({ key: `${r[0]}+${r[1]}`.toUpperCase(), shooter: 'cannon' as Family, relays: r })),
      ]
    : []),
];

type Bot = { name: string; pick: (s: GameState, rng: Rng) => [number, number] | null };
const bothWays = (s: GameState) => legalPairs(s).flatMap(([a, b]) => [[a, b], [b, a]] as [number, number][]);
const bestNow = (s: GameState) => bothWays(s).reduce((m, [f, t]) => Math.max(m, previewMerge(s, f, t)!.total), 0);
const ALL_BOTS: Bot[] = [
  {
    name: 'random',
    pick: (s, rng) => {
      const p = legalPairs(s);
      if (!p.length) return null;
      const [a, b] = p[rng.int(p.length)];
      return rng.next() < 0.5 ? [a, b] : [b, a];
    },
  },
  {
    name: 'smart',
    pick: (s) => {
      let best: [number, number] | null = null, bd = -1;
      for (const [a, b] of legalPairs(s))
        for (const [f, t] of [[a, b], [b, a]] as [number, number][]) {
          const d = previewMerge(s, f, t)!.total;
          if (d > bd) [bd, best] = [d, [f, t]];
        }
      return best;
    },
  },
  {
    // 2-ply: this cascade + 0.5 x the best cascade on the board it leaves (setup helpers can score here);
    // the lookahead runs on a JSON copy, ignores supply arriving in between, and never touches the real state
    name: 'planner',
    pick: (s) => {
      let best: [number, number] | null = null, bd = -1;
      for (const [f, t] of bothWays(s)) {
        const now = previewMerge(s, f, t)!.total;
        const c = JSON.parse(JSON.stringify(s)) as GameState;
        drop(c, f, t, c.grid[f]!.id);
        const d = now + 0.5 * bestNow(c);
        if (d > bd) [bd, best] = [d, [f, t]];
      }
      return best;
    },
  },
  {
    // t-1effe0bf: a player who looks for sandwiches: the best-damage sandwich when one exists, else the smart pick
    name: 'seeker',
    pick: (s) => {
      let best: [number, number] | null = null, bd = -1;
      for (const [f, t] of bothWays(s)) {
        const d = previewMerge(s, f, t)!.total + (sandwichFor(s, f, t) ? 1e12 : 0);
        if (d > bd) [bd, best] = [d, [f, t]];
      }
      return best;
    },
  },
];
// --bots random,smart,planner[,seeker] (default: random, smart, planner)
const BOTS = args.includes('--bots') ? ALL_BOTS.filter((b) => args[args.indexOf('--bots') + 1].split(',').includes(b.name)) : ALL_BOTS.filter((b) => b.name !== 'seeker');

interface Run {
  won: boolean;
  clock: number; // elapsed / level clock (1 on a loss)
  chains: number[]; // player-rooted cascade sizes
  dmgFam: Partial<Record<Family, number>>; // cascade damage split by activation contribution
  passive: number;
  deep: number; // damage from depth >= 3 activations
  total: number;
  acts: number;
  relayFires: Partial<Record<Family, number>>;
  relayWakes: Partial<Record<Family, number>>;
  moves: number;
  primes: number;
  primesUsed: number;
  marks: number;
  marksUsed: number;
  arcs: number;
  arcToWelder: number;
  clears: number;
  fetches: number;
  fullSecs: number; // 1-s samples with no free usable cell (board full)
  secs: number;
  sandwiches: number;
  supports: number;
  decisions: number;
  swOpp: number; // decisions where some legal merge would sandwich
  gearLinks: number; // roster B: Gear -> Gear link wakes
  pierced: number; // roster B: Drill damage pushed through a closed shield
}

function absorb(r: Run, c: CascadeResult, player: boolean) {
  if (player) r.chains.push(c.count);
  r.acts += c.count;
  const sum = c.activations.reduce((m, a) => m + a.contribution, 0) || 1;
  for (const a of c.activations) {
    const d = (c.total * a.contribution) / sum;
    r.dmgFam[a.family] = (r.dmgFam[a.family] ?? 0) + d;
    if (a.depth >= 3) r.deep += d;
    r.total += d;
    if (isRelay(a.family)) {
      r.relayFires[a.family] = (r.relayFires[a.family] ?? 0) + 1;
      r.relayWakes[a.family] = (r.relayWakes[a.family] ?? 0) + c.activations.filter((x) => x.parent === a.idx && x.idx !== a.idx).length;
    }
  }
  for (const e of c.edges) {
    if (e.kind === 'gear' && c.activations.find((x) => x.idx === e.to)?.family === 'gear') r.gearLinks++;
    if (e.kind === 'arc') {
      r.arcs++;
      if (c.activations.find((x) => x.idx === e.to)?.family === 'arc_welder') r.arcToWelder++;
    }
  }
  r.pierced += c.pierced ?? 0;
  r.moves += c.moves.length;
  r.primes += c.primes.length;
  r.primesUsed += c.discharged.length;
  r.marks += c.amps?.length ?? 0;
  r.marksUsed += c.ampsUsed?.length ?? 0;
  r.clears += c.clears?.length ?? 0;
  r.fetches += c.fetch ?? 0;
}

function play(def: LevelDef, sq: Squad, bot: Bot, seed: number): Run {
  const s = newLevel(def, { shooter: sq.shooter, relays: sq.relays, toys: sq.helper ? [sq.helper] : [] });
  if (LVL) {
    s.unitMult = Object.fromEntries(FAMILIES.map((f) => [f, levelMult(unitDef(f), LVL)]));
    s.unitLevel = Object.fromEntries(FAMILIES.map((f) => [f, LVL]));
  }
  const r: Run = { won: false, clock: 1, chains: [], dmgFam: {}, passive: 0, deep: 0, total: 0, acts: 0, relayFires: {}, relayWakes: {}, moves: 0, primes: 0, primesUsed: 0, marks: 0, marksUsed: 0, arcs: 0, arcToWelder: 0, clears: 0, fetches: 0, fullSecs: 0, secs: 0, sandwiches: 0, supports: 0, decisions: 0, swOpp: 0, gearLinks: 0, pierced: 0 };
  const see = (ev: GameEvent[], player: boolean) => {
    for (const e of ev) {
      if (e.type === 'cascade') absorb(r, e.result, player && !e.kickback);
      else if (e.type === 'shot') {
        r.passive += e.damage;
        r.total += e.damage;
      }
    }
  };
  const rng = new Rng(seed);
  let next = EVERY, sample = 1;
  while (s.phase === 'playing' || s.phase === 'choice') {
    if (s.phase === 'choice') {
      choosePerk(s, s.offer[0]);
      continue;
    }
    if (s.elapsed >= sample) {
      sample += 1;
      r.secs++;
      const lk = locked(s);
      if (!s.grid.some((x, i) => !x && !lk.has(i))) r.fullSecs++;
    }
    if (s.elapsed >= next) {
      next += EVERY;
      r.decisions++;
      if (TUNING.mergeRule !== 'today' && bothWays(s).some(([f, t]) => sandwichFor(s, f, t))) r.swOpp++;
      // roster B: a full Support card is tapped first (random bot: half the time), then the merge
      const sup = s.support ? autoSupport(s) : null;
      if (sup && (bot.name !== 'random' || rng.next() < 0.5)) {
        const res = useSupport(s, sup.cell, sup.axis);
        if (res.ok) r.supports++;
        see(res.events, true);
      }
      const m = s.phase === 'playing' ? bot.pick(s, rng) : null;
      if (m) see(drop(s, m[0], m[1], s.grid[m[0]]!.id).events, true);
    }
    see(tick(s), false);
  }
  r.won = s.phase === 'won';
  r.sandwiches = s.stats.sandwiches ?? 0;
  if (r.won) r.clock = s.elapsed / (s.levelTime ?? s.elapsed);
  return r;
}

const q = (a: number[], p: number) => (a.length ? [...a].sort((x, y) => x - y)[Math.min(a.length - 1, Math.floor(a.length * p))] : NaN);
const pct = (x: number) => (Number.isFinite(x) ? (x * 100).toFixed(1) : '  -').padStart(5);

// same levels for every squad: skip teach levels, goal-only levels and levels that force their own shooter
const defs = LEVELS.filter((d) => d.level >= FROM && d.level <= TO && (d.level - FROM) % STEP === 0 && !d.teach && !(d.goal && !d.waves) && !d.shooter);
console.log(`squad-swap: levels ${defs.map((d) => d.level).join(',')}  n=${N}/level  every ${EVERY}s  unit level ${LVL || 'unset'}${TUNING.rosterB ? '  ROSTER B' : TUNING.unitsB1 ? '  UNITS B1' : TUNING.unitsB0 ? '  UNITS B0' : ''}${ROSTER ? '  NEW4' : ''}${args.includes('--set') ? `  set ${args[args.indexOf('--set') + 1]}` : ''}`);

interface Agg { win: number; clr: number; mean: number; clrAll: number; chainMed: number; chainP90: number; share: Partial<Record<Family, number>>; passive: number; deep: number; acts: number; wakes: Partial<Record<Family, number>>; helper: string }
const results = new Map<string, Agg>();
for (const sq of SQUADS) {
  // --only KEY[,KEY...]: substring match on the squad key (BASE always runs: it is the reference, unless --nobase for
  // split runs, where deltas are worked out against a separate BASE run)
  if (ONLY && sq.key !== 'BASE' && !ONLY.toUpperCase().split(',').some((k) => sq.key.includes(k))) continue;
  if (sq.key === 'BASE' && args.includes('--nobase')) continue;
  for (const bot of BOTS) {
    const runs: Run[] = [];
    // the smart bot is deterministic: vary the level's supply seed per run (same seeds for every squad, so runs pair up)
    for (const def of defs) for (let k = 1; k <= N; k++) runs.push(play({ ...def, seed: (def.seed + k * 7919) >>> 0 }, sq, bot, def.seed * 31 + k));
    const wins = runs.filter((r) => r.won);
    const sumOf = (f: (r: Run) => number) => runs.reduce((m, r) => m + f(r), 0);
    const total = sumOf((r) => r.total) || 1;
    const fams = [sq.shooter, ...sq.relays, ...(sq.helper ? [sq.helper] : [])];
    const share: Partial<Record<Family, number>> = {};
    for (const f of fams) share[f] = sumOf((r) => r.dmgFam[f] ?? 0) / total;
    const other = sumOf((r) => Object.entries(r.dmgFam).reduce((m, [f, d]) => m + (fams.includes(f as Family) ? 0 : d!), 0)) / total;
    const wakes: Partial<Record<Family, number>> = {};
    for (const f of sq.relays) wakes[f] = sumOf((r) => r.relayWakes[f] ?? 0) / Math.max(1, sumOf((r) => r.relayFires[f] ?? 0));
    const chains = runs.flatMap((r) => r.chains);
    const per = (f: (r: Run) => number) => (sumOf(f) / runs.length).toFixed(1);
    let helper = '';
    if (sq.helper) helper = `  moves ${per((r) => r.moves)}  primes ${per((r) => r.primes)}/${per((r) => r.primesUsed)}  marks ${per((r) => r.marks)}/${per((r) => r.marksUsed)}  clears ${per((r) => r.clears)}  fetches ${per((r) => r.fetches)}${TUNING.rosterB ? `  cardUses ${per((r) => r.supports)}` : ''}`;
    if (sq.relays.includes('gear')) helper += `  gear links ${per((r) => r.gearLinks)}`;
    if (sq.shooter === 'jackhammer') helper += `  pierced ${pct(sumOf((r) => r.pierced) / total)}%`;
    if (sq.shooter === 'arc_welder') helper += `  arcs ${per((r) => r.arcs)}  arc->welder ${pct(sumOf((r) => r.arcToWelder) / Math.max(1, sumOf((r) => r.arcs)))}%`;
    const a: Agg = {
      win: wins.length / runs.length,
      clr: q(wins.map((r) => r.clock), 0.5),
      mean: wins.reduce((m, r) => m + r.clock, 0) / Math.max(1, wins.length),
      clrAll: q(runs.map((r) => r.clock), 0.5),
      chainMed: q(chains, 0.5),
      chainP90: q(chains, 0.9),
      share,
      passive: sumOf((r) => r.passive) / total,
      deep: sumOf((r) => r.deep) / total,
      acts: sumOf((r) => r.acts) / runs.length,
      wakes,
      helper,
    };
    results.set(`${sq.key}|${bot.name}`, a);
    const b = results.get(`BASE|${bot.name}`) ?? a;
    const dWin = (a.win - b.win) * 100, dClr = ((a.clr - b.clr) / b.clr) * 100, dMean = ((a.mean - b.mean) / b.mean) * 100;
    const fullPct = sumOf((r) => r.fullSecs) / Math.max(1, sumOf((r) => r.secs));
    const ever = runs.filter((r) => r.fullSecs > 0).length / runs.length;
    const chainAvg = chains.reduce((m, x) => m + x, 0) / Math.max(1, chains.length);
    const clrMean = wins.reduce((m, r) => m + r.clock, 0) / Math.max(1, wins.length);
    const ruleTag = TUNING.mergeRule !== 'today' || args.includes('--rule') ? `  [${TUNING.mergeRule}] clrMean ${pct(clrMean)}% full ${pct(fullPct)}% ever ${pct(ever)}%  sandwich/run ${per((r) => r.sandwiches)} (available at ${pct(sumOf((r) => r.swOpp) / Math.max(1, sumOf((r) => r.decisions)))}% of decisions)  chainAvg ${chainAvg.toFixed(2)}` : '';
    console.log(
      `${sq.key.padEnd(16)} ${bot.name.padEnd(6)}${ruleTag} win ${pct(a.win)}% (${dWin >= 0 ? '+' : ''}${dWin.toFixed(1)})  clr ${pct(a.clr)}% (${dClr >= 0 ? '+' : ''}${dClr.toFixed(1)}%) mean ${pct(a.mean)}% (${dMean >= 0 ? '+' : ''}${dMean.toFixed(1)}%) all ${pct(a.clrAll)}%  chain ${a.chainMed}/${a.chainP90}  dmg ${fams.map((f) => `${f} ${pct(share[f]!)}`).join(' ')} oth ${pct(other)}  passive ${pct(a.passive)}  d3+ ${pct(a.deep)}  acts ${a.acts.toFixed(0)}  wakes ${sq.relays.map((f) => `${f} ${a.wakes[f]!.toFixed(2)}`).join(' ')}${helper}`,
    );
  }
}
