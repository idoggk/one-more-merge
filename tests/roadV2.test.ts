import { describe, expect, it } from 'vitest';
import { LEVELS } from '../src/content/levels';
import { ASSET_REGISTRY } from '../src/content/assetRegistry';
import { TUNING } from '../src/content/tuning';
import { layoutRoad, ROAD } from '../src/game/road/pathGen';
import { chapterAtY, chestState, farFromCurrent, gateOpen, nodeState, releaseVelocity, rubberBand, scrollLimits, snapScroll, starsOf, stepFling } from '../src/game/road/roadModel';
import { lookOf, ROAD_SLOTS, skyColorAt } from '../src/game/road/roadArt';

const lay = layoutRoad(LEVELS);

describe('road path generator', () => {
  it('is deterministic: the same table gives the same road, byte for byte', () => {
    expect(JSON.stringify(layoutRoad(LEVELS))).toBe(JSON.stringify(layoutRoad(LEVELS.map((l) => ({ ...l })))));
  });

  it('lays all 80 levels in order, climbing, chapter by chapter', () => {
    expect(lay.nodes).toHaveLength(80);
    lay.nodes.forEach((n, i) => {
      expect(n.level).toBe(i + 1);
      expect(n.chapter).toBe(Math.ceil(n.level / 10));
      if (i > 0) expect(n.y).toBeLessThan(lay.nodes[i - 1].y);
    });
    expect(lay.nodes[0].y).toBe(0);
    expect(lay.chapters).toHaveLength(8);
  });

  it('keeps every node (and chest) inside the width and 88+ px apart', () => {
    const pts = [...lay.nodes.map((n) => ({ id: `n${n.level}`, x: n.x, y: n.y })), ...lay.chests.map((c) => ({ id: c.id, x: c.x, y: c.y }))];
    for (const p of pts) {
      expect(p.x, p.id).toBeGreaterThanOrEqual(60);
      expect(p.x, p.id).toBeLessThanOrEqual(ROAD.width - 60);
    }
    for (const n of lay.nodes) {
      expect(n.x).toBeGreaterThanOrEqual(ROAD.xMin);
      expect(n.x).toBeLessThanOrEqual(ROAD.xMax);
    }
    let min = Infinity;
    for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) min = Math.min(min, Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y));
    expect(min).toBeGreaterThanOrEqual(ROAD.minGap);
  });

  it('depends on the level number only: node kinds, ribbons and fixed landmarks', () => {
    for (const n of lay.nodes) {
      const def = LEVELS[n.level - 1];
      expect(n.kind).toBe(n.level % 10 === 0 ? 'boss' : def.mini_boss ? 'mini' : 'normal');
      expect(n.ribbon).toBe(def.difficulty === 'MEGA_HARD' ? 'mega' : def.difficulty === 'HARD' ? 'hard' : 'none');
    }
    expect(lay.nodes.filter((n) => n.kind === 'boss').map((n) => n.level)).toEqual([10, 20, 30, 40, 50, 60, 70, 80]);
    expect(lay.nodes.filter((n) => n.kind === 'mini').map((n) => n.level)).toEqual([8, 18, 28, 38, 48, 58, 68, 78]);
    // a boss and the next chapter's level 1 line up through the gate
    for (const c of lay.chapters.slice(0, 7)) expect(lay.nodes[c.bossLevel - 1].x).toBe(lay.nodes[c.bossLevel].x);
    // landmarks: banner under level 1, gate above the boss, 8 chapters x 2 chests
    for (const c of lay.chapters) {
      expect(c.bannerY).toBe(lay.nodes[c.firstLevel - 1].y + ROAD.bannerBelow);
      expect(c.gateY).toBe(lay.nodes[c.bossLevel - 1].y - ROAD.gateAbove);
    }
    expect(lay.chests.map((c) => c.afterLevel).slice(0, 4)).toEqual([3, 6, 13, 16]);
    expect(lay.chests).toHaveLength(16);
  });

  it('draws one smooth segment per pair of neighbouring levels', () => {
    expect(lay.segments).toHaveLength(79);
    lay.segments.forEach((s, i) => {
      expect(s.from).toBe(i + 1);
      expect(s.to).toBe(i + 2);
      expect(s.pts[0]).toMatchObject({ x: lay.nodes[i].x, y: lay.nodes[i].y });
      expect(s.pts[s.pts.length - 1]).toMatchObject({ x: lay.nodes[i + 1].x, y: lay.nodes[i + 1].y });
    });
  });
});

