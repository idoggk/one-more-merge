import { COLS, MAX_RANK, ROWS, TUNING } from '../content/tuning';
import type { Activation, CascadeResult, Family, Grid, PerkId } from './types';

const DIRS: [number, number][] = [
  [-1, 0], // up
  [0, 1], // right
  [1, 0], // down
  [0, -1], // left
];

const rc = (idx: number) => [Math.floor(idx / COLS), idx % COLS] as const;
const inside = (r: number, c: number) => r >= 0 && r < ROWS && c >= 0 && c < COLS;
const at = (r: number, c: number) => r * COLS + c;

export function rawDamage(family: Family, rank: number): number {
  return TUNING.base[family] * Math.pow(TUNING.rankMult, rank - 1);
}

export function coilReach(rank: number, perks: readonly PerkId[]): number {
  return (rank >= 2 ? 2 : 1) + (perks.includes('leads') ? 1 : 0);
}

/** Ordered list of cells a gadget routes to when activated in a cascade (may include empties; caller filters). */
export function routeCells(idx: number, family: Family, rank: number, perks: readonly PerkId[]): number[] {
  const [r, c] = rc(idx);
  const out: number[] = [];
  if (family === 'coil') {
    const reach = coilReach(rank, perks);
    for (let d = 1; d <= reach; d++)
      for (const [dr, dc] of DIRS) if (inside(r + dr * d, c + dc * d)) out.push(at(r + dr * d, c + dc * d));
  } else if (family === 'bell') {
    for (let cc = 0; cc < COLS; cc++) if (cc !== c) out.push(at(r, cc));
    if (rank >= 3) {
      for (let rr = 0; rr < ROWS; rr++) if (rr !== r) out.push(at(rr, c));
    } else if (rank === 2) {
      if (inside(r - 1, c)) out.push(at(r - 1, c));
      if (inside(r + 1, c)) out.push(at(r + 1, c));
    }
  }
  return out;
}

export function sparkCells(idx: number): number[] {
  const [r, c] = rc(idx);
  return DIRS.filter(([dr, dc]) => inside(r + dr, c + dc)).map(([dr, dc]) => at(r + dr, c + dc));
}

export interface CascadeOpts {
  perks: readonly PerkId[];
  overdrive: boolean;
  /** Cells promised to falling Kickback parts: magnets never pull into or out of them. */
  reserved?: ReadonlySet<number>;
  /** Piano-locked cells: never relay targets; block helper rays like reserved cells. */
  locked?: ReadonlySet<number>;
}

/**
 * Magnet (ChatGPT spec): scan up/right/down/left for an empty neighbour; look up to two cells beyond it along that ray
 * (first occupied cell blocks). Pull that gadget if it has not activated / is not queued, is not reserved and is not a magnet.
 * First eligible ray only.
 */
export function magnetPull(grid: Grid, idx: number, busy: ReadonlySet<number>, reserved: ReadonlySet<number>, skipDir = -1): { from: number; to: number; dir: number } | null {
  const [r, c] = rc(idx);
  for (let di = 0; di < DIRS.length; di++) {
    if (di === skipDir) continue;
    const [dr, dc] = DIRS[di];
    if (!inside(r + dr, c + dc)) continue;
    const to = at(r + dr, c + dc);
    if (grid[to] || reserved.has(to)) continue;
    for (let k = 2; k <= 3; k++) {
      const rr = r + dr * k, cc = c + dc * k;
      if (!inside(rr, cc)) break;
      const from = at(rr, cc);
      if (reserved.has(from)) break; // any reserved cell blocks the ray, even when empty
      const g = grid[from];
      if (!g) continue;
      if (!busy.has(from) && !reserved.has(from) && g.family !== 'magnet') return { from, to, dir: di };
      break; // first occupied cell blocks the ray
    }
  }
  return null;
}

/**
 * Pure, bounded BFS cascade from a freshly merged gadget at rootIdx.
 * Each gadget activates at most once; strongest direct Coil charge wins.
 */
/** Fan: push the first adjacent eligible gadget (up/right/down/left) one cell outward into an empty, unreserved cell. */
export function fanPush(grid: Grid, idx: number, busy: ReadonlySet<number>, reserved: ReadonlySet<number>, longGust = false): { from: number; to: number } | null {
  const [r, c] = rc(idx);
  for (const [dr, dc] of DIRS) {
    if (!inside(r + dr, c + dc) || !inside(r + 2 * dr, c + 2 * dc)) continue;
    const from = at(r + dr, c + dc);
    const to = at(r + 2 * dr, c + 2 * dc);
    const g = grid[from];
    if (!g || busy.has(from) || reserved.has(from) || reserved.has(to) || grid[to] || g.family === 'fan') continue;
    // MAX Long Gust (ChatGPT r9): choose the farther landing up front if it is also free; one atomic move
    if (longGust && inside(r + 3 * dr, c + 3 * dc)) {
      const far = at(r + 3 * dr, c + 3 * dc);
      if (!grid[far] && !reserved.has(far)) return { from, to: far };
    }
    return { from, to };
  }
  return null;
}

