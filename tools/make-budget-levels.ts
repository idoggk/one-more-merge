// t-4c676288 LAST MERGES bench generator. Writes src/content/budgetLevels.json (never edit that file, or levels.json, by hand).
// Each bench level = an existing saga machine's look + an AUTHORED board (ASCII below) + a merge budget. The exact planner (tools/budget-lib.ts)
// finds the best damage D*(k) in k merges. HP is HP_SHARE (75%) of D*(budget), but never more than D*(budget - want) so the best line banks
// `want` spare merges (3 for the 3-star line; 2 on the 6-merge level). The tool also tries re-seatings of the same parts (the authored layout is
// candidate 0) and keeps the one where a greedy line (hit hardest now) falls 15-25% short of HP, closest to 20%.
// Usage: npx vite-node tools/make-budget-levels.ts [--dry]
import { readFileSync, writeFileSync } from 'node:fs';
import { budgetPuzzleDef, DEFAULT_STAR_SPARE, type BudgetLevel } from '../src/core/budget';
import { levelDef } from '../src/content/levels';
import { Rng } from '../src/core/rng';
import { BIG, BOTS, Planner, beamBest, playout } from './budget-lib';

/** HP as a share of the best damage the planner finds in the whole budget (owner brief: about 75%). */
const HP_SHARE = 0.75;
/** A greedy line should miss HP by this much (15-25%, target the middle). */
const GREEDY_SHORT: [number, number] = [0.15, 0.25];
const arg = (k: string) => process.argv.find((a) => a.startsWith(`--${k}=`))?.split("=")[1];
const TRIES = +(arg("tries") ?? 60);
const ONLY = arg("only");

/** A 1-second spammer may win at most this share of games (else the level is a push-over). */
const SPAM_MAX = 0.1;
type Spec = { id: string; name: string; level: number; merge_budget: number; want: number; share?: number; rows: string[]; note: string };
const FAM: Record<string, string> = { c: 'cannon', k: 'coil', b: 'bell' };

/** ASCII board, 6 rows of 5 cells: `.` empty, else family letter (c cannon, k coil, b bell) + rank digit. */
const parse = (rows: string[]): BudgetLevel['board'] =>
  rows.flatMap((row, r) => row.trim().split(/\s+/).flatMap((t, c): BudgetLevel['board'] => (t === '.' ? [] : [[FAM[t[0]], +t.slice(1), r, c]])));

const SPECS: Spec[] = [
  {
    id: 'last6',
    name: 'LAST 6',
    level: 6,
    merge_budget: 6,
    want: 2,
    note: 'Coil-then-bells: the coil pair and the bell pair in the middle only pay off when they are merged in the right order.',
    rows: ['. . . . c3', 'c2 . . . .', '. . k2 b2 .', '. k1 k1 . c2', '. c1 c1 b1 b1', 'c3 . . . .'],
  },
  {
    id: 'last8',
    name: 'LAST 8',
    level: 17,
    merge_budget: 8,
    want: 2, // best line banks 2 spare => star lines [1,2]: a real 2-star step. Boards where the spammer wins more than SPAM_MAX are rejected.
    note: 'A ladder of rank-1 cannons climbs to one big hit; the ready-made pairs are decoys that spend merges for less.',
    rows: ['c3 . . . c3', '. c1 c1 . k2', 'k1 c1 c1 . .', 'b2 . . b2 .', '. k1 k2 . c2', '. c2 . . .'],
  },
  {
    id: 'last10',
    name: 'LAST 10',
    level: 31,
    merge_budget: 10,
    want: 2,
    share: 0.98, // tighter: HP up to D*(budget-2) (was 75% of best = 5 of 10 merges), so the best line needs about 8 of 10
    note: 'Ten merges for a ladder, a coil row and a bell pair: every merge that does not build toward the top hit is a merge wasted.',
    // (kept to 16 parts: the exact planner's search grows with the parts on the board)
    rows: ['c1 c1 k1 k1 .', 'c1 . b2 . .', 'c2 c2 . b2 .', '. . c3 . c3', 'b1 b1 . . .', 'c4 . . . .'],
  },
];

/** A few parts moved to other empty cells: keeps the authored idea, changes where the traps are. */
const mutate = (board: BudgetLevel['board'], rng: Rng): BudgetLevel['board'] => {
  const next = board.map((p) => [...p] as BudgetLevel['board'][number]);
  const used = new Set(next.map(([, , r, c]) => r * 5 + c));
  if (rng.next() < 0.3) {
    const p = next[rng.int(next.length)];
    p[1] = Math.max(1, Math.min(4, p[1] + (rng.next() < 0.5 ? -1 : 1)));
  }
  for (let n = 1 + rng.int(3); n > 0; n--) {
    const free = Array.from({ length: 30 }, (_, i) => i).filter((i) => !used.has(i));
    const p = next[rng.int(next.length)];
    used.delete(p[2] * 5 + p[3]);
    const cell = free[rng.int(free.length)];
    [p[2], p[3]] = [Math.floor(cell / 5), cell % 5];
    used.add(cell);
  }
  return next;
};

interface Cand { level: BudgetLevel; short: number; spareBest: number; score: number }

