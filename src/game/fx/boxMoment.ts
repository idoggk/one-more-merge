// The box-complete MOMENT of both Screw Yards (t-9170d73d), as pure timing + poses (no Phaser, so it is unit tested).
// A full box: the last screw thuds in, the lid slams down (tiny bounce), a brass latch clacks (flash, ring, sparks,
// check stamp, +1 BOXES, a rising chime), then the box slides off to the side while the next one slides in from the
// right with a small overshoot. Phases: filling -> closing -> latched -> sliding -> next. Never blocks input:
// the scenes keep taking taps while a moment plays (the state machine has no say over input at all).

/** Draw order shared by both yards: baked bands / ui at the bottom, the moment above them, the quit button on top. */
export const LAYERS = { bands: 0, ui: 0, flyer: 50, fx: 60, quit: 200 } as const;
/** The moment never gates a tap (asserted in tests; the scenes read it, they do not wait on the animation). */
export const BOX_MOMENT_BLOCKS_INPUT = false;

export type MomentPhase = 'filling' | 'closing' | 'latched' | 'sliding' | 'next';
export type MomentCue = 'thud' | 'clack' | 'sparks' | 'stamp' | 'counter' | 'chime' | 'slide' | 'done';

export interface MomentTimes {
  /** Lid is fully shut / latch snaps (ms after the last screw lands). */
  latch: number;
  /** The check stamp shows from latch to here (250 ms). */
  stampEnd: number;
  slideStart: number;
  slideEnd: number;
  /** Everything is over and the scene redraws the real box. */
  total: number;
}

export const STAMP_MS = 250;
export const SLIDE_OUT = 330;
export const SLIDE_IN = 300;
export const SPARKS = 8;
export const SPARK_MS = 380;
export const RING_MS = 260;
export const FLASH_MS = 90;

export function momentTimes(reduced = false): MomentTimes {
  // reduced motion: no slide, no bounce; the lid shows at once, the old box fades out as the new one fades in
  if (reduced) return { latch: 80, stampEnd: 80 + STAMP_MS, slideStart: 160, slideEnd: 340, total: 340 };
  return { latch: 180, stampEnd: 180 + STAMP_MS, slideStart: 300, slideEnd: 620, total: 620 };
}

export function phaseAt(ms: number, times: MomentTimes): MomentPhase {
  if (ms < 0) return 'filling';
  if (ms < times.latch) return 'closing';
  if (ms < times.slideStart) return 'latched';
  if (ms < times.total) return 'sliding';
  return 'next';
}

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const easeOutQuad = (t: number) => 1 - (1 - t) * (1 - t);
export const easeInQuad = (t: number) => t * t;
/** Ease-out with a small overshoot (s ~ 1 gives a few percent past the target). */
export const backOut = (t: number, s = 1) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2);

/** Lid height factor 0..1 (+ a tiny bounce): slams down fast (ease-out), overshoots shut by ~5%, settles at 1. */
export function lidScale(t: number) {
  t = clamp01(t);
  if (t < 0.72) return easeOutQuad(t / 0.72);
  return 1 + 0.05 * Math.sin(((t - 0.72) / 0.28) * Math.PI);
}

export interface MomentPose {
  /** Lid scaleY (0 = open). */
  lid: number;
  /** The finished box: x offset (px) and alpha. */
  oldX: number;
  oldAlpha: number;
  /** The incoming box. */
  newX: number;
  newAlpha: number;
  /** Squash pop of the finished box at the latch. */
  bump: number;
  /** White flash alpha (0 = none). */
  flash: number;
  /** Ring pulse progress 0..1 (null = not showing). */
  ring: number | null;
  /** Spark progress 0..1 (null = not showing). */
  sparks: number | null;
  /** Check stamp showing, and its 0..1 age (for the pop). */
  stamp: number | null;
}

export function poseAt(ms: number, reduced = false): MomentPose {
  const T = momentTimes(reduced);
  const since = ms - T.latch;
  const sliding = clamp01((ms - T.slideStart) / (T.slideEnd - T.slideStart));
  const lid = reduced ? (ms >= 0 ? 1 : 0) : lidScale(ms / T.latch);
  // slide: the old box goes left (ease-in, fades over its last half); the new one comes from the right (small overshoot)
  const oldX = reduced ? 0 : 0 - SLIDE_OUT * easeInQuad(sliding) || 0;
  const oldAlpha = ms >= T.total ? 0 : reduced ? 1 - sliding : 1 - clamp01((sliding - 0.45) / 0.55);
  const newX = reduced ? 0 : SLIDE_IN * (1 - backOut(sliding, 1.1));
  const newAlpha = ms < T.slideStart ? 0 : reduced ? sliding : clamp01(sliding / 0.25);
  return {
    lid,
    oldX,
    oldAlpha,
    newX,
    newAlpha,
    bump: reduced || since < 0 || since > 120 ? 0 : Math.sin((since / 120) * Math.PI),
    flash: reduced || since < 0 || since > FLASH_MS ? 0 : 0.85 * (1 - since / FLASH_MS),
    ring: reduced || since < 0 || since > RING_MS ? null : since / RING_MS,
    sparks: reduced || since < 0 || since > SPARK_MS ? null : since / SPARK_MS,
    stamp: since < 0 || since > STAMP_MS ? null : since / STAMP_MS,
  };
}

/** When each cue fires (ms after the last screw lands). */
export function cueTimes(reduced = false): Record<MomentCue, number> {
  const T = momentTimes(reduced);
  return { thud: 0, clack: T.latch, sparks: T.latch, stamp: T.latch, counter: T.latch + 40, chime: T.latch + 60, slide: T.slideStart, done: T.total };
}

/** Cues that fire in the time window (from, to], earliest first. */
export function cuesBetween(from: number, to: number, reduced = false): MomentCue[] {
  const t = cueTimes(reduced);
  const order = Object.keys(t) as MomentCue[];
  return order.filter((c) => (t[c] > from || (from < 0 && t[c] === 0)) && t[c] <= to).sort((a, b) => t[a] - t[b]);
}

/** One box's moment as a tiny state machine: advance it with frame deltas; it reports the cues that came due. */
export class BoxMoment {
  ms = -1;
  readonly times: MomentTimes;
  constructor(readonly reduced = false) {
    this.times = momentTimes(reduced);
  }
  get phase(): MomentPhase {
    return phaseAt(this.ms, this.times);
  }
  get done() {
    return this.phase === 'next';
  }
  get pose() {
    return poseAt(this.ms, this.reduced);
  }
  /** The last screw has landed: the lid starts to close. */
  start(): MomentCue[] {
    return this.seek(0);
  }
  advance(dt: number): MomentCue[] {
    return this.ms < 0 ? [] : this.seek(this.ms + dt);
  }
  seek(ms: number): MomentCue[] {
    const cues = cuesBetween(this.ms, ms, this.reduced);
    this.ms = ms;
    return cues;
  }
}

/** The chime climbs one step per box finished without a mistake and starts over after one. */
export const CHIME_MAX_STEP = 7;
export class ChimeStreak {
  streak = 0;
  /** A box was finished: the step (0..CHIME_MAX_STEP) its chime plays at. */
  box() {
    const step = Math.min(this.streak, CHIME_MAX_STEP);
    this.streak++;
    return step;
  }
  /** A rejected tap: the next chime starts low again. */
  mistake() {
    this.streak = 0;
  }
}
