import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('phaser', () => ({ default: { GameObjects: { Events: { DESTROY: 'destroy' } } } }));
vi.mock('../src/game/sceneKit', () => ({ REDUCED_MOTION: false, W: 720 }));

import { BoltAnimator, drawFallbackHead } from '../src/game/fx/boltAnimator';
import { BOLT_STATES, MASCOT_CAP } from '../src/game/fx/boltMachine';
import { addIntroBolt } from '../src/game/ui/levelIntroBolt';
import { MASCOT_MOTION } from '../src/content/experiments';

/** Graphics stub: records calls, every method chains. */
function graphicsStub() {
  const calls: string[] = [];
  const g: any = new Proxy({}, { get: (_t, name: string) => (name === 'calls' ? calls : (..._a: unknown[]) => (calls.push(name), g)) });
  return g as { calls: string[] };
}

function fakeScene(texWidth: number | null) {
  const added: string[] = [];
  const container = () => ({ add: vi.fn(), list: [], removeAll: vi.fn(), setVisible: vi.fn(), setPosition() { return this; }, setAlpha() { return this; }, setScale() { return this; }, setAngle() { return this; }, once: vi.fn(), active: true, destroy: vi.fn() });
  const scene: any = {
    added,
    textures: { exists: () => texWidth !== null, get: () => ({ source: [{ width: texWidth }] }) },
    time: { now: 0, addEvent: () => ({ remove: vi.fn() }), delayedCall: vi.fn() },
    tweens: { add: vi.fn(), killTweensOf: vi.fn() },
    add: {
      container: () => (added.push('container'), container()),
      graphics: () => (added.push('graphics'), graphicsStub()),
      image: () => (added.push('image'), { setTexture() {}, setScale() {}, destroy() {}, width: 100, height: 100 }),
    },
  };
  return scene;
}

beforeEach(() => {
  MASCOT_MOTION.on = false;
  while (MASCOT_CAP.current) MASCOT_CAP.release(MASCOT_CAP.current);
});

describe('drawFallbackHead', () => {
  it('draws every state, with and without blink, without throwing', () => {
    for (const s of BOLT_STATES) for (const blink of [false, true]) {
      const g = graphicsStub();
      expect(() => drawFallbackHead(g as never, 140, s, blink, 0)).not.toThrow();
      expect(g.calls.length).toBeGreaterThan(5);
    }
  });
});

describe('BoltAnimator fallback', () => {
  it.each([[null], [1]])('missing or 1x1 texture (%s) draws the code head, no image', (w) => {
    MASCOT_MOTION.on = true;
    const scene = fakeScene(w);
    const b = BoltAnimator.create(scene, 0, 0, { owner: 't', reduced: true });
    expect(b).not.toBeNull();
    for (const s of BOLT_STATES) b!.play(s);
    expect(scene.added).not.toContain('image');
    b!.destroy();
  });

  it('a real texture uses an image', () => {
    MASCOT_MOTION.on = true;
    const scene = fakeScene(256);
    const b = BoltAnimator.create(scene, 0, 0, { owner: 't', reduced: true });
    expect(scene.added).toContain('image');
    b!.destroy();
  });
});

describe('flag off', () => {
  it('create returns null, adds nothing and does not claim the cap', () => {
    const scene = fakeScene(null);
    expect(BoltAnimator.create(scene, 0, 0, { owner: 't' })).toBeNull();
    expect(scene.added).toEqual([]);
    expect(MASCOT_CAP.current).toBeFalsy();
  });

  it('addIntroBolt adds no children and schedules nothing', () => {
    const scene = fakeScene(null);
    const parent: any = { add: vi.fn() };
    addIntroBolt(scene, parent, { x: 0, y: 0, w: 600, h: 800 });
    expect(parent.add).not.toHaveBeenCalled();
    expect(scene.added).toEqual([]);
    expect(scene.time.delayedCall).not.toHaveBeenCalled();
    expect(MASCOT_CAP.current).toBeFalsy();
  });
});
