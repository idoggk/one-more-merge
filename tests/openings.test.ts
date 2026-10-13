import { afterEach, describe, expect, it } from 'vitest';
import { LEVELS } from '../src/content/levels';
import { FORBIDDEN_CELLS, LAYOUTS, layoutFor } from '../src/content/openings';
import { COLS, TUNING } from '../src/content/tuning';
import { idxOf, legalPairs, newLevel, previewMerge, type GameState } from '../src/core/game';

afterEach(() => {
  TUNING.variedOpenings = false;
});

const fnv = (str: string): string => {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
};
const mass = (s: GameState) => s.grid.reduce((m, g) => m + (g ? 2 ** (g.rank - 1) : 0), 0);
const parts = (s: GameState) => s.grid.filter(Boolean).length;
const scripted = (d: (typeof LEVELS)[number]) => !!d.teach || d.level % 10 === 0 || !!d.mini_boss;
const ordinary = LEVELS.filter((d) => !scripted(d));
const liveAndBest = (s: GameState) => {
  const live = new Set<string>();
  let best = 0;
  for (const [a, b] of legalPairs(s))
    for (const [f, t] of [[a, b], [b, a]] as [number, number][]) {
      const r = previewMerge(s, f, t);
      if (!r) continue;
      best = Math.max(best, r.count);
      if (r.count >= 2) live.add(`${a}-${b}`);
    }
  return { live: live.size, best };
};

describe('varied openings: flag OFF is byte-identical to the pre-feature game', () => {
  // state hashes (newLevel plain + with Jumpstart Kit) taken on origin/master before this feature existed
  const TODAY: Record<number, string> = { 1: 'd6bc7323', 4: 'f4b19ef5', 6: '7da2d4c9', 10: '7d6bedd7', 12: 'f5eae3a1', 21: '9d0eca6b', 28: '33c64e7b', 34: '9e964d4f', 41: '5c932d4f', 52: 'cb80d43d', 63: '609449c9', 79: '0d70582b' };
  it('the default is OFF', () => expect(TUNING.variedOpenings).toBe(false));
  for (const l of Object.keys(TODAY).map(Number))
    it(`L${l} state hash equals today's`, () => {
      TUNING.variedOpenings = false;
      expect(fnv(JSON.stringify(newLevel(LEVELS[l - 1])) + JSON.stringify(newLevel(LEVELS[l - 1], { jumpstart: true })))).toBe(TODAY[l]);
    });
});

describe('varied openings: layouts', () => {
  it('A is today\'s board, B-D avoid every forbidden cell and overlap nothing within a layout', () => {
    const bad = new Set(FORBIDDEN_CELLS.map(([r, c]) => idxOf(r, c)));
    expect(LAYOUTS).toHaveLength(4);
    LAYOUTS.forEach((L, k) => {
      const cells = Object.values(L).flat().map(([r, c]) => idxOf(r, c));
      expect(cells).toHaveLength(8);
      expect(new Set(cells).size).toBe(8);
      if (k > 0) for (const c of cells) expect(bad.has(c), `layout ${k} cell ${c}`).toBe(false);
    });
  });
  it('the four layouts are different boards', () => {
    expect(new Set(LAYOUTS.map((L) => JSON.stringify(L))).size).toBe(4);
  });
});

