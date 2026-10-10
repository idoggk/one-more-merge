// Roster B Support cards (TUNING.rosterB, owner pick "Support card", t-e91097cd). The squad's helper leaves the board and
// becomes ONE card beside it. The card charges +1 for every machine that fires in YOUR merge chains (game.ts drop) and,
// once full, fires on a tap:
//   Fan CLEAR       tap a cell: junk / frost / lock / an incoming attack in the 3x3 around it is cleared
//   Magnet PAIR     tap a part: a twin (same kind + number) arrives next to it
//   Battery PRIME   tap the card: your next shooter merge hits x2 (the whole chain)
//   Amplifier MARK  tap a shooter: its next hit is x1.6 (BOOSTED)
//   Signal Beacon GO  tap a cell (ROW or COLUMN picked on the card): every machine on that line fires now
// Collection levels 3 / 6 / 9 change the job (words: content/units.ts ROSTER_PERKS). Pure model code: a recorded command (replay.ts 'support').
import { COLS, ROWS, TUNING } from '../content/tuning';
import { bossAfterPlayer, bossBlocked, bossCascadeMods, bossPendingCells } from './boss';
import { resolveCascade } from './cascade';
import { applyB1, applyDamage, applyMoves, capOf, dropReserved, hazardCells, locked, makeGadget, merge, peekDeliveries, peekNext, torchOpt, type CommandResult, type GameEvent, type GameState } from './game';
import { attackCells, wardCells, wardHits } from './roster3';
import { bpRank, bpShow, bpSwap, rewindModeOk, rewindRestore, rwNeed } from './roster4';
import { isRelay, isShooter, isSupport, type CascadeResult } from './types';

export type SupportAim = 'none' | 'cell' | 'part' | 'shooter' | 'line';
export type Axis = 'row' | 'col';

/** What each card does and how you aim it (words for the card and the guide). */
export const SUPPORT_JOBS: Record<string, { name: string; verb: string; aim: SupportAim; text: string; aimText?: string; failText?: string; chargeText?: string }> = {
  fan: { name: 'Fan', verb: 'CLEAR', aim: 'cell', text: 'Tap a cell: clears junk, frost, locks and incoming attacks in the 3x3 around it.' },
  magnet: { name: 'Magnet', verb: 'PAIR', aim: 'part', text: 'Tap a part: a twin (same kind and number) arrives next to it.' },
  battery: { name: 'Battery', verb: 'PRIME', aim: 'none', text: 'Tap the card: your next shooter merge hits x2 (the whole chain).' },
  amplifier: { name: 'Amplifier', verb: 'MARK', aim: 'shooter', text: 'Tap a shooter: its next hit is x1.6.' },
  blast_plate: { name: 'Blast Plate', verb: 'BLOCK', aim: 'cell', text: 'Tap a cell: the next boss attack that would hit it is blocked. Only the Blast Plate blocks boss attacks.', aimText: 'Tap a cell: the next boss attack that hits it is BLOCKED', failText: 'No boss to block there' },
  blueprint: { name: 'Blueprint', verb: 'SWAP', aim: 'part', text: 'The card shows your next deliveries. Tap a part: the next delivery that is not that kind becomes a copy of it, arriving at number 1.', aimText: 'Tap a part: the next delivery becomes a copy of it (number 1)', failText: 'No delivery to swap for that part' },
  rewind_crank: { name: 'Rewind Crank', verb: 'UNDO', aim: 'none', text: 'Tap the card: your last merge is undone. The board, the delivery queue, the monster HP and the dice all go back exactly. Charges every 10 merges. Off in puzzles, the daily and bounties.', chargeText: '+1 per merge you make' },
  signal_beacon: { name: 'Signal Beacon', verb: 'GO', aim: 'line', text: 'Pick ROW or COLUMN on the card, tap a cell: every machine on that line fires now.' },
};

const lvl = (s: GameState) => (s.support ? s.unitLevel?.[s.support.family] ?? 1 : 1);

