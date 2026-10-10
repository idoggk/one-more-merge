// ROSTER batch 3 (t-e728a5a6, TUNING.roster3): the job rules of Blowtorch, Pipe, Blast Plate and Tesla Tower. Pure helpers used by
// cascade.ts, boss.ts, game.ts and support.ts (and the tip copy). They only matter while one of these units is on the board /
// in the squad, which needs the flag (src/content/units.ts applyRoster3). docs/ROSTER.md is the source.
import { COLS, ROWS, TUNING } from '../content/tuning';
import type { Grid } from './types';

const rc = (idx: number) => [Math.floor(idx / COLS), idx % COLS] as const;
const inside = (r: number, c: number) => r >= 0 && r < ROWS && c >= 0 && c < COLS;
const at = (r: number, c: number) => r * COLS + c;
const ORTHO: [number, number][] = [[-1, 0], [0, 1], [1, 0], [0, -1]];
const DIAG: [number, number][] = [[-1, -1], [-1, 1], [1, -1], [1, 1]];

// ---- Blowtorch HAZARDS ----

/** The hazards a Blowtorch can burn. L1: junk blocks, clamps (and locked rows), a frost row. L3 adds a pending bomb and an oil slick. */
export type HazardKind = 'junk' | 'clamp' | 'frost' | 'bomb' | 'slick';
/** One hazard on the board now: `cells` = every cell it covers (a frost row = 5 cells, but it counts as ONE hazard). */
export interface TorchHazard {
  kind: HazardKind;
  cells: number[];
}
export const torchKinds = (level: number): HazardKind[] => (level >= 3 ? ['junk', 'clamp', 'frost', 'bomb', 'slick'] : ['junk', 'clamp', 'frost']);
/** Columns a Blowtorch shot runs along: its own; L6 also the column to its right. */
export const torchCols = (idx: number, level: number): number[] => {
  const c = idx % COLS;
  return level >= 6 && c + 1 < COLS ? [c, c + 1] : [c];
};
/** The hazards (not yet burned this cascade) a Blowtorch at `idx` burns, each with the cell the burn is applied at. */
export function torchTargets(hazards: readonly TorchHazard[], idx: number, level: number, done: ReadonlySet<TorchHazard>): { h: TorchHazard; cell: number }[] {
  const cols = torchCols(idx, level), kinds = torchKinds(level);
  const out: { h: TorchHazard; cell: number }[] = [];
  for (const h of hazards) {
    if (done.has(h) || !kinds.includes(h.kind)) continue;
    const cell = h.cells.find((x) => cols.includes(x % COLS));
    if (cell !== undefined) out.push({ h, cell });
  }
  return out;
}
/** Blowtorch hit multiplier: x1.5 per hazard burned (counted up to r3.torchMax = cap x2.25); L9 with nothing to burn it still hits x1.2. */
export function torchMult(burned: number, level: number): number {
  const R = TUNING.r3;
  if (burned > 0) return Math.pow(R.torchPer, Math.min(burned, R.torchMax));
  return level >= 9 ? R.torchNone : 1;
}

// ---- Pipe SAME FAMILY ----

/** Parts a Pipe at `idx` wakes: for every part touching it (U/R/D/L), that part and every same-family part joined to it (4-way;
 *  L6 also diagonally), nearest first, never another Pipe. At most 4 parts that are not already in the chain (6 from L3).
 *  `skip` = cells that cannot wake (locked, already in the chain): they are walked through but not counted. */
export function pipeFlow(grid: Grid, idx: number, level: number, skip: (i: number) => boolean, locked: ReadonlySet<number>): number[] {
  const cap = level >= 3 ? TUNING.r3.pipeCapL3 : TUNING.r3.pipeCap;
  const [r0, c0] = rc(idx);
  const steps = level >= 6 ? [...ORTHO, ...DIAG] : ORTHO;
  const seen = new Set<number>([idx]);
  const out: number[] = [];
  for (const [dr, dc] of ORTHO) {
    if (!inside(r0 + dr, c0 + dc)) continue;
    const first = at(r0 + dr, c0 + dc);
    const fam = grid[first]?.family;
    if (!fam || fam === 'pipe' || seen.has(first) || locked.has(first)) continue;
    const q = [first];
    seen.add(first);
    while (q.length) {
      const i = q.shift()!;
      if (!skip(i)) {
        if (out.length >= cap) return out;
        out.push(i);
      }
      const [r, c] = rc(i);
      for (const [er, ec] of steps) {
        if (!inside(r + er, c + ec)) continue;
        const n = at(r + er, c + ec);
        if (seen.has(n) || grid[n]?.family !== fam || locked.has(n)) continue;
        seen.add(n);
        q.push(n);
      }
    }
  }
  return out;
}

