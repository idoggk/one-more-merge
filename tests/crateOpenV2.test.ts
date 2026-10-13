// Crate opening V2: the timing table, the hero pick and the 3-column grid (pure; the Phaser sequence reads these).
import { describe, expect, it } from 'vitest';
import { BEATS, OPEN_V2, beatDuration, beatStarts, gridLayout3, pickHero, summaryOrder, totalMs } from '../src/content/crateOpenV2';
import { TUNING } from '../src/content/tuning';

describe('crateOpenV2 timing table', () => {
  it('has the briefed beats: ~0.4 s anticipation, 0.8 s shake, 0.15 s flash, 0.6 s hero', () => {
    expect([OPEN_V2.anticipation, OPEN_V2.shake, OPEN_V2.flash, OPEN_V2.hero]).toEqual([400, 800, 150, 600]);
    expect(BEATS.indexOf('hero')).toBeGreaterThan(BEATS.indexOf('flash'));
    expect(BEATS.indexOf('gather')).toBeGreaterThan(BEATS.indexOf('hero'));
  });
  it('beat starts add up to the total and follow the table', () => {
    const s = beatStarts(7);
    expect(s.anticipation).toBe(0);
    expect(s.shake).toBe(400);
    expect(s.flash).toBe(1200);
    expect(s.hero).toBe(1350);
    expect(s.heroHold).toBe(1950);
    expect(s.gather).toBe(2650);
    expect(totalMs(7)).toBe(s.settle + OPEN_V2.settle);
    expect(beatDuration('gather', 7)).toBe(6 * OPEN_V2.gatherStagger + OPEN_V2.gatherFly);
  });
  it('a tap speeds anticipation / shake / hold / gather but NEVER the hero pop (or the flash)', () => {
    for (const id of BEATS) {
      const fast = beatDuration(id, 7, true), slow = beatDuration(id, 7, false);
      if (OPEN_V2.speedable[id]) expect(fast).toBeLessThan(slow);
      else expect(fast).toBe(slow);
    }
    expect(beatDuration('hero', 7, true)).toBe(600);
    expect(totalMs(7, { anticipation: true, shake: true, hero: true, heroHold: true, gather: true })).toBeGreaterThan(OPEN_V2.hero);
  });
  it('is default OFF', () => {
    expect(TUNING.crateOpenV2).toBe(false);
  });
});

describe('crateOpenV2 hero + grid', () => {
  const c = (rarity: 'common' | 'rare' | 'epic' | 'legendary', isNew = false, count = 1) => ({ rarity, isNew, count });
  it('hero = best rarity, then NEW, then copies, then first', () => {
    expect(pickHero([c('common'), c('epic'), c('legendary'), c('rare')])).toBe(2);
    expect(pickHero([c('rare'), c('rare', true)])).toBe(1);
    expect(pickHero([c('common'), c('common', false, 3)])).toBe(1);
    expect(pickHero([c('common'), c('common')])).toBe(0);
    expect(pickHero([])).toBe(-1);
  });
  it('summary order: hero first, the rest best-first, every card exactly once', () => {
    const cards = [c('common'), c('epic'), c('legendary'), c('rare'), c('epic')];
    const o = summaryOrder(cards, 2);
    expect(o).toEqual([2, 1, 4, 3, 0]);
    expect([...o].sort()).toEqual([0, 1, 2, 3, 4]);
  });
  it('grid: 3 columns, last row centred, everything inside the area, any card count', () => {
    for (const n of [1, 2, 3, 5, 7, 8, 9, 12, 15]) {
      const g = gridLayout3(n, 720, 250, 1010);
      expect(g.slots).toHaveLength(n);
      expect(new Set(g.slots.map((s) => Math.round(s.x))).size).toBeLessThanOrEqual(5);
      for (const s of g.slots) {
        expect(s.y - g.ch / 2).toBeGreaterThanOrEqual(249);
        expect(s.y + g.ch / 2).toBeLessThanOrEqual(1011);
        expect(s.x - g.cw / 2).toBeGreaterThanOrEqual(0);
        expect(s.x + g.cw / 2).toBeLessThanOrEqual(720);
      }
    }
    const g7 = gridLayout3(7, 720, 250, 1010);
    expect(g7.slots[6].x).toBeCloseTo(360, 5); // the lone last card sits in the middle
    expect(g7.slots[0].y).toBe(g7.slots[2].y);
  });
});
