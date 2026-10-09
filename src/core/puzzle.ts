// r44 Workshop Puzzle solver + difficulty + graduated help (owner stuck on the first "win in N merges" puzzle).
// Pure and deterministic: used by tools/gen-puzzles.ts to build the ramp, by tests, and at runtime for "show next move".
import { canMerge, drop, newPuzzle, type GameState, type PuzzleDef } from './game';

export type Move = [number, number];
const BIG = 1e9;

/** Legal puzzle merges (respects the `only` rule). */
export function puzzleMoves(s: GameState): Move[] {
  const out: Move[] = [];
  const only = s.puzzle?.only;
  for (let i = 0; i < s.grid.length; i++)
    for (let j = 0; j < s.grid.length; j++) {
      if (i === j) continue;
      const a = s.grid[i], b = s.grid[j];
      if (a && b && canMerge(a, b, s) && (!only || only.includes(a.family))) out.push([i, j]);
    }
  return out;
}

export function playMove(s: GameState, m: Move): GameState {
  const t = structuredClone(s);
  drop(t, m[0], m[1], t.grid[m[0]]!.id);
  return t;
}

/** One complete merge sequence: the moves and the cumulative damage after each. */
export interface Line {
  path: Move[];
  dmg: number[];
}

/** Every merge sequence of the puzzle's length (or until no legal merge), with the HP lifted so nothing ends early. */
export function allLines(def: PuzzleDef): Line[] {
  const out: Line[] = [];
  const walk = (s: GameState, path: Move[], dmg: number[]) => {
    const ms = path.length < def.moves ? puzzleMoves(s) : [];
    if (!ms.length) return void out.push({ path, dmg });
    for (const m of ms) {
      const t = playMove(s, m);
      walk(t, [...path, m], [...dmg, BIG - t.hp]);
    }
  };
  walk(newPuzzle({ ...def, hp: BIG }), [], []);
  return out;
}

export interface PuzzleStats {
  moves: number;
  lines: number;
  /** Winning lines. */
  solutions: number;
  /** Distinct legal first merges, and how many of them can no longer win. */
  firstMoves: number;
  deadFirst: number;
  /** Dead first merges that hit at least as hard as the best winning first merge (they look right and aren't). */
  tempting: number;
  /** Taking the biggest hit every merge loses. */
  greedyFails: boolean;
  /** No winning line survives every reordering of its merges. */
  orderMatters: boolean;
  /** 0 (every merge wins) .. 100 (hard). */
  score: number;
}

const key = (p: Move[]) => p.map((m) => m.join('>')).join(',');
const final = (l: Line) => (l.dmg.length ? l.dmg[l.dmg.length - 1] : 0);

function permutations<T>(a: T[]): T[][] {
  if (a.length <= 1) return [a];
  return a.flatMap((x, i) => permutations([...a.slice(0, i), ...a.slice(i + 1)]).map((r) => [x, ...r]));
}

/** Difficulty of a board for a given HP, from its full line list. */
export function puzzleStats(lines: Line[], hp: number, moves: number): PuzzleStats {
  const wins = lines.filter((l) => final(l) >= hp);
  const firsts = new Map<string, { hit: number; win: boolean }>();
  for (const l of lines) {
    if (!l.path.length) continue;
    const k = l.path[0].join('>');
    const f = firsts.get(k) ?? { hit: l.dmg[0], win: false };
    f.win ||= final(l) >= hp;
    firsts.set(k, f);
  }
  const fs = [...firsts.values()];
  const bestWinHit = Math.max(0, ...fs.filter((f) => f.win).map((f) => f.hit));
  const tempting = fs.filter((f) => !f.win && f.hit >= bestWinHit).length;
  // greedy: from each prefix take the child with the biggest cumulative damage (first found on ties)
  let prefix: Move[] = [];
  let greedyDmg = 0;
  for (let d = 0; d < moves; d++) {
    let best: Move | null = null, bd = -1;
    for (const l of lines) {
      if (l.path.length <= d || key(l.path.slice(0, d)) !== key(prefix)) continue;
      if (l.dmg[d] > bd) [bd, best] = [l.dmg[d], l.path[d]];
    }
    if (!best) break;
    prefix = [...prefix, best];
    greedyDmg = bd;
  }
  const winKeys = new Set(wins.map((l) => key(l.path)));
  const orderFree = wins.some((l) => permutations(l.path).every((p) => winKeys.has(key(p))));
  const orderMatters = moves > 1 && !orderFree;
  const greedyFails = greedyDmg < hp;
  const deadFirst = fs.filter((f) => !f.win).length;
  // depth 20 + rarity of a win 40 (log2 of lines per solution, capped) + dead openers 12 + traps 10 + greedy fails 10 + order 8
  const bits = wins.length ? Math.min(10, Math.log2(lines.length / wins.length)) : 10;
  const score = Math.round(10 * (moves - 1) + 4 * bits + 12 * (fs.length ? deadFirst / fs.length : 1) + 2 * Math.min(tempting, 5) + 10 * +greedyFails + 8 * +orderMatters);
  return { moves, lines: lines.length, solutions: wins.length, firstMoves: fs.length, deadFirst, tempting, greedyFails, orderMatters, score };
}

