export type Family = 'cannon' | 'coil' | 'bell';
export const FAMILIES: Family[] = ['cannon', 'coil', 'bell'];

export type PerkId = 'twin' | 'leads' | 'encore' | 'juice' | 'quality';

export interface Gadget {
  id: number;
  family: Family;
  rank: number;
  /** Seconds until next passive shot (cannons only). */
  cd: number;
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
  edges: { from: number; to: number; kind: 'spark' | 'coil' | 'bell' }[];
  count: number;
  comboMult: number;
  total: number;
}
