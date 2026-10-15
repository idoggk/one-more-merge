import { describe, expect, it } from 'vitest';
import { chunkCount, chunkSpan, wantChunk } from '../src/game/road/roadBake';

describe('road bake chunks', () => {
  it('covers the span with no gap and no overlap', () => {
    for (const [a, b, h] of [[-300, 3700, 640], [0, 640, 640], [10, 11, 640], [-1000, -100, 333]] as const) {
      const n = chunkCount(a, b, h);
      expect(chunkSpan(a, b, h, 0)[0]).toBe(a);
      expect(chunkSpan(a, b, h, n - 1)[1]).toBe(b);
      for (let i = 1; i < n; i++) expect(chunkSpan(a, b, h, i)[0]).toBe(chunkSpan(a, b, h, i - 1)[1]);
    }
  });
  it('never makes an empty chunk list', () => {
    expect(chunkCount(5, 5, 640)).toBe(1);
  });
});

describe('wantChunk', () => {
  // view [0, 1000], road scrolled by `s`: world span [y0, y1] sits at [y0 + s, y1 + s] on screen
  const w = (span: [number, number], baked: boolean, s: number) => wantChunk(span, baked, s, 1000, 260, 900, 1800);
  it('shows what is on screen or just off it', () => {
    expect(w([100, 500], false, 0)).toBe('show');
    expect(w([-200, -10], false, 0)).toBe('show'); // within the 260 margin
  });
  it('bakes ahead only inside the bake margin, never beyond', () => {
    expect(w([-800, -400], false, 0)).toBe('bake');
    expect(w([-2500, -2000], false, 0)).toBe('drop');
  });
  it('keeps a baked chunk until it is far, then drops it', () => {
    expect(w([-800, -400], true, 0)).toBe('keep');
    expect(w([-1700, -1400], true, 0)).toBe('keep');
    expect(w([-3000, -2500], true, 0)).toBe('drop');
  });
  it('a chunk that scrolls into view is shown', () => {
    expect(w([-3000, -2500], true, 3000)).toBe('show');
  });
});

import { eventTime, realDt } from '../src/game/road/roadPerf4';

describe('realDt', () => {
  it('is the real elapsed time, not the old 50 ms cap', () => {
    expect(realDt(1100, 1000)).toBe(100);
    expect(realDt(1080, 1000)).toBe(80);
  });
  it('is 0 on the first frame and never negative', () => {
    expect(realDt(1000, null)).toBe(0);
    expect(realDt(1000, 1200)).toBe(0);
  });
  it('caps a stall so the road does not leap', () => {
    expect(realDt(9000, 1000)).toBe(100);
    expect(realDt(9000, 1000, 250)).toBe(250);
  });
});

describe('eventTime', () => {
  it('uses the event time stamp when there is one', () => {
    expect(eventTime({ timeStamp: 1234.5 }, 99)).toBe(1234.5);
  });
  it('falls back for a missing or zero stamp', () => {
    expect(eventTime(undefined, 99)).toBe(99);
    expect(eventTime({}, 99)).toBe(99);
    expect(eventTime({ timeStamp: 0 }, 99)).toBe(99);
  });
});
