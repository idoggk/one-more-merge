import { describe, expect, it } from 'vitest';
import { bountiesFor, newBountyFight, TWIST_TEXT, twistText } from '../src/core/bounty';
import { tick } from '../src/core/game';

describe('r30 monster bounties', () => {
  it('three deterministic bounties per date from the beaten pool; none below three', () => {
    const pool = ['tin_can_king', 'pressure_popper', 'fridge_overlord', 'carousel_crab'];
    expect(bountiesFor('2026-10-07', pool.slice(0, 2))).toBeNull();
    const a = bountiesFor('2026-10-07', pool), b = bountiesFor('2026-10-07', [...pool].reverse());
    expect(a).toEqual(b);
    expect(a!.length).toBe(3);
    expect(new Set(a!.map((x) => x.id)).size).toBe(3);
  });
  it('walkthrough 3: every day of a year has three different twists, same list per date', () => {
    const pool = ['tin_can_king', 'pressure_popper', 'fridge_overlord', 'carousel_crab', 'vacuum_viper'];
    const d0 = Date.UTC(2026, 0, 1);
    for (let i = 0; i < 365; i++) {
      const date = new Date(d0 + i * 86400000).toISOString().slice(0, 10);
      const a = bountiesFor(date, pool)!;
      expect(new Set(a.map((x) => x.twist)).size).toBe(3);
      expect(bountiesFor(date, [...pool].reverse())).toEqual(a);
    }
  });
  it('the Rocket twist says the Rockets are lent until Rocket is owned', () => {
    expect(twistText('rocket', false)).toContain('lent');
    expect(twistText('rocket', true)).toBe(TWIST_TEXT.rocket);
    expect(twistText('gaps', false)).toBe(TWIST_TEXT.gaps);
  });
  it('a bounty fight applies its twist and runs', () => {
    const s = newBountyFight('tin_can_king', 'gaps', '2026-10-07', 0);
    expect(s.masked).toEqual([11, 13]);
    expect(s.bounty?.id).toBe('tin_can_king');
    const r = newBountyFight('pressure_popper', 'rocket', '2026-10-07', 1);
    expect(r.grid.some((g) => g?.family === 'rocket')).toBe(true);
    for (let t = 0; t < 200; t++) tick(s);
    expect(s.phase).toBe('playing');
  });
});
