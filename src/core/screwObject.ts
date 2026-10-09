// SCREW YARD "A" (t-9adea8b8, owner pick 2026-10-09: "play like Screwdom 3D"): take a turnable object apart.
// The object is a coarse 3D grid of blocks; screws sit on block faces (front / back / left / right / top) with a colour.
// The player turns the object between 4 snapped views. A screw can come out when its face looks at the camera (top
// faces always do) and no block is painted over its head on screen (see "the screen" below); a block falls off when
// its last screw is out, which uncovers what was behind it. Screws go into the 2 open colour boxes (3 each, the next
// 2 colours shown) or wait in the holding row; a full row loses. Helpers: Broom (row -> side tray that refills boxes later), Hammer (break one block), Drill
// (+1 row slot). Pure + deterministic; the box / queue / row part is screw.ts's (settle, fitSlot), so the old yard is
// untouched. Behind the QA switch SCREW YARD: OLD / OBJECT until the owner feel-tests it.
import { BOX_SIZE, fitSlot, settle, type Box, type YardRules } from './screw';

/** Holding-row slots (owner still to confirm: 5, or a tighter 4). A full row = the yard is lost. */
export const ROW_SIZE = 5;
/** When a new box opens, waiting row screws of its colour fly into it by themselves (off = tap the row screw). */
export const AUTO_JUMP = true;
export const OPEN_BOXES = 2;
export const PREVIEW = 2;

export type Face = 'front' | 'right' | 'back' | 'left' | 'top';
/** 0 front, 1 right, 2 back, 3 left: the side the camera looks at (turning right = view + 1). */
export type View = 0 | 1 | 2 | 3;
export const VIEW_FACE: Face[] = ['front', 'right', 'back', 'left'];
export const VIEW_NAMES = ['FRONT', 'RIGHT', 'BACK', 'LEFT'];
/** Outward normal of each face: x right, y up, z towards the front. */
export const FACE_DIR: Record<Face, [number, number, number]> = { front: [0, 0, 1], back: [0, 0, -1], right: [1, 0, 0], left: [-1, 0, 0], top: [0, 1, 0] };

export interface OBlock {
  id: number;
  x: number;
  y: number;
  z: number;
  /** Art tint index (procedural planks). */
  tint: number;
  screws: number[];
}
export interface OScrew {
  id: number;
  block: number;
  face: Face;
  color: number;
}
export interface ObjectDef {
  id: string;
  name: string;
  blocks: OBlock[];
  screws: OScrew[];
  /** Box colours in arrival order (one per BOX_SIZE screws). */
  queue: number[];
}

export type Helper = 'broom' | 'hammer' | 'drill';
export const HELPERS: Helper[] = ['broom', 'hammer', 'drill'];
export const START_HELPERS: Record<Helper, number> = { broom: 1, hammer: 1, drill: 1 };

export interface ObjectState {
  lvl: ObjectDef;
  /** Screw Yard rules with dock = the holding row and autoPull = AUTO_JUMP. */
  rules: YardRules;
  removed: boolean[];
  fallen: boolean[];
  boxes: (Box | null)[];
  qi: number;
  /** The holding row (colours, in arrival order). */
  tray: number[];
  /** Broom's side tray: these screws drop into a box of their colour whenever one opens. */
  stash: number[];
  helpers: Record<Helper, number>;
  won: boolean;
  lost: boolean;
  moves: number;
  /** Most screws that ever waited in the row (for later stars). */
  peak: number;
}

export interface ObjTap {
  ok: boolean;
  /** 'away': the screw's face does not look at the camera; 'blocked': a block covers it; 'full': the helper would
   *  overflow the row; 'none': nothing to do / no helper left. */
  reason?: 'over' | 'removed' | 'away' | 'blocked' | 'full' | 'none';
  to?: 'box' | 'row';
  box?: number;
  /** Boxes that filled and left, in order. */
  left: { slot: number; color: number }[];
  /** Row screws that jumped into a box. */
  pulls: { color: number; slot: number }[];
  /** Side-tray screws that dropped into a box. */
  refills: { color: number; slot: number }[];
  fell: number[];
  /** Hammer only: the screws that came out with the block, in order, and where each went. */
  taken?: { id: number; to: 'box' | 'row'; box?: number }[];
}

