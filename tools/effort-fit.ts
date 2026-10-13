// EFFORT FIT (docs/EFFORT_MODEL.md section 5, slice S1): generates src/content/effortOverlay.json, the table read by newLevel while
// TUNING.effortModel is ON. Never hand-edit the overlay and never touch levels.json. Pure and deterministic: no clock, no random.
//   npx vite-node tools/effort-fit.ts --spec docs/effort-model-spec.json --write      first-order overlay (pass 0) for the 16 boss / mini levels
//   npx vite-node tools/effort-fit.ts --check                                         overlay is valid, within bounds, and replays from the spec
//   npx vite-node tools/effort-audit.ts --part a --smart-only --out effort-audit-data-base --levels 8,10,...     baseline, flag OFF (once)
//   npx vite-node tools/effort-audit.ts --part a --smart-only --effort --levels 8,10,... --n 30                 measure the overlay, flag ON
//   npx vite-node tools/effort-fit.ts --iterate [--data effort-audit-data-effort] [--base effort-audit-data-base]   one correction pass (at most 3)
//   npx vite-node tools/effort-fit.ts --finalize [--data <dir>]                       after pass 3: record its measurement and keep the best measured state per level
//   npx vite-node tools/effort-fit.ts --rebuild                                       replay the recorded measurements from the spec (after a solver change)
//   npx vite-node tools/effort-fit.ts --report [--data ...] [--base ...]              markdown table: tau, CI, need, HP share, cap, win rate
// Iteration (a pass reads the smart@3 stage times of the current overlay): each stage's clear time is modelled as T = c x HP multiplier ^ e
// (e from the last two measured points, the baseline counts as the point (1, 1) while the cap is unchanged; one point = e 0.5).
// The boss stage is solved for tau x E and the minion stages for (1 - tau) x E, with E = the baseline clear time (effort neutral).
// Where the boss HP share would pass 75% the cap lever switches on instead (TUNING.effortModelOpts.bossCap: 0.20, then 0.15), the share is held
// at 74% and that level's model history restarts (the cap changes how fast the boss dies).
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { LEVELS } from '../src/content/levels';
import { TUNING } from '../src/content/tuning';

const args = process.argv.slice(2);
const arg = (k: string) => (args.includes(k) ? args[args.indexOf(k) + 1] : undefined);
const SPEC = arg('--spec') ?? 'docs/effort-model-spec.json';
const OVERLAY = arg('--overlay') ?? 'src/content/effortOverlay.json';
const DATA = arg('--data') ?? 'effort-audit-data-effort';
const BASE = arg('--base') ?? 'effort-audit-data-base';
const MAX_PASSES = 3;
const SHARE_CEIL = 0.75;
const SHARE_HOLD = 0.74;
const MINION_FLOOR = 0.35;
const CAPS = TUNING.effortModelOpts.bossCap;

export interface Entry { bossHpMult: number; minionHpMult: number; bossCap?: number }
/** mean clear time (s) of the boss stage and of all minion stages, smart@3 winning runs */
export interface Times { tb: number; tm: number }
/** `final` = the measurement of the last state (pass 3), `pick` = per level the state (0..pass) whose entry was kept, chosen from the recorded times only */
export interface Overlay { schema: string; spec: string; pass: number; baseline: Record<string, Times>; passes: Record<string, Times>[]; final?: Record<string, Times>; pick?: Record<string, number>; levels: Record<string, Entry> }
interface SpecLevel { level: number; kind: string; last_share_target: number; hp_first_order: { boss_mult: number; minion_mult: number; boss_mult_capped?: number; needs_cap_lever?: boolean; boss_stage_cascade_cap_guess?: number } }

