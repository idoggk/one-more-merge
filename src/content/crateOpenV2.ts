// CRATE OPENING V2 (TUNING.crateOpenV2, default OFF; docs/art/CRATE_OPENING_V2.md). Pure data + maths: every duration of the sequence lives in
// OPEN_V2 below (presentation reads it, tests/crateOpenV2.test.ts pins it). Nothing here touches game state.
import type { Rarity } from './units';

/** Beats in play order. */
export const BEATS = ['anticipation', 'shake', 'pop', 'flash', 'hero', 'heroHold', 'gather', 'settle'] as const;
export type BeatId = (typeof BEATS)[number];

/** The one config table (ms). `gather` is per card: the beat lasts (cards - 1) * gatherStagger + gatherFly. */
export const OPEN_V2 = {
  anticipation: 400, // crate squashes down and winds up, glow wakes
  shake: 800, // rising shake, glow + rays charge, pitch climbs
  pop: 260, // the lid lifts off and light shoots out of the seam while the crate is still on screen
  flash: 150, // white flash + particle burst, the crate is gone
  hero: 600, // the best reward pops in big and centred with rarity rays (never shortened)
  /** Hero rest by rarity (ms): the better the card, the longer it is held. A tap shortens it. */
  heroHoldByRarity: { common: 400, rare: 600, epic: 900, legendary: 1300 } as Record<Rarity, number>,
  gatherStagger: 110, // gap between cards leaving for the grid
  gatherFly: 380, // one card's flight into its slot
  settle: 250, // COLLECT fades in
  tapSpeed: 3, // a tap runs the current (speedable) beat this many times faster
  /** Beats a tap may speed. The hero pop is deliberately NOT one of them: it can never be skipped or shortened. */
  speedable: { anticipation: true, shake: true, pop: false, flash: false, hero: false, heroHold: true, gather: true, settle: false } as Record<BeatId, boolean>,
  /** Cue points (fraction of the beat) for sound; the presentation fires them once. */
  shakeTicks: 6, // chestShake knocks across the shake beat, pitch climbs
  /** Max shake angle (deg) at the end of the shake beat, and the start angle. */
  shakeDeg: [4, 13] as [number, number],
  burstSparks: 44,
  grid: { cols: 3, gap: 10, rowGap: 24, margin: 14, maxScale: 1.45 },
} as const;

/** Duration of one beat in ms for `cards` cards in total. `sped` = the player tapped during it. */
export function beatDuration(id: BeatId, cards: number, sped = false, hero: Rarity = 'rare'): number {
  const base = id === 'gather' ? Math.max(0, cards - 1) * OPEN_V2.gatherStagger + OPEN_V2.gatherFly : id === 'heroHold' ? OPEN_V2.heroHoldByRarity[hero] : OPEN_V2[id];
  return sped && OPEN_V2.speedable[id] ? base / OPEN_V2.tapSpeed : base;
}

/** Start time of every beat (ms after the tap) given which beats were sped. */
export function beatStarts(cards: number, sped: Partial<Record<BeatId, boolean>> = {}, hero: Rarity = 'rare'): Record<BeatId, number> {
  const out = {} as Record<BeatId, number>;
  let t = 0;
  for (const id of BEATS) {
    out[id] = t;
    t += beatDuration(id, cards, !!sped[id], hero);
  }
  return out;
}

export const totalMs = (cards: number, sped: Partial<Record<BeatId, boolean>> = {}, hero: Rarity = 'rare') => {
  const s = beatStarts(cards, sped, hero);
  return s.settle + beatDuration('settle', cards);
};

const TIER: Record<Rarity, number> = { common: 0, rare: 1, epic: 2, legendary: 3 };

/** The single best reward: highest rarity, then a NEW unit, then more copies, then the earliest card. Returns its index (-1 for no cards). */
export function pickHero(cards: { rarity: Rarity; isNew?: boolean; count: number }[]): number {
  let best = -1;
  const score = (c: { rarity: Rarity; isNew?: boolean; count: number }) => TIER[c.rarity] * 1000 + (c.isNew ? 100 : 0) + Math.min(99, c.count);
  cards.forEach((c, i) => {
    if (best < 0 || score(c) > score(cards[best])) best = i;
  });
  return best;
}

/** Summary order: hero first, then the rest by rarity (best first), ties in dealt order. Returns indices into `cards`. */
export function summaryOrder(cards: { rarity: Rarity }[], hero: number): number[] {
  const rest = cards.map((_, i) => i).filter((i) => i !== hero);
  rest.sort((a, b) => TIER[cards[b].rarity] - TIER[cards[a].rarity] || a - b);
  return hero >= 0 ? [hero, ...rest] : rest;
}

export interface GridSlot {
  x: number;
  y: number;
}
/** A neat 3-column grid of `n` cards (last row centred) that fits between `top` and `bottom`; `scale` is relative to a 176 x 220 card. */
export function gridLayout3(n: number, W: number, top: number, bottom: number): { slots: GridSlot[]; scale: number; cw: number; ch: number } {
  const { cols, gap, rowGap, margin } = OPEN_V2.grid;
  const rows = Math.max(1, Math.ceil(n / cols));
  const maxW = (W - margin * 2 - gap * (cols - 1)) / cols;
  const fitH = ((bottom - top - rowGap * (rows - 1)) / rows) / 220;
  const scale = Math.min(maxW / 176, fitH, OPEN_V2.grid.maxScale);
  const cw = 176 * scale, ch = 220 * scale;
  const gridH = rows * ch + (rows - 1) * rowGap;
  const y0 = top + (bottom - top - gridH) / 2;
  const slots: GridSlot[] = [];
  for (let k = 0; k < n; k++) {
    const r = Math.floor(k / cols), inRow = Math.min(cols, n - r * cols);
    slots.push({ x: W / 2 + ((k % cols) - (inRow - 1) / 2) * (cw + gap), y: y0 + r * (ch + rowGap) + ch / 2 });
  }
  return { slots, scale, cw, ch };
}
