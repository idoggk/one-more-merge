// CHAPTER BOSSES (ChatGPT round 20, BOSS_RULES.md). One boss, one HP bar, one 90 s clock, three cosmetic armor
// phases (HP > 66% / 66-33% / <= 33%). A telegraphed attack every 12 s from 8 s: 2.5 s warning, then an effect whose
// duration (or Suction count) grows with the phase. Effects resolve between cascades, never reactivate ids, never
// auto-merge, and death cancels everything. Deterministic: targets come from the board at warning time.
import { COLS, ROWS } from '../content/tuning';
import { isShooter, type Grid } from './types';

export type BossAttack = 'clamp' | 'frost' | 'suction' | 'hot' | 'rest' | 'split' | 'bomb' | 'conveyor' | 'mirror' | 'blocks' | 'pull' | 'bounce' | 'slick' | 'portals' | 'tow' | 'ransom';
export interface BossDef {
  id: string;
  name: string;
  attack: BossAttack;
  /** Lane / level-card copy (r20). */
  copy: string;
  /** r27: chapter bosses add their chapter's mini-boss attack in the final phase (alternating, second first). */
  second?: BossAttack;
  /** r27 mini-boss (mid-chapter, 60 s, no mechanical phases). */
  mini?: boolean;
}
/** Chapter 1..6 bosses (levels 10, 20, 30, 40, 50, 60). */
export const BOSSES: BossDef[] = [
  { id: 'tin_can_king', name: 'TIN CAN KING', attack: 'clamp', second: 'bomb', copy: 'Move or merge the marked machine before the clamp closes.' },
  { id: 'fridge_overlord', name: 'FRIDGE OVERLORD', attack: 'frost', second: 'conveyor', copy: 'The frozen row cannot receive parts. Build on another row.' },
  { id: 'viper_queen', name: 'VIPER QUEEN', attack: 'suction', second: 'mirror', copy: 'Move or merge the marked machines before they vanish.' },
  { id: 'twin_toasters', name: 'TWIN TOASTERS', attack: 'hot', second: 'blocks', copy: 'Shooters in the hot column hit weaker. Move them out.' },
  { id: 'piano_saurus_rex', name: 'PIANO-SAURUS REX', attack: 'rest', second: 'pull', copy: 'Relays in the resting row cannot wake neighbours.' },
  { id: 'junkzilla', name: 'JUNKZILLA', attack: 'split', second: 'bounce', copy: 'The divider blocks relay links. Build a chain on one side.' },
  // r27 mini-bosses (ChatGPT MINIBOSS rules): L8 / 18 / 28 / 38 / 48 / 58
  { id: 'pressure_popper', name: 'PRESSURE POPPER', attack: 'bomb', mini: true, copy: 'Cover the bomb with a machine before it pops.' },
  { id: 'carousel_crab', name: 'CAROUSEL CRAB', attack: 'conveyor', mini: true, copy: 'This row slides right. Plan its new neighbours.' },
  { id: 'vanity_moth', name: 'VANITY MOTH', attack: 'mirror', mini: true, copy: 'The marked cells swap their machines.' },
  { id: 'brick_printer', name: 'BRICK PRINTER', attack: 'blocks', mini: true, copy: 'Fire beside junk blocks to clear them.' },
  { id: 'scrap_kraken', name: 'SCRAP KRAKEN', attack: 'pull', mini: true, copy: 'It pulls a marked machine one cell upward.' },
  { id: 'spring_jack', name: 'SPRING JACK', attack: 'bounce', mini: true, copy: 'The marked machine bounces to the empty circle.' },
  // r29 chapters 7-8 (ChatGPT CHAPTER_7_8_RULES): minis now also escalate in their last third
  { id: 'oil_otter', name: 'OIL OTTER', attack: 'slick', second: 'conveyor', mini: true, copy: 'Drops on oil slide one cell along the arrow.' },
  { id: 'rivet_rhino', name: 'RIVET RHINO', attack: 'tow', second: 'slick', copy: 'Linked machines move together. Merge either to release them.' },
  { id: 'portal_possum', name: 'PORTAL POSSUM', attack: 'portals', second: 'mirror', mini: true, copy: 'Empty portals let you move a machine across the board.' },
  { id: 'chrono_chimera', name: 'CHRONO CHIMERA', attack: 'ransom', second: 'portals', copy: 'Wake both marked machines in one chain to protect the clock.' },
];
/** Chapter bosses by chapter (level 10 * k). */
export const CHAPTER_BOSS = ['tin_can_king', 'fridge_overlord', 'viper_queen', 'twin_toasters', 'piano_saurus_rex', 'junkzilla', 'rivet_rhino', 'chrono_chimera'];
export const chapterBossIdx = (level: number) => BOSSES.findIndex((b) => b.id === CHAPTER_BOSS[(level / 10 - 1) % CHAPTER_BOSS.length]);
export const ATTACK_COPY: Record<BossAttack, { what: string; why: string }> = {
  clamp: { what: 'CLAMP', why: 'marked machine gets stuck' },
  frost: { what: 'FROST', why: 'no parts land here' },
  suction: { what: 'SUCTION', why: 'marked machines vanish' },
  hot: { what: 'HOT COLUMN', why: 'shots hit half as hard' },
  rest: { what: 'REST ROW', why: 'relays wake nobody' },
  split: { what: 'SPLIT', why: 'links cannot cross' },
  bomb: { what: 'BOMB', why: 'cover it or fire beside it' },
  conveyor: { what: 'ROW SLIDES', why: 'everything moves one right' },
  mirror: { what: 'MIRROR', why: 'marked cells swap' },
  blocks: { what: 'JUNK', why: 'fire beside blocks to clear' },
  pull: { what: 'PULL UP', why: 'move it or block the arrow' },
  bounce: { what: 'BOUNCE', why: 'it jumps to the circle' },
  slick: { what: 'SLICK', why: 'oil drops slide 1 cell →' },
  portals: { what: 'PORTALS', why: 'a shortcut across your board' },
  tow: { what: 'TOW BAR', why: 'move one → both move' },
  ransom: { what: 'TIME RANSOM', why: 'wake both in one chain' },
};
export const RANSOM_COST = 2;
export const BOSS_CLOCK = 90;
export const BOSS_FIRST = 8;
export const BOSS_EVERY = 12;
export const BOSS_WARN = 2.5;
const DURATION = [2, 3, 4];

