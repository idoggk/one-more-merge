// Headless balance simulator. Usage: npx vite-node tools/sim.ts
import { COLS, TUNING } from '../src/content/tuning';
import { choosePerk, drop, legalPairs, newGame, previewMerge, tick, type GameState } from '../src/core/game';
import { Rng } from '../src/core/rng';
import type { Family } from '../src/core/types';

type Policy = { name: string; every: number; pick: (s: GameState, rng: Rng) => [number, number] | null };

const idle: Policy = { name: 'idle', every: 1e9, pick: () => null };
const novice: Policy = {
  name: 'novice 5s random',
  every: 5,
  pick: (s, rng) => {
    const p = legalPairs(s);
    if (!p.length) return null;
    const [a, b] = p[rng.int(p.length)];
    return rng.next() < 0.5 ? [a, b] : [b, a];
  },
};
const greedy: Policy = {
  name: 'greedy 2.5s',
  every: 2.5,
  pick: (s) => {
    const p = legalPairs(s);
    if (!p.length) return null;
    p.sort((x, y) => s.grid[y[0]]!.rank - s.grid[x[0]]!.rank);
    return p[0];
  },
};
const seeker: Policy = {
  name: 'cascade 2.5s',
  every: 2.5,
  pick: (s) => {
    let best: [number, number] | null = null;
    let bestDmg = -1;
    for (const [a, b] of legalPairs(s))
      for (const [f, t] of [[a, b], [b, a]] as [number, number][]) {
        const d = previewMerge(s, f, t)!.total;
        if (d > bestDmg) [bestDmg, best] = [d, [f, t]];
      }
    return best;
  },
};

/** Like `seeker`, but may spend its action moving a relay next to a pair if that sets up a bigger chain. */
const builder: Policy = {
  name: 'builder 2.5s',
  every: 2.5,
  pick: (s, rng) => {
    const best = (st: GameState) => {
      let bd = 0;
      for (const [a, b] of legalPairs(st)) for (const [f, t] of [[a, b], [b, a]]) bd = Math.max(bd, previewMerge(st, f, t)!.total);
      return bd;
    };
    const now = best(s);
    let move: [number, number] | null = null;
    let moveVal = now * 1.25; // a move costs a whole action: must set up a clearly better chain
    const pairs = legalPairs(s);
    const near = new Set<number>();
    for (const [a, b] of pairs) for (const c of [a, b]) for (const d of [-COLS, COLS, -1, 1]) if (c + d >= 0 && c + d < s.grid.length) near.add(c + d);
    s.grid.forEach((g, from) => {
      if (!g || g.family === 'cannon') return;
      for (const to of near) {
        if (s.grid[to]) continue;
        const tmp = { ...s, grid: s.grid.slice() };
        tmp.grid[to] = g;
        tmp.grid[from] = null;
        const v = best(tmp);
        if (v > moveVal) [moveVal, move] = [v, [from, to]];
      }
    });
    return move ?? seeker.pick(s, rng);
  },
};

const hoarder: Policy = {
  name: 'hoard>=24 2.5s',
  every: 2.5,
  pick: (s, rng) => (s.grid.filter(Boolean).length >= 24 ? seeker.pick(s, rng) : null),
};

