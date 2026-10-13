// MERGE ASSIST (t-8426336a, owner: new players struggle with the first merges). Pure helpers, no Phaser, so the rules
// are unit-tested; GameScene only asks them. Default OFF: nothing here runs unless the setting resolves to ON.
// Nothing here changes a rule: a snap only ever picks a partner from legalPairs() (the same list the hint uses), so an
// assisted drop is always a drop the game would have accepted had the finger been exact.
import { legalPairs, type GameState } from '../core/game';

/** OFF = today's game. ON = always. AUTO = ON for a new player (see assistActive), then OFF. */
export type AssistMode = 'off' | 'on' | 'auto';
export const ASSIST_MODES: AssistMode[] = ['off', 'on', 'auto'];
/** A phone setting in its own key (not in the save code), like SCREEN SHAKE. */
export const MERGE_ASSIST_KEY = 'omm_merge_assist';
/** AUTO helps in saga levels 1..AUTO_LEVELS, and only while the player has made fewer than AUTO_MERGES merges in all. */
export const AUTO_LEVELS = 10;
export const AUTO_MERGES = 30;
/** A release this far (fraction of a cell) outside a valid partner's cell box still merges with it. */
export const SNAP_REACH = 0.7;
/** The held part floats this far (fraction of a cell) up and to the left of the finger, so the thumb never hides it. */
export const ASSIST_OFFSET = 0.6;
/** The failed-drop toast: saga levels 1..TOAST_LEVELS, at most TOAST_MAX times per level. */
export const TOAST_LEVELS = 5;
export const TOAST_MAX = 2;

export const storedAssistMode = (read: () => string | null): AssistMode => {
  try {
    const v = read();
    return v === 'on' || v === 'auto' ? v : 'off';
  } catch {
    return 'off';
  }
};
export const nextAssistMode = (m: AssistMode): AssistMode => ASSIST_MODES[(ASSIST_MODES.indexOf(m) + 1) % ASSIST_MODES.length];

/** Is the assist helping right now? `level`: the saga level number (undefined in puzzles, bounties, the tutorial...);
 *  `merges`: the player's lifetime merges. AUTO: a new player (< AUTO_MERGES merges) in levels 1..AUTO_LEVELS. */
export function assistActive(mode: AssistMode, level: number | undefined, merges: number): boolean {
  if (mode === 'on') return true;
  if (mode === 'off') return false;
  return merges < AUTO_MERGES && (level === undefined || level <= AUTO_LEVELS);
}

/** Cells `from` could merge into (the game's own legal pairs: matching, unlocked, within the rank cap). */
export function partnersOf(s: GameState, from: number): number[] {
  const out: number[] = [];
  for (const [a, b] of legalPairs(s)) {
    if (a === from) out.push(b);
    else if (b === from) out.push(a);
  }
  return out;
}

/** Distance from (x, y) to the cell box centred at `c` (0 inside it). */
export function boxDist(x: number, y: number, c: { x: number; y: number }, cell: number): number {
  return Math.hypot(Math.max(Math.abs(x - c.x) - cell / 2, 0), Math.max(Math.abs(y - c.y) - cell / 2, 0));
}

/** The valid partner of `from` nearest to (x, y) whose box lies within `reach` cells of the point, else -1. Ties go to
 *  the lower cell. Never returns a non-matching part, an empty cell or `from` itself. */
export function snapTarget(s: GameState, from: number, x: number, y: number, centre: (i: number) => { x: number; y: number }, cell: number, reach = SNAP_REACH): number {
  let best = -1;
  let bd = Infinity;
  for (const i of partnersOf(s, from)) {
    const c = centre(i);
    if (boxDist(x, y, c, cell) > reach * cell) continue;
    const d = Math.hypot(x - c.x, y - c.y);
    if (d < bd) [bd, best] = [d, i];
  }
  return best;
}

/** Tap shortcut: the ONE legal pair on the whole board, else null (two or more pairs = ambiguous, nothing is offered). */
export function soleMergePair(s: GameState): [number, number] | null {
  const p = legalPairs(s);
  return p.length === 1 ? p[0] : null;
}

/** What a tap (no drag) on `tapped` does. A tool's own release ('held' preview / quick 'use') always goes first: the
 *  assist's MERGE hint must never swallow a tool tap. Then the hint's pair, then the normal inspect. */
export function tapRoute(tool: 'held' | 'use' | 'none', pair: [number, number] | null, tapped: number, playing: boolean): 'held' | 'tool' | 'assist' | 'other' {
  if (tool === 'held') return 'held';
  if (tool === 'use') return 'tool';
  return pair && playing && pair.includes(tapped) ? 'assist' : 'other';
}

/** Failed-drop toast budget: levels 1..TOAST_LEVELS, TOAST_MAX per level. `shown`: toasts already shown this level. */
export const toastAllowed = (level: number | undefined, shown: number): boolean => level !== undefined && level <= TOAST_LEVELS && shown < TOAST_MAX;