export function objectRules(rowSize = ROW_SIZE, autoJump = AUTO_JUMP): YardRules {
  return { boxes: OPEN_BOXES, boxSize: BOX_SIZE, dock: rowSize, autoPull: autoJump, preview: PREVIEW, swing: false };
}

export function newObject(lvl: ObjectDef, rules: YardRules = objectRules(), helpers: Record<Helper, number> = START_HELPERS): ObjectState {
  const st: ObjectState = { lvl, rules: { ...rules }, removed: lvl.screws.map(() => false), fallen: lvl.blocks.map(() => false), boxes: [], qi: 0, tray: [], stash: [], helpers: { ...helpers }, won: false, lost: false, moves: 0, peak: 0 };
  for (let k = 0; k < rules.boxes; k++) st.boxes.push(st.qi < lvl.queue.length ? { color: lvl.queue[st.qi++], n: 0 } : null);
  return st;
}

export function cloneObject(st: ObjectState): ObjectState {
  return { ...st, rules: { ...st.rules }, removed: st.removed.slice(), fallen: st.fallen.slice(), boxes: st.boxes.map((b) => b && { ...b }), tray: st.tray.slice(), stash: st.stash.slice(), helpers: { ...st.helpers } };
}

export const previewColors = (st: ObjectState) => st.lvl.queue.slice(st.qi, st.qi + st.rules.preview);
/** Does a face look at the camera in this view? Top faces always do. */
export const facing = (face: Face, view: View) => face === 'top' || VIEW_FACE[view] === face;

/** The block in cell (x, y, z) that is still on the object, or -1. */
export function blockAt(st: ObjectState, x: number, y: number, z: number) {
  const b = st.lvl.blocks.find((q) => q.x === x && q.y === y && q.z === z && !st.fallen[q.id]);
  return b ? b.id : -1;
}

/** The nearest block covering screw `sid` along its face's axis, or -1. */
export function coveredBy(st: ObjectState, sid: number) {
  const sc = st.lvl.screws[sid];
  const b = st.lvl.blocks[sc.block];
  const [dx, dy, dz] = FACE_DIR[sc.face];
  const reach = st.lvl.blocks.length;
  for (let k = 1; k <= reach; k++) {
    const id = blockAt(st, b.x + dx * k, b.y + dy * k, b.z + dz * k);
    if (id >= 0) return id;
  }
  return -1;
}

// ---- the screen (t-18c1b8a9) ----
// One projection for the scene's drawing, its tap test AND the rules: a screw can come out in a view only when a tap
// on its drawn spot lands on its own face (nothing painted over it there). The old axis rule (coveredBy) missed the
// overhangs the tilted camera sees: a top screw in a pit seen past a taller block, a front screw under a block that
// leans over it on screen. Fixing the axis rule would need a second copy of the camera in the model; deriving
// tappability from the drawn faces makes "bright", "a tap takes it" and "the solver may pick it" one fact.
// Screen units: block units, origin = the object's centre on screen (the scene scales by its block size S).
export type V3 = [number, number, number];
/** Camera: a little yaw so the next side shows (turn hint), and a pitch so the tops show. */
export const CAM_YAW = (-24 * Math.PI) / 180;
export const CAM_PITCH = (28 * Math.PI) / 180;
/** Screw head radius, how far a head stands off its face, and how near its spot a tap must land (block units). */
export const SCREW_R = 0.17;
export const SCREW_OUT = 0.52;
export const TAP_R = 0.3;
export const ALL_FACES: { face: Face | 'bottom'; n: V3 }[] = [...(Object.entries(FACE_DIR) as [Face, V3][]).map(([face, n]) => ({ face, n })), { face: 'bottom', n: [0, -1, 0] }];

