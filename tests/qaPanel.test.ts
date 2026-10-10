import { describe, expect, it, vi } from 'vitest';

// the panel module pulls in Phaser (needs a browser); only the row table is used here
vi.mock('phaser', () => ({ default: { GameObjects: { Events: {}, Container: class {} } } }));
vi.mock('../src/game/audio', () => ({ sfx: {} }));

const { QA_ROWS } = await import('../src/game/ui/qaPanel');
const { qaGeometry, qaRowReachable, QA_HEADER } = await import('../src/game/ui/qaLayout');

describe('QA panel layout (bug t-6d70ea51: bottom rows ran off the screen)', () => {
  const heights = QA_ROWS.map((r) => r.h);
  // layout heights: 1280 small phone, 1558 = 390x844 iPhone, 1720 tallest
  for (const H of [1280, 1558, 1720]) {
    it(`every row is reachable by scrolling at H=${H}`, () => {
      const g = qaGeometry(heights, H);
      expect(g.panelH).toBeLessThanOrEqual(H);
      expect(g.bodyTop).toBe(QA_HEADER);
      QA_ROWS.forEach((r, i) => expect(qaRowReachable(g, i, r.h), `row ${i}`).toBe(true));
      // the last row's bottom lands inside the window at full scroll
      const last = QA_ROWS.length - 1;
      expect(g.anchors[last] + 98 + g.minScroll).toBeLessThanOrEqual(g.bodyBottom);
    });
  }
  it('scrolls on a 390x844 phone and the rows still fit on tall screens only if they really fit', () => {
    expect(qaGeometry(heights, 1558).minScroll).toBeLessThan(0);
    expect(Math.abs(qaGeometry([100, 100], 1558).minScroll)).toBeCloseTo(0);
  });
  it('is shorter than before the NEW UNITS grouping (was 1725 px of sheet)', () => {
    expect(qaGeometry(heights, 99999).contentBottom).toBeLessThan(1725 - 100);
  });
});
