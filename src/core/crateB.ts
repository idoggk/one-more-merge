// ROSTER B crate roll (TUNING.rosterB, t-9d5b7cd0). Pure + seeded like core/crates.ts: contents come from (seed, pity, owned).
// Odds, guarantees and pity all come from CRATES_B / PITY_B; core/crateOdds.ts prints from the same tables.
import { CRATES_B, NEW_UNIT_PITY, PITY_B, RARITY_ORDER, UNITS, type CrateKind, type Rarity } from '../content/units';
import { slotRarityB } from './crateOdds';
import { Rng } from './rng';
import type { Family } from './types';

interface Pity {
  epic: number;
  dry: number;
  leg?: number;
}
const rank = (r: Rarity) => RARITY_ORDER.indexOf(r);
const pool = (r: Rarity) => UNITS.filter((u) => u.rarity === r).map((u) => u.id);
const rarityOf = (f: Family) => UNITS.find((u) => u.id === f)!.rarity;

/**
 * Roll the unit picks of one crate and update the per-rarity pity. Rules:
 *  - every card rolls `odds` on its own; the first `mins.length` cards are lifted to their minimum rarity;
 *  - Epic pity: a crate that can drop Epics (step > 0) adds its step when it has none; a crate that would fill the bar (points + step >= `at`) forces an Epic
 *    into its first card below Epic. Legendary pity works the same, forced into the LAST card below Legendary (so the Tool
 *    Chest's guaranteed Epic card is never the one replaced);
 *  - a crate that cannot drop a rarity never moves its counter; a crate holding the rarity resets it;
 *  - guaranteed and forced cards prefer a unit you do not own yet; the NEW-unit pity swaps one non-guaranteed card for a
 *    missing unit of the same or a lower rarity, so no guarantee can be lowered by it.
 */
export function rollPicksB(kind: CrateKind, owned: ReadonlySet<Family>, seed: number, pity: Pity): Family[] {
  const spec = CRATES_B[kind];
  const rng = new Rng(seed >>> 0 || 1);
  const rar: Rarity[] = [];
  for (let k = 0; k < spec.cards; k++) rar.push(slotRarityB(rng.next(), spec.mins[k], spec.odds));
  const hard = new Set<number>(spec.mins.map((_, k) => k)); // slots a missing unit is preferred for, and the new-unit swap never touches
  pity.leg = pity.leg ?? 0;
  if (PITY_B.epic.step[kind] > 0 && pity.epic + PITY_B.epic.step[kind] >= PITY_B.epic.at && !rar.includes('epic')) {
    const k = rar.findIndex((r) => rank(r) < rank('epic'));
    if (k >= 0) (rar[k] = 'epic'), hard.add(k);
  }
  if (PITY_B.legendary.step[kind] > 0 && pity.leg + PITY_B.legendary.step[kind] >= PITY_B.legendary.at && !rar.includes('legendary')) {
    const k = rar.map((r) => rank(r) < rank('legendary')).lastIndexOf(true);
    if (k >= 0) (rar[k] = 'legendary'), hard.add(k);
  }
  const used = new Set<Family>();
  const picks: Family[] = rar.map((r, k) => {
    const p = pool(r);
    const miss = p.filter((u) => !owned.has(u) && !used.has(u));
    const unit = hard.has(k) && miss.length ? miss[rng.int(miss.length)] : p[rng.int(p.length)];
    if (!owned.has(unit)) used.add(unit);
    return unit;
  });
  // new-unit pity: swap the lowest-rarity free (non-guaranteed) card for a missing unit of the same or a higher rarity, never a
  // Legendary (so the printed Legendary odds stay exact) and never a card below its own rarity
  if (!picks.some((u) => !owned.has(u)) && pity.dry + 1 >= NEW_UNIT_PITY) {
    const free = rar.map((r, k) => k).filter((k) => !hard.has(k)).sort((a, b) => rank(rar[a]) - rank(rar[b]) || a - b);
    for (const k of free) {
      const cand = UNITS.filter((u) => !owned.has(u.id) && u.rarity !== 'legendary' && rank(u.rarity) >= rank(rar[k])).map((u) => u.id);
      if (!cand.length) continue;
      picks[k] = cand[rng.int(cand.length)];
      rar[k] = rarityOf(picks[k]);
      break;
    }
  }
  // pity bookkeeping (only crates that can drop the rarity move its counter)
  const has = (r: Rarity) => picks.some((u) => rarityOf(u) === r);
  pity.epic = has('epic') ? 0 : pity.epic + PITY_B.epic.step[kind];
  pity.leg = has('legendary') ? 0 : pity.leg + PITY_B.legendary.step[kind];
  pity.dry = picks.some((u) => !owned.has(u)) ? 0 : pity.dry + 1;
  return picks;
}
