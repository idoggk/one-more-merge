// UNIT COLLECTION (round 32, Ido: "getting new units and leveling them up should be one of the biggest
// monetization values"). Cards come from crates; the first card of a unit unlocks it; duplicates + Bolts level it.
// Every number here is a tuning knob — change balance here first.
import type { Family } from '../core/types';

export type Rarity = 'common' | 'rare' | 'epic';
export interface UnitDef {
  id: Family;
  role: 'SHOOTER' | 'RELAY' | 'MOVER' | 'SUPPORT';
  rarity: Rarity;
  /** Squad slot the unit fills. */
  slot: 'shooter' | 'relay' | 'helper';
}

export const UNITS: UnitDef[] = [
  { id: 'cannon', role: 'SHOOTER', rarity: 'common', slot: 'shooter' },
  { id: 'coil', role: 'RELAY', rarity: 'common', slot: 'relay' },
  { id: 'bell', role: 'RELAY', rarity: 'common', slot: 'relay' },
  { id: 'rocket', role: 'SHOOTER', rarity: 'rare', slot: 'shooter' },
  { id: 'magnet', role: 'MOVER', rarity: 'rare', slot: 'helper' },
  { id: 'battery', role: 'SUPPORT', rarity: 'rare', slot: 'helper' },
  { id: 'fan', role: 'MOVER', rarity: 'rare', slot: 'helper' },
];
export const STARTER_UNITS: Family[] = ['cannon', 'coil', 'bell'];
export const MAX_UNIT_LEVEL = 10;

/** Duplicates and Bolts to go from level L to L+1 (index L-1). */
export const LEVEL_CARDS = [2, 4, 8, 15, 25, 40, 60, 90, 130];
export const LEVEL_BOLTS = [20, 40, 80, 150, 250, 400, 600, 900, 1300];
/** Rarer units need fewer duplicates per level. */
export const RARITY_CARD_MULT: Record<Rarity, number> = { common: 1, rare: 0.5, epic: 0.25 };

export const cardsFor = (u: UnitDef, level: number) => Math.max(1, Math.ceil((LEVEL_CARDS[level - 1] ?? 999) * RARITY_CARD_MULT[u.rarity]));
export const boltsFor = (level: number) => LEVEL_BOLTS[level - 1] ?? 99999;
/** Damage multiplier a unit's level gives its machines (level 1 = x1). */
export const levelMult = (level: number) => 1 + 0.06 * (Math.max(1, level) - 1);

// ---- crates ----
export type CrateKind = 'wood' | 'iron' | 'gold';
export const CRATES: Record<CrateKind, { name: string; cards: number; rareMin: number; epicChance: number }> = {
  wood: { name: 'WOOD CRATE', cards: 3, rareMin: 0, epicChance: 0 },
  iron: { name: 'IRON CRATE', cards: 8, rareMin: 1, epicChance: 0.03 },
  gold: { name: 'GOLD CRATE', cards: 20, rareMin: 3, epicChance: 0.12 },
};
/** Base odds per card before guarantees. */
export const RARITY_ODDS: Record<Rarity, number> = { common: 0.78, rare: 0.2, epic: 0.02 };
export const SHOP = {
  boltCrate: { kind: 'wood' as CrateKind, bolts: 120 },
  gemCrates: [
    { kind: 'iron' as CrateKind, gems: 60 },
    { kind: 'gold' as CrateKind, gems: 200 },
  ],
  /** Mock store: no real payments yet. */
  gemPacks: [
    { gems: 80, price: '$0.99' },
    { gems: 500, price: '$4.99' },
    { gems: 1200, price: '$9.99' },
  ],
};
