// DECOY BOARDS (t-18ba2d06, read-only measurement, NO game change). Question: on capped-merge boards authored so that the biggest-damage merge is a trap,
// does the planner beat a "grab the biggest merge" bot by >= 1.5x while a human proxy (greedy with 20% mistakes) keeps >= 0.8 of its normal damage?
// And does a NEXT strip (the next 2 incoming parts shown) help a human-proxy bot? Boards live in tools/decoy-boards.json; bots follow tools/preview-gap.ts.
// Usage (all output is deterministic text; chunks are small enough to finish inside a tool call):
//   npx vite-node tools/decoy-boards.ts list                      the boards, ASCII drawings, rank mass, legal first merges
//   npx vite-node tools/decoy-boards.ts static [filter]           planner / greedy / human proxy over 200 seeds (no incoming parts), markdown rows
//   npx vite-node tools/decoy-boards.ts supply <filter> [runs=200] [depth=3]   incoming parts queue: bots without / with the NEXT strip, TSV rows
//   npx vite-node tools/decoy-boards.ts report <supply tsv files...>           merges chunk files into the NEXT-strip tables
import { readFileSync } from 'node:fs';
import { BUDGET_LEVELS, type BudgetLevel } from '../src/core/budget';
import { TUNING } from '../src/content/tuning';
import { COLS, ROWS } from '../src/content/tuning';
import { drop, makeGadget, newPuzzle, previewMerge, type GameState, type PuzzleDef } from '../src/core/game';
import { puzzleMoves } from '../src/core/puzzle';
import { Rng } from '../src/core/rng';
import type { Family } from '../src/core/types';
import data from './decoy-boards.json';

const BIG = 1e9;
type Board = BudgetLevel['board'];
type Move = [number, number];
export interface DecoyBoard {
  id: string;
  kind: 'sandwich' | 'chain' | 'ordinary';
  /** 'puzzle' = the Budget Levels engine as shipped (no sandwiches); 'free' = the same board outside the puzzle engine so the sandwich rule exists (merge budget enforced by the harness). */
  mode: 'puzzle' | 'free';
  rule: 'sandwich2' | 'sandwichBonus' | 'today';
  budget: number;
  board: Board;
  trap?: string;
}
export const DECOYS: DecoyBoard[] = (data as { boards: DecoyBoard[] }).boards;

// ---- engine adapters ------------------------------------------------------------------------------------------------------------------------------
const gridKey = (s: GameState) => s.grid.map((g) => (g ? `${g.family}:${g.rank}` : '.')).join(',');
function setup(b: DecoyBoard): GameState {
  const def: PuzzleDef = { id: `db:${b.id}`, moves: b.budget, hp: BIG, board: b.board, solution: [] };
  const s = newPuzzle(def);
  TUNING.mergeRule = b.rule;
  if (b.mode === 'free') delete s.puzzle; // sandwiches only exist outside the puzzle engine; no tick() is ever run, so no clock / supply / kickback
  return s;
}
const moves = (s: GameState): Move[] => puzzleMoves(s);
function apply(s: GameState, m: Move): GameState {
  const t = structuredClone(s);
  drop(t, m[0], m[1], t.grid[m[0]]!.id);
  return t;
}
const dmgOf = (s: GameState, t: GameState) => s.hp - t.hp;
/** What the on-screen preview shows for a merge (damage as today). */
const seen = (s: GameState, m: Move) => previewMerge(s, m[0], m[1])?.total ?? 0;

// ---- incoming parts ---------------------------------------------------------------------------------------------------------------------------------
/** One incoming part: what it is and a seeded preference order of cells; it lands in the first EMPTY cell of its order (so the strip can show where). */
interface Incoming { family: Family; rank: number; order: number[] }
const FAMS: Family[] = ['cannon', 'cannon', 'coil', 'bell'];
/** The queue for a run: one part per merge (arrives after that merge), rank 1 (75%) or 2, family weighted like the bench boards. Fully determined by `seed`. */
function makeQueue(seed: number, n: number): Incoming[] {
  const rng = new Rng(seed * 2654435761 + 17);
  return Array.from({ length: n }, () => ({ family: FAMS[rng.int(FAMS.length)], rank: rng.next() < 0.75 ? 1 : 2, order: rng.shuffle(Array.from({ length: ROWS * COLS }, (_, i) => i)) }));
}
function arrive(s: GameState, p: Incoming): GameState {
  const t = structuredClone(s);
  const cell = p.order.find((i) => !t.grid[i]);
  if (cell !== undefined) t.grid[cell] = makeGadget(t, p.family, p.rank);
  return t;
}