/** Charge a full card needs (Magnet L3 and Beacon L9 need less). */
export function supportNeed(s: GameState): number {
  const sp = s.support;
  if (!sp) return Infinity;
  const L = lvl(s);
  if (sp.family === 'rewind_crank') return rwNeed(L);
  const k = sp.family === 'magnet' && L >= 3 ? 0.75 : sp.family === 'signal_beacon' && L >= 9 ? 0.6 : 1;
  return Math.max(1, Math.round((TUNING.rb.need[sp.family] ?? 12) * k));
}
/** Charge shown on the card (capped at the need). */
export const supportCharge = (s: GameState) => (s.support ? Math.min(s.support.charge, supportNeed(s)) : 0);
export const supportReady = (s: GameState) => !!s.support && s.phase === 'playing' && !s.puzzle && s.support.charge >= supportNeed(s) && !(s.support.family === 'battery' && s.support.prime) && (s.support.family !== 'rewind_crank' || rewindModeOk(s));

/** Cells a Fan clear at `cell` covers: 3x3 (L3 three whole rows, L9 the board). */
export function fanArea(cell: number, level: number): number[] {
  const r0 = Math.floor(cell / COLS), c0 = cell % COLS;
  const out: number[] = [];
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) if (level >= 9 || (Math.abs(r - r0) <= 1 && (level >= 3 || Math.abs(c - c0) <= 1))) out.push(r * COLS + c);
  return out;
}

/** Cells a GO at `cell` fires (row, column, or both from L6). */
export function goLine(cell: number, axis: Axis, level: number): number[] {
  const r0 = Math.floor(cell / COLS), c0 = cell % COLS;
  const out = new Set<number>();
  if (axis === 'row' || level >= 6) for (let c = 0; c < COLS; c++) out.add(r0 * COLS + c);
  if (axis === 'col' || level >= 6) for (let r = 0; r < ROWS; r++) out.add(r * COLS + c0);
  return [...out].sort((a, b) => a - b);
}

/** Where a Magnet twin for the part at `cell` lands: a free touching cell (U/R/D/L), else the nearest free cell. */
export function pairLanding(s: GameState, cell: number): number {
  const lk = locked(s);
  const bad = new Set<number>([...lk, ...dropReserved(s), ...bossBlocked(s.boss).noDrop, ...bossPendingCells(s.boss)]);
  const r0 = Math.floor(cell / COLS), c0 = cell % COLS;
  let best = -1, bd = 99;
  s.grid.forEach((g, i) => {
    if (g || bad.has(i)) return;
    const d = Math.abs(Math.floor(i / COLS) - r0) + Math.abs((i % COLS) - c0);
    if (d < bd) [best, bd] = [i, d];
  });
  return best;
}

/** Blueprint: the deliveries shown on the card (not yet that kind) a swap can turn into a copy, in order. */
export function blueprintSwaps(s: GameState, family: string) {
  return peekDeliveries(s, bpShow(s.unitLevel?.blueprint ?? 1)).filter((u) => (u.pend !== undefined || u.ord !== undefined) && u.family !== family);
}

/** Can the card fire at this target now? (A tap that would do nothing never spends the charge.) */
export function canUseSupport(s: GameState, cell: number, axis: Axis = 'row'): boolean {
  if (!supportReady(s)) return false;
  const f = s.support!.family, g = s.grid[cell];
  const lk = locked(s);
  if (f === 'battery') return true;
  if (f === 'rewind_crank') return !!s.support!.snap && s.elapsed - (s.support!.snapAt ?? -1e9) <= TUNING.r4.rwWindow;
  if (f === 'blueprint') return !!g && !isSupport(g.family) && !lk.has(cell) && blueprintSwaps(s, g.family).length > 0;
  if (f === 'blast_plate') return !!s.boss && cell >= 0 && cell < s.grid.length && !(s.wards?.list ?? []).some((w) => wardCells(cell, lvl(s)).every((c) => w.cells.includes(c)));
  if (cell < 0 || cell >= s.grid.length) return false;
  if (f === 'fan') {
    const hz = hazardCells(s);
    return fanArea(cell, lvl(s)).some((c) => hz.has(c));
  }
  if (f === 'magnet') return !!g && !lk.has(cell) && g.rank < capOf(s, g.family) && pairLanding(s, cell) >= 0;
  if (f === 'amplifier') return !!g && isShooter(g.family) && !lk.has(cell);
  if (f === 'signal_beacon') return goLine(cell, axis, lvl(s)).some((c) => s.grid[c] && !lk.has(c));
  return false;
}

