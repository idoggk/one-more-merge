// r42 WORKSHOP PUZZLES generator (Ido: "like a chess puzzle - win in X moves; hard; practice using units correctly";
// "practices like win moving only the blue units; challenges tied to a unit when you unlock it").
// r44 RAMP (owner stuck on the first puzzle): every puzzle gets a solver difficulty score (src/core/puzzle.ts: depth,
// rarity of a win, dead openers, tempting traps, greedy fails, order matters). For a random board, search every
// sequence of `moves` merges with the real engine, then pick the machine HP that lands the score inside the slot's band.
// Drill 1 of every unit and the first daily puzzles are 1-merge "many ways win" warm-ups; drills climb 1 -> 2 -> 3
// merges; the daily list climbs gently for ~24 days, then stays in a hard-but-fair band. Writes src/content/puzzles.json
// with each puzzle's `score`. Usage: npx vite-node tools/gen-puzzles.ts   (curve: npx vite-node tools/puzzle-curve.ts)
import { writeFileSync } from 'node:fs';
import { newPuzzle, type PuzzleDef } from '../src/core/game';
import { allLines, puzzleMoves, puzzleStats } from '../src/core/puzzle';
import { Rng } from '../src/core/rng';
import type { Family } from '../src/core/types';

const SHOOTERS: Family[] = ['cannon', 'rocket', 'mortar', 'arc_welder'];
const RELAYS: Family[] = ['coil', 'bell', 'horn', 'fuse_box'];
const HELPERS: Family[] = ['magnet', 'fan', 'battery', 'amplifier', 'signal_beacon'];
/** Big boards make 80k-line searches (slow to build, slow to hint on a phone) without making better puzzles. */
const MAX_LINES = 12000;

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

interface Spec {
  fams: Family[];
  focus: Family[];
  moves: number;
  only?: Family[];
  pairs: number;
  singles: number;
  unit?: Family;
  /** Wanted difficulty score band. */
  band: [number, number];
}

function makePuzzle(id: string, rng: Rng, o: Spec): (PuzzleDef & { score: number }) | null {
  const mid = (o.band[0] + o.band[1]) / 2;
  for (let attempt = 0; attempt < 300; attempt++) {
    const board = randomBoard(rng, o.fams, o.focus, o.pairs, o.singles);
    const def: PuzzleDef = { id, moves: o.moves, hp: 1, board, solution: [], ...(o.only ? { only: o.only } : {}), ...(o.unit ? { unit: o.unit } : {}) };
    if (puzzleMoves(newPuzzle(def)).length < 3) continue; // always a real choice
    const lines = allLines(def);
    if (lines.length > MAX_LINES) continue;
    const full = lines.filter((l) => l.path.length === o.moves);
    const top = Math.max(0, ...full.map((l) => l.dmg[o.moves - 1]));
    if (top < 200) continue;
    // every round HP a full-length line can reach; keep the one whose score sits nearest the band's middle
    const hps = [...new Set(full.map((l) => Math.floor(l.dmg[o.moves - 1] / 10) * 10))].filter((h) => h >= 100);
    let pick: { hp: number; score: number } | null = null;
    for (const hp of hps) {
      const st = puzzleStats(lines, hp, o.moves);
      if (st.score < o.band[0] || st.score > o.band[1] || st.solutions < 1) continue;
      if (!pick || Math.abs(st.score - mid) < Math.abs(pick.score - mid)) pick = { hp, score: st.score };
    }
    if (!pick) continue;
    // stored solution: the winning line that hits hardest (all of its merges are needed: full length)
    const sol = full.filter((l) => l.dmg[o.moves - 1] >= pick!.hp && l.dmg.slice(0, -1).every((d) => d < pick!.hp));
    if (!sol.length) continue;
    const best = sol.reduce((a, b) => (b.dmg[o.moves - 1] > a.dmg[o.moves - 1] ? b : a));
    return { ...def, hp: pick.hp, solution: best.path, score: pick.score };
  }
  return null;
}

/** Daily day d (0-based): a gentle climb for 24 days, then a hard-but-fair plateau. */
export function dailyBand(d: number): [number, number] {
  const c = d < 24 ? 10 + (58 * d) / 23 : 64 + 4 * Math.cos(0.7 * (d - 23));
  return [Math.round(c - 3), Math.round(c + 3)];
}

const rng = new Rng(20261008);
const pickN = <T,>(a: T[], n: number) => rng.shuffle([...a]).slice(0, n);
const daily: (PuzzleDef & { score: number })[] = [];
for (let k = 0; daily.length < 40 && k < 2000; k++) {
  const d = daily.length;
  const band = dailyBand(d);
  // depth follows the band: 1 merge for warm-ups, 2 in the climb, 3 once it gets hard
  const moves = band[1] <= 22 ? 1 : band[1] <= 48 ? 2 : 3;
  const fams = [...pickN(SHOOTERS, 1 + rng.int(2)), ...pickN(RELAYS, 2), ...(moves > 1 && rng.next() < 0.5 ? pickN(HELPERS, 1) : [])];
  const only = moves > 1 && rng.next() < 0.3 ? pickN(fams, 2) : undefined;
  const size = moves === 1 ? { pairs: 4, singles: 3 } : moves === 2 ? { pairs: 4, singles: 4 } : { pairs: 5, singles: 4 };
  const p = makePuzzle(`d${d + 1}`, rng, { fams, focus: [], moves, only, band, ...size });
  if (p) daily.push(p);
}
// unit drills: 3 per unit, built around it: warm-up (1 merge, many ways) -> "only this unit" (2) -> full (3)
const drills: Record<string, PuzzleDef[]> = {};
for (const u of [...SHOOTERS, ...RELAYS, ...HELPERS]) {
  const role = SHOOTERS.includes(u) ? 'shooter' : RELAYS.includes(u) ? 'relay' : 'helper';
  const mates: Family[] = role === 'shooter' ? pickN(RELAYS, 2) : role === 'relay' ? [...pickN(SHOOTERS, 1), ...pickN(RELAYS.filter((r) => r !== u), 1)] : [...pickN(SHOOTERS, 1), ...pickN(RELAYS, 1)];
  const fams = [u, ...mates];
  const specs: Omit<Spec, 'fams' | 'focus' | 'unit'>[] = [
    { moves: 1, pairs: 4, singles: 3, band: [6, 16] },
    { moves: 2, only: role === 'helper' ? [u, mates[1]] : [u], pairs: 4, singles: 4, band: [24, 36] },
    { moves: 3, pairs: 5, singles: 4, band: [44, 56] },
  ];
  drills[u] = [];
  specs.forEach((sp, i) => {
    const p = makePuzzle(`${u}_${i + 1}`, rng, { fams, focus: [u], unit: u, ...sp });
    if (p) drills[u].push(p);
  });
  console.log(u, drills[u].length, drills[u].map((p) => `${p.moves}m hp${p.hp} s${(p as { score?: number }).score}${p.only ? ' only ' + p.only.join('+') : ''}`).join(' | '));
}
console.log('daily', daily.length, daily.map((p) => p.score).join(' '));
writeFileSync('src/content/puzzles.json', JSON.stringify({ daily, drills }, null, 1) + '\n');