// ---- planner (exact over the board when no arrivals are known; depth-limited with known arrivals) --------------------------------------------------
class Planner {
  private memo = new Map<string, number>();
  constructor(private queue: Incoming[], private known: number, private depth: number) {}
  /** `done` merges made so far; arrivals with index < `known` are visible to the planner. */
  best(s: GameState, left: number, done: number, d = this.depth): number {
    if (d === 0 || left === 0) return 0;
    const key = `${left}|${done}|${Math.min(d, left)}|${gridKey(s)}`; // depth beyond the merges left changes nothing, so exact and deep searches share entries
    const hit = this.memo.get(key);
    if (hit !== undefined) return hit;
    let out = 0;
    for (const m of moves(s)) {
      let t = apply(s, m);
      const gain = dmgOf(s, t);
      if (done < this.known && left > 1 && this.queue[done]) t = arrive(t, this.queue[done]);
      out = Math.max(out, gain + this.best(t, left - 1, done + 1, d - 1));
    }
    this.memo.set(key, out);
    return out;
  }
  /** The first move of a best line (ties: first found, deterministic). */
  pick(s: GameState, left: number, done: number): Move | null {
    let best = -1, bm: Move | null = null;
    for (const m of moves(s)) {
      let t = apply(s, m);
      const gain = dmgOf(s, t);
      if (done < this.known && left > 1 && this.queue[done]) t = arrive(t, this.queue[done]);
      const v = gain + this.best(t, left - 1, done + 1, this.depth - 1);
      if (v > best + 1e-9) [best, bm] = [v, m];
    }
    return bm;
  }
}
/** Exact best K-merge damage with nothing incoming (the static planner). */
const exactBest = (s: GameState, k: number) => new Planner([], 0, k + 1).best(s, k, 0, k + 1);

// ---- bots ---------------------------------------------------------------------------------------------------------------------------------------
const pickMax = (rng: Rng, list: Move[], score: (m: Move) => number): Move => {
  let best = -Infinity, top: Move[] = [];
  for (const m of list) {
    const v = score(m);
    if (v > best + 1e-9) [best, top] = [v, [m]];
    else if (v > best - 1e-9) top.push(m);
  }
  return top[rng.int(top.length)];
};
type Kind = 'greedy' | 'human' | 'planner';
interface Bot { name: string; kind: Kind; next: boolean; /** lookahead: 1 = the preview only; 2 = also the best follow-up after the next part lands */ look: number }
const NOISE = 0.2;

/** Best preview damage reachable by one more merge on `t` (what a 2-ply bot adds to a candidate). */
const follow = (t: GameState) => moves(t).reduce((m, x) => Math.max(m, seen(t, x)), 0);

function choose(bot: Bot, rng: Rng, s: GameState, left: number, done: number, queue: Incoming[], depth: number): Move {
  const list = moves(s);
  if (bot.kind === 'planner') {
    // the planner re-plans every merge; with NEXT it knows the parts that arrive after the next 2 merges
    return new Planner(queue, bot.next ? done + 2 : 0, depth).pick(s, left, done) ?? list[0];
  }
  if (bot.kind === 'human' && rng.next() < NOISE) return list[rng.int(list.length)];
  if (bot.look === 1) return pickMax(rng, list, (m) => seen(s, m));
  // 2-ply: this merge's damage + the best follow-up merge (after the next incoming part lands, when the strip shows it)
  return pickMax(rng, list, (m) => {
    let t = apply(s, m);
    const g = dmgOf(s, t);
    if (left <= 1) return g;
    if (bot.next && queue[done]) t = arrive(t, queue[done]);
    return g + follow(t);
  });
}

/** Damage a bot deals in `k` merges from `s0`. `queue` arrives after merges 0..k-2 (empty = the static board). */
function play(s0: GameState, k: number, bot: Bot, seed: number, queue: Incoming[], depth: number): number {
  const rng = new Rng(seed);
  let s = s0;
  for (let done = 0; done < k; done++) {
    if (!moves(s).length) break;
    s = apply(s, choose(bot, rng, s, k - done, done, queue, depth));
    if (queue[done] && done < k - 1) s = arrive(s, queue[done]);
  }
  return s0.hp - s.hp;
}