/** Fire the Support card at `cell` (ignored by Battery) along `axis` (Beacon). */
export function useSupport(s: GameState, cell: number, axis: Axis = 'row'): CommandResult {
  const ev: GameEvent[] = [];
  if (!canUseSupport(s, cell, axis)) return { ok: false, events: ev };
  const sp = s.support!;
  const f = sp.family, L = lvl(s);
  const need = supportNeed(s);
  if (f !== 'rewind_crank') sp.charge = f === 'blast_plate' ? 0 : (f === 'fan' && L >= 6) || ((f === 'magnet' || f === 'amplifier') && L >= 9) ? Math.floor(need / 2) : 0;
  sp.uses++;
  if (f === 'rewind_crank') {
    // roster 4 UNDO: the state text taken before your last merge goes back in full (board, tray queue, bag, HP, clock, every random generator);
    // the crank pays one charge and the undone merge does not count toward the next one
    const back = sp.charge, snapCharge = sp.snapCharge ?? 0;
    rewindRestore(s, sp.snap!);
    sp.snap = sp.snapAt = sp.snapCharge = undefined;
    sp.charge = Math.max(0, Math.min(back - need, snapCharge));
    ev.push({ type: 'rewind', ...(L >= 9 ? { peek: peekNext(s) } : {}) });
  } else if (f === 'blueprint') {
    // roster 4 PLAN: the next deliveries that are not this kind become copies of it, at number 1 (the first at number 2 from L9)
    const fam = s.grid[cell]!.family;
    blueprintSwaps(s, fam).slice(0, bpSwap(L)).forEach((u, k) => {
      const rank = bpRank(L, k === 0);
      if (u.pend !== undefined) s.pending[u.pend] = makeGadget(s, fam, rank);
      else (s.plan ??= { over: {} }).over[u.ord!] = { family: fam, rank };
    });
    ev.push({ type: 'support', family: f, cells: [cell] });
  } else if (f === 'battery') {
    sp.prime = { mult: L >= 3 ? TUNING.rb.primeL3 : TUNING.rb.prime, left: L >= 6 ? 2 : 1, any: L >= 9 };
    ev.push({ type: 'support', family: f, cells: [], mult: sp.prime.mult });
  } else if (f === 'blast_plate') {
    // roster 3 DEFENCE: ward the tapped cell (L3 a 1x2); the next boss attack that would hit it is blocked (src/core/boss.ts bossTick)
    const cells = wardCells(cell, L);
    s.wards ??= { list: [], stun: 0, blocks: 0 };
    s.wards.stun = L >= 9 ? TUNING.r3.plateStun : 0;
    s.wards.list.push({ cells, hits: wardHits(L) });
    ev.push({ type: 'support', family: f, cells });
  } else if (f === 'fan') {
    const hz = hazardCells(s);
    const cells = fanArea(cell, L).filter((c) => hz.has(c));
    ev.push({ type: 'support', family: f, cells });
    // one clear per hazard: a clamp / frost row / lock ends once, however many of its cells are in the area
    applyB1(s, { clears: cells } as CascadeResult, ev);
  } else if (f === 'magnet') {
    const twin = s.grid[cell]!;
    const land = pairLanding(s, cell);
    const g = makeGadget(s, twin.family, twin.rank);
    s.grid[land] = g;
    ev.push({ type: 'support', family: f, cells: [cell, land] }, { type: 'kickback', idx: land, into: -1, gadget: g });
    if (L >= 6) ev.push(...merge(s, land, cell).events); // Snap In: the pair merges now (no Support charge for it)
  } else if (f === 'amplifier') {
    const mult = L >= 3 ? TUNING.rb.markL3 : TUNING.rb.mark;
    const marks = [cell];
    if (L >= 6) {
      // Dual Mark: the strongest other shooter (rank, then row-major)
      let best = -1;
      s.grid.forEach((g, i) => g && i !== cell && isShooter(g.family) && !locked(s).has(i) && (best < 0 || g.rank > s.grid[best]!.rank) && (best = i));
      if (best >= 0) marks.push(best);
    }
    for (const i of marks) s.grid[i]!.amp = Math.max(s.grid[i]!.amp ?? 0, mult);
    ev.push({ type: 'support', family: f, cells: marks, mult });
  } else if (f === 'signal_beacon') {
    const lk = locked(s);
    const cells = goLine(cell, axis, L).filter((c) => s.grid[c] && !lk.has(c));
    ev.push({ type: 'support', family: f, cells });
    const result = resolveCascade(s.grid, cells[0], { perks: s.perks, overdrive: s.odLeft > 0, reserved: new Set(dropReserved(s)), locked: lk, ...bossCascadeMods(s.boss), unitMult: s.unitMult, unitLevel: s.unitLevel, fireBase: s.fireCount, roots: cells.slice(1), wake: true, ...torchOpt(s), ...(L >= 3 ? { goKick: TUNING.rb.goKick } : {}) });
    applyMoves(s, result);
    applyB1(s, result, ev);
    s.stats.biggestChain = Math.max(s.stats.biggestChain, result.count);
    ev.push({ type: 'cascade', result, damage: result.total, overdriveStart: false, kickback: false });
    applyDamage(s, result.total, ev, 'player');
    if (s.phase === 'playing') ev.push(...bossAfterPlayer(s.boss, -1, result.activations.map((x) => x.idx)));
  }
  return { ok: true, events: ev };
}

