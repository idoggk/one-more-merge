// EFFORT MODEL S1 (docs/EFFORT_MODEL.md): the overlay is read only with TUNING.effortModel ON, the boss gets a bigger share of the level's time,
// and tools/effort-fit.ts is deterministic and replays the checked-in overlay from the spec.
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { LEVELS } from '../src/content/levels';
import { EFFORT_OVERLAY, effortFor } from '../src/content/effort';
import { TUNING } from '../src/content/tuning';
import { choosePerk, drop, hitCap, legalPairs, newLevel, previewMerge, tick, type GameState } from '../src/core/game';
import { stateHash } from '../src/core/roster4';
import { Rng } from '../src/core/rng';
import { finalize, firstOrder, hpShare, replay, serialize, specLevels, timesOf, type Overlay } from '../tools/effort-fit';

afterEach(() => {
  TUNING.effortModel = false;
});

const spec = JSON.parse(readFileSync('docs/effort-model-spec.json', 'utf8')) as Parameters<typeof firstOrder>[0];
const overlayFile = JSON.parse(readFileSync('src/content/effortOverlay.json', 'utf8')) as Overlay;
const BOSS_LEVELS = specLevels(spec).map((l) => l.level);
const def = (n: number) => LEVELS.find((d) => d.level === n)!;
const r50 = (x: number) => Math.round(x / 50) * 50;

describe('effort overlay', () => {
  it('covers exactly the 16 boss and mini-boss levels', () => {
    expect(BOSS_LEVELS).toEqual([8, 10, 18, 20, 28, 30, 38, 40, 48, 50, 58, 60, 68, 70, 78, 80]);
    expect(Object.keys(EFFORT_OVERLAY).map(Number)).toEqual(BOSS_LEVELS);
  });

  it('flag ON: boss HP and the minion pool follow the overlay; the boss HP share stays at or under 75% unless the cap lever is on', () => {
    TUNING.effortModel = true;
    for (const n of BOSS_LEVELS) {
      const d = def(n), e = effortFor(n)!;
      const s = newLevel(d);
      const hps = s.stage!.hps;
      expect(hps[hps.length - 1], `L${n} boss HP`).toBe(r50(d.hp * e.bossHpMult));
      const pool = hps.slice(0, -1).reduce((a, b) => a + b, 0);
      expect(Math.abs(pool - r50((d.minion_hp ?? d.hp) * e.minionHpMult)), `L${n} minion pool`).toBeLessThanOrEqual(hps.length);
      expect(s.bossCap, `L${n} cap`).toBe(e.bossCap);
      if (e.bossCap === undefined) expect(hpShare(n, e), `L${n} share`).toBeLessThanOrEqual(0.75 + 1e-9);
    }
  });

  it('flag OFF: the same levels are exactly the shipped ones and the overlay is never read (even an absurd overlay changes nothing)', () => {
    const play = (n: number) => {
      const s = newLevel(def(n));
      for (let i = 0; i < 400; i++) tick(s);
      return stateHash(s);
    };
    const before = BOSS_LEVELS.map(play);
    for (const n of BOSS_LEVELS) {
      const s = newLevel(def(n));
      expect(s.stage!.hps[s.stage!.hps.length - 1]).toBe(def(n).hp);
      expect(s.bossCap).toBeUndefined();
    }
    const saved = JSON.stringify(EFFORT_OVERLAY);
    for (const k of Object.keys(EFFORT_OVERLAY)) EFFORT_OVERLAY[k] = { bossHpMult: 9, minionHpMult: 0.35, bossCap: 0.15 };
    try {
      expect(BOSS_LEVELS.map(play)).toEqual(before);
    } finally {
      for (const [k, v] of Object.entries(JSON.parse(saved))) EFFORT_OVERLAY[k] = v as (typeof EFFORT_OVERLAY)[string];
    }
  });

  it('the cap lever only changes the boss machine, and only with the flag on', () => {
    const lever = BOSS_LEVELS.find((n) => effortFor(n)?.bossCap !== undefined)!;
    const d = def(lever);
    TUNING.effortModel = true;
    const s = newLevel(d);
    expect(hitCap(s)).toBe(Math.ceil(s.maxHp * TUNING.cascadeCap)); // first minion machine: the normal cap
    s.stage!.i = s.stage!.hps.length - 1;
    s.hp = s.maxHp = s.stage!.hps[s.stage!.i];
    expect(hitCap(s)).toBe(Math.ceil(s.maxHp * effortFor(lever)!.bossCap!));
    TUNING.effortModel = false;
    const off = newLevel(d);
    off.stage!.i = off.stage!.hps.length - 1;
    off.hp = off.maxHp = off.stage!.hps[off.stage!.i];
    expect(hitCap(off)).toBe(Math.ceil(off.maxHp * TUNING.cascadeCap));
  });
});

