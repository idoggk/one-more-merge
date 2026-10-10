// ROSTER batch 5 (t-af818b65, TUNING.roster5): the job rules of Crane, Dynamo and Wrecking Ball. Pure helpers used by cascade.ts and
// game.ts (and the tip copy). They only matter while one of these units is on the board / in the squad, which needs the flag
// (src/content/units.ts applyRoster5). docs/ROSTER.md section 12 is the source.
import { COLS, ROWS, TUNING } from '../content/tuning';
import type { Gadget, Grid } from './types';

const rc = (idx: number) => [Math.floor(idx / COLS), idx % COLS] as const;
const inside = (r: number, c: number) => r >= 0 && r < ROWS && c >= 0 && c < COLS;
const at = (r: number, c: number) => r * COLS + c;
const ORTHO: [number, number][] = [[-1, 0], [0, 1], [1, 0], [0, -1]];

// ---- Wrecking Ball DISTANCE ----

/** Board steps between two cells (up/down/left/right moves, Manhattan). */
export const boardSteps = (a: number, b: number) => {
  const [ar, ac] = rc(a), [br, bc] = rc(b);
  return Math.abs(ar - br) + Math.abs(ac - bc);
};
/** Hit multiplier of a Wrecking Ball woken from `steps` board steps away: x0.6 next door, +0.3 per extra step, max x2 (x2.3 from L3).
 *  Merged or rooted by you (no waker, steps 0) it hits x1. */
export function swingMult(steps: number, level: number): number {
  const R = TUNING.r5;
  if (steps <= 0) return 1;
  return Math.min(level >= 3 ? R.swingMaxL3 : R.swingMax, R.swingNear + R.swingPer * (steps - 1));
}
/** The direction from `from` to `to`: the exact one when they share a row or column, else the longer axis (a tie goes vertical). */
export function swingDir(from: number, to: number): [number, number] {
  const [fr, fc] = rc(from), [tr, tc] = rc(to);
  const dr = tr - fr, dc = tc - fc;
  return Math.abs(dr) >= Math.abs(dc) ? [Math.sign(dr), 0] : [0, Math.sign(dc)];
}
/** L9, woken from swingFar+ steps: the cell behind the ball (one step further along the swing). -1 off the board. */
export function swingBehind(from: number, to: number): number {
  const [r, c] = rc(to);
  const [dr, dc] = swingDir(from, to);
  return inside(r + dr, c + dc) ? at(r + dr, c + dc) : -1;
}
/** L6: the part the ball swings over (only on a straight line, at least 2 steps: the first part between the waker and the ball) is knocked
 *  1 cell sideways into an empty cell (no damage). `skip` = parts that must stay put (in the chain, locked, reserved); `free` = a cell it may land in. */
export function swingKnock(grid: Grid, from: number, to: number, skip: (i: number) => boolean, free: (i: number) => boolean): { from: number; to: number } | null {
  const [fr, fc] = rc(from), [tr, tc] = rc(to);
  if ((fr !== tr && fc !== tc) || boardSteps(from, to) < 2) return null;
  const dr = Math.sign(tr - fr), dc = Math.sign(tc - fc);
  for (let r = fr + dr, c = fc + dc; r !== tr || c !== tc; r += dr, c += dc) {
    const cell = at(r, c);
    if (!grid[cell]) continue;
    if (skip(cell)) return null;
    for (const [er, ec] of [[dc, dr], [-dc, -dr]]) {
      if (!inside(r + er, c + ec)) continue;
      const land = at(r + er, c + ec);
      if (!grid[land] && free(land)) return { from: cell, to: land };
    }
    return null;
  }
  return null;
}

// ---- Dynamo 2x2 SQUARE ----

export interface DynamoBlock {
  /** The four cells of the 2x2 square (some may be empty at L3: an L-shape). */
  cells: number[];
  /** The other parts of the block (they wake with the ring and, from L9, hit x1.25). */
  mates: number[];
  /** The ring: every board cell around the block within `wide` cells (12 for an interior 2x2 with wide 1; fewer at the edge). */
  ring: number[];
  wide: number;
}
/** The cells around a 2x2 block (top-left `r0,c0`) within `wide` cells, clipped to the board. */
export function ringCells(r0: number, c0: number, wide: number): number[] {
  const out: number[] = [];
  for (let r = r0 - wide; r <= r0 + 1 + wide; r++)
    for (let c = c0 - wide; c <= c0 + 1 + wide; c++) {
      if (!inside(r, c) || (r >= r0 && r <= r0 + 1 && c >= c0 && c <= c0 + 1)) continue;
      out.push(at(r, c));
    }
  return out;
}
/** The block a Dynamo at `idx` belongs to: a 2x2 square holding it where all 4 cells are parts (L3: 3 parts + the Dynamo is enough, i.e. an
 *  L-shape with one corner empty). With several, the one whose ring holds the most parts, then a full square, then the first in row-major order.
 *  null = no block (it wakes only its 4 touching cells). L6: another Dynamo in the block makes the ring 2 cells wide. */
