// SCREW YARD BOOK (TUNING.yardBook, default OFF): "Dismantle and Collect". Pure + deterministic (no Phaser).
// Stars come from the tap budget and the holding-row peak, the saved best stars per object live in meta.yardBook, and
// the objects unlock in a chain (Cannon, then Coil, then Bell). The numbers' homes: STAR / TAP constants below,
// card counts in src/content/yardObjects.ts (TAKEN_APART_CARDS, THREE_STAR_MULT).

/** The chain order; each object needs 1+ stars on the one before it. */
export const BOOK_ORDER = ['cannon', 'coil', 'bell'] as const;
export type BookUnit = (typeof BOOK_ORDER)[number];

/** Tap budget = screws x TAP_PER_SCREW + TAP_SLACK (rounded up). Wasted taps on blocked / turned-away screws count. */
export const TAP_PER_SCREW = 1.3;
export const TAP_SLACK = 4;
/** 3 stars need the holding row never to hold more than this many screws. */
export const BOOK_PEAK = 2;

export const tapBudget = (screws: number) => Math.ceil(screws * TAP_PER_SCREW + TAP_SLACK);

/** 3 = within the budget AND row peak <= BOOK_PEAK; 2 = either; 1 = a win. (Call it for a won object.) */
export function bookStars(taps: number, budget: number, peak: number): 1 | 2 | 3 {
  const tapsOk = taps <= budget, peakOk = peak <= BOOK_PEAK;
  return tapsOk && peakOk ? 3 : tapsOk || peakOk ? 2 : 1;
}

/** Saved record: best stars (1..3) per unit; a unit never cleared is absent. */
export type BookRec = Partial<Record<BookUnit, number>>;

/** Migration: anything that is not a record of 1..3 stars per known unit reads as empty (old saves have no field). */
export function readBook(raw: unknown): BookRec {
  const out: BookRec = {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
  for (const u of BOOK_ORDER) {
    const v = (raw as Record<string, unknown>)[u];
    if (typeof v === 'number' && Number.isFinite(v) && v >= 1) out[u] = Math.min(3, Math.floor(v));
  }
  return out;
}

export const bestStars = (b: BookRec, u: BookUnit) => b[u] ?? 0;

/** Cannon is always open; each next object opens once the one before it has a star. */
export function isUnlocked(b: BookRec, u: BookUnit): boolean {
  const i = BOOK_ORDER.indexOf(u);
  return i <= 0 || bestStars(b, BOOK_ORDER[i - 1]) >= 1;
}

/** The object before `u` in the chain (what a locked tile asks you to clear), or null for the first. */
export const prerequisite = (u: BookUnit): BookUnit | null => BOOK_ORDER[BOOK_ORDER.indexOf(u) - 1] ?? null;

/** What a locked tile says: 'clear Cannon first'. */
export const lockedText = (u: BookUnit) => {
  const p = prerequisite(u) ?? u;
  return `clear ${p.charAt(0).toUpperCase()}${p.slice(1)} first`;
};

/** An object's tap budget from its screw count. */
export const budgetOf = (o: { screws: readonly unknown[] }) => tapBudget(o.screws.length);

/** `u` if it is open, else the nearest open object before it (the chain is never skipped). */
export function playable(b: BookRec, u: BookUnit): BookUnit {
  for (let i = BOOK_ORDER.indexOf(u); i > 0; i--) if (isUnlocked(b, BOOK_ORDER[i])) return BOOK_ORDER[i];
  return BOOK_ORDER[0];
}

/** Keep the best stars of a clear. Returns the stored value and whether it improved. */
export function recordStars(b: BookRec, u: BookUnit, stars: number): { best: number; improved: boolean } {
  const s = Math.max(1, Math.min(3, Math.floor(stars)));
  const was = bestStars(b, u);
  if (s > was) b[u] = s;
  return { best: b[u]!, improved: s > was };
}

/** Cards in the crate after `done` of `total` boxes: fills evenly, exactly `base` at the last box. `x2` doubles it (3 stars). */
export function crateCount(base: number, done: number, total: number, x2 = false): number {
  if (total <= 0) return 0;
  const n = done >= total ? base : Math.floor((base * Math.max(0, done)) / total);
  return n * (x2 ? 2 : 1);
}
