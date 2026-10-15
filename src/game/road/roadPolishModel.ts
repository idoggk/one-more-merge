// ROAD POLISH (flag ROAD_POLISH, on top of levelRoadV2): pure helpers for parallax, belt stripe, ambient caps, avatar travel, node and chest
// visuals. No Phaser, no game state: everything here is presentation maths (tests/roadPolish.test.ts).
import type { NodeKind } from './pathGen';
import type { ChestState, NodeState } from './roadModel';

export interface Pt {
  x: number;
  y: number;
}

// ---- parallax -----------------------------------------------------------------------------------------------------------------
/** Scroll factor per layer (1 = moves with the road). Far layer was a flat 0.8; the polish spreads the layers apart. */
export const PARALLAX = { far: 0.55, ground: 0.8, road: 1, foreground: 1.25 } as const;
export type ParallaxLayer = keyof typeof PARALLAX;

/** Screen y of a layer item whose road-space y is `y`, when the road is scrolled by `scroll` and the view is centred on `mid`. */
export const layerY = (y: number, scroll: number, mid: number, k: number) => mid + (scroll + y - mid) * k;

// ---- belt stripe ----------------------------------------------------------------------------------------------------------------
/** Offset 0..period of the moving belt stripe after `ms` at `speed` px/s. Always inside [0, period). */
export function beltOffset(ms: number, speed: number, period: number): number {
  if (period <= 0) return 0;
  const o = ((ms / 1000) * speed) % period;
  return o < 0 ? o + period : o;
}

// ---- path interpolation ---------------------------------------------------------------------------------------------------------
/** Total length of a polyline. */
export function pathLength(pts: readonly Pt[]): number {
  let len = 0;
  for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  return len;
}

/** Point at fraction t (0..1, clamped) of the polyline's arc length. */
export function pointAt(pts: readonly Pt[], t: number): Pt {
  if (!pts.length) return { x: 0, y: 0 };
  if (pts.length === 1) return { ...pts[0] };
  const total = pathLength(pts);
  const tt = Math.min(1, Math.max(0, t));
  if (total === 0) return { ...pts[0] };
  let want = tt * total;
  for (let i = 1; i < pts.length; i++) {
    const seg = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    if (want <= seg || i === pts.length - 1) {
      const f = seg === 0 ? 0 : Math.min(1, want / seg);
      return { x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * f, y: pts[i - 1].y + (pts[i].y - pts[i - 1].y) * f };
    }
    want -= seg;
  }
  return { ...pts[pts.length - 1] };
}

/** Concatenate segment polylines (each starts where the last ended), dropping the duplicated joint. */
export function joinPaths(paths: readonly (readonly Pt[])[]): Pt[] {
  const out: Pt[] = [];
  for (const p of paths) out.push(...(out.length ? p.slice(1) : p));
  return out;
}

export interface HopFrame extends Pt {
  /** 0..1 along the whole path */
  t: number;
  /** index of the hop being made, 0-based */
  hop: number;
  /** squash on landing: scaleY factor (1 = none) */
  squash: number;
  /** true during the short landing window of each hop */
  landing: boolean;
}

/** Avatar frame at overall progress p (0..1) when it covers `pts` in `hops` equal hops, each an arc of height `lift`. */
export function hopFrame(pts: readonly Pt[], p: number, hops: number, lift: number): HopFrame {
  const n = Math.max(1, Math.round(hops));
  const pp = Math.min(1, Math.max(0, p));
  const scaled = pp * n;
  const hop = Math.min(n - 1, Math.floor(scaled));
  const local = pp >= 1 ? 1 : scaled - hop; // 0..1 inside this hop
  const base = pointAt(pts, pp);
  const arc = Math.sin(local * Math.PI); // 0 at takeoff and landing
  const landing = local > 0.82 || (hop > 0 && local < 0.08);
  const squash = landing ? 0.84 + 0.16 * Math.min(1, Math.abs(local > 0.5 ? 1 - local : local) / 0.18) : 1;
  return { x: base.x, y: base.y - arc * lift, t: pp, hop, squash, landing };
}

/** Hop count for a path of this length: one hop per ~140 design px, 3..5. */
export const hopCount = (len: number) => Math.min(5, Math.max(3, Math.round(len / 140)));