// a small smart@3 bot (as tools/effort-audit.ts) to measure the boss's share of the clear time
function bossShare(n: number, seed: number): number | undefined {
  const s: GameState = newLevel(def(n));
  const rng = new Rng(seed);
  let next = 3 * (0.8 + 0.4 * rng.next());
  const kills: number[] = [];
  let lastI = 0;
  while (s.phase === 'playing' || s.phase === 'choice') {
    if (s.phase === 'choice') { choosePerk(s, s.offer[0]); continue; }
    if (s.elapsed >= next) {
      next += 3 * (0.8 + 0.4 * rng.next());
      let best: [number, number] | undefined, bs = -1;
      for (const [a, b] of legalPairs(s)) for (const [f, t] of [[a, b], [b, a]] as [number, number][]) {
        const r = previewMerge(s, f, t);
        const sc = r ? Math.min(r.total, hitCap(s)) : -1;
        if (sc > bs) [best, bs] = [[f, t], sc];
      }
      if (best) drop(s, best[0], best[1], s.grid[best[0]]!.id);
    }
    tick(s);
    if (s.stage && s.stage.i !== lastI) { kills.push(s.elapsed); lastI = s.stage.i; }
  }
  if (s.phase !== 'won' || !kills.length) return undefined;
  return (s.elapsed - kills[kills.length - 1]) / s.elapsed;
}

describe('boss share of the level time (flag ON, reduced n; the full n = 30 table is in docs/EFFORT_MODEL.md)', () => {
  const mean = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;
  for (const n of [10, 18, 38]) {
    it(`L${n}: the boss takes clearly more of the clock with the flag ON than OFF`, () => {
      const seeds = [1, 2, 3, 4].map((i) => n * 1009 + i * 7919);
      const arm = (on: boolean) => {
        TUNING.effortModel = on;
        return seeds.map((sd) => bossShare(n, sd)).filter((x): x is number => x !== undefined);
      };
      const off = arm(false), on = arm(true);
      expect(off.length).toBeGreaterThan(2);
      expect(on.length).toBeGreaterThan(2);
      expect(mean(on)).toBeGreaterThan(mean(off) + 0.05);
      expect(mean(on)).toBeGreaterThan(0.38); // n = 4 here: the n = 30 audit bot measures 0.50 to 0.58 on these levels
    }, 120_000);
  }
});

describe('tools/effort-fit.ts', () => {
  it('is deterministic: the same spec gives byte-identical overlays, run twice', () => {
    expect(serialize(firstOrder(spec))).toBe(serialize(firstOrder(spec)));
    const o = { ...overlayFile };
    expect(serialize(replay(spec, o))).toBe(serialize(replay(spec, o)));
    expect(serialize(finalize(spec, o))).toBe(serialize(finalize(spec, o)));
  });

  it('the checked-in overlay replays from the spec and its recorded measurements (not hand-edited)', () => {
    expect(overlayFile.pass).toBeLessThanOrEqual(3);
    expect(overlayFile.final).toBeDefined();
    expect(serialize(finalize(spec, overlayFile))).toBe(serialize(overlayFile));
  });

  it('a hand-edited overlay no longer replays (failure case)', () => {
    const edited: Overlay = JSON.parse(JSON.stringify(overlayFile));
    edited.levels['10'].bossHpMult += 0.1;
    expect(serialize(finalize(spec, edited))).not.toBe(serialize(edited));
  });

  it('pass 0 is the spec first order, with the cap lever where the spec asks for it', () => {
    const o = firstOrder(spec);
    for (const l of specLevels(spec)) {
      const e = o.levels[String(l.level)];
      expect(e.bossCap !== undefined, `L${l.level}`).toBe(!!l.hp_first_order.needs_cap_lever);
    }
  });

  it('timesOf: boss time is the last stage, minion time the time to the second-to-last kill, winning runs only', () => {
    const t = timesOf([
      { w: 1, t: 60, clk: 95, d: 1, st: [20, 40, 60] },
      { w: 0, t: 95, clk: 95, d: 1, st: [20] },
      { w: 1, t: 50, clk: 95, d: 1, st: [10, 30, 50] },
    ]);
    expect(t).toEqual({ tb: 20, tm: 35 });
    expect(Number.isNaN(timesOf([{ w: 0, t: 95, clk: 95, d: 1, st: [] }]).tb)).toBe(true);
  });
});
