// BoxMomentFx with a stub host (no Phaser): the same slot completing two boxes close together must not let the first
// moment's tween drive or end the second one (review of t-9170d73d).
import { describe, expect, it, vi } from 'vitest';

vi.mock('phaser', () => {
  const Color = { IntegerToColor: (c: number) => ({ red: (c >> 16) & 255, green: (c >> 8) & 255, blue: c & 255 }), GetColor: (r: number, g: number, b: number) => (r << 16) | (g << 8) | b };
  return { default: { Display: { Color }, BlendModes: { ADD: 1 } } };
});
vi.mock('../src/game/audio', () => {
  const noop = () => {};
  return { sfx: { boxThud: noop, boxClack: noop, boxChime: noop } };
});
vi.mock('../src/game/fx/shake', () => ({ reduced: () => false, shakeCamera: () => {} }));

import { BoxMomentFx } from '../src/game/fx/boxMomentFx';

/** Chainable stand-in for any display object: every method returns itself. */
function stubObj(): any {
  const o: any = new Proxy(function () {}, {
    get: (_t, k) => (k === 'then' ? undefined : (...a: unknown[]) => (k === 'removeAll' || k === 'remove' ? o : o)),
  });
  return o;
}

function setup() {
  const counters: { opts: any; stopped: boolean; stop(): void }[] = [];
  const mk = () => stubObj();
  const scene: any = {
    textures: { exists: () => true },
    cameras: { main: {} },
    add: { container: mk, graphics: mk, image: mk, text: mk },
    tweens: {
      addCounter: (opts: any) => {
        const t = { opts, stopped: false, getValue: () => t.v, v: 0, stop() { t.stopped = true; } };
        counters.push(t);
        return t;
      },
      add: () => ({ stop() {} }),
      chain: () => ({ stop() {} }),
    },
  };
  let redraws = 0;
  const host = {
    scene,
    size: { w: 100, h: 60 },
    pos: () => ({ x: 50, y: 50 }),
    tint: () => 0xff8800,
    buildBox: () => {},
    boxAt: () => ({ color: 1, n: 0 }),
    counterAt: () => ({ x: 0, y: 0 }),
    redraw: () => { redraws++; },
  };
  const fx = new BoxMomentFx(host as any);
  const tick = (t: any, ms: number) => { t.v = ms; t.opts.onUpdate(t); };
  return { fx, counters, tick, redraws: () => redraws };
}

describe('BoxMomentFx overlap', () => {
  it('a second moment in the same slot is not driven or ended by the first one\'s tween', () => {
    const { fx, counters, tick } = setup();
    fx.play(0, 1);
    tick(counters[0], 200);
    fx.play(0, 1); // 200 ms later, same slot
    expect(counters[0].stopped).toBe(true);
    expect(fx.isActive(0)).toBe(true);
    // even if a stale tween still fired (a real Phaser tween would not), ending the first must not end the second
    tick(counters[1], 100);
    expect(fx.isActive(0)).toBe(true);
    tick(counters[1], 100000);
    expect(fx.isActive(0)).toBe(false);
  });

  it('the old moment finishing does not redraw while the new rig is being registered', () => {
    const { fx, counters, redraws } = setup();
    fx.play(0, 1);
    const before = redraws();
    fx.play(0, 1);
    expect(redraws()).toBe(before);
    expect(counters[0].stopped).toBe(true);
  });
});
