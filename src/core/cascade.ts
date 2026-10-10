import { COLS, MAX_RANK, ROWS, TUNING, unitsB0On } from '../content/tuning';
import { isRelay, isShooter, type Activation, type CascadeResult, type Family, type Grid, type PerkId } from './types';

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
  // clarity ruleset (ChatGPT r14): one fixed, visible 2-cell cross; rank only changes damage
  return (TUNING.clarity || rank >= 2 ? 2 : 1) + (perks.includes('leads') ? 1 : 0);
}

/** Ordered list of cells a gadget routes to when activated in a cascade (may include empties; caller filters). */
export function routeCells(idx: number, family: Family, rank: number, perks: readonly PerkId[]): number[] {
  if (TUNING.rosterB && isRelay(family)) return rbRouteCells(idx, family, 1, 0, perks);
  const [r, c] = rc(idx);
  const out: number[] = [];
  if (family === 'coil') {
    const reach = coilReach(rank, perks);
    for (let d = 1; d <= reach; d++)
      for (const [dr, dc] of DIRS) if (inside(r + dr * d, c + dc * d)) out.push(at(r + dr * d, c + dc * d));
  } else if (family === 'horn') {
    // r32 Horn: its whole column (the vertical Bell); units B1 hornSides: plus its left / right neighbours
    for (let rr = 0; rr < ROWS; rr++) if (rr !== r) out.push(at(rr, c));
    if (TUNING.unitsB1 && TUNING.b1.hornSides) for (const cc of [c - 1, c + 1]) if (inside(r, cc)) out.push(at(r, cc));
  } else if (family === 'fuse_box') {
    // r32 Fuse Box: the four diagonal corners (units B1: b1.fuseReach cells along each diagonal)
    const reach = TUNING.unitsB1 ? TUNING.b1.fuseReach : 1;
    for (let d = 1; d <= reach; d++) for (const [dr, dc] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) if (inside(r + dr * d, c + dc * d)) out.push(at(r + dr * d, c + dc * d));
  } else if (family === 'bell') {
    for (let cc = 0; cc < COLS; cc++) if (cc !== c) out.push(at(r, cc));
    if (TUNING.clarity) return out; // clarity ruleset: a Bell rings its row, at every rank
    if (rank >= 3) {
      for (let rr = 0; rr < ROWS; rr++) if (rr !== r) out.push(at(rr, c));
    } else if (rank === 2) {
      if (inside(r - 1, c)) out.push(at(r - 1, c));
      if (inside(r + 1, c)) out.push(at(r + 1, c));
    }
  }
  return out;
}

/** Roster B relay jobs (TUNING.rosterB) with their collection-level upgrades. `nth` = this fire's 'every Nth' count.
 *  Coil REACH: up / down 2, left / right 1 (6 cells); L3 left / right 2; L6 + its 4 diagonal neighbours; L9 3 every way.
 *  Bell ROW: its row; L3 + the cells above / below; L6 every 3rd ring + the rows above / below; L9 always.
 *  Horn COLUMN: its column; (L3 = KICK on shooters, in resolveCascade); L6 + its left / right; L9 + both side columns.
 *  Fuse Box DIAGONAL: 2 cells along each diagonal; L3 full diagonals; L6 every 3rd spark + U/R/D/L; L9 always. */
export function rbRouteCells(idx: number, family: Family, level: number, nth: number, perks: readonly PerkId[] = []): number[] {
  const [r, c] = rc(idx);
  const out: number[] = [];
  const add = (rr: number, cc: number) => inside(rr, cc) && !(rr === r && cc === c) && out.push(at(rr, cc));
  const ray = (dr: number, dc: number, n: number) => {
    for (let d = 1; d <= n; d++) add(r + dr * d, c + dc * d);
  };
  const every = (n: number) => nth > 0 && nth % n === 0;
  const row = (rr: number) => {
    for (let cc = 0; cc < COLS; cc++) add(rr, cc);
  };
  const col = (cc: number) => {
    for (let rr = 0; rr < ROWS; rr++) add(rr, cc);
  };
  if (family === 'coil') {
    const lead = perks.includes('leads') ? 1 : 0;
    const v = (level >= 9 ? 3 : 2) + lead, h = (level >= 9 ? 3 : level >= 3 ? 2 : 1) + lead;
    ray(-1, 0, v), ray(1, 0, v), ray(0, -1, h), ray(0, 1, h);
    if (level >= 6) for (const [dr, dc] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) add(r + dr, c + dc);
  } else if (family === 'bell') {
    row(r);
    if (level >= 3) add(r - 1, c), add(r + 1, c);
    if (level >= 9 || (level >= 6 && every(3))) row(r - 1), row(r + 1);
  } else if (family === 'horn') {
    col(c);
    if (level >= 6) add(r, c - 1), add(r, c + 1);
    if (level >= 9) col(c - 1), col(c + 1);
  } else if (family === 'fuse_box') {
    for (const [dr, dc] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) ray(dr, dc, level >= 3 ? ROWS : 2);
    if (level >= 9 || (level >= 6 && every(3))) for (const [dr, dc] of DIRS) add(r + dr, c + dc);
  }
  return [...new Set(out)];
}

