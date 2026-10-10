export type Family = 'cannon' | 'coil' | 'bell' | 'magnet' | 'battery' | 'fan' | 'rocket' | 'mortar' | 'arc_welder' | 'horn' | 'fuse_box' | 'amplifier' | 'signal_beacon' | Roster1Family | Roster2Family | Roster3Family;
/** Roster B batch 1 (t-9b28a794, TUNING.roster1): only reachable while the flag is on. */
export type Roster1Family = 'nail_gun' | 'jackhammer' | 'gear' | 'saw_blade';
export const ROSTER_1: Roster1Family[] = ['nail_gun', 'jackhammer', 'gear', 'saw_blade'];
/** Roster B batch 2 (t-ee4e93d7, TUNING.roster2): only reachable while the flag is on. Wrench is a passive Support (never on the board). */
export type Roster2Family = 'wrench' | 'piston' | 'spring' | 'belt_drive';
export const ROSTER_2: Roster2Family[] = ['wrench', 'piston', 'spring', 'belt_drive'];
/** Roster B batch 3 (t-e728a5a6, TUNING.roster3): only reachable while the flag is on. Blast Plate is an off-board Support card (never a board part); Tesla Tower is Legendary (needs rosterB for drops). */
export type Roster3Family = 'blowtorch' | 'pipe' | 'blast_plate' | 'tesla_tower';
export const ROSTER_3: Roster3Family[] = ['blowtorch', 'pipe', 'blast_plate', 'tesla_tower'];
export const isRoster3 = (f: Family): f is Roster3Family => (ROSTER_3 as Family[]).includes(f);
export const isRoster2 = (f: Family): f is Roster2Family => (ROSTER_2 as Family[]).includes(f);
export const FAMILIES: Family[] = ['cannon', 'coil', 'bell', 'magnet', 'battery', 'fan', 'rocket', 'mortar', 'arc_welder', 'horn', 'fuse_box', 'amplifier', 'signal_beacon', ...ROSTER_1, ...ROSTER_2, ...ROSTER_3];
export const isRoster1 = (f: Family): f is Roster1Family => (ROSTER_1 as Family[]).includes(f);
/** SHOOTER role (ChatGPT r14): Cannon (auto + chain shots) or Rocket (chain-only, x1.5); r32 adds Mortar + Arc Welder; roster B Nail Gun, Drill, Saw Blade. */
export const isShooter = (f: Family) => f === 'cannon' || f === 'rocket' || f === 'mortar' || f === 'arc_welder' || f === 'nail_gun' || f === 'jackhammer' || f === 'saw_blade' || f === 'piston' || f === 'blowtorch' || f === 'tesla_tower';
/** RELAY role: wakes OTHER families. r32 adds Horn (column) + Fuse Box (diagonals); roster B Gear (links to other Gears). */
export const isRelay = (f: Family) => f === 'coil' || f === 'bell' || f === 'horn' || f === 'fuse_box' || f === 'gear' || f === 'spring' || f === 'belt_drive' || f === 'pipe';

export type PerkId = 'twin' | 'leads' | 'encore' | 'juice' | 'quality';

export interface Gadget {
  id: number;
  family: Family;
  rank: number;
  /** Seconds until next passive shot (cannons only). */
  cd: number;
  /** Cannon primed by a Battery: next chain shot +50% (one-shot). */
  primed?: boolean;
  /** r32 Amplifier / Signal Beacon mark: next activation's hit multiplier (persists until it fires; merges keep the larger). */
  amp?: number;
  /** r25 attachment (ChatGPT ITEM_RULES): spent on activations in player-rooted cascades. */
  item?: { kind: ItemKind; charges: number };
}

/** r25 power-up items: OVERCHARGE (shooter, next 2 chain shots x1.5), SPARK (shooter wakes U/R/D/L once), CORNER (Bell wakes diagonals once). */
export type ItemKind = 'overcharge' | 'spark' | 'corner';
export const ITEM_INTRO: Record<ItemKind, number> = { overcharge: 13, spark: 26, corner: 22 };
export const itemFits = (kind: ItemKind, f: Family) => (kind === 'corner' ? f === 'bell' : f === 'cannon' || f === 'rocket');

export type Grid = (Gadget | null)[];

export interface Activation {
  id: number;
  idx: number;
  family: Family;
  rank: number;
  depth: number;
  parent: number; // idx of discovering gadget, -1 for root
  charge: number;
  contribution: number;
  /** TUNING.rosterB: the job multipliers already inside `contribution` (shown in the formula strip / over the machine). */
  jobs?: Partial<Record<JobKey, number>>;
}

/** TUNING.rosterB job multipliers: Mortar DEPTH, Rocket BURST (you merged it), Horn KICK, Arc SPREAD, Battery PRIME, Beacon GO. */
export type JobKey = 'mortar' | 'burst' | 'kick' | 'spread' | 'prime' | 'go' | 'burn' | 'storm' | 'flow';
/** TUNING.rosterB: the five helpers are off-board Support cards. */
export const SUPPORT_FAMILIES: Family[] = ['fan', 'magnet', 'battery', 'amplifier', 'signal_beacon'];
export const isSupport = (f: Family) => SUPPORT_FAMILIES.includes(f) || f === 'blast_plate';

export interface CascadeResult {
  rootIdx: number;
  activations: Activation[];
  /** Every route emitted (including to already-visited gadgets), for drawing links. */
  edges: { from: number; to: number; kind: 'spark' | 'coil' | 'bell' | 'magnet' | 'battery' | 'fan' | 'backfire' | 'bridge' | 'chime' | 'item' | 'horn' | 'fuse_box' | 'arc' | 'amp' | 'gear' | 'hop' | 'belt' | 'pipe' }[];
  /** Cannons primed by batteries during this cascade (ids). Caller applies. */
  primes: number[];
  /** r32 perks: chain fires per family in this cascade (feeds the 'every Nth fire' milestone counters). */
  fires?: Record<string, number>;
  /** r32: Amplifier / Beacon marks placed this cascade (spent: already used later in this same cascade), and marks spent. Caller applies. */
  amps?: { id: number; mult: number; spent?: boolean }[];
  ampsUsed?: number[];
  /** r25: ids whose attachment spent one charge in this cascade. Caller decrements. */
  itemUsed?: number[];
  /** Primed cannons that fired in this cascade (ids). Caller clears their prime. */
  discharged: number[];
  /** Magnet pulls / fan pushes performed during the cascade, in order. Caller applies them to the real grid. */
  moves: { from: number; to: number; id: number }[];
  count: number;
  comboMult: number;
  total: number;
  /** Units B1: hazard cells a Fan cleared (caller ends those hazards), and parts a Magnet fetched (caller queues them). */
  clears?: number[];
  fetch?: number;
  /** EXPERIMENT optionA2/A3 spam fatigue: damage share applied (< 1 only); the UI dims the number. */
  fatigue?: number;
  /** Roster B Drill: damage it pushed through a closed shield (already in `total`). */
  pierced?: number;
  /** Roster 2 Wrench: ranks it added (for effects only) to the merged part in this cascade. */
  wrenchBoost?: number;
  /** Roster 3 Blowtorch: one cell per hazard its shots burned (junk / clamp / frost / bomb / slick); the caller ends them (game.ts applyB1). */
  burned?: number[];
}
