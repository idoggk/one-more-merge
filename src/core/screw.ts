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
/** Board area the plates live in (centre-origin design units). */
export const YARD_W = 600;
export const YARD_H = 640;
const PLATE_T = 74;
/** r38 (ChatGPT review): plates cluster in the middle so the pile reads as one junk heap, not scattered sticks. */
const CLUSTER = 0.78;
const SCREW_R = 22;

export interface Plate {
  id: number;
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
}
export interface Box {
  color: number;
  n: number;
}
export interface YardState {
  lvl: YardLevel;
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
}

/** Is point (px, py) inside plate p (with a margin = screw radius, so a partly covered screw counts as covered)? */
function covers(p: Plate, px: number, py: number, margin = SCREW_R) {
  const dx = px - p.x, dy = py - p.y;
  const c = Math.cos(-p.angle), s = Math.sin(-p.angle);
  const lx = dx * c - dy * s, ly = dx * s + dy * c;
  return Math.abs(lx) <= p.len / 2 + margin && Math.abs(ly) <= p.thick / 2 + margin;
}

export function blockedBy(lvl: YardLevel, gone: boolean[], id: number): number | null {
  const sc = lvl.screws[id];
  const z = lvl.plates[sc.plate].z;
  let top: Plate | null = null;
  for (const p of lvl.plates) if (!gone[p.id] && p.z > z && covers(p, sc.x, sc.y) && (!top || p.z > top.z)) top = p;
  return top ? top.id : null;
}

export function newYard(lvl: YardLevel): YardState {
  const st: YardState = { lvl, removed: lvl.screws.map(() => false), gone: lvl.plates.map(() => false), boxes: [], qi: 0, tray: [], won: false, lost: false, moves: 0 };
  for (let k = 0; k < OPEN_BOXES; k++) st.boxes.push(st.qi < lvl.queue.length ? { color: lvl.queue[st.qi++], n: 0 } : null);
  return st;
}

export const removable = (st: YardState, id: number) => !st.removed[id] && blockedBy(st.lvl, st.gone, id) === null;

/** Take a screw out. Mutates st. */
export function tapScrew(st: YardState, id: number): TapResult {
  const res: TapResult = { ok: false, left: [], pulls: [], fell: [] };
  if (st.won || st.lost) return { ...res, reason: 'over' };
  if (st.removed[id]) return { ...res, reason: 'removed' };
  if (blockedBy(st.lvl, st.gone, id) !== null) return { ...res, reason: 'blocked' };
  const sc = st.lvl.screws[id];
  st.removed[id] = true;
  st.moves++;
  res.ok = true;
  const slot = st.boxes.findIndex((b) => b && b.color === sc.color && b.n < BOX_SIZE);
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
  if (p.screws.every((s) => st.removed[s])) {
    st.gone[p.id] = true;
    res.fell.push(p.id);
  }
  if (st.removed.every(Boolean) && !st.tray.length) st.won = true;
  else if (st.tray.length >= TRAY_CAP) st.lost = true;
  return res;
}

/** Full boxes leave, the next colours roll in and pull matching tray screws (cascading). */
function settle(st: YardState, res: TapResult) {
  for (let guard = 0; guard < 64; guard++) {
    const full = st.boxes.findIndex((b) => b && b.n >= BOX_SIZE);
    if (full >= 0) {
      res.left.push({ slot: full, color: st.boxes[full]!.color });
      st.boxes[full] = st.qi < st.lvl.queue.length ? { color: st.lvl.queue[st.qi++], n: 0 } : null;
      continue;
    }
    let pulled = false;
    for (let s = 0; s < st.boxes.length; s++) {
      const b = st.boxes[s];
      if (!b) continue;
      const ti = st.tray.indexOf(b.color);
      if (ti >= 0 && b.n < BOX_SIZE) {
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
  for (let i = 0; i < P.plates; i++) {
    // r37: a quarter of the plates (never the first) are square panels with four corner screws
    const square = i > 0 && rng.next() < 0.25;
    const len = square ? 130 + rng.int(4) * 15 : 200 + rng.int(9) * 22;
    const thick = square ? len : PLATE_T;
    const angle = ((rng.int(square ? 6 : 12) * 15) / 180) * Math.PI;
    // keep the whole plate inside the yard
    const ca = Math.abs(Math.cos(angle)), sa = Math.abs(Math.sin(angle));
    const hx = ca * (len / 2) + sa * (thick / 2), hy = sa * (len / 2) + ca * (thick / 2);
    const x = (rng.next() * 2 - 1) * Math.max(0, (YARD_W / 2) * CLUSTER - hx * 0.6);
    const y = (rng.next() * 2 - 1) * Math.max(0, (YARD_H / 2) * CLUSTER - hy * 0.6);
    const p: Plate = { id: i, x, y, len, thick, angle, z: i, screws: [] };
    const a = len / 2 - 28;
    const local: [number, number][] = square ? [[-a, -a], [a, -a], [a, a], [-a, a]] : (len >= 330 ? [-1, 0, 1] : [-1, 1]).map((o) => [o * (len / 2 - 30), 0]);
    for (const [lx, ly] of local) {
      const sc: Screw = { id: screws.length, plate: i, x: x + Math.cos(angle) * lx - Math.sin(angle) * ly, y: y + Math.sin(angle) * lx + Math.cos(angle) * ly, color: 0 };
      screws.push(sc);
      p.screws.push(sc.id);
    }
    plates.push(p);
  }
  // screw count must split into toolboxes of 3: add middle screws to the longest plates without one
  for (const p of plates.slice().sort((a, b) => b.len - a.len)) {
    if (screws.length % BOX_SIZE === 0) break;
    if (p.screws.length !== 2) continue;
    const sc: Screw = { id: screws.length, plate: p.id, x: p.x, y: p.y, color: 0 };
    screws.push(sc);
    p.screws.push(sc.id);
  }
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
