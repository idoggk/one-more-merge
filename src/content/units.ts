// UNIT COLLECTION (round 32, Ido: "getting new units and leveling them up should be one of the biggest
// monetization values"). Cards come from crates (earned or bought with Gems) and Bolt packs; the first card of a
// unit unlocks it; duplicates + Bolts level it. Numbers: ChatGPT round 32 spec (reviewed). Tune here first.
import type { Family } from '../core/types';
import { ROSTER_1_PERKS } from './roster1';
import { ROSTER_2_PERKS } from './roster2';
import { ROSTER_3_PERKS } from './roster3';
import { TUNING } from './tuning';

export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';
/** Rarities, lowest first (Legendary only has units under TUNING.rosterB; see UNITS). */
export const RARITY_ORDER: Rarity[] = ['common', 'rare', 'epic', 'legendary'];
export const RARITY_COLOR: Record<Rarity, number> = { common: 0x8a9aa8, rare: 0x3a8adf, epic: 0x9a63ff, legendary: 0xf0b020 };
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
  // t-9d5b7cd0: Epic today, Legendary under TUNING.rosterB (a live getter, like UNIT_PERKS, so the QA switch needs no reload)
  { id: 'signal_beacon', role: 'SUPPORT', get rarity(): Rarity { return TUNING.rosterB ? 'legendary' : 'epic'; }, slot: 'helper' },
];
/** Roster B batch 1 (t-9b28a794): in UNITS (collection, crates, squad pickers, seasons) only while TUNING.roster1 is on. */
export const ROSTER_1_UNITS: UnitDef[] = [
  { id: 'nail_gun', role: 'SHOOTER', rarity: 'common', slot: 'shooter' },
  { id: 'jackhammer', role: 'SHOOTER', rarity: 'rare', slot: 'shooter' },
  { id: 'gear', role: 'RELAY', rarity: 'rare', slot: 'relay' },
  { id: 'saw_blade', role: 'SHOOTER', rarity: 'epic', slot: 'shooter' },
];
/** Roster B batch 2 (t-ee4e93d7): in UNITS only while TUNING.roster2 is on. Wrench is a passive Support: it never sits on the board. */
export const ROSTER_2_UNITS: UnitDef[] = [
  { id: 'wrench', role: 'SUPPORT', rarity: 'common', slot: 'helper' },
  { id: 'piston', role: 'SHOOTER', rarity: 'common', slot: 'shooter' },
  { id: 'spring', role: 'RELAY', rarity: 'common', slot: 'relay' },
  { id: 'belt_drive', role: 'RELAY', rarity: 'epic', slot: 'relay' },
];
/** Roster B batch 3 (t-e728a5a6): in UNITS only while TUNING.roster3 is on. Blast Plate is an off-board Support card. Tesla Tower is Legendary, so it joins only while crates B (TUNING.rosterB) is on too. */
export const ROSTER_3_UNITS: UnitDef[] = [
  { id: 'blowtorch', role: 'SHOOTER', rarity: 'rare', slot: 'shooter' },
  { id: 'pipe', role: 'RELAY', rarity: 'rare', slot: 'relay' },
  { id: 'blast_plate', role: 'SUPPORT', rarity: 'rare', slot: 'helper' },
  { id: 'tesla_tower', role: 'SHOOTER', rarity: 'legendary', slot: 'shooter' },
];
const BASE_UNITS = [...UNITS];
/** Rebuild UNITS in place from the live roster flags (every reader sees it live), sorted by rarity. */
export function rebuildUnits() {
  const all = [...BASE_UNITS, ...(TUNING.roster1 ? ROSTER_1_UNITS : []), ...(TUNING.roster2 ? ROSTER_2_UNITS : []), ...(TUNING.roster3 ? ROSTER_3_UNITS.filter((u) => u.rarity !== 'legendary' || TUNING.rosterB) : [])].sort((a, b) => RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity));
  UNITS.splice(0, UNITS.length, ...all);
}
/** Switch the roster B batch 3 units in or out of UNITS (Tesla Tower also needs TUNING.rosterB; applyUnits re-runs this). */
export function applyRoster3(on: boolean) {
  TUNING.roster3 = on;
  rebuildUnits();
}
/** Switch the roster B batch 2 units in or out of UNITS. */
export function applyRoster2(on: boolean) {
  TUNING.roster2 = on;
  rebuildUnits();
}
/** Switch the roster B batch 1 units in or out of UNITS. */
export function applyRoster1(on: boolean) {
  TUNING.roster1 = on;
  rebuildUnits();
}
/** Every unit id a save may hold (flag on or off), for save repair. */
export const ALL_UNIT_IDS: string[] = [...BASE_UNITS, ...ROSTER_1_UNITS, ...ROSTER_2_UNITS, ...ROSTER_3_UNITS].map((u) => u.id);
export const unitDef = (id: string) => UNITS.find((u) => u.id === id);
export const STARTER_UNITS: Family[] = ['cannon', 'coil', 'bell', 'fan'];
export const MAX_UNIT_LEVEL = 10;

