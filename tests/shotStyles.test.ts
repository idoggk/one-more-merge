import { describe, expect, it } from 'vitest';
import { burstCount, freeShotSlot, hasShotStyle, linkStyle, liveShots, PLAIN_STYLE, rankScale, rankTier, SHOOTER_FAMILIES, SHOT_CAPS, SHOT_STYLES, shotStyle, takeShotSlot } from '../src/game/fx/shotStyles';
import { UNIT_SHOTS, applyUnitShots, storedUnitShots } from '../src/content/experiments';
import { FAMILIES } from '../src/core/types';

const RANKS = [1, 2, 3, 4, 5, 6, 7, 8];

describe('unit shot style table', () => {
  it('has all 12 shooter families, each a real family with distinct body colour', () => {
    expect(SHOOTER_FAMILIES).toHaveLength(12);
    for (const f of SHOOTER_FAMILIES) {
      expect(FAMILIES).toContain(f);
      expect(SHOT_STYLES[f]).toBeDefined();
    }
    expect(new Set(SHOOTER_FAMILIES.map((f) => SHOT_STYLES[f].body)).size).toBe(12);
  });
  it('unknown and painted families fall back to the plain style', () => {
    for (const f of ['cannon', 'coil', 'bell', 'fan'] as const) {
      expect(hasShotStyle(f)).toBe(false);
      expect(shotStyle(f)).toBe(PLAIN_STYLE);
    }
  });
  it('rank scale, tier and burst are monotonic and match the table', () => {
    const sc = RANKS.map(rankScale);
    expect(sc).toEqual([1, 1, 1.15, 1.15, 1.3, 1.3, 1.5, 1.5]);
    expect(RANKS.map(rankTier)).toEqual([0, 0, 1, 1, 2, 2, 3, 3]);
    expect(RANKS.map((r) => burstCount('nail_gun', r))).toEqual([1, 1, 2, 2, 3, 3, 3, 4]);
    expect(RANKS.map((r) => burstCount('rivet_gun', r))).toEqual([1, 1, 2, 2, 3, 3, 3, 4]);
    expect(burstCount('mortar', 8)).toBe(1);
    expect(rankScale(0)).toBe(1);
    expect(rankScale(99)).toBe(1.5);
  });
  it('chain width never shrinks with rank; white core only at 7+; unstyled keeps the old colour', () => {
    const w = RANKS.map((r) => linkStyle('tesla_tower', r, 8, 0x123456).width);
    for (let i = 1; i < w.length; i++) expect(w[i]).toBeGreaterThanOrEqual(w[i - 1]);
    expect(linkStyle('tesla_tower', 6, 8, 0).whiteCore).toBe(false);
    expect(linkStyle('tesla_tower', 7, 8, 0).whiteCore).toBe(true);
    expect(linkStyle('tesla_tower', 1, 8, 0).color).toBe(SHOT_STYLES.tesla_tower.body);
    const plain = linkStyle('cannon', 8, 8, 0x123456);
    expect(plain).toEqual({ color: 0x123456, width: 8, whiteCore: false, glow: false });
  });
  it('projectile cap is 12 and slots free up', () => {
    const got: boolean[] = [];
    for (let i = 0; i < SHOT_CAPS.projectiles + 3; i++) got.push(takeShotSlot('projectiles'));
    expect(got.filter(Boolean)).toHaveLength(12);
    expect(liveShots().projectiles).toBe(12);
    for (let i = 0; i < 20; i++) freeShotSlot('projectiles');
    expect(liveShots().projectiles).toBe(0);
    expect(SHOT_CAPS.impacts).toBe(24);
  });
  it('flag defaults OFF and only the stored "on" turns it on', () => {
    expect(UNIT_SHOTS.on).toBe(false);
    expect(storedUnitShots(() => null)).toBe(false);
    expect(storedUnitShots(() => 'on')).toBe(true);
    expect(storedUnitShots(() => { throw new Error('x'); })).toBe(false);
    applyUnitShots(true);
    expect(UNIT_SHOTS.on).toBe(true);
    applyUnitShots(false);
  });
});