/**
 * Battery (TOY_RULES): prime the first adjacent Cannon (up/right/down/left) that has not activated in this cascade,
 * is not already primed and is not reserved. A queued-but-not-yet-fired Cannon IS eligible (it uses the charge on its turn).
 */
export function batteryPrime(grid: Grid, idx: number, primed: ReadonlySet<number>, fired: ReadonlySet<number>, reserved: ReadonlySet<number>): number | null {
  const [r, c] = rc(idx);
  for (const [dr, dc] of DIRS) {
    if (!inside(r + dr, c + dc)) continue;
    const cell = at(r + dr, c + dc);
    const g = grid[cell];
    if (g && g.family === 'cannon' && !primed.has(g.id) && !fired.has(g.id) && !reserved.has(cell)) return g.id;
  }
  return null;
}

export function resolveCascade(input: Grid, rootIdx: number, opts: CascadeOpts): CascadeResult {
  const grid = input.slice(); // magnets may move pieces; later steps see the updated board
  const moves: CascadeResult['moves'] = [];
  const primes: number[] = [];
  // live primer state during the cascade: starts from the board, batteries add, cannon payloads consume
  const primedNow = new Set(input.filter((g) => g?.primed).map((g) => g!.id));
  const fired = new Set<number>(); // ids dequeued (activated) so far
  const bonus = new Set<number>(); // cannon ids whose payload consumed a primer
  const discharged: number[] = [];
  const root = grid[rootIdx];
  if (!root) throw new Error('cascade root is empty');
  const visited = new Map<number, Activation>(); // by idx
  const edges: CascadeResult['edges'] = [];
  const queue: number[] = [];
  const charge = new Map<number, number>();

  const enqueue = (from: number, to: number, depth: number) => {
    if (visited.has(to)) return;
    const g = grid[to]!;
    visited.set(to, { id: g.id, idx: to, family: g.family, rank: g.rank, depth, parent: from, charge: 1, contribution: 0 });
    queue.push(to);
  };

  visited.set(rootIdx, { id: root.id, idx: rootIdx, family: root.family, rank: root.rank, depth: 0, parent: -1, charge: 1, contribution: 0 });
  queue.push(rootIdx);

  // Root sparks to orthogonal neighbours, then its family routes (handled in the loop).
  const lockedSet = opts.locked ?? new Set<number>();
  const blockSet = new Set([...(opts.reserved ?? []), ...lockedSet]);
  for (const n of sparkCells(rootIdx)) {
    if (!grid[n] || lockedSet.has(n)) continue;
    edges.push({ from: rootIdx, to: n, kind: 'spark' });
    enqueue(rootIdx, n, 1);
  }

  /** MAX relay signatures (ChatGPT round 9), after normal routing. At most one extra wake-up each; no damage bonus. */
  const maxSignature = (idx: number, a: Activation) => {
    const [r, c] = rc(idx);
    const free = (rr: number, cc: number) => inside(rr, cc) && !grid[at(rr, cc)] && !blockSet.has(at(rr, cc));
    const wakeable = (n: number, notFam: Family) => {
      const g = grid[n];
      return !!g && g.family !== notFam && !visited.has(n) && !blockSet.has(n);
    };
    if (a.family === 'coil') {
      // Arc Bridge: jump a 2-cell empty corridor to wake one non-Coil exactly 3 cells away
      for (const [dr, dc] of DIRS) {
        if (!inside(r + 3 * dr, c + 3 * dc) || !free(r + dr, c + dc) || !free(r + 2 * dr, c + 2 * dc)) continue;
        const n = at(r + 3 * dr, c + 3 * dc);
        if (!wakeable(n, 'coil')) continue;
        edges.push({ from: idx, to: n, kind: 'bridge' });
        enqueue(idx, n, a.depth + 1);
        return;
      }
    } else if (a.family === 'bell') {
      // Corner Chime (ChatGPT r10 name): our MAX bell already rings its row + column, so it chimes one diagonal neighbour (UL, UR, DL, DR)
      for (const [dr, dc] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) {
        if (!inside(r + dr, c + dc)) continue;
        const n = at(r + dr, c + dc);
        if (!wakeable(n, 'bell')) continue;
        edges.push({ from: idx, to: n, kind: 'chime' });
        enqueue(idx, n, a.depth + 1);
        return;
      }
    }
  };

  let guard = 0;
  while (queue.length) {
    if (++guard > ROWS * COLS + 1) throw new Error('cascade bound violated');
    const idx = queue.shift()!;
    const a = visited.get(idx)!;
    fired.add(a.id);
    if (a.family === 'cannon') {
      if (primedNow.has(a.id)) {
        primedNow.delete(a.id);
        bonus.add(a.id);
        discharged.push(a.id);
      }
      // MAX Backfire (ChatGPT r9): after its payload a rank-6 cannon wakes one adjacent Coil or Bell (U/R/D/L)
      if (a.rank >= MAX_RANK) {
        for (const n of sparkCells(idx)) {
          const g = grid[n];
          if (!g || visited.has(n) || blockSet.has(n) || (g.family !== 'coil' && g.family !== 'bell')) continue;
          edges.push({ from: idx, to: n, kind: 'backfire' });
          enqueue(idx, n, a.depth + 1);
          break;
        }
      }
      continue;
    }
    if (a.family === 'fan') {
      const p = fanPush(grid, idx, new Set(visited.keys()), blockSet, a.rank >= MAX_RANK);
      if (p) {
        moves.push({ ...p, id: grid[p.from]!.id });
        edges.push({ from: p.from, to: p.to, kind: 'fan' });
        grid[p.to] = grid[p.from];
        grid[p.from] = null;
      }
      continue;
    }
    if (a.family === 'battery') {
      // MAX Split Charge (ChatGPT r9): run the primer selection twice (the first target is then ineligible)
      for (let k = 0; k < (a.rank >= MAX_RANK ? 2 : 1); k++) {
        const id = batteryPrime(grid, idx, primedNow, fired, blockSet);
        if (id === null) break;
        primes.push(id);
        primedNow.add(id);
        const to = grid.findIndex((g) => g?.id === id);
        edges.push({ from: idx, to, kind: 'battery' });
      }
      continue;
    }
    if (a.family === 'magnet') {
      // MAX Twin Pull (ChatGPT r9): a second pull on the updated board, other direction, never the first moved piece
      let skip = -1;
      const busy = new Set(visited.keys());
      for (let k = 0; k < (a.rank >= MAX_RANK ? 2 : 1); k++) {
        const p = magnetPull(grid, idx, busy, blockSet, skip);
        if (!p) break;
        moves.push({ from: p.from, to: p.to, id: grid[p.from]!.id });
        edges.push({ from: p.from, to: p.to, kind: 'magnet' });
        grid[p.to] = grid[p.from];
        grid[p.from] = null;
        skip = p.dir;
        busy.add(p.to);
      }
      continue;
    }
    const kind = a.family;
    const coilMult = 1 + TUNING.coilChargePerRank * a.rank;
    for (const to of routeCells(idx, a.family, a.rank, opts.perks)) {
      if (!grid[to] || to === idx || lockedSet.has(to)) continue;
      if (!TUNING.sameFamilyRelay && grid[to]!.family === a.family) continue;
      edges.push({ from: idx, to, kind });
      if (kind === 'coil') charge.set(to, Math.max(charge.get(to) ?? 1, coilMult));
      enqueue(idx, to, a.depth + 1);
    }
    if (a.rank >= MAX_RANK) maxSignature(idx, a);
  }

  const acts = [...visited.values()];
  let sum = 0;
  for (const a of acts) {
    a.charge = charge.get(a.idx) ?? 1;
    const perk = a.family === 'cannon' && opts.perks.includes('twin') ? 1.4 : 1;
    const prime = bonus.has(a.id) ? TUNING.batteryBonus : 1;
    a.contribution = rawDamage(a.family, a.rank) * a.charge * perk * prime;
    sum += a.contribution;
  }
  const encore = opts.perks.includes('encore');
  const slope = TUNING.comboSlope + (encore ? 0.04 : 0);
  const cap = TUNING.comboCap + (encore ? 0.5 : 0);
  const comboMult = Math.min(cap, 1 + slope * (acts.length - 1));
  const total = sum * comboMult * (opts.overdrive ? TUNING.overdriveFactor : 1);
  return { rootIdx, activations: acts, edges, moves, primes, discharged, count: acts.length, comboMult, total };
}
