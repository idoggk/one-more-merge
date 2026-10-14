// LEVEL ROAD V2: pure helpers on top of the layout (node states, chest states, snap-to-current, momentum + rubber band). No Phaser.
import { ROAD, chapterOf, type RoadChest } from './pathGen';

export type NodeState = 'locked' | 'open' | 'current' | 'completed';
export type ChestState = 'closed' | 'open';

/** `stars` = meta.levelStars (level -> 1..3). Progress is linear: everything above `cur` is locked. */
export function nodeState(level: number, cur: number, stars: Record<string, number>): NodeState {
  if (level === cur) return 'current';
  if (level > cur) return 'locked';
  return (stars[String(level)] ?? 0) > 0 ? 'completed' : 'open';
}
export const starsOf = (level: number, stars: Record<string, number>) => Math.max(0, Math.min(3, stars[String(level)] ?? 0));

/** A milestone chest is shut until the player is past the level it follows. */
export const chestState = (c: RoadChest, cur: number): ChestState => (cur > c.afterLevel ? 'open' : 'closed');

/** A chapter gate opens once that chapter's boss is behind the player. */
export const gateOpen = (chapter: number, cur: number) => cur > chapter * ROAD.levelsPerChapter;

/** Chapter on screen: the first one (from the bottom) whose band reaches road-space y; above the last gate it stays on the last chapter. */
export function chapterAtY(chapters: readonly { chapter: number; topY: number }[], worldY: number): number {
  const sorted = [...chapters].sort((p, q) => p.chapter - q.chapter);
  for (const c of sorted) if (worldY >= c.topY) return c.chapter;
  return sorted.length ? sorted[sorted.length - 1].chapter : 1;
}

/** The scroll limits: `scroll` is the road container's y, so a road-space y shows at scroll + y. Smaller = further up the road. */
export function scrollLimits(worldTop: number, worldBottom: number, viewTop: number, viewBottom: number) {
  return { lo: viewBottom - worldBottom, hi: viewTop - worldTop };
}
export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Scroll that puts road-space `y` at `frac` of the viewport height (0 = top). Snap-to-current uses ~0.5. */
export function snapScroll(y: number, viewTop: number, viewBottom: number, lo: number, hi: number, frac = 0.5) {
  return clamp(viewTop + (viewBottom - viewTop) * frac - y, lo, hi);
}

/** Is the current node far enough off screen that a "back to me" button is worth showing? */
export const farFromCurrent = (curY: number, scroll: number, viewTop: number, viewBottom: number) => {
  const sy = curY + scroll;
  const half = (viewBottom - viewTop) / 2;
  return Math.abs(sy - (viewTop + viewBottom) / 2) > half;
};

// ---- momentum scroll ----------------------------------------------------------------------------------------------------
export const SCROLL = {
  /** velocity kept per 16.7 ms frame while coasting */
  friction: 0.95,
  /** how far past an end the road may be pulled, design px */
  overshoot: 90,
  /** below this speed (px/ms) a coast stops */
  stopSpeed: 0.02,
  /** strength of the pull back from past an end (px/ms per px, per ms) */
  spring: 0.00012,
};

/** Finger drag past an end gets harder and harder (rubber band). */
export function rubberBand(raw: number, lo: number, hi: number, over = SCROLL.overshoot): number {
  if (raw > hi) return hi + over * (1 - Math.exp(-(raw - hi) / over));
  if (raw < lo) return lo - over * (1 - Math.exp(-(lo - raw) / over));
  return raw;
}

export interface Fling {
  pos: number;
  /** px per ms */
  vel: number;
}
/** One coasting step of `dt` ms: friction inside, a spring back from past an end. Returns the new state; `rest` when it has settled. */
export function stepFling(s: Fling, dt: number, lo: number, hi: number): Fling & { rest: boolean } {
  let { pos, vel } = s;
  const out = pos > hi ? pos - hi : pos < lo ? pos - lo : 0;
  if (out !== 0) {
    vel = vel * Math.pow(0.8, dt / 16.7) - out * SCROLL.spring * dt;
    pos += vel * dt;
    if (pos <= hi && pos >= lo) return { pos: s.pos > hi ? hi : lo, vel: 0, rest: true }; // crossed back over the end: stop on it, no second bounce
    const still = (pos > hi ? pos - hi : pos < lo ? lo - pos : 0) < 0.5 && Math.abs(vel) < SCROLL.stopSpeed;
    if (still) return { pos: clamp(pos, lo, hi), vel: 0, rest: true };
    return { pos, vel, rest: false };
  }
  vel *= Math.pow(SCROLL.friction, dt / 16.7);
  pos += vel * dt;
  if (Math.abs(vel) < SCROLL.stopSpeed && pos >= lo && pos <= hi) return { pos, vel: 0, rest: true };
  return { pos, vel, rest: false };
}

/** Release velocity (px/ms) from recent samples {t ms, y}: the slope over the last ~100 ms, capped. */
export function releaseVelocity(samples: { t: number; y: number }[], now: number): number {
  const recent = samples.filter((s) => now - s.t <= 100);
  if (recent.length < 2) return 0;
  const a = recent[0], b = recent[recent.length - 1];
  const dt = b.t - a.t;
  if (dt <= 0) return 0;
  return clamp((b.y - a.y) / dt, -4, 4);
}

export { chapterOf };
