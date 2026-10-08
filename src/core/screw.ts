// SCREW YARD (r36, Ido: "an outside-core mini game in the logic of Screwdom 3D… for a period of time with tiers and a grand
// prize"). A scrap pile of stacked metal plates held by coloured screws. A screw can come out only when no higher plate
// covers it; a plate falls when its last screw is out. Screws go into the two open toolboxes of their colour (3 each; a full
// box leaves and the next colour rolls in) or into the 5-slot tray. Tray full = lost; every screw out = won.
// Pure + deterministic: the generator builds a removal order first, colours it in triples (the toolbox queue), mixes a
// few colours so the tray matters, and keeps the layout only if a player-like solver clears it.
import { Rng } from './rng';

export const TRAY_CAP = 5;
export const BOX_SIZE = 3;
export const OPEN_BOXES = 2;

/** Screw Yard 2.0 (t-11ac42f6): the rule switches. CLASSIC_RULES reproduces the r36 yard exactly (2 open boxes, the
 *  5-well tray whose 5th well loses, free auto-pull, no swing); YARD_RULES_2 is the faithful screw-sort: 1 active box with
 *  the next 2 colours shown, a 4-slot dock with no free auto-pull (tap a dock screw to send it to the box) and swinging
 *  plates. A level without `rules` plays CLASSIC (today's ScrewScene); the 2.0 tools default to YARD_RULES_2. */
export interface YardRules {
  /** Open toolboxes at once. */
  boxes: number;
  boxSize: number;
  /** Dock / tray slots a screw may wait in; a screw that finds none loses the yard. */
  dock: number;
  /** Boxes pull matching dock screws by themselves (classic); off = the player taps the dock screw (tapDock). */
  autoPull: boolean;
  /** Upcoming box colours shown (information only; the greedy bot sees just these). */
  preview: number;
  /** A plate held by one screw swings down around it (swingPose). */
  swing: boolean;
}
export const CLASSIC_RULES: YardRules = { boxes: OPEN_BOXES, boxSize: BOX_SIZE, dock: TRAY_CAP - 1, autoPull: true, preview: 0, swing: false };
export const YARD_RULES_2: YardRules = { boxes: 1, boxSize: BOX_SIZE, dock: 4, autoPull: false, preview: 2, swing: true };
export const DEFAULT_YARD_RULES = YARD_RULES_2;
/** Board area the plates live in (centre-origin design units). */
export const YARD_W = 600;
export const YARD_H = 640;
/** r38 (ChatGPT review): plates cluster in the middle so the pile reads as one junk heap, not scattered sticks. */
const CLUSTER = 0.78;
const SCREW_R = 22;

export type PlateKind = 'long' | 'short' | 'square';
/** r38: plate shapes measured from ChatGPT's art - size in yard units and hole centres as fractions of len / thick from
 *  the plate centre (long 5.06:1 with holes at 12/50/88%, short 3.1:1 at 16/84%, square with inset corner holes). */
export const PLATE_SHAPES: Record<PlateKind, { len: number; thick: number; holes: [number, number][] }> = {
  long: { len: 364, thick: 72, holes: [[-0.379, 0], [0, 0], [0.381, 0]] },
  short: { len: 224, thick: 72, holes: [[-0.341, 0], [0.342, 0]] },
  square: { len: 160, thick: 154, holes: [[-0.337, -0.315], [0.337, -0.315], [0.337, 0.315], [-0.337, 0.315]] },
};
export interface Plate {
  id: number;
  kind?: PlateKind;
  x: number;
  y: number;
  /** Bar length along its axis and thickness. */
  len: number;
  thick: number;
  /** Radians. */
  angle: number;
  /** Stacking order: higher covers lower. */
  z: number;
  screws: number[];
}
export interface Screw {
  id: number;
  plate: number;
  x: number;
  y: number;
  color: number;
}
export interface YardLevel {
  n: number;
  seed: number;
  plates: Plate[];
  screws: Screw[];
  /** Toolbox colours in arrival order (one per BOX_SIZE screws). */
  queue: number[];
  /** Missing = CLASSIC_RULES. */
  rules?: YardRules;
}
export interface Box {
  color: number;
  n: number;
}
export interface YardState {
  lvl: YardLevel;
  rules: YardRules;
  removed: boolean[];
  gone: boolean[];
  boxes: (Box | null)[];
  qi: number;
  tray: number[];
  won: boolean;
  lost: boolean;
  moves: number;
}
export interface TapResult {
  ok: boolean;
  reason?: 'blocked' | 'over' | 'removed';
  to?: 'box' | 'tray';
  box?: number;
  /** Boxes (slot index) that filled and left, in order, with their colour. */
  left: { slot: number; color: number }[];
  /** Tray screws (by tray index before the pull) that jumped into a box. */
  pulls: { color: number; slot: number }[];
  fell: number[];
  /** Plates this tap left hanging on one screw (they swing, see platePose). */
  swung: number[];
}

