import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('phaser', () => ({ default: {} }));
vi.mock('../src/game/sceneKit', () => ({ W: 720, H: 1280, REDUCED_MOTION: false }));
vi.mock('../src/game/fx/boltAnimator', () => ({ BoltAnimator: { create: vi.fn(() => null) } }));

import { ROAD_MAP_MOCK1, storedRoadMapMock1 } from '../src/content/experiments';
import { addMockHeroFx } from '../src/game/road/roadMapMock1';
import { boltSpot, HERO_FX, MOCK_ASSETS, mockScale, mockSideOf, sparkleSpots } from '../src/game/road/roadMapMock1Model';
import { BADGES, layoutBadges } from '../src/game/road/mapBadgesModel';

function obj(): any {
  const o: any = new Proxy({}, { get: (_t, name: string) => (name === 'active' ? true : () => o) });
  return o;
}
function fakeScene(counts: { img: number; circ: number }) {
  return {
    hasArt: () => true,
    time: { delayedCall: (_ms: number, fn: () => void) => fn() },
    add: { container: () => obj(), circle: () => (counts.circ++, obj()), image: () => (counts.img++, obj()) },
  } as any;
}
const layer = () => ({ add: vi.fn(), addAt: vi.fn() });

beforeEach(() => { ROAD_MAP_MOCK1.on = false; });

describe('road map mock 1 model', () => {
  it('flag defaults OFF and reads only "on"', () => {
    expect(ROAD_MAP_MOCK1.on).toBe(false);
    expect(storedRoadMapMock1(() => null)).toBe(false);
    expect(storedRoadMapMock1(() => 'on')).toBe(true);
    expect(storedRoadMapMock1(() => { throw new Error('no storage'); })).toBe(false);
  });
  it('scales 390 CSS px to the 720 design width', () => expect(mockScale(720)).toBeCloseTo(1.846, 3));
  it('mock rails: Daily / Quests / Collect left, Event / Offer / Season right, 3 a side', () => {
    const lay = layoutBadges({ level: 20, seasonClaimable: 0 }, 'auto', mockSideOf);
    expect(lay.left.map((p) => p.def.id).sort()).toEqual(['album', 'daily', 'quests']);
    expect(lay.right.map((p) => p.def.id).sort()).toEqual(['events', 'offers', 'season']);
    expect(lay.floats.map((p) => p.def.id).sort()).toEqual(['mail', 'settings']);
  });
  it('default layout (no side function) is unchanged: season on the left', () => {
    const lay = layoutBadges({ level: 20, seasonClaimable: 0 });
    expect(lay.left.map((p) => p.def.id)).toContain('season');
    expect(lay.right.map((p) => p.def.id)).not.toContain('season');
    expect(BADGES.every((d) => mockSideOf(d) === 'F' || ['L', 'R'].includes(mockSideOf(d)))).toBe(true);
  });
  it('sparkles: capped at 6, deterministic, staggered inside the period, never negative', () => {
    expect(sparkleSpots(99, 100, 40, 0, 1400)).toHaveLength(HERO_FX.sparkles);
    expect(sparkleSpots(-3, 100, 40, 0, 1400)).toEqual([]);
    expect(sparkleSpots(NaN, 100, 40, 0, 1400)).toEqual([]);
    const a = sparkleSpots(6, 100, 40, 0, 1400);
    expect(a).toEqual(sparkleSpots(6, 100, 40, 0, 1400));
    expect(a.every((s) => s.delay >= 0 && s.delay < 1400)).toBe(true);
    expect(new Set(a.map((s) => s.delay)).size).toBe(6);
  });
  it('Bolt stands on the roomy side and stays on screen', () => {
    expect(boltSpot(500, 360, 720).dx).toBe(-1);
    expect(boltSpot(200, 360, 720).dx).toBe(1);
    expect(boltSpot(700, 360, 720).x).toBeGreaterThanOrEqual(70);
    expect(boltSpot(10, 360, 720).x).toBeLessThanOrEqual(650);
  });
  it('flags every placeholder honestly', () => {
    expect(MOCK_ASSETS.filter((a) => a.status === 'placeholder').length).toBeGreaterThanOrEqual(3);
  });
});

describe('addMockHeroFx', () => {
  const opts = { x: 360, y: 900, boss: false, centerX: 360, loop: vi.fn() };
  it('flag OFF: draws nothing', () => {
    const counts = { img: 0, circ: 0 }, l = layer();
    expect(addMockHeroFx(fakeScene(counts), l as never, opts)).toBe(0);
    expect(counts).toEqual({ img: 0, circ: 0 });
    expect(l.add).not.toHaveBeenCalled();
  });
  it('flag ON: glow + 6 sparkles, glow goes under the road pieces, loops registered', () => {
    ROAD_MAP_MOCK1.on = true;
    const counts = { img: 0, circ: 0 }, l = layer(), loop = vi.fn();
    expect(addMockHeroFx(fakeScene(counts), l as never, { ...opts, loop })).toBe(1 + HERO_FX.sparkles);
    expect(l.addAt).toHaveBeenCalledTimes(1);
    expect(counts.img).toBe(HERO_FX.sparkles);
    expect(loop).toHaveBeenCalledTimes(1 + HERO_FX.sparkles);
  });
  it('flag ON, star art missing: sparkles fall back to circles', () => {
    ROAD_MAP_MOCK1.on = true;
    const counts = { img: 0, circ: 0 }, s = fakeScene(counts);
    s.hasArt = () => false;
    addMockHeroFx(s, layer() as never, { ...opts, boss: true });
    expect(counts.img).toBe(0);
    expect(counts.circ).toBe(3 + HERO_FX.sparkles);
  });
});
