// Step 2 of the Unity port: writes unity/parity/cases2.json (board slice: start boards, placing, plain merge, sandwich rule).
// Called from tools/export-parity-cases.ts. Reads src/ only; writes only unity/parity/cases2.json.
// Every step runs the REAL TS drop() on a real newLevel() state, so the expected hashes are the TS core's answer. The C# port only
// reproduces the board effect (no cascade, damage, supply); the exporter proves the two agree by making the machine unkillable and
// by throwing if the TS board changes in any way the board slice does not model (see check() below).
import { mkdirSync, writeFileSync } from 'node:fs';
import { LEVELS } from '../src/content/levels';
import { UNITS } from '../src/content/units';
import { COLS, MAX_RANK, ROWS, TUNING } from '../src/content/tuning';
import { canMerge, capOf, drop, idxOf, makeGadget, newLevel, sandwichFor, type GameState } from '../src/core/game';
import { Rng } from '../src/core/rng';
import { FAMILIES, isRelay, isShooter, type Family } from '../src/core/types';

const RULES = ['today', 'sandwich2', 'sandwichBonus'] as const;
type Rule = (typeof RULES)[number];
const STEPS = 60;

/** Same FNV-1a text hash as export-parity-cases.ts (hex8:length). */
const hashText = (text: string): string => {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return `${h.toString(16).padStart(8, '0')}:${text.length}`;
};

const stateText = (s: GameState): string =>
  `L${s.level};next=${s.nextId};masked=${(s.masked ?? []).join('|')};grid=${s.grid.map((g) => (g ? `${g.family}:${g.rank}#${g.id}` : '-')).join(',')}`;

interface Setup {
  name: string;
  level: number;
  rule: Rule;
  jumpstart?: boolean;
  /** [cell, family, rank] list that replaces the whole grid (ids 1.. in order); omitted = the level's own start board. */
  override?: [number, string, number][];
  masked?: number[];
}

const makeState = (u: Setup): GameState => {
  const def = LEVELS.find((d) => d.level === u.level)!;
  const s = newLevel(def, u.jumpstart ? { jumpstart: true } : {});
  if (u.override) {
    s.grid.fill(null);
    s.nextId = 1;
    for (const [i, f, r] of u.override) s.grid[i] = makeGadget(s, f as Family, r);
    if (u.masked) s.masked = [...u.masked];
  }
  s.hp = s.maxHp = 1e12; // cascade damage is not ported: the machine must never die (no phase change)
  if (s.stage) s.stage.hps = s.stage.hps.map(() => 1e12);
  return s;
};

const neighbours = (i: number): number[] => {
  const r = Math.floor(i / COLS), c = i % COLS;
  return [[-1, 0], [0, 1], [1, 0], [0, -1]].flatMap(([dr, dc]) => (r + dr >= 0 && r + dr < ROWS && c + dc >= 0 && c + dc < COLS ? [(r + dr) * COLS + c + dc] : []));
};

/** Scripted but seeded action policy. Mix of: sandwich-preferring merge, any merge, gather move (bring a same part next to an anchor), random move/swap, illegal drops. */
function pickAction(s: GameState, rng: Rng): { from: number; to: number; id: number } {
  const lk = new Set(s.masked ?? []);
  const occ = s.grid.map((g, i) => (g ? i : -1)).filter((i) => i >= 0 && !lk.has(i));
  const pairs: [number, number][] = [];
  for (const a of occ) for (const b of occ) if (a !== b && canMerge(s.grid[a]!, s.grid[b]!, s)) pairs.push([a, b]);
  const roll = rng.next();
  if (pairs.length && roll < 0.55) {
    const sand = pairs.filter(([f, t]) => sandwichFor(s, f, t));
    const pool = sand.length && rng.next() < 0.8 ? sand : pairs;
    const [f, t] = pool[rng.int(pool.length)];
    return { from: f, to: t, id: s.grid[f]!.id };
  }
  if (roll < 0.8) {
    // gather: find 3+ equal parts, move one next to the anchor (an empty neighbour of it)
    const groups = new Map<string, number[]>();
    for (const i of occ) {
      const g = s.grid[i]!;
      const k = `${g.family}:${g.rank}`;
      groups.set(k, [...(groups.get(k) ?? []), i]);
    }
    const big = [...groups.values()].filter((v) => v.length >= 3);
    if (big.length) {
      const grp = big[rng.int(big.length)];
      const anchor = grp[0];
      const empty = neighbours(anchor).filter((n) => !s.grid[n] && !lk.has(n));
      const movers = grp.slice(1).filter((m) => !neighbours(anchor).includes(m));
      if (empty.length && movers.length) {
        const m = movers[rng.int(movers.length)];
        return { from: m, to: empty[rng.int(empty.length)], id: s.grid[m]!.id };
      }
    }
  }
  if (roll < 0.95 && occ.length) {
    const f = occ[rng.int(occ.length)];
    return { from: f, to: rng.int(ROWS * COLS), id: s.grid[f]!.id }; // move, swap, merge, or a masked / same-cell refusal
  }
  const f = rng.int(ROWS * COLS); // illegal: maybe an empty cell, maybe a wrong id
  return { from: f, to: rng.int(ROWS * COLS), id: s.grid[f] ? s.grid[f]!.id + 1 : 1 };
}

