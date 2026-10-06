// REMIX opponents (ChatGPT REMIX_RULES.md v1). Deterministic, bounded board-touching attacks with 3 s warnings.
// Effects never damage, merge, activate, queue or allocate ids. They run between cascades (our cascades are atomic).
import { COLS, ROWS } from '../content/tuning';
import type { Grid } from './types';

/** vacuum/twins/piano = REMIX opponents; jam/gaps = SAGA level modifiers (vacuum doubles as SUCTION in levels). */
export type RemixKind = 'vacuum' | 'twins' | 'piano' | 'jam' | 'gaps';
export const REMIX_OPPONENTS: { target: number; kind: RemixKind; name: string }[] = [
  { target: 3, kind: 'vacuum', name: 'VACUUM VIPER' },
  { target: 4, kind: 'twins', name: 'TOASTER TWINS' },
  { target: 5, kind: 'piano', name: 'GRAND PIANO-SAURUS' },
];
export const REMIX_WARNINGS = [18, 36, 54, 72, 90, 108, 126];
export const REMIX_WARN_S = 3;
export const PIANO_LOCK_S = 4;

export interface RemixState {
  kind: RemixKind;
  next: number; // index into REMIX_WARNINGS
  pending: { cells: number[]; deadline: number } | null;
  lock: { cells: number[]; until: number } | null;
  /** SAGA level modifier cadence (ChatGPT r15): attack every `period` s, `warnS` telegraph, `lockS` block. */
  period?: number;
  warnS?: number;
  lockS?: number;
  /** JAM: row-major cyclic cursor. */
  cursor?: number;
}

export function levelModifierState(kind: 'vacuum' | 'jam' | 'gaps'): RemixState {
  const period = kind === 'vacuum' ? 18 : kind === 'jam' ? 16 : 20;
  return { kind, next: 0, pending: null, lock: null, period, warnS: 2, lockS: kind === 'jam' ? 5 : 4, cursor: 0 };
}

export type RemixEvent =
  | { type: 'remixWarn'; kind: RemixKind; cells: number[]; deadline: number }
  | { type: 'remixHit'; kind: RemixKind; cells: number[]; outcome: 'hit' | 'whiff' | 'jam'; removedId?: number; from?: number; to?: number }
  | { type: 'remixUnlock'; cells: number[] };

export const lockedCells = (r: RemixState | null | undefined): ReadonlySet<number> => new Set(r?.lock?.cells ?? []);

const DIRS: [number, number][] = [
  [-1, 0],
  [0, 1],
  [1, 0],
  [0, -1],
];

/** First empty, unreserved, unlocked neighbour (U/R/D/L) of a cell — the Toaster Twins landing. */
export function twinsDestination(grid: Grid, cell: number, blocked: ReadonlySet<number>): number {
  const r = Math.floor(cell / COLS), c = cell % COLS;
  for (const [dr, dc] of DIRS) {
    const rr = r + dr, cc = c + dc;
    if (rr < 0 || rr >= ROWS || cc < 0 || cc >= COLS) continue;
    const n = rr * COLS + cc;
    if (!grid[n] && !blocked.has(n)) return n;
  }
  return -1;
}

