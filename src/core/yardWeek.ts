// Screw Yard 2.0 step 2 (t-98293568): the weekly event around the curated 10-yard ramp in src/content/yards.json.
// Free to play (screwdrivers are gone): the track pays for stars, the best per yard, so replaying for volume earns
// nothing and a cleaner solve does. Boosters are earned (start kit, first 3 stars on a yard, tiers), capped small.
// Pure: GameScene stores it, ScrewScene draws the yard.
import week from '../content/yards.json';
import { Rng } from './rng';
import { YARD_BOOSTERS, YARD_TIERS, type YardBooster, type YardLevel } from './screw';

export interface WeekYard extends YardLevel {
  score: number;
  /** Solver's minimum dock peak (the 3-star bar is this + 1). */
  minPeak: number;
}
type Stored = YardLevel & { score: number; stats: { minDockPeak: number } };
const RAMP = week.yards as unknown as Stored[];
export const YARD_COUNT = RAMP.length;
const COLORS = 6;

/** Week `wk`'s colour shuffle: a permutation keeps every solver fact (solvable, minimum dock peak, score). */
export function colourPerm(wk: number): number[] {
  return new Rng((wk * 7919 + 13) >>> 0).shuffle(Array.from({ length: COLORS }, (_, i) => i));
}

/** Yard n (1-based) of week `wk`: the curated layout in this week's colours. */
export function weekYard(n: number, wk: number): WeekYard {
  const y = RAMP[Math.max(0, Math.min(YARD_COUNT, n) - 1)];
  const perm = colourPerm(wk);
  return {
    n: y.n,
    seed: y.seed,
    rules: { ...y.rules! },
    plates: y.plates.map((p) => ({ ...p, screws: p.screws.slice() })),
    screws: y.screws.map((s) => ({ ...s, color: perm[s.color] })),
    queue: y.queue.map((c) => perm[c]),
    score: y.score,
    minPeak: y.stats.minDockPeak,
  };
}

export interface YardWeekRec {
  week: number;
  /** Highest yard cleared (yards open in order). */
  clears: number;
  /** Tiers paid. */
  paid: number;
  /** Best stars per yard number. Missing on a classic (r36) record. */
  stars?: Record<string, number>;
}

/** This week's record: a new week starts over; a classic record from this same week restarts the ramp on 2.0 but keeps
 *  its paid tiers paid (no double payout). Yard progress is never saved mid-yard, so no classic yard is left to finish. */
export function yardWeekRec(rec: YardWeekRec | undefined, wk: number): YardWeekRec {
  if (!rec || rec.week !== wk) return { week: wk, clears: 0, paid: 0, stars: {} };
  if (!rec.stars) return { week: wk, clears: 0, paid: rec.paid ?? 0, stars: {} };
  return rec;
}

export const yardStarTotal = (rec: YardWeekRec) => Object.values(rec.stars ?? {}).reduce((t, s) => t + s, 0);
export const yardPlayable = (rec: YardWeekRec, n: number) => n >= 1 && n <= Math.min(YARD_COUNT, rec.clears + 1);
/** The yard PLAY starts: the next new one, then the first without 3 stars, then the last. */
export function nextYard(rec: YardWeekRec): number {
  if (rec.clears < YARD_COUNT) return rec.clears + 1;
  for (let n = 1; n <= YARD_COUNT; n++) if ((rec.stars?.[n] ?? 0) < 3) return n;
  return YARD_COUNT;
}
/** A tier counts as reached once paid or once the stars are there. */
export const tierReached = (rec: YardWeekRec, i: number) => i < rec.paid || yardStarTotal(rec) >= YARD_TIERS[i].need;

/** Bolts per NEW star on yard n (replays that do not improve pay nothing). */
export const yardStarBolts = (n: number) => 6 + 2 * n;

export type BoosterCounts = Partial<Record<YardBooster, number>>;
/** Granted once when the 2.0 yard first opens. */
export const YARD_BOOSTER_START: BoosterCounts = { drill: 1, magnet: 1, well: 1 };
/** Most of one booster a player can hold (earned only; never sold). */
export const YARD_BOOSTER_CAP = 3;
export function addBoosters(have: BoosterCounts, add: BoosterCounts = {}): BoosterCounts {
  const out: BoosterCounts = { ...have };
  for (const k of YARD_BOOSTERS) if (add[k]) out[k] = Math.min(YARD_BOOSTER_CAP, (out[k] ?? 0) + add[k]!);
  return out;
}

export interface YardOutcome {
  gainedStars: number;
  bolts: number;
  /** Tier indexes newly paid, in order. */
  tiers: number[];
  /** First 3 stars on this yard: one booster (drill / magnet / well by yard). */
  boosters: BoosterCounts;
}
/** Book a finished yard into the record (mutates rec). */
export function recordYard(rec: YardWeekRec, n: number, stars: number): YardOutcome {
  const st = (rec.stars ??= {});
  const prev = st[n] ?? 0;
  const gainedStars = Math.max(0, stars - prev);
  if (stars > 0) {
    st[n] = Math.max(prev, stars);
    rec.clears = Math.max(rec.clears, n);
  }
  const total = yardStarTotal(rec);
  const tiers: number[] = [];
  while (rec.paid < YARD_TIERS.length && total >= YARD_TIERS[rec.paid].need) tiers.push(rec.paid++);
  const boosters: BoosterCounts = stars === 3 && prev < 3 ? { [YARD_BOOSTERS[(n - 1) % YARD_BOOSTERS.length]]: 1 } : {};
  return { gainedStars, bolts: gainedStars * yardStarBolts(n), tiers, boosters };
}
