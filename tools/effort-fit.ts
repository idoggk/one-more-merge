// EFFORT FIT (docs/EFFORT_MODEL.md section 5, slice S1): generates src/content/effortOverlay.json, the table read by newLevel while
// TUNING.effortModel is ON. Never hand-edit the overlay and never touch levels.json. Pure and deterministic: no clock, no random.
//   npx vite-node tools/effort-fit.ts --spec docs/effort-model-spec.json --write      first-order overlay (pass 0) for the 16 boss / mini levels
//   npx vite-node tools/effort-fit.ts --check                                         overlay is valid, within bounds, and replays from the spec
//   npx vite-node tools/effort-audit.ts --part a --effort --levels 8,10,... --n 30    measure with the flag ON (writes effort-audit-data-effort/a_XX.json)
//   npx vite-node tools/effort-fit.ts --iterate [--data effort-audit-data-effort]     one correction pass from that measurement (at most 3 passes)
//   npx vite-node tools/effort-fit.ts --report [--data <flag ON dir>] [--base <flag OFF dir>]   markdown table: tau, CI, need, HP share, cap, win rate
// Iteration: bossMult *= tau_target / tau_measured and minionMult *= (1 - tau_target) / (1 - tau_measured) (total effort stays put). Where the boss HP
// share would pass 75% the cap lever switches on instead (TUNING.effortModelOpts.bossCap: 0.20, then 0.15) and the share is held at 74%.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { LEVELS } from '../src/content/levels';
import { TUNING } from '../src/content/tuning';

const args = process.argv.slice(2);
const arg = (k: string) => (args.includes(k) ? args[args.indexOf(k) + 1] : undefined);
const SPEC = arg('--spec') ?? 'docs/effort-model-spec.json';
const OVERLAY = arg('--overlay') ?? 'src/content/effortOverlay.json';
const DATA = arg('--data') ?? 'effort-audit-data-effort';
const MAX_PASSES = 3;
const SHARE_CEIL = 0.75;
const SHARE_HOLD = 0.74;
const MINION_FLOOR = 0.35;
const CAPS = TUNING.effortModelOpts.bossCap;

export interface Entry { bossHpMult: number; minionHpMult: number; bossCap?: number }
export interface Overlay { schema: string; spec: string; pass: number; passes: Record<string, number>[]; levels: Record<string, Entry> }
interface SpecLevel { level: number; kind: string; last_share_target: number; hp_first_order: { boss_mult: number; minion_mult: number; boss_mult_capped?: number; needs_cap_lever?: boolean; boss_stage_cascade_cap_guess?: number } }

const r4 = (x: number) => Math.round(x * 1e4) / 1e4;
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
  return { schema: 'effort-overlay/1', spec: 'docs/effort-model-spec.json', pass: 0, passes: [], levels };
}

/** one correction pass: tau = measured mean boss time share per level */
export function applyPass(o: Overlay, targets: Record<string, number>, tau: Record<string, number>): Overlay {
  const levels: Record<string, Entry> = {};
  for (const [k, e] of Object.entries(o.levels)) {
    const n = Number(k);
    const tt = targets[k], tm = tau[k];
    if (!Number.isFinite(tm) || tm <= 0 || tm >= 1) { levels[k] = { ...e }; continue; }
    let next: Entry = { ...e, bossHpMult: e.bossHpMult * (tt / tm), minionHpMult: Math.max(MINION_FLOOR, e.minionHpMult * ((1 - tt) / (1 - tm))) };
    if (hpShare(n, next) > SHARE_CEIL) {
      const ci = e.bossCap === undefined ? 0 : Math.min(CAPS.length - 1, CAPS.indexOf(e.bossCap) + 1);
      const h = hpOf(n);
      const total = h.boss * next.bossHpMult + h.minion * next.minionHpMult;
      next = { bossHpMult: (SHARE_HOLD * total) / h.boss, minionHpMult: ((1 - SHARE_HOLD) * total) / h.minion, bossCap: e.bossCap === undefined ? CAPS[0] : CAPS[ci] };
    }
    levels[k] = { bossHpMult: r4(next.bossHpMult), minionHpMult: r4(next.minionHpMult), ...(next.bossCap !== undefined ? { bossCap: next.bossCap } : {}) };
  }
  return { ...o, pass: o.pass + 1, passes: [...o.passes, Object.fromEntries(Object.entries(tau).map(([k, v]) => [k, r4(v)]))], levels };
}

/** pass 0 plus every recorded pass, from the spec alone */
export function replay(spec: { levels: SpecLevel[] }, passes: Record<string, number>[]): Overlay {
  const targets = Object.fromEntries(specLevels(spec).map((l) => [String(l.level), l.last_share_target]));
  return passes.reduce((o, tau) => applyPass(o, targets, tau), firstOrder(spec));
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
  if (serialize(replay(spec, o.passes)) !== serialize(o)) errs.push('overlay does not replay from the spec (hand-edited or stale)');
  return errs;
}

/** mean boss time share of the winning runs: (win - second-to-last kill) / clear time, as tools/effort-audit.ts part A */
export function tauOf(runs: { w: number; t: number; st: number[] }[]): { mean: number; n: number } {
  const v = runs.filter((r) => r.w && r.st.length).map((r) => { const k = r.st.length; return (r.st[k - 1] - (k > 1 ? r.st[k - 2] : 0)) / r.t; });
  return { mean: v.length ? v.reduce((a, b) => a + b, 0) / v.length : NaN, n: v.length };
}

