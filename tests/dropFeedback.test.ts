import { describe, expect, it } from 'vitest';
import { DROP_HINT, HintGate, planDrop, SCRAP_HOLD } from '../src/game/dropFeedback';

const base = { from: 7, dest: 8, scrap: false, rank: 1, scrapHold: 0 };

describe('planDrop: every release is a scrap, a commit, or one reject', () => {
  it('valid drops are unchanged: another cell commits (merge, move or mismatch bounce are commitDrop’s call)', () => {
    expect(planDrop(base)).toEqual({ k: 'commit' });
    expect(planDrop({ ...base, rank: 5 })).toEqual({ k: 'commit' });
  });
  it('off the board rejects', () => {
    expect(planDrop({ ...base, dest: -1 })).toEqual({ k: 'reject', why: 'offBoard' });
  });
  it('back on its own cell rejects', () => {
    expect(planDrop({ ...base, dest: 7 })).toEqual({ k: 'reject', why: 'ownCell' });
  });
  it('SCRAP: low ranks scrap at once; rank 3+ only after the hold, else an early-scrap reject', () => {
    expect(planDrop({ ...base, scrap: true, rank: 2 })).toEqual({ k: 'scrap' });
    expect(planDrop({ ...base, scrap: true, rank: 3, scrapHold: 0.1 })).toEqual({ k: 'reject', why: 'earlyScrap' });
    expect(planDrop({ ...base, scrap: true, rank: 3, scrapHold: SCRAP_HOLD })).toEqual({ k: 'scrap' });
    // SCRAP wins over the cell under it, as before (the merge case never sets `scrap`)
    expect(planDrop({ ...base, scrap: true, rank: 4, dest: -1 })).toEqual({ k: 'reject', why: 'earlyScrap' });
  });
  it('hints: hold-to-scrap for an early scrap, the match hint for the rest, none for refused targets', () => {
    expect(DROP_HINT.earlyScrap).toBe('HOLD TO SCRAP');
    expect(DROP_HINT.offBoard).toBe('DROP ON A MATCHING PART');
    expect(DROP_HINT.ownCell).toBe('DROP ON A MATCHING PART');
    expect(DROP_HINT.refused).toBeNull();
  });
});

describe('HintGate', () => {
  it('rate-limits hints overall and per text', () => {
    const g = new HintGate(2500, 8000);
    expect(g.allow('A', 0)).toBe(true);
    expect(g.allow('B', 1000)).toBe(false); // global gap
    expect(g.allow('B', 2600)).toBe(true);
    expect(g.allow('A', 5200)).toBe(false); // same text too soon
    expect(g.allow('A', 8100)).toBe(true);
  });
});
