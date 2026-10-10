import { afterEach, describe, expect, it } from 'vitest';
import { applyPace, applySpamVariant, DEFAULT_PACE, PACES, storedPace } from '../src/content/experiments';
import { LEVELS } from '../src/content/levels';
import { TUNING } from '../src/content/tuning';
import { drop, legalPairs, newLevel, serialize, tick, type GameEvent, type GameState } from '../src/core/game';
import { Rng } from '../src/core/rng';
import type { Gadget } from '../src/core/types';

let id = 9000;
const g = (family: Gadget['family'], rank = 1): Gadget => ({ id: id++, family, rank, cd: 99 });
/** A plain level board: a lone cannon pair in the top-left corner + `fillers` far-away rank-3 bells. */
function board(fillers: number): GameState {
  const s = newLevel({ ...LEVELS[21], waves: undefined, wave_visuals: undefined, minion_hp: undefined, behaviour: undefined });
  s.grid.fill(null);
  s.pending = [];
  s.owed = 0;
  s.supplyTimer = 0; // mid-level: no opening delivery clock left
  s.boss = null;
  s.grid[0] = g('cannon');
  s.grid[1] = g('cannon');
  for (let i = 0; i < fillers; i++) s.grid[29 - i] = g('bell', 3);
  return s;
}
/** Seconds after `t0` at which each delivery landed while ticking `secs`. */
function deliveries(s: GameState, secs: number): number[] {
  const t0 = s.elapsed, out: number[] = [];
  while (s.elapsed - t0 < secs - 1e-9) for (const e of tick(s)) if (e.type === 'delivery') out.push(s.elapsed - t0);
  return out;
}
/** A seeded random bot over a whole level: the final state. */
function playLevel(n: number): string {
  const s = newLevel(LEVELS[n - 1]);
  const rng = new Rng(n * 7919);
  let next = 1.5;
  while (s.phase === 'playing') {
    if (s.elapsed >= next) {
      next += 1.5;
      const p = legalPairs(s);
      if (p.length) {
        const [a, b] = p[rng.int(p.length)];
        drop(s, a, b, s.grid[a]!.id);
      }
    }
    tick(s);
  }
  return serialize(s);
}

afterEach(() => {
  applySpamVariant('off');
  applyPace('today');
});

describe('t-1bef1042 PACE prototype (QA switch, default TODAY)', () => {
  it('TODAY defaults are the master constants', () => {
    expect(TUNING.pace).toBe('today');
    const master = { reactTwo: 12, reactCap: 18, reactDelay: 0.6, reactGap: 0.35, matchShare: 0.6, bigCascade: 8, bigCascadeCooldown: 8, kickbackFuse: true, bossEvery: 12, bossWarn: 2.5, lightEvery: 15, bossAttacks: true, overdriveMerges: 6, odChain: 12, breather: 0, quietPassive: false, antiSpam: true };
    expect(TUNING).toMatchObject(master);
    expect(TUNING.paces.today).toEqual(master);
  });

  it('switching to CALM / MANIA and back to TODAY replays a level identically', () => {
    const before = [playLevel(22), playLevel(10)];
    applyPace('calm');
    expect(playLevel(22)).not.toBe(before[0]);
    applyPace('mania');
    applyPace('today');
    expect([playLevel(22), playLevel(10)]).toEqual(before);
  });

  it('CALM delivers a merge\'s earned parts as one quick burst', () => {
    const today = board(4);
    drop(today, 0, 1, today.grid[0]!.id);
    expect(today.owed).toBe(2);
    const t = deliveries(today, 2);
    expect(t).toHaveLength(2);
    expect(t[1]).toBeGreaterThan(0.9); // 0.6 + 0.35
    applyPace('calm');
    const calm = board(4);
    drop(calm, 0, 1, calm.grid[0]!.id);
    expect(calm.owed).toBe(2);
    const c = deliveries(calm, 2);
    expect(c).toHaveLength(2);
    expect(c[0]).toBeGreaterThanOrEqual(0.5 - 1e-9);
    expect(c[1]).toBeLessThanOrEqual(0.7 + 1e-9); // 0.5 + 0.15 (+ one tick)
  });

  it('CALM breather: a machine break starts 2.5 s with no rescue part and no new boss warning', () => {
    const staged = LEVELS.find((d) => (d.waves ?? 1) > 1 && !d.goal && !d.minion_hp)!;
    for (const pace of ['today', 'calm'] as const) {
      applyPace(pace);
      const s = newLevel(staged);
      s.hp = 1;
      const pair = legalPairs(s)[0];
      const ev = drop(s, pair[0], pair[1], s.grid[pair[0]]!.id).events;
      expect(ev.some((e) => e.type === 'kill')).toBe(true);
      expect(s.breatherUntil).toBe(pace === 'calm' ? s.elapsed + 2.5 : undefined);
    }
    // a pair-less board: today's rescue part comes after 2.5 s stuck; the breather holds it until the machine is in
    const stuck = () => {
      const s = board(0);
      s.grid[1] = g('coil');
      s.elapsed = 20;
      return s;
    };
    applyPace('calm');
    const s = stuck();
    s.breatherUntil = s.elapsed + TUNING.breather;
    expect(deliveries(s, 2.5)).toHaveLength(0);
    expect(deliveries(s, 3)).toHaveLength(1);
    // a light behaviour due during the breather waits (its schedule pauses with it)
    const b = stuck();
    b.boss = { def: 0, next: 0, pending: null, active: null, phaseShown: 0, light: true, t0: 0 };
    b.elapsed = 9.9; // first light hazard due at 10 s
    b.breatherUntil = b.elapsed + TUNING.breather;
    const warns = (sec: number) => {
      const out: GameEvent[] = [];
      const t0 = b.elapsed;
      while (b.elapsed - t0 < sec - 1e-9) out.push(...tick(b).filter((e) => e.type === 'bossWarn'));
      return out.length;
    };
    expect(warns(2.5)).toBe(0);
    expect(warns(1)).toBe(1);
  });

  it('MANIA: no boss attacks, A2/A3 anti-spam forced off, restored on leaving', () => {
    applySpamVariant('a3');
    applyPace('mania');
    expect(TUNING.pace).toBe('mania');
    expect(TUNING.optionA3).toBe(false);
    expect(TUNING.optionA2).toBe(false);
    const s = board(0);
    s.boss = { def: 0, next: 0, pending: null, active: null, phaseShown: 0, t0: 0 };
    let warned = false;
    while (s.elapsed < 40) warned ||= tick(s).some((e) => e.type === 'bossWarn');
    expect(warned).toBe(false);
    applyPace('today');
    expect(TUNING.optionA3).toBe(true);
    expect(TUNING.bossAttacks).toBe(true);
  });

  it('t-4cd9e27b: the game pace defaults to CALM (missing, unknown or unreadable storage); TODAY / MANIA stay pickable', () => {
    expect(DEFAULT_PACE).toBe('calm');
    expect(PACES.map((p) => p.id)).toEqual(['today', 'calm', 'mania']);
    expect(storedPace(() => null)).toBe('calm');
    expect(storedPace(() => 'turbo')).toBe('calm');
    expect(
      storedPace(() => {
        throw new Error('no storage');
      }),
    ).toBe('calm');
    expect(storedPace(() => 'today')).toBe('today');
    expect(storedPace(() => 'calm')).toBe('calm');
    expect(storedPace(() => 'mania')).toBe('mania');
  });
});
