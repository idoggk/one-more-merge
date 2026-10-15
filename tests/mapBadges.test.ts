import { describe, expect, it } from 'vitest';
import {
  BADGES, badgeIsDemo, badgeState, baseKeyChain, cooldownOk, floatChipTarget, formatTimer, glyphKey, isFresh, layoutBadges, RAIL_CAP, resolveKey, timerUrgent,
} from '../src/game/road/mapBadgesModel';
import { MAP_BADGES } from '../src/content/experiments';

const ids = (l: { def: { id: string } }[]) => l.map((p) => p.def.id);
const def = (id: string) => BADGES.find((b) => b.id === id)!;

describe('map badge visibility', () => {
  it('shows only settings at level 1, with no locked teaser beyond 2 levels', () => {
    const l = layoutBadges({ level: 1, seasonClaimable: 0 });
    expect(ids(l.left)).toEqual(['daily']); // daily unlocks at 2: within 2 levels, so it is the single teaser
    expect(l.left[0].state).toBe('locked');
    expect(ids(l.floats)).toEqual(['settings']);
    expect(l.right).toEqual([]);
  });
  it('appears at its unlock level, never before', () => {
    expect(ids(layoutBadges({ level: 4, seasonClaimable: 0 }).left)).toContain('quests');
    expect(layoutBadges({ level: 3, seasonClaimable: 0 }).left.find((p) => p.def.id === 'quests')?.state).toBe('locked');
  });
  it('caps each rail at 3, at most one locked teaser, and counts the overflow', () => {
    const l = layoutBadges({ level: 20, seasonClaimable: 0 });
    expect(l.left.length).toBeLessThanOrEqual(RAIL_CAP);
    expect(l.right.length).toBeLessThanOrEqual(RAIL_CAP);
    expect(layoutBadges({ level: 5, seasonClaimable: 0 }).left.filter((p) => p.state === 'locked').length).toBeLessThanOrEqual(1);
    const mid = layoutBadges({ level: 6, seasonClaimable: 0 });
    expect(mid.right.length + mid.overflow.R).toBe(3);
  });
  it('sorts ready first, then soonest timer, then idle; locked last', () => {
    const l = layoutBadges({ level: 6, seasonClaimable: 2 });
    expect(ids(l.left)).toEqual(['season', 'daily', 'quests']);
    expect(ids(l.right)).toEqual(['offers', 'events', 'album']);
  });
  it('force mode shows every badge in one state, ignoring level and cap', () => {
    const l = layoutBadges({ level: 1, seasonClaimable: 0 }, 'ready');
    expect(l.left.length + l.right.length + l.floats.length).toBe(BADGES.length);
    expect([...l.left, ...l.right, ...l.floats].every((p) => p.state === 'ready')).toBe(true);
    expect(l.overflow).toEqual({ L: 0, R: 0 });
  });
});

describe('map badge states and timers', () => {
  it('maps data to a state', () => {
    expect(badgeState(def('season'), { level: 5, seasonClaimable: 1 })).toBe('ready');
    expect(badgeState(def('season'), { level: 5, seasonClaimable: 0 })).toBe('idle');
    expect(badgeState(def('events'), { level: 5, seasonClaimable: 0 })).toBe('timer');
    expect(badgeState(def('events'), { level: 2, seasonClaimable: 0 })).toBe('locked');
  });
  it('flags demo values', () => {
    expect(badgeIsDemo(def('daily'), 'timer')).toBe(true);
    expect(badgeIsDemo(def('season'), 'idle')).toBe(false);
  });
  it('formats timers', () => {
    expect(formatTimer(22 * 3600)).toBe('22h');
    expect(formatTimer(3 * 3600 + 5 * 60)).toBe('3h 05m');
    expect(formatTimer(252)).toBe('04:12');
    expect(formatTimer(9)).toBe('00:09');
    expect(formatTimer(-5)).toBe('00:00');
    expect(formatTimer(NaN)).toBe('00:00');
    expect(timerUrgent(3599)).toBe(true);
    expect(timerUrgent(3600)).toBe(false);
  });
  it('picks the floating chip target and respects the cooldown', () => {
    expect(floatChipTarget(layoutBadges({ level: 6, seasonClaimable: 1 }))?.def.id).toBe('season');
    expect(floatChipTarget(layoutBadges({ level: 6, seasonClaimable: 0 }))).toBeNull();
    expect(cooldownOk(undefined, 5, 100)).toBe(true);
    expect(cooldownOk(0, 99, 100)).toBe(false);
    expect(cooldownOk(0, 100, 100)).toBe(true);
  });
});

describe('NEW tag', () => {
  it('shows only on the unlock level', () => {
    const q = layoutBadges({ level: 4, seasonClaimable: 0 }).left.find((p) => p.def.id === 'quests')!;
    expect(isFresh(q, { level: 4, seasonClaimable: 0 })).toBe(true);
    expect(isFresh(q, { level: 5, seasonClaimable: 0 })).toBe(false);
  });
});

describe('map badge art keys', () => {
  it('uses the real texture when it exists, else null (code drawing)', () => {
    expect(resolveKey(() => false, [glyphKey('daily')])).toBeNull();
    expect(resolveKey((k) => k === 'badge_glyph_daily', [glyphKey('daily')])).toBe('badge_glyph_daily');
  });
  it('falls back from a state base to the idle base', () => {
    expect(baseKeyChain('ready')).toEqual(['badge_base_ready', 'badge_base_idle']);
    expect(resolveKey((k) => k === 'badge_base_idle', baseKeyChain('locked'))).toBe('badge_base_idle');
    expect(baseKeyChain('idle')).toEqual(['badge_base_idle']);
  });
});

describe('flag', () => {
  it('is OFF by default', () => {
    expect(MAP_BADGES.on).toBe(false);
    expect(MAP_BADGES.force).toBe('auto');
  });
});
