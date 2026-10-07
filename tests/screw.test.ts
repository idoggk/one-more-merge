import { describe, expect, it } from 'vitest';
import { blockedBy, BOX_SIZE, generateYard, newYard, removable, solveGreedy, tapScrew, TRAY_CAP, YARD_TIERS } from '../src/core/screw';

describe('r36 SCREW YARD', () => {
  it('every generated yard is solvable and its colours fill the toolbox queue exactly', () => {
    for (let n = 1; n <= 24; n++)
      for (const seed of [11, 222, 3333]) {
        const lvl = generateYard(n, seed * 100 + n);
        expect(lvl.screws.length % BOX_SIZE).toBe(0);
        expect(lvl.queue.length).toBe(lvl.screws.length / BOX_SIZE);
        const want = new Map<number, number>();
        for (const c of lvl.queue) want.set(c, (want.get(c) ?? 0) + BOX_SIZE);
        const have = new Map<number, number>();
        for (const s of lvl.screws) have.set(s.color, (have.get(s.color) ?? 0) + 1);
        expect(have).toEqual(want);
        expect(solveGreedy(lvl)).toBe(true);
      }
  });

  it('a covered screw cannot come out; the top plate is always free', () => {
    const lvl = generateYard(8, 4242);
    const st = newYard(lvl);
    const top = lvl.plates[lvl.plates.length - 1];
    for (const s of top.screws) expect(removable(st, s)).toBe(true);
    const covered = lvl.screws.find((s) => blockedBy(lvl, st.gone, s.id) !== null);
    if (covered) expect(tapScrew(st, covered.id).reason).toBe('blocked');
  });

  it('a plate falls with its last screw; full boxes leave and pull matching tray screws', () => {
    const lvl = generateYard(6, 77);
    const st = newYard(lvl);
    let fell = 0, left = 0;
    for (let k = 0; k < 500 && !st.won && !st.lost; k++) {
      const free = lvl.screws.filter((s) => removable(st, s.id));
      const fit = free.find((s) => st.boxes.some((b) => b && b.color === s.color && b.n < BOX_SIZE)) ?? free[0];
      const r = tapScrew(st, fit.id);
      fell += r.fell.length;
      left += r.left.length;
      expect(st.tray.length).toBeLessThanOrEqual(TRAY_CAP);
    }
    if (st.won) {
      expect(fell).toBe(lvl.plates.length);
      expect(left).toBe(lvl.queue.length);
    }
  });

  it('is deterministic and the grand prize is the last tier', () => {
    expect(JSON.stringify(generateYard(5, 9))).toBe(JSON.stringify(generateYard(5, 9)));
    expect(YARD_TIERS[YARD_TIERS.length - 1].reward.epic).toBe(true);
  });
});
