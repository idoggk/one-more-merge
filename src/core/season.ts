// WORKSHOP SEASON (r41, ChatGPT's #3 next feature): a 28-day track fed by everything already in the game.
// 30 tiers x 100 XP. 3 daily tasks (15 XP), 4 weekly tasks (100 XP), +75 XP for a full Boss Rush clear and for the
// Screw Yard grand prize. Free lane for everyone; a premium lane (mock purchase for now) with the season's featured
// unit cards. Pure: task selection is seeded by the day / week / season number.
import { UNITS } from '../content/units';
import type { Family } from './types';

export const SEASON_DAYS = 28;
export const SEASON_TIERS = 30;
export const TIER_XP = 100;
export const DAILY_XP = 15;
export const WEEKLY_XP = 100;
export const BONUS_XP = { rushFull: 75, yardGrand: 75 };

/** Counted events (the game reports these as they happen). */
export type SeasonEvent = 'levelWin' | 'chain8' | 'threeStars' | 'crateOpen' | 'yardPlay' | 'bountyWin' | 'unitUp' | 'medal' | 'endlessFloor';

export interface TaskDef {
  ev: SeasonEvent;
  n: number;
  text: string;
}

const DAILY_POOL: TaskDef[] = [
  { ev: 'levelWin', n: 3, text: 'Win 3 levels' },
  { ev: 'chain8', n: 1, text: 'Fire a chain of 8+' },
  { ev: 'threeStars', n: 1, text: 'Get 3 stars on a level' },
  { ev: 'crateOpen', n: 1, text: 'Open a crate' },
  { ev: 'yardPlay', n: 1, text: 'Play a Screw Yard' },
  { ev: 'bountyWin', n: 1, text: 'Win a Bounty' },
  { ev: 'unitUp', n: 1, text: 'Level up a unit' },
  { ev: 'medal', n: 1, text: 'Earn a Mastery medal' },
];
const WEEKLY_POOL: TaskDef[] = [
  { ev: 'levelWin', n: 15, text: 'Win 15 levels' },
  { ev: 'chain8', n: 8, text: 'Fire 8 chains of 8+' },
  { ev: 'yardPlay', n: 5, text: 'Play 5 Screw Yards' },
  { ev: 'medal', n: 5, text: 'Earn 5 Mastery medals' },
  { ev: 'crateOpen', n: 5, text: 'Open 5 crates' },
  { ev: 'unitUp', n: 3, text: 'Level up units 3 times' },
  { ev: 'threeStars', n: 5, text: 'Get 3 stars 5 times' },
];

const mix = (n: number) => {
  let h = (n * 2654435761) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d) >>> 0;
  return (h ^ (h >>> 12)) >>> 0;
};
/** k distinct picks from a pool, seeded. */
function pick<T>(pool: T[], k: number, seed: number): T[] {
  const idx = pool.map((_, i) => i).sort((a, b) => mix(seed * 31 + a) - mix(seed * 31 + b));
  return idx.slice(0, k).map((i) => pool[i]);
}

export const seasonId = (day: number) => Math.floor(day / SEASON_DAYS);
export const seasonDayLeft = (day: number) => SEASON_DAYS - (day % SEASON_DAYS);
export const dailyTasks = (day: number): TaskDef[] => pick(DAILY_POOL, 3, day * 7 + 1);
export const weeklyTasks = (week: number): TaskDef[] => pick(WEEKLY_POOL, 4, week * 13 + 5);
/** The season's featured unit (premium-lane cards): a non-starter, by season. */
export function seasonUnit(season: number): Family {
  const pool = UNITS.filter((u) => u.rarity !== 'common').map((u) => u.id);
  return pool[mix(season + 101) % pool.length];
}

export type SeasonReward = { bolts?: number; gems?: number; crate?: 'wood' | 'iron' | 'gold'; unitCards?: number };
/** Tier t (1-based) rewards: [free, premium]. */
export function tierRewards(t: number): [SeasonReward, SeasonReward] {
  const free: SeasonReward = t === 30 ? { crate: 'gold' } : t % 10 === 0 ? { crate: 'iron' } : t % 5 === 0 ? { crate: 'wood' } : { bolts: 30 + 2 * t };
  const prem: SeasonReward = t === 30 ? { crate: 'gold', unitCards: 2 } : t % 10 === 0 ? { crate: 'iron', gems: 20 } : t % 4 === 0 ? { unitCards: 1 } : t % 5 === 0 ? { gems: 15 } : { bolts: 40 + 2 * t };
  return [free, prem];
}

/** Persistent season record (kept in the meta save). */
export interface SeasonRec {
  id: number;
  xp: number;
  premium: boolean;
  claimed: { free: number[]; prem: number[] };
  day: number;
  daily: number[];
  week: number;
  weekly: number[];
}

export function freshSeason(day: number): SeasonRec {
  return { id: seasonId(day), xp: 0, premium: false, claimed: { free: [], prem: [] }, day, daily: [0, 0, 0], week: Math.floor(day / 7), weekly: [0, 0, 0, 0] };
}

/** Roll the record to `day` (new season / new day / new week reset what they own). */
export function rollSeason(rec: SeasonRec | undefined, day: number): SeasonRec {
  let r = rec && rec.id === seasonId(day) ? rec : freshSeason(day);
  if (r.day !== day) r = { ...r, day, daily: [0, 0, 0] };
  const wk = Math.floor(day / 7);
  if (r.week !== wk) r = { ...r, week: wk, weekly: [0, 0, 0, 0] };
  return r;
}

/** Count an event; returns the XP gained (tasks completed by it). Mutates rec. */
export function seasonCount(rec: SeasonRec, ev: SeasonEvent, amount = 1): number {
  let xp = 0;
  dailyTasks(rec.day).forEach((t, i) => {
    if (t.ev !== ev || rec.daily[i] >= t.n) return;
    rec.daily[i] = Math.min(t.n, rec.daily[i] + amount);
    if (rec.daily[i] >= t.n) xp += DAILY_XP;
  });
  weeklyTasks(rec.week).forEach((t, i) => {
    if (t.ev !== ev || rec.weekly[i] >= t.n) return;
    rec.weekly[i] = Math.min(t.n, rec.weekly[i] + amount);
    if (rec.weekly[i] >= t.n) xp += WEEKLY_XP;
  });
  rec.xp += xp;
  return xp;
}

export const seasonTier = (rec: SeasonRec) => Math.min(SEASON_TIERS, Math.floor(rec.xp / TIER_XP));
