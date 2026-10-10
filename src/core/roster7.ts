// ROSTER batch 7 (t-67cd7c5b, TUNING.roster7): the job rules of Rivet Gun, Vice, Router, Hydraulic Press and Lathe. Pure helpers used by cascade.ts
// (and the tip copy / tests). They only matter while one of these units is on the board, which needs the flag (src/content/units.ts applyRoster7).
// docs/ROSTER.md section 14 is the source. Board = COLS x ROWS (5 x 6): a row has 4 other cells, a column 5.
import { COLS, ROWS, TUNING } from '../content/tuning';
import type { Grid } from './types';

const rc = (idx: number) => [Math.floor(idx / COLS), idx % COLS] as const;
const inside = (r: number, c: number) => r >= 0 && r < ROWS && c >= 0 && c < COLS;
const at = (r: number, c: number) => r * COLS + c;
const ORTHO: [number, number][] = [[-1, 0], [0, 1], [1, 0], [0, -1]];

// ---- Rivet Gun RIVET ----

/** Was this the part that RIVET counts? `order` = parts that fired before it in the cascade (0-based; the part you merged is the 1st, so the 3rd has order 2).
 *  Base: the 3rd. L3: the 6th too. */
export const rivetHit = (order: number, level: number) => order === 2 || (level >= 3 && order === 5);
/** Hit multiplier: x2 on a counted part (x2.4 at L9); L6 the parts right next to the 3rd in the order (2nd and 4th) x1.25; otherwise x1. Never above x2.4. */
export function rivetMult(order: number, level: number): number {
  const R = TUNING.r7;
  if (rivetHit(order, level)) return level >= 9 ? R.rivetHitL9 : R.rivetHit;
  if (level >= 6 && (order === 1 || order === 3)) return R.rivetNear;
  return 1;
}

// ---- Vice GRIP ----

/** The directions "inward" from the board edge(s) a cell sits on: down from the top row, up from the bottom row, right from the left column, left from the right column.
 *  Empty = not on an edge. A corner has two. */
export function inwardDirs(idx: number): [number, number][] {
  const [r, c] = rc(idx);
  const out: [number, number][] = [];
  if (r === 0) out.push([1, 0]);
  if (r === ROWS - 1) out.push([-1, 0]);
  if (c === 0) out.push([0, 1]);
  if (c === COLS - 1) out.push([0, -1]);
  return out;
}
export const onEdge = (idx: number) => inwardDirs(idx).length > 0;

/** Cells a Vice at `idx` wakes (empty cells included, the caller keeps the parts). Off the edge: only the 4 touching cells, no reach and no grip.
 *  On an edge: the next 3 cells inward in a straight line (L3: 4). In a corner: 2 cells along each of its two lines (L3: 3 each).
 *  L6: also the 2 cells next to it along the edge (a corner has one such neighbour per line, already counted). Never more than r7.viceMax cells. */
export function viceCells(idx: number, level: number): number[] {
  const dirs = inwardDirs(idx);
  if (!dirs.length) return ORTHO.flatMap(([dr, dc]) => (inside(rc(idx)[0] + dr, rc(idx)[1] + dc) ? [at(rc(idx)[0] + dr, rc(idx)[1] + dc)] : [])); // off the edge: nothing special, only the 4 touching cells (so it is never dead)
  const R = TUNING.r7;
  const [r, c] = rc(idx);
  const reach = dirs.length > 1 ? (level >= 3 ? R.viceCornerL3 : R.viceCorner) : level >= 3 ? R.viceReachL3 : R.viceReach;
  const out: number[] = [];
  for (const [dr, dc] of dirs) for (let d = 1; d <= reach; d++) if (inside(r + dr * d, c + dc * d)) out.push(at(r + dr * d, c + dc * d));
  if (level >= 6 && dirs.length === 1) {
    const [dr, dc] = dirs[0];
    for (const [sr, sc] of [[dc, dr], [-dc, -dr]]) if (inside(r + sr, c + sc)) out.push(at(r + sr, c + sc)); // along the edge: perpendicular to the inward line
  }
  return [...new Set(out)].slice(0, R.viceMax);
}
/** Shooters a Vice wakes hit x1.15 (x1.3 at L9). */
export const viceGrip = (level: number) => (level >= 9 ? TUNING.r7.viceGripL9 : TUNING.r7.viceGrip);

// ---- Router TURN ----

