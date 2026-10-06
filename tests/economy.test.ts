import { describe, expect, it } from 'vitest';
import { buy, CATALOG, runPayout, type RunSummary } from '../src/core/economy';

const run = (o: Partial<RunSummary>): RunSummary => ({ activeSec: 135, merges: 20, bossesDefeated: 0, fullClear: false, bestChain: 0, completed: true, ...o });

describe('Bolts economy (ChatGPT r12)', () => {
  it("matches the designer's typical earnings table", () => {
    expect(runPayout(run({ bestChain: 6 })).total).toBe(8);
    expect(runPayout(run({ bossesDefeated: 1, bestChain: 7 })).total).toBe(12);
    expect(runPayout(run({ bossesDefeated: 2, bestChain: 12 })).total).toBe(18);
    expect(runPayout(run({ bossesDefeated: 3, fullClear: true, bestChain: 15 })).total).toBe(30);
    expect(runPayout(run({ bossesDefeated: 3, fullClear: true, bestChain: 25 })).total).toBe(32);
  });

  it('merge-and-quit cannot farm: no base and no chain bonus without 30s + 3 merges', () => {
    expect(runPayout(run({ activeSec: 8, merges: 1, bestChain: 12 })).total).toBe(0);
    expect(runPayout(run({ activeSec: 60, merges: 2, bestChain: 30 })).total).toBe(0);
  });

  it('a very fast legit full clear still pays bosses, chain and clear', () => {
    expect(runPayout(run({ activeSec: 25, merges: 2, bossesDefeated: 3, fullClear: true, bestChain: 10 })).total).toBe(24);
  });

  it('Daily pays once, only for a completed attempt; onboarding only when entitled', () => {
    expect(runPayout(run({ bestChain: 6 }), { dailyUnclaimed: true }).daily).toBe(8);
    expect(runPayout(run({ bestChain: 6, completed: false }), { dailyUnclaimed: true }).daily).toBe(0);
    expect(runPayout(run({ bestChain: 6 }), { dailyUnclaimed: false }).daily).toBe(0);
    expect(runPayout(run({}), { onboardingUnclaimed: true }).onboarding).toBe(12);
  });

  it('buying is atomic and never twice; the catalog is cosmetic only', () => {
    const w = { bolts: 30, owned: [] as string[], finish: null };
    expect(buy(w, 'cherry_paint')).toBe(false);
    expect(w).toEqual({ bolts: 30, owned: [], finish: null });
    expect(buy(w, 'brass_kit')).toBe(true);
    expect(buy(w, 'brass_kit')).toBe(false);
    expect(w.bolts).toBe(10);
    for (const c of CATALOG) expect(['finish', 'nameplate', 'ornament']).toContain(c.slot);
  });
});
