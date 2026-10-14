import { describe, expect, it } from 'vitest';
import { TUNING } from '../src/content/tuning';
import { TAKEN_APART_CARDS, YARD_OBJECTS, YARD_UNITS, yardReward } from '../src/content/yardObjects';
import { BOOK_ORDER, bestStars, bookStars, budgetOf, crateCount, isUnlocked, lockedText, playable, prerequisite, readBook, recordStars, tapBudget, type BookRec } from '../src/core/yardBook';
import { mergeMeta } from '../src/platform/backup';

describe('Yard Book: the flag', () => {
  it('is OFF by default', () => {
    expect(TUNING.yardBook).toBe(false);
  });
});

describe('Yard Book: tap budget and stars', () => {
  it('budget = screws x 1.3 + 4, rounded up', () => {
    expect(tapBudget(24)).toBe(36);
    expect(tapBudget(10)).toBe(17);
    for (const u of YARD_UNITS) expect(budgetOf(YARD_OBJECTS[u])).toBe(Math.ceil(YARD_OBJECTS[u].screws.length * 1.3 + 4));
  });

  it('3 = within budget AND peak <= 2; 2 = either; 1 = win', () => {
    const N = 36;
    expect(bookStars(24, N, 0)).toBe(3);
    expect(bookStars(N, N, 2)).toBe(3); // exactly on the line counts
    expect(bookStars(N, N, 3)).toBe(2); // budget ok, row too full
    expect(bookStars(N + 1, N, 2)).toBe(2); // row ok, over budget
    expect(bookStars(N + 1, N, 3)).toBe(1);
    expect(bookStars(99, N, 5)).toBe(1);
  });
});

describe('Yard Book: save record + migration', () => {
  it('a missing, null or junk field reads as empty', () => {
    expect(readBook(undefined)).toEqual({});
    expect(readBook(null)).toEqual({});
    expect(readBook([3, 3])).toEqual({});
    expect(readBook('x')).toEqual({});
    expect(readBook({ cannon: 'a', coil: -2, bell: NaN, other: 3 })).toEqual({});
  });
  it('keeps 1..3 stars per known unit and clamps', () => {
    expect(readBook({ cannon: 3, coil: 9, bell: 1.7, fake: 3 })).toEqual({ cannon: 3, coil: 3, bell: 1 });
  });
  it('an old save without the field loads whole through mergeMeta, and a saved one round-trips', () => {
    const defaults = { tutorialDone: false, runs: 0, tips: {} };
    const old = mergeMeta(defaults, { tutorialDone: true, runs: 4, yard: { week: 1 } }) as Record<string, unknown>;
    expect(old.tutorialDone).toBe(true);
    expect(readBook(old.yardBook)).toEqual({});
    const saved = mergeMeta(defaults, JSON.parse(JSON.stringify({ runs: 1, yardBook: { cannon: 2 } }))) as Record<string, unknown>;
    expect(readBook(saved.yardBook)).toEqual({ cannon: 2 });
  });
  it('recordStars keeps the best only', () => {
    const b: BookRec = {};
    expect(recordStars(b, 'cannon', 2)).toEqual({ best: 2, improved: true });
    expect(recordStars(b, 'cannon', 1)).toEqual({ best: 2, improved: false });
    expect(recordStars(b, 'cannon', 3)).toEqual({ best: 3, improved: true });
    expect(bestStars(b, 'cannon')).toBe(3);
    expect(bestStars(b, 'coil')).toBe(0);
  });
});

describe('Yard Book: the unlock chain Cannon > Coil > Bell', () => {
  it('only Cannon is open on a fresh save', () => {
    expect(BOOK_ORDER).toEqual(['cannon', 'coil', 'bell']);
    expect(BOOK_ORDER.map((u) => isUnlocked({}, u))).toEqual([true, false, false]);
  });
  it('each object opens when the one before it has a star', () => {
    expect(isUnlocked({ cannon: 1 }, 'coil')).toBe(true);
    expect(isUnlocked({ cannon: 1 }, 'bell')).toBe(false);
    expect(isUnlocked({ cannon: 1, coil: 1 }, 'bell')).toBe(true);
    expect(isUnlocked({ bell: 3 }, 'coil')).toBe(false); // the chain cannot be skipped
  });
  it('a locked tile says what to clear first', () => {
    expect(prerequisite('cannon')).toBeNull();
    expect(prerequisite('bell')).toBe('coil');
    expect(lockedText('coil')).toBe('clear Cannon first');
    expect(lockedText('bell')).toBe('clear Coil first');
  });
  it('a locked pick falls back along the chain (the daily rotation with the flag on)', () => {
    expect(playable({}, 'bell')).toBe('cannon');
    expect(playable({ cannon: 2 }, 'bell')).toBe('coil');
    expect(playable({ cannon: 2, coil: 1 }, 'bell')).toBe('bell');
    expect(playable({}, 'cannon')).toBe('cannon');
  });
});

describe('Yard Book: the cards counter fills with the boxes', () => {
  it('rises step by step to exactly the yard reward rule (3/4/5 cards, doubled at 3 stars)', () => {
    for (const u of YARD_UNITS) {
      const total = YARD_OBJECTS[u].queue.length;
      expect(total).toBeGreaterThan(0);
      let last = -1;
      for (let done = 0; done <= total; done++) {
        const n = crateCount(TAKEN_APART_CARDS[u], done, total);
        expect(n).toBeGreaterThanOrEqual(last);
        last = n;
      }
      expect(crateCount(TAKEN_APART_CARDS[u], 0, total)).toBe(0);
      expect(crateCount(TAKEN_APART_CARDS[u], total, total)).toBe(yardReward(u, 1));
      expect(crateCount(TAKEN_APART_CARDS[u], total, total, true)).toBe(yardReward(u, 3));
    }
  });
  it('never exceeds the base before the last box', () => {
    expect(crateCount(5, 7, 8)).toBeLessThanOrEqual(5);
    expect(crateCount(5, 99, 8)).toBe(5);
    expect(crateCount(5, 3, 0)).toBe(0);
  });
});
