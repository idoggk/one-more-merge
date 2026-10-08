// Screw Yard 2.0 step 2 (t-98293568): the playable yard - win / lose / dock, boosters, stars, the free weekly event.
import { describe, expect, it } from 'vitest';
import { newYard, removable, tapDock, tapScrew, useDrill, useMagnet, useWell, YARD_RULES_2, YARD_TIERS, yardStars, type Plate, type Screw, type YardLevel } from '../src/core/screw';
import { solveYard } from '../src/core/yardSolver';
import { addBoosters, colourPerm, nextYard, recordYard, tierReached, weekYard, YARD_BOOSTER_CAP, YARD_BOOSTER_START, YARD_COUNT, yardPlayable, yardStarBolts, yardStarTotal, yardWeekRec } from '../src/core/yardWeek';
import week from '../src/content/yards.json';

const plate = (id: number, x: number, y: number, len: number, screws: number[]): Plate => ({ id, x, y, len, thick: 72, angle: 0, z: id, screws });
const screw = (id: number, plate: number, x: number, y: number, color: number): Screw => ({ id, plate, x, y, color });
/** Plate 1 (colour 1) lies on plate 0 (colour 0); the colour-0 box comes first. */
const stacked = (): YardLevel => ({
  n: 1, seed: 3, queue: [0, 1], rules: YARD_RULES_2,
  plates: [plate(0, 0, 0, 224, [0, 1, 2]), plate(1, 0, 0, 364, [3, 4, 5])],
  screws: [screw(0, 0, -76, 0, 0), screw(1, 0, 0, 0, 0), screw(2, 0, 76, 0, 0), screw(3, 1, -138, 0, 1), screw(4, 1, 0, 0, 1), screw(5, 1, 138, 0, 1)],
});
const noSwing = { ...YARD_RULES_2, swing: false };
/** Play a solver line (board id, or -1 - colour for a dock tap). */
function play(lvl: YardLevel, line: number[]) {
  const st = newYard(lvl);
  for (const t of line) expect((t >= 0 ? tapScrew(st, t) : tapDock(st, st.tray.indexOf(-1 - t))).ok).toBe(true);
  return st;
}

describe('the weekly yards on 2.0 rules', () => {
  it('every week reuses the curated ramp in its own colours; the solver facts do not move', () => {
    expect(YARD_COUNT).toBe(10);
    expect(colourPerm(5).slice().sort()).toEqual([0, 1, 2, 3, 4, 5]);
    expect(colourPerm(5)).not.toEqual(colourPerm(6));
    for (const n of [1, 2, 3, 8]) {
      const a = weekYard(n, 2915), stored = week.yards[n - 1];
      expect(a.rules).toEqual(YARD_RULES_2);
      expect(newYard(a).rules).toEqual(YARD_RULES_2);
      expect(a.minPeak).toBe(stored.stats.minDockPeak);
      const r = solveYard(a);
      expect(r.solvable).toBe(true);
      expect(r.minDockPeak).toBe(a.minPeak);
    }
    // the stored ramp itself is not touched by a week's copy
    weekYard(1, 1).screws[0].color = 99;
    expect(week.yards[0].screws[0].color).not.toBe(99);
  });

  it('WIN: the solver line at the minimum dock clears the yard with 3 stars', () => {
    for (const n of [1, 4, 8]) {
      const lvl = weekYard(n, 77);
      const r = solveYard(lvl, { ...YARD_RULES_2, dock: lvl.minPeak });
      const st = play(lvl, r.line);
      expect(st.won).toBe(true);
      expect(st.peak).toBeLessThanOrEqual(lvl.minPeak);
      expect(yardStars(st.won, st.peak, lvl.minPeak)).toBe(3);
    }
  });

  it('LOSE: a screw that finds no box and no dock slot ends the yard; the overflow is not counted as peak', () => {
    const st = newYard(stacked(), { ...noSwing, dock: 2 });
    expect(tapScrew(st, 3).to).toBe('tray');
    tapScrew(st, 4);
    expect(st.lost).toBe(false);
    tapScrew(st, 5);
    expect(st.lost).toBe(true);
    expect(st.peak).toBe(2);
    expect(tapScrew(st, 0).reason).toBe('over');
    expect(yardStars(st.won, st.peak, 0)).toBe(0);
  });

  it('DOCK: dock screws wait until tapped, and only into a box of their colour', () => {
    const st = newYard(stacked(), noSwing);
    tapScrew(st, 3);
    expect(st.tray).toEqual([1]);
    expect(tapDock(st, 0)).toMatchObject({ ok: false, reason: 'blocked' });
    for (const id of [4, 5]) tapScrew(st, id); // plate 1 falls, colour 0 frees
    for (const id of [0, 1, 2]) expect(tapScrew(st, id).to).toBe('box');
    expect(st.boxes[0]).toEqual({ color: 1, n: 0 });
    expect(st.tray).toEqual([1, 1, 1]);
    expect(st.peak).toBe(3);
    for (let k = 0; k < 3; k++) expect(tapDock(st, 0).ok).toBe(true);
    expect(st.won).toBe(true);
    expect(yardStars(true, st.peak, solveYard(stacked(), noSwing).minDockPeak)).toBe(3);
  });
});