const r4 = (x: number) => (x === null || !Number.isFinite(x) ? NaN : Math.round(x * 1e4) / 1e4); // NaN (no winning run) is stored as null
const def = (n: number) => LEVELS.find((d) => d.level === n)!;
const hpOf = (n: number) => ({ boss: def(n).hp, minion: def(n).minion_hp ?? def(n).hp });
/** boss HP / (boss HP + minion pool) after the multipliers */
export const hpShare = (n: number, e: Entry) => {
  const h = hpOf(n);
  return (h.boss * e.bossHpMult) / (h.boss * e.bossHpMult + h.minion * e.minionHpMult);
};

export function specLevels(spec: { levels: SpecLevel[] }): SpecLevel[] {
  return spec.levels.filter((l) => l.kind === 'boss' || l.kind === 'mini');
}

/** pass 0: the spec's first-order numbers (the capped boss multiplier and cap 0.20 on the cap-lever levels) */
export function firstOrder(spec: { levels: SpecLevel[] }): Overlay {
  const levels: Record<string, Entry> = {};
  for (const l of specLevels(spec)) {
    const f = l.hp_first_order;
    levels[String(l.level)] = f.needs_cap_lever
      ? { bossHpMult: r4(f.boss_mult_capped ?? f.boss_mult), minionHpMult: r4(f.minion_mult), bossCap: CAPS[0] }
      : { bossHpMult: r4(f.boss_mult), minionHpMult: r4(f.minion_mult) };
  }
  return { schema: 'effort-overlay/1', spec: 'docs/effort-model-spec.json', pass: 0, baseline: {}, passes: [], levels };
}

interface Pt { mb: number; mm: number; tb: number; tm: number }
const E_DEFAULT = 0.5; // elasticity of clear time to HP when only one point is known (tools/effort-diag.ts: 0.15 to 0.6 on the boss levels)
const E_MIN = 0.15, E_MAX = 1;
const EASE = 0.85; // multiplier step when a measurement had no winning run
const AIM_MARGIN = 0.01; // the third pass aims this far above the target so the interval's lower end clears the 0.50 floor
const STEP_MIN = 0.5, STEP_MAX = 2; // one pass moves a multiplier by at most this factor
/** The multiplier that makes a stage take `want` seconds. Clear time follows a power law in the HP multiplier, T = c x m^e (the player's damage grows
 *  while a stage lasts, so time rises slower than HP: tools/effort-diag.ts); e comes from the last two points when they differ. */
function solve(pts: Pt[], mult: (p: Pt) => number, time: (p: Pt) => number, want: number, robust: boolean): number {
  const q = pts[pts.length - 1];
  const p = pts.length > 1 ? pts[pts.length - 2] : undefined;
  let e = E_DEFAULT;
  if (p && Math.abs(Math.log(mult(q) / mult(p))) > 0.05 && time(q) > 0 && time(p) > 0) {
    const raw = Math.log(time(q) / time(p)) / Math.log(mult(q) / mult(p));
    // the last pass does not trust a noisy slope: outside [E_MIN, E_MAX] it keeps the default instead of clamping (a clamped 0.15 amplifies the step 6x)
    e = robust && !(raw >= E_MIN && raw <= E_MAX) ? E_DEFAULT : Math.min(E_MAX, Math.max(E_MIN, raw));
  }
  return mult(q) * Math.min(STEP_MAX, Math.max(STEP_MIN, (want / time(q)) ** (1 / e)));
}