/** A simple bot policy for the sims / tests: the target a sensible player would tap now, or null (keep charging). */
export function autoSupport(s: GameState): { cell: number; axis: Axis } | null {
  if (!supportReady(s)) return null;
  const f = s.support!.family;
  const cells = s.grid.map((_, i) => i);
  const pick = (score: (i: number) => number, axis: Axis = 'row') => {
    let best = -1, bs = 0;
    for (const i of cells) {
      const v = canUseSupport(s, i, axis) ? score(i) : 0;
      if (v > bs) [best, bs] = [i, v];
    }
    return best >= 0 ? { cell: best, axis, score: bs } : null;
  };
  if (f === 'battery') return { cell: -1, axis: 'row' };
  if (f === 'rewind_crank') return null; // the bot decides when to undo (tools/squad-swap.ts): it needs the merge's result
  if (f === 'blueprint') {
    // a lonely number-1 part (odd count of its kind) gets a twin delivered; machines first
    const n = new Map<string, number>();
    for (const g of s.grid) if (g) n.set(g.family + g.rank, (n.get(g.family + g.rank) ?? 0) + 1);
    return pick((i) => {
      const g = s.grid[i]!;
      return g.rank === 1 && n.get(g.family + 1)! % 2 ? 10 + (isShooter(g.family) || isRelay(g.family) ? 5 : 0) : 0;
    });
  }
  if (f === 'blast_plate') {
    // aim at what the boss has just warned about; nothing queued = keep the card charged
    const p = s.boss?.pending;
    if (!p) return null;
    const hit = attackCells(p.attack ?? '', p);
    return hit.length ? { cell: hit[0], axis: 'row' } : null;
  }
  if (f === 'fan') {
    const hz = hazardCells(s);
    return pick((i) => fanArea(i, lvl(s)).filter((c) => hz.has(c)).length);
  }
  if (f === 'amplifier') return pick((i) => s.grid[i]!.rank * 10 + 1);
  if (f === 'magnet') {
    // a lonely shooter / relay (odd count of its kind + number), highest number first
    const n = new Map<string, number>();
    for (const g of s.grid) if (g) n.set(g.family + g.rank, (n.get(g.family + g.rank) ?? 0) + 1);
    return pick((i) => {
      const g = s.grid[i]!;
      return (n.get(g.family + g.rank)! % 2 ? 100 : 1) + g.rank * (isShooter(g.family) || isRelay(g.family) ? 10 : 1);
    });
  }
  const row = pick((i) => goLine(i, 'row', lvl(s)).filter((c) => s.grid[c]).length, 'row');
  const col = pick((i) => goLine(i, 'col', lvl(s)).filter((c) => s.grid[c]).length, 'col');
  const best = !col || (row && row.score >= col.score) ? row : col;
  return best && best.score >= 3 ? best : null;
}
