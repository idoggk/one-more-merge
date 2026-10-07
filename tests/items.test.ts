import { describe, expect, it } from 'vitest';
import { LEVELS } from '../src/content/levels';
import { applyItem, drop, legalPairs, newLevel, tick, type GameState } from '../src/core/game';
import { Rng } from '../src/core/rng';
import type { Gadget } from '../src/core/types';

const gd = (s: GameState, family: Gadget['family'], rank = 1, item?: Gadget['item']): Gadget => ({ id: s.nextId++, family, rank, cd: 99, ...(item ? { item } : {}) });
const blank = (lv = 13) => {
  const s = newLevel(LEVELS[lv - 1]);
  s.grid.fill(null);
  s.pending = [];
  s.boss = null;
  s.remix = null;
  s.shieldUntil = undefined;
  return s;
};

describe('r25 items', () => {
  it('L13 grants OVERCHARGE once, at the 50% break, into the tray', () => {
    const s = newLevel(LEVELS[12]);
    const rng = new Rng(5);
    let grants = 0;
    let next = 2;
    while (s.phase === 'playing' && grants === 0) {
      if (s.elapsed >= next) {
        next += 2;
        const p = legalPairs(s);
        if (p.length) {
          const [a, b] = p[rng.int(p.length)];
          grants += drop(s, a, b, s.grid[a]!.id).events.filter((e) => e.type === 'itemGrant').length;
        }
      }
      grants += tick(s).filter((e) => e.type === 'itemGrant').length;
    }
    expect(grants).toBe(1);
    expect(s.itemTray).toBe('overcharge');
    // r33: the break counts over the whole stage
    const st = s.stage!;
    expect((st.total - st.done - (s.maxHp - s.hp)) / st.total).toBeLessThanOrEqual(0.5);
  });

  it('applies only to a compatible machine without an attachment', () => {
    const s = blank();
    s.itemTray = 'overcharge';
    s.grid[0] = gd(s, 'coil');
    s.grid[1] = gd(s, 'cannon');
    expect(applyItem(s, 0, s.grid[0]!.id).ok).toBe(false);
    expect(applyItem(s, 1, s.grid[1]!.id).ok).toBe(true);
    expect(s.grid[1]!.item).toEqual({ kind: 'overcharge', charges: 2 });
    expect(s.itemTray).toBeNull();
  });

  it('a merge inherits the attachment and its player cascade spends a charge', () => {
    const s = blank();
    s.grid[0] = gd(s, 'cannon', 1, { kind: 'overcharge', charges: 2 });
    s.grid[1] = gd(s, 'cannon', 1);
    drop(s, 0, 1, s.grid[0]!.id);
    expect(s.grid[1]!.item).toEqual({ kind: 'overcharge', charges: 1 }); // 2 charges, one spent
  });

  it('with two attachments the destination survives', () => {
    const s = blank();
    s.grid[0] = gd(s, 'cannon', 1, { kind: 'spark', charges: 1 });
    s.grid[1] = gd(s, 'cannon', 1, { kind: 'overcharge', charges: 2 });
    drop(s, 0, 1, s.grid[0]!.id);
    expect(s.grid[1]!.item?.kind).toBe('overcharge');
  });

  it('SPARK on a woken shooter wakes its neighbours (a longer chain)', () => {
    const run = (withSpark: boolean) => {
      const s = blank();
      s.grid[0] = gd(s, 'coil');
      s.grid[1] = gd(s, 'coil');
      s.grid[3] = gd(s, 'cannon', 1, withSpark ? { kind: 'spark', charges: 1 } : undefined); // in the coil's 2-cell reach
      s.grid[8] = gd(s, 'bell'); // below the cannon, outside the coil's reach
      const ev = drop(s, 0, 1, s.grid[0]!.id).events.find((e) => e.type === 'cascade') as { result: { count: number } };
      return { count: ev.result.count, s };
    };
    const plain = run(false), sparked = run(true);
    expect(sparked.count).toBeGreaterThan(plain.count);
    expect(sparked.s.grid[3]!.item).toBeUndefined(); // its single test charge is spent
  });

  it('OVERCHARGE hits x2 on its chain shot', () => {
    const hit = (oc: boolean) => {
      const s = blank();
      s.grid[0] = gd(s, 'coil');
      s.grid[1] = gd(s, 'coil');
      s.grid[3] = gd(s, 'cannon', 1, oc ? { kind: 'overcharge', charges: 2 } : undefined);
      const ev = drop(s, 0, 1, s.grid[0]!.id).events.find((e) => e.type === 'cascade') as { result: { activations: { family: string; contribution: number }[] } };
      return ev.result.activations.find((a) => a.family === 'cannon')!.contribution;
    };
    expect(hit(true)).toBeCloseTo(hit(false) * 2);
  });

  it('L16 (goal level) grants SPARK at 8 s; nothing before L13', () => {
    const s = newLevel(LEVELS[15]);
    let got = false;
    while (s.elapsed < 9 && s.phase === 'playing') {
      const e = tick(s);
      if (e.some((x) => x.type === 'itemGrant')) got = true;
    }
    expect(got).toBe(true);
    expect(s.itemTray).toBe('spark');
    const early = newLevel(LEVELS[7]);
    expect(early.itemGrantAt).toBeUndefined();
  });
});
