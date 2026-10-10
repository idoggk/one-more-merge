// ROSTER batch 6 (t-f2cd50e4, TUNING.roster6): the job rules of Robot Arm and Tilt Lever. Pure helpers used by cascade.ts, game.ts and
// support.ts (and the tip copy). They only matter while one of these units is in the squad, which needs the flag (src/content/units.ts
// applyRoster6; both are Legendary, so crates B must be on to drop them). docs/ROSTER.md section 13 is the source.
import { COLS, ROWS, TUNING } from '../content/tuning';
import type { GameState } from './game';
import { isRelay, type Family, type Grid } from './types';

// ---- Robot Arm COPY ----

/** Legendary relays: a Robot Arm never copies them (Crane, Dynamo). Tested against the unit list (every Legendary relay must be here). */
export const LEGENDARY_RELAYS: readonly Family[] = ['crane', 'dynamo'];
/** Can a Robot Arm copy this family? Only a relay that is not Legendary (never the Arm itself, never a Support card). */
export const canCopy = (f: Family): boolean => isRelay(f) && !LEGENDARY_RELAYS.includes(f);

/** Rarity of every copyable relay (for L3: its own shot grows when it copied a Rare or Epic relay). */
export const COPY_RARITY: Partial<Record<Family, 'common' | 'rare' | 'epic'>> = {
  coil: 'common', bell: 'common', horn: 'common', spring: 'common', vice: 'common', router: 'rare',
  fuse_box: 'rare', gear: 'rare', pipe: 'rare',
  belt_drive: 'epic', capacitor: 'epic', ladder: 'epic',
};
/** "The better one" (L6, two jobs held): the relay that wakes the most parts on a normal board, a fixed list so the choice never depends on luck. Higher = better. */
export const COPY_VALUE: Partial<Record<Family, number>> = {
  bell: 5, horn: 5, coil: 4, fuse_box: 4, pipe: 4, gear: 3, ladder: 3, belt_drive: 2, spring: 2, capacitor: 1, router: 4, vice: 2,
};

/** How many jobs the Arm remembers: 1, or 2 from L6. */
export const copyKeep = (level: number) => (level >= 6 ? TUNING.r6.copyKeepL6 : TUNING.r6.copyKeep);

/** The Arm's memory after a relay woke it: that relay goes last (newest); the oldest drops out past the limit. A non-copyable waker changes nothing. */
export function rememberCopy(mem: readonly Family[] | undefined, relay: Family, level: number): Family[] {
  const old = mem ?? [];
  if (!canCopy(relay)) return [...old];
  return [...old.filter((f) => f !== relay), relay].slice(-copyKeep(level));
}

/** The job the Arm does this fire: among the remembered relays that are not yet copied in this cascade, the better one (COPY_VALUE, then the newer); null = none left.
 *  A Legendary in an old memory (a stale save) is never picked. */
export function pickCopy(mem: readonly Family[] | undefined, used: ReadonlySet<Family>): Family | null {
  let best: Family | null = null;
  (mem ?? []).forEach((f) => {
    if (!canCopy(f) || used.has(f)) return;
    if (best === null || (COPY_VALUE[f] ?? 0) >= (COPY_VALUE[best] ?? 0)) best = f;
  });
  return best;
}

/** The level the copied job runs at: the relay's own collection level; an Arm at L9 copies at the relay's L9 upgrade. */
export const copyLevel = (armLevel: number, relayLevel: number) => (armLevel >= 9 ? Math.max(9, relayLevel) : relayLevel);

/** L3: the Arm's own shot x r6.copyOwnL3 when it copied a Rare or Epic relay (inside the job tags, never past one factor). */
export const copyOwnMult = (armLevel: number, relay: Family) => (armLevel >= 3 && COPY_RARITY[relay] && COPY_RARITY[relay] !== 'common' ? TUNING.r6.copyOwnL3 : 1);

// ---- Tilt Lever TILT ----

export type TiltDir = 'up' | 'right' | 'down' | 'left';
const STEP: Record<TiltDir, [number, number]> = { up: [-1, 0], right: [0, 1], down: [1, 0], left: [0, -1] };
const rc = (idx: number) => [Math.floor(idx / COLS), idx % COLS] as const;

/** Player merges one Tilt Lever charge takes (15; 12 from L3). */
export const tiltNeed = (level: number) => (level >= 3 ? TUNING.r6.tiltMergesL3 : TUNING.r6.tiltMerges);
/** Most merges one tilt may make (3; 4 from L6). */
export const tiltMax = (level: number) => (level >= 6 ? TUNING.r6.tiltMaxL6 : TUNING.r6.tiltMax);

