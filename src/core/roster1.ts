// ROSTER B batch 1 (t-9b28a794, TUNING.roster1): the job rules of Nail Gun, Drill, Gear and Saw Blade. Pure helpers
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

/** Saw Blade EDGE: the outer ring (18 of the 30 cells) and its four corners. */
export const onRing = (idx: number) => {
  const [r, c] = rc(idx);
  return r === 0 || r === ROWS - 1 || c === 0 || c === COLS - 1;
};
export const isCorner = (idx: number) => {
  const [r, c] = rc(idx);
  return (r === 0 || r === ROWS - 1) && (c === 0 || c === COLS - 1);
};

/** Drill ARMOR: 2 = a boss or mini-boss (armored), 1 = a monster with a special move (shield, frost, ...), 0 = plain. */
export type ArmorKind = 0 | 1 | 2;

/**
 * Job multiplier on a roster B shooter's hit (1 for every other family). `level` = unit level (L3 / L6 / L9 job
 * upgrades), `grid` = the board as the chain ends.
 * - Nail Gun: x(1 + 0.2 per other filled cell in its row). L3 rank 4+: 0.25 per cell. L6: the cells right above and
 *   below it count too. L9 rank 7-8: a full row is x2.5.
 * - Drill: x2 vs a boss / mini-boss (its shield-piercing is applied by the game, core/game.ts drillPierce). L3 rank 4+:
 *   x1.15. L6: monsters with a special move count as armored. L9 rank 7-8: x2.5 vs armored.
 * - Saw Blade: x1.5 on the outer ring, x0.7 inside. L3 rank 4+: ring x1.7. L6: inside x0.9. L9 rank 7-8: corners x2.2.
 */
export function roster1Mult(a: Activation, grid: Grid, level: number, armor: ArmorKind): number {
  const R = TUNING.r1;
  if (a.family === 'nail_gun') {
    let n = rowFill(grid, a.idx);
    if (level >= 9 && a.rank >= 7 && n >= COLS - 1) return R.nailFullL9;
    if (level >= 6) {
      const [r, c] = rc(a.idx);
      for (const rr of [r - 1, r + 1]) if (inside(rr, c) && grid[rr * COLS + c]) n++;
    }
    return 1 + (level >= 3 && a.rank >= 4 ? R.nailPerL3 : R.nailPer) * n;
  }
  if (a.family === 'drill') {
    const armored = armor === 2 || (armor === 1 && level >= 6);
    return (armored ? (level >= 9 && a.rank >= 7 ? R.drillArmorL9 : R.drillArmor) : 1) * (level >= 3 && a.rank >= 4 ? 1.15 : 1);
  }
  if (a.family === 'saw_blade') {
    if (!onRing(a.idx)) return level >= 6 ? 0.9 : R.sawInside;
    if (level >= 9 && a.rank >= 7 && isCorner(a.idx)) return R.sawCornerL9;
    return level >= 3 && a.rank >= 4 ? R.sawEdgeL3 : R.sawEdge;
  }
  return 1;
}

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

/** Gear job upgrades (cells past its 4 touching ones): L3 rank 4+ diagonals; L6 every 6th spin a 2-cell cross;
 *  L9 rank 7-8 always both. */
export function gearPerkCells(idx: number, rank: number, level: number, nth: number): number[] {
  const [r, c] = rc(idx);
  const out: number[] = [];
  const add = (rr: number, cc: number) => inside(rr, cc) && out.push(rr * COLS + cc);
  const top = level >= 9 && rank >= 7;
  if (top || (level >= 3 && rank >= 4)) for (const [dr, dc] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) add(r + dr, c + dc);
  if (top || (level >= 6 && nth > 0 && nth % 6 === 0)) for (const [dr, dc] of [[-2, 0], [0, 2], [2, 0], [0, -2]]) add(r + dr, c + dc);
  return out;
}
