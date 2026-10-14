// EFFORT AUDIT (read-only measurement, t-bd0d6010): enemy effort (stage HP / time-to-kill) versus boss powers versus start
// variety versus player power, for all 80 levels. Nothing in src/ or levels.json is changed. Deterministic: fixed seeds
// (bot seed = level*1009 + i*7919, game seed = def.seed), no Math.random, no clock. Shipped pace (CALM) unless --pace.
// Parts write JSON into --out (default effort-audit-data, scratch, not committed); `--part report` turns them into docs/EFFORT_AUDIT.md.
//   npx vite-node tools/effort-audit.ts --part a --from 1 --to 20 --n 30        A: effort share (smart@3, random@2.5, planner on bosses)
//   npx vite-node tools/effort-audit.ts --part b --from 1 --to 40 --n 30        B: boss powers ON vs OFF (common random numbers)
//   npx vite-node tools/effort-audit.ts --part c                                C: start variety (layout / rank mix / units given)
//   npx vite-node tools/effort-audit.ts --part dsearch                          D: pick the squads (starter / gift / ceiling) per roster segment
//   npx vite-node tools/effort-audit.ts --part d --from 1 --to 20 --n 12        D: player power per level
//   npx vite-node tools/effort-audit.ts --part report [--write docs/EFFORT_AUDIT.md]
//   --effort            run with TUNING.effortModel ON (src/content/effortOverlay.json: boss / mini-boss HP); use a separate --out
//   --smart-only        part a: only the smart@3 runs (what tools/effort-fit.ts reads); the report then lacks random / planner columns
//   --levels 8,10,...   limit parts a / b / d to these levels (applied on top of --from / --to)
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { LEVELS, type LevelDef } from '../src/content/levels';
import { applyPace, DEFAULT_PACE } from '../src/content/experiments';
import { COLS, ROWS, TUNING, type Pace } from '../src/content/tuning';
import { TIER_OPEN_LEVEL, UNIT_GIFTS } from '../src/content/unlockPlan';
import { applyRoster1, applyRoster2, applyRoster3, applyRoster4, applyRoster5, applyRoster6, applyRoster7, levelMult, ROSTER_3_UNITS, ROSTER_5_UNITS, ROSTER_6_UNITS, ROSTER_7_UNITS, unitDef, type Rarity } from '../src/content/units';
import { ATTACK_COPY, BOSSES, BOSS_FIRST, castAttack, chapterBossIdx, type BossAttack, type BossTarget } from '../src/core/boss';
import { rawDamage } from '../src/core/cascade';
import { hitCap, choosePerk, drop, legalPairs, newLevel, previewMerge, tick, type GameEvent, type GameState } from '../src/core/game';
import { Rng } from '../src/core/rng';
import type { Family } from '../src/core/types';

const args = process.argv.slice(2);
const arg = (k: string) => (args.includes(k) ? args[args.indexOf(k) + 1] : undefined);
const PART = arg('--part') ?? 'help';
const FROM = Number(arg('--from')) || 1;
const TO = Number(arg('--to')) || LEVELS.length;
const N = Number(arg('--n')) || 30;
const NPLAN = Number(arg('--nplan')) || 6;
const SMART_ONLY = args.includes('--smart-only');
const EFFORT = args.includes('--effort');
if (EFFORT) TUNING.effortModel = true;
const ONLY = arg('--levels') ? new Set(arg('--levels')!.split(',').map(Number)) : null;
const OUT = arg('--out') ?? (EFFORT ? 'effort-audit-data-effort' : 'effort-audit-data');
const PACE = (arg('--pace') ?? DEFAULT_PACE) as Pace;
applyPace(PACE);
if (PART !== 'report' && PART !== 'help') mkdirSync(OUT, { recursive: true });
const save = (name: string, obj: unknown) => writeFileSync(`${OUT}/${name}.json`, JSON.stringify(obj));
const load = <T,>(name: string): T => JSON.parse(readFileSync(`${OUT}/${name}.json`, 'utf8')) as T;
const ofRange = (prefix: string) => (existsSync(OUT) ? readdirSync(OUT).filter((f) => f.startsWith(prefix) && f.endsWith('.json')).map((f) => JSON.parse(readFileSync(`${OUT}/${f}`, 'utf8'))) : []);

// ---------- statistics ----------
const mean = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : NaN);
const sd = (a: number[]) => {
  const m = mean(a);
  return Math.sqrt(a.reduce((x, y) => x + (y - m) ** 2, 0) / Math.max(1, a.length - 1));
};
/** mean with a 95% interval (normal approximation) */
const ci = (a: number[]): [number, number, number] => {
  const m = mean(a), h = (1.96 * sd(a)) / Math.sqrt(Math.max(1, a.length));
  return [m, m - h, m + h];
};
/** Wilson 95% interval for k of n */
const wilson = (k: number, n: number): [number, number, number] => {
  if (!n) return [NaN, NaN, NaN];
  const z = 1.96, p = k / n, d = 1 + (z * z) / n, c = p + (z * z) / (2 * n), h = z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n));
  return [p, (c - h) / d, (c + h) / d];
};
const f1 = (x: number) => (Number.isFinite(x) ? x.toFixed(1) : '-');
const pc = (x: number) => (Number.isFinite(x) ? `${Math.round(x * 100)}%` : '-');
const pcI = (t: [number, number, number]) => `${pc(t[0])} [${pc(Math.max(0, t[1]))}-${pc(Math.min(1, t[2]))}]`;
const numI = (t: [number, number, number], d = 1) => `${t[0].toFixed(d)} [${t[1].toFixed(d)}..${t[2].toFixed(d)}]`;
const chapterOf = (l: number) => Math.ceil(l / 10);
const isBossLevel = (d: LevelDef) => d.level % 10 === 0 && !d.teach;
const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
const entropy = (counts: number[]) => {
  const n = sum(counts);
  return -sum(counts.map((c) => (c / n) * Math.log2(c / n)));
};