/** A direction turned like the object at turn `t` (quarter turns; view v = turn v). */
export function turnDir(n: V3, t: number): V3 {
  const a = (-t * Math.PI) / 2 + CAM_YAW;
  const c = Math.cos(a), s = Math.sin(a);
  return [n[0] * c + n[2] * s, n[1], -n[0] * s + n[2] * c];
}
/** How much a face looks at the camera (>0 = it shows). */
export function facingAmount(n: V3, t: number) {
  const r = turnDir(n, t);
  return r[1] * Math.sin(CAM_PITCH) + r[2] * Math.cos(CAM_PITCH);
}
/** Object-space point (centred) -> screen point + depth (larger = nearer the camera). */
export function projectPt(p: V3, t: number) {
  const [x, y, z] = turnDir(p, t);
  return { x, y: -y * Math.cos(CAM_PITCH) + z * Math.sin(CAM_PITCH), d: z * Math.cos(CAM_PITCH) + y * Math.sin(CAM_PITCH) };
}
/** Block centre in centred object space. */
export function blockPos(lvl: ObjectDef, bid: number): V3 {
  return geo(lvl).pos[bid];
}
/** Where a screw head sits (object space). */
export function screwSpot3(lvl: ObjectDef, sid: number): V3 {
  const sc = lvl.screws[sid];
  const p = blockPos(lvl, sc.block), n = FACE_DIR[sc.face];
  return [p[0] + n[0] * SCREW_OUT, p[1] + n[1] * SCREW_OUT, p[2] + n[2] * SCREW_OUT];
}
/** The 4 corners of a unit face around block centre `p` with outward normal n. */
export function faceCorners(p: V3, n: V3): V3[] {
  const u: V3 = n[1] !== 0 ? [1, 0, 0] : [-n[2], 0, n[0]];
  const v: V3 = [n[1] * u[2] - n[2] * u[1], n[2] * u[0] - n[0] * u[2], n[0] * u[1] - n[1] * u[0]];
  const f: V3 = [p[0] + n[0] / 2, p[1] + n[1] / 2, p[2] + n[2] / 2];
  return [[1, 1], [1, -1], [-1, -1], [-1, 1]].map(([a, b]) => [f[0] + (u[0] * a + v[0] * b) / 2, f[1] + (u[1] * a + v[1] * b) / 2, f[2] + (u[2] * a + v[2] * b) / 2] as V3);
}

export interface ShownFace {
  block: number;
  face: Face | 'bottom';
  n: V3;
  /** How much it looks at the camera. */
  k: number;
  /** Screen corners (screen units). */
  pts: { x: number; y: number }[];
}
/** Every face of a block that looks at the camera at turn t (no culling). */
function facesAt(lvl: ObjectDef, p: V3, bid: number, t: number): ShownFace[] {
  const out: ShownFace[] = [];
  for (const { face, n } of ALL_FACES) {
    const k = facingAmount(n, t);
    if (k > 0.01) out.push({ block: bid, face, n, k, pts: faceCorners(p, n).map((q) => projectPt(q, t)) });
  }
  return out;
}
/** Back-to-front block order at turn t (by centre depth; ties keep id order). */
function depthOrder(pos: V3[], t: number) {
  return pos.map((_, i) => i).sort((a, b) => projectPt(pos[a], t).d - projectPt(pos[b], t).d);
}
/** The object's fixed geometry (block centres; per snapped view: faces, paint order, screw spots), built once. */
interface Geo {
  pos: V3[];
  views: { order: number[]; faces: ShownFace[][]; spots: { x: number; y: number }[] }[];
}
const geoCache = new WeakMap<ObjectDef, Geo>();
function geo(lvl: ObjectDef): Geo {
  let g = geoCache.get(lvl);
  if (g) return g;
  const bs = lvl.blocks;
  const mid = (k: 'x' | 'y' | 'z') => (Math.min(...bs.map((b) => b[k])) + Math.max(...bs.map((b) => b[k]))) / 2;
  const c: V3 = [mid('x'), mid('y'), mid('z')];
  const pos = bs.map((b) => [b.x - c[0], b.y - c[1], b.z - c[2]] as V3);
  const spot = (sid: number): V3 => {
    const sc = lvl.screws[sid];
    const p = pos[sc.block], n = FACE_DIR[sc.face];
    return [p[0] + n[0] * SCREW_OUT, p[1] + n[1] * SCREW_OUT, p[2] + n[2] * SCREW_OUT];
  };
  const views = [0, 1, 2, 3].map((t) => ({
    order: depthOrder(pos, t),
    faces: pos.map((p, bid) => facesAt(lvl, p, bid, t)),
    spots: lvl.screws.map((sc) => projectPt(spot(sc.id), t)),
  }));
  g = { pos, views };
  geoCache.set(lvl, g);
  return g;
}
const snapped = (t: number) => (Number.isInteger(t) && t >= 0 && t <= 3 ? t : -1);

