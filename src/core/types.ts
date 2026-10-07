export type Family = 'cannon' | 'coil' | 'bell' | 'magnet' | 'battery' | 'fan' | 'rocket';
export const FAMILIES: Family[] = ['cannon', 'coil', 'bell', 'magnet', 'battery', 'fan', 'rocket'];
/** SHOOTER role (ChatGPT r14): Cannon (auto + chain shots) or Rocket (chain-only, x1.5). */
export const isShooter = (f: Family) => f === 'cannon' || f === 'rocket';

export type PerkId = 'twin' | 'leads' | 'encore' | 'juice' | 'quality';

export interface Gadget {
  id: number;
  family: Family;
  rank: number;
  /** Seconds until next passive shot (cannons only). */
  cd: number;
  /** Cannon primed by a Battery: next chain shot +50% (one-shot). */
  primed?: boolean;
  /** r25 attachment (ChatGPT ITEM_RULES): spent on activations in player-rooted cascades. */
  item?: { kind: ItemKind; charges: number };
}

/** r25 power-up items: OVERCHARGE (shooter, next 2 chain shots x1.5), SPARK (shooter wakes U/R/D/L once), CORNER (Bell wakes diagonals once). */
export type ItemKind = 'overcharge' | 'spark' | 'corner';
export const ITEM_INTRO: Record<ItemKind, number> = { overcharge: 13, spark: 16, corner: 22 };
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
  edges: { from: number; to: number; kind: 'spark' | 'coil' | 'bell' | 'magnet' | 'battery' | 'fan' | 'backfire' | 'bridge' | 'chime' | 'item' }[];
  /** Cannons primed by batteries during this cascade (ids). Caller applies. */
  primes: number[];
  /** r25: ids whose attachment spent one charge in this cascade. Caller decrements. */
  itemUsed?: number[];
  /** Primed cannons that fired in this cascade (ids). Caller clears their prime. */
  discharged: number[];
  /** Magnet pulls / fan pushes performed during the cascade, in order. Caller applies them to the real grid. */
  moves: { from: number; to: number; id: number }[];
  count: number;
  comboMult: number;
  total: number;
}