let simToys: Family[] = [];
let simRemix = -1;
let simShooter: Family = 'cannon';
function play(seed: number, pol: Policy) {
  const s = newGame(seed, false, false, simToys, simRemix, simShooter);
  const rng = new Rng(seed * 7 + 1);
  let next = pol.every;
  let kickFuses = 0;
  let firstKick = -1;
  let casc = 0;
  let sat = 0;
  while (s.phase === 'playing' || s.phase === 'choice') {
    if (s.phase === 'choice') {
      choosePerk(s, s.offer[rng.int(s.offer.length)]);
      continue;
    }
    if (s.elapsed >= next) {
      next += pol.every;
      const m = pol.pick(s, rng);
      if (m) {
        const res = drop(s, m[0], m[1], s.grid[m[0]]!.id);
        const occ = s.grid.filter(Boolean).length;
        for (const e of res.events) if (e.type === 'threshold' && firstKick < 0) firstKick = s.elapsed;
        for (const e of res.events) if (e.type === 'cascade') {
          casc++;
          if (e.result.count >= 0.8 * occ && occ >= 10) sat++;
        }
      }
    }
    for (const e of tick(s)) {
      if (e.type === 'kickback' && e.into >= 0) kickFuses++;
      if (e.type === 'threshold' && firstKick < 0) firstKick = s.elapsed;
    }
  }
  const d = s.stats.dmgBy;
  const tot = s.stats.totalDamage || 1;
  return { mpm: (s.stats.merges / Math.max(1, s.elapsed)) * 60, rank: s.stats.bestRank, won: s.phase === 'won', time: s.elapsed, targets: s.phase === 'won' ? 3 : s.target, kickFuses, chain: s.stats.biggestChain, sat: casc ? sat / casc : 0, share: [(d.player ?? 0) / tot, (d.passive ?? 0) / tot, (d.kick ?? 0) / tot], scraps: s.stats.scraps, firstKick };
}

const median = (a: number[]) => (a.length ? [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)] : NaN);

function report(label: string, N = 200) {
  console.log(`\n== ${label}`);
  for (const pol of label.includes('SWEEP') ? [novice, greedy, seeker, hoarder, builder] : [idle, novice, greedy, seeker, hoarder, builder]) {
    const rs = Array.from({ length: N }, (_, i) => play(i + 1, pol));
    const wins = rs.filter((r) => r.won);
    console.log(
      `${pol.name.padEnd(18)} win ${String(wins.length).padStart(3)}/${N}  medWinTime ${median(wins.map((r) => r.time)).toFixed(1).padStart(6)}s  medTargets ${median(rs.map((r) => r.targets))}  fuses/run ${(rs.reduce((m, r) => m + r.kickFuses, 0) / N).toFixed(1)}  medChain ${median(rs.map((r) => r.chain))}  sat ${((rs.reduce((m, r) => m + r.sat, 0) / N) * 100).toFixed(0)}%  1stPanel ${median(rs.map((r) => (r.firstKick < 0 ? 999 : r.firstKick))).toFixed(0)}s  mpm ${median(rs.map((r) => r.mpm)).toFixed(0)}  bestRank ${median(rs.map((r) => r.rank))}  dmg p/p/k ${[0, 1, 2].map((k) => ((rs.reduce((m, r) => m + r.share[k], 0) / N) * 100).toFixed(0)).join('/')}%`,
    );
  }
}

const hp = (m: number) => TUNING.targetHp.map((h) => Math.round(h * m));
const rev3 = { passiveMult: 1, kickback: false, sameFamilyRelay: true, supplyCurve: [] as [number, number][], supplyPeriod: 2.2, holdAt: 99, releaseAt: 99, targetHp: [3200, 16000, 26000] };
const fast = { supplyCurve: [[15, 1.7], [45, 1.9], [90, 2.1]] as [number, number][], supplyPeriod: 2.4 };
const variants: [string, Partial<typeof TUNING>][] = [
  ['current', {}],
  ['LEGACY rules', { clarity: false }],
  ['TEAM ROCKET', {}],
  ['TEAM BASE', {}],
  ['CLARITY HP1.0', { targetHp: hp(1 / 1.2) }],
  ['CLARITY HP0.9', { targetHp: hp(0.9 / 1.2) }],
  ['OLD no-matchmaker', { matchShare: 0 }],
  ['FEST fast', fast],
  ['FEST fast p0.15', { ...fast, passiveMult: 0.15 }],
  ['FEST HP1.2', { ...fast, passiveMult: 0.15, targetHp: hp(1.2) }],
  ['FEST HP1.35', { ...fast, passiveMult: 0.15, targetHp: hp(1.35) }],
  ['FEST HP1.5', { ...fast, passiveMult: 0.15, targetHp: hp(1.5) }],
  ['FEST fast p0.15 m0.8', { ...fast, passiveMult: 0.15, matchShare: 0.8 }],
  ['current + MAGNETS', {}],
  ['REMIX vacuum', {}],
  ['REMIX twins', {}],
  ['REMIX piano', {}],
  ['current + ALLTOYS', {}],
  ['current + ALLTOYS dmg4', { base: { ...TUNING.base, magnet: 4, battery: 4, fan: 4 } }],
  ['current + ALLTOYS hp0.85', { targetHp: hp(0.85) }],
  ['challenge (hard)', { hardHpMult: 1.4 }],
  ['HPx0.85', { targetHp: hp(0.85) }],
  ['rev3 ref', rev3],];
