// ROSTER batch 1 (t-9b28a794, TUNING.roster1): the job rules of Nail Gun, Jackhammer, Gear and Saw Blade. Pure helpers
// used by cascade.ts (and the inspect / tip copy). They only matter while one of these units is on the board, which
// needs the flag (src/content/units.ts applyRoster1 puts them in crates and squad pickers).
import { COLS, ROWS, TUNING } from '../content/tuning';
import type { Activation, Grid } from './types';

const rc = (idx: number) => [Math.floor(idx / COLS), idx % COLS] as const;
const inside = (r: number, c: number) => r >= 0 && r < ROWS && c >= 0 && c < COLS;

/** Nail Gun ROW: filled cells in its row, not counting itself (0..4). */
export function rowFill(grid: Grid, idx: number): number {
  const [r] = rc(idx);
  let n = 0;
  for (let c = 0; c < COLS; c++) if (r * COLS + c !== idx && grid[r * COLS + c]) n++;
  return n;
}

/** Nail Gun L9: filled cells in its column, not counting itself. */
export function colFill(grid: Grid, idx: number): number {
  const [, c] = rc(idx);
  let n = 0;
  for (let r = 0; r < ROWS; r++) if (r * COLS + c !== idx && grid[r * COLS + c]) n++;
  return n;
}

/** Saw Blade EDGE: the outer ring (18 of the 30 cells) and its four corners. */
export const onRing = (idx: number) => {
  const [r, c] = rc(idx);
  return r === 0 || r === ROWS - 1 || c === 0 || c === COLS - 1;
};
export const isCorner = (idx: number) => {
  const [r, c] = rc(idx);
  return (r === 0 || r === ROWS - 1) && (c === 0 || c === COLS - 1);
};

/** Job context for roster1Mult: `nth` = this machine's fire count (the "every Nth hit" milestones), `gearKick` = a Gear woke it. */
export interface Roster1Ctx {
  level: number;
  nth: number;
  gearKick?: boolean;
}

/**
 * Job multiplier on a roster 1 shooter's hit (1 for every other family); docs/ROSTER.md is the source of truth.
 * - Nail Gun ROW: x(1 + 0.2 per other filled cell in its row), max x1.8. L9: filled cells in its column count too, max x2.2.
 *   (Armor-pip stripping, its secondary job, needs the boss defence model that does not exist yet: no damage in it.)
 * - Jackhammer BYPASS: its share ignores a closed shield (the game applies that + the L3 x1.3, core/game.ts bypassShield).
 *   L6: every 4th hit x1.5. L9 rank 7-8: every 3rd hit.
 * - Saw Blade EDGE: x1.5 on the outer ring, x0.7 inside; total edge bonus at most +72% (x1.72). L3 ring x1.6. L6 corners
 *   x1.25 more (inside the cap). L9 inside x0.85.
 * - Gear: shooters a Gear wakes hit x1.2 at L9.
 */
export function roster1Mult(a: Activation, grid: Grid, ctx: Roster1Ctx): number {
  const R = TUNING.r1;
  const { level } = ctx;
  if (a.family === 'nail_gun') {
    let n = rowFill(grid, a.idx);
    if (level >= 9) n += colFill(grid, a.idx);
    return Math.min(level >= 9 ? R.nailCapL9 : R.nailCap, 1 + R.nailPer * n) * (ctx.gearKick ? R.gearKick : 1);
  }
  if (a.family === 'jackhammer') {
    const every = level >= 9 && a.rank >= 7 ? 3 : 4;
    return (level >= 6 && ctx.nth > 0 && ctx.nth % every === 0 ? R.hammerBeat : 1) * (ctx.gearKick ? R.gearKick : 1);
  }
  if (a.family === 'saw_blade') {
    const ring = onRing(a.idx);
    const edge = ring ? (level >= 3 ? R.sawEdgeL3 : R.sawEdge) * (level >= 6 && isCorner(a.idx) ? R.sawCorner : 1) : level >= 9 ? R.sawInsideL9 : R.sawInside;
    return Math.min(edge, R.sawCap) * (ctx.gearKick ? R.gearKick : 1);
  }
  return ctx.gearKick ? R.gearKick : 1;
}

/** Jackhammer BYPASS L3: hits x1.3 while the target's shield is closed. */
export const bypassBonus = (level: number) => (level >= 3 ? TUNING.r1.bypassL3 : 1);

/** Gear LINK: the other Gears a merged Gear jumps the chain to: the farthest ones first (Manhattan, then row-major),
 *  never one already in the chain, at most `left` of them (TUNING.r1.gearLinks per cascade). Sims t-9b28a794: when
 *  every Gear, woken or merged, linked every other Gear, a Gear squad's board became one chain. */
export function gearLinks(grid: Grid, idx: number, taken: (i: number) => boolean, left: number): number[] {
  if (left <= 0) return [];
  const [r0, c0] = rc(idx);
  const d = (i: number) => Math.abs(Math.floor(i / COLS) - r0) + Math.abs((i % COLS) - c0);
  return grid
    .flatMap((g, i) => (g?.family === 'gear' && i !== idx && !taken(i) ? [i] : []))
    .sort((a, b) => d(b) - d(a) || a - b)
    .slice(0, left);
}

/** Gear L3: it also wakes its 4 touching cells (base Gear only LINKS). */
export function gearPerkCells(idx: number, level: number): number[] {
  const [r, c] = rc(idx);
  if (level < 3) return [];
  return [[-1, 0], [1, 0], [0, -1], [0, 1]].flatMap(([dr, dc]) => (inside(r + dr, c + dc) ? [(r + dr) * COLS + c + dc] : []));
}

/** Gear L1 LONE job (t-7ba158ff): with no other Gear on the board there is nothing to link, so a Gear wakes the 2 cells
 *  two steps away in its row (left and right). Two or more Gears: LINK only, as before. */
export function gearLoneCells(grid: Grid, idx: number): number[] {
  if (grid.some((g, i) => g?.family === 'gear' && i !== idx)) return [];
  const [r, c] = rc(idx);
  return [-2, 2].flatMap((dc) => (inside(r, c + dc) ? [r * COLS + c + dc] : []));
}
