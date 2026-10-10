// ROSTER batch 2 (t-ee4e93d7, TUNING.roster2): the job rules of Wrench, Piston, Spring and Belt Drive. Pure helpers used by
// cascade.ts and game.ts (and the tip copy). They only matter while one of these units is on the board / in the squad,
// which needs the flag (src/content/units.ts applyRoster2 puts them in crates and squad pickers). docs/ROSTER.md is the source.
import { COLS, ROWS, TUNING } from '../content/tuning';
import type { Grid } from './types';

const rc = (idx: number) => [Math.floor(idx / COLS), idx % COLS] as const;
const inside = (r: number, c: number) => r >= 0 && r < ROWS && c >= 0 && c < COLS;
const at = (r: number, c: number) => r * COLS + c;

const ORTHO: [number, number][] = [[-1, 0], [0, 1], [1, 0], [0, -1]];
const DIAG: [number, number][] = [[-1, -1], [-1, 1], [1, -1], [1, 1]];

// ---- Piston OPEN SPACE ----

/** Empty cells touching `idx`: orthogonal (U/R/D/L) and diagonal. The board edge is not a cell, so it never counts as empty;
 *  `blocked` (reserved / locked cells) are not empty either. */
export function emptyAround(grid: Grid, idx: number, blocked: ReadonlySet<number>): { ortho: number; diag: number } {
  const [r, c] = rc(idx);
  const empty = (dr: number, dc: number) => inside(r + dr, c + dc) && !grid[at(r + dr, c + dc)] && !blocked.has(at(r + dr, c + dc));
  return { ortho: ORTHO.filter(([dr, dc]) => empty(dr, dc)).length, diag: DIAG.filter(([dr, dc]) => empty(dr, dc)).length };
}

/** Piston hit multiplier: +25% per empty touching cell, max x2. L3: empty diagonals count too (+10% each, same cap).
 *  L9: the cap is x2.2 while the board holds 8 or fewer parts. */
export function pistonMult(grid: Grid, idx: number, level: number, blocked: ReadonlySet<number>): number {
  const R = TUNING.r2;
  const e = emptyAround(grid, idx, blocked);
  const parts = grid.reduce((n, g) => n + (g ? 1 : 0), 0);
  const cap = level >= 9 && parts <= R.pistonSmall ? R.pistonCapL9 : R.pistonCap;
  return Math.min(cap, 1 + R.pistonPer * e.ortho + (level >= 3 ? R.pistonDiag * e.diag : 0));
}

/** Piston L6: the nearest touching part (U/R/D/L, row-major) that can slide 1 cell straight away from the Piston into an
 *  empty cell. `blocked` = cells that may not be pushed from or into (locked, reserved, already in the chain). */
export function pistonPush(grid: Grid, idx: number, blocked: ReadonlySet<number>): { from: number; to: number } | null {
  const [r, c] = rc(idx);
  const cands: { from: number; to: number }[] = [];
  for (const [dr, dc] of ORTHO) {
    if (!inside(r + 2 * dr, c + 2 * dc)) continue;
    const from = at(r + dr, c + dc), to = at(r + 2 * dr, c + 2 * dc);
    if (grid[from] && !grid[to] && !blocked.has(from) && !blocked.has(to)) cands.push({ from, to });
  }
  cands.sort((a, b) => a.from - b.from);
  return cands[0] ?? null;
}

// ---- Spring HOP / Belt Drive BRIDGE (both need an entry side) ----

/** The straight direction the chain travelled into `idx` (from the part that woke it), or null when there is none: the part
 *  was merged directly, or its waker is not in the same row / column (a diagonal Fuse Box, a Gear link, an Arc jump). */
export function entryDir(parent: number, idx: number): [number, number] | null {
  if (parent < 0) return null;
  const [pr, pc] = rc(parent), [r, c] = rc(idx);
  if ((pr === r) === (pc === c)) return null;
  return [Math.sign(r - pr), Math.sign(c - pc)];
}

/** Occupied cells along a ray from `idx` (nearest first), at most `reach` cells out. Locked parts count as parts. */
export function partsAlong(grid: Grid, idx: number, [dr, dc]: [number, number], reach = Infinity): number[] {
  const [r, c] = rc(idx);
  const out: number[] = [];
  for (let k = 1; k <= reach && inside(r + dr * k, c + dc * k); k++) if (grid[at(r + dr * k, c + dc * k)]) out.push(at(r + dr * k, c + dc * k));
  return out;
}

/** Spring HOP along one direction: skips exactly the next part in line and wakes the one after it; both within 3 cells.
 *  A line with a single part in reach has nothing to skip: it wakes that part (TUNING.r2.springLone), so a Spring is never dead. */
