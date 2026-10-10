import { describe, expect, it } from 'vitest';
import { CAST, LEVELS, MONSTER_INDEX } from '../src/content/levels';
import { faceIndexFor } from '../src/game/machineFace';

// Bug t-6d70ea51: on a stage level the tin can's face patch (level monster) was drawn over another stage machine (Viper).
describe('machine face follows the stage machine on screen', () => {
  it('never uses the level monster face for a different stage machine', () => {
    let checked = 0;
    for (const def of LEVELS) {
      const target = MONSTER_INDEX[def.monster] ?? 0;
      for (const v of def.wave_visuals ?? []) {
        const castDrawn = !!CAST[v];
        const idx = faceIndexFor({ boss: false, castDrawn, stageVisual: v, target });
        if (castDrawn) expect(idx).toBe(-1);
        else expect(idx).toBe(MONSTER_INDEX[v] ?? target);
        if (!castDrawn && MONSTER_INDEX[v] !== undefined && MONSTER_INDEX[v] !== target) expect(idx).not.toBe(target);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(50);
  });
  it('bosses and cast art get no face', () => {
    expect(faceIndexFor({ boss: true, castDrawn: false, stageVisual: 'tin_can', target: 0 })).toBe(-1);
    expect(faceIndexFor({ boss: false, castDrawn: true, target: 0 })).toBe(-1);
  });
});