/** Duplicates and Bolts to go from level L to L+1 (index L-1), per rarity. */
export const LEVEL_CARDS: Record<Rarity, number[]> = {
  common: [2, 4, 6, 10, 16, 24, 36, 52, 75],
  rare: [1, 2, 3, 5, 8, 12, 18, 26, 38],
  epic: [1, 1, 2, 3, 4, 6, 9, 13, 19],
  /** ROSTER.md section 5 card table. */
  legendary: [1, 1, 1, 2, 2, 3, 4, 6, 8],
};
export const LEVEL_BOLTS: Record<Rarity, number[]> = {
  common: [20, 35, 55, 90, 140, 220, 340, 500, 750],
  rare: [25, 40, 65, 105, 165, 250, 380, 560, 820],
  epic: [30, 50, 80, 125, 190, 290, 430, 630, 900],
  /** DRAFT (ROSTER.md Q6: Legendary Bolts not set) = Epic x 1.5. */
  legendary: [45, 75, 120, 190, 285, 435, 645, 945, 1350],
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
  u.slot === 'shooter' ? `Damage +${4 * (level - 1)}%` : u.slot === 'relay' ? `Relay hits +${2 * (level - 1)}%` : u.id === 'amplifier' ? `Mark x${helperMult.amplifier(level).toFixed(2)}` : u.id === 'signal_beacon' ? `Marks x${helperMult.signal_beacon(level).toFixed(2)}` : u.id === 'battery' ? `Prime x${helperMult.battery(level).toFixed(2)}` : u.id === 'wrench' ? `Arms on a rank ${level >= 3 ? 2 : 3}+ merge` : u.id === 'blast_plate' ? `Blocks ${level >= 6 ? 2 : 1} attack${level >= 6 ? 's' : ''}${level >= 3 ? ', 1x2 cells' : ''}${level >= 9 ? ', stuns 2 s' : ''}` : `Level ${level}`;

// ---- crates ----
/** 'bench' = Golden Workbench: only used under TUNING.rosterB (earned Gems / the MOCK premium lane, never real money). */
export type CrateKind = 'wood' | 'iron' | 'gold' | 'bench';
export const CRATES: Record<CrateKind, { name: string; cards: number; rareMin: number }> = {
  wood: { name: 'WOOD CRATE', cards: 3, rareMin: 0 },
  iron: { name: 'IRON CRATE', cards: 8, rareMin: 1 },
  gold: { name: 'GOLD CRATE', cards: 20, rareMin: 4 },
  bench: { name: 'WORKBENCH', cards: 10, rareMin: 1 },
};
export const RARITY_ODDS: Record<Rarity, number> = { common: 0.72, rare: 0.24, epic: 0.04, legendary: 0 };
/** Shared epic pity: dry Iron +1, dry Gold +3; at 6 the next Iron/Gold forces an Epic (a missing one first). */
export const EPIC_PITY = { iron: 1, gold: 3, wood: 0, bench: 0, at: 6 };
/** t-9d5b7cd0 ROSTER B crates (docs/ROSTER.md section 5), used only while TUNING.rosterB. `mins` = the minimum rarity of the
 *  first cards (a slot below its minimum is lifted to it); `odds` = each card's own roll, summing to 1. */
export const CRATES_B: Record<CrateKind, { name: string; cards: number; mins: Rarity[]; odds: Record<Rarity, number> }> = {
  wood: { name: 'TOOL BAG', cards: 3, mins: [], odds: { common: 0.82, rare: 0.16, epic: 0.02, legendary: 0 } },
  iron: { name: 'TOOLBOX', cards: 8, mins: ['rare'], odds: { common: 0.7, rare: 0.24, epic: 0.055, legendary: 0.005 } },
  gold: { name: 'TOOL CHEST', cards: 20, mins: ['epic', 'rare', 'rare', 'rare', 'rare'], odds: { common: 0.58, rare: 0.3, epic: 0.1, legendary: 0.02 } },
  bench: { name: 'GOLDEN WORKBENCH', cards: 10, mins: ['legendary'], odds: { common: 0.5, rare: 0.32, epic: 0.14, legendary: 0.04 } },
};
/** Latch roll-up (ONE roll per Tool Bag open, decided before the contents): cumulative "or better" chances. */
export const LATCH_B = { iron: 0.25, gold: 0.03, bench: 0.0015 };
/** Per-rarity pity (DRAFT sizes, ROSTER.md Q7). A counter moves only on crates that CAN drop the rarity (step 0 = cannot, or
 *  always does); a crate that drops the rarity resets it; the crate that would fill the bar (points + step >= `at`) forces one. */
export const PITY_B: Record<'epic' | 'legendary', { at: number; step: Record<CrateKind, number> }> = {
  epic: { at: 12, step: { wood: 1, iron: 2, gold: 0, bench: 3 } },
  legendary: { at: 40, step: { wood: 0, iron: 1, gold: 10, bench: 0 } },
};
/** New-unit pity: after this many crates in a row with no new unit, the best guaranteed slot is a missing unit. */
export const NEW_UNIT_PITY = 3;

export const SHOP = {
  gemCrates: [
    { kind: 'iron' as CrateKind, gems: 60 },
    { kind: 'gold' as CrateKind, gems: 200 },
  ],
  /** ROSTER B extra Gem crate (mock economy: Gems come from play or the test store, never real payments). */
  gemCratesB: [{ kind: 'bench' as CrateKind, gems: 600 }],
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

/** L3 / L6 / L9 milestone perks (ChatGPT r32, implemented in core/cascade.ts). Under TUNING.rosterB the same keys read
 *  ROSTER_PERKS (job upgrades) instead, live, so the QA UNITS switch needs no reload. */
const UNIT_PERKS_TODAY: Record<string, [string, string][]> = {
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
  // roster B batch 1: job upgrades (core/roster1.ts)
  ...ROSTER_1_PERKS,
  // roster B batch 2 (t-ee4e93d7, core/roster2.ts)
  ...ROSTER_2_PERKS,
  // roster B batch 3 (t-e728a5a6, core/roster3.ts)
  ...ROSTER_3_PERKS,
};

/** t-e91097cd roster B: levels 3 / 6 / 9 change the unit's JOB (core/cascade.ts rbRouteCells / resolveCascade, game.ts
 *  auto-shots, core/support.ts Support cards). */
export const ROSTER_PERKS: Record<string, [string, string][]> = {
  cannon: [['Quick Loader', `Auto-shot every ${TUNING.rb.cannonQuick} s (was ${TUNING.cannonPeriod} s)`], ['Hot Shells', `Auto-shots hit x${TUNING.rb.passiveHot} of a full shot (was x${TUNING.passiveMult})`], ['Double Tap', 'Every auto-shot fires twice']],
  rocket: [['Bigger Warhead', `Merged BURST x${TUNING.rb.rocketRootL3} (was x${TUNING.rb.rocketRoot})`], ['Cluster', 'The Rocket you merge also wakes its 4 diagonal neighbours'], ['Afterburn', `Woken by a chain it hits x${TUNING.rb.rocketWokenL9} (was x${TUNING.rb.rocketWoken})`]],
  mortar: [['Bigger Shell', `DEPTH goes up to x${TUNING.rb.mortarCapL3}`], ['Last Word', 'Always fires LAST in its chain'], ['Barrage', 'After its shot it wakes the machines touching it']],
  arc_welder: [['Fork', 'Jumps to 2 shooters'], ['Hot Spark', `Shooters it jumps to hit x${TUNING.rb.spreadHit}`], ['Chain Lightning', 'Jumps to 3 shooters']],
  coil: [['Long Coil', 'Reaches 2 cells left and right too'], ['Static Leak', 'Also wakes its 4 diagonal neighbours'], ['Supercoil', 'Reaches 3 cells every way']],
  bell: [['Side Chime', 'Also wakes the cells above and below'], ['Grand Chime', 'Every 3rd ring also rings the rows above and below'], ['Bell Tower', 'Always rings the rows above and below']],
  horn: [['Brass Kick', `Shooters it wakes hit x${TUNING.rb.hornKick}`], ['Wide Blast', 'Also wakes its left and right'], ['Grand Horn', 'Also blasts both side columns']],
  fuse_box: [['Long Fuse', 'Full diagonals, edge to edge'], ['Cross Spark', 'Every 3rd spark also wakes up / down / left / right'], ['Fuse Rays', 'Always wakes up / down / left / right too']],
  fan: [['Big Gust', 'Clears 3 whole rows'], ['Tailwind', 'Keeps half its charge after a clear'], ['Storm', 'Clears the whole board']],
  magnet: [['Quick Pull', 'Needs 25% less charge'], ['Snap In', 'The twin merges at once'], ['Spare Pull', 'Keeps half its charge after a pull']],
  battery: [['High Voltage', `PRIME x${TUNING.rb.primeL3}`], ['Long Charge', 'Lasts 2 shooter merges'], ['Any Socket', 'Any merge counts, not only shooters']],
  amplifier: [['Big Mark', `MARK x${TUNING.rb.markL3}`], ['Dual Mark', 'Also marks your strongest other shooter'], ['Spare Mark', 'Keeps half its charge after a mark']],
  signal_beacon: [['Loud GO', `Shooters it fires hit x${TUNING.rb.goKick}`], ['Crossroads', 'Fires the row AND the column'], ['Quick GO', 'Needs 40% less charge']],
};
export const UNIT_PERKS: Record<string, [string, string][]> = Object.defineProperties(
  {},
  Object.fromEntries(Object.keys(UNIT_PERKS_TODAY).map((k) => [k, { get: () => (TUNING.rosterB ? ROSTER_PERKS : UNIT_PERKS_TODAY)[k], enumerable: true }])),
);
