// Pure helpers for tools/level-report.ts (no game state, no I/O): stats, star checks, boss HP check, problem flags,
// CSV in/out and the per-chapter summary. Tested in tests/levelReport.test.ts.

export const mean = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : NaN);
/** Nearest-rank quantile (same rule as squad-swap.ts); NaN on an empty list. */
export const quantile = (a: number[], p: number) => (a.length ? [...a].sort((x, y) => x - y)[Math.min(a.length - 1, Math.floor(a.length * p))] : NaN);

/** Stars for a clear time against [2★, 3★] lines (a clear is always 1★). */
export const starsAt = (t: number, [two, three]: [number, number]) => (t <= three ? 3 : t <= two ? 2 : 1);

/** Boss stage HP: `hps` = minion HPs then the boss (GameState.stage.hps). */
export function bossCheck(hps: number[]) {
  const boss = hps[hps.length - 1];
  const minions = hps.slice(0, -1);
  const sum = minions.reduce((a, b) => a + b, 0);
  const last = minions.length ? minions[minions.length - 1] : 0;
  return { boss, minionSum: sum, lastMinion: last, ratio: sum ? boss / sum : NaN, weakVsSum: boss < sum, weakVsLast: boss < last };
}

export interface BotStat {
  win: number; // share of runs won
  clear: number; // median clear time of the wins (s)
  p3: number; // share of runs that end with 3★
  p2: number; // share of runs that end with 2★+
  chainAvg: number; // player-rooted cascade size
  chainP90: number;
}
export const BOT_KEYS = ['rand25', 'smart3', 'smart1', 'plan3'] as const;
export type BotKey = (typeof BOT_KEYS)[number];
export interface Row {
  level: number;
  kind: string; // normal | boss | mini | rank<n> | chain<n> (goal levels)
  clock: number;
  two: number;
  three: number;
  boss: number; // 0 when the level has no boss stage
  minions: number;
  bots: Record<BotKey, BotStat>;
}

/** Summarise one bot's runs (clear times in s, NaN for losses; chains = every player cascade size). */
export function botStat(times: number[], chains: number[], lines: [number, number]): BotStat {
  const won = times.filter((t) => Number.isFinite(t));
  const n = Math.max(1, times.length);
  return {
    win: won.length / n,
    clear: quantile(won, 0.5),
    p3: won.filter((t) => starsAt(t, lines) === 3).length / n,
    p2: won.filter((t) => starsAt(t, lines) >= 2).length / n,
    chainAvg: mean(chains),
    chainP90: quantile(chains, 0.9),
  };
}

/** Problem flags for one level (ramps need neighbours: see rampFlags). */
export function flags(r: Row): string[] {
  const out: string[] = [];
  const { rand25: rd, smart3: s3, smart1: s1, plan3: pl } = r.bots;
  // stars measure tap speed: the thinking bot (best merge every 3 s) misses 3★, the same bot tapping every 1 s gets it
  if (s1.p3 >= 0.5 && s3.p3 < 0.5) out.push('TAPSPEED');
  // nobody thinking at 3 s gets 3★ (not even the planner)
  if (Math.max(s3.p3, pl.p3) < 0.25) out.push('3STAR_OUT_OF_REACH');
  // a random tapper at 2.5 s gets 3★ half the time: 3★ is a formality
  if (rd.p3 >= 0.5) out.push('3STAR_FREE');
  if (r.boss && r.boss < r.minions) out.push('BOSS_WEAK');
  const chainGoal = /^chain(\d+)/.exec(r.kind);
  if (chainGoal && (rd.win >= 0.9 || rd.chainP90 >= Number(chainGoal[1]))) out.push('CHAIN_GOAL_TRIVIAL');
  if (s3.win < 0.6) out.push('HARD_FOR_THINKER');
  return out;
}

/** Uneven ramp: the thinking bot's clear share of the clock (or its win rate) jumps against the previous level. */
export function rampFlags(rows: Row[], jump = 0.25): Map<number, string> {
  const out = new Map<number, string>();
  const sorted = [...rows].sort((a, b) => a.level - b.level);
  const load = (r: Row) => (r.bots.smart3.win < 1 ? 1 + (1 - r.bots.smart3.win) : (r.bots.smart3.clear || r.clock) / r.clock);
  for (let i = 1; i < sorted.length; i++) {
    const d = load(sorted[i]) - load(sorted[i - 1]);
    if (Math.abs(d) >= jump) out.set(sorted[i].level, d > 0 ? 'RAMP_SPIKE' : 'RAMP_DROP');
  }
  return out;
}