export interface Pose {
  x: number;
  y: number;
  angle: number;
}
/** Is point (px, py) inside plate p (with a margin = screw radius, so a partly covered screw counts as covered)? */
export function covers(p: Pose & { len: number; thick: number }, px: number, py: number, margin = SCREW_R) {
  const dx = px - p.x, dy = py - p.y;
  const c = Math.cos(-p.angle), s = Math.sin(-p.angle);
  const lx = dx * c - dy * s, ly = dx * s + dy * c;
  return Math.abs(lx) <= p.len / 2 + margin && Math.abs(ly) <= p.thick / 2 + margin;
}

/** 2.0 swinging plate: the pose a plate hangs in when `pivot` is its only screw left. It turns around that screw until
 *  its centre sits straight below it (y grows downwards); a plate pinned through its centre hole stays put. No physics:
 *  a pure function of the geometry, so the solver can precompute it. */
export function swingPose(p: Plate, pivot: Screw): Pose {
  const dx = p.x - pivot.x, dy = p.y - pivot.y;
  const d = Math.hypot(dx, dy);
  if (d < 1) return { x: p.x, y: p.y, angle: p.angle };
  return { x: pivot.x, y: pivot.y + d, angle: p.angle + Math.PI / 2 - Math.atan2(dy, dx) };
}

/** Where plate `pid` is now: as laid, or swung when swing is on and exactly one of its (several) screws is left. */
export function platePose(lvl: YardLevel, removed: boolean[] | undefined, pid: number, swing: boolean): Pose {
  const p = lvl.plates[pid];
  if (swing && removed && p.screws.length > 1) {
    const left = p.screws.filter((s) => !removed[s]);
    if (left.length === 1) return swingPose(p, lvl.screws[left[0]]);
  }
  return { x: p.x, y: p.y, angle: p.angle };
}

/** The topmost plate covering screw `id`, or null. Pass `removed` and swing = true to use swung poses (2.0). */
export function blockedBy(lvl: YardLevel, gone: boolean[], id: number, removed?: boolean[], swing = false): number | null {
  const sc = lvl.screws[id];
  const z = lvl.plates[sc.plate].z;
  let top: Plate | null = null;
  for (const p of lvl.plates) {
    if (gone[p.id] || p.z <= z || (top && p.z <= top.z)) continue;
    const pose = swing ? platePose(lvl, removed, p.id, true) : p;
    if (covers({ ...pose, len: p.len, thick: p.thick }, sc.x, sc.y)) top = p;
  }
  return top ? top.id : null;
}

export function newYard(lvl: YardLevel, rules: YardRules = lvl.rules ?? CLASSIC_RULES): YardState {
  const st: YardState = { lvl, rules, removed: lvl.screws.map(() => false), gone: lvl.plates.map(() => false), boxes: [], qi: 0, tray: [], won: false, lost: false, moves: 0 };
  for (let k = 0; k < rules.boxes; k++) st.boxes.push(st.qi < lvl.queue.length ? { color: lvl.queue[st.qi++], n: 0 } : null);
  return st;
}

export const removable = (st: YardState, id: number) => !st.removed[id] && blockedBy(st.lvl, st.gone, id, st.removed, st.rules.swing) === null;
/** The next box colours shown to the player. */
export const previewColors = (st: YardState) => st.lvl.queue.slice(st.qi, st.qi + st.rules.preview);
/** The open box (slot) a screw of this colour goes into, or -1. */
export const fitSlot = (st: YardState, color: number) => st.boxes.findIndex((b) => b && b.color === color && b.n < st.rules.boxSize);

/** Take a screw out. Mutates st. */
export function tapScrew(st: YardState, id: number): TapResult {
  const res: TapResult = { ok: false, left: [], pulls: [], fell: [], swung: [] };
  if (st.won || st.lost) return { ...res, reason: 'over' };
  if (st.removed[id]) return { ...res, reason: 'removed' };
  if (!removable(st, id)) return { ...res, reason: 'blocked' };
  const sc = st.lvl.screws[id];
  st.removed[id] = true;
  st.moves++;
  res.ok = true;
  const slot = fitSlot(st, sc.color);
  if (slot >= 0) {
    st.boxes[slot]!.n++;
    res.to = 'box';
    res.box = slot;
  } else {
    st.tray.push(sc.color);
    res.to = 'tray';
  }
  settle(st, res);
  // the plate falls when its last screw is out
  const p = st.lvl.plates[sc.plate];
  const left = p.screws.filter((s) => !st.removed[s]).length;
  if (!left) {
    st.gone[p.id] = true;
    res.fell.push(p.id);
  } else if (left === 1 && st.rules.swing) res.swung.push(p.id);
  endCheck(st);
  return res;
}