describe('varied openings: flag ON', () => {
  it('rank mass, part count and family multiset equal the plain board on every level', () => {
    for (const d of LEVELS) {
      TUNING.variedOpenings = false;
      const a = newLevel(d);
      TUNING.variedOpenings = true;
      const b = newLevel(d);
      expect(mass(b), `L${d.level} mass`).toBe(mass(a));
      expect(parts(b), `L${d.level} parts`).toBe(parts(a));
      const fam = (s: GameState) => s.grid.filter(Boolean).map((g) => `${g!.family}${g!.rank}`).sort().join();
      expect(fam(b), `L${d.level} families`).toBe(fam(a));
    }
  });

  it('at least 2 live pairs at move 1 and a first chain of 4+ on every ordinary level and both shooters', () => {
    TUNING.variedOpenings = true;
    for (const d of ordinary)
      for (const shooter of ['cannon', 'rocket'] as const) {
        const { live, best } = liveAndBest(newLevel(d, { shooter }));
        expect(live, `L${d.level} ${shooter} live`).toBeGreaterThanOrEqual(2);
        expect(best, `L${d.level} ${shooter} chain`).toBeGreaterThanOrEqual(4);
      }
  });

  it('no layout part sits on a masked cell or collides with a start_extra part', () => {
    TUNING.variedOpenings = true;
    for (const d of ordinary) {
      const s = newLevel(d);
      for (const m of s.masked ?? []) expect(s.grid[m], `L${d.level} masked ${m}`).toBeNull();
      TUNING.variedOpenings = false;
      const today = newLevel(d);
      TUNING.variedOpenings = true;
      expect(parts(s), `L${d.level} loses no part to a mask or an extra`).toBe(parts(today));
      expect(s.masked, `L${d.level}`).toEqual(today.masked);
    }
  });

  it('deterministic: layoutFor and the whole start state repeat', () => {
    TUNING.variedOpenings = true;
    for (const d of LEVELS) {
      expect(layoutFor(d)).toBe(layoutFor(d));
      expect(JSON.stringify(newLevel(d))).toBe(JSON.stringify(newLevel(d)));
    }
  });

  it('no-repeat deal: neighbouring ordinary levels never share a layout; every chapter uses all 4', () => {
    for (let ch = 1; ch <= 8; ch++) {
      const lv = LEVELS.filter((d) => Math.ceil(d.level / 10) === ch && !d.teach);
      const ks = lv.map(layoutFor);
      lv.forEach((d, i) => {
        if (i > 0 && !scripted(d) && !scripted(lv[i - 1])) expect(ks[i], `L${d.level}`).not.toBe(ks[i - 1]);
      });
      expect(new Set(ks.filter((_, i) => !scripted(lv[i]))).size, `chapter ${ch}`).toBe(4);
    }
  });

  it('at least 4 distinct openings per chapter (chapters 2-8; chapter 1 has 7 ordinary levels too)', () => {
    TUNING.variedOpenings = true;
    for (let ch = 1; ch <= 8; ch++) {
      const sigs = new Set(
        LEVELS.filter((d) => Math.ceil(d.level / 10) === ch && !scripted(d)).map((d) => newLevel(d).grid.map((g, i) => (g ? `${i}:${g.family}` : '')).join('|')),
      );
      expect(sigs.size, `chapter ${ch}`).toBeGreaterThanOrEqual(4);
    }
  });

  it('teach, boss and mini-boss levels keep the scripted start (identical with the flag on)', () => {
    for (const d of LEVELS.filter(scripted)) {
      expect(layoutFor(d)).toBe(0);
      TUNING.variedOpenings = false;
      const a = JSON.stringify(newLevel(d));
      TUNING.variedOpenings = true;
      expect(JSON.stringify(newLevel(d)), `L${d.level}`).toBe(a);
    }
  });

  it('copies of a level (bounty / boss rush / puzzles build their own defs) keep layout A', () => {
    const d = ordinary.find((x) => layoutFor(x) !== 0)!;
    expect(layoutFor({ ...d })).toBe(0);
    TUNING.variedOpenings = true;
    const copy = JSON.stringify(newLevel({ ...d }));
    TUNING.variedOpenings = false;
    expect(copy).toBe(JSON.stringify(newLevel({ ...d })));
  });

  it('Jumpstart Kit raises the layout\'s own first shooter pair (not fixed cells) and nothing else', () => {
    for (const d of ordinary) {
      TUNING.variedOpenings = true;
      const k = layoutFor(d);
      const base = newLevel(d);
      const js = newLevel(d, { jumpstart: true });
      const pair = LAYOUTS[k].shooter.slice(0, 2).map(([r, c]) => idxOf(r, c));
      js.grid.forEach((g, i) => {
        if (!g) return;
        expect(g.rank, `L${d.level} cell ${i}`).toBe(base.grid[i]!.rank + (pair.includes(i) ? 1 : 0));
      });
      expect(js.jumpstart).toBe(true);
      // the cells match the old fixed ones on layout A
      if (k === 0) expect(pair).toEqual([4 * COLS + 1, 4 * COLS + 2]);
    }
  });

  it('the overlay does not touch the supply stream (same seed, same rng state as today)', () => {
    const d = ordinary[10];
    TUNING.variedOpenings = false;
    const a = newLevel(d);
    TUNING.variedOpenings = true;
    const b = newLevel(d);
    expect([b.supplyRng, b.perkRng, b.kickRng]).toEqual([a.supplyRng, a.perkRng, a.kickRng]);
  });
});
