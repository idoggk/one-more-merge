// LEVEL REPORT (read-only, t-77594cd4): per level, how four bots do against the clock, the 2★/3★ lines, the boss HP
// and the chain goal. Input for the HP/star refit after the owner's PACE pick; never writes levels.json.
// Bots (think time ±20%, as in chaos-sim.ts): rand25 = any legal merge every 2.5 s; smart3 / smart1 = the best previewed
// merge (goal-aware, cascade cap counted) every 3 s / 1 s; plan3 = 2-ply planner (squad-swap.ts) every 3 s, smaller n.
// Usage: npx vite-node tools/level-report.ts [--from 1] [--to 80] [--n 12] [--nplan 4] [--pace today|calm|mania]
//          [--variant off|a2|a3|a3f] [--out level-report]     -> <out>/<pace>[+variant]_L<from>-<to>.csv / .md
//        npx vite-node tools/level-report.ts --summary [--pace calm] [--variant a3] [--out level-report]
//          -> merges that tag's range files: per-chapter table + ranked problems (<out>/<tag>_summary.md)
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { applyPace, applySpamVariant, type SpamVariant } from '../src/content/experiments';
import { LEVELS, starGoals, type LevelDef } from '../src/content/levels';
import { TUNING, type Pace } from '../src/content/tuning';
import { choosePerk, drop, legalPairs, newLevel, previewMerge, tick, type GameEvent, type GameState } from '../src/core/game';
import { Rng } from '../src/core/rng';
import { BOT_KEYS, CSV_HEADER, MD_HEADER, bossCheck, botStat, chapterSummary, flags, parseCsv, rampFlags, toCsvRow, toMdRow, type BotKey, type Row } from './level-report-lib';

const args = process.argv.slice(2);
const arg = (k: string) => (args.includes(k) ? args[args.indexOf(k) + 1] : undefined);
const FROM = Number(arg('--from')) || 1;
const TO = Number(arg('--to')) || LEVELS.length;
const N = Number(arg('--n')) || 12;
const NPLAN = Number(arg('--nplan')) || 4;
const PACE = (arg('--pace') ?? 'today') as Pace;
const VARIANT = (arg('--variant') ?? 'off') as SpamVariant;
const OUT = arg('--out') ?? 'level-report';
applySpamVariant(VARIANT);
applyPace(PACE);
const TAG = `${PACE}${VARIANT !== 'off' ? `+${VARIANT}` : ''}`;

type Opt = { f: number; t: number; score: number };
const capOf = (s: GameState) => (s.goal ? Infinity : Math.ceil(s.maxHp * TUNING.cascadeCap));
// goal-aware score (chaos-sim.ts): rank goal = the highest new rank, chain goal = the longest chain, else capped damage
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
const bestScore = (s: GameState) => options(s).reduce((m, o) => Math.max(m, o.score), 0);
type Bot = { every: number; n: number; pick: (s: GameState, rng: Rng) => Opt | undefined };
const top = (ops: Opt[]) => ops.reduce<Opt | undefined>((m, o) => (!m || o.score > m.score ? o : m), undefined);
const BOTS: Record<BotKey, Bot> = {
  rand25: { every: 2.5, n: N, pick: (s, rng) => { const ops = options(s); return ops.length ? ops[rng.int(ops.length)] : undefined; } },
  smart3: { every: 3, n: N, pick: (s) => top(options(s)) },
  smart1: { every: 1, n: N, pick: (s) => top(options(s)) },
  // 2-ply: this merge + 0.5 x the best merge on the board it leaves (JSON copy; ignores supply arriving in between)
  plan3: {
    every: 3,
    n: NPLAN,
    pick: (s) =>
      top(
        options(s).map((o) => {
          const c = JSON.parse(JSON.stringify(s)) as GameState;
          drop(c, o.f, o.t, c.grid[o.f]!.id);
          return { ...o, score: o.score + 0.5 * bestScore(c) };
        }),
      ),
  },
};

function play(def: LevelDef, bot: Bot, seed: number): { t: number; chains: number[] } {
  const s = newLevel(def);
  const rng = new Rng(seed);
  const chains: number[] = [];
  const see = (ev: GameEvent[]) => {
    for (const e of ev) if (e.type === 'cascade' && !e.kickback) chains.push(e.result.count);
  };
  let next = bot.every * (0.8 + 0.4 * rng.next());
  while (s.phase === 'playing' || s.phase === 'choice') {
    if (s.phase === 'choice') {
      choosePerk(s, s.offer[0]);
      continue;
    }
    if (s.elapsed >= next) {
      next += bot.every * (0.8 + 0.4 * rng.next());
      const o = bot.pick(s, rng);
      if (o) see(drop(s, o.f, o.t, s.grid[o.f]!.id).events);
    }
    tick(s);
  }
  return { t: s.phase === 'won' ? s.elapsed : NaN, chains };
}