/** 2.0, no free auto-pull: tap dock screw `ti` to send it into the open box of its colour. Mutates st. */
export function tapDock(st: YardState, ti: number): TapResult {
  const res: TapResult = { ok: false, left: [], pulls: [], fell: [], swung: [] };
  if (st.won || st.lost) return { ...res, reason: 'over' };
  const slot = ti >= 0 && ti < st.tray.length ? fitSlot(st, st.tray[ti]) : -1;
  if (slot < 0) return { ...res, reason: 'blocked' };
  st.tray.splice(ti, 1);
  st.boxes[slot]!.n++;
  st.moves++;
  res.ok = true;
  res.to = 'box';
  res.box = slot;
  settle(st, res);
  endCheck(st);
  return res;
}

/** Won when every screw is out and the dock is empty; lost when a screw found no dock slot. */
function endCheck(st: YardState) {
  if (st.removed.every(Boolean) && !st.tray.length) st.won = true;
  else if (st.tray.length > st.rules.dock) st.lost = true;
}

/** Full boxes leave, the next colours roll in and (with autoPull) pull matching tray screws (cascading). */
function settle(st: YardState, res: TapResult) {
  for (let guard = 0; guard < 64; guard++) {
    const full = st.boxes.findIndex((b) => b && b.n >= st.rules.boxSize);
    if (full >= 0) {
      res.left.push({ slot: full, color: st.boxes[full]!.color });
      st.boxes[full] = st.qi < st.lvl.queue.length ? { color: st.lvl.queue[st.qi++], n: 0 } : null;
      continue;
    }
    if (!st.rules.autoPull) return;
    let pulled = false;
    for (let s = 0; s < st.boxes.length; s++) {
      const b = st.boxes[s];
      if (!b) continue;
      const ti = st.tray.indexOf(b.color);
      if (ti >= 0 && b.n < st.rules.boxSize) {
        st.tray.splice(ti, 1);
        b.n++;
        res.pulls.push({ color: b.color, slot: s });
        pulled = true;
        break;
      }
    }
    if (!pulled) return;
  }
}

/** A sensible player: a screw that fits an open box first; otherwise the free screw whose colour comes soonest. */
export function solveGreedy(lvl: YardLevel): boolean {
  const st = newYard(lvl);
  for (let step = 0; step < 999 && !st.won && !st.lost; step++) {
    const free = lvl.screws.filter((s) => removable(st, s.id));
    if (!free.length) return false;
    const fit = free.find((s) => st.boxes.some((b) => b && b.color === s.color && b.n < BOX_SIZE));
    let pick = fit;
    if (!pick) {
      const soon = (c: number) => {
        const k = lvl.queue.indexOf(c, st.qi);
        return k < 0 ? 999 : k;
      };
      pick = free.slice().sort((a, b) => soon(a.color) - soon(b.color) || a.id - b.id)[0];
    }
    tapScrew(st, pick.id);
  }
  return st.won;
}

/** Yard number n (1-based within the week): more plates, colours and mixing as the week goes on. */
export function yardParams(n: number) {
  return { plates: Math.min(5 + Math.floor(n * 0.7), 16), colors: Math.min(3 + Math.floor((n - 1) / 3), 6), swaps: Math.min(1 + Math.floor(n / 2), 10), window: Math.min(4 + Math.floor(n / 3), 9) };
}

export function generateYard(n: number, seed: number): YardLevel {
  for (let attempt = 0; attempt < 40; attempt++) {
    const lvl = tryGenerate(n, (seed + attempt * 7919) >>> 0, attempt >= 20);
    if (lvl) return lvl;
  }
  return tryGenerate(n, seed, true, true)!;
}