/** one correction pass at the overlay `o` from measured times t (levels without usable times stay as they are) */
function applyPass(o: Overlay, targets: Record<string, number>, hist: Record<string, Pt[]>, t: Record<string, Times>): { next: Overlay; hist: Record<string, Pt[]> } {
  const levels: Record<string, Entry> = {};
  const nh: Record<string, Pt[]> = {};
  for (const [k, e] of Object.entries(o.levels)) {
    const n = Number(k);
    const m = t[k], b0 = o.baseline[k];
    nh[k] = [...(hist[k] ?? []), ...(m && m.tb > 0 && m.tm > 0 ? [{ mb: e.bossHpMult, mm: e.minionHpMult, tb: m.tb, tm: m.tm }] : [])];
    if (m && !(m.tb > 0 && m.tm > 0) && b0) { // no winning run at all: ease both stages instead of guessing from nothing
      levels[k] = { bossHpMult: r4(e.bossHpMult * EASE), minionHpMult: r4(Math.max(MINION_FLOOR, e.minionHpMult * EASE)), ...(e.bossCap !== undefined ? { bossCap: e.bossCap } : {}) };
      continue;
    }
    if (!m || !b0) { levels[k] = { ...e }; continue; }
    const E = b0.tb + b0.tm;
    const tau = targets[k] + (o.pass >= 2 ? AIM_MARGIN : 0);
    let next: Entry = {
      bossHpMult: solve(nh[k], (p) => p.mb, (p) => p.tb, tau * E, o.pass >= 2),
      minionHpMult: Math.max(MINION_FLOOR, solve(nh[k], (p) => p.mm, (p) => p.tm, (1 - tau) * E, o.pass >= 2)),
      ...(e.bossCap !== undefined ? { bossCap: e.bossCap } : {}),
    };
    if (hpShare(n, next) > SHARE_CEIL) {
      const h = hpOf(n);
      const total = h.boss * next.bossHpMult + h.minion * next.minionHpMult;
      const cap = e.bossCap === undefined ? CAPS[0] : CAPS[Math.min(CAPS.length - 1, CAPS.indexOf(e.bossCap) + 1)];
      next = { bossHpMult: (SHARE_HOLD * total) / h.boss, minionHpMult: Math.max(MINION_FLOOR, ((1 - SHARE_HOLD) * total) / h.minion), bossCap: cap };
      if (cap !== e.bossCap) nh[k] = nh[k].slice(-1); // the cap changes the boss's pace: older points no longer describe it
    }
    levels[k] = { bossHpMult: r4(next.bossHpMult), minionHpMult: r4(next.minionHpMult), ...(next.bossCap !== undefined ? { bossCap: next.bossCap } : {}) };
  }
  return { next: { ...o, levels }, hist: nh };
}

const roundTimes = (t: Record<string, Times>): Record<string, Times> => Object.fromEntries(Object.entries(t).map(([k, v]) => [k, { tb: r4(v.tb), tm: r4(v.tm) }]));

/** record one pass (baseline times on the first one) and return the next overlay */
export function iterate(spec: { levels: SpecLevel[] }, o: Overlay, measured: Record<string, Times>, baseline?: Record<string, Times>): Overlay {
  const rb = o.pass === 0 && baseline ? roundTimes(baseline) : o.baseline;
  const withBase = { ...o, baseline: rb };
  const targets = Object.fromEntries(specLevels(spec).map((l) => [String(l.level), l.last_share_target]));
  // history: a baseline point is valid for levels that start without the cap lever, and the replayed passes before this one
  const hist = replayHist(spec, withBase);
  const m = roundTimes(measured);
  const { next } = applyPass(withBase, targets, hist, m);
  return { ...next, pass: o.pass + 1, passes: [...o.passes, m] };
}

/** the model points known after the passes already recorded in `o` (replays them from pass 0) */
function replayHist(spec: { levels: SpecLevel[] }, o: Overlay): Record<string, Pt[]> {
  const targets = Object.fromEntries(specLevels(spec).map((l) => [String(l.level), l.last_share_target]));
  let cur = firstOrder(spec);
  cur = { ...cur, baseline: o.baseline };
  let hist: Record<string, Pt[]> = {};
  for (const [k, e] of Object.entries(cur.levels)) {
    const b = o.baseline[k];
    hist[k] = b && e.bossCap === undefined ? [{ mb: 1, mm: 1, tb: b.tb, tm: b.tm }] : [];
  }
  for (const m of o.passes) {
    const r = applyPass(cur, targets, hist, m);
    cur = { ...r.next, pass: cur.pass + 1 };
    hist = r.hist;
  }
  return hist;
}