export interface BossTarget {
  /** r27: which attack this cast is (chapter bosses alternate two in the final phase). */
  attack?: BossAttack;
  /** r29 tow / ransom: the marked machines' ids (fixed at warning time). */
  ids?: number[];
  cells?: number[];
  row?: number;
  col?: number;
  /** split: boundary between column b and b+1 */
  boundary?: number;
}
export interface BossState {
  def: number; // index into BOSSES
  next: number; // attacks scheduled so far
  pending: (BossTarget & { deadline: number; phase: number }) | null;
  active: (BossTarget & { until: number }) | null;
  /** Highest phase already announced (0..2): ARMOR BROKEN fires on increase. */
  phaseShown: number;
  /** r23: an ordinary monster's light version (first at 10 s, every 15 s, one target, 2 s, no armor phases). */
  light?: boolean;
  /** r27 mini-boss: no mechanical phases. */
  mini?: boolean;
  /** r27: final-phase alternation counter (even = second signature next). */
  alt?: number;
  /** r27 junk blocks on the board (inert; expire at `until`). */
  blocks?: { cell: number; until: number }[];
}

export type BossEvent =
  | { type: 'bossWarn'; attack: BossAttack; target: BossTarget; deadline: number }
  | { type: 'bossHit'; attack: BossAttack; target: BossTarget; removedIds?: number[]; moves?: { from: number; to: number; id: number }[]; outcome: 'hit' | 'whiff' }
  | { type: 'bossDefuse'; attack: BossAttack; cells: number[] }
  | { type: 'bossFinal'; second: BossAttack }
  | { type: 'bossRansom'; saved: boolean; cost: number }
  | { type: 'bossRansomHalf'; id: number }
  | { type: 'bossEnd'; attack: BossAttack }
  | { type: 'bossPhase'; phase: number };

