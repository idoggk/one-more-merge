// UNIT COLLECTION (round 32, Ido: "getting new units and leveling them up should be one of the biggest
// monetization values"). Cards come from crates (earned or bought with Gems) and Bolt packs; the first card of a
// unit unlocks it; duplicates + Bolts level it. Numbers: ChatGPT round 32 spec (reviewed). Tune here first.
import type { Family } from '../core/types';
import { TUNING } from './tuning';

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
  { id: 'horn', role: 'RELAY', rarity: 'common', slot: 'relay' },
  { id: 'fan', role: 'MOVER', rarity: 'common', slot: 'helper' },
  { id: 'rocket', role: 'SHOOTER', rarity: 'rare', slot: 'shooter' },
  { id: 'mortar', role: 'SHOOTER', rarity: 'rare', slot: 'shooter' },
  { id: 'fuse_box', role: 'RELAY', rarity: 'rare', slot: 'relay' },
  { id: 'magnet', role: 'MOVER', rarity: 'rare', slot: 'helper' },
  { id: 'battery', role: 'SUPPORT', rarity: 'rare', slot: 'helper' },
  { id: 'amplifier', role: 'SUPPORT', rarity: 'rare', slot: 'helper' },
  { id: 'arc_welder', role: 'SHOOTER', rarity: 'epic', slot: 'shooter' },
  { id: 'signal_beacon', role: 'SUPPORT', rarity: 'epic', slot: 'helper' },
];
export const unitDef = (id: string) => UNITS.find((u) => u.id === id);
export const STARTER_UNITS: Family[] = ['cannon', 'coil', 'bell', 'fan'];
export const MAX_UNIT_LEVEL = 10;

/** Duplicates and Bolts to go from level L to L+1 (index L-1), per rarity. */
export const LEVEL_CARDS: Record<Rarity, number[]> = {
  common: [2, 4, 6, 10, 16, 24, 36, 52, 75],
  rare: [1, 2, 3, 5, 8, 12, 18, 26, 38],
  epic: [1, 1, 2, 3, 4, 6, 9, 13, 19],
};
export const LEVEL_BOLTS: Record<Rarity, number[]> = {
  common: [20, 35, 55, 90, 140, 220, 340, 500, 750],
  rare: [25, 40, 65, 105, 165, 250, 380, 560, 820],
  epic: [30, 50, 80, 125, 190, 290, 430, 630, 900],
};
export const cardsFor = (u: UnitDef, level: number) => LEVEL_CARDS[u.rarity][level - 1] ?? 9999;
export const boltsFor = (u: UnitDef, level: number) => LEVEL_BOLTS[u.rarity][level - 1] ?? 99999;
/** Damage multiplier a unit's level gives (shooters +4%/level, relays +2%/level, helpers level their utility instead). */
export const levelMult = (u: UnitDef | undefined, level: number) => (!u ? 1 : u.slot === 'shooter' ? 1 + 0.04 * (level - 1) : u.slot === 'relay' ? 1 + 0.02 * (level - 1) : 1);
/** Helper multipliers by unit level, same formulas as core/cascade.ts (Battery: +0.03/level, L3 High Voltage +0.20). */
export const helperMult = {
  battery: (level: number) => TUNING.batteryBonus + 0.03 * (level - 1) + (level >= 3 ? 0.2 : 0),
  amplifier: (level: number) => 1.3 + 0.03 * (level - 1),
  signal_beacon: (level: number) => 1.15 + 0.02 * (level - 1),
};
/** What a level gives, in words (unit detail page). */
export const levelPerkText = (u: UnitDef, level: number) =>
  u.slot === 'shooter' ? `Damage +${4 * (level - 1)}%` : u.slot === 'relay' ? `Relay hits +${2 * (level - 1)}%` : u.id === 'amplifier' ? `Mark x${helperMult.amplifier(level).toFixed(2)}` : u.id === 'signal_beacon' ? `Marks x${helperMult.signal_beacon(level).toFixed(2)}` : u.id === 'battery' ? `Prime x${helperMult.battery(level).toFixed(2)}` : `Level ${level}`;

// ---- crates ----
export type CrateKind = 'wood' | 'iron' | 'gold';
export const CRATES: Record<CrateKind, { name: string; cards: number; rareMin: number }> = {
  wood: { name: 'WOOD CRATE', cards: 3, rareMin: 0 },
  iron: { name: 'IRON CRATE', cards: 8, rareMin: 1 },
  gold: { name: 'GOLD CRATE', cards: 20, rareMin: 4 },
};
export const RARITY_ODDS: Record<Rarity, number> = { common: 0.72, rare: 0.24, epic: 0.04 };
/** Shared epic pity: dry Iron +1, dry Gold +3; at 6 the next Iron/Gold forces an Epic (a missing one first). */
export const EPIC_PITY = { iron: 1, gold: 3, wood: 0, at: 6 };
/** New-unit pity: after this many crates in a row with no new unit, the best guaranteed slot is a missing unit. */
export const NEW_UNIT_PITY = 3;