const COLS = ['level', 'kind', 'clock', 'two', 'three', 'boss', 'minions'] as const;
const STAT: (keyof BotStat)[] = ['win', 'clear', 'p3', 'p2', 'chainAvg', 'chainP90'];
export const CSV_HEADER = [...COLS, ...BOT_KEYS.flatMap((b) => STAT.map((k) => `${b}_${k}`)), 'flags'].join(',');
const fmt = (x: number) => (Number.isFinite(x) ? String(Math.round(x * 100) / 100) : '');
export const toCsvRow = (r: Row, fl: string[] = flags(r)) =>
  [...COLS.map((c) => String(r[c])), ...BOT_KEYS.flatMap((b) => STAT.map((k) => fmt(r.bots[b][k]))), fl.join(' ')].join(',');
export function parseCsv(text: string): Row[] {
  const [head, ...lines] = text.trim().split(/\r?\n/);
  const h = head.split(',');
  return lines.filter(Boolean).map((line) => {
    const v = line.split(',');
    const get = (k: string) => v[h.indexOf(k)] ?? '';
    const num = (k: string) => (get(k) === '' ? NaN : Number(get(k)));
    const bots = Object.fromEntries(BOT_KEYS.map((b) => [b, Object.fromEntries(STAT.map((k) => [k, num(`${b}_${k}`)]))])) as unknown as Row['bots'];
    return { level: num('level'), kind: get('kind'), clock: num('clock'), two: num('two'), three: num('three'), boss: num('boss'), minions: num('minions'), bots };
  });
}

const pc = (x: number) => (Number.isFinite(x) ? `${Math.round(x * 100)}%` : '-');
const s0 = (x: number) => (Number.isFinite(x) ? `${Math.round(x)}` : '-');
export const MD_HEADER =
  '| L | kind | clock | 2★/3★ | rand2.5 win/clr/3★ | smart3 win/clr/3★ | smart1 win/clr/3★ | plan3 win/clr/3★ | chain avg/p90 r·s3·p | boss/minions | flags |\n|---|---|---|---|---|---|---|---|---|---|---|';
export const toMdRow = (r: Row, fl: string[] = flags(r)) => {
  const b = (k: BotKey) => `${pc(r.bots[k].win)} ${s0(r.bots[k].clear)}s ${pc(r.bots[k].p3)}`;
  const ch = (k: BotKey) => `${r.bots[k].chainAvg.toFixed(1)}/${s0(r.bots[k].chainP90)}`;
  return `| ${r.level} | ${r.kind} | ${r.clock} | ${r.two}/${r.three} | ${b('rand25')} | ${b('smart3')} | ${b('smart1')} | ${b('plan3')} | ${ch('rand25')} · ${ch('smart3')} · ${ch('plan3')} | ${r.boss ? `${r.boss}/${r.minions} (${(r.boss / r.minions).toFixed(2)})` : ''} | ${fl.join(' ')} |`;
};

/** Per-chapter (10 levels) averages + flag counts. */
export function chapterSummary(rows: Row[], allFlags: Map<number, string[]>) {
  const out: { ch: number; levels: number; win: Record<BotKey, number>; clearFrac: Record<BotKey, number>; p3: Record<BotKey, number>; three: number; chainP90: number; flags: Record<string, number> }[] = [];
  for (let ch = 1; ch <= 8; ch++) {
    const rs = rows.filter((r) => Math.ceil(r.level / 10) === ch);
    if (!rs.length) continue;
    const per = (f: (r: Row, k: BotKey) => number) => Object.fromEntries(BOT_KEYS.map((k) => [k, mean(rs.map((r) => f(r, k)).filter(Number.isFinite))])) as Record<BotKey, number>;
    const fl: Record<string, number> = {};
    for (const r of rs) for (const f of allFlags.get(r.level) ?? []) fl[f] = (fl[f] ?? 0) + 1;
    out.push({
      ch,
      levels: rs.length,
      win: per((r, k) => r.bots[k].win),
      clearFrac: per((r, k) => r.bots[k].clear / r.clock),
      p3: per((r, k) => r.bots[k].p3),
      three: mean(rs.map((r) => r.three / r.clock)),
      chainP90: mean(rs.map((r) => r.bots.smart3.chainP90).filter(Number.isFinite)),
      flags: fl,
    });
  }
  return out;
}