/** The Tilt Lever is OFF in Workshop Puzzles / drills, the Daily Puzzle and Monster Bounties (a board slide would change a result that was solved or fixed move by move). */
export const tiltModeOk = (s: GameState) => !s.puzzle && !s.bounty && s.phase === 'playing';

/** The edge a tap on `cell` means: the board edge that cell is nearest to (looking at the board as a whole, so the tap can be anywhere near it); a tie goes up. */
export function tiltDirOf(cell: number): TiltDir {
  const [r, c] = rc(cell);
  const ny = (r + 0.5) / ROWS - 0.5, nx = (c + 0.5) / COLS - 0.5;
  if (Math.abs(nx) > Math.abs(ny) + 1e-9) return nx < 0 ? 'left' : 'right';
  return ny <= 0 ? 'up' : 'down';
}

/** The board cell a tap for `dir` hits at the middle of that edge (bots and tests). */
export const tiltCellFor = (dir: TiltDir): number => (dir === 'up' ? 2 : dir === 'down' ? (ROWS - 1) * COLS + 2 : dir === 'left' ? 3 * COLS : 3 * COLS + COLS - 1);

/** One planned tilt. `slides` = every part that moves (in the order they move), `pairs` = twins that stop side by side and merge afterwards, in order:
 *  `from` (the part that slid) is dropped onto `to` (the twin nearer the edge), as in a normal merge. */
export interface TiltPlan {
  dir: TiltDir;
  slides: { from: number; to: number; id: number }[];
  pairs: { from: number; to: number; fromId: number; toId: number }[];
}

/** Plan a tilt on a copy of the layout (the real board is untouched; previews never mutate state).
 *  Order is fixed so a seed always gives the same result: lanes (columns for up / down, rows for left / right) in index order; inside a lane the parts nearest the
 *  edge first. A part slides as far as it can toward the edge; `wall` cells (locked, reserved for a falling part, boss-blocked or marked) and parts that cannot be
 *  moved stop it like the edge. When the part that stops it is a twin (`mergeable`) and nobody used that twin yet and fewer than `max` pairs exist, the two will merge.
 *  `only` (L9): slide just the row or column through that cell. */
export function planTilt(grid: Grid, dir: TiltDir, level: number, wall: ReadonlySet<number>, fixed: ReadonlySet<number>, mergeable: (a: NonNullable<Grid[number]>, b: NonNullable<Grid[number]>) => boolean, only?: number): TiltPlan {
  const [dr, dc] = STEP[dir];
  const g = grid.slice();
  const slides: TiltPlan['slides'] = [];
  const pairs: TiltPlan['pairs'] = [];
  const used = new Set<number>(); // part ids already in a pair
  const max = tiltMax(level);
  const vertical = dr !== 0;
  const laneCount = vertical ? COLS : ROWS, laneLen = vertical ? ROWS : COLS;
  const [or, oc] = only !== undefined && only >= 0 ? rc(only) : [-1, -1];
  for (let lane = 0; lane < laneCount; lane++) {
    if (only !== undefined && only >= 0 && lane !== (vertical ? oc : or)) continue;
    // positions from the edge the parts slide toward, inward
    const at = (k: number) => (vertical ? (dr < 0 ? k : laneLen - 1 - k) * COLS + lane : lane * COLS + (dc < 0 ? k : laneLen - 1 - k));
    for (let k = 0; k < laneLen; k++) {
      const from = at(k);
      const a = g[from];
      if (!a || fixed.has(from)) continue;
      let to = from, kt = k; // kt = the position index of `to` in this lane
      for (let j = k - 1; j >= 0; j--) {
        const n = at(j);
        if (g[n] || wall.has(n)) break;
        [to, kt] = [n, j];
      }
      // the part that stops it: the one just past `to` toward the edge, if any
      const nb = kt > 0 ? at(kt - 1) : -1;
      const blocker = nb >= 0 ? g[nb] : null;
      if (to !== from) {
        g[to] = a;
        g[from] = null;
        slides.push({ from, to, id: a.id });
      }
      if (blocker && !used.has(blocker.id) && !used.has(a.id) && !fixed.has(nb) && pairs.length < max && mergeable(a, blocker)) {
        used.add(a.id);
        used.add(blocker.id);
        pairs.push({ from: to, to: nb, fromId: a.id, toId: blocker.id });
      }
    }
  }
  return { dir, slides, pairs };
}
