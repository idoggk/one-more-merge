// Screw Yard 2.0 (t-11ac42f6) EXACT SOLVER + difficulty score. Pure and deterministic, like src/core/puzzle.ts.
// DFS with memo over (removed-screw bitmask, open boxes, box index, dock multiset); plate poses follow from the mask
// (a plate hangs swung exactly when one of its screws is left), so every plate's covered area is precomputed per pose
// and "which screws are free" is a few word ORs per state. Searches stop at the first win (taps that fit come first),
// so a yard is proved in milliseconds and only dead regions are explored in full; the minimum dock peak is the smallest
// dock size that still solves it. Mirrors tapScrew / tapDock in screw.ts (tests check they agree).
import { Rng } from './rng';
import { covers, fitSlot, newYard, previewColors, removable, swingPose, tapDock, tapScrew, YARD_RULES_2, type YardLevel, type YardRules } from './screw';

export interface CompiledYard {
  lvl: YardLevel;
  rules: YardRules;
  n: number;
  /** 32-bit words per screw mask. */
  W: number;
  color: number[];
  /** Per plate: its screws as a mask. */
  plateMask: Uint32Array[];
  /** Per plate: lower-plate screws it covers as laid. */
  coverLaid: Uint32Array[];
  /** Per plate, per own screw id: lower-plate screws it covers when hanging from that screw (swing rules only). */
  coverSwing: Map<number, Uint32Array>[];
}

const has = (m: Uint32Array, i: number) => (m[i >>> 5] >>> (i & 31)) & 1;

export function compileYard(lvl: YardLevel, rules: YardRules = lvl.rules ?? YARD_RULES_2): CompiledYard {
  const n = lvl.screws.length, W = Math.ceil(n / 32);
  const mask = (pred: (sid: number) => boolean) => {
    const m = new Uint32Array(W);
    for (let i = 0; i < n; i++) if (pred(i)) m[i >>> 5] |= 1 << (i & 31);
    return m;
  };
  const below = (pid: number, sid: number) => lvl.plates[lvl.screws[sid].plate].z < lvl.plates[pid].z;
  return {
    lvl, rules, n, W,
    color: lvl.screws.map((s) => s.color),
    plateMask: lvl.plates.map((p) => mask((s) => p.screws.includes(s))),
    coverLaid: lvl.plates.map((p) => mask((s) => below(p.id, s) && covers(p, lvl.screws[s].x, lvl.screws[s].y))),
    coverSwing: lvl.plates.map((p) => {
      const m = new Map<number, Uint32Array>();
      if (rules.swing && p.screws.length > 1)
        for (const sid of p.screws) {
          const pose = { ...swingPose(p, lvl.screws[sid]), len: p.len, thick: p.thick };
          m.set(sid, mask((s) => below(p.id, s) && covers(pose, lvl.screws[s].x, lvl.screws[s].y)));
        }
      return m;
    }),
  };
}

/** Screws that can come out with removed-mask `rm` (same answer as removable() in screw.ts). */
export function freeScrews(c: CompiledYard, rm: Uint32Array): number[] {
  const cov = new Uint32Array(c.W);
  for (let p = 0; p < c.plateMask.length; p++) {
    const pm = c.plateMask[p];
    let left = 0, last = -1;
    for (let w = 0; w < c.W; w++) {
      let b = pm[w] & ~rm[w];
      while (b) {
        const low = b & -b;
        last = w * 32 + 31 - Math.clz32(low);
        left++;
        b ^= low;
      }
    }
    if (!left) continue;
    const m = left === 1 && c.coverSwing[p].size ? c.coverSwing[p].get(last)! : c.coverLaid[p];
    for (let w = 0; w < c.W; w++) cov[w] |= m[w];
  }
  const out: number[] = [];
  for (let i = 0; i < c.n; i++) if (!has(rm, i) && !has(cov, i)) out.push(i);
  return out;
}

