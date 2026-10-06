// REMIX opponents (ChatGPT REMIX_RULES.md v1). Deterministic, bounded board-touching attacks with 3 s warnings.
// Effects never damage, merge, activate, queue or allocate ids. They run between cascades (our cascades are atomic).
import { COLS, ROWS } from '../content/tuning';
import type { Grid } from './types';

export type RemixKind = 'vacuum' | 'twins' | 'piano';
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
function sample(kind: RemixKind, grid: Grid, blocked: ReadonlySet<number>): number[] | null {
  const occ = grid.map((g, i) => ({ g, i })).filter((x) => x.g && !blocked.has(x.i));
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
      const lockNow = cells.filter((c) => !busy.has(c));
      if (lockNow.length) {
        r.lock = { cells: lockNow, until: elapsed + PIANO_LOCK_S };
        ev.push({ type: 'remixHit', kind: r.kind, cells: lockNow, outcome: 'hit' });
      } else ev.push({ type: 'remixHit', kind: r.kind, cells, outcome: 'whiff' });
    }
  }
  // (5) new warning: waits for falling Kickback parts; skipped (never replayed) while an attack/lock is active
  if (r.next < REMIX_WARNINGS.length && elapsed >= REMIX_WARNINGS[r.next] - 1e-9 && settled) {
    r.next++;
    if (!r.pending && !r.lock) {
      const cells = sample(r.kind, grid, new Set([...blocked, ...lockedCells(r)]));
      if (cells) {
        r.pending = { cells, deadline: elapsed + REMIX_WARN_S };
        ev.push({ type: 'remixWarn', kind: r.kind, cells, deadline: r.pending.deadline });
      }
    }
  }
  return ev;
}
