import { afterEach, describe, expect, it } from 'vitest';
import { applySpamVariant } from '../src/content/experiments';
import { LEVELS } from '../src/content/levels';
import { TUNING } from '../src/content/tuning';
import { drop, newLevel, previewMerge, type GameEvent, type GameState } from '../src/core/game';
import type { CascadeResult, Gadget } from '../src/core/types';

let id = 9000;
const g = (family: Gadget['family'], rank = 1): Gadget => ({ id: id++, family, rank, cd: 99 });
/** A plain level board: a lone cannon pair in the top-left corner + `fillers` far-away rank-3 bells (never woken). */
function board(fillers: number): GameState {
  const s = newLevel({ ...LEVELS[21], waves: undefined, wave_visuals: undefined, minion_hp: undefined });
  s.grid.fill(null);
  s.pending = [];
  s.owed = 0;
  s.reactive = true;
  s.phase = 'playing';
  s.grid[0] = g('cannon');
  s.grid[1] = g('cannon');
  for (let i = 0; i < fillers; i++) s.grid[29 - i] = g('bell', 3);
  return s;
}
const cascadeOf = (ev: GameEvent[]) => (ev.find((e) => e.type === 'cascade') as { result: CascadeResult }).result;

afterEach(() => applySpamVariant('off'));

describe('t-2c7cbae7 Option A3 (experiment flag)', () => {
  it('is off by default', () => {
    expect(TUNING.optionA3).toBe(false);
    expect(TUNING.optionA2).toBe(false);
    expect(TUNING.optionA).toBe(false);
  });

  it('a lone merge on a full board earns nothing under A3, but still earns today', () => {
    const off = board(12);
    expect(cascadeOf(drop(off, 0, 1, off.grid[0]!.id).events).count).toBe(1);
    expect(off.owed).toBe(1);
    applySpamVariant('a3');
    const on = board(12);
    expect(drop(on, 0, 1, on.grid[0]!.id).ok).toBe(true); // never blocked
    expect(on.owed).toBe(0);
  });

  it('a thin board always earns (no starving), and a long enough chain pays on a full board', () => {
    applySpamVariant('a3');
    const thin = board(4);
    drop(thin, 0, 1, thin.grid[0]!.id);
    expect(thin.owed).toBe(2);
    TUNING.optA3.gateChain = 1;
    const full = board(12);
    drop(full, 0, 1, full.grid[0]!.id);
    expect(full.owed).toBe(1);
  });

  it('fatigue only in A3+fatigue: a quick second merge is marked and weaker; preview does not mutate', () => {
    applySpamVariant('a3f');
    const s = board(0);
    s.grid[2] = g('cannon');
    s.grid[3] = g('cannon');
    s.elapsed = 10;
    const first = cascadeOf(drop(s, 0, 1, s.grid[0]!.id).events);
    expect(first.fatigue).toBeUndefined();
    const before = s.lastMergeAt;
    previewMerge(s, 2, 3);
    expect(s.lastMergeAt).toBe(before);
    s.elapsed += 0.5;
    const second = cascadeOf(drop(s, 2, 3, s.grid[2]!.id).events);
    expect(second.fatigue).toBeCloseTo(Math.max(TUNING.optA3.minMult, 0.5 / TUNING.optA3.window));
    expect(second.total).toBeLessThan(first.total);
  });
});
