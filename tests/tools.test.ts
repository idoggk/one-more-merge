import { afterEach, describe, expect, it } from 'vitest';
import { LEVELS } from '../src/content/levels';
import { TUNING } from '../src/content/tuning';
import { deserialize, drop, newLevel, newPuzzle, scrap, serialize, tick, type GameEvent, type GameState } from '../src/core/game';
import { applyMergeRule } from '../src/core/sandwich';
import { newRunLog, recordCommand, decodeActions, encodeActions } from '../src/core/replay';
import { planTool, previewTool, toolsAllowed, useTool } from '../src/core/tools';
import { storedTools, TOOLS_KEY } from '../src/content/experiments';
import type { Family, Gadget, ToolKind } from '../src/core/types';

// Board is 5 columns x 6 rows. A merge of the pair 0 -> 12 makes a rank 2 part at 12 that sparks to 7 / 11 / 13 / 17.
let id = 9000;
const g = (family: Family, rank = 1): Gadget => ({ id: id++, family, rank, cd: 99 });
const tool = (kind: ToolKind, hue: Family = 'cannon'): Gadget => ({ id: id++, family: kind === 'surge' ? 'row_surge' : 'gear_bomb', rank: 1, cd: 0, tool: kind, hue });

function state(cells: [number, Gadget][], level = 25): GameState {
  TUNING.tools = true;
  applyMergeRule('sandwichBonus');
  const s = newLevel(LEVELS[level - 1]);
  s.grid.fill(null);
  s.pending = [];
  for (const [i, x] of cells) s.grid[i] = x;
  return s;
}
const pair = (): [number, Gadget][] => [[0, g('cannon')], [12, g('cannon')]];
const play = (s: GameState) => drop(s, 0, 12, s.grid[0]!.id);
const made = (ev: GameEvent[]) => ev.filter((e): e is Extract<GameEvent, { type: 'toolMade' }> => e.type === 'toolMade');
const toolsOn = (s: GameState) => s.grid.flatMap((x, i) => (x?.tool ? [{ i, kind: x.tool }] : []));
const cannons = (...at: number[]): [number, Gadget][] => at.map((i) => [i, g('cannon')]);
/** Four rank 2 cannons around cell 12: they spark in a merge (a chain of 5) and are no sandwich partners for a rank 1 pair. */
const ring4 = (): [number, Gadget][] => [7, 11, 13, 17].map((i) => [i, g('cannon', 2)]);
const cascadeOf = (ev: GameEvent[]) => ev.find((e): e is Extract<GameEvent, { type: 'cascade' }> => e.type === 'cascade')!.result;

afterEach(() => {
  TUNING.tools = false;
  applyMergeRule('today');
});

