// PREVIEW GAP (t-0bc6be93, read-only measurement, NO game change). Question: how much of the planner's edge over a greedy player comes from the on-screen
// damage preview? Bots play K-merge boards (HP lifted, so the score is the total damage in K merges) with the preview FULL (exact number, as today),
// COARSE (tier word: weak / ok / strong / huge) or HIDDEN (no damage: only chain length and which machines wake). Output: markdown, deterministic.
// The preview in the game is previewMerge() (src/core/game.ts) + mergePreview / hitFormula (src/core/hitFormula.ts); the bots read previewMerge's CascadeResult.
// Usage (chunks write raw TSV rows to stdout; `report` merges chunk files into the tables; board g is fully determined by g):
//   npx vite-node tools/preview-gap.ts capped <last6|last8|last10> <from> <to>   Budget Levels, boards re-seated by seed (board 0 = the shipped board)
//   npx vite-node tools/preview-gap.ts normal <level> <from> <to> [K=4]          a saga level warmed up by the real engine to a seeded mid-game board
//   npx vite-node tools/preview-gap.ts tools <last6|last8|last10> <from> <to>    widening ideas: tools at chain 4, Gear Bomb x1.5
//   npx vite-node tools/preview-gap.ts report <raw files...>
import { readFileSync } from 'node:fs';
import { BUDGET_LEVELS, type BudgetLevel } from '../src/core/budget';
import { levelDef } from '../src/content/levels';
import { TUNING } from '../src/content/tuning';
import { drop, newLevel, newPuzzle, previewMerge, tick, type GameState, type PuzzleDef } from '../src/core/game';
import { puzzleMoves } from '../src/core/puzzle';
import { Rng } from '../src/core/rng';
import { planTool, previewTool, useTool } from '../src/core/tools';
import { isShooter } from '../src/core/types';

const BIG = 1e9;
type Vision = 'full' | 'coarse' | 'hidden';
const VISIONS: Vision[] = ['full', 'coarse', 'hidden'];
type Act = { t: 'm'; from: number; to: number } | { t: 'u'; idx: number };
const NOISE = 0.2;
/** Coarse tiers: share of the level's reference HP (75% of the planner's best K-merge damage) one merge deals: weak < 4%, ok < 10%, strong < 22%, huge. */
const TIER_CUT = [0.04, 0.1, 0.22];

const gridKey = (s: GameState) => s.grid.map((g) => (g ? `${g.tool ?? g.family}:${g.rank}` : '.')).join(',') + `#${s.stats.tools?.made ?? 0}`;

// ---- actions ------------------------------------------------------------------------------------------------------------------------------------
function acts(s: GameState, left: number): Act[] {
  const out: Act[] = [];
  if (left > 0) for (const [from, to] of puzzleMoves(s)) out.push({ t: 'm', from, to });
  if (TUNING.tools)
    s.grid.forEach((g, idx) => {
      if (g?.tool) {
        const p = planTool(s, idx);
        if (p?.wake.length) out.push({ t: 'u', idx });
      }
    });
  return out;
}
function apply(s: GameState, a: Act): GameState {
  const t = structuredClone(s);
  if (a.t === 'm') drop(t, a.from, a.to, t.grid[a.from]!.id);
  else useTool(t, a.idx, t.grid[a.idx]!.id);
  return t;
}
/** What the player can read on screen before committing `a`: the preview's damage and chain, and the machines it wakes. */
interface Seen { total: number; count: number; shooterRank: number; rank: number }
function seen(s: GameState, a: Act): Seen {
  if (a.t === 'm') {
    const r = previewMerge(s, a.from, a.to);
    const rank = s.grid[a.to]!.rank + 1;
    return r ? { total: r.total, count: r.count, shooterRank: r.activations.filter((x) => isShooter(x.family)).reduce((m, x) => m + x.rank, 0), rank } : { total: 0, count: 0, shooterRank: 0, rank };
  }
  const r = previewTool(s, planTool(s, a.idx)!);
  return r ? { total: r.total, count: r.count, shooterRank: r.activations.filter((x) => isShooter(x.family)).reduce((m, x) => m + x.rank, 0), rank: 0 } : { total: 0, count: 0, shooterRank: 0, rank: 0 };
}
const tierOf = (total: number, ref: number) => TIER_CUT.filter((c) => total >= c * ref).length; // 0 weak, 1 ok, 2 strong, 3 huge

