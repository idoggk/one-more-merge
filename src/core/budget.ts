// t-4c676288 LAST MERGES (rival study #1, owner: "some levels where the user needs a capped amount of merges to get the stars or even win").
// A merge-budget level is the Workshop Puzzle engine (src/core/puzzle.ts: exact board, no clock / supply / kickback, each committed merge
// spends one, out of merges with the machine standing = lost) dressed as a saga level (machine art, HP bar, backdrop). Cascades, support
// effects and deliveries cost nothing: only the player's merge counts. Behind TUNING.mergeBudget; nothing here runs for a real level.
// The bench levels live in src/content/budgetLevels.json, written by tools/make-budget-levels.ts (never by hand).
import raw from '../content/budgetLevels.json';
import { TUNING } from '../content/tuning';
import type { LevelDef } from '../content/levels';
import { MONSTER_INDEX } from '../content/levels';
import { newPuzzle, type GameState, type PuzzleDef } from './game';

/** One bench level: the look of an existing saga machine plus an authored board, a merge budget and a planner-set HP. */
export interface BudgetLevel {
  id: string;
  name: string;
  /** The saga level whose machine and backdrop it borrows (presentation only). */
  level: number;
  monster: string;
  visual?: string;
  merge_budget: number;
  hp: number;
  /** [family, rank, row, col] */
  board: [string, number, number, number][];
  /** Merges needed (spare) to earn 2 and 3 stars. Set by the tool from the best line that exists. */
  star_spare: [number, number];
  /** The planner's best line (cell pairs from -> to) within the budget: the proof the level is solvable, and what a hint would show. */
  solution: [number, number][];
  /** Numbers the tool measured (documented in DESIGN.md; not read at runtime). */
  planner: { best_damage: number; min_merges: number; greedy_damage: number; hp_share: number };
  note: string;
}

export const BUDGET_LEVELS: BudgetLevel[] = (raw as unknown as { levels: BudgetLevel[] }).levels;
export const budgetLevel = (id: string) => BUDGET_LEVELS.find((b) => b.id === id);

/** Default star lines: 3 stars = 3+ merges spare, 2 stars = 1-2 spare, 1 star = a win on the last merge. */
export const DEFAULT_STAR_SPARE: [number, number] = [1, 3];

/** The merge budget a level plays with: only while the flag is on (a real level has none either way). */
export const levelBudget = (def: Pick<LevelDef, 'merge_budget'>): number | undefined => (TUNING.mergeBudget ? def.merge_budget : undefined);

/** Stars for a win with `spare` merges left over (after the winning merge). */
export function budgetStars(spare: number, star_spare: [number, number] = DEFAULT_STAR_SPARE): 1 | 2 | 3 {
  return spare >= star_spare[1] ? 3 : spare >= star_spare[0] ? 2 : 1;
}

/** The puzzle-engine definition of a bench level. */
export const budgetPuzzleDef = (b: BudgetLevel): PuzzleDef => ({ id: `budget:${b.id}`, moves: b.merge_budget, hp: b.hp, board: b.board, solution: b.solution });

/** A fresh attempt: the puzzle engine state with the saga look and star lines. Null while the flag is off. */
export function newBudgetState(b: BudgetLevel): GameState | null {
  if (!levelBudget(b)) return null;
  const s = newPuzzle(budgetPuzzleDef(b));
  const ti = MONSTER_INDEX[b.monster];
  if (ti !== undefined) s.target = ti; // the classic machine face when no cast art covers it (presentation only: the puzzle never reads it)
  s.puzzle!.budget = { spare: b.star_spare, look: { level: b.level, visual: b.visual, monster: b.monster } };
  return s;
}

/** Merges still available. */
export const mergesLeft = (s: GameState): number => (s.puzzle ? s.puzzle.moves - s.puzzle.used : 0);

/** The best star still in reach and how many merges from now the win must land by: "3★ · win in 4 merges". Null when not a budget level. */
export function budgetChase(s: GameState): { stars: 1 | 2 | 3; within: number } | null {
  const b = s.puzzle?.budget;
  if (!b || !s.puzzle) return null;
  const left = mergesLeft(s);
  for (const stars of [3, 2] as const) {
    const within = left - b.spare[stars - 2];
    if (within >= 1) return { stars, within };
  }
  return { stars: 1, within: left };
}