/** The faces of block `bid` that show at turn t (outside faces only, unless `alone`: a falling block shows them all). */
export function blockFaces(st: ObjectState, bid: number, t: number, alone = false): ShownFace[] {
  const b = st.lvl.blocks[bid];
  const v = snapped(t);
  const all = v >= 0 ? geo(st.lvl).views[v].faces[bid] : facesAt(st.lvl, blockPos(st.lvl, bid), bid, t);
  return alone ? all : all.filter(({ n }) => blockAt(st, b.x + n[0], b.y + n[1], b.z + n[2]) < 0); // drop inside faces
}
/** Everything the scene paints at turn t, back to front (blocks by centre depth). Later faces cover earlier ones. */
export function shownFaces(st: ObjectState, t: number): ShownFace[] {
  const v = snapped(t);
  const order = v >= 0 ? geo(st.lvl).views[v].order : depthOrder(geo(st.lvl).pos, t);
  return order.filter((bid) => !st.fallen[bid]).flatMap((bid) => blockFaces(st, bid, t));
}
function inPoly(pts: { x: number; y: number }[], x: number, y: number) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const a = pts[i], b = pts[j];
    if (a.y > y !== b.y > y && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}
/** The front-most painted face under screen point (x, y), or null. */
export function faceUnder(faces: ShownFace[], x: number, y: number): ShownFace | null {
  for (let i = faces.length - 1; i >= 0; i--) if (inPoly(faces[i].pts, x, y)) return faces[i];
  return null;
}

export interface ScreenPick {
  /** The screw this tap takes, or null. */
  sid: number | null;
  /** No screw taken: 'away' = the screw under the finger is on a side turned away from this view; 'blocked' = a
   *  screw is there but a block is painted over it; 'bare' = a block face with no screw. */
  reason?: 'away' | 'blocked' | 'bare';
  /** The block face under the finger (-1: none). */
  block: number;
}
/** What a tap at screen point (x, y) in snapped `view` does: the screw whose head is under the finger AND on the
 *  front-most painted face there. */
export function screenPick(st: ObjectState, view: View, x: number, y: number, faces = shownFaces(st, view)): ScreenPick {
  const hit = faceUnder(faces, x, y);
  let own = -1, ownD = Infinity, near = -1, nearD = Infinity;
  const spots = geo(st.lvl).views[view].spots;
  for (const sc of st.lvl.screws) {
    if (st.removed[sc.id]) continue;
    const s = spots[sc.id];
    const d = Math.hypot(s.x - x, s.y - y);
    if (d > TAP_R) continue;
    if (hit && sc.block === hit.block && sc.face === hit.face) {
      if (d < ownD) [own, ownD] = [sc.id, d];
    } else if (d < nearD) [near, nearD] = [sc.id, d];
  }
  const block = hit ? hit.block : -1;
  if (own >= 0) return facing(st.lvl.screws[own].face, view) ? { sid: own, block } : { sid: null, reason: 'away', block };
  if (near >= 0) return { sid: null, reason: 'blocked', block };
  return { sid: null, reason: block >= 0 ? 'bare' : undefined, block };
}

/** shows[view][sid]: the screw faces the camera in that view and its spot lands on its own face (the front-most
 *  painted one there), so a tap on it takes exactly it (screenPick: it is the nearest screw on that face). Depends only
 *  on which blocks have fallen; cached per object. */