// ---- planner (exact: the memoised search over boards; every number from the real engine) ------------------------------------------------------
class Planner {
  private memo = new Map<string, number>();
  best(s: GameState, left: number): number {
    const key = `${left}|${gridKey(s)}`;
    const hit = this.memo.get(key);
    if (hit !== undefined) return hit;
    let out = 0;
    for (const a of acts(s, left)) {
      const t = apply(s, a);
      out = Math.max(out, s.hp - t.hp + this.best(t, a.t === 'm' ? left - 1 : left));
    }
    this.memo.set(key, out);
    return out;
  }
}

// ---- bots ---------------------------------------------------------------------------------------------------------------------------------------
const pickMax = (rng: Rng, list: Act[], score: (a: Act) => number): Act => {
  let best = -Infinity;
  let top: Act[] = [];
  for (const a of list) {
    const v = score(a);
    if (v > best + 1e-9) [best, top] = [v, [a]];
    else if (v > best - 1e-9) top.push(a);
  }
  return top[rng.int(top.length)];
};
/** Greedy with a view: FULL ranks by the previewed damage; COARSE by tier word, then what is visible without numbers; HIDDEN by chain length, then the shooters' rank. */
function viewPick(rng: Rng, s: GameState, list: Act[], v: Vision, ref: number): Act {
  const sc = list.map((a) => seen(s, a));
  const idx = new Map(list.map((a, i) => [a, i] as const));
  const hiddenKey = (x: Seen) => x.count * 1000 + x.shooterRank;
  return pickMax(rng, list, (a) => {
    const x = sc[idx.get(a)!];
    return v === 'full' ? x.total : v === 'coarse' ? tierOf(x.total, ref) * 1e6 + hiddenKey(x) : hiddenKey(x);
  });
}
type Policy = (rng: Rng, s: GameState, list: Act[], ref: number) => Act;
const POLICIES: Record<string, Policy> = {
  random: (rng, _s, list) => list[rng.int(list.length)],
  // "merge whatever you can": the highest-rank result, no preview read at all
  blind: (rng, s, list) => pickMax(rng, list, (a) => (a.t === 'm' ? s.grid[a.to]!.rank : 0)),
};
for (const v of VISIONS) {
  POLICIES[`greedy ${v}`] = (rng, s, list, ref) => viewPick(rng, s, list, v, ref);
  // a human proxy: the same reader with NOISE random mistakes (a random legal act instead)
  POLICIES[`human ${v}`] = (rng, s, list, ref) => (rng.next() < NOISE ? list[rng.int(list.length)] : viewPick(rng, s, list, v, ref));
}

/** Damage a policy deals from `s0` in `k` merges (free tool uses along the way). */
function play(s0: GameState, k: number, pol: Policy, seed: number, ref: number): number {
  const rng = new Rng(seed);
  let s = s0, left = k;
  for (let guard = 0; guard < 4 * k + 8; guard++) {
    const list = acts(s, left);
    if (!list.length) break;
    const a = pol(rng, s, list, ref);
    s = apply(s, a);
    if (a.t === 'm') left--;
  }
  return s0.hp - s.hp;
}

