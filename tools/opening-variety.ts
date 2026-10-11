// OPENING VARIETY (read-only measurement, t-648f6af9): "each stage starts in the same way" (owner, 2026-10-11).
// Builds every level's real start board with newLevel(def) (default loadout: no extra toys, flags at TUNING defaults) and reports
//   1. distinct start boards / groups of levels that share an identical board
//   2. per level: merge options at move 1, best first cascade, rank mass
//   3. per chapter (10 levels): distinct openings + ASCII of the 4 most common
//   4. how the first 3 moves of a good (greedy) player differ between levels
//   5. a PROPOSED seeded layout overlay, evaluated here only (nothing in src/ is changed)
// Deterministic: no clock, no Math.random; the greedy players use fixed tie-breaks. Output goes to stdout as markdown.
// Usage: npx vite-node tools/opening-variety.ts
import { LEVELS, STARTING_CELLS, type LevelDef } from '../src/content/levels';
import { choosePerk, drop, idxOf, legalPairs, makeGadget, newLevel, previewMerge, type GameState } from '../src/core/game';
import { COLS, ROWS } from '../src/content/tuning';
import type { Gadget } from '../src/core/types';
import { Rng } from '../src/core/rng';

const out: string[] = [];
const P = (s = '') => out.push(s);
const chapterOf = (l: number) => Math.ceil(l / 10);
const rc = (i: number) => `(${Math.floor(i / COLS)},${i % COLS})`;
const LETTER: Record<string, string> = { cannon: 'C', rocket: 'R', coil: 'O', bell: 'B', magnet: 'M', battery: 'T', fan: 'F' };
const letter = (f: string) => LETTER[f] ?? f[0].toUpperCase();

// ---- board signatures -------------------------------------------------------------------------------------------------
const cells = (s: GameState) => {
  const o: { i: number; f: string; r: number }[] = [];
  s.grid.forEach((g, i) => {
    if (g) o.push({ i, f: g.family, r: g.rank });
  });
  return o;
};
const sigFull = (s: GameState) => cells(s).map((c) => `${c.i}:${c.f}${c.r}`).join(' ') + (s.masked?.length ? ` #${[...s.masked].sort((a, b) => a - b).join(',')}` : '');
/** shape = positions + families only (ranks ignored): "does the board LOOK the same". */
const sigShape = (s: GameState) => cells(s).map((c) => `${c.i}:${c.f}`).join(' ') + (s.masked?.length ? ` #${[...s.masked].sort((a, b) => a - b).join(',')}` : '');
const startCells = new Set<number>(Object.values(STARTING_CELLS).flat().map(([r, c]) => idxOf(r, c)));
/** core = only the 8 chapter-starter cells (families + ranks): what every ordinary level shares. */
const sigCore = (s: GameState) => cells(s).filter((c) => startCells.has(c.i)).map((c) => `${c.i}:${c.f}${c.r}`).join(' ');
const mass = (s: GameState) => s.grid.reduce((m, g) => m + (g ? 2 ** (g.rank - 1) : 0), 0);

function ascii(s: GameState): string[] {
  const rows: string[] = [];
  for (let r = 0; r < ROWS; r++) {
    let line = '';
    for (let c = 0; c < COLS; c++) {
      const i = idxOf(r, c);
      const g = s.grid[i];
      line += g ? `${letter(g.family)}${g.rank} ` : s.masked?.includes(i) ? '## ' : '.. ';
    }
    rows.push(line.trimEnd());
  }
  return rows;
}

// ---- move options -----------------------------------------------------------------------------------------------------
type Opt = { f: number; t: number; count: number; total: number; fam: string };
function options(s: GameState): Opt[] {
  const o: Opt[] = [];
  for (const [a, b] of legalPairs(s))
    for (const [f, t] of [[a, b], [b, a]] as [number, number][]) {
      const r = previewMerge(s, f, t);
      if (r) o.push({ f, t, count: r.count, total: r.total, fam: s.grid[f]!.family });
    }
  return o;
}
const byChain = (a: Opt, b: Opt) => b.count - a.count || b.total - a.total || a.f - b.f || a.t - b.t;
const byDmg = (a: Opt, b: Opt) => b.total - a.total || b.count - a.count || a.f - b.f || a.t - b.t;
type Policy = 'chain' | 'dmg';
const CMP = { chain: byChain, dmg: byDmg };