/** Roster B Mortar DEPTH: x(1 + mortarStep per machine already fired in this chain), max mortarCap (L3 mortarCapL3). */
export const rbMortarMult = (before: number, level: number) => Math.min(level >= 3 ? TUNING.rb.mortarCapL3 : TUNING.rb.mortarCap, 1 + TUNING.rb.mortarStep * before);

export function sparkCells(idx: number): number[] {
  const [r, c] = rc(idx);
  return DIRS.filter(([dr, dc]) => inside(r + dr, c + dc)).map(([dr, dc]) => at(r + dr, c + dc));
}

/** r32 Mortar: x0.9 at depth 1 rising +0.15 per link; L3 Bigger Shell cap 1.80 (rank 4+), L6 High Arc (every 6th: depth+2), L9 Siege Shot (rank 7-8: depth >= 4). */
function mortarMult(a: Activation, level: number, nth: number) {
  let d = Math.max(1, a.depth);
  if (level >= 6 && nth > 0 && nth % 6 === 0) d += 2;
  if (level >= 9 && a.rank >= 7) d = Math.max(d, 4);
  return Math.min(level >= 3 && a.rank >= 4 ? 1.8 : 1.65, 0.9 + 0.15 * (d - 1));
}

/** Units B0 Mortar: x(0.8 + 0.1 per machine already fired earlier in this chain), cap x2.0 (+0.15 L3 Bigger Shell, rank 4+);
 *  L6 High Arc counts 2 more machines on every 6th fire, L9 Siege Shot (rank 7-8) counts at least 4. B1: b1 base / step. */
export function mortarOrderMult(a: Activation, level: number, nth: number, before: number) {
  const B = TUNING.b0;
  const base = TUNING.unitsB1 ? TUNING.b1.orderBase : B.orderBase, step = TUNING.unitsB1 ? TUNING.b1.orderStep : B.orderStep;
  let n = before;
  if (level >= 6 && nth > 0 && nth % 6 === 0) n += 2;
  if (level >= 9 && a.rank >= 7) n = Math.max(n, 4);
  return Math.min(B.orderCap + (level >= 3 && a.rank >= 4 ? B.capPerk : 0), base + step * n);
}

/** Units B1 boost marks: Battery (touching) > Amplifier (within 2 cells) > Beacon (anywhere); +0.03 per unit level. */
export function b1BoostMult(family: Family, level: number): number {
  const b = TUNING.b1;
  return (family === 'battery' ? b.battery : family === 'amplifier' ? b.amp : b.beacon) + 0.03 * (level - 1);
}

/** r32 relay milestone geometry (extra cells a relay wakes; same-family / fired filters still apply). */
function relayPerkCells(idx: number, a: Activation, level: number, nth: number): number[] {
  const [r, c] = rc(idx);
  const out: number[] = [];
  const add = (rr: number, cc: number) => inside(rr, cc) && !(rr === r && cc === c) && out.push(at(rr, cc));
  const nthIs = (n: number) => nth > 0 && nth % n === 0;
  if (a.family === 'coil') {
    const reach = level >= 9 && a.rank >= 7 ? 4 : level >= 3 && a.rank >= 5 ? 3 : 2;
    for (let d = 3; d <= reach; d++) for (const [dr, dc] of DIRS) add(r + dr * d, c + dc * d);
    if (level >= 6 && nthIs(6)) for (const [dr, dc] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) add(r + dr, c + dc);
  } else if (a.family === 'bell') {
    if (level >= 3 && a.rank >= 4) [add(r - 1, c), add(r + 1, c)];
    if (level >= 6 && nthIs(6)) for (let cc = 0; cc < COLS; cc++) [add(r - 1, cc), add(r + 1, cc)];
    if (level >= 9 && a.rank >= 7) for (let rr = 0; rr < ROWS; rr++) add(rr, c);
  } else if (a.family === 'horn') {
    if (level >= 3 && a.rank >= 4) [add(r, c - 1), add(r, c + 1)];
    if (level >= 6 && nthIs(6)) for (let rr = 0; rr < ROWS; rr++) [add(rr, c - 1), add(rr, c + 1)];
    if (level >= 9 && a.rank >= 7) for (let cc = 0; cc < COLS; cc++) add(r, cc);
  } else if (a.family === 'fuse_box') {
    if (level >= 3 && a.rank >= 4) for (const [dr, dc] of [[-2, -2], [-2, 2], [2, -2], [2, 2]]) add(r + dr, c + dc);
    if (level >= 6 && nthIs(5)) for (const [dr, dc] of DIRS) add(r + dr, c + dc);
    if (level >= 9 && a.rank >= 7) for (const [dr, dc] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) for (let k = 1; k < 6; k++) add(r + dr * k, c + dc * k);
  }
  return out;
}

