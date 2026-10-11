// Crate screen with a stub host (no Phaser): its endless (repeat: -1) tweens must all be stopped by skip and by close, so opening
// crates over and over never piles up tweens that keep running on destroyed objects (scout finding, t-3c841c2d).
import { describe, expect, it, vi } from 'vitest';

vi.mock('phaser', () => {
  const Math_ = { Between: (a: number) => a, FloatBetween: (a: number) => a, Linear: (a: number, b: number, t: number) => a + (b - a) * t };
  return { default: { BlendModes: { ADD: 1 }, Math: Math_, Display: { Color: {} } } };
});
vi.mock('../src/game/audio', () => {
  const noop = () => {};
  return { sfx: new Proxy({}, { get: () => noop }) };
});
vi.mock('../src/game/textures', () => ({ hasShippedArt: () => false }));
vi.mock('../src/game/ui/oddsPanel', () => ({ showOddsPanel: () => {}, addOddsButton: () => {} }));
vi.mock('../src/game/ui/unitJobUi', () => ({ showUnitJobPopup: () => {}, addUnitJob: () => {} }));

import { presentCrateToolbox } from '../src/game/ui/crateScreen';
import type { CrateCard } from '../src/core/crates';

/** Every pointerup handler registered while a crate screen is built (ODDS button, tap zone, crate picture, then the cards). */
const taps: (() => void)[] = [];

/** Chainable stand-in for a display object: every method returns itself; on / once / emit really work. */
function stubObj(): any {
  const handlers = new Map<string, (() => void)[]>();
  const o: any = new Proxy(function () {}, {
    get: (_t, k) => {
      if (k === 'then') return undefined;
      if (k === 'on' || k === 'once') return (ev: string, fn: () => void) => (ev === 'pointerup' && taps.push(fn), handlers.set(ev, [...(handlers.get(ev) ?? []), fn]), o);
      if (k === 'emit') return (ev: string) => (handlers.get(ev) ?? []).slice().forEach((fn) => fn());
      if (k === 'handlers') return handlers;
      return () => o;
    },
  });
  return o;
}

interface FakeTween { cfg: any; live: boolean; stop(): void }

function setup() {
  const tweens: FakeTween[] = [];
  const timers: { fn: () => void; removed: boolean; remove(): void }[] = [];
  let modal: any = null;
  const meta: any = {};
  const scene: any = {
    meta,
    crateReturn: null,
    textures: { exists: () => true, get: () => ({ getSourceImage: () => ({ height: 100 }) }) },
    tweens: {
      add: (cfg: any) => {
        const t: FakeTween = { cfg, live: true, stop() { t.live = false; } };
        tweens.push(t);
        return t;
      },
      killTweensOf: (targets: any) => {
        const list = Array.isArray(targets) ? targets : [targets];
        tweens.forEach((t) => {
          const mine = Array.isArray(t.cfg.targets) ? t.cfg.targets : [t.cfg.targets];
          if (mine.some((x: any) => list.includes(x))) t.live = false;
        });
      },
    },
    time: { delayedCall: (_ms: number, fn: () => void) => { const t = { fn, removed: false, remove() { t.removed = true; } }; timers.push(t); return t; } },
    add: { container: stubObj, graphics: stubObj, image: stubObj, text: stubObj, rectangle: stubObj, ellipse: stubObj },
    fitVisible: (im: any) => im,
    visBounds: () => ({ x: 0, y: 0, w: 100, h: 100 }),
    hasArt: () => true,
    unitPortrait: (id: string) => id,
    seasonEv: () => {},
    shake: () => {},
    totalCrates: () => 0,
    button: () => {},
    closeModal() {
      const m = modal;
      modal = null;
      m?.emit('modalclose'); // the real closeModal tells the panel, then destroys it 140 ms later
      m?.emit('destroy');
    },
    panel() {
      modal = stubObj();
      return modal;
    },
  };
  const cards: CrateCard[] = [
    { unit: 'cannon', count: 1, isNew: true },
    { unit: 'coil', count: 2, isNew: false },
    { unit: 'bell', count: 1, isNew: false },
  ] as CrateCard[];
  const liveLoops = () => tweens.filter((t) => t.live && t.cfg.repeat === -1).length;
  const runTimers = () => timers.splice(0).forEach((t) => !t.removed && t.fn());
  return { scene, cards, tweens, liveLoops, runTimers, getModal: () => modal };
}

describe('crate screen endless tweens', () => {
  it('opening creates the endless tweens (sanity), and nothing stays alive after skip or close, 20 times over', () => {
    const { scene, cards, liveLoops, runTimers, getModal } = setup();
    for (let i = 0; i < 20; i++) {
      taps.length = 0;
      presentCrateToolbox(scene, 'iron', cards);
      expect(liveLoops()).toBeGreaterThanOrEqual(3); // rays + glow + TAP TO OPEN pulse (+ idle bob)
      if (i % 2 === 0) {
        taps[1](); // tap to open
        taps[1](); // tap again while opening = skip
        expect(liveLoops()).toBe(0);
        runTimers();
      }
      scene.closeModal();
      expect(liveLoops()).toBe(0);
    }
    expect(getModal()).toBeNull();
    expect(liveLoops()).toBe(0);
  });

  it('closing a crate that was never opened stops every endless tween too', () => {
    const { scene, cards, liveLoops } = setup();
    presentCrateToolbox(scene, 'wood', cards);
    expect(liveLoops()).toBeGreaterThanOrEqual(3);
    scene.closeModal();
    expect(liveLoops()).toBe(0);
  });

  it('opening a second crate straight over the first (no explicit close) does not leave the first one looping', () => {
    const { scene, cards, liveLoops } = setup();
    presentCrateToolbox(scene, 'gold', cards);
    presentCrateToolbox(scene, 'bench', cards); // presentCrateToolbox starts with scene.closeModal()
    scene.closeModal();
    expect(liveLoops()).toBe(0);
  });
});