/** the greedy player's first n moves, played on a frozen board (no supply, no clock: fully deterministic) */
function firstMoves(def: LevelDef, policy: Policy, n = 3): string[] {
  const s = newLevel(def);
  const seq: string[] = [];
  for (let k = 0; k < n; k++) {
    if (s.phase === 'choice') choosePerk(s, s.offer[0]);
    const best = options(s).sort(CMP[policy])[0];
    if (!best) break;
    seq.push(`${letter(best.fam)}${s.grid[best.f]!.rank}${rc(best.f)}>${rc(best.t)}`);
    drop(s, best.f, best.t, s.grid[best.f]!.id);
  }
  return seq;
}
/** same move with the position stripped: "merged two C1" */
const strip = (m: string) => m.replace(/\(\d+,\d+\)>\(\d+,\d+\)/, '');

const groupBy = <T,>(xs: T[], key: (x: T) => string) => {
  const m = new Map<string, T[]>();
  for (const x of xs) m.set(key(x), [...(m.get(key(x)) ?? []), x]);
  return [...m.entries()].sort((a, b) => b[1].length - a[1].length || (a[0] < b[0] ? -1 : 1));
};
const range = (ls: number[]) => {
  const o: string[] = [];
  for (let i = 0; i < ls.length; ) {
    let j = i;
    while (j + 1 < ls.length && ls[j + 1] === ls[j] + 1) j++;
    o.push(j > i ? `${ls[i]}-${ls[j]}` : `${ls[i]}`);
    i = j + 1;
  }
  return o.join(' ');
};

// ---- measure every level ----------------------------------------------------------------------------------------------
const info = LEVELS.map((def) => {
  const s = newLevel(def);
  const opts = options(s);
  const bestChain = [...opts].sort(byChain)[0];
  const bestDmg = [...opts].sort(byDmg)[0];
  const pairs = legalPairs(s).length;
  return {
    def,
    s,
    full: sigFull(s),
    shape: sigShape(s),
    core: sigCore(s),
    pairs,
    live: new Set(opts.filter((o) => o.count >= 2).map((o) => [o.f, o.t].sort((a, b) => a - b).join('-'))).size,
    bestChain,
    bestDmg,
    mass: mass(s),
    n: cells(s).length,
  };
});
const ordinary = info.filter((x) => !x.def.teach);
const special = (d: LevelDef) => [d.teach ? 'teach' : '', d.level % 10 === 0 ? 'boss' : '', d.mini_boss ? 'mini' : '', d.modifier !== 'NONE' ? d.modifier : '', d.start_extra ? 'extra' : ''].filter(Boolean).join(' ');

P('# Opening variety measurement');
P();
P(`Generated by \`npx vite-node tools/opening-variety.ts\`. ${LEVELS.length} levels (${LEVELS.filter((d) => d.teach).length} teach: L${LEVELS.filter((d) => d.teach).map((d) => d.level).join(', L')}), board ${ROWS} rows x ${COLS} cols, default loadout (no extra toys), tuning flags at their defaults.`);
P('Legend: C cannon, R rocket, O coil, B bell, M magnet, T battery, F fan, digit = rank, `##` = blocked cell.');
P();

