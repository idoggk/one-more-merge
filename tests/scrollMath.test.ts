import { describe, expect, it } from 'vitest';
import { activeSection, buildLayout, clampPos, dragEnd, dragMove, dragStart, FRICTION, glide, headerY, inertiaEnd, jumpTarget, makeScroller, OVERSCROLL, overscroll, showBackToTop, step, TAP_SLOP, wheel } from '../src/game/ui/scrollMath';

const drag = (s: ReturnType<typeof makeScroller>, y0: number, y1: number, ms: number, n = 10) => {
  dragStart(s, y0, 0);
  for (let i = 1; i <= n; i++) dragMove(s, y0 + ((y1 - y0) * i) / n, (ms * i) / n);
  return dragEnd(s, ms);
};

describe('scrollMath', () => {
  it('content follows the finger inside the range', () => {
    const s = makeScroller(1000);
    s.pos = 300;
    dragStart(s, 500, 0);
    dragMove(s, 450, 16);
    dragMove(s, 400, 32);
    expect(s.pos).toBeCloseTo(400); // finger moved up 100 -> content offset +100
  });

  it('tap versus drag threshold', () => {
    const a = makeScroller(1000);
    expect(drag(a, 500, 500 - (TAP_SLOP - 1), 100)).toBe(true);
    expect(a.pos).toBe(0);
    const b = makeScroller(1000);
    expect(drag(b, 500, 500 - TAP_SLOP, 100)).toBe(false);
    const c = makeScroller(1000);
    expect(drag(c, 500, 500 + TAP_SLOP + 4, 100)).toBe(false);
  });

  it('a fling ends where inertiaEnd says', () => {
    const s = makeScroller(100000);
    s.pos = 5000;
    drag(s, 600, 300, 100); // 3000 px/s upward
    const p0 = s.pos, v0 = s.vel;
    expect(v0).toBeGreaterThan(2500);
    const predicted = inertiaEnd(p0, v0);
    for (let i = 0; i < 2000 && step(s, 1 / 60); i++);
    expect(Math.abs(s.pos - predicted)).toBeLessThan(v0 / FRICTION * 0.03 + 4);
    expect(s.vel).toBe(0);
  });

  it('inertia is frame-rate independent', () => {
    const run = (n: number) => {
      const s = makeScroller(100000);
      s.pos = 1000;
      s.vel = 2000;
      for (let i = 0; i < n; i++) step(s, 1 / n);
      return s.pos;
    };
    expect(Math.abs(run(30) - run(120))).toBeLessThan(1);
  });

  it('rubber-bands past the ends and springs back', () => {
    const s = makeScroller(500);
    dragStart(s, 400, 0);
    for (let i = 1; i <= 20; i++) dragMove(s, 400 + i * 20, i * 16); // pull down 400 px at the top
    expect(s.pos).toBeLessThan(0);
    expect(s.pos).toBeGreaterThanOrEqual(-OVERSCROLL);
    expect(-s.pos).toBeLessThan(400 * 0.55); // resisted
    dragEnd(s, 20 * 16 + 400);
    for (let i = 0; i < 300; i++) step(s, 1 / 60);
    expect(s.pos).toBe(0);
    expect(overscroll(s.pos, s.max)).toBe(0);
  });

  it('a hard fling into the bottom settles on the bottom', () => {
    const s = makeScroller(300);
    s.pos = 280;
    s.vel = 4000;
    for (let i = 0; i < 600; i++) step(s, 1 / 60);
    expect(s.pos).toBe(300);
  });

  it('a slow release does not fling', () => {
    const s = makeScroller(1000);
    dragStart(s, 500, 0);
    dragMove(s, 450, 16);
    dragMove(s, 400, 600); // long pause between moves
    dragEnd(s, 900);
    expect(s.vel).toBe(0);
  });

  it('wheel clamps, glide lands on the jump target', () => {
    const s = makeScroller(400);
    wheel(s, 9999);
    expect(s.pos).toBe(400);
    wheel(s, -9999);
    expect(s.pos).toBe(0);
    glide(s, 250);
    for (let i = 0; i < 200; i++) step(s, 1 / 60);
    expect(s.pos).toBe(250);
    glide(s, 9999);
    for (let i = 0; i < 200; i++) step(s, 1 / 60);
    expect(s.pos).toBe(400);
  });

  it('sections: layout, jump positions, active section, sticky headers', () => {
    const l = buildLayout([{ count: 8, cols: 4, rowH: 200 }, { count: 5, cols: 4, rowH: 200 }, { count: 7, cols: 7, rowH: 100 }], 50, 20, 600);
    expect(l.tops).toEqual([0, 470, 940]);
    expect(l.bodyTops).toEqual([50, 520, 990]);
    expect(l.contentH).toBe(940 + 50 + 100 + 20);
    expect(l.max).toBe(l.contentH - 600);
    expect(jumpTarget(l, 0)).toBe(0);
    expect(jumpTarget(l, 1)).toBe(470);
    expect(jumpTarget(l, 2)).toBe(l.max); // clamped: the last section cannot reach the top
    expect(activeSection(l, 0)).toBe(0);
    expect(activeSection(l, 469)).toBe(1); // within 1 px
    expect(activeSection(l, 500)).toBe(1);
    expect(activeSection(l, l.max)).toBe(2); // at the very bottom the last chip lights up
    // header 1 scrolls in, pins at 0, then is pushed up by header 2
    expect(headerY(l, 1, 0, 50)).toBe(470);
    expect(headerY(l, 1, 600, 50)).toBe(0);
    expect(headerY(l, 1, 910, 50)).toBe(-20);
    expect(headerY(l, 2, 910, 50)).toBe(30);
  });

  it('back to top after 3 screens', () => {
    expect(showBackToTop(3 * 700, 700)).toBe(false);
    expect(showBackToTop(3 * 700 + 1, 700)).toBe(true);
    expect(clampPos(-5, 100)).toBe(0);
  });
});