describe('t-e2a48327 power tools: creation', () => {
  it('is OFF by default; the QA key reads on, anything else = off', () => {
    expect(TUNING.tools).toBe(false);
    expect(storedTools(() => 'on')).toBe(true);
    expect(storedTools(() => 'x')).toBe(false);
    expect(storedTools(() => { throw new Error('no storage'); })).toBe(false);
    expect(TOOLS_KEY).toBe('omm_qa_tools');
  });

  it('a chain of 5 makes a Row Surge IN ADDITION to the merge; a chain of 4 does not', () => {
    const s = state([...pair(), ...ring4()]);
    const r = play(s);
    expect(cascadeOf(r.events).count).toBe(5);
    expect(s.grid[12]!.rank).toBe(2); // the normal merge result is untouched
    expect(made(r.events)).toHaveLength(1);
    expect(toolsOn(s)).toEqual([{ i: 2, kind: 'surge' }]); // first free cell nearest the merge, row-major
    expect(s.stats.tools).toEqual({ made: 1, used: 0, combos: 0 });
    const s4 = state([...pair(), ...ring4().slice(0, 3)]);
    play(s4);
    expect(toolsOn(s4)).toEqual([]);
    expect(s4.stats.tools).toBeUndefined();
  });

  it('a sandwich merge makes a Gear Bomb, and the merge keeps its normal sandwich result', () => {
    const s = state([...pair(), ...cannons(7, 17)]);
    const r = play(s);
    expect(made(r.events).map((e) => e.kind)).toEqual(['bomb']);
    expect(s.grid[12]!.rank).toBe(2);
    expect(s.grid[17]).toBeNull(); // the absorbed neighbour's cell is free again
    expect(toolsOn(s)).toEqual([{ i: 7, kind: 'bomb' }]); // the tool takes the nearest free cell (the other absorbed one)
  });

  it('a sandwich that is also a long chain makes both (room for 2)', () => {
    const s = state([...pair(), ...cannons(7, 17), ...[[11, g('coil')], [13, g('coil')]] as [number, Gadget][], [10, g('cannon', 2)], [14, g('cannon', 2)]]);
    const r = play(s);
    expect(cascadeOf(r.events).count).toBeGreaterThanOrEqual(5);
    expect(made(r.events).map((e) => e.kind).sort()).toEqual(['bomb', 'surge']);
  });

  it('a full board puts the new tool in the tray; the delivery then lands it in a free cell', () => {
    const fill = (): [number, Gadget][] => {
      const cells: [number, Gadget][] = [];
      for (let i = 0; i < 30; i++) if (![0, 7, 11, 12, 13, 17].includes(i)) cells.push([i, g(i % 2 ? 'bell' : 'coil', 3 + (i % 3))]);
      return cells;
    };
    // the merge frees cell 0, so the tool lands there (nearest free cell)
    const s = state([...pair(), ...ring4(), ...fill()]);
    const r = play(s);
    expect(toolsOn(s)).toEqual([{ i: 0, kind: 'surge' }]);
    expect(made(r.events)[0].tray).toBe(false);
    // cell 0 promised to a falling part: no free cell, so the tool waits in the tray and the delivery lands it later
    const s2 = state([...pair(), ...ring4(), ...fill()]);
    s2.drops = [{ t: 99, fuse: false, plan: { idx: 7, land: 0, id: s2.grid[7]!.id } }];
    const r2 = play(s2);
    expect(made(r2.events)[0]).toMatchObject({ tray: true, idx: -1 });
    expect(toolsOn(s2)).toEqual([]);
    expect(s2.pending.filter((p) => p.tool)).toHaveLength(1);
    s2.drops = [];
    for (let i = 18; i < 30; i++) s2.grid[i] = null; // the tray waits while the board is crowded
    for (let k = 0; k < 400 && !toolsOn(s2).length; k++) tick(s2);
    expect(toolsOn(s2)).toHaveLength(1);
  });

  it('is deterministic: same state + same drop = identical state text', () => {
    const run = () => {
      id = 9000;
      const s = state([...pair(), ...ring4()]);
      s.nextId = 500;
      play(s);
      return serialize(s);
    };
    expect(run()).toBe(run());
  });
});

