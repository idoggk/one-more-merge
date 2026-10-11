// Imported FIRST by the render harness: a fixed clock and a seeded Math.random, so everything the real scenes draw (daily seeds,
// particle jitter, Phaser's own RNG seeding) comes out identical on every run.
// Phaser's TweenManager measures its delta with Date.now(), so the clock is not frozen: it is virtual and the harness advances it
// by exactly one frame (1000/60 ms) per game step.
export const clock = { t: 0 };
const RealDate = Date;
const FIXED = RealDate.UTC(2026, 9, 11, 12, 0, 0);
const virtualNow = () => FIXED + Math.floor(clock.t);
class FixedDate extends RealDate {
  constructor(...args: unknown[]) {
    if (args.length === 0) super(virtualNow());
    else super(...(args as [number]));
  }
  static override now() {
    return virtualNow();
  }
}
globalThis.Date = FixedDate as unknown as DateConstructor;

let seed = 0x9e3779b9;
Math.random = () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};