/** Fails loudly if the real TS drop changed the board in a way the board slice does not model. */
function check(cond: boolean, msg: string): void {
  if (!cond) throw new Error(`export-parity-board: ${msg}`);
}

function runSetup(u: Setup, seed: number, scripted?: { from: number; to: number }[]) {
  TUNING.mergeRule = u.rule;
  try {
    const s = makeState(u);
    const initText = stateText(s);
    const rng = new Rng(seed);
    const steps: object[] = [];
    const n = scripted ? scripted.length : STEPS;
    for (let k = 0; k < n; k++) {
      const act = scripted ? { from: scripted[k].from, to: scripted[k].to, id: s.grid[scripted[k].from]?.id ?? 99 } : pickAction(s, rng);
      const before = s.grid.map((g) => g && { ...g });
      const pre = act.from >= 0 && act.from < s.grid.length && act.to >= 0 && act.to < s.grid.length ? s.grid[act.from] : null;
      const plan = pre && act.to >= 0 && act.to < s.grid.length ? sandwichFor(s, act.from, act.to) : null;
      const wasMerge = !!pre && pre.id === act.id && canMerge(pre, s.grid[act.to], s) && !(s.masked ?? []).includes(act.from) && !(s.masked ?? []).includes(act.to) && act.from !== act.to;
      const r = drop(s, act.from, act.to, act.id);
      check(s.phase === 'playing', `phase left playing at ${u.name} step ${k}`);
      let kind = 'refused';
      let land = -1;
      if (r.ok) {
        const mv = r.events.find((e) => e.type === 'move') as { to: number; swap: boolean } | undefined;
        if (mv) {
          kind = mv.swap ? 'swap' : 'move';
          land = mv.to;
          check(!wasMerge, 'move reported for a merge');
        } else {
          kind = 'merge';
          land = act.to;
          check(wasMerge, `merge without canMerge at ${u.name} step ${k}`);
        }
      }
      // the board slice models exactly: refused = no change; merge = from freed, to = new part, sandwich cells freed; move/swap = exchange.
      if (kind === 'refused') check(s.grid.every((g, i) => g === before[i] || (g && before[i] && g.id === before[i]!.id)), 'refused drop changed the grid');
      if (kind === 'merge') {
        const freed = new Set([act.from, ...(plan ? plan.cells : [])]);
        for (let i = 0; i < s.grid.length; i++) if (i !== act.to) check(freed.has(i) ? s.grid[i] === null : s.grid[i]?.id === before[i]?.id, `unmodelled grid change at cell ${i} (${u.name} step ${k})`);
        check(s.grid[act.to]!.family === pre!.family, 'merge changed family');
      }
      steps.push({
        from: act.from,
        to: act.to,
        id: act.id,
        ok: r.ok,
        kind,
        land,
        newRank: kind === 'merge' ? s.grid[act.to]!.rank : -1,
        sandwich: kind === 'merge' && plan ? { cells: plan.cells, rank: plan.rank, plus: plan.plus, bonus: plan.bonus } : null,
        hash: hashText(stateText(s)),
      });
    }
    return { name: u.name, level: u.level, rule: u.rule, jumpstart: !!u.jumpstart, override: u.override ?? null, masked: u.masked ?? null, initText, initHash: hashText(initText), steps };
  } finally {
    TUNING.mergeRule = 'today';
  }
}

