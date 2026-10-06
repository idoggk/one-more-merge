export type Family = 'cannon' | 'coil' | 'bell' | 'magnet' | 'battery' | 'fan';
export const FAMILIES: Family[] = ['cannon', 'coil', 'bell', 'magnet', 'battery', 'fan'];

export type PerkId = 'twin' | 'leads' | 'encore' | 'juice' | 'quality';

export interface Gadget {
  id: number;
  family: Family;
  rank: number;
  /** Seconds until next passive shot (cannons only). */
  cd: number;
  /** Cannon primed by a Battery: next chain shot +50% (one-shot). */
  primed?: boolean;
}

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
  edges: { from: number; to: number; kind: 'spark' | 'coil' | 'bell' | 'magnet' | 'battery' | 'fan' | 'backfire' | 'bridge' | 'chime' }[];
  /** Cannons primed by batteries during this cascade (ids). Caller applies. */
  primes: number[];
  /** Primed cannons that fired in this cascade (ids). Caller clears their prime. */
  discharged: number[];
  /** Magnet pulls / fan pushes performed during the cascade, in order. Caller applies them to the real grid. */
  moves: { from: number; to: number; id: number }[];
  count: number;
  comboMult: number;
  total: number;
}
