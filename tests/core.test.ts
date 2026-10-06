import { describe, expect, it } from 'vitest';
import { COLS, ROWS, TUNING } from '../src/content/tuning';
import { rawDamage, resolveCascade } from '../src/core/cascade';
import { choosePerk, drop, finishTutorial, idxOf, newGame, previewMerge, serialize, tick, type GameState } from '../src/core/game';
import type { Family, Gadget, Grid } from '../src/core/types';

let id = 1000;
const g = (family: Family, rank = 1): Gadget => ({ id: id++, family, rank, cd: 3 });
const empty = (): Grid => new Array(ROWS * COLS).fill(null);
const opts = { perks: [], overdrive: false };

describe('cascade', () => {
  it('isolated cannon merge activates only itself', () => {
    const grid = empty();
    grid[idxOf(5, 4)] = g('cannon', 2);
    const r = resolveCascade(grid, idxOf(5, 4), opts);
    expect(r.count).toBe(1);
    expect(r.total).toBeCloseTo(22.5);
  });

  it('Coil -> Bell -> cannons branching chain, each fires once', () => {
    const grid = empty();
    grid[idxOf(4, 1)] = g('cannon', 2); // root
    grid[idxOf(3, 1)] = g('coil'); // spark neighbour
    grid[idxOf(2, 1)] = g('bell'); // coil reach 1
    grid[idxOf(2, 4)] = g('cannon'); // bell row, across gap
    grid[idxOf(0, 0)] = g('cannon'); // unreachable
    const r = resolveCascade(grid, idxOf(4, 1), opts);
    expect(r.activations.map((a) => a.idx)).toEqual([idxOf(4, 1), idxOf(3, 1), idxOf(2, 1), idxOf(2, 4)]);
    expect(new Set(r.activations.map((a) => a.id)).size).toBe(r.count);
  });

  it('empty gap stops a rank-1 coil, rank-2 coil spans it', () => {
    const grid = empty();
    grid[idxOf(5, 0)] = g('cannon', 2);
    grid[idxOf(4, 0)] = g('coil');
    grid[idxOf(2, 0)] = g('cannon');
    expect(resolveCascade(grid, idxOf(5, 0), opts).count).toBe(2);
    grid[idxOf(4, 0)] = g('coil', 2);
    expect(resolveCascade(grid, idxOf(5, 0), opts).count).toBe(3);
  });

  it('bell ranks: row, +vertical at 2, +column at 3', () => {
    const grid = empty();
    const b = idxOf(3, 2);
    const root = idxOf(3, 3);
    grid[root] = g('cannon', 2);
    grid[idxOf(3, 0)] = g('cannon');
    grid[idxOf(2, 2)] = g('cannon');
    grid[idxOf(0, 2)] = g('cannon');
    for (const [rank, n] of [[1, 3], [2, 4], [3, 5]] as const) {
      grid[b] = g('bell', rank);
      expect(resolveCascade(grid, root, opts).count).toBe(n);
    }
  });

  it('strongest coil charge wins and does not stack', () => {
    const grid = empty();
    grid[idxOf(2, 2)] = g('cannon'); // root (pretend fresh)
    grid[idxOf(2, 1)] = g('coil', 1);
    grid[idxOf(2, 3)] = g('coil', 3);
    const r = resolveCascade(grid, idxOf(2, 2), opts);
    const root = r.activations[0];
    expect(root.charge).toBeCloseTo(1 + 0.35 * 3);
  });

  it('relays never wake their own family', () => {
    const grid = empty();
    grid[idxOf(2, 0)] = g('cannon', 2); // root
    grid[idxOf(2, 1)] = g('bell'); // sparked by root
    grid[idxOf(2, 4)] = g('bell'); // same row: must NOT ring
    grid[idxOf(2, 2)] = g('coil'); // same row: rings
    expect(resolveCascade(grid, idxOf(2, 0), opts).activations.map((a) => a.idx)).toEqual([idxOf(2, 0), idxOf(2, 1), idxOf(2, 2)]);
  });

  it('magnet pulls the first gadget along a ray into the empty neighbour', () => {
    const grid = empty();
    const m = idxOf(3, 2);
    grid[m] = g('magnet', 2); // root
    grid[idxOf(0, 2)] = g('cannon'); // up ray: (2,2) empty, (1,2) empty, (0,2) cannon -> pulled to (2,2)
    const r = resolveCascade(grid, m, opts);
    expect(r.moves).toEqual([{ from: idxOf(0, 2), to: idxOf(2, 2), id: grid[idxOf(0, 2)]!.id }]);
    expect(r.activations.map((a) => a.idx)).toEqual([m]); // the pull itself never activates anything
    expect(grid[idxOf(0, 2)]).not.toBeNull(); // input grid untouched (pure)
  });

  it('magnet: occupied cell blocks the ray; never pulls magnets, queued gadgets or reserved cells', () => {
    const grid = empty();
    const m = idxOf(3, 2);
    grid[m] = g('magnet', 2);
    grid[idxOf(1, 2)] = g('magnet'); // up: blocked by a magnet (not pullable) -> stops the ray
    grid[idxOf(0, 2)] = g('cannon');
    grid[idxOf(3, 4)] = g('cannon'); // right: (3,3) empty, (3,4) cannon -> reserved
    grid[idxOf(4, 2)] = g('bell'); // down neighbour occupied -> sparked (queued), no empty dest that way
    grid[idxOf(3, 0)] = g('coil'); // left: (3,1) empty, (3,0) coil -> eligible
    const r = resolveCascade(grid, m, { perks: [], overdrive: false, reserved: new Set([idxOf(3, 4)]) });
    expect(r.moves.map((x) => [x.from, x.to])).toEqual([[idxOf(3, 0), idxOf(3, 1)]]);
  });

  it('magnet: an empty reserved cell blocks the pull ray', () => {
    const grid = empty();
    const m = idxOf(3, 0);
    grid[m] = g('magnet');
    grid[idxOf(3, 3)] = g('cannon'); // right ray: (3,1) dest, (3,2) reserved+empty blocks, so no pull
    const r = resolveCascade(grid, m, { perks: [], overdrive: false, reserved: new Set([idxOf(3, 2)]) });
    expect(r.moves).toEqual([]);
  });

  it('battery: a queued cannon uses the primer in the same chain (x1.5, once)', () => {
    const s = newGame(41, false, false, ['battery']);
    s.grid.fill(null);
    s.grid[idxOf(5, 0)] = g('battery');
    s.grid[idxOf(5, 1)] = g('battery');
    s.grid[idxOf(4, 1)] = g('cannon', 2); // sparked by the root (queued), primed by the root battery before its turn
    const res = drop(s, idxOf(5, 0), idxOf(5, 1), s.grid[idxOf(5, 0)]!.id);
    const c = res.events.find((e) => e.type === 'cascade');
    const r = c && c.type === 'cascade' ? c.result : null;
    const cid = s.grid[idxOf(4, 1)]!.id;
    expect(r!.primes).toEqual([cid]);
    expect(r!.discharged).toEqual([cid]);
    expect(r!.activations.find((x) => x.id === cid)!.contribution).toBeCloseTo(22.5 * 1.5);
    expect(s.grid[idxOf(4, 1)]!.primed).toBe(false);
  });

  it('battery: an unreached cannon keeps the primer for a later chain; merge transfers it (OR)', () => {
    const s = newGame(42, false, false, ['battery']);
    s.grid.fill(null);
    s.grid[idxOf(5, 0)] = g('cannon', 2); // merge pair -> root at (5,0)
    s.grid[idxOf(4, 0)] = g('cannon', 2);
    s.grid[idxOf(5, 1)] = g('bell'); // sparked by root, rings row 5
    s.grid[idxOf(5, 3)] = g('battery'); // rung by bell -> primes (4,3)
    s.grid[idxOf(4, 3)] = g('cannon'); // not reached by anything -> stays primed
    drop(s, idxOf(4, 0), idxOf(5, 0), s.grid[idxOf(4, 0)]!.id);
    expect(s.grid[idxOf(4, 3)]!.primed).toBe(true);
    // a primed cannon merged with an unprimed twin -> result primed, consumed by its own root payload
    s.grid[idxOf(3, 3)] = g('cannon');
    s.mergeCd = 0;
    const res = drop(s, idxOf(3, 3), idxOf(4, 3), s.grid[idxOf(3, 3)]!.id);
    const c = res.events.find((e) => e.type === 'cascade');
    expect(c && c.type === 'cascade' && c.result.discharged.length).toBe(1);
    expect(s.grid[idxOf(4, 3)]!.primed).toBe(false);
  });
  it('fan pushes the first eligible neighbour one tile outward, never into reserved or occupied cells', () => {
    const grid = empty();
    const f = idxOf(2, 2);
    grid[f] = g('fan');
    grid[idxOf(1, 2)] = g('cannon'); // up: outward cell (0,2) reserved -> skip
    grid[idxOf(2, 3)] = g('coil'); // right: outward (2,4) occupied -> skip
    grid[idxOf(2, 4)] = g('bell');
    grid[idxOf(3, 2)] = g('cannon'); // down: outward (4,2) empty -> push (but it's sparked => busy!)
    grid[idxOf(2, 1)] = g('cannon'); // left: sparked too
    const r = resolveCascade(grid, f, { perks: [], overdrive: false, reserved: new Set([idxOf(0, 2)]) });
    // as merge root the fan's neighbours are all sparked (queued) first, so nothing is eligible
    expect(r.moves).toEqual([]);
    // woken by a relay instead: fan at (2,2) reached via bell row from (2,4)... use a non-root fan
    const g2 = empty();
    g2[idxOf(5, 0)] = g('cannon', 2); // root
    g2[idxOf(5, 1)] = g('bell'); // sparked, rings row 5
    g2[idxOf(5, 3)] = g('fan'); // rung by bell
    g2[idxOf(4, 3)] = g('cannon'); // fan's up neighbour, unqueued -> pushed to (3,3)
    const r2 = resolveCascade(g2, idxOf(5, 0), opts);
    expect(r2.moves.map((m) => [m.from, m.to])).toEqual([[idxOf(4, 3), idxOf(3, 3)]]);
  });

  it('merging magnets in-game moves the pulled sprite and keeps ids unique', () => {
    const s = newGame(31, false, false, ['magnet']);
    s.grid.fill(null);
    s.grid[idxOf(5, 0)] = g('magnet');
    s.grid[idxOf(5, 1)] = g('magnet');
    s.grid[idxOf(5, 4)] = g('cannon');
    drop(s, idxOf(5, 0), idxOf(5, 1), s.grid[idxOf(5, 0)]!.id);
    // magnet at (5,1): right neighbour (5,2) empty, ray -> (5,3) empty, (5,4) cannon -> pulled to (5,2)
    expect(s.grid[idxOf(5, 2)]?.family).toBe('cannon');
    expect(s.grid[idxOf(5, 4)]).toBeNull();
    const ids = s.grid.filter(Boolean).map((x) => x!.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('fully connected board stays bounded', () => {
    const grid = empty();
    for (let i = 0; i < grid.length; i++) grid[i] = g(i % 2 ? 'coil' : 'bell', 3);
    const r = resolveCascade(grid, 0, opts);
    expect(r.count).toBe(30);
    expect(r.comboMult).toBeLessThanOrEqual(TUNING.comboCap);
  });

  it('twin burst adds damage, not activations', () => {
    const grid = empty();
    grid[0] = g('cannon', 2);
    const a = resolveCascade(grid, 0, opts);
    const b = resolveCascade(grid, 0, { perks: ['twin'], overdrive: false });
    expect(b.count).toBe(a.count);
    expect(b.total).toBeCloseTo(a.total * 1.4);
  });

  it('merging cannons increases sustained output', () => {
    expect(rawDamage('cannon', 3)).toBeGreaterThan(2 * rawDamage('cannon', 2));
  });
});

const run = (s: GameState, seconds: number) => {
  for (let i = 0; i < seconds / 0.05; i++) tick(s);
};

describe('game', () => {
  it('merge frees one cell, preserves rank mass and family', () => {
    const s = newGame(1);
    const count = () => s.grid.filter(Boolean).length;
    const mass = () => s.grid.reduce((m, x) => m + (x ? 2 ** (x.rank - 1) : 0), 0);
    const [c0, m0] = [count(), mass()];
    const res = drop(s, idxOf(4, 1), idxOf(4, 2), s.grid[idxOf(4, 1)]!.id);
    expect(res.ok).toBe(true);
    expect(count()).toBe(c0 - 1);
    expect(mass()).toBe(m0);
    expect(s.grid[idxOf(4, 2)]!.rank).toBe(2);
    expect(s.grid[idxOf(4, 2)]!.family).toBe('cannon');
  });

  it('move/swap deal no damage', () => {
    const s = newGame(1);
    const hp = s.hp;
    drop(s, idxOf(4, 1), idxOf(0, 0), s.grid[idxOf(4, 1)]!.id);
    drop(s, idxOf(3, 1), idxOf(3, 2), s.grid[idxOf(3, 1)]!.id);
    expect(s.hp).toBe(hp);
  });

  it('preview matches the real cascade and does not mutate', () => {
    const s = newGame(7);
    const before = serialize(s);
    const p = previewMerge(s, idxOf(4, 1), idxOf(4, 2))!;
    expect(serialize(s)).toBe(before);
    const res = drop(s, idxOf(4, 1), idxOf(4, 2), s.grid[idxOf(4, 1)]!.id);
    const ev = res.events.find((e) => e.type === 'cascade')!;
    expect(ev.type === 'cascade' && ev.result.count).toBe(p.count);
  });

  it('is deterministic for a seed', () => {
    const a = newGame(42);
    const b = newGame(42);
    run(a, 30);
    run(b, 30);
    expect(serialize(a)).toBe(serialize(b));
  });

  it('idle play loses at the deadline', () => {
    const s = newGame(3);
    for (let i = 0; i < (TUNING.runTime + 1) / 0.05; i++) {
      if (s.phase === 'choice') choosePerk(s, s.offer[0]);
      tick(s);
    }
    expect(s.phase).toBe('lost');
    expect(s.timeLeft).toBe(0);
  });

  it('full board pauses supply without losing parts', () => {
    const s = newGame(5);
    run(s, 120 * 0.05 * 20); // plenty
    expect(s.pending.length).toBeLessThanOrEqual(TUNING.maxPending);
  });

  it('kill opens a choice, overkill carries after choice', () => {
    const s = newGame(9);
    s.hp = 5;
    const res = drop(s, idxOf(4, 1), idxOf(4, 2), s.grid[idxOf(4, 1)]!.id);
    expect(res.events.some((e) => e.type === 'kill')).toBe(true);
    expect(s.phase).toBe('choice');
    expect(s.offer.length).toBe(3);
    const pending = s.pendingDamage;
    expect(pending).toBeGreaterThan(0);
    choosePerk(s, s.offer[0]);
    expect(s.phase).toBe('playing');
    expect(s.hp).toBeCloseTo(TUNING.targetHp[1] - pending);
  });

  it('occupancy guard holds deliveries at 25 and resumes at 22', () => {
    const s = newGame(13);
    for (let i = 0; i < s.grid.length && s.grid.filter(Boolean).length < 25; i++) if (!s.grid[i]) s.grid[i] = g('bell', 6);
    run(s, 10);
    expect(s.grid.filter(Boolean).length).toBe(25);
    expect(s.trayHold).toBe(true);
    for (let i = 0, n = 0; n < 4; i++) if (s.grid[i]?.rank === 6) (s.grid[i] = null), n++;
    tick(s);
    expect(s.trayHold).toBe(false);
  });

  it('each target pays at most 3 threshold drops, and they fuse', () => {
    const s = newGame(21);
    const fusesBefore = s.stats.kickFuses;
    // HP just above 0 but max huge: one merge crosses 75/50/25% at once without killing
    s.maxHp = 100000;
    s.hp = 20000;
    s.thresholds = 0;
    drop(s, idxOf(4, 1), idxOf(4, 2), s.grid[idxOf(4, 1)]!.id);
    expect(s.drops.length).toBe(3);
    expect(s.drops.every((d) => d.fuse)).toBe(true);
    run(s, 1);
    expect(s.drops.length).toBe(0);
    expect(s.stats.kickFuses).toBeGreaterThan(fusesBefore);
  });

  it('big-cascade drops land beside a match without fusing', () => {
    const s = newGame(22);
    s.drops.push({ t: 0, fuse: false });
    const before = s.grid.filter(Boolean).length;
    const evs = tick(s);
    const k = evs.find((e) => e.type === 'kickback');
    expect(k && k.type === 'kickback' && k.into).toBe(-1);
    expect(evs.some((e) => e.type === 'cascade')).toBe(false);
    expect(s.grid.filter(Boolean).length).toBe(before + 1);
  });

  it('tutorial: merges stay in practice until the script finishes', () => {
    const s = newGame(11, true);
    drop(s, idxOf(4, 1), idxOf(4, 2), s.grid[idxOf(4, 1)]!.id);
    expect(s.phase).toBe('tutorial');
    tick(s);
    tick(s);
    drop(s, idxOf(1, 1), idxOf(3, 1), s.grid[idxOf(1, 1)]!.id);
    expect(s.phase).toBe('tutorial'); // scene-driven: the guided script decides when it ends
    finishTutorial(s);
    expect(s.phase).toBe('playing');
    expect(s.target).toBe(0);
    expect(s.hp).toBe(TUNING.targetHp[0]);
    expect(s.practice).toBe(true);
  });
});