export function writeBoardCases(): void {
  const setups: Setup[] = [];
  for (const level of [1, 5, 6, 20, 40, 80]) for (const rule of RULES) setups.push({ name: `L${level}-${rule}`, level, rule });
  for (const level of [5, 20]) setups.push({ name: `L${level}-jumpstart`, level, rule: 'today', jumpstart: true });
  // hand-made boards (level 1 = cap 6, level 40 = cap 8): sandwiches, cap clipping, cap compaction, masked cells.
  const cell = (r: number, c: number) => idxOf(r, c);
  const custom: { u: Setup; script: { from: number; to: number }[] }[] = [
    // vertical sandwich: (1,2) merges onto (3,2); the landing cell's neighbours (2,2) and (4,2) are absorbed too
    { u: { name: 'sandwich-vertical', level: 1, rule: 'sandwich2', override: [[cell(1, 2), 'cannon', 2], [cell(3, 2), 'cannon', 2], [cell(2, 2), 'cannon', 2], [cell(4, 2), 'cannon', 2]] }, script: [{ from: cell(1, 2), to: cell(3, 2) }] },
    { u: { name: 'sandwich-horizontal-bonus', level: 1, rule: 'sandwichBonus', override: [[cell(3, 0), 'coil', 3], [cell(3, 2), 'coil', 3], [cell(2, 1), 'coil', 3], [cell(3, 1), 'coil', 3], [cell(0, 0), 'bell', 1]] }, script: [{ from: cell(2, 1), to: cell(3, 1) }, { from: cell(3, 0), to: cell(3, 2) }] },
    { u: { name: 'sandwich-three-candidates', level: 1, rule: 'sandwich2', override: [[cell(2, 1), 'bell', 2], [cell(2, 3), 'bell', 2], [cell(1, 2), 'bell', 2], [cell(3, 2), 'bell', 2], [cell(2, 2), 'bell', 2]] }, script: [{ from: cell(2, 1), to: cell(2, 2) }, { from: cell(0, 0), to: cell(0, 1) }] },
    { u: { name: 'sandwich-cap-clip', level: 1, rule: 'sandwich2', override: [[cell(1, 1), 'cannon', 5], [cell(1, 2), 'cannon', 5], [cell(1, 0), 'cannon', 5], [cell(1, 3), 'cannon', 5]] }, script: [{ from: cell(1, 1), to: cell(1, 2) }] },
    { u: { name: 'cap-compaction-L1', level: 1, rule: 'sandwich2', override: [[cell(0, 0), 'cannon', 6], [cell(0, 1), 'cannon', 6], [cell(5, 0), 'fan', 6], [cell(5, 1), 'fan', 6]] }, script: [{ from: cell(0, 0), to: cell(0, 1) }, { from: cell(5, 0), to: cell(5, 1) }] },
    { u: { name: 'rank8-cap-L40', level: 40, rule: 'sandwich2', override: [[cell(0, 0), 'cannon', 7], [cell(0, 1), 'cannon', 7], [cell(4, 0), 'fan', 6], [cell(4, 1), 'fan', 6], [cell(5, 0), 'coil', 8], [cell(5, 1), 'coil', 8], [cell(3, 0), 'horn', 7], [cell(3, 1), 'horn', 7]] }, script: [{ from: cell(0, 0), to: cell(0, 1) }, { from: cell(4, 0), to: cell(4, 1) }, { from: cell(5, 0), to: cell(5, 1) }, { from: cell(3, 0), to: cell(3, 1) }] },
    { u: { name: 'masked-and-refusals', level: 1, rule: 'today', masked: [cell(0, 1)], override: [[cell(0, 0), 'bell', 1], [cell(0, 1), 'bell', 1], [cell(0, 2), 'bell', 1], [cell(1, 0), 'coil', 1]] }, script: [{ from: cell(0, 0), to: cell(0, 1) }, { from: cell(0, 1), to: cell(0, 2) }, { from: cell(0, 0), to: cell(0, 0) }, { from: cell(2, 2), to: cell(2, 3) }, { from: cell(0, 0), to: cell(1, 0) }, { from: cell(1, 0), to: cell(0, 0) }, { from: cell(0, 2), to: cell(5, 4) }, { from: cell(0, 0), to: cell(0, 2) }] },
  ];

  const cases = [
    ...setups.map((u, i) => runSetup(u, 0x5eed0 + i)),
    ...custom.map((c, i) => runSetup(c.u, 0xc0de0 + i, c.script)),
  ];
  const stepCount = cases.reduce((n, c) => n + c.steps.length, 0);
  const kinds: Record<string, number> = {};
  let sandwiches = 0;
  for (const c of cases) for (const st of c.steps as { kind: string; sandwich: unknown }[]) { kinds[st.kind] = (kinds[st.kind] ?? 0) + 1; if (st.sandwich) sandwiches++; }

  // every level's start board (all 80), natural settings: ids, families, ranks, masks
  const levelBoards = LEVELS.map((def) => {
    const s = newLevel(def);
    const text = stateText(s);
    return { level: def.level, text, hash: hashText(text) };
  });
  const capState = (rankCap: number | undefined) => (rankCap === undefined ? undefined : ({ level: 1, rankCap } as unknown as GameState));
  const out = {
    schema: 1,
    note: 'generated by tools/export-parity-board.ts (via export-parity-cases.ts); do not edit by hand',
    constants: { rows: ROWS, cols: COLS, maxRank: MAX_RANK },
    tables: {
      families: FAMILIES,
      shooters: FAMILIES.filter((f) => isShooter(f)),
      relays: FAMILIES.filter((f) => isRelay(f)),
      units: UNITS.map((u) => ({ id: u.id, role: u.role, rarity: u.rarity, slot: u.slot })),
      // capOf(familyIndex): no level (classic run) / rankCap 6 / rankCap 8
      capNoLevel: FAMILIES.map((f) => capOf(undefined, f)),
      cap6: FAMILIES.map((f) => capOf(capState(6), f)),
      cap8: FAMILIES.map((f) => capOf(capState(8), f)),
    },
    levelBoards,
    cases,
  };
  mkdirSync(new URL('../unity/parity/', import.meta.url), { recursive: true });
  writeFileSync(new URL('../unity/parity/cases2.json', import.meta.url), JSON.stringify(out, null, 1) + '\n');
  console.log(`wrote unity/parity/cases2.json: ${cases.length} board cases, ${stepCount} steps (${JSON.stringify(kinds)}, ${sandwiches} sandwiches), ${levelBoards.length} level boards, ${FAMILIES.length} families`);
}