/** pass 0 plus every recorded pass, from the spec alone */
/** the overlay after 0, 1, ... o.passes.length passes, replayed from the spec and the recorded measurements */
export function replayStates(spec: { levels: SpecLevel[] }, o: Overlay): Overlay[] {
  const targets = Object.fromEntries(specLevels(spec).map((l) => [String(l.level), l.last_share_target]));
  let cur: Overlay = { ...firstOrder(spec), baseline: o.baseline };
  let hist: Record<string, Pt[]> = {};
  for (const [k, e] of Object.entries(cur.levels)) {
    const b = o.baseline[k];
    hist[k] = b && e.bossCap === undefined ? [{ mb: 1, mm: 1, tb: b.tb, tm: b.tm }] : [];
  }
  const passes: Record<string, Times>[] = [];
  const out: Overlay[] = [{ ...cur, passes: [] }];
  for (const m of o.passes) {
    const r = applyPass(cur, targets, hist, m);
    cur = { ...r.next, pass: cur.pass + 1, passes: [...passes, m] };
    passes.push(m);
    hist = r.hist;
    out.push({ ...cur, passes: [...passes] });
  }
  return out;
}

export const replay = (spec: { levels: SpecLevel[] }, o: Overlay): Overlay => replayStates(spec, o).slice(-1)[0];

/** closeness of a measured state to its goal: time share off target plus a penalty for total effort off the baseline by more than 8% */
function score(m: Times | undefined, b: Times, target: number): number {
  if (!m || !(m.tb > 0 && m.tm > 0)) return Infinity;
  const tau = m.tb / (m.tb + m.tm), er = (m.tb + m.tm) / (b.tb + b.tm);
  return Math.abs(tau - target) + 0.5 * Math.max(0, Math.abs(er - 1) - 0.08);
}

/** keep, per level, the state (pass 0 to the last) whose measurement scores best (earliest wins a tie); needs o.final */
export function finalize(spec: { levels: SpecLevel[] }, o: Overlay): Overlay {
  const st = replayStates(spec, o);
  const meas = [...o.passes, o.final!];
  const pick: Record<string, number> = {};
  const levels: Record<string, Entry> = {};
  for (const l of specLevels(spec)) {
    const k = String(l.level);
    let best = 0, bs = Infinity;
    meas.forEach((m, i) => { const sc = score(m[k], o.baseline[k], l.last_share_target); if (sc < bs - 1e-9) [best, bs] = [i, sc]; });
    pick[k] = best;
    levels[k] = st[best].levels[k];
  }
  const last = st[st.length - 1];
  return { schema: last.schema, spec: last.spec, pass: last.pass, baseline: last.baseline, passes: last.passes, final: roundTimes(o.final!), pick, levels };
}

export const serialize = (o: Overlay) => JSON.stringify(o, null, 1) + '\n';
const readJson = <T,>(p: string): T => JSON.parse(readFileSync(p, 'utf8')) as T;

function check(): string[] {
  const errs: string[] = [];
  const spec = readJson<{ levels: SpecLevel[] }>(SPEC);
  const o = readJson<Overlay>(OVERLAY);
  const want = specLevels(spec).map((l) => String(l.level));
  if (o.schema !== 'effort-overlay/1') errs.push(`schema ${o.schema}`);
  if (JSON.stringify(Object.keys(o.levels).sort((a, b) => +a - +b)) !== JSON.stringify(want)) errs.push(`overlay levels ${Object.keys(o.levels).join(',')} != spec boss/mini levels ${want.join(',')}`);
  if (o.pass > MAX_PASSES) errs.push(`pass ${o.pass} > ${MAX_PASSES}`);
  for (const [k, e] of Object.entries(o.levels)) {
    if (!(e.bossHpMult > 0 && e.minionHpMult >= MINION_FLOOR - 1e-9)) errs.push(`L${k}: multipliers out of range ${JSON.stringify(e)}`);
    if (e.bossCap !== undefined && !CAPS.includes(e.bossCap)) errs.push(`L${k}: bossCap ${e.bossCap} not one of ${CAPS.join('/')}`);
    if (e.bossCap === undefined && hpShare(Number(k), e) > SHARE_CEIL + 1e-9) errs.push(`L${k}: boss HP share ${hpShare(Number(k), e).toFixed(3)} > ${SHARE_CEIL} without the cap lever`);
  }
  if (o.pass !== o.passes.length) errs.push(`pass ${o.pass} but ${o.passes.length} recorded passes`);
  const replayed = o.final ? finalize(spec, o) : replay(spec, o);
  if (serialize(replayed) !== serialize(o)) errs.push('overlay does not replay from the spec (hand-edited or stale)');
  return errs;
}

