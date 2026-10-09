/**
 * t-0a294f99 tip budget (new-player walkthrough F3: level 3 showed 8 pause cards). Every pause card (explain() card,
 * or a guide page opened at level start) in a saga level goes through one ledger:
 * - at most TIP_BUDGET.perLevel cards per level, and at most TIP_BUDGET.atStart of them before the clock runs;
 * - some lessons wait for a later level (TIP_MIN_LEVEL: the kickback lesson from L5);
 * - a tip that does not fit is NOT marked seen: its id goes on the persisted queue and the lesson shows the next
 *   time its trigger fires in a level with room.
 * Boss fights keep their own (already boss-only) lessons and are not budgeted.
 */
export const TIP_BUDGET = { perLevel: 2, atStart: 1 } as const;

/** Lessons that wait until this saga level (id prefix -> first level). */
export const TIP_MIN_LEVEL: [prefix: string, level: number][] = [['x_kick', 5]];

export interface TipLedger {
  /** Saga level being played; undefined = not budgeted (puzzles, boss fights, warm-up). */
  level?: number;
  cards: number;
  start: number;
}

export const newTipLedger = (level?: number): TipLedger => ({ level, cards: 0, start: 0 });

export const minLevelOf = (id: string) => TIP_MIN_LEVEL.find(([p]) => id.startsWith(p))?.[1] ?? 0;

/**
 * May this tip (with `cards` pause cards) show now? On yes the ledger counts it and the id leaves the queue;
 * on no the id is queued (once) for a later level. `queue` is persisted with the save (meta.tipQueue).
 */
export function admitTip(l: TipLedger, queue: string[], id: string, cards: number, atStart: boolean): boolean {
  if (l.level === undefined) return true;
  const ok = l.level >= minLevelOf(id) && l.cards + cards <= TIP_BUDGET.perLevel && (!atStart || l.start + cards <= TIP_BUDGET.atStart);
  const qi = queue.indexOf(id);
  if (!ok) {
    if (qi < 0) queue.push(id);
    return false;
  }
  l.cards += cards;
  if (atStart) l.start += cards;
  if (qi >= 0) queue.splice(qi, 1);
  return true;
}