export function puzzleDifficulty(def: PuzzleDef): PuzzleStats {
  return puzzleStats(allLines(def), def.hp, def.moves);
}

/** A next merge that still wins from here (the real HP, the merges left), or null when this attempt can't win any more. */
export function nextWinningMove(s: GameState, def?: PuzzleDef, played: Move[] = []): Move | null {
  if (!s.puzzle || s.phase !== 'playing') return null;
  // still on the stored line: no search needed (big boards are slow to search on a phone)
  if (def && played.length < def.solution.length && played.every((m, i) => key([m]) === key([def.solution[i]]))) return def.solution[played.length];
  const wins = (t: GameState, left: number): boolean => {
    if (t.phase === 'won') return true;
    if (left <= 0 || t.phase !== 'playing') return false;
    return puzzleMoves(t).some((m) => wins(playMove(t, m), left - 1));
  };
  const left = s.puzzle.moves - s.puzzle.used;
  return puzzleMoves(s).find((m) => wins(playMove(s, m), left - 1)) ?? null;
}

// ---- daily order: each player starts at puzzle 1 (the warm-up) instead of a calendar slot in the middle of the list ----
/** The daily list climbs for this many days, then repeats its hard-but-fair tail. */
export const DAILY_PLATEAU = 24;

export interface PuzzleRec {
  /** Day the current daily index was assigned, and that index. */
  date?: string;
  day?: number;
  streak: number;
  lastSolved?: string;
  drills: string[];
  /** Failed attempts per puzzle id (cleared on a solve). */
  fails?: Record<string, number>;
  /** Puzzles where a correct merge was shown (half reward). */
  shown?: string[];
}

/** Index of today's daily puzzle. A new day moves on only if the last one was solved, so nobody skips the ramp. */
export function dailyIndex(rec: PuzzleRec, today: string, len: number): number {
  if (rec.date !== today) {
    rec.day = rec.date === undefined ? 0 : (rec.day ?? 0) + (rec.lastSolved === rec.date ? 1 : 0);
    rec.date = today;
  }
  const d = rec.day ?? 0;
  return d < len ? d : DAILY_PLATEAU + ((d - len) % (len - DAILY_PLATEAU));
}

/** A finished attempt: a loss (or a restart after merging) counts as a fail; a win clears the count. */
export function notePuzzleAttempt(rec: PuzzleRec, id: string, won: boolean) {
  rec.fails ??= {};
  if (won) delete rec.fails[id];
  else rec.fails[id] = (rec.fails[id] ?? 0) + 1;
}

// ---- graduated help: never forced, unlocked by failed attempts on this puzzle ----
// r45 (owner stuck on puzzle 1 again): help comes sooner. HINT after the 1st failed try, NEXT MOVE after the 2nd; a fresh
// attempt left idle for `idleNudge` seconds shows and pulses the HINT (GameScene).
export const HELP = { hintAfter: 1, moveAfter: 2, skipAfter: 6, idleNudge: 20 } as const;

export interface PuzzleHelp {
  /** Restart is always there. */
  restart: true;
  /** Light the part to move first. */
  hint: boolean;
  /** Show the next correct merge from the current board. */
  showMove: boolean;
  /** Drills only: mark it done (no reward) and move on. The daily has a streak + reward, so no skip. */
  skip: boolean;
}

export function puzzleHelp(fails: number, kind: 'daily' | 'drill'): PuzzleHelp {
  return { restart: true, hint: fails >= HELP.hintAfter, showMove: fails >= HELP.moveAfter, skip: kind === 'drill' && fails >= HELP.skipAfter };
}

/** First-solve reward. The highlight hint is free; once a correct merge was shown the reward is halved; a skip pays nothing. */
export function puzzleReward(kind: 'daily' | 'drill', used: 'none' | 'hint' | 'move' | 'skip'): { bolts: number; gems: number; cards: number } {
  const full = kind === 'daily' ? { bolts: 40, gems: 3, cards: 0 } : { bolts: 25, gems: 0, cards: 2 };
  if (used === 'skip') return { bolts: 0, gems: 0, cards: 0 };
  if (used === 'move') return { bolts: Math.round(full.bolts / 2), gems: Math.floor(full.gems / 2), cards: Math.floor(full.cards / 2) };
  return full;
}
