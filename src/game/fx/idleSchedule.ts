/** Pure timing and cap logic for the idle director (flag UNIT_IDLE). No Phaser, no game state, no game Rng:
 *  `rand` is a visual-only source (Math.random in play, a seeded stub in tests), so seed + actions identity is untouched. */

export type IdleKind = 'breathe' | 'blink';

export interface IdleConfig {
  /** hard cap on units animating at once */
  maxActive: number;
  /** random wait before a unit's first / next idle, ms */
  minGap: number;
  maxGap: number;
  /** a unit that just idled cannot idle again within this, ms */
  cooldown: number;
  /** reduced motion: nothing is ever picked */
  reduced: boolean;
}

export const IDLE_CONFIG: IdleConfig = { maxActive: 2, minGap: 3000, maxGap: 12000, cooldown: 20000, reduced: false };
/** low-end devices: one at a time */
export const IDLE_CONFIG_LOW: IdleConfig = { ...IDLE_CONFIG, maxActive: 1 };

export const IDLE_DURATION: Record<IdleKind, number> = { breathe: 2800, blink: 160 };

export interface IdlePick {
  id: string;
  kind: IdleKind;
  duration: number;
}

export class IdleScheduler {
  private due = new Map<string, number>();
  private active = new Map<string, number>(); // id -> ends at
  private lastStart = new Map<string, number>();

  constructor(
    public cfg: IdleConfig,
    private rand: () => number,
    /** units that must not animate together (e.g. board neighbours) */
    private near: (a: string, b: string) => boolean = () => false,
  ) {}

  get activeCount() {
    return this.active.size;
  }

  private gap() {
    return this.cfg.minGap + this.rand() * (this.cfg.maxGap - this.cfg.minGap);
  }

  /** `ids` = units that may idle right now (visible, not dragged, no cascade). At most ONE pick per call. */
  tick(now: number, ids: readonly string[]): IdlePick | null {
    for (const [id, end] of this.active) if (end <= now) this.active.delete(id);
    const live = new Set(ids);
    for (const id of [...this.due.keys()]) if (!live.has(id)) this.due.delete(id);
    for (const id of [...this.active.keys()]) if (!live.has(id)) this.active.delete(id);
    if (this.cfg.reduced) return null;
    for (const id of ids) if (!this.due.has(id)) this.due.set(id, now + this.gap());
    if (this.active.size >= this.cfg.maxActive) return null;
    let best: string | null = null;
    for (const id of ids) {
      if ((this.due.get(id) ?? Infinity) > now) continue;
      const last = this.lastStart.get(id);
      if (last !== undefined && now - last < this.cfg.cooldown) continue;
      if (this.active.has(id)) continue;
      let clash = false;
      for (const a of this.active.keys()) if (this.near(a, id)) clash = true;
      if (clash) continue;
      if (best === null || (this.due.get(id) as number) < (this.due.get(best) as number)) best = id;
    }
    if (best === null) return null;
    const kind: IdleKind = this.rand() < 0.35 ? 'blink' : 'breathe';
    const duration = IDLE_DURATION[kind];
    this.active.set(best, now + duration);
    this.lastStart.set(best, now);
    this.due.set(best, now + duration + this.gap());
    return { id: best, kind, duration };
  }

  /** forget everything (scene restart) */
  reset() {
    this.due.clear();
    this.active.clear();
    this.lastStart.clear();
  }
}