/** Belt stripe: dash pieces (start, end points) along a polyline, the pattern shifted by `offset` px so it appears to move. */
export function dashSegments(pts: readonly Pt[], offset: number, dash: number, gap: number): [Pt, Pt][] {
  const period = dash + gap;
  const total = pathLength(pts);
  if (pts.length < 2 || period <= 0 || dash <= 0 || total === 0) return [];
  const out: [Pt, Pt][] = [];
  const first = ((offset % period) + period) % period;
  for (let s = first - period; s < total; s += period) {
    const a = Math.max(0, s), b = Math.min(total, s + dash);
    if (b > a) out.push([pointAt(pts, a / total), pointAt(pts, b / total)]);
  }
  return out;
}

/** Ground pattern per chapter (option B of the brainstorm: code-drawn ground, identity from props). */
export type GroundStyle = 'grid' | 'planks' | 'diag';
export const GROUND_STYLE: GroundStyle[] = ['grid', 'grid', 'planks', 'diag', 'planks', 'grid', 'planks', 'diag'];
export const groundStyleOf = (chapter: number) => GROUND_STYLE[(Math.max(1, chapter) - 1) % GROUND_STYLE.length];

// ---- node and chest visuals -----------------------------------------------------------------------------------------------------
export interface NodeVisual {
  /** idle motion of the medallion */
  motion: 'none' | 'pulse' | 'stars' | 'flutter' | 'breathe';
  /** tapping it shakes it (locked) */
  shakeOnTap: boolean;
  /** gold rim ring */
  rim: boolean;
}
/** State mapping of docs/art/BRAINSTORM_MOTION_ROAD.md 2.7. Boss levels breathe; hard/mega ribbons flutter. */
export function nodeVisual(state: NodeState, kind: NodeKind, ribbon: 'none' | 'hard' | 'mega'): NodeVisual {
  if (state === 'locked') return { motion: 'none', shakeOnTap: true, rim: false };
  if (state === 'current') return { motion: 'pulse', shakeOnTap: false, rim: true };
  const base: NodeVisual = { motion: state === 'completed' ? 'stars' : 'none', shakeOnTap: false, rim: false };
  if (kind === 'boss') return { ...base, motion: 'breathe' };
  if (ribbon !== 'none') return { ...base, motion: base.motion === 'stars' ? 'stars' : 'flutter' };
  return base;
}

export type ChestVisual = 'closed' | 'ready' | 'open';
/** A chest is READY (rattles, sparkles) while the player stands on the level it follows. */
export function chestVisual(state: ChestState, afterLevel: number, cur: number): ChestVisual {
  if (state === 'open') return 'open';
  return cur === afterLevel ? 'ready' : 'closed';
}

// ---- ambient life ---------------------------------------------------------------------------------------------------------------
/** Hard cap of ambient sprites on screen (steam, birds, sparkles, foreground wisps). */
export const AMBIENT_CAP = 3;
/** the cap before ROAD PERF 2 (kept for the flag-off comparison) */
export const AMBIENT_CAP_OLD = 6;
export interface AmbientSpot {
  id: string;
  /** road-space y */
  y: number;
}
/** Pick at most `cap` spots, nearest to the view centre first (so the cap is spent on what the player sees). */
export function pickAmbient(spots: readonly AmbientSpot[], centerY: number, range: number, cap = AMBIENT_CAP): AmbientSpot[] {
  return spots
    .filter((s) => Math.abs(s.y - centerY) <= range)
    .sort((a, b) => Math.abs(a.y - centerY) - Math.abs(b.y - centerY) || (a.id < b.id ? -1 : 1))
    .slice(0, Math.max(0, cap));
}

// ---- unlock sequence --------------------------------------------------------------------------------------------------------------
export interface UnlockStep {
  name: 'scroll' | 'crack' | 'draw' | 'pop';
  at: number;
  dur: number;
}
/** Timeline in ms after the road opens; total under 1500. Scroll first, lock cracks, gold path draws, node pops. */
export const UNLOCK_TIMELINE: readonly UnlockStep[] = [
  { name: 'scroll', at: 0, dur: 600 },
  { name: 'crack', at: 450, dur: 350 },
  { name: 'draw', at: 600, dur: 450 },
  { name: 'pop', at: 1000, dur: 350 },
];
export const unlockTotal = () => Math.max(...UNLOCK_TIMELINE.map((s) => s.at + s.dur));
/** 0..1 progress of one step at time `ms`. */
export function stepProgress(step: UnlockStep, ms: number): number {
  return Math.min(1, Math.max(0, (ms - step.at) / step.dur));
}

/** The levels a "progress" travel covers: from the last level the road showed to the current one. Null when there is nothing to animate. */
export function travelSpan(lastShown: number | null, cur: number, maxHopLevels = 3): { from: number; to: number } | null {
  if (lastShown == null || cur <= lastShown) return null;
  return { from: Math.max(lastShown, cur - maxHopLevels), to: cur };
}
