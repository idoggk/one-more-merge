import { describe, expect, it } from 'vitest';
import { earned, FEATURES, isNew, isUnlocked, markSeen, migrateUnlocks, refreshUnlocks, unlockAll, UNLOCK_LEVEL, type UnlockMeta } from '../src/game/unlocks';

const fresh = (): UnlockMeta => ({ toys: {}, hardUnlocked: false, units: { cannon: { level: 1, cards: 0 }, coil: { level: 1, cards: 0 }, bell: { level: 1, cards: 0 }, fan: { level: 1, cards: 0 } } });

describe('t-2fd7bb86 staggered unlocks', () => {
  it('a new player starts with nothing open, then features open one level step at a time', () => {
    const m = fresh();
    migrateUnlocks(m, 0);
    expect(refreshUnlocks(m, 0)).toEqual([]);
    const opened: [number, string[]][] = [];
    for (let cleared = 1; cleared <= 20; cleared++) {
      const f = refreshUnlocks(m, cleared);
      if (f.length) opened.push([cleared, f]);
    }
    // never more than one feature per level, in the planned order
    expect(opened).toEqual([
      [UNLOCK_LEVEL.challenge!, ['challenge']],
      [UNLOCK_LEVEL.workshop!, ['workshop']],
      [UNLOCK_LEVEL.puzzles!, ['puzzles']],
      [UNLOCK_LEVEL.remix!, ['remix']],
    ]);
    expect(isUnlocked(m, 'team')).toBe(false);
    expect(isUnlocked(m, 'gems')).toBe(false);
  });

  it('TEAM opens with the first non-starter unit or helper toy, not before L8; Gems with the first gem', () => {
    const m = fresh();
    migrateUnlocks(m, 0);
    expect(earned(m, 'team', 7)).toBe(false); // the starter Fan alone is not a new unit
    m.units!.rocket = { level: 1, cards: 0 };
    expect(refreshUnlocks(m, 2)).toEqual([]); // t-0a294f99: TEAM waits for level 8
    expect(refreshUnlocks(m, 7)).toEqual(['team']);
    const t = fresh();
    t.toys.magnet = true;
    expect(earned(t, 'team', 0)).toBe(false);
    expect(earned(t, 'team', 7)).toBe(true);
    m.gems = 3;
    expect(refreshUnlocks(m, 7)).toEqual(['gems']);
  });

  it('unlocks are sticky and carry a NEW cue until first opened', () => {
    const m = fresh();
    migrateUnlocks(m, 0);
    refreshUnlocks(m, UNLOCK_LEVEL.challenge!);
    expect(isNew(m, 'challenge')).toBe(true);
    expect(markSeen(m, 'challenge')).toBe(true);
    expect(isNew(m, 'challenge')).toBe(false);
    expect(markSeen(m, 'challenge')).toBe(false);
    expect(markSeen(m, 'remix')).toBe(false); // not unlocked yet: nothing to see
    // levels going back (QA jump) never re-lock
    refreshUnlocks(m, 0);
    expect(isUnlocked(m, 'challenge')).toBe(true);
  });

  it('a migrated save that passed level 5 keeps everything, with no NEW cues', () => {
    // a pre-change save: level 5 cleared set hardUnlocked, which opened every feature at once
    const m: UnlockMeta = { ...fresh(), hardUnlocked: true, levelStars: { 1: 3, 2: 3, 3: 2, 4: 1, 5: 2, 6: 1 }, gems: 0 };
    migrateUnlocks(m, 6);
    refreshUnlocks(m, 6);
    for (const f of FEATURES) {
      expect(isUnlocked(m, f)).toBe(true);
      expect(isNew(m, f)).toBe(false);
    }
    // migration runs once: a later call does not touch the record
    m.unlocks!.remix = true;
    migrateUnlocks(m, 0);
    expect(isUnlocked(m, 'remix')).toBe(true);
  });

  it('a migrated early save keeps what the old rules showed and nothing more', () => {
    // 3 levels cleared, no hardUnlocked: old rules showed the Daily Puzzle (3+) and Gems, not Challenge / Workshop / Remix
    const m: UnlockMeta = { ...fresh(), levelStars: { 1: 2, 2: 2, 3: 2 } };
    migrateUnlocks(m, 3);
    expect(isUnlocked(m, 'puzzles')).toBe(true);
    expect(isUnlocked(m, 'gems')).toBe(true);
    expect(isUnlocked(m, 'challenge')).toBe(false);
    expect(isUnlocked(m, 'workshop')).toBe(false);
    expect(isUnlocked(m, 'remix')).toBe(false);
    // a save that bought a Workshop item keeps the Workshop
    const w: UnlockMeta = { ...fresh(), owned: ['nameplate'] };
    migrateUnlocks(w, 1);
    expect(isUnlocked(w, 'workshop')).toBe(true);
  });

  it('QA unlock-all opens and marks every feature', () => {
    const m = fresh();
    migrateUnlocks(m, 0);
    unlockAll(m);
    for (const f of FEATURES) expect([isUnlocked(m, f), isNew(m, f)]).toEqual([true, false]);
  });
});