// ---- 1 ----------------------------------------------------------------------------------------------------------------
P('## 1. Distinct start boards');
P();
const fullG = groupBy(info, (x) => x.full);
const shapeG = groupBy(info, (x) => x.shape);
const coreG = groupBy(ordinary, (x) => x.core);
const ordFull = groupBy(ordinary, (x) => x.full);
P('| measure | all 80 | 77 non-teach |');
P('|---|---|---|');
P(`| distinct full boards (family+rank+cell, extras, blocked cells, boss second set) | ${fullG.length} | ${ordFull.length} |`);
P(`| distinct SHAPES (same but ranks ignored) | ${shapeG.length} | ${groupBy(ordinary, (x) => x.shape).length} |`);
P(`| distinct 8-cell cores (the shared chapter starter, ranks included) | ${groupBy(info, (x) => x.core).length} | ${coreG.length} |`);
P();
P('The shared core: ' + Object.entries(STARTING_CELLS).map(([k, v]) => `${k} at ${v.map(([r, c]) => `(${r},${c})`).join(' ')}`).join('; ') + '.');
P();
P('Group sizes of identical **full** boards (non-teach levels), biggest first:');
P();
P('| group | levels sharing the identical board | count | what differs from the plain board |');
P('|---|---|---|---|');
ordFull.forEach(([, xs], gi) => {
  const d = xs[0].def;
  P(`| G${gi + 1} | ${range(xs.map((x) => x.def.level))} | ${xs.length} | rank ${d.starting_rank}${d.start_extra ? `, +${d.start_extra.map((e) => `${e[0]}${e[1]}@(${e[2]},${e[3]})`).join(' ')}` : ''}${d.modifier !== 'NONE' ? `, ${d.modifier}` : ''}${d.level % 10 === 0 || d.mini_boss ? ', boss 2nd set' : ''} |`);
});
P();
const sizeHist = new Map<number, number>();
for (const [, xs] of ordFull) sizeHist.set(xs.length, (sizeHist.get(xs.length) ?? 0) + 1);
P('Histogram (group size -> number of groups): ' + [...sizeHist.entries()].sort((a, b) => b[0] - a[0]).map(([k, v]) => `${k} levels x ${v}`).join(', ') + '.');
const biggest = ordFull[0][1].length;
const singles = ordFull.filter(([, xs]) => xs.length === 1).length;
P(`Largest group: ${biggest} of ${ordinary.length} non-teach levels (${Math.round((100 * biggest) / ordinary.length)}%) start on exactly the same board; ${singles} levels have a board nobody else has.`);
P();

// ---- 2 ----------------------------------------------------------------------------------------------------------------
P('## 2. Per level: move-1 options, best first cascade, rank mass');
P();
P('`pairs` = unordered same-family same-rank pairs that can merge (position does not matter: any part can be dragged onto its twin). `live` = distinct pairs whose merge wakes at least one more machine (cascade count >= 2). `best chain` = largest first cascade (activations; ties by damage) with its from>to cells, `dmg` = that cascade\'s damage. `mass` = sum of 2^(rank-1) over all parts, `parts` = part count.');
P();
P('| L | ch | pairs | live | best chain (count, damage) | best move | best-damage move | mass | parts | board id | note |');
P('|---|---|---|---|---|---|---|---|---|---|---|');
const gid = new Map(ordFull.map(([k], i) => [k, `G${i + 1}`]));
for (const x of info) {
  const bc = x.bestChain;
  const bd = x.bestDmg;
  P(`| ${x.def.level} | ${chapterOf(x.def.level)} | ${x.pairs} | ${x.live} | ${bc ? `${bc.count}, ${Math.round(bc.total)}` : '-'} | ${bc ? `${letter(bc.fam)}${rc(bc.f)}>${rc(bc.t)}` : '-'} | ${bd ? `${letter(bd.fam)}${rc(bd.f)}>${rc(bd.t)} (${Math.round(bd.total)})` : '-'} | ${x.mass} | ${x.n} | ${x.def.teach ? 'teach' : gid.get(x.full)} | ${special(x.def)} |`);
}
P();
const stat = (xs: number[]) => `min ${Math.min(...xs)}, median ${xs.slice().sort((a, b) => a - b)[Math.floor(xs.length / 2)]}, max ${Math.max(...xs)}`;
P(`Non-teach summary: pairs ${stat(ordinary.map((x) => x.pairs))}; live pairs ${stat(ordinary.map((x) => x.live))}; best first chain ${stat(ordinary.map((x) => x.bestChain?.count ?? 0))}; mass ${stat(ordinary.map((x) => x.mass))}.`);
const bcDist = groupBy(ordinary, (x) => `${x.bestChain?.count ?? 0}`);
P(`Best-first-chain size distribution (count: levels): ${bcDist.map(([k, v]) => `${k}: ${v.length}`).join(', ')}.`);
P();

