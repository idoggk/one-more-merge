// r42 WORKSHOP PUZZLES generator (Ido: "like a chess puzzle - win in X moves; hard; practice using units correctly";
// "practices like win moving only the blue units; challenges tied to a unit when you unlock it").
// r44 RAMP (owner stuck on the first puzzle): every puzzle gets a solver difficulty score (src/core/puzzle.ts: depth,
// rarity of a win, dead openers, tempting traps, greedy fails, order matters). For a random board, search every
// sequence of `moves` merges with the real engine, then pick the machine HP that lands the score inside the slot's band.
// Drill 1 of every unit and the first daily puzzles are 1-merge "many ways win" warm-ups; drills climb 1 -> 2 -> 3
// merges; the daily list climbs gently for ~24 days, then stays in a hard-but-fair band. Writes src/content/puzzles.json
// with each puzzle's `score`. Usage: npx vite-node tools/gen-puzzles.ts   (curve: npx vite-node tools/puzzle-curve.ts)
// r45 EASY START (owner stuck on puzzle 1 again: six tempting Bell pairs, the only win a Mortar he had never seen):
// the first EARLY_DAYS dailies use only the starter units (met in levels 1-3, before the daily opens), and the first
// EASY_DAYS are "obvious": the highest-rank pair on the board is the hardest hit and it wins, no wrong pair looks as
// strong (same rank or harder hit), and there are only a few wrong pairs.
import { writeFileSync } from 'node:fs';
import { newPuzzle, type PuzzleDef } from '../src/core/game';
import { allLines, puzzleMoves, puzzleStats } from '../src/core/puzzle';
import { Rng } from '../src/core/rng';
import type { Family } from '../src/core/types';
import { STARTER_UNITS } from '../src/content/units';

const SHOOTERS: Family[] = ['cannon', 'rocket', 'mortar', 'arc_welder'];
const RELAYS: Family[] = ['coil', 'bell', 'horn', 'fuse_box'];
const HELPERS: Family[] = ['magnet', 'fan', 'battery', 'amplifier', 'signal_beacon'];
/** Big boards make 80k-line searches (slow to build, slow to hint on a phone) without making better puzzles. */
const MAX_LINES = 12000;
/** Dailies (from day 1) built only from starter units, and the ones that must be obvious (see the header). */
const EARLY_DAYS = 8;
const EASY_DAYS = 3;
/** Easy puzzles: at most this many wrong first merges (each direction of a pair counts). */
const EASY_MAX_WRONG = 4;

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
  /** r45: the obvious-start rules (1-merge dailies at the head of the ramp). */
  easy?: boolean;
}

/** r45: the winning pair is the obvious one: top rank on the board, hardest hit, and no wrong pair is a close look-alike. */
function obvious(def: PuzzleDef, lines: ReturnType<typeof allLines>, hp: number): boolean {
  const rankAt = (cell: number) => def.board.find((b) => b[2] * 5 + b[3] === cell)![1];
  const firsts = new Map<string, { rank: number; hit: number; win: boolean }>();
  for (const l of lines) {
    const m = l.path[0];
    const k = m.join('>');
    const f = firsts.get(k) ?? { rank: rankAt(m[0]), hit: l.dmg[0], win: false };
    f.win ||= l.dmg[l.dmg.length - 1] >= hp;
    firsts.set(k, f);
  }
  const fs = [...firsts.values()];
  const wrong = fs.filter((f) => !f.win);
  const topRank = Math.max(...fs.map((f) => f.rank));
  const topHit = Math.max(...fs.map((f) => f.hit));
  const minWinRank = Math.min(...fs.filter((f) => f.win).map((f) => f.rank));
  const minWinHit = Math.min(...fs.filter((f) => f.win).map((f) => f.hit));
  return (
    wrong.length <= EASY_MAX_WRONG &&
    fs.filter((f) => f.rank === topRank).every((f) => f.win) &&
    fs.filter((f) => f.hit === topHit).every((f) => f.win) &&
    wrong.every((f) => f.rank < minWinRank && f.hit < minWinHit)
  );
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
      if (o.easy && (st.tempting > 0 || st.greedyFails || !obvious(def, lines, hp))) continue;
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
  // r45: the head of the ramp only uses the starter units (and the obvious-start rules on its first days)
  const early = d < EARLY_DAYS;
  const easy = d < EASY_DAYS;
  const pool = (a: Family[]) => (early ? a.filter((f) => STARTER_UNITS.includes(f)) : a);
  const shooters = pool(SHOOTERS), relays = pool(RELAYS), helpers = pool(HELPERS);
  const fams = [...pickN(shooters, 1 + rng.int(2)), ...pickN(relays, 2), ...(moves > 1 && rng.next() < 0.5 ? pickN(helpers, 1) : [])];
  const only = moves > 1 && !early && rng.next() < 0.3 ? pickN(fams, 2) : undefined;
  const size = easy ? { pairs: 3, singles: 4 } : moves === 1 ? { pairs: 4, singles: 3 } : moves === 2 ? { pairs: 4, singles: 4 } : { pairs: 5, singles: 4 };
  const p = makePuzzle(`d${d + 1}`, rng, { fams, focus: [], moves, only, band, easy, ...size });
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