describe('t-e2a48327 power tools: limits and where they are off', () => {
  it('at most 2 tools on the board (tray counts)', () => {
    const s = state([...pair(), ...ring4(), [20, tool('surge')], [21, tool('bomb')]]);
    const r = play(s);
    expect(made(r.events)).toHaveLength(0);
    expect(toolsOn(s)).toHaveLength(2);
    const s1 = state([...pair(), ...ring4(), [20, tool('surge')]]);
    s1.pending = [tool('bomb')];
    play(s1);
    expect(toolsOn(s1)).toHaveLength(1); // 1 on board + 1 in tray = already 2
  });

  it('a capped-merge level (state.toolCap = 1) makes at most 1 tool in the whole level', () => {
    const s = state([...pair(), ...cannons(7, 17), [11, g('coil')], [13, g('coil')], [6, g('bell')]]);
    s.toolCap = 1;
    const r = play(s);
    expect(made(r.events)).toHaveLength(1);
    expect(s.stats.tools!.made).toBe(1);
    // a second big merge in the same level makes none
    s.grid[0] = g('cannon');
    s.grid[1] = g('cannon');
    s.grid[3] = g('cannon');
    for (const i of [8, 9, 14]) s.grid[i] = s.grid[i] ?? g('cannon');
    const r2 = drop(s, 0, 1, s.grid[0]!.id);
    expect(made(r2.events)).toHaveLength(0);
  });

  it('never in puzzles, daily, bounties, boss rush, the tutorial or before level 10', () => {
    const base = () => state([...pair(), ...ring4()]);
    const a = base();
    a.daily = '2026-10-11';
    expect(toolsAllowed(a)).toBe(false);
    const b = base();
    b.bounty = { id: 'x', twist: 'none', date: '2026-10-11', slot: 0 };
    expect(toolsAllowed(b)).toBe(false);
    const c = base();
    c.rush = { id: 'x', slot: 0, week: 1 };
    expect(toolsAllowed(c)).toBe(false);
    const d = base();
    d.phase = 'tutorial';
    expect(toolsAllowed(d)).toBe(false);
    for (const s of [a, b, c]) {
      play(s);
      expect(toolsOn(s)).toEqual([]);
    }
    const early = state([...pair(), ...ring4()], 5);
    play(early);
    expect(toolsOn(early)).toEqual([]);
    const lvl10 = state([...pair(), ...ring4()], 10);
    play(lvl10);
    expect(toolsOn(lvl10)).toHaveLength(1);
    const p = newPuzzle({ id: 'p', moves: 3, hp: 100, board: [['cannon', 1, 0, 0], ['cannon', 1, 2, 2]] } as never);
    expect(toolsAllowed(p)).toBe(false);
  });

  it('flag OFF = the game is unchanged (same seeded plays, identical state text, no tool fields)', () => {
    const play30 = (on: boolean) => {
      TUNING.tools = on;
      applyMergeRule('sandwichBonus');
      const s = newLevel(LEVELS[24]);
      for (let k = 0; k < 400 && s.phase === 'playing'; k++) {
        tick(s);
        if (k % 20 === 0) {
          const pairs = s.grid.flatMap((x, i) => (x ? s.grid.flatMap((y, j) => (j > i && y && y.family === x.family && y.rank === x.rank ? [[i, j] as [number, number]] : [])) : []));
          if (pairs.length) drop(s, pairs[0][0], pairs[0][1], s.grid[pairs[0][0]]!.id);
        }
      }
      return JSON.stringify(s);
    };
    const off1 = play30(false), off2 = play30(false);
    expect(off1).toBe(off2);
    expect(off1).not.toContain('"tool"');
    expect(off1).not.toContain('row_surge');
  });
});

