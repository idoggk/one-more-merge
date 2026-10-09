import { describe, expect, it } from 'vitest';
import { LEVELS } from '../src/content/levels';
import { chainWakeText, GUIDE, stageHudText, unitsTitle } from '../src/content/sceneCopy';
import { UNITS } from '../src/content/units';
import { newLevel } from '../src/core/game';

describe('scene copy matches the rules (first-time player walkthrough)', () => {
  it('stage_hud is built from the stage list: HP machines, then the goal or the boss', () => {
    // L4 and L7 are goal stages: one machine to beat, then a goal (not "2 MACHINES")
    for (const n of [4, 7]) {
      const def = LEVELS[n - 1];
      const st = newLevel(def).stage!;
      expect(st.goal).toBeTruthy();
      const text = stageHudText(st);
      expect(text).not.toMatch(/MACHINES to beat/);
      expect(text).toContain(`Beat ${st.hps.length} machine${st.hps.length === 1 ? '' : 's'}, then`);
      expect(text).toContain(st.goal!.kind === 'rank' ? `build a rank ${st.goal!.n}` : `make a x${st.goal!.n} chain`);
    }
    expect(stageHudText({ hps: [10], goal: { kind: 'rank', n: 4 } })).toMatch(/^Beat 1 machine, then build a rank 4!/);
    expect(stageHudText({ hps: [10, 20], goal: { kind: 'chain', n: 6 } })).toMatch(/^Beat 2 machines, then make a x6 chain!/);
    expect(stageHudText({ hps: [10, 20, 30] })).toMatch(/^3 MACHINES to beat!/);
    expect(stageHudText({ hps: [10, 20, 99], boss: {} })).toMatch(/^Beat 2 machines, then the BOSS!/);
    // every stage level in the game gets a sentence that agrees with its machine count
    for (const def of LEVELS) {
      const st = newLevel(def).stage;
      if (!st) continue;
      const fights = st.boss ? st.hps.length - 1 : st.hps.length;
      expect(stageHudText(st)).toContain(st.goal || st.boss ? `Beat ${fights} machine` : `${fights} MACHINES`);
    }
  });

  it('UNITS title counts owned units out of all units', () => {
    const owned = { cannon: { level: 2 }, coil: { level: 1 }, bell: { level: 1 }, rocket: { level: 1 }, not_a_unit: { level: 3 }, horn: { level: 0 } };
    expect(unitsTitle(owned, UNITS)).toBe(`UNITS  4/${UNITS.length}`);
    expect(UNITS.length).toBe(13);
    expect(unitsTitle(undefined, UNITS)).toBe('UNITS  0/13');
  });

  it('chain copy: the merge wakes the 4 touching machines of ANY family; relays only named when on the board', () => {
    const plain = chainWakeText(['cannon', 'cannon', 'rocket']);
    expect(plain).toMatch(/ANY family/);
    expect(plain).not.toMatch(/Coil|Bell/);
    expect(chainWakeText(['cannon', 'coil'])).toMatch(/Coils then reach further/);
    expect(chainWakeText(['bell', 'coil'])).toMatch(/Coils and Bells then reach further/);
    const cannon = GUIDE.find((p) => p.key === 'cannon')!.text;
    expect(cannon).not.toMatch(/wakes nobody/);
    expect(GUIDE.find((p) => p.key === 'chain')!.text).toMatch(/ANY kind/);
  });
});
