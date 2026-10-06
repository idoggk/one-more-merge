import { describe, expect, it } from 'vitest';
import { TUNING } from '../src/content/tuning';
import { resolveCascade } from '../src/core/cascade';
import { drop, idxOf, newGame, remixHp, tick, type GameState } from '../src/core/game';
import { REMIX_WARNINGS, remixTick, type RemixState } from '../src/core/remix';
import type { Family, Gadget, Grid } from '../src/core/types';

let id = 5000;
const g = (family: Family, rank = 1): Gadget => ({ id: id++, family, rank, cd: 3 });
const empty = (): Grid => new Array(30).fill(null);
const rs = (kind: RemixState['kind']): RemixState => ({ kind, next: 0, pending: null, lock: null });
const none = new Set<number>();

describe('remix', () => {
  it('remix run: single HP pool, target is the remix opponent, kill = win', () => {
    const s = newGame(1, false, false, [], 3);
    expect(s.remix?.kind).toBe('vacuum');
    expect(s.target).toBe(3);
    expect(s.hp).toBe(remixHp());
    expect(remixHp()).toBe(TUNING.targetHp.reduce((a, b) => a + b, 0));
  });

  it('vacuum: lowest rank, tie by index; moving the original away sacrifices a replacement; empty = whiff', () => {
    const grid = empty();
    grid[7] = g('cannon', 2);
    grid[12] = g('coil', 1);
    grid[3] = g('bell', 1); // same rank as 12, lower index -> chosen
    const r = rs('vacuum');
    const w = remixTick(r, grid, REMIX_WARNINGS[0], true, none);
    expect(w).toEqual([{ type: 'remixWarn', kind: 'vacuum', cells: [3], deadline: REMIX_WARNINGS[0] + 3 }]);
    // player moves the bell away, a replacement lands on the marked cell
    const repl = g('cannon', 5);
    grid[4] = grid[3];
    grid[3] = repl;
    const hit = remixTick(r, grid, REMIX_WARNINGS[0] + 3, true, none);
    expect(hit[0]).toMatchObject({ type: 'remixHit', outcome: 'hit', removedId: repl.id });
    expect(grid[3]).toBeNull();
    // next warning: target cleared before deadline -> whiff
    const r2 = rs('vacuum');
    const grid2 = empty();
    grid2[10] = g('coil');
    remixTick(r2, grid2, REMIX_WARNINGS[0], true, none);
    grid2[10] = null;
    expect(remixTick(r2, grid2, REMIX_WARNINGS[0] + 3, true, none)[0]).toMatchObject({ outcome: 'whiff' });
  });

  it('twins: highest rank, pushes U/R/D/L into the first free cell, keeps id + primer, never into reserved', () => {
    const grid = empty();
    const big = { ...g('cannon', 4), primed: true };
    grid[idxOf(2, 2)] = big;
    grid[idxOf(1, 2)] = g('coil'); // up occupied
    const r = rs('twins');
    remixTick(r, grid, REMIX_WARNINGS[0], true, none);
    // right (2,3) reserved -> skipped; down (3,2) free -> lands there
    const ev = remixTick(r, grid, REMIX_WARNINGS[0] + 3, true, new Set([idxOf(2, 3)]));
    expect(ev[0]).toMatchObject({ outcome: 'hit', from: idxOf(2, 2), to: idxOf(3, 2) });
    expect(grid[idxOf(3, 2)]).toBe(big);
    expect(big.primed).toBe(true);
  });

  it('piano: locks the fullest row for 4 s; locked cells block relays, merges and rays; expiry fires nothing', () => {
    const s = newGame(7, false, false, [], 5);
    while (s.elapsed < REMIX_WARNINGS[0] - 0.2) tick(s);
    s.grid.fill(null);
    s.pending = [];
    s.grid[idxOf(2, 0)] = g('cannon', 2);
    s.grid[idxOf(2, 1)] = g('bell');
    s.grid[idxOf(4, 0)] = g('cannon');
    s.grid[idxOf(4, 1)] = g('cannon');
    s.grid[idxOf(4, 3)] = g('coil');
    while (s.elapsed < REMIX_WARNINGS[0] + 3 + 0.01) tick(s);
    expect(s.remix!.lock!.cells).toEqual([20, 21, 22, 23, 24]); // row 4 had 3 occupied
    // merging the locked pair is refused
    expect(drop(s, idxOf(4, 0), idxOf(4, 1), s.grid[idxOf(4, 0)]!.id).ok).toBe(false);
    // a relay never wakes a locked gadget
    const r = resolveCascade(s.grid, idxOf(2, 0), { perks: [], overdrive: false, locked: new Set(s.remix!.lock!.cells) });
    expect(r.activations.some((a) => Math.floor(a.idx / 5) === 4)).toBe(false);
    const hpBefore = s.hp;
    const until = s.remix!.lock!.until;
    while (s.elapsed < until + 0.01) tick(s);
    expect(s.remix!.lock).toBeNull();
    expect(s.hp).toBeGreaterThanOrEqual(hpBefore - 200); // only passive fire, no burst on expiry
  });

  it('warnings wait for falling Kickback parts and never stack', () => {
    const grid = empty();
    grid[0] = g('coil');
    const r = rs('vacuum');
    expect(remixTick(r, grid, REMIX_WARNINGS[0], false, none)).toEqual([]); // not settled
    expect(remixTick(r, grid, REMIX_WARNINGS[0] + 0.5, true, none)[0]).toMatchObject({ type: 'remixWarn', deadline: REMIX_WARNINGS[0] + 3.5 });
  });

  it('a whole remix run is deterministic and bounded', () => {
    const run = (): GameState => {
      const s = newGame(99, false, false, [], 4);
      for (let i = 0; i < 3000 && s.phase === 'playing'; i++) tick(s);
      return s;
    };
    expect(JSON.stringify(run())).toBe(JSON.stringify(run()));
  });
});
