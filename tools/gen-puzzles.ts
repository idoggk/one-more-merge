// r42 WORKSHOP PUZZLES generator (Ido: "like a chess puzzle - win in X moves; hard; practice using units correctly";
// "practices like win moving only the blue units; challenges tied to a unit when you unlock it").
// For a random board, search every sequence of `moves` merges with the real engine, set the machine's HP to 97% of the
// best line's damage, and keep the puzzle only if few lines win (<= 8%) and the greedy line (best damage each step)
// FAILS - the player has to plan, not grab. Writes src/content/puzzles.json. Usage: npx vite-node tools/gen-puzzles.ts
import { writeFileSync } from 'node:fs';
import { canMerge, drop, newPuzzle, type GameState, type PuzzleDef } from '../src/core/game';
import { Rng } from '../src/core/rng';
import type { Family } from '../src/core/types';

const SHOOTERS: Family[] = ['cannon', 'rocket', 'mortar', 'arc_welder'];
const RELAYS: Family[] = ['coil', 'bell', 'horn', 'fuse_box'];
const HELPERS: Family[] = ['magnet', 'fan', 'battery', 'amplifier', 'signal_beacon'];
const BIG = 1e9;

function moves(s: GameState, only?: string[]): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i < s.grid.length; i++)
    for (let j = 0; j < s.grid.length; j++) {
      if (i === j) continue;
      const a = s.grid[i], b = s.grid[j];
      if (a && b && canMerge(a, b, s) && (!only || only.includes(a.family))) out.push([i, j]);
    }
  return out;
}

function play(s: GameState, m: [number, number]): GameState {
  const t = structuredClone(s);
  drop(t, m[0], m[1], t.grid[m[0]]!.id);
  return t;
}

/** All lines: damage per complete sequence (or until no legal merge). */
function search(s: GameState, left: number, only: string[] | undefined, path: [number, number][], out: { dmg: number; path: [number, number][] }[]) {
  const ms = left > 0 ? moves(s, only) : [];
  if (!ms.length) {
    out.push({ dmg: BIG - s.hp, path });
    return;
  }
  for (const m of ms) search(play(s, m), left - 1, only, [...path, m], out);
}

function greedy(s: GameState, left: number, only?: string[]): number {
  let cur = s;
  for (let k = 0; k < left; k++) {
    const ms = moves(cur, only);
    if (!ms.length) break;
    let best = cur, bd = -1;
    for (const m of ms) {
      const t = play(cur, m);
      if (BIG - t.hp > bd) [bd, best] = [BIG - t.hp, t];
    }
    cur = best;
  }
  return BIG - cur.hp;
}

function randomBoard(rng: Rng, fams: Family[], focus: Family[], pairs: number, singles: number): [string, number, number, number][] {
  const cells = rng.shuffle(Array.from({ length: 30 }, (_, i) => i));
  const out: [string, number, number, number][] = [];
  const put = (f: Family, r: number) => {
    const c = cells.pop()!;
    out.push([f, r, Math.floor(c / 5), c % 5]);
  };
  for (let k = 0; k < pairs; k++) {
    const f = k < focus.length * 2 ? focus[k % focus.length] : fams[rng.int(fams.length)];
    const r = 1 + rng.int(3);
    put(f, r);
    put(f, r);
  }
  for (let k = 0; k < singles; k++) put(fams[rng.int(fams.length)], 1 + rng.int(4));
  return out;
}

function makePuzzle(id: string, rng: Rng, opts: { fams: Family[]; focus: Family[]; moves: number; only?: Family[]; pairs: number; singles: number; unit?: Family }): PuzzleDef | null {
  for (let attempt = 0; attempt < 400; attempt++) {
    const board = randomBoard(rng, opts.fams, opts.focus, opts.pairs, opts.singles);
    const def: PuzzleDef = { id, moves: opts.moves, hp: BIG, board, solution: [], ...(opts.only ? { only: opts.only } : {}), ...(opts.unit ? { unit: opts.unit } : {}) };
    const s0 = newPuzzle(def);
    if (moves(s0, opts.only).length < 3) continue;
    const lines: { dmg: number; path: [number, number][] }[] = [];
    search(s0, opts.moves, opts.only, [], lines);
    if (lines.length < 12) continue;
    const best = lines.reduce((a, b) => (b.dmg > a.dmg ? b : a));
    if (best.dmg < 200 || best.path.length < opts.moves) continue;
    const target = Math.floor((best.dmg * 0.97) / 10) * 10;
    const winners = lines.filter((l) => l.dmg >= target).length;
    if (winners / lines.length > 0.08) continue;
    if (greedy(s0, opts.moves, opts.only) >= target) continue;
    return { ...def, hp: target, solution: best.path };
  }
  return null;
}

const rng = new Rng(20261007);
const pickN = <T,>(a: T[], n: number) => rng.shuffle([...a]).slice(0, n);
// daily: mixed units, 3 merges; ~30% carry a "merge only" rule
const daily: PuzzleDef[] = [];
for (let k = 0; daily.length < 40 && k < 400; k++) {
  const fams = [...pickN(SHOOTERS, 1 + rng.int(2)), ...pickN(RELAYS, 2), ...(rng.next() < 0.5 ? pickN(HELPERS, 1) : [])];
  const only = rng.next() < 0.3 ? pickN(fams, 2) : undefined;
  const p = makePuzzle(`d${daily.length + 1}`, rng, { fams, focus: [], moves: 3, only, pairs: 5, singles: 4 });
  if (p) daily.push(p);
}
// unit drills: 3 per unit, built around it
const drills: Record<string, PuzzleDef[]> = {};
for (const u of [...SHOOTERS, ...RELAYS, ...HELPERS]) {
  const role = SHOOTERS.includes(u) ? 'shooter' : RELAYS.includes(u) ? 'relay' : 'helper';
  const mates: Family[] = role === 'shooter' ? pickN(RELAYS, 2) : role === 'relay' ? [...pickN(SHOOTERS, 1), ...pickN(RELAYS.filter((r) => r !== u), 1)] : [...pickN(SHOOTERS, 1), ...pickN(RELAYS, 1)];
  const fams = [u, ...mates];
  const specs = [
    { moves: 2, only: undefined, pairs: 4, singles: 3 },
    { moves: 2, only: role === 'helper' ? [u, mates[1]] : [u], pairs: 4, singles: 4 },
    { moves: 3, only: undefined, pairs: 5, singles: 4 },
  ];
  drills[u] = [];
  specs.forEach((sp, i) => {
    const p = makePuzzle(`${u}_${i + 1}`, rng, { fams, focus: [u], unit: u, ...sp });
    if (p) drills[u].push(p);
  });
  console.log(u, drills[u].length, drills[u].map((p) => `${p.moves}m hp${p.hp}${p.only ? ' only ' + p.only.join('+') : ''}`).join(' | '));
}
console.log('daily', daily.length);
writeFileSync('src/content/puzzles.json', JSON.stringify({ daily, drills }, null, 1) + '\n');
