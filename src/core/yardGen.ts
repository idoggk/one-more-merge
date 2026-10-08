// Screw Yard 2.0 (t-11ac42f6) layout generator. Same three plate shapes as the r36 yard; the removal order respects
// covering *with swinging plates*, is coloured in triples (= the box queue, so a tap-in-order line never touches the
// dock) and then mixed so the dock and the preview matter. tools/gen-yards.ts keeps only solver-verified layouts.
import { Rng } from './rng';
import { BOX_SIZE, PLATE_SHAPES, YARD_H, YARD_RULES_2, YARD_W, type Plate, type PlateKind, type Screw, type YardLevel, type YardRules } from './screw';
import { compileYard, freeScrews } from './yardSolver';

export interface YardGenParams {
  plates: number;
  colors: number;
  /** Colour swaps between nearby screws of the removal order. */
  swaps: number;
  /** How far (in removal order) a swap may reach. */
  window: number;
  /** Fraction of the yard the plates cluster in (smaller = deeper stacks). */
  cluster: number;
}

export function generateYard2(n: number, seed: number, P: YardGenParams, rules: YardRules = YARD_RULES_2): YardLevel | null {
  const rng = new Rng(seed);
  const kinds: PlateKind[] = [];
  for (let i = 0; i < P.plates; i++) {
    const r = rng.next();
    kinds.push(i > 0 && r < 0.25 ? 'square' : r < 0.62 ? 'long' : 'short');
  }
  const total = () => kinds.reduce((t, k) => t + PLATE_SHAPES[k].holes.length, 0);
  // long (3 holes) <-> short (2) moves the screw total by one: drop one for a remainder of 1, add one for 2
  for (let guard = 0; guard < 20 && total() % BOX_SIZE !== 0; guard++) {
    const want = total() % BOX_SIZE === 1 ? 'long' : 'short';
    const i = kinds.lastIndexOf(want);
    if (i >= 0) kinds[i] = want === 'long' ? 'short' : 'long';
    else {
      const j = kinds.findIndex((k) => k !== 'square');
      if (j < 0) return null;
      kinds[j] = kinds[j] === 'long' ? 'short' : 'long';
    }
  }
  if (total() % BOX_SIZE !== 0) return null;
  const plates: Plate[] = [];
  const screws: Screw[] = [];
  kinds.forEach((kind, i) => {
    const { len, thick, holes } = PLATE_SHAPES[kind];
    const angle = ((rng.int(kind === 'square' ? 6 : 12) * 15) / 180) * Math.PI;
    const ca = Math.abs(Math.cos(angle)), sa = Math.abs(Math.sin(angle));
    const hx = ca * (len / 2) + sa * (thick / 2), hy = sa * (len / 2) + ca * (thick / 2);
    const x = (rng.next() * 2 - 1) * Math.max(0, (YARD_W / 2) * P.cluster - hx * 0.6);
    const y = (rng.next() * 2 - 1) * Math.max(0, (YARD_H / 2) * P.cluster - hy * 0.6);
    const p: Plate = { id: i, kind, x, y, len, thick, angle, z: i, screws: [] };
    for (const [fx, fy] of holes) {
      const lx = fx * len, ly = fy * thick;
      const sc: Screw = { id: screws.length, plate: i, x: x + Math.cos(angle) * lx - Math.sin(angle) * ly, y: y + Math.sin(angle) * lx + Math.cos(angle) * ly, color: 0 };
      screws.push(sc);
      p.screws.push(sc.id);
    }
    plates.push(p);
  });
  const lvl: YardLevel = { n, seed, plates, screws, queue: [], rules };
  // a removal order that respects covering, swinging included
  const c = compileYard(lvl, rules);
  const rm = new Uint32Array(c.W);
  const order: number[] = [];
  while (order.length < screws.length) {
    const free = freeScrews(c, rm);
    if (!free.length) return null;
    const sid = free[rng.int(free.length)];
    rm[sid >>> 5] |= 1 << (sid & 31);
    order.push(sid);
  }
  const queue: number[] = [];
  for (let t = 0; t < order.length / BOX_SIZE; t++) {
    let col = rng.int(P.colors);
    if (t > 0 && col === queue[t - 1]) col = (col + 1 + rng.int(P.colors - 1)) % P.colors;
    queue.push(col);
  }
  const colorAt = order.map((_, i) => queue[Math.floor(i / BOX_SIZE)]);
  for (let k = 0; k < P.swaps; k++) {
    const i = rng.int(order.length);
    const j = Math.min(order.length - 1, i + 1 + rng.int(P.window));
    [colorAt[i], colorAt[j]] = [colorAt[j], colorAt[i]];
  }
  order.forEach((sid, i) => (screws[sid].color = colorAt[i]));
  lvl.queue = queue;
  return lvl;
}