export const bossPhase = (hp: number, maxHp: number) => (hp > 0.66 * maxHp ? 0 : hp > 0.33 * maxHp ? 1 : 2);
const rowOf = (i: number) => Math.floor(i / COLS);
const colOf = (i: number) => i % COLS;

export const castAttack = (b: BossState, t: BossTarget | null | undefined): BossAttack => t?.attack ?? BOSSES[b.def].attack;

/** Cells the player may not drop into right now (clamp / frost), and clamped cells the player may not drag FROM. */
export function bossBlocked(b: BossState | null | undefined): { noDrop: Set<number>; noDrag: Set<number> } {
  const noDrop = new Set<number>(), noDrag = new Set<number>();
  const a = b?.active;
  if (!b || !a) return { noDrop, noDrag };
  const atk = castAttack(b, a);
  if (atk === 'clamp') for (const c of a.cells ?? []) noDrop.add(c), noDrag.add(c);
  if (atk === 'frost' && a.row !== undefined) for (let c = 0; c < COLS; c++) noDrop.add(a.row * COLS + c);
  return { noDrop, noDrag };
}

/** Cells marked by a pending clamp/suction: deliveries must not refill a cell the player just emptied to dodge (r23). */
export function bossPendingCells(b: BossState | null | undefined): number[] {
  const atk = b?.pending ? castAttack(b, b.pending) : null;
  return atk === 'clamp' || atk === 'suction' || atk === 'bomb' || atk === 'blocks' ? (b!.pending!.cells ?? []) : [];
}

/** r27: cells covered by junk blocks (treated as locked by the game). */
export const bossBlockCells = (b: BossState | null | undefined): number[] => (b?.blocks ?? []).map((x) => x.cell);

/** r29 TIME RANSOM: a player cascade that activates both marked ids disarms it. */
export function bossRansomCheck(b: BossState | null | undefined, activatedIds: number[]): BossEvent[] {
  const p = b?.pending;
  if (!b || !p || castAttack(b, p) !== 'ransom' || !p.ids) return [];
  const [x, y] = p.ids;
  if (x === y || (activatedIds.includes(x) && activatedIds.includes(y))) {
    b.pending = null;
    return [{ type: 'bossRansom', saved: true, cost: 0 }];
  }
  // r30 (ChatGPT): one of two woke -> say "1/2, same chain" so the rule is learned by doing
  const one = activatedIds.includes(x) ? x : activatedIds.includes(y) ? y : -1;
  return one >= 0 ? [{ type: 'bossRansomHalf', id: one }] : [];
}
/** r29: a manual merge moves ransom / tow markers onto the result id. */
export function bossRelabel(b: BossState | null | undefined, oldIds: number[], newId: number) {
  for (const t of [b?.pending, b?.active]) if (t?.ids) t.ids = t.ids.map((i) => (oldIds.includes(i) ? newId : i));
}

/** r27: a player move into the bomb cell, or a player cascade activating its neighbour, defuses it; activations beside junk blocks clear them. */
export function bossAfterPlayer(b: BossState | null | undefined, movedTo: number, activated: number[]): BossEvent[] {
  const ev: BossEvent[] = [];
  if (!b) return ev;
  const p = b.pending;
  if (p && castAttack(b, p) === 'bomb') {
    const c = p.cells![0];
    if (movedTo === c || activated.some((i) => orth(c).includes(i))) {
      b.pending = null;
      ev.push({ type: 'bossDefuse', attack: 'bomb', cells: [c] });
    }
  }
  if (b.blocks?.length && activated.length) {
    const hit = b.blocks.filter((x) => activated.some((i) => orth(x.cell).includes(i)));
    if (hit.length) {
      b.blocks = b.blocks.filter((x) => !hit.includes(x));
      ev.push({ type: 'bossDefuse', attack: 'blocks', cells: hit.map((x) => x.cell) });
    }
  }
  return ev;
}

