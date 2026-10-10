import { describe, expect, it } from 'vitest';
import { LEVELS } from '../src/content/levels';
import { chapterChestText, goalDoneText, mergesText, relayLockNote } from '../src/content/sceneCopy';
import { newGame, newLevel } from '../src/core/game';
import { REMIX_OPPONENTS } from '../src/core/remix';
import { MODE_INTRO, modeIntroFor } from '../src/game/modeIntro';
import { admitTip, newTipLedger } from '../src/game/tips';

describe('walkthrough 3 fixes', () => {
  it('copy: singular merge, built rank vs goal rank, relay lock note, chest contents', () => {
    expect(mergesText(1)).toBe('1 merge');
    expect(mergesText(3)).toBe('3 merges');
    expect(goalDoneText({ kind: 'rank', n: 5, best: 6 })).toBe('Rank 6 built (goal rank 5)');
    expect(goalDoneText({ kind: 'rank', n: 5, best: 5 })).toBe('Rank 5 built');
    expect(goalDoneText({ kind: 'chain', n: 8, best: 8 })).toBe('Chain x8 fired');
    expect(relayLockNote('Bell', 3)).toBe('(Bell for now: pick your own relay from chapter 3)');
    expect(chapterChestText({ goldCrates: 1, gems: 10 })).toBe('In your chest: GOLD CRATE  ·  +10 GEMS');
    expect(chapterChestText({ goldCrates: 0, gems: 0 })).toBe('');
  });

  it('mode intro: Challenge and Remix only, and the tip budget admits it (not a saga level)', () => {
    expect(modeIntroFor(newGame(1, false, true))).toBe('mode_challenge');
    expect(modeIntroFor(newGame(1, false, false, [], REMIX_OPPONENTS[0].target))).toBe('mode_remix');
    expect(modeIntroFor(newGame(1, false, false))).toBeNull();
    expect(modeIntroFor(newLevel(LEVELS[4]))).toBeNull();
    for (const t of Object.values(MODE_INTRO)) expect(t).toMatch(/fills FAST[\s\S]*SCRAP is your friend/);
    expect(admitTip(newTipLedger(undefined), [], 'mode_challenge', 1, true)).toBe(true);
  });
});