interface ARun { w: number; t: number; clk: number; d: number; st: number[] }
interface AData { level: number; hps: number[]; runs: { smart3: ARun[] } }
const mean = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;
/** need = total stage HP / (mean damage per second x clock), the audit's definition (all runs) */
export const needOf = (a: AData) => mean(a.hps) * a.hps.length / (mean(a.runs.smart3.map((r) => r.d / Math.max(1, r.t))) * a.runs.smart3[0].clk);

function report(): string {
  const spec = readJson<{ levels: SpecLevel[] }>(SPEC);
  const o = readJson<Overlay>(OVERLAY);
  const BASE = arg('--base') ?? 'effort-audit-data-base';
  const rows = ['| L | kind | target | tau base | tau ON (mean) | CI lower | CI upper | need base | need ON | d need | boss HP share | cap | win ON |', '|---|---|---|---|---|---|---|---|---|---|---|---|---|'];
  let pass = 0;
  for (const l of specLevels(spec)) {
    const f = (d: string) => `${d}/a_${String(l.level).padStart(2, '0')}.json`;
    const on = readJson<AData>(f(DATA)), base = readJson<AData>(f(BASE));
    const v = on.runs.smart3.filter((r) => r.w && r.st.length).map((r) => { const k = r.st.length; return (r.st[k - 1] - (k > 1 ? r.st[k - 2] : 0)) / r.t; });
    const m = mean(v), sd = Math.sqrt(v.reduce((a, x) => a + (x - m) ** 2, 0) / Math.max(1, v.length - 1)), h = (1.96 * sd) / Math.sqrt(v.length);
    const tb = tauOf(base.runs.smart3).mean, nb = needOf(base), no = needOf(on);
    const e = o.levels[String(l.level)];
    const share = on.hps[on.hps.length - 1] / on.hps.reduce((a, b) => a + b, 0);
    const ok = m - h >= 0.5 && Math.abs(m - l.last_share_target) <= 0.03 && Math.abs(no - nb) <= 0.05 && (share <= SHARE_CEIL || e?.bossCap !== undefined);
    if (ok) pass++;
    rows.push(`| ${l.level} | ${l.kind} | ${l.last_share_target} | ${tb.toFixed(3)} | ${m.toFixed(3)} | ${(m - h).toFixed(3)} | ${(m + h).toFixed(3)} | ${nb.toFixed(3)} | ${no.toFixed(3)} | ${(no - nb >= 0 ? '+' : '') + (no - nb).toFixed(3)} | ${(share * 100).toFixed(1)}% | ${e?.bossCap ?? '-'} | ${Math.round((100 * on.runs.smart3.filter((r) => r.w).length) / on.runs.smart3.length)}% ${ok ? 'PASS' : 'fail'} |`);
  }
  return `${rows.join('
')}

pass ${pass} of ${rows.length - 2} (CI lower >= 0.50, mean within 0.03 of target, need within 0.05 of base, HP share <= 75% unless cap lever), overlay pass ${o.pass}`;
}

if (!process.env.VITEST) {
  if (args.includes('--write')) {
    writeFileSync(OVERLAY, serialize(firstOrder(readJson(SPEC))));
    console.log(`wrote ${OVERLAY} (pass 0, first order)`);
  } else if (args.includes('--check')) {
    const errs = check();
    if (errs.length) { console.error(errs.join('\n')); process.exit(1); }
    console.log(`effort overlay OK (pass ${readJson<Overlay>(OVERLAY).pass})`);
  } else if (args.includes('--iterate')) {
    const spec = readJson<{ levels: SpecLevel[] }>(SPEC);
    const o = readJson<Overlay>(OVERLAY);
    if (o.pass >= MAX_PASSES) { console.error(`already ${o.pass} passes (max ${MAX_PASSES})`); process.exit(1); }
    const targets: Record<string, number> = {}, tau: Record<string, number> = {};
    for (const l of specLevels(spec)) {
      const f = `${DATA}/a_${String(l.level).padStart(2, '0')}.json`;
      if (!existsSync(f)) { console.error(`missing measurement ${f}`); process.exit(1); }
      targets[String(l.level)] = l.last_share_target;
      tau[String(l.level)] = tauOf(readJson<{ runs: { smart3: { w: number; t: number; st: number[] }[] } }>(f).runs.smart3).mean;
    }
    const next = applyPass(o, targets, tau);
    writeFileSync(OVERLAY, serialize(next));
    for (const k of Object.keys(tau)) console.log(`L${k}: tau ${tau[k].toFixed(3)} target ${targets[k]} -> boss x${o.levels[k].bossHpMult} -> x${next.levels[k].bossHpMult}, minions x${next.levels[k].minionHpMult}${next.levels[k].bossCap ? `, cap ${next.levels[k].bossCap}` : ''}`);
    console.log(`wrote ${OVERLAY} (pass ${next.pass})`);
  } else if (args.includes('--report')) console.log(report());
  else console.log('usage: --spec <file> --write | --check | --iterate [--data <dir>]');
}