// ---- 3 ----------------------------------------------------------------------------------------------------------------
P('## 3. Per chapter: distinct openings');
P();
const chapters = [...new Set(LEVELS.map((d) => chapterOf(d.level)))];
P('| chapter | levels | non-teach | distinct full boards | distinct shapes | distinct cores | plain-board share |');
P('|---|---|---|---|---|---|---|');
for (const ch of chapters) {
  const xs = info.filter((x) => chapterOf(x.def.level) === ch);
  const nt = xs.filter((x) => !x.def.teach);
  const g = groupBy(nt, (x) => x.full);
  P(`| ${ch} | ${xs[0].def.level}-${xs[xs.length - 1].def.level} | ${nt.length} | ${g.length} | ${groupBy(nt, (x) => x.shape).length} | ${groupBy(nt, (x) => x.core).length} | ${g[0][1].length}/${nt.length} |`);
}
P();
for (const ch of chapters) {
  const nt = info.filter((x) => chapterOf(x.def.level) === ch && !x.def.teach);
  const g = groupBy(nt, (x) => x.full).slice(0, 4);
  P(`### Chapter ${ch}: ${groupBy(nt, (x) => x.full).length} distinct openings in ${nt.length} levels`);
  P();
  g.forEach(([, xs], i) => {
    P(`Opening ${i + 1}: ${xs.length} level(s) (${range(xs.map((x) => x.def.level))})`);
    P();
    P('```');
    out.push(...ascii(xs[0].s));
    P('```');
    P();
  });
}

// ---- 4 ----------------------------------------------------------------------------------------------------------------
P('## 4. First 3 moves of a good player');
P();
P('"Good player" = greedy on the real preview, frozen board (no supply or clock), fixed tie-break (lowest from, then to). Policy **chain** = most machines woken, then damage (the chain-seeker); policy **dmg** = most damage, then chain. A move is written `<family><rank>(from)>(to)`. Non-teach levels only.');
P();
const plays = ordinary.map((x) => ({ x, chain: firstMoves(x.def, 'chain'), dmg: firstMoves(x.def, 'dmg') }));
for (const pol of ['chain', 'dmg'] as Policy[]) {
  const seqs = plays.map((p) => ({ x: p.x, seq: p[pol] }));
  P(`### Policy ${pol}`);
  P();
  const n = seqs.length;
  const m1 = groupBy(seqs, (p) => p.seq[0] ?? '-');
  const m3 = groupBy(seqs, (p) => p.seq.join(' ; '));
  const m3s = groupBy(seqs, (p) => p.seq.map(strip).join(' ; '));
  P(`- distinct first moves (with cells): ${m1.length} of ${n} levels; most common "${m1[0][0]}" in ${m1[0][1].length} levels (${Math.round((100 * m1[0][1].length) / n)}%).`);
  P(`- distinct 3-move openings (with cells): **${m3.length}**; most common used by ${m3[0][1].length} levels (${Math.round((100 * m3[0][1].length) / n)}%).`);
  P(`- distinct 3-move openings by part type only (family+rank, cells ignored): ${m3s.length}.`);
  const first3 = seqs.map((p) => p.seq.join(' ; '));
  P(`- distinct 3-move openings ignoring rank (family + cells only): ${groupBy(seqs, (p) => p.seq.map((m) => m.replace(/^([A-Z])\d+/, '$1')).join(' ; ')).length}.`);
  P(`- levels whose first 3 moves equal the modal opening: ${first3.filter((q) => q === m3[0][0]).length}/${n}.`);
  P();
  P('| 3-move opening | levels | count |');
  P('|---|---|---|');
  for (const [k, xs] of m3.slice(0, 8)) P(`| ${k} | ${range(xs.map((x) => x.x.def.level))} | ${xs.length} |`);
  P();
  P('Per chapter: distinct 3-move openings / levels, and share using the chapter\'s most common one:');
  P();
  P('| chapter | distinct | levels | top opening share |');
  P('|---|---|---|---|');
  for (const ch of chapters) {
    const q = seqs.filter((p) => chapterOf(p.x.def.level) === ch);
    if (!q.length) continue;
    const g = groupBy(q, (p) => p.seq.join(' ; '));
    P(`| ${ch} | ${g.length} | ${q.length} | ${g[0][1].length}/${q.length} |`);
  }
  P();
}