interface S {
  rm: Uint32Array;
  /** Open box colour per slot (-1 = none) and fill. */
  bc: number[];
  bn: number[];
  qi: number;
  dock: number[];
  out: number;
}
/** A move: tap board screw `sid`, or (sid = -1) tap a dock screw of colour `color`. */
export interface YardMove {
  sid: number;
  color: number;
}
const clone = (s: S): S => ({ rm: s.rm.slice(), bc: s.bc.slice(), bn: s.bn.slice(), qi: s.qi, dock: s.dock.slice(), out: s.out });
const keyOf = (s: S) => `${s.rm.join(',')}|${s.bc.join(',')}|${s.bn.join(',')}|${s.qi}|${s.dock.slice().sort((a, b) => a - b).join(',')}`;

function fit(c: CompiledYard, s: S, color: number) {
  for (let k = 0; k < s.bc.length; k++) if (s.bc[k] === color && s.bn[k] < c.rules.boxSize) return k;
  return -1;
}
function settle(c: CompiledYard, s: S) {
  const q = c.lvl.queue;
  for (let guard = 0; guard < 64; guard++) {
    const full = s.bn.findIndex((v, k) => s.bc[k] >= 0 && v >= c.rules.boxSize);
    if (full >= 0) {
      s.bc[full] = s.qi < q.length ? q[s.qi++] : -1;
      s.bn[full] = 0;
      continue;
    }
    if (!c.rules.autoPull) return;
    let pulled = false;
    for (let k = 0; k < s.bc.length; k++) {
      if (s.bc[k] < 0) continue;
      const ti = s.dock.indexOf(s.bc[k]);
      if (ti >= 0 && s.bn[k] < c.rules.boxSize) {
        s.dock.splice(ti, 1);
        s.bn[k]++;
        pulled = true;
        break;
      }
    }
    if (!pulled) return;
  }
}
/** Apply a move to a copy; null when a screw found no dock slot (lost). `dock` overrides the rules' dock size. */
function apply(c: CompiledYard, s0: S, mv: YardMove, dock = c.rules.dock): S | null {
  const s = clone(s0);
  if (mv.sid >= 0) {
    s.rm[mv.sid >>> 5] |= 1 << (mv.sid & 31);
    s.out++;
    const k = fit(c, s, mv.color);
    if (k >= 0) s.bn[k]++;
    else s.dock.push(mv.color);
  } else {
    s.dock.splice(s.dock.indexOf(mv.color), 1);
    s.bn[fit(c, s, mv.color)]++;
  }
  settle(c, s);
  return s.dock.length > dock ? null : s;
}
/** Legal taps, most promising first (dock taps, taps that fit, then by how soon the colour's box comes), each with its
 *  weight for a uniform random tapper (dock screws of one colour are one move but n taps). */
function movesOf(c: CompiledYard, s: S): { mv: YardMove; w: number; fits: boolean }[] {
  const q = c.lvl.queue;
  const soon = (col: number) => {
    const k = q.indexOf(col, s.qi);
    return k < 0 ? 999 : k;
  };
  const board = freeScrews(c, s.rm).map((sid) => ({ mv: { sid, color: c.color[sid] }, w: 1, fits: fit(c, s, c.color[sid]) >= 0 }));
  board.sort((a, b) => +b.fits - +a.fits || soon(a.mv.color) - soon(b.mv.color) || a.mv.sid - b.mv.sid);
  if (c.rules.autoPull) return board;
  const out: { mv: YardMove; w: number; fits: boolean }[] = [];
  const seen = new Set<number>();
  for (const col of s.dock)
    if (!seen.has(col) && fit(c, s, col) >= 0) {
      seen.add(col);
      out.push({ mv: { sid: -1, color: col }, w: s.dock.filter((x) => x === col).length, fits: true });
    }
  return out.concat(board);
}
const isWon = (c: CompiledYard, s: S) => s.out === c.n && !s.dock.length;
function start(c: CompiledYard): S {
  const q = c.lvl.queue;
  const s: S = { rm: new Uint32Array(c.W), bc: [], bn: [], qi: 0, dock: [], out: 0 };
  for (let k = 0; k < c.rules.boxes; k++) {
    s.bc.push(s.qi < q.length ? q[s.qi++] : -1);
    s.bn.push(0);
  }
  return s;
}

