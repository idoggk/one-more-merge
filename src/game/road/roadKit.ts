// ROAD SURFACE KIT (flag ROAD_SURFACE_KIT, default OFF): pure path-to-pieces conversion. Pure: no Phaser (tested in tests/roadKit.test.ts).
// The kit (art-candidates/road-surface-kit-b4) is 12 pieces per chapter in 512 px cells, road band 205 px wide, open edges on the cell border
// midpoints. Texture keys: road_<chapter>_<piece>, e.g. road_ch3_curve_ne. The art is NOT in src/assets yet; until it is, every segment falls back.
//
// DOCUMENTED APPROXIMATION. The kit is cell-aligned (every piece joins at an edge midpoint) but the level road is a smooth polyline, so:
//  1. each segment is cut into n equal arc-length steps of about one cell; one piece is centred on each step (no exact edge-to-edge join; the
//     existing ground stroke under the road hides the small gaps and overlaps; pieces are transparent outside the road band);
//  2. at a step the heading just before and just after the centre is measured. A turn of 30..120 degrees whose two headings snap to different
//     cardinal directions gets the curve piece joining those two edges (left and right turns both); the piece is NOT rotated, the turn is
//     snapped to 90 degrees;
//  3. everything else gets straight_h (headings nearer horizontal) or straight_v (nearer vertical) rotated by the residual angle (|rot| <= 45 deg),
//     so diagonals are stamped as rotated straights;
//  4. a segment the kit cannot cover is NOT stamped and the caller draws the existing road for it: a turn over 120 degrees (hairpin), a missing
//     texture, too many pieces for one segment, an empty segment, or the global piece cap reached.
// t_junction, cross, dead_end, s_curve_a/b and shoulder_edge are in the manifest but a single polyline never needs them yet.

export const KIT_CHAPTERS = 8;
export const KIT_PIECES = ['straight_h', 'straight_v', 'curve_ne', 'curve_nw', 'curve_se', 'curve_sw', 's_curve_a', 's_curve_b', 't_junction', 'cross', 'dead_end', 'shoulder_edge'] as const;
export type KitPiece = (typeof KIT_PIECES)[number];

/** Art cell and road band, in source px. */
export const KIT_CELL = 512;
export const KIT_ROAD_W = 205;
/** Display scale: 0.4 makes the kit road 82 px wide, close to the 78 px outlined stroke it replaces. */
export const KIT_SCALE = 0.4;
export const KIT_CELL_PX = KIT_CELL * KIT_SCALE;
/** Caps: pieces per segment and per road (a segment is about 1 to 3 pieces, 80 segments in the world). */
export const KIT_MAX_PER_SEGMENT = 12;
export const KIT_MAX_TOTAL = 400;
/** Turn window (radians) in which a curve piece is used; beyond the top the segment falls back. */
export const KIT_CURVE_MIN = (30 * Math.PI) / 180;
export const KIT_CURVE_MAX = (120 * Math.PI) / 180;

export const kitKey = (chapter: number, piece: KitPiece): string => `road_ch${chapter}_${piece}`;
/** Every texture key the kit needs: 8 chapters x 12 pieces = 96. Art lands as src/assets/art/<key>.webp or .png once approved. */
export const kitManifest = (): string[] => {
  const out: string[] = [];
  for (let c = 1; c <= KIT_CHAPTERS; c++) for (const p of KIT_PIECES) out.push(kitKey(c, p));
  return out;
};

type Pt = { x: number; y: number };
export interface KitStamp {
  piece: KitPiece;
  key: string;
  x: number;
  y: number;
  /** radians, clockwise on screen (Phaser rotation) */
  rot: number;
}
export type FallbackReason = 'empty' | 'hairpin' | 'missing_texture' | 'too_long' | 'cap';
export type KitPlan = { covered: true; stamps: KitStamp[] } | { covered: false; reason: FallbackReason };
export interface KitOpts {
  chapter: number;
  /** is this texture key available? (scene.hasArt) */
  has: (key: string) => boolean;
  cellPx?: number;
  maxPerSegment?: number;
  /** pieces the caller already stamped elsewhere in this road */
  used?: number;
  maxTotal?: number;
}

const TAU = Math.PI * 2;
const norm = (a: number) => {
  const r = ((((a + Math.PI) % TAU) + TAU) % TAU) - Math.PI;
  return r;
};
type Dir = 'N' | 'E' | 'S' | 'W';
const CARD: Dir[] = ['E', 'S', 'W', 'N']; // heading 0, +90, 180, -90 (screen y is down)
export const cardinal = (h: number): Dir => CARD[((Math.round(norm(h) / (Math.PI / 2)) % 4) + 4) % 4];
const OPP: Record<Dir, Dir> = { N: 'S', S: 'N', E: 'W', W: 'E' };

/** The curve piece joining two cardinal directions of travel, or null when they are equal or opposite. Travel north then east enters at the S edge. */
export function curveFor(cin: Dir, cout: Dir): KitPiece | null {
  if (cin === cout || OPP[cin] === cout) return null;
  const edges = [OPP[cin], cout];
  const ns = edges.includes('N') ? 'n' : 's';
  const ew = edges.includes('E') ? 'e' : 'w';
  return `curve_${ns}${ew}` as KitPiece;
}

/** Point and unit-less heading data along a polyline by arc length. */
function pointAt(pts: readonly Pt[], cum: number[], d: number): Pt {
  const total = cum[cum.length - 1];
  const t = Math.max(0, Math.min(total, d));
  let i = 1;
  while (i < cum.length - 1 && cum[i] < t) i++;
  const span = cum[i] - cum[i - 1] || 1;
  const k = (t - cum[i - 1]) / span;
  return { x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * k, y: pts[i - 1].y + (pts[i].y - pts[i - 1].y) * k };
}