export interface CascadeOpts {
  perks: readonly PerkId[];
  overdrive: boolean;
  /** Cells promised to falling Kickback parts: magnets never pull into or out of them. */
  reserved?: ReadonlySet<number>;
  /** Piano-locked cells: never relay targets; block helper rays like reserved cells. */
  locked?: ReadonlySet<number>;
  /** Boss effects (r20): shooters in hotCol deal x0.5; relays in restRow emit no wakes; no relay wake crosses splitB|splitB+1. */
  hotCol?: number;
  restRow?: number;
  splitB?: number;
  /** r25: player-rooted cascade — attachments act and spend charges (never in passive / automatic kickback cascades). */
  items?: boolean;
  /** r32 unit levels: damage multiplier per family (collection progression). */
  unitMult?: Partial<Record<Family, number>>;
  /** r32 helper strength by level (Amplifier / Beacon mark multipliers) + L3/L6/L9 milestone perks. */
  unitLevel?: Partial<Record<Family, number>>;
  /** r32 'every Nth fire' counters carried in from earlier cascades this level. */
  fireBase?: Record<string, number>;
  /** Units B1: cells a firing Fan may clear (junk block, clamp, frost row, locked row); caller applies `clears`. */
  hazards?: ReadonlySet<number>;
  /** TUNING.rosterB Signal Beacon GO: more cells woken at depth 0 with the root; `wake` = nobody was merged (no root spark,
   *  no Rocket BURST); `goKick` multiplies the shooters it wakes. */
  roots?: number[];
  wake?: boolean;
  goKick?: number;
  /** TUNING.rosterB Battery PRIME: every machine in this chain hits x this. */
  primeAll?: number;
}

/**
 * Magnet (ChatGPT spec): scan up/right/down/left for an empty neighbour; look up to two cells beyond it along that ray
 * (first occupied cell blocks). Pull that gadget if it has not activated / is not queued, is not reserved and is not a magnet.
 * First eligible ray only.
 */