// ---------- bots (same scoring as tools/level-report.ts) ----------
type Opt = { f: number; t: number; score: number };
const capOf = (s: GameState) => (s.goal ? Infinity : hitCap(s));
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
const top = (ops: Opt[]) => ops.reduce<Opt | undefined>((m, o) => (!m || o.score > m.score ? o : m), undefined);
const bestScore = (s: GameState) => options(s).reduce((m, o) => Math.max(m, o.score), 0);
type BotKey = 'rand25' | 'smart3' | 'plan3';
const BOTS: Record<BotKey, { every: number; pick: (s: GameState, rng: Rng) => Opt | undefined }> = {
  rand25: { every: 2.5, pick: (s, rng) => { const ops = options(s); return ops.length ? ops[rng.int(ops.length)] : undefined; } },
  smart3: { every: 3, pick: (s) => top(options(s)) },
  plan3: {
    every: 3,
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

// ---------- one instrumented run ----------
/** one boss cast: a attack, o outcome, r units removed, mv units moved, rs seconds taken, i bot decisions worse because of it, df defused, sv saved, oc cells under it, du seconds it lasts, pl phase */
interface Cast { a: string; o: string; r: number; mv: number; rs: number; i: number; df: number; sv: number; oc: number; du: number; pl: number }
/** w won, t elapsed s, clk the clock, m merges, d total damage, st stage end times, ch/nc chain size sum / count, c boss casts */
interface RunRec { w: number; t: number; clk: number; m: number; d: number; st: number[]; ch: number; nc: number; c: Cast[]; rk: number }
type Powers = 'on' | 'off' | 'noSecond';
interface Squad { shooter: Family; relays: [Family, Family]; helper?: Family; shLv?: number; rlLv?: number }
interface Cfg { powers?: Powers; probe?: boolean; squad?: Squad }
const PERSIST: Partial<Record<BossAttack, number>> = { slick: 4, portals: 4, tow: 4, blocks: 8 };
const DUR = [2, 3, 4];

function play(def: LevelDef, bk: BotKey, seed: number, cfg: Cfg = {}): RunRec {
  const bot = BOTS[bk];
  const sq = cfg.squad;
  const s = newLevel(def, sq ? { shooter: sq.shooter, relays: sq.relays, toys: sq.helper ? [sq.helper] : [] } : {});
  if (sq) {
    const m: Partial<Record<Family, number>> = {};
    const lv = (f: Family, l: number) => levelMult(unitDef(f) ?? [...ROSTER_3_UNITS, ...ROSTER_5_UNITS, ...ROSTER_6_UNITS, ...ROSTER_7_UNITS].find((u) => u.id === f), l);
    if (sq.shLv) m[sq.shooter] = lv(sq.shooter, sq.shLv);
    if (sq.rlLv) for (const r of sq.relays) m[r] = lv(r, sq.rlLv);
    s.unitMult = m;
  }
  const rec: RunRec = { w: 0, t: 0, clk: s.levelTime ?? def.time_seconds, m: 0, d: 0, st: [], ch: 0, nc: 0, c: [], rk: 0 };
  const off = cfg.powers === 'off';
  const saveAtk = TUNING.bossAttacks;
  if (off) TUNING.bossAttacks = false;
  try {
    const rng = new Rng(seed);
    let next = bot.every * (0.8 + 0.4 * rng.next());
    const lastOf = (a: string) => { for (let k = rec.c.length - 1; k >= 0; k--) if (rec.c[k].a === a) return rec.c[k]; return undefined; };
    const see = (ev: GameEvent[], player: boolean) => {
      for (const e of ev) {
        if (e.type === 'cascade' && player && !e.kickback) { rec.ch += e.result.count; rec.nc++; }
        else if (e.type === 'kill' && !e.demo && !e.final) rec.st.push(s.elapsed);
        else if (e.type === 'bossWarn') rec.c.push({ a: e.attack, o: '', r: 0, mv: 0, rs: 0, i: 0, df: 0, sv: 0, oc: 0, du: 0, pl: 0 });
        else if (e.type === 'bossHit') {
          const c = lastOf(e.attack);
          if (!c) continue;
          const t = e.target as BossTarget & { phase?: number };
          c.o = e.outcome;
          c.r = e.removedIds?.length ?? 0;
          c.mv = e.moves?.length ?? 0;
          c.pl = t.phase ?? 0;
          if (e.outcome === 'hit') {
            const occ = (i: number) => (s.grid[i] ? 1 : 0);
            const at = e.attack;
            if (at === 'clamp') c.oc = sum((t.cells ?? []).map(occ));
            else if (at === 'frost' || at === 'conveyor') c.oc = sum(Array.from({ length: COLS }, (_, k) => occ(t.row! * COLS + k)));
            else if (at === 'rest') c.oc = sum(Array.from({ length: COLS }, (_, k) => { const g = s.grid[t.row! * COLS + k]; return g && (g.family === 'coil' || g.family === 'bell') ? 1 : 0; }));
            else if (at === 'hot') c.oc = sum(Array.from({ length: ROWS }, (_, k) => { const g = s.grid[k * COLS + t.col!]; return g && ['cannon', 'rocket', 'mortar', 'arc_welder'].includes(g.family) ? 1 : 0; }));
            else if (at === 'split') c.oc = s.grid.filter((g) => g && (g.family === 'coil' || g.family === 'bell')).length;
            else if (at === 'blocks') c.oc = (t.cells ?? []).length;
            else if (at === 'bomb' || at === 'suction' || at === 'pull' || at === 'bounce' || at === 'mirror') c.oc = Math.max(c.r, c.mv);
            else c.oc = 2; // slick / portals / tow / ransom: two marked cells
            c.du = at === 'clamp' || at === 'frost' || at === 'hot' || at === 'rest' || at === 'split' ? DUR[c.pl] : PERSIST[at] ?? 0;
          }
        } else if (e.type === 'bossDefuse') { const c = lastOf(e.attack); if (c) c.df = 1; }
        else if (e.type === 'bossRansom') { const c = lastOf('ransom'); if (c) { if (e.saved) c.sv = 1; else c.rs = Math.min(e.cost, 2); } }
      }
    };
    while (s.phase === 'playing' || s.phase === 'choice') {
      if (s.phase === 'choice') { choosePerk(s, s.offer[0]); continue; }
      if (s.elapsed >= next) {
        next += bot.every * (0.8 + 0.4 * rng.next());
        const b = s.boss;
        if (cfg.probe && b && (b.active || b.blocks?.length)) {
          // does the standing hazard make the bot's best merge worse than it would be without it?
          const withH = top(options(s));
          const sa = b.active, sb = b.blocks;
          b.active = null; b.blocks = [];
          const without = top(options(s));
          b.active = sa; b.blocks = sb;
          if ((withH?.score ?? 0) < (without?.score ?? 0) - 1e-9) {
            const c = lastOf(sa ? castAttack(b, sa) : 'blocks');
            if (c) c.i++;
          }
        }
        const o = bot.pick(s, rng);
        if (o) see(drop(s, o.f, o.t, s.grid[o.f]!.id).events, true);
      }
      see(tick(s), false);
      if (cfg.powers === 'noSecond' && s.boss?.pending) {
        const def2 = BOSSES[s.boss.def].second;
        if (def2 && castAttack(s.boss, s.boss.pending) === def2) {
          const c = rec.c[rec.c.length - 1];
          if (c && c.a === def2) rec.c.pop();
          s.boss.pending = null;
        }
      }
    }
    rec.w = s.phase === 'won' ? 1 : 0;
    rec.t = Math.round(s.elapsed * 20) / 20;
    rec.m = s.stats.merges;
    rec.d = Math.round(s.stats.totalDamage);
    rec.rk = s.stats.bestRank;
    if (rec.w) rec.st.push(s.elapsed);
    rec.st = rec.st.map((x) => Math.round(x * 20) / 20);
  } finally {
    TUNING.bossAttacks = saveAtk;
  }
  return rec;
}
const seedOf = (def: LevelDef, i: number) => def.level * 1009 + i * 7919;
const many = (def: LevelDef, bk: BotKey, n: number, cfg: Cfg = {}) => Array.from({ length: n }, (_, i) => play(def, bk, seedOf(def, i + 1), cfg));
const levelsIn = () => LEVELS.filter((d) => d.level >= FROM && d.level <= TO && (!ONLY || ONLY.has(d.level)));
const hasPower = (d: LevelDef) => { const s = newLevel(d); return !!(s.boss || s.stage?.boss); };
const effortHps = (d: LevelDef) => { const s = newLevel(d); return s.stage ? s.stage.hps : [d.hp]; };

// ================= PART A =================
if (PART === 'a') {
  for (const d of levelsIn()) {
    const boss = isBossLevel(d) || !!d.mini_boss;
    const runs: Record<string, RunRec[]> = { smart3: many(d, 'smart3', N), ...(SMART_ONLY ? {} : { rand25: many(d, 'rand25', N) }) };
    if (boss && !SMART_ONLY) runs.plan3 = many(d, 'plan3', NPLAN);
    for (const k of Object.keys(runs)) runs[k].forEach((r) => (r.c = []));
    save(`a_${String(d.level).padStart(2, '0')}`, { level: d.level, hps: effortHps(d), goal: d.goal ? `${d.goal.kind}${d.goal.n}` : '', boss: isBossLevel(d), mini: !!d.mini_boss, runs });
    console.log(`A L${d.level} done`);
  }
}

// ================= PART B =================
if (PART === 'b') {
  for (const d of levelsIn()) {
    if (!hasPower(d)) continue;
    const chapter = isBossLevel(d);
    const arms: Powers[] = chapter && BOSSES[chapterBossIdx(d.level)].second ? ['on', 'off', 'noSecond'] : ['on', 'off'];
    const out: Record<string, Record<string, RunRec[]>> = {};
    for (const bk of ['smart3', 'rand25', ...(chapter || d.mini_boss ? ['plan3'] : [])] as BotKey[]) {
      out[bk] = {};
      for (const p of arms) out[bk][p] = many(d, bk, bk === 'plan3' ? NPLAN : N, { powers: p, probe: p === 'on' });
    }
    const s = newLevel(d);
    const bdef = BOSSES[(s.boss ?? s.stage!.boss!).def];
    save(`b_${String(d.level).padStart(2, '0')}`, { level: d.level, name: bdef.name, attack: bdef.attack, second: bdef.second ?? '', light: !!s.boss?.light, mini: !!bdef.mini, behaviour: d.behaviour ?? '', out });
    console.log(`B L${d.level} done`);
  }
}

// ================= PART C =================
interface StartRec { level: number; teach: boolean; layout: string; rankMix: string; units: string; deliveries: string; vLayout: string; vRankMix: string }
function startOf(d: LevelDef, varied: boolean) {
  TUNING.variedOpenings = varied;
  const s = newLevel(d);
  TUNING.variedOpenings = false;
  const cells = s.grid.map((g, i) => (g ? { i, f: g.family, r: g.rank } : null)).filter(Boolean) as { i: number; f: string; r: number }[];
  const masked = [...(s.masked ?? [])].sort((a, b) => a - b).join(',');
  const layout = cells.map((c) => `${c.i}:${c.f}`).join(' ') + ` #${masked}`;
  const rankMix = cells.map((c) => `${c.f}${c.r}`).sort().join(' ');
  return { s, layout, rankMix };
}
if (PART === 'c') {
  const recs: StartRec[] = LEVELS.map((d) => {
    const base = startOf(d, false);
    const v = startOf(d, true);
    // first parts the game hands over: the smart bot plays 20 s, the first 6 deliveries are recorded (no perks exist in saga levels)
    const s = newLevel(d);
    const rng = new Rng(seedOf(d, 1));
    const got: string[] = [];
    let next = 3 * (0.8 + 0.4 * rng.next());
    while (s.phase === 'playing' && s.elapsed < 20 && got.length < 6) {
      if (s.elapsed >= next) {
        next += 3 * (0.8 + 0.4 * rng.next());
        const o = BOTS.smart3.pick(s, rng);
        if (o) drop(s, o.f, o.t, s.grid[o.f]!.id);
      }
      for (const e of tick(s)) if (e.type === 'delivery' && got.length < 6) got.push(`${e.gadget.family}${e.gadget.rank}`);
    }
    const gift = UNIT_GIFTS.filter((g) => g.level === d.level - 1).map((g) => g.unit).join('+');
    const bag = d.teach?.bag ? JSON.stringify(d.teach.bag) : 'std';
    const units = `fam[${base.rankMix.replace(/\d+/g, '').split(' ').sort().join(' ')}] bag=${bag} item=${d.item_teach ?? '-'} shooter=${d.shooter ?? '-'} gift=${gift || '-'}`;
    return { level: d.level, teach: !!d.teach, layout: base.layout, rankMix: base.rankMix, units, deliveries: got.join(' '), vLayout: v.layout, vRankMix: v.rankMix };
  });
  save('c_starts', recs);
  console.log(`C done: ${recs.length} levels`);
}

// ================= PART D =================
const ROSTERS = () => { applyRoster1(true); applyRoster2(true); applyRoster3(true); applyRoster4(true); applyRoster5(true); applyRoster6(true); applyRoster7(true); };
/** unit levels the plan expects per chapter (tools/sim-levels.ts EXPECT: shooter, relays) */
const EXPECT = [[1.5, 1.5], [2.5, 2.5], [3, 2.5], [3.5, 3], [4, 3.5], [4.5, 4], [5, 4.5], [5.5, 5]];
const BASE_SQ: Squad = { shooter: 'cannon', relays: ['coil', 'bell'] };
const withLv = (q: Squad, L: number): Squad => ({ ...q, shLv: EXPECT[chapterOf(L) - 1][0], rlLv: EXPECT[chapterOf(L) - 1][1] });
const GIFT_BREAKS = [...UNIT_GIFTS.map((g) => g.level + 1), ...Object.values(TIER_OPEN_LEVEL).map((l) => l + 1)];
const SEG_STARTS = [1, ...[...new Set(GIFT_BREAKS)].sort((a, b) => a - b)];
const segOf = (L: number) => SEG_STARTS.filter((x) => x <= L).length - 1;
const RARITY_RANK: Record<Rarity, number> = { common: 0, rare: 1, epic: 2, legendary: 3 };
/** units owned for sure at level L (starters + gifts of cleared levels) and the best of every open rarity (crates are luck: ceiling) */
function pools(L: number, ceiling: boolean) {
  const gifts = UNIT_GIFTS.filter((g) => g.level < L).map((g) => g.unit);
  const open = (id: string) => {
    const u = unitDef(id) ?? [...ROSTER_3_UNITS, ...ROSTER_5_UNITS, ...ROSTER_6_UNITS, ...ROSTER_7_UNITS].find((x) => x.id === id);
    if (!u) return false;
    const cleared = L - 1;
    const maxR = cleared >= TIER_OPEN_LEVEL.wood ? 2 : -1; // every tier can drop up to Epic; Legendary needs crates B (off)
    return RARITY_RANK[u.rarity] <= maxR;
  };
  const has = (id: string) => ['cannon', 'coil', 'bell', 'fan'].includes(id) || gifts.includes(id) || (ceiling && open(id));
  const ids = ['nail_gun', 'jackhammer', 'saw_blade', 'blowtorch', 'rocket', 'mortar', 'arc_welder', 'piston', 'wrecking_ball', 'rivet_gun', 'hydraulic_press', 'lathe', 'gear', 'horn', 'fuse_box', 'spring', 'belt_drive', 'pipe', 'capacitor', 'ladder', 'vice', 'router', 'magnet', 'battery', 'amplifier', 'signal_beacon', 'wrench'];
  const pick = (xs: string[]) => xs.filter(has) as Family[];
  return {
    shooters: ['cannon' as Family, ...pick(ids.slice(0, 12))],
    relays: ['coil' as Family, 'bell' as Family, ...pick(ids.slice(12, 22))],
    helpers: [undefined, 'fan' as Family, ...pick(ids.slice(22))] as (Family | undefined)[],
  };
}
const dps = (rs: RunRec[]) => mean(rs.map((r) => r.d / Math.max(1, r.t)));
function repLevel(seg: number): LevelDef {
  const lo = SEG_STARTS[seg], hi = (SEG_STARTS[seg + 1] ?? 81) - 1;
  const mid = Math.floor((lo + hi) / 2);
  const ok = LEVELS.filter((d) => d.level >= lo && d.level <= hi && !d.goal && !d.behaviour && !d.mini_boss && !isBossLevel(d) && !d.teach && !d.shooter && (d.waves ?? 1) >= 2);
  return ok.sort((a, b) => Math.abs(a.level - mid) - Math.abs(b.level - mid))[0] ?? LEVELS[mid - 1];
}
function evalSquad(d: LevelDef, q: Squad, n: number) {
  try { return dps(many(d, 'smart3', n, { squad: withLv(q, d.level) })); } catch { return 0; }
}
if (PART === 'dsearch') {
  ROSTERS();
  const segs = SEG_STARTS.map((start, seg) => {
    const d = repLevel(seg);
    const pick = (ceiling: boolean) => {
      const P = pools(start, ceiling);
      let q: Squad = { ...BASE_SQ };
      let best = evalSquad(d, q, 8);
      for (const sh of P.shooters) { const c = { ...q, shooter: sh }; const v = evalSquad(d, c, 8); if (v > best * 1.001) [q, best] = [c, v]; }
      const pairs: [Family, Family][] = [];
      for (const a of P.relays) for (const b of P.relays) if (a !== b) pairs.push([a, b]);
      const cheap = pairs.filter(([a, b]) => ['coil', 'bell'].includes(a) || ['coil', 'bell'].includes(b));
      for (const r of cheap) { const c = { ...q, relays: r }; const v = evalSquad(d, c, 8); if (v > best * 1.001) [q, best] = [c, v]; }
      for (const h of P.helpers) { const c = { ...q, helper: h }; const v = evalSquad(d, c, 8); if (v > best * 1.001) [q, best] = [c, v]; }
      return { squad: q, dps: best };
    };
    const gift = pick(false), ceil = pick(true);
    console.log(`D seg ${start}: rep L${d.level} gift ${JSON.stringify(gift.squad)} ceiling ${JSON.stringify(ceil.squad)}`);
    return { start, rep: d.level, gift: gift.squad, ceiling: ceil.squad, giftDps: gift.dps, ceilDps: ceil.dps };
  });
  save('d_segments', segs);
}
if (PART === 'd') {
  ROSTERS();
  const segs = load<{ start: number; gift: Squad; ceiling: Squad }[]>('d_segments');
  for (const d of levelsIn()) {
    const sg = segs[segOf(d.level)];
    const arms: Record<string, { squad: Squad; recs: RunRec[] }> = {};
    const defs: Record<string, Squad> = { starter1: { ...BASE_SQ }, starterE: withLv(BASE_SQ, d.level), gift: withLv(sg.gift, d.level), ceiling: withLv(sg.ceiling, d.level) };
    for (const [k, q] of Object.entries(defs)) arms[k] = { squad: q, recs: many(d, 'smart3', N, { squad: q }) };
    save(`d_${String(d.level).padStart(2, '0')}`, { level: d.level, hps: effortHps(d), goal: d.goal ? `${d.goal.kind}${d.goal.n}` : '', clk: arms.starter1.recs[0].clk, arms });
    console.log(`D L${d.level} done`);
  }
}

// ================= REPORT =================
interface ALevel { level: number; hps: number[]; goal: string; boss: boolean; mini: boolean; runs: Record<string, RunRec[]> }
interface BLevel { level: number; name: string; attack: string; second: string; light: boolean; mini: boolean; behaviour: string; out: Record<string, Record<string, RunRec[]>> }
interface DLevel { level: number; hps: number[]; goal: string; clk: number; arms: Record<string, { squad: Squad; recs: RunRec[] }> }
const sq2s = (q: Squad) => `${q.shooter}/${q.relays.join('+')}${q.helper ? `/+${q.helper}` : ''}`;

const ABILITY: Record<BossAttack, { does: string; cadence: string; board: string; counter: string }> = {
  clamp: { does: 'marked top-rank machine cannot be dragged or dropped on for 2/3/4 s (by armor phase)', cadence: 'every bossEvery from first at 8 s', board: '1 cell', counter: 'merge or move the marked machine in the warning window' },
  frost: { does: 'a row cannot receive new parts for 2/3/4 s', cadence: 'as above', board: '5 cells (the emptiest row)', counter: 'build in other rows; parts land elsewhere' },
  suction: { does: 'the 1 (2 in final phase) lowest-rank machines vanish at the deadline', cadence: 'as above', board: '1-2 cells', counter: 'merge or move the marked machines' },
  hot: { does: 'shooters in one column hit half as hard for 2/3/4 s (passive shots too)', cadence: 'as above', board: 'up to 6 cells (a column)', counter: 'move shooters out of the column' },
  rest: { does: 'coils/bells in one row wake nobody for 2/3/4 s', cadence: 'as above', board: 'up to 5 cells (a row)', counter: 'move relays out of the row' },
  split: { does: 'links cannot cross one column boundary for 2/3/4 s', cadence: 'as above', board: 'whole board (relay links)', counter: 'chain on one side' },
  bomb: { does: 'removes the lowest-rank (<= 2) neighbour of one empty cell at the deadline', cadence: 'mini-boss / final-phase second attack', board: '1 cell + neighbours', counter: 'move a machine onto the bomb cell or wake a neighbour in a chain' },
  conveyor: { does: 'a row shifts one cell right, wrapping', cadence: 'as above', board: 'up to 5 cells', counter: 'plan the new neighbours' },
  mirror: { does: 'the highest-rank and the lowest-rank machine swap places', cadence: 'as above', board: '2 cells', counter: 'none beyond moving them first' },
  blocks: { does: 'up to 2 empty cells next to machines become junk for 8 s', cadence: 'as above', board: '2 cells', counter: 'fire a chain beside a block to clear it' },
  pull: { does: 'the highest-rank machine with an empty cell above moves up one cell', cadence: 'as above', board: '2 cells', counter: 'fill the cell above' },
  bounce: { does: 'the most surrounded machine jumps to the farthest empty cell', cadence: 'as above', board: '2 cells', counter: 'none' },
  slick: { does: 'a dropped machine slides one cell along an arrow for 4 s', cadence: 'as above', board: '2 cells', counter: 'avoid dropping on the oil' },
  portals: { does: 'two empty cells become portals for 4 s (a shortcut, helps the player)', cadence: 'as above', board: '2 cells', counter: 'use them' },
  tow: { does: 'two linked machines move together for 4 s', cadence: 'as above', board: '2 cells', counter: 'merge either to release' },
  ransom: { does: 'takes 2 s from the clock unless both marked machines wake in one chain', cadence: 'as above', board: '2 cells', counter: 'chain through both' },
};

function report() {
  const MINI = new Set(LEVELS.filter((d) => d.mini_boss).map((d) => d.level));
  const L: string[] = [];
  const P = (s = '') => L.push(s);
  const A = (ofRange('a_') as ALevel[]).sort((x, y) => x.level - y.level);
  const B = (ofRange('b_') as BLevel[]).filter((x) => x.out).sort((x, y) => x.level - y.level);
  const C = existsSync(`${OUT}/c_starts.json`) ? load<StartRec[]>('c_starts') : [];
  const D = (ofRange('d_') as DLevel[]).filter((x) => x.arms).sort((x, y) => x.level - y.level);
  const SEGS = existsSync(`${OUT}/d_segments.json`) ? load<{ start: number; rep: number; gift: Squad; ceiling: Squad; giftDps: number; ceilDps: number }[]>('d_segments') : [];
  const n0 = A[0]?.runs.smart3.length ?? 0;
  const summary: string[] = [];

  // ---------- A ----------
  const rowsA = A.map((a) => {
    const nonGoalHps = a.hps;
    const last = nonGoalHps[nonGoalHps.length - 1];
    const hpTot = sum(nonGoalHps);
    const goalLast = !!a.goal;
    const hpShare = goalLast ? 0 : last / hpTot;
    const won = a.runs.smart3.filter((r) => r.w);
    const shares = won.map((r) => { const k = r.st.length; return k ? (r.st[k - 1] - (k > 1 ? r.st[k - 2] : 0)) / r.t : NaN; });
    const lastDur = won.map((r) => { const k = r.st.length; return k ? r.st[k - 1] - (k > 1 ? r.st[k - 2] : 0) : NaN; });
    const tShare = ci(shares.filter(Number.isFinite));
    const r25 = a.runs.rand25.filter((r) => r.w).map((r) => { const k = r.st.length; return k ? (r.st[k - 1] - (k > 1 ? r.st[k - 2] : 0)) / r.t : NaN; });
    const pl = (a.runs.plan3 ?? []).filter((r) => r.w).map((r) => { const k = r.st.length; return k ? (r.st[k - 1] - (k > 1 ? r.st[k - 2] : 0)) / r.t : NaN; });
    const winS = wilson(a.runs.smart3.filter((r) => r.w).length, a.runs.smart3.length);
    return { a, hpShare, goalLast, tShare, lastDur: mean(lastDur.filter(Number.isFinite)), r25: mean(r25.filter(Number.isFinite)), pl: mean(pl.filter(Number.isFinite)), winS, stages: a.hps.length, hpTot };
  });
  P('## A. Effort share: how much of a level is its last machine');
  P();
  P(`n = ${n0} smart@3 runs and ${A[0]?.runs.rand25.length ?? 0} random@2.5 runs per level (planner n = ${NPLAN} on boss/mini levels), shipped pace ${PACE}. HP share = last stage HP / all stage HP (static, from \`newLevel\`). Time share = (time from the second-to-last kill to the win) / clear time, smart bot, winning runs only, mean with 95% interval. "last" = the boss on boss/mini levels, the goal machine on goal levels, else the last ordinary machine (levels 1-2 are one machine = 100%).`);
  P();
  P('| L | type | stages (HP) | last HP share | last time share smart@3 | random@2.5 | planner | last stage secs | smart win |');
  P('|---|---|---|---|---|---|---|---|---|');
  for (const r of rowsA) {
    const type = r.a.boss ? 'BOSS' : r.a.mini ? 'mini' : r.a.goal ? `goal ${r.a.goal}` : r.stages > 1 ? 'staged' : 'single';
    P(`| ${r.a.level} | ${type} | ${r.a.hps.join('/')} | ${r.goalLast ? 'goal (no HP)' : pc(r.hpShare)} | ${pcI(r.tShare)} | ${pc(r.r25)} | ${pc(r.pl)} | ${f1(r.lastDur)} | ${pcI(r.winS)} |`);
  }
  P();
  const bosses = rowsA.filter((r) => r.a.boss || r.a.mini);
  const under = (rs: typeof rowsA, f: (r: (typeof rowsA)[0]) => number) => rs.filter((r) => Number.isFinite(f(r)) && f(r) < 0.5).length;
  const bossHp = bosses.filter((r) => !r.goalLast);
  P(`**Last boss under 50% of the level's effort** (strict <50%): by HP ${under(bossHp, (r) => r.hpShare)} of ${bossHp.length} boss+mini levels (the HP split is built as exactly 50% boss / 50% minions, so rounding decides); by smart@3 time ${under(bosses, (r) => r.tShare[0])} of ${bosses.length}; by smart@3 time with the interval's upper end under 50%: ${bosses.filter((r) => r.tShare[2] < 0.5).length}. Chapter bosses only (8): HP ${under(rowsA.filter((r) => r.a.boss), (r) => r.hpShare)}, time ${under(rowsA.filter((r) => r.a.boss), (r) => r.tShare[0])}. All 80 levels, last machine under 50% by time: ${under(rowsA, (r) => r.tShare[0])} (ordinary staged levels are designed with a 30% ramp, so the last machine is about 28-36%: that is not a boss).`);
  summary.push(`Last boss share: by HP every chapter boss is exactly 50% (minions 50%); by smart@3 time it is ${pc(mean(rowsA.filter((r) => r.a.boss).map((r) => r.tShare[0])))} on average (${under(rowsA.filter((r) => r.a.boss), (r) => r.tShare[0])} of 8 chapter bosses under 50%, ${under(bosses, (r) => r.tShare[0])} of ${bosses.length} boss+mini levels).`);
  P();
  P('Histogram of the last machine\'s time share (smart@3), all levels with data:');
  P();
  P('| share | levels | which |');
  P('|---|---|---|');
  for (let b = 0; b < 10; b++) {
    const ls = rowsA.filter((r) => Number.isFinite(r.tShare[0]) && Math.min(9, Math.floor(r.tShare[0] * 10)) === b);
    P(`| ${b * 10}-${b * 10 + 10}% | ${ls.length} | ${ls.map((r) => r.a.level).join(' ')} |`);
  }
  P();
  P('Per chapter (mean over the chapter\'s levels):');
  P();
  P('| chapter | levels | mean last HP share (staged, non-goal) | mean last time share (all) | boss level time share | boss HP share | boss+mini under 50% (time) |');
  P('|---|---|---|---|---|---|---|');
  for (let ch = 1; ch <= 8; ch++) {
    const rs = rowsA.filter((r) => chapterOf(r.a.level) === ch);
    if (!rs.length) continue;
    const bs = rs.find((r) => r.a.boss);
    const bm = rs.filter((r) => r.a.boss || r.a.mini);
    P(`| ${ch} | ${rs.length} | ${pc(mean(rs.filter((r) => !r.goalLast && r.stages > 1).map((r) => r.hpShare)))} | ${pc(mean(rs.map((r) => r.tShare[0]).filter(Number.isFinite)))} | ${bs ? pcI(bs.tShare) : '-'} | ${bs ? pc(bs.hpShare) : '-'} | ${bm.filter((r) => r.tShare[0] < 0.5).length}/${bm.length} |`);
  }
  P();
  P('10 worst levels, metric A (lowest last-boss time share among the 16 boss/mini levels):');
  P();
  P('| rank | L | type | time share | HP share |');
  P('|---|---|---|---|---|');
  [...bosses].filter((r) => Number.isFinite(r.tShare[0])).sort((x, y) => x.tShare[0] - y.tShare[0]).slice(0, 10).forEach((r, i) => P(`| ${i + 1} | ${r.a.level} | ${r.a.boss ? 'BOSS' : 'mini'} | ${pcI(r.tShare)} | ${pc(r.hpShare)} |`));
  P();

  // ---------- B ----------
  P('## B. Boss power impact: powers ON vs OFF (common random numbers)');
  P();
  P(`Every ability, from \`src/core/boss.ts\` (cadence under ${PACE}: first cast ${BOSS_FIRST} s after the boss wakes, then every ${TUNING.bossEvery} s, ${TUNING.bossWarn} s warning; ordinary-monster "light" behaviours first at 10 s then every ${TUNING.lightEvery} s; a clamp/frost/hot/rest/split effect lasts 2/3/4 s by armor phase):`);
  P();
  P('| attack | name in game | what it does | board footprint | counterplay | player sees (code: GameScene.ts bossWarn ~l.2407, board cells ~l.5521) |');
  P('|---|---|---|---|---|---|');
  for (const [k, v] of Object.entries(ABILITY)) P(`| ${k} | ${ATTACK_COPY[k as BossAttack].what} | ${v.does} | ${v.board} | ${v.counter} | beam + sound + event text on every target cell (row/column/boundary attacks: pulsing marked cells), lesson card the first time; effect text on hit |`);
  P();
  P('A/B method: the same level, the same game seed and the same bot seed run twice: ON (shipped) and OFF (`TUNING.bossAttacks = false`, the MANIA switch, so no boss or light-monster cast at all). Chapter bosses get a third arm NOSEC (the final-phase second attack cancelled at its warning). Runs stay identical until the first cast changes the board, so most of the difference is the power itself. "Time cost" = mean(elapsed ON - elapsed OFF) as a share of the level clock, a loss counting as the whole clock (win and speed in one number). "Identical" = ON and OFF ended with the same win, time and damage (the power changed nothing at all). "Felt" cast = it removed or moved a machine, took clock time, placed junk, or the standing hazard made the bot\'s best merge worse; "board effect" adds hazards that merely sat on occupied cells.');
  P();
  const cellsOf = (rs: RunRec[]) => rs.flatMap((r) => r.c);
  interface Impact { L: number; name: string; atk: string; bot: string; n: number; casts: number; castsRun: number; board: number; felt: number; resp: number; neverFelt: number[]; ident: number[]; dwin: [number, number, number]; cost: [number, number, number]; dm: [number, number, number]; flips: [number, number]; lost: number; secs: number; cells: number; score: number }
  const imp: Impact[] = [];
  const contrast = (b: BLevel, bot: string, on: string, offArm: string, label: string, only?: string): Impact | null => {
    const X0 = b.out[bot]?.[on], Y = b.out[bot]?.[offArm];
    if (!X0 || !Y) return null;
    const X = X0.map((r) => ({ ...r, c: r.c.filter((c) => !only || c.a === only) }));
    const cs = cellsOf(X);
    const felt = (c: Cast) => c.r > 0 || c.mv > 0 || c.rs > 0 || c.i > 0 || (c.a === 'blocks' && c.o === 'hit' && c.oc > 0);
    const board = (c: Cast) => c.o === 'hit' && (felt(c) || c.oc > 0);
    const dwin = ci(X.map((r, i) => r.w - Y[i].w));
    const cost = ci(X.map((r, i) => (r.t - Y[i].t) / r.clk));
    const dm = ci(X.map((r, i) => r.m - Y[i].m));
    const ident = X.map((r, i) => (r.w === Y[i].w && r.t === Y[i].t && r.d === Y[i].d ? 1 : 0));
    const neverFelt = X.map((r) => (r.c.some((c) => felt(c) || c.df || c.sv) ? 0 : 1));
    return {
      L: b.level, name: b.light ? 'ordinary monster (light)' : b.name, atk: label, bot, n: X.length,
      casts: cs.length, castsRun: cs.length / X.length, board: cs.length ? cs.filter(board).length / cs.length : NaN, felt: cs.length ? cs.filter(felt).length / cs.length : NaN, resp: cs.length ? cs.filter((c) => c.df || c.sv).length / cs.length : NaN,
      neverFelt, ident, dwin, cost, dm, flips: [X.filter((r, i) => r.w && !Y[i].w).length, X.filter((r, i) => !r.w && Y[i].w).length], lost: mean(X.map((r) => sum(r.c.map((c) => c.r)))), secs: mean(X.map((r) => sum(r.c.map((c) => c.rs)))), cells: mean(X.map((r) => sum(r.c.filter((c) => c.o === 'hit').map((c) => c.oc)))), score: Math.abs(cost[0]),
    } as Impact & { hit?: number };
  };
  for (const b of B)
    for (const bot of Object.keys(b.out)) {
      const arms = Object.keys(b.out[bot]);
      const sec = b.light ? '' : b.second;
      const nm = b.light ? `light ${b.attack}` : b.attack;
      const cs: (Impact | null)[] = [contrast(b, bot, 'on', 'off', sec ? `${nm}+${sec} (all)` : nm)];
      if (arms.includes('noSecond')) {
        cs.push(contrast(b, bot, 'noSecond', 'off', `${nm} (primary only)`));
        cs.push(contrast(b, bot, 'on', 'noSecond', `${sec} (second)`, sec));
      }
      for (const c of cs) if (c) imp.push(c);
    }
  const table = (bot: string, filter?: (i: Impact) => boolean) => {
    P('| L | boss / monster | attack | n | casts/run | board effect | felt | player responded | runs never felt | identical runs | win ON-OFF [95%] | flips (won only ON / only OFF) | time cost % clock [95%] | merges ON-OFF | units lost/run | clock s taken/run |');
    P('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
    for (const i of imp.filter((x) => x.bot === bot && (!filter || filter(x))))
      P(`| ${i.L} | ${i.name} | ${i.atk} | ${i.n} | ${i.castsRun.toFixed(1)} | ${pc(i.board)} | ${pc(i.felt)} | ${pc(i.resp)} | ${pc(mean(i.neverFelt))} | ${pc(mean(i.ident))} | ${numI(i.dwin, 2)} | ${i.flips[0]}/${i.flips[1]} | ${numI([i.cost[0] * 100, i.cost[1] * 100, i.cost[2] * 100], 1)} | ${numI(i.dm, 1)} | ${i.lost.toFixed(2)} | ${i.secs.toFixed(1)} |`);
    P();
  };
  P('### B1. Smart bot @3 s (per level; "ON vs OFF" rows are all powers; on chapter bosses the second row is the final-phase second attack alone, ON vs NOSEC)');
  P();
  table('smart3');
  P('### B2. Random bot @2.5 s');
  P();
  table('rand25');
  const hasPlan = imp.some((x) => x.bot === 'plan3');
  if (hasPlan) { P(`### B3. Planner @3 s (n = ${NPLAN} per arm: wide intervals, read as a sanity check only)`); P(); table('plan3'); }
  // pooled by attack
  P('### B4. Pooled per attack (smart@3 and random@2.5 together, ON vs OFF rows of levels where the attack is the only or the first attack; chapter bosses\' second attack shown separately)');
  P();
  P('| attack | levels | casts | board effect | felt | responded | whiff | runs never felt | identical runs | time cost % clock [95%] | win ON-OFF |');
  P('|---|---|---|---|---|---|---|---|---|---|---|');
  const byAtk = new Map<string, Impact[]>();
  for (const i of imp.filter((x) => x.bot !== 'plan3' && !x.atk.includes('(all)'))) {
    const key = i.atk.replace(/^light /, '').replace(' (primary only)', '').replace(/^(\w+) \(second\)$/, '$1 [as second attack]');
    byAtk.set(key, [...(byAtk.get(key) ?? []), i]);
  }
  // ON vs OFF rows of chapter bosses (primary+second) are listed under the boss in B1; pool only single-attack rows plus the NOSEC contrasts
  for (const [k, is] of [...byAtk.entries()].sort()) {
    const cs = sum(is.map((i) => i.casts));
    const w = (f: (i: Impact) => number) => sum(is.map((i) => (Number.isFinite(f(i)) ? f(i) * i.casts : 0))) / Math.max(1, cs);
    const ns = sum(is.map((i) => i.n));
    const cost = is.map((i) => i.cost[0] * i.n);
    const dw = is.map((i) => i.dwin[0] * i.n);
    const whiff = is.map((i) => 1 - i.board * 1);
    P(`| ${k} | ${[...new Set(is.map((i) => i.L))].join(' ')} | ${cs} | ${pc(w((i) => i.board))} | ${pc(w((i) => i.felt))} | ${pc(w((i) => i.resp))} | ${pc(w((i) => 1 - i.board) * 1 + 0 * mean(whiff))} | ${pc(sum(is.map((i) => mean(i.neverFelt) * i.n)) / ns)} | ${pc(sum(is.map((i) => mean(i.ident) * i.n)) / ns)} | ${(sum(cost) / ns * 100).toFixed(1)} | ${(sum(dw) / ns).toFixed(3)} |`);
  }
  P();
  P('### B5. Ranking: boss / monster powers by impact (smart@3, ON vs OFF, largest absolute time cost first)');
  P();
  P('| rank | L | boss | attack | time cost % clock [95%] | win ON-OFF | runs never felt | significant (interval excludes 0) |');
  P('|---|---|---|---|---|---|---|---|');
  const rank = imp.filter((x) => x.bot === 'smart3' && !x.atk.includes('primary') && !x.atk.includes('second')).sort((x, y) => y.score - x.score);
  rank.forEach((i, k) => P(`| ${k + 1} | ${i.L} | ${i.name} | ${i.atk} | ${numI([i.cost[0] * 100, i.cost[1] * 100, i.cost[2] * 100], 1)} | ${i.dwin[0].toFixed(2)} | ${pc(mean(i.neverFelt))} | ${i.cost[1] > 0 || i.cost[2] < 0 ? 'yes' : 'no'} |`));
  P();
  const sig = rank.filter((i) => i.cost[1] > 0 || i.cost[2] < 0);
  const smartRank = rank;
  summary.push(`Boss powers: of ${smartRank.length} powered levels, ${sig.length} show a time cost whose 95% interval excludes zero (smart@3); the mean absolute time cost is ${(mean(smartRank.map((i) => Math.abs(i.cost[0]))) * 100).toFixed(1)}% of the clock, ${pc(mean(smartRank.flatMap((i) => i.ident)))} of paired runs are byte-identical ON vs OFF, and ${pc(mean(smartRank.flatMap((i) => i.neverFelt)))} of runs never felt a single cast.`);
  P('10 worst levels, metric B (weakest powers: smallest absolute time cost, smart@3):');
  P();
  P('| rank | L | boss | attack | time cost % clock | identical runs | never felt |');
  P('|---|---|---|---|---|---|---|');
  [...rank].reverse().slice(0, 10).forEach((i, k) => P(`| ${k + 1} | ${i.L} | ${i.name} | ${i.atk} | ${numI([i.cost[0] * 100, i.cost[1] * 100, i.cost[2] * 100], 1)} | ${pc(mean(i.ident))} | ${pc(mean(i.neverFelt))} |`));
  P();

  // ---------- C ----------
  P('## C. Start variety');
  P();
  if (C.length) {
    const groups = (xs: StartRec[], key: (r: StartRec) => string) => { const m = new Map<string, number[]>(); for (const r of xs) m.set(key(r), [...(m.get(key(r)) ?? []), r.level]); return [...m.entries()].sort((a, b) => b[1].length - a[1].length); };
    const dims: [string, (r: StartRec) => string][] = [
      ['layout (cells + families + blocked cells)', (r) => r.layout],
      ['rank mix (family+rank multiset, cells ignored)', (r) => r.rankMix],
      ['units given (families on board, bag, item, shooter, gift)', (r) => r.units],
      ['first 6 parts delivered (smart bot, 20 s)', (r) => r.deliveries],
      ['whole designed start (layout + rank mix + units given; deliveries excluded: they depend on how the bot plays)', (r) => `${r.layout}|${r.rankMix}|${r.units}`],
      ['layout, varied-openings flag ON', (r) => r.vLayout],
      ['whole start, varied-openings flag ON', (r) => `${r.vLayout}|${r.vRankMix}|${r.units}`],
    ];
    const scopes: [string, StartRec[]][] = [['all 80', C], ['77 non-teach', C.filter((r) => !r.teach)], ['ordinary only (no teach, boss, mini)', C.filter((r) => !r.teach && r.level % 10 !== 0 && !MINI.has(r.level))]];
    P('Start = what `newLevel(def)` hands the player (default loadout, shipped flags; the flag-ON rows use `TUNING.variedOpenings`, default OFF). "Identical-start share" = share of levels whose start equals at least one other level\'s on that axis; "pair share" = share of level pairs that are identical on it; "effective starts" = 2^entropy.');
    P();
    P('| axis | scope | distinct | levels sharing with another | pair share | largest group | effective starts |');
    P('|---|---|---|---|---|---|---|');
    for (const [name, key] of dims)
      for (const [sn, xs] of scopes) {
        const g = groups(xs, key);
        const shared = sum(g.filter(([, ls]) => ls.length > 1).map(([, ls]) => ls.length));
        const pairs = sum(g.map(([, ls]) => (ls.length * (ls.length - 1)) / 2)) / ((xs.length * (xs.length - 1)) / 2);
        P(`| ${name} | ${sn} | ${g.length} | ${shared}/${xs.length} (${pc(shared / xs.length)}) | ${pc(pairs)} | ${g[0][1].length} | ${(2 ** entropy(g.map(([, ls]) => ls.length))).toFixed(1)} |`);
      }
    P();
    const wg = groups(C.filter((r) => !r.teach), (r) => `${r.layout}|${r.rankMix}|${r.units}`);
    P('Largest identical whole-start groups (non-teach):');
    P();
    P('| group | levels | count |');
    P('|---|---|---|');
    wg.slice(0, 10).forEach(([, ls], i) => P(`| ${i + 1} | ${ls.join(' ')} | ${ls.length} |`));
    P();
    P('Per chapter (non-teach): distinct layouts / rank mixes / units-given / first deliveries / whole starts:');
    P();
    P('| chapter | levels | layouts | rank mixes | units given | first parts | whole starts |');
    P('|---|---|---|---|---|---|---|');
    for (let ch = 1; ch <= 8; ch++) {
      const xs = C.filter((r) => chapterOf(r.level) === ch && !r.teach);
      P(`| ${ch} | ${xs.length} | ${groups(xs, (r) => r.layout).length} | ${groups(xs, (r) => r.rankMix).length} | ${groups(xs, (r) => r.units).length} | ${groups(xs, (r) => r.deliveries).length} | ${groups(xs, (r) => `${r.layout}|${r.rankMix}|${r.units}`).length} |`);
    }
    P();
    P('10 worst levels, metric C (members of the largest identical-start groups, level lists above; the biggest group is the worst offender). Units given never varies by design: every ordinary level starts with the same 8 starter families (4 shooters, 2 coils, 2 bells) and a standard bag; only a few levels add a helper (`start_extra`), an item teach, or a gift.');
    P();
    const ng = groups(C.filter((r) => !r.teach), (r) => `${r.layout}|${r.rankMix}|${r.units}`);
    const whole = ng.find(() => true);
    const lay = groups(C.filter((r) => !r.teach), (r) => r.layout);
    const rm = groups(C.filter((r) => !r.teach), (r) => r.rankMix);
    const un = groups(C.filter((r) => !r.teach), (r) => r.units);
    summary.push(`Start variety: ${lay.length} distinct layouts, ${rm.length} rank mixes and ${un.length} "units given" signatures in 77 non-teach levels; ${ng.length} distinct whole starts, the biggest shared by ${whole?.[1].length} levels (${pc((whole?.[1].length ?? 0) / 77)}); ${pc(sum(ng.filter(([, l]) => l.length > 1).map(([, l]) => l.length)) / 77)} of levels start identically to another one.`);
  } else P('(no part C data)');
  P();

  // ---------- D ----------
  P('## D. Player power versus enemy effort');
  P();
  if (D.length) {
    P(`Squads (found by \`--part dsearch\`, smart@3 damage per second on a representative level of each roster segment; unit levels from the plan's expected-level table per chapter, applied as the damage multiplier only): STARTER = Cannon/Coil/Bell at unit level 1 (what levels.json was fitted with), STARTER+LV = same squad at the expected unit level, GIFT = best squad using only starters and the guaranteed level gifts (nail_gun L10, wrench L13, jackhammer L20, gear L25, saw_blade L30, blowtorch L35, blast_plate L40, signal_beacon L50), CEILING = best squad if the player also owns every unit of an open crate rarity (a lucky crate run; Legendary excluded because crates B is off). Support cards (Blast Plate, Blueprint, ...) are not played. Roster segments and the squads chosen:`);
    P();
    P('| from level | rep level | GIFT squad | CEILING squad | GIFT dps | CEILING dps |');
    P('|---|---|---|---|---|---|');
    for (const g of SEGS) P(`| ${g.start} | ${g.rep} | ${sq2s(g.gift)} | ${sq2s(g.ceiling)} | ${Math.round(g.giftDps)} | ${Math.round(g.ceilDps)} |`);
    P();
    P(`DPS = total damage dealt / time played (cascade cap and kill carry-over included), smart@3, n = ${D[0].arms.starter1.recs.length} per cell. Effort = sum of the level's finite stage HP (goal levels exclude the goal machine, whose cost is time). Need = effort / (DPS x clock): the share of the clock the squad needs on average; above 1 means the bot loses on average. Win and chain from the same runs.`);
    P();
    P('| L | clock | effort HP | STARTER dps | STARTER+LV dps | GIFT dps | CEILING dps | need STARTER | need STARTER+LV | need GIFT | need CEILING | win S/S+LV/G/C | chain avg S / C |');
    P('|---|---|---|---|---|---|---|---|---|---|---|---|---|');
    const need = (dl: DLevel, k: string) => { const p = ci(dl.arms[k].recs.map((r) => r.d / Math.max(1, r.t)))[0]; return { p, need: sum(dl.hps) / (p * dl.clk) }; };
    const win = (dl: DLevel, k: string) => pc(dl.arms[k].recs.filter((r) => r.w).length / dl.arms[k].recs.length);
    const ch = (dl: DLevel, k: string) => (sum(dl.arms[k].recs.map((r) => r.ch)) / Math.max(1, sum(dl.arms[k].recs.map((r) => r.nc)))).toFixed(1);
    const needs: { L: number; s: number; e: number; g: number; c: number }[] = [];
    for (const dl of D) {
      const [s1, sE, g, c] = ['starter1', 'starterE', 'gift', 'ceiling'].map((k) => need(dl, k));
      needs.push({ L: dl.level, s: s1.need, e: sE.need, g: g.need, c: c.need });
      P(`| ${dl.level} | ${dl.clk} | ${sum(dl.hps)}${dl.goal ? ' (+goal)' : ''} | ${Math.round(s1.p)} | ${Math.round(sE.p)} | ${Math.round(g.p)} | ${Math.round(c.p)} | ${s1.need.toFixed(2)} | ${sE.need.toFixed(2)} | ${g.need.toFixed(2)} | ${c.need.toFixed(2)} | ${win(dl, 'starter1')}/${win(dl, 'starterE')}/${win(dl, 'gift')}/${win(dl, 'ceiling')} | ${ch(dl, 'starter1')} / ${ch(dl, 'ceiling')} |`);
    }
    P();
    P('Per chapter means (need = share of the clock):');
    P();
    P('| chapter | effort HP (mean) | dps STARTER | dps CEILING | need STARTER | need STARTER+LV | need GIFT | need CEILING | ceiling / starter dps |');
    P('|---|---|---|---|---|---|---|---|---|');
    for (let c = 1; c <= 8; c++) {
      const ds = D.filter((x) => chapterOf(x.level) === c);
      if (!ds.length) continue;
      const nn = needs.filter((x) => chapterOf(x.L) === c);
      const d1 = ds.map((x) => need(x, 'starter1').p), d4 = ds.map((x) => need(x, 'ceiling').p);
      P(`| ${c} | ${Math.round(mean(ds.map((x) => sum(x.hps))))} | ${Math.round(mean(d1))} | ${Math.round(mean(d4))} | ${mean(nn.map((x) => x.s)).toFixed(2)} | ${mean(nn.map((x) => x.e)).toFixed(2)} | ${mean(nn.map((x) => x.g)).toFixed(2)} | ${mean(nn.map((x) => x.c)).toFixed(2)} | ${(mean(d4) / mean(d1)).toFixed(2)}x |`);
    }
    P();
    const jumps = needs.slice(1).map((x, i) => ({ L: x.L, d: Math.log(x.s / needs[i].s), s: x.s })).sort((a, b) => Math.abs(b.d) - Math.abs(a.d));
    P('10 worst levels, metric D (largest jump in need STARTER versus the previous level, i.e. spikes and drops of enemy effort over player power):');
    P();
    P('| rank | L | need STARTER | previous | change |');
    P('|---|---|---|---|---|');
    jumps.slice(0, 10).forEach((j, i) => P(`| ${i + 1} | ${j.L} | ${j.s.toFixed(2)} | ${(j.s / Math.exp(j.d)).toFixed(2)} | ${j.d > 0 ? '+' : ''}${Math.round((Math.exp(j.d) - 1) * 100)}% |`));
    P();
    P('10 levels where the CEILING squad is most overpowered (lowest need CEILING):');
    P();
    P('| rank | L | need CEILING | need STARTER | win CEILING |');
    P('|---|---|---|---|---|');
    [...needs].sort((a, b) => a.c - b.c).slice(0, 10).forEach((x, i) => P(`| ${i + 1} | ${x.L} | ${x.c.toFixed(2)} | ${x.s.toFixed(2)} | ${win(D.find((d) => d.level === x.L)!, 'ceiling')} |`));
    P();
    const cv = needs.map((x) => x.s);
    summary.push(`Player power: need STARTER (share of the clock the starter squad needs) runs from ${Math.min(...cv).toFixed(2)} to ${Math.max(...cv).toFixed(2)} (mean ${mean(cv).toFixed(2)}); the best open-crate squad needs ${mean(needs.map((x) => x.c)).toFixed(2)} on average, so unit power can cut the needed clock by about ${pc(1 - mean(needs.map((x) => x.c)) / mean(cv))}.`);
  } else P('(no part D data)');
  P();
  P('### Unit power by rank (damage of one fire, `rawDamage`, before relays and multipliers)');
  P();
  P('| unit | role | r1 | r2 | r3 | r4 | r5 | r6 | r7 | r8 |');
  P('|---|---|---|---|---|---|---|---|---|---|');
  for (const f of ['cannon', 'rocket', 'mortar', 'arc_welder', 'nail_gun', 'jackhammer', 'saw_blade', 'piston', 'blowtorch', 'rivet_gun', 'hydraulic_press', 'lathe', 'wrecking_ball', 'coil', 'bell', 'horn', 'fuse_box', 'gear'] as Family[])
    P(`| ${f} | ${['coil', 'bell', 'horn', 'fuse_box', 'gear'].includes(f) ? 'relay' : 'shooter'} | ${[1, 2, 3, 4, 5, 6, 7, 8].map((r) => Math.round(rawDamage(f, r))).join(' | ')} |`);
  P();
  // extra headline numbers
  const chap = imp.filter((x) => x.bot === 'smart3' && x.L % 10 === 0 && x.atk.includes('(all)'));
  const bossSecs = mean(rowsA.filter((r) => r.a.boss).map((r) => r.lastDur));
  summary.push(`Why the boss is small and its powers are almost invisible: the boss stage lasts only ${f1(bossSecs)} s on average at the 8 chapter bosses and gets ${chap.length ? mean(chap.map((x) => x.castsRun)).toFixed(1) : '-'} casts per fight (first cast 8 s after it wakes, then every ${TUNING.bossEvery} s, second attack only below 33% HP). Boss HP is 50% of the stage but only about ${pc(mean(rowsA.filter((r) => r.a.boss).map((r) => r.tShare[0])))} of the time, because the per-hit cap (35% of the machine's max HP) lets a bigger machine take bigger hits.`);
  P('## Modelling limits (honest list)');
  P();
  for (const t of [
    'Bots are not people: smart@3 picks the best previewed merge every ~3 s (jittered 0.8-1.2x), random@2.5 any legal merge, planner a 2-ply lookahead on a JSON copy. None of them dodges a boss warning on purpose (they do not read warnings), none uses items, tools, support cards or the scrap button, none drags to defuse a bomb except by accident. So "player responded" is about 0 for most attacks by construction; a human who reads the warning would feel less of a hazard and a human who ignores it would feel what the bot feels.',
    'ON vs OFF turns every boss / light-monster cast off (`TUNING.bossAttacks = false`, the MANIA switch). Level modifiers (SUCTION / JAM / ROW_GAPS remix hazards, GAPS and CORNERS masks) are NOT toggled and are not audited as boss powers. The ordinary-monster "light" behaviours (frost, suction, hot, rest, split, tow, ransom) are audited with the same A/B because they use the same code; the chain shield (L11, L33) is not.',
    'Common random numbers hold only until the first cast changes the board: the game seed and the bot seed are the same in both arms, but afterwards the two games diverge, so single paired differences are chaotic. The mean difference, its 95% interval and the share of byte-identical pairs are the usable outputs. n = 30 per arm per bot (planner 6) means an interval of about +-3 to +-8 points of the clock on levels where the power matters; small real effects (< 2%) are below the noise.',
    '"Felt" is conservative: a hazard counts as felt only when it removed/moved a machine, cost clock seconds, placed junk, or made the bot\'s best merge worse at a decision (a probe that compares the best option with and without the standing hazard). Effects that live outside the merge choice (frost: fewer cells for incoming parts; tow: linked drag; clamp on a machine the bot never wanted to move) are therefore under-counted, and show up only through the ON-OFF time and identical-run numbers. "Board effect" (cells under the hazard) over-counts.',
    'Telegraph visibility is read from the code (GameScene.ts: beam, sound, event text on bossWarn; marked-cell drawing; lesson cards), not from screenshots or playtests. A cast the player cannot notice is therefore measured by board outcome (whiff / not felt / identical run), not by pixels.',
    'Effort = HP and bot time, not human effort. Time share counts from the previous kill to the win and includes the breather and the cascade carry-over; the cascade cap (35% of the machine\'s max HP per hit) means HP is not proportional to time. Goal levels (rank / chain) have an HP-free last machine whose cost is only time; their HP share is shown as "goal".',
    'Start variety: "units given" is only what `newLevel` and the plan hand over (families on board, bag, item teach, shooter override, the gift of the previous level); crates, perks (none exist in saga levels), jumpstart kits and the player\'s own squad choice are outside it. First deliveries depend on how the bot plays and are shown but excluded from the whole-start signature. The varied-openings flag is measured as an alternative, it is not the shipped default.',
    'Player power: the squads (GIFT, CEILING) were picked by a greedy search on ONE representative level per roster segment with n = 8 runs (noisy), then replayed on every level of the segment; on some later levels (L51-L77) the searched squad loses where the starter squad wins, so GIFT and CEILING columns mix real unit power with search noise and with bot blindness to support cards and unit jobs. Unit levels use only the damage multiplier (shooter +4%/level, relay +2%/level) at the plan\'s expected level per chapter, not the level-3/6/9 perks. CEILING assumes every unit of an open crate rarity is owned (Epic from level 11, Legendary excluded), which no player has. Support cards (Blast Plate, Blueprint, Rewind Crank, Tilt Lever) are never played. levels.json HP was fitted with the starter squad at unit level 1, so STARTER is the calibration reference.',
    'Roster flags 1-7 are switched on for part D only (to build the squads); parts A-C run with shipped flags. Pace is the shipped CALM. Items granted by thresholds and Overdrive are active as in the game, but the bots never place items.',
    'Determinism: no Math.random and no clock; bot seed = level x 1009 + i x 7919, game seed = the level\'s own seed. Re-running a part reproduces the JSON byte for byte (run twice and compared with cmp: A L28-30, B L35-38, C, D L59-60 and the squad search file were identical; the other chunks were run once).',
  ]) P(`- ${t}`);
  P();
  P('## Reproduction');
  P();
  P('```');
  P('npm ci && npm run typecheck');
  P('npx vite-node tools/effort-audit.ts --part a --from 1 --to 14 --n 30      # then --from 15 --to 45, --from 46 --to 80 (each under ~3 min)');
  P('npx vite-node tools/effort-audit.ts --part b --from 1 --to 30 --n 30 --nplan 6   # then 31-60, 61-80 (2-4 min each)');
  P('npx vite-node tools/effort-audit.ts --part c');
  P('npx vite-node tools/effort-audit.ts --part dsearch                        # ~4 min');
  P('npx vite-node tools/effort-audit.ts --part d --from 1 --to 40 --n 20      # then --from 41 --to 80');
  P('npx vite-node tools/effort-audit.ts --part report --write docs/EFFORT_AUDIT.md');
  P('```');
  P();
  P('Partial results go to `effort-audit-data/` (scratch, never committed; `--out DIR` changes it). `--part report` is a pure function of those JSON files.');
  const body = L.join('\n');
  const head = [
    '# Effort audit: enemy effort versus boss powers versus start variety versus player power',
    '',
    'Measurement only (task t-bd0d6010, 2026-10-13). No change to `src/` or `levels.json`. Everything below the "Tables" line is the verbatim output of `npx vite-node tools/effort-audit.ts --part report` over the JSON written by the earlier parts (commands at the end).',
    '',
    '## Plain-words summary',
    '',
    ...summary.map((x, i) => `${i + 1}. ${x}`),
    '',
    'Reading rule: smart@3 and random@2.5 are bots, ON vs OFF is a paired sim, "felt" is what the bot\'s merge choice or board lost, not what a human sees. Trust intervals, read point values as direction (limits at the end).',
    '',
    '## Tables',
    '',
  ].join('\n');
  return head + '\n' + body + '\n';
}

if (PART === 'report') {
  const md = report();
  const w = arg('--write');
  if (w) writeFileSync(w, md);
  else console.log(md);
}
if (PART === 'help') console.log('see the header of tools/effort-audit.ts');