// ---- 5 ----------------------------------------------------------------------------------------------------------------
// PROPOSAL (not implemented): the 8 chapter-starter parts keep their families and rank, only their CELLS change. Four hand-authored layouts
// (index 0 = today's board). All layouts avoid cells that other rules own: the four corners (CORNERS_2/4), (2,1)/(2,3) (GAPS) and the
// start_extra cells (2,2) magnet, (2,1) fan, (4,3) battery. So the overlay never collides with a modifier or an extra, and rank mass,
// part count and families are identical to the plain board by construction.
type Layout = Record<'shooter' | 'coil' | 'bell', [number, number][]>;
const LAYOUTS: { name: string; cells: Layout }[] = [
  { name: 'A "today"', cells: STARTING_CELLS },
  { name: 'B "top-left stack"', cells: { shooter: [[0, 1], [0, 2], [2, 0], [4, 4]], coil: [[1, 2], [3, 0]], bell: [[1, 1], [4, 2]] } },
  { name: 'C "split halves"', cells: { shooter: [[1, 3], [1, 4], [4, 0], [4, 1]], coil: [[2, 4], [5, 1]], bell: [[3, 4], [5, 2]] } },
  { name: 'D "scattered ring"', cells: { shooter: [[0, 3], [2, 0], [3, 3], [5, 2]], coil: [[1, 1], [4, 4]], bell: [[0, 2], [3, 1]] } },
];
const FORBID = new Set([idxOf(0, 0), idxOf(0, 4), idxOf(5, 0), idxOf(5, 4), idxOf(2, 1), idxOf(2, 2), idxOf(2, 3), idxOf(4, 3)]);

/** Build the PROPOSED start state for a level on layout k (evaluation only; mirrors where the overlay would sit inside newLevel). */
function withLayout(def: LevelDef, k: number): GameState {
  const s = newLevel(def);
  const orig = new Map<string, Gadget[]>();
  // collect the starter parts by their ORIGINAL cells (order = STARTING_CELLS order), then clear them
  for (const [fam, cs] of Object.entries(STARTING_CELLS)) {
    const gs: Gadget[] = [];
    for (const [r, c] of cs) {
      const g = s.grid[idxOf(r, c)];
      if (g) gs.push(g);
      s.grid[idxOf(r, c)] = null;
    }
    orig.set(fam, gs);
  }
  if (def.level % 10 === 0 || def.mini_boss) {
    // boss levels: the second PAIR8 set was placed on seeded empties of the plain board; redo it on the overlaid board
    const starterIds = new Set([...orig.values()].flat().map((g) => g.id));
    const extrasXtra = new Set((def.start_extra ?? []).map(([, , r, c]) => idxOf(r, c)));
    s.grid.forEach((g, i) => {
      if (g && !starterIds.has(g.id) && !extrasXtra.has(i)) s.grid[i] = null; // the plain-board 2nd set
    });
  }
  for (const [fam, cs] of Object.entries(LAYOUTS[k].cells)) {
    const gs = orig.get(fam)!;
    cs.forEach(([r, c], j) => {
      if (gs[j]) s.grid[idxOf(r, c)] = gs[j];
    });
  }
  if (def.level % 10 === 0 || def.mini_boss) {
    const rng = new Rng(def.seed ^ 0xb055);
    const empties = s.grid.map((g, i) => (g ? -1 : i)).filter((i) => i >= 0 && !s.masked?.includes(i));
    rng.shuffle(empties);
    const fams = [...orig.entries()].flatMap(([, gs]) => gs.map((g) => g.family));
    fams.forEach((f, j) => {
      if (j < empties.length) s.grid[empties[j]] = makeGadget(s, f, def.starting_rank);
    });
  }
  return s;
}

P('## 5. Proposal: seeded layout overlay (NOT implemented)');
P();
P('### 5a. The idea');
P();
P('Keep everything about the start (8 starter parts, their families, their rank, `start_extra`, modifiers, boss second set). Only change WHERE the 8 starter parts sit: pick one of 4 hand-authored layouts per level from a seeded deal. Rank mass and part count stay equal by construction (the overlay moves parts, it never adds, removes or re-ranks them). Layout A is today\'s board, so nothing existing is lost.');
P();
P('Candidate layouts (all avoid the corners, (2,1), (2,2), (2,3) and (4,3), so no modifier or `start_extra` ever collides):');
P();
for (const [k, L] of LAYOUTS.entries()) {
  const used = Object.values(L.cells).flat();
  const bad = used.filter(([r, c]) => k > 0 && FORBID.has(idxOf(r, c)));
  P(`**${L.name}**${bad.length ? ' !! uses forbidden cells ' + bad.map(([r, c]) => `(${r},${c})`).join(' ') : ''}`);
  P();
  P('```');
  for (let r = 0; r < ROWS; r++) {
    let line = '';
    for (let c = 0; c < COLS; c++) {
      const fam = (Object.entries(L.cells).find(([, cs]) => cs.some(([rr, cc]) => rr === r && cc === c)) ?? ['.'])[0];
      line += (fam === 'shooter' ? 'C' : fam === 'coil' ? 'O' : fam === 'bell' ? 'B' : FORBID.has(idxOf(r, c)) && k > 0 ? 'x' : '.') + '  ';
    }
    P(line.trimEnd());
  }
  P('```');
  P();
}
P('(`x` = a cell that other rules own; no layout may use it.)');
P();