/** Cascade modifiers while an effect is active (hot column / resting row / split boundary). */
export function bossCascadeMods(b: BossState | null | undefined): { hotCol?: number; restRow?: number; splitB?: number } {
  const a = b?.active;
  if (!b || !a) return {};
  const atk = castAttack(b, a);
  if (atk === 'hot') return { hotCol: a.col };
  if (atk === 'rest') return { restRow: a.row };
  if (atk === 'split') return { splitB: a.boundary };
  return {};
}

const orth = (i: number) => {
  const r = rowOf(i), c = colOf(i);
  return [[r - 1, c], [r, c + 1], [r + 1, c], [r, c - 1]].filter(([y, x]) => y >= 0 && y < ROWS && x >= 0 && x < COLS).map(([y, x]) => y * COLS + x);
};

/** r27 mini-boss target choice (ChatGPT rules): deterministic, row-major ties, never masked / reserved / blocked cells. */
function pickNew(atk: BossAttack, grid: Grid, blocked: ReadonlySet<number>, b: BossState): BossTarget | null {
  const ok = (i: number) => !blocked.has(i);
  const empty = (i: number) => ok(i) && !grid[i];
  const full = (i: number) => ok(i) && !!grid[i];
  const all = grid.map((_, i) => i);
  const nOcc = (i: number) => orth(i).filter((n) => !!grid[n]).length;
  const best = (cands: number[], score: (i: number) => number) => cands.reduce((a, i) => (a < 0 || score(i) > score(a) ? i : a), -1);
  if (atk === 'bomb') {
    const c = best(all.filter((i) => empty(i) && nOcc(i) >= 1), nOcc);
    return c < 0 ? null : { attack: atk, cells: [c] };
  }
  if (atk === 'conveyor') {
    let row = -1, bn = 1;
    for (let r = 0; r < ROWS; r++) {
      const cells = [0, 1, 2, 3, 4].map((c) => r * COLS + c);
      if (cells.some((i) => !ok(i))) continue;
      const n = cells.filter((i) => grid[i]).length;
      if (n > bn) [row, bn] = [r, n];
    }
    return row < 0 ? null : { attack: atk, row };
  }
  if (atk === 'mirror') {
    const occ = all.filter(full);
    if (occ.length < 2) return null;
    const hi = occ.reduce((a, i) => (grid[i]!.rank > grid[a]!.rank ? i : a));
    const A = grid[hi]!;
    const lo = occ.filter((i) => i !== hi).filter((i) => { const g = grid[i]!; return g.family !== A.family || g.rank !== A.rank || !!g.item !== !!A.item || !!g.primed !== !!A.primed; });
    if (!lo.length) return null;
    const l = lo.reduce((a, i) => (grid[i]!.rank < grid[a]!.rank ? i : a));
    return { attack: atk, cells: [hi, l] };
  }
  if (atk === 'blocks') {
    const room = 2 - (b.blocks?.length ?? 0);
    if (room <= 0) return null;
    const cands = all.filter((i) => empty(i) && nOcc(i) >= 1).sort((x, y) => nOcc(y) - nOcc(x) || x - y).slice(0, room);
    return cands.length ? { attack: atk, cells: cands } : null;
  }
  if (atk === 'pull') {
    const src = all.filter((i) => rowOf(i) > 0 && full(i) && empty(i - COLS));
    if (!src.length) return null;
    const s0 = src.reduce((a, i) => (grid[i]!.rank > grid[a]!.rank ? i : a));
    return { attack: atk, cells: [s0, s0 - COLS] };
  }
  if (atk === 'slick') {
    // empty cell with the most occupied neighbours that has an empty eligible neighbour; arrow = first of U, R, D, L
    for (const c of all.filter((i) => empty(i) && nOcc(i) >= 1).sort((x, y) => nOcc(y) - nOcc(x) || x - y)) {
      const d = orth(c).find((n) => empty(n) && [c - COLS, c + 1, c + COLS, c - 1].includes(n));
      const dir = [c - COLS, c + 1, c + COLS, c - 1].find((n) => orth(c).includes(n) && empty(n));
      if (d !== undefined && dir !== undefined) return { attack: atk, cells: [c, dir] };
    }
    return null;
  }
  if (atk === 'portals') {
    const em = all.filter(empty);
    let best: [number, number] | null = null, bd = 3;
    for (let x = 0; x < em.length; x++)
      for (let y = x + 1; y < em.length; y++) {
        const d = Math.abs(rowOf(em[x]) - rowOf(em[y])) + Math.abs(colOf(em[x]) - colOf(em[y]));
        if (d > bd) [best, bd] = [[em[x], em[y]], d];
      }
    return best ? { attack: atk, cells: best } : null;
  }
  if (atk === 'tow') {
    let best: [number, number] | null = null, bs = -1;
    for (const i of all.filter(full))
      for (const n of [i + 1, i + COLS]) {
        if (n >= grid.length || (n === i + 1 && colOf(n) === 0) || !full(n)) continue;
        const sum = grid[i]!.rank + grid[n]!.rank;
        if (sum > bs) [best, bs] = [[i, n], sum];
      }
    return best ? { attack: atk, cells: best, ids: best.map((i) => grid[i]!.id) } : null;
  }
  if (atk === 'ransom') {
    const occ = all.filter(full);
    let best: [number, number] | null = null, bs = -1;
    for (let x = 0; x < occ.length; x++)
      for (let y = x + 1; y < occ.length; y++) {
        const A = grid[occ[x]]!, B = grid[occ[y]]!;
        if (A.family === B.family) continue;
        if (A.rank + B.rank > bs) [best, bs] = [[occ[x], occ[y]], A.rank + B.rank];
      }
    return best ? { attack: atk, cells: best, ids: best.map((i) => grid[i]!.id) } : null;
  }
  // bounce: most-surrounded machine to the farthest empty cell
  const src = best(all.filter(full), nOcc);
  if (src < 0) return null;
  const dist = (i: number) => Math.abs(rowOf(i) - rowOf(src)) + Math.abs(colOf(i) - colOf(src));
  const dst = best(all.filter(empty), dist);
  return dst < 0 ? null : { attack: atk, cells: [src, dst] };
}

