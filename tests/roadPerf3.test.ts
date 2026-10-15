import { describe, expect, it } from 'vitest';
import { beltShouldDraw, createChangeMemo, createChapterLookup, createRedrawMeter, createWispPass, fadeAlpha } from '../src/game/road/roadPerf3';
import { chapterAtY } from '../src/game/road/roadModel';

const chapters = [
  { chapter: 3, topY: -2000 },
  { chapter: 1, topY: 0 },
  { chapter: 2, topY: -1000 },
];

describe('createChapterLookup', () => {
  it('matches roadModel.chapterAtY everywhere, in any call order', () => {
    const at = createChapterLookup(chapters);
    const ys = [100, 0, -1, -999, -1000, -1500, -2000, -5000, 50, -2500, -1, 10, -1000, -500];
    for (const y of ys) expect(at(y), `y=${y}`).toBe(chapterAtY(chapters, y));
  });
  it('handles no chapters', () => {
    expect(createChapterLookup([])(5)).toBe(1);
  });
  it('does not re-scan inside the remembered range', () => {
    let reads = 0;
    const spy = chapters.map((c) => ({ chapter: c.chapter, get topY() { reads++; return c.topY; } }));
    const at = createChapterLookup(spy);
    at(-500);
    const after = reads;
    at(-600);
    at(-900);
    expect(reads).toBe(after);
  });
});

describe('fadeAlpha / change memo', () => {
  it('clamps 0..1 around the header chip', () => {
    expect(fadeAlpha(100, 0)).toBe(0);
    expect(fadeAlpha(170 + 55, 0)).toBeCloseTo(0.5);
    expect(fadeAlpha(900, 0)).toBe(1);
  });
  it('reports a change only when the value differs', () => {
    const m = createChangeMemo();
    expect(m.changed(1, 0)).toBe(true);
    expect(m.changed(1, 0)).toBe(false);
    expect(m.changed(2, 0)).toBe(true);
    expect(m.changed(1, 1)).toBe(true);
  });
});

describe('beltShouldDraw', () => {
  it('rests while culled, while the road moves, and above 15 Hz', () => {
    expect(beltShouldDraw(1000, 0, 0, false)).toBe(false);
    expect(beltShouldDraw(1000, 0, 950, true)).toBe(false);
    expect(beltShouldDraw(1000, 970, 0, true)).toBe(false);
    expect(beltShouldDraw(1000, 900, 0, true)).toBe(true);
  });
});

describe('createWispPass', () => {
  it('places every wisp once per road position', () => {
    const placed: number[] = [];
    const pass = createWispPass([1, 2], (w, y) => placed.push(w * 1000 + y));
    expect(pass(5)).toBe(true);
    expect(pass(5)).toBe(false);
    expect(pass(6)).toBe(true);
    expect(placed).toEqual([1005, 2005, 1006, 2006]);
  });
});

describe('createRedrawMeter', () => {
  it('reports calls and ms per second after a full second', () => {
    const m = createRedrawMeter();
    expect(m.sample(0)).toEqual({ callsPerSec: 0, msPerSec: 0 });
    for (let i = 0; i < 30; i++) m.record(2);
    expect(m.sample(500)).toEqual({ callsPerSec: 0, msPerSec: 0 });
    expect(m.sample(2000)).toEqual({ callsPerSec: 15, msPerSec: 30 });
  });
});
