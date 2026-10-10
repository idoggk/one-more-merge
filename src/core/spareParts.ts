// Spare Parts (TUNING.rosterB, t-9d5b7cd0): duplicates of a unit that is already at MAX level are not wasted, they become a
// wild card of that unit's rarity, spendable on the level-up of ANY unit of that rarity. Pure functions over the save shape,
// so GameScene only calls them. A card is moved, never copied: every conversion and every spend changes the totals by exactly
// the amount moved, and a second sweep with nothing new does nothing (tests/crateB.test.ts checks conservation).
import { TUNING } from '../content/tuning';
import { MAX_UNIT_LEVEL, unitDef, type Rarity } from '../content/units';

export type SpareBank = Partial<Record<Rarity, number>>;
export interface CollectionSave {
  units?: Record<string, { level: number; cards: number }>;
  spare?: SpareBank;
}

export const spareOf = (m: CollectionSave, r: Rarity) => Math.max(0, Math.floor(m.spare?.[r] ?? 0));

/** Move the cards a max-level unit holds into the Spare Parts of its rarity. Returns how many were moved (0 = nothing / flag off). */
export function sweepSpare(m: CollectionSave, unit: string): number {
  if (!TUNING.rosterB) return 0;
  const st = m.units?.[unit], def = unitDef(unit);
  if (!st || !def || st.level < MAX_UNIT_LEVEL) return 0;
  const n = Math.max(0, Math.floor(st.cards));
  if (!n) return 0;
  st.cards -= n;
  m.spare = { ...(m.spare ?? {}), [def.rarity]: spareOf(m, def.rarity) + n };
  return n;
}

/** Cards a unit can put toward its next level: its own plus (under the flag) the Spare Parts of its rarity. */
export function cardsAvailable(m: CollectionSave, unit: string): number {
  const st = m.units?.[unit], def = unitDef(unit);
  if (!st || !def) return 0;
  return st.cards + (TUNING.rosterB ? spareOf(m, def.rarity) : 0);
}

/** Pay `need` cards for the unit's next level: its own cards first, then Spare Parts. false (and nothing spent) if short. */
export function spendCards(m: CollectionSave, unit: string, need: number): boolean {
  const st = m.units?.[unit], def = unitDef(unit);
  if (!st || !def || need < 0 || cardsAvailable(m, unit) < need) return false;
  const own = Math.min(st.cards, need);
  st.cards -= own;
  const rest = need - own;
  if (rest) m.spare = { ...(m.spare ?? {}), [def.rarity]: spareOf(m, def.rarity) - rest };
  return true;
}

/** Add cards to the collection (a crate's or a Screw Yard clear's): a unit not owned yet unlocks at level 1 with the rest as
 *  cards; a helper unlock also opens its toy slot. Then duplicates past max level become Spare Parts. Returns how many cards
 *  went to Spare Parts. */
export function addCards(m: CollectionSave & { toys?: Record<string, boolean> }, cards: { unit: string; count: number }[]): number {
  m.units = m.units ?? {};
  for (const cd of cards) {
    const st = (m.units[cd.unit] = m.units[cd.unit] ?? { level: 0, cards: 0 });
    if (st.level === 0) {
      st.level = 1;
      st.cards += cd.count - 1;
      if (unitDef(cd.unit)?.slot === 'helper' && m.toys) m.toys[cd.unit] = m.toys[cd.unit] ?? false;
    } else st.cards += cd.count;
  }
  return cards.reduce((n, cd) => n + sweepSpare(m, cd.unit), 0);
}