/** Pick the cells a warning marks (or null when there are no candidates: the attack is skipped). */
function sample(kind: RemixKind, grid: Grid, blocked: ReadonlySet<number>, r?: RemixState): number[] | null {
  const empties = grid.map((g, i) => (!g && !blocked.has(i) ? i : -1)).filter((i) => i >= 0);
  if (kind === 'jam') {
    // JAM: next empty eligible cell in row-major cyclic order; keep a two-cell reserve
    if (empties.length <= 2) return null;
    const cur = r?.cursor ?? 0;
    const pick = empties.find((i) => i >= cur) ?? empties[0];
    if (r) r.cursor = (pick + 1) % (ROWS * COLS);
    return [pick];
  }
  if (kind === 'gaps') {
    // ROW_GAPS: the row with the most empty eligible cells (tie: topmost); only if 2 empties remain elsewhere
    let best = -1, bestN = 0;
    for (let row = 0; row < ROWS; row++) {
      const n = empties.filter((i) => Math.floor(i / COLS) === row).length;
      if (n > bestN) [best, bestN] = [row, n];
    }
    if (best < 0 || empties.length - bestN < 2) return null;
    return empties.filter((i) => Math.floor(i / COLS) === best);
  }
  const level = !!r?.period;
  const counts = new Map<string, number>();
  for (const g of grid) if (g) counts.set(g.family + g.rank, (counts.get(g.family + g.rank) ?? 0) + 1);
  const occ = grid
    .map((g, i) => ({ g, i }))
    // SUCTION (levels): only unpaired core parts of rank 1-2, never helpers
    .filter((x) => x.g && !blocked.has(x.i) && (!level || (x.g.rank <= 2 && (counts.get(x.g.family + x.g.rank) ?? 0) % 2 === 1 && ['cannon', 'rocket', 'coil', 'bell'].includes(x.g.family))));
  if (kind === 'vacuum' || kind === 'twins') {
    if (!occ.length) return null;
    // row-major index order is the tie-break (row asc, then col asc)
    const pick = occ.reduce((best, x) => {
      const better = kind === 'vacuum' ? x.g!.rank < best.g!.rank : x.g!.rank > best.g!.rank;
      return better ? x : best;
    });
    return [pick.i];
  }
  // piano: row with the most occupied eligible cells (tie: lowest row); lock every eligible cell of that row
  let bestRow = -1, bestCount = 0;
  for (let r = 0; r < ROWS; r++) {
    const n = occ.filter((x) => Math.floor(x.i / COLS) === r).length;
    if (n > bestCount) [bestRow, bestCount] = [r, n];
  }
  if (bestRow < 0) return null;
  const cells: number[] = [];
  for (let c = 0; c < COLS; c++) if (!blocked.has(bestRow * COLS + c)) cells.push(bestRow * COLS + c);
  return cells;
}

/**
 * Advance remix timers for one tick. `settled` = no Kickback parts are falling (warnings wait for them).
 * `blocked` = reserved cells (drag + kickback plans). Mutates grid / remix state; returns events.
 */
export function remixTick(r: RemixState, grid: Grid, elapsed: number, settled: boolean, blocked: ReadonlySet<number>): RemixEvent[] {
  const ev: RemixEvent[] = [];
  // (2) lock expiry
  if (r.lock && elapsed >= r.lock.until - 1e-9) {
    ev.push({ type: 'remixUnlock', cells: r.lock.cells });
    r.lock = null;
  }
  const locked = lockedCells(r);
  const busy = new Set([...blocked, ...locked]);
  // (4) due attack resolution (revalidate the stored cells; never retarget)
  if (r.pending && elapsed >= r.pending.deadline - 1e-9) {
    const cells = r.pending.cells;
    r.pending = null;
    if (r.kind === 'vacuum') {
      const c = cells[0];
      const g = grid[c];
      if (g && !busy.has(c)) {
        grid[c] = null;
        ev.push({ type: 'remixHit', kind: r.kind, cells, outcome: 'hit', removedId: g.id });
      } else ev.push({ type: 'remixHit', kind: r.kind, cells, outcome: 'whiff' });
    } else if (r.kind === 'twins') {
      const c = cells[0];
      const to = grid[c] && !busy.has(c) ? twinsDestination(grid, c, busy) : -1;
      if (to >= 0) {
        grid[to] = grid[c];
        grid[c] = null;
        ev.push({ type: 'remixHit', kind: r.kind, cells, outcome: 'hit', from: c, to });
      } else ev.push({ type: 'remixHit', kind: r.kind, cells, outcome: grid[c] ? 'jam' : 'whiff' });
    } else {
      // jam / gaps only block cells that are STILL empty; piano locks the whole row
      const lockNow = cells.filter((c) => !busy.has(c) && (r.kind === 'piano' || !grid[c]));
      if (lockNow.length) {
        r.lock = { cells: lockNow, until: elapsed + (r.lockS ?? PIANO_LOCK_S) };
        ev.push({ type: 'remixHit', kind: r.kind, cells: lockNow, outcome: 'hit' });
      } else ev.push({ type: 'remixHit', kind: r.kind, cells, outcome: 'whiff' });
    }
  }
  // (5) new warning: waits for falling Kickback parts; skipped (never replayed) while an attack/lock is active
  const due = r.period ? (r.next + 1) * r.period : REMIX_WARNINGS[r.next];
  if (due !== undefined && elapsed >= due - 1e-9 && settled) {
    r.next++;
    if (!r.pending && !r.lock) {
      const cells = sample(r.kind, grid, new Set([...blocked, ...lockedCells(r)]), r);
      if (cells) {
        r.pending = { cells, deadline: elapsed + (r.warnS ?? REMIX_WARN_S) };
        ev.push({ type: 'remixWarn', kind: r.kind, cells, deadline: r.pending.deadline });
      }
    }
  }
  return ev;
}