const visCache = new WeakMap<ObjectDef, Map<string, boolean[][]>>();
function shows(st: ObjectState): boolean[][] {
  let m = visCache.get(st.lvl);
  if (!m) visCache.set(st.lvl, (m = new Map()));
  const key = st.fallen.map(Number).join('');
  let vis = m.get(key);
  if (vis) return vis;
  vis = ([0, 1, 2, 3] as View[]).map((v) => {
    const faces = shownFaces(st, v);
    const spots = geo(st.lvl).views[v].spots;
    return st.lvl.screws.map((sc) => {
      if (!facing(sc.face, v)) return false;
      const hit = faceUnder(faces, spots[sc.id].x, spots[sc.id].y);
      return !!hit && hit.block === sc.block && hit.face === sc.face;
    });
  });
  m.set(key, vis);
  return vis;
}

/** Can the player unscrew it in this view: still in, facing the camera, and its drawn spot shows (no block painted
 *  over it). Exactly the screws the scene draws bright. */
export const reachable = (st: ObjectState, sid: number, view: View) => !st.removed[sid] && shows(st)[view][sid];
/** The first view a screw can be taken from (its own side first), or -1. */
export function viewFor(st: ObjectState, sid: number): View | -1 {
  if (st.removed[sid]) return -1;
  const vis = shows(st);
  const own = viewOf(st.lvl.screws[sid].face, 0);
  if (vis[own][sid]) return own;
  const v = vis.findIndex((row) => row[sid]);
  return v < 0 ? -1 : (v as View);
}
/** Reachable after turning to some view (what a solver / hint may pick). */
export const reachableAny = (st: ObjectState, sid: number) => viewFor(st, sid) >= 0;
/** The side a screw's face looks at (top screws: any, the current one is kept). Not a promise it can be taken there:
 *  use viewFor. */
export const viewOf = (face: Face, current: View): View => (face === 'top' ? current : (VIEW_FACE.indexOf(face) as View));

const emptyTap = (): ObjTap => ({ ok: false, left: [], pulls: [], refills: [], fell: [] });

/** Unscrew screw `sid` while looking from `view`. Mutates st. */
export function tapScrew(st: ObjectState, sid: number, view: View): ObjTap {
  const res = emptyTap();
  if (st.won || st.lost) return { ...res, reason: 'over' };
  if (st.removed[sid]) return { ...res, reason: 'removed' };
  if (!facing(st.lvl.screws[sid].face, view)) return { ...res, reason: 'away' };
  if (!reachable(st, sid, view)) return { ...res, reason: 'blocked' };
  const t = take(st, sid);
  res.ok = true;
  res.to = t.to;
  res.box = t.box;
  st.moves++;
  detach(st, sid, res);
  settleAll(st, res);
  endCheck(st);
  return res;
}

/** AUTO_JUMP off: tap row screw `i` to send it into the open box of its colour. */
export function tapRow(st: ObjectState, i: number): ObjTap {
  const res = emptyTap();
  if (st.won || st.lost) return { ...res, reason: 'over' };
  const slot = i >= 0 && i < st.tray.length ? fitSlot(st, st.tray[i]) : -1;
  if (slot < 0) return { ...res, reason: 'none' };
  st.tray.splice(i, 1);
  st.boxes[slot]!.n++;
  st.moves++;
  res.ok = true;
  res.to = 'box';
  res.box = slot;
  settleAll(st, res);
  endCheck(st);
  return res;
}

/** BROOM: the whole row moves to the side tray; those screws refill boxes of their colour as they open. */
export function useBroom(st: ObjectState): ObjTap {
  const res = emptyTap();
  if (st.won || st.lost) return { ...res, reason: 'over' };
  if (!st.helpers.broom || !st.tray.length) return { ...res, reason: 'none' };
  st.helpers.broom--;
  st.stash.push(...st.tray);
  st.tray = [];
  res.ok = true;
  settleAll(st, res);
  endCheck(st);
  return res;
}

/** HAMMER: break block `bid`; its screws still in drop into their boxes, else the row (refused when that would lose). */
export function useHammer(st: ObjectState, bid: number): ObjTap {
  const res = emptyTap();
  if (st.won || st.lost) return { ...res, reason: 'over' };
  if (!st.helpers.hammer || st.fallen[bid] === undefined || st.fallen[bid]) return { ...res, reason: 'none' };
  const trial = cloneObject(st);
  smash(trial, bid, emptyTap());
  if (trial.lost) return { ...res, reason: 'full' };
  st.helpers.hammer--;
  smash(st, bid, res);
  res.ok = true;
  return res;
}