const base = { ...TUNING };
const only = process.argv[2];
for (const [label, v] of variants) {
  if (only && !label.includes(only)) continue;
  Object.assign(TUNING, base, v);
  simRemix = label.includes('REMIX') ? (label.includes('vacuum') ? 3 : label.includes('twins') ? 4 : 5) : -1;
  simShooter = label.includes('ROCKET') ? 'rocket' : 'cannon';
  simToys = label.includes('MAGNETS') ? ['magnet'] : label.includes('ALLTOYS') ? ['magnet', 'battery', 'fan'] : [];
  report(label);
}

// ---------- POWER TOOLS test (t-e2a48327): npx vite-node tools/sim.ts tools [runs] ----------
// Saga level 25 with the +1 BONUS sandwich rule, tools OFF vs ON. Bots: a random bot (never uses tools), a planning bot (best merge preview)
// and a TOOL-USING planner (taps a tool when the tool's preview beats its best merge). Plain-words report at the end.
async function toolsReport(N: number) {
  const { LEVELS } = await import('../src/content/levels');
  const { newLevel } = await import('../src/core/game');
  const { applyMergeRule } = await import('../src/core/sandwich');
  const { planTool, previewTool, useTool } = await import('../src/core/tools');
  type Bot = { name: string; planner: boolean; tools: boolean; only?: Family };
  const bots: Bot[] = [
    { name: 'random bot', planner: false, tools: false },
    { name: 'planning bot (no tools)', planner: true, tools: false },
    { name: 'planner + TOOLS', planner: true, tools: true },
    { name: 'planner, Cannons first', planner: true, tools: true, only: 'cannon' },
    { name: 'planner, Coils first', planner: true, tools: true, only: 'coil' },
  ];
  const runOne = (seed: number, bot: Bot, flag: boolean, rule: 'today' | 'sandwichBonus') => {
    TUNING.tools = flag;
    applyMergeRule(rule);
    const s = newLevel({ ...LEVELS[24], seed: LEVELS[24].seed + seed * 7919 }); // a different supply each run
    const rng = new Rng(seed * 7 + 3);
    let next = 2.5;
    while (s.phase === 'playing' || s.phase === 'choice') {
      if (s.phase === 'choice') {
        choosePerk(s, s.offer[rng.int(s.offer.length)]);
        continue;
      }
      if (s.elapsed >= next) {
        next += 2.5;
        const pairs = legalPairs(s);
        let bestMerge: [number, number] | null = null;
        let bestDmg = -1;
        if (bot.planner) {
          for (const [a, b] of pairs)
            for (const [f, t] of [[a, b], [b, a]] as [number, number][]) {
              if (bot.only && s.grid[f]!.family !== bot.only) continue;
              const d = previewMerge(s, f, t)!.total;
              if (d > bestDmg) [bestDmg, bestMerge] = [d, [f, t]];
            }
          if (!bestMerge && bot.only) {
            for (const [a, b] of pairs) bestMerge = [a, b]; // nothing of the preferred family: any merge
            bestDmg = 0;
          }
        } else if (pairs.length) {
          const [a, b] = pairs[rng.int(pairs.length)];
          bestMerge = rng.next() < 0.5 ? [a, b] : [b, a];
        }
        let tapped = false;
        if (bot.tools && TUNING.tools) {
          let bt = -1, bd = bestDmg;
          s.grid.forEach((g, i) => {
            if (!g?.tool) return;
            const p = planTool(s, i);
            const r = p && previewTool(s, p);
            if (r && r.total > bd) [bt, bd] = [i, r.total];
          });
          if (bt >= 0) tapped = useTool(s, bt, s.grid[bt]!.id).ok;
        }
        if (!tapped && bestMerge) drop(s, bestMerge[0], bestMerge[1], s.grid[bestMerge[0]]!.id);
      }
      tick(s);
    }
    const t = s.stats.tools ?? { made: 0, used: 0, combos: 0 };
    const actions = s.stats.merges + t.used;
    return { won: s.phase === 'won', made: t.made, used: t.used, combos: t.combos, perAction: (s.stats.dmgBy.player ?? 0) / Math.max(1, actions), time: s.elapsed };
  };
  const agg = (bot: Bot, flag: boolean, rule: 'today' | 'sandwichBonus') => {
    const rs = Array.from({ length: N }, (_, i) => runOne(i + 1, bot, flag, rule));
    const m = (f: (r: (typeof rs)[number]) => number) => rs.reduce((a, r) => a + f(r), 0) / N;
    return { win: m((r) => (r.won ? 1 : 0)), made: m((r) => r.made), used: m((r) => r.used), combos: m((r) => r.combos), per: m((r) => r.perAction), time: median(rs.filter((r) => r.won).map((r) => r.time)) };
  };
  console.log(`\n== POWER TOOLS test (saga level 25, ${N} runs per row)`);
  const rows: Record<string, ReturnType<typeof agg>> = {};
  for (const [label, flag, rule] of [['today (flag off, rule today)', false, 'today'], ['bonus rule, tools off', false, 'sandwichBonus'], ['bonus rule, tools ON', true, 'sandwichBonus']] as const)
    for (const bot of bots) {
      const r = agg(bot, flag, rule);
      rows[`${label}|${bot.name}`] = r;
      console.log(`${label.padEnd(30)} ${bot.name.padEnd(26)} win ${(r.win * 100).toFixed(0).padStart(3)}%  medWinTime ${r.time.toFixed(0).padStart(4)}s  dmg/action ${r.per.toFixed(0).padStart(6)}  tools made ${r.made.toFixed(2)}  used ${r.used.toFixed(2)}  combos ${r.combos.toFixed(2)}`);
    }
  const R = (l: string, b: string) => rows[`${l}|${b}`];
  const on = 'bonus rule, tools ON', off = 'bonus rule, tools off', today = 'today (flag off, rule today)';
  const ratio = (l: string) => R(l, 'planner + TOOLS').per / R(l, 'random bot').per;
  console.log('\nIN PLAIN WORDS');
  console.log(`- Tools made per run: random bot ${R(on, 'random bot').made.toFixed(2)}, planning bot ${R(on, 'planning bot (no tools)').made.toFixed(2)} (it used ${R(on, 'planner + TOOLS').used.toFixed(2)} and ${R(on, 'planner + TOOLS').combos.toFixed(2)} combos per run when it may tap them).`);
  console.log(`- Thinking damage per action (tool-using planner vs random bot): today ${(R(today, 'planning bot (no tools)').per / R(today, 'random bot').per).toFixed(2)}x, with tools ${ratio(on).toFixed(2)}x (target 1.6x).`);
  console.log(`- Random bot win-rate: today ${(R(today, 'random bot').win * 100).toFixed(0)}%, bonus rule ${(R(off, 'random bot').win * 100).toFixed(0)}%, tools on ${(R(on, 'random bot').win * 100).toFixed(0)}%.`);
  const spread = (l: string) => R(l, 'planner, Cannons first').per / R(l, 'planner, Coils first').per;
  console.log(`- Do Cannon / Coil choices still matter? Cannons-first vs Coils-first damage per action: tools off ${spread(off).toFixed(2)}x, tools on ${spread(on).toFixed(2)}x (1.00x would mean the choice stopped mattering).`);
}
if (only === 'tools') {
  if (process.argv[4]) TUNING.tl.chain = Number(process.argv[4]); // optional: try another chain length for the Row Surge
  await toolsReport(Number(process.argv[3] ?? 60));
}
