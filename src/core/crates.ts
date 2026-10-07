// Crate opening (round 32). Pure + seeded so a crate's contents are reproducible from (seed, counter).
import { CRATES, RARITY_ODDS, UNITS, type CrateKind, type Rarity } from '../content/units';
import { Rng } from './rng';
import type { Family } from './types';

export interface CrateCard {
  unit: Family;
  count: number;
  /** First copy ever of this unit (unlocks it). */
  isNew: boolean;
}

/**
 * Roll a crate: `cards` cards, at least `rareMin` rare-or-better, `epicChance` per card to upgrade to epic
 * (only if epic units exist). Early-game guarantee: while the player is missing rare units, the first rare slot
 * of every crate is a MISSING rare unit, so new units arrive steadily instead of only duplicates.
 */
export function rollCrate(kind: CrateKind, owned: ReadonlySet<Family>, seed: number): CrateCard[] {
  const spec = CRATES[kind];
  const rng = new Rng(seed >>> 0 || 1);
  const pool = (r: Rarity) => UNITS.filter((u) => u.rarity === r).map((u) => u.id);
  const rarities: Rarity[] = [];
  for (let k = 0; k < spec.cards; k++) {
    const x = rng.next();
    let r: Rarity = x < RARITY_ODDS.epic ? 'epic' : x < RARITY_ODDS.epic + RARITY_ODDS.rare ? 'rare' : 'common';
    if (r !== 'epic' && rng.next() < spec.epicChance) r = 'epic';
    rarities.push(r);
  }
  for (let k = 0; k < spec.rareMin; k++) if (rarities[k] === 'common') rarities[k] = 'rare';
  const missingRare = pool('rare').filter((u) => !owned.has(u));
  const counts = new Map<Family, number>();
  rarities.forEach((r, k) => {
    let p = pool(r);
    if (!p.length) p = pool(r === 'epic' ? 'rare' : 'common'); // no epic units yet -> rare
    // early guarantee: a crate with any rare slot brings one missing rare unit first
    const unit = k === rarities.findIndex((x) => x !== 'common') && missingRare.length ? missingRare[rng.int(missingRare.length)] : p[rng.int(p.length)];
    counts.set(unit, (counts.get(unit) ?? 0) + 1);
  });
  return [...counts.entries()].map(([unit, count]) => ({ unit, count, isNew: !owned.has(unit) })).sort((a, b) => Number(b.isNew) - Number(a.isNew));
}