function smash(st: ObjectState, bid: number, res: ObjTap) {
  res.taken = [];
  for (const sid of st.lvl.blocks[bid].screws) {
    if (st.removed[sid]) continue;
    const t = take(st, sid);
    res.taken.push({ id: sid, ...t });
    settleAll(st, res);
    if (st.tray.length > st.rules.dock) break;
  }
  st.moves++;
  if (!st.fallen[bid]) {
    st.fallen[bid] = true;
    res.fell.push(bid);
  }
  settleAll(st, res);
  endCheck(st);
}

/** DRILL: one more row slot for the rest of this object. */
export function useDrill(st: ObjectState): ObjTap {
  const res = emptyTap();
  if (st.won || st.lost) return { ...res, reason: 'over' };
  if (!st.helpers.drill) return { ...res, reason: 'none' };
  st.helpers.drill--;
  st.rules = { ...st.rules, dock: st.rules.dock + 1 };
  res.ok = true;
  return res;
}

/** The screw leaves the object into an open box of its colour, else the row. */
function take(st: ObjectState, sid: number): { to: 'box' | 'row'; box?: number } {
  st.removed[sid] = true;
  const color = st.lvl.screws[sid].color;
  const slot = fitSlot(st, color);
  if (slot >= 0) {
    st.boxes[slot]!.n++;
    return { to: 'box', box: slot };
  }
  st.tray.push(color);
  return { to: 'row' };
}

/** The block falls off when its last screw is out. */
function detach(st: ObjectState, sid: number, res: ObjTap) {
  const b = st.lvl.blocks[st.lvl.screws[sid].block];
  if (!st.fallen[b.id] && b.screws.every((s) => st.removed[s])) {
    st.fallen[b.id] = true;
    res.fell.push(b.id);
  }
}

/** screw.ts settle (full boxes leave, the next roll in, AUTO_JUMP pulls the row), then the side tray refills open boxes. */
function settleAll(st: ObjectState, res: ObjTap) {
  for (let guard = 0; guard < 64; guard++) {
    settle(st, res);
    let refilled = false;
    for (let s = 0; s < st.boxes.length && !refilled; s++) {
      const b = st.boxes[s];
      const k = b && b.n < st.rules.boxSize ? st.stash.indexOf(b.color) : -1;
      if (k < 0) continue;
      st.stash.splice(k, 1);
      b!.n++;
      res.refills.push({ color: b!.color, slot: s });
      refilled = true;
    }
    if (!refilled) return;
  }
}

/** Won: every screw out and nothing waiting. Lost: the row is full and no row screw fits an open box (or it overflowed). */
function endCheck(st: ObjectState) {
  if (st.removed.every(Boolean) && !st.tray.length && !st.stash.length) st.won = true;
  else if (st.tray.length > st.rules.dock || (st.tray.length >= st.rules.dock && !st.tray.some((c) => fitSlot(st, c) >= 0))) st.lost = true;
  if (!st.lost) st.peak = Math.max(st.peak, st.tray.length);
}

// ---- solver (tests now; the later generator / difficulty score) ----
const stateKey = (st: ObjectState) => `${st.removed.map((r) => (r ? 1 : 0)).join('')}|${st.qi}|${st.boxes.map((b) => (b ? `${b.color}.${b.n}` : '-')).join(',')}|${st.tray.slice().sort().join('')}`;

/** Exact search (no helpers, turning is free): a winning screw order, or null. Fitting screws are tried first, so a
 *  winnable object answers fast; `budget` caps the states visited (null when exceeded too). */