function pick(atk: BossAttack, grid: Grid, blocked: ReadonlySet<number>, phase: number, b?: BossState): BossTarget | null {
  if (['bomb', 'conveyor', 'mirror', 'blocks', 'pull', 'bounce', 'slick', 'portals', 'tow', 'ransom'].includes(atk)) return pickNew(atk, grid, blocked, b!);
  const occ = grid.map((g, i) => ({ g, i })).filter((x) => x.g && !blocked.has(x.i));
  if (atk === 'clamp') {
    if (!occ.length) return null;
    const best = occ.reduce((a, b) => (b.g!.rank > a.g!.rank ? b : a));
    return { cells: [best.i] };
  }
  if (atk === 'suction') {
    if (occ.length < 4) return null;
    const n = phase >= 2 ? 2 : 1;
    const sorted = [...occ].sort((a, b) => a.g!.rank - b.g!.rank || a.i - b.i);
    return { cells: sorted.slice(0, n).map((x) => x.i) };
  }
  if (atk === 'frost') {
    let best = -1, bn = 0;
    for (let r = 0; r < ROWS; r++) {
      let n = 0, res = false;
      for (let c = 0; c < COLS; c++) {
        const i = r * COLS + c;
        if (blocked.has(i)) res = true;
        else if (!grid[i]) n++;
      }
      if (!res && n > bn) [best, bn] = [r, n];
    }
    return best < 0 ? null : { row: best };
  }
  if (atk === 'hot') {
    let best = -1, bn = 0;
    for (let c = 0; c < COLS; c++) {
      const n = occ.filter((x) => colOf(x.i) === c && isShooter(x.g!.family)).length;
      if (n > bn) [best, bn] = [c, n];
    }
    return best < 0 ? null : { col: best };
  }
  if (atk === 'rest') {
    let best = -1, bn = 0;
    for (let r = 0; r < ROWS; r++) {
      const n = occ.filter((x) => rowOf(x.i) === r && (x.g!.family === 'coil' || x.g!.family === 'bell')).length;
      if (n > bn) [best, bn] = [r, n];
    }
    return best < 0 ? null : { row: best };
  }
  // split: the column boundary crossed by the most ordinary relay wake pairs (coil 2-cross, bell row), tie leftmost
  let bestB = 1, bestScore = 0;
  for (let b = 0; b < COLS - 1; b++) {
    let score = 0;
    for (const { g, i } of occ) {
      if (g!.family !== 'coil' && g!.family !== 'bell') continue;
      const r = rowOf(i), c = colOf(i);
      const targets: number[] = [];
      if (g!.family === 'bell') for (let cc = 0; cc < COLS; cc++) targets.push(r * COLS + cc);
      else for (const d of [-2, -1, 1, 2]) if (c + d >= 0 && c + d < COLS) targets.push(r * COLS + c + d);
      for (const t of targets) {
        const tg = grid[t];
        if (t === i || !tg || tg.family === g!.family) continue;
        if (c <= b !== colOf(t) <= b) score++;
      }
    }
    if (score > bestScore) [bestB, bestScore] = [b, score];
  }
  return { boundary: bestB };
}

