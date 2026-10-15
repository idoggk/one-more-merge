// ROAD PERF 3 (flag ROAD_PERF3): pure helpers for the third smoothness pass on the ROAD tab. No Phaser, no game state (tests/roadPerf3.test.ts).
// What the flag changes lives in roadV2.ts / roadPolishFx.ts / roadPerf.ts: cached chapter lookup, alpha/cloud writes only on change,
// a belt that rests while culled or moving, one update listener for the ambient wisps, and a redraw meter for the readout.

/** `chapterAtY` with the chapters sorted once and the last answer's world-y range remembered (same result as roadModel.chapterAtY). */
export function createChapterLookup(chapters: readonly { chapter: number; topY: number }[]) {
  const sorted = [...chapters].sort((p, q) => p.chapter - q.chapter);
  let lo = 1, hi = 0, last = 1; // empty range until the first lookup
  return (worldY: number): number => {
    if (worldY >= lo && worldY < hi) return last;
    let upper = Infinity;
    for (const c of sorted) {
      if (worldY >= c.topY) {
        last = c.chapter;
        lo = c.topY;
        hi = upper;
        return last;
      }
      upper = Math.min(upper, c.topY);
    }
    last = sorted.length ? sorted[sorted.length - 1].chapter : 1;
    lo = -Infinity;
    hi = upper;
    return last;
  };
}

/** Alpha of a world element fading out under the header chip (0 at/above y 170 on screen, 1 from 280 down). */
export const fadeAlpha = (worldY: number, scroll: number): number => Math.min(1, Math.max(0, (worldY + scroll - 170) / 110));

/** Remembers the last value written per key: `changed(key, v)` is true only the first time or when `v` differs, and records it. */
export function createChangeMemo() {
  const seen = new Map<number, number>();
  return {
    changed(key: number, v: number): boolean {
      if (seen.get(key) === v) return false;
      seen.set(key, v);
      return true;
    },
  };
}

/** Belt dashes are redrawn at most `hz` times a second, and not while the world span is off screen or the road moved in the last `restMs`. */
export function beltShouldDraw(nowMs: number, lastDrawMs: number, lastMoveMs: number, inView: boolean, hz = 15, restMs = 120): boolean {
  if (!inView) return false;
  if (nowMs - lastMoveMs < restMs) return false;
  return nowMs - lastDrawMs >= 1000 / hz;
}

/** One listener's worth of wisp updates: `wisps` get `setY(y(roadY))` only when the road moved since the last pass. */
export function createWispPass<T>(wisps: T[], place: (w: T, roadY: number) => void) {
  let lastRoadY: number | null = null;
  return (roadY: number): boolean => {
    if (roadY === lastRoadY) return false;
    lastRoadY = roadY;
    for (const w of wisps) place(w, roadY);
    return true;
  };
}

/** Redraw meter for the readout: calls and milliseconds spent in the road's redraw, reported per second. */
export function createRedrawMeter() {
  let calls = 0, ms = 0, since: number | null = null;
  let rate = { callsPerSec: 0, msPerSec: 0 };
  return {
    record(durationMs: number) {
      calls++;
      ms += durationMs;
    },
    /** call whenever the readout refreshes; returns the latest per-second figures (rolled over once at least 1 s has passed) */
    sample(nowMs: number) {
      if (since === null) since = nowMs;
      const dt = nowMs - since;
      if (dt >= 1000) {
        rate = { callsPerSec: Math.round((calls * 1000) / dt), msPerSec: Math.round((ms * 1000) / dt) };
        calls = 0;
        ms = 0;
        since = nowMs;
      }
      return rate;
    },
  };
}