export function solveObject(lvl: ObjectDef, rules: YardRules = objectRules(), budget = 200000): number[] | null {
  const dead = new Set<string>();
  let visits = 0;
  const path: number[] = [];
  const go = (st: ObjectState): boolean => {
    if (st.won) return true;
    if (st.lost || ++visits > budget) return false;
    const key = stateKey(st);
    if (dead.has(key)) return false;
    // AUTO_JUMP off: a fitting row screw always goes first (it can only help)
    if (!st.rules.autoPull) {
      const ri = st.tray.findIndex((c) => fitSlot(st, c) >= 0);
      if (ri >= 0) {
        const nx = cloneObject(st);
        tapRow(nx, ri);
        if (go(nx)) return true;
        dead.add(key);
        return false;
      }
    }
    const free = lvl.screws.filter((s) => reachableAny(st, s.id));
    free.sort((a, b) => +(fitSlot(st, b.color) >= 0) - +(fitSlot(st, a.color) >= 0) || a.id - b.id);
    for (const s of free) {
      const nx = cloneObject(st);
      tapScrew(nx, s.id, viewFor(st, s.id) as View);
      path.push(s.id);
      if (go(nx)) return true;
      path.pop();
    }
    dead.add(key);
    return false;
  };
  return go(newObject(lvl, rules, { broom: 0, hammer: 0, drill: 0 })) ? path : null;
}

/** A sensible player: a screw that fits an open box; else one whose colour comes soonest in the queue. */
export function greedyPick(st: ObjectState): number | null {
  const free = st.lvl.screws.filter((s) => reachableAny(st, s.id));
  if (!free.length) return null;
  const fit = free.find((s) => fitSlot(st, s.color) >= 0);
  if (fit) return fit.id;
  const soon = (c: number) => {
    const k = st.lvl.queue.indexOf(c, st.qi);
    return k < 0 ? 999 : k;
  };
  return free.slice().sort((a, b) => soon(a.color) - soon(b.color) || a.id - b.id)[0].id;
}

// ---- the hand-built object ----
const B = (x: number, y: number, z: number, tint = 0): Omit<OBlock, 'id' | 'screws'> => ({ x, y, z, tint });
function build(id: string, name: string, blocks: Omit<OBlock, 'id' | 'screws'>[], screws: [number, Face, number][], queue: number[]): ObjectDef {
  const bl: OBlock[] = blocks.map((b, i) => ({ ...b, id: i, screws: [] }));
  const sc: OScrew[] = screws.map(([block, face, color], i) => {
    bl[block].screws.push(i);
    return { id: i, block, face, color };
  });
  return { id, name, blocks: bl, screws: sc, queue };
}

// Colours: 0 red, 1 blue, 2 yellow, 3 green (ScrewScene's SCREW_COLORS).
const R = 0, U = 1, Y = 2, G = 3;
/** THE CRATE: 3 wide x 2 tall x 2 deep (12 blocks, 30 screws, 4 colours). The middle column hides 4 screws: the top of
 *  the front-bottom block and the front of both back-middle blocks sit behind other blocks until those fall, and the
 *  back-bottom-middle block is the last to come free. */
export const CRATE: ObjectDef = build(
  'crate',
  'THE CRATE',
  [
    // front layer (z = 1): 0-2 bottom, 3-5 top
    B(0, 0, 1, 0), B(1, 0, 1, 1), B(2, 0, 1, 0),
    B(0, 1, 1, 1), B(1, 1, 1, 0), B(2, 1, 1, 1),
    // back layer (z = 0): 6-8 bottom, 9-11 top
    B(0, 0, 0, 1), B(1, 0, 0, 0), B(2, 0, 0, 1),
    B(0, 1, 0, 0), B(1, 1, 0, 1), B(2, 1, 0, 0),
  ],
  [
    // front faces
    [0, 'front', Y], [1, 'front', R], [2, 'front', G], [3, 'front', U], [4, 'front', Y], [5, 'front', R],
    // tops of the top layer
    [3, 'top', G], [4, 'top', R], [5, 'top', U], [9, 'top', Y], [10, 'top', U], [11, 'top', G],
    // sides
    [0, 'left', U], [3, 'left', R], [6, 'left', R], [9, 'left', U],
    [2, 'right', Y], [5, 'right', G], [8, 'right', R], [11, 'right', U],
    // back faces
    [6, 'back', R], [7, 'back', G], [8, 'back', Y], [9, 'back', R], [10, 'back', G], [11, 'back', U],
    // hidden: behind / under the middle column
    [1, 'top', U], [7, 'front', R], [10, 'front', Y], [7, 'top', U],
  ],
  [R, U, G, Y, R, U, G, R, U, Y],
);
export const OBJECTS: ObjectDef[] = [CRATE];
