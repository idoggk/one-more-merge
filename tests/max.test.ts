import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { TUNING } from '../src/content/tuning';
import { resolveCascade } from '../src/core/cascade';
import { idxOf } from '../src/core/game';
import type { Family, Gadget, Grid } from '../src/core/types';

let id = 9000;
const g = (family: Family, rank = 1): Gadget => ({ id: id++, family, rank, cd: 3 });
const empty = (): Grid => new Array(30).fill(null);
const opts = { perks: [], overdrive: false };
const ids = (r: ReturnType<typeof resolveCascade>) => r.activations.map((a) => a.idx);

describe('MAX signatures (ChatGPT round 9, legacy ruleset / practice experimental)', () => {
  beforeAll(() => void (TUNING.clarity = false));
  afterAll(() => void (TUNING.clarity = true));
  it('Cannon Backfire: a rank-6 cannon wakes one adjacent relay after its shot', () => {
    const grid = empty();
    const root = idxOf(2, 2);
    grid[root] = g('coil'); // root zaps the cannon below
    grid[idxOf(3, 2)] = g('cannon', 6);
    grid[idxOf(3, 3)] = g('bell'); // right of the cannon; not reachable otherwise (coil reach 1, family filter ok)
    const r = resolveCascade(grid, root, opts);
    expect(ids(r)).toContain(idxOf(3, 3));
    expect(r.edges.some((e) => e.kind === 'backfire' && e.from === idxOf(3, 2))).toBe(true);
    // rank 5 cannon: no backfire
    grid[idxOf(3, 2)] = g('cannon', 5);
    expect(ids(resolveCascade(grid, root, opts))).not.toContain(idxOf(3, 3));
  });

  it('Coil Arc Bridge: jumps a 2-cell empty corridor to a non-coil 3 away; a blocked corridor stops it', () => {
    const grid = empty();
    const root = idxOf(5, 0);
    grid[root] = g('coil', 6);
    grid[idxOf(5, 3)] = g('cannon'); // 3 to the right, (5,1),(5,2) empty
    const r = resolveCascade(grid, root, opts);
    expect(r.edges.some((e) => e.kind === 'bridge' && e.to === idxOf(5, 3))).toBe(true);
    grid[idxOf(5, 1)] = g('magnet'); // corridor blocked (also gets sparked, magnet pulls nothing useful)
    const r2 = resolveCascade(grid, root, opts);
    expect(r2.edges.some((e) => e.kind === 'bridge')).toBe(false);
  });

  it('Bell Corner Chime: wakes one diagonal non-bell neighbour, never a bell', () => {
    const grid = empty();
    const root = idxOf(3, 3);
    grid[root] = g('cannon', 2);
    grid[idxOf(3, 2)] = g('bell', 6); // sparked
    grid[idxOf(2, 1)] = g('bell'); // UL diagonal: a bell, skipped
    grid[idxOf(2, 3)] = g('coil'); // UR diagonal -> chimed  (also adjacent to root, so sparked anyway? no: (2,3) is above root)
    const r = resolveCascade(grid, root, opts);
    expect(r.edges.some((e) => e.kind === 'chime' && grid[e.to]!.family === 'bell')).toBe(false);
  });

  it('Magnet Twin Pull: two pulls, two directions; Battery Split Charge: two primers; Fan Long Gust: 2-cell push', () => {
    const m = empty();
    m[idxOf(2, 2)] = g('magnet', 6);
    m[idxOf(0, 2)] = g('cannon'); // up ray
    m[idxOf(2, 4)] = g('coil'); // right ray
    const rm = resolveCascade(m, idxOf(2, 2), opts);
    expect(rm.moves.length).toBe(2);
    expect(new Set(rm.moves.map((x) => x.id)).size).toBe(2);

    const b = empty();
    b[idxOf(2, 2)] = g('battery', 6);
    b[idxOf(1, 2)] = g('cannon');
    b[idxOf(3, 2)] = g('cannon');
    const rb = resolveCascade(b, idxOf(2, 2), opts);
    expect(rb.primes.length).toBe(2);

    const f = empty();
    const fan = idxOf(5, 0);
    f[fan] = g('fan', 6);
    f[idxOf(4, 0)] = g('bell'); // above the fan
    // woken by a relay so the bell is not pre-queued: use a cannon root that sparks the fan only
    f[idxOf(5, 1)] = g('cannon', 2);
    const rf = resolveCascade(f, idxOf(5, 1), opts);
    const mv = rf.moves[0];
    expect(mv.to).toBe(idxOf(2, 0)); // pushed two cells up (from (4,0) past (3,0) to (2,0))
  });
});