export function magnetPull(grid: Grid, idx: number, busy: ReadonlySet<number>, reserved: ReadonlySet<number>, skipDir = -1, maxK = 3): { from: number; to: number; dir: number } | null {
  const [r, c] = rc(idx);
  for (let di = 0; di < DIRS.length; di++) {
    if (di === skipDir) continue;
    const [dr, dc] = DIRS[di];
    if (!inside(r + dr, c + dc)) continue;
    const to = at(r + dr, c + dc);
    if (grid[to] || reserved.has(to)) continue;
    for (let k = 2; k <= maxK; k++) {
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
 * Battery (TOY_RULES): prime the first adjacent shooter (up/right/down/left) that has not activated in this cascade,
 * is not already primed and is not reserved. A queued-but-not-yet-fired shooter IS eligible (it uses the charge on its turn).
 */
export function batteryPrime(grid: Grid, idx: number, primed: ReadonlySet<number>, fired: ReadonlySet<number>, reserved: ReadonlySet<number>): number | null {
  const [r, c] = rc(idx);
  for (const [dr, dc] of DIRS) {
    if (!inside(r + dr, c + dc)) continue;
    const cell = at(r + dr, c + dc);
    const g = grid[cell];
    if (g && isShooter(g.family) && !primed.has(g.id) && !fired.has(g.id) && !reserved.has(cell)) return g.id;
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
  const orderOf = new Map<number, number>(); // id -> machines fired before it in this cascade (units B0 Mortar)
  const bonus = new Set<number>(); // cannon ids whose payload consumed a primer
  const discharged: number[] = [];
  const root = grid[rootIdx];
  if (!root) throw new Error('cascade root is empty');
  const visited = new Map<number, Activation>(); // by idx
  const edges: CascadeResult['edges'] = [];
  const queue: number[] = [];
  const charge = new Map<number, number>();
  // r25 attachments: snapshot at cascade start
  const itemOf = new Map<number, { kind: string; charges: number }>();
  if (opts.items) for (const g of input) if (g?.item && g.item.charges > 0) itemOf.set(g.id, g.item);
  const itemUsed: number[] = [];
  // r32 Amplifier / Beacon marks: live during the cascade (board marks + new marks), spent on activation
  const ampNow = new Map<number, number>(input.filter((g) => g?.amp).map((g) => [g!.id, g!.amp!]));
  const ampOn = new Map<number, number>(); // id -> multiplier applied to this activation
  const amps: { id: number; mult: number; spent?: boolean }[] = [];
  const ampsUsed: number[] = [];
  const lvl = (f: Family) => opts.unitLevel?.[f] ?? 1;
  // r32 milestone perks: per-family fire counter (base from earlier cascades) -> 'every Nth fire' bonuses
  const fires: Record<string, number> = {};
  const nthOf = new Map<number, number>();
  const every = (a: Activation, n: number) => (nthOf.get(a.id) ?? 0) % n === 0;
  const hasPerk = (f: Family, milestone: number, minRank: number, a: Activation) => lvl(f) >= milestone && a.rank >= minRank;
  const nthEvery = (f: Family, milestone: number, n: number, a: Activation) => lvl(f) >= milestone && every(a, n);
  const mark = (idx: number, mult: number, from: number) => {
    const g = grid[idx];
    if (!g) return;
    if ((ampNow.get(g.id) ?? 0) >= mult) return;
    ampNow.set(g.id, mult);
    amps.push({ id: g.id, mult });
    edges.push({ from, to: idx, kind: 'amp' });
  };
  const clears: number[] = [];
  let fetch = 0;
  /** Units B1 SETUP: BOOSTED xmult on the strongest unfired shooter within `reach` (Chebyshev; Infinity = anywhere) that
   *  it would raise; nearest, then row-major on ties. Returns the marked cell, or -1 when no shooter qualifies. */
  const boostShooter = (idx: number, reach: number, mult: number) => {
    const [r0, c0] = rc(idx);
    let best = -1, bd = 99;
    grid.forEach((g, n) => {
      if (!g || n === idx || fired.has(g.id) || !isShooter(g.family) || (ampNow.get(g.id) ?? 0) >= mult || lockedSet.has(n)) return;
      const d = Math.max(Math.abs(Math.floor(n / COLS) - r0), Math.abs((n % COLS) - c0));
      if (d > reach) return;
      if (best < 0 || g.rank > grid[best]!.rank || (g.rank === grid[best]!.rank && d < bd)) [best, bd] = [n, d];
    });
    if (best >= 0) mark(best, mult, idx);
    return best;
  };
  const overcharged = new Set<number>();
  const crosses = (from: number, to: number) => opts.splitB !== undefined && from % COLS <= opts.splitB !== to % COLS <= opts.splitB;
  /** Item wake edges: occupied neighbours (orthogonal or diagonal), excluding the owner's family; shared split predicate. */
  const itemWakes = (idx: number, a: Activation, dirs: number[][]) => {
    const [r, c] = rc(idx);
    for (const [dr, dc] of dirs) {
      if (!inside(r + dr, c + dc)) continue;
      const n = at(r + dr, c + dc);
      const g = grid[n];
      if (!g || g.family === a.family || lockedSet.has(n) || crosses(idx, n)) continue;
      edges.push({ from: idx, to: n, kind: 'item' });
      enqueue(idx, n, a.depth + 1);
    }
  };

  const enqueue = (from: number, to: number, depth: number) => {
    if (visited.has(to)) return;
    const g = grid[to]!;
    visited.set(to, { id: g.id, idx: to, family: g.family, rank: g.rank, depth, parent: from, charge: 1, contribution: 0 });
    queue.push(to);
  };

  visited.set(rootIdx, { id: root.id, idx: rootIdx, family: root.family, rank: root.rank, depth: 0, parent: -1, charge: 1, contribution: 0 });
  queue.push(rootIdx);
  for (const n of opts.roots ?? []) {
    if (!grid[n] || visited.has(n)) continue;
    visited.set(n, { id: grid[n]!.id, idx: n, family: grid[n]!.family, rank: grid[n]!.rank, depth: 0, parent: -1, charge: 1, contribution: 0 });
    queue.push(n);
  }

  // Root sparks to orthogonal neighbours, then its family routes (handled in the loop).
  const lockedSet = opts.locked ?? new Set<number>();
  const blockSet = new Set([...(opts.reserved ?? []), ...lockedSet]);
  if (!opts.wake)
    for (const n of sparkCells(rootIdx)) {
      if (!grid[n] || lockedSet.has(n)) continue;
      edges.push({ from: rootIdx, to: n, kind: 'spark' });
      enqueue(rootIdx, n, 1);
    }
  // roster B: shooters a Horn (L3+) woke (KICK), shooters an Arc Welder (L6+) jumped to (SPREAD), Mortars held back (L6)
  const RB = TUNING.rosterB;
  const kicked = new Set<number>();
  const spread = new Set<number>();
  const held = new Set<number>();

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

  /** Units B1 helperPass: a helper that did its job passes the chain on to its U/R/D/L neighbours (other families). */
  const passOn = (idx: number, a: Activation) => {
    if (!TUNING.b1.helperPass) return;
    for (const n of sparkCells(idx)) {
      const g = grid[n];
      if (!g || g.family === a.family || visited.has(n) || lockedSet.has(n) || crosses(idx, n)) continue;
      edges.push({ from: idx, to: n, kind: 'spark' });
      enqueue(idx, n, a.depth + 1);
    }
  };

  // roster B Mortar L6 Last Word: Mortars wait here (once each) and fire FIFO, one at a time, whenever the queue runs dry
  const deferred: number[] = [];
  let guard = 0;
  while (queue.length || deferred.length) {
    if (++guard > (ROWS * COLS + 1) * (RB ? 4 : 1)) throw new Error('cascade bound violated');
    const idx = queue.length ? queue.shift()! : deferred.shift()!;
    const a = visited.get(idx)!;
    if (RB && a.family === 'mortar' && lvl('mortar') >= 6 && !held.has(idx) && queue.length) {
      held.add(idx);
      deferred.push(idx);
      continue;
    }
    orderOf.set(a.id, fired.size);
    fired.add(a.id);
    fires[a.family] = (fires[a.family] ?? 0) + 1;
    nthOf.set(a.id, (opts.fireBase?.[a.family] ?? 0) + fires[a.family]);
    if (ampNow.has(a.id)) {
      ampOn.set(a.id, ampNow.get(a.id)!);
      ampNow.delete(a.id);
      ampsUsed.push(a.id);
      for (const m of amps) if (m.id === a.id) m.spent = true; // placed this cascade and already used: not written back
    }
    const it = itemOf.get(a.id);
    if (it) {
      itemUsed.push(a.id); // spent on activation even when a boss modifier blocks the benefit
      if (it.kind === 'overcharge' && isShooter(a.family)) overcharged.add(a.id);
      if (it.kind === 'spark' && isShooter(a.family)) itemWakes(idx, a, DIRS);
      if (it.kind === 'corner' && a.family === 'bell' && !(opts.restRow !== undefined && Math.floor(idx / COLS) === opts.restRow))
        itemWakes(idx, a, [[-1, -1], [-1, 1], [1, -1], [1, 1]]);
    }
    if (a.family === 'arc_welder' && RB) {
      // roster B SPREAD: jumps to the nearest other unfired shooter anywhere (Manhattan, then higher rank, then row-major),
      // never another Arc Welder; L3 two shooters, L6 the shooters it jumps to hit x spreadHit, L9 three shooters
      const [r0, c0] = rc(idx);
      const L = lvl('arc_welder');
      // only when the board holds no other shooter kind at all (a Welder squad) does it jump to the nearest other machine
      const anyMachine = !grid.some((g) => g && isShooter(g.family) && g.family !== 'arc_welder');
      for (let t = 0; t < (L >= 9 ? 3 : L >= 3 ? 2 : 1); t++) {
        let best = -1, bd = 99, bs = false;
        grid.forEach((g, n) => {
          if (!g || visited.has(n) || g.family === 'arc_welder' || blockSet.has(n) || crosses(idx, n)) return;
          if (!anyMachine && !isShooter(g.family)) return;
          const d = Math.abs(Math.floor(n / COLS) - r0) + Math.abs((n % COLS) - c0), sh = isShooter(g.family);
          if (best < 0 || (sh && !bs) || (sh === bs && (d < bd || (d === bd && g.rank > grid[best]!.rank)))) [best, bd, bs] = [n, d, sh];
        });
        if (best < 0) break;
        edges.push({ from: idx, to: best, kind: 'arc' });
        enqueue(idx, best, a.depth + 1);
        if (L >= 6) spread.add(best);
      }
    } else if (a.family === 'arc_welder') {
      // r32 Arc Welder: arcs to the strongest unfired machine touching it (8 neighbours), highest rank then row-major
      const [r0, c0] = rc(idx);
      // L9 Twin Arc: rank 7-8 arcs to 2; L6 Forked Arc: every 5th fire +1 target
      const targets = (hasPerk('arc_welder', 9, 7, a) ? 2 : 1) + (nthEvery('arc_welder', 6, 5, a) ? 1 : 0);
      for (let t = 0; t < targets; t++) {
        let best = -1;
        for (let dr = -1; dr <= 1; dr++)
          for (let dc = -1; dc <= 1; dc++) {
            if (!dr && !dc) continue;
            if (!inside(r0 + dr, c0 + dc)) continue;
            const n = at(r0 + dr, c0 + dc);
            const g = grid[n];
            if (!g || visited.has(n) || blockSet.has(n) || lockedSet.has(n) || (unitsB0On() && g.family === 'arc_welder')) continue;
            if (opts.splitB !== undefined && c0 <= opts.splitB !== (n % COLS) <= opts.splitB) continue;
            if (best < 0 || g.rank > grid[best]!.rank || (g.rank === grid[best]!.rank && n < best)) best = n;
          }
        if (best < 0) break;
        edges.push({ from: idx, to: best, kind: 'arc' });
        enqueue(idx, best, a.depth + 1);
      }
    }
    if (isShooter(a.family)) {
      if (primedNow.has(a.id)) {
        primedNow.delete(a.id);
        bonus.add(a.id);
        discharged.push(a.id);
      }
      if (RB) {
        // Rocket L6 Cluster: the Rocket YOU merged also wakes its 4 diagonal neighbours. Mortar L9 Barrage: after its
        // shot it wakes the unfired machines touching it (U/R/D/L)
        const around = a.family === 'rocket' && lvl('rocket') >= 6 && idx === rootIdx && !opts.wake ? [[-1, -1], [-1, 1], [1, -1], [1, 1]] : a.family === 'mortar' && lvl('mortar') >= 9 ? DIRS : [];
        const [r0, c0] = rc(idx);
        for (const [dr, dc] of around) {
          if (!inside(r0 + dr, c0 + dc)) continue;
          const n = at(r0 + dr, c0 + dc);
          if (!grid[n] || visited.has(n) || blockSet.has(n) || crosses(idx, n)) continue;
          edges.push({ from: idx, to: n, kind: 'spark' });
          enqueue(idx, n, a.depth + 1);
        }
        continue;
      }
      // MAX Backfire (ChatGPT r9): after its payload a rank-6 cannon wakes one adjacent Coil or Bell (U/R/D/L)
      if (a.family === 'cannon' && a.rank >= MAX_RANK && !TUNING.clarity) {
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
    if (a.family === 'fan' && TUNING.unitsB1) {
      // units B1 CONTROL: clear one touching (8 neighbours) junk / clamp / frost / lock cell; nothing to clear = push as today
      const [r0, c0] = rc(idx);
      let hit = -1;
      for (let dr = -1; dr <= 1 && hit < 0; dr++)
        for (let dc = -1; dc <= 1 && hit < 0; dc++) {
          const n = at(r0 + dr, c0 + dc);
          if ((dr || dc) && inside(r0 + dr, c0 + dc) && opts.hazards?.has(n) && !clears.includes(n)) hit = n;
        }
      passOn(idx, a);
      if (hit >= 0) {
        clears.push(hit);
        edges.push({ from: idx, to: hit, kind: 'fan' });
        continue;
      }
      if (!TUNING.b1.fanPush) continue;
    }
    if (a.family === 'fan') {
      // L3 Strong Gust (rank 4+ pushes 2 cells), L6 Double Gust (every 4th), L9 Launch (rank 6 = helper max: wakes what it pushed)
      const pushes = nthEvery('fan', 6, 4, a) ? 2 : 1;
      const busy = new Set(visited.keys());
      for (let k = 0; k < pushes; k++) {
        const p = fanPush(grid, idx, busy, blockSet, hasPerk('fan', 3, 4, a) || (a.rank >= MAX_RANK && !TUNING.clarity));
        if (!p) break;
        moves.push({ ...p, id: grid[p.from]!.id });
        edges.push({ from: p.from, to: p.to, kind: 'fan' });
        grid[p.to] = grid[p.from];
        grid[p.from] = null;
        busy.add(p.to);
        if (hasPerk('fan', 9, MAX_RANK, a) && !fired.has(grid[p.to]!.id) && !visited.has(p.to)) enqueue(idx, p.to, a.depth + 1);
      }
      continue;
    }
    if (a.family === 'battery' && TUNING.unitsB1) {
      // units B1 SETUP: BOOSTED x2 on a touching shooter (L6 every 5th / L9: two shooters)
      for (let k = 0; k < (lvl('battery') >= 9 || nthEvery('battery', 6, 5, a) ? 2 : 1); k++) if (boostShooter(idx, 1, b1BoostMult('battery', lvl('battery'))) < 0) break;
      passOn(idx, a);
      continue;
    }
    if (a.family === 'amplifier' && TUNING.unitsB1) {
      // units B1 SETUP: BOOSTED x1.6 on a shooter within 2 cells (L6 every 5th: two shooters, L9 rank 6: within 3)
      const reach = hasPerk('amplifier', 9, MAX_RANK, a) ? 3 : 2;
      for (let k = 0; k < (nthEvery('amplifier', 6, 5, a) ? 2 : 1); k++) if (boostShooter(idx, reach, b1BoostMult('amplifier', lvl('amplifier'))) < 0) break;
      passOn(idx, a);
      continue;
    }
    if (a.family === 'signal_beacon' && TUNING.unitsB1) {
      // units B1 SETUP: BOOSTED x1.3 on the strongest shooter anywhere (L6 every 6th +0.25; L9 rank 6 wakes it)
      const mult = b1BoostMult('signal_beacon', lvl('signal_beacon')) + (nthEvery('signal_beacon', 6, 6, a) ? 0.25 : 0);
      const to = boostShooter(idx, Infinity, mult);
      if (to >= 0 && hasPerk('signal_beacon', 9, MAX_RANK, a) && !visited.has(to)) enqueue(idx, to, a.depth + 1);
      passOn(idx, a);
      continue;
    }
    if (a.family === 'magnet' && TUNING.unitsB1) {
      // units B1 ECONOMY: fetch one matching part that lands next to a lonely twin (caller queues it; one per cascade)
      fetch = 1;
      passOn(idx, a);
      continue;
    }
    if (a.family === 'battery') {
      // MAX Split Charge (ChatGPT r9) / L6 Twin Charge / L9 Universal Socket: run the primer selection twice (the first target is then ineligible)
      for (let k = 0; k < (lvl('battery') >= 9 || nthEvery('battery', 6, 5, a) || (a.rank >= MAX_RANK && !TUNING.clarity) ? 2 : 1); k++) {
        const id = batteryPrime(grid, idx, primedNow, fired, blockSet);
        if (id === null) break;
        primes.push(id);
        primedNow.add(id);
        const to = grid.findIndex((g) => g?.id === id);
        edges.push({ from: idx, to, kind: 'battery' });
      }
      continue;
    }
    if (a.family === 'amplifier') {
      // r32 Amplifier: marks the strongest shooter/relay orthogonally touching it (unfired), row-major tie
      // L3 Wide Pickup (rank 4+: 8 neighbours), L6 Dual Channel (every 5th: 2 targets), L9 Long Range (rank 6 = helper max: Chebyshev 2)
      const [r0, c0] = rc(idx);
      const reach = hasPerk('amplifier', 9, MAX_RANK, a) ? 2 : 1;
      const diag = hasPerk('amplifier', 3, 4, a) || reach > 1;
      const cand: number[] = [];
      for (let dr = -reach; dr <= reach; dr++)
        for (let dc = -reach; dc <= reach; dc++) {
          if ((!dr && !dc) || !inside(r0 + dr, c0 + dc) || (!diag && dr && dc)) continue;
          const n = at(r0 + dr, c0 + dc);
          const g = grid[n];
          if (g && !fired.has(g.id) && (isShooter(g.family) || isRelay(g.family))) cand.push(n); // queued-but-unfired counts
        }
      cand.sort((x, y) => grid[y]!.rank - grid[x]!.rank || x - y);
      for (const n of cand.slice(0, nthEvery('amplifier', 6, 5, a) ? 2 : 1)) mark(n, 1.3 + 0.03 * (lvl('amplifier') - 1), idx);
      continue;
    }
    if (a.family === 'signal_beacon') {
      // r32 Signal Beacon: nearest unfired shooter AND nearest unfired relay anywhere (Manhattan, rank, row-major)
      // L3 Third Signal (rank 4+: also the nearest helper), L6 Broadcast Boost (every 6th: +0.25), L9 GO! (rank 6 = helper max: wakes them)
      const [r0, c0] = rc(idx);
      const isHelper = (f: Family) => !isShooter(f) && !isRelay(f);
      const kinds = hasPerk('signal_beacon', 3, 4, a) ? [isShooter, isRelay, isHelper] : [isShooter, isRelay];
      const mult = 1.15 + 0.02 * (lvl('signal_beacon') - 1) + (nthEvery('signal_beacon', 6, 6, a) ? 0.25 : 0);
      for (const want of kinds) {
        let best = -1, bd = 99;
        grid.forEach((g, n) => {
          if (!g || n === idx || fired.has(g.id) || !want(g.family)) return;
          const d = Math.abs(Math.floor(n / COLS) - r0) + Math.abs((n % COLS) - c0);
          if (d < bd || (d === bd && g.rank > grid[best]!.rank)) [best, bd] = [n, d];
        });
        if (best < 0) continue;
        mark(best, mult, idx);
        if (hasPerk('signal_beacon', 9, MAX_RANK, a) && !visited.has(best)) enqueue(idx, best, a.depth + 1);
      }
      continue;
    }
    if (a.family === 'magnet') {
      // MAX Twin Pull (ChatGPT r9): a second pull on the updated board, other direction, never the first moved piece
      let skip = -1;
      const busy = new Set(visited.keys());
      // L3 Strong Magnet (search +1 cell), L6 Double Pull (every 4th), L9 Snap In (rank 6 = helper max: wakes what it pulled)
      for (let k = 0; k < (nthEvery('magnet', 6, 4, a) || (a.rank >= MAX_RANK && !TUNING.clarity) ? 2 : 1); k++) {
        const p = magnetPull(grid, idx, busy, blockSet, skip, lvl('magnet') >= 3 ? 4 : 3);
        if (!p) break;
        moves.push({ from: p.from, to: p.to, id: grid[p.from]!.id });
        edges.push({ from: p.from, to: p.to, kind: 'magnet' });
        grid[p.to] = grid[p.from];
        grid[p.from] = null;
        skip = p.dir;
        busy.add(p.to);
        if (hasPerk('magnet', 9, MAX_RANK, a) && !fired.has(grid[p.to]!.id) && !visited.has(p.to)) enqueue(idx, p.to, a.depth + 1);
      }
      continue;
    }
    const kind = a.family;
    const coilMult = TUNING.clarity ? 1 : 1 + TUNING.coilChargePerRank * a.rank;
    const [ar, ac] = rc(idx);
    if (opts.restRow !== undefined && ar === opts.restRow) continue; // resting row: deals damage, wakes nobody
    const route = RB && isRelay(a.family) ? rbRouteCells(idx, a.family, lvl(a.family), nthOf.get(a.id) ?? 0, opts.perks) : [...new Set([...routeCells(idx, a.family, a.rank, opts.perks), ...relayPerkCells(idx, a, lvl(a.family), nthOf.get(a.id) ?? 0)])];
    for (const to of route) {
      if (!grid[to] || to === idx || lockedSet.has(to)) continue;
      if (opts.splitB !== undefined && ac <= opts.splitB !== to % COLS <= opts.splitB) continue; // Junkzilla's divider
      if (!TUNING.sameFamilyRelay && grid[to]!.family === a.family) continue;
      edges.push({ from: idx, to, kind });
      if (kind === 'coil') charge.set(to, Math.max(charge.get(to) ?? 1, coilMult));
      // roster B Horn L3 KICK: the shooters it wakes hit harder
      if (RB && kind === 'horn' && lvl('horn') >= 3 && !visited.has(to) && isShooter(grid[to]!.family)) kicked.add(to);
      enqueue(idx, to, a.depth + 1);
    }
    if (a.rank >= MAX_RANK && !TUNING.clarity) maxSignature(idx, a);
  }

  const acts = [...visited.values()];
  let sum = 0;
  for (const a of acts) {
    a.charge = charge.get(a.idx) ?? 1;
    const perk = isShooter(a.family) && opts.perks.includes('twin') ? 1.4 : 1;
    // Battery prime grows with level (+0.03) and L3 High Voltage (+0.20)
    const prime = bonus.has(a.id) ? TUNING.batteryBonus + 0.03 * (lvl('battery') - 1) + (lvl('battery') >= 3 ? 0.2 : 0) : 1;
    const hot = isShooter(a.family) && opts.hotCol !== undefined && a.idx % COLS === opts.hotCol ? 0.5 : 1;
    const oc = overcharged.has(a.id) ? 2 : 1;
    // r32 Mortar: deeper in the chain = harder hit (x0.9 at depth 1 ... x1.65 cap); Arc Welder hits x0.75
    // units B0: Mortar scales with chain ORDER (machines fired before it) instead of depth
    const deep = a.family === 'mortar' ? (unitsB0On() ? mortarOrderMult(a, lvl('mortar'), nthOf.get(a.id) ?? 0, orderOf.get(a.id) ?? 0) : mortarMult(a, lvl('mortar'), nthOf.get(a.id) ?? 0)) : a.family === 'arc_welder' ? (hasPerk('arc_welder', 3, 4, a) ? 0.9 : 0.75) : 1;
    // shooter milestones: Cannon L3 Heavy Barrel / L6 Lucky Eight; Rocket L3 Warhead / L6 Sixth Salvo / L9 Deep Burn
    const ms =
      a.family === 'cannon' ? (hasPerk('cannon', 3, 4, a) ? 1.2 : 1) * (nthEvery('cannon', 6, 8, a) ? 2 : 1)
      : a.family === 'rocket' ? (hasPerk('rocket', 3, 4, a) ? 1.15 : 1) * (nthEvery('rocket', 6, 6, a) ? 1.5 : 1) * (hasPerk('rocket', 9, 7, a) && a.depth >= 4 ? 1.35 : 1)
      : 1;
    const amp = ampOn.get(a.id) ?? 1;
    if (RB) {
      // roster B: job multipliers (named in a.jobs) replace the depth bonus and the L3/L6/L9 '+%' milestones
      const jobs: NonNullable<Activation['jobs']> = {};
      let own = a.family === 'arc_welder' ? 0.75 : 1;
      if (a.family === 'mortar') jobs.mortar = rbMortarMult(orderOf.get(a.id) ?? 0, lvl('mortar'));
      if (a.family === 'rocket') {
        if (a.idx === rootIdx && !opts.wake) jobs.burst = lvl('rocket') >= 3 ? TUNING.rb.rocketRootL3 : TUNING.rb.rocketRoot;
        else own = lvl('rocket') >= 9 ? TUNING.rb.rocketWokenL9 : TUNING.rb.rocketWoken;
      }
      if (kicked.has(a.idx)) jobs.kick = TUNING.rb.hornKick;
      if (spread.has(a.idx)) jobs.spread = TUNING.rb.spreadHit;
      if (opts.goKick && a.depth === 0 && isShooter(a.family)) jobs.go = opts.goKick;
      if (opts.primeAll && rawDamage(a.family, a.rank) > 0) jobs.prime = opts.primeAll;
      const job = Object.values(jobs).reduce((m, x) => m * x, 1);
      if (Object.keys(jobs).length) a.jobs = jobs;
      a.contribution = rawDamage(a.family, a.rank) * a.charge * perk * prime * hot * oc * own * job * amp * (opts.unitMult?.[a.family] ?? 1);
      sum += a.contribution;
      continue;
    }
    a.contribution = rawDamage(a.family, a.rank) * a.charge * perk * prime * hot * oc * deep * amp * ms * (opts.unitMult?.[a.family] ?? 1);
    sum += a.contribution;
  }
  const encore = opts.perks.includes('encore');
  const slope = TUNING.comboSlope + (encore ? 0.04 : 0);
  const cap = TUNING.comboCap + (encore ? 0.5 : 0);
  const comboMult = Math.min(cap, 1 + slope * (acts.length - 1));
  const total = sum * comboMult * (opts.overdrive ? TUNING.overdriveFactor : 1);
  return { rootIdx, activations: acts, edges, moves, primes, discharged, itemUsed, amps, ampsUsed, fires, count: acts.length, comboMult, total, ...(clears.length ? { clears } : {}), ...(fetch ? { fetch } : {}) };
}
