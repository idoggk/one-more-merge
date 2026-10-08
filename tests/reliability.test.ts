import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { applyBundle, isQuotaError, mergeMeta, META_KEY, readBundle, readPreimport, PREIMPORT, restorePreimport, SAVE_KEY } from '../src/platform/backup';
import * as tlog from '../src/platform/telemetry';
import { parseLog } from '../src/platform/telemetry';
import { warnStorageFull } from '../src/platform/storageWarn';

class MemStore {
  map = new Map<string, string>();
  writes: [string, string | null][] = [];
  getItem(k: string) {
    return this.map.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.writes.push([k, v]);
    this.map.set(k, v);
  }
  removeItem(k: string) {
    this.writes.push([k, null]);
    this.map.delete(k);
  }
}

describe('save hardening', () => {
  const defaults = () => ({ tutorialDone: false, bestTime: null as number | null, runs: 0, sound: true, toys: {} as Record<string, boolean>, tips: {} as Record<string, boolean> });

  it('loaded meta with the wrong shape falls back field by field', () => {
    const m = mergeMeta(defaults(), { toys: null, tips: null, runs: '3', sound: 0, bestTime: 41.2, tutorialDone: true, bolts: 12 });
    expect(m).toEqual({ tutorialDone: true, bestTime: 41.2, runs: 0, sound: true, toys: {}, tips: {}, bolts: 12 });
    expect(mergeMeta(defaults(), { toys: [], tips: 'x', bestTime: 'soon' })).toMatchObject({ toys: {}, tips: {}, bestTime: null });
    expect(mergeMeta(defaults(), { bestTime: null, runs: 4, tips: { a: true } })).toMatchObject({ bestTime: null, runs: 4, tips: { a: true } });
    for (const raw of [null, [], 7, 'meta', undefined]) expect(mergeMeta(defaults(), raw)).toEqual(defaults());
    // every call gets its own default records (a fallback is never shared with another load)
    const a = mergeMeta(defaults(), null);
    a.tips.x = true;
    expect(defaults().tips).toEqual({});
  });

  it('a non-object meta in storage exports as an empty meta', () => {
    const s = new MemStore();
    s.setItem(META_KEY, 'null');
    expect(readBundle(s).meta).toEqual({});
    s.setItem(META_KEY, '[1,2]');
    expect(readBundle(s).meta).toEqual({});
  });

  it('restorePreimport never writes {} over the save', () => {
    // unreadable / non-object snapshot: no undo offered, the save is untouched
    for (const bad of ['{oops', 'null', '[]', '"x"']) {
      const s = new MemStore();
      s.setItem(META_KEY, '{"bolts":9}');
      s.setItem(META_KEY + PREIMPORT, bad);
      s.writes = [];
      expect(readPreimport(s)).toBeNull();
      expect(restorePreimport(s)).toBe(false);
      expect(s.getItem(META_KEY)).toBe('{"bolts":9}');
      expect(s.writes).toEqual([]);
    }
    // the phone had no save before the load: undo removes the meta instead of writing {}
    const fresh = new MemStore();
    applyBundle(fresh, { meta: { bolts: 3 }, run: 'r' });
    fresh.writes = [];
    expect(restorePreimport(fresh)).toBe(true);
    expect(fresh.writes.some(([k, v]) => k === META_KEY && v === '{}')).toBe(false);
    expect(fresh.getItem(META_KEY)).toBeNull();
    expect(fresh.getItem(SAVE_KEY)).toBeNull();
    expect(readPreimport(fresh)).toBeNull();
  });

  it('a failed undo (quota) leaves the current save in place', () => {
    const s = new MemStore();
    s.setItem(META_KEY, '{"bolts":5}');
    s.setItem(SAVE_KEY, 'old run');
    applyBundle(s, { meta: { bolts: 7 }, run: 'new run' });
    const set = s.setItem.bind(s);
    s.setItem = (k: string, v: string) => {
      if (k === SAVE_KEY && v === 'old run') throw Object.assign(new Error('full'), { name: 'QuotaExceededError' });
      set(k, v);
    };
    expect(() => restorePreimport(s)).toThrow();
    expect(s.getItem(META_KEY)).toBe('{"bolts":7}');
    expect(s.getItem(SAVE_KEY)).toBe('new run');
    expect(readPreimport(s)).not.toBeNull();
  });

  it('recognises storage-full errors', () => {
    expect(isQuotaError(Object.assign(new Error('x'), { name: 'QuotaExceededError' }))).toBe(true);
    expect(isQuotaError({ name: 'NS_ERROR_DOM_QUOTA_REACHED' })).toBe(true);
    expect(isQuotaError({ code: 22 })).toBe(true);
    expect(isQuotaError(new Error('SecurityError'))).toBe(false);
    expect(isQuotaError(null)).toBe(false);
  });

  it('the storage-full warning shows at most once a minute', () => {
    expect(warnStorageFull(1_000_000)).toBe(true);
    expect(warnStorageFull(1_030_000)).toBe(false);
    expect(warnStorageFull(1_061_000)).toBe(true);
  });

  it('a corrupt telemetry log is dropped instead of crashing', () => {
    for (const raw of ['{"a":1}', 'null', '42', '"str"', '{bad', null]) expect(parseLog(raw)).toEqual([]);
    expect(parseLog('[null, 3, {"t":1,"run":2,"e":"x"}, {"e":"no run"}]')).toEqual([{ t: 1, run: 2, e: 'x' }]);
  });

  it('routine saves write the telemetry log at most every 30 s; an explicit flush writes at once', () => {
    const ls = new MemStore();
    vi.stubGlobal('localStorage', ls);
    try {
      const t0 = 9e12;
      const writes = () => ls.writes.filter(([k]) => k === 'omm.telemetry.v1').length;
      tlog.log('a');
      tlog.flushThrottled(t0);
      expect(writes()).toBe(1);
      tlog.log('b');
      tlog.flushThrottled(t0 + 2000);
      tlog.flushThrottled(t0 + tlog.FLUSH_EVERY_MS - 1);
      expect(writes()).toBe(1);
      tlog.flushThrottled(t0 + tlog.FLUSH_EVERY_MS);
      expect(writes()).toBe(2);
      tlog.log('c');
      tlog.flush(t0 + tlog.FLUSH_EVERY_MS + 1); // hidden / level end
      expect(writes()).toBe(3);
      expect(parseLog(ls.getItem('omm.telemetry.v1')).map((e) => e.e).slice(-3)).toEqual(['a', 'b', 'c']);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

// ---------- audio: a fake WebAudio graph that records what gets started ----------
const param = () => ({ value: 1, setValueAtTime() {}, exponentialRampToValueAtTime() {}, linearRampToValueAtTime() {}, cancelScheduledValues() {} });
class FakeCtx {
  static last: FakeCtx;
  state = 'suspended';
  currentTime = 0;
  sampleRate = 8000;
  destination = {};
  started: { kind: string; t: number }[] = [];
  buffers = 0;
  resumes = 0;
  constructor() {
    FakeCtx.last = this;
  }
  resume() {
    this.resumes++;
    this.state = 'running';
    return Promise.resolve();
  }
  suspend() {
    this.state = 'suspended';
    return Promise.resolve();
  }
  node(kind: string) {
    const ctx = this;
    return {
      gain: param(),
      frequency: param(),
      Q: param(),
      type: '',
      buffer: null,
      onended: null,
      connect: (n: unknown) => n,
      start(t: number) {
        ctx.started.push({ kind, t });
      },
      stop() {},
    };
  }
  createGain() {
    return this.node('gain');
  }
  createDynamicsCompressor() {
    return this.node('comp');
  }
  createBiquadFilter() {
    return this.node('filter');
  }
  createOscillator() {
    return this.node('osc');
  }
  createBufferSource() {
    return this.node('noise');
  }
  createBuffer(_ch: number, len: number) {
    this.buffers++;
    return { getChannelData: () => new Float32Array(len) };
  }
}

describe('audio reliability', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
    vi.stubGlobal('AudioContext', FakeCtx);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('turning music off and on never plays the missed notes in one burst', async () => {
    const a = await import('../src/game/audio');
    a.unlockAudio();
    const ctx = FakeCtx.last;
    a.startMusic();
    vi.advanceTimersByTime(200);
    a.audioSettings.music = false;
    ctx.currentTime = 30; // half a minute muted
    vi.advanceTimersByTime(1000);
    const before = ctx.started.length;
    a.audioSettings.music = true;
    vi.advanceTimersByTime(50);
    const burst = ctx.started.slice(before);
    // one 50 ms tick schedules at most ~0.25 s of groove (a few eighth notes), never 30 s worth
    expect(burst.length).toBeGreaterThan(0);
    expect(burst.length).toBeLessThan(12);
    expect(Math.min(...burst.map((x) => x.t))).toBeGreaterThanOrEqual(30);
    a.stopMusic();
  });

  it('resumes from any non-running state (iOS "interrupted")', async () => {
    const a = await import('../src/game/audio');
    a.unlockAudio();
    const ctx = FakeCtx.last;
    expect(ctx.resumes).toBe(1);
    ctx.state = 'interrupted';
    a.unlockAudio();
    expect(ctx.resumes).toBe(2);
    a.unlockAudio(); // running: nothing to do
    expect(ctx.resumes).toBe(2);
  });

  it('cascade notes and the chord are never dropped by the voice cap; noise reuses one buffer', async () => {
    const a = await import('../src/game/audio');
    a.unlockAudio();
    const ctx = FakeCtx.last;
    for (let i = 0; i < 20; i++) a.sfx.cannon(0.5, true); // a big chain fills every voice
    const osc = () => ctx.started.filter((x) => x.kind === 'osc').length;
    let n = osc();
    a.sfx.drop();
    expect(osc()).toBe(n); // ordinary sounds still respect the cap
    for (let beat = 0; beat < 6; beat++) a.sfx.cascadeStep(beat, beat * 0.1);
    expect(osc()).toBe(n + 6);
    n = osc();
    a.sfx.chord(12);
    expect(osc()).toBe(n + 4);
    expect(ctx.buffers).toBe(1);
  });
});