export function dynamoBlock(grid: Grid, idx: number, level: number): DynamoBlock | null {
  const [r, c] = rc(idx);
  let best: (DynamoBlock & { score: number; full: boolean }) | null = null;
  for (let r0 = r - 1; r0 <= r; r0++)
    for (let c0 = c - 1; c0 <= c; c0++) {
      if (!inside(r0, c0) || !inside(r0 + 1, c0 + 1)) continue;
      const cells = [at(r0, c0), at(r0, c0 + 1), at(r0 + 1, c0), at(r0 + 1, c0 + 1)];
      const filled = cells.filter((i) => grid[i]).length;
      if (filled < (level >= 3 ? 3 : 4)) continue;
      const mates = cells.filter((i) => i !== idx && grid[i]);
      const wide = level >= 6 && mates.some((i) => grid[i]!.family === 'dynamo') ? TUNING.r5.ringWide : 1;
      const ring = ringCells(r0, c0, wide);
      const score = ring.filter((i) => grid[i]).length;
      const full = filled === 4;
      if (!best || score > best.score || (score === best.score && full && !best.full)) best = { cells, mates, ring, wide, score, full };
    }
  return best ? { cells: best.cells, mates: best.mates, ring: best.ring, wide: best.wide } : null;
}
/** The 4 touching cells (U/R/D/L) of a Dynamo with no block. */
export function dynamoTouch(idx: number): number[] {
  const [r, c] = rc(idx);
  return ORTHO.filter(([dr, dc]) => inside(r + dr, c + dc)).map(([dr, dc]) => at(r + dr, c + dc));
}
/** L9: the product of the relay "waker" hit bonuses on one part (Pipe flow end, Ladder top step, Belt Drive exit, Gear link) may not pass
 *  r5.stackCap once the Dynamo's block bonus is part of it: the block bonus is cut back to fit (never below x1). */
export function squareFit(others: number): number {
  return Math.max(1, Math.min(TUNING.r5.squareL9, TUNING.r5.stackCap / Math.max(others, 1)));
}

// ---- Crane LIFT ----

/** Crane reach: the part it lifts touches it (1 step); L3 up to 2 steps away. */
export const craneReach = (level: number) => (level >= 3 ? TUNING.r5.craneReachL3 : TUNING.r5.craneReach);
/** Lifts per level: one, and from L6 one more for each boss armor phase reached (`phase` 0..2). */
export const craneAllowance = (level: number, phase: number) => 1 + (level >= 6 ? Math.max(0, phase) : 0);
/** The lift a Crane at `idx` makes: a part `P` within reach (touching at L1) is lifted onto a twin `T` touching it (same family and rank,
 *  `can` says they may merge). `ok` = cells that may take part (in the grid, not in the chain, not locked or reserved).
 *  Highest rank first, then row-major. null = nothing to lift. */
export function craneLift(grid: Grid, idx: number, level: number, ok: (i: number) => boolean, can: (a: Gadget, b: Gadget) => boolean): { from: number; to: number } | null {
  const reach = craneReach(level);
  const [r0, c0] = rc(idx);
  let best: { from: number; to: number } | null = null;
  for (let r = r0 - reach; r <= r0 + reach; r++)
    for (let c = c0 - reach; c <= c0 + reach; c++) {
      if (!inside(r, c) || Math.abs(r - r0) + Math.abs(c - c0) > reach || (r === r0 && c === c0)) continue;
      const p = at(r, c);
      if (!grid[p] || !ok(p)) continue;
      for (const [dr, dc] of ORTHO) {
        if (!inside(r + dr, c + dc)) continue;
        const t = at(r + dr, c + dc);
        if (t === idx || !grid[t] || !ok(t) || !can(grid[p]!, grid[t]!)) continue;
        if (!best || grid[p]!.rank > grid[best.from]!.rank || (grid[p]!.rank === grid[best.from]!.rank && (p < best.from || (p === best.from && t < best.to)))) best = { from: p, to: t };
      }
    }
  return best;
}