describe('earned boosters', () => {
  it('DRILL takes out a covered screw (box or dock) and is refused when it would lose', () => {
    const st = newYard(stacked());
    expect(removable(st, 0)).toBe(false);
    expect(useDrill(st, 0)).toMatchObject({ ok: true, to: 'box' });
    expect(st.boxes[0]!.n).toBe(1);
    expect(useDrill(st, 0).reason).toBe('removed');
    const full = newYard(stacked(), { ...YARD_RULES_2, dock: 0 });
    expect(useDrill(full, 3).reason).toBe('full');
    expect(full.lost).toBe(false);
  });

  it('MAGNET fills the open box: dock screws first, then pile screws, covered or not', () => {
    const st = newYard(stacked());
    tapScrew(st, 3);
    expect(st.tray).toEqual([1]);
    const a = useMagnet(st);
    expect(a).toMatchObject({ ok: true, taken: [0, 1, 2], fell: [0], pulls: [] });
    expect(a.left).toEqual([{ slot: 0, color: 0 }]);
    expect(st.tray).toEqual([1]); // no free auto-pull, even after a magnet
    const b = useMagnet(st);
    expect(b.pulls).toEqual([{ color: 1, slot: 0 }]);
    expect(b.taken).toEqual([4, 5]);
    expect(b.fell).toEqual([1]);
    expect(st.won).toBe(true);
    expect(useMagnet(st).reason).toBe('over');
  });

  it('+WELL opens one more dock slot, once per yard', () => {
    const st = newYard(stacked(), { ...noSwing, dock: 2 });
    expect(useWell(st).ok).toBe(true);
    expect(st.rules.dock).toBe(3);
    expect(useWell(st).reason).toBe('used');
    for (const id of [3, 4, 5]) tapScrew(st, id);
    expect(st.lost).toBe(false);
    expect(st.peak).toBe(3);
    expect(YARD_RULES_2.dock).toBe(4); // the shared rules are never mutated
  });

  it('counts: a small starter kit, capped, earned only (first 3 stars, tiers)', () => {
    expect(YARD_BOOSTER_START).toEqual({ drill: 1, magnet: 1, well: 1 });
    let have = addBoosters({}, YARD_BOOSTER_START);
    for (let k = 0; k < 5; k++) have = addBoosters(have, { drill: 1 });
    expect(have).toEqual({ drill: YARD_BOOSTER_CAP, magnet: 1, well: 1 });
    expect(addBoosters(have)).toEqual(have);
    const rewarded = YARD_TIERS.flatMap((t) => Object.keys(t.reward.boosters ?? {}));
    expect(rewarded.sort()).toEqual(['drill', 'magnet', 'well']);
  });
});

describe('stars and the free weekly event', () => {
  it('stars by dock peak against the solver minimum', () => {
    expect([0, 1, 2, 3, 4, 5].map((p) => yardStars(true, p, 0))).toEqual([3, 3, 2, 2, 1, 1]);
    expect([2, 3, 4, 5, 6].map((p) => yardStars(true, p, 2))).toEqual([3, 3, 2, 2, 1]);
    expect(yardStars(false, 0, 0)).toBe(0);
  });

  it('a classic record of this week moves to 2.0 keeping its paid tiers; a new week starts over', () => {
    expect(yardWeekRec({ week: 9, clears: 9, paid: 4 }, 9)).toEqual({ week: 9, clears: 0, paid: 4, stars: {} });
    expect(yardWeekRec({ week: 8, clears: 3, paid: 1, stars: { 1: 3 } }, 9)).toEqual({ week: 9, clears: 0, paid: 0, stars: {} });
    const keep = { week: 9, clears: 2, paid: 1, stars: { 1: 3, 2: 1 } };
    expect(yardWeekRec(keep, 9)).toBe(keep);
  });

  it('the track pays for new stars, not replays; tiers once; first 3 stars earn a booster', () => {
    const rec = yardWeekRec(undefined, 1);
    expect(nextYard(rec)).toBe(1);
    expect(yardPlayable(rec, 2)).toBe(false);
    let o = recordYard(rec, 1, 2);
    expect(o).toMatchObject({ gainedStars: 2, bolts: 2 * yardStarBolts(1), tiers: [0], boosters: {} });
    expect(yardPlayable(rec, 2)).toBe(true);
    o = recordYard(rec, 1, 2);
    expect(o).toMatchObject({ gainedStars: 0, bolts: 0, tiers: [] });
    o = recordYard(rec, 1, 1);
    expect(rec.stars![1]).toBe(2); // best stars stay
    o = recordYard(rec, 1, 3);
    expect(o).toMatchObject({ gainedStars: 1, boosters: { drill: 1 } });
    expect(recordYard(rec, 1, 3).boosters).toEqual({});
    expect(recordYard(rec, 2, 0)).toMatchObject({ gainedStars: 0, bolts: 0 }); // a loss books nothing
    expect(rec.clears).toBe(1);
    for (let n = 2; n <= 10; n++) recordYard(rec, n, 3);
    expect(yardStarTotal(rec)).toBe(30);
    expect(rec.paid).toBe(YARD_TIERS.length);
    expect(YARD_TIERS.every((_, i) => tierReached(rec, i))).toBe(true);
    expect(nextYard(rec)).toBe(10);
  });

  it('tiers need stars (max 30 a week), climb, and end in the grand prize', () => {
    const needs = YARD_TIERS.map((t) => t.need);
    expect(needs.every((v, i) => !i || v > needs[i - 1])).toBe(true);
    expect(needs[needs.length - 1]).toBeLessThanOrEqual(YARD_COUNT * 3);
    expect(YARD_TIERS[YARD_TIERS.length - 1].reward.epic).toBe(true);
    // a 2-star average clears most of the track; the grand prize asks for skill
    const rec = yardWeekRec(undefined, 1);
    for (let n = 1; n <= 10; n++) recordYard(rec, n, 2);
    expect(rec.paid).toBe(YARD_TIERS.length - 2);
  });
});