export function hopTarget(grid: Grid, idx: number, dir: [number, number], lone = false): number | null {
  const p = partsAlong(grid, idx, dir, TUNING.r2.springReach);
  return p.length >= 2 ? p[1] : lone && p.length === 1 && TUNING.r2.springLone ? p[0] : null;
}

/** Cells a Spring wakes. No entry side (merged directly / Gear link): it hops all four ways. With one: it hops on the side
 *  opposite the entry; L3 also back along the entry line; L9: a forward hop that cannot land (it would leave the board) hops
 *  90° along the wall instead (clockwise side first), once. */
export function springCells(grid: Grid, idx: number, entry: [number, number] | null, level: number): number[] {
  const dirs: [number, number][] = entry ? (level >= 3 ? [entry, [-entry[0], -entry[1]]] : [entry]) : ORTHO;
  const out: number[] = [];
  for (const d of dirs) {
    let t = hopTarget(grid, idx, d);
    if (t === null && level >= 9 && entry && d === entry) {
      const side: [number, number][] = [[d[1], -d[0]], [-d[1], d[0]]];
      for (const s of side) if ((t = hopTarget(grid, idx, s)) !== null) break;
    }
    t ??= hopTarget(grid, idx, d, true); // nothing to skip: the lone part in reach wakes
    if (t !== null) out.push(t);
  }
  return [...new Set(out)];
}

/** Cells a Belt Drive wakes: the far end of its line (the last part along the entry direction); the parts between stay asleep.
 *  L3: the part before the far end wakes too (a 2-deep exit). L6: any Belt Drive on the line wakes as well (Belt to Belt keeps
 *  going). No entry side: both far ends of its row. */
export function beltCells(grid: Grid, idx: number, entry: [number, number] | null, level: number): { cells: number[]; exits: number[] } {
  const dirs: [number, number][] = entry ? [entry] : [[0, -1], [0, 1]];
  const cells: number[] = [];
  const exits: number[] = [];
  for (const d of dirs) {
    const p = partsAlong(grid, idx, d);
    if (!p.length) continue;
    exits.push(p[p.length - 1]);
    cells.push(...(level >= 3 && p.length >= 2 ? [p[p.length - 2], p[p.length - 1]] : [p[p.length - 1]]));
    if (level >= 6) cells.push(...p.filter((i) => grid[i]?.family === 'belt_drive')); // L6: Belt Drives on the line pass the chain on too
  }
  return { cells: [...new Set(cells)], exits };
}

// ---- Wrench UPGRADE ----

/** Wrench state on a game (a passive Support: never on the board, no taps): one entry per held merge = the ranks it adds. */
export interface WrenchState {
  armed: number[];
  uses: number;
}

/** What a finished merge of `rank` arms (0 = nothing): +1 rank after a rank-3+ merge (L3: rank-2+); +2 after rank-6+ at L9. */
export function wrenchArm(level: number, rank: number): number {
  const R = TUNING.r2;
  if (rank < (level >= 3 ? R.wrenchMinL3 : R.wrenchMin)) return 0;
  return level >= 9 && rank >= R.wrenchBig ? R.wrenchBonusL9 : R.wrenchBonus;
}

/** How many armed merges Wrench holds (1; 2 from L6). */
export const wrenchHold = (level: number) => (level >= 6 ? TUNING.r2.wrenchHoldL6 : TUNING.r2.wrenchHold);

/** The rank bonus the next merge gets (peek: previews never spend it). */
export const wrenchNext = (w: WrenchState | undefined) => w?.armed[0] ?? 0;

/** A finished player merge: spend the armed bonus it used (oldest first), then arm from its own rank: one merge's worth of
 *  bonus (L6: two merges' worth), never more than the hold. Returns the bonus that was spent. Merges that are not yours
 *  (Kickback fuses, Magnet SNAP IN) never call this. */
export function wrenchAfterMerge(w: WrenchState, level: number, mergedRank: number): number {
  const spent = w.armed.shift() ?? 0;
  if (spent) w.uses++;
  const add = wrenchArm(level, mergedRank);
  if (add) for (let k = 0; k < (level >= 6 ? 2 : 1) && w.armed.length < wrenchHold(level); k++) w.armed.push(add);
  return spent;
}

/** Effective rank for effects: the real rank plus the bonus, never past the board's rank ceiling. */
export const effectiveRank = (rank: number, bonus: number) => (bonus > 0 ? Math.min(Math.max(rank, TUNING.r2.rankCeil), rank + bonus) : rank);