export class YardTooBig extends Error {}
/** Solution counting stops here (the count is "at least" this many). */
export const SOLUTION_CAP = 10000;

/** Win search with a dead-state memo; stops at the first winning line (returned in `line`). */
class Prover {
  dead = new Set<string>();
  nodes = 0;
  constructor(private c: CompiledYard, private dock: number, private budget: { left: number }) {}
  /** Taps of a winning line from s, or null when s is dead. */
  win(s: S): YardMove[] | null {
    if (isWon(this.c, s)) return [];
    const key = keyOf(s);
    if (this.dead.has(key)) return null;
    if (--this.budget.left < 0) throw new YardTooBig('solver budget spent');
    this.nodes++;
    for (const { mv } of movesOf(this.c, s)) {
      const nx = apply(this.c, s, mv, this.dock);
      if (!nx) continue;
      const rest = this.win(nx);
      if (rest) return [mv, ...rest];
    }
    this.dead.add(key);
    return null;
  }
}

export interface YardSolve {
  solvable: boolean;
  /** Distinct winning tap sequences, capped at SOLUTION_CAP. */
  solutions: number;
  /** States the searches visited. */
  states: number;
  ms: number;
  firstMoves: number;
  /** First taps after which the yard can no longer be won. */
  deadFirst: number;
  /** Along the solver's line: taps that drop a screw straight into its box (or pull a dock screw) yet lose the yard. */
  tempting: number;
  /** Win rate of a player tapping any tappable screw at random (seeded Monte Carlo, `randomRuns` games). */
  randomWin: number;
  /** A visible-info greedy player (box fit first, then the soonest previewed colour). */
  greedyWins: boolean;
  greedyPeak: number;
  /** Fewest dock slots any winning line needs at once (Infinity when unsolvable). */
  minDockPeak: number;
  /** A winning line: board screw id, or -1 - colour for a dock tap. */
  line: number[];
}
export const RANDOM_RUNS = 400;

/** Solve a yard exactly. Throws YardTooBig past `maxNodes` expanded states. */
export function solveYard(lvl: YardLevel, rules: YardRules = lvl.rules ?? YARD_RULES_2, maxNodes = 2e6): YardSolve {
  const t0 = performance.now();
  const c = compileYard(lvl, rules);
  const budget = { left: maxNodes };
  const pr = new Prover(c, rules.dock, budget);
  const s0 = start(c);
  const sol = pr.win(s0);
  let states = pr.nodes;
  // dead openers, and tempting dead taps along the line
  const first = movesOf(c, s0).map(({ mv }) => {
    const nx = apply(c, s0, mv);
    return !!nx && !!pr.win(nx);
  });
  let tempting = 0;
  if (sol) {
    let s = s0;
    for (const mv of sol) {
      for (const m of movesOf(c, s)) {
        if (!m.fits || (m.mv.sid === mv.sid && m.mv.color === mv.color)) continue;
        const nx = apply(c, s, m.mv);
        if (!nx || !pr.win(nx)) tempting++;
      }
      s = apply(c, s, mv)!;
    }
  }
  // smallest dock that still solves it
  let minDockPeak = Infinity;
  if (sol)
    for (let k = 0; k <= rules.dock; k++) {
      const p = k === rules.dock ? pr : new Prover(c, k, budget);
      const ok = !!p.win(s0);
      if (p !== pr) states += p.nodes;
      if (ok) {
        minDockPeak = k;
        break;
      }
    }
  states = Math.max(states, pr.nodes);
  // capped solution count (shares the dead set)
  const counts = new Map<string, number>();
  const count = (s: S): number => {
    if (isWon(c, s)) return 1;
    const key = keyOf(s);
    if (pr.dead.has(key)) return 0;
    const hit = counts.get(key);
    if (hit !== undefined) return hit;
    if (--budget.left < 0) throw new YardTooBig('solver budget spent');
    let n = 0;
    for (const { mv } of movesOf(c, s)) {
      const nx = apply(c, s, mv);
      if (nx) n += count(nx);
      if (n >= SOLUTION_CAP) break;
    }
    n = Math.min(n, SOLUTION_CAP);
    counts.set(key, n);
    if (!n) pr.dead.add(key);
    return n;
  };
  const solutions = sol ? count(s0) : 0;
  states += counts.size;
  const g = playGreedy(lvl, rules);
  return {
    solvable: !!sol,
    solutions,
    states,
    ms: Math.round(performance.now() - t0),
    firstMoves: first.length,
    deadFirst: first.filter((ok) => !ok).length,
    tempting,
    randomWin: randomTapper(c, RANDOM_RUNS, lvl.seed),
    greedyWins: g.won,
    greedyPeak: g.peak,
    minDockPeak,
    line: (sol ?? []).map((m) => (m.sid >= 0 ? m.sid : -1 - m.color)),
  };
}