/** Advance the boss for one tick (after player input + cascades). Mutates grid on Suction. */
export function bossTick(b: BossState, grid: Grid, elapsed: number, hp: number, maxHp: number, blocked: ReadonlySet<number>): BossEvent[] {
  const ev: BossEvent[] = [];
  const def = BOSSES[b.def];
  const ph = b.light || (b.mini && !def.second) ? 0 : bossPhase(hp, maxHp);
  if (ph > b.phaseShown) {
    b.phaseShown = ph;
    ev.push({ type: 'bossPhase', phase: ph });
    if (ph === 2 && def.second) ev.push({ type: 'bossFinal', second: def.second });
  }
  // r27 junk blocks expire after 8 s
  if (b.blocks?.length) b.blocks = b.blocks.filter((x) => x.until > elapsed + 1e-9);
  if (b.active && elapsed >= b.active.until - 1e-9) {
    const done = castAttack(b, b.active);
    b.active = null;
    ev.push({ type: 'bossEnd', attack: done });
  }
  if (b.pending && elapsed >= b.pending.deadline - 1e-9) {
    const p = b.pending;
    b.pending = null;
    const atk = castAttack(b, p);
    const dur = DURATION[p.phase];
    const bl = new Set([...blocked, ...bossBlockCells(b)]);
    const move = (moves: { from: number; to: number; id: number }[]) => {
      const snap = moves.map((m) => grid[m.from]);
      for (const m of moves) grid[m.from] = null;
      moves.forEach((m, k) => (grid[m.to] = snap[k]));
    };
    if (atk === 'bomb') {
      const c = p.cells![0];
      const victims = orth(c).filter((n) => grid[n] && !bl.has(n) && grid[n]!.rank <= 2).sort((x, y) => grid[x]!.rank - grid[y]!.rank || x - y);
      const removed: number[] = [];
      if (victims.length) {
        removed.push(grid[victims[0]]!.id);
        grid[victims[0]] = null;
      }
      ev.push({ type: 'bossHit', attack: atk, target: p, removedIds: removed, outcome: removed.length ? 'hit' : 'whiff' });
    } else if (atk === 'conveyor') {
      const cells = [0, 1, 2, 3, 4].map((k) => p.row! * COLS + k);
      if (cells.some((i) => bl.has(i))) ev.push({ type: 'bossHit', attack: atk, target: p, outcome: 'whiff' });
      else {
        const moves = cells.filter((i) => grid[i]).map((i) => ({ from: i, to: p.row! * COLS + ((colOf(i) + 1) % COLS), id: grid[i]!.id }));
        move(moves);
        ev.push({ type: 'bossHit', attack: atk, target: p, moves, outcome: moves.length ? 'hit' : 'whiff' });
      }
    } else if (atk === 'mirror') {
      const [x, y] = p.cells!;
      if (bl.has(x) || bl.has(y) || (!grid[x] && !grid[y])) ev.push({ type: 'bossHit', attack: atk, target: p, outcome: 'whiff' });
      else {
        const moves = [...(grid[x] ? [{ from: x, to: y, id: grid[x]!.id }] : []), ...(grid[y] ? [{ from: y, to: x, id: grid[y]!.id }] : [])];
        move(moves);
        ev.push({ type: 'bossHit', attack: atk, target: p, moves, outcome: 'hit' });
      }
    } else if (atk === 'blocks') {
      const placed = p.cells!.filter((c) => !grid[c] && !bl.has(c));
      b.blocks = [...(b.blocks ?? []), ...placed.map((cell) => ({ cell, until: elapsed + 8 }))];
      ev.push({ type: 'bossHit', attack: atk, target: { ...p, cells: placed }, outcome: placed.length ? 'hit' : 'whiff' });
    } else if (atk === 'slick' || atk === 'portals') {
      // terrain for 4 s; both cells must still be empty or the cast whiffs (slick only needs its source empty)
      const [x, y] = p.cells!;
      const ok = !grid[x] && !bl.has(x) && (atk === 'slick' || (!grid[y] && !bl.has(y)));
      if (ok) b.active = { ...p, until: elapsed + 4 };
      ev.push({ type: 'bossHit', attack: atk, target: p, outcome: ok ? 'hit' : 'whiff' });
    } else if (atk === 'tow') {
      const [x, y] = p.cells!;
      const ok = grid[x]?.id === p.ids![0] && grid[y]?.id === p.ids![1] && !bl.has(x) && !bl.has(y);
      if (ok) b.active = { ...p, until: elapsed + 4 };
      ev.push({ type: 'bossHit', attack: atk, target: p, outcome: ok ? 'hit' : 'whiff' });
    } else if (atk === 'ransom') {
      ev.push({ type: 'bossRansom', saved: false, cost: RANSOM_COST }); // the game takes the time
      ev.push({ type: 'bossHit', attack: atk, target: p, outcome: 'hit' });
    } else if (atk === 'pull' || atk === 'bounce') {
      const [from, to] = p.cells!;
      if (grid[from] && !bl.has(from) && !grid[to] && !bl.has(to)) {
        const moves = [{ from, to, id: grid[from]!.id }];
        move(moves);
        ev.push({ type: 'bossHit', attack: atk, target: p, moves, outcome: 'hit' });
      } else ev.push({ type: 'bossHit', attack: atk, target: p, outcome: 'whiff' });
    } else if (atk === 'suction') {
      const removed: number[] = [];
      for (const c of (p.cells ?? []).slice(0, 2)) {
        const g = grid[c];
        if (g && !blocked.has(c)) {
          removed.push(g.id);
          grid[c] = null;
        }
      }
      ev.push({ type: 'bossHit', attack: atk, target: p, removedIds: removed, outcome: removed.length ? 'hit' : 'whiff' });
    } else {
      b.active = { ...p, until: elapsed + dur };
      ev.push({ type: 'bossHit', attack: atk, target: p, outcome: 'hit' });
    }
  }
  const due = b.light ? 10 + b.next * 15 : BOSS_FIRST + b.next * BOSS_EVERY;
  if (elapsed >= due - 1e-9) {
    b.next++;
    if (!b.pending && !b.active) {
      // r27 final phase: alternate the chapter's mini-boss attack (second first), never overlapping a persistent hazard
      const useSecond = !!def.second && !b.light && ph === 2 && (b.alt ?? 0) % 2 === 0;
      const atk = useSecond ? def.second! : def.attack;
      const hazardLeft = useSecond && (b.blocks?.length ?? 0) > 0;
      const t = hazardLeft ? null : pick(atk, grid, new Set([...blocked, ...bossBlockCells(b)]), b.mini ? 0 : ph, b);
      if (t) {
        if (def.second && ph === 2 && !b.light) b.alt = (b.alt ?? 0) + 1;
        b.pending = { ...t, attack: atk, deadline: elapsed + BOSS_WARN, phase: b.mini ? 0 : ph };
        ev.push({ type: 'bossWarn', attack: atk, target: t, deadline: b.pending.deadline });
      }
    }
  }
  return ev;
}
