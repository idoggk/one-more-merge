export type Family = 'cannon' | 'coil' | 'bell' | 'magnet' | 'battery' | 'fan' | 'rocket' | 'mortar' | 'arc_welder' | 'horn' | 'fuse_box' | 'amplifier' | 'signal_beacon';
export const FAMILIES: Family[] = ['cannon', 'coil', 'bell', 'magnet', 'battery', 'fan', 'rocket', 'mortar', 'arc_welder', 'horn', 'fuse_box', 'amplifier', 'signal_beacon'];
/** SHOOTER role (ChatGPT r14): Cannon (auto + chain shots) or Rocket (chain-only, x1.5); r32 adds Mortar + Arc Welder. */
export const isShooter = (f: Family) => f === 'cannon' || f === 'rocket' || f === 'mortar' || f === 'arc_welder';
/** RELAY role: wakes OTHER families. r32 adds Horn (column) + Fuse Box (diagonals). */
export const isRelay = (f: Family) => f === 'coil' || f === 'bell' || f === 'horn' || f === 'fuse_box';

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
}

export interface CascadeResult {
  rootIdx: number;
  activations: Activation[];
  /** Every route emitted (including to already-visited gadgets), for drawing links. */
  edges: { from: number; to: number; kind: 'spark' | 'coil' | 'bell' | 'magnet' | 'battery' | 'fan' | 'backfire' | 'bridge' | 'chime' | 'item' | 'horn' | 'fuse_box' | 'arc' | 'amp' }[];
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
}