interface ARun { w: number; t: number; clk: number; d: number; st: number[] }
interface AData { level: number; hps: number[]; runs: { smart3: ARun[] } }
const mean = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;

/** boss time share per winning run: (win - second-to-last kill) / clear time, as tools/effort-audit.ts part A */
export const sharesOf = (runs: ARun[]): number[] => runs.filter((r) => r.w && r.st.length > 1).map((r) => { const k = r.st.length; return (r.st[k - 1] - r.st[k - 2]) / r.t; });
/** mean boss-stage and minion-stage clear times of the winning runs */
export function timesOf(runs: ARun[]): Times {
  const v = runs.filter((r) => r.w && r.st.length > 1);
  if (!v.length) return { tb: NaN, tm: NaN };
  return { tb: mean(v.map((r) => r.st[r.st.length - 1] - r.st[r.st.length - 2])), tm: mean(v.map((r) => r.st[r.st.length - 2])) };
}
/** need = total stage HP / (mean damage per second x clock), the audit's definition (all runs) */
export const needOf = (a: AData) => a.hps.reduce((x, y) => x + y, 0) / (mean(a.runs.smart3.map((r) => r.d / Math.max(1, r.t))) * a.runs.smart3[0].clk);
const file = (d: string, level: number) => `${d}/a_${String(level).padStart(2, '0')}.json`;

function report(): string {
  const spec = readJson<{ levels: SpecLevel[] }>(SPEC);
  const o = readJson<Overlay>(OVERLAY);
  const rows = ['| L | kind | target | tau base | tau ON (mean) | CI lower | CI upper | need base | need ON | d need | boss HP share | cap | win ON |', '|---|---|---|---|---|---|---|---|---|---|---|---|---|'];
  let pass = 0;
  for (const l of specLevels(spec)) {
    const on = readJson<AData>(file(DATA, l.level)), base = readJson<AData>(file(BASE, l.level));
    const v = sharesOf(on.runs.smart3);
    const m = mean(v), sd = Math.sqrt(v.reduce((a, x) => a + (x - m) ** 2, 0) / Math.max(1, v.length - 1)), h = (1.96 * sd) / Math.sqrt(v.length);
    const tb = mean(sharesOf(base.runs.smart3)), nb = needOf(base), no = needOf(on);
    const e = o.levels[String(l.level)];
    const share = on.hps[on.hps.length - 1] / on.hps.reduce((a, b) => a + b, 0);
    const ok = m - h >= 0.5 && Math.abs(m - l.last_share_target) <= 0.03 && Math.abs(no - nb) <= 0.05 && (share <= SHARE_CEIL + 1e-9 || e?.bossCap !== undefined);
    if (ok) pass++;
    rows.push(`| ${l.level} | ${l.kind} | ${l.last_share_target} | ${tb.toFixed(3)} | ${m.toFixed(3)} | ${(m - h).toFixed(3)} | ${(m + h).toFixed(3)} | ${nb.toFixed(3)} | ${no.toFixed(3)} | ${(no - nb >= 0 ? '+' : '') + (no - nb).toFixed(3)} | ${(share * 100).toFixed(1)}% | ${e?.bossCap ?? '-'} | ${Math.round((100 * on.runs.smart3.filter((r) => r.w).length) / on.runs.smart3.length)}% ${ok ? 'PASS' : 'fail'} |`);
  }
  return `${rows.join('\n')}\n\npass ${pass} of ${rows.length - 2} (CI lower >= 0.50, mean within 0.03 of target, need within 0.05 of base, HP share <= 75% unless cap lever), overlay pass ${o.pass}`;
}

