// LEVEL PACE 2 maths (t-a177b529): the median-clear-time floor curve and the HP search that meets it. Pure; no game imports,
// so tests/levelPace2.test.ts can check it. tools/sim-levels.ts --pace2 plays the levels and feeds the measurements in.

/** Levels labelled MANIA: about one per chapter, short and intense on purpose (docs/design/LEVEL_DURATION.md section 5). */
export const MANIA_LEVELS = [5, 15, 25, 35, 45, 55, 65, 75];
export const isMania = (L: number) => MANIA_LEVELS.includes(L);
export const isBossLevel = (L: number) => L % 10 === 0;
export const isMiniLevel = (L: number) => L % 10 === 8;

/** Normal-level floor in seconds (thinker AND fast bot): L1-3 tutorial 45, 60 up to L15, ramp to 90 at L30, 120 at L50, flat after. */
export function baseFloor(L: number): number {
  if (L <= 3) return 45;
  if (L <= 15) return 60;
  if (L <= 30) return 60 + ((L - 15) / 15) * 30;
  if (L <= 50) return 90 + ((L - 30) / 20) * 30;
  return 120;
}
/** Floor for one level: bosses and mini-bosses +30%, MANIA levels about half (30 s at the start, never below 30). */
export function floorFor(L: number): number {
  const b = baseFloor(L);
  if (isMania(L)) return Math.max(30, Math.round(b / 2));
  return Math.round(isBossLevel(L) || isMiniLevel(L) ? b * 1.3 : b);
}
/** Clock (level time) for a floor: the thinker's median sits about at the floor, so the clock is ~1.8x it, in steps of 5 s, never below today's. */
export const clockFor = (floor: number, current: number) => Math.max(current, Math.ceil((floor * 1.8) / 5) * 5);
/** The thinker must not run past this multiple of the floor while the fast bot is pushed up (otherwise the clock decides the level). */
export const THINKER_CEIL = 1.15;

export const median = (a: number[]): number => {
  const x = a.filter(Number.isFinite).sort((p, q) => p - q);
  return x.length ? x[Math.floor(x.length / 2)] : NaN;
};
export const r50 = (x: number) => Math.max(100, Math.round(x / 50) * 50);

/** Smallest k in [lo, hi] (log-space bisection, `iters` steps) with ok(k); `hi` when none; assumes ok is monotone (noisy: fine). */
export function smallestK(ok: (k: number) => boolean, lo: number, hi: number, iters = 7): number {
  if (ok(lo)) return lo;
  let a = Math.log(lo), b = Math.log(hi);
  for (let i = 0; i < iters; i++) {
    const m = (a + b) / 2;
    if (ok(Math.exp(m))) b = m;
    else a = m;
  }
  return Math.exp(b);
}
/** Largest k in [lo, hi] with ok(k); `lo` when none. */
export function largestK(ok: (k: number) => boolean, lo: number, hi: number, iters = 7): number {
  if (ok(hi)) return hi;
  let a = Math.log(lo), b = Math.log(hi);
  for (let i = 0; i < iters; i++) {
    const m = (a + b) / 2;
    if (ok(Math.exp(m))) a = m;
    else b = m;
  }
  return Math.exp(a);
}

export interface PaceMeasure {
  /** median clear seconds of the winning thinker runs (3 s per merge) */
  thinker: number;
  /** median clear seconds of the winning fast runs (1 s per merge) */
  fast: number;
}
/**
 * The HP multiplier k (on the level's CURRENT hp / minion_hp) for one level:
 *  1. the smallest k where the thinker's median reaches `floor` (never lowers HP unless kMin < 1 (MANIA levels));
 *  2. if the fast bot is still under the floor, raise k while the thinker stays under THINKER_CEIL x floor.
 * `thinker(k)` and `fast(k)` each play the level and return a median; they are called lazily and cached by the caller if wanted.
 */
export function fitK(floor: number, thinker: (k: number) => number, fast: (k: number) => number, push = true, kMin = 1, kMax = 32): { k: number; fastMet: boolean } {
  const need = floor * 1.03; // the medians are noisy: aim a little above
  const k1 = smallestK((k) => thinker(k) >= need, kMin, kMax);
  if (!push || fast(k1) >= need) return { k: k1, fastMet: fast(k1) >= need };
  const kCeil = largestK((k) => thinker(k) <= floor * THINKER_CEIL, k1, kMax);
  const k2 = smallestK((k) => fast(k) >= need, k1, kCeil);
  return { k: k2, fastMet: fast(k2) >= need };
}
