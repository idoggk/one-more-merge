/** Resource fly-in geometry (pure, no Phaser): how many icons, when each leaves, where it is on its arc. Presentation only. */

export type FlyKind = 'coin' | 'bolt' | 'gem' | 'kit';
export interface Pt {
  x: number;
  y: number;
}

export const FLY = {
  minIcons: 6,
  maxIcons: 12,
  /** amount per extra icon above the minimum */
  perIcon: 10,
  /** hard cap of live fly sprites across the scene (perf) */
  maxLive: 40,
  /** ms between two icons leaving */
  staggerMs: 55,
  /** ms an icon takes to travel */
  travelMs: 620,
  /** the arc bows this fraction of the distance (upwards) */
  arc: 0.28,
  /** the icon runs this far past the target (t > 1) and settles back */
  overshoot: 1.06,
} as const;

/** Icons for a grant: 6..12 scaled by amount; 0 for nothing; never more than `room` (live-sprite budget). */
export function flyCount(amount: number, live = 0): number {
  if (!(amount > 0)) return 0;
  const want = Math.min(FLY.maxIcons, FLY.minIcons + Math.floor(amount / FLY.perIcon));
  return Math.max(0, Math.min(want, FLY.maxLive - live));
}

/** Launch delay (ms) of icon i. */
export const staggerDelay = (i: number): number => i * FLY.staggerMs;

/** Splits an amount over n icons so the parts sum exactly to the amount (the counter ends on the real value). */
export function splitAmount(amount: number, n: number): number[] {
  if (n <= 0) return [];
  const base = Math.floor(amount / n);
  const rest = amount - base * n;
  return Array.from({ length: n }, (_, i) => base + (i < rest ? 1 : 0));
}

/** Quadratic bezier control point: the midpoint pushed up (screen y negative) by FLY.arc of the distance. */
export function controlPoint(from: Pt, to: Pt): Pt {
  const d = Math.hypot(to.x - from.x, to.y - from.y);
  return { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 - d * FLY.arc };
}

/** Point on the quadratic bezier at t (t > 1 extrapolates: the overshoot). t = 0 is `from`, t = 1 is `to`. */
export function bezier(from: Pt, ctrl: Pt, to: Pt, t: number): Pt {
  const u = 1 - t;
  return { x: u * u * from.x + 2 * u * t * ctrl.x + t * t * to.x, y: u * u * from.y + 2 * u * t * ctrl.y + t * t * to.y };
}
