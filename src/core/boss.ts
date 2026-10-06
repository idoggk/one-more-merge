// CHAPTER BOSSES (ChatGPT round 20, BOSS_RULES.md). One boss, one HP bar, one 90 s clock, three cosmetic armor
// phases (HP > 66% / 66-33% / <= 33%). A telegraphed attack every 12 s from 8 s: 2.5 s warning, then an effect whose
// duration (or Suction count) grows with the phase. Effects resolve between cascades, never reactivate ids, never
// auto-merge, and death cancels everything. Deterministic: targets come from the board at warning time.
import { COLS, ROWS } from '../content/tuning';
import { isShooter, type Grid } from './types';

export type BossAttack = 'clamp' | 'frost' | 'suction' | 'hot' | 'rest' | 'split';
export interface BossDef {
  id: string;
  name: string;
  attack: BossAttack;
  /** Lane / level-card copy (r20). */
  copy: string;
}
/** Chapter 1..6 bosses (levels 10, 20, 30, 40, 50, 60). */
export const BOSSES: BossDef[] = [
  { id: 'tin_can_king', name: 'TIN CAN KING', attack: 'clamp', copy: 'Move or merge the marked machine before the clamp closes.' },
  { id: 'fridge_overlord', name: 'FRIDGE OVERLORD', attack: 'frost', copy: 'The frozen row cannot receive parts. Build on another row.' },
  { id: 'viper_queen', name: 'VIPER QUEEN', attack: 'suction', copy: 'Move or merge the marked machines before they vanish.' },
  { id: 'twin_toasters', name: 'TWIN TOASTERS', attack: 'hot', copy: 'Shooters in the hot column hit weaker. Move them out.' },
  { id: 'piano_saurus_rex', name: 'PIANO-SAURUS REX', attack: 'rest', copy: 'Relays in the resting row cannot wake neighbours.' },
  { id: 'junkzilla', name: 'JUNKZILLA', attack: 'split', copy: 'The divider blocks relay links. Build a chain on one side.' },
];
export const BOSS_CLOCK = 90;
export const BOSS_FIRST = 8;
export const BOSS_EVERY = 12;
export const BOSS_WARN = 2.5;
const DURATION = [2, 3, 4];

export interface BossTarget {
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
}

export type BossEvent =
  | { type: 'bossWarn'; attack: BossAttack; target: BossTarget; deadline: number }
  | { type: 'bossHit'; attack: BossAttack; target: BossTarget; removedIds?: number[]; outcome: 'hit' | 'whiff' }
  | { type: 'bossEnd'; attack: BossAttack }
  | { type: 'bossPhase'; phase: number };

export const bossPhase = (hp: number, maxHp: number) => (hp > 0.66 * maxHp ? 0 : hp > 0.33 * maxHp ? 1 : 2);
const rowOf = (i: number) => Math.floor(i / COLS);
const colOf = (i: number) => i % COLS;

/** Cells the player may not drop into right now (clamp / frost), and clamped cells the player may not drag FROM. */
export function bossBlocked(b: BossState | null | undefined): { noDrop: Set<number>; noDrag: Set<number> } {
  const noDrop = new Set<number>(), noDrag = new Set<number>();
  const a = b?.active;
  if (!b || !a) return { noDrop, noDrag };
  const atk = BOSSES[b.def].attack;
  if (atk === 'clamp') for (const c of a.cells ?? []) noDrop.add(c), noDrag.add(c);
  if (atk === 'frost' && a.row !== undefined) for (let c = 0; c < COLS; c++) noDrop.add(a.row * COLS + c);
  return { noDrop, noDrag };
}

/** Cascade modifiers while an effect is active (hot column / resting row / split boundary). */
export function bossCascadeMods(b: BossState | null | undefined): { hotCol?: number; restRow?: number; splitB?: number } {
  const a = b?.active;
  if (!b || !a) return {};
  const atk = BOSSES[b.def].attack;
  if (atk === 'hot') return { hotCol: a.col };
  if (atk === 'rest') return { restRow: a.row };
  if (atk === 'split') return { splitB: a.boundary };
  return {};
}

function pick(atk: BossAttack, grid: Grid, blocked: ReadonlySet<number>, phase: number): BossTarget | null {
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
  const atk = BOSSES[b.def].attack;
  const ph = bossPhase(hp, maxHp);
  if (ph > b.phaseShown) {
    b.phaseShown = ph;
    ev.push({ type: 'bossPhase', phase: ph });
  }
  if (b.active && elapsed >= b.active.until - 1e-9) {
    b.active = null;
    ev.push({ type: 'bossEnd', attack: atk });
  }
  if (b.pending && elapsed >= b.pending.deadline - 1e-9) {
    const p = b.pending;
    b.pending = null;
    const dur = DURATION[p.phase];
    if (atk === 'suction') {
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
  const due = BOSS_FIRST + b.next * BOSS_EVERY;
  if (elapsed >= due - 1e-9) {
    b.next++;
    if (!b.pending && !b.active) {
      const t = pick(atk, grid, blocked, ph);
      if (t) {
        b.pending = { ...t, deadline: elapsed + BOSS_WARN, phase: ph };
        ev.push({ type: 'bossWarn', attack: atk, target: t, deadline: b.pending.deadline });
      }
    }
  }
  return ev;
}
