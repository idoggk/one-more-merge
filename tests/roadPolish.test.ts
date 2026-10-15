import { describe, expect, it } from 'vitest';
import { LEVELS } from '../src/content/levels';
import { applyRoadPolish, ROAD_POLISH, storedRoadPolish } from '../src/content/experiments';
import { layoutRoad } from '../src/game/road/pathGen';
import {
  AMBIENT_CAP, beltOffset, chestVisual, dashSegments, groundStyleOf, hopCount, hopFrame, joinPaths, layerY, nodeVisual, pathLength, PARALLAX, pickAmbient, pointAt, stepProgress, travelSpan, UNLOCK_TIMELINE, unlockTotal,
} from '../src/game/road/roadPolishModel';

const lay = layoutRoad(LEVELS);
const line = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }];

describe('road polish: flag', () => {
  it('is OFF by default and only a stored "on" turns it on', () => {
    expect(ROAD_POLISH.on).toBe(false);
    expect(storedRoadPolish(() => 'on')).toBe(true);
    expect(storedRoadPolish(() => null)).toBe(false);
    expect(storedRoadPolish(() => 'off')).toBe(false);
    expect(storedRoadPolish(() => { throw new Error('x'); })).toBe(false);
    applyRoadPolish(true);
    expect(ROAD_POLISH.on).toBe(true);
    applyRoadPolish(false);
  });
  it('caps ambient sprites at 3 (6 before ROAD PERF 2)', () => {
    expect(AMBIENT_CAP).toBe(3);
  });
});

describe('road polish: path interpolation', () => {
  it('walks by arc length and clamps', () => {
    expect(pathLength(line)).toBe(200);
    expect(pointAt(line, 0)).toEqual({ x: 0, y: 0 });
    expect(pointAt(line, 0.25)).toEqual({ x: 50, y: 0 });
    expect(pointAt(line, 0.75)).toEqual({ x: 100, y: 50 });
    expect(pointAt(line, 2)).toEqual({ x: 100, y: 100 });
    expect(pointAt(line, -1)).toEqual({ x: 0, y: 0 });
  });
  it('handles empty, single and zero-length paths', () => {
    expect(pointAt([], 0.5)).toEqual({ x: 0, y: 0 });
    expect(pointAt([{ x: 3, y: 4 }], 0.5)).toEqual({ x: 3, y: 4 });
    expect(pointAt([{ x: 3, y: 4 }, { x: 3, y: 4 }], 0.5)).toEqual({ x: 3, y: 4 });
  });
  it('joins real road segments without a duplicated joint and ends on the next node', () => {
    const p = joinPaths([lay.segments[0].pts, lay.segments[1].pts]);
    expect(p).toHaveLength(lay.segments[0].pts.length + lay.segments[1].pts.length - 1);
    const end = pointAt(p, 1);
    expect(end.x).toBeCloseTo(lay.nodes[2].x, 0);
    expect(end.y).toBeCloseTo(lay.nodes[2].y, 0);
  });
  it('hops: arcs above the path, lands on the path, squashes only near landings', () => {
    const mid = hopFrame(line, 0.5 / 3, 3, 40); // middle of hop 0
    const base = pointAt(line, 0.5 / 3);
    expect(mid.y).toBeCloseTo(base.y - 40, 5);
    expect(mid.hop).toBe(0);
    expect(mid.squash).toBe(1);
    const end = hopFrame(line, 1, 3, 40);
    expect(end.x).toBe(100);
    expect(end.y).toBeCloseTo(100, 5);
    expect(end.hop).toBe(2);
    for (let i = 0; i <= 100; i++) {
      const f = hopFrame(line, i / 100, 4, 30);
      expect(f.squash).toBeGreaterThanOrEqual(0.84);
      expect(f.squash).toBeLessThanOrEqual(1);
    }
    expect(hopCount(10)).toBe(3);
    expect(hopCount(5000)).toBe(5);
  });
});

