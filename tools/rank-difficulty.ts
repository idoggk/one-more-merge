// Read-only measurement: how hard is each unit rank to reach, per saga level and family? (docs/design/RANK_DIFFICULTY.md)
// Plays every level with the game's own newLevel / drop / tick under the shipped CALM pace and two scripted players:
//   random@3.5s : a random legal merge every 3.5 s (the calibration "novice"; goal-aware like tools/sim-levels.ts)
//   rankseek@3.5s: always merges the highest-rank legal pair (a player who is trying to build rank)
// After every tick it scans the board for the highest rank of each family and records the first time (s) and the
// number of player merges at which rank k appeared. Kickback fuses and sandwiches count too (they are real ways to get a rank).
// Usage: npx vite-node tools/rank-difficulty.ts [--n 30] [--every 3.5] [--merge-rule today|sandwich2|sandwichBonus] [--levels 1,5] [--json out.json]
import { writeFileSync } from 'node:fs';
import { applyPace, DEFAULT_PACE } from '../src/content/experiments';
import { LEVELS } from '../src/content/levels';
import { applyMergeRule } from '../src/core/sandwich';
import { choosePerk, drop, legalPairs, newLevel, tick, type GameState } from '../src/core/game';
import { Rng } from '../src/core/rng';

const args = process.argv.slice(2);
const arg = (k: string, d: string) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const N = Number(arg('--n', '30'));
const EVERY = Number(arg('--every', '3.5'));
const RULE = arg('--merge-rule', 'today') as 'today' | 'sandwich2' | 'sandwichBonus';
const JSON_OUT = arg('--json', '');
const ONLY = args.includes('--levels') ? new Set(arg('--levels', '').split(',').map(Number)) : null;
applyPace(DEFAULT_PACE);
applyMergeRule(RULE);

type Kind = 'random' | 'rankseek';
type Rec = { t: number; merges: number };
type Run = { won: boolean; secs: number; fam: Record<string, Record<number, Rec>> };

function pick(s: GameState, rng: Rng, kind: Kind): [number, number] | null {
  const p = legalPairs(s);
  if (!p.length) return null;
  if (kind === 'rankseek' || s.goal?.kind === 'rank') {
    const top = Math.max(...p.map(([a]) => s.grid[a]!.rank));
    const c = p.filter(([a]) => s.grid[a]!.rank === top);
    return c[rng.int(c.length)];
  }
  const [a, b] = p[rng.int(p.length)];
  return rng.next() < 0.5 ? [a, b] : [b, a];
}

function play(level: number, botSeed: number, kind: Kind): Run {
  const def = LEVELS[level - 1];
  const s = newLevel(def);
  const rng = new Rng(botSeed);
  const fam: Run['fam'] = {};
  let merges = 0, next = EVERY;
  const scan = () => {
    for (const g of s.grid) {
      if (!g) continue;
      const f = (fam[g.family] ??= {});
      for (let r = 1; r <= g.rank; r++) f[r] ??= { t: s.elapsed, merges };
    }
  };
  scan();
  while (s.phase === 'playing' || s.phase === 'choice') {
    if (s.phase === 'choice') {
      choosePerk(s, s.offer[0]);
      continue;
    }
    if (s.elapsed >= next) {
      next += EVERY;
      const m = pick(s, rng, kind);
      if (m && drop(s, m[0], m[1], s.grid[m[0]]!.id).ok) merges++;
    }
    tick(s);
    scan();
  }
  return { won: s.phase === 'won', secs: s.elapsed, fam };
}

const med = (a: number[]) => (a.length ? [...a].sort((x, y) => x - y)[Math.floor((a.length - 1) / 2)] : NaN);
function wilson(k: number, n: number): [number, number] {
  const z = 1.96, p = k / n, d = 1 + (z * z) / n;
  const c = p + (z * z) / (2 * n), h = z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n));
  return [(c - h) / d, (c + h) / d];
}

const out: unknown[] = [];
console.log(`# rank-difficulty n=${N} every=${EVERY}s rule=${RULE} pace=${DEFAULT_PACE}`);
console.log('level kind fam rank reach% [wilson95] medT(s) medMerges | winRate medLevelSecs');
for (const kind of ['random', 'rankseek'] as Kind[]) {
  for (const def of LEVELS) {
    if (ONLY && !ONLY.has(def.level)) continue;
    const runs: Run[] = [];
    for (let k = 1; k <= N; k++) runs.push(play(def.level, def.seed * 31 + k, kind));
    const wins = runs.filter((r) => r.won).length;
    const fams = new Set(runs.flatMap((r) => Object.keys(r.fam)));
    for (const f of fams)
      for (let rank = 2; rank <= 8; rank++) {
        const hit = runs.filter((r) => r.fam[f]?.[rank]);
        if (!hit.length && rank > 3) continue;
        const [lo, hi] = wilson(hit.length, N);
        const row = { level: def.level, kind, fam: f, rank, n: N, reach: hit.length / N, lo, hi, medT: med(hit.map((r) => r.fam[f][rank].t)), medMerges: med(hit.map((r) => r.fam[f][rank].merges)), win: wins / N, medSecs: med(runs.map((r) => r.secs)), goal: def.goal ?? null };
        out.push(row);
        console.log(`L${def.level} ${kind} ${f} r${rank} ${(row.reach * 100).toFixed(0)}% [${(lo * 100).toFixed(0)}-${(hi * 100).toFixed(0)}] ${row.medT.toFixed(1)}s ${row.medMerges} | win ${(row.win * 100).toFixed(0)}% ${row.medSecs.toFixed(0)}s${def.goal ? ' GOAL' : ''}`);
      }
  }
}
if (JSON_OUT) writeFileSync(JSON_OUT, JSON.stringify(out));
