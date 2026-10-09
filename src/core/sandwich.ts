// Sandwich merge prototype (t-1effe0bf), behind TUNING.mergeRule (default 'today' = the live game, untouched).
// A player merge drops A (rank r) onto B (rank r). If the landing cell also touches (up/right/down/left) two or more
// OTHER parts of the same family and rank r, it is a SANDWICH:
//   'sandwich2'     : both neighbours are absorbed and the result is rank r+2 (capped at the level's max rank).
//                     Four rank-r parts = exactly one rank r+2 part, so rank mass is kept (except at the cap).
//   'sandwichBonus' : the result is r+1 as today, both neighbours are absorbed anyway (3 cells freed instead of 1),
//                     and the merge pays a third of the Overdrive meter on top.
// 3 or 4 matching neighbours: only 2 are taken (an opposite pair first, the real "sandwich"; vertical before
// horizontal; else the first two up/right/down/left). 4 parts make r+2 exactly; taking 3 or 4 neighbours would
// destroy mass (5-6 parts still only make r+2) or invent it (r+3 needs 8), and the ones left stay as merge partners.
// The cascade then starts from the new part as usual. Pure and deterministic: no RNG, never mutates its inputs.
import { COLS, ROWS, TUNING } from '../content/tuning';
import type { Gadget, Grid } from './types';

export type MergeRule = typeof TUNING.mergeRule;
export const MERGE_RULES: { id: MergeRule; label: string }[] = [
  { id: 'today', label: 'TODAY' },
  { id: 'sandwich2', label: '+2' },
  { id: 'sandwichBonus', label: '+1 BONUS' },
];

/** QA panel MERGE RULE row (this device only, not in the save); missing / unknown / unreadable = TODAY. */
export const MERGE_RULE_KEY = 'omm_qa_merge_rule';
export function storedMergeRule(read: () => string | null): MergeRule {
  try {
    const v = read();
    return MERGE_RULES.some((x) => x.id === v) ? (v as MergeRule) : 'today';
  } catch {
    return 'today';
  }
}
export function applyMergeRule(r: MergeRule) {
  TUNING.mergeRule = r;
}

export interface SandwichPlan {
  /** The two absorbed neighbour cells. */
  cells: [number, number];
  /** Rank of the merged part. */
  rank: number;
  /** Ranks gained over the merging pair (2, or 1 when sandwichBonus or the cap clips it). */
  plus: number;
  /** sandwichBonus: the merge also pays Overdrive charge. */
  bonus: boolean;
}

const DIRS: [number, number][] = [[-1, 0], [0, 1], [1, 0], [0, -1]];

/** Orthogonal neighbours of `to` (never `from`, never `blocked`) with the same family and rank as `a`, in U/R/D/L order. */
export function sandwichNeighbours(grid: Grid, a: Gadget, from: number, to: number, blocked: ReadonlySet<number> = new Set()): number[] {
  const r = Math.floor(to / COLS), c = to % COLS;
  const out: number[] = [];
  for (const [dr, dc] of DIRS) {
    const rr = r + dr, cc = c + dc;
    if (rr < 0 || rr >= ROWS || cc < 0 || cc >= COLS) continue;
    const n = rr * COLS + cc;
    const g = grid[n];
    if (n === from || blocked.has(n) || !g || g.family !== a.family || g.rank !== a.rank) continue;
    out.push(n);
  }
  return out;
}

/** Two of the candidates: an opposite pair if there is one (vertical first), else the first two. */
export function pickPair(cands: number[], to: number): [number, number] {
  const has = (n: number) => cands.includes(n);
  if (has(to - COLS) && has(to + COLS)) return [to - COLS, to + COLS];
  const left = to % COLS > 0 ? to - 1 : -1, right = to % COLS < COLS - 1 ? to + 1 : -1;
  if (left >= 0 && right >= 0 && has(left) && has(right)) return [right, left];
  return [cands[0], cands[1]];
}

/** The sandwich this merge would make under `rule`, or null (today's merge). `cap` = the family's max rank here. */
export function planSandwich(grid: Grid, from: number, to: number, cap: number, blocked: ReadonlySet<number> = new Set(), rule: MergeRule = TUNING.mergeRule): SandwichPlan | null {
  if (rule === 'today') return null;
  const a = grid[from], b = grid[to];
  if (!a || !b || a.family !== b.family || a.rank !== b.rank || a.rank >= cap) return null; // cap compaction stays as today
  const cands = sandwichNeighbours(grid, a, from, to, blocked);
  if (cands.length < 2) return null;
  const rank = Math.min(a.rank + (rule === 'sandwich2' ? 2 : 1), cap);
  return { cells: pickPair(cands, to), rank, plus: rank - a.rank, bonus: rule === 'sandwichBonus' };
}

/** sandwichBonus: Overdrive charge paid by one sandwich (a third of the meter, at least 1). */
export const sandwichOd = (needed: number) => Math.max(1, Math.ceil(needed * TUNING.sandwichOdShare));
