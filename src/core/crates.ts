// Crate + pack opening (round 32). Pure + seeded so contents are reproducible from (seed, counter).
import { latchKind } from './crateOdds';
import { slotRarity } from './crateOdds';
import { TUNING } from '../content/tuning';
import { rollPicksB } from './crateB';
import { CRATES, EPIC_PITY, FEATURED_CRATE, NEW_UNIT_PITY, SHOP, STARTER_UNITS, UNITS, type CrateKind, type Rarity, type UnitDef } from '../content/units';
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
  /** r40 Featured Crates in a row without the featured unit. */
  featured?: number;
  /** TUNING.rosterB Legendary pity points (Toolbox +1, Tool Chest +10; see PITY_B). */
  leg?: number;
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
  if (TUNING.rosterB) return tally(rollPicksB(kind, owned, seed, pity), owned);
  const spec = CRATES[kind];
  const rng = new Rng(seed >>> 0 || 1);
  const rar: Rarity[] = [];
  // guarantees fill the first slots (crateOdds.ts reads the same rule for the odds panel)
  for (let k = 0; k < spec.cards; k++) rar.push(slotRarity(rng.next(), k < spec.rareMin));
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
  // new-unit pity: replace the first non-Epic slot with any missing unit (never the forced/only Epic: the odds panel
  // promises it)
  const allMissing = UNITS.filter((u) => !owned.has(u.id)).map((u) => u.id);
  if (!picks.some((u) => !owned.has(u)) && allMissing.length && pity.dry + 1 >= NEW_UNIT_PITY) picks[Math.max(0, picks.findIndex((u) => rarityOf(u) !== 'epic'))] = allMissing[rng.int(allMissing.length)];
  // pity bookkeeping
  const gotEpic = picks.some((u) => rarityOf(u) === 'epic');
  pity.epic = gotEpic ? 0 : pity.epic + EPIC_PITY[kind];
  pity.dry = picks.some((u) => !owned.has(u)) ? 0 : pity.dry + 1;
  return tally(picks, owned);
}

/** TUNING.rosterB: what ONE open of `kind` does. A Tool Bag first makes its single latch roll (before any card is rolled); the
 *  crate that opens is the upgraded kind and its own odds, guarantees and pity apply. Mutates `pity`. */
export function openCrateB(kind: CrateKind, owned: ReadonlySet<Family>, seed: number, pity: PityState): { opened: CrateKind; latched: boolean; cards: CrateCard[] } {
  const opened = kind === 'wood' ? latchKind(new Rng((seed ^ 0x1a7c4) >>> 0 || 1).next()) : kind;
  const cards = rollCrate(opened, owned, seed, pity);
  // the first-Horn promise ("This Tool Bag brings a Horn") also holds when the bag latches up; an unlatched bag is
  // handled by GameScene.openCrate (opened === 'wood')
  return { opened, latched: opened !== kind, cards: opened !== kind && !owned.has('horn') ? withFirstHorn(cards) : cards };
}

/** The first-crate Horn: one card becomes a NEW Horn, leading the list (a Horn already rolled is folded in). */
export function withFirstHorn(cards: CrateCard[]): CrateCard[] {
  const rest = cards.map((c) => ({ ...c }));
  const own = rest.findIndex((c) => c.unit === 'horn');
  if (own >= 0) rest.splice(own, 1);
  else {
    const last = rest[rest.length - 1];
    if (last.count > 1) last.count--;
    else rest.pop();
  }
  const rolled = own >= 0 ? cards[own].count : 1;
  return [{ unit: 'horn', count: rolled, isNew: true }, ...rest];
}

/** r40: the featured unit for the 48-hour window containing `dayIndex` (days since epoch). */
export function featuredGemUnit(dayIndex: number): Family {
  const pool = UNITS.filter((u) => !STARTER_UNITS.includes(u.id)).map((u) => u.id);
  const w = Math.floor(dayIndex / (FEATURED_CRATE.hours / 24));
  let h = (w * 2654435761) >>> 0;
  h = (h ^ (h >>> 13)) >>> 0;
  return pool[h % pool.length];
}

/** r40 Featured Crate: an Iron roll biased to the featured unit, with a hard guarantee. Mutates `pity.featured`. */
export function rollFeatured(owned: ReadonlySet<Family>, seed: number, featured: Family, pity: PityState): CrateCard[] {
  const base = rollCrate('iron', owned, seed, pity);
  const rng = new Rng((seed ^ 0x5eed) >>> 0 || 1);
  const fr = rarityOf(featured);
  const picks: Family[] = [];
  for (const c of base) for (let i = 0; i < c.count; i++) picks.push(c.unit as Family);
  for (let k = 0; k < picks.length; k++) if (rarityOf(picks[k]) === fr && rng.next() < FEATURED_CRATE.share) picks[k] = featured;
  if (!picks.includes(featured) && (pity.featured ?? 0) + 1 >= FEATURED_CRATE.pity) picks[0] = featured;
  pity.featured = picks.includes(featured) ? 0 : (pity.featured ?? 0) + 1;
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
