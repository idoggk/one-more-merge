// ROAD PERF 2 (flag ROAD_PERF2): pure helpers for the second smoothness pass on the ROAD tab. No Phaser, no game state (tests/roadPerf2.test.ts).
// What the flag changes lives in roadV2.ts / roadPolishFx.ts: no geometry mask, a cached sky gradient, paused tweens off screen, fewer redraws.

/** Sky colours for the cached gradient texture: `rows` samples from the top of the world (row 0) to the bottom. `colorAt(worldY)` is the old per-band colour. */
export function skyRows(topY: number, bottomY: number, rows: number, colorAt: (worldY: number) => number): number[] {
  const n = Math.max(2, Math.floor(rows));
  const span = bottomY - topY;
  const out: number[] = [];
  for (let i = 0; i < n; i++) out.push(colorAt(topY + ((i + 0.5) / n) * span));
  return out;
}

/** Rows for a sky texture covering `span` world px: one row per `step` px, never more than `maxRows` (a texture side stays small for phones). */
export const skyRowCount = (span: number, step: number, maxRows: number): number => Math.max(2, Math.min(Math.floor(maxRows), Math.ceil(span / Math.max(1, step))));

/** Scroll-driven culling runs every 2nd call unless the road moved at least `minDelta` since the last real update (always runs the first time). */
export function shouldCull(call: number, scroll: number, lastScroll: number | null, minDelta = 40): boolean {
  if (lastScroll === null) return true;
  return call % 2 === 0 || Math.abs(scroll - lastScroll) >= minDelta;
}

/** At most `cap` looping tweens run at once: `want(id, visible)` says whether the tween of `id` may run now (off screen = never, over the cap = no). */
export function createTweenGate(cap: number) {
  const running = new Set<number>();
  return {
    want(id: number, visible: boolean): boolean {
      if (!visible) {
        running.delete(id);
        return false;
      }
      if (running.has(id)) return true;
      if (running.size >= cap) return false;
      running.add(id);
      return true;
    },
    running: () => running.size,
  };
}