/** exact = the memoised planner (slow, sets the real numbers); otherwise the beam screen (fast, for choosing between boards). */
function measure(sp: Spec, board: BudgetLevel['board'], exact: boolean): Cand {
  const src = levelDef(sp.level)!;
  const at = (hp: number) => budgetPuzzleDef({ id: sp.id, merge_budget: sp.merge_budget, hp, board, solution: [] } as unknown as BudgetLevel);
  const base = at(BIG);
  const planner = new Planner();
  const top = exact ? Array.from({ length: sp.merge_budget }, (_, k) => planner.line(base, k + 1).dmg.at(-1) ?? 0) : beamBest(base);
  const best = top[sp.merge_budget - 1];
  const hp = Math.floor(Math.min((sp.share ?? HP_SHARE) * best, top[sp.merge_budget - sp.want - 1] ?? 0));
  const minMerges = top.findIndex((d) => d >= hp) + 1;
  const spareBest = sp.merge_budget - minMerges;
  const star: [number, number] = spareBest >= DEFAULT_STAR_SPARE[1] ? DEFAULT_STAR_SPARE : [Math.max(1, spareBest - 1), Math.max(1, spareBest)];
  // greedy: average over tie-breaks
  const g = Array.from({ length: 30 }, (_, i) => playout(base, BOTS[2].pick(new Rng(i + 1))).dmg.at(-1) ?? 0).reduce((a, b) => a + b, 0) / 30;
  const short = hp > 0 ? 1 - g / hp : 0;
  // the 1-second spammer (first pair scanning the board, 80%): win share against this HP
  const spam = Array.from({ length: 40 }, (_, i) => (playout(base, BOTS[1].pick(new Rng(i * 977 + 13))).dmg.some((d) => d >= hp) ? 1 : 0) as number).reduce((a, b) => a + b, 0) / 40;
  const ok = short >= GREEDY_SHORT[0] && short <= GREEDY_SHORT[1] && spareBest >= sp.want && spam <= SPAM_MAX;
  const score = (ok ? 0 : 10) + Math.max(0, spam - SPAM_MAX) * 3 +Math.abs(short - (GREEDY_SHORT[0] + GREEDY_SHORT[1]) / 2) + (spareBest >= sp.want ? 0 : 5) + (best < 400 ? 20 : 0);
  return {
    short, spareBest, score,
    level: {
      id: sp.id, name: sp.name, level: sp.level, monster: src.monster, visual: src.visual, merge_budget: sp.merge_budget, hp, board, star_spare: star,
      solution: exact ? planner.line(at(hp), minMerges).moves : [], planner: { best_damage: Math.round(best), min_merges: minMerges, greedy_damage: Math.round(g), hp_share: +(hp / best).toFixed(3) }, note: sp.note,
    },
  };
}

const t0 = Date.now();
const levels: BudgetLevel[] = [];
for (const sp of SPECS.filter((x) => !ONLY || x.id === ONLY)) {
  const authored = parse(sp.rows);
  const rng = new Rng(0xb0d9e7 ^ sp.merge_budget);
  // hill-climb on the beam screen from the authored layout, then confirm the best few with the exact planner
  const pool: Cand[] = [measure(sp, authored, false)];
  console.log(`${sp.id} authored (screen): short ${(100 * pool[0].short).toFixed(0)}% spare ${pool[0].spareBest} hp ${pool[0].level.hp}`);
  let cur = pool[0];
  for (let i = 0; i < TRIES; i++) {
    const c = measure(sp, mutate(cur.level.board, rng), false);
    pool.push(c);
    if (c.score <= cur.score) cur = c;
  }
  pool.sort((x, y) => x.score - y.score);
  let pick: Cand | null = null;
  for (const cand of pool.slice(0, 4)) {
    const e = measure(sp, cand.level.board, true);
    console.log(`  exact: score ${e.score.toFixed(2)} short ${(100 * e.short).toFixed(0)}% spare ${e.spareBest} hp ${e.level.hp}`);
    if (!pick || e.score < pick.score) pick = e;
    if (e.score < 10) break;
  }
  const p = pick!.level.planner;
  console.log(`${sp.id}: hp ${pick!.level.hp} (${(100 * p.hp_share).toFixed(0)}% of best ${p.best_damage}) | min merges ${p.min_merges}/${sp.merge_budget} stars spare ${pick!.level.star_spare} | greedy ${p.greedy_damage} = ${(100 * pick!.short).toFixed(0)}% short of HP${pick!.score >= 10 ? '  !! OUT OF BAND' : ''}`);
  levels.push(pick!.level);
}
console.log(`${Date.now() - t0} ms`);
if (!process.argv.includes('--dry')) {
  // --only= replaces just that level in the file (the others stay as they were), in spec order
  const file = new URL('../src/content/budgetLevels.json', import.meta.url);
  const kept = ONLY ? (JSON.parse(readFileSync(file, 'utf8')).levels as BudgetLevel[]).filter((l) => l.id !== ONLY) : [];
  const all = [...kept, ...levels].sort((a, b) => a.merge_budget - b.merge_budget);
  writeFileSync(file, JSON.stringify({ levels: all }, null, 2) + '\n');
}
