import { describe, expect, it } from 'vitest';
import { LEVELS } from '../src/content/levels';
import { ROAD_SURFACE_KIT, storedRoadSurfaceKit } from '../src/content/experiments';
import { layoutRoad } from '../src/game/road/pathGen';
import { KIT_MAX_TOTAL, KIT_PIECES, cardinal, curveFor, kitManifest, placeholderOutline, planRoad, planSegment, straightFor } from '../src/game/road/roadKit';
import { densify } from '../src/game/road/roadKitFx';

const all = (_key: string) => true;
const line = (...p: [number, number][]) => densify(p.map(([x, y]) => ({ x, y })), 15);
const kinds = (pts: { x: number; y: number }[], has = all) => {
  const p = planSegment(pts, { chapter: 2, has });
  return p.covered ? p.stamps.map((s) => s.piece) : p.reason;
};

describe('road kit: path to pieces', () => {
  it('manifest is 8 chapters x 12 pieces with the road_chN_piece key', () => {
    const m = kitManifest();
    expect(m.length).toBe(96);
    expect(m).toContain('road_ch3_curve_ne');
    expect(KIT_PIECES.length).toBe(12);
  });
  it('straights: horizontal, vertical, and a diagonal as a rotated straight', () => {
    expect(kinds(line([0, 0], [600, 0]))).toEqual(['straight_h', 'straight_h', 'straight_h']);
    expect(kinds(line([0, 0], [0, -600]))).toEqual(['straight_v', 'straight_v', 'straight_v']);
    const d = planSegment(line([0, 0], [400, 400]), { chapter: 1, has: all });
    expect(d.covered && d.stamps.every((s) => Math.abs(Math.abs(s.rot) - Math.PI / 4) < 1e-6)).toBe(true);
    expect(straightFor(Math.PI / 6).piece).toBe('straight_h');
    expect(straightFor(-Math.PI / 2 + 0.2).piece).toBe('straight_v');
  });
  it('left and right turns pick the curve joining the entry and exit edges', () => {
    expect(kinds(line([0, 0], [300, 0], [300, -300]))).toEqual(['straight_h', 'curve_nw', 'straight_v']); // east then north (left turn): W and N edges
    expect(kinds(line([0, 0], [300, 0], [300, 300]))).toEqual(['straight_h', 'curve_sw', 'straight_v']); // east then south (right turn)
    expect(kinds(line([300, 300], [300, 0], [0, 0]))).toEqual(['straight_v', 'curve_sw', 'straight_h']); // north then west: S and W edges
    expect(kinds(line([0, 300], [0, 0], [300, 0]))).toEqual(['straight_v', 'curve_se', 'straight_h']);
    expect(curveFor('N', 'E')).toBe('curve_se');
    expect(curveFor('E', 'E')).toBeNull();
    expect(curveFor('E', 'W')).toBeNull();
    expect(cardinal(-Math.PI / 2)).toBe('N');
    expect(cardinal(Math.PI)).toBe('W');
  });
  it('falls back for a hairpin, a missing texture, an empty or over-long segment', () => {
    expect(kinds(line([0, 0], [300, 0], [0, 20]))).toBe('hairpin');
    expect(kinds(line([0, 0], [600, 0]), (k) => !k.endsWith('straight_h'))).toBe('missing_texture');
    expect(kinds([{ x: 5, y: 5 }])).toBe('empty');
    expect(kinds(line([0, 0], [0, 0]))).toBe('empty');
    expect(planSegment(line([0, 0], [9000, 0]), { chapter: 1, has: all })).toEqual({ covered: false, reason: 'too_long' });
  });
  it('a curve needs its own texture too (straights present, curve missing = fallback)', () => {
    expect(kinds(line([0, 0], [300, 0], [300, -300]), (k) => !k.includes('curve'))).toBe('missing_texture');
  });
  it('the cap stops stamping: later segments fall back, earlier ones keep their pieces', () => {
    const segs = [0, 1, 2].map((i) => ({ from: 1, pts: line([0, i * 1000], [600, i * 1000]) })); // 3 pieces each
    const plans = planRoad(segs, () => 1, all, 7);
    expect(segs.map((s) => plans.get(s)!.covered)).toEqual([true, true, false]);
    expect(plans.get(segs[2])).toEqual({ covered: false, reason: 'cap' });
  });
  it('the real road: with every texture present the total stays under the cap; with none, everything falls back', () => {
    const lay = layoutRoad(LEVELS);
    const full = planRoad(lay.segments, (s) => Math.ceil(s.from / 10), all);
    let n = 0;
    for (const p of full.values()) if (p.covered) n += p.stamps.length;
    expect(n).toBeLessThanOrEqual(KIT_MAX_TOTAL);
    expect(n).toBeGreaterThan(0);
    const none = planRoad(lay.segments, (s) => Math.ceil(s.from / 10), () => false);
    expect([...none.values()].every((p) => !p.covered)).toBe(true);
  });
  it('placeholder outlines exist for every piece and stay inside the cell', () => {
    for (const p of KIT_PIECES) {
      const o = placeholderOutline(p);
      expect(o.length, p).toBeGreaterThanOrEqual(4);
      for (const q of o) expect(Math.abs(q.x) <= 256.5 && Math.abs(q.y) <= 256.5, `${p} ${q.x},${q.y}`).toBe(true);
    }
  });
});

describe('road kit: flag', () => {
  it('ships OFF; only a stored "on" enables it', () => {
    expect(ROAD_SURFACE_KIT.on).toBe(false);
    expect(storedRoadSurfaceKit(() => null)).toBe(false);
    expect(storedRoadSurfaceKit(() => 'on')).toBe(true);
    expect(storedRoadSurfaceKit(() => { throw new Error('x'); })).toBe(false);
  });
});
