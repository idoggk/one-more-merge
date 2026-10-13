// SCREW YARD pressure prototype (TUNING.yardPressure, default OFF): a countdown from the first tap and a tap budget.
// Pure + deterministic (no Phaser); the numbers live in src/content/yardObjects.ts (pressureCfg). The scene feeds it
// real milliseconds and counts every screw tap, wasted ones included.
export interface PressureCfg {
  /** Seconds on the clock; it starts at the first screw tap. */
  time: number;
  /** Taps allowed: every screw tap counts, a wasted tap on a blocked / turned-away screw too. */
  budget: number;
  /** 3 stars need taps used <= this (and >= STAR_TIME_LEFT.three of the time left). */
  threeTaps: number;
  /** 2 stars need taps used <= this (and >= STAR_TIME_LEFT.two of the time left). */
  twoTaps: number;
}
/** Share of the clock still left for each star level. */
export const STAR_TIME_LEFT = { three: 0.4, two: 0.15 };
/** Danger: amber at 25% left, red (pulsing) at 10%. */
export const DANGER = { amber: 0.25, red: 0.1 };

export type Danger = 'calm' | 'amber' | 'red';
export interface PressureState {
  cfg: PressureCfg;
  /** Milliseconds left. */
  msLeft: number;
  taps: number;
  started: boolean;
  paused: boolean;
  /** Why the object was lost, once it is. */
  out: null | 'time' | 'taps';
}

export const newPressure = (cfg: PressureCfg): PressureState => ({ cfg, msLeft: cfg.time * 1000, taps: 0, started: false, paused: false, out: null });

export const timeFrac = (p: PressureState) => Math.max(0, p.msLeft) / (p.cfg.time * 1000);
export const tapsLeft = (p: PressureState) => Math.max(0, p.cfg.budget - p.taps);
export const tapsFrac = (p: PressureState) => tapsLeft(p) / p.cfg.budget;
export const secondsLeft = (p: PressureState) => Math.ceil(Math.max(0, p.msLeft) / 1000);
export const clock = (secs: number) => `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;

export function dangerOf(frac: number): Danger {
  return frac <= DANGER.red ? 'red' : frac <= DANGER.amber ? 'amber' : 'calm';
}

/** One screw tap counted (the first starts the clock). Returns true when the budget is now spent. */
export function countTap(p: PressureState): boolean {
  if (p.out) return false;
  p.started = true;
  p.taps++;
  return p.taps >= p.cfg.budget;
}

/** Advance the clock (only while started, not paused, not over). Returns true when time just ran out. */
export function tickClock(p: PressureState, ms: number): boolean {
  if (!p.started || p.paused || p.out) return false;
  p.msLeft -= ms;
  if (p.msLeft > 0) return false;
  p.msLeft = 0;
  return true;
}

/** Stars for a clear: 3 with >= 40% of the time left and taps used <= threeTaps, 2 with >= 15% and <= twoTaps, else 1. */
export function pressureStars(p: PressureState): 1 | 2 | 3 {
  const t = timeFrac(p);
  if (t >= STAR_TIME_LEFT.three && p.taps <= p.cfg.threeTaps) return 3;
  if (t >= STAR_TIME_LEFT.two && p.taps <= p.cfg.twoTaps) return 2;
  return 1;
}
