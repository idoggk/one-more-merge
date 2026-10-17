import { describe, expect, it } from 'vitest';
import { resetInputLocks, type InputLockHost } from '../src/game/inputLocks';

const obj = () => {
  const o = { destroyed: false, destroy() { o.destroyed = true; } };
  return o;
};

/** A scene frozen the way the audit describes: a lock is on, the player pressed RESTART/HOME. */
function locked(over: Partial<InputLockHost> = {}): InputLockHost {
  return { explaining: false, explainQueue: [], explainOverlay: [], fuseAfterLesson: false, guided: null, itemLesson: false, itemSelected: false, tutorialWaiting: false, introActive: false, paused: false, ...over };
}

describe('resetInputLocks (merge freeze audit D1-D3)', () => {
  it('D1: an open teaching card does not survive a restart', () => {
    const ov = obj();
    const h = locked({ explaining: true, paused: true, explainQueue: [{}, {}], explainOverlay: [ov], fuseAfterLesson: true });
    resetInputLocks(h);
    expect(h.explaining).toBe(false);
    expect(h.explainQueue).toEqual([]);
    expect(h.paused).toBe(false);
    expect(h.fuseAfterLesson).toBe(false);
    expect(ov.destroyed).toBe(true);
  });

  it('D2: a guided clamp dodge is cancelled and its arrow destroyed', () => {
    const g = obj();
    const h = locked({ guided: { objs: [g] } });
    resetInputLocks(h);
    expect(h.guided).toBeNull();
    expect(g.destroyed).toBe(true);
  });

  it('D3: the power-up lesson and a selected item are cleared', () => {
    const h = locked({ itemLesson: true, itemSelected: true });
    resetInputLocks(h);
    expect(h.itemLesson).toBe(false);
    expect(h.itemSelected).toBe(false);
  });

  it('also clears a hidden tutorial GOT IT gate and a stale intro', () => {
    const h = locked({ tutorialWaiting: true, introActive: true });
    resetInputLocks(h);
    expect(h.tutorialWaiting).toBe(false);
    expect(h.introActive).toBe(false);
  });
});