describe('road state mapping', () => {
  const stars = { '1': 3, '2': 1, '4': 2 };
  it('maps level + progress to locked / open / current / completed', () => {
    expect(nodeState(1, 5, stars)).toBe('completed');
    expect(nodeState(3, 5, stars)).toBe('open'); // passed without stars on record
    expect(nodeState(5, 5, stars)).toBe('current');
    expect(nodeState(6, 5, stars)).toBe('locked');
    expect(nodeState(80, 80, {})).toBe('current');
  });
  it('clamps star counts and tracks chests and gates', () => {
    expect(starsOf(1, stars)).toBe(3);
    expect(starsOf(3, stars)).toBe(0);
    expect(starsOf(1, { '1': 9 })).toBe(3);
    const chest = lay.chests[0]; // after level 3
    expect(chestState(chest, 3)).toBe('closed');
    expect(chestState(chest, 4)).toBe('open');
    expect(gateOpen(1, 10)).toBe(false);
    expect(gateOpen(1, 11)).toBe(true);
    expect(chapterAtY(lay.chapters, 0)).toBe(1);
    expect(chapterAtY(lay.chapters, lay.nodes[44].y)).toBe(5);
    expect(chapterAtY(lay.chapters, lay.topY)).toBe(8);
  });
});

describe('snap to current and momentum', () => {
  const top = 128, bottom = 1300;
  const { lo, hi } = scrollLimits(lay.topY, lay.bottomY, top, bottom);
  it('puts the current node mid-view, inside the limits', () => {
    for (const lvl of [1, 10, 11, 40, 80]) {
      const y = lay.nodes[lvl - 1].y;
      const s = snapScroll(y, top, bottom, lo, hi);
      expect(s).toBeGreaterThanOrEqual(lo);
      expect(s).toBeLessThanOrEqual(hi);
      const sy = y + s;
      expect(sy).toBeGreaterThan(top);
      expect(sy).toBeLessThan(bottom);
      if (lvl === 40) expect(sy).toBeCloseTo((top + bottom) / 2, 5);
      expect(farFromCurrent(y, s, top, bottom)).toBe(false);
    }
    expect(farFromCurrent(0, hi, top, bottom)).toBe(true);
  });
  it('coasts to rest, and a pull past the end springs back inside', () => {
    let s: { pos: number; vel: number; rest?: boolean } = { pos: lo + 400, vel: -1.5 };
    for (let i = 0; i < 600 && !s.rest; i++) s = stepFling(s, 16.7, lo, hi);
    expect(s.rest).toBe(true);
    expect(s.pos).toBeGreaterThanOrEqual(lo);
    let o: { pos: number; vel: number; rest?: boolean } = { pos: hi + 80, vel: 0 };
    for (let i = 0; i < 600 && !o.rest; i++) o = stepFling(o, 16.7, lo, hi);
    expect(o.rest).toBe(true);
    expect(o.pos).toBeLessThanOrEqual(hi);
    expect(o.pos).toBeGreaterThan(hi - 1);
  });
  it('rubber-bands a drag past the end and derives a release velocity', () => {
    expect(rubberBand(hi - 10, lo, hi)).toBe(hi - 10);
    const pulled = rubberBand(hi + 500, lo, hi);
    expect(pulled).toBeGreaterThan(hi);
    expect(pulled - hi).toBeLessThan(ROAD.width / 4);
    expect(releaseVelocity([{ t: 0, y: 0 }, { t: 50, y: 100 }], 60)).toBeCloseTo(2, 5);
    expect(releaseVelocity([{ t: 0, y: 0 }], 10)).toBe(0);
  });
});

describe('art slots and fallbacks', () => {
  it('registers every road slot in the asset registry', () => {
    const ids = new Set(ASSET_REGISTRY.map((a) => a.id));
    expect(ROAD_SLOTS.filter((k) => !ids.has(k))).toEqual([]);
    expect(ROAD_SLOTS).toHaveLength(26);
  });
  it('has a palette per chapter and a backdrop colour that stays continuous', () => {
    for (let c = 1; c <= 8; c++) expect(lookOf(c).name.length).toBeGreaterThan(2);
    const ch = lay.chapters[1];
    const a = skyColorAt(lay.chapters, 2, ch.bottomY), b = skyColorAt(lay.chapters, 2, ch.topY);
    expect(a).not.toBe(b);
  });
  it('ships OFF by default', () => expect(TUNING.levelRoadV2).toBe(false));
});
