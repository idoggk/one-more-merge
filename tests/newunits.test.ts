import { describe, expect, it } from 'vitest';
import { resolveCascade } from '../src/core/cascade';
import type { Gadget, Grid } from '../src/core/types';

let id = 9000;
const g = (family: Gadget['family'], rank = 1, extra: Partial<Gadget> = {}): Gadget => ({ id: id++, family, rank, cd: 99, ...extra });
const board = (cells: [number, Gadget][]) => {
  const grid: Grid = Array(30).fill(null);
  for (const [i, x] of cells) grid[i] = x;
  return grid;
};
const run = (grid: Grid, root: number) => resolveCascade(grid, root, { perks: [], overdrive: false });

describe('r32 new units', () => {
  it('HORN wakes its column (other families only)', () => {
    const r = run(board([[12, g('horn')], [2, g('cannon')], [27, g('cannon')], [22, g('horn')], [10, g('cannon')]]), 12);
    const woke = r.activations.map((a) => a.idx).sort((a, b) => a - b);
    expect(woke).toContain(2);
    expect(woke).toContain(27);
    expect(woke).not.toContain(22); // same family
  });
  it('FUSE BOX wakes diagonals only', () => {
    const r = run(board([[12, g('fuse_box')], [6, g('cannon')], [18, g('cannon')], [13, g('cannon')]]), 12);
    const woke = r.activations.map((a) => a.idx);
    expect(woke).toContain(6);
    expect(woke).toContain(18);
    // 13 is an orthogonal neighbour: only the root spark reaches it, which every merge root does
  });
  it('MORTAR hits harder deeper in the chain', () => {
    const shallow = run(board([[12, g('mortar', 2)]]), 12).activations[0].contribution;
    const deep = run(board([[10, g('coil')], [12, g('bell')], [14, g('mortar', 2)]]), 10).activations.find((a) => a.family === 'mortar')!;
    expect(deep.depth).toBeGreaterThanOrEqual(1);
    expect(deep.contribution).toBeGreaterThan(shallow * 0.9);
  });
  it('ARC WELDER arcs into the strongest touching machine', () => {
    const r = run(board([[12, g('arc_welder')], [6, g('bell', 3)], [8, g('cannon', 1)]]), 12);
    expect(r.edges.some((e) => e.kind === 'arc' && e.to === 6)).toBe(true);
  });
  it('AMPLIFIER marks a neighbour; the mark is spent on its next activation', () => {
    const cannon = g('cannon', 2);
    const r = run(board([[12, g('amplifier')], [7, g('cannon', 3)], [17, cannon]]), 12);
    expect(r.amps?.length).toBe(1);
    const marked = g('cannon', 2, { amp: 1.3 }), plain = g('cannon', 2);
    const a = run(board([[12, marked]]), 12), b = run(board([[12, plain]]), 12);
    expect(a.total).toBeCloseTo(b.total * 1.3);
    expect(a.ampsUsed).toContain(marked.id);
  });
});

import { LEVELS } from '../src/content/levels';
import { drop, legalPairs, newLevel, tick } from '../src/core/game';
import { Rng } from '../src/core/rng';
describe('r32 squads', () => {
  it('a level with a new-unit squad (Mortar, Horn + Fuse Box, Amplifier) builds and plays to an end', () => {
    for (const shooter of ['mortar', 'arc_welder'] as const) {
      const s = newLevel(LEVELS[24], { shooter, relays: ['horn', 'fuse_box'], toys: ['amplifier'] });
      const fams = new Set(s.grid.filter(Boolean).map((x) => x!.family));
      expect(fams.has(shooter)).toBe(true);
      expect(fams.has('horn') && fams.has('fuse_box')).toBe(true);
      const rng = new Rng(3);
      let next = 2;
      while (s.phase === 'playing') {
        if (s.elapsed >= next) {
          next += 2;
          const p = legalPairs(s);
          if (p.length) {
            const [a, b] = p[rng.int(p.length)];
            drop(s, a, b, s.grid[a]!.id);
          }
        }
        tick(s);
      }
      expect(['won', 'lost']).toContain(s.phase);
    }
  });
});
