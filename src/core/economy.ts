/**
 * Bolts: the one spendable resource (ChatGPT r12 HOME_AND_ECONOMY.md). Cosmetic only, so the balanced
 * deterministic run (sim: novice ~82%) is never touched. Paid once per finished run.
 */
export interface RunSummary {
  /** Unpaused playing seconds. */
  activeSec: number;
  /** Valid player merges. */
  merges: number;
  bossesDefeated: number;
  fullClear: boolean;
  /** Distinct activations in the run's biggest cascade. */
  bestChain: number;
  /** Clock ran out or every target cleared (not abandoned). */
  completed: boolean;
}

export interface Payout {
  base: number;
  bosses: number;
  chain: number;
  clear: number;
  daily: number;
  onboarding: number;
  total: number;
}

export const ONBOARDING_BOLTS = 12;
export const DAILY_BOLTS = 8;

export const chainBonus = (n: number) => (n >= 20 ? 6 : n >= 10 ? 4 : n >= 5 ? 2 : 0);

/** Base needs 30 active seconds and 3 merges, so merge-and-quit cannot farm; bosses and a full clear always pay. */
export const isEligible = (r: RunSummary) => r.activeSec >= 30 && r.merges >= 3;

export function runPayout(r: RunSummary, opts: { dailyUnclaimed?: boolean; onboardingUnclaimed?: boolean } = {}): Payout {
  const eligible = isEligible(r);
  const base = eligible ? 6 : 0;
  const bosses = 4 * r.bossesDefeated;
  const chain = eligible || r.bossesDefeated > 0 ? chainBonus(r.bestChain) : 0;
  const clear = r.fullClear ? 8 : 0;
  const daily = opts.dailyUnclaimed && r.completed && (eligible || r.fullClear) ? DAILY_BOLTS : 0;
  const onboarding = opts.onboardingUnclaimed && eligible ? ONBOARDING_BOLTS : 0;
  return { base, bosses, chain, clear, daily, onboarding, total: base + bosses + chain + clear + daily + onboarding };
}

/** Starter catalog: chassis finishes (one equipped at a time) + a nameplate. Independent purchases, no ladder. */
export interface CatalogItem {
  id: string;
  name: string;
  price: number;
  slot: 'finish' | 'nameplate' | 'ornament' | 'stage';
  /** Multiply tint for the chassis only (never the family modules). */
  tint?: number;
}
export const CATALOG: CatalogItem[] = [
  { id: 'brass_kit', name: 'Brass Kit', price: 20, slot: 'finish', tint: 0xffe6a8 },
  { id: 'cherry_paint', name: 'Cherry Paint', price: 35, slot: 'finish', tint: 0xffb0b0 },
  { id: 'mint_paint', name: 'Mint Paint', price: 35, slot: 'finish', tint: 0xb4f5d2 },
  { id: 'cobalt_paint', name: 'Cobalt Paint', price: 35, slot: 'finish', tint: 0xa8c8ff },
  { id: 'nameplate', name: 'Nameplate', price: 75, slot: 'nameplate' },
  { id: 'copper_kit', name: 'Copper Kit', price: 90, slot: 'finish', tint: 0xffbf94 },
  { id: 'night_paint', name: 'Night Paint', price: 110, slot: 'finish', tint: 0xb8a0d8 },
  { id: 'master_finish', name: 'Master Finish', price: 140, slot: 'finish', tint: 0xfff0a0 },
  // r17 long-term sinks: hero-only ornaments (never deliveries, no battle effect)
  { id: 'brass_whistle', name: 'Brass Whistle', price: 250, slot: 'ornament', tint: 0xe8b84a },
  { id: 'violet_pennant', name: 'Violet Pennant', price: 450, slot: 'ornament', tint: 0x8e58c9 },
  { id: 'clockwork_finial', name: 'Clockwork Finial', price: 700, slot: 'ornament', tint: 0x27a4c0 },
  // r17/r18 workshop stages: MACHINE-tab backdrops only (never the gameplay board)
  { id: 'mint', name: 'Mint Stage', price: 450, slot: 'stage', tint: 0xb4f5d2 },
  { id: 'night_shift', name: 'Night Shift', price: 750, slot: 'stage', tint: 0x5a4a8a },
  { id: 'showroom', name: 'Showroom', price: 1200, slot: 'stage', tint: 0xfff3dc },
];

export interface Wallet {
  bolts: number;
  owned: string[];
  finish: string | null;
}

/** Atomic buy: deducts and grants together, or does nothing. */
export function buy(w: Wallet, id: string): boolean {
  const item = CATALOG.find((c) => c.id === id);
  if (!item || w.owned.includes(id) || w.bolts < item.price) return false;
  w.bolts -= item.price;
  w.owned.push(id);
  return true;
}