P('### 5b. Move-1 quality of each layout (rank 1-3, cannon and rocket shooter)');
P();
P('Evaluated on L11 (plain NORMAL level: no extra, no modifier, no boss) with its starting rank overridden and re-laid out with `withLayout`. `pairs` = mergeable pairs, `live` = pairs whose merge wakes a second machine, `best` = largest first cascade.');
P();
P('| layout | shooter | rank | pairs | live pairs | best chain | best dmg |');
P('|---|---|---|---|---|---|---|');
const probe = LEVELS.find((d) => d.level === 11)!; // plain NORMAL level, rank 1, no extras, no modifier
const probes: LevelDef[] = [1, 2, 3].map((r) => ({ ...probe, starting_rank: r }));
const probeR: LevelDef[] = probes.map((d) => ({ ...d, shooter: 'rocket' }));
const qual: { k: number; ok: boolean }[] = LAYOUTS.map((_, k) => ({ k, ok: true }));
for (const [k, L] of LAYOUTS.entries())
  for (const [defs, sh] of [[probes, 'cannon'], [probeR, 'rocket']] as [LevelDef[], string][])
    for (const d of defs) {
      const s = withLayout(d, k);
      const o = options(s);
      const live = new Set(o.filter((q) => q.count >= 2).map((q) => [q.f, q.t].sort((a, b) => a - b).join('-'))).size;
      const bc = [...o].sort(byChain)[0];
      const bd = [...o].sort(byDmg)[0];
      if (live < 2) qual[k].ok = false;
      P(`| ${L.name} | ${sh} | ${d.starting_rank} | ${legalPairs(s).length} | ${live} | ${bc?.count ?? 0} | ${bd ? Math.round(bd.total) : 0} |`);
    }
P();
P(`Acceptance rule: >= 2 live pairs (a merge that wakes at least one more machine) at move 1 on every rank and shooter. ${qual.map((q) => `${LAYOUTS[q.k].name}: ${q.ok ? 'pass' : 'FAIL'}`).join('; ')}.`);
P();

P('### 5c. The deal (which level gets which layout)');
P();
P('Rule: per chapter, walk the levels in order with a deck `shuffle([0,1,2,3,0,1,2,3])` drawn from `new Rng(SALT ^ chapter)` (refilled when empty). Each ordinary level takes the first card in the deck that differs from the previous level\'s layout, so every layout is used 2-3 times per chapter and two neighbouring levels never share one. Boss levels, mini-bosses and the scripted teach levels L1-L3 keep layout A (the boss second PAIR8 set already makes them unique); they count as "previous = A" for the next level. In the real build the deal would be `layoutFor(def)` = a pure function of `def.level` (not of `def.seed`, so it can be hand-checked), applied inside newLevel just before `start_extra`.');
P();
function deal(): Map<number, number> {
  const m = new Map<number, number>();
  for (const ch of chapters) {
    const rng = new Rng((0x0b3a7c1 ^ (ch * 2654435761)) >>> 0);
    let deck: number[] = [];
    let prev = -1;
    for (const d of LEVELS.filter((x) => chapterOf(x.level) === ch)) {
      if (d.teach || d.level % 10 === 0 || d.mini_boss) {
        prev = 0; // teach / boss / mini-boss keep layout A
        continue;
      }
      if (!deck.length) deck = rng.shuffle(Array.from({ length: 8 }, (_, i) => i % LAYOUTS.length));
      let j = deck.findIndex((k) => k !== prev);
      if (j < 0) {
        deck = deck.concat(rng.shuffle(Array.from({ length: 8 }, (_, i) => i % LAYOUTS.length)));
        j = deck.findIndex((k) => k !== prev);
      }
      const k = deck.splice(j, 1)[0];
      m.set(d.level, k);
      prev = k;
    }
  }
  return m;
}
const dealt = deal();
const layoutOf = (d: LevelDef) => dealt.get(d.level) ?? 0;
P('| ch | ' + ['A', 'B', 'C', 'D'].map((l) => `layout ${l}`).join(' | ') + ' | adjacent repeats |');
P('|---|---|---|---|---|---|');
for (const ch of chapters) {
  const ds = LEVELS.filter((d) => chapterOf(d.level) === ch && !d.teach);
  const cnt = [0, 1, 2, 3].map((k) => ds.filter((d) => layoutOf(d) === k).map((d) => d.level));
  const rep = ds.filter((d, i) => i > 0 && !d.mini_boss && d.level % 10 !== 0 && layoutOf(d) === layoutOf(ds[i - 1])).length;
  P(`| ${ch} | ${cnt.map((c) => (c.length ? range(c) : '-')).join(' | ')} | ${rep} |`);
}
P();

