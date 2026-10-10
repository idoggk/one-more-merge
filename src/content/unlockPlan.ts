// UNLOCK PLAN (t-c78bf16f; docs/ROSTER.md section 6), live only while TUNING.rosterUnlocks is on. Tune here first.
// 80 levels = 8 chapters x 10. Starters (Cannon, Coil, Bell, Fan) are in the save from the start. Nothing new in L2-6.
// Boss and level gifts are listed below; every other unit comes from crates, and a crate drops a unit only while its batch is
// enabled (units.ts UNITS) AND a crate tier that can drop its rarity is open.
import type { CrateKind } from './units';

/** A unit handed over on the first clear of `level` (boss levels end a chapter). `tip` = GOOD HERE line used when no level after the
 *  gift matches the unit's own GOOD HERE rule (content/roster1..7.ts GOOD_WHY). */
export interface UnitGift {
  level: number;
  unit: string;
  tip: string;
}
export const UNIT_GIFTS: UnitGift[] = [
  { level: 10, unit: 'nail_gun', tip: 'a quiet board: keep its row full' },
  { level: 13, unit: 'wrench', tip: 'after a rank 3+ merge your next merge counts +1 rank' },
  { level: 20, unit: 'jackhammer', tip: 'a shield level: its hits ignore the shield' },
  { level: 25, unit: 'gear', tip: 'any level: two Gears link across the board' },
  { level: 30, unit: 'saw_blade', tip: 'a broken-up middle: the ring is not' },
  { level: 35, unit: 'blowtorch', tip: 'hazards in its column: x1.5 each' },
  { level: 40, unit: 'blast_plate', tip: 'a boss level: block its next attack' },
  { level: 50, unit: 'signal_beacon', tip: 'any chain level: every relay can reach the chosen shooter' },
];

/** Highest level cleared before each crate tier opens (the boss that opens it is the level itself). Tool Bag / Toolbox / Tool Chest / Golden Workbench. */
export const TIER_OPEN_LEVEL: Record<CrateKind, number> = { wood: 10, iron: 20, gold: 30, bench: 50 };
export const TIER_ORDER: CrateKind[] = ['wood', 'iron', 'gold', 'bench'];