describe('road polish: state mapping', () => {
  it('maps node states to motion', () => {
    expect(nodeVisual('locked', 'normal', 'none')).toEqual({ motion: 'none', shakeOnTap: true, rim: false });
    expect(nodeVisual('current', 'normal', 'none').motion).toBe('pulse');
    expect(nodeVisual('current', 'boss', 'none').rim).toBe(true);
    expect(nodeVisual('completed', 'normal', 'none').motion).toBe('stars');
    expect(nodeVisual('open', 'boss', 'none').motion).toBe('breathe');
    expect(nodeVisual('open', 'normal', 'mega').motion).toBe('flutter');
    expect(nodeVisual('completed', 'normal', 'hard').motion).toBe('stars');
  });
  it('chest is ready only on the level it follows', () => {
    expect(chestVisual('closed', 3, 3)).toBe('ready');
    expect(chestVisual('closed', 3, 2)).toBe('closed');
    expect(chestVisual('open', 3, 4)).toBe('open');
  });
});

describe('road polish: belt, parallax, ambient cap, unlock', () => {
  it('belt offset stays in [0, period) and loops', () => {
    for (const ms of [0, 1, 999, 123456, -250]) {
      const o = beltOffset(ms, 40, 20);
      expect(o).toBeGreaterThanOrEqual(0);
      expect(o).toBeLessThan(20);
    }
    expect(beltOffset(500, 40, 20)).toBeCloseTo(0, 5);
    expect(beltOffset(100, 40, 0)).toBe(0);
  });
  it('dash pieces tile the path, shift with the offset and stay on it', () => {
    const d0 = dashSegments(line, 0, 10, 10);
    expect(d0).toHaveLength(10);
    expect(d0[0][0]).toEqual({ x: 0, y: 0 });
    expect(d0[0][1]).toEqual({ x: 10, y: 0 });
    const d5 = dashSegments(line, 5, 10, 10);
    expect(d5[0][0]).toEqual({ x: 5, y: 0 });
    expect(d5[0][1]).toEqual({ x: 15, y: 0 });
    expect(d5[1][0]).toEqual({ x: 25, y: 0 });
    expect(dashSegments(line, 0, 0, 5)).toEqual([]);
    expect(dashSegments([{ x: 1, y: 1 }], 0, 5, 5)).toEqual([]);
    expect(groundStyleOf(1)).toBe('grid');
    expect(groundStyleOf(99)).toBeTruthy();
  });
  it('parallax layers are ordered far < ground < road < foreground and layerY is the identity at k=1', () => {
    expect(PARALLAX.far).toBeLessThan(PARALLAX.ground);
    expect(PARALLAX.ground).toBeLessThan(PARALLAX.road);
    expect(PARALLAX.road).toBeLessThan(PARALLAX.foreground);
    expect(layerY(-300, 120, 400, 1)).toBe(-300 + 120);
  });
  it('ambient picks never exceed the cap and prefer the view centre', () => {
    const spots = Array.from({ length: 40 }, (_, i) => ({ id: `s${i}`, y: -i * 100 }));
    const got = pickAmbient(spots, -1000, 5000);
    expect(got).toHaveLength(AMBIENT_CAP);
    expect(got[0].id).toBe('s10');
    expect(pickAmbient(spots, -1000, 5000, 2)).toHaveLength(2);
    expect(pickAmbient(spots, 99999, 100)).toHaveLength(0);
    expect(pickAmbient(spots, 0, 5000, -3)).toHaveLength(0);
  });
  it('unlock timeline is under 1.5 s and ordered', () => {
    expect(unlockTotal()).toBeLessThanOrEqual(1500);
    expect(stepProgress(UNLOCK_TIMELINE[0], -5)).toBe(0);
    expect(stepProgress(UNLOCK_TIMELINE[0], 9999)).toBe(1);
    expect(stepProgress(UNLOCK_TIMELINE[0], 300)).toBeCloseTo(0.5, 5);
  });
  it('travel span: only forward, at most 3 levels back', () => {
    expect(travelSpan(null, 5)).toBeNull();
    expect(travelSpan(5, 5)).toBeNull();
    expect(travelSpan(7, 5)).toBeNull();
    expect(travelSpan(4, 5)).toEqual({ from: 4, to: 5 });
    expect(travelSpan(1, 9)).toEqual({ from: 6, to: 9 });
  });
});