P('### 5d. Predicted distinct openings per chapter (computed, not guessed)');
P();
P('Each non-teach level is rebuilt on its dealt layout (`withLayout`) and the full-board signature is counted again, together with the first-move checks. "now" is section 3.');
P();
P('| chapter | non-teach levels | distinct openings now | distinct openings with overlay | max levels sharing one board (now -> overlay) | min live pairs at move 1 | levels whose part count or mass changed |');
P('|---|---|---|---|---|---|---|');
let totNow = 0;
let totNew = 0;
const proposed = new Map<number, { s: GameState; full: string }>();
for (const d of LEVELS) if (!d.teach) { const s = withLayout(d, layoutOf(d)); proposed.set(d.level, { s, full: sigFull(s) }); }
const allNew = groupBy(ordinary, (x) => proposed.get(x.def.level)!.full);
for (const ch of chapters) {
  const nt = ordinary.filter((x) => chapterOf(x.def.level) === ch);
  if (!nt.length) continue;
  const now = groupBy(nt, (x) => x.full);
  const nw = groupBy(nt, (x) => proposed.get(x.def.level)!.full);
  const live = Math.min(...nt.map((x) => new Set(options(proposed.get(x.def.level)!.s).filter((o) => o.count >= 2).map((o) => [o.f, o.t].sort((a, b) => a - b).join('-'))).size));
  const changed = nt.filter((x) => proposed.get(x.def.level)!.s.grid.filter(Boolean).length !== x.n || mass(proposed.get(x.def.level)!.s) !== x.mass).length;
  totNow += now.length;
  totNew += nw.length;
  P(`| ${ch} | ${nt.length} | ${now.length} | ${nw.length} | ${now[0][1].length} -> ${nw[0][1].length} | ${live} | ${changed} |`);
}
P(`| all | ${ordinary.length} | ${totNow} per chapter (${ordFull.length} overall) | ${totNew} per chapter (${allNew.length} overall) | ${ordFull[0][1].length} -> ${allNew[0][1].length} | | |`);
P();
// first-3-move variety under the overlay (greedy chain player on the overlaid state)
function firstMovesOn(s: GameState, n = 3): string[] {
  const seq: string[] = [];
  for (let k = 0; k < n; k++) {
    if (s.phase === 'choice') choosePerk(s, s.offer[0]);
    const best = options(s).sort(byChain)[0];
    if (!best) break;
    seq.push(`${letter(best.fam)}${s.grid[best.f]!.rank}${rc(best.f)}>${rc(best.t)}`);
    drop(s, best.f, best.t, s.grid[best.f]!.id);
  }
  return seq;
}
const newSeqs = ordinary.map((x) => ({ x, seq: firstMovesOn(withLayout(x.def, layoutOf(x.def))) }));
const newG = groupBy(newSeqs, (p) => p.seq.join(' ; '));
const nowG = groupBy(plays, (p) => p.chain.join(' ; '));
P(`Greedy chain player, first 3 moves, all ${ordinary.length} non-teach levels: distinct 3-move openings **${nowG.length} now -> ${newG.length} with the overlay**; most common opening used by ${nowG[0][1].length} -> ${newG[0][1].length} levels.`);
P();
P('Per chapter distinct 3-move openings now -> overlay: ' + chapters.filter((ch) => ordinary.some((x) => chapterOf(x.def.level) === ch)).map((ch) => `ch${ch} ${groupBy(plays.filter((p) => chapterOf(p.x.def.level) === ch), (p) => p.chain.join(' ; ')).length} -> ${groupBy(newSeqs.filter((p) => chapterOf(p.x.def.level) === ch), (p) => p.seq.join(' ; ')).length}`).join(', ') + '.');
P();
console.log(out.join('\n'));
