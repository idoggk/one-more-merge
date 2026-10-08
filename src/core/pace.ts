import type { GameState } from './game';
import { replayRun, type RunLog } from './replay';

/** Ghost pace (r46): the best winning run of a saga level as a compact progress-over-time curve, so a replay can show
 *  "2.1 s ahead / 1.4 s behind" by the HP bar. Built from the r43 run log (the run is replayed, not recorded twice).
 *  `t` = win time in seconds, `p` = PACE_SAMPLES progress values (0..1 of the level's total HP) evenly spaced over
 *  [0, t], each as 2 base-36 chars (0..1295). */
export interface PaceCurve {
  t: number;
  p: string;
}

export const PACE_SAMPLES = 32;
const SCALE = 36 * 36 - 1;

/** Share of the level's total machine HP dealt so far (0..1); null when the level has no HP race (goal levels, not a level). */
export function levelProgress(s: GameState): number | null {
  if (s.level === undefined || s.goal || s.puzzle) return null;
  const st = s.stage;
  if (st?.goal) return null;
  const left = Math.max(0, s.hp);
  if (!st) return Math.min(1, Math.max(0, 1 - left / s.maxHp));
  return Math.min(1, Math.max(0, (st.done + s.maxHp - left) / st.total));
}

/** Resample (elapsed, progress) points (elapsed ascending) to PACE_SAMPLES values over [0, t]. */
export function buildCurve(points: [number, number][], t: number): PaceCurve | null {
  if (!(t > 0) || !points.length) return null;
  const out: number[] = [];
  let j = 0;
  let last = 0;
  for (let i = 0; i < PACE_SAMPLES; i++) {
    const at = (t * i) / (PACE_SAMPLES - 1);
    // progress at `at` = the latest point at or before it (progress is a step function of the ticks)
    while (j < points.length && points[j][0] <= at + 1e-9) last = Math.max(last, points[j++][1]);
    out.push(i === PACE_SAMPLES - 1 ? Math.max(last, points[points.length - 1][1]) : last);
  }
  return { t: Math.round(t * 10) / 10, p: out.map((v) => Math.round(Math.min(1, Math.max(0, v)) * SCALE).toString(36).padStart(2, '0')).join('') };
}

export function decodeCurve(c: PaceCurve): number[] | null {
  if (typeof c?.p !== 'string' || c.p.length !== PACE_SAMPLES * 2 || !(c.t > 0)) return null;
  const out: number[] = [];
  for (let i = 0; i < c.p.length; i += 2) {
    const v = parseInt(c.p.slice(i, i + 2), 36);
    if (Number.isNaN(v)) return null;
    out.push(v / SCALE);
  }
  return out;
}

/** Replay a winning level's log and sample its progress on every tick. */
export function paceFromLog(log: RunLog): PaceCurve | null {
  const points: [number, number][] = [];
  const end = replayRun(log, log.actions.length, (s) => {
    const p = levelProgress(s);
    if (p !== null) points.push([s.elapsed, p]);
  });
  if (!end || end.phase !== 'won') return null;
  return buildCurve(points, end.elapsed);
}

/** Store `next` as the level's ghost when there is none yet or it wins faster. Returns true when it was stored. */
export function updatePace(store: Record<string, PaceCurve>, key: string, next: PaceCurve | null): boolean {
  if (!next) return false;
  const prev = store[key];
  if (prev && decodeCurve(prev) && prev.t <= next.t) return false;
  store[key] = next;
  return true;
}

/** The ghost's progress at elapsed `e` (linear between samples). */
export function ghostProgress(c: PaceCurve, e: number): number {
  const v = decodeCurve(c);
  if (!v) return 0;
  const x = (Math.max(0, e) / c.t) * (PACE_SAMPLES - 1);
  if (x >= PACE_SAMPLES - 1) return v[PACE_SAMPLES - 1];
  const i = Math.floor(x);
  return v[i] + (v[i + 1] - v[i]) * (x - i);
}

/** First time the ghost reached progress `p` (its win time if it never did). */
function ghostTimeAt(v: number[], t: number, p: number): number {
  const dt = t / (PACE_SAMPLES - 1);
  if (p <= v[0]) return 0;
  for (let i = 1; i < v.length; i++)
    if (v[i] >= p) return dt * (i - 1 + (v[i] > v[i - 1] ? (p - v[i - 1]) / (v[i] - v[i - 1]) : 1));
  return t;
}

/** Seconds ahead (+) or behind (-) of the ghost: when the player has `p` at elapsed `e`, how much earlier or later
 *  than the ghost they got there. Level with the ghost (same progress now) = 0. */
export function paceDelta(c: PaceCurve, e: number, p: number): number {
  const v = decodeCurve(c);
  if (!v) return 0;
  const g = ghostProgress(c, e);
  const eps = 0.5 / SCALE;
  if (Math.abs(g - p) <= eps) return 0;
  return ghostTimeAt(v, c.t, p) - e;
}

/** "2.1 s ahead" / "1.4 s behind" / "on pace". */
export function paceLabel(d: number): string {
  const a = Math.abs(d);
  if (a < 0.05) return 'on pace';
  return `${a.toFixed(1)} s ${d > 0 ? 'ahead' : 'behind'}`;
}
