/** Pure math for the UI juice kit (flag UI_JUICE). No Phaser, no game state, no game Rng: easing, particle cap, count-up, stagger, glint timing. */

export const clamp01 = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : t);

export const easeOutQuad = (t: number) => 1 - (1 - clamp01(t)) ** 2;
export const easeOutCubic = (t: number) => 1 - (1 - clamp01(t)) ** 3;
export const easeInQuad = (t: number) => clamp01(t) ** 2;

/** Ease-out-back: overshoots 1 then settles. s = 1.70158 is the classic 10% overshoot. */
export function easeOutBack(t: number, s = 1.70158): number {
  const x = clamp01(t) - 1;
  return x * x * ((s + 1) * x + s) + 1;
}

/** popIn scale curve: 0 -> 1.12 -> 1 (back-out reaching 1.12 first, then a settle). t in 0..1. */
export function popInScale(t: number): number {
  const k = clamp01(t);
  if (k < 0.7) return 1.12 * easeOutCubic(k / 0.7);
  return 1.12 - 0.12 * easeOutQuad((k - 0.7) / 0.3);
}

/** Hard limits of the kit. */
export const JUICE_CAPS = { particles: 30, burstMin: 6, burstMax: 12, glints: 4 } as const;

/** Live particle budget shared by every sparkle burst: a request is trimmed to what is left (0 when full). */
export class ParticleBudget {
  private live = 0;
  constructor(readonly cap: number = JUICE_CAPS.particles) {}
  get used() {
    return this.live;
  }
  /** Ask for `n` particles; returns how many were granted (never more than the cap allows). */
  take(n: number): number {
    const give = Math.max(0, Math.min(Math.floor(n), this.cap - this.live));
    this.live += give;
    return give;
  }
  release(n: number) {
    this.live = Math.max(0, this.live - n);
  }
}

/** How many sparkles a burst really uses: clamped to 6..12 first, then trimmed by the budget. Below 6 left, a burst may be smaller. */
export function burstCount(want: number, budget: ParticleBudget): number {
  return budget.take(Math.max(JUICE_CAPS.burstMin, Math.min(JUICE_CAPS.burstMax, Math.round(want))));
}

/** Integer shown by a count-up at progress t (eased, lands exactly on `to`; works for falling numbers too). */
export function countUpValue(from: number, to: number, t: number): number {
  if (t >= 1) return Math.round(to);
  return Math.round(from + (to - from) * easeOutCubic(t));
}

/** Delay of item `i` in a staggered list; the whole list never takes longer than `maxTotal`. */
export function staggerDelay(i: number, step: number, maxTotal = 600, start = 0): number {
  if (i <= 0) return start;
  return start + Math.min(i * step, maxTotal);
}

/** Next glint gap in ms: 2.5..6 s from a 0..1 random (the caller passes Math.random(), never the game Rng). */
export function glintGap(r01: number): number {
  return 2500 + clamp01(r01) * 3500;
}

/** Wiggle angle (degrees) at ms into a wiggle of `dur`: damped sine, 0 at the ends. */
export function wiggleAngle(ms: number, dur = 600, amp = 8): number {
  if (ms <= 0 || ms >= dur) return 0;
  const k = ms / dur;
  return Math.sin(k * Math.PI * 6) * amp * (1 - k);
}

/** Press squash scale for press down (0.94) and the release overshoot (1.06 then 1). k in 0..1 of the release. */
export const PRESS_DOWN = 0.94;
export function releaseScale(k: number): number {
  const t = clamp01(k);
  return 1 + 0.06 * Math.sin(t * Math.PI) * (1 - t);
}
