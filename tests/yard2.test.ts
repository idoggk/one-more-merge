import { describe, expect, it } from 'vitest';
import { Rng } from '../src/core/rng';
import { CLASSIC_RULES, DEFAULT_YARD_RULES, fitSlot, generateYard, newYard, platePose, removable, tapDock, tapScrew, YARD_RULES_2, type Plate, type Screw, type YardLevel, type YardRules, type YardState } from '../src/core/screw';
import { generateYard2 } from '../src/core/yardGen';
import { compileYard, freeScrews, solveYard, yardScore } from '../src/core/yardSolver';
import week from '../src/content/yards.json';

const plate = (id: number, x: number, y: number, len: number, screws: number[]): Plate => ({ id, x, y, len, thick: 72, angle: 0, z: id, screws });
const screw = (id: number, plate: number, x: number, y: number, color: number): Screw => ({ id, plate, x, y, color });

/** Every legal tap of the model (dock taps grouped by colour, like the solver). */
function taps(st: YardState): (() => void)[] {
  const out: (() => void)[] = st.lvl.screws.filter((s) => removable(st, s.id)).map((s) => () => void tapScrew(st, s.id));
  if (!st.rules.autoPull)
    [...new Set(st.tray)].forEach((c) => {
      if (fitSlot(st, c) >= 0) out.push(() => void tapDock(st, st.tray.indexOf(c)));
    });
  return out;
}
const cloneSt = (st: YardState): YardState => ({ ...st, removed: st.removed.slice(), gone: st.gone.slice(), boxes: st.boxes.map((b) => b && { ...b }), tray: st.tray.slice() });
/** Brute force through the model itself, no memo: winning tap sequences, and which first taps can still win. */
function brute(lvl: YardLevel, rules: YardRules) {
  const count = (st: YardState): number => {
    if (st.won) return 1;
    if (st.lost) return 0;
    return taps(st).reduce((n, _, i) => {
      const nx = cloneSt(st);
      taps(nx)[i]();
      return n + count(nx);
    }, 0);
  };
  const s0 = newYard(lvl, rules);
  const firsts = taps(s0).map((_, i) => {
    const nx = cloneSt(s0);
    taps(nx)[i]();
    return count(nx);
  });
  return { solutions: firsts.reduce((a, b) => a + b, 0), deadFirst: firsts.filter((n) => !n).length };
}

describe('Screw Yard 2.0 rules', () => {
  it('old rules are unchanged: classic yards replay bit for bit (fingerprint taken before 2.0)', () => {
    let h = 2166136261;
    const eat = (s: string) => {
      for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0;
    };
    for (let n = 1; n <= 12; n++) {
      const lvl = generateYard(n, 500 + n * 17);
      eat(JSON.stringify(lvl));
      const st = newYard(lvl), rng = new Rng(n);
      expect(st.rules).toBe(CLASSIC_RULES);
      while (!st.won && !st.lost) {
        const free = lvl.screws.filter((s) => removable(st, s.id));
        const { swung, ...r } = tapScrew(st, free[rng.int(free.length)].id);
        expect(swung).toEqual([]);
        eat(JSON.stringify(r));
      }
      eat(JSON.stringify([st.won, st.lost, st.moves, st.tray, st.boxes, st.qi]));
    }
    expect(h.toString(16)).toBe('f21c0821');
  });

  it('2.0 defaults: 1 box + 2 previewed colours, a 4-slot dock, no free auto-pull, swinging plates', () => {
    expect(DEFAULT_YARD_RULES).toBe(YARD_RULES_2);
    expect(YARD_RULES_2).toEqual({ boxes: 1, boxSize: 3, dock: 4, autoPull: false, preview: 2, swing: true });
    // two plates side by side, colours 1,1,0 | 0,0,1, queue [0, 1]
    const lvl: YardLevel = {
      n: 1, seed: 1, queue: [0, 1],
      plates: [plate(0, -200, 0, 224, [0, 1, 2]), plate(1, 200, 0, 224, [3, 4, 5])],
      screws: [screw(0, 0, -270, 0, 1), screw(1, 0, -200, 0, 1), screw(2, 0, -130, 0, 0), screw(3, 1, 130, 0, 0), screw(4, 1, 200, 0, 0), screw(5, 1, 270, 0, 1)],
    };
    const st = newYard(lvl, YARD_RULES_2);
    expect(st.boxes.length).toBe(1);
    tapScrew(st, 0); // colour 1 -> dock
    expect(st.tray).toEqual([1]);
    for (const id of [2, 3, 4]) expect(tapScrew(st, id).to).toBe('box');
    // box 0 left, box 1 rolled in: the dock screw stays until tapped
    expect(st.boxes[0]).toEqual({ color: 1, n: 0 });
    expect(st.tray).toEqual([1]);
    expect(tapDock(st, 0).ok).toBe(true);
    expect(st.tray).toEqual([]);
    tapScrew(st, 1);
    tapScrew(st, 5);
    expect(st.won).toBe(true);
    // the same yard under classic rules pulls the dock screw for free
    const cl = newYard(lvl, CLASSIC_RULES);
    tapScrew(cl, 0);
    expect(cl.tray).toEqual([]);
  });

  it('a full dock loses on the next screw that does not fit', () => {
    const lvl = generateYard2(1, 7, { plates: 6, colors: 4, swaps: 0, window: 3, cluster: 0.7 })!;
    const st = newYard(lvl, { ...YARD_RULES_2, dock: 0 });
    const miss = lvl.screws.find((s) => removable(st, s.id) && fitSlot(st, s.color) < 0);
    if (miss) {
      tapScrew(st, miss.id);
      expect(st.lost).toBe(true);
    }
  });
});

