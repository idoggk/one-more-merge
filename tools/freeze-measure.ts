// MERGE FREEZE (read-only, t-edbacde4, docs/design/MERGE_FREEZE_AUDIT.md): per level, how long is merging blocked by core hazards
// (clamp / frost / junk / remix locks), how long is every merge pair blocked ("frozen"), and how long does the board have no pair?
// Uses the project's own newLevel/tick/drop/legalPairs; bot = level-report's smart3 (best previewed merge every 3 s +-20%).
// usage: npx vite-node tools/freeze-measure.ts --from 1 --to 80 --n 8 [--pace calm] [--out file.csv]
// Scene-level freezes (intro, cards, inspect) are not simulated here: they are read from GameScene.ts (see the doc).
import { writeFileSync } from 'node:fs';
import { applyPace } from '../src/content/experiments';
import { LEVELS } from '../src/content/levels';
import { hitCap, choosePerk, drop, legalPairs, locked, newLevel, previewMerge, tick, canMerge, type GameState } from '../src/core/game';
import { bossBlocked } from '../src/core/boss';
import { Rng } from '../src/core/rng';
import type { Pace } from '../src/content/tuning';

const args = process.argv.slice(2);
const arg = (k: string) => (args.includes(k) ? args[args.indexOf(k) + 1] : undefined);
const FROM = Number(arg('--from')) || 1, TO = Number(arg('--to')) || LEVELS.length, N = Number(arg('--n')) || 8;
applyPace((arg('--pace') ?? 'calm') as Pace);

const capOf = (s: GameState) => (s.goal ? Infinity : hitCap(s));
function best(s: GameState) {
  let top: { f: number; t: number; score: number } | undefined;
  for (const [a, b] of legalPairs(s))
    for (const [f, t] of [[a, b], [b, a]] as [number, number][]) {
      const r = previewMerge(s, f, t);
      if (!r) continue;
      const eff = Math.min(r.total, capOf(s));
      const score = s.goal?.kind === 'rank' ? (s.grid[f]!.rank + 1) * 1000 + eff / 1e6 : s.goal?.kind === 'chain' ? r.count * 1000 + eff / 1e6 : eff;
      if (!top || score > top.score) top = { f, t, score };
    }
  return top;
}
// does ANY merge pair exist on the board ignoring blocks, and can a real drop() do one of them now?
function pairState(s: GameState): 'none' | 'frozen' | 'ok' {
  const pairs: [number, number][] = [];
  for (let i = 0; i < s.grid.length; i++) for (let j = i + 1; j < s.grid.length; j++) if (canMerge(s.grid[i], s.grid[j], s)) pairs.push([i, j]);
  if (!pairs.length) return 'none';
  const lk = locked(s), bb = bossBlocked(s.boss);
  for (const [i, j] of pairs) {
    if (lk.has(i) || lk.has(j)) continue;
    if ((!bb.noDrag.has(i) && !bb.noDrop.has(j)) || (!bb.noDrag.has(j) && !bb.noDrop.has(i))) return 'ok';
  }
  return 'frozen';
}

interface Run { t: number; won: boolean; hazard: number; frozen: number; none: number; warns: number; hazardCells: number }
function play(level: number, seed: number): Run {
  const def = LEVELS[level - 1];
  const s = newLevel(def);
  const rng = new Rng(seed);
  let next = 3 * (0.8 + 0.4 * rng.next());
  const r: Run = { t: 0, won: false, hazard: 0, frozen: 0, none: 0, warns: 0, hazardCells: 0 };
  let guard = 0;
  while ((s.phase === 'playing' || s.phase === 'choice') && guard++ < 40000) {
    if (s.phase === 'choice') { choosePerk(s, s.offer[0]); continue; }
    if (s.elapsed >= next) {
      next += 3 * (0.8 + 0.4 * rng.next());
      const o = best(s);
      if (o) drop(s, o.f, o.t, s.grid[o.f]!.id);
    }
    const ev = tick(s);
    for (const e of ev) if (e.type === 'bossWarn') r.warns++;
    const lk = locked(s), bb = bossBlocked(s.boss);
    const cells = new Set<number>([...lk, ...bb.noDrag, ...bb.noDrop]);
    const hz = cells.size - (s.masked?.length ?? 0) > 0 && [...cells].some((c) => !(s.masked ?? []).includes(c));
    if (hz) { r.hazard += 0.05; r.hazardCells += 0.05 * cells.size; }
    const ps = pairState(s);
    if (ps === 'frozen') r.frozen += 0.05;
    else if (ps === 'none') r.none += 0.05;
  }
  r.t = s.elapsed;
  r.won = s.phase === 'won';
  return r;
}

const rows: string[] = ['level,kind,n,wins,t_med,t_p90,hazard_s,hazard_pct,frozen_s,frozen_pct,frozen_max_s,nopair_s,nopair_pct,warns'];
const med = (a: number[]) => { const b = [...a].sort((x, y) => x - y); return b.length ? b[Math.floor((b.length - 1) / 2)] : NaN; };
const p90 = (a: number[]) => { const b = [...a].sort((x, y) => x - y); return b.length ? b[Math.min(b.length - 1, Math.floor(0.9 * b.length))] : NaN; };
const mean = (a: number[]) => a.reduce((x, y) => x + y, 0) / Math.max(1, a.length);
for (let L = FROM; L <= TO; L++) {
  const runs: Run[] = [];
  for (let i = 1; i <= N; i++) runs.push(play(L, L * 1009 + i * 7919));
  const def = LEVELS[L - 1];
  const kind = def.goal ? `${def.goal.kind}${def.goal.n}` : def.mini_boss ? 'mini' : L % 10 === 0 ? 'boss' : 'normal';
  const T = mean(runs.map((x) => x.t)), H = mean(runs.map((x) => x.hazard)), F = mean(runs.map((x) => x.frozen)), Z = mean(runs.map((x) => x.none));
  rows.push([L, kind, N, runs.filter((x) => x.won).length, med(runs.map((x) => x.t)).toFixed(1), p90(runs.map((x) => x.t)).toFixed(1), H.toFixed(2), ((100 * H) / T).toFixed(1), F.toFixed(2), ((100 * F) / T).toFixed(1), Math.max(...runs.map((x) => x.frozen)).toFixed(2), Z.toFixed(2), ((100 * Z) / T).toFixed(1), mean(runs.map((x) => x.warns)).toFixed(1)].join(','));
  console.error(rows[rows.length - 1]);
}
writeFileSync(arg('--out') ?? 'freeze-out.csv', rows.join('\n') + '\n');