/** One L of cells from `idx`: `arm` cells straight along `d`, then `arm2` cells across (`t`), cut at the board edge. A bend needs the whole first arm and at least one cell across. */
export function routerL(idx: number, d: [number, number], t: [number, number], level: number): number[] {
  const R = TUNING.r7;
  const [r, c] = rc(idx);
  const arm2 = level >= 9 ? R.routerArm2L3 : R.routerArm2;
  const out: number[] = [];
  for (let k = 1; k <= R.routerArm; k++) {
    if (!inside(r + d[0] * k, c + d[1] * k)) return [];
    out.push(at(r + d[0] * k, c + d[1] * k));
  }
  const [br, bc] = [r + d[0] * R.routerArm, c + d[1] * R.routerArm];
  for (let k = 1; k <= arm2; k++) {
    if (!inside(br + t[0] * k, bc + t[1] * k)) break;
    out.push(at(br + t[0] * k, bc + t[1] * k));
  }
  return out.length > R.routerArm ? out : [];
}
/** All 8 L-shapes (4 directions x turn clockwise / counter-clockwise), in a fixed order: up, right, down, left; clockwise first. */
export function routerShapes(idx: number, level: number): number[][] {
  const out: number[][] = [];
  ORTHO.forEach(([dr, dc]) => {
    for (const t of (level >= 3 ? [[dc, -dr], [-dc, dr]] : [[dc, -dr]]) as [number, number][]) { // base: the clockwise turn only; L3 both turns
      const l = routerL(idx, [dr, dc], t, level);
      if (l.length) out.push(l);
    }
  });
  return out;
}
/** The cells a Router wakes: the L holding the most parts it may wake (`ok` says a cell may be woken: not already in the chain, not locked, not across a divider);
 *  ties go to the first in the fixed order. L6: when that L holds under 3 parts, the next best L wakes too; L9: always. At most r7.routerMax parts in all. */
export function routerCells(grid: Grid, idx: number, level: number, ok: (i: number) => boolean): number[] {
  const R = TUNING.r7;
  const live = routerShapes(idx, level).map((cells, k) => ({ k, parts: cells.filter((i) => grid[i] && ok(i)) })).filter((s) => s.parts.length);
  live.sort((a, b) => b.parts.length - a.parts.length || a.k - b.k);
  if (!live.length) return [];
  const out = live[0].parts.slice(0, level >= 3 ? R.routerFirstL3 : R.routerFirst); // the best L wakes at most 3 parts (4 from L3)
  if (level >= 9 || (level >= 6 && live[0].parts.length < 3)) {
    // the second L is the one that adds the most parts not already woken (ties: fixed order)
    const fresh = live.slice(1).map((s) => ({ k: s.k, add: s.parts.filter((i) => !out.includes(i)) })).filter((s) => s.add.length).sort((a, b) => b.add.length - a.add.length || a.k - b.k);
    out.push(...(fresh[0]?.add ?? []));
  }
  return out.slice(0, R.routerMax);
}

// ---- Hydraulic Press ----

/** How many of its 4 touching cells hold a part (the board edge never counts as filled). */
export function pressSides(grid: Grid, idx: number): number {
  const [r, c] = rc(idx);
  return ORTHO.filter(([dr, dc]) => inside(r + dr, c + dc) && grid[at(r + dr, c + dc)]).length;
}
/** Hit multiplier: all 4 sides filled x3 (x3.5 at L9); L6 exactly 3 sides x1.5; otherwise x0.5 (L3: +0.1 per filled side, so at most x0.8). On an edge or corner it can never be full. */
export function pressMult(grid: Grid, idx: number, level: number): number {
  const R = TUNING.r7;
  const n = pressSides(grid, idx);
  if (n === 4) return level >= 9 ? R.pressFullL9 : R.pressFull;
  if (level >= 6 && n === 3) return R.pressNear;
  return R.pressSmall + (level >= 3 ? R.pressPer * n : 0);
}

// ---- Lathe ----

/** Steps from a Lathe's cell to the opposite edge, for the edge it sits on (a corner uses the longer of its two): top / bottom edge = ROWS - 1 steps, left / right = COLS - 1.
 *  0 = not on an edge. */
export function latheSteps(idx: number): number {
  const [r, c] = rc(idx);
  let d = 0;
  if (r === 0 || r === ROWS - 1) d = Math.max(d, ROWS - 1);
  if (c === 0 || c === COLS - 1) d = Math.max(d, COLS - 1);
  return d;
}
/** The line a Lathe looks along: from its edge across the board (a corner picks the longer column). Cells after the Lathe, up to the opposite edge. */
export function latheShaft(idx: number): number[] {
  const [r, c] = rc(idx);
  const vertical = r === 0 || r === ROWS - 1, horizontal = c === 0 || c === COLS - 1;
  const [dr, dc] = vertical && (!horizontal || ROWS >= COLS) ? [r === 0 ? 1 : -1, 0] : horizontal ? [0, c === 0 ? 1 : -1] : [0, 0];
  const out: number[] = [];
  for (let k = 1; inside(r + dr * k, c + dc * k) && (dr || dc); k++) out.push(at(r + dr * k, c + dc * k));
  return out;
}
/** Hit multiplier: on an edge x(0.7 + 0.25 per step to the opposite edge) (0.3 per step from L3), capped x2 (x2.3 from L3, x2.4 at L9); L6 an empty shaft all the way +0.2
 *  (inside the cap); off the edge x0.5 (x0.8 at L9). */
export function latheMult(grid: Grid, idx: number, level: number): number {
  const R = TUNING.r7;
  const d = latheSteps(idx);
  if (!d) return level >= 9 ? R.latheOffL9 : R.latheOff;
  let m = R.latheBase + (level >= 3 ? R.lathePerL3 : R.lathePer) * d;
  if (level >= 6 && latheShaft(idx).every((i) => !grid[i])) m += R.latheClear;
  return Math.min(level >= 9 ? R.latheCapL9 : level >= 3 ? R.latheCapL3 : R.latheCap, m);
}