describe('swinging plates', () => {
  // a long plate (3 screws) over a short one; hanging from its left screw it swings down over the lower plate's screw
  const lvl: YardLevel = {
    n: 1, seed: 1, queue: [0, 1],
    plates: [plate(0, -60, 200, 224, [0, 1]), plate(1, 0, 0, 364, [2, 3, 4])],
    screws: [screw(0, 0, -136, 200, 0), screw(1, 0, 16, 200, 0), screw(2, 1, -138, 0, 1), screw(3, 1, 0, 0, 0), screw(4, 1, 138, 0, 1)],
  };
  lvl.screws.push(screw(5, 1, 0, 0, 1)); // keep 6 screws: a 4th screw sharing plate 1's centre hole
  lvl.plates[1].screws.push(5);

  it('a plate held by one screw hangs straight below it, deterministically', () => {
    const removed = [false, false, false, true, true, true];
    const a = platePose(lvl, removed, 1, true);
    expect(a.x).toBeCloseTo(-138);
    expect(a.y).toBeCloseTo(138);
    expect(a.angle).toBeCloseTo(Math.PI / 2);
    expect(platePose(lvl, removed, 1, true)).toEqual(a);
    // no swing rule, or two screws left: laid pose
    expect(platePose(lvl, removed, 1, false)).toEqual({ x: 0, y: 0, angle: 0 });
    expect(platePose(lvl, [false, false, false, false, true, true], 1, true)).toEqual({ x: 0, y: 0, angle: 0 });
    // pinned through the centre: stays put
    expect(platePose(lvl, [false, false, true, false, true, true], 1, true)).toEqual({ x: 0, y: 0, angle: 0 });
  });

  it('the swing covers a screw it did not cover before, in the model and in the solver', () => {
    for (const swing of [true, false]) {
      const rules = { ...YARD_RULES_2, swing };
      const st = newYard(lvl, rules);
      expect(removable(st, 0)).toBe(true);
      tapScrew(st, 3);
      tapScrew(st, 5);
      const r = tapScrew(st, 4);
      expect(r.swung).toEqual(swing ? [1] : []);
      expect(removable(st, 0)).toBe(!swing);
      const c = compileYard(lvl, rules);
      const rm = new Uint32Array(1);
      for (const id of [3, 4, 5]) rm[0] |= 1 << id;
      expect(freeScrews(c, rm)).toEqual(lvl.screws.filter((s) => removable(st, s.id)).map((s) => s.id));
    }
  });

  it('solver free sets match the model through random play on generated yards', () => {
    for (let seed = 1; seed <= 12; seed++) {
      const lvl = generateYard2(5, seed * 31, { plates: 10, colors: 4, swaps: 3, window: 5, cluster: 0.68 });
      if (!lvl) continue;
      const c = compileYard(lvl);
      const st = newYard(lvl), rng = new Rng(seed), rm = new Uint32Array(c.W);
      for (let k = 0; k < lvl.screws.length; k++) {
        const free = lvl.screws.filter((s) => removable(st, s.id)).map((s) => s.id);
        expect(freeScrews(c, rm)).toEqual(free);
        const id = free[rng.int(free.length)];
        st.removed[id] = true; // geometry only: bypass boxes so every screw gets tested
        if (lvl.plates[lvl.screws[id].plate].screws.every((s) => st.removed[s])) st.gone[lvl.screws[id].plate] = true;
        rm[id >>> 5] |= 1 << (id & 31);
      }
    }
  });
});

