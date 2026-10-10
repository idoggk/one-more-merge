// ROSTER batch 4 (t-1e3c8bb6, TUNING.roster4): the job rules of Capacitor, Ladder, Blueprint and Rewind Crank. Pure helpers used by
// cascade.ts, game.ts and support.ts (and the tip copy). They only matter while one of these units is on the board / in the squad,
// which needs the flag (src/content/units.ts applyRoster4). docs/ROSTER.md is the source.
import { COLS, ROWS, TUNING } from '../content/tuning';
import type { GameState } from './game';
import type { Grid } from './types';

const rc = (idx: number) => [Math.floor(idx / COLS), idx % COLS] as const;
const inside = (r: number, c: number) => r >= 0 && r < ROWS && c >= 0 && c < COLS;
const at = (r: number, c: number) => r * COLS + c;
const ORTHO: [number, number][] = [[-1, 0], [0, 1], [1, 0], [0, -1]];

// ---- Capacitor HOLD ----

/** What a banked Capacitor remembers: the part it is (by id; a merge hands the bank to the merged part) and the chain length it held. */
export interface CapBank {
  id: number;
  held: number;
}
/** Parts a release wakes: 1 touching part; L9 two. */
export const capWake = (level: number) => (level >= 9 ? TUNING.r4.capWakeL9 : TUNING.r4.capWake);
/** L6: the release adds one link of depth (the woken parts sit one link deeper). */
export const capDepth = (level: number) => (level >= 6 ? 1 : 0);
/** Touching parts (U/R/D/L) a release can wake: occupied, not locked, not `skip` (already in the chain). Strongest rank first, then row-major. */
export function capTargets(grid: Grid, idx: number, level: number, skip: (i: number) => boolean, locked: ReadonlySet<number>): number[] {
  const [r, c] = rc(idx);
  const out: number[] = [];
  for (const [dr, dc] of ORTHO) {
    if (!inside(r + dr, c + dc)) continue;
    const n = at(r + dr, c + dc);
    if (grid[n] && !locked.has(n) && !skip(n)) out.push(n);
  }
  out.sort((a, b) => grid[b]!.rank - grid[a]!.rank || a - b);
  return out.slice(0, capWake(level));
}

// ---- Ladder STAIRCASE ----

/** The staircase a Ladder at `idx` (rank `rank`) walks, in order: step 1 is a touching part exactly one rank above the Ladder, step 2
 *  touches step 1 and is one rank above it, and so on (max r4.stairMax steps). Each step must touch the one before it.
 *  L3: when no part one rank up touches, the staircase may step one rank DOWN instead (and then keeps going down).
 *  L6: once per staircase it may skip one rank (a part two ranks away) when no part one rank away touches.
 *  `skip` = cells that cannot be woken (locked, already in the chain, already on this staircase); a step prefers a shooter, then row-major. */
export function stairWalk(grid: Grid, idx: number, rank: number, level: number, skip: (i: number) => boolean, shooter: (i: number) => boolean, cross: (from: number, to: number) => boolean = () => false): number[] {
  const out: number[] = [];
  const used = new Set<number>([idx]);
  let at0 = idx, cur = rank, dir = 1, skipped = false, wentDown = false;
  const pick = (want: number): number => {
    const [r, c] = rc(at0);
    let best = -1;
    for (const [dr, dc] of ORTHO) {
      if (!inside(r + dr, c + dc)) continue;
      const n = at(r + dr, c + dc);
      const g = grid[n];
      if (!g || g.rank !== want || used.has(n) || skip(n) || cross(at0, n) || g.family === grid[idx]!.family) continue;
      if (best < 0 || (shooter(n) && !shooter(best)) || (shooter(n) === shooter(best) && n < best)) best = n;
    }
    return best;
  };
  while (out.length < TUNING.r4.stairMax) {
    let n = pick(cur + dir);
    let nr = cur + dir;
    if (n < 0 && level >= 6 && !skipped) {
      n = pick(cur + 2 * dir);
      nr = cur + 2 * dir;
      if (n >= 0) skipped = true;
    }
    if (n < 0 && level >= 3 && !wentDown) {
      n = pick(cur - 1);
      nr = cur - 1;
      if (n >= 0) {
        wentDown = true;
        dir = -1;
      }
    }
    if (n < 0) break;
    out.push(n);
    used.add(n);
    at0 = n;
    cur = nr;
  }
  return out;
}
/** L9: the top step hits x r4.stairTop. */
export const stairTop = (level: number) => (level >= 9 ? TUNING.r4.stairTop : 1);

// ---- Blueprint PLAN ----

export const bpShow = (level: number) => (level >= 3 ? TUNING.r4.bpShowL3 : TUNING.r4.bpShow);
export const bpSwap = (level: number) => (level >= 6 ? TUNING.r4.bpSwapL6 : TUNING.r4.bpSwap);
/** Rank a swapped-in copy arrives at: always rank 1 (Lead decision); at L9 the first copy of a use arrives at rank 2. */
export const bpRank = (level: number, first: boolean) => (level >= 9 && first ? TUNING.r4.bpRankL9 : 1);

// ---- Rewind Crank UNDO ----

/** Player merges one charge takes (10; 8 from L3). */
export const rwNeed = (level: number) => (level >= 3 ? TUNING.r4.rwMergesL3 : TUNING.r4.rwMerges);
/** Charges the crank can hold (1; 2 from L6). */
export const rwHold = (level: number) => (level >= 6 ? TUNING.r4.rwHoldL6 : TUNING.r4.rwHold);
/** The crank is OFF in Workshop Puzzles / drills, the Daily Puzzle and Daily Bench, Monster Bounties and Boss Rush (their results must not be undoable). */
export const rewindModeOk = (s: GameState) => !s.puzzle && !s.bounty && !s.daily && !s.rush && s.phase === 'playing';

/** Stable text of a state: keys sorted, undefined dropped, and WITHOUT the Support card's own meter (`support`: charge, uses, snapshot). */
function canon(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(canon);
  if (v && typeof v === 'object') {
    const o: Record<string, unknown> = {};
    for (const k of Object.keys(v as object).sort()) if ((v as Record<string, unknown>)[k] !== undefined) o[k] = canon((v as Record<string, unknown>)[k]);
    return o;
  }
  return v;
}
/** Hash of everything a rewind restores (the whole run state: board, delivery queue and bag, HP, clock, every random generator) except the crank's own meter. */
export function stateHash(s: GameState): string {
  const { support: _meter, ...rest } = s;
  void _meter;
  const text = JSON.stringify(canon(rest));
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return `${h.toString(16).padStart(8, '0')}:${text.length}`;
}
/** The snapshot of the state taken before a player merge (text; the crank's own meter is not part of it). */
export function rewindSnapshot(s: GameState): string {
  return JSON.stringify(s, function (this: unknown, key: string, val: unknown) {
    return this === s && key === 'support' ? undefined : val;
  });
}
/** Put the snapshot back in place (the live object is kept so every holder sees it); the crank's own meter stays as it is now. */
export function rewindRestore(s: GameState, snap: string): void {
  const back = JSON.parse(snap) as Record<string, unknown>;
  const keep = s.support;
  for (const k of Object.keys(s)) if (k !== 'support') delete (s as unknown as Record<string, unknown>)[k];
  Object.assign(s, back);
  s.support = keep;
}
