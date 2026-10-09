import { DAILY_SEEDS } from '../content/dailySeeds';
import type { Family } from '../core/types';
import type { CrateKind } from '../content/units';
import type { PityState } from '../core/crates';
import type { BoosterCounts, YardWeekRec } from '../core/yardWeek';
import type { PuzzleRec } from '../core/puzzle';
import type { SeasonRec } from '../core/season';
import type { PaceCurve } from '../core/pace';
import type { Feature } from './unlocks';
import { isQuotaError, mergeMeta, META_KEY, storeTo } from '../platform/backup';
import { warnStorageFull } from '../platform/storageWarn';

export interface Meta {
  tutorialDone: boolean;
  bestTime: number | null;
  bestChain: number;
  runs: number;
  wins: number;
  sound: boolean;
  hints: boolean;
  music: boolean;
  /** Equipped MACHINE-tab stage backdrop (r18 Bolt sink). */
  stage?: string | null;
  /** Equipped hero ornament (r17 Bolt sink). */
  ornament?: string | null;
  /** Bolts balance at the last Workshop visit (new-item dot). */
  workshopSeenBolts?: number;
  /** Chapter medals earned (chapter number -> true), r17. */
  medals?: Record<string, boolean>;
  /** r43 "Back up your progress?" nudge already shown after this chapter clear. */
  backupNudged?: Record<string, boolean>;
  /** One-time road / card / booster lessons (r17 onboarding). */
  lessons?: Record<string, boolean>;
  /** SAGA progress: best stars per level number, dynamic resources, one-time grants. */
  levelStars?: Record<string, number>;
  /** r46 ghost pace: the fastest win of each level as a compact progress curve (core/pace). */
  levelPace?: Record<string, PaceCurve>;
  kits?: number;
  capsules?: number;
  grants?: Record<string, boolean>;
  failPaid?: Record<string, string>;
  /** Team shooter slot (Cannon, or Rocket once unlocked by the first full clear). */
  shooter?: Family;
  /** Simplified configuration for the stranger playtest (ChatGPT r21). */
  playtestMode?: boolean;
  /** r32 unit collection: level + spare duplicate cards per unit; premium Gems; unopened crates; crate roll counter. */
  units?: Record<string, { level: number; cards: number }>;
  gems?: number;
  crates?: Partial<Record<CrateKind, number>>;
  crateSeq?: number;
  pity?: PityState;
  unitChoiceDone?: boolean;
  /** r32 squad relays (slot A unlocks in chapter 2, slot B in chapter 3). */
  relays?: [string, string];
  /** r30 Monster Bounties: per-date record (won / mastered slots), mastery stars per opponent, milestones paid. */
  bounty?: Record<string, { won: number[]; mastered: number[] }>;
  bossMastery?: Record<string, number>;
  /** r35 trophies on display beside the machine (max 4 boss ids; a trophy is won at TROPHY_AT mastery stars). */
  trophies?: string[];
  /** r36 screwdrivers (one per yard attempt). Unused since Screw Yard 2.0 (yards are free); kept so old saves load. */
  screwdrivers?: number;
  /** Screw Yard 2.0 earned boosters (never sold). */
  yardBoosters?: BoosterCounts;
  /** r38 Featured Unit Trial (ChatGPT review): today's unit, battles left, switched on, end CTA shown. */
  trial?: { date: string; unit: string; left: number; on: boolean; endShown?: boolean };
  /** r42 Workshop Puzzles: daily streak + solved drills. */
  puzzles?: PuzzleRec;
  /** r41 Workshop Season record. */
  season?: SeasonRec;
  /** r40 Saga Mastery medals: level -> contract indexes completed. */
  sagaMedals?: Record<string, number[]>;
  /** r40 Endless Road: the next floor to play and the best floor cleared. */
  endless?: { floor: number; best: number };
  /** r38 collection milestones claimed (index into COLLECTION_GOALS). */
  collClaimed?: number;
  yard?: YardWeekRec;
  masteryPaid?: number;
  /** r29 Boss Rush: this week's course, Bolts granted this week, gold stamps, medal, completed weeks. */
  rush?: { week: number; course: string[]; granted: number; best?: { fights: number; time: number }; stamps?: Record<string, boolean>; medal?: boolean; weeks?: number[]; run?: { i: number; times: number[] } };
  /** Dropping on a non-matching piece swaps them (off by default: mismatches bounce back). */
  swapMismatch?: boolean;
  /** Camera shake on big hits (pause-menu toggle; default on). */
  shake?: boolean;
  /** Set by the level-5 clear / a classic win. Since t-2fd7bb86 it no longer opens features (see unlocks.ts). */
  hardUnlocked: boolean;
  /** t-2fd7bb86 staggered feature unlocks (sticky) and which ones the player has opened (NEW cue gone). */
  unlocks?: Partial<Record<Feature, boolean>>;
  unlockSeen?: Partial<Record<Feature, boolean>>;
  bestTimeHard: number | null;
  /** Unlocked toys and whether each is switched on for runs. */
  toys: Partial<Record<Family, boolean>>;
  /** Remix fastest wins keyed by opponent + helper loadout. */
  remixBest: Record<string, number>;
  /** First-time contextual tips already shown. */
  tips: Record<string, boolean>;
  /** t-0a294f99: tips that did not fit a level's tip budget, waiting for a later level (see tips.ts). */
  tipQueue?: string[];
  /** Bolts wallet (the only spendable resource; cosmetics only). */
  bolts?: number;
  owned?: string[];
  finish?: string | null;
  nameIdx?: number;
  /** One-time entitlements / settlement guards. */
  onboarded?: boolean;
  dailyPaid?: Record<string, boolean>;
  lastSettle?: string;
  /** Mastery as last seen on the home page (improved modules get a highlight). */
  homeSeen?: Partial<Record<Family, number>>;
  /** Highest rank ever created per family by a player merge or Kickback fuse: builds YOUR MACHINE. */
  mastery?: Partial<Record<Family, number>>;
  /** Daily Bench personal bests by local date (only recent days kept). */
  daily?: Record<string, DailyBest>;
}

/** Daily Bench result, ordered: more opponents beaten > (cleared: faster) > more damage on the opponent reached. */
export interface DailyBest {
  v: number;
  targets: number;
  time: number | null;
  dmg: number;
  attempts: number;
}
export const dailyBetter = (a: DailyBest, b: DailyBest | undefined) =>
  !b || a.targets > b.targets || (a.targets === b.targets && (a.targets === 3 ? (a.time ?? 1e9) < (b.time ?? 1e9) : a.dmg > b.dmg));
export function localDate(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function dailySeed(date: string) {
  const [y, m, d] = date.split('-').map(Number);
  const day = Math.floor(Date.UTC(y, m - 1, d) / 86400000);
  return DAILY_SEEDS[day % DAILY_SEEDS.length];
}

export function loadMeta(): Meta {
  const d: Meta = { tutorialDone: false, bestTime: null, bestChain: 0, runs: 0, wins: 0, sound: true, hints: true, music: true, hardUnlocked: false, bestTimeHard: null, toys: {}, remixBest: {}, tips: {} };
  try {
    return mergeMeta(d, JSON.parse(localStorage.getItem(META_KEY) || '{}'));
  } catch {
    return d;
  }
}
export const store = (k: string, v: string | null) => {
  try {
    storeTo(localStorage, k, v);
  } catch (e) {
    if (isQuotaError(e)) warnStorageFull(); // else: storage unavailable
  }
};