/** Straight piece and rotation for a heading: horizontal-ish uses straight_h, vertical-ish straight_v; the residual is within 45 degrees. */
export function straightFor(h: number): { piece: KitPiece; rot: number } {
  const hh = norm(h);
  const ax = Math.abs(Math.cos(hh)) >= Math.abs(Math.sin(hh));
  const axis = ax ? 0 : Math.PI / 2;
  // residual modulo 180 degrees (a straight looks the same both ways)
  let rot = norm(hh - axis);
  if (rot > Math.PI / 2) rot -= Math.PI;
  if (rot < -Math.PI / 2) rot += Math.PI;
  return { piece: ax ? 'straight_h' : 'straight_v', rot };
}

/** Convert one segment polyline into stamps, or say why the kit cannot cover it. */
export function planSegment(pts: readonly Pt[], o: KitOpts): KitPlan {
  const cellPx = o.cellPx ?? KIT_CELL_PX;
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
  const len = cum[cum.length - 1] ?? 0;
  if (pts.length < 2 || !(len > 1)) return { covered: false, reason: 'empty' };
  const n = Math.max(1, Math.round(len / cellPx));
  if (n > (o.maxPerSegment ?? KIT_MAX_PER_SEGMENT)) return { covered: false, reason: 'too_long' };
  if ((o.used ?? 0) + n > (o.maxTotal ?? KIT_MAX_TOTAL)) return { covered: false, reason: 'cap' };
  const step = len / n;
  const half = Math.min(step, cellPx) / 2;
  const stamps: KitStamp[] = [];
  for (let i = 0; i < n; i++) {
    const d = (i + 0.5) * step;
    const c = pointAt(pts, cum, d);
    const a = pointAt(pts, cum, d - half), b = pointAt(pts, cum, d + half);
    const hin = Math.atan2(c.y - a.y, c.x - a.x), hout = Math.atan2(b.y - c.y, b.x - c.x);
    const turn = Math.abs(norm(hout - hin));
    if (turn > KIT_CURVE_MAX) return { covered: false, reason: 'hairpin' };
    let piece: KitPiece, rot = 0;
    const curve = turn >= KIT_CURVE_MIN ? curveFor(cardinal(hin), cardinal(hout)) : null;
    if (curve) piece = curve;
    else ({ piece, rot } = straightFor(Math.atan2(b.y - a.y, b.x - a.x)));
    const key = kitKey(o.chapter, piece);
    if (!o.has(key)) return { covered: false, reason: 'missing_texture' };
    stamps.push({ piece, key, x: c.x, y: c.y, rot });
  }
  return { covered: true, stamps };
}

/** Plan a whole road: the running total enforces the global cap (later segments fall back once it is reached). */
export function planRoad<S extends { from: number; pts: readonly Pt[] }>(segments: readonly S[], chapterOf: (seg: S) => number, has: (key: string) => boolean, maxTotal = KIT_MAX_TOTAL): Map<S, KitPlan> {
  const out = new Map<S, KitPlan>();
  let used = 0;
  for (const seg of segments) {
    const plan = planSegment(seg.pts, { chapter: chapterOf(seg), has, used, maxTotal });
    if (plan.covered) used += plan.stamps.length;
    out.set(seg, plan);
  }
  return out;
}

/** World-y span of a plan's pieces, for roadPerf culling (a rotated cell reaches half a diagonal from its centre). */
export function stampSpan(stamps: readonly KitStamp[], cellPx = KIT_CELL_PX): { minY: number; maxY: number } {
  const r = (cellPx * Math.SQRT2) / 2;
  return { minY: Math.min(...stamps.map((s) => s.y)) - r, maxY: Math.max(...stamps.map((s) => s.y)) + r };
}

/** Code placeholder for a piece when the texture is missing (ROAD KIT PREVIEW): a polygon in cell-centred px (x right, y down, cell = KIT_CELL). */
export function placeholderOutline(piece: KitPiece): Pt[] {
  const hw = KIT_ROAD_W / 2, h = KIT_CELL / 2;
  if (piece === 'straight_h') return [{ x: -h, y: -hw }, { x: h, y: -hw }, { x: h, y: hw }, { x: -h, y: hw }];
  if (piece === 'straight_v') return [{ x: -hw, y: -h }, { x: hw, y: -h }, { x: hw, y: h }, { x: -hw, y: h }];
  const m = /^curve_([ns])([ew])$/.exec(piece);
  if (!m) return [{ x: -hw, y: -hw }, { x: hw, y: -hw }, { x: hw, y: hw }, { x: -hw, y: hw }]; // other pieces: a plain pad
  const cx = m[2] === 'e' ? h : -h, cy = m[1] === 's' ? h : -h; // arc centre = the corner between the two open edges
  const aA = Math.atan2(0, -cx); // from the N or S edge midpoint (0, +-h), which lies level with the corner...
  const aB = Math.atan2(-cy, 0); // ...to the E or W edge midpoint (+-h, 0), which lies straight above or below it
  const sweep = norm(aB - aA);
  const rOut = h + hw, rIn = h - hw, steps = 8;
  const pts: Pt[] = [];
  for (let i = 0; i <= steps; i++) pts.push({ x: cx + Math.cos(aA + (sweep * i) / steps) * rOut, y: cy + Math.sin(aA + (sweep * i) / steps) * rOut });
  for (let i = steps; i >= 0; i--) pts.push({ x: cx + Math.cos(aA + (sweep * i) / steps) * rIn, y: cy + Math.sin(aA + (sweep * i) / steps) * rIn });
  return pts;
}
