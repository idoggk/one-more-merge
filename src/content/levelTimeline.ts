// LEVEL TIMELINE (t-141225ee, docs/design/LEVEL_TIMELINE.md): a clear-time floor that does not depend on merge speed.
// ON (and only with LEVEL PACE 2 ON) the machines' armor opens on a clock sized from the per-level floor `floor_s` of
// levelPace2.json (written by tools/write-floors.ts): damage a fast player deals early is BANKED, never lost, and lands as
// the armor opens. The flag lives outside TUNING (like LEVEL_PACE2) so the flags-off golden is untouched.
import { LEVEL_PACE2, PACE2_DATA } from './levelPace2';

export const LEVEL_TIMELINE_KEY = 'omm_qa_level_timeline';
export const LEVEL_TIMELINE = { on: false };
/** The armor is fully open at this share of the floor (the last blows land right after, so a 1 s/merge player clears at about the floor). */
export const TIMELINE_SPAN_SHARE = 0.97;

export function applyLevelTimeline(on: boolean) {
  LEVEL_TIMELINE.on = on;
}
export function storedLevelTimeline(read: () => string | null): boolean {
  try {
    return read() === 'on';
  } catch {
    return false;
  }
}

/** Seconds until the armor of `level` is fully open, or undefined when the timeline does not apply (flag off, PACE 2 off, MANIA, no floor). */
export function timelineSpan(level: number): number | undefined {
  if (!LEVEL_TIMELINE.on || !LEVEL_PACE2.on) return undefined;
  const e = PACE2_DATA[String(level)];
  if (!e || e.mania || !e.floor_s) return undefined;
  return e.floor_s * TIMELINE_SPAN_SHARE;
}

/** The pure release rule: how much of `bank` may land now. `applied` is what already landed, `total` the HP the timeline covers. */
export function timelineRelease(tl: { span: number; total: number; bank: number; applied: number }, elapsed: number): number {
  const allowed = elapsed >= tl.span ? Infinity : tl.total * (elapsed / tl.span);
  return Math.max(0, Math.min(tl.bank, Math.floor(allowed - tl.applied)));
}