function measure(def: LevelDef): Row {
  const s0 = newLevel(def);
  const lines = starGoals(def);
  const st = s0.stage;
  const boss = st?.boss && !st.boss.light ? bossCheck(st.hps) : null;
  const kind = def.goal ? `${def.goal.kind}${def.goal.n}` : def.mini_boss ? 'mini' : def.level % 10 === 0 ? 'boss' : 'normal';
  const bots = {} as Row['bots'];
  for (const k of BOT_KEYS) {
    const times: number[] = [], chains: number[] = [];
    for (let i = 1; i <= BOTS[k].n; i++) {
      const r = play(def, BOTS[k], def.level * 1009 + i * 7919);
      times.push(r.t);
      chains.push(...r.chains);
    }
    bots[k] = botStat(times, chains, lines);
  }
  return { level: def.level, kind, clock: s0.levelTime ?? def.time_seconds, two: lines[0], three: lines[1], boss: boss?.boss ?? 0, minions: boss?.minionSum ?? 0, bots };
}

if (args.includes('--summary')) {
  const files = readdirSync(OUT).filter((f) => f.startsWith(`${TAG}_L`) && f.endsWith('.csv'));
  const rows = files.flatMap((f) => parseCsv(readFileSync(`${OUT}/${f}`, 'utf8'))).sort((a, b) => a.level - b.level);
  const ramps = rampFlags(rows);
  const all = new Map(rows.map((r) => [r.level, [...flags(r), ...(ramps.has(r.level) ? [ramps.get(r.level)!] : [])]]));
  const pc = (x: number) => (Number.isFinite(x) ? `${Math.round(x * 100)}%` : '-');
  const lines = [
    `# level-report summary: ${TAG} (${rows.length} levels)`,
    '',
    '| ch | win r2.5/s3/s1/plan | clear÷clock r2.5/s3/s1/plan | 3★ share r2.5/s3/s1/plan | 3★ line÷clock | chain p90 s3 | flags |',
    '|---|---|---|---|---|---|---|',
    ...chapterSummary(rows, all).map(
      (c) =>
        `| ${c.ch} | ${BOT_KEYS.map((k) => pc(c.win[k])).join(' ')} | ${BOT_KEYS.map((k) => pc(c.clearFrac[k])).join(' ')} | ${BOT_KEYS.map((k) => pc(c.p3[k])).join(' ')} | ${pc(c.three)} | ${c.chainP90.toFixed(1)} | ${Object.entries(c.flags).map(([f, n]) => `${f}×${n}`).join(' ')} |`,
    ),
    '',
    '## flags (most frequent first)',
    ...Object.entries([...all.entries()].reduce<Record<string, number[]>>((m, [L, fl]) => (fl.forEach((f) => (m[f] ??= []).push(L)), m), {}))
      .sort((a, b) => b[1].length - a[1].length)
      .map(([f, ls]) => `- ${f} ×${ls.length}: L${ls.join(', L')}`),
  ];
  writeFileSync(`${OUT}/${TAG}_summary.md`, lines.join('\n') + '\n');
  console.log(lines.join('\n'));
} else {
  mkdirSync(OUT, { recursive: true });
  const rows: Row[] = [];
  console.log(`level-report | ${TAG} | L${FROM}-${TO} | n ${N} (planner ${NPLAN})`);
  console.log(MD_HEADER);
  for (const def of LEVELS) {
    if (def.level < FROM || def.level > TO) continue;
    const r = measure(def);
    rows.push(r);
    console.log(toMdRow(r));
  }
  const base = `${OUT}/${TAG}_L${FROM}-${TO}`;
  writeFileSync(`${base}.csv`, [CSV_HEADER, ...rows.map((r) => toCsvRow(r))].join('\n') + '\n');
  writeFileSync(`${base}.md`, [`# level-report ${TAG} L${FROM}-${TO} (n ${N}, planner ${NPLAN})`, '', MD_HEADER, ...rows.map((r) => toMdRow(r))].join('\n') + '\n');
}
