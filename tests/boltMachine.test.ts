import { describe, it, expect } from 'vitest';
import { BoltMachine, BOLT_CONFIG, BOLT_DURATION, BOLT_STATES, BOLT_TRANSITIONS, MascotCap, boltTexKey, peekProgress, type BoltEvent } from '../src/game/fx/boltMachine';

const seeded = (seed = 7) => () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
};

describe('BoltMachine transitions', () => {
  it('accepts every legal transition and refuses every other one', () => {
    for (const from of BOLT_STATES) {
      for (const to of BOLT_STATES) {
        const m = new BoltMachine(BOLT_CONFIG, seeded());
        // reach `from` through idle, which may go anywhere but itself
        if (from !== 'idle') expect(m.request(from, 0)).toBe(true);
        const ok = m.request(to, 10);
        expect(ok, `${from}->${to}`).toBe(from !== to && BOLT_TRANSITIONS[from].includes(to));
        expect(m.state).toBe(ok ? to : from);
      }
    }
  });

  it('timed states fall back to idle after their duration, held states stay', () => {
    for (const s of BOLT_STATES.filter((x) => x !== 'idle')) {
      const m = new BoltMachine({ ...BOLT_CONFIG, reduced: true }, seeded());
      m.request(s, 1000);
      const dur = BOLT_DURATION[s];
      if (dur === null) {
        m.tick(1000 + 60000);
        expect(m.state).toBe(s);
      } else {
        expect(m.tick(1000 + dur - 1)).toEqual([]);
        expect(m.state).toBe(s);
        expect(m.tick(1000 + dur)).toEqual([{ kind: 'state', state: 'idle', from: s }]);
        expect(m.state).toBe('idle');
      }
    }
  });
});

describe('BoltMachine idle randomness', () => {
  const collect = (m: BoltMachine, ms: number) => {
    const ev: { t: number; e: BoltEvent }[] = [];
    for (let t = 0; t <= ms; t += 50) for (const e of m.tick(t)) ev.push({ t, e });
    return ev;
  };
  it('blinks and glances at random gaps inside the configured ranges', () => {
    const ev = collect(new BoltMachine(BOLT_CONFIG, seeded(3)), 120000);
    const blinks = ev.filter((x) => x.e.kind === 'blink').map((x) => x.t);
    const glances = ev.filter((x) => x.e.kind === 'glance');
    expect(blinks.length).toBeGreaterThan(10);
    expect(glances.length).toBeGreaterThan(3);
    expect(blinks[0]).toBeGreaterThanOrEqual(BOLT_CONFIG.blinkMin);
    for (let i = 1; i < blinks.length; i++) expect(blinks[i] - blinks[i - 1]).toBeGreaterThanOrEqual(BOLT_CONFIG.blinkMin);
    expect(new Set(blinks.map((t, i) => (i ? t - blinks[i - 1] : 0))).size).toBeGreaterThan(3);
  });
  it('is deterministic for the same stub and silent outside idle or under reduced motion', () => {
    expect(collect(new BoltMachine(BOLT_CONFIG, seeded(9)), 30000)).toEqual(collect(new BoltMachine(BOLT_CONFIG, seeded(9)), 30000));
    expect(collect(new BoltMachine({ ...BOLT_CONFIG, reduced: true }, seeded()), 60000)).toEqual([]);
    const held = new BoltMachine(BOLT_CONFIG, seeded());
    held.request('thinking', 0);
    expect(collect(held, 60000)).toEqual([]);
  });
});

describe('MascotCap', () => {
  it('lets one owner animate at a time', () => {
    const cap = new MascotCap();
    expect(cap.claim('intro')).toBe(true);
    expect(cap.claim('intro')).toBe(true);
    expect(cap.claim('road')).toBe(false);
    cap.release('road'); // not the holder: no effect
    expect(cap.current).toBe('intro');
    cap.release('intro');
    expect(cap.claim('road')).toBe(true);
  });
});

describe('helpers', () => {
  it('maps states to pose texture keys', () => {
    expect(BOLT_STATES.map((s) => boltTexKey(s))).toEqual(['bolt_idle', 'bolt_happy', 'bolt_cheer', 'bolt_point', 'bolt_peek_top', 'bolt_thinking', 'bolt_worried']);
    expect(boltTexKey('peek', 'side')).toBe('bolt_peek_side');
  });
  it('peek slides in, wiggles, slides out', () => {
    expect(peekProgress(0)).toEqual({ slide: 0, wiggle: false });
    expect(peekProgress(0.5)).toEqual({ slide: 1, wiggle: true });
    expect(peekProgress(1).slide).toBe(0);
    expect(peekProgress(0.1).slide).toBeCloseTo(0.5);
  });
});