export const SHOP = {
  gemCrates: [
    { kind: 'iron' as CrateKind, gems: 60 },
    { kind: 'gold' as CrateKind, gems: 200 },
  ],
  /** Bolt packs: cards for the role you choose / the featured unit of the day. */
  boltPacks: [
    { id: 'role', name: 'ROLE PACK', bolts: 150, cards: 5, featuredMin: 0 },
    { id: 'featured', name: 'FEATURED PACK', bolts: 450, cards: 14, featuredMin: 8 },
    { id: 'big', name: 'BIG FEATURED', bolts: 900, cards: 30, featuredMin: 18 },
  ],
  /** Mock store: no real payments yet. */
  gemPacks: [
    { gems: 80, price: '$0.99' },
    { gems: 500, price: '$4.99' },
    { gems: 1200, price: '$9.99' },
  ],
};
/** r38 COLLECTION MILESTONES (ChatGPT review): every unlock and level-up visibly advances a goal. In order. */
export const COLLECTION_GOALS: { kind: 'own' | 'levels'; n: number; reward: { bolts?: number; gems?: number; crate?: CrateKind } }[] = [
  { kind: 'own', n: 6, reward: { bolts: 150 } },
  { kind: 'levels', n: 25, reward: { crate: 'wood' } },
  { kind: 'own', n: 8, reward: { crate: 'iron' } },
  { kind: 'levels', n: 35, reward: { bolts: 300 } },
  { kind: 'own', n: 10, reward: { gems: 30 } },
  { kind: 'levels', n: 50, reward: { crate: 'iron' } },
  { kind: 'own', n: 13, reward: { crate: 'gold' } },
  { kind: 'levels', n: 70, reward: { gems: 60 } },
  { kind: 'levels', n: 100, reward: { crate: 'gold' } },
];

/** r40 FEATURED CRATE (ChatGPT): Gems can target one unit. Rotates every 48 h among non-starters (owned or not).
 *  An Iron-crate roll where a card of the featured unit's rarity becomes the featured unit 60% of the time; a featured
 *  copy is guaranteed within every FEATURED_PITY crates (the counter resets when one drops). */
export const FEATURED_CRATE = { gems1: 120, gems5: 540, share: 0.6, pity: 5, hours: 48 };

/** Free Gems (ChatGPT r32, ~7/day for an active player). */
export const GEM_REWARDS = { dailyBench: 2, allBounties: 2, rushFull: 20, chapterBoss: 5 };

/** L3 / L6 / L9 milestone perks (ChatGPT r32, implemented in core/cascade.ts). */
export const UNIT_PERKS: Record<string, [string, string][]> = {
  cannon: [['Heavy Barrel', 'Rank 4+ chain shots x1.2'], ['Lucky Eight', 'Every 8th chain shot x2'], ['Big Loader', 'Rank 7-8 auto-shots x2']],
  rocket: [['Warhead', 'Rank 4+ hits x1.15'], ['Sixth Salvo', 'Every 6th fire x1.5'], ['Deep Burn', 'Rank 7-8 four links deep x1.35']],
  mortar: [['Bigger Shell', 'Rank 4+ depth cap x1.80'], ['High Arc', 'Every 6th fire counts 2 links deeper'], ['Siege Shot', 'Rank 7-8 always hits as 4 deep']],
  arc_welder: [['Hot Arc', 'Rank 4+ own shot x0.9'], ['Forked Arc', 'Every 5th fire arcs once more'], ['Twin Arc', 'Rank 7-8 arcs to two machines']],
  coil: [['Long Coil', 'Rank 5+ reaches 3 cells'], ['Static Leak', 'Every 6th fire also wakes its diagonals'], ['Supercoil', 'Rank 7-8 reaches 4 cells']],
  bell: [['Side Chime', 'Rank 4+ also wakes above + below'], ['Grand Chime', 'Every 6th ring wakes the rows above + below'], ['Cathedral Bell', 'Rank 7-8 rings row AND column']],
  horn: [['Side Blast', 'Rank 4+ also wakes left + right'], ['Brassquake', 'Every 6th blast wakes the side columns'], ['Grand Horn', 'Rank 7-8 blasts column AND row']],
  fuse_box: [['Long Fuse', 'Rank 4+ also sparks 2 cells diagonally'], ['Cross Spark', 'Every 5th spark also wakes up/down/left/right'], ['Fuse Rays', 'Rank 7-8 sparks full diagonals']],
  magnet: [['Strong Magnet', 'Pulls from 1 cell further'], ['Double Pull', 'Every 4th fire pulls twice'], ['Snap In', 'Rank 6 wakes what it pulled']],
  battery: [['High Voltage', 'Primes +0.20 stronger'], ['Twin Charge', 'Every 5th fire primes two shooters'], ['Universal Socket', 'Always primes two touching shooters']],
  fan: [['Strong Gust', 'Rank 4+ pushes 2 cells'], ['Double Gust', 'Every 4th fire pushes twice'], ['Launch', 'Rank 6 wakes what it pushed']],
  amplifier: [['Wide Pickup', 'Rank 4+ marks diagonal neighbours too'], ['Dual Channel', 'Every 5th fire marks two'], ['Long Range', 'Rank 6 marks 2 cells away']],
  signal_beacon: [['Third Signal', 'Rank 4+ also marks the nearest helper'], ['Broadcast Boost', 'Every 6th fire marks +0.25'], ['GO! Signal', 'Rank 6 also wakes what it marks']],
};
