/** Pure state machine for the mascot Bolt (flag MASCOT_MOTION). No Phaser, no game state, no game Rng:
 *  `rand` is a visual-only source (Math.random in play, a seeded stub in tests). Also holds the one-mascot-per-screen cap. */

export type BoltState = 'idle' | 'happy' | 'cheer' | 'point' | 'peek' | 'thinking' | 'worried';
export const BOLT_STATES: readonly BoltState[] = ['idle', 'happy', 'cheer', 'point', 'peek', 'thinking', 'worried'];

/** Which state may follow which. Everything returns to idle; one-shots may not be chained into each other mid-play except happy -> cheer. */
export const BOLT_TRANSITIONS: Record<BoltState, readonly BoltState[]> = {
  idle: ['happy', 'cheer', 'point', 'peek', 'thinking', 'worried'],
  happy: ['idle', 'cheer', 'worried'],
  cheer: ['idle'],
  point: ['idle', 'happy', 'worried'],
  peek: ['idle', 'happy'],
  thinking: ['idle', 'happy', 'worried'],
  worried: ['idle', 'happy'],
};

/** ms a state lasts before it falls back to idle; null = held until the caller asks for another state. */
export const BOLT_DURATION: Record<BoltState, number | null> = { idle: null, happy: 900, cheer: 1500, point: null, peek: 2400, thinking: null, worried: 700 };

export interface BoltConfig {
  blinkMin: number;
  blinkMax: number;
  glanceMin: number;
  glanceMax: number;
  /** reduced motion: states still change, but no random blink or glance is ever produced */
  reduced: boolean;
}
export const BOLT_CONFIG: BoltConfig = { blinkMin: 2200, blinkMax: 5500, glanceMin: 6000, glanceMax: 14000, reduced: false };

export type BoltEvent = { kind: 'state'; state: BoltState; from: BoltState } | { kind: 'blink' } | { kind: 'glance'; dir: -1 | 1 };

export class BoltMachine {
  state: BoltState = 'idle';
  private since = 0;
  private blinkAt: number;
  private glanceAt: number;

  constructor(
    public cfg: BoltConfig,
    private rand: () => number,
    now = 0,
  ) {
    this.blinkAt = now + this.span(cfg.blinkMin, cfg.blinkMax);
    this.glanceAt = now + this.span(cfg.glanceMin, cfg.glanceMax);
  }

  private span(a: number, b: number) {
    return a + this.rand() * (b - a);
  }

  /** Ask for a state. False (and nothing changes) when the transition is not legal from the current state. */
  request(next: BoltState, now: number): boolean {
    if (next === this.state || !BOLT_TRANSITIONS[this.state].includes(next)) return false;
    this.state = next;
    this.since = now;
    return true;
  }

  /** Advance the clock. Returns what happened since the last call (state fallbacks, blinks, glances), in order. */
  tick(now: number): BoltEvent[] {
    const out: BoltEvent[] = [];
    const dur = BOLT_DURATION[this.state];
    if (dur !== null && now - this.since >= dur) {
      const from = this.state;
      this.state = 'idle';
      this.since = now;
      this.blinkAt = now + this.span(this.cfg.blinkMin, this.cfg.blinkMax);
      this.glanceAt = Math.max(this.glanceAt, now + 1500);
      out.push({ kind: 'state', state: 'idle', from });
    }
    if (this.state === 'idle' && !this.cfg.reduced) {
      if (now >= this.blinkAt) {
        out.push({ kind: 'blink' });
        this.blinkAt = now + this.span(this.cfg.blinkMin, this.cfg.blinkMax);
      }
      if (now >= this.glanceAt) {
        out.push({ kind: 'glance', dir: this.rand() < 0.5 ? -1 : 1 });
        this.glanceAt = now + this.span(this.cfg.glanceMin, this.cfg.glanceMax);
      }
    }
    return out;
  }
}

/** One animated mascot per screen: the first owner to claim keeps it until it releases. */
export class MascotCap {
  private holder: string | null = null;
  get current() {
    return this.holder;
  }
  claim(owner: string): boolean {
    if (this.holder !== null && this.holder !== owner) return false;
    this.holder = owner;
    return true;
  }
  release(owner: string) {
    if (this.holder === owner) this.holder = null;
  }
}
export const MASCOT_CAP = new MascotCap();

/** Texture key for a state's pose; peek has an edge variant. */
export function boltTexKey(state: BoltState, edge: 'top' | 'side' = 'top'): string {
  return state === 'peek' ? `bolt_peek_${edge}` : state === 'cheer' ? 'bolt_cheer' : `bolt_${state}`;
}

/** Peek slide offsets: 0 = hidden past the edge, 1 = fully in. In 0..0.2, out 0.8..1 of the peek's duration, wiggle in between. */
export function peekProgress(t: number): { slide: number; wiggle: boolean } {
  const x = Math.min(1, Math.max(0, t));
  if (x < 0.2) return { slide: x / 0.2, wiggle: false };
  if (x > 0.8) return { slide: (1 - x) / 0.2, wiggle: false };
  return { slide: 1, wiggle: true };
}