// ---- statistics ---------------------------------------------------------------------------------------------------------------------------------
const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
/** ratio of means plus a seeded bootstrap 95% interval over boards. */
function ratio(num: number[], den: number[]): { r: number; lo: number; hi: number } {
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
const fmt = (x: { r: number; lo: number; hi: number }) => `${x.r.toFixed(2)} [${x.lo.toFixed(2)}, ${x.hi.toFixed(2)}]`;

// ---- boards -------------------------------------------------------------------------------------------------------------------------------------
type Board = BudgetLevel['board'];
/** Same re-seating the bench generator uses (tools/make-budget-levels.ts): a few parts to other empty cells, sometimes one rank +-1. */
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
const liftedDef = (id: string, moves: number, board: Board): PuzzleDef => ({ id, moves, hp: BIG, board, solution: [] });
const cappedBoard = (b: BudgetLevel, g: number): Board => (g === 0 ? b.board : mutate(b.board, new Rng(g * 7919 + 1)));

/** A saga level's mid-game board: the real start board of `level`, then the real engine ticks with a reseeded supply and random merges until `warm` seconds. */
function warmBoard(level: number, g: number): Board {
  const s = newLevel(levelDef(level)!);
  s.seed = s.supplyRng = (g * 40503 + level) >>> 0;
  s.timeLeft = s.levelTime = 9999;
  s.hp = s.maxHp = BIG;
  const rng = new Rng(g * 31 + 5);
  const warm = 3 + rng.int(6);
  for (let t = 0; t < (warm * 1000) / 50 && s.phase === 'playing'; t++) {
    tick(s);
    if (t % 30 === 29) {
      const m = puzzleMoves(s);
      if (m.length) {
        const [from, to] = m[rng.int(m.length)];
        drop(s, from, to, s.grid[from]!.id);
      }
    }
  }
  const pos = (i: number) => [Math.floor(i / 5), i % 5] as const;
  const out: Board = [];
  s.grid.forEach((g2, i) => { if (g2 && !g2.tool) out.push([g2.family, g2.rank, ...pos(i)]); });
  return out;
}

// ---- run ----------------------------------------------------------------------------------------------------------------------------------------
function setup(mode: 'puzzle' | 'free', def: PuzzleDef): GameState {
  const s = newPuzzle(def);
  if (mode === 'free') { delete s.puzzle; s.toolCap = TUNING.tl.perLevel; } // tools / sandwiches only exist outside the puzzle engine
  return s;
}

/** One board's raw numbers: the planner's best damage and each policy's, as TSV rows `set<TAB>variant<TAB>board<TAB>damage` (chunks are merged by `report`). */
function runBoards(set: string, boards: Board[], from: number, k: number, mode: 'puzzle' | 'free', names: string[]) {
  boards.forEach((board, i) => {
    const g = from + i;
    const s0 = setup(mode, liftedDef(`pg:${set}:${g}`, k, board));
    const best = new Planner().best(s0, k);
    console.log(`${set}\tplanner\t${g}\t${best}`);
    for (const n of names) console.log(`${set}\t${n}\t${g}\t${play(s0, k, POLICIES[n], g * 977 + 13, 0.75 * best)}`);
  });
}

const NAMES = ['random', 'blind', ...VISIONS.flatMap((v) => [`greedy ${v}`, `human ${v}`])];
const TOOL_NAMES = ['greedy full', 'greedy hidden', 'human hidden'];

/** Widening configs: each changes ONE parameter against the first (the +1 BONUS sandwich rule is on in all four; the tool flag is on in 1-3). */
const TOOL_CONFIGS: { name: string; set: () => void }[] = [
  { name: 'no tools', set: () => { TUNING.tools = false; TUNING.mergeRule = 'sandwichBonus'; } },
  { name: 'tools as built (chain 5, Gear Bomb +1 rank)', set: () => { TUNING.tools = true; TUNING.mergeRule = 'sandwichBonus'; TUNING.tl.chain = 5; TUNING.tl.effectRank = 1; } },
  { name: 'tools at chain 4', set: () => { TUNING.tools = true; TUNING.mergeRule = 'sandwichBonus'; TUNING.tl.chain = 4; TUNING.tl.effectRank = 1; } },
  { name: 'Gear Bomb x1.5 (+1.5 rank)', set: () => { TUNING.tools = true; TUNING.mergeRule = 'sandwichBonus'; TUNING.tl.chain = 5; TUNING.tl.effectRank = 1.5; } },
];

// ---- report -------------------------------------------------------------------------------------------------------------------------------------
function load(files: string[]): Map<string, Map<string, number[]>> {
  const sets = new Map<string, Map<string, number[]>>();
  for (const f of files)
    for (const line of readFileSync(f, 'utf8').split('\n')) {
      const [set, variant, board, val] = line.split('\t');
      if (val === undefined) continue;
      const m = sets.get(set) ?? sets.set(set, new Map()).get(set)!;
      const a = m.get(variant) ?? m.set(variant, []).get(variant)!;
      a[+board] = +val;
    }
  return sets;
}

function report(files: string[]) {
  const sets = load(files);
  for (const [set, m] of [...sets].sort(([a], [b]) => a.localeCompare(b))) {
    const P = m.get('planner')!;
    const n = P.length;
    if (set.startsWith('tools:')) continue;
    console.log(`\n### ${set} (${n} boards, planner mean damage ${(sum(P) / n).toFixed(0)})`);
    console.log('| preview | planner/greedy [95%] | planner/human-proxy [95%] | human kept vs full | greedy dmg vs full | planner/blind [95%] | planner/random [95%] |');
    console.log('|---|---|---|---|---|---|---|');
    const hf = sum(m.get('human full')!), gf = sum(m.get('greedy full')!);
    for (const v of VISIONS)
      console.log(`| ${v} | ${fmt(ratio(P, m.get(`greedy ${v}`)!))} | ${fmt(ratio(P, m.get(`human ${v}`)!))} | ${(sum(m.get(`human ${v}`)!) / hf).toFixed(2)} | ${(sum(m.get(`greedy ${v}`)!) / gf).toFixed(2)} | ${v === 'full' ? fmt(ratio(P, m.get('blind')!)) : ''} | ${v === 'full' ? fmt(ratio(P, m.get('random')!)) : ''} |`);
  }
  const toolSets = [...sets.keys()].filter((k) => k.startsWith('tools:')).sort();
  for (const level of [...new Set(toolSets.map((k) => k.split(':')[1]))]) {
    const first = sets.get(`tools:${level}:0`);
    if (!first) continue;
    console.log(`\n### widening ideas, ${level} (${first.get('planner')!.length} boards; planner and bots may both use the tool, a tool use costs no merge)`);
    console.log('| config | planner mean damage | planner/greedy full [95%] | planner/greedy hidden [95%] | planner/human hidden [95%] |');
    console.log('|---|---|---|---|---|');
    TOOL_CONFIGS.forEach((c, ci) => {
      const m = sets.get(`tools:${level}:${ci}`);
      if (!m) return;
      const P = m.get('planner')!;
      console.log(`| ${c.name} | ${(sum(P) / P.length).toFixed(0)} | ${fmt(ratio(P, m.get('greedy full')!))} | ${fmt(ratio(P, m.get('greedy hidden')!))} | ${fmt(ratio(P, m.get('human hidden')!))} |`);
    });
  }
}

// ---- main ---------------------------------------------------------------------------------------------------------------------------------------
const [, , mode, which, fromArg, toArg, kArg] = process.argv;
if (mode === 'report') report(process.argv.slice(3));
else if (mode === 'capped' || mode === 'tools') {
  const b = BUDGET_LEVELS.find((x) => x.id === which)!;
  const from = +fromArg, to = +toArg;
  const boards = Array.from({ length: to - from }, (_, i) => cappedBoard(b, from + i));
  if (mode === 'capped') runBoards(`capped:${which}`, boards, from, b.merge_budget, 'puzzle', NAMES);
  else
    TOOL_CONFIGS.forEach((c, ci) => {
      c.set();
      runBoards(`tools:${which}:${ci}`, boards, from, b.merge_budget, 'free', TOOL_NAMES);
    });
} else if (mode === 'normal') {
  const from = +fromArg, to = +toArg, K = +(kArg ?? 4);
  runBoards(`normal:L${which}`, Array.from({ length: to - from }, (_, i) => warmBoard(+which, from + i)), from, K, 'puzzle', NAMES);
} else console.log('usage: capped|tools <last6|last8|last10> <from> <to>  |  normal <level> <from> <to> [K=4]  |  report <raw files>');