if (!process.env.VITEST) {
  if (args.includes('--write')) {
    writeFileSync(OVERLAY, serialize(firstOrder(readJson(SPEC))));
    console.log(`wrote ${OVERLAY} (pass 0, first order)`);
  } else if (args.includes('--finalize')) {
    // record the measurement of the last pass-3 state, then keep per level the best measured state (the fourth measurement verifies the picks)
    const spec = readJson<{ levels: SpecLevel[] }>(SPEC);
    const o = readJson<Overlay>(OVERLAY);
    if (o.pass !== MAX_PASSES || o.final) { console.error(`--finalize needs an overlay at pass ${MAX_PASSES} without a final measurement`); process.exit(1); }
    const final: Record<string, Times> = {};
    for (const l of specLevels(spec)) final[String(l.level)] = timesOf(readJson<AData>(file(DATA, l.level)).runs.smart3);
    const next = finalize(spec, { ...o, final: roundTimes(final) });
    writeFileSync(OVERLAY, serialize(next));
    console.log(`picked states: ${JSON.stringify(next.pick)}`);
  } else if (args.includes('--rebuild')) {
    const o = readJson<Overlay>(OVERLAY);
    const spec = readJson<{ levels: SpecLevel[] }>(SPEC);
    writeFileSync(OVERLAY, serialize(o.final ? finalize(spec, o) : replay(spec, o)));
    console.log(`rebuilt ${OVERLAY} from its recorded measurements (pass ${o.pass})`);
  } else if (args.includes('--check')) {
    const errs = check();
    if (errs.length) { console.error(errs.join('\n')); process.exit(1); }
    console.log(`effort overlay OK (pass ${readJson<Overlay>(OVERLAY).pass})`);
  } else if (args.includes('--iterate')) {
    const spec = readJson<{ levels: SpecLevel[] }>(SPEC);
    const o = readJson<Overlay>(OVERLAY);
    if (o.pass >= MAX_PASSES) { console.error(`already ${o.pass} passes (max ${MAX_PASSES})`); process.exit(1); }
    const measured: Record<string, Times> = {}, baseline: Record<string, Times> = {};
    for (const l of specLevels(spec)) {
      for (const f of [file(DATA, l.level), file(BASE, l.level)]) if (!existsSync(f)) { console.error(`missing measurement ${f}`); process.exit(1); }
      measured[String(l.level)] = timesOf(readJson<AData>(file(DATA, l.level)).runs.smart3);
      baseline[String(l.level)] = timesOf(readJson<AData>(file(BASE, l.level)).runs.smart3);
    }
    const next = iterate(spec, o, measured, baseline);
    writeFileSync(OVERLAY, serialize(next));
    for (const k of Object.keys(measured)) console.log(`L${k}: boss ${measured[k].tb.toFixed(1)} s, minions ${measured[k].tm.toFixed(1)} s (base ${(o.baseline[k] ?? baseline[k]).tb.toFixed(1)} / ${(o.baseline[k] ?? baseline[k]).tm.toFixed(1)}) -> boss x${o.levels[k].bossHpMult} -> x${next.levels[k].bossHpMult}, minions x${o.levels[k].minionHpMult} -> x${next.levels[k].minionHpMult}${next.levels[k].bossCap ? `, cap ${next.levels[k].bossCap}` : ''}`);
    console.log(`wrote ${OVERLAY} (pass ${next.pass})`);
  } else if (args.includes('--report')) console.log(report());
  else console.log('usage: --spec <file> --write | --check | --iterate [--data <dir>] [--base <dir>] | --report');
}
