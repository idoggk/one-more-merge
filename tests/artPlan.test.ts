import { readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { TARGET_NAMES } from '../src/content/perks';
import { STARTER_UNITS } from '../src/content/units';
import { FAMILIES } from '../src/core/types';
import { artPlan, type FirstScreen } from '../src/game/artPlan';

const KEYS = readdirSync(new URL('../src/assets/art/', import.meta.url)).map((f) => f.replace(/\.(png|webp)$/, ''));
const fams = new Set<string>([...STARTER_UNITS, 'rocket']);
const SCREENS: Record<string, FirstScreen> = {
  new: { isNew: true, road: false, fams },
  road: { isNew: false, road: true, fams },
  resume: { isNew: false, road: false, fams },
};

describe('artPlan: art the game draws without a hasArt guard is never deferred', () => {
  // setTargetTexture / buildStatic use these unguarded; a deferred key gets neither its art nor a stand-in until it loads
  const unguarded = KEYS.filter(
    (k) => /^target_\d+$/.test(k) || ['bg', 'slot', 'demo_can'].includes(k) || [...fams].some((f) => new RegExp(`^${f}_\\d+$`).test(k)),
  );

  it('the art folder has every target the game names', () => {
    for (let i = 0; i < TARGET_NAMES.length; i++) expect(KEYS).toContain(`target_${i}`);
    expect(unguarded.length).toBeGreaterThan(TARGET_NAMES.length + 3);
  });

  for (const [name, screen] of Object.entries(SCREENS))
    it(`${name} player: every unguarded key is eager`, () => {
      expect(unguarded.filter((k) => artPlan(k, screen) !== 'eager')).toEqual([]);
    });

  it('families out of play wait for the first batch; the fallback stages come in it too', () => {
    const out = FAMILIES.find((f) => !fams.has(f) && KEYS.includes(`${f}_1`));
    if (out) expect(artPlan(`${out}_1`, SCREENS.resume)).toBe('heldBack');
    for (const k of ['stage_1', 'stage_2']) if (KEYS.includes(k)) expect(artPlan(k, SCREENS.resume)).toBe('heldBack');
    expect(artPlan('target_4_dmg', SCREENS.resume)).toBe('lazy');
  });
});