function tryGenerate(n: number, seed: number, easy: boolean, noMix = false): YardLevel | null {
  const rng = new Rng(seed);
  const P = yardParams(n);
  const plates: Plate[] = [];
  const screws: Screw[] = [];
  // r38: three fixed shapes matching ChatGPT's plate art (screws sit exactly on the painted holes).
  // Kinds first, then the screw total is fixed to a multiple of 3 by swapping short <-> long (no invented holes).
  const kinds: PlateKind[] = [];
  for (let i = 0; i < P.plates; i++) {
    const r = rng.next();
    kinds.push(i > 0 && r < 0.25 ? 'square' : r < 0.62 ? 'long' : 'short');
  }
  const total = () => kinds.reduce((t, k) => t + PLATE_SHAPES[k].holes.length, 0);
  for (let guard = 0; guard < 20 && total() % BOX_SIZE !== 0; guard++) {
    const r = total() % BOX_SIZE;
    const iL = kinds.lastIndexOf('long'), iS = kinds.lastIndexOf('short');
    if (r === 2 && iS >= 0) kinds[iS] = 'long';
    else if (r === 1 && iL >= 0) kinds[iL] = 'short';
    else if (r === 2 && iL >= 0) kinds[iL] = 'short';
    else if (r === 1 && iS >= 0) kinds[iS] = 'long';
    else break;
  }
  kinds.forEach((kind, i) => {
    const shape = PLATE_SHAPES[kind];
    const len = shape.len, thick = shape.thick;
    const angle = ((rng.int(kind === 'square' ? 6 : 12) * 15) / 180) * Math.PI;
    // keep the whole plate inside the yard
    const ca = Math.abs(Math.cos(angle)), sa = Math.abs(Math.sin(angle));
    const hx = ca * (len / 2) + sa * (thick / 2), hy = sa * (len / 2) + ca * (thick / 2);
    const x = (rng.next() * 2 - 1) * Math.max(0, (YARD_W / 2) * CLUSTER - hx * 0.6);
    const y = (rng.next() * 2 - 1) * Math.max(0, (YARD_H / 2) * CLUSTER - hy * 0.6);
    const p: Plate = { id: i, kind, x, y, len, thick, angle, z: i, screws: [] };
    for (const [fx, fy] of shape.holes) {
      const lx = fx * len, ly = fy * thick;
      const sc: Screw = { id: screws.length, plate: i, x: x + Math.cos(angle) * lx - Math.sin(angle) * ly, y: y + Math.sin(angle) * lx + Math.cos(angle) * ly, color: 0 };
      screws.push(sc);
      p.screws.push(sc.id);
    }
    plates.push(p);
  });
  if (screws.length % BOX_SIZE !== 0) return null;
  // a removal order that respects covering (the topmost plate's screws are always free)
  const lvl: YardLevel = { n, seed, plates, screws, queue: [] };
  const gone = plates.map(() => false);
  const out = screws.map(() => false);
  const order: number[] = [];
  while (order.length < screws.length) {
    const free = screws.filter((s) => !out[s.id] && blockedBy(lvl, gone, s.id) === null);
    if (!free.length) return null;
    const s = free[rng.int(free.length)];
    out[s.id] = true;
    order.push(s.id);
    const p = plates[s.plate];
    if (p.screws.every((q) => out[q])) gone[p.id] = true;
  }
  // colour the order in triples (= the toolbox queue), never the same colour twice in a row
  const triples = order.length / BOX_SIZE;
  const queue: number[] = [];
  for (let t = 0; t < triples; t++) {
    let c = rng.int(P.colors);
    if (t > 0 && c === queue[t - 1]) c = (c + 1 + rng.int(P.colors - 1)) % P.colors;
    queue.push(c);
  }
  const colorAt = order.map((_, i) => queue[Math.floor(i / BOX_SIZE)]);
  // mix: swap colours of nearby screws in the order so the tray gets used
  const swaps = noMix ? 0 : easy ? Math.ceil(P.swaps / 2) : P.swaps;
  for (let k = 0; k < swaps; k++) {
    const i = rng.int(order.length);
    const j = Math.min(order.length - 1, i + 1 + rng.int(P.window));
    [colorAt[i], colorAt[j]] = [colorAt[j], colorAt[i]];
  }
  order.forEach((sid, i) => (screws[sid].color = colorAt[i]));
  lvl.queue = queue;
  if (!noMix && !solveGreedy(lvl)) return null;
  return lvl;
}

// ---- weekly event (tiers + grand prize) ----
export type YardReward = { bolts?: number; gems?: number; crate?: 'wood' | 'iron' | 'gold'; epic?: boolean };
/** Cleared yards needed for each tier, and its reward. The last one is the grand prize. */
export const YARD_TIERS: { need: number; reward: YardReward }[] = [
  { need: 1, reward: { bolts: 60 } },
  { need: 3, reward: { gems: 10 } },
  { need: 5, reward: { crate: 'wood' } },
  { need: 8, reward: { bolts: 200 } },
  { need: 11, reward: { crate: 'iron' } },
  { need: 14, reward: { gems: 30 } },
  { need: 17, reward: { crate: 'iron' } },
  { need: 20, reward: { crate: 'gold', epic: true } },
];
/** Screwdrivers (one per yard attempt) the player earns. */
export const SCREWDRIVERS = { levelWin: 1, bountyWin: 1, rushFight: 2, dailyBench: 1, start: 3 };
/** Bolts for every cleared yard on top of the tiers. */
export const yardBolts = (n: number) => 15 + 3 * Math.min(n, 20);
