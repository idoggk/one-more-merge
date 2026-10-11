// t-4c676288 LAST MERGES planner + bots, shared by tools/make-budget-levels.ts (sets HP and star lines) and tools/budget-sim.ts (the check).
// The planner is exact: the board is fully known and only merges act, so the best damage in k merges is a memoised search over boards
// (a board's merge outcome depends only on the board). Every number comes from the real engine (drop), never a model of it.
import { newPuzzle, type GameState, type PuzzleDef } from '../src/core/game';
import { Rng } from '../src/core/rng';
import { playMove, puzzleMoves, type Move } from '../src/core/puzzle';


export const BIG = 1e9;

/** A board with the HP lifted, so nothing ends early and `BIG - hp` is the cumulative damage. */
export const liftedState = (def: PuzzleDef): GameState => newPuzzle({ ...def, hp: BIG });
const gridKey = (s: GameState) => s.grid.map((g) => (g ? `${g.family}:${g.rank}` : '.')).join(',');

export class Planner {
  private memo = new Map<string, { dmg: number; move: Move | null }>();
  states = 0;
  /** Best extra damage from `s` with `left` merges, and the first merge of that line. */
  best(s: GameState, left: number): { dmg: number; move: Move | null } {
    if (left <= 0) return { dmg: 0, move: null };
    const key = `${left}|${gridKey(s)}`;
    const hit = this.memo.get(key);
    if (hit) return hit;
    let out = { dmg: 0, move: null as Move | null };
    for (const m of puzzleMoves(s)) {
      const t = playMove(s, m);
      const gain = s.hp - t.hp;
      const r = gain + this.best(t, left - 1).dmg;
      if (r > out.dmg + 1e-9) out = { dmg: r, move: m };
    }
    this.states++;
    this.memo.set(key, out);
    return out;
  }
  /** The best line of `k` merges from the start board: its damage after each merge and its moves. */
  line(def: PuzzleDef, k: number): { moves: Move[]; dmg: number[] } {
    let s = liftedState(def);
    const moves: Move[] = [], dmg: number[] = [];
    for (let left = k; left > 0; left--) {
      const m = this.best(s, left).move;
      if (!m) break;
      s = playMove(s, m);
      moves.push(m);
      dmg.push(BIG - s.hp);
    }
    return { moves, dmg };
  }
}

/** Cheap screen for choosing between candidate boards (a lower bound on the planner's D*(k) for k = 1..budget): a beam of `width`
 *  boards per depth, half the best by damage so far, half random survivors (so a trap line that starts weak can still be found). */
export function beamBest(def: PuzzleDef, width = 160, seed = 1): number[] {
  const rng = new Rng(seed);
  let layer: { s: GameState; d: number }[] = [{ s: liftedState(def), d: 0 }];
  const out: number[] = [];
  for (let k = 0; k < def.moves; k++) {
    const next = new Map<string, { s: GameState; d: number }>();
    for (const { s } of layer)
      for (const m of puzzleMoves(s)) {
        const t = playMove(s, m);
        const key = gridKey(t);
        const dd = BIG - t.hp;
        if (!next.has(key) || next.get(key)!.d < dd) next.set(key, { s: t, d: dd });
      }
    const all = [...next.values()].sort((a, b) => b.d - a.d);
    out.push(all[0]?.d ?? out.at(-1) ?? 0);
    const keep = all.slice(0, width / 2);
    const rest = all.slice(width / 2);
    for (let i = 0; i < width / 2 && rest.length; i++) keep.push(rest.splice(rng.int(rest.length), 1)[0]);
    layer = keep;
    if (!layer.length) break;
  }
  while (out.length < def.moves) out.push(out.at(-1) ?? 0);
  return out;
}

/** Damage a policy deals in `budget` merges on a lifted board (the policy picks one of the legal merges each time). */
export function playout(def: PuzzleDef, pick: (s: GameState, moves: Move[], left: number) => Move | null): { moves: Move[]; dmg: number[] } {
  let s = liftedState(def);
  const moves: Move[] = [], dmg: number[] = [];
  for (let left = def.moves; left > 0; left--) {
    const legal = puzzleMoves(s);
    if (!legal.length) break;
    const m = pick(s, legal, left);
    if (!m) break;
    s = playMove(s, m);
    moves.push(m);
    dmg.push(BIG - s.hp);
  }
  return { moves, dmg };
}

const hitOf = (s: GameState, m: Move) => s.hp - playMove(s, m).hp;
const randomOf = <T>(rng: Rng, a: T[]) => a[rng.int(a.length)];
/** Best of `moves` by `score`, ties broken at random. */
const argmax = (rng: Rng, moves: Move[], score: (m: Move) => number): Move => {
  let best = -Infinity;
  let top: Move[] = [];
  for (const m of moves) {
    const v = score(m);
    if (v > best + 1e-9) [best, top] = [v, [m]];
    else if (v > best - 1e-9) top.push(m);
  }
  return randomOf(rng, top);
};

export type Bot = { name: string; pick: (rng: Rng) => (s: GameState, moves: Move[], left: number) => Move | null };

export const BOTS: Bot[] = [
  // any legal merge, uniformly: someone tapping pairs without looking
  { name: 'random', pick: (rng) => (_s, moves) => randomOf(rng, moves) },
  // a 1-second spammer: the first pair it finds scanning the board (no clock here, so speed gives it nothing; it also never reads the board)
  { name: 'spammer 1s', pick: (rng) => (_s, moves) => (rng.next() < 0.8 ? moves[0] : randomOf(rng, moves)) },
  // greedy: the merge that hits hardest right now
  { name: 'greedy', pick: (rng) => (s, moves) => argmax(rng, moves, (m) => hitOf(s, m)) },
  // planner: 2-ply (this merge + the best next one), slips to a random merge 10% of the time like a human
  {
    name: 'planner 2-ply',
    pick: (rng) => (s, moves, left) => {
      if (rng.next() < 0.1) return randomOf(rng, moves);
      return argmax(rng, moves, (m) => {
        const t = playMove(s, m);
        const next = left > 1 ? puzzleMoves(t) : [];
        return s.hp - t.hp + next.reduce((b, n) => Math.max(b, hitOf(t, n)), 0);
      });
    },
  },
];

/** Did a line of cumulative damages reach `hp` within the merges played; with how many spare. */
export function outcome(dmg: number[], hp: number, budget: number): { won: boolean; spare: number } {
  const k = dmg.findIndex((d) => d >= hp - 1e-9);
  return k < 0 ? { won: false, spare: 0 } : { won: true, spare: budget - (k + 1) };
}