// ---- Tesla Tower STORM ----

export const teslaRange = (level: number) => (level >= 9 ? TUNING.r3.teslaRangeL9 : level >= 3 ? TUNING.r3.teslaRangeL3 : TUNING.r3.teslaRange);
/** Charges a Tower at `idx` collects from the relays that fired: 1 each within range (Chebyshev: a square of cells around it);
 *  from L6 a relay TOUCHING it (U/R/D/L) gives 2. Never more than r3.teslaMax. */
export function teslaCharges(relays: readonly number[], idx: number, level: number): number {
  const [r0, c0] = rc(idx);
  const range = teslaRange(level);
  let n = 0;
  for (const i of relays) {
    if (i === idx) continue;
    const dr = Math.abs(Math.floor(i / COLS) - r0), dc = Math.abs((i % COLS) - c0);
    if (Math.max(dr, dc) > range) continue;
    n += level >= 6 && dr + dc === 1 ? TUNING.r3.teslaTouch : 1;
  }
  return Math.min(TUNING.r3.teslaMax, n);
}
/** Tesla hit multiplier: +12% per charge (max 6 charges = x1.72). */
export const teslaMult = (charges: number) => 1 + TUNING.r3.teslaPer * Math.min(charges, TUNING.r3.teslaMax);

// ---- Blast Plate DEFENCE ----

/** A tapped cell the next boss attack cannot hit: `hits` = attacks it still absorbs. */
export interface Ward {
  cells: number[];
  hits: number;
}
export interface WardState {
  list: Ward[];
  /** Seconds the boss is stunned (its next attack comes later) each time a block lands; 0 below L9. */
  stun: number;
  blocks: number;
}
/** Cells one tap covers: the tapped cell; L3 a 1x2 (its right neighbour, or the left one on the right edge). */
export function wardCells(cell: number, level: number): number[] {
  if (level < 3) return [cell];
  return [cell, cell % COLS + 1 < COLS ? cell + 1 : cell - 1];
}
export const wardHits = (level: number) => (level >= 6 ? TUNING.r3.plateHits : 1);
/** Cells a boss attack cast `p` would hit (a marked cell, a whole row / column, the divider's two columns; a bomb also its 4 neighbours). */
export function attackCells(atk: string, p: { cells?: number[]; row?: number; col?: number; boundary?: number }): number[] {
  if (p.row !== undefined) return Array.from({ length: COLS }, (_, c) => at(p.row!, c));
  if (p.col !== undefined) return Array.from({ length: ROWS }, (_, r) => at(r, p.col!));
  if (p.boundary !== undefined) return Array.from({ length: ROWS * COLS }, (_, i) => i).filter((i) => i % COLS === p.boundary || i % COLS === p.boundary! + 1);
  const cells = p.cells ?? [];
  if (atk !== 'bomb' || !cells.length) return cells;
  const [r, c] = rc(cells[0]);
  return [...cells, ...ORTHO.filter(([dr, dc]) => inside(r + dr, c + dc)).map(([dr, dc]) => at(r + dr, c + dc))];
}
/** A cast arrives: if a ward covers one of its cells, the first such ward absorbs one hit. Returns the warded cells it stopped (or null). */
export function blockAttack(w: WardState | undefined, atk: string, p: { cells?: number[]; row?: number; col?: number; boundary?: number }): number[] | null {
  if (!w?.list.length) return null;
  const hit = new Set(attackCells(atk, p));
  const ward = w.list.find((x) => x.cells.some((c) => hit.has(c)));
  if (!ward) return null;
  const stopped = ward.cells.filter((c) => hit.has(c));
  if (--ward.hits <= 0) w.list.splice(w.list.indexOf(ward), 1);
  w.blocks++;
  return stopped;
}