// ---- statistics ---------------------------------------------------------------------------------------------------------------------------------
const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
const mean = (a: number[]) => sum(a) / Math.max(a.length, 1);
type CI = { r: number; lo: number; hi: number };
/** ratio of means plus a seeded bootstrap 95% interval over runs (paired by run index). */
function ratio(num: number[], den: number[]): CI {
  const n = num.length, rng = new Rng(20260101);
  const rs: number[] = [];
  for (let b = 0; b < 1000; b++) {
    let a = 0, d = 0;
    for (let i = 0; i < n; i++) { const j = rng.int(n); a += num[j]; d += den[j]; }
    rs.push(a / Math.max(d, 1e-9));
  }
  rs.sort((x, y) => x - y);
  return { r: sum(num) / Math.max(sum(den), 1e-9), lo: rs[Math.floor(0.025 * rs.length)], hi: rs[Math.floor(0.975 * rs.length)] };
}
const fmt = (x: CI) => `${x.r.toFixed(2)} [${x.lo.toFixed(2)}, ${x.hi.toFixed(2)}]`;

// ---- boards / drawings -----------------------------------------------------------------------------------------------------------------------------
const mass = (b: Board) => sum(b.map((p) => 2 ** (p[1] - 1)));
const LETTER: Record<string, string> = { cannon: 'C', coil: 'K', bell: 'B' };
/** ASCII drawing: letter = family (C cannon, K coil, B bell), digit = rank, `..` = empty. */
export function draw(b: Board): string {
  const cells = Array.from({ length: ROWS * COLS }, () => '..');
  for (const [f, r, row, col] of b) cells[row * COLS + col] = `${LETTER[f]}${r}`;
  return Array.from({ length: ROWS }, (_, r) => '  ' + cells.slice(r * COLS, r * COLS + COLS).join(' ')).join('\n');
}
const mutate = (board: Board, rng: Rng): Board => {
  const next = board.map((p) => [...p] as Board[number]);
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
/** Ordinary capped boards: the shipped bench board (g = 0) and seeded re-seatings of it (the generator's own `mutate`, same as the preview-gap tool). */
function ordinary(): DecoyBoard[] {
  const out: DecoyBoard[] = [];
  for (const id of ['last6', 'last8']) {
    const b = BUDGET_LEVELS.find((x) => x.id === id)!;
    for (let g = 0; g < 6; g++) out.push({ id: `ord-${id}-${g}`, kind: 'ordinary', mode: 'puzzle', rule: 'today', budget: b.merge_budget, board: g === 0 ? b.board : mutate(b.board, new Rng(g * 7919 + 1)) });
  }
  return out;
}
export const ALL = (): DecoyBoard[] => [...DECOYS, ...ordinary()];
const pick = (filter?: string) => ALL().filter((b) => !filter || filter === 'all' || b.id.includes(filter) || b.kind === filter);

// ---- commands -----------------------------------------------------------------------------------------------------------------------------------
const SEEDS = 200;
function list() {
  for (const b of ALL()) {
    const s = setup(b);
    const ms = moves(s).map((m) => ({ m, d: seen(s, m) })).sort((x, y) => y.d - x.d || x.m[0] - y.m[0] || x.m[1] - y.m[1]);
    const distinct = new Set(ms.map((x) => x.d)).size;
    console.log(`\n${b.id}  [${b.kind}, LAST ${b.budget}, ${b.mode}/${b.rule}]  parts ${b.board.length}, rank mass ${mass(b.board)}, legal first merges ${ms.length}, distinct damages ${distinct}`);
    console.log(draw(b.board));
    console.log(`  top first merges (from>to: damage): ${ms.slice(0, 5).map((x) => `${x.m[0]}>${x.m[1]}: ${x.d.toFixed(0)}`).join(', ')}`);
    if (b.trap) console.log(`  trap: ${b.trap}`);
  }
}
const GREEDY: Bot = { name: 'greedy', kind: 'greedy', next: false, look: 1 };
const HUMAN: Bot = { name: 'human', kind: 'human', next: false, look: 1 };

function staticRows(filter?: string) {
  console.log('| board | kind | LAST | mass | first merges | planner dmg | planner/greedy [95%] | planner/human [95%] | greedy first-pick trap? | greedy dmg | human dmg | greedy merges spent |');
  console.log('|---|---|---|---|---|---|---|---|---|---|---|---|');
  for (const b of pick(filter)) {
    const s0 = setup(b);
    const best = exactBest(s0, b.budget);
    const g: number[] = [], h: number[] = [];
    for (let i = 0; i < SEEDS; i++) {
      g.push(play(s0, b.budget, GREEDY, i * 977 + 13, [], 0));
      h.push(play(s0, b.budget, HUMAN, i * 977 + 13, [], 0));
    }
    const P = g.map(() => best);
    console.log(`| ${b.id} | ${b.kind} | ${b.budget} | ${mass(b.board)} | ${moves(s0).length} | ${best.toFixed(0)} | ${fmt(ratio(P, g))} | ${fmt(ratio(P, h))} | ${mean(g) < 0.99 * best ? 'yes' : 'no'} | ${mean(g).toFixed(0)} | ${mean(h).toFixed(0)} | ${greedyLine(b).length}/${b.budget} |`);
  }
}

/** Supply runs: for each queue seed, every bot's damage: `board<TAB>bot<TAB>run<TAB>damage`. */
const SUPPLY_BOTS: Bot[] = [
  { name: 'greedy', kind: 'greedy', next: false, look: 1 },
  { name: 'greedy+next', kind: 'greedy', next: true, look: 2 },
  { name: 'greedy2', kind: 'greedy', next: false, look: 2 },
  { name: 'human', kind: 'human', next: false, look: 1 },
  { name: 'human+next', kind: 'human', next: true, look: 2 },
  { name: 'human2', kind: 'human', next: false, look: 2 },
  { name: 'planner', kind: 'planner', next: false, look: 1 },
  { name: 'planner+next', kind: 'planner', next: true, look: 1 },
];
function supply(filter: string, runs: number, depth: number, from = 0) {
  for (const b of pick(filter)) {
    const s0 = setup(b);
    for (let i = from; i < from + runs; i++) {
      const q = makeQueue(i + 1, b.budget);
      for (const bot of SUPPLY_BOTS) console.log(`${b.id}\t${bot.name}\t${i}\t${play(s0, b.budget, bot, i * 977 + 13, q, depth)}`);
    }
  }
}

function report(files: string[]) {
  const sets = new Map<string, Map<string, number[]>>();
  for (const f of files)
    for (const line of readFileSync(f, 'utf8').split('\n')) {
      const [bd, bot, run, val] = line.split('\t');
      if (val === undefined) continue;
      const m = sets.get(bd) ?? sets.set(bd, new Map()).get(bd)!;
      (m.get(bot) ?? m.set(bot, []).get(bot)!)[+run] = +val;
    }
  const byId = new Map(ALL().map((b) => [b.id, b]));
  const groups: Record<string, string[]> = {};
  for (const id of [...sets.keys()].sort()) (groups[byId.get(id)!.kind] ??= []).push(id);
  console.log('| board | kind | runs | planner/greedy | planner+next / greedy+next | planner/human | planner+next / human+next | human+next / human | human dmg | greedy+next / greedy | planner+next / planner |');
  console.log('|---|---|---|---|---|---|---|---|---|---|---|');
  const agg = new Map<string, Map<string, number[]>>();
  for (const id of [...sets.keys()].sort()) {
    const m = sets.get(id)!;
    const k = byId.get(id)!.kind;
    const a = agg.get(k) ?? agg.set(k, new Map()).get(k)!;
    for (const [bot, v] of m) { const arr = a.get(bot) ?? a.set(bot, []).get(bot)!; arr.push(...v); }
    console.log(`| ${id} | ${k} | ${m.get('greedy')!.length} | ${fmt(ratio(m.get('planner')!, m.get('greedy')!))} | ${fmt(ratio(m.get('planner+next')!, m.get('greedy+next')!))} | ${fmt(ratio(m.get('planner')!, m.get('human')!))} | ${fmt(ratio(m.get('planner+next')!, m.get('human+next')!))} | ${fmt(ratio(m.get('human+next')!, m.get('human')!))} | ${mean(m.get('human')!).toFixed(0)} | ${fmt(ratio(m.get('greedy+next')!, m.get('greedy')!))} | ${fmt(ratio(m.get('planner+next')!, m.get('planner')!))} |`);
  }
  // human proxy "kept": its mean damage on a decoy board vs its mean damage on the ordinary boards of the same budget (boards of one budget are the same size)
  const ordHuman = (budget: number) => mean(ALL().filter((b) => b.kind === 'ordinary' && b.budget === budget && sets.has(b.id)).flatMap((b) => sets.get(b.id)!.get('human')!));
  console.log('\nHuman proxy kept (its damage on the board / its mean damage on ordinary boards of the same LAST budget):\n');
  console.log('| board | LAST | human dmg | ordinary human dmg | kept | human share of planner dmg | ordinary share |');
  console.log('|---|---|---|---|---|---|---|');
  for (const id of [...sets.keys()].sort()) {
    const b = byId.get(id)!, m = sets.get(id)!;
    const hd = mean(m.get('human')!), od = ordHuman(b.budget);
    const sh = hd / mean(m.get('planner')!);
    const osh = mean(ALL().filter((x) => x.kind === 'ordinary' && x.budget === b.budget && sets.has(x.id)).map((x) => mean(sets.get(x.id)!.get('human')!) / mean(sets.get(x.id)!.get('planner')!)));
    console.log(`| ${id} | ${b.budget} | ${hd.toFixed(0)} | ${od.toFixed(0)} | ${(hd / od).toFixed(2)} | ${sh.toFixed(2)} | ${osh.toFixed(2)} |`);
  }
  console.log('\nBy kind (all runs pooled per kind; boards differ in size, so read the per-board rows first):\n');
  console.log('| kind | runs | planner/greedy | planner+next / greedy+next | planner/human | planner+next / human+next | human+next / human | human2 (2-ply, no strip) / human | human+next / human2 |');
  console.log('|---|---|---|---|---|---|---|---|---|');
  for (const [k, m] of agg)
    console.log(`| ${k} | ${m.get('greedy')!.length} | ${fmt(ratio(m.get('planner')!, m.get('greedy')!))} | ${fmt(ratio(m.get('planner+next')!, m.get('greedy+next')!))} | ${fmt(ratio(m.get('planner')!, m.get('human')!))} | ${fmt(ratio(m.get('planner+next')!, m.get('human+next')!))} | ${fmt(ratio(m.get('human+next')!, m.get('human')!))} | ${fmt(ratio(m.get('human2')!, m.get('human')!))} | ${fmt(ratio(m.get('human+next')!, m.get('human2')!))} |`);
}

// ---- authoring aid ---------------------------------------------------------------------------------------------------------------------------------
/** The planner's best K-merge line (first found on ties): per merge the cells, previewed damage, machines woken and whether it was a sandwich. */
export function bestLine(b: DecoyBoard, pl = new Planner([], 0, b.budget + 1)) {
  let s = setup(b);
  const out: { m: Move; dmg: number; count: number; sandwich: boolean }[] = [];
  for (let done = 0; done < b.budget; done++) {
    const m = pl.pick(s, b.budget - done, done);
    if (!m) break;
    const p = previewMerge(s, m[0], m[1]);
    const sw0 = s.stats.sandwiches ?? 0;
    const t = apply(s, m);
    out.push({ m, dmg: dmgOf(s, t), count: p?.count ?? 0, sandwich: (t.stats.sandwiches ?? 0) > sw0 });
    s = t;
  }
  return out;
}
/** Greedy's single deterministic line (first-found ties) for the same board, to show the trap. */
function greedyLine(b: DecoyBoard) {
  let s = setup(b);
  const rng = new Rng(13);
  const out: { m: Move; dmg: number; count: number; sandwich: boolean }[] = [];
  for (let done = 0; done < b.budget; done++) {
    if (!moves(s).length) break;
    const m = choose(GREEDY, rng, s, b.budget - done, done, [], 0);
    const p = previewMerge(s, m[0], m[1]);
    const sw0 = s.stats.sandwiches ?? 0;
    const t = apply(s, m);
    out.push({ m, dmg: dmgOf(s, t), count: p?.count ?? 0, sandwich: (t.stats.sandwiches ?? 0) > sw0 });
    s = t;
  }
  return out;
}
const cellName = (i: number) => `r${Math.floor(i / COLS)}c${i % COLS}`;
const showLine = (l: ReturnType<typeof bestLine>) => l.map((x) => `${cellName(x.m[0])}>${cellName(x.m[1])} (${x.dmg.toFixed(0)}, chain ${x.count}${x.sandwich ? ', SANDWICH' : ''})`).join(' | ');
function lines(filter?: string) {
  for (const b of pick(filter)) {
    console.log(`\n${b.id}\n${draw(b.board)}\n  planner: ${showLine(bestLine(b))}\n  greedy : ${showLine(greedyLine(b))}`);
  }
}

/** Mass- and part-count-preserving edits of a board (relocate, swap family, shift a rank up on one part and down on another of one rank higher). */
function edit(board: Board, rng: Rng): Board {
  const next = board.map((p) => [...p] as Board[number]);
  const used = new Set(next.map(([, , r, c]) => r * COLS + c));
  const fams = ['cannon', 'coil', 'bell'];
  const op = rng.int(4);
  const p = next[rng.int(next.length)];
  if (op === 0 || op === 1) {
    const free = Array.from({ length: ROWS * COLS }, (_, i) => i).filter((i) => !used.has(i));
    const cell = free[rng.int(free.length)];
    [p[2], p[3]] = [Math.floor(cell / COLS), cell % COLS];
  } else if (op === 2) p[0] = fams[rng.int(3)];
  else {
    const q = next[rng.int(next.length)];
    if (p[1] < 4 && q[1] === p[1] + 1) { p[1]++; q[1]--; }
    else if (q[1] < 4 && p[1] === q[1] + 1) { q[1]++; p[1]--; }
    else { const t = [p[2], p[3]]; [p[2], p[3]] = [q[2], q[3]]; [q[2], q[3]] = [t[0], t[1]]; }
  }
  return next;
}
/** Hill-climb a board toward the trap: score = planner/greedy over 3 greedy seeds, subject to the kind's own proof (sandwich: the rule must matter; chain: the planner opens quiet). */
function searchScore(b: DecoyBoard): number {
  const s0 = setup(b);
  if (moves(s0).length < 2) return 0;
  const pl = new Planner([], 0, b.budget + 1);
  const best = pl.best(s0, b.budget, 0, b.budget + 1);
  const g = [13, 14, 15].map((sd) => play(s0, b.budget, GREEDY, sd, [], 0));
  const score = Math.min(best / Math.max(mean(g), 1), 2.2); // aim for a clear gap, not the most extreme one (a human proxy must survive it)
  const line = bestLine(b, pl);
  const gl0 = greedyLine(b);
  if (line.length < b.budget || gl0.length < b.budget) return 0; // no dead ends: both bots can spend every merge, so the gap is the plan, not a stuck board
  if (b.kind === 'sandwich') {
    // the sandwich is what splits the two bots: one of them makes one in its first 3 merges and the other does not
    const gl = gl0;
    const uses = (l: typeof line) => l.slice(0, 3).some((x) => x.sandwich);
    if (uses(line) === uses(gl)) return 0;
  } else {
    const gl = gl0;
    if (!(line[0] && gl[0] && line[0].dmg < 0.8 * gl[0].dmg && Math.max(...line.map((x) => x.count)) >= 4)) return 0; // quiet setup opens, a 4+ chain follows
  }
  return score;
}
function search(kind: 'sandwich' | 'chain', budget: number, seed: number, iters: number, startFile?: string) {
  const bench = BUDGET_LEVELS.find((x) => x.id === `last${budget}`)!;
  const rng = new Rng(seed * 104729 + budget);
  const start: Board = startFile ? JSON.parse(readFileSync(startFile, 'utf8')) : bench.board; // a hand-drawn skeleton (mass and part count of the bench board) or the bench board
  const base: DecoyBoard = { id: `search-${kind}-${budget}-${seed}`, kind, mode: kind === 'sandwich' ? 'free' : 'puzzle', rule: kind === 'sandwich' ? 'sandwich2' : 'today', budget, board: start };
  let cur = base, curScore = searchScore(base);
  for (let i = 0; i < iters; i++) {
    let board = edit(cur.board, rng);
    if (rng.next() < 0.5) board = edit(board, rng);
    const cand = { ...base, board };
    const sc = searchScore(cand);
    if (sc >= curScore) { cur = cand; curScore = sc; }
  }
  console.log(JSON.stringify({ id: base.id, kind, mode: base.mode, rule: base.rule, budget, score: +curScore.toFixed(3), board: cur.board }));
}

// ---- main ---------------------------------------------------------------------------------------------------------------------------------------
const [, , cmd, a1, a2, a3, a4] = process.argv;
if (cmd === 'search') { search(a1 as 'sandwich' | 'chain', +a2, +a3, +a4, process.argv[7]); process.exit(0); }
if (cmd === 'lines') { lines(a1); process.exit(0); }
if (cmd === 'list') list();
else if (cmd === 'static') staticRows(a1);
else if (cmd === 'supply') supply(a1, +(a2 ?? SEEDS), +(a3 ?? 3), +(a4 ?? 0));
else if (cmd === 'report') report(process.argv.slice(3));
else console.log('usage: list | static [filter] | supply <filter> [runs] [depth] [from] | report <tsv files>');