describe('exact yard solver', () => {
  // plate 1 (colour 1) covers plate 0 (colour 0); the colour-0 box comes first
  const stacked: YardLevel = {
    n: 1, seed: 3, queue: [0, 1],
    plates: [plate(0, 0, 0, 224, [0, 1, 2]), plate(1, 0, 0, 364, [3, 4, 5])],
    screws: [screw(0, 0, -76, 0, 0), screw(1, 0, 0, 0, 0), screw(2, 0, 76, 0, 0), screw(3, 1, -138, 0, 1), screw(4, 1, 0, 0, 1), screw(5, 1, 138, 0, 1)],
  };
  const noSwing = { ...YARD_RULES_2, swing: false };

  it('one plate, one colour: 3! orders, no dock', () => {
    const lvl: YardLevel = { n: 1, seed: 1, queue: [2], plates: [plate(0, 0, 0, 364, [0, 1, 2])], screws: [screw(0, 0, -138, 0, 2), screw(1, 0, 0, 0, 2), screw(2, 0, 138, 0, 2)] };
    const r = solveYard(lvl, YARD_RULES_2);
    expect(r).toMatchObject({ solvable: true, solutions: 6, deadFirst: 0, firstMoves: 3, minDockPeak: 0, greedyWins: true, randomWin: 1 });
  });

  it('a covered first colour needs the dock: solvable with 3 slots, not with 2', () => {
    const r = solveYard(stacked, { ...noSwing, dock: 3 });
    // 3! orders into the dock, 3! orders into box 0, then the three dock taps
    expect(r).toMatchObject({ solvable: true, solutions: 36, minDockPeak: 3, deadFirst: 0 });
    expect(solveYard(stacked, { ...noSwing, dock: 2 })).toMatchObject({ solvable: false, solutions: 0, minDockPeak: Infinity, deadFirst: 3 });
    expect(yardScore(solveYard(stacked, { ...noSwing, dock: 2 }), 6)).toBe(100);
  });

  it('agrees with a memo-free brute force through the model on small yards', () => {
    let checked = 0;
    for (let seed = 1; seed <= 30; seed++) {
      const lvl = generateYard2(1, seed * 7 + 1, { plates: 2, colors: 2, swaps: 2, window: 4, cluster: 0.3 });
      if (!lvl || lvl.screws.length > 6) continue;
      for (const rules of [YARD_RULES_2, { ...YARD_RULES_2, dock: 1 }, CLASSIC_RULES]) {
        const r = solveYard(lvl, rules);
        const b = brute(lvl, rules);
        expect(r.solutions).toBe(Math.min(b.solutions, 10000));
        expect(r.solvable).toBe(b.solutions > 0);
        if (r.solvable) expect(r.deadFirst).toBe(b.deadFirst);
        // the reported line really wins in the model
        if (r.solvable) {
          const st = newYard(lvl, rules);
          for (const t of r.line) (t >= 0 ? tapScrew(st, t) : tapDock(st, st.tray.indexOf(-1 - t))).ok || expect.fail('bad line tap');
          expect(st.won).toBe(true);
        }
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(15);
  });

  it('is deterministic', () => {
    const lvl = generateYard2(4, 99, { plates: 9, colors: 4, swaps: 3, window: 5, cluster: 0.75 })!;
    const { ms: _a, ...a } = solveYard(lvl);
    const { ms: _b, ...b } = solveYard(lvl);
    expect(a).toEqual(b);
    expect(JSON.stringify(generateYard2(4, 99, { plates: 9, colors: 4, swaps: 3, window: 5, cluster: 0.75 }))).toBe(JSON.stringify(lvl));
  });
});

describe('weekly ramp (src/content/yards.json)', () => {
  const yards = week.yards as unknown as (YardLevel & { score: number })[];
  const solved = yards.map((y) => {
    const r = solveYard(y);
    return { r, score: yardScore(r, y.screws.length, y.rules) };
  });

  it('10 yards on 2.0 rules, every one solver-verified with its stored score', () => {
    expect(yards.length).toBe(10);
    yards.forEach((y, i) => {
      expect(y.rules).toEqual(YARD_RULES_2);
      expect(solved[i].r.solvable).toBe(true);
      expect(solved[i].score).toBe(y.score);
    });
  });

  it('starts easy and climbs smoothly; a random tapper stops winning after yard 3', () => {
    expect(yards[0].score).toBeLessThanOrEqual(15);
    expect(yards[9].score).toBeGreaterThanOrEqual(55);
    for (let i = 1; i < 10; i++) {
      expect(yards[i].score).toBeGreaterThanOrEqual(yards[i - 1].score - 3);
      expect(yards[i].score - yards[i - 1].score).toBeLessThanOrEqual(15);
    }
    for (let i = 3; i < 10; i++) expect(solved[i].r.randomWin).toBeLessThanOrEqual(0.1);
  });
});