describe('t-e2a48327 power tools: using them', () => {
  it('a tool is not a machine: two tools never merge, a merge cascade never wakes one', () => {
    const s = state([...pair(), ...cannons(7), [11, tool('surge')], [13, tool('bomb')]]);
    const r = play(s);
    expect(cascadeOf(r.events).activations.map((a) => a.idx).sort((x, y) => x - y)).toEqual([7, 12]);
    expect(s.grid[11]!.tool).toBe('surge');
    expect(drop(state([[0, tool('surge')], [1, tool('surge')]]), 0, 1, 0).ok).toBe(false);
  });

  it('Row Surge wakes its row, each machine once, and deals only the machines\' own hits; the tool is used up', () => {
    const t = tool('surge');
    const s = state([[10, t], ...cannons(11, 12, 13, 14, 2)]);
    const hp = s.hp;
    const r = useTool(s, 10, t.id);
    expect(r.ok).toBe(true);
    const res = cascadeOf(r.events);
    expect(res.activations.map((a) => a.idx).sort((a, b) => a - b)).toEqual([11, 12, 13, 14]);
    expect(new Set(res.activations.map((a) => a.id)).size).toBe(res.activations.length);
    expect(s.grid[10]).toBeNull();
    expect(s.hp).toBeLessThan(hp);
    expect(s.stats.tools).toMatchObject({ used: 1, combos: 0 });
    expect(useTool(s, 10, t.id).ok).toBe(false); // single use
  });

  it('Gear Bomb wakes the 4 touching parts; each hits as if +1 rank (hit calc only, real ranks unchanged)', () => {
    const t = tool('bomb');
    const s = state([[12, t], ...cannons(7, 11, 13, 17, 0)]);
    const plan = planTool(s, 12)!;
    expect(plan.wake).toEqual([7, 11, 13, 17]);
    const withBomb = previewTool(s, plan)!.total;
    TUNING.tl.effectRank = 0;
    const without = previewTool(s, planTool(s, 12)!)!.total;
    TUNING.tl.effectRank = 1;
    expect(withBomb / without).toBeCloseTo(TUNING.rankMult, 5);
    const r = useTool(s, 12, t.id);
    expect(cascadeOf(r.events).activations.every((a) => a.rank === 1)).toBe(true);
  });

  it('SURGE + SURGE: 3 rows wake (same row or adjacent rows); machines fire once', () => {
    const a = tool('surge'), b = tool('surge');
    const s = state([[10, a], [11, b], ...cannons(5, 6, 7, 12, 13, 14, 15, 16, 0, 25)]);
    const plan = planTool(s, 10)!;
    expect(plan.combo).toBe('surge2');
    expect(plan.wake).toEqual([5, 6, 7, 12, 13, 14, 15, 16]);
    const r = useTool(s, 10, a.id);
    const res = cascadeOf(r.events);
    expect(res.activations).toHaveLength(8);
    expect(new Set(res.activations.map((x) => x.idx)).size).toBe(8);
    expect(s.grid[10]).toBeNull();
    expect(s.grid[11]).toBeNull();
    expect(s.stats.tools).toMatchObject({ used: 1, combos: 1 });
    // adjacent rows (vertical neighbours) also give 3 rows
    const v = state([[5, tool('surge')], [10, tool('surge')], ...cannons(0, 1, 6, 11, 15, 16)]);
    expect(planTool(v, 5)!.wake).toEqual([0, 1, 6, 11, 15, 16].filter((i) => i < 15)); // rows 0..2 (grown upward first)
  });

  it('BOMB + SURGE: the row wakes AND each woken machine gets +1 effect rank', () => {
    const sg = tool('surge'), bm = tool('bomb');
    const s = state([[11, sg], [12, bm], ...cannons(10, 13, 14, 2)]);
    const plan = planTool(s, 12)!;
    expect(plan.combo).toBe('bombSurge');
    expect(plan.wake).toEqual([10, 13, 14]);
    expect(plan.effect).toBe(1);
    const plain = previewTool(s, planTool(s, 11, null)!)!.total; // surge alone (no effect rank)
    expect(previewTool(s, plan)!.total / plain).toBeCloseTo(TUNING.rankMult, 5);
  });

  it('BOMB + BOMB: the 3x3 block wakes with +1 effect; dropping a tool onto / beside the other triggers it', () => {
    const b1 = tool('bomb'), b2 = tool('bomb');
    const cells: [number, Gadget][] = [[12, b1], [13, b2], ...cannons(6, 7, 8, 11, 16, 17, 18, 0)];
    const s = state(cells);
    const plan = planTool(s, 12)!;
    expect(plan.combo).toBe('bomb2');
    expect(plan.wake).toEqual([6, 7, 8, 11, 16, 17, 18]);
    // drop b2 (cell 13) onto b1 (cell 12)
    const r = drop(s, 13, 12, b2.id);
    expect(r.ok).toBe(true);
    const res = cascadeOf(r.events);
    expect(new Set(res.activations.map((x) => x.idx)).size).toBe(res.activations.length);
    expect(res.activations.length).toBeGreaterThanOrEqual(7);
    expect(s.grid[12]).toBeNull();
    expect(s.grid[13]).toBeNull();
    // beside: a lone tool dragged next to another one combines once it lands
    const c1 = tool('surge'), c2 = tool('surge');
    const t2 = state([[10, c1], [16, c2], ...cannons(11, 12, 5, 6)]);
    const r2 = drop(t2, 16, 15, c2.id);
    expect(r2.events.some((e) => e.type === 'toolUse')).toBe(true);
    expect(t2.stats.tools!.combos).toBe(1);
  });

  it('every combo: no machine fires twice, even with relays that reach back into the woken cells', () => {
    for (const [kinds, at] of [[['surge', 'surge'], [10, 11]], [['bomb', 'surge'], [11, 12]], [['bomb', 'bomb'], [11, 12]]] as [ToolKind[], number[]][]) {
      const cells: [number, Gadget][] = [[at[0], tool(kinds[0])], [at[1], tool(kinds[1])]];
      for (let i = 0; i < 30; i++) if (!at.includes(i)) cells.push([i, g(i % 3 === 0 ? 'bell' : i % 3 === 1 ? 'coil' : 'cannon', 1 + (i % 4))]);
      const s = state(cells);
      const r = useTool(s, at[0], s.grid[at[0]]!.id);
      expect(r.ok).toBe(true);
      const ids = cascadeOf(r.events).activations.map((a) => a.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('nothing to wake = refused, the tool stays', () => {
    const t = tool('bomb');
    const s = state([[12, t]]);
    expect(useTool(s, 12, t.id).ok).toBe(false);
    expect(s.grid[12]).toBe(t);
  });

  it('scrapping a tool destroys it', () => {
    const t = tool('surge');
    const s = state([[3, t]]);
    expect(scrap(s, 3, t.id).ok).toBe(true);
    expect(s.grid[3]).toBeNull();
  });
});

describe('t-e2a48327 power tools: preview, saves, replay', () => {
  it('previewTool / planTool never mutate the state', () => {
    const sg = tool('surge'), bm = tool('bomb');
    const s = state([[11, sg], [12, bm], ...cannons(10, 13, 14, 2, 7)]);
    const before = serialize(s);
    for (const i of [11, 12]) {
      const p = planTool(s, i)!;
      previewTool(s, p);
      previewTool(s, planTool(s, i, null)!);
    }
    expect(serialize(s)).toBe(before);
  });

  it('a preview equals what the use then does', () => {
    const t = tool('surge');
    const s = state([[10, t], ...cannons(11, 12, 14)]);
    const pv = previewTool(s, planTool(s, 10)!)!;
    const used = cascadeOf(useTool(s, 10, t.id).events);
    expect(used.total).toBe(pv.total);
    expect(used.activations.map((a) => a.idx)).toEqual(pv.activations.map((a) => a.idx));
  });

  it('a state holding a tool round-trips through the save text, and an old save (no tool fields) still loads and plays', () => {
    const t = tool('surge', 'coil');
    const s = state([[10, t], ...cannons(11, 12)]);
    s.pending = [tool('bomb')];
    const back = deserialize(serialize(s))!;
    expect(back.grid[10]).toMatchObject({ tool: 'surge', hue: 'coil', family: 'row_surge' });
    expect(back.pending[0].tool).toBe('bomb');
    const old = newLevel(LEVELS[24]);
    const oldBack = deserialize(JSON.stringify(old))!;
    expect(oldBack.stats.tools).toBeUndefined();
    expect(oldBack.toolCap).toBeUndefined();
    for (let k = 0; k < 60; k++) tick(oldBack);
    expect(oldBack.phase).toBe('playing');
  });

  it('the run log replays a tool tap and survives the text encoding', () => {
    const t = tool('surge');
    const s = state([[10, t], ...cannons(11, 12, 13)]);
    const log = newRunLog();
    const r = recordCommand(log, s, { k: 'tool', idx: 10, id: t.id });
    expect(r.ok).toBe(true);
    const text = encodeActions(log.actions);
    expect(decodeActions(text)).toEqual(log.actions);
    const withPartner = [{ t: 3, k: 'tool' as const, idx: 4, id: 77, with: 9 }];
    expect(decodeActions(encodeActions(withPartner))).toEqual(withPartner);
  });
});