/** Win rate of a uniform random tapper (any free board screw, or a dock screw that fits). Seeded, so deterministic. */
export function randomTapper(c: CompiledYard, runs: number, seed: number): number {
  const rng = new Rng(seed ^ 0x5eed);
  let wins = 0;
  for (let r = 0; r < runs; r++) {
    let s: S | null = start(c);
    while (s && !isWon(c, s)) {
      const ms = movesOf(c, s);
      if (!ms.length) break;
      let pick = rng.int(ms.reduce((t, m) => t + m.w, 0));
      const m = ms.find((x) => (pick -= x.w) < 0)!;
      s = apply(c, s, m.mv);
    }
    if (s && isWon(c, s)) wins++;
  }
  return wins / runs;
}

/** A sensible player who sees only the open boxes and the preview: a dock screw that fits, then a board screw that
 *  fits, then the free screw whose colour is previewed soonest (lowest id breaks ties). */
export function playGreedy(lvl: YardLevel, rules: YardRules = lvl.rules ?? YARD_RULES_2) {
  const st = newYard(lvl, rules);
  let peak = 0;
  for (let step = 0; step < 999 && !st.won && !st.lost; step++) {
    const ti = rules.autoPull ? -1 : st.tray.findIndex((col) => fitSlot(st, col) >= 0);
    if (ti >= 0) {
      tapDock(st, ti);
      continue;
    }
    const free = lvl.screws.filter((s) => removable(st, s.id));
    if (!free.length) break;
    const pv = previewColors(st);
    const soon = (col: number) => (fitSlot(st, col) >= 0 ? -1 : pv.includes(col) ? pv.indexOf(col) : 99);
    const pick = free.slice().sort((a, b) => soon(a.color) - soon(b.color) || a.id - b.id)[0];
    tapScrew(st, pick.id);
    peak = Math.max(peak, st.tray.length);
  }
  return { won: st.won, peak, moves: st.moves };
}

/** 0 (a random tapper wins) .. 100 (hard), in the spirit of puzzleStats: rarity of a random win 40, dead openers 12,
 *  tempting traps 10, greedy fails 12, dock tightness 10, size 16. */
export function yardScore(r: YardSolve, screws: number, rules: YardRules = YARD_RULES_2): number {
  if (!r.solvable) return 100;
  const bits = Math.min(10, -Math.log2(Math.max(r.randomWin, 1 / (2 * RANDOM_RUNS))));
  const tight = Math.min(1, r.minDockPeak / rules.dock);
  const size = Math.max(0, Math.min(1, (screws - 12) / 42));
  const s = 4 * bits + 12 * (r.firstMoves ? r.deadFirst / r.firstMoves : 1) + 2 * Math.min(r.tempting, 5) + 12 * +!r.greedyWins + 10 * tight + 16 * size;
  return Math.max(0, Math.min(100, Math.round(s)));
}

export function yardDifficulty(lvl: YardLevel, rules: YardRules = lvl.rules ?? YARD_RULES_2) {
  const r = solveYard(lvl, rules);
  return { ...r, score: yardScore(r, lvl.screws.length, rules) };
}
