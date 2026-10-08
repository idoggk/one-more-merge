// Clarity pass 1 (owner: "I see a purple thing on a unit and idk what happens after I merge on it"): plain-language
// copy for every state a part on the board can carry. Pure: the scene draws it (NEW tips, inspect card, guide legend).
import { COLS, TUNING } from '../content/tuning';
import { ATTACK_COPY, castAttack, type BossAttack, type BossTarget } from './boss';
import { canMerge, capOf, type GameState } from './game';
import type { Gadget, Grid, ItemKind } from './types';

export type MarkKey = 'amp' | 'prime' | 'item' | 'cap' | 'boss' | 'remix';
export interface MarkLine {
  key: MarkKey;
  /** Short caps label, e.g. BOOSTED. */
  label: string;
  /** One plain sentence. */
  text: string;
  /** Boss / remix attack (icon + tint) when key is 'boss' / 'remix'. */
  attack?: BossAttack | string;
  item?: ItemKind;
}

export const fmtMult = (m: number) => `x${+m.toFixed(2)}`;
/** Battery charge on a shooter: same formula as cascade.ts (level +0.03, L3 High Voltage +0.20). */
export const primeMult = (s: Pick<GameState, 'unitLevel'>) => {
  const lvl = s.unitLevel?.battery ?? 1;
  return TUNING.batteryBonus + 0.03 * (lvl - 1) + (lvl >= 3 ? 0.2 : 0);
};

export const ITEM_MARK: Record<ItemKind, { name: string; does: (n: number) => string }> = {
  overcharge: { name: 'OVERCHARGE', does: (n) => `its next ${n} chain shot${n === 1 ? '' : 's'} hit x2.` },
  spark: { name: 'SPARK', does: (n) => `the next ${n} time${n === 1 ? '' : 's'} it fires, it also wakes its neighbours.` },
  corner: { name: 'CORNER KIT', does: (n) => `the next ${n} time${n === 1 ? '' : 's'} this Bell rings, it also wakes its diagonals.` },
};

/** First-time NEW tips, one per mark kind (ids live in meta.tips). Returns the first unseen mark on the board. */
export function markTip(grid: Grid, seen: Record<string, boolean>, s: Pick<GameState, 'unitLevel'> = {}): { id: string; idx: number; text: string } | null {
  const find = (p: (g: Gadget) => boolean) => grid.findIndex((g) => !!g && p(g));
  const tips: { id: string; idx: number; text: (g: Gadget) => string }[] = [
    { id: 'mark_amp', idx: find((g) => !!g.amp), text: (g) => `BOOSTED: this machine's next hit is ${fmtMult(g.amp!)}.\nMerge or chain it to use the boost.` },
    { id: 'mark_prime', idx: find((g) => !!g.primed), text: () => `CHARGED: this shooter's next chain shot is ${fmtMult(primeMult(s))}.\nMerge or chain it to use the charge.` },
    { id: 'mark_item', idx: find((g) => !!g.item), text: (g) => `POWER-UP ${ITEM_MARK[g.item!.kind].name}: ${ITEM_MARK[g.item!.kind].does(g.item!.charges)}\nThe dots show uses left.` },
  ];
  for (const t of tips) if (t.idx >= 0 && !seen[t.id]) return { id: t.id, idx: t.idx, text: t.text(grid[t.idx]!) };
  return null;
}

/** Board cells a boss target covers (ids are followed to wherever those machines are now). */
export function bossTargetCells(grid: Grid, t: BossTarget): number[] {
  if (t.ids) return t.ids.map((id) => grid.findIndex((g) => g?.id === id)).filter((i) => i >= 0);
  if (t.cells) return t.cells;
  if (t.row !== undefined) return [0, 1, 2, 3, 4].map((c) => t.row! * COLS + c);
  if (t.col !== undefined) return grid.map((_, i) => i).filter((i) => i % COLS === t.col);
  return [];
}

/** Inspect card MARKS row: every state on the part in `idx`, plus what a merge right now does with them. */
export function inspectMarks(s: GameState, idx: number): { marks: MarkLine[]; mergeNow: string | null } {
  const g = s.grid[idx];
  const marks: MarkLine[] = [];
  const now: string[] = [];
  if (!g) return { marks, mergeNow: null };
  if (g.amp) {
    marks.push({ key: 'amp', label: 'BOOSTED', text: `Its next hit is ${fmtMult(g.amp)} (from an Amplifier or Signal Beacon).` });
    now.push(`${fmtMult(g.amp)} boost used on this merge`);
  }
  if (g.primed) {
    const m = fmtMult(primeMult(s));
    marks.push({ key: 'prime', label: 'CHARGED', text: `Its next chain shot is ${m} (from a Battery).` });
    now.push(`${m} charge used on this merge`);
  }
  if (g.item) {
    const it = ITEM_MARK[g.item.kind];
    marks.push({ key: 'item', label: it.name, text: `Power-up: ${it.does(g.item.charges)}`, item: g.item.kind });
    now.push(`${it.name} goes to the new machine and uses 1 of ${g.item.charges}`);
  }
  const cap = capOf(s, g.family);
  if (g.rank >= cap) {
    const compact = canMerge(g, { ...g, id: -1 }, s);
    marks.push({ key: 'cap', label: 'MAX', text: compact ? `Rank ${cap} is the top: two of them merge into one rank ${cap}.` : `Rank ${cap} is the top: it can't merge any higher.` });
    if (!compact) now.push("it can't merge, it is already the top rank");
  }
  const b = s.boss;
  for (const [t, warn] of [[b?.active, false], [b?.pending, true]] as const) {
    if (!b || !t || !bossTargetCells(s.grid, t).includes(idx)) continue;
    const atk = castAttack(b, t);
    const c = ATTACK_COPY[atk];
    const left = warn ? b.pending!.deadline - s.elapsed : b.active!.until - s.elapsed;
    marks.push({ key: 'boss', label: c.what, attack: atk, text: warn ? `In ${Math.max(0, left).toFixed(1)}s: ${c.why}.` : `Now, ${Math.max(0, left).toFixed(1)}s left: ${c.why}.` });
    if (atk === 'tow' && !warn) now.push('the tow bar lets go');
    if (atk === 'ransom' && warn) now.push('the ransom mark moves to the new machine, and it wakes (1 of 2)');
    if (atk === 'clamp' && !warn) now.push('blocked: a clamped machine cannot move or merge');
  }
  const r = s.remix;
  if (r?.pending?.cells.includes(idx) && (r.kind === 'vacuum' || r.kind === 'twins')) {
    const left = Math.max(0, r.pending.deadline - s.elapsed).toFixed(1);
    marks.push({ key: 'remix', label: r.kind === 'vacuum' ? 'SUCTION' : 'SHOVE', attack: r.kind, text: r.kind === 'vacuum' ? `In ${left}s this part gets sucked up. Move or merge it away to save it.` : `In ${left}s this part gets shoved aside.` });
  }
  if (r?.lock?.cells.includes(idx)) marks.push({ key: 'remix', label: 'LOCKED', attack: r.kind, text: `Locked for ${Math.max(0, r.lock.until - s.elapsed).toFixed(1)}s: it cannot move or merge.` });
  const mergeNow = now.length ? `If you merge now: ${now.join('; ')}.` : marks.length ? 'If you merge now: nothing above is used up.' : null;
  return { marks, mergeNow };
}
