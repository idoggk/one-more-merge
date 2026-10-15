// ROAD PERF 4 (flag ROAD_PERF4): pure helpers for the road's scroll timing. No Phaser, no game state (tests/roadPerf4.test.ts).
// The old road coasted by Phaser's smoothed frame delta capped at 50 ms and timed finger samples with the frame clock, so on a slow phone
// (frames of 60-150 ms) the coast ran in slow motion and the release speed was misread. These use the real clock instead.

/** Real milliseconds since the last frame, 0 when there is no previous frame, never more than `cap` (a stall must not make the road leap). */
export const realDt = (nowMs: number, lastMs: number | null, cap = 100): number => (lastMs === null ? 0 : Math.min(cap, Math.max(0, nowMs - lastMs)));

/** Time stamp of a pointer event in the performance.now() clock: the browser's own event time when it has one, else `fallbackMs`. */
export const eventTime = (ev: { timeStamp?: number } | undefined | null, fallbackMs: number): number => (ev && typeof ev.timeStamp === 'number' && ev.timeStamp > 0 ? ev.timeStamp : fallbackMs);
