import { afterEach, describe, expect, it } from 'vitest';
import { LEVELS } from '../src/content/levels';
import { drop, legalPairs, newLevel, sandwichFor, type GameEvent, type GameState } from '../src/core/game';
import { Rng } from '../src/core/rng';
import { applyMergeRule, sandwichBadge, type MergeRule } from '../src/core/sandwich';
import type { Family, Gadget } from '../src/core/types';
import { shakeSpec } from '../src/game/fx/shake';

// t-1e79e325: the sandwich PREVIEW (GameScene.drawSandwichPreview) is exactly sandwichFor(): it shows where the real drop sandwiches.
let id = 9000;
const g = (family: Family, rank = 1): Gadget => ({ id: id++, family, rank, cd: 99 });
function board(cells: [number, Gadget][], rule: MergeRule): GameState {
  applyMergeRule(rule);
  const s = newLevel(LEVELS[24]);
  s.grid.fill(null);
  s.pending = [];
  for (const [i, x] of cells) s.grid[i] = x;
  return s;
}
const happened = (ev: GameEvent[]) => ev.some((e) => e.type === 'sandwich');
afterEach(() => applyMergeRule('today'));

describe('sandwich preview condition', () => {
  it('matches the real drop for every legal pair, on random boards, under both rules', () => {
    const rng = new Rng(42);
    for (const rule of ['sandwich2', 'sandwichBonus'] as const) {
      let yes = 0, no = 0;
      for (let n = 0; n < 150; n++) {
        const cells: [number, Gadget][] = [];
        for (let i = 0; i < 25; i++) if (rng.int(100) < 55) cells.push([i, g(rng.int(2) ? 'cannon' : 'coil', 1 + rng.int(2))]);
        const s = board(cells, rule);
        for (const [a, b] of legalPairs(s)) {
          const promised = sandwichFor(s, a, b) !== null;
          const probe = JSON.parse(JSON.stringify(s)) as GameState;
          const r = drop(probe, a, b, probe.grid[a]!.id);
          expect(happened(r.events)).toBe(promised);
          promised ? yes++ : no++;
        }
      }
      expect(yes).toBeGreaterThan(0);
      expect(no).toBeGreaterThan(0);
    }
  });

  it('is null for TODAY (flag off), for a pair with one neighbour, and in puzzles', () => {
    const cells: [number, Gadget][] = [[0, g('cannon')], [12, g('cannon')], [7, g('cannon')], [17, g('cannon')]];
    expect(sandwichFor(board(cells, 'today'), 0, 12)).toBeNull();
    expect(sandwichFor(board(cells.slice(0, 3), 'sandwich2'), 0, 12)).toBeNull();
    const s = board(cells, 'sandwich2');
    expect(sandwichFor(s, 0, 12)).toMatchObject({ plus: 2, cells: [7, 17] });
    s.puzzle = { moves: 5, used: 0 } as unknown as GameState['puzzle'];
    expect(sandwichFor(s, 0, 12)).toBeNull();
  });

  it('a neighbour of another family or rank never counts; the badge names the rule', () => {
    const s = board([[0, g('cannon')], [12, g('cannon')], [7, g('coil')], [17, g('cannon', 2)]], 'sandwich2');
    expect(sandwichFor(s, 0, 12)).toBeNull();
    const a = board([[0, g('cannon')], [12, g('cannon')], [7, g('cannon')], [17, g('cannon')]], 'sandwich2');
    expect(sandwichBadge(sandwichFor(a, 0, 12)!)).toBe('SANDWICH +2');
    const b = board([[0, g('cannon')], [12, g('cannon')], [7, g('cannon')], [17, g('cannon')]], 'sandwichBonus');
    expect(sandwichBadge(sandwichFor(b, 0, 12)!)).toBe('SANDWICH +2 BONUS');
  });

  it('the impact shake follows the SCREEN SHAKE setting (off = none)', () => {
    expect(shakeSpec('sandwich', 'off')).toBeNull();
    expect(shakeSpec('sandwich', 'soft')).not.toBeNull();
    expect(shakeSpec('sandwich', 'full')).toEqual({ ms: 110, amp: 0.004 });
  });
});
