// MONSTER BOUNTIES (ChatGPT round 30): each day three already-beaten bosses / mini-bosses come back on a fresh
// seeded board with one existing twist. Win for Bolts; win with 20+ s left or a x12 chain for a mastery star.
// Deterministic per date and per sorted pool; never touches saga progress.
import { LEVELS } from '../content/levels';
import { idxOf, newLevel, type GameState } from './game';
import { Rng } from './rng';
import { rushDef } from './rush';

export type BountyTwist = 'gaps' | 'corners' | 'rocket';
export const TWIST_TEXT: Record<BountyTwist, string> = { gaps: 'Two holes in the board', corners: 'Two corners blocked', rocket: 'Rockets instead of Cannons' };
export const BOUNTY_BOLTS = 10;
export const MASTERY_TIME_LEFT = 20;
export const MASTERY_CHAIN = 12;
export const MASTERY_MILESTONES: [number, number][] = [[3, 30], [8, 60], [15, 120]];

const hashStr = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0;
  return h >>> 0;
};

/** Today's three bounties from the beaten pool (needs at least 3 beaten opponents). */
export function bountiesFor(date: string, beaten: string[]): { id: string; twist: BountyTwist }[] | null {
  const pool = [...new Set(beaten)].sort();
  if (pool.length < 3) return null;
  const rng = new Rng(hashStr(`bounty:${date}`) || 1);
  const twists: BountyTwist[] = ['gaps', 'corners', 'rocket'];
  return rng.shuffle(pool).slice(0, 3).map((id, k) => ({ id, twist: twists[(k + rng.int(3)) % 3] }));
}

export function newBountyFight(id: string, twist: BountyTwist, date: string, slot: number): GameState {
  const base = rushDef(id, 1);
  const mini = !!LEVELS.find((d) => d.mini_boss === id);
  const def = { ...base, hp: rushDef(id, mini ? 0 : 1).hp, seed: (hashStr(`${date}:${id}:${twist}`) ^ base.seed) >>> 0 };
  const s = newLevel(def, { shooter: twist === 'rocket' ? 'rocket' : 'cannon' });
  s.rankCap = 6;
  s.timeLeft = s.levelTime = def.time_seconds;
  if (twist === 'gaps' || twist === 'corners') {
    s.masked = twist === 'gaps' ? [idxOf(2, 1), idxOf(2, 3)] : [idxOf(0, 0), idxOf(5, 4)];
    for (const c of s.masked) s.grid[c] = null;
  }
  s.bounty = { id, twist, date, slot };
  return s;
}
