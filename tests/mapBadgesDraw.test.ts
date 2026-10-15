import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('phaser', () => ({ default: {} }));
vi.mock('../src/game/sceneKit', () => ({ W: 720, H: 1280, REDUCED_MOTION: false }));
vi.mock('../src/game/audio', () => ({ sfx: { click: vi.fn() } }));
vi.mock('../src/game/fx/juice', () => ({ attentionWiggle: vi.fn(), floatBob: vi.fn(), popIn: vi.fn() }));

import { MAP_BADGES } from '../src/content/experiments';
import { addMapBadges } from '../src/game/road/mapBadges';
import { BADGES, layoutBadges } from '../src/game/road/mapBadgesModel';

/** Game object stub: every method chains, `on` is a no-op. */
function obj(kind: string, log: string[]): any {
  const o: any = new Proxy({}, { get: (_t, name: string) => (name === 'kind' ? kind : (..._a: unknown[]) => (name === 'add' ? undefined : o)) });
  log.push(kind);
  return o;
}

function fakeScene(art: boolean) {
  const log: string[] = [];
  const mk = (k: string) => () => obj(k, log);
  return {
    log,
    hasArt: () => art,
    time: { now: 1_000_000 },
    add: { container: mk('container'), graphics: mk('graphics'), image: mk('image'), text: mk('text'), circle: mk('circle'), zone: mk('zone') },
    showToast: vi.fn(), openSeason: vi.fn(), openEventsTab: vi.fn(), openSettings: vi.fn(),
  } as any;
}

const parentStub = () => ({ add: vi.fn() });
const FORCES = ['auto', 'idle', 'ready', 'timer', 'locked'] as const;
const ctx = { level: 10, seasonClaimable: 2 };

beforeEach(() => { MAP_BADGES.on = true; MAP_BADGES.force = 'auto'; });

describe('addMapBadges drawing', () => {
  it.each(FORCES)('textures missing (%s): code drawing runs, no image, count matches layout', (force) => {
    MAP_BADGES.force = force;
    const scene = fakeScene(false), parent = parentStub();
    const lay = layoutBadges(ctx, force);
    let n = -1;
    expect(() => { n = addMapBadges(scene, parent as never, ctx); }).not.toThrow();
    expect(n).toBe(lay.left.length + lay.right.length + lay.floats.length);
    expect(n).toBeGreaterThan(0);
    expect(scene.log).not.toContain('image');
    expect(scene.log).toContain('graphics');
    expect(scene.log).toContain('text');
  });

  it('forced ready/locked at level 1 still draws every badge (dot, lock, ribbon, NEW paths)', () => {
    for (const force of ['ready', 'locked'] as const) {
      MAP_BADGES.force = force;
      const scene = fakeScene(false);
      expect(addMapBadges(scene, parentStub() as never, { level: 1, seasonClaimable: 0 })).toBe(BADGES.length);
      if (force === 'ready') expect(scene.log).toContain('circle');
    }
  });

  it('draws the NEW tag and the claim chip without textures', () => {
    // level 4 unlocks quests + season; claimable tiers give the claim chip (the overflow pill needs >3 badges a side, which the data cannot produce yet)
    const c4 = { level: 4, seasonClaimable: 1 };
    expect(layoutBadges(c4).left.some((p) => p.def.id === 'season' && p.state === 'ready')).toBe(true);
    const scene = fakeScene(false);
    expect(() => addMapBadges(scene, parentStub() as never, c4)).not.toThrow();
    expect(scene.log).not.toContain('image');
  });

  it.each(FORCES)('textures present (%s): uses images, no throw', (force) => {
    MAP_BADGES.force = force;
    const scene = fakeScene(true);
    expect(() => addMapBadges(scene, parentStub() as never, ctx)).not.toThrow();
    expect(scene.log).toContain('image');
  });

  it('flag off returns 0 and adds nothing to the parent', () => {
    MAP_BADGES.on = false;
    const scene = fakeScene(false), parent = parentStub();
    expect(addMapBadges(scene, parent as never, ctx)).toBe(0);
    expect(parent.add).not.toHaveBeenCalled();
    expect(scene.log).toEqual([]);
  });
});

describe('roadV2 flag-off identity', () => {
  it('showSeason is level > 3 unless the badge flag is on', () => {
    const src = readFileSync('src/game/road/roadV2.ts', 'utf8');
    expect(src).toContain('const showSeason = scene.currentLevel() > 3 && !MAP_BADGES.on && !ROAD_MAP_MOCK1.on;');
    MAP_BADGES.on = false;
    for (const level of [1, 3, 4, 20]) expect(level > 3 && !MAP_BADGES.on).toBe(level > 3);
  });
});
