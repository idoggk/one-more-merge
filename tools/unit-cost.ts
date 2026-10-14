// UNIT COST (docs/EFFORT_MODEL.md 1.5, slice S1): the MEASURED column of the unit contribution table. Swaps one unit into the STARTER squad
// (cannon + coil + bell, no helper) and plays the same levels with the same seeds, smart@3 bot (best previewed merge every 3 s, +-20%), every roster batch on,
// unit level 1. Metric: damage per second over the first WINDOW seconds of play (or until the level ends), paired against the base squad run by run, so the
// ratio is the unit's marginal dps (1.00 = the base squad). Shooters replace the cannon, relays replace the bell, helpers / cards are added as the squad's helper.
// Tools (Row Surge, Gear Bomb) need TUNING.tools and a sandwich rule and are not measured here.
//   npx vite-node tools/unit-cost.ts --all --n 12                     all 39 units on levels 25, 45, 65
//   npx vite-node tools/unit-cost.ts --units rocket,coil --n 12 --levels 25,45 --window 60
import { LEVELS, type LevelDef } from '../src/content/levels';
import { applyPace, DEFAULT_PACE } from '../src/content/experiments';
import { applyRoster1, applyRoster2, applyRoster3, applyRoster4, applyRoster5, applyRoster6, applyRoster7 } from '../src/content/units';
import { choosePerk, drop, legalPairs, newLevel, previewMerge, tick, hitCap, type GameState } from '../src/core/game';
import { Rng } from '../src/core/rng';
import { autoSupport, supportReady, useSupport } from '../src/core/support';
import type { Family } from '../src/core/types';

const args = process.argv.slice(2);
const arg = (k: string, d: string) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const N = Number(arg('--n', '12'));
const WINDOW = Number(arg('--window', '60'));
const LV = arg('--levels', '25,45,65').split(',').map(Number);
applyPace(DEFAULT_PACE);
applyRoster1(true); applyRoster2(true); applyRoster3(true); applyRoster4(true); applyRoster5(true); applyRoster6(true); applyRoster7(true);

type Kind = 'shooter' | 'relay' | 'helper';
interface U { id: Family; kind: Kind; base: boolean }
const SHOOTERS = ['cannon', 'rocket', 'mortar', 'arc_welder', 'nail_gun', 'jackhammer', 'saw_blade', 'piston', 'blowtorch', 'tesla_tower', 'wrecking_ball', 'robot_arm', 'rivet_gun', 'hydraulic_press', 'lathe'];
const RELAYS = ['coil', 'bell', 'horn', 'fuse_box', 'gear', 'spring', 'belt_drive', 'pipe', 'capacitor', 'ladder', 'crane', 'dynamo', 'vice', 'router'];
const HELPERS = ['fan', 'magnet', 'battery', 'amplifier', 'signal_beacon', 'wrench', 'blast_plate', 'blueprint', 'rewind_crank', 'tilt_lever'];
const UNITS: U[] = [
  ...SHOOTERS.map((id) => ({ id: id as Family, kind: 'shooter' as Kind, base: id === 'cannon' })),
  ...RELAYS.map((id) => ({ id: id as Family, kind: 'relay' as Kind, base: id === 'coil' || id === 'bell' })),
  ...HELPERS.map((id) => ({ id: id as Family, kind: 'helper' as Kind, base: false })),
];
const only = args.includes('--all') ? null : new Set(arg('--units', '').split(',').filter(Boolean));

function dpsOf(def: LevelDef, u: U | null, seed: number): number {
  const shooter: Family = u?.kind === 'shooter' ? u.id : 'cannon';
  const relays: [Family, Family] = u?.kind === 'relay' && !u.base ? ['coil', u.id] : ['coil', 'bell'];
  const s: GameState = newLevel({ ...def, seed: (def.seed + seed) >>> 0 }, { shooter, relays, toys: u?.kind === 'helper' ? [u.id] : [] });
  const rng = new Rng(seed);
  let next = 3 * (0.8 + 0.4 * rng.next());
  while ((s.phase === 'playing' || s.phase === 'choice') && s.elapsed < WINDOW) {
    if (s.phase === 'choice') { choosePerk(s, s.offer[0]); continue; }
    if (s.elapsed >= next) {
      next += 3 * (0.8 + 0.4 * rng.next());
      const sup = s.support && supportReady(s) ? autoSupport(s) : null;
      if (sup) useSupport(s, sup.cell, sup.axis);
      let best: [number, number] | undefined, bs = -1;
      for (const [a, b] of legalPairs(s)) for (const [f, t] of [[a, b], [b, a]] as [number, number][]) {
        const r = previewMerge(s, f, t);
        const sc = r ? Math.min(r.total, s.goal ? Infinity : hitCap(s)) : -1;
        if (sc > bs) [best, bs] = [[f, t], sc];
      }
      if (best && s.phase === 'playing') drop(s, best[0], best[1], s.grid[best[0]]!.id);
    }
    tick(s);
  }
  return s.stats.totalDamage / Math.max(1, s.elapsed);
}

const defs = LV.map((n) => LEVELS.find((d) => d.level === n)!).filter(Boolean);
const mean = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;
const baseRuns = new Map<string, number>();
const seedOf = (d: LevelDef, i: number) => d.level * 1009 + i * 7919;
for (const d of defs) for (let i = 1; i <= N; i++) baseRuns.set(`${d.level}/${i}`, dpsOf(d, null, seedOf(d, i)));

console.log(`unit-cost: levels ${LV.join(',')} n=${N} per level, window ${WINDOW} s, smart@3, unit level 1, base squad cannon + coil + bell`);
console.log('| unit | kind | marginal dps vs base (mean of paired ratios) | 95% interval | per level |');
console.log('|---|---|---|---|---|');
for (const u of UNITS) {
  if (only && !only.has(u.id)) continue;
  if (u.base) { console.log(`| ${u.id} | ${u.kind} | 1.00 | reference | - |`); continue; }
  const per: number[] = [], all: number[] = [];
  for (const d of defs) {
    const r: number[] = [];
    for (let i = 1; i <= N; i++) r.push(dpsOf(d, u, seedOf(d, i)) / Math.max(1e-9, baseRuns.get(`${d.level}/${i}`)!));
    per.push(mean(r));
    all.push(...r);
  }
  const m = mean(all), sd = Math.sqrt(all.reduce((a, x) => a + (x - m) ** 2, 0) / Math.max(1, all.length - 1)), h = (1.96 * sd) / Math.sqrt(all.length);
  console.log(`| ${u.id} | ${u.kind} | ${m.toFixed(2)} | ${(m - h).toFixed(2)} to ${(m + h).toFixed(2)} | ${per.map((x) => x.toFixed(2)).join(' / ')} |`);
}
