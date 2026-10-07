// Crate + pack opening (round 32). Pure + seeded so contents are reproducible from (seed, counter).
import { CRATES, EPIC_PITY, NEW_UNIT_PITY, RARITY_ODDS, SHOP, STARTER_UNITS, UNITS, type CrateKind, type Rarity, type UnitDef } from '../content/units';
import { Rng } from './rng';
import type { Family } from './types';

export interface CrateCard {
  unit: Family;
  count: number;
  /** First copy ever of this unit (unlocks it). */
  isNew: boolean;
}
export interface PityState {
  /** Epic pity points (dry Iron +1, dry Gold +3). */
  epic: number;
  /** Crates in a row without a new unit. */
  dry: number;
}

const pool = (r: Rarity) => UNITS.filter((u) => u.rarity === r).map((u) => u.id);
const rarityOf = (f: Family) => UNITS.find((u) => u.id === f)!.rarity;

function tally(picks: Family[], owned: ReadonlySet<Family>): CrateCard[] {
  const counts = new Map<Family, number>();
  for (const u of picks) counts.set(u, (counts.get(u) ?? 0) + 1);
  return [...counts.entries()].map(([unit, count]) => ({ unit, count, isNew: !owned.has(unit) })).sort((a, b) => Number(b.isNew) - Number(a.isNew));
}

/**
 * Roll a crate (ChatGPT r32): odds 72/24/4; Iron >= 1 Rare+, Gold >= 4 Rare+; guaranteed rarity slots prefer a
 * MISSING unit of that rarity; epic pity (Iron +1 / Gold +3 when dry, forced Epic at 6, missing Epic first);
 * new-unit pity (after 3 crates without a new unit, the best guaranteed slot is a missing unit). Mutates `pity`.
 */
export function rollCrate(kind: CrateKind, owned: ReadonlySet<Family>, seed: number, pity: PityState = { epic: 0, dry: 0 }): CrateCard[] {
  const spec = CRATES[kind];
  const rng = new Rng(seed >>> 0 || 1);
  const rar: Rarity[] = [];
  for (let k = 0; k < spec.cards; k++) {
    const x = rng.next();
    rar.push(x < RARITY_ODDS.epic ? 'epic' : x < RARITY_ODDS.epic + RARITY_ODDS.rare ? 'rare' : 'common');
  }
  // guarantees fill the first slots
  for (let k = 0; k < spec.rareMin; k++) if (rar[k] === 'common') rar[k] = 'rare';
  const forcedEpic = kind !== 'wood' && pity.epic >= EPIC_PITY.at && !rar.includes('epic');
  if (forcedEpic) rar[0] = 'epic';
  const missing = (r: Rarity) => pool(r).filter((u) => !owned.has(u));
  const picks: Family[] = [];
  const used = new Set<Family>();
  rar.forEach((r, k) => {
    const guaranteed = k < Math.max(spec.rareMin, forcedEpic ? 1 : 0);
    const miss = missing(r).filter((u) => !used.has(u));
    const p = pool(r);
    const unit = guaranteed && miss.length ? miss[rng.int(miss.length)] : p[rng.int(p.length)];
    if (!owned.has(unit)) used.add(unit);
    picks.push(unit);
  });
  // new-unit pity: replace the best slot with any missing unit
  const allMissing = UNITS.filter((u) => !owned.has(u.id)).map((u) => u.id);
  if (!picks.some((u) => !owned.has(u)) && allMissing.length && pity.dry + 1 >= NEW_UNIT_PITY) picks[0] = allMissing[rng.int(allMissing.length)];
  // pity bookkeeping
  const gotEpic = picks.some((u) => rarityOf(u) === 'epic');
  pity.epic = gotEpic ? 0 : pity.epic + EPIC_PITY[kind];
  pity.dry = picks.some((u) => !owned.has(u)) ? 0 : pity.dry + 1;
  return tally(picks, owned);
}

/** Bolt packs: Role pack = cards from one chosen role; Featured packs = at least `featuredMin` of the featured unit. */
export function rollPack(packId: string, owned: ReadonlySet<Family>, seed: number, choice: { role?: UnitDef['slot']; featured?: Family }): CrateCard[] {
  const spec = SHOP.boltPacks.find((p) => p.id === packId)!;
  const rng = new Rng(seed >>> 0 || 1);
  const picks: Family[] = [];
  if (packId === 'role') {
    const p = UNITS.filter((u) => u.slot === choice.role && owned.has(u.id)).map((u) => u.id);
    for (let k = 0; k < spec.cards; k++) picks.push(p[rng.int(p.length)] ?? 'cannon');
  } else {
    for (let k = 0; k < spec.featuredMin; k++) picks.push(choice.featured!);
    const ownedList = UNITS.filter((u) => owned.has(u.id)).map((u) => u.id);
    for (let k = spec.featuredMin; k < spec.cards; k++) picks.push(rng.next() < 0.3 ? choice.featured! : ownedList[rng.int(ownedList.length)]);
  }
  return tally(picks, owned);
}

/** Featured unit of the day: an OWNED non-starter when possible (packs push builds, crates discover). */
export function featuredUnit(date: string, owned: ReadonlySet<Family>): Family {
  let h = 2166136261;
  for (let i = 0; i < date.length; i++) h = Math.imul(h ^ date.charCodeAt(i), 16777619) >>> 0;
  const ownedUnits = UNITS.filter((u) => owned.has(u.id)).map((u) => u.id);
  // r35: feature an owned non-starter when there is one (a starter is a weak headline)
  const special = ownedUnits.filter((u) => !STARTER_UNITS.includes(u));
  const pool = special.length ? special : ownedUnits;
  return pool[h % pool.length] ?? 'cannon';
}
